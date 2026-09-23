/**
 * Shared PVPspinArena provably-fair primitives (all games).
 * Only the Web Crypto standard library is used; no hand-rolled crypto.
 * Each game builds its own domain-separated message: "PVPspinArena:<game>:<version>:...".
 */

function subtle(): SubtleCrypto {
  const c = globalThis.crypto;
  if (!c?.subtle) throw new Error("Web Crypto is not available");
  return c.subtle;
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim().toLowerCase();
  if (!/^([0-9a-f]{2})*$/.test(clean)) throw new Error("Invalid hex string");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const d = await subtle().digest("SHA-256", bytes as BufferSource);
  return bytesToHex(new Uint8Array(d));
}

export async function hmacKey(seedHex: string): Promise<CryptoKey> {
  return subtle().importKey("raw", hexToBytes(seedHex) as BufferSource, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}

/** HMAC-SHA256(key = seed bytes, data = UTF-8 message). */
export async function hmacSha256(key: CryptoKey, message: string): Promise<Uint8Array> {
  return new Uint8Array(await subtle().sign("HMAC", key, new TextEncoder().encode(message)));
}
