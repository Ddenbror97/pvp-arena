import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { decodeHeightfield, type Heightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import type { Placement } from "@/lib/fps/br/layout";
import { turnPoint } from "@/lib/fps/br/loot-spots";
import { stepBody, type BrBody } from "@/lib/fps/br/movement";
import { StaticWorld, type CollisionData } from "@/lib/fps/br/static-world";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";

/**
 * East Works rebuilt (2026-11-17, build_works.mjs, layout.ts eastWorks): the card's power
 * station stands, its tanks' stairs climb to their railed tops, the chimney's lookout is up.
 */
const buffer = (path: string) => {
  const f = readFileSync(path);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const collision = JSON.parse(
  readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"),
) as CollisionData;
const meta = JSON.parse(readFileSync(`public${WORLD_ASSETS.meta}`, "utf8")) as WorldMeta;

function walk(world: StaticWorld, body: BrBody, points: number[][]) {
  for (const [x, z] of points) {
    for (let t = 0; t < 400 && Math.hypot(body.x - x!, body.z - z!) > 0.18; t++)
      stepBody(
        world,
        body,
        { forward: 1, strafe: 0, yaw: Math.atan2(body.x - x!, body.z - z!) },
        34,
      );
    expect(Math.hypot(body.x - x!, body.z - z!), `reached ${x},${z}`).toBeLessThan(0.19);
  }
}

/** The tanks' stairs (no doors: the building-access routes are for doors). */
const TANKS: Array<[string, number[][], number]> = [
  [
    "ew-tank-white",
    [
      [-18, 8.95],
      [-0.6, 8.95],
      [0.3, 8.0],
      [0.3, 4],
    ],
    11,
  ],
  [
    "ew-tank-grey",
    [
      [-15, 7.45],
      [-0.6, 7.45],
      [0.3, 6.5],
      [0.3, 3],
    ],
    9,
  ],
];

describe("East Works", () => {
  for (const [model, route, top] of TANKS)
    for (const turn of [0, 1, 2, 3] as const)
      it(`${model}: up the stair on to the top and down, turn ${turn}`, () => {
        const p: Placement = { model, turn, x: 50, y: 10, z: -50, poi: "test" };
        const hf = { heightAt: () => p.y } as Heightfield;
        const world = new StaticWorld(hf, [p], collision, null);
        const path = route.map(([x, z]) => {
          const q = turnPoint(x!, z!, turn);
          return [q[0] + p.x, q[1] + p.z];
        });
        const body: BrBody = {
          x: path[0]![0]!,
          z: path[0]![1]!,
          y: p.y,
          velocityY: 0,
          grounded: true,
          crouched: false,
        };
        walk(world, body, path.slice(1));
        expect(body.y - p.y).toBeGreaterThan(top - 0.1);
        walk(world, body, [...path].reverse().slice(1));
        expect(body.y - p.y).toBeLessThan(0.3);
      });

  let layout: Placement[];
  beforeAll(async () => {
    const hf = await decodeHeightfield(buffer(`public${WORLD_ASSETS.height}`));
    const cover = await decodeLandCover(buffer(`public${WORLD_ASSETS.landcover}`));
    ({ layout } = buildIsland(hf, cover, meta, collision));
  }, 60_000);

  it("stands as its card draws it: three boiler towers, two chimneys, the stacks, the tanks", () => {
    const at = (m: string) => layout.filter((p) => p.poi === "east-works" && p.model === m);
    expect(at("ew-boiler-tower")).toHaveLength(3);
    expect(at("ew-chimney")).toHaveLength(2);
    expect(at("ew-smoke-stacks")).toHaveLength(1);
    expect(at("ew-turbine-hall")).toHaveLength(1);
    expect(at("ew-control-house")).toHaveLength(1);
    expect(at("ew-workshop")).toHaveLength(1);
    expect(at("ew-tank-white").length + at("ew-tank-grey").length).toBe(3);
    // The floor: a few hundred squares over the pad, an avenue of asphalt.
    expect(at("ew-yard").length + at("ew-yard-lines").length).toBeGreaterThan(150);
    expect(at("ew-road").length).toBeGreaterThan(4);
  });
});
