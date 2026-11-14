/**
 * Server-side aim analysis for the three FPS games (2026-11-13). The rooms are authoritative for
 * movement, shots and damage, and send no hidden enemy to a client; what is left to a cheat is
 * to *play* through the honest inputs: an aimbot turning the view, or a wallhack reading what
 * still has to be sent (close footsteps, a leak). This watches the inputs the room already has
 * and scores four independent signs, each a statistic with a stated chance for an honest player:
 *
 *  1. **Flick hits.** A shot fired within FLICK.windowMs of the view turning faster than
 *     FLICK.fastDps and stopping dead (under FLICK.stillDps on the shot's tick). People flick
 *     too, and miss a good share; an aimbot's flicks land. Scored by the Wilson lower bound of
 *     the flick hit rate (so 3 of 3 says nothing and 25 of 27 a lot).
 *  2. **Reaction.** Time from an enemy coming into view (the room's own visibility) to the
 *     first hit on them. Human visual reaction is about 180–250 ms at best, plus the client's
 *     latency on top (the room measures it at its own clock, which only makes it longer). Hits
 *     under REACTION.fastMs, again and again, are not a person.
 *  3. **Head share.** Head hits among all hits, by the Wilson lower bound.
 *  4. **Tracking the hidden.** While an enemy is out of sight and out of earshot, how the
 *     view's turning follows that enemy's bearing: the correlation of the two turn rates. An
 *     honest view knows nothing of it (r ≈ 0); a view dragged along a wallhack's box follows
 *     it. Tested with Fisher's z on the sample count thinned for autocorrelation.
 *
 *  5. **Smoothing (2026-11-14).** An aimbot that "humanises" its snap moves the view a fixed
 *     share of the remaining error every frame (e ← k·e): the error falls geometrically, so the
 *     ratio of one tick's error to the last is the same tick after tick. A hand's correction has
 *     a bell-shaped speed (it speeds up, then brakes), with ratios that change through the
 *     movement. An acquisition (an error from over SMOOTH.fromDeg to under SMOOTH.toDeg) is
 *     "smooth" when SMOOTH.run or more ratios in a row stay within SMOOTH.spread of their mean.
 *  6. **Trigger timing (2026-11-14).** A triggerbot fires the tick the crosshair first touches a
 *     body, whatever the view is doing. People fire as the crosshair settles, or spray; a shot on
 *     the very tick of reaching a target while the view still sweeps faster than
 *     TRIGGER.sweepDps is rare. Scored as the share of on-target shots that are such.
 *
 * Signs 1–3, 5 and 6 are all about the same aim, so they are one family: `families(r).aim` is
 * at most one level per match (2 only with a strong sign and another sign at once; a head share
 * alone is never more than 1). Tracking the hidden is a separate family. Nothing here acts on
 * anyone: the room submits the families per match (anticheat/evidence.ts) and the backend
 * decides across matches; aim and tracking alone can never take an account past "suspicious".
 * O(1) memory per player and target; no allocation per tick.
 */
export const FLICK = {
  windowMs: 140,
  fastDps: 420,
  stillDps: 45,
  min: 10,
  notable: 0.62,
  strong: 0.8,
};
export const REACTION = { fastMs: 110, withinMs: 1500, min: 5, notable: 0.35, strong: 0.6 };
export const HEADS = { min: 20, notable: 0.55, strong: 0.72 };
export const TRACK = {
  /** Hidden for at least this long (ms), and the bearing turning at least this fast (°/s). */
  hiddenMs: 1200,
  minRate: 4,
  /** One sample in this many ticks counts (the rates are autocorrelated over a few ticks). */
  thin: 4,
  min: 60,
  notableZ: 4,
  strongZ: 6,
};

export const SMOOTH = {
  fromDeg: 6,
  toDeg: 1.5,
  /** Ratios in a row, and their largest distance from the run's mean. */
  run: 5,
  spread: 0.035,
  min: 12,
  notable: 0.3,
  strong: 0.5,
};
export const TRIGGER = {
  /** The view still turning this fast (°/s) on the shot's tick. */
  sweepDps: 120,
  min: 15,
  notable: 0.25,
  strong: 0.45,
};
/** A body's half width (m) and where the aim is measured to on it (m over the feet). */
const BODY_HALF_M = 0.35,
  BODY_Y = 1.25;

