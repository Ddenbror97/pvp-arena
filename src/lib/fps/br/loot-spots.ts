import { PLAYER_RADIUS, STEP_HEIGHT } from "../map";
import type { CollisionData } from "./static-world";

/**
 * Where loot can lie in one model (LOOT-SPEC §2.2, §15.1), found from the model's own collision
 * boxes (the same boxes the server collides against), in model space:
 *
 * 1. A 0.5 m grid of columns over the model plus a margin; in each column the floor levels a
 *    standing player fits on (ground, or a box top with 1.8 m of clearance).
 * 2. A flood fill from the open ground around the model, stepping up at most one stair step
 *    (and dropping down any height): only floors a player can walk to count, so nothing lands
 *    in a sealed room, inside a wall or on a roof.
 * 3. Indoor spots (a ceiling above) next to a wall for buildings; ground spots right beside
 *    the model for props and vehicles. Spots are kept at least `spacing` apart.
 *
 * Deterministic (no randomness): per-match variety comes from which spots spawn and what
 * (loot.ts). Results are memoised per model.
 */
export type Spot = { x: number; y: number; z: number };

/** For a small companion-item offset: it must stay beneath this building's ceiling. */
export function indoorLootPoint(
  collision: CollisionData,
  model: string,
  x: number,
  y: number,
  z: number,
) {
  return (collision.models[model] ?? []).some(
    (b) => x >= b[0]! && x <= b[3]! && z >= b[2]! && z <= b[5]! && b[1]! >= y + 1.8,
  );
}
const CELL = 0.5;
const MARGIN = 2;
// Strictly more than the standing hull the server collides (EYE_HEIGHT + 0.2 = 1.8 m): a 1.8 m
// window opening reached over a sill must not count as a way in.
const CLEAR = 1.82;
const ROOF_MAX = 14;
const HULL = PLAYER_RADIUS - 0.05;

const cache = new Map<string, Spot[]>();

