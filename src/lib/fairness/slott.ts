/**
 * PVPspinArena P2P Slott fairness protocol v1 (independent of the Postgres implementation).
 *
 *   commitment = SHA256(server_seed)                                (published at creation)
 *   message    = "PVPCasino:slott:" + protocol + ":" + game_id + ":" + spin_no + ":" + cell
 *   h          = HMAC-SHA256(key = server_seed, data = UTF-8(message))
 *   v1 roll    = (h[0] * 256 + h[1]) mod 1024
 *   v2 roll    = (h[0] * 256 + h[1]) mod 1026
 *   v3 roll    = (h[0..3] as uint32) mod 54286
 *   symbol     = first symbol whose cumulative weight exceeds the roll
 *
 * Cells are reel-major (cell = reel * 4 + row). Score follows the v1 paytable.
 */
import { hexToBytes, hmacKey, hmacSha256, sha256Hex } from "./core";
import {
  CELLS,
  scoreGrid,
  symbolForRoll,
  symbolForRollV2,
  symbolForRollV3,
  WEIGHT_TOTAL,
  WEIGHT_TOTAL_V2,
  WEIGHT_TOTAL_V3,
  type SpinScore,
} from "@/lib/slott/paytable";

export const SLOTT_PROTOCOL = "v1";

export function slottMessage(
  gameId: number | bigint | string,
  spinNo: number,
  cell: number,
  protocol = SLOTT_PROTOCOL,
): string {
  const id = BigInt(gameId);
  if (id < 1n || !Number.isInteger(spinNo) || spinNo < 1 || cell < 0 || cell >= CELLS)
    throw new Error("Invalid spin");
  if (protocol !== "v1" && protocol !== "v2" && protocol !== "v3") throw new Error("Invalid protocol");
  return `PVPCasino:slott:${protocol}:${id.toString()}:${spinNo}:${cell}`;
}

function rollOf(h: Uint8Array, protocol: string): number {
  if (protocol === "v3") {
    return (h[0]! * 16777216 + h[1]! * 65536 + h[2]! * 256 + h[3]!) % WEIGHT_TOTAL_V3;
  }
  return (h[0]! * 256 + h[1]!) % (protocol === "v2" ? WEIGHT_TOTAL_V2 : WEIGHT_TOTAL);
}

export async function slottGrid(
  seedHex: string,
  gameId: number | bigint | string,
  spinNo: number,
  protocol = SLOTT_PROTOCOL,
): Promise<number[]> {
  if (hexToBytes(seedHex).length !== 32) throw new Error("Seed must be 32 bytes");
  const key = await hmacKey(seedHex);
  const pick =
    protocol === "v3" ? symbolForRollV3 : protocol === "v2" ? symbolForRollV2 : symbolForRoll;
  const grid: number[] = [];
  for (let c = 0; c < CELLS; c++) {
    const h = await hmacSha256(key, slottMessage(gameId, spinNo, c, protocol));
    grid.push(pick(rollOf(h, protocol)));
  }
  return grid;
}

export async function slottOutcome(
  seedHex: string,
  gameId: number | bigint | string,
  spinNo: number,
  protocol = SLOTT_PROTOCOL,
): Promise<{ grid: number[] } & SpinScore> {
  const grid = await slottGrid(seedHex, gameId, spinNo, protocol);
  return { grid, ...scoreGrid(grid) };
}

export interface SlottCheck {
  label: string;
  ok: boolean;
  detail: string;
}

export async function verifySlott(
  g: {
    id: number | string;
    protocol_version?: string;
    server_seed_hash: string;
    server_seed: string | null;
    score_a: number;
    score_b: number;
  },
  spins: { spin_no: number; seat: string; grid: number[]; score: number; wild_count: number }[],
): Promise<{ ok: boolean; checks: SlottCheck[] }> {
  if (!g.server_seed)
    return {
      ok: false,
      checks: [{ label: "Seed revealed", ok: false, detail: "Match not finished yet" }],
    };
  const checks: SlottCheck[] = [];
  const hash = await sha256Hex(hexToBytes(g.server_seed));
  checks.push({
    label: "Seed matches the commitment published at creation",
    ok: hash === g.server_seed_hash,
    detail: `SHA256(seed) = ${hash}`,
  });
  let a = 0;
  let b = 0;
  let bad = 0;
  for (const s of [...spins].sort((x, y) => x.spin_no - y.spin_no)) {
    const o = await slottOutcome(g.server_seed, g.id, s.spin_no, g.protocol_version ?? "v1");
    const same =
      o.grid.every((v, i) => v === s.grid[i]) && o.score === s.score && o.wilds === s.wild_count;
    if (!same) bad++;
    if (s.seat === "A") a += o.score;
    else b += o.score;
  }
  checks.push({
    label: `All ${spins.length} spins recomputed`,
    ok: bad === 0,
    detail: bad === 0 ? "Every grid, score and WILD count matches" : `${bad} spin(s) differ`,
  });
  checks.push({
    label: "Totals match the recorded scores",
    ok: a === g.score_a && b === g.score_b,
    detail: `Player A ${a} · Player B ${b}`,
  });
  return { ok: checks.every((c) => c.ok), checks };
}
