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
  /**
   * Watching (eliminated): nothing is aimed by this picture, so its delay may cover the
   * connection's worst recent gap instead of the 95th percentile, up to this (spectator audit
   * 2026-11-27: on a connection with 45 ms of jitter and a retransmission every few seconds the
   * watched player stood still for a moment and jumped on, eleven times in ten seconds).
   */
  watchMaxMs: 350,
  /**
   * And remembers this many arrival gaps (eight seconds at 15 snapshots a second), not four
   * seconds': a connection that retransmits every few seconds stays covered between them, and
   * one stalled frame of the spectator's own holds the view back for seconds, not minutes.
   */
  watchRemembered: 128,
  /**
   * The drawn clock follows the server's by at most this share of a frame's time (it runs
   * 10 % fast or slow for a moment) while it is within `slewWithinMs` of it. Further behind (a
   * stalled frame) it is set, as before: what a player aims at is never drawn older than the
   * room allows for. Further ahead (the room's clock fell back) it stands until the clock is
   * that near again: past the newest snapshot there is nothing to draw between anyway.
   */
  slew: 0.1,
  slewWithinMs: 60,
  /**
   * This many snapshots in a row this late against the least-delayed one: the room's own clock
   * fell behind (a stalled tick), not the connection, and the client's is set again.
   */
  resyncLateMs: 250,
  resyncAfter: 3,
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
  /** The same for a spectator: every recent gap covered, a wider bound (BR_LAG.watchMaxMs). */
  private watchDelay = new PlaybackDelay(
    BR_LAG.playbackMinMs,
    BR_LAG.watchMaxMs,
    BR_LAG.playbackStartMs,
    1,
    BR_LAG.watchRemembered,
  );
  private last = -Infinity;
  private drawn = -Infinity;
  private current: number = BR_LAG.playbackStartMs;
  private behind: number = BR_LAG.playbackStartMs;
  private late = 0;
  /**
   * A snapshot taken at `serverMs` arrived at local `receivedAt`. Returns false for one that is
   * not newer than the last (a duplicate after a reconnect); a clock that went back more than
   * two seconds is a restarted room and starts the timeline again.
   */
  observe(serverMs: number, receivedAt: number) {
    if (!Number.isFinite(serverMs) || !Number.isFinite(receivedAt)) return false;
    if (serverMs < this.last - 2000) this.reset();
    if (serverMs <= this.last) return false;
    // The room's clock is its tick count: a stalled tick leaves it behind for good, and the
    // least-delayed packet of the last five seconds then placed the drawn moment ahead of
    // every snapshot (the others stepped from snapshot to snapshot until those packets aged
    // out). Several late ones in a row are the room, not the connection: start from them.
    if (Number.isFinite(this.last) && this.clock.now(receivedAt) - serverMs > BR_LAG.resyncLateMs) {
      if (++this.late >= BR_LAG.resyncAfter) {
        this.clock.clear();
        this.late = 0;
      }
    } else this.late = 0;
    this.last = serverMs;
    this.clock.observe(serverMs, receivedAt);
    this.delay.observe(receivedAt, 0);
    this.watchDelay.observe(receivedAt, 0);
    return true;
  }
  /**
   * The server time to draw the others at this frame; never runs backwards. `watching`: the
   * spectator's delay. The drawn moment advances with the frame and is steered onto the
   * server's clock less the delay a little each frame (BR_LAG.slew): a packet that arrives
   * less delayed than any before moves that clock forward in one step, and the one it replaced
   * ageing out moves it back; drawn as they came, everyone else (and a spectator's whole
   * view) jumped ahead or stood still for that step.
   */
  sample(localNow: number, elapsedMs: number, watching = false) {
    // (Both ease every frame: changing over starts from where each already is.)
    const play = this.delay.sample(elapsedMs),
      watch = this.watchDelay.sample(elapsedMs);
    this.current = watching ? watch : play;
    const clock = this.clock.now(localNow);
    const at = clock - this.current;
    const step = Math.max(0, elapsedMs);
    if (!Number.isFinite(this.drawn) || at - this.drawn - step > BR_LAG.slewWithinMs)
      this.drawn = at;
    else if (this.drawn - at <= BR_LAG.slewWithinMs) {
      const off = at - (this.drawn + step);
      this.drawn += step + Math.max(-step * BR_LAG.slew, Math.min(step * BR_LAG.slew, off));
    }
    // What is drawn is this far behind the clock (the delay, and what is still being eased in).
    this.behind = clock - this.drawn;
    return this.drawn;
  }
  /**
   * How far behind the server clock the others are drawn now: what each input reports (the
   * room rewinds its targets by it, within the player's bounds).
   */
  get playbackMs() {
    return Math.round(Math.max(BR_LAG.playbackMinMs, Math.min(BR_LAG.watchMaxMs, this.behind)));
  }
  reset() {
    this.clock.clear();
    this.delay.reset();
    this.watchDelay.reset();
    this.last = this.drawn = -Infinity;
    this.current = this.behind = BR_LAG.playbackStartMs;
    this.late = 0;
  }
}
