import { expect, test } from "vitest";
import { Heightfield } from "../src/lib/fps/br/heightfield";
import { rollLoot } from "../src/lib/fps/br/loot";
import { indoorLootPoint, turnPoint } from "../src/lib/fps/br/loot-spots";
import { StaticWorld } from "../src/lib/fps/br/static-world";
import type { Placement } from "../src/lib/fps/br/layout";
import type { WorldMeta } from "../src/lib/fps/br/world";
const hf = new Heightfield(2, 2, 10000, new Float32Array(4));
const meta = { waterBodies: [], perches: [] } as unknown as WorldMeta;

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
