import { TICK_MS } from "../../src/lib/fps/simulation";

/**
 * Per-room health numbers (foundation audit 2026-11-10: only the duel room measured itself, so
 * an overloaded 5v5 or battle royale room was invisible). One structured log line a minute:
 * how long the room's work took per timer firing, how often it overran a tick or was skipped,
 * how much it sent. Nothing about players is logged.
 */
const PERIOD_MS = 60_000;
const SAMPLES = 2048;

export class RoomTelemetry {
  private samples = new Float32Array(SAMPLES);
  private count = 0;
  private sum = 0;
  private max = 0;
  private overruns = 0;
  private skipped = 0;
  private steps = 0;
  private bytes = 0;
  private messages = 0;
  private snapshots = 0;
  private since = 0;

  constructor(private mode: "br" | "bomb") {}

  /** One timer firing's work took `ms` and ran `steps` simulation steps. */
  tick(ms: number, steps: number) {
    if (this.count < SAMPLES) this.samples[this.count] = ms;
    this.count++;
    this.sum += ms;
    if (ms > this.max) this.max = ms;
    if (ms > TICK_MS) this.overruns++;
    this.steps += steps;
  }

  /** A timer firing found the previous one still running. */
  skip() {
    this.skipped++;
  }

  /** One snapshot round went out (to every player of the room). */
  snapshot() {
    this.snapshots++;
  }

  sent(bytes: number) {
    this.bytes += bytes;
    this.messages++;
  }

  /** Log and reset once a period; `extra` adds the room's own counters. */
  flush(now: number, match: string, extra: Record<string, number>) {
    if (!this.since) this.since = now;
    if (now - this.since < PERIOD_MS || !this.count) return;
    const seconds = (now - this.since) / 1000;
    const taken = this.samples.subarray(0, Math.min(this.count, SAMPLES)).slice().sort();
    console.log(
      JSON.stringify({
        event: "fps_room_stats",
        mode: this.mode,
        match,
        seconds: Math.round(seconds),
        ticks: this.count,
        stepsPerSecond: +(this.steps / seconds).toFixed(2),
        tickMsMean: +(this.sum / this.count).toFixed(2),
        tickMsP99: +taken[Math.floor(taken.length * 0.99)]!.toFixed(2),
        tickMsMax: +this.max.toFixed(1),
        overruns: this.overruns,
        skipped: this.skipped,
        sentKBps: +(this.bytes / 1024 / seconds).toFixed(1),
        messagesPerSecond: +(this.messages / seconds).toFixed(1),
        ...(this.snapshots && { snapshotsPerSecond: +(this.snapshots / seconds).toFixed(1) }),
        ...extra,
      }),
    );
    this.count = this.sum = this.max = this.overruns = this.skipped = 0;
    this.steps = this.bytes = this.messages = this.snapshots = 0;
    this.since = now;
  }
}
