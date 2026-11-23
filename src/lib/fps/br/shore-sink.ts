import type { Heightfield } from "./heightfield";
import { damCuts } from "./water";
import { LAND_COVER, WORLD_HALF, WORLD_SIZE, type WorldMeta } from "./world";

/**
 * The terrain's coarser levels of detail, kept under the water wherever there is water (owner,
 * 2026-11-22, a screenshot from the plane: "the water/rivers render incorrectly/broken on very
 * long distance, the edge where the water meets the ground. closer distance it looks good").
 *
 * The water is a level sheet and decides its own outline per pixel from the true ground heights
 * (water.ts), so its shoreline is exact at any distance. The terrain far away is not: a coarse
 * level's triangle spans 8 to 125 m between true heights, and where one corner stands on the
 * bank and the next lies on the bed the triangle runs above the water for part of the way. There
 * the depth test hid the water behind the ground: the bed's colour instead of water, a band as
 * wide as the triangles (so wider with distance) along every bank, and a 36 m river broken into
 * pieces or gone.
 *
 * So each coarse level gets heights of its own: a vertex of a quad that has any water in it is
 * held just under that water's level. All four corners of such a quad are then under the water,
 * and so is every point between them, so the water is in front wherever it is drawn; where the
 * ground is truly dry the water is not drawn (its own test) and the ground shows there in its own
 * colours, a little lower than it really is. The full-detail level (within 460 m) is untouched,
 * and the fine level blends to the next one's heights over its morph band as before.
 */

/** How far under the water's level a coarse vertex by the water is held (m). */
export const SINK_UNDER_M = 0.3;

type Cover = { width: number; height: number; data: Uint8Array };

/**
 * The level of the water over each height sample (+Infinity where there is none): the sea where
 * the ground is below 0, a lake inside its outline where the ground is below its level and the
 * land cover says water. Errs towards water (the cover's softened mask is taken three texels
 * wide), since a vertex held down needlessly costs nothing and one left up shows.
 */
export function wetLevels(hf: Heightfield, cover: Cover, meta: WorldMeta | null): Float32Array {
  const w = hf.width,
    wet = new Float32Array(w * hf.height).fill(Infinity);
  for (let i = 0; i < wet.length; i++) if (hf.data[i]! < 0) wet[i] = 0;
  if (!meta) return wet;
  // Land cover: water texels, widened by three (the mask water.ts reads is a 5×5 blur of
  // them, read bilinearly and kept from 0.35 up).
  const water = LAND_COVER.indexOf("water" as (typeof LAND_COVER)[number]);
  const { width: cw, height: ch, data } = cover;
  const near = new Uint8Array(cw * ch),
    row = new Uint8Array(cw * ch);
  for (let y = 0; y < ch; y++)
    for (let x = 0; x < cw; x++) {
      let any = 0;
      for (let d = -3; d <= 3 && !any; d++) {
        const xx = x + d;
        if (xx >= 0 && xx < cw && data[y * cw + xx] === water) any = 1;
      }
      row[y * cw + x] = any;
    }
  for (let y = 0; y < ch; y++)
    for (let x = 0; x < cw; x++) {
      let any = 0;
      for (let d = -3; d <= 3 && !any; d++) {
        const yy = y + d;
        if (yy >= 0 && yy < ch) any = row[yy * cw + x]!;
      }
      near[y * cw + x] = any;
    }
  const cuts = damCuts(meta);
  const grid = (v: number) => (v + WORLD_HALF) / hf.spacing;
  for (const body of meta.waterBodies) {
    const [x0, z0, x1, z1] = body.bounds;
    const planes = cuts.get(body.id) ?? [];
    const gx0 = Math.max(0, Math.floor(grid(x0 - 20))),
      gx1 = Math.min(w - 1, Math.ceil(grid(x1 + 20))),
      gz0 = Math.max(0, Math.floor(grid(z0 - 20))),
      gz1 = Math.min(hf.height - 1, Math.ceil(grid(z1 + 20)));
    for (let gz = gz0; gz <= gz1; gz++)
      for (let gx = gx0; gx <= gx1; gx++) {
        const i = gz * w + gx;
        if (hf.data[i]! >= body.level || wet[i]! <= body.level) continue;
        const x = gx * hf.spacing - WORLD_HALF,
          z = gz * hf.spacing - WORLD_HALF;
        const cx = Math.min(cw - 1, Math.max(0, Math.floor(((x + WORLD_HALF) / WORLD_SIZE) * cw))),
          cz = Math.min(ch - 1, Math.max(0, Math.floor(((z + WORLD_HALF) / WORLD_SIZE) * ch)));
        if (!near[cz * cw + cx]) continue;
        // (A metre's grace past a dam's line: the sheet is cut exactly on it.)
        if (planes.some((p) => (x - p.px) * p.nx + (z - p.pz) * p.nz < -hf.spacing)) continue;
        wet[i] = body.level;
      }
  }
  return wet;
}

