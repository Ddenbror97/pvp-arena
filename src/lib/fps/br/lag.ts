import { PlaybackDelay, SnapshotClock } from "../network";

/**
 * Battle royale lag compensation and remote playback (netcode audit 2026-11-11: the room
 * measured every player's round trip but rewound targets by a constant 110 ms, so at 150 ms
 * ping a running enemy stood about a metre from where the shooter saw them; and enemies were
 * drawn a fixed 110 ms behind each packet's arrival, 15 snapshots a second, so any jitter
 * froze them and then jumped). Now, as in 1v1 and 5v5:
 *
 * - a shot rewinds its targets to what the shooter was shown: the measured round trip (the
 *   lowest recent sample of server-issued challenges, never a client claim) plus the playback
 *   delay the client drew with, bounded; plus the time the input waited in the room before a
 *   tick applied it, measured by the room and bounded separately;
 * - the client draws others on the server's clock (least-delayed packet), behind it by a delay
 *   that follows its own connection's arrival gaps.
 */
export const BR_LAG = {
  /** The playback delay a client may draw with (and claim), ms. Snapshots are 67 ms apart. */
  playbackMinMs: 80,
  playbackMaxMs: 170,
  playbackStartMs: 110,
  /** Bound on round trip + playback: full compensation up to 150 ms ping at the widest buffer. */
  maxViewMs: 320,
  /** Bound on the room's own wait (queue and tick alignment). */
  maxServerDelayMs: 200,
} as const;
/** The furthest any shot rewinds, and the pose history that covers it with two ticks to spare. */
export const BR_MAX_REWIND_MS = BR_LAG.maxViewMs + BR_LAG.maxServerDelayMs;

/** A client's claimed playback delay, bounded (a missing or absurd claim is the start value). */
export function brPlaybackMs(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(BR_LAG.playbackMinMs, Math.min(BR_LAG.playbackMaxMs, value))
    : BR_LAG.playbackStartMs;
}

/**
 * How far in the past the shooter's picture of the others is when their input arrives: the
 * round trip (snapshot out, input back) plus the playback delay. Before the connection has
 * three round-trip samples only the playback delay is known.
 */
export function brViewLookbackMs(minRttMs: number, playbackMs: unknown) {
  const playback = brPlaybackMs(playbackMs);
  return Number.isFinite(minRttMs) && minRttMs >= 0
    ? Math.min(BR_LAG.maxViewMs, minRttMs + playback)
    : playback;
}

/** The whole rewind for an input applied `waitedMs` after it arrived. */
export function brRewindMs(viewLookbackMs: number, waitedMs: number) {
  const wait = Number.isFinite(waitedMs)
    ? Math.max(0, Math.min(BR_LAG.maxServerDelayMs, waitedMs))
    : 0;
  return Math.max(0, Math.min(BR_LAG.maxViewMs, viewLookbackMs)) + wait;
}

/**
 * The client's playback clock for other players. Snapshots are stamped with their server time
 * (tick × step); the local clock maps to the server's through the least-delayed recent packet,
 * so a late packet is placed where it belongs instead of stretching the motion before it; the
 * drawn moment trails that clock by a delay that follows the connection's arrival gaps.
 */
export class BrRemoteTimeline {
  private clock = new SnapshotClock();
  private delay = new PlaybackDelay(
    BR_LAG.playbackMinMs,
    BR_LAG.playbackMaxMs,
    BR_LAG.playbackStartMs,
  );
  private last = -Infinity;
  private drawn = -Infinity;
  private current: number = BR_LAG.playbackStartMs;
  /**
   * A snapshot taken at `serverMs` arrived at local `receivedAt`. Returns false for one that is
   * not newer than the last (a duplicate after a reconnect); a clock that went back more than
   * two seconds is a restarted room and starts the timeline again.
   */
  observe(serverMs: number, receivedAt: number) {
    if (!Number.isFinite(serverMs) || !Number.isFinite(receivedAt)) return false;
    if (serverMs < this.last - 2000) this.reset();
    if (serverMs <= this.last) return false;
    this.last = serverMs;
    this.clock.observe(serverMs, receivedAt);
    this.delay.observe(receivedAt, 0);
    return true;
  }
  /** The server time to draw the others at this frame; never runs backwards. */
  sample(localNow: number, elapsedMs: number) {
    this.current = this.delay.sample(elapsedMs);
    const at = this.clock.now(localNow) - this.current;
    this.drawn = Math.max(this.drawn, at);
    return this.drawn;
  }
  /** The delay behind the server clock being drawn now: what each input reports. */
  get playbackMs() {
    return Math.round(this.current);
  }
  reset() {
    this.clock.clear();
    this.delay.reset();
    this.last = this.drawn = -Infinity;
    this.current = BR_LAG.playbackStartMs;
  }
}
