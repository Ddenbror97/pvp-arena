import { WORLD_HALF } from "./world";

/**
 * The Project Island terrain: one regular grid of heights over the whole 10 km world, used by the
 * server (ground, landing, line of sight, shots) and the client (prediction and rendering) from
 * the same file, so both agree to the centimetre.
 *
 * File format (art/br/build_world.py): 16-byte header — "PIH2", u16 width, u16 height,
 * f32 spacing (m), f32 offset (m) — then zlib-wrapped deflate of little-endian uint16 residuals
 * of the plane predictor (left + up − up-left) over heights stored as (h + offset) · 100.
 */
export class Heightfield {
  readonly width: number;
  readonly height: number;
  readonly spacing: number;
  /** Heights in metres, row-major (z rows, x columns). */
  readonly data: Float32Array;
  readonly min: number;
  readonly max: number;
  constructor(width: number, height: number, spacing: number, data: Float32Array) {
    if (data.length !== width * height) throw new Error("Heightfield size mismatch");
    this.width = width;
    this.height = height;
    this.spacing = spacing;
    this.data = data;
    let min = Infinity,
      max = -Infinity;
    for (let i = 0; i < data.length; i++) {
      const v = data[i]!;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    this.min = min;
    this.max = max;
  }

  /** Grid sample (clamped to the edge). */
  sample(i: number, j: number): number {
    const x = i < 0 ? 0 : i >= this.width ? this.width - 1 : i;
    const z = j < 0 ? 0 : j >= this.height ? this.height - 1 : j;
    return this.data[z * this.width + x]!;
  }

  /**
   * Ground height at world x/z: bilinear over the triangle-free grid, matching the renderer's
   * vertex heights at grid points (between them the rendered triangles differ by millimetres).
   */
  heightAt(x: number, z: number): number {
    const gx = (x + WORLD_HALF) / this.spacing,
      gz = (z + WORLD_HALF) / this.spacing;
    const i = Math.floor(gx),
      j = Math.floor(gz);
    const fx = gx - i,
      fz = gz - j;
    const h00 = this.sample(i, j),
      h10 = this.sample(i + 1, j),
      h01 = this.sample(i, j + 1),
      h11 = this.sample(i + 1, j + 1);
    return (h00 * (1 - fx) + h10 * fx) * (1 - fz) + (h01 * (1 - fx) + h11 * fx) * fz;
  }

  /**
   * Ground height as the terrain draws it close up (terrain.ts, level 0: two triangles per grid
   * cell, split from (i, j) to (i + 1, j + 1)), and the up component of that triangle's normal.
   * On the roughest faces the drawn triangles stand up to ~0.6 m off the bilinear `heightAt`, so
   * anything laid on the visible surface (the climbing ropes) uses this.
   */
  meshAt(x: number, z: number, out = { y: 0, ny: 1 }) {
    const gx = (x + WORLD_HALF) / this.spacing,
      gz = (z + WORLD_HALF) / this.spacing;
    const i = Math.floor(gx),
      j = Math.floor(gz);
    const fx = gx - i,
      fz = gz - j;
    const h00 = this.sample(i, j),
      h10 = this.sample(i + 1, j),
      h01 = this.sample(i, j + 1),
      h11 = this.sample(i + 1, j + 1);
    // (fz ≥ fx: the triangle (i, j), (i, j + 1), (i + 1, j + 1); else (i, j), (i + 1, j + 1), (i + 1, j).)
    const a = fz >= fx ? h11 - h01 : h10 - h00,
      b = fz >= fx ? h01 - h00 : h11 - h10;
    out.y = h00 + a * fx + b * fz;
    out.ny = 1 / Math.hypot(a / this.spacing, 1, b / this.spacing);
    return out;
  }

  /** Unit surface normal at world x/z (central differences). */
  normalAt(x: number, z: number, out = { x: 0, y: 1, z: 0 }) {
    const e = this.spacing;
    const dx = (this.heightAt(x + e, z) - this.heightAt(x - e, z)) / (2 * e);
    const dz = (this.heightAt(x, z + e) - this.heightAt(x, z - e)) / (2 * e);
    const len = Math.hypot(dx, 1, dz);
    out.x = -dx / len;
    out.y = 1 / len;
    out.z = -dz / len;
    return out;
  }

  /** Slope at world x/z as rise over run (0 = flat, 1 = 45°). */
  slopeAt(x: number, z: number): number {
    const n = this.normalAt(x, z);
    return Math.sqrt(1 - n.y * n.y) / Math.max(1e-6, n.y);
  }

  /**
   * First hit of a ray with the ground, or null within `maxDistance`. Marches at half the grid
   * spacing, then bisects to ~1 cm. `dir` need not be normalised.
   */
  raycast(
    ox: number,
    oy: number,
    oz: number,
    dx: number,
    dy: number,
    dz: number,
    maxDistance: number,
  ): { distance: number; x: number; y: number; z: number } | null {
    const len = Math.hypot(dx, dy, dz);
    if (!(len > 0) || !(maxDistance > 0)) return null;
    dx /= len;
    dy /= len;
    dz /= len;
    // Above the highest terrain and rising: nothing to hit.
    if (oy > this.max && dy >= 0) return null;
    const step = this.spacing * 0.5;
    let t0 = 0;
    let above = oy - this.heightAt(ox, oz);
    if (above < 0) return { distance: 0, x: ox, y: oy, z: oz };
    for (let t = step; t <= maxDistance + step; t += step) {
      const tt = Math.min(t, maxDistance);
      const px = ox + dx * tt,
        py = oy + dy * tt,
        pz = oz + dz * tt;
      // Skip quickly while the ray is far above everything.
      if (py > this.max && dy >= 0) return null;
      const gap = py - this.heightAt(px, pz);
      if (gap <= 0) {
        let lo = t0,
          hi = tt;
        for (let k = 0; k < 12; k++) {
          const mid = (lo + hi) / 2;
          if (oy + dy * mid - this.heightAt(ox + dx * mid, oz + dz * mid) > 0) lo = mid;
          else hi = mid;
        }
        return { distance: hi, x: ox + dx * hi, y: oy + dy * hi, z: oz + dz * hi };
      }
      above = gap;
      t0 = tt;
      if (tt >= maxDistance) break;
    }
    void above;
    return null;
  }
}

/** Decode a .hf file (see Heightfield) using the platform's DecompressionStream. */
export async function decodeHeightfield(buffer: ArrayBuffer): Promise<Heightfield> {
  const view = new DataView(buffer);
  const magic = String.fromCharCode(
    view.getUint8(0),
    view.getUint8(1),
    view.getUint8(2),
    view.getUint8(3),
  );
  if (magic !== "PIH2") throw new Error(`Unknown heightfield format ${magic}`);
  const width = view.getUint16(4, true),
    height = view.getUint16(6, true),
    spacing = view.getFloat32(8, true),
    offset = view.getFloat32(12, true);
  const inflated = await new Response(
    new Blob([buffer.slice(16)]).stream().pipeThrough(new DecompressionStream("deflate")),
  ).arrayBuffer();
  if (inflated.byteLength !== width * height * 2) throw new Error("Heightfield payload size");
  const residuals = new DataView(inflated);
  const q = new Int32Array(width * height);
  for (let z = 0; z < height; z++)
    for (let x = 0; x < width; x++) {
      const i = z * width + x;
      const r = residuals.getUint16(i * 2, true);
      const prediction =
        z === 0
          ? x === 0
            ? 0
            : q[i - 1]!
          : x === 0
            ? q[i - width]!
            : q[i - 1]! + q[i - width]! - q[i - width - 1]!;
      q[i] = (prediction + r) & 0xffff;
    }
  const data = new Float32Array(width * height);
  for (let i = 0; i < q.length; i++) data[i] = q[i]! / 100 - offset;
  return new Heightfield(width, height, spacing, data);
}
