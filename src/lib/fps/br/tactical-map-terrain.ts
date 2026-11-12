import type { Heightfield } from "./heightfield";
import type { LandCoverMap } from "./landcover";
import { WORLD_HALF } from "./world";

/**
 * The tactical map's terrain picture, pixel by pixel (see tactical-map.ts for the whole map):
 * land cover colours textured like an aerial photograph, hill shading, snow, depth-tinted water
 * with surf. No DOM: it runs in a Web Worker (tactical-map.worker.ts) so the 16.7 million
 * pixels of the 4096 px map never take frame time (performance audit 2026-11-11: built on the
 * main thread in slices it cost each frame several milliseconds for the first minute of a
 * match), and on the main thread only where a worker cannot start.
 */
export type TerrainSource = {
  hf: Pick<Heightfield, "heightAt">;
  cover: Pick<LandCoverMap, "classIdAt">;
  waterBodies: ReadonlyArray<{ level: number; bounds: readonly [number, number, number, number] }>;
};

/**
 * Land cover colours (RGB), by class id: water, sand, grass, field, forest, rock, urban, road.
 * The look of an aerial photograph (owner, 2026-11-11: the reference map): saturated greens, a
 * dark mottled forest canopy, warm fields, grey-brown rock, pale concrete.
 */
const COVER: Array<[number, number, number]> = [
  [30, 72, 96],
  [214, 198, 150],
  [112, 138, 66],
  [156, 148, 82],
  [44, 76, 38],
  [134, 124, 108],
  [158, 156, 148],
  [118, 116, 110],
];
/** Snow on the high flat tops (as the terrain shader: 395–425 m, less on steep ground). */
const SNOW = { from: 395, to: 425, colour: [236, 240, 244] as [number, number, number] };

/** Tileable value noise in [0, 1] (texture for canopy, fields and rock), deterministic. */
function noiseTile(n: number, cells: number, seed: number) {
  const lattice = new Float32Array(cells * cells);
  let s = seed >>> 0;
  for (let i = 0; i < lattice.length; i++) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    lattice[i] = s / 4294967296;
  }
  const out = new Float32Array(n * n);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const fx = (x / n) * cells,
        fy = (y / n) * cells;
      const x0 = Math.floor(fx),
        y0 = Math.floor(fy);
      const tx = fx - x0,
        ty = fy - y0;
      const sx = tx * tx * (3 - 2 * tx),
        sy = ty * ty * (3 - 2 * ty);
      const at = (i: number, j: number) => lattice[(j % cells) * cells + (i % cells)]!;
      const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx;
      const b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx;
      out[y * n + x] = a + (b - a) * sy;
    }
  return out;
}