export type WatchPlayer = {
  id: string;
  /** Radians, as the games carry them (yaw about +y, pitch up positive). */
  yaw: number;
  pitch: number;
  x: number;
  y: number;
  z: number;
  alive: boolean;
};

type TargetTrack = {
  visible: boolean;
  /** When it last changed between hidden and in view (ms). */
  since: number;
  /** Bearing to it last tick (rad), NaN before the first. */
  bearing: number;
  /** A hit on it since it came into view (one reaction per appearance). */
  answered: boolean;
  /** The crosshair on its body this tick, and since when (ms). */
  on: boolean;
  onSince: number;
};

type Tally = {
  yaw: number;
  pitch: number;
  at: number;
  /** Turn speed (°/s) the last ticks, newest first, and their times. */
  speed: Float32Array;
  speedAt: Float64Array;
  /** Signed yaw rate last tick (°/s). */
  yawRate: number;
  shots: number;
  hits: number;
  heads: number;
  flickShots: number;
  flickHits: number;
  /** Whether the last shot was a flick (credited when its hit arrives the same tick). */
  lastShotFlick: boolean;
  lastShotAt: number;
  reactions: number;
  fastReactions: number;
  // Correlation sums of (view yaw rate, hidden bearing rate).
  n: number;
  sx: number;
  sy: number;
  sxx: number;
  syy: number;
  sxy: number;
  tick: number;
  targets: Map<string, TargetTrack>;
  // Smoothing: the error to the nearest target in view, the run of ratios, and the counts.
  runTarget: string;
  runError: number;
  runStart: number;
  ratios: Float32Array;
  runLength: number;
  acquisitions: number;
  smoothAcquisitions: number;
  // Trigger timing: on-target shots, and those on the onset tick of a sweep.
  onTargetShots: number;
  sweepOnsetShots: number;
};

const DEG = 180 / Math.PI;
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/** Wilson score interval's lower bound for k of n at z = 1.96. */
export function wilsonLower(k: number, n: number, z = 1.96) {
  if (n <= 0) return 0;
  const p = k / n,
    z2 = z * z;
  return (p + z2 / (2 * n) - z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n)) / (1 + z2 / n);
}

export type AimReport = {
  id: string;
  shots: number;
  hits: number;
  heads: number;
  flick: { shots: number; hits: number; lower: number; level: 0 | 1 | 2 };
  smoothing: { acquisitions: number; smooth: number; lower: number; level: 0 | 1 | 2 };
  trigger: { shots: number; onset: number; lower: number; level: 0 | 1 | 2 };
  reaction: { seen: number; fast: number; share: number; level: 0 | 1 | 2 };
  headShare: { lower: number; level: 0 | 1 | 2 };
  tracking: { samples: number; r: number; z: number; level: 0 | 1 | 2 };
  /** Sum of the levels. */
  score: number;
  /** Two signs at once: worth a person's look. Never one sign alone. */
  review: boolean;
};

export class AimWatch {
  private tallies = new Map<string, Tally>();

  private tally(id: string, p: WatchPlayer, now: number) {
    let t = this.tallies.get(id);
    if (!t) {
      t = {
        yaw: p.yaw,
        pitch: p.pitch,
        at: now,
        speed: new Float32Array(6),
        speedAt: new Float64Array(6).fill(-1e9),
        yawRate: 0,
        shots: 0,
        hits: 0,
        heads: 0,
        flickShots: 0,
        flickHits: 0,
        lastShotFlick: false,
        lastShotAt: -1e9,
        reactions: 0,
        fastReactions: 0,
        n: 0,
        sx: 0,
        sy: 0,
        sxx: 0,
        syy: 0,
        sxy: 0,
        tick: 0,
        targets: new Map(),
        runTarget: "",
        runError: NaN,
        runStart: NaN,
        ratios: new Float32Array(16),
        runLength: 0,
        acquisitions: 0,
        smoothAcquisitions: 0,
        onTargetShots: 0,
        sweepOnsetShots: 0,
      };
      this.tallies.set(id, t);
    }
    return t;
  }

