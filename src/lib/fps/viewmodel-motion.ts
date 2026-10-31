/**
 * First-person weapon motion layered on top of the rest pose: idle breathing, look sway,
 * walk/sprint cycles, recoil roll and landing. Pure (no three.js) and frame-rate independent so
 * it is identical at 30 and 240 Hz and unit-testable.
 *
 * Design targets (CS/COD feel): the rifle is anchored, never floaty — sway is a stiff, critically
 * damped spring that lags the view by a few frames and settles without wobble; bob is a small
 * figure-eight tied to stride, not a screen shake; sprint tucks the rifle low-left (the sim
 * already blocks firing while sprinting) and blends out fast enough to shoot on release.
 */

export type MotionInput = {
  /** Frame time in milliseconds. */
  dt: number;
  /** Mouse movement this frame, in pixels (positive x = right, positive y = down). */
  lookX: number;
  lookY: number;
  moving: boolean;
  sprinting: boolean;
  airborne: boolean;
  reloading: boolean;
  /** Recoil kick 0..1 (1 on the frame a shot fires, decaying). */
  kick: number;
  /** Shot counter; alternates the mechanical roll so automatic fire chatters, not drifts. */
  shot: number;
};
export type MotionPose = {
  x: number;
  y: number;
  z: number;
  pitch: number;
  yaw: number;
  roll: number;
};

export const MOTION = {
  /** Look sway per pixel of mouse movement per 60 Hz frame, and its cap (root units / radians). */
  swayPerPixel: 0.00012,
  swayLimit: 0.03,
  /** Sway spring natural frequency (rad/s); critically damped. */
  swayFrequency: 22,
  /** Walk / sprint stride frequency (Hz) and bob amplitude. */
  walkHz: 1.75,
  sprintHz: 2.35,
  bob: 0.0055,
  /** Blend rates (1/s) into and out of moving / sprinting. */
  moveRate: 9,
  sprintIn: 9,
  sprintOut: 16,
  breath: { y: 0.0011, pitch: 0.0035, roll: 0.0025, hz: 0.27 },
  /** Sprint tuck: down, in and canted with the muzzle swung left. */
  sprint: { x: -0.035, y: -0.04, z: 0.025, pitch: -0.12, yaw: 0.32, roll: 0.28 },
  recoil: { z: 0.025, pitch: 0.025, roll: 0.012 },
} as const;

const damp = (value: number, target: number, rate: number, seconds: number) =>
  target + (value - target) * Math.exp(-rate * seconds);

export function createViewmodelMotion() {
  let time = 0,
    phase = 0,
    moveBlend = 0,
    sprintBlend = 0,
    swayX = 0,
    swayY = 0,
    swayVX = 0,
    swayVY = 0;
  const pose: MotionPose = { x: 0, y: 0, z: 0, pitch: 0, yaw: 0, roll: 0 };

  /** Critically damped spring step toward `target` (semi-implicit, stable for any dt here). */
  function spring(x: number, v: number, target: number, seconds: number): [number, number] {
    const w = MOTION.swayFrequency;
    const acceleration = w * w * (target - x) - 2 * w * v;
    const nv = v + acceleration * seconds;
    return [x + nv * seconds, nv];
  }

  return {
    pose,
    update(input: MotionInput): MotionPose {
      // Large hitches (tab switch) must not launch the springs.
      const seconds = Math.min(0.05, Math.max(0, input.dt / 1000));
      time += seconds;
      const quiet = input.reloading ? 0.4 : 1;
      // Stride phase integrates the (exponentially blending) move amount exactly over the frame,
      // so the footfalls land at the same time at any frame rate.
      const moveTarget = input.moving ? 1 : 0,
        moveStart = moveBlend;
      moveBlend = damp(moveBlend, moveTarget, MOTION.moveRate, seconds);
      const moveIntegral =
        moveTarget * seconds +
        ((moveStart - moveTarget) * (1 - Math.exp(-MOTION.moveRate * seconds))) / MOTION.moveRate;
      const sprint = input.sprinting && input.moving && !input.reloading ? 1 : 0,
        sprintStart = sprintBlend;
      sprintBlend = damp(
        sprintBlend,
        sprint,
        sprint > sprintBlend ? MOTION.sprintIn : MOTION.sprintOut,
        seconds,
      );
      const stride =
        MOTION.walkHz + (MOTION.sprintHz - MOTION.walkHz) * ((sprintStart + sprintBlend) / 2);
      phase += Math.PI * 2 * stride * moveIntegral;

      // Look sway: the rifle lags the view (moves opposite the turn) and springs back. Input is
      // converted to a rate (pixels per 60 Hz frame) and held for the whole frame, so the same
      // mouse motion produces the same sway at any frame rate.
      const clamp = (v: number) => Math.max(-MOTION.swayLimit, Math.min(MOTION.swayLimit, v));
      const perFrame = seconds > 0 ? 1 / (60 * seconds) : 0;
      const targetX = clamp(-input.lookX * perFrame * MOTION.swayPerPixel * quiet),
        targetY = clamp(input.lookY * perFrame * MOTION.swayPerPixel * quiet);
      const steps = Math.max(1, Math.ceil(seconds / 0.004));
      for (let i = 0; i < steps; i++) {
        [swayX, swayVX] = spring(swayX, swayVX, targetX, seconds / steps);
        [swayY, swayVY] = spring(swayY, swayVY, targetY, seconds / steps);
      }

      const bob = MOTION.bob * moveBlend * quiet * (1 + sprintBlend * 0.8);
      const breathe = (1 - moveBlend * 0.7) * quiet,
        b = time * Math.PI * 2 * MOTION.breath.hz;
      const shotSide = input.shot % 2 ? 1 : -1;
      const s = MOTION.sprint,
        r = MOTION.recoil;
      pose.x = swayX + Math.sin(phase) * bob + s.x * sprintBlend;
      // Figure-eight: the low point of the bob lands on each footfall.
      pose.y =
        -swayY * 0.6 -
        Math.abs(Math.sin(phase)) * bob * 0.9 +
        bob * 0.45 +
        Math.sin(b) * MOTION.breath.y * breathe +
        s.y * sprintBlend +
        (input.airborne ? -0.008 : 0);
      pose.z = input.kick * r.z + s.z * sprintBlend;
      pose.pitch =
        swayY * 0.9 +
        Math.sin(b + 0.6) * MOTION.breath.pitch * breathe +
        input.kick * r.pitch +
        s.pitch * sprintBlend;
      pose.yaw = -swayX * 1.4 + s.yaw * sprintBlend;
      pose.roll =
        swayX * 1.2 +
        Math.sin(phase) * bob * 2.2 +
        Math.sin(b * 0.7) * MOTION.breath.roll * breathe +
        input.kick * r.roll * shotSide +
        s.roll * sprintBlend;
      return pose;
    },
    /** Sprint blend 0..1 (for tests / HUD). */
    get sprint() {
      return sprintBlend;
    },
    reset() {
      phase = moveBlend = sprintBlend = swayX = swayY = swayVX = swayVY = 0;
    },
  };
}
