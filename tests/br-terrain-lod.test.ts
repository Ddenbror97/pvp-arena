import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { decodeHeightfield, type Heightfield } from "@/lib/fps/br/heightfield";
import { TERRAIN } from "@/lib/fps/br/terrain";
import {
  buildMinMax,
  checkLodConfig,
  lodRanges,
  selectPatches,
  type MinMaxPyramid,
} from "@/lib/fps/br/terrain-lod";
import { WORLD_HALF } from "@/lib/fps/br/world";

let hf: Heightfield;
let minMax: MinMaxPyramid;
beforeAll(async () => {
  const file = readFileSync("public/fps/br/height.v1.hf");
  hf = await decodeHeightfield(
    file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength),
  );
  minMax = buildMinMax(hf, TERRAIN.patch, TERRAIN.levels);
});

/** Cameras over the whole island: on foot, in vehicles' range, parachuting and in the plane. */
function cameras(count: number) {
  let seed = 11;
  const rand = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const heights = [1.7, 3, 20, 120, 600, 1500];
  return Array.from({ length: count }, (_, k) => {
    const x = (rand() - 0.5) * 9800,
      z = (rand() - 0.5) * 9800;
    return { x, y: Math.max(0, hf.heightAt(x, z)) + heights[k % heights.length]!, z };
  });
}

/** The vertex shader's morph factor for a grid vertex of a level-L patch. */
function morph(level: number, gx: number, gz: number, cam: { x: number; y: number; z: number }) {
  const range = lodRanges(TERRAIN)[level]!;
  const d = Math.hypot(
    gx * hf.spacing - WORLD_HALF - cam.x,
    hf.sample(gx, gz) - cam.y,
    gz * hf.spacing - WORLD_HALF - cam.z,
  );
  const a = range * TERRAIN.morphStart,
    b = range * TERRAIN.morphEnd;
  return Math.min(1, Math.max(0, (d - a) / (b - a)));
}

describe("Project Island terrain LOD (crack-free without skirts)", () => {
  it("passes the static range rules on this heightfield", () => {
    expect(checkLodConfig(TERRAIN, minMax, hf.spacing)).toEqual([]);
  });

  it("covers the island exactly once, neighbours one level apart, borders on identical vertices", () => {
    const n = hf.width - 1;
    const cols = Math.ceil(n / TERRAIN.patch);
    const out = new Float32Array(4 * 8192);
    let borders = 0,
      overlaps = 0,
      holes = 0,
      jumps = 0,
      unmorphedFine = 0,
      morphingCoarse = 0;
    for (const cam of cameras(60)) {
      const count = selectPatches(TERRAIN, minMax, n, hf.spacing, cam, out);
      expect(count).toBeLessThan(out.length / 4);
      const owner = new Int32Array(cols * cols).fill(-1);
      for (let p = 0; p < count; p++) {
        const ox = out[p * 4]! / TERRAIN.patch,
          oz = out[p * 4 + 1]! / TERRAIN.patch,
          step = out[p * 4 + 2]!;
        for (let dz = 0; dz < step; dz++)
          for (let dx = 0; dx < step; dx++) {
            if (ox + dx >= cols || oz + dz >= cols) continue;
            const k = (oz + dz) * cols + ox + dx;
            if (owner[k] !== -1) overlaps++;
            owner[k] = p;
          }
      }
      if (owner.includes(-1)) holes++;
      const level = (k: number) => out[owner[k]! * 4 + 3]!;
      for (let cz = 0; cz < cols; cz++)
        for (let cx = 0; cx < cols; cx++)
          for (const [dx, dz] of [
            [1, 0],
            [0, 1],
          ] as const) {
            if (cx + dx >= cols || cz + dz >= cols) continue;
            const a = cz * cols + cx,
              b = (cz + dz) * cols + cx + dx;
            const la = level(a),
              lb = level(b);
            if (Math.abs(la - lb) > 1) jumps++;
            if (la === lb) continue;
            // Shared edge of this level-0 cell pair, in grid intervals.
            const fine = Math.min(la, lb),
              coarse = fine + 1;
            const ex = (cx + dx) * TERRAIN.patch,
              ez = (cz + dz) * TERRAIN.patch;
            for (let k = 0; k <= TERRAIN.patch; k++) {
              const gx = dx ? ex : cx * TERRAIN.patch + k,
                gz = dz ? ez : cz * TERRAIN.patch + k;
              if (morph(fine, gx, gz, cam) !== 1) unmorphedFine++;
              if (morph(coarse, gx, gz, cam) !== 0) morphingCoarse++;
            }
            borders++;
          }
    }
    expect({ overlaps, holes, jumps, unmorphedFine, morphingCoarse }).toEqual({
      overlaps: 0,
      holes: 0,
      jumps: 0,
      unmorphedFine: 0,
      morphingCoarse: 0,
    });
    expect(borders).toBeGreaterThan(1000);
  }, 60_000);

  it("keeps the per-frame cost inside the terrain budget", () => {
    const n = hf.width - 1;
    const out = new Float32Array(4 * 8192);
    let worst = 0;
    for (const cam of cameras(60))
      worst = Math.max(worst, selectPatches(TERRAIN, minMax, n, hf.spacing, cam, out));
    // Without frustum culling (the renderer culls about half): ≤ 0.6 M triangles.
    expect(worst * TERRAIN.patch * TERRAIN.patch * 2).toBeLessThan(600_000);
  });
});
