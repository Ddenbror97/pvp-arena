import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import type { Heightfield } from "../src/lib/fps/br/heightfield";
import { StaticWorld, type CollisionData } from "../src/lib/fps/br/static-world";
import { islandDoors, withDoors } from "../src/lib/fps/br/doors";
import { stepBody, type BrBody, type BrMoveInput } from "../src/lib/fps/br/movement";
import { WORLD_ASSETS } from "../src/lib/fps/br/world";

/**
 * The shed (owner, 2026-11-18: "the door is tight and when enter it laggs alot"): its scan left
 * boxes with nothing drawn in them 20–30 cm into the side room, so a player walking in caught on
 * them tick after tick. Walked in, round both rooms and out again, walking and sprinting, with
 * the doors open: no tick may make less than half its stride.
 */
describe("shed walk-through", () => {
  const collision = JSON.parse(
    readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"),
  ) as CollisionData;
  const hf = { heightAt: () => 0 } as unknown as Heightfield;
  const route = [
    [-2.1, 1.2],
    [-2.1, -0.4],
    [-1.0, -1.3],
    [-2.3, -1.3],
    [-2.3, -0.3],
    [-1.0, -0.3],
    [-2.1, 0.0],
    [-2.1, 1.2],
    [-2.1, 3.4],
  ] as const;
  for (const sprint of [false, true])
    it(sprint ? "sprinting" : "walking", () => {
      const p = { model: "shed", turn: 0 as const, x: 0, y: 0, z: 0, poi: "test" };
      const solid = new StaticWorld(hf, [p], collision, null);
      const set = islandDoors([p], collision);
      const world = withDoors(solid, set, new Uint8Array(set.doors.length).fill(1));
      const body = {
        x: -2.1,
        y: 0,
        z: 3.4,
        grounded: true,
        crouched: false,
        velocityY: 0,
      } as BrBody;
      const stride = (5 * (sprint ? 1.5 : 1)) / 30;
      const stalls: string[] = [];
      for (const [x, z] of route) {
        for (let t = 0; t < 240; t++) {
          const left = Math.hypot(body.x - x, body.z - z);
          if (left <= Math.max(0.2, stride * 0.75)) break;
          const before = { x: body.x, z: body.z };
          const input = { forward: 1, strafe: 0, yaw: Math.atan2(body.x - x, body.z - z), sprint };
          stepBody(world, body, input as BrMoveInput, 34);
          if (Math.hypot(body.x - before.x, body.z - before.z) < Math.min(stride, left) * 0.5)
            stalls.push(`${body.x.toFixed(2)},${body.z.toFixed(2)}`);
        }
        expect(Math.hypot(body.x - x, body.z - z), `reach ${x},${z}`).toBeLessThan(0.25);
      }
      expect(stalls).toEqual([]);
    });
});
