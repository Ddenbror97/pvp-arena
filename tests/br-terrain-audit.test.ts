import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { decodeHeightfield, type Heightfield } from "@/lib/fps/br/heightfield";
import { MAX_SLOPE } from "@/lib/fps/br/movement";
import type { WorldMeta } from "@/lib/fps/br/world";

/**
 * Terrain audit (2026-11-09): the ground the roads, rivers and lakes are laid in. Before it,
 * roads climbed the new hills and the quarry's massif at 30-110 % and the river channels were
 * cut as sheer walls up to 50 m high where hills met the water.
 */
let hf: Heightfield;
const meta = JSON.parse(readFileSync("public/fps/br/world.v1.json", "utf8")) as WorldMeta;
beforeAll(async () => {
  const file = readFileSync("public/fps/br/height.v1.hf");
  hf = await decodeHeightfield(
    file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength),
  );
});

describe("Project Island terrain audit", () => {
  it("keeps the roads drivable: almost all of their length under a 16 % grade", () => {
    let samples = 0,
      steep = 0,
      worst = 0;
    for (const road of meta.roads) {
      for (let k = 0; k + 1 < road.points.length; k++) {
        const [ax, az] = road.points[k]!,
          [bx, bz] = road.points[k + 1]!;
        const len = Math.hypot(bx - ax, bz - az);
        const n = Math.floor(len / 8);
        for (let i = 0; i < n; i++) {
          const t0 = (i * 8) / len,
            t1 = ((i + 1) * 8) / len;
          const g =
            Math.abs(
              hf.heightAt(ax + (bx - ax) * t1, az + (bz - az) * t1) -
                hf.heightAt(ax + (bx - ax) * t0, az + (bz - az) * t0),
            ) / 8;
          samples++;
          if (g > 0.16) steep++;
          worst = Math.max(worst, g);
        }
      }
    }
    expect(samples).toBeGreaterThan(20_000);
    // Before the grading about 2,900 of the 26,000 samples; about 100 now (road ends at a
    // junction with a road graded to another level, and mountain and coast roads at the
    // 6 m cut limit).
    expect(steep / samples).toBeLessThan(0.005);
  });

  it("raises river banks at a walkable slope from the water (no sheer channel walls)", () => {
    const step = 4;
    let cliffs = 0,
      checked = 0;
    for (const river of meta.rivers) {
      const pts = river.points;
      for (let k = 0; k + 1 < pts.length; k++) {
        const [ax, az] = pts[k]!,
          [bx, bz] = pts[k + 1]!;
        const len = Math.hypot(bx - ax, bz - az);
        const nx = -(bz - az) / len,
          nz = (bx - ax) / len;
        for (let s = 0; s < len; s += 25) {
          const cx = ax + ((bx - ax) * s) / len,
            cz = az + ((bz - az) * s) / len;
          for (const side of [-1, 1])
            for (let d = river.width * 0.62; d < river.width * 0.62 + 80; d += step) {
              const h0 = hf.heightAt(cx + nx * side * d, cz + nz * side * d),
                h1 = hf.heightAt(cx + nx * side * (d + step), cz + nz * side * (d + step));
              if (h0 < 0.5) continue; // under water: the sea and lake beds shelve as they will
              checked++;
              // Banks are capped at 0.55 (29°) from the water; where a lake's shore meets a
              // river's bank they can be steeper, but never past what a player can climb.
              if (h1 - h0 > step * MAX_SLOPE) cliffs++;
            }
        }
      }
    }
    expect(checked).toBeGreaterThan(5_000);
    // One: a road's embankment where the traced roads meet Riverwood's channel (no bridge
    // there: its far end lands in the inlet).
    expect(cliffs).toBeLessThanOrEqual(1);
  });
});
