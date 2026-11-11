import type { Heightfield } from "./heightfield";
import type { LandCoverMap } from "./landcover";
import { WORLD_HALF, WORLD_SIZE, type WorldMeta } from "./world";

/**
 * Deterministic tree placement for Project Island, shared by the client (instanced rendering)
 * and the server (trunk collision for movement, bullets and line of sight). Nothing is
 * downloaded per tree: every tree follows from the world seed, the land cover and the
 * heightfield, so every player and the server see exactly the same forest (fairness: cover is
 * never a function of a machine's speed).
 *
 * Integer hashing only (no Math.random, no transcendental functions), so results are identical
 * on every JavaScript engine.
 */

/** Streaming cell size (m); the map is 40 × 40 cells. */
export const CELL_SIZE = 250;
export const CELLS = WORLD_SIZE / CELL_SIZE;
/** Candidate spacing (m) of the jittered placement grid. */
const STEP = 7;
const STEPS_PER_CELL = Math.ceil(CELL_SIZE / STEP);

export const SPECIES = ["pine", "broadleaf", "birch"] as const;
export type Species = (typeof SPECIES)[number];

/** Collision radius of a trunk at scale 1 (m), and its height to the crown base. */
export const TRUNK = {
  pine: { radius: 0.32, height: 15 },
  broadleaf: { radius: 0.45, height: 11 },
  birch: { radius: 0.22, height: 13 },
} as const satisfies Record<Species, { radius: number; height: number }>;

/** Floats per tree in a cell's packed array: x, y (ground), z, scale, yaw (0..1), species. */
export const TREE_STRIDE = 6;

/** Acceptance per candidate by land-cover class id (water, sand, grass, field, forest, rock, urban, road). */
const DENSITY = [0, 0, 0.035, 0.008, 0.62, 0.01, 0, 0];
const SEED = 20261103;
const EMPTY = new Float64Array(0);

