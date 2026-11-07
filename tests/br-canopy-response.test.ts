import { expect, test } from "vitest";
import { DROP, newDropBody, planeRoute, stepDrop, type DropInput } from "../src/lib/fps/br/drop";
import type { StaticWorld } from "../src/lib/fps/br/static-world";
import type { WorldMeta } from "../src/lib/fps/br/world";

const world = {
  supportAt: () => 10,
  blocked: () => false,
  hf: { heightAt: () => 10 },
} as unknown as StaticWorld;
const meta = { waterBodies: [] } as unknown as WorldMeta;
const route = planeRoute(7);
const body = () => ({
  ...newDropBody(),
  phase: "parachute" as const,
  y: 800,
  vz: -DROP.parachute.neutralForward,
});

test("forward glide reaches 64.8 km/h without delaying steering or adding diagonal speed", () => {
  const b = body();
  for (let i = 0; i < 15; i++)
    stepDrop(world, meta, route, b, { forward: 1, strafe: 0, yaw: 0 }, 60000, 34);
  expect(Math.hypot(b.vx, b.vz)).toBeGreaterThan(16);
  for (let i = 0; i < 150; i++)
    stepDrop(world, meta, route, b, { forward: 1e6, strafe: 1e6, yaw: 0 }, 60000, 34);
  expect(Math.hypot(b.vx, b.vz) * 3.6).toBeCloseTo(64.8, 4);
  expect(-b.velocityY).toBeCloseTo(DROP.parachute.glideDown + DROP.parachute.turnDown, 2);
});

test("active brakes remove cruise momentum within half a second and less than five metres", () => {
  const b = { ...body(), vz: -18 };
  for (let i = 0; i < 15; i++)
    stepDrop(world, meta, route, b, { forward: -1, strafe: 0, yaw: 0 }, 60000, 34);
  expect(Math.hypot(b.vx, b.vz)).toBeLessThan(5);
  expect(Math.hypot(b.x, b.z)).toBeLessThan(5);
  expect(b.phase).toBe("parachute");
});

test("snapshot prediction replay stays identical during glide, turns, braking and dive recovery", () => {
  const authoritative = body();
  let predicted = { ...authoritative };
  const pending: DropInput[] = [];
  for (let i = 0; i < 600; i++) {
    const input: DropInput = {
      forward: i < 180 ? 1 : i < 240 ? -1 : 1,
      strafe: i < 120 ? 0 : Math.sin(i / 30),
      yaw: 0,
      canopyYaw: Math.sin(i / 70),
      dive: i >= 260 && i < 400,
    };
    stepDrop(world, meta, route, authoritative, input, 60000 + i * 34, 34);
    pending.push(input);
    // Rebuild from the last acknowledged server snapshot, then replay unacknowledged input.
    const replay = { ...predicted };
    for (const p of pending) stepDrop(world, meta, route, replay, p, 60000, 34);
    expect(replay).toEqual(authoritative);
    if (i % 4 === 3) {
      predicted = { ...authoritative };
      pending.length = 0;
    }
    expect(Math.hypot(authoritative.vx, authoritative.vz)).toBeLessThanOrEqual(
      DROP.parachute.diveForward + 0.00001,
    );
  }
});
