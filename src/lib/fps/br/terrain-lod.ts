import type { Heightfield } from "./heightfield";
import { WORLD_HALF } from "./world";

/**
 * CDLOD patch selection for the Project Island terrain, without three.js so it can be tested
 * (and reused by tools) on its own.
 *
 * The terrain is drawn from one instanced grid patch per selected quadtree node. Two properties
 * make it crack-free WITHOUT skirts (skirts z-fight with the neighbouring patch at sub-pixel
 * level and draw a dark line along patch borders under MSAA):
 *
 *  1. Neighbouring patches differ by at most one level. That holds when each level's range is
 *     larger than the 3D diagonal of its parent node, so a node never borders one two levels
 *     coarser; `checkLodConfig` verifies it and tests/br-terrain-lod.test.ts checks real views.
 *  2. Along a border between levels L and L+1 the finer patch is fully morphed to the coarser
 *     grid. Morphing finishes at `morphEnd · range` (< range); the coarser node was not
 *     subdivided because its bounding box is farther than `range`, so every shared vertex is
 *     past `morphEnd · range` and lands exactly on the coarse grid (identical integer grid
 *     coordinates and height texels on both sides).
 *  3. The coarser patch has not started ITS morph on that border: the border is within
 *     `range[L] + diag(L+1)` of the camera, below `morphStart · range[L+1]`.
 */
export type LodConfig = {
  /** Quads per patch side. */
  patch: number;
  /** Number of quadtree levels (level 0 = full resolution). */
  levels: number;
  /** Distance (m) within which level 0 is used; each level doubles it. */
  baseRange: number;
  /** Morph from morphStart · range to morphEnd · range. */
  morphStart: number;
  morphEnd: number;
};

export type MinMaxPyramid = Array<{ cols: number; min: Float32Array; max: Float32Array }>;

export const lodRanges = (cfg: LodConfig) =>
  Array.from({ length: cfg.levels }, (_, l) => cfg.baseRange * 2 ** l);

/** Per-node min/max heights for each quadtree level (for distances and frustum culling). */
export function buildMinMax(hf: Heightfield, patch: number, levels: number): MinMaxPyramid {
  const n = hf.width - 1;
  const out: MinMaxPyramid = [];
  const cols0 = Math.ceil(n / patch);
  const min0 = new Float32Array(cols0 * cols0).fill(Infinity),
    max0 = new Float32Array(cols0 * cols0).fill(-Infinity);
  for (let z = 0; z <= n; z++)
    for (let x = 0; x <= n; x++) {
      const v = hf.data[z * hf.width + x]!;
      // A sample on a patch border belongs to both neighbours.
      const cz0 = Math.floor(z / patch),
        cz1 = Math.floor((z - 1) / patch),
        cx0 = Math.floor(x / patch),
        cx1 = Math.floor((x - 1) / patch);
      for (const cz of cz0 === cz1 ? [cz0] : [cz0, cz1])
        for (const cx of cx0 === cx1 ? [cx0] : [cx0, cx1]) {
          if (cx < 0 || cz < 0 || cx >= cols0 || cz >= cols0) continue;
          const k = cz * cols0 + cx;
          if (v < min0[k]!) min0[k] = v;
          if (v > max0[k]!) max0[k] = v;
        }
    }
  out.push({ cols: cols0, min: min0, max: max0 });
  for (let l = 1; l < levels; l++) {
    const prev = out[l - 1]!;
    const cols = Math.ceil(prev.cols / 2);
    const min = new Float32Array(cols * cols).fill(Infinity),
      max = new Float32Array(cols * cols).fill(-Infinity);
    for (let j = 0; j < prev.cols; j++)
      for (let i = 0; i < prev.cols; i++) {
        const k = (j >> 1) * cols + (i >> 1),
          p = j * prev.cols + i;
        if (prev.min[p]! < min[k]!) min[k] = prev.min[p]!;
        if (prev.max[p]! > max[k]!) max[k] = prev.max[p]!;
      }
    out.push({ cols, min, max });
  }
  return out;
}

