import { expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { Heightfield } from "../src/lib/fps/br/heightfield";
import { rollLoot } from "../src/lib/fps/br/loot";
import { indoorLootPoint, modelSpots, turnPoint } from "../src/lib/fps/br/loot-spots";
import { StaticWorld } from "../src/lib/fps/br/static-world";
import type { Placement } from "../src/lib/fps/br/layout";
import type { WorldMeta } from "../src/lib/fps/br/world";
import { WORLD_ASSETS } from "../src/lib/fps/br/world";
const hf = new Heightfield(2, 2, 10000, new Float32Array(4));
const meta = { waterBodies: [], perches: [] } as unknown as WorldMeta;

test("a covered porch and eaves are not indoor rooms, including companion ammunition", () => {
  const collision = {
    voxel: 1,
    models: {
      cabin: [
        [-4, 0, -4, 4, 0.2, 6], // room floor extends onto its porch
        [-6, 3, -6, 6, 3.2, 6], // roof covers the porch and both eaves
        [-4, 0.2, -4, -3.8, 3, 4],
        [3.8, 0.2, -4, 4, 3, 4],
        [-4, 0.2, -4, 4, 3, -3.8],
        [-4, 0.2, 3.8, -0.8, 3, 4],
        [0.8, 0.2, 3.8, 4, 3, 4],
        [-4, 0.2, 5.8, -3.8, 3, 6],
        [3.8, 0.2, 5.8, 4, 3, 6], // porch posts
      ],
    },
  };
  expect(indoorLootPoint(collision, "cabin", 0, 0.2, 5)).toBe(false);
  expect(indoorLootPoint(collision, "cabin", 5, 0, 0)).toBe(false);
  expect(indoorLootPoint(collision, "cabin", 0, 0.2, 0)).toBe(true);
  let count = 0;
  for (const turn of [0, 1, 2, 3]) {
    const p = { model: "cabin", x: 20, y: 0, z: 30, turn, poi: "test" } as Placement;
    const world = new StaticWorld(hf, [p], collision, null);
    for (let seed = 0; seed < 40; seed++)
      for (const item of rollLoot(seed, [p], collision, world, meta)) {
        const [x, z] = turnPoint(item.x - p.x, item.z - p.z, (4 - turn) % 4);
        // Independent room footprint assertion, rather than calling the production classifier.
        expect(Math.abs(x)).toBeLessThan(3.8);
        expect(Math.abs(z)).toBeLessThan(3.8);
        count++;
      }
  }
  expect(count).toBeGreaterThan(300);
});

test("initial loot does not spawn beside parked vehicles or outdoor military props", () => {
  for (const model of [
    "car-cruiser",
    "car-sedan",
    "car-pickup",
    "military-crate",
    "radar-truck",
    "helipad",
  ]) {
    const collision = { voxel: 1, models: { [model]: [[-2, 0, -2, 2, 1, 2]] } };
    const p = { model, x: 0, y: 0, z: 0, turn: 0, poi: "test" } as Placement;
    const world = new StaticWorld(hf, [p], collision, null);
    for (let seed = 0; seed < 20; seed++)
      expect(rollLoot(seed, [p], collision, world, meta)).toEqual([]);
  }
});

test("real authored building entrances provide indoor loot, including raised and upper floors", () => {
  const collision = JSON.parse(readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"));
  const routes = JSON.parse(readFileSync("art/br/building-access-routes.json", "utf8")) as Array<
    [string, number[][]]
  >;
  for (const model of new Set(routes.map(([m]) => m))) {
    const spots = modelSpots(collision, model, "indoor", 2.5, 40);
    expect(spots.length, model).toBeGreaterThan(0);
    for (const s of spots)
      expect(indoorLootPoint(collision, model, s.x, s.y, s.z), model).toBe(true);
  }
  expect(modelSpots(collision, "rural-mobile-home", "indoor", 2.5, 6).some((s) => s.y >= 0.7)).toBe(
    true,
  );
  expect(modelSpots(collision, "fire-station", "indoor", 2.5, 40).some((s) => s.y >= 2.6)).toBe(
    true,
  );
});

test("sealed houses never substitute outdoor loot along their walls", () => {
  const p = { model: "house", x: 0, y: 0, z: 0, turn: 0, poi: "test" } as Placement;
  const collision = { voxel: 1, models: { house: [[-4, 0, -4, 4, 4, 4]] } };
  const world = new StaticWorld(hf, [p], collision, null);
  for (let seed = 0; seed < 20; seed++)
    expect(rollLoot(seed, [p], collision, world, meta)).toEqual([]);
});

test("enterable buildings and companion ammo stay indoors at all four rotations", () => {
  const collision = {
    voxel: 1,
    models: {
      cabin: [
        [-4, 0, -4, 4, 0.2, 4],
        [-4, 3, -4, 4, 3.2, 4],
        [-4, 0.2, -4, -3.8, 3, 4],
        [3.8, 0.2, -4, 4, 3, 4],
        [-4, 0.2, 3.8, 4, 3, 4],
        [-4, 0.2, -4, -0.8, 3, -3.8],
        [0.8, 0.2, -4, 4, 3, -3.8],
      ],
    },
  };
  let checked = 0;
  for (const turn of [0, 1, 2, 3]) {
    const p = { model: "cabin", x: 0, y: 0, z: 0, turn, poi: "test" } as Placement;
    const world = new StaticWorld(hf, [p], collision, null);
    for (let seed = 0; seed < 20; seed++)
      for (const item of rollLoot(seed, [p], collision, world, meta)) {
        const [x, z] = turnPoint(item.x, item.z, (4 - turn) % 4);
        expect(indoorLootPoint(collision, "cabin", x, item.y, z)).toBe(true);
        expect(world.blocked(item.x, item.y + 0.05, item.z, 0.4, 0.15)).toBe(false);
        checked++;
      }
  }
  expect(checked).toBeGreaterThan(100);
});
