/**
 * Water stops at a dam (collision audit 2026-11-27). The Old Dam's reservoir (lake-4, 61.5 m)
 * and the lake below it (lake-3, 30.45 m) are rectangles that overlap across the dam; the water
 * was drawn cut to each one's side of it (water.ts, 2026-11-16) but found by the game over the
 * whole rectangle: on lake-3's shore below the dam, some 30 m under the reservoir's level, a
 * walker was lifted 30 m to swim in the air and a parachute landed on nothing.
 */
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { newDropBody, stepDrop, waterBodyAt, waterSurface, type Route } from "@/lib/fps/br/drop";
import { decodeHeightfield, type Heightfield } from "@/lib/fps/br/heightfield";
import { StaticWorld } from "@/lib/fps/br/static-world";
import { damCuts, keptBy } from "@/lib/fps/br/water-cuts";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";
import { TICK_MS } from "@/lib/fps/simulation";

const meta = JSON.parse(readFileSync(`public${WORLD_ASSETS.meta}`, "utf8")) as WorldMeta;
let hf: Heightfield;
beforeAll(async () => {
  const f = readFileSync(`public${WORLD_ASSETS.height}`);
  hf = await decodeHeightfield(f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength));
});

describe("water and dams", () => {
  it("finds a dammed lake only on its own side of the dam, as it is drawn", () => {
    const cuts = damCuts(meta);
    expect(cuts.get("lake-4")?.length).toBeGreaterThan(0);
    let below = 0,
      wrong = 0;
    for (const w of meta.waterBodies) {
      const [x0, z0, x1, z1] = w.bounds;
      for (let x = x0; x <= x1; x += 5)
        for (let z = z0; z <= z1; z += 5) {
          const ground = hf.heightAt(x, z);
          const id = waterBodyAt(meta, ground, x, z);
          if (id === null || id === "sea") continue;
          // Every water point is on its own lake's side of every dam it crosses.
          if (!keptBy(cuts.get(id), x, z)) wrong++;
          if (!keptBy(cuts.get(w.id), x, z) && w.id === "lake-4" && ground < w.level - 12) below++;
        }
    }
    expect(wrong).toBe(0);
    // (The reservoir's rectangle does reach low ground past the dam: the case this is about.)
    expect(below).toBeGreaterThan(100);
  });

  it("keeps a walker on lake-3's shore below the dam on foot", () => {
    // Where the reservoir's water was found 30 m over the ground.
    const x = -2848.9,
      z = -211.5;
    const ground = hf.heightAt(x, z);
    expect(61.5 - ground).toBeGreaterThan(20);
    expect(waterSurface(meta, ground, x, z)).toBeNull();
    const world = new StaticWorld(hf, [], { voxel: 0.2, models: {} }, null);
    const route: Route = { a: [0, 0], b: [1, 0], dir: [1, 0], length: 1 };
    const b = Object.assign(newDropBody(), {
      x,
      y: ground,
      z,
      phase: "ground" as const,
      grounded: true,
    });
    for (let i = 0; i < 30; i++)
      stepDrop(world, meta, route, b, { forward: 0, strafe: 0, yaw: 0 }, 0, TICK_MS);
    expect(b.phase).toBe("ground");
    expect(Math.abs(b.y - ground)).toBeLessThan(0.5);
  });
});
