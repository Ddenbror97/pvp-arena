import { getAddress, isAddress, recoverMessageAddress, type Hex } from "viem";
import { WALLET_CONFIG } from "./config";

/** Strict EVM address check (checksum enforced when mixed-case). */
export function isValidEvmAddress(a: unknown): a is string {
  return typeof a === "string" && /^0x[0-9a-fA-F]{40}$/.test(a) && isAddress(a, { strict: true });
}

/** Canonical forms: checksummed for display, lowercase for uniqueness. */
export function normalizeAddress(a: string) {
  if (typeof a !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(a)) throw new Error("INVALID_ADDRESS");
  const checksummed = getAddress(a.toLowerCase());
  return { checksummed, normalized: checksummed.toLowerCase() };
}

export function shortAddress(a: string) {
  return `${a.slice(0, 6)}...${a.slice(-4)}`;
}

export interface ChallengeFields {
  address: string;
  nonce: string;
  issuedAt: string;
  expiresAt: string;
  version: number;
}

const iso = (t: string) => new Date(t).toISOString();

/** Deterministic verification message (v1). Built only from server-stored fields. */
export function buildWalletMessage(c: ChallengeFields) {
  if (c.version !== 1) throw new Error("UNSUPPORTED_VERSION");
  return [
    "PVPspinArena Wallet Verification",
    "",
    `Domain: ${WALLET_CONFIG.domain}`,
    `Address: ${normalizeAddress(c.address).checksummed}`,
    `Nonce: ${c.nonce}`,
    `Issued At: ${iso(c.issuedAt)}`,
    `Expiration: ${iso(c.expiresAt)}`,
    "Purpose: wallet_verification",
    "Version: 1",
  ].join("\n");
}

/** Returns true only if `signature` over `message` recovers to `expected`. */
export async function signatureMatches(message: string, signature: string, expected: string) {
  if (!/^0x[0-9a-fA-F]{130}$/.test(signature)) return false;
  try {
    const signer = await recoverMessageAddress({ message, signature: signature as Hex });
    return signer.toLowerCase() === normalizeAddress(expected).normalized;
  } catch {
    return false;
  }
}
