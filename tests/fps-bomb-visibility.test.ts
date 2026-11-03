import { describe, expect, it } from "vitest";
import { traceWorld } from "../src/lib/fps/collision";
import { eyeHeight, PLAYER_RADIUS } from "../src/lib/fps/map";
import type { GameMap } from "../src/lib/fps/maps/types";
import { canSee } from "../src/lib/fps/bomb/visibility";
import { SANDGATE } from "../src/lib/fps/bomb/sandgate";

type Body = { x: number; y: number; z: number; crouched?: boolean };
/** The original implementation: nine full traceWorld rays. */
function reference(map: GameMap, viewer: Body, target: Body) {
  const origin = { x: viewer.x, y: viewer.y + eyeHeight(viewer), z: viewer.z };
  const dx = target.x - viewer.x,
    dz = target.z - viewer.z,
    length = Math.hypot(dx, dz) || 1;
  const sideX = (dz / length) * PLAYER_RADIUS * 0.9,
    sideZ = (-dx / length) * PLAYER_RADIUS * 0.9;
  const h = eyeHeight(target);
  for (const height of [h + 0.1, h, h * 0.55])
    for (const side of [-1, 0, 1]) {
      const x = target.x + sideX * side - origin.x,
        y = target.y + height - origin.y,
        z = target.z + sideZ * side - origin.z,
        distance = Math.hypot(x, y, z);
      if (
        distance < 0.01 ||
        !traceWorld(
          origin,
          { x: x / distance, y: y / distance, z: z / distance },
          Math.max(0, distance - 0.025),
          map,
        )
      )
        return true;
    }
  return false;
}

describe("Bomb Defusal line of sight", () => {
  it("the allocation-free occlusion test gives exactly the reference answer", () => {
    let seed = 12345;
    const rnd = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
    const heights = [0, 0, 0, 0.6, 1.2, 1.24];
    let visible = 0;
    for (let i = 0; i < 40000; i++) {
      const a = {
        x: rnd() * 80 - 40,
        y: heights[Math.floor(rnd() * 6)]!,
        z: rnd() * 80 - 40,
        crouched: rnd() < 0.3,
      };
      // Half the pairs close together (corners, doorways), half across the map.
      const near = rnd() < 0.5;
      const b = near
        ? {
            x: a.x + rnd() * 16 - 8,
            y: heights[Math.floor(rnd() * 6)]!,
            z: a.z + rnd() * 16 - 8,
            crouched: rnd() < 0.3,
          }
        : {
            x: rnd() * 80 - 40,
            y: heights[Math.floor(rnd() * 6)]!,
            z: rnd() * 80 - 40,
            crouched: rnd() < 0.3,
          };
      const fast = canSee(SANDGATE, a, b);
      expect(fast).toBe(reference(SANDGATE, a, b));
      if (fast) visible++;
    }
    // Both outcomes are well represented.
    expect(visible).toBeGreaterThan(4000);
    expect(visible).toBeLessThan(36000);
  });
});
