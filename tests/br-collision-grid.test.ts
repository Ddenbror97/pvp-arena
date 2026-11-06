import { expect, test } from "vitest";
import type { Heightfield } from "@/lib/fps/br/heightfield";
import { StaticWorld } from "@/lib/fps/br/static-world";

test("fine collision cells retain edge-crossing hulls, supports and diagonal rays without duplicate visits", () => {
  const flat = { heightAt: () => 0, raycast: () => null } as unknown as Heightfield;
  const world = new StaticWorld(flat, [], { voxel: 0.3, models: {} }, null, [
    [3.9, 0, 3.9, 4.1, 2, 4.1],
    [-4.1, 0, -4.1, -3.9, 2, -3.9],
    [-12, 8, -12, 12, 9, 12],
  ]);
  for (const sign of [-1, 1]) {
    const x = 4 * sign;
    expect(world.blocked(x, 0.01, x, 1.8, 0.35)).toBe(true);
    expect(world.blocked(3 * sign, 0.01, 3 * sign, 1.8, 0.35)).toBe(false);
    expect(world.supportAt(x, x, 0.35, 2)).toBe(2);
    expect(world.supportAt(x, x, 0.35, 10)).toBe(9);
    const hit = world.raycast(0, 1, 0, sign, 0, sign, 20);
    expect(hit?.kind).toBe("box");
    expect(hit?.distance).toBeCloseTo(3.9 * Math.SQRT2, 5);
  }
  const visited: number[] = [];
  world.forEachBox(-6, -6, 6, 6, (i) => visited.push(i));
  expect(visited.sort()).toEqual([0, 1, 2]);
});
