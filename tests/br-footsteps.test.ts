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

test("30 Hz movement keeps sounding at high and changing render rates", () => {
  for (const fps of [20, 30, 60, 90, 144, 240]) {
    const strides = new BrStrides();
    let count = 0;
    const seconds = new Set<number>();
    for (let f = 0; f <= fps * 12; f++) {
      const now = (f / fps) * 1000;
      const x = (Math.floor((now * 30) / 1000 + 1e-8) / 30) * 4.5;
      if (strides.advance(0, x, 0, 0, true, false, now)) {
        count++;
        seconds.add(Math.floor(now / 1000));
      }
    }
    expect(count, `${fps} FPS must not erase steps between physics ticks`).toBeGreaterThanOrEqual(
      28,
    );
    for (let second = 1; second < 12; second++)
      expect(seconds.has(second), `${fps} FPS silent second ${second}`).toBe(true);
  }
  const strides = new BrStrides();
  let now = 0,
    count = 0;
  while (now < 20000) {
    now += 1000 / (now < 10000 ? 144 : 25);
    const x = (Math.floor((now * 30) / 1000) / 30) * 4.5;
    if (strides.advance(0, x, 0, 0, true, false, now)) count++;
  }
  expect(count).toBeGreaterThanOrEqual(48);
});

test("snapshot rounding does not erase strides, and stationary correction jitter never makes footsteps", () => {
  const moving = new BrStrides(),
    standing = new BrStrides();
  let steps = 0;
  for (let f = 0; f <= 144 * 12; f++) {
    const now = (f / 144) * 1000,
      noise = (Math.floor(now / 50) % 2 ? 1 : -1) * 0.0008;
    const x = (Math.floor((now * 30) / 1000 + 1e-8) / 30) * 5 + noise;
    if (moving.advance(0, x, 0, 0, true, false, now)) steps++;
    expect(standing.advance(1, noise, 0, 0, true, false, now)).toBe(false);
  }
  expect(steps).toBeGreaterThanOrEqual(32);
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

test("snow on the Iron Peaks sounds snow wherever the ground shows it, rocks or not", async () => {
  // Owner, 2026-11-12: "stepping in snow sometimes dont sound snow, walking on snow = always
  // snow … at the iron peak".
  const { readFileSync } = await import("node:fs");
  const { decodeHeightfield } = await import("../src/lib/fps/br/heightfield");
  const { decodeLandCover } = await import("../src/lib/fps/br/landcover");
  const { buildIsland } = await import("../src/lib/fps/br/island");
  const { snowAt } = await import("../src/lib/fps/br/ground-noise");
  const { WORLD_ASSETS } = await import("../src/lib/fps/br/world");
  const buf = (p: string) => {
    const b = readFileSync(p);
    return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
  };
  const meta = JSON.parse(readFileSync(`public${WORLD_ASSETS.meta}`, "utf8")) as WorldMeta;
  const collision = JSON.parse(readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"));
  const hf = await decodeHeightfield(buf(`public${WORLD_ASSETS.height}`));
  const cover = await decodeLandCover(buf(`public${WORLD_ASSETS.landcover}`));
  const island = buildIsland(hf, cover, meta, collision);
  const surface = createBrFootstepSurface(hf, cover, island.layout, collision, meta);
  let snowy = 0,
    bare = 0;
  for (let z = -4800; z < 4800; z += 7)
    for (let x = -4800; x < 4800; x += 7) {
      const h = hf.heightAt(x, z);
      if (h < 360) continue;
      // Where a body stands: the ground, or the top of whatever it stands on there.
      const y = island.solid.supportAt(x, z, 0.3, h + 3);
      if (y - h > 0.05) continue;
      const s = snowAt(hf, x, z);
      if (s > 0.6) {
        snowy++;
        expect(surface(x, y, z), `snow at ${x}, ${z}`).toBe("snow");
      } else if (s < 0.3) {
        bare++;
        expect(surface(x, y, z), `bare at ${x}, ${z}`).not.toBe("snow");
      }
    }
  expect(snowy).toBeGreaterThan(500);
  expect(bare).toBeGreaterThan(500);
}, 300_000);
