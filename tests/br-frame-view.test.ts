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

describe("the frame view on a staircase", () => {
  // A flight like Blackwater Prison's: 5 cm risers, 46 % up along -z, 3 m wide, with a landing.
  const RISE = 0.05,
    RUN = 0.108,
    STEPS = 97;
  const boxes: number[][] = [];
  for (let i = 0; i < STEPS; i++)
    boxes.push([-1.5, 0, -(i + 1) * RUN, 1.5, (i + 1) * RISE, -i * RUN]);
  boxes.push([-1.5, 0, -STEPS * RUN - 4, 1.5, STEPS * RISE, -STEPS * RUN]);
  const stairs = new StaticWorld(
    new Heightfield(2, 2, 10000, new Float32Array(4)),
    [{ model: "flight", x: 0, y: 0, z: 0, turn: 0, poi: "test" }],
    { models: { flight: boxes } },
    null,
  );
  const climb = (down: boolean, hz: number) => {
    const top = STEPS * RISE;
    const body: DropBody = {
      ...newDropBody(),
      phase: "ground",
      grounded: true,
      x: 0,
      y: down ? top : 0,
      z: down ? -STEPS * RUN - 1.5 : 1.5,
    };
    // Forward is -z at yaw 0: up the flight; half a turn walks back down it.
    const input: DropInput = { forward: 1, strafe: 0, yaw: down ? Math.PI : 0, sprint: true };
    const view = new BrFrameView();
    const frameMs = 1000 / hz;
    let acc = 0,
      back = 0,
      apart = 0,
      highest = body.y,
      last: number | null = null;
    // (Until the far end of the flight: 12 m at a sprint.)
    for (let f = 0; f < hz * 1.8; f++) {
      acc += frameMs;
      while (acc >= TICK_MS) {
        acc -= TICK_MS;
        stepDrop(stairs, meta, route, body, input, 60_000, TICK_MS);
      }
      const p = view.sample(stairs, meta, route, body, input, 60_000, acc, frameMs, none);
      const along = down ? p.z : -p.z;
      if (last !== null && along < last - 0.002) back++;
      last = along;
      apart = Math.max(apart, Math.hypot(p.x - body.x, p.z - body.z));
      highest = Math.max(highest, body.y);
    }
    return { back, apart, y: body.y, highest };
  };

  it("follows the body up and down the flight without stalling or stepping back", () => {
    for (const hz of [60, 144]) {
      const up = climb(false, hz);
      expect(up.highest, `up ${hz}`).toBeGreaterThan(STEPS * RISE - 0.01);
      expect(up.back, `up ${hz}`).toBe(0);
      expect(up.apart, `up ${hz}`).toBeLessThan(0.6);
      // Going down, the view's own body used to start inside the flight, stand still and jump:
      // half the frames moved backwards and the camera trailed by up to 2.5 m.
      const down = climb(true, hz);
      expect(down.y, `down ${hz}`).toBeLessThan(0.06);
      expect(down.back, `down ${hz}`).toBe(0);
      expect(down.apart, `down ${hz}`).toBeLessThan(0.6);
    }
  });
});

describe("the eye on a flight of tall steps (owner, 2026-11-11: stairs feel laggy)", () => {
  // The superstore's mezzanine flights: 0.29 m risers on 0.9 m treads.
  const RISE = 0.29,
    RUN = 0.9,
    STEPS = 16;
  const boxes: number[][] = [];
  for (let i = 0; i < STEPS; i++) boxes.push([-1, 0, -(i + 1) * RUN, 1, (i + 1) * RISE, -i * RUN]);
  boxes.push([-1, 0, -STEPS * RUN - 6, 1, STEPS * RISE, -STEPS * RUN]);
  const flight = new StaticWorld(
    new Heightfield(2, 2, 10000, new Float32Array(4)),
    [{ model: "flight", x: 0, y: 0, z: 0, turn: 0, poi: "test" }],
    { models: { flight: boxes } },
    null,
  );
  const walk = (w: StaticWorld, hz: number, seconds: number, start: number) => {
    const body: DropBody = {
      ...newDropBody(),
      phase: "ground",
      grounded: true,
      x: 0,
      y: start,
      z: 1,
    };
    const input: DropInput = { forward: 1, strafe: 0, yaw: 0 };
    const view = new BrFrameView();
    const frameMs = 1000 / hz;
    let acc = 0;
    const eye: number[] = [],
      feet: number[] = [];
    for (let f = 0; f < hz * seconds; f++) {
      acc += frameMs;
      while (acc >= TICK_MS) {
        acc -= TICK_MS;
        stepDrop(w, meta, route, body, input, 60_000, TICK_MS);
      }
      eye.push(view.sample(w, meta, route, body, input, 60_000, acc, frameMs, none).y);
      feet.push(body.y);
    }
    return { eye, feet };
  };
  const jumps = (ys: number[]) => ys.slice(1).map((y, i) => Math.abs(y - ys[i]!));

  it("glides up the flight instead of hopping a riser at a time, then settles on the deck", () => {
    for (const hz of [60, 144]) {
      const { eye, feet } = walk(flight, hz, 4, 0);
      // Before: the camera rose a whole riser (0.29 m) in one frame, then stood still.
      expect(Math.max(...jumps(feet)), `${hz} Hz feet`).toBeGreaterThan(0.25);
      expect(Math.max(...jumps(eye)), `${hz} Hz eye`).toBeLessThan(0.12);
      // Never far below the body, and on the deck at the end.
      for (let i = 0; i < eye.length; i++) expect(feet[i]! - eye[i]!).toBeLessThan(0.46);
      expect(feet.at(-1)!).toBeCloseTo(STEPS * RISE, 3);
      expect(Math.abs(eye.at(-1)! - feet.at(-1)!)).toBeLessThan(0.005);
    }
  });

  it("follows a hill exactly (only steps are eased)", () => {
    // 1 m up per 10 m along -z.
    const hill = new StaticWorld(
      new Heightfield(2, 2, 10000, new Float32Array([1000, 1000, 0, 0])),
      [],
      { models: {} },
      null,
    );
    const { eye, feet } = walk(hill, 144, 2, hill.supportAt(0, 1, 0.35, 1e9));
    for (let i = 1; i < eye.length; i++) expect(Math.abs(eye[i]! - feet[i]!)).toBeLessThan(0.05);
  });
});
