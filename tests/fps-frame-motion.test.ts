import { describe, it, expect } from "vitest";
import {
  FrameMotion,
  JumpPresentation,
  CameraCorrection,
  CameraStance,
  CameraVertical,
  RenderBudget,
} from "../src/lib/fps/presentation";
import {
  createMatch,
  JUMP_SPEED,
  isMovementBlocked,
  predictMovement,
} from "../src/lib/fps/simulation";
import type { Input } from "../src/lib/fps/protocol";
const input: Input = {
  v: 1,
  type: "input",
  seq: 1,
  forward: 1,
  strafe: 0,
  yaw: 0,
  pitch: 0,
  fire: false,
  reload: false,
  weapon: "rifle",
  jump: false,
  sprint: true,
};
describe("continuous camera movement", () => {
  it.each([30, 60, 144])("keeps takeoff and landing continuous at %i Hz", (hz) => {
    const p = createMatch({ A: "a", B: "b" }, 5, 1).players.A;
    Object.assign(p, { x: 9, z: 12, y: 0, velocityY: 0 });
    const visual = new JumpPresentation();
    let accumulator = 0,
      previous = 0,
      jumped = false,
      peak = 0;
    const dt = 1000 / hz;
    for (let frame = 0; frame < hz * 2; frame++) {
      accumulator += dt;
      while (accumulator >= 34) {
        accumulator -= 34;
        const before = p.y;
        predictMovement(p, { ...input, forward: 0, jump: !jumped }, 1000 / 30);
        jumped = true;
        visual.advance(before, p.y);
      }
      const y = visual.sample(p.y, accumulator / 34);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(Math.abs(y - previous)).toBeLessThanOrEqual((JUMP_SPEED * dt) / 1000);
      peak = Math.max(peak, y);
      previous = y;
    }
    expect(peak).toBeGreaterThan(1.45);
    expect(peak).toBeLessThan(1.7);
    expect(previous).toBe(0);
  });

  it("preserves the jump interpolation phase through reconciliation and resets respawns", () => {
    const visual = new JumpPresentation();
    visual.advance(0, 0.15);
    expect(visual.sample(0.15, 0.5)).toBeCloseTo(0.075);
    expect(visual.sample(0.17, 0.5) - 0.02).toBeCloseTo(0.075);
    visual.reset();
    expect(visual.sample(3, 0.5)).toBe(3);
  });
  it("does not turn a one-tick direction change into a 15 cm camera teleport", () => {
    const p = createMatch({ A: "a", B: "b" }, 5, 1).players.A;
    Object.assign(p, { x: 9, z: 12 });
    const motion = new FrameMotion(),
      correction = new CameraCorrection();
    motion.sample(p, null, 0, correction);
    p.z -= 0.2;
    let previous = 12;
    for (let i = 0; i < 40; i++) {
      const next = motion.sample(p, null, 7, correction).z;
      expect(Math.abs(next - previous)).toBeLessThanOrEqual(0.017501);
      previous = next;
    }
    expect(previous).toBeCloseTo(p.z, 2);
  });
  it("clears a crate corner without starving the free correction axis or snapping", () => {
    const p = createMatch({ A: "a", B: "b" }, 5, 1).players.A;
    Object.assign(p, { x: 5.65, z: 7.9 });
    const motion = new FrameMotion(),
      correction = new CameraCorrection();
    let previous = { ...motion.sample(p, null, 0, correction) };
    Object.assign(p, { x: 5.85, z: 7.64 });
    const right = { ...input, forward: 0, strafe: 1, sprint: false };
    for (let i = 0; i < 140; i++) {
      predictMovement(p, right, (7 * (1000 / 30)) / 34);
      const next = motion.sample(p, right, 7, correction);
      expect(Math.hypot(next.x - previous.x, next.z - previous.z)).toBeLessThan(0.055);
      expect(isMovementBlocked(next.x, next.y, next.z, !!next.crouched)).toBe(false);
      previous = { ...next };
    }
    expect(Math.hypot(previous.x - p.x, previous.z - p.z)).toBeLessThan(0.12);
  });
  it("follows ordinary jump speed immediately but bounds a discontinuous landing correction", () => {
    const camera = new CameraVertical();
    expect(camera.sample(1.6, 0)).toBe(1.6);
    expect(camera.sample(1.65, 10)).toBe(1.65);
    expect(camera.sample(0.95, 7)).toBeCloseTo(1.566);
    camera.reset();
    expect(camera.sample(4, 7)).toBe(4);
  });
  it("transitions camera stance across frames, resets respawns, and never edits the player", () => {
    const camera = new CameraStance(),
      p = { crouched: false };
    expect(camera.sample(p, 0)).toBe(1.6);
    p.crouched = true;
    expect(camera.sample(p, 7)).toBeCloseTo(1.53);
    for (let i = 0; i < 10; i++) camera.sample(p, 7);
    expect(camera.sample(p, 7)).toBe(0.95);
    expect(p).toEqual({ crouched: true });
    camera.reset();
    p.crouched = false;
    expect(camera.sample(p, 7)).toBe(1.6);
  });
  it("responds between network ticks without mutating authority or smoothing mouse yaw", () => {
    const p = createMatch({ A: "a", B: "b" }, 5, 1).players.A;
    Object.assign(p, { x: 9, z: 12 });
    const copy = { ...p },
      motion = new FrameMotion(),
      c = new CameraCorrection();
    motion.sample(p, null, 0, c);
    const a = motion.sample(p, input, 7, c).z;
    const b = motion.sample(p, { ...input, yaw: 0.2 }, 7, c);
    expect(a).toBeLessThan(p.z);
    expect(b.z).toBeLessThan(a);
    expect(b.x).toBeLessThan(p.x);
    expect(p).toEqual(copy);
  });
  it("never reconciles through solids and snaps respawns immediately", () => {
    const p = createMatch({ A: "a", B: "b" }, 5, 1).players.A;
    Object.assign(p, { x: 9, z: 12 });
    const motion = new FrameMotion(),
      c = new CameraCorrection();
    motion.sample(p, null, 0, c);
    Object.assign(p, { x: 9, z: -12 });
    expect(motion.sample(p, null, 16, c).z).toBe(-12);
    for (let i = 0; i < 300; i++) {
      predictMovement(p, { ...input, strafe: -1 }, 1000 / 60);
      const v = motion.sample(p, { ...input, strafe: -1 }, 1000 / 60, c);
      expect(isMovementBlocked(v.x, v.y, v.z, !!v.crouched)).toBe(false);
    }
    motion.reset();
    Object.assign(p, { x: -9, z: 12 });
    expect(motion.sample(p, null, 16, c).x).toBe(-9);
  });
  it("adapts when the 95th percentile misses a frame, even if most frames are fast", () => {
    const budget = new RenderBudget();
    for (let i = 0; i < 180; i++) budget.update(i % 10 === 0 ? 33.3 : 16.7);
    expect(budget.scale).toBeLessThan(1);
    expect(budget.scale).toBeGreaterThanOrEqual(0.6);
  });
});