export function modelSpots(
  collision: CollisionData,
  model: string,
  mode: "indoor" | "beside",
  spacing: number,
  limit: number,
): Spot[] {
  const key = `${model}:${mode}:${spacing}:${limit}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const boxes = collision.models[model] ?? [];
  const spots = boxes.length ? find(boxes, mode, spacing, limit) : [];
  cache.set(key, spots);
  return spots;
}

function find(
  boxes: number[][],
  mode: "indoor" | "beside",
  spacing: number,
  limit: number,
): Spot[] {
  let x0 = Infinity,
    z0 = Infinity,
    x1 = -Infinity,
    z1 = -Infinity;
  for (const b of boxes) {
    x0 = Math.min(x0, b[0]!);
    z0 = Math.min(z0, b[2]!);
    x1 = Math.max(x1, b[3]!);
    z1 = Math.max(z1, b[5]!);
  }
  x0 -= MARGIN;
  z0 -= MARGIN;
  const nx = Math.ceil((x1 + MARGIN - x0) / CELL),
    nz = Math.ceil((z1 + MARGIN - z0) / CELL);
  // Column intervals: every box overlapping the hull square centred on the column.
  const spans: number[][] = Array.from({ length: nx * nz }, () => []);
  for (const b of boxes) {
    const i0 = Math.max(0, Math.floor((b[0]! - HULL - x0) / CELL)),
      i1 = Math.min(nx - 1, Math.floor((b[3]! + HULL - x0) / CELL)),
      k0 = Math.max(0, Math.floor((b[2]! - HULL - z0) / CELL)),
      k1 = Math.min(nz - 1, Math.floor((b[5]! + HULL - z0) / CELL));
    for (let k = k0; k <= k1; k++)
      for (let i = i0; i <= i1; i++) {
        const cx = x0 + (i + 0.5) * CELL,
          cz = z0 + (k + 0.5) * CELL;
        if (cx + HULL <= b[0]! || cx - HULL >= b[3]! || cz + HULL <= b[2]! || cz - HULL >= b[5]!)
          continue;
        spans[k * nx + i]!.push(b[1]!, b[4]!);
      }
  }
  const clearAt = (c: number, y: number) => {
    const s = spans[c]!;
    for (let j = 0; j < s.length; j += 2)
      if (s[j]! < y + CLEAR && s[j + 1]! > y + 0.01) return false;
    return true;
  };
  // Standable levels per column.
  const levels: number[][] = spans.map((s, c) => {
    const out: number[] = [];
    const cand = [0];
    for (let j = 1; j < s.length; j += 2) if (s[j]! > 0.05 && s[j]! < 30) cand.push(s[j]!);
    cand.sort((a, b) => a - b);
    for (const y of cand) {
      if (out.length && y - out[out.length - 1]! < 0.05) continue;
      if (clearAt(c, y)) out.push(y);
    }
    return out;
  });
  // Flood fill from the open border at ground level.
  const seen = new Set<number>();
  const node = (c: number, li: number) => c * 64 + li;
  const queue: Array<[number, number]> = [];
  for (let k = 0; k < nz; k++)
    for (let i = 0; i < nx; i++) {
      if (i > 0 && i < nx - 1 && k > 0 && k < nz - 1) continue;
      const c = k * nx + i;
      if (levels[c]![0] === 0 && !seen.has(node(c, 0))) {
        seen.add(node(c, 0));
        queue.push([c, 0]);
      }
    }
  while (queue.length) {
    const [c, li] = queue.pop()!;
    const y = levels[c]![li]!;
    const i = c % nx,
      k = (c - i) / nx;
    for (const [di, dk] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const ni = i + di,
        nk = k + dk;
      if (ni < 0 || nk < 0 || ni >= nx || nk >= nz) continue;
      const n = nk * nx + ni;
      const ls = levels[n]!;
      for (let lj = 0; lj < ls.length; lj++) {
        const t = ls[lj]!;
        if (t - y > STEP_HEIGHT + 0.01) break;
        // Moving across at the current height must fit; then step up or drop down.
        if (t < y - 0.01 && !clearAt(n, y)) continue;
        const id = node(n, lj);
        if (seen.has(id)) continue;
        seen.add(id);
        queue.push([n, lj]);
      }
    }
  }
  // Candidate spots.
  const wallAt = (c: number, y: number) => {
    const s = spans[c]!;
    for (let j = 0; j < s.length; j += 2) if (s[j]! < y + 1.5 && s[j + 1]! > y + 0.3) return true;
    return false;
  };
  const roofed = (c: number, y: number) => {
    const s = spans[c]!;
    for (let j = 0; j < s.length; j += 2)
      if (s[j]! >= y + CLEAR - 0.01 && s[j]! < y + ROOF_MAX) return true;
    return false;
  };
  const cands: Array<Spot & { score: number }> = [];
  for (const id of seen) {
    const c = Math.floor(id / 64),
      li = id % 64;
    const y = levels[c]![li]!;
    const i = c % nx,
      k = (c - i) / nx;
    if (i < 1 || k < 1 || i >= nx - 1 || k >= nz - 1) continue;
    const near = wallAt(c + 1, y) || wallAt(c - 1, y) || wallAt(c + nx, y) || wallAt(c - nx, y);
    if (!near) continue;
    const inside = roofed(c, y);
    if (mode === "indoor" ? !inside : inside || y > 0.05) continue;
    const x = +(x0 + (i + 0.5) * CELL).toFixed(2),
      z = +(z0 + (k + 0.5) * CELL).toFixed(2);
    // Deterministic order that spreads picks across floors and rooms.
    const score =
      (Math.imul((i * 73856093) ^ (k * 19349663) ^ (li * 83492791), 2654435761) >>> 0) / 2 ** 32;
    cands.push({ x, y: +y.toFixed(3), z, score });
  }
  cands.sort((a, b) => a.score - b.score);
  const out: Spot[] = [];
  for (const s of cands) {
    if (out.length >= limit) break;
    if (out.some((o) => Math.hypot(o.x - s.x, o.z - s.z) < spacing && Math.abs(o.y - s.y) < 2))
      continue;
    out.push({ x: s.x, y: s.y, z: s.z });
  }
  return out;
}

/** Model-space point turned like `turnBox` (three.js rotation.y = turn·π/2). */
export function turnPoint(x: number, z: number, turn: number): [number, number] {
  switch (turn & 3) {
    case 1:
      return [z, -x];
    case 2:
      return [-x, -z];
    case 3:
      return [-z, x];
    default:
      return [x, z];
  }
}
