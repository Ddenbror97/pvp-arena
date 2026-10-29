/**
 * A late paint must not skip the shot. Jumping to the latest frame
 * drops the ball the cue was aimed at straight into a pocket.
 * Two recorded frames is one paint at 30fps. A longer jump hides a pocket.
 */
export const REPLAY_CATCHUP = 2;

/** One recorded frame per 60fps paint, so a fast ball is not drawn on the far side of a hole. */
export const REPLAY_FRAME_MS = 16;

/**
 * The pocket flag waits until the blend has carried the ball to the hole.
 * Flipping it early hides the ball while it is still on the cloth.
 */
export function replayPocketed(fromPocketed: boolean, toPocketed: boolean, t: number): boolean {
  if (fromPocketed) return true;
  if (!toPocketed) return false;
  const k = Number.isFinite(t) ? Math.max(0, Math.min(1, t)) : 0;
  return k >= 0.92;
}

export function nextReplayFrame(current: number, target: number, last: number): number {
  const end = Number.isFinite(last) ? Math.max(0, Math.floor(last)) : 0;
  const from = Number.isFinite(current) ? Math.max(0, Math.min(end, Math.floor(current))) : 0;
  const want = Number.isFinite(target) ? Math.max(from, Math.min(end, Math.floor(target))) : from;
  return Math.min(want, from + REPLAY_CATCHUP);
}
