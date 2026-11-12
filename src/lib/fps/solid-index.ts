import { PLAYER_RADIUS, type Solid } from "./map";
import type { GameMap, SolidBounds } from "./maps/types";

/**
 * Spatial index over a map's solids (performance audit 2026-11-11). The 1v1 and 5v5 engines
 * tested every solid for every movement step and every sight ray: on Iron District that is
 * 372 boxes, and the sight test alone was 39 % of a full room's CPU time (movement 20 %).
 *
 * The index only narrows which solids are tested; the tests themselves are unchanged, and every
 * caller's result is a boolean "any" or a min/max over the solids, so the order they are
 * visited in does not matter. Results are identical to the full scan by construction as long
 * as the candidates are a superset of the solids that could pass (tests/fps-solid-index.test.ts
 * holds that, and the two against each other on every map).
 *
 * Built once per map object on first use (maps are immutable).
 */

/** Movement queries: solids whose footprint, grown by the player's radius, is within this of a point. */
export const NEAR_REACH = 1;
const NEAR_CELL = 2;
const SIGHT_CELL = 4;
/** A sight solid over more cells than this is tested for every ray instead of being indexed. */
const BIG = 96;
/** Rays visit every cell within this of the segment (far above the slab test's rounding). */
const RAY_PAD = 0.05;

type Grid<T> = {
  readonly cell: number;
  readonly cols: number;
  readonly rows: number;
  readonly x0: number;
  readonly z0: number;
  readonly cells: readonly (readonly T[])[];
};

function grid<T>(
  map: GameMap,
  cell: number,
  items: readonly T[],
  span: (item: T) => readonly [number, number, number, number],
  /** Returns false to leave the item out of the grid (handled by the caller). */
  keep: (cells: number) => boolean = () => true,
): Grid<T> {
  // The arena plus a border; anything outside clamps to the edge cells (clamping is monotone,
  // so a query point outside still lands in a cell every solid reaching it was put in).
  const x0 = -map.arena.width / 2 - cell,
    z0 = -map.arena.depth / 2 - cell;
  const cols = Math.ceil(map.arena.width / cell) + 2,
    rows = Math.ceil(map.arena.depth / cell) + 2;
  const cells: T[][] = Array.from({ length: cols * rows }, () => []);
  const col = (x: number) => Math.min(cols - 1, Math.max(0, Math.floor((x - x0) / cell)));
  const row = (z: number) => Math.min(rows - 1, Math.max(0, Math.floor((z - z0) / cell)));
  for (const item of items) {
    const [minX, maxX, minZ, maxZ] = span(item);
    const a0 = col(minX),
      a1 = col(maxX),
      b0 = row(minZ),
      b1 = row(maxZ);
    if (!keep((a1 - a0 + 1) * (b1 - b0 + 1))) continue;
    for (let b = b0; b <= b1; b++) for (let a = a0; a <= a1; a++) cells[b * cols + a]!.push(item);
  }
  return { cell, cols, rows, x0, z0, cells };
}

const at = <T>(g: Grid<T>, x: number, z: number) =>
  g.cells[
    Math.min(g.rows - 1, Math.max(0, Math.floor((z - g.z0) / g.cell))) * g.cols +
      Math.min(g.cols - 1, Math.max(0, Math.floor((x - g.x0) / g.cell)))
  ]!;

export type SightBounds = SolidBounds & { readonly n: number };
type Index = {
  movement: Grid<Solid>;
  boxes: Grid<Solid>;
  sight: Grid<SightBounds>;
  big: readonly SolidBounds[];
  /** Per-ray visit marks, by a solid's number (a solid in several cells is tested once). */
  seen: Uint32Array;
  ray: number;
};

const indexes = new WeakMap<GameMap, Index>();
function indexOf(map: GameMap): Index {
  let index = indexes.get(map);
  if (index) return index;
  const footprint = (s: Solid) => {
    const pad = PLAYER_RADIUS + NEAR_REACH;
    return [
      s.x - s.w / 2 - pad,
      s.x + s.w / 2 + pad,
      s.z - s.d / 2 - pad,
      s.z + s.d / 2 + pad,
    ] as const;
  };
  const numbered: SightBounds[] = map.worldBounds.map((s, n) => ({ ...s, n }));
  const big: SolidBounds[] = [];
  const sight = grid(
    map,
    SIGHT_CELL,
    numbered,
    (s) => [s.minX - RAY_PAD, s.maxX + RAY_PAD, s.minZ - RAY_PAD, s.maxZ + RAY_PAD] as const,
    (cells) => cells <= BIG,
  );
  const indexed = new Set<SightBounds>();
  for (const cell of sight.cells) for (const s of cell) indexed.add(s);
  for (const s of numbered) if (!indexed.has(s)) big.push(s);
  index = {
    movement: grid(map, NEAR_CELL, map.movementSolids, footprint),
    boxes: grid(map, NEAR_CELL, map.boxes, footprint),
    sight,
    big,
    seen: new Uint32Array(numbered.length),
    ray: 0,
  };
  indexes.set(map, index);
  return index;
}

/**
 * The movement solids (boxes and barriers) that can touch a player within NEAR_REACH of (x, z):
 * a superset of those whose footprint grown by the player's radius is within NEAR_REACH.
 */
export function movementSolidsNear(map: GameMap, x: number, z: number): readonly Solid[] {
  return at(indexOf(map).movement, x, z);
}
/** As movementSolidsNear, for `map.boxes` (supports: floors, stairs, crates). */
export function boxesNear(map: GameMap, x: number, z: number): readonly Solid[] {
  return at(indexOf(map).boxes, x, z);
}

/**
 * The sight solids' grid, for visibility-occlusion.ts (which walks it itself, so a ray allocates
 * nothing): solids over most of the map are in `big` and tested for every ray; the rest are in
 * 4 m cells, numbered so one in several cells is tested once per ray (`seen`, `ray`).
 */
export function sightIndex(map: GameMap) {
  return indexOf(map);
}
export { RAY_PAD };