function hash(x: number, z: number, salt: number) {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(z | 0, 0x165667b1) ^ Math.imul(salt, 0x9e3779b9);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth value noise in [0,1] at world-grid scale `size` (m), for clearings and groves. */
function valueNoise(x: number, z: number, size: number, salt: number) {
  const fx = x / size,
    fz = z / size;
  const ix = Math.floor(fx),
    iz = Math.floor(fz);
  const tx = fx - ix,
    tz = fz - iz;
  const sx = tx * tx * (3 - 2 * tx),
    sz = tz * tz * (3 - 2 * tz);
  const a = hash(ix, iz, salt),
    b = hash(ix + 1, iz, salt),
    c = hash(ix, iz + 1, salt),
    d = hash(ix + 1, iz + 1, salt);
  return (a * (1 - sx) + b * sx) * (1 - sz) + (c * (1 - sx) + d * sx) * sz;
}

export type VegetationWorld = {
  hf: Heightfield;
  cover: LandCoverMap;
  /**
   * Circles kept free of trees (building pads, runways, bridge heads, every placed building),
   * indexed by vegetation cell: cell → packed (x, z, r²).
   */
  clear: Map<number, Float64Array>;
  /** Planted trees (town yards, layout.ts) by cell: packed (x, z, species). */
  planted: Map<number, number[]>;
  /**
   * Road segments kept free of trees, by cell: packed (ax, az, bx, bz, r²), r the road's half
   * width and a trunk's clearance (road audit 2026-11-11: the land cover's road class is a
   * coarse raster, and trees stood on the roads where it missed them).
   */
  roads: Map<number, Float64Array>;
  /** Generated cells (bounded; oldest evicted). */
  cache: Map<number, Float32Array>;
};

export function vegetationWorld(
  hf: Heightfield,
  cover: LandCoverMap,
  meta: WorldMeta,
  /** Extra tree-free circles (x, z, radius): the footprints of placed buildings. */
  clearings: ReadonlyArray<readonly [number, number, number]> = [],
  /**
   * Trees placed by the layout (yards in the towns, where the land cover grows none): drawn and
   * collided like every other tree, so the server and every client have the same ones.
   */
  plantedTrees: ReadonlyArray<{ x: number; z: number; species: Species }> = [],
): VegetationWorld {
  const circles: number[] = [];
  for (const p of meta.pois) if (p.padRadius) circles.push(p.x, p.z, (p.padRadius + 15) ** 2);
  // Redstone Quarry's working floor (its rock cover grows a sparse scatter elsewhere).
  for (const p of meta.pois) if (p.id === "redstone-quarry") circles.push(p.x, p.z, 380 ** 2);
  // Runways and bridge approaches as chains of circles.
  const chain = (a: [number, number], b: [number, number], r: number) => {
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / r));
    for (let k = 0; k <= n; k++)
      circles.push(a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n, r * r);
  };
  for (const r of meta.runways) chain(r.a, r.b, r.width / 2 + 40);
  for (const b of meta.bridges) {
    chain(b.a, b.a, 45);
    chain(b.b, b.b, 45);
    // And along the whole deck (the Old Dam's ends stand on land).
    chain(b.a, b.b, b.width / 2 + 6);
  }
  for (const [x, z, r] of clearings) circles.push(x, z, r * r);
  // Index by cell so a tree checks only the circles that reach its cell.
  const buckets = new Map<number, number[]>();
  for (let k = 0; k < circles.length; k += 3) {
    const x = circles[k]!,
      z = circles[k + 1]!,
      r = Math.sqrt(circles[k + 2]!);
    for (let cj = cellOf(z - r); cj <= cellOf(z + r); cj++)
      for (let ci = cellOf(x - r); ci <= cellOf(x + r); ci++) {
        const key = cj * CELLS + ci;
        let b = buckets.get(key);
        if (!b) buckets.set(key, (b = []));
        b.push(x, z, circles[k + 2]!);
      }
  }
  const clear = new Map<number, Float64Array>();
  for (const [key, b] of buckets) clear.set(key, Float64Array.from(b));
  const planted = new Map<number, number[]>();
  for (const t of plantedTrees) {
    const key = cellOf(t.z) * CELLS + cellOf(t.x);
    let list = planted.get(key);
    if (!list) planted.set(key, (list = []));
    list.push(t.x, t.z, SPECIES.indexOf(t.species));
  }
  const roadLists = new Map<number, number[]>();
  for (const r of meta.roads) {
    const reach = r.width / 2 + 1.5;
    for (let k = 1; k < r.points.length; k++) {
      const [ax, az] = r.points[k - 1]!,
        [bx, bz] = r.points[k]!;
      for (let cj = cellOf(Math.min(az, bz) - reach); cj <= cellOf(Math.max(az, bz) + reach); cj++)
        for (
          let ci = cellOf(Math.min(ax, bx) - reach);
          ci <= cellOf(Math.max(ax, bx) + reach);
          ci++
        ) {
          const key = cj * CELLS + ci;
          let list = roadLists.get(key);
          if (!list) roadLists.set(key, (list = []));
          list.push(ax, az, bx, bz, reach * reach);
        }
    }
  }
  const roads = new Map<number, Float64Array>();
  for (const [key, list] of roadLists) roads.set(key, Float64Array.from(list));
  return { hf, cover, clear, planted, roads, cache: new Map() };
}

/**
 * Trees of one 250 m cell (ci, cj in 0..39), packed TREE_STRIDE floats per tree. Cached; the
 * cache holds at most `maxCached` cells (oldest evicted).
 */
