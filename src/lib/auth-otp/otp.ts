// Pure, dependency-free OTP helpers (shared by server code and tests).
// Uses Web Crypto only (CSPRNG + HMAC-SHA256). Never import in client UI for generation.

export const OTP_LENGTH = 6;
export const OTP_TTL_MINUTES = 10;
export const OTP_PURPOSE = "SIGNUP_EMAIL_VERIFICATION" as const;
export const PASSWORD_RESET_PURPOSE = "PASSWORD_RESET" as const;
export const EMAIL_CHANGE_PURPOSE = "EMAIL_CHANGE" as const;
export const WITHDRAWAL_PURPOSE = "WITHDRAWAL" as const;
export const ADMIN_DEVICE_PURPOSE = "ADMIN_DEVICE" as const;

export type WithdrawalTarget =
  | { rail: "evm"; chainId: number; asset: string; usdCents: number; address: string }
  | { rail: "btc"; usdCents: number; address: string };

/** Canonical description of one withdrawal. A code is only valid for the exact scope it was issued for. */
export function withdrawalScope(t: WithdrawalTarget): string {
  return t.rail === "evm"
    ? `evm:${t.chainId}:${t.asset.toUpperCase()}:${t.usdCents}:${t.address.trim().toLowerCase()}`
    : `btc:${t.usdCents}:${t.address.trim().toLowerCase()}`;
}

/** Folds the scope into the digest input, so a code approves one amount and destination only. */
export function withdrawalBinding(challengeId: string, scope: string): string {
  return `${challengeId}:${scope}`;
}

/** Uniform 6-digit code via rejection sampling on 32-bit CSPRNG output (no modulo bias). */
export function generateOtp(
  rand: (buf: Uint32Array<ArrayBuffer>) => ArrayLike<number> = (b) => crypto.getRandomValues(b),
): string {
  const range = 1_000_000;
  const limit = Math.floor(0x1_0000_0000 / range) * range; // 4_294_000_000
  const buf = new Uint32Array(1);
  for (;;) {
    const v = rand(buf)[0]!;
    if (v < limit) return String(v % range).padStart(OTP_LENGTH, "0");
  }
}

export function isOtpFormat(code: string): boolean {
  return /^\d{6}$/.test(code);
}

/** Keyed digest bound to purpose + challenge id, so a digest is useless for any other challenge. */
export async function otpDigest(
  pepper: string,
  purpose: string,
  challengeId: string,
  code: string,
): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(pepper),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode(`PVPCasino:otp:v1:${purpose}:${challengeId}:${code}`),
  );
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashIdentifier(pepper: string, value: string): Promise<string> {
  return otpDigest(pepper, "IDENT", "-", value);
}

export function maskEmail(email: string): string {
  const [u = "", d = ""] = email.split("@");
  const head = u.slice(0, Math.min(2, u.length));
  return `${head}${"•".repeat(Math.max(1, u.length - head.length))}@${d}`;
}
