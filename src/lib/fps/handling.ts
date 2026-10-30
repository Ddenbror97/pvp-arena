import type { Weapon } from "./protocol";
/** The first rAF timestamp can precede expensive scene initialization. Never extrapolate backwards. */
export function frameDelta(now: number, previous: number) {
  return Math.max(0, Math.min(100, now - previous));
}

export const HANDLING = {
  sensitivity: 0.002,
  recovery: 9,
  kickDecay: 24,
  maxPitch: 0.14,
  maxYaw: 0.035,
} as const;
const SPRAY = [0, 0.2, -0.3, 0.5, 0.7, -0.45, -0.7, 0.35] as const;
export function shotRecoil(weapon: Weapon, shot: number) {
  const strength = weapon === "rifle" ? 1 : 0.6;
  return {
    pitch: (0.006 + Math.min(shot, 12) * 0.0004) * strength,
    yaw: SPRAY[shot % SPRAY.length]! * 0.006 * strength,
  };
}
export function spreadScale(shots: number, moving: boolean, airborne: boolean) {
  return (1 + Math.min(Math.max(0, shots - 1), 12) * 0.07) * (airborne ? 2.8 : moving ? 1.65 : 1);
}
export function decay(value: number, rate: number, dtMs: number) {
  return value * Math.exp((-rate * Math.max(0, dtMs)) / 1000);
}
/** Local recoil decay must not drift differently at 30/60/144 FPS. */
export function recoverRecoil(value: number, dtMs: number) {
  return decay(value, HANDLING.recovery, dtMs);
}
