import { deleteCookie, getCookie, getRequest, setCookie } from "@tanstack/react-start/server";
import { issueCode, rpc } from "@/lib/auth-otp/issue.server";
import {
  ADMIN_DEVICE_PURPOSE,
  hashIdentifier,
  isOtpFormat,
  maskEmail,
  otpDigest,
} from "@/lib/auth-otp/otp";
import { workerEnv } from "@/lib/worker-env";
import { adminPhase, type AdminPhase } from "./phase";
import { hashAdminPin, isAdminPin, mintAdminOtp, verifyAdminPin } from "./pin";

const COOKIE = "pvp_admin_ctx";

type Claims = { session_id?: string };
type StatusRow = {
  admin: boolean;
  has_pin?: boolean;
  device_trusted?: boolean;
  stepped_up?: boolean;
  pin_granted?: boolean;
};

function sessionOf(claims: Claims): string | null {
  const value = claims.session_id;
  return typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value) ? value : null;
}

function requestMeta() {
  const request = getRequest();
  const ip =
    request?.headers.get("cf-connecting-ip") ??
    request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null;
  const ua = request?.headers.get("user-agent")?.slice(0, 300) ?? null;
  return { ip, ua };
}

function cookieOptions() {
  const request = getRequest();
  const secure =
    request?.headers.get("x-forwarded-proto") === "https" ||
    (request?.url.startsWith("https:") ?? false);
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure,
    maxAge: 60 * 60 * 24 * 180,
  };
}

function pepper() {
  const value = workerEnv("OTP_PEPPER");
  if (!value) throw new Error("Missing server configuration: OTP_PEPPER");
  return value;
}

function newToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Buffer.from(bytes).toString("base64url");
}

async function deviceHash(token: string) {
  return hashIdentifier(pepper(), token);
}

async function contextHashes() {
  const { ip, ua } = requestMeta();
  const secret = pepper();
  return {
    ip,
    ua,
    ipHash: ip ? await hashIdentifier(secret, ip) : null,
    uaHash: ua ? await hashIdentifier(secret, ua) : null,
  };
}

async function touch(userId: string, token: string) {
  const { ipHash, uaHash } = await contextHashes();
  return rpc<{ foreign: boolean; device_id?: string; trusted?: boolean; revoked?: boolean }>(
    "admin_device_touch",
    {
      p_user: userId,
      p_token_hash: await deviceHash(token),
      p_ip_hash: ipHash,
      p_ua_hash: uaHash,
    },
  );
}

/** HttpOnly device cookie. Trust is the server row, not the IP. */
export async function ensureAdminDevice(userId: string) {
  let token = getCookie(COOKIE);
  if (token) {
    const existing = await touch(userId, token);
    if (!existing.foreign && !existing.revoked && existing.device_id) {
      return { hash: await deviceHash(token), trusted: existing.trusted === true };
    }
    deleteCookie(COOKIE, cookieOptions());
  }
  token = newToken();
  setCookie(COOKIE, token, cookieOptions());
  const created = await touch(userId, token);
  if (created.foreign || !created.device_id) throw new Error("device_rejected");
  return { hash: await deviceHash(token), trusted: created.trusted === true };
}

export async function adminStepupOk(userId: string, claims: Claims): Promise<boolean> {
  const session = sessionOf(claims);
  if (!session) return false;
  return rpc<boolean>("admin_stepup_ok", { p_user: userId, p_session: session });
}

export async function adminGateStatus(
  userId: string,
  claims: Claims,
): Promise<
  | { admin: false }
  | {
      admin: true;
      phase: AdminPhase;
      maskedEmail?: string;
      challengeId?: string;
      error?: string;
    }
> {
  const session = sessionOf(claims);
  const peek = await rpc<StatusRow>("admin_security_status", {
    p_user: userId,
    p_session: session,
    p_device_hash: null,
  });
  if (!peek.admin) return { admin: false };
  if (!session) return { admin: true, phase: "pin", error: "Sign in again." };
  const device = await ensureAdminDevice(userId);
  const row = await rpc<StatusRow>("admin_security_status", {
    p_user: userId,
    p_session: session,
    p_device_hash: device.hash,
  });
  const phase = adminPhase({
    hasPin: row.has_pin === true,
    deviceTrusted: row.device_trusted === true,
    steppedUp: row.stepped_up === true,
    pinGranted: row.pin_granted === true,
  });
  if (phase !== "otp") return { admin: true, phase };
  const email = await rpc<string | null>("admin_verified_email", { p_user: userId });
  const challengeId = await rpc<string | null>("admin_active_otp", {
    p_user: userId,
    p_session: session,
    p_device_hash: device.hash,
  });
  return {
    admin: true as const,
    phase,
    ...(email ? { maskedEmail: maskEmail(email) } : {}),
    ...(challengeId ? { challengeId } : {}),
  };
}

export async function createAdminPin(userId: string, claims: Claims, pin: string) {
  if (!isAdminPin(pin)) return { ok: false as const, error: "Enter a 6-digit PIN." };
  const session = sessionOf(claims);
  if (!session) return { ok: false as const, error: "Sign in again." };
  const device = await ensureAdminDevice(userId);
  const pinHash = await hashAdminPin(pin);
  return rpc<{ ok: boolean; error?: string }>("admin_pin_create", {
    p_user: userId,
    p_session: session,
    p_device_hash: device.hash,
    p_pin_hash: pinHash,
  });
}

