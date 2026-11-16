import { describe, expect, it } from "vitest";
import {
  newDropBody,
  planeRoute,
  stepDrop,
  type DropBody,
  type DropInput,
} from "@/lib/fps/br/drop";
import { BrFrameView } from "@/lib/fps/br/frame-view";
import { Heightfield } from "@/lib/fps/br/heightfield";
import { StaticWorld } from "@/lib/fps/br/static-world";
import type { WorldMeta } from "@/lib/fps/br/world";
import { TICK_MS } from "@/lib/fps/simulation";

const meta = { waterBodies: [] } as unknown as WorldMeta;
const route = planeRoute(7);
const none = { x: 0, y: 0, z: 0 };
const hf = new Heightfield(2, 2, 10000, new Float32Array(4));
// An inside corner: a wall along x at z = 1..1.3 and one along z at x = 1..1.3.
const corner = new StaticWorld(hf, [], { voxel: 0.2, models: {} }, null, [
  [-5, 0, 1, 1.3, 3, 1.3],
  [1, 0, -5, 1.3, 3, 1.3],
]);
// A doorway 0.9 m wide in a 0.3 m wall along x at z = 1..1.3 (jambs at x = ±0.45).
const door = new StaticWorld(hf, [], { voxel: 0.2, models: {} }, null, [
  [-6, 0, 1, -0.45, 3, 1.3],
  [0.45, 0, 1, 6, 3, 1.3],
  [-6, 2.1, 1, 6, 3, 1.3],
]);

function run(
  world: StaticWorld,
  name: string,
  start: [number, number],
  inputs: (ms: number) => DropInput,
  hz = 144,
  seconds = 4,
) {
  const body: DropBody = {
    ...newDropBody(),
    phase: "ground",
    grounded: true,
    x: start[0],
    y: 0,
    z: start[1],
  };
  const view = new BrFrameView();
  const frameMs = 1000 / hz;
  let acc = 0,
    now = 0;
  const xs: number[][] = [];
  for (let f = 0; f < hz * seconds; f++) {
    now += frameMs;
    acc += frameMs;
    while (acc >= TICK_MS) {
      acc -= TICK_MS;
      stepDrop(world, meta, route, body, inputs(now), 60_000 + now, TICK_MS);
    }
    const p = view.sample(world, meta, route, body, inputs(now), 60_000 + now, acc, frameMs, none);
    xs.push([p.x, p.z, body.x, body.z]);
  }
  // In the last 2 s: how far the view moved frame to frame, and its back-and-forth reversals.
  const tail = xs.slice(-hz * 2);
  let path = 0,
    maxStep = 0,
    flips = 0,
    bodyPath = 0;
  for (let i = 1; i < tail.length; i++) {
    const [x, z, bx, bz] = tail[i]!,
      [px, pz, pbx, pbz] = tail[i - 1]!;
    const d = Math.hypot(x! - px!, z! - pz!);
    path += d;
    maxStep = Math.max(maxStep, d);
    bodyPath += Math.hypot(bx! - pbx!, bz! - pbz!);
    if (i > 1) {
      const [ppx, ppz] = tail[i - 2]!;
      if ((x! - px!) * (px! - ppx!) + (z! - pz!) * (pz! - ppz!) < -1e-8) flips++;
    }
  }
  return { name, path, maxStep, flips, bodyPath };
}
const push =
  (yaw: number, forward = 1, strafe = 0) =>
  () =>
    ({ forward, strafe, yaw, jump: false, crouch: false, sprint: false }) as unknown as DropInput;
const idle = push(0, 0, 0);

/**
 * Held against walls the view holds still (owner, 2026-11-16: "lag happens when character stands
 * beside the door … between the door walls", "standing at some corners also"). Pressed into a
 * corner a whole step leaves the body where it is, but the part of a step drawn between steps
 * went up to 2 mm into the corner: the view crept in and snapped back 30 times a second, about
 * 45 reversals a second at 144 Hz.
 */
describe("BR frame view held against walls", () => {
  const corner45 = Math.PI + Math.PI / 4;
  it.each([
    ["in a corner, pushing into it", corner, [0.6, 0.6], push(corner45)],
    ["in a corner, pushing into one wall", corner, [0.6, 0.6], push(Math.PI)],
    ["sliding along a wall into a corner", corner, [-2, 0.6], push(-Math.PI / 2)],
    ["in a doorway, pushing into a jamb", door, [0.1, 1.15], push(-Math.PI / 2)],
    ["standing in a doorway", door, [0, 1.15], idle],
  ] as const)("%s: the view does not move", (_, world, start, input) => {
    for (const hz of [60, 144, 240]) {
      const r = run(world, String(hz), [start[0], start[1]], input, hz);
      expect(r.bodyPath).toBe(0);
      expect(r.path).toBeLessThan(1e-4);
      expect(r.flips).toBe(0);
    }
  });
  it("walking through a doorway stays smooth", () => {
    for (const x of [0.05, 0.3]) {
      const r = run(door, "walk", [x, -1], push(Math.PI));
      expect(r.flips).toBe(0);
      expect(r.path).toBeGreaterThan(9.5);
      expect(r.maxStep).toBeLessThan(0.04);
    }
  });
});