  /**
   * Once a simulation step: the watched players (humans), everyone they could aim at, and the
   * room's own answers on sight and hearing. `visible(a, b)`: b is in a's view. `audible(a, b)`
   * (optional): a can hear b (footsteps): such a target is never counted as tracked blind.
   */
  observe(
    now: number,
    watched: readonly WatchPlayer[],
    others: readonly WatchPlayer[],
    visible: (a: WatchPlayer, b: WatchPlayer) => boolean,
    audible?: (a: WatchPlayer, b: WatchPlayer) => boolean,
  ) {
    for (const p of watched) {
      const t = this.tally(p.id, p, now);
      const dt = now - t.at;
      if (!p.alive || dt <= 0 || dt > 250) {
        // A gap (death, respawn, a stall): start over from here; no rate across it.
        t.yaw = p.yaw;
        t.pitch = p.pitch;
        t.at = now;
        t.yawRate = 0;
        for (const tr of t.targets.values()) tr.bearing = NaN;
        if (!p.alive) continue;
        if (dt <= 0) continue;
      } else {
        const dyaw = wrap(p.yaw - t.yaw),
          dpitch = p.pitch - t.pitch;
        // Great-circle turn of the view this tick.
        const turn = Math.hypot(dyaw * Math.cos(p.pitch), dpitch) * DEG;
        t.speed.copyWithin(1, 0);
        t.speedAt.copyWithin(1, 0);
        t.speed[0] = (turn / dt) * 1000;
        t.speedAt[0] = now;
        t.yawRate = ((dyaw * DEG) / dt) * 1000;
        t.yaw = p.yaw;
        t.pitch = p.pitch;
        t.at = now;
      }
      t.tick++;
      // The view's direction (yaw 0 looks along −z, pitch up positive).
      const cp = Math.cos(p.pitch);
      const fx = -Math.sin(p.yaw) * cp,
        fy = Math.sin(p.pitch),
        fz = -Math.cos(p.yaw) * cp;
      let nearest = Infinity,
        nearestId = "";
      for (const o of others) {
        if (o.id === p.id) continue;
        let tr = t.targets.get(o.id);
        if (!o.alive) {
          if (tr) tr.bearing = NaN;
          continue;
        }
        const sees = visible(p, o);
        // Bearing in the games' yaw convention is immaterial: only its rate is used, with the
        // same handedness as the view's yaw (atan2 of −x, −z: yaw 0 looks along −z).
        const bearing = Math.atan2(-(o.x - p.x), -(o.z - p.z));
        // The error from the crosshair to the body (degrees), for a target in view.
        let on = false;
        if (sees) {
          const dx = o.x - p.x,
            dy = o.y + BODY_Y - (p.y + 1.6),
            dz = o.z - p.z;
          const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
          const err = Math.acos(Math.max(-1, Math.min(1, (dx * fx + dy * fy + dz * fz) / d))) * DEG;
          on = err <= Math.max(1, Math.atan(BODY_HALF_M / d) * DEG);
          if (err < nearest) {
            nearest = err;
            nearestId = o.id;
          }
        }
        if (!tr) {
          tr = { visible: sees, since: now, bearing, answered: true, on, onSince: now };
          t.targets.set(o.id, tr);
          continue;
        }
        if (on !== tr.on) {
          tr.on = on;
          tr.onSince = now;
        }
        if (sees !== tr.visible) {
          tr.visible = sees;
          tr.since = now;
          tr.answered = false;
        }
        if (
          !sees &&
          now - tr.since >= TRACK.hiddenMs &&
          !Number.isNaN(tr.bearing) &&
          dt > 0 &&
          dt <= 250 &&
          t.tick % TRACK.thin === 0 &&
          !(audible && audible(p, o))
        ) {
          const rate = ((wrap(bearing - tr.bearing) * DEG) / dt) * 1000;
          if (Math.abs(rate) >= TRACK.minRate && Math.abs(rate) < 400) {
            const x = t.yawRate,
              y = rate;
            t.n++;
            t.sx += x;
            t.sy += y;
            t.sxx += x * x;
            t.syy += y * y;
            t.sxy += x * y;
          }
        }
        tr.bearing = bearing;
      }
      this.smoothing(t, nearestId, nearest);
    }
  }