export type SinkLevel = { level: number; size: number; heights: Float32Array };

/**
 * Heights for the terrain's levels 1…`levels` (level l: every 2^l-th sample, `size` a side):
 * the true height, or just under the lowest water within one of that level's quads of the
 * vertex if that is lower.
 */
export function sinkLevels(hf: Heightfield, wet: Float32Array, levels: number): SinkLevel[] {
  const w = hf.width,
    n = w - 1;
  // The lowest water within one sample of each sample (rows, then columns).
  let low = new Float32Array(w * w);
  const tmp = new Float32Array(w * w);
  for (let z = 0; z < w; z++)
    for (let x = 0; x < w; x++) {
      const i = z * w + x;
      tmp[i] = Math.min(wet[i]!, x > 0 ? wet[i - 1]! : Infinity, x < n ? wet[i + 1]! : Infinity);
    }
  for (let z = 0; z < w; z++)
    for (let x = 0; x < w; x++) {
      const i = z * w + x;
      low[i] = Math.min(tmp[i]!, z > 0 ? tmp[i - w]! : Infinity, z < n ? tmp[i + w]! : Infinity);
    }
  const out: SinkLevel[] = [];
  let size = w;
  for (let l = 1; l <= levels; l++) {
    // This level's vertex (i, j) is the last level's (2i, 2j): the lowest water within one of
    // ITS neighbours there reaches one of this level's quads (2^l samples) every way.
    const from = low,
      fromSize = size;
    size = (n >> l) + 1;
    low = new Float32Array(size * size);
    const heights = new Float32Array(size * size);
    for (let j = 0; j < size; j++)
      for (let i = 0; i < size; i++) {
        let m = Infinity;
        for (let dj = -1; dj <= 1; dj++) {
          const jj = 2 * j + dj;
          if (jj < 0 || jj >= fromSize) continue;
          for (let di = -1; di <= 1; di++) {
            const ii = 2 * i + di;
            if (ii < 0 || ii >= fromSize) continue;
            const v = from[jj * fromSize + ii]!;
            if (v < m) m = v;
          }
        }
        low[j * size + i] = m;
        const h = hf.data[(j << l) * w + (i << l)]!;
        heights[j * size + i] = Math.min(h, m - SINK_UNDER_M);
      }
    out.push({ level: l, size, heights });
  }
  return out;
}

/**
 * Those levels side by side in one 16-bit texture's worth of data (centimetres above −`offset`,
 * as the terrain's own height texture): `x[l]` is where level l starts.
 */
export function sinkAtlas(levels: SinkLevel[], offset: number) {
  const width = levels.reduce((s, l) => s + l.size, 0),
    height = levels[0]!.size;
  const data = new Uint16Array(width * height);
  const x: number[] = [0];
  let at = 0;
  for (const l of levels) {
    x[l.level] = at;
    for (let j = 0; j < l.size; j++)
      for (let i = 0; i < l.size; i++)
        data[j * width + at + i] = Math.max(
          0,
          Math.min(65535, Math.round((l.heights[j * l.size + i]! + offset) * 100)),
        );
    at += l.size;
  }
  return { data, width, height, x };
}

/** The water's own rule for a wet pixel (water.ts): a film of this depth (m) or more. */
export const WET_FILM_M = 0.02;
/** …and, for a lake, at least this much of the land cover's softened water mask. */
export const WET_MASK = 0.35;
/** The coverage texture's depth channel: this many steps a metre (255 steps: 12.75 m). */
export const WET_DEPTH_STEPS = 20;

