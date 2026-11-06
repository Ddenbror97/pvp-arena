import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { islandDoors, withDoors } from "@/lib/fps/br/doors";
import type { Heightfield } from "@/lib/fps/br/heightfield";
import { turnPoint } from "@/lib/fps/br/loot-spots";
import { stepBody, type BrBody } from "@/lib/fps/br/movement";
import { StaticWorld, type CollisionData } from "@/lib/fps/br/static-world";
import { assertIslandRevision, WORLD_ASSETS } from "@/lib/fps/br/world";
import type { Placement } from "@/lib/fps/br/layout";

const collision = JSON.parse(
  readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"),
) as CollisionData;
const fixtures: Record<string, number[][]> = {
  house: [
    [-1.4, 5],
    [-1.4, 1],
  ],
  "rural-house": [
    [0.05, 5.6],
    [0.05, 1],
  ],
  barn: [
    [8.4, 6.25],
    [4.43, 6.25],
    [4.43, 3.5],
  ],
  "rural-wood-1": [
    [10.8, 7.15],
    [4.5, 7.15],
    [-2.25, 7.15],
    [-2.25, 4],
  ],
  "rural-wood-4": [
    [0, 7.5],
    [0, 4],
  ],
};

function walk(world: StaticWorld, body: BrBody, points: number[][], mustArrive = true) {
  for (const [x, z] of points) {
    for (let tick = 0; tick < 160 && Math.hypot(body.x - x, body.z - z) > 0.18; tick++) {
      const before = { ...body };
      stepBody(world, body, { forward: 1, strafe: 0, yaw: Math.atan2(body.x - x, body.z - z) }, 34);
      // An unstick teleport must not masquerade as a successful entrance traversal.
      expect(Math.hypot(body.x - before.x, body.z - before.z)).toBeLessThan(0.18);
      expect(body.y - before.y).toBeLessThanOrEqual(0.351);
    }
    if (mustArrive) expect(Math.hypot(body.x - x, body.z - z)).toBeLessThan(0.19);
  }
}

describe("authored BR building entrances and walkable approaches", () => {
  it("requires the same model and collision asset revision", () => {
    const models = JSON.parse(readFileSync(`public${WORLD_ASSETS.models}`, "utf8"));
    expect(() => assertIslandRevision(models, collision)).not.toThrow();
    expect(() => assertIslandRevision(models, { worldRevision: "legacy" })).toThrow(
      "version mismatch",
    );
  });
  for (const [model, local] of Object.entries(fixtures)) {
    for (const turn of [0, 1, 2, 3] as const) {
      it(`${model}: walks in and back out at rotation ${turn}, with standing collision`, () => {
        const placement: Placement = { model, turn, x: 100, y: 12, z: -100, poi: "test" };
        const hf = { heightAt: () => placement.y } as Heightfield;
        const solid = new StaticWorld(hf, [placement], collision, null);
        const set = islandDoors([placement], collision);
        expect(set.doors).toHaveLength(1);
        const open = withDoors(solid, set, new Uint8Array([1]));
        const path = local.map(([x, z]) => {
          const p = turnPoint(x!, z!, turn);
          return [p[0] + placement.x, p[1] + placement.z];
        });
        const body: BrBody = {
          x: path[0]![0]!,
          z: path[0]![1]!,
          y: placement.y,
          velocityY: 0,
          grounded: true,
          crouched: false,
        };
        walk(open, body, path.slice(1));
        expect(body.grounded).toBe(true);
        walk(open, body, [...path].reverse().slice(1));
        expect(body.grounded).toBe(true);
        const d = set.doors[0]!;
        expect(open.blocked(d.x, d.y0 + 0.02, d.z, 1.8, 0.35)).toBe(false);
        const closed = withDoors(solid, set, new Uint8Array([0]));
        expect(closed.blocked(d.x, d.y0 + 0.02, d.z, 1.8, 0.35)).toBe(true);
        // The real frame still blocks the body; this does not disable building collision.
        expect(
          open.blocked(
            d.x + (d.along === "x" ? d.width / 2 + 0.12 : 0),
            d.y0 + 0.2,
            d.z + (d.along === "z" ? d.width / 2 + 0.12 : 0),
            1.8,
            0.35,
          ),
        ).toBe(true);
      });
    }
  }
});
