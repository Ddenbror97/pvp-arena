/**
 * "You are being shot at" (owner, 2026-11-10: some awareness that the player is being shot at,
 * not too loud). The owner's recording plays when an opponent's bullet goes close by without
 * hitting (a hit plays the damage sounds instead):
 *  - 1v1/5v5: the bullet's impact point lands within SHOT_AT_M of the player's eye (impact
 *    points are already public; shots carry no direction, by design);
 *  - battle royale: the shot's path (origin to impact, or to its range) passes within
 *    NEAR_MISS_M of the eye, ahead of the shooter.
 * At most one cue every SHOT_AT_GAP_MS, so a burst is one cue, not a rattle.
 */
export const SHOT_AT_M = 2.5;
export const NEAR_MISS_M = 1.5;
export const SHOT_AT_GAP_MS = 250;

type V3 = readonly [number, number, number];

/** Closest distance (m) from `p` to the segment a→b, or Infinity when `p` is behind `a`. */
export function passBy(a: V3, b: V3, p: V3): number {
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    dz = b[2] - a[2];
  const len2 = dx * dx + dy * dy + dz * dz;
  if (!(len2 > 0)) return Infinity;
  const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy + (p[2] - a[2]) * dz) / len2;
  if (t <= 0) return Infinity;
  const k = Math.min(1, t);
  return Math.hypot(a[0] + dx * k - p[0], a[1] + dy * k - p[1], a[2] + dz * k - p[2]);
}