  /** One tick of the smoothing sign: extend the run of shrinking errors, or close it. */
  private smoothing(t: Tally, target: string, error: number) {
    const shrinking =
      target !== "" &&
      target === t.runTarget &&
      Number.isFinite(t.runError) &&
      t.runError > 0.2 &&
      error < t.runError * 0.98;
    if (shrinking) {
      if (t.runLength < t.ratios.length) t.ratios[t.runLength++] = error / t.runError;
      t.runError = error;
      return;
    }
    // The run ended: an acquisition if it came from far and ended on the body.
    if (t.runLength > 0 && t.runStart >= SMOOTH.fromDeg && t.runError <= SMOOTH.toDeg) {
      t.acquisitions++;
      if (steadyRun(t.ratios, t.runLength)) t.smoothAcquisitions++;
    }
    t.runTarget = target;
    t.runError = target === "" ? NaN : error;
    t.runStart = t.runError;
    t.runLength = 0;
  }

  /** A shot left `id`'s gun this step (call before `hit` for the same shot). */
  shot(id: string, now: number) {
    const t = this.tallies.get(id);
    if (!t) return;
    t.shots++;
    let peak = 0;
    for (let i = 0; i < t.speed.length; i++)
      if (now - t.speedAt[i]! <= FLICK.windowMs) peak = Math.max(peak, t.speed[i]!);
    const flick =
      peak >= FLICK.fastDps && now - t.speedAt[0]! <= 80 && t.speed[0]! <= FLICK.stillDps;
    t.lastShotFlick = flick;
    t.lastShotAt = now;
    if (flick) t.flickShots++;
    // Trigger timing: on a body now; was it reached this very tick, mid-sweep?
    let onTarget = false,
      onset = false;
    for (const tr of t.targets.values())
      if (tr.visible && tr.on) {
        onTarget = true;
        if (now - tr.onSince <= 40) onset = true;
      }
    if (onTarget) {
      t.onTargetShots++;
      if (onset && now - t.speedAt[0]! <= 80 && t.speed[0]! >= TRIGGER.sweepDps)
        t.sweepOnsetShots++;
    }
  }

  /** `id` hit `victim` this step. */
  hit(id: string, victim: string, head: boolean, now: number) {
    const t = this.tallies.get(id);
    if (!t) return;
    t.hits++;
    if (head) t.heads++;
    if (t.lastShotFlick && now - t.lastShotAt <= 60) {
      t.flickHits++;
      t.lastShotFlick = false; // one hit per flick shot (pellets)
    }
    const tr = t.targets.get(victim);
    if (tr && tr.visible && !tr.answered) {
      tr.answered = true;
      const ms = now - tr.since;
      if (ms <= REACTION.withinMs) {
        t.reactions++;
        if (ms < REACTION.fastMs) t.fastReactions++;
      }
    }
  }

