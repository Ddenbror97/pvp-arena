// Server-only sign-up verification flow. Never import from client code.
import { renderOtpEmail } from "./email-template";
import { OTP_PURPOSE, generateOtp, hashIdentifier, isOtpFormat, maskEmail, otpDigest } from "./otp";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const GENERIC_SEND_ERROR = "Couldn't send the code right now. Please try again shortly.";

export type StartResult = { ok: true; challengeId: string; maskedEmail: string } | { ok: false; error: string };
export type VerifyResult = { ok: true } | { ok: false; error: string };

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing server configuration: ${name}`);
  return v;
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

// Untyped RPC helper for the server-only OTP functions.
async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const a = await admin();
  const { data, error } = await (a.rpc as unknown as (f: string, x: Record<string, unknown>) => Promise<{ data: T; error: { message: string } | null }>)(fn, args);
  if (error) throw new Error(`rpc ${fn} failed: ${error.message}`);
  return data;
}

const DEFAULT_FROM = "PVPspinArena <noreply@pvpspinarena.com>";
const EMAIL_RE = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;

/** Normalise a configured sender into a strict `Name <addr>` that Resend accepts. */
export function normaliseFrom(raw: string, fallbackName = "PVPspinArena"): string | null {
  const v = raw.trim().replace(/^["']+|["']+$/g, "").trim();
  const m = v.match(/<\s*([^<>\s]+)\s*>/);
  const addr = (m?.[1] ?? v).trim().toLowerCase();
  if (!EMAIL_RE.test(addr)) return null;
  const name = (m ? v.slice(0, v.indexOf("<")) : "").replace(/["<>]/g, "").trim() || fallbackName;
  return `${name} <${addr}>`;
}

async function sendCodeEmail(to: string, code: string, challengeId: string) {
  // Sender is not secret; a malformed AUTH_EMAIL_FROM falls back to the verified default.
  let from = normaliseFrom(process.env["AUTH_EMAIL_FROM"] ?? "");
  if (!from) {
    console.warn("AUTH_EMAIL_FROM missing or malformed; using default sender");
    from = DEFAULT_FROM;
  }
  const replyRaw = process.env["AUTH_EMAIL_REPLY_TO"];
  const replyTo = replyRaw && EMAIL_RE.test(replyRaw.trim()) ? replyRaw.trim() : undefined;
  const { subject, html, text } = renderOtpEmail(code);
  const res = await fetch(`${GATEWAY_URL}/emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env("LOVABLE_API_KEY")}`,
      "X-Connection-Api-Key": env("RESEND_API_KEY"),
      "Idempotency-Key": `auth-otp:${challengeId}`,
    },
    body: JSON.stringify({ from, to: [to], subject, html, text, ...(replyTo ? { reply_to: replyTo } : {}) }),
  });
  if (!res.ok) {
    const body = await res.text();
    // Log status + provider message only; never the code or the email body.
    console.error(`Resend send failed [${res.status}]: ${body.slice(0, 300)}`);
    return { ok: false as const, error: `http_${res.status}` };
  }
  return { ok: true as const };
}

async function issueAndSend(p: { userId: string; email: string; ip: string | null; ua: string | null; requestId: string }): Promise<StartResult> {
  const pepper = env("OTP_PEPPER");
  const challengeId = crypto.randomUUID();
  const code = generateOtp();
  const digest = await otpDigest(pepper, OTP_PURPOSE, challengeId, code);
  const issued = await rpc<{ ok: boolean; reason?: string }>("otp_issue", {
    p_id: challengeId,
    p_user: p.userId,
    p_email: p.email,
    p_purpose: OTP_PURPOSE,
    p_digest: digest,
    p_ip_hash: p.ip ? await hashIdentifier(pepper, p.ip) : null,
    p_ua_hash: p.ua ? await hashIdentifier(pepper, p.ua) : null,
    p_request: p.requestId,
  });
  if (!issued.ok) return { ok: false, error: "Please wait a moment before requesting a new code." };
  let sent: { ok: boolean; error?: string };
  try {
    sent = await sendCodeEmail(p.email, code, challengeId);
  } catch (e) {
    sent = { ok: false, error: e instanceof Error ? e.message.slice(0, 100) : "send_error" };
  }
  await rpc("otp_mark_sent", { p_id: challengeId, p_ok: sent.ok, p_error: sent.error ?? null, p_request: p.requestId });
  if (!sent.ok) return { ok: false, error: GENERIC_SEND_ERROR };
  return { ok: true, challengeId, maskedEmail: maskEmail(p.email) };
}

/** Existing verified accounts get an indistinguishable response and no email (anti-enumeration). */
function decoy(email: string): StartResult {
  return { ok: true, challengeId: crypto.randomUUID(), maskedEmail: maskEmail(email) };
}

export async function startSignup(input: { email: string; password: string; username: string; ip: string | null; ua: string | null }): Promise<StartResult> {
  const requestId = crypto.randomUUID();
  const email = input.email.trim().toLowerCase();
  // Abuse limit on account creation itself (per IP, per email, site-wide), checked before any account work.
  const pepper = env("OTP_PEPPER");
  const limit = await rpc<{ ok: boolean }>("signup_rate_check", {
    p_ip_hash: input.ip ? await hashIdentifier(pepper, input.ip) : null,
    p_email_hash: await hashIdentifier(pepper, `email:${email}`),
  });
  if (!limit.ok) return { ok: false, error: "Too many sign-up attempts. Please try again later." };
  const a = await admin();
  const existing = await rpc<{ id: string; confirmed: boolean } | null>("auth_user_by_email", { p_email: email });
  let userId: string;
  if (existing?.confirmed) return decoy(email);
  const metadata = { username: input.username, age_confirmed: true };
  if (existing) {
    // Unfinished earlier registration: take it over with the new password (it never had a session or wallet).
    const { error } = await a.auth.admin.updateUserById(existing.id, { password: input.password, user_metadata: metadata });
    if (error) return { ok: false, error: friendlyAuthError(error.message) };
    userId = existing.id;
  } else {
    const { data, error } = await a.auth.admin.createUser({ email, password: input.password, email_confirm: false, user_metadata: metadata });
    if (error || !data.user) {
      if (error && /already|registered|exists/i.test(error.message)) return decoy(email);
      return { ok: false, error: friendlyAuthError(error?.message ?? "") };
    }
    userId = data.user.id;
  }
  return issueAndSend({ userId, email, ip: input.ip, ua: input.ua, requestId });
}

export async function resendSignupCode(input: { challengeId: string; ip: string | null; ua: string | null }): Promise<StartResult> {
  const info = await rpc<{ user_id: string; email: string; purpose: string } | null>("otp_challenge_info", { p_id: input.challengeId });
  if (!info || info.purpose !== OTP_PURPOSE) {
    // Unknown (or decoy) challenge: same shape as success, nothing sent.
    return { ok: true, challengeId: crypto.randomUUID(), maskedEmail: "" };
  }
  const existing = await rpc<{ id: string; confirmed: boolean } | null>("auth_user_by_email", { p_email: info.email });
  if (!existing || existing.confirmed) return { ok: true, challengeId: crypto.randomUUID(), maskedEmail: maskEmail(info.email) };
  return issueAndSend({ userId: info.user_id, email: info.email, ip: input.ip, ua: input.ua, requestId: crypto.randomUUID() });
}

export async function verifySignupCode(input: { challengeId: string; code: string }): Promise<VerifyResult> {
  if (!isOtpFormat(input.code)) return { ok: false, error: "Invalid code." };
  const requestId = crypto.randomUUID();
  const digest = await otpDigest(env("OTP_PEPPER"), OTP_PURPOSE, input.challengeId, input.code);
  const r = await rpc<{ ok: boolean; reason?: string; user_id?: string }>("otp_verify", {
    p_id: input.challengeId,
    p_purpose: OTP_PURPOSE,
    p_digest: digest,
    p_request: requestId,
  });
  if (!r.ok) {
    if (r.reason === "expired") return { ok: false, error: "This code has expired. Request a new one." };
    if (r.reason === "too_many_attempts") return { ok: false, error: "Too many attempts. Request a new code." };
    return { ok: false, error: "Invalid code." };
  }
  // Single authoritative verification state: the auth system's own email-confirmed flag.
  const a = await admin();
  const { error } = await a.auth.admin.updateUserById(r.user_id!, { email_confirm: true });
  if (error) {
    console.error("confirm user failed", error.message);
    return { ok: false, error: "Couldn't complete verification. Please try again." };
  }
  await rpc("otp_log", { p_event: "EMAIL_VERIFIED", p_user: r.user_id, p_challenge: input.challengeId, p_purpose: OTP_PURPOSE, p_request: requestId, p_details: null });
  return { ok: true };
}

function friendlyAuthError(msg: string) {
  if (/password/i.test(msg)) return "Senha fraca ou comprometida. Escolha uma senha mais forte.";
  return "Couldn't create the account right now. Please try again.";
}
