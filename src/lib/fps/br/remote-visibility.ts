/** Visibility changes belong to the playback timeline, as in the 5v5 remote presentation.
 * Never invent a grace period after a server-redacted pose; never apply a future hide early.
 */
export function brVisibleRows(
  left: { at: number; rows: Map<number, number[]> },
  right: { at: number; rows: Map<number, number[]> },
  playbackAt: number,
  out: Map<number, number[]>,
) {
  out.clear();
  const rows = playbackAt < right.at && left !== right ? left.rows : right.rows;
  for (const [seat, row] of rows) out.set(seat, right.rows.get(seat) ?? row);
}

/** Keep near/on-screen opponents on their full rigs instead of swapping at the nearest-16 edge. */
export function brActorPriority(
  distanceSquared: number,
  forwardDot: number,
  retained: boolean,
  alive: boolean,
) {
  return distanceSquared * (forwardDot > 0.15 ? 1 : 4) * (retained ? 0.8 : 1) * (alive ? 1 : 4);
}
