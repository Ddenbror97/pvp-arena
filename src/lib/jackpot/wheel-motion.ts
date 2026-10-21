/**
 * Jackpot wheel travel. Quadratic ease-out: speed falls in a straight line
 * and reaches zero only at the stop, so the last seconds still roll.
 * The ratchet uses this same speed. The picture is not bent to fit the sound.
 *
 * The compositor plays `wheelTimingFunction()` on `transform`. It is this
 * curve sampled finely enough that a straight line between samples stays
 * under a degree on a full spin, including the slow stop.
 *
 * Script must not read the running animation. A per-frame `currentTime`
 * read pulls the spin back onto the main thread, and the slow landing is
 * where that hitch shows.
 */
/**
 * How far the blurred ring stays paused after the wheel has stopped.
 * Starting that filter on the landing frame is a paint spike.
 */
export const WHEEL_RING_HOLD_MS = 700;

/**
 * Clock error that is worth a one-time re-anchor. Anything smaller is left
 * alone: seeking it, especially near the stop, is a visible snap.
 */
export const WHEEL_SEEK_MS = 400;
function clamp(progress: number) {
  return Math.min(1, Math.max(0, progress));
}

/** Fraction of the landing rotation completed at `progress` (0 to 1). */
export function wheelEase(progress: number): number {
  const left = 1 - clamp(progress);
  return 1 - left * left;
}

/** Remaining speed of `wheelEase`, 1 at the release and 0 at the stop. */
export function wheelSpeed(progress: number): number {
  return 1 - clamp(progress);
}

/** Samples of `wheelEase`. One segment of a 9-turn wheel stays under 180°. */
export const WHEEL_EASE_STEPS = 48;

export function wheelTimingStops(steps = WHEEL_EASE_STEPS): { t: number; y: number }[] {
  const count = Math.max(2, Math.round(steps));
  const stops = [{ t: 0, y: 0 }];
  for (let i = 1; i < count; i++) {
    const t = i / count;
    stops.push({ t, y: wheelEase(t) });
  }
  stops.push({ t: 1, y: 1 });
  return stops;
}

/** CSS `linear()` easing the compositor can play without a script per frame. */
export function wheelTimingFunction(steps = WHEEL_EASE_STEPS): string {
  return `linear(${wheelTimingStops(steps)
    .map((stop, index, all) => {
      const y = stop.y.toFixed(4);
      if (index === 0 || index === all.length - 1) return y;
      return `${y} ${(stop.t * 100).toFixed(3)}%`;
    })
    .join(",")})`;
}

/** Keyframes used when `linear()` easing is unavailable. Each step is under 180°. */
export function wheelRotateFrames(
  targetDeg: number,
  steps = WHEEL_EASE_STEPS,
): { transform: string; offset: number }[] {
  return wheelTimingStops(steps).map((stop) => ({
    transform: `rotate(${(targetDeg * stop.y).toFixed(3)}deg)`,
    offset: stop.t,
  }));
}

/** Document-timeline time at which the spin's time 0 matches `startAt` on the server clock. */
export function wheelStartTime(timelineNow: number, serverNow: number, startAt: number): number {
  return timelineNow - (serverNow - startAt);
}

/**
 * Server elapsed minus the elapsed implied by an animation anchored at `startTime`.
 * Positive means the picture is behind the server. This does not read the animation.
 */
export function wheelClockDrift(
  timelineNow: number,
  startTime: number,
  serverNow: number,
  startAt: number,
): number {
  return serverNow - startAt - (timelineNow - startTime);
}

/** A hidden tab or a real clock jump. Small drift is not corrected. */
export function wheelShouldSeek(driftMs: number, remainMs: number): boolean {
  if (!(remainMs > 0) || !Number.isFinite(driftMs)) return false;
  return Math.abs(driftMs) >= WHEEL_SEEK_MS;
}
