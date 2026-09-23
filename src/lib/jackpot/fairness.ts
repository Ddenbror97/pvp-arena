/**
 * PVPCasino Jackpot fairness protocol v1.
 *
 * This is an independent re-implementation of the server's draw (Postgres
 * `jackpot_draw_ticket`) using only the Web Crypto standard library.
 * It is used by the in-app verifier and by the test suite that compares the
 * two implementations against published test vectors.
 *
 *   commitment      = SHA256(server_seed)                    (published before entries)
 *   message(c)      = "PVPCasino:jackpot:v1:" + game_id + ":" + draw_version + ":" + c
 *   h(c)            = HMAC-SHA256(key = server_seed, data = message(c))
 *   r(c)            = first 8 bytes of h(c), big-endian unsigned 64-bit
 *   limit           = floor(2^64 / N) * N                    (N = final pot in cents)
 *   winning_ticket  = r(c) mod N for the first c where r(c) < limit   (rejection sampling)
 *   winner          = entry with ticket_start <= winning_ticket < ticket_end
 */

export const PROTOCOL_VERSION = "v1";
const TWO_64 = 1n << 64n;

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

export function drawMessage(gameId: number | bigint, drawVersion: number, counter: number): string {
  return `PVPCasino:jackpot:${PROTOCOL_VERSION}:${gameId}:${drawVersion}:${counter}`;
}

export async function drawTicket(
  seedHex: string,
  gameId: number | bigint,
  drawVersion: number,
  n: bigint,
): Promise<{ ticket: bigint; counter: number }> {
  if (n <= 0n) throw new Error("INVALID_RANGE");
  const key = await subtle().importKey(
    "raw",
    hexToBytes(seedHex) as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const limit = (TWO_64 / n) * n;
  const enc = new TextEncoder();
  for (let counter = 0; counter <= 1000; counter++) {
    const sig = new Uint8Array(
      await subtle().sign("HMAC", key, enc.encode(drawMessage(gameId, drawVersion, counter))),
    );
    let r = 0n;
    for (let i = 0; i < 8; i++) r = (r << 8n) | BigInt(sig[i]);
    if (r < limit) return { ticket: r % n, counter };
  }
  throw new Error("DRAW_EXHAUSTED");
}

export interface VerifiableEntry {
  user_id: string;
  ticket_start: number | bigint;
  ticket_end: number | bigint;
}

export interface VerifiableGame {
  id: number;
  draw_version: number;
  pot_amount: number | bigint;
  server_seed_hash: string;
  server_seed: string | null;
  winning_ticket: number | bigint | null;
  winner_id: string | null;
}

export interface VerificationResult {
  ok: boolean;
  checks: { label: string; ok: boolean; detail: string }[];
  computedTicket?: bigint;
  computedWinner?: string;
}

export async function verifyGame(
  game: VerifiableGame,
  entries: VerifiableEntry[],
): Promise<VerificationResult> {
  const checks: VerificationResult["checks"] = [];
  if (!game.server_seed) {
    return { ok: false, checks: [{ label: "Seed revealed", ok: false, detail: "Game not finished yet" }] };
  }
  const hash = await sha256Hex(hexToBytes(game.server_seed));
  checks.push({
    label: "Seed matches pre-game commitment",
    ok: hash === game.server_seed_hash,
    detail: `SHA256(seed) = ${hash}`,
  });

  const sorted = [...entries].sort((a, b) => Number(BigInt(a.ticket_start) - BigInt(b.ticket_start)));
  let cursor = 0n;
  let contiguous = true;
  for (const e of sorted) {
    if (BigInt(e.ticket_start) !== cursor) contiguous = false;
    cursor = BigInt(e.ticket_end);
  }
  const pot = BigInt(game.pot_amount);
  checks.push({
    label: "Ticket ranges are contiguous and cover the pot",
    ok: contiguous && cursor === pot,
    detail: `${sorted.length} entries, tickets 0 to ${cursor}`,
  });

  const { ticket, counter } = await drawTicket(game.server_seed, game.id, game.draw_version, pot);
  checks.push({
    label: "Winning ticket recomputed",
    ok: game.winning_ticket != null && BigInt(game.winning_ticket) === ticket,
    detail: `ticket ${ticket} (sampling round ${counter})`,
  });

  const winner = sorted.find((e) => BigInt(e.ticket_start) <= ticket && ticket < BigInt(e.ticket_end));
  checks.push({
    label: "Ticket owner matches recorded winner",
    ok: !!winner && winner.user_id === game.winner_id,
    detail: winner ? `owner ${winner.user_id.slice(0, 8)}...` : "no owner found",
  });

  return { ok: checks.every((c) => c.ok), checks, computedTicket: ticket, computedWinner: winner?.user_id };
}
