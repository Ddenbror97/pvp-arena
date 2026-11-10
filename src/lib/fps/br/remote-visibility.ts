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

/**
 * Players the room left out of a view at half rate (`held`, far players only): the client
 * carries each forward along the line of their last two sent rows, so they keep moving
 * between the rows that do arrive. Rows are [seat, x, y, z, ...].
 */
export class HeldRows {
  private last = new Map<number, { at: number; row: number[] }>();
  private before = new Map<number, { at: number; row: number[] }>();

  /** A row the room sent, received at `at` (ms). */
  sent(seat: number, row: number[], at: number) {
    const last = this.last.get(seat);
    if (last) this.before.set(seat, last);
    this.last.set(seat, { at, row });
  }

  /** The row to show for a held player at `at`, or null if none was ever sent. */
  held(seat: number, at: number): number[] | null {
    const a = this.last.get(seat);
    if (!a) return null;
    const row = a.row.slice();
    const b = this.before.get(seat);
    const span = b ? a.at - b.at : 0;
    // Only along a recent, short step: never across a gap in sight or a teleport.
    if (!b || span <= 0 || span > 400) return row;
    const step = Math.hypot(a.row[1]! - b.row[1]!, a.row[2]! - b.row[2]!, a.row[3]! - b.row[3]!);
    if (step > 12) return row;
    const k = Math.min(1.5, Math.max(0, (at - a.at) / span));
    for (const i of [1, 2, 3]) row[i] = a.row[i]! + (a.row[i]! - b.row[i]!) * k;
    return row;
  }

  /** Forget players in neither list (out of sight). */
  keep(seats: { has(seat: number): boolean }) {
    for (const seat of this.last.keys())
      if (!seats.has(seat)) {
        this.last.delete(seat);
        this.before.delete(seat);
      }
  }
}
