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

/**
 * A steady send rate on top of the room's timer (which fires once a tick). A plain "at least
 * N ms since the last one" test rounds up to whole timer firings: 40 ms on a 33 ms timer sent
 * every other firing, 15 a second instead of the 25 intended. This keeps a schedule instead,
 * so the mean rate is the configured one (20 a second alternates one and two firings).
 */
const EARLY_MS = 5;

export class Cadence {
  private next: number | null = null;
  readonly periodMs: number;

  constructor(hz: number) {
    this.periodMs = 1000 / hz;
  }

  /** True when a send is due at this firing. */
  due(now: number): boolean {
    if (this.next === null || now - this.next > 4 * this.periodMs) {
      // First send, or back from a stall: start a fresh schedule.
      this.next = now + this.periodMs;
      return true;
    }
    // A firing a few milliseconds early still counts, and then the schedule follows it (a
    // timer slightly faster than the tick must not drift into a skipped send).
    if (now < this.next - EARLY_MS) return false;
    this.next = (now < this.next ? now : this.next) + this.periodMs;
    return true;
  }
}

/** A room's send rate from its environment: whole numbers from 10 to 30 a second. */
export function sendRate(value: string | undefined, fallback: number): number {
  const hz = Number(value);
  return Number.isInteger(hz) && hz >= 10 && hz <= 30 ? hz : fallback;
}
