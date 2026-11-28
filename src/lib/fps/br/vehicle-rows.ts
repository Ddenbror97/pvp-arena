/**
 * A vehicle's rows on the room's clock (spectator audit 2026-11-27). The room sends a vehicle's
 * row only when it changed, with the snapshot it changed in; the client draws it at the moment
 * the players are drawn at (lag.ts BrRemoteTimeline), between the two rows about that moment.
 *
 * They used to glide from the row before to the newest over the time between their arrivals: a
 * late snapshot stopped every vehicle and the next made it jump, a vehicle that drove off after
 * standing crept for as long as it had stood, and a driver sat in a vehicle drawn at another
 * moment than their own row (a spectator's camera followed the row, and the car shook in it).
 */
export type VehicleRowAt = { at: number; row: number[] };

/** Rows kept per vehicle: the widest playback delay's worth at the fastest snapshot rate. */
export const VEHICLE_ROWS_KEPT = 16;

export class VehicleRows {
  /** Oldest first. */
  readonly rows: VehicleRowAt[] = [];
  /** The two rows about the moment last asked for, and how far between them (0 … 1). */
  a: number[] = [];
  b: number[] = [];
  k = 1;

  /**
   * `row` came with the snapshot taken at `at`; `before` is the snapshot before that one (its
   * time, −Infinity for none). A vehicle not sent in between stood as its last row has it until
   * then: it does not move from there to here over all the time it stood.
   */
  push(at: number, row: number[], before: number) {
    const rows = this.rows;
    const newest = rows[rows.length - 1];
    // Not newer than what is there (a restarted room, a snapshot again): start from this one.
    if (newest && at <= newest.at) rows.length = 0;
    else if (newest && newest.at < before && before < at)
      rows.push({ at: before, row: newest.row });
    rows.push({ at, row });
    while (rows.length > VEHICLE_ROWS_KEPT) rows.shift();
  }

  /** Sets `a`, `b` and `k` for the room's time `t`; false with no rows. */
  sample(t: number) {
    const rows = this.rows;
    if (!rows.length) return false;
    // Before the oldest or past the newest: that row as it is (nothing is carried on past it:
    // a driver's body is where the room has it when a shot is judged).
    let ra = rows[rows.length - 1]!,
      rb = ra;
    for (let i = rows.length - 1; i > 0; i--)
      if (rows[i - 1]!.at <= t) {
        ra = rows[i - 1]!;
        rb = rows[i]!;
        break;
      } else ra = rb = rows[i - 1]!;
    this.a = ra.row;
    this.b = rb.row;
    this.k = rb.at > ra.at ? Math.min(1, Math.max(0, (t - ra.at) / (rb.at - ra.at))) : 1;
    return true;
  }
}
