import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { generateOtp } from "@/lib/auth-otp/otp";

function scryptKey(
  pin: string,
  salt: Buffer,
  keylen: number,
  cost: { N: number; r: number; p: number },
) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(pin, salt, keylen, cost, (err, key) => {
      if (err) reject(err);
      else resolve(key as Buffer);
    });
  });
}

const N = 16384;
const r = 8;
const p = 1;
const KEYLEN = 32;

export function isAdminPin(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}

/** Slow hash. The stored string is not reversible and does not contain the PIN. */
export async function hashAdminPin(pin: string): Promise<string> {
  if (!isAdminPin(pin)) throw new Error("BAD_PIN");
  const salt = randomBytes(16);
  const key = await scryptKey(pin, salt, KEYLEN, { N, r, p });
  return `scrypt$${N}$${r}$${p}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyAdminPin(pin: string, stored: string): Promise<boolean> {
  if (!isAdminPin(pin)) return false;
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const cost = Number(parts[1]);
  const block = Number(parts[2]);
  const parallel = Number(parts[3]);
  if (![cost, block, parallel].every((n) => Number.isInteger(n) && n > 0)) return false;
  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(parts[4] ?? "", "base64url");
    expected = Buffer.from(parts[5] ?? "", "base64url");
  } catch {
    return false;
  }
  if (salt.length < 8 || expected.length < 16) return false;
  const key = await scryptKey(pin, salt, expected.length, {
    N: cost,
    r: block,
    p: parallel,
  });
  if (key.length !== expected.length) return false;
  return timingSafeEqual(key, expected);
}

/** A device code must not be the admin PIN. Throws if every draw collides. */
export async function mintAdminOtp(
  pinHash: string,
  mint: () => string = generateOtp,
): Promise<string> {
  for (let i = 0; i < 4; i++) {
    const code = mint();
    if (!isAdminPin(code) || !(await verifyAdminPin(code, pinHash))) return code;
  }
  throw new Error("otp_collision");
}
