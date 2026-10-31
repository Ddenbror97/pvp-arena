import { describe, it, expect } from "vitest";
import { FrameMotion, CameraCorrection, RenderBudget } from "../src/lib/fps/presentation";
import { createMatch, isMovementBlocked, predictMovement } from "../src/lib/fps/simulation";
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
