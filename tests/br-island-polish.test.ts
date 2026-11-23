import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { withDoors } from "@/lib/fps/br/doors";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { turnPoint } from "@/lib/fps/br/loot-spots";
import { stepBody, type BrBody } from "@/lib/fps/br/movement";
import type { CollisionData } from "@/lib/fps/br/static-world";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";

/**
 * The Superstore island polish (owner, 2026-11-08: "audit the rest of the island, the airstrip,
 * forest, polish the entire island"; "ensure any new buildings can be entered, with opening
 * doors"): the village, West Point and the airfield are built up, the woods and verges dressed,
 * and the airfield terminal can be walked into up its porch steps, through its doors.
 */
const buffer = (path: string) => {
  const b = readFileSync(path);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
};
const collision = JSON.parse(
  readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"),
) as CollisionData;
const meta = JSON.parse(readFileSync(`public${WORLD_ASSETS.meta}`, "utf8")) as WorldMeta;
const hf = await decodeHeightfield(buffer(`public${WORLD_ASSETS.height}`));
const cover = await decodeLandCover(buffer(`public${WORLD_ASSETS.landcover}`));
const island = buildIsland(hf, cover, meta, collision);
const open = withDoors(
  island.solid,
  island.doors,
  new Uint8Array(island.doors.doors.length).fill(1),
);
const onIsland = island.layout.filter((p) => p.z > 3350 && p.x > -2600);
const count = (poi: string, models?: string[]) =>
  onIsland.filter((p) => p.poi === poi && (!models || models.includes(p.model))).length;

describe("Superstore island polish", () => {
  it("builds up the village, West Point and the airfield", () => {
    // (Since the locations upgrade, 2026-11-15, most of them the enterable village buildings.)
    const homes = [
      "house",
      "rural-house",
      "bungalow",
      "townhouse",
      "rural-store-1",
      "cottage-stone",
      "cottage-wood",
      "cottage-white",
      "village-store",
      "bakery",
      "village-inn",
      "schoolhouse",
    ];
    expect(count("island-village", homes)).toBeGreaterThan(60);
    expect(count("island-village", ["church", "carousel", "playground"])).toBe(3);
    expect(count("west-point")).toBeGreaterThan(10);
    for (const m of ["airliner", "cargo-plane", "chinook", "bizjet"])
      expect(count("island-airfield", [m]), m).toBe(1);
    // The procedural terminal, twice (the old download's spot and the passenger side), and the
    // procedural hangars in the hangar row and on the passenger side.
    expect(count("island-airfield", ["air-terminal"])).toBe(2);
    expect(count("island-airfield", ["air-hangar"])).toBe(4);
    expect(count("island-airfield", ["terminal", "hangar"])).toBe(0);
  });

  it("dresses the woods and the verges", () => {
    const wild = (m: string) => onIsland.filter((p) => p.model === m).length;
    for (const m of ["hunting-stand", "mossy-log", "stump", "tent-canvas", "campfire"])
      expect(wild(m), m).toBeGreaterThan(3);
    expect(wild("rusty-truck") + wild("burned-car-b") + wild("crashed-car")).toBeGreaterThan(5);
  });

  it("walks into both airfield terminals through their doors", () => {
    const terminals = island.layout.filter((p) => p.model === "air-terminal");
    expect(terminals.length).toBe(2);
    for (const t of terminals)
      for (const route of [
        [
          [-8, 11],
          [-8, 7.9],
          [-8, 4],
        ],
        [
          [8, 11],
          [8, 7.9],
          [8, 4],
        ],
        [
          [0, -11],
          [0, -7.9],
          [0, -4],
        ],
      ]) {
        const pts = route.map(([x, z]) => {
          const [dx, dz] = turnPoint(x!, z!, t.turn);
          return [t.x + dx, t.z + dz];
        });
        const body: BrBody = {
          x: pts[0]![0]!,
          z: pts[0]![1]!,
          y: hf.heightAt(pts[0]![0]!, pts[0]![1]!),
          velocityY: 0,
          grounded: true,
          crouched: false,
        };
        for (const [x, z] of pts.slice(1)) {
          for (let k = 0; k < 600 && Math.hypot(body.x - x!, body.z - z!) > 0.18; k++)
            stepBody(
              open,
              body,
              { forward: 1, strafe: 0, yaw: Math.atan2(body.x - x!, body.z - z!) },
              34,
            );
          expect(Math.hypot(body.x - x!, body.z - z!), `to ${x},${z}`).toBeLessThan(0.19);
        }
        expect(body.y - t.y).toBeCloseTo(0.15, 1);
      }
  });
});
