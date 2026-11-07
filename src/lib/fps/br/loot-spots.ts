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
 * 3. Indoor spots need a ceiling and surrounding room walls. The broader sheltered mode is
 *    retained for door inference only. Spots are kept at least `spacing` apart.
 *
 * Deterministic (no randomness): per-match variety comes from which spots spawn and what
 * (loot.ts). Results are memoised per model.
 */
export type Spot = { x: number; y: number; z: number };
// Door inference needs the original broad sheltered-space topology, including porches.
// Loot uses the stricter indoor room classification instead.
type SpotMode = "indoor" | "sheltered" | "beside";

/** A roof alone also covers porches. Require a room around the point, not just an eave. */
export function indoorLootPoint(
  collision: CollisionData,
  model: string,
  x: number,
  y: number,
  z: number,
) {
  return insideRoom(collision.models[model] ?? [], x, y, z);
}

const ROOM_RAYS = Array.from({ length: 16 }, (_, i) => {
  const a = (i * Math.PI * 2) / 16;
  return [Math.cos(a), Math.sin(a)] as const;
});

function insideRoom(boxes: number[][], x: number, y: number, z: number) {
  // Test the point itself; the player-hull grid also overlaps roofs outside their edges.
  if (
    !boxes.some(
      (b) =>
        x >= b[0]! &&
        x <= b[3]! &&
        z >= b[2]! &&
        z <= b[5]! &&
        b[1]! >= y + CLEAR - 0.01 &&
        b[1]! < y + ROOF_MAX,
    )
  )
    return false;
  // Voxel walls can be split vertically across several boxes. Sample torso height,
  // rather than requiring one box to span the entire height of a wall.
  const walls = boxes.filter((b) => b[1]! <= y + 1.2 && b[4]! >= y + 1.2);
  let enclosed = 0;
  for (const [dx, dz] of ROOM_RAYS) {
    if (
      walls.some((b) => {
        let near = 0,
          far = 80;
        for (const [p, d, lo, hi] of [
          [x, dx, b[0]!, b[3]!],
          [z, dz, b[2]!, b[5]!],
        ]) {
          if (Math.abs(d!) < 1e-8) {
            if (p! < lo! || p! > hi!) return false;
          } else {
            const a = (lo! - p!) / d!,
              c = (hi! - p!) / d!;
            near = Math.max(near, Math.min(a, c));
            far = Math.min(far, Math.max(a, c));
            if (far < near) return false;
          }
        }
        return far >= near;
      })
    )
      enclosed++;
  }
  // Leave room for doorways and shopfronts, but reject open-sided verandas and carports.
  return enclosed >= 12;
}
const CELL = 0.5;
const MARGIN = 2;
// Strictly more than the standing hull the server collides (EYE_HEIGHT + 0.2 = 1.8 m): a 1.8 m
// window opening reached over a sill must not count as a way in.
const CLEAR = 1.82;
const ROOF_MAX = 14;
const HULL = PLAYER_RADIUS - 0.05;

const caches = new WeakMap<CollisionData, Map<string, Spot[]>>();

export function modelSpots(
  collision: CollisionData,
  model: string,
  mode: SpotMode,
  spacing: number,
  limit: number,
): Spot[] {
  let cache = caches.get(collision);
  if (!cache) caches.set(collision, (cache = new Map()));
  const key = `${model}:${mode}:${spacing}:${limit}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const boxes = collision.models[model] ?? [];
  const spots = boxes.length ? find(boxes, mode, spacing, limit, collision.entrances?.[model]) : [];
  cache.set(key, spots);
  return spots;
}

function find(
  boxes: number[][],
  mode: SpotMode,
  spacing: number,
  limit: number,
  entrances: NonNullable<CollisionData["entrances"]>[string] = [],
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
  // Authored doors/stairs have been walked with the real player hull. A half-metre
  // loot grid can miss a narrow stair tread, leaving an otherwise reachable room empty.
  // Start its interior flood just inside those verified portals as well.
  for (const d of mode === "indoor" ? entrances : []) {
    for (
      let k = Math.max(0, Math.floor((d.z - 1.2 - z0) / CELL));
      k <= Math.min(nz - 1, Math.floor((d.z + 1.2 - z0) / CELL));
      k++
    )
      for (
        let i = Math.max(0, Math.floor((d.x - 1.2 - x0) / CELL));
        i <= Math.min(nx - 1, Math.floor((d.x + 1.2 - x0) / CELL));
        i++
      ) {
        const c = k * nx + i;
        const x = x0 + (i + 0.5) * CELL,
          z = z0 + (k + 0.5) * CELL;
        for (let li = 0; li < levels[c]!.length; li++) {
          const y = levels[c]![li]!;
          if (Math.abs(y - d.y0) > STEP_HEIGHT || !insideRoom(boxes, x, y, z)) continue;
          const id = node(c, li);
          if (!seen.has(id)) {
            seen.add(id);
            queue.push([c, li]);
          }
        }
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
    if (mode !== "beside" ? !inside : inside || y > 0.05) continue;
    const x = +(x0 + (i + 0.5) * CELL).toFixed(2),
      z = +(z0 + (k + 0.5) * CELL).toFixed(2);
    if (mode === "indoor" && !insideRoom(boxes, x, y, z)) continue;
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
