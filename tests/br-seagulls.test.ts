import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { seagullAreas, seagullPresence } from "@/lib/fps/br/seagulls";
import type { CollisionData } from "@/lib/fps/br/static-world";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";

const buffer = (path: string) => {
  const b = readFileSync(path);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
};
let areas: ReturnType<typeof seagullAreas>;
beforeAll(async () => {
  const hf = await decodeHeightfield(buffer(`public${WORLD_ASSETS.height}`));
  const cover = await decodeLandCover(buffer(`public${WORLD_ASSETS.landcover}`));
  const meta = JSON.parse(readFileSync(`public${WORLD_ASSETS.meta}`, "utf8")) as WorldMeta;
  const collision = JSON.parse(
    readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"),
  ) as CollisionData;
  areas = seagullAreas(buildIsland(hf, cover, meta, collision).layout);
}, 120_000);

describe("seagulls over the towns by the sea (owner, 2026-11-17)", () => {
  it("are heard all over those towns, not only at the water", () => {
    // Fisher's Cove (its quay and the village up the slope), Bayview (the grid's middle, 450 m
    // from the sea, and the seafront), Eastport (its fish quay and its streets inland); and
    // each one's waterfront.
    expect(areas.length).toBeGreaterThanOrEqual(4);
    for (const [name, x, z] of [
      ["Fisher's Cove quay", -3700, 3280],
      ["Fisher's Cove village", -3700, 3100],
      ["Bayview, the middle of the grid", -4150, -1650],
      ["Bayview seafront", -4374, -1985],
      ["Eastport quay", 4812, -1650],
      ["Eastport streets", 4560, -1560],
    ] as const)
      expect(seagullPresence(areas, x, z), name).toBe(1);
  });
  it("fade out past the towns and are not heard inland", () => {
    expect(seagullPresence(areas, -4150, -1250)).toBeLessThan(1);
    for (const [name, x, z] of [
      ["Northstar Town", -3229, -3568],
      ["Downtown", 1300, 420],
      ["West Point (inland water)", -1480, 3964],
      ["Island Village (inland water)", -853, 3864],
    ] as const)
      expect(seagullPresence(areas, x, z), name).toBe(0);
  });
});
