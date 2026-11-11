import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Heightfield } from "@/lib/fps/br/heightfield";
import { stepBody, type BrBody } from "@/lib/fps/br/movement";
import { StaticWorld, type CollisionData } from "@/lib/fps/br/static-world";
import { WORLD_ASSETS } from "@/lib/fps/br/world";

/**
 * Walls and railings beside stairs (owner, 2026-11-11: "some walls the player can fall or walk
 * through, e.g. in the superstore at the stairs to the 2nd level, some houses with a
 * staircase"). The access pipeline cleared the collision round every flight and took the
 * flight's side walls and rails with it; art/blender/br/restore_stair_sides.mjs (access-v13)
 * puts them back. Here a player on a flight pushes sideways off it and must be stopped.
 */
const collision = JSON.parse(
  readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"),
) as CollisionData;

/** `tread`: about the flight's height there (the support under it, not the floor above). */
function push(model: string, x: number, z: number, tread: number, toX: number, toZ: number) {
  const hf = { heightAt: () => 0 } as unknown as Heightfield;
  const world = new StaticWorld(
    hf,
    [{ model, turn: 0, x: 0, y: 0, z: 0, poi: "t" }],
    collision,
    null,
  );
  const y = world.supportAt(x, z, 0.3, tread + 0.5);
  const body: BrBody = { x, y, z, velocityY: 0, grounded: true, crouched: false };
  const start = { ...body };
  for (let tick = 0; tick < 90; tick++)
    stepBody(world, body, { forward: 1, strafe: 0, yaw: Math.atan2(x - toX, z - toZ) }, 34);
  return { start, body };
}

describe("stair sides are solid", () => {
  it("the superstore's mezzanine flights: their outer rail stops a player", () => {
    // The west flight: x −31.6…−30, rising north from z −5 to −19.4; its rail at x = −31.6.
    for (const [x, z, to] of [
      [-30.8, -9, -40],
      [-30.8, -16, -40],
      [30.8, -12, 40],
    ] as const) {
      const { start, body } = push("superstore-interior", x, z, ((-5 - z) / 14.4) * 4.6, to, z);
      expect(start.y, "standing on the flight").toBeGreaterThan(0.5);
      expect(Math.abs(body.x), `${x},${z}`).toBeLessThan(31.6 - 0.3);
      expect(body.y).toBeGreaterThan(start.y - 0.4);
    }
  });

  it("the fire lookout's first flight: its side does not let a player off", () => {
    // Flight 1: x 3.11…4.5, z −3.46…2.85; the side element at x 2.4…3.0.
    const { start, body } = push("fire-lookout", 3.8, 0, 2.5, -5, 0);
    expect(start.y).toBeGreaterThan(0.5);
    expect(body.x).toBeGreaterThan(2.7);
  });
});
