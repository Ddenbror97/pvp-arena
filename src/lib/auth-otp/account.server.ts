// Signed-in password and email changes, plus the public password reset.
// Codes go out through the same OTP issuer and Resend template as signup.
import { issueCode, rpc, sendNotice } from "./issue.server";
import {
  EMAIL_CHANGE_PURPOSE,
  PASSWORD_RESET_PURPOSE,
  isOtpFormat,
  maskEmail,
  otpDigest,
} from "./otp";
import { verifyFailure } from "./signup.server";
import { workerEnv } from "@/lib/worker-env";

export type Ok = { ok: true };
export type Fail = { ok: false; error: string };
export type CodeStart = { ok: true; challengeId: string; maskedEmail: string } | Fail;

function env(name: string): string {
  const v = workerEnv(name);
  if (!v) throw new Error(`Missing server configuration: ${name}`);
  return v;
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function friendlyPassword(msg: string) {
  if (/password|weak|pwned|compromised/i.test(msg))
    return "Weak or compromised password. Choose a stronger one.";
  return "Couldn't update that right now. Please try again.";
}

/** Proves the account password, then drops the session that proof created. */
async function passwordMatches(email: string, password: string, userId: string): Promise<boolean> {
  const url = env("SUPABASE_URL").replace(/\/$/, "");
  const key = env("SUPABASE_PUBLISHABLE_KEY");
  const headers = new Headers({ "Content-Type": "application/json", apikey: key });
  if (!key.startsWith("sb_publishable_") && !key.startsWith("sb_secret_"))
    headers.set("Authorization", `Bearer ${key}`);
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email, password }),
  });
  let body: { user?: { id?: string }; access_token?: string } = {};
  try {
    body = (await res.json()) as typeof body;
  } catch {
    body = {};
  }
  if (body.access_token) {
    try {
      const a = await admin();
      await a.auth.admin.signOut(body.access_token, "local");
    } catch {
      console.error("probe session cleanup failed");
    }
  }
  return res.ok && body.user?.id === userId;
}

async function audit(args: Record<string, unknown>) {
  try {
    await rpc("otp_log", args);
  } catch (e) {
    console.error("auth audit failed", e instanceof Error ? e.message.slice(0, 160) : "audit");
  }
}

async function revoke(userId: string) {
  try {
    await rpc("auth_revoke_sessions", { p_user: userId });
  } catch (e) {
    console.error("session revoke failed", e instanceof Error ? e.message.slice(0, 160) : "revoke");
  }
}

export async function accountEmail(
  userId: string,
): Promise<{ email: string; confirmed: boolean } | null> {
  const a = await admin();
  const { data, error } = await a.auth.admin.getUserById(userId);
  const email = data.user?.email?.trim().toLowerCase();
  if (error || !email) return null;
  return { email, confirmed: Boolean(data.user.email_confirmed_at) };
}

function decoy(email: string): CodeStart {
  return { ok: true, challengeId: crypto.randomUUID(), maskedEmail: maskEmail(email) };
}

export async function startPasswordReset(input: {
  email: string;
  ip: string | null;
  ua: string | null;
}): Promise<CodeStart> {
  const email = input.email.trim().toLowerCase();
  const existing = await rpc<{ id: string; confirmed: boolean } | null>("auth_user_by_email", {
    p_email: email,
  });
  if (!existing?.confirmed) return decoy(email);
  return issueCode({
    userId: existing.id,
    email,
    purpose: PASSWORD_RESET_PURPOSE,
    kind: "password_reset",
    ip: input.ip,
    ua: input.ua,
    requestId: crypto.randomUUID(),
  });
}

export async function resendPasswordReset(input: {
  challengeId: string;
  ip: string | null;
  ua: string | null;
}): Promise<CodeStart> {
  const info = await rpc<{ user_id: string; email: string; purpose: string } | null>(
    "otp_challenge_info",
    { p_id: input.challengeId },
  );
  if (!info || info.purpose !== PASSWORD_RESET_PURPOSE)
    return { ok: true, challengeId: crypto.randomUUID(), maskedEmail: "" };
  const existing = await rpc<{ id: string; confirmed: boolean } | null>("auth_user_by_email", {
    p_email: info.email,
  });
  if (!existing?.confirmed) return decoy(info.email);
  return issueCode({
    userId: info.user_id,
    email: info.email,
    purpose: PASSWORD_RESET_PURPOSE,
    kind: "password_reset",
    ip: input.ip,
    ua: input.ua,
    requestId: crypto.randomUUID(),
  });
}

export async function completePasswordReset(input: {
  challengeId: string;
  code: string;
  password: string;
}): Promise<Ok | Fail> {
  if (!isOtpFormat(input.code)) return { ok: false, error: "Invalid code." };
  const requestId = crypto.randomUUID();
  const digest = await otpDigest(
    env("OTP_PEPPER"),
    PASSWORD_RESET_PURPOSE,
    input.challengeId,
    input.code,
  );
  const r = await rpc<{ ok: boolean; reason?: string; user_id?: string; email?: string }>(
    "otp_verify",
    {
      p_id: input.challengeId,
      p_purpose: PASSWORD_RESET_PURPOSE,
      p_digest: digest,
      p_request: requestId,
    },
  );
  if (!r.ok || !r.user_id) return verifyFailure(r.reason);
  const a = await admin();
  const { error } = await a.auth.admin.updateUserById(r.user_id, { password: input.password });
  if (error) return { ok: false, error: friendlyPassword(error.message) };
  await revoke(r.user_id);
  await audit({
    p_event: "PASSWORD_CHANGED",
    p_user: r.user_id,
    p_challenge: input.challengeId,
    p_purpose: PASSWORD_RESET_PURPOSE,
    p_request: requestId,
    p_details: null,
  });
  if (r.email)
    await sendNotice(r.email, "password_changed", `auth-notice:password:${input.challengeId}`);
  return { ok: true };
}

