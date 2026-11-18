import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import type { Heightfield } from "../src/lib/fps/br/heightfield";
import { StaticWorld, type CollisionData } from "../src/lib/fps/br/static-world";
import { stepBody, type BrBody, type BrMoveInput } from "../src/lib/fps/br/movement";
import { WORLD_ASSETS } from "../src/lib/fps/br/world";

/**
 * Forgotten Ruins' ground clutter (owner, 2026-11-18: "some bushes cant be walked over
 * character get stucks"). The low mossy stones and the small log pile are walked over on foot
 * (build_collision "mound": tiers of at most 0.3 m); a fallen jungle log is one mass (its
 * "columns") that a player walking into it from any side can always walk away from again.
 */
const collision = JSON.parse(
  readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"),
) as CollisionData;
const hf = { heightAt: () => 0 } as unknown as Heightfield;
const worldWith = (model: string) =>
  new StaticWorld(hf, [{ model, turn: 0, x: 0, y: 0, z: 0, poi: "test" }], collision, null);
const body = (x: number, z: number) =>
  ({ x, y: 0, z, grounded: true, crouched: false, velocityY: 0 }) as BrBody;
const walk = (world: StaticWorld, b: BrBody, yaw: number, ticks: number) => {
  for (let t = 0; t < ticks; t++)
    stepBody(world, b, { forward: 1, strafe: 0, yaw, sprint: false } as BrMoveInput, 34);
};

describe("ruins clutter", () => {
  for (const model of ["mossy-stones", "mossy-stones-b", "mossy-stones-c", "log-pile-s"])
    for (const [dx, dz] of [
      [1, 0],
      [0, 1],
    ] as const)
      it(`${model} is walked over (${dx ? "along x" : "along z"})`, () => {
        const world = worldWith(model);
        const b = body(-3 * dx, -3 * dz);
        // yaw 0 walks −z; atan2(−dx, −dz) faces along (dx, dz).
        walk(world, b, Math.atan2(-dx, -dz), 60);
        expect(b.x * dx + b.z * dz).toBeGreaterThan(2.5);
      });
  for (const model of ["rainforest-log", "rainforest-log-b"])
    it(`${model}: walked into from every side, walked away from again`, () => {
      const world = worldWith(model);
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        const b = body(Math.sin(a) * 12, Math.cos(a) * 12);
        walk(world, b, Math.atan2(b.x, b.z), 90); // towards the middle, into the log
        const stopped = { x: b.x, z: b.z };
        walk(world, b, Math.atan2(-b.x, -b.z), 30); // straight back out
        expect(Math.hypot(b.x - stopped.x, b.z - stopped.z), `side ${k}`).toBeGreaterThan(3);
      }
    });
});
