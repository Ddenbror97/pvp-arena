import type { Heightfield } from "./heightfield";

/**
 * The ground's detail noise (terrain.ts's `uDetail`: three tiling value noises, 8, 16 and 32
 * cells across, in r, g and b), here so the ground's sound can ask the same questions as its
 * look. 256 × 256 RGBA bytes, deterministic.
 */
export const DETAIL_SIZE = 256;
let bytes: Uint8Array | null = null;

export function detailNoiseBytes(): Uint8Array {
  if (bytes) return bytes;
  const s = DETAIL_SIZE;
  const out = new Uint8Array(s * s * 4);
  let seed = 1337;
  const rand = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  for (let c = 0; c < 3; c++) {
    const cells = [8, 16, 32][c]!;
    const lattice = Array.from({ length: cells * cells }, rand);
    for (let y = 0; y < s; y++)
      for (let x = 0; x < s; x++) {
        const fx = (x / s) * cells,
          fy = (y / s) * cells;
        const ix = Math.floor(fx),
          iy = Math.floor(fy);
        const tx = fx - ix,
          ty = fy - iy;
        const sx = tx * tx * (3 - 2 * tx),
          sy = ty * ty * (3 - 2 * ty);
        const v = (a: number, b: number) =>
          lattice[((b + cells) % cells) * cells + ((a + cells) % cells)]!;
        const value =
          (v(ix, iy) * (1 - sx) + v(ix + 1, iy) * sx) * (1 - sy) +
          (v(ix, iy + 1) * (1 - sx) + v(ix + 1, iy + 1) * sx) * sy;
        out[(y * s + x) * 4 + c] = Math.round(value * 255);
      }
  }
  for (let i = 3; i < out.length; i += 4) out[i] = 255;
  return (bytes = out);
}

/** The noise texture sampled as the GPU does (repeat wrap, bilinear), channel 0–2, 0 … 1. */
export function sampleDetail(u: number, v: number, channel: number): number {
  const b = detailNoiseBytes(),
    s = DETAIL_SIZE;
  const fx = u * s - 0.5,
    fy = v * s - 0.5;
  const x0 = Math.floor(fx),
    y0 = Math.floor(fy);
  const tx = fx - x0,
    ty = fy - y0;
  const at = (x: number, y: number) =>
    b[((((y % s) + s) % s) * s + (((x % s) + s) % s)) * 4 + channel]! / 255;
  return (
    (at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx) * (1 - ty) +
    (at(x0, y0 + 1) * (1 - tx) + at(x0 + 1, y0 + 1) * tx) * ty
  );
}

const smoothstep = (e0: number, e1: number, v: number) => {
  const t = Math.max(0, Math.min(1, (v - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/**
 * How much snow lies on the ground at (x, z), 0 … 1: the terrain shader's own rule (terrain.ts,
 * "High peaks"). Snow from about 370 m up, by height broken up with the large detail noise, and
 * none on the steep rock faces.
 */
export function snowAt(hf: Heightfield, x: number, z: number): number {
  const y = hf.heightAt(x, z);
  if (y < 365) return 0;
  const n2 = sampleDetail(x / 180, z / 180, 1);
  const ny = hf.normalAt(x, z).y;
  const steep = smoothstep(0.3, 0.5, 1 - ny);
  return smoothstep(395, 425, y + n2 * 25) * (1 - steep);
}
