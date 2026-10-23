import { BALL_R } from "@/lib/pool/physics";

export { BALL_R };

export type Point = { x: number; y: number };

/** A press inside the cue ball is a drag aim, not a click through the center. */
export const CUE_GRAB_R = BALL_R;

/**
 * Ball-in-hand grab is a little wider than the ball so a finger lands on it.
 * A press farther out aims instead of moving the cue ball.
 */
export const PLACE_GRAB_R = Math.round(BALL_R * 1.45);

/** Movement required before a press on the cue ball changes the angle. */
export const AIM_DEADZONE = Math.round(BALL_R * 0.28);

export type AimGesture = { kind: "absolute" } | { kind: "from-cue"; origin: Point; armed: boolean };

export function grabsCue(point: Point, cue: Point): boolean {
  const dx = point.x - cue.x;
  const dy = point.y - cue.y;
  return dx * dx + dy * dy <= PLACE_GRAB_R * PLACE_GRAB_R;
}

/** Ball-in-hand moves the cue ball only when the press starts on it. */
export function pointerIntent(placing: boolean, point: Point, cue: Point | null): "place" | "aim" {
  if (!placing || !cue) return "aim";
  return grabsCue(point, cue) ? "place" : "aim";
}

export function startAim(point: Point, cue: Point): AimGesture {
  const dx = point.x - cue.x;
  const dy = point.y - cue.y;
  if (dx * dx + dy * dy < CUE_GRAB_R * CUE_GRAB_R) {
    return { kind: "from-cue", origin: point, armed: false };
  }
  return { kind: "absolute" };
}

export function angleOf(dx: number, dy: number): number {
  if (dx === 0 && dy === 0) return 0;
  let deg = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return Math.round(deg * 1000) % 360_000;
}

/** Shift-aim keeps the same direction and shortens the change. It does not add error. */
export function fineTune(current: number, next: number): number {
  let delta = next - current;
  if (delta > 180_000) delta -= 360_000;
  if (delta < -180_000) delta += 360_000;
  return (current + Math.round(delta * 0.22) + 360_000) % 360_000;
}

/**
 * Absolute aim points from the cue through the pointer.
 * A gesture that began on the cue ball aims along the drag, after a dead zone,
 * so the angle does not jump on the press.
 * Sliding back onto the cue ball keeps the last angle.
 */
export function aimStep(
  gesture: AimGesture,
  point: Point,
  cue: Point,
  angleMilli: number,
  fine: boolean,
): { gesture: AimGesture; angle: number | null } {
  if (gesture.kind === "from-cue") {
    const dx = point.x - gesture.origin.x;
    const dy = point.y - gesture.origin.y;
    const moved = dx * dx + dy * dy;
    if (!gesture.armed && moved < AIM_DEADZONE * AIM_DEADZONE) {
      return { gesture, angle: null };
    }
    if (moved < 1) return { gesture: { ...gesture, armed: true }, angle: null };
    const next = angleOf(dx, dy);
    return {
      gesture: { ...gesture, armed: true },
      angle: fine ? fineTune(angleMilli, next) : next,
    };
  }
  const dx = point.x - cue.x;
  const dy = point.y - cue.y;
  if (dx * dx + dy * dy < CUE_GRAB_R * CUE_GRAB_R) return { gesture, angle: null };
  const next = angleOf(dx, dy);
  return { gesture, angle: fine ? fineTune(angleMilli, next) : next };
}
