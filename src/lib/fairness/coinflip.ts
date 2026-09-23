/**
 * PVPCasino Coinflip fairness protocol v1 (independent of the Postgres implementation).
 *
 *   commitment = SHA256(server_seed)                       (published when the game is created)
 *   message    = "PVPCasino:coinflip:v1:" + game_id + ":" + draw_version
 *   h          = HMAC-SHA256(key = server_seed, data = UTF-8(message))
 *   side       = (h[0] & 1) == 0 ? HEADS : TAILS
 *
 * game_id is formatted as a base-10 integer with no padding. Never change v1; add v2 instead.
 */
import { bytesToHex, hexToBytes, hmacKey, hmacSha256, sha256Hex } from "./core";

export const COINFLIP_PROTOCOL = "v1";
export type CoinSide = "HEADS" | "TAILS";

export function coinflipMessage(gameId: number | bigint | string, drawVersion: number): string {
  const id = BigInt(gameId);
  if (id < 0n) throw new Error("Invalid game id");
  return `PVPCasino:coinflip:${COINFLIP_PROTOCOL}:${id.toString()}:${drawVersion}`;
}

export async function coinflipOutcome(seedHex: string, gameId: number | bigint | string, drawVersion: number) {
  if (hexToBytes(seedHex).length !== 32) throw new Error("Seed must be 32 bytes");
  const h = await hmacSha256(await hmacKey(seedHex), coinflipMessage(gameId, drawVersion));
  const firstByte = h[0]!;
  const side: CoinSide = (firstByte & 1) === 0 ? "HEADS" : "TAILS";
  return { hmacHex: bytesToHex(h), firstByte, side };
}

export interface CoinflipCheck {
  label: string;
  ok: boolean;
  detail: string;
}

export async function verifyCoinflip(g: {
  id: number | string;
  draw_version: number;
  server_seed_hash: string;
  server_seed: string | null;
  winning_side: CoinSide | null;
}): Promise<{ ok: boolean; checks: CoinflipCheck[]; side?: CoinSide }> {
  if (!g.server_seed) return { ok: false, checks: [{ label: "Seed revealed", ok: false, detail: "Game not finished yet" }] };
  const checks: CoinflipCheck[] = [];
  const hash = await sha256Hex(hexToBytes(g.server_seed));
  checks.push({ label: "Seed matches the commitment published at creation", ok: hash === g.server_seed_hash, detail: `SHA256(seed) = ${hash}` });
  const o = await coinflipOutcome(g.server_seed, g.id, g.draw_version);
  checks.push({ label: "HMAC recomputed", ok: true, detail: `${coinflipMessage(g.id, g.draw_version)} → ${o.hmacHex}` });
  checks.push({
    label: "First byte & 1 gives the recorded side",
    ok: o.side === g.winning_side,
    detail: `first byte ${o.firstByte} (0x${o.firstByte.toString(16).padStart(2, "0")}) & 1 = ${o.firstByte & 1} → ${o.side}`,
  });
  return { ok: checks.every((c) => c.ok), checks, side: o.side };
}
