import { describe, expect, it } from "vitest";
import { MOTION, createViewmodelMotion, type MotionInput } from "@/lib/fps/viewmodel-motion";

const idle: Omit<MotionInput, "dt"> = {
  lookX: 0,
  lookY: 0,
  moving: false,
  sprinting: false,
  airborne: false,
  reloading: false,
  kick: 0,
  shot: 0,
};
/** Run `seconds` at `hz`; `flick` pixels of mouse X are spread evenly over the first 1/30 s. */
function run(hz: number, seconds: number, input: Partial<MotionInput> = {}, flick = 0) {
  const motion = createViewmodelMotion(),
    frames = Math.round(hz * seconds),
    flickFrames = Math.round(hz / 30);
  let pose = motion.pose;
  for (let i = 0; i < frames; i++)
    pose = motion.update({
      ...idle,
      ...input,
      lookX: i < flickFrames ? flick / flickFrames : 0,
      dt: 1000 / hz,
    });
  return { pose: { ...pose }, motion };
}

describe("viewmodel motion", () => {
  it("is anchored at rest: only sub-millimetre breathing", () => {
    const { pose } = run(144, 3);
    expect(Math.abs(pose.x)).toBeLessThan(1e-6);
    expect(Math.abs(pose.y)).toBeLessThanOrEqual(MOTION.breath.y + 1e-9);
    expect(Math.abs(pose.pitch)).toBeLessThanOrEqual(MOTION.breath.pitch + 1e-9);
    expect(pose.z).toBe(0);
  });

  it("is frame-rate independent", () => {
    for (const input of [{ moving: true }, { moving: true, sprinting: true }]) {
      const a = run(30, 1.2, input, 40).pose,
        b = run(240, 1.2, input, 40).pose;
      for (const key of ["x", "y", "pitch", "yaw", "roll"] as const)
        expect(Math.abs(a[key] - b[key]), key).toBeLessThan(0.0025);
    }
  });

  it("lags a flick, stays within its limit and settles without wobble", () => {
    const motion = createViewmodelMotion();
    let peak = 0,
      overshoot = 0;
    for (let i = 0; i < 144; i++) {
      const pose = motion.update({ ...idle, dt: 1000 / 144, lookX: i < 5 ? 80 : 0 });
      peak = Math.min(peak, pose.x);
      overshoot = Math.max(overshoot, pose.x);
    }
    expect(peak).toBeLessThan(0);
    expect(peak).toBeGreaterThanOrEqual(-MOTION.swayLimit);
    // Critically damped: no swing past rest.
    expect(overshoot).toBeLessThan(1e-4);
    expect(Math.abs(motion.pose.x)).toBeLessThan(1e-4);
  });

  it("tucks for sprint quickly and comes back faster so the player can shoot", () => {
    const { motion } = run(144, 0.35, { moving: true, sprinting: true });
    expect(motion.sprint).toBeGreaterThan(0.9);
    for (let i = 0; i < 29; i++) motion.update({ ...idle, dt: 1000 / 144, moving: true });
    expect(motion.sprint).toBeLessThan(0.1);
  });

  it("never sprint-tucks or bobs hard during a reload", () => {
    const reloading = run(144, 1, { moving: true, sprinting: true, reloading: true });
    expect(reloading.motion.sprint).toBe(0);
    let maxBob = 0;
    for (let i = 0; i < 144; i++)
      maxBob = Math.max(
        maxBob,
        Math.abs(
          reloading.motion.update({ ...idle, dt: 1000 / 144, moving: true, reloading: true }).x,
        ),
      );
    expect(maxBob).toBeLessThan(MOTION.bob * 0.5);
  });

  it("alternates the recoil roll shot to shot", () => {
    const motion = createViewmodelMotion();
    const a = motion.update({ ...idle, dt: 7, kick: 1, shot: 1 }).roll;
    const b = motion.update({ ...idle, dt: 0, kick: 1, shot: 2 }).roll;
    expect(Math.sign(a)).toBe(-Math.sign(b));
  });
});
