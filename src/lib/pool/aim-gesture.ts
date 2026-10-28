import { BALL_R, cosMicro, sinMicro } from "@/lib/pool/physics";

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

/**
 * Screen pixels of backward drag before a release shoots.
 * A short slip while aiming stays an aim. A longer pull is power.
 */
export const PULL_DEAD_PX = 28;
/** Backward drag, in screen pixels, that reaches full power. */
export const PULL_FULL_PX = 180;

/**
 * `cue-stick` starts on the butt of the cue. The stick stays between the
 * pointer and the ball, so dragging around the ball rotates the shot and
 * dragging away from the ball is only power.
 */
export type AimGesture =
  | { kind: "absolute" }
  | { kind: "from-cue"; origin: Point; armed: boolean }
  | { kind: "cue-stick" };

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

export function startAim(point: Point, cue: Point, angleMilli = 0): AimGesture {
  const dx = point.x - cue.x;
  const dy = point.y - cue.y;
  if (dx * dx + dy * dy < CUE_GRAB_R * CUE_GRAB_R) {
    return { kind: "from-cue", origin: point, armed: false };
  }
  if (behindCue(point, cue, angleMilli)) return { kind: "cue-stick" };
  return { kind: "absolute" };
}

/** The pointer is on the butt side of the current shot, where the cue is drawn. */
export function behindCue(point: Point, cue: Point, angleMilli: number): boolean {
  const dx = point.x - cue.x;
  const dy = point.y - cue.y;
  if (dx * dx + dy * dy < CUE_GRAB_R * CUE_GRAB_R) return false;
  const along = (dx * cosMicro(angleMilli) + dy * sinMicro(angleMilli)) / 1_000_000;
  return along < 0;
}

/** Shot direction when the pointer is holding the cue butt. */
export function stickAngle(point: Point, cue: Point): number | null {
  const dx = cue.x - point.x;
  const dy = cue.y - point.y;
  if (dx * dx + dy * dy < 1) return null;
  return angleOf(dx, dy);
}

/** A full drag, after the curve is eased by 15%. Arrow keys stop here too. */
export const MAX_PULL_POWER = 6_800;

/**
 * Straight through 30% of a full pull. Past that the shot is about 20% softer,
 * blended in by 45% so a longer drag never loses power. The whole curve is
 * then 15% softer. A full pull is 6800.
 */
export function powerFromPull(pixels: number): number {
  if (!Number.isFinite(pixels) || pixels <= PULL_DEAD_PX) return 0;
  const span = PULL_FULL_PX - PULL_DEAD_PX;
  const t = Math.min(1, (pixels - PULL_DEAD_PX) / span);
  return Math.max(1, Math.min(MAX_PULL_POWER, Math.round(softenPull(t) * 10_000)));
}

function softenPull(t: number): number {
  const shaped = shapePull(t) * 0.85;
  return shaped;
}

function shapePull(t: number): number {
  if (t <= 0.3) return t;
  const soft = t * 0.8;
  const knee = 0.45;
  if (t >= knee) return soft;
  const u = (t - 0.3) / (knee - 0.3);
  return t * (1 - u) + soft * u;
}

/** The pointer is on the butt side of the cue, outside the ball, so a forward aim stays put. */
function pulledBehind(point: Point, cue: Point, angleMilli: number): boolean {
  return behindCue(point, cue, angleMilli);
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
 * A drag that starts on the cue stick rotates with the pointer.
 * Sliding back onto the cue ball, or pulling a forward aim behind it, keeps the last angle.
 */
export function aimStep(
  gesture: AimGesture,
  point: Point,
  cue: Point,
  angleMilli: number,
  fine: boolean,
): { gesture: AimGesture; angle: number | null } {
  if (gesture.kind === "cue-stick") {
    const next = stickAngle(point, cue);
    if (next == null) return { gesture, angle: null };
    return { gesture, angle: fine ? fineTune(angleMilli, next) : next };
  }
  if (gesture.kind === "from-cue") {
    const dx = point.x - gesture.origin.x;
    const dy = point.y - gesture.origin.y;
    const moved = dx * dx + dy * dy;
    if (!gesture.armed && moved < AIM_DEADZONE * AIM_DEADZONE) {
      return { gesture, angle: null };
    }
    if (gesture.armed && pulledBehind(point, cue, angleMilli)) {
      return { gesture, angle: null };
    }
    if (moved < 1) return { gesture: { ...gesture, armed: true }, angle: null };
    const next = angleOf(dx, dy);
    return {
      gesture: { ...gesture, armed: true },
      angle: fine ? fineTune(angleMilli, next) : next,
    };
  }
  if (pulledBehind(point, cue, angleMilli)) return { gesture, angle: null };
  const dx = point.x - cue.x;
  const dy = point.y - cue.y;
  if (dx * dx + dy * dy < CUE_GRAB_R * CUE_GRAB_R) return { gesture, angle: null };
  const next = angleOf(dx, dy);
  return { gesture, angle: fine ? fineTune(angleMilli, next) : next };
}