export async function changePassword(input: {
  userId: string;
  currentPassword: string;
  newPassword: string;
}): Promise<Ok | Fail> {
  const account = await accountEmail(input.userId);
  if (!account?.confirmed)
    return { ok: false, error: "Confirm your email before changing the password." };
  if (input.currentPassword === input.newPassword)
    return { ok: false, error: "Choose a different password." };
  const matches = await passwordMatches(account.email, input.currentPassword, input.userId);
  if (!matches) return { ok: false, error: "Current password is incorrect." };
  const a = await admin();
  const { error } = await a.auth.admin.updateUserById(input.userId, {
    password: input.newPassword,
  });
  if (error) return { ok: false, error: friendlyPassword(error.message) };
  await revoke(input.userId);
  const requestId = crypto.randomUUID();
  await audit({
    p_event: "PASSWORD_CHANGED",
    p_user: input.userId,
    p_challenge: null,
    p_purpose: null,
    p_request: requestId,
    p_details: null,
  });
  await sendNotice(account.email, "password_changed", `auth-notice:password:${requestId}`);
  return { ok: true };
}

export async function startEmailChange(input: {
  userId: string;
  currentPassword: string;
  newEmail: string;
  ip: string | null;
  ua: string | null;
}): Promise<CodeStart> {
  const account = await accountEmail(input.userId);
  if (!account?.confirmed) return { ok: false, error: "Confirm your email before changing it." };
  const next = input.newEmail.trim().toLowerCase();
  if (next === account.email) return { ok: false, error: "That is already your email." };
  const matches = await passwordMatches(account.email, input.currentPassword, input.userId);
  if (!matches) return { ok: false, error: "Current password is incorrect." };
  const taken = await rpc<{ id: string } | null>("auth_user_by_email", { p_email: next });
  if (taken && taken.id !== input.userId)
    return { ok: false, error: "That email is already in use." };
  const issued = await issueCode({
    userId: input.userId,
    email: next,
    purpose: EMAIL_CHANGE_PURPOSE,
    kind: "email_change",
    ip: input.ip,
    ua: input.ua,
    requestId: crypto.randomUUID(),
  });
  if (issued.ok)
    await sendNotice(
      account.email,
      "email_change_notice",
      `auth-notice:email-request:${issued.challengeId}`,
    );
  return issued;
}

export async function resendEmailChange(input: {
  userId: string;
  challengeId: string;
  ip: string | null;
  ua: string | null;
}): Promise<CodeStart> {
  const info = await rpc<{ user_id: string; email: string; purpose: string } | null>(
    "otp_challenge_info",
    { p_id: input.challengeId },
  );
  if (!info || info.purpose !== EMAIL_CHANGE_PURPOSE || info.user_id !== input.userId) {
    return { ok: false, error: "Request a new code from the security page." };
  }
  return issueCode({
    userId: input.userId,
    email: info.email,
    purpose: EMAIL_CHANGE_PURPOSE,
    kind: "email_change",
    ip: input.ip,
    ua: input.ua,
    requestId: crypto.randomUUID(),
  });
}

export async function completeEmailChange(input: {
  userId: string;
  challengeId: string;
  code: string;
}): Promise<Ok | Fail> {
  if (!isOtpFormat(input.code)) return { ok: false, error: "Invalid code." };
  const account = await accountEmail(input.userId);
  if (!account) return { ok: false, error: "Couldn't update that right now. Please try again." };
  const requestId = crypto.randomUUID();
  const digest = await otpDigest(
    env("OTP_PEPPER"),
    EMAIL_CHANGE_PURPOSE,
    input.challengeId,
    input.code,
  );
  const r = await rpc<{ ok: boolean; reason?: string; user_id?: string; email?: string }>(
    "otp_verify",
    {
      p_id: input.challengeId,
      p_purpose: EMAIL_CHANGE_PURPOSE,
      p_digest: digest,
      p_request: requestId,
    },
  );
  if (!r.ok || r.user_id !== input.userId || !r.email) return verifyFailure(r.reason);
  const taken = await rpc<{ id: string } | null>("auth_user_by_email", { p_email: r.email });
  if (taken && taken.id !== input.userId)
    return { ok: false, error: "That email is already in use." };
  const a = await admin();
  const { error } = await a.auth.admin.updateUserById(input.userId, {
    email: r.email,
    email_confirm: true,
  });
  if (error) return { ok: false, error: friendlyPassword(error.message) };
  await revoke(input.userId);
  await audit({
    p_event: "EMAIL_CHANGED",
    p_user: input.userId,
    p_challenge: input.challengeId,
    p_purpose: EMAIL_CHANGE_PURPOSE,
    p_request: requestId,
    p_details: null,
  });
  await sendNotice(
    account.email,
    "email_changed",
    `auth-notice:email-changed:${input.challengeId}`,
  );
  return { ok: true };
}
