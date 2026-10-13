/**
 * Jackpot wheel travel. Quadratic ease-out: speed falls in a straight line
 * and reaches zero only at the stop, so the last seconds still roll.
 * The ratchet uses this same speed. The picture is not bent to fit the sound.
 */
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
