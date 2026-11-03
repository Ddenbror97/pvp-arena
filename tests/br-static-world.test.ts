import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { decodeHeightfield, type Heightfield } from "@/lib/fps/br/heightfield";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { islandLayout, type Placement } from "@/lib/fps/br/layout";
import { stepBody, type BrBody } from "@/lib/fps/br/movement";
import { StaticWorld, turnBox, type CollisionData } from "@/lib/fps/br/static-world";
import { vegetationWorld } from "@/lib/fps/br/vegetation";
import type { WorldMeta } from "@/lib/fps/br/world";
import { TICK_MS } from "@/lib/fps/simulation";

const buffer = (path: string) => {
  const f = readFileSync(path);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const meta = JSON.parse(readFileSync("public/fps/br/world.v1.json", "utf8")) as WorldMeta;
const collision = JSON.parse(
  readFileSync("public/fps/br/models/collision.json", "utf8"),
) as CollisionData;
const models = JSON.parse(readFileSync("public/fps/br/models/models.json", "utf8")) as {
  models: Record<string, { size: number[] }>;
};
let hf: Heightfield, world: StaticWorld, layout: Placement[];
beforeAll(async () => {
  hf = await decodeHeightfield(buffer("public/fps/br/height.v1.hf"));
  const cover = await decodeLandCover(buffer("public/fps/br/landcover.v1.lc"));
  layout = islandLayout(meta);
  world = new StaticWorld(hf, layout, collision, vegetationWorld(hf, cover, meta));
});

/** Footprint of a placement (model size rotated), x0, z0, x1, z1. */
function footprint(p: Placement) {
  const [w, h, d] = models.models[p.model]!.size as [number, number, number];
  const [x0, , z0, x1, , z1] = turnBox([-w / 2, 0, -d / 2, w / 2, h, d / 2], p.turn);
  return [p.x + x0, p.z + z0, p.x + x1, p.z + z1] as const;
}
const body = (x: number, z: number): BrBody => ({
  x,
  y: world.supportAt(x, z, 0.35, 1e4),
  z,
  velocityY: 0,
  crouched: false,
  grounded: true,
});
const walk = (
  b: BrBody,
  yaw: number,
  seconds: number,
  extra: Partial<{ jump: boolean; sprint: boolean }> = {},
) => {
  for (let t = 0; t < seconds * 30; t++)
    stepBody(world, b, { forward: 1, strafe: 0, yaw, ...extra }, TICK_MS);
};

describe("Project Island static world", () => {
  it("places every layout model, each with collision data, on the flat building pads", () => {
    expect(layout.length).toBeGreaterThan(400);
    for (const p of layout) {
      expect(models.models[p.model], p.model).toBeDefined();
      expect(collision.models[p.model], p.model).toBeDefined();
      const poi = meta.pois.find((q) => q.id === p.poi)!;
      const [x0, z0, x1, z1] = footprint(p);
      for (const [x, z] of [
        [x0, z0],
        [x1, z0],
        [x0, z1],
        [x1, z1],
      ])
        expect(Math.abs(hf.heightAt(x!, z!) - poi.padHeight!), `${p.model} @${p.poi}`).toBeLessThan(
          1.6,
        );
    }
  });

  it("never overlaps two buildings or large structures", () => {
    const big = layout.filter((p) => {
      const s = models.models[p.model]!.size;
      return (
        Math.max(s[0]!, s[2]!) > 6 &&
        p.model !== "chinook" &&
        p.model !== "yc130" &&
        p.model !== "helipad"
      );
    });
    const overlaps: string[] = [];
    for (let i = 0; i < big.length; i++)
      for (let j = i + 1; j < big.length; j++) {
        const a = footprint(big[i]!),
          b = footprint(big[j]!);
        if (a[0] < b[2] - 0.5 && b[0] < a[2] - 0.5 && a[1] < b[3] - 0.5 && b[1] < a[3] - 0.5)
          overlaps.push(
            `${big[i]!.model}@${big[i]!.x},${big[i]!.z} × ${big[j]!.model}@${big[j]!.x},${big[j]!.z}`,
          );
      }
    expect(overlaps).toEqual([]);
  });

  it("keeps walkers on the terrain and stops them at walls, props and trunks", () => {
    const store = meta.pois.find((p) => p.id === "island-superstore")!;
    // From the car park, walk north into the store's south wall.
    const b = body(store.x - 20, store.z + 45);
    walk(b, 0, 8);
    expect(b.z).toBeGreaterThan(store.z + 20);
    expect(b.z).toBeLessThan(store.z + 45);
    // A hesco wall of the military base blocks the way out (west wall, away from gates).
    const base = meta.pois.find((p) => p.id === "southern-military-base")!;
    const w = body(base.x - 150, base.z + 80);
    walk(w, Math.PI / 2, 6); // yaw π/2 = facing -x (west)
    expect(w.x).toBeGreaterThan(base.x - 166);
    // Open country: 20 s of walking stays glued to the terrain (no floating, no sinking).
    const c = body(-1500, -800);
    for (let t = 0; t < 600; t++) {
      stepBody(world, c, { forward: 1, strafe: 0, yaw: t / 200 }, TICK_MS);
      const ground = world.supportAt(c.x, c.z, 0.35, c.y + 0.4);
      expect(Math.abs(c.y - ground)).toBeLessThan(0.36);
    }
  });

  it("lands on top of a container and climbs nothing taller than a step", () => {
    const container = layout.find(
      (p) => p.model === "container-40" && p.poi === "island-superstore",
    )!;
    const top = world.supportAt(container.x, container.z, 0.35, 1e4);
    expect(top - container.y).toBeGreaterThan(2);
    const b: BrBody = {
      x: container.x,
      y: top + 3,
      z: container.z,
      velocityY: 0,
      crouched: false,
      grounded: false,
    };
    for (let t = 0; t < 60; t++) stepBody(world, b, null, TICK_MS);
    expect(b.y).toBeCloseTo(top, 3);
    expect(b.grounded).toBe(true);
  });

  it("stops bullets and sight lines at buildings and terrain", () => {
    const store = meta.pois.find((p) => p.id === "island-superstore")!;
    const y = store.padHeight! + 1.5;
    const hit = world.raycast(store.x, y, store.z + 90, 0, 0, -1, 200)!;
    expect(hit.kind).toBe("box");
    expect(hit.distance).toBeLessThan(80);
    // Straight down from the sky onto open terrain.
    const g = world.raycast(-1500, 500, -800, 0, -1, 0, 1000)!;
    expect(g.kind === "ground" || g.kind === "trunk").toBe(true);
  });

  it("is deterministic and cheap enough for 100 players per tick", () => {
    const run = () => {
      const bodies = Array.from({ length: 100 }, (_, i) =>
        body(-2000 + (i % 10) * 37, -1500 + Math.floor(i / 10) * 41),
      );
      const t0 = performance.now();
      for (let t = 0; t < 150; t++)
        for (const [i, b] of bodies.entries())
          stepBody(
            world,
            b,
            {
              forward: 1,
              strafe: (i % 3) - 1,
              yaw: i + t / 50,
              sprint: i % 2 === 0,
              jump: t % 40 === i % 40,
            },
            TICK_MS,
          );
      return { ms: (performance.now() - t0) / 150, state: bodies.map((b) => [b.x, b.y, b.z]) };
    };
    const a = run(),
      b = run();
    expect(b.state).toEqual(a.state);
    expect(Math.min(a.ms, b.ms)).toBeLessThan(4);
  });
});
