// Issues one email code through the existing OTP tables and Resend sender.
import { renderAuthEmail, type AuthEmailKind } from "./email-template";
import { sendAuthEmail } from "./mailer.server";
import { generateOtp, hashIdentifier, isOtpFormat, maskEmail, otpDigest } from "./otp";
import { workerEnv } from "@/lib/worker-env";

const GENERIC_SEND_ERROR = "Couldn't send the code right now. Please try again shortly.";

export type StartResult =
  { ok: true; challengeId: string; maskedEmail: string } | { ok: false; error: string };

function env(name: string): string {
  const v = workerEnv(name);
  if (!v) throw new Error(`Missing server configuration: ${name}`);
  return v;
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const a = await admin();
  const { data, error } = await (
    a.rpc as unknown as (
      f: string,
      x: Record<string, unknown>,
    ) => Promise<{ data: T; error: { message: string } | null }>
  )(fn, args);
  if (error) throw new Error(`rpc ${fn} failed: ${error.message}`);
  return data;
}

export async function issueCode(p: {
  userId: string;
  email: string;
  purpose: string;
  kind: AuthEmailKind;
  ip: string | null;
  ua: string | null;
  requestId: string;
  /** Extra context folded into the digest input; verification must supply the same value. */
  bind?: (challengeId: string) => string;
  detail?: string[];
  /** Server-minted code. Callers must use generateOtp; a non-6-digit value is ignored. */
  code?: string;
}): Promise<StartResult> {
  const pepper = env("OTP_PEPPER");
  const challengeId = crypto.randomUUID();
  const code = p.code && isOtpFormat(p.code) ? p.code : generateOtp();
  const digest = await otpDigest(
    pepper,
    p.purpose,
    p.bind ? p.bind(challengeId) : challengeId,
    code,
  );
  const issued = await rpc<{ ok: boolean; reason?: string }>("otp_issue", {
    p_id: challengeId,
    p_user: p.userId,
    p_email: p.email,
    p_purpose: p.purpose,
    p_digest: digest,
    p_ip_hash: p.ip ? await hashIdentifier(pepper, p.ip) : null,
    p_ua_hash: p.ua ? await hashIdentifier(pepper, p.ua) : null,
    p_request: p.requestId,
  });
  if (!issued.ok) return { ok: false, error: "Please wait a moment before requesting a new code." };
  const message = renderAuthEmail(p.kind, code, p.detail);
  let sent: { ok: boolean; error?: string };
  try {
    sent = await sendAuthEmail({
      to: p.email,
      idempotencyKey: `auth-otp:${challengeId}`,
      ...message,
    });
  } catch (e) {
    sent = { ok: false, error: e instanceof Error ? e.message.slice(0, 100) : "send_error" };
  }
  await rpc("otp_mark_sent", {
    p_id: challengeId,
    p_ok: sent.ok,
    p_error: sent.error ?? null,
    p_request: p.requestId,
  });
  if (!sent.ok) return { ok: false, error: GENERIC_SEND_ERROR };
  return { ok: true, challengeId, maskedEmail: maskEmail(p.email) };
}

export async function sendNotice(
  to: string,
  kind: AuthEmailKind,
  idempotencyKey: string,
  detail?: string[],
) {
  const message = renderAuthEmail(kind, undefined, detail);
  try {
    await sendAuthEmail({ to, idempotencyKey, ...message });
  } catch (e) {
    console.error(
      "auth notice failed",
      e instanceof Error ? e.message.slice(0, 120) : "send_error",
    );
  }
}

export { rpc };