/**
 * Static check of rules 1 and 3 above. A level-L patch lies inside a level-(L+1) node whose
 * box is within `range[L]` of the camera, so its borders are within `range[L] + diag(L+1)`
 * (diag = the largest 3D node diagonal at that level, heights included). Rule 1 needs that to
 * be at most `range[L+1] = 2·range[L]`; rule 3 needs it to be at most `morphStart·range[L+1]`,
 * i.e. `range[L]·(2·morphStart − 1) >= diag(L+1)`, which implies rule 1.
 */
export function checkLodConfig(cfg: LodConfig, minMax: MinMaxPyramid, spacing: number) {
  const ranges = lodRanges(cfg);
  const problems: string[] = [];
  for (let l = 0; l + 1 < cfg.levels; l++) {
    const parent = minMax[l + 1]!;
    let rise = 0;
    for (let k = 0; k < parent.min.length; k++)
      if (Number.isFinite(parent.min[k]!))
        rise = Math.max(rise, parent.max[k]! - parent.min[k]! + 12);
    const side = cfg.patch * 2 ** (l + 1) * spacing;
    const diag = Math.hypot(side, side, rise);
    const reach = ranges[l]! * (2 * cfg.morphStart - 1);
    if (reach < diag)
      problems.push(
        `level ${l}: range ${ranges[l]} m reaches ${reach.toFixed(0)} m < parent diagonal ${diag.toFixed(0)} m`,
      );
  }
  if (!(cfg.morphEnd < 1 && cfg.morphStart < cfg.morphEnd))
    problems.push("morph window must end below 1");
  return problems;
}

/** Bounding box of a node in world metres (heights padded: -10 below, +2 above). */
export function nodeBox(
  cfg: LodConfig,
  minMax: MinMaxPyramid,
  spacing: number,
  level: number,
  i: number,
  j: number,
  out: Float64Array,
) {
  const size = cfg.patch * 2 ** level * spacing;
  const mm = minMax[level]!;
  const k = j * mm.cols + i;
  out[0] = i * size - WORLD_HALF;
  out[1] = (mm.min[k] ?? 0) - 10;
  out[2] = j * size - WORLD_HALF;
  out[3] = (i + 1) * size - WORLD_HALF;
  out[4] = (mm.max[k] ?? 0) + 2;
  out[5] = (j + 1) * size - WORLD_HALF;
  return out;
}

const boxDistance = (b: Float64Array, x: number, y: number, z: number) => {
  const dx = Math.max(b[0]! - x, 0, x - b[3]!),
    dy = Math.max(b[1]! - y, 0, y - b[4]!),
    dz = Math.max(b[2]! - z, 0, z - b[5]!);
  return Math.hypot(dx, dy, dz);
};

/**
 * Select the patches for a camera. Writes (origin grid x, origin grid z, step, level) per
 * patch into `out` and returns the count. `visible(box)` is the frustum test (omit for all).
 */
export function selectPatches(
  cfg: LodConfig,
  minMax: MinMaxPyramid,
  gridIntervals: number,
  spacing: number,
  camera: { x: number; y: number; z: number },
  out: Float32Array,
  visible?: (box: Float64Array) => boolean,
): number {
  const ranges = lodRanges(cfg);
  const capacity = out.length >> 2;
  const box = new Float64Array(6);
  const top = cfg.levels - 1;
  const rootCount = Math.ceil(gridIntervals / (cfg.patch * 2 ** top));
  let count = 0;
  const select = (level: number, i: number, j: number) => {
    const size = cfg.patch * 2 ** level;
    if (i * size >= gridIntervals || j * size >= gridIntervals) return;
    nodeBox(cfg, minMax, spacing, level, i, j, box);
    if (visible && !visible(box)) return;
    if (level > 0 && boxDistance(box, camera.x, camera.y, camera.z) <= ranges[level - 1]!) {
      select(level - 1, i * 2, j * 2);
      select(level - 1, i * 2 + 1, j * 2);
      select(level - 1, i * 2, j * 2 + 1);
      select(level - 1, i * 2 + 1, j * 2 + 1);
      return;
    }
    if (count >= capacity) return;
    const o = count * 4;
    out[o] = i * size;
    out[o + 1] = j * size;
    out[o + 2] = 2 ** level;
    out[o + 3] = level;
    count++;
  };
  for (let j = 0; j < rootCount; j++) for (let i = 0; i < rootCount; i++) select(top, i, j);
  return count;
}
