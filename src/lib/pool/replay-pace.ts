/**
 * A late paint must not skip the shot. Jumping to the latest frame
 * drops the ball the cue was aimed at straight into a pocket.
 */
export const REPLAY_CATCHUP = 6;

export function nextReplayFrame(current: number, target: number, last: number): number {
  const end = Number.isFinite(last) ? Math.max(0, Math.floor(last)) : 0;
  const from = Number.isFinite(current) ? Math.max(0, Math.min(end, Math.floor(current))) : 0;
  const want = Number.isFinite(target) ? Math.max(from, Math.min(end, Math.floor(target))) : from;
  return Math.min(want, from + REPLAY_CATCHUP);
}