/** A rasteriser for a `size` px map: `rows(from, to, out)` fills those rows of an RGBA buffer. */
export function terrainRasteriser(src: TerrainSource, size: number) {
  const m = (2 * WORLD_HALF) / size; // metres per pixel
  // Texture: a fine canopy grain (a few pixels: tree crowns), a field-sized mottle and broad
  // patches, sampled by map pixel.
  const T = 256;
  const fine = noiseTile(T, 64, 7),
    mid = noiseTile(T, 16, 19),
    broad = noiseTile(T, 4, 31);
  const tex = (n: Float32Array, i: number, j: number) => n[(j % T) * T + (i % T)]!;
  const waterLevel = (x: number, z: number, h: number): number | null => {
    if (h < 0) return 0;
    for (const w of src.waterBodies) {
      const [x0, z0, x1, z1] = w.bounds;
      if (x >= x0 && x <= x1 && z >= z0 && z <= z1 && h < w.level) return w.level;
    }
    return null;
  };
  return function rows(from: number, to: number, data: Uint8ClampedArray) {
    const img = { data };
    for (let j = from; j < to; j++) {
      const z = -WORLD_HALF + (j + 0.5) * m;
      for (let i = 0; i < size; i++) {
        const x = -WORLD_HALF + (i + 0.5) * m;
        const o = (j * size + i) * 4;
        const h = src.hf.heightAt(x, z);
        const lvl = waterLevel(x, z, h);
        if (lvl !== null) {
          // Turquoise shallows to deep navy; a pale line of surf where it meets land.
          const d = Math.min(1, Math.max(0, (lvl - h) / 22));
          const shore =
            waterLevel(x + m * 1.5, z, src.hf.heightAt(x + m * 1.5, z)) === null ||
            waterLevel(x - m * 1.5, z, src.hf.heightAt(x - m * 1.5, z)) === null ||
            waterLevel(x, z + m * 1.5, src.hf.heightAt(x, z + m * 1.5)) === null ||
            waterLevel(x, z - m * 1.5, src.hf.heightAt(x, z - m * 1.5)) === null;
          const ripple = 0.94 + tex(mid, i, j) * 0.12;
          let r = (64 - d * 50) * ripple,
            gg = (140 - d * 92) * ripple,
            b = (150 - d * 76) * ripple;
          if (shore) [r, gg, b] = [r * 0.4 + 190 * 0.6, gg * 0.4 + 214 * 0.6, b * 0.4 + 210 * 0.6];
          img.data[o] = r;
          img.data[o + 1] = gg;
          img.data[o + 2] = b;
          img.data[o + 3] = 255;
          continue;
        }
        // The land cover is a grid of cells: sampled a little off the pixel (by the texture)
        // its edges read as the ragged edges of woods and fields, not as stair steps.
        const jx = (tex(mid, i, j) - 0.5) * 14 + (tex(fine, j, i) - 0.5) * 6,
          jz = (tex(mid, j, i) - 0.5) * 14 + (tex(fine, i, j) - 0.5) * 6;
        const cls = src.cover.classIdAt(x + jx, z + jz);
        let [r, gg, b] = COVER[cls] ?? COVER[2]!;
        // Hill shading: light from the north-west, 45° up, a little exaggerated (relief reads
        // like a photograph from altitude), with a soft skylight floor.
        const dx = src.hf.heightAt(x + m, z) - src.hf.heightAt(x - m, z),
          dz = src.hf.heightAt(x, z + m) - src.hf.heightAt(x, z - m);
        const nx = (-dx / (2 * m)) * 1.6,
          nz = (-dz / (2 * m)) * 1.6;
        const len = Math.hypot(nx, nz, 1);
        const lambert = Math.max(0, (nx * -0.5 + nz * -0.5 + 0.707) / len);
        const slope = Math.hypot(dx, dz) / (2 * m);
        let shade = 0.42 + lambert * 0.78;
        const f = tex(fine, i, j),
          md = tex(mid, i, j),
          br = tex(broad, i, j);
        if (cls === 4) {
          // Forest: crowns (light) and the gaps between them (dark), patches of lighter trees.
          const crown = f > 0.55 ? 1.18 : f < 0.3 ? 0.72 : 1;
          shade *= crown * (0.9 + md * 0.22);
          r += (br - 0.5) * 14;
          gg += (br - 0.5) * 22;
        } else if (cls === 2 || cls === 3) {
          // Grass and fields: broad patches of greener and drier ground.
          shade *= 0.92 + md * 0.16;
          r += (br - 0.5) * 26;
          gg += (br - 0.5) * 18;
          b += (br - 0.5) * 6;
        } else if (cls === 5) {
          // Rock: streaked, darker in the gullies.
          shade *= 0.85 + f * 0.25;
        } else shade *= 0.95 + f * 0.1;
        // Steep ground shows rock whatever grows there.
        const rocky = Math.min(1, Math.max(0, (slope - 0.7) / 0.5));
        if (rocky > 0 && cls !== 6 && cls !== 7) {
          r += (COVER[5]![0] - r) * rocky;
          gg += (COVER[5]![1] - gg) * rocky;
          b += (COVER[5]![2] - b) * rocky;
        }
        // Snow on the high tops, blue-white in the shade.
        const snow =
          Math.min(1, Math.max(0, (h + (md - 0.5) * 50 - SNOW.from) / (SNOW.to - SNOW.from))) *
          (1 - Math.min(1, Math.max(0, (slope - 0.6) / 0.6)));
        if (snow > 0) {
          r += (SNOW.colour[0] - r) * snow;
          gg += (SNOW.colour[1] - gg) * snow;
          b += (SNOW.colour[2] - b) * snow;
        }
        img.data[o] = Math.min(255, r * shade * (snow > 0.5 ? 0.98 : 1));
        img.data[o + 1] = Math.min(255, gg * shade);
        img.data[o + 2] = Math.min(255, b * shade * (snow > 0.5 ? 1.06 : 1));
        img.data[o + 3] = 255;
      }
    }
  };
}
