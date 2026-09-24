/**
 * Roulette v1 verifier. Same construction as the Jackpot draw:
 * HMAC-SHA256 keyed by the 32-byte server seed over
 * `PVPCasino:roulette:v1:{game}:{draw_version}:{counter}`, first 8 bytes big-endian,
 * rejection sampling against floor(2^64 / n) * n, slot = r mod n.
 */
import { hmacKey, hmacSha256, hexToBytes, sha256Hex } from "./core";

export const rouletteMessage = (gameId: number | string, drawVersion: number, counter: number) =>
  `PVPCasino:roulette:v1:${gameId}:${drawVersion}:${counter}`;

export async function rouletteSlot(seedHex: string, gameId: number | string, drawVersion: number, n: number) {
  const key = await hmacKey(seedHex);
  const two64 = 1n << 64n;
  const lim = (two64 / BigInt(n)) * BigInt(n);
  for (let counter = 0; counter <= 1000; counter++) {
    const h = await hmacSha256(key, rouletteMessage(gameId, drawVersion, counter));
    let r = 0n;
    for (let i = 0; i < 8; i++) r = (r << 8n) | BigInt(h[i]);
    if (r < lim) return { slot: Number(r % BigInt(n)), counter };
  }
  throw new Error("DRAW_EXHAUSTED");
}

export async function verifyRoulette(g: {
  id: number | string;
  server_seed: string;
  server_seed_hash: string;
  draw_version: number;
  layout: string[];
}) {
  const hashOk = (await sha256Hex(hexToBytes(g.server_seed))) === g.server_seed_hash;
  const { slot, counter } = await rouletteSlot(g.server_seed, g.id, g.draw_version, g.layout.length);
  return { hashOk, slot, counter, color: g.layout[slot] };
}
