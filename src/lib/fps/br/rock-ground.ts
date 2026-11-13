import type { Placement } from "./layout";
import { turnBox, type CollisionData } from "./static-world";
import type { WorldMeta } from "./world";

/**
 * Rocks that sit on the ground (owner, 2026-11-12: "then fix this broken mountain", a cliff scan
 * hanging over flat grass by a gravel road).
 *
 * The big rock scans are surfaces, not solids: a cliff face and the top of the rock behind it,
 * with nothing underneath. The layout stands each one at the lowest ground under its footprint,
 * which is right for a boulder; a crag or a sea cliff set down that way on open ground shows its
 * hollow underside from behind, the rock hanging up to 16–22 m over the grass or the water.
 *
 * So once the layout is done, every rock placement is checked against the ground under it, one
 * metre column at a time, from the lowest collision box in each column (the boxes follow the
 * scan's surface). It is lowered until no more than a few edge columns stand clear of the
 * ground, and only as far as leaves most of it standing; a rock that would have to be buried
 * deeper than that is taken out (on flat ground a cliff that needs a hillside behind it).
 * Under water only what shows above the surface counts: a shore rock may go down into the sea
 * as far as it likes (its underside is under the water there), not hang over it.
 * Server and clients run the same pass on the same data (buildIsland), so they agree.
 */
export const ROCK_GROUND = {
  /** A column floats when its underside is more than this over the ground (m). */
  clear: 1,
  /** The share of columns that may still float (the scans' ragged edges). */
  edge: 0.04,
  /** The deepest a rock is lowered, as a share of its height (and at least `minDrop` m). */
  drop: 0.35,
  minDrop: 1,
} as const;

const ROCKS = new Set([
  "rock-big-1",
  "rock-big-2",
  "rock-mid-1",
  "rock-mid-2",
  "rock-small",
  "rock-tall",
  "rock-grey",
  "rock-cluster",
  "rock-scan-15",
  "river-rock-a",
  "big-boulder",
  "crag",
  "boulder-field",
  "quarry-face",
  "sea-cliff",
  "shore-slab",
  "shore-ridge",
  "shore-ledge",
  "shore-cliff-a",
  "shore-cliff-b",
]);

/** Whether a model is one of the rock scans this pass grounds. */
export const isRock = (model: string) => ROCKS.has(model);

type Columns = { x: Float32Array; z: Float32Array; under: Float32Array; height: number };
const cache = new WeakMap<CollisionData, Map<string, Columns>>();

/** The model's 1 m columns (turned; their middles) and the lowest box in each. */
function columns(collision: CollisionData, model: string, turn: number): Columns | null {
  let byModel = cache.get(collision);
  if (!byModel) cache.set(collision, (byModel = new Map()));
  const key = `${model}:${turn & 3}`;
  const have = byModel.get(key);
  if (have) return have;
  const boxes = collision.models[model];
  if (!boxes?.length) return null;
  const low = new Map<number, number>();
  let bottom = Infinity,
    top = -Infinity;
  for (const box of boxes) {
    const [x0, y0, z0, x1, y1, z1] = turnBox(box, turn);
    bottom = Math.min(bottom, y0);
    top = Math.max(top, y1);
    for (let x = Math.floor(x0); x < x1; x++)
      for (let z = Math.floor(z0); z < z1; z++) {
        const k = (x + 2048) * 4096 + (z + 2048);
        const was = low.get(k);
        if (was === undefined || y0 < was) low.set(k, y0);
      }
  }
  const n = low.size;
  const out: Columns = {
    x: new Float32Array(n),
    z: new Float32Array(n),
    under: new Float32Array(n),
    height: top - bottom,
  };
  let i = 0;
  for (const [k, y] of low) {
    out.x[i] = Math.floor(k / 4096) - 2048 + 0.5;
    out.z[i] = (k % 4096) - 2048 + 0.5;
    out.under[i] = y;
    i++;
  }
  byModel.set(key, out);
  return out;
}

/**
 * How far a rock at `p` must come down to sit on the ground (m, ≥ 0), or null when that would
 * bury too much of it.
 */
export function rockDrop(
  p: Placement,
  collision: CollisionData,
  /** The ground or water under a point (visibleFloor). */
  floorAt: (x: number, z: number) => number,
): number | null {
  const cols = columns(collision, p.model, p.turn);
  if (!cols) return 0;
  const n = cols.under.length;
  const gaps = new Float32Array(n);
  for (let i = 0; i < n; i++)
    gaps[i] = p.y + cols.under[i]! - floorAt(p.x + cols.x[i]!, p.z + cols.z[i]!);
  gaps.sort();
  const drop = Math.max(0, gaps[Math.floor((n - 1) * (1 - ROCK_GROUND.edge))]! - ROCK_GROUND.clear);
  return drop <= Math.max(ROCK_GROUND.minDrop, cols.height * ROCK_GROUND.drop) ? drop : null;
}

/**
 * What a rock's underside must meet (m): the ground, or the water over it (the sea at y = 0 and
 * the lakes at their levels).
 */
export function visibleFloor(
  meta: WorldMeta,
  heightAt: (x: number, z: number) => number,
): (x: number, z: number) => number {
  const sea = meta.world.seaLevel ?? 0;
  return (x, z) => {
    let h = Math.max(heightAt(x, z), sea);
    for (const w of meta.waterBodies) {
      const [x0, z0, x1, z1] = w.bounds;
      if (x >= x0 && x <= x1 && z >= z0 && z <= z1 && h < w.level) h = w.level;
    }
    return h;
  };
}

/** The layout with every rock on the ground: lowered where it hung, out where it cannot sit. */
export function groundRocks(
  layout: Placement[],
  collision: CollisionData,
  floorAt: (x: number, z: number) => number,
): Placement[] {
  const out: Placement[] = [];
  for (const p of layout) {
    if (!ROCKS.has(p.model)) {
      out.push(p);
      continue;
    }
    const drop = rockDrop(p, collision, floorAt);
    if (drop === null) continue;
    out.push(drop > 0 ? { ...p, y: +(p.y - drop).toFixed(2) } : p);
  }
  return out;
}
