import { TICK_MS } from "../../src/lib/fps/simulation";

/**
 * Real-time pacing for a fixed-step room (foundation audit 2026-11-10). A room that ran one
 * step per timer firing fell behind real time whenever a firing was late or skipped, and
 * never caught up: the match ran slow under load. This counts the steps real time has earned
 * since the last call, keeps the remainder, and bounds the catch-up: after a long stall the
 * backlog is dropped rather than replayed in a burst.
 */
export const MAX_CATCH_UP_STEPS = 3;

export class RoomClock {
  private last: number | null = null;
  /** Steps dropped after stalls (telemetry). */
  dropped = 0;

  /** Steps to run now (0 to MAX_CATCH_UP_STEPS). */
  due(now: number): number {
    if (this.last === null) {
      this.last = now;
      return 1;
    }
    const earned = Math.floor((now - this.last) / TICK_MS + 1e-6);
    if (earned <= 0) return 0;
    if (earned > MAX_CATCH_UP_STEPS) {
      this.dropped += earned - MAX_CATCH_UP_STEPS;
      this.last = now;
      return MAX_CATCH_UP_STEPS;
    }
    this.last += earned * TICK_MS;
    return earned;
  }

  reset() {
    this.last = null;
  }
}
