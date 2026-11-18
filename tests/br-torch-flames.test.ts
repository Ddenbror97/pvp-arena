import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import type { Placement } from "@/lib/fps/br/layout";
import type { CollisionData, StaticWorld } from "@/lib/fps/br/static-world";
import { FLAMES, firePoints } from "@/lib/fps/br/torch-flames";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";

const buffer = (path: string) => {
  const f = readFileSync(path);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const meta = JSON.parse(readFileSync(`public${WORLD_ASSETS.meta}`, "utf8")) as WorldMeta;
const collision = JSON.parse(
  readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"),
) as CollisionData;
const models = JSON.parse(readFileSync(`public${WORLD_ASSETS.models}`, "utf8")) as {
  models: Record<string, { size: number[] }>;
};
const WALL = new Set(["torch-medieval", "torch-holder", "torch-rusty"]);

let layout: Placement[], world: StaticWorld;
beforeAll(async () => {
  const hf = await decodeHeightfield(buffer(`public${WORLD_ASSETS.height}`));
  const cover = await decodeLandCover(buffer(`public${WORLD_ASSETS.landcover}`));
  ({ layout, solid: world } = buildIsland(hf, cover, meta, collision));
}, 60_000);

describe("Forgotten Ruins' torches (torch-flames.ts)", () => {
  it("burns only on models the island has, each flame on its model", () => {
    for (const [id, points] of Object.entries(FLAMES)) {
      const m = models.models[id];
      expect(m, id).toBeDefined();
      const [w, h, d] = m!.size as [number, number, number];
      for (const [x, y, z] of points) {
        expect(Math.abs(x), id).toBeLessThanOrEqual(w / 2 + 0.01);
        expect(Math.abs(z), id).toBeLessThanOrEqual(d / 2 + 0.01);
        expect(y, id).toBeLessThanOrEqual(h + 0.01);
      }
    }
  });

  it("lights the temples: torches on their walls, braziers and torch columns", () => {
    const ruins = layout.filter((p) => p.poi === "forgotten-ruins");
    const wall = ruins.filter((p) => WALL.has(p.model));
    expect(wall.length).toBeGreaterThan(70);
    expect(firePoints(ruins).length / 6).toBeGreaterThan(wall.length + 20);
  });

  it("hangs every wall torch on a wall, its flame in the open over a floor", () => {
    const bad: string[] = [];
    for (const p of layout) {
      if (!WALL.has(p.model)) continue;
      const [x, y, z] = Array.from(firePoints([p]).slice(0, 3)) as [number, number, number];
      const where = `${p.model}@${p.x},${p.y},${p.z} t${p.turn}`;
      // The flame itself in the room (not in the wall, a vault or the ceiling).
      if (world.blocked(x, y, z, 0.35, 0.04)) bad.push(`${where}: flame in solid`);
      // A wall within reach behind it.
      else if (!world.blocked(x, y, z, 0.3, 0.45)) bad.push(`${where}: no wall`);
      // A floor under it, a torch's height down (never hung over a drop).
      const floor = world.supportAt(x, z, 0.05, y);
      if (y - floor > 2.6 || y - floor < 1.1) bad.push(`${where}: ${(y - floor).toFixed(2)} m up`);
    }
    expect(bad).toEqual([]);
  });
});
