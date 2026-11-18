import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import type { Heightfield } from "../src/lib/fps/br/heightfield";
import { StaticWorld, type CollisionData } from "../src/lib/fps/br/static-world";
import { stepBody, type BrBody, type BrMoveInput } from "../src/lib/fps/br/movement";
import { WORLD_ASSETS } from "../src/lib/fps/br/world";

/**
 * The rusty stilt house in the Forgotten Ruins (owner, 2026-11-18: "it cant be entered fix that
 * and fix the stairs"; art/blender/br/rusty_house.mjs). Walked from the ground up the back stair,
 * through every room on the deck and out onto the porch; and up the outer stair, the landing and
 * the upper flight, into the upper room and out onto the front balcony. Each stop is reached at
 * its floor's height and no tick makes less than half its stride.
 */
type Stop = readonly [x: number, z: number, y?: number];
const DECK = 1.2,
  UPPER = 3.42;
const ROUTES: Record<string, Stop[]> = {
  "back stair, the rooms, the porch": [
    [1.5, -5.6, 0],
    [1.5, -3.8, DECK],
    [1.5, -0.75, DECK],
    [-0.4, -0.75, DECK], // through the veranda door into the back room
    [-0.95, -1.4, DECK],
    [-0.95, 1.4, DECK], // between the rooms
    [0.05, 2.8, DECK],
    [0.05, 4.0, DECK], // out onto the porch
    [0.05, 2.6, DECK],
    [-0.2, 1.25, DECK],
    [1.6, 1.25, DECK], // the front room's veranda door
    [1.6, -3.8, DECK],
    [1.5, -5.6, 0],
  ],
  "outer stair, upper flight, upper room, balcony": [
    [2.9, 0.1, 0],
    [2.9, 3.1, 1.85],
    [2.75, 3.45, 1.85],
    [1.85, 3.45],
    [1.7, 1.5, UPPER], // up the upper flight onto the side balcony
    [1.75, 1.1, UPPER],
    [0.0, 1.1, UPPER], // into the upper room
    [0.05, 3.0, UPPER],
    [0.05, 4.0, UPPER], // onto the front balcony
    [0.05, 2.6, UPPER],
    [0.0, 1.1, UPPER],
    [1.75, 1.1, UPPER],
    [1.75, 1.75, UPPER],
    [1.85, 3.45],
    [2.9, 3.1, 1.85],
    [2.9, 0.1, 0],
  ],
};

describe("stilt house walk-through", () => {
  const collision = JSON.parse(
    readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"),
  ) as CollisionData;
  const hf = { heightAt: () => 0 } as unknown as Heightfield;
  for (const [name, route] of Object.entries(ROUTES))
    for (const sprint of [false, true])
      it(`${name}, ${sprint ? "sprinting" : "walking"}`, () => {
        const p = { model: "rusty-house", turn: 0 as const, x: 0, y: 0, z: 0, poi: "test" };
        const world = new StaticWorld(hf, [p], collision, null);
        const [sx, sz] = route[0]!;
        const body = {
          x: sx,
          y: 0,
          z: sz,
          grounded: true,
          crouched: false,
          velocityY: 0,
        } as BrBody;
        const stride = (5 * (sprint ? 1.5 : 1)) / 30;
        const stalls: string[] = [];
        for (const [x, z, y] of route.slice(1)) {
          for (let t = 0; t < 300; t++) {
            const left = Math.hypot(body.x - x, body.z - z);
            if (left <= Math.max(0.15, stride * 0.75)) break;
            const before = { x: body.x, z: body.z };
            const input = {
              forward: 1,
              strafe: 0,
              yaw: Math.atan2(body.x - x, body.z - z),
              sprint,
            };
            stepBody(world, body, input as BrMoveInput, 34);
            if (Math.hypot(body.x - before.x, body.z - before.z) < Math.min(stride, left) * 0.5)
              stalls.push(`${body.x.toFixed(2)},${body.y.toFixed(2)},${body.z.toFixed(2)}`);
          }
          // Settle (a drop off a step lands in a tick or two).
          for (let t = 0; t < 10; t++)
            stepBody(world, body, { forward: 0, strafe: 0, yaw: 0, sprint } as BrMoveInput, 34);
          expect(Math.hypot(body.x - x, body.z - z), `reach ${x},${z}`).toBeLessThan(0.25);
          if (y !== undefined) expect(body.y, `height at ${x},${z}`).toBeCloseTo(y, 1);
        }
        expect(stalls).toEqual([]);
      });
});
