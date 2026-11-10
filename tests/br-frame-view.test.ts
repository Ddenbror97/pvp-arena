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
import { MOVE_SPEED, TICK_MS } from "@/lib/fps/simulation";

const world = new StaticWorld(
  new Heightfield(2, 2, 10000, new Float32Array(4)),
  [],
  { models: {} },
  null,
);
const meta = { waterBodies: [] } as unknown as WorldMeta;
const route = planeRoute(7);
const none = { x: 0, y: 0, z: 0 };
const grounded = (): DropBody => ({
  ...newDropBody(),
  phase: "ground",
  grounded: true,
  x: 0,
  y: 0,
  z: 0,
});

/**
 * The arena's loop: fixed 30 Hz steps under a display's frames. Returns the camera position
 * each frame, with the frame view or (as before) the stepped body itself.
 */
function run(
  hz: number,
  frames: number,
  inputAt: (ms: number) => DropInput,
  smooth: boolean,
  start = grounded,
) {
  const body = start();
  const view = new BrFrameView();
  const frameMs = 1000 / hz;
  let accumulator = 0,
    now = 0;
  const out: Array<{ x: number; y: number; z: number; at: number }> = [];
  for (let f = 0; f < frames; f++) {
    now += frameMs;
    accumulator += frameMs;
    while (accumulator >= TICK_MS) {
      accumulator -= TICK_MS;
      stepDrop(world, meta, route, body, inputAt(now), 60_000 + now, TICK_MS);
    }
    const p = smooth
      ? view.sample(
          world,
          meta,
          route,
          body,
          inputAt(now),
          60_000 + now,
          accumulator,
          frameMs,
          none,
        )
      : body;
    out.push({ x: p.x, y: p.y, z: p.z, at: now });
  }
  return out;
}
const steps = (path: Array<{ x: number; z: number }>) =>
  path.slice(1).map((p, i) => Math.hypot(p.x - path[i]!.x, p.z - path[i]!.z));
const forward = (): DropInput => ({ forward: 1, strafe: 0, yaw: 0 });

describe("BR frame view (2026-11-09: running felt laggy, unlike 1v1)", () => {
  it("moves the camera every frame at a steady rate instead of in 30 Hz jumps", () => {
    for (const hz of [60, 144, 240]) {
      const perFrame = (MOVE_SPEED * 1000) / hz / 1000;
      // Before: at 144 Hz the camera stood still most frames, then jumped a whole step.
      const before = steps(run(hz, hz * 2, forward, false)).slice(20);
      if (hz > 60) expect(before.filter((d) => d === 0).length).toBeGreaterThan(before.length / 2);
      expect(Math.max(...before)).toBeGreaterThan(perFrame * 1.9);
      // Now: every frame moves by the frame's share of the speed, within 2 %.
      const after = steps(run(hz, hz * 2, forward, true)).slice(20);
      for (const d of after) expect(Math.abs(d - perFrame)).toBeLessThan(perFrame * 0.02);
    }
  });

  it("covers the same ground as the fixed steps: no extra speed, no drift", () => {
    const stepped = run(144, 144 * 3, forward, false).at(-1)!;
    const seen = run(144, 144 * 3, forward, true).at(-1)!;
    // The view leads the last step by the elapsed part of the next one, never more.
    const lead = Math.hypot(seen.x - stepped.x, seen.z - stepped.z);
    expect(lead).toBeLessThanOrEqual((MOVE_SPEED * TICK_MS) / 1000 + 1e-6);
    expect(Math.abs(seen.x - stepped.x)).toBeLessThan(1e-6);
  });

  it("starts on the frame a key goes down and eases out the difference without a pop", () => {
    // Standing, then W pressed 10 ms after a fixed step (23 ms before the next one).
    const press = 500 + 10;
    const input = (ms: number): DropInput => ({ forward: ms >= press ? 1 : 0, strafe: 0, yaw: 0 });
    const path = run(240, 480, input, true);
    const first = path.findIndex((p, i) => i > 0 && p.z !== path[i - 1]!.z);
    // Moving within one frame of the press, not at the next 30 Hz step.
    expect(path[first]!.at - press).toBeLessThan(1000 / 240 + 1e-6);
    // No frame ever moves more than the speed allows plus the bounded easing (2 m/s).
    const perFrame = MOVE_SPEED / 240;
    for (const d of steps(path)) expect(d).toBeLessThanOrEqual(perFrame + 2 / 240 + 1e-6);
    // Stopping: the view settles on the body (no lasting offset).
    const stop = (ms: number): DropInput => ({ forward: ms < 700 ? 1 : 0, strafe: 0, yaw: 0 });
    const seen = run(240, 600, stop, true).at(-1)!;
    const stepped = run(240, 600, stop, false).at(-1)!;
    expect(Math.hypot(seen.x - stepped.x, seen.z - stepped.z)).toBeLessThan(0.01);
  });

  it("follows a server correction as it is smoothed, without trailing it", () => {
    // Standing still; the server moved the body 2 m and the arena decays the offset (90 ms).
    for (const hz of [144, 10]) {
      const view = new BrFrameView();
      const body = grounded();
      const frameMs = 1000 / hz;
      const idle: DropInput = { forward: 0, strafe: 0, yaw: 0 };
      const correction = { x: 0, y: 0, z: 0 };
      view.sample(world, meta, route, body, idle, 60_000, 0, frameMs, correction);
      body.x = 2; // reconciled to the server…
      correction.x = -2; // …with the offset that keeps the picture where it was
      let previous = 0;
      const frames = Math.ceil(600 / frameMs);
      for (let f = 0; f < frames; f++) {
        correction.x *= Math.exp(-Math.min(100, frameMs) / 90);
        const p = view.sample(
          world,
          meta,
          route,
          body,
          idle,
          60_000,
          0,
          Math.min(100, frameMs),
          correction,
        );
        // Monotonic toward the body: never a pop backwards, never an overshoot.
        expect(p.x).toBeGreaterThanOrEqual(previous - 1e-9);
        expect(p.x).toBeLessThanOrEqual(2 + 1e-9);
        previous = p.x;
      }
      // There within 0.6 s (the arena's own smoothing takes about 0.3 s).
      expect(2 - previous, `${hz} Hz`).toBeLessThan(0.1);
    }
  });

  it("is continuous in the air too, and snaps on a teleport instead of gliding", () => {
    const chute = (): DropBody => ({
      ...newDropBody(),
      phase: "parachute",
      x: 0,
      y: 400,
      z: 0,
      velocityY: -6,
      vx: 0,
      vz: -12,
    });
    const before = run(144, 288, forward, false, chute);
    const after = run(144, 288, forward, true, chute);
    const fall = (p: Array<{ y: number }>) => p.slice(1).map((q, i) => p[i]!.y - q.y);
    // Before: most frames did not descend at all. Now every frame does, by a similar amount.
    expect(fall(before).filter((d) => d === 0).length).toBeGreaterThan(144);
    const drops = fall(after).slice(30);
    expect(Math.min(...drops)).toBeGreaterThan(0);
    expect(Math.max(...drops) / Math.min(...drops)).toBeLessThan(1.5);
    // A correction too large to be an error (a teleport) is taken at once.
    const view = new BrFrameView();
    const body = grounded();
    view.sample(world, meta, route, body, forward(), 60_000, 0, 7, none);
    body.x = 500;
    const p = view.sample(world, meta, route, body, forward(), 60_000, 0, 7, none);
    expect(p.x).toBeCloseTo(500, 3);
    // The previewed body is a copy: the predicted body is never touched.
    expect(body.z).toBe(0);
  });
});