  report(id: string): AimReport | null {
    const t = this.tallies.get(id);
    if (!t) return null;
    const level = (v: number, enough: boolean, notable: number, strong: number): 0 | 1 | 2 =>
      !enough ? 0 : v >= strong ? 2 : v >= notable ? 1 : 0;
    const flickLower = wilsonLower(t.flickHits, t.flickShots);
    const flick = level(flickLower, t.flickShots >= FLICK.min, FLICK.notable, FLICK.strong);
    const share = t.reactions ? t.fastReactions / t.reactions : 0;
    const reaction = level(
      wilsonLower(t.fastReactions, t.reactions),
      t.reactions >= REACTION.min,
      REACTION.notable,
      REACTION.strong,
    );
    const headLower = wilsonLower(t.heads, t.hits);
    const heads = level(headLower, t.hits >= HEADS.min, HEADS.notable, HEADS.strong);
    let r = 0,
      z = 0;
    if (t.n >= 3) {
      const cov = t.sxy - (t.sx * t.sy) / t.n,
        vx = t.sxx - (t.sx * t.sx) / t.n,
        vy = t.syy - (t.sy * t.sy) / t.n;
      if (vx > 1e-9 && vy > 1e-9) {
        r = Math.max(-0.999999, Math.min(0.999999, cov / Math.sqrt(vx * vy)));
        z = Math.atanh(r) * Math.sqrt(t.n - 3);
      }
    }
    const tracking = level(z, t.n >= TRACK.min, TRACK.notableZ, TRACK.strongZ);
    const smoothLower = wilsonLower(t.smoothAcquisitions, t.acquisitions);
    const smooth = level(smoothLower, t.acquisitions >= SMOOTH.min, SMOOTH.notable, SMOOTH.strong);
    const triggerLower = wilsonLower(t.sweepOnsetShots, t.onTargetShots);
    const trigger = level(
      triggerLower,
      t.onTargetShots >= TRIGGER.min,
      TRIGGER.notable,
      TRIGGER.strong,
    );
    const levels = [flick, reaction, heads, tracking, smooth, trigger];
    return {
      id,
      shots: t.shots,
      hits: t.hits,
      heads: t.heads,
      flick: {
        shots: t.flickShots,
        hits: t.flickHits,
        lower: +flickLower.toFixed(3),
        level: flick,
      },
      reaction: {
        seen: t.reactions,
        fast: t.fastReactions,
        share: +share.toFixed(3),
        level: reaction,
      },
      headShare: { lower: +headLower.toFixed(3), level: heads },
      tracking: { samples: t.n, r: +r.toFixed(3), z: +z.toFixed(2), level: tracking },
      smoothing: {
        acquisitions: t.acquisitions,
        smooth: t.smoothAcquisitions,
        lower: +smoothLower.toFixed(3),
        level: smooth,
      },
      trigger: {
        shots: t.onTargetShots,
        onset: t.sweepOnsetShots,
        lower: +triggerLower.toFixed(3),
        level: trigger,
      },
      score: levels.reduce<number>((a, b) => a + b, 0),
      review: levels.filter((l) => l > 0).length >= 2,
    };
  }

  reports() {
    return [...this.tallies.keys()].map((id) => this.report(id)!);
  }

  forget(id?: string) {
    if (id === undefined) this.tallies.clear();
    else this.tallies.delete(id);
  }
}

/** Ratios of one run, all within SMOOTH.spread of their mean over SMOOTH.run in a row. */
function steadyRun(r: Float32Array, n: number) {
  for (let i = 0; i + SMOOTH.run <= n; i++) {
    let sum = 0;
    for (let k = i; k < i + SMOOTH.run; k++) sum += r[k]!;
    const mean = sum / SMOOTH.run;
    if (mean < 0.15 || mean > 0.92) continue;
    let steady = true;
    for (let k = i; k < i + SMOOTH.run; k++)
      if (Math.abs(r[k]! - mean) > SMOOTH.spread) steady = false;
    if (steady) return true;
  }
  return false;
}

/**
 * A match's report as evidence families (backend: migration 20261114030000). The aim signs are
 * correlated (one hand, one mouse, one skill), so they make ONE family: 2 only with a strong
 * sign and a second sign at once; a head share alone is at most 1 (good players have them).
 * Tracking the hidden is its own family.
 */
export function aimFamilies(r: AimReport): { aim: 0 | 1 | 2; tracking: 0 | 1 | 2 } {
  const signs = [r.flick.level, r.reaction.level, r.smoothing.level, r.trigger.level];
  const strong = signs.filter((l) => l === 2).length;
  const notable = signs.filter((l) => l >= 1).length + (r.headShare.level >= 1 ? 1 : 0);
  const aim: 0 | 1 | 2 = strong >= 1 && notable >= 2 ? 2 : notable >= 1 ? 1 : 0;
  return { aim, tracking: r.tracking.level };
}

/** The room's log line for one player at the end of a match (or when they leave). */
export function logAimReport(
  mode: "duel" | "bomb" | "br",
  match: string,
  user: string,
  r: AimReport,
) {
  // Quiet matches say nothing: only reports with a sign in them are logged.
  if (r.score === 0) return;
  console.log(JSON.stringify({ event: "fps_ac_report", mode, match, user, ...r }));
}