export async function sendAdminDeviceCode(userId: string, claims: Claims) {
  const session = sessionOf(claims);
  if (!session) return { ok: false as const, error: "Sign in again." };
  const device = await ensureAdminDevice(userId);
  const open = await rpc<{ ok: boolean; error?: string }>("admin_otp_open", {
    p_user: userId,
    p_session: session,
    p_device_hash: device.hash,
  });
  if (!open.ok)
    return { ok: false as const, error: open.error ?? "Enter your admin PIN to continue." };
  const email = await rpc<string | null>("admin_verified_email", { p_user: userId });
  if (!email) {
    return { ok: false as const, error: "A verified email is required for a new device." };
  }
  const { ip, ua, ipHash } = await contextHashes();
  const prepared = await rpc<{ ok: boolean; pin_hash?: string; error?: string }>(
    "admin_pin_prepare",
    {
      p_user: userId,
      p_device_hash: device.hash,
      p_ip_hash: ipHash,
    },
  );
  if (!prepared.ok || !prepared.pin_hash) {
    return { ok: false as const, error: prepared.error ?? "Enter your admin PIN to continue." };
  }
  let code: string;
  try {
    code = await mintAdminOtp(prepared.pin_hash);
  } catch {
    return {
      ok: false as const,
      error: "Couldn't send the code right now. Please try again shortly.",
    };
  }
  const sent = await issueCode({
    userId,
    email,
    purpose: ADMIN_DEVICE_PURPOSE,
    kind: "admin_device",
    ip,
    ua,
    requestId: crypto.randomUUID(),
    code,
    bind: (challengeId) => `${challengeId}:${device.hash}`,
  });
  if (!sent.ok) return sent;
  await rpc("admin_otp_sent", { p_user: userId });
  return sent;
}

export async function verifyAdminPinAndMaybeOtp(userId: string, claims: Claims, pin: string) {
  if (!isAdminPin(pin)) return { ok: false as const, error: "Incorrect PIN." };
  const session = sessionOf(claims);
  if (!session) return { ok: false as const, error: "Sign in again." };
  const device = await ensureAdminDevice(userId);
  const { ipHash } = await contextHashes();
  const prepared = await rpc<{ ok: boolean; pin_hash?: string; error?: string }>(
    "admin_pin_prepare",
    {
      p_user: userId,
      p_device_hash: device.hash,
      p_ip_hash: ipHash,
    },
  );
  if (!prepared.ok || !prepared.pin_hash) {
    return {
      ok: false as const,
      error:
        prepared.error === "setup"
          ? "Create your admin PIN first."
          : (prepared.error ?? "Incorrect PIN."),
    };
  }
  const match = await verifyAdminPin(pin, prepared.pin_hash);
  const committed = await rpc<{ ok: boolean; next?: "ready" | "otp"; error?: string }>(
    "admin_pin_commit",
    {
      p_user: userId,
      p_session: session,
      p_device_hash: device.hash,
      p_ip_hash: ipHash,
      p_match: match,
    },
  );
  if (!committed.ok || committed.next !== "otp") return committed;
  const sent = await sendAdminDeviceCode(userId, claims);
  if (!sent.ok) return { ok: false as const, error: sent.error, next: "otp" as const };
  return {
    ok: true as const,
    next: "otp" as const,
    challengeId: sent.challengeId,
    maskedEmail: sent.maskedEmail,
  };
}

export async function verifyAdminDeviceCode(
  userId: string,
  claims: Claims,
  challengeId: string,
  code: string,
) {
  if (!isOtpFormat(code) || !/^[0-9a-f-]{36}$/i.test(challengeId)) {
    return { ok: false as const, error: "That code is incorrect." };
  }
  const session = sessionOf(claims);
  if (!session) return { ok: false as const, error: "Sign in again." };
  const device = await ensureAdminDevice(userId);
  const open = await rpc<{ ok: boolean; error?: string }>("admin_otp_open", {
    p_user: userId,
    p_session: session,
    p_device_hash: device.hash,
  });
  if (!open.ok)
    return { ok: false as const, error: open.error ?? "Enter your admin PIN to continue." };
  const digest = await otpDigest(
    pepper(),
    ADMIN_DEVICE_PURPOSE,
    `${challengeId}:${device.hash}`,
    code,
  );
  const result = await rpc<{ ok: boolean; reason?: string; user_id?: string }>("otp_verify", {
    p_id: challengeId,
    p_purpose: ADMIN_DEVICE_PURPOSE,
    p_digest: digest,
    p_request: crypto.randomUUID(),
  });
  if (!result.ok || result.user_id !== userId) {
    await rpc("admin_otp_failed", { p_user: userId });
    if (result.reason === "expired") {
      return { ok: false as const, error: "That code has expired. Request a new one." };
    }
    if (result.reason === "too_many_attempts") {
      return { ok: false as const, error: "That code is no longer valid. Request a new one." };
    }
    return { ok: false as const, error: "That code is incorrect." };
  }
  return rpc<{ ok: boolean; error?: string }>("admin_device_trust", {
    p_user: userId,
    p_session: session,
    p_device_hash: device.hash,
  });
}