/**
 * How much of the ground round every second height sample is under water, and how deep on
 * average: what the water reads far away in place of the exact heights (water.ts).
 *
 * Up close a pixel of water covers less ground than one height sample, and asking "is the ground
 * under the water here?" at the pixel's centre gives the shoreline exactly. From the plane a
 * pixel covers 5 to 50 m of ground and the centre is one point in it: a bank, a bar or a river
 * narrower than the pixel is water or land by where that point happens to fall, and it falls
 * somewhere else every time the view turns by a fraction of a pixel. The far shorelines blinked
 * (owner, 2026-11-22: "still flicker for long distances directly in the airplane ... and in
 * the parachute").
 *
 * This is the same question answered once for every sample, by the same rule the shader uses
 * (the sea where the ground is below 0, a lake inside its outline where the cover's mask says
 * water and the ground is below its level), and averaged: the GPU's mip levels and anisotropic
 * filter then hand each far pixel the share of its own footprint that is wet, which changes
 * smoothly as the view moves. Two bytes a texel: [share wet, mean depth].
 *
 * `mask` is the land cover's softened water weight as the water's material reads it (the alpha
 * of cover texture B: RGBA bytes).
 */
export function wetCoverage(
  hf: Heightfield,
  meta: WorldMeta | null,
  mask: { data: ArrayLike<number>; width: number; height: number } | null,
) {
  const w = hf.width,
    n = w - 1;
  // Depth of water over every sample (0: dry).
  const depth = new Float32Array(w * w);
  for (let i = 0; i < depth.length; i++) {
    const h = hf.data[i]!;
    if (h < -WET_FILM_M) depth[i] = -h;
  }
  if (meta && mask) {
    const cuts = damCuts(meta);
    const grid = (v: number) => (v + WORLD_HALF) / hf.spacing;
    // The mask as the GPU reads it at its sharpest level: bilinear between texel centres,
    // clamped at the edge.
    const alpha = (x: number, z: number) => {
      const u = ((x + WORLD_HALF) / WORLD_SIZE) * mask.width - 0.5,
        v = ((z + WORLD_HALF) / WORLD_SIZE) * mask.height - 0.5;
      const i = Math.floor(u),
        j = Math.floor(v),
        fu = u - i,
        fv = v - j;
      const at = (ii: number, jj: number) =>
        mask.data[
          (Math.min(mask.height - 1, Math.max(0, jj)) * mask.width +
            Math.min(mask.width - 1, Math.max(0, ii))) *
            4 +
            3
        ]! / 255;
      return (
        (at(i, j) * (1 - fu) + at(i + 1, j) * fu) * (1 - fv) +
        (at(i, j + 1) * (1 - fu) + at(i + 1, j + 1) * fu) * fv
      );
    };
    for (const body of meta.waterBodies) {
      const [x0, z0, x1, z1] = body.bounds;
      const planes = cuts.get(body.id) ?? [];
      const gx0 = Math.max(0, Math.ceil(grid(x0 - 20))),
        gx1 = Math.min(n, Math.floor(grid(x1 + 20))),
        gz0 = Math.max(0, Math.ceil(grid(z0 - 20))),
        gz1 = Math.min(n, Math.floor(grid(z1 + 20)));
      for (let gz = gz0; gz <= gz1; gz++)
        for (let gx = gx0; gx <= gx1; gx++) {
          const i = gz * w + gx,
            d = body.level - hf.data[i]!;
          if (d <= WET_FILM_M || d <= depth[i]!) continue;
          const x = gx * hf.spacing - WORLD_HALF,
            z = gz * hf.spacing - WORLD_HALF;
          if (planes.some((p) => (x - p.px) * p.nx + (z - p.pz) * p.nz < 0)) continue;
          if (alpha(x, z) < WET_MASK) continue;
          depth[i] = d;
        }
    }
  }
  // Every second sample, each the 1-2-1 average of its neighbours both ways.
  const size = (n >> 1) + 1;
  const data = new Uint8Array(size * size * 2);
  const k = [1, 2, 1];
  for (let j = 0; j < size; j++)
    for (let i = 0; i < size; i++) {
      let wet = 0,
        sum = 0,
        total = 0;
      for (let dj = -1; dj <= 1; dj++) {
        const z = Math.min(n, Math.max(0, 2 * j + dj));
        for (let di = -1; di <= 1; di++) {
          const x = Math.min(n, Math.max(0, 2 * i + di));
          const d = depth[z * w + x]!,
            g = k[di + 1]! * k[dj + 1]!;
          total += g;
          if (d > 0) {
            wet += g;
            sum += g * d;
          }
        }
      }
      const o = (j * size + i) * 2;
      data[o] = Math.round((wet / total) * 255);
      data[o + 1] = Math.min(255, Math.round((sum / total) * WET_DEPTH_STEPS));
    }
  return { data, size };
}
