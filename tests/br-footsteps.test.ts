import { expect, test } from "vitest";
import { BrStrides, createBrFootstepSurface } from "../src/lib/fps/br/footsteps";
import { Heightfield } from "../src/lib/fps/br/heightfield";
import { LandCoverMap } from "../src/lib/fps/br/landcover";
import type { WorldMeta } from "../src/lib/fps/br/world";

test("strides follow distance at different frame rates, never idle, airborne, quiet or teleport motion", () => {
  const run = (fps: number) => {
    const steps = new BrStrides();
    let count = 0;
    for (let f = 0; f <= fps * 5; f++)
      if (steps.advance(0, (f / fps) * 4.5, 0, 0, true, false, (f / fps) * 1000)) count++;
    return count;
  };
  expect(run(30)).toBe(run(144));
  expect(run(30)).toBeGreaterThan(10);
  const s = new BrStrides();
  s.advance(0, 0, 0, 0, true, false, 0);
  expect(s.advance(0, 100, 0, 0, true, false, 33)).toBe(false);
  for (let f = 1; f < 30; f++)
    expect(s.advance(0, 100 + f * 0.2, 0, 0, false, false, f * 33)).toBe(false);
  for (let f = 30; f < 60; f++)
    expect(s.advance(0, 100 + f * 0.2, 0, 0, true, true, f * 33)).toBe(false);
});

test("ground and authored props select shared dirt, concrete, wood and metal responses", () => {
  const hf = new Heightfield(2, 2, 10000, new Float32Array(4));
  const cover = new LandCoverMap(1, 1, new Uint8Array([2]));
  const material = createBrFootstepSurface(
    hf,
    cover,
    [{ model: "cabin", x: 0, y: 0, z: 0, turn: 0 } as never],
    { voxel: 1, models: { cabin: [[-2, 0, -2, 2, 3, 2]] } },
    { bridges: [{ a: [10, -2], b: [10, 2], deck: 2, width: 3 }] } as WorldMeta,
  );
  expect(material(100, 0, 100)).toBe("dirt");
  expect(material(0, 0, 0)).toBe("wood");
  expect(material(10, 2, 0)).toBe("metal");
  cover.data[0] = 6;
  expect(material(100, 0, 100)).toBe("concrete");
});