export function cellTrees(
  world: VegetationWorld,
  ci: number,
  cj: number,
  maxCached = 400,
): Float32Array {
  const key = cj * CELLS + ci;
  const cache = world.cache;
  const hit = cache.get(key);
  if (hit) return hit;
  const out: number[] = [];
  const { hf, cover } = world;
  const clear = world.clear.get(key) ?? EMPTY;
  const x0 = -WORLD_HALF + ci * CELL_SIZE,
    z0 = -WORLD_HALF + cj * CELL_SIZE;
  const gi0 = ci * STEPS_PER_CELL,
    gj0 = cj * STEPS_PER_CELL;
  for (let j = 0; j < STEPS_PER_CELL; j++)
    for (let i = 0; i < STEPS_PER_CELL; i++) {
      const gi = gi0 + i,
        gj = gj0 + j;
      const x = x0 + (i + hash(gi, gj, SEED + 1)) * (CELL_SIZE / STEPS_PER_CELL);
      const z = z0 + (j + hash(gi, gj, SEED + 2)) * (CELL_SIZE / STEPS_PER_CELL);
      const cls = cover.classIdAt(x, z);
      let p = DENSITY[cls] ?? 0;
      if (p === 0) continue;
      // Clumping: forests get clearings, open land gets groves and hedgerow clusters.
      const n = valueNoise(x, z, 140, SEED + 3);
      p *= cls === 4 ? 0.35 + 1.1 * n : n * n * 3.2;
      if (hash(gi, gj, SEED + 4) >= p) continue;
      const y = hf.heightAt(x, z);
      if (y < 1.6) continue; // beaches, banks and water
      if (hf.slopeAt(x, z) > 0.9) continue; // cliffs and quarry walls
      if (y > 285) continue; // above the tree line (Iron Peaks)
      let blocked = false;
      for (let k = 0; k < clear.length; k += 3) {
        const dx = x - clear[k]!,
          dz = z - clear[k + 1]!;
        if (dx * dx + dz * dz < clear[k + 2]!) {
          blocked = true;
          break;
        }
      }
      if (blocked) continue;
      const near = world.roads.get(key) ?? EMPTY;
      for (let k = 0; k < near.length; k += 5) {
        const ax = near[k]!,
          az = near[k + 1]!,
          vx = near[k + 2]! - ax,
          vz = near[k + 3]! - az;
        const u = Math.max(
          0,
          Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz || 1)),
        );
        const dx = x - ax - vx * u,
          dz = z - az - vz * u;
        if (dx * dx + dz * dz < near[k + 4]!) {
          blocked = true;
          break;
        }
      }
      if (blocked) continue;
      // Species: pines dominate forests and high ground, broadleaf the lowland, birch near water.
      const r = hash(gi, gj, SEED + 5);
      const species = y > 120 || (cls === 4 && r < 0.62) ? 0 : r < 0.82 ? 1 : 2;
      const scale = 0.78 + 0.5 * hash(gi, gj, SEED + 6);
      out.push(x, y, z, scale, hash(gi, gj, SEED + 7), species);
    }
  // Planted trees (no clearing test: the layout put them in free spots of its own).
  const planted = world.planted.get(key);
  if (planted)
    for (let k = 0; k < planted.length; k += 3) {
      const x = planted[k]!,
        z = planted[k + 1]!,
        gi = Math.round(x * 10),
        gj = Math.round(z * 10);
      out.push(
        x,
        hf.heightAt(x, z),
        z,
        0.72 + 0.32 * hash(gi, gj, SEED + 8),
        hash(gi, gj, SEED + 9),
        planted[k + 2]!,
      );
    }
  const trees = Float32Array.from(out);
  cache.set(key, trees);
  if (cache.size > maxCached) cache.delete(cache.keys().next().value!);
  return trees;
}

/** Cell index of a world coordinate (clamped). */
export const cellOf = (v: number) =>
  Math.min(CELLS - 1, Math.max(0, Math.floor((v + WORLD_HALF) / CELL_SIZE)));

/**
 * Trunks near a point, for collision and sight lines: calls `visit(x, z, radius, height, y)`
 * for every tree whose trunk is within `range` (m) of x/z.
 */
export function forEachTrunkNear(
  world: VegetationWorld,
  x: number,
  z: number,
  range: number,
  visit: (tx: number, tz: number, radius: number, height: number, ground: number) => void,
) {
  const i0 = cellOf(x - range),
    i1 = cellOf(x + range),
    j0 = cellOf(z - range),
    j1 = cellOf(z + range);
  for (let cj = j0; cj <= j1; cj++)
    for (let ci = i0; ci <= i1; ci++) {
      const t = cellTrees(world, ci, cj);
      for (let k = 0; k < t.length; k += TREE_STRIDE) {
        const dx = t[k]! - x,
          dz = t[k + 2]! - z;
        if (Math.abs(dx) > range + 1 || Math.abs(dz) > range + 1) continue;
        const kind = TRUNK[SPECIES[t[k + 5]!]!];
        const s = t[k + 3]!;
        visit(t[k]!, t[k + 2]!, kind.radius * s, kind.height * s, t[k + 1]!);
      }
    }
}
