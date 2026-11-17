/**
 * Mouse look resampled onto the frame clock (owner, 2026-11-17: on a Mac "when looking around it
 * feels that the world is also moving … like the character's head is dizzy", "mainly when running
 * fast, faster movements"; not on a PC). Shared by 1v1, 5v5 and the battle royale.
 *
 * Each frame used to turn the view by the mouse reports that had arrived since the last one. A
 * MacBook draws up to 120 frames a second and its trackpad, or a typical office mouse, reports
 * about as often (90–133 Hz): the two beat against each other, so a frame got 0, 1 or 2 reports
 * and a steady turn was drawn as stop, step, double step. In a fast turn those steps are large and
 * the whole world lurches. (A gaming mouse at 500–1000 Hz on a 60 Hz screen delivers many reports
 * a frame, which is why a PC looked smooth.)
 *
 * Here every report is kept with its time, and a frame turns the view by where the mouse was a
 * little before the frame: `lag` behind it, the measured gap between reports (at most MAX_LAG_MS,
 * one frame at 60 Hz, which covers a 60 Hz Bluetooth mouse),
 * read between the two reports around that moment. The same hand motion is spread evenly over the
 * frames. Nothing is lost or invented: when the mouse stops the rest is applied in full, and the
 * total turn always equals the reports' sum. With a fast mouse the lag is about a millisecond, so
 * a PC behaves as before.
 */

/** Never trail the mouse by more than this (ms). */
export const MAX_LAG_MS = 17;
/** A gap longer than this (ms) is a pause, not the report interval. */
const PAUSE_MS = 40;
/** Report gaps are averaged with this weight (exponential). */
const GAP_WEIGHT = 0.15;
/** Reports older than this (ms) behind the frame are no longer needed. */
const KEEP_MS = 120;

export class MouseResampler {
  /** Report times and the mouse's running total after each (raw counts). */
  private readonly t: number[] = [];
  private readonly x: number[] = [];
  private readonly y: number[] = [];
  private totalX = 0;
  private totalY = 0;
  private shownX = 0;
  private shownY = 0;
  private lastReport = -Infinity;
  private lastTarget = -Infinity;
  /** The average gap between reports (ms), measured while the mouse moves. */
  gap = 0;

  /** A mouse report: movement (raw counts) at time `at` (ms, the event's timeStamp). */
  push(dx: number, dy: number, at: number) {
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;
    // Event times share the frames' clock (milliseconds since the page opened) in every current
    // browser. An older WebKit stamped events with the wall clock instead (since 1970): then the
    // report counts as now, or the view would wait for a moment that never comes.
    if (!Number.isFinite(at) || at > 1e11) at = globalThis.performance?.now() ?? 0;
    if (dx === 0 && dy === 0) return;
    const since = at - this.lastReport;
    if (since > 0 && since < PAUSE_MS)
      this.gap = this.gap ? this.gap + (since - this.gap) * GAP_WEIGHT : since;
    if (!(since < PAUSE_MS)) {
      // The first report after a pause moved over about one report interval before it.
      const start = Math.max(this.lastTarget, at - Math.min(MAX_LAG_MS, this.gap || 8));
      this.t.push(start);
      this.x.push(this.totalX);
      this.y.push(this.totalY);
    }
    // Reports out of order (or at the same instant) are merged into the last one.
    const last = this.t.length - 1;
    this.totalX += dx;
    this.totalY += dy;
    if (last >= 0 && at <= this.t[last]!) {
      this.x[last] = this.totalX;
      this.y[last] = this.totalY;
    } else {
      this.t.push(at);
      this.x.push(this.totalX);
      this.y.push(this.totalY);
    }
    this.lastReport = Math.max(this.lastReport, at);
  }

  /** How far behind the mouse the view is drawn now (ms). */
  get lag() {
    return Math.min(MAX_LAG_MS, this.gap);
  }

  /** Reports a second while the mouse moves (0 before any). */
  get rate() {
    return this.gap > 0 ? 1000 / this.gap : 0;
  }

  /** The turn for a frame at `now` (ms, the frame's timestamp), in raw counts. */
  take(now: number): { dx: number; dy: number } {
    if (!this.t.length) return { dx: 0, dy: 0 };
    const target = Math.max(this.lastTarget, now - this.lag);
    this.lastTarget = target;
    let x = this.totalX,
      y = this.totalY;
    const n = this.t.length;
    if (target < this.t[n - 1]!) {
      // Between the two reports around the target (before the first: where it started).
      let i = n - 1;
      while (i > 0 && this.t[i - 1]! > target) i--;
      if (i === 0) {
        x = this.x[0]!;
        y = this.y[0]!;
      } else {
        const t0 = this.t[i - 1]!,
          t1 = this.t[i]!;
        const k = t1 > t0 ? (target - t0) / (t1 - t0) : 1;
        x = this.x[i - 1]! + (this.x[i]! - this.x[i - 1]!) * k;
        y = this.y[i - 1]! + (this.y[i]! - this.y[i - 1]!) * k;
      }
    }
    // Only forward: a turn already drawn is never taken back.
    const dx = x - this.shownX,
      dy = y - this.shownY;
    this.shownX = x;
    this.shownY = y;
    // Drop what is behind the target, keeping one report before it to read between.
    let keep = 0;
    while (keep < this.t.length - 1 && this.t[keep + 1]! <= target - KEEP_MS) keep++;
    if (keep > 0) {
      this.t.splice(0, keep);
      this.x.splice(0, keep);
      this.y.splice(0, keep);
    }
    if (target >= this.t[this.t.length - 1]! && this.t.length > 1) {
      // All applied: start fresh (the totals stay, so nothing is double counted).
      this.t.splice(0, this.t.length - 1);
      this.x.splice(0, this.x.length - 1);
      this.y.splice(0, this.y.length - 1);
    }
    return { dx, dy };
  }

  /** Drop what has not been applied yet (the mouse was released, or the view jumped). */
  reset() {
    this.t.length = this.x.length = this.y.length = 0;
    this.shownX = this.totalX;
    this.shownY = this.totalY;
    this.lastTarget = -Infinity;
  }
}

/**
 * A Mac (macOS Chrome, Safari or Firefox). The canvas's low-latency `desynchronized` mode is not
 * fully implemented on macOS and can present frames out of step with the screen (Chromium's
 * graphics team advises against relying on it there), so 1v1 and 5v5 ask for it everywhere else.
 */
export function isMacOS(
  nav: { userAgent?: string; platform?: string } | undefined = globalThis.navigator,
) {
  return /Mac/i.test(nav?.platform ?? "") || /Macintosh|Mac OS X/i.test(nav?.userAgent ?? "");
}
