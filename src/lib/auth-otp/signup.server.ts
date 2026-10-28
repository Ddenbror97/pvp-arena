// Server-only sign-up verification flow. Never import from client code.
import { issueCode, rpc } from "./issue.server";
import { OTP_PURPOSE, hashIdentifier, isOtpFormat, maskEmail, otpDigest } from "./otp";
import { TURNSTILE_RETRY } from "./turnstile";
import { verifyTurnstile } from "./turnstile.server";
import { workerEnv } from "@/lib/worker-env";
import type { StartResult } from "./issue.server";

export type { StartResult };
export type VerifyResult = { ok: true } | { ok: false; error: string };
export { normaliseFrom } from "./mailer.server";

function env(name: string): string {
  const v = workerEnv(name);
  if (!v) throw new Error(`Missing server configuration: ${name}`);
  return v;
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Existing verified accounts get an indistinguishable response and no email (anti-enumeration). */
function decoy(email: string): StartResult {
  return { ok: true, challengeId: crypto.randomUUID(), maskedEmail: maskEmail(email) };
}

export async function startSignup(input: {
  email: string;
  password: string;
  username: string;
  ip: string | null;
  ua: string | null;
  captchaToken: string;
}): Promise<StartResult> {
  if (!(await verifyTurnstile(input.captchaToken, input.ip))) {
    return { ok: false, error: TURNSTILE_RETRY };
  }
  const requestId = crypto.randomUUID();
  const email = input.email.trim().toLowerCase();
  if (email.endsWith("@bangban.uk")) {
    return { ok: false, error: "Couldn't create the account right now. Please try again." };
  }
  const pepper = env("OTP_PEPPER");
  const limit = await rpc<{ ok: boolean }>("signup_rate_check", {
    p_ip_hash: input.ip ? await hashIdentifier(pepper, input.ip) : null,
    p_email_hash: await hashIdentifier(pepper, `email:${email}`),
  });
  if (!limit.ok) return { ok: false, error: "Too many sign-up attempts. Please try again later." };
  const a = await admin();
  const existing = await rpc<{ id: string; confirmed: boolean } | null>("auth_user_by_email", {
    p_email: email,
  });
  let userId: string;
  if (existing?.confirmed) return decoy(email);
  const metadata = { username: input.username, age_confirmed: true };
  if (existing) {
    const { error } = await a.auth.admin.updateUserById(existing.id, {
      password: input.password,
      user_metadata: metadata,
    });
    if (error) return { ok: false, error: friendlyAuthError(error.message) };
    userId = existing.id;
  } else {
    const { data, error } = await a.auth.admin.createUser({
      email,
      password: input.password,
      email_confirm: false,
      user_metadata: metadata,
    });
    if (error || !data.user) {
      if (error && /already|registered|exists/i.test(error.message)) return decoy(email);
      return { ok: false, error: friendlyAuthError(error?.message ?? "") };
    }
    userId = data.user.id;
  }
  return issueCode({
    userId,
    email,
    purpose: OTP_PURPOSE,
    kind: "signup",
    ip: input.ip,
    ua: input.ua,
    requestId,
  });
}

export async function resendSignupCode(input: {
  challengeId: string;
  ip: string | null;
  ua: string | null;
}): Promise<StartResult> {
  const info = await rpc<{ user_id: string; email: string; purpose: string } | null>(
    "otp_challenge_info",
    { p_id: input.challengeId },
  );
  if (!info || info.purpose !== OTP_PURPOSE) {
    return { ok: true, challengeId: crypto.randomUUID(), maskedEmail: "" };
  }
  const existing = await rpc<{ id: string; confirmed: boolean } | null>("auth_user_by_email", {
    p_email: info.email,
  });
  if (!existing || existing.confirmed)
    return { ok: true, challengeId: crypto.randomUUID(), maskedEmail: maskEmail(info.email) };
  return issueCode({
    userId: info.user_id,
    email: info.email,
    purpose: OTP_PURPOSE,
    kind: "signup",
    ip: input.ip,
    ua: input.ua,
    requestId: crypto.randomUUID(),
  });
}

export async function verifySignupCode(input: {
  challengeId: string;
  code: string;
}): Promise<VerifyResult> {
  if (!isOtpFormat(input.code)) return { ok: false, error: "Invalid code." };
  const requestId = crypto.randomUUID();
  const preview = await rpc<{ ok: boolean; reason?: string }>("signup_verified_preview", {
    p_challenge: input.challengeId,
  });
  if (!preview.ok) return { ok: false, error: signupSlotError(preview.reason) };
  const digest = await otpDigest(env("OTP_PEPPER"), OTP_PURPOSE, input.challengeId, input.code);
  const r = await rpc<{ ok: boolean; reason?: string; user_id?: string }>("otp_verify", {
    p_id: input.challengeId,
    p_purpose: OTP_PURPOSE,
    p_digest: digest,
    p_request: requestId,
  });
  if (!r.ok) return verifyFailure(r.reason);
  const slot = await rpc<{ ok: boolean; reason?: string }>("signup_verified_claim", {
    p_challenge: input.challengeId,
  });
  if (!slot.ok) return { ok: false, error: signupSlotError(slot.reason) };
  const a = await admin();
  const { error } = await a.auth.admin.updateUserById(r.user_id!, { email_confirm: true });
  if (error) {
    console.error("confirm user failed", error.message);
    return { ok: false, error: "Couldn't complete verification. Please try again." };
  }
  await rpc("otp_log", {
    p_event: "EMAIL_VERIFIED",
    p_user: r.user_id,
    p_challenge: input.challengeId,
    p_purpose: OTP_PURPOSE,
    p_request: requestId,
    p_details: null,
  });
  return { ok: true };
}

function signupSlotError(reason?: string): string {
  if (reason === "BUSY")
    return "Too many accounts are being created right now. Try again in a few minutes.";
  if (reason === "IP_LIMIT")
    return "Too many accounts created from this network. Try again in an hour.";
  if (reason === "IP_BLOCKED")
    return "Sign-up is not available from this network.";
  return "Couldn't complete verification. Please try again.";
}

export function verifyFailure(reason?: string): VerifyResult {
  if (reason === "expired")
    return { ok: false, error: "This code has expired. Request a new one." };
  if (reason === "too_many_attempts")
    return { ok: false, error: "Too many attempts. Request a new code." };
  return { ok: false, error: "Invalid code." };
}

function friendlyAuthError(msg: string) {
  if (/password/i.test(msg)) return "Weak or compromised password. Choose a stronger one.";
  return "Couldn't create the account right now. Please try again.";
}
