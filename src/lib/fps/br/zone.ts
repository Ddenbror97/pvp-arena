import { WORLD_HALF, type WorldMeta } from "./world";

/**
 * The play zone and its gas (PLAN §6.7; rebalanced 2026-11-04, owner's "BR full audit" spec:
 * OG H1Z1 tension with PUBG fairness). Shared deterministic module (no three.js): the server
 * owns the circles and the damage, the client only draws what the server sends.
 *
 * Radii are fractions of the reference radius (half the 10 km island, ZONE_REF_RADIUS), not area
 * shares or multiplicative factors. The zone clock starts at the plane's take-off, so phase 1's
 * wait also covers the flight (≈ 150 s) and the longest glide (≈ 3.5 min from the last exit):
 * the first gas moves about 5 minutes after take-off, when everyone has landed and looted a
 * little. Rotation budget: a circle's centre may move at most `ZONE_SHIFT` × (R − r) from the
 * last, so the farthest point of the old circle is at most (1 + ZONE_SHIFT) × (R − r) from the
 * new edge; every phase gives wait + shrink ≥ that distance at a sprint (7.5 m/s) — see
 * tests/br-zone.test.ts "rotation budget".
 *
 * Presets: the room always fills 100 seats with bots (BR_RULES.seats), so a match always has a
 * full lobby; the smaller presets exist for test lobbies and future modes with fewer seats.
 * Adaptive pacing never changes a running plan: the preset is chosen once, from the seat count,
 * when the match is created.
 */
export type ZonePhase = {
  /** Wait (s) before the shrink starts; shrink (s); end radius (share of the reference). */
  wait: number;
  shrink: number;
  radius: number;
  /** Base gas damage outside the circle (HP/s) from this phase's shrink onwards. */
  dps: number;
};

/** Half the playable square: the radius the percentages refer to. */
export const ZONE_REF_RADIUS = WORLD_HALF;

export const ZONE_PRESETS = {
  /** 100 seats (every live match: bots fill the room). ≈ 22 min from take-off. */
  full: [
    { wait: 300, shrink: 150, radius: 0.65, dps: 1 },
    { wait: 90, shrink: 125, radius: 0.45, dps: 2 },
    { wait: 80, shrink: 95, radius: 0.29, dps: 3 },
    { wait: 60, shrink: 75, radius: 0.18, dps: 5 },
    { wait: 50, shrink: 60, radius: 0.1, dps: 7 },
    { wait: 40, shrink: 50, radius: 0.05, dps: 10 },
    { wait: 30, shrink: 45, radius: 0.02, dps: 14 },
    { wait: 20, shrink: 60, radius: 0, dps: 18 },
  ],
  /**
   * 30–60 seats: the owner's reference radii and damage; the middle phases are longer than the
   * reference table because the island is 10 km across (the reference timings would ask for a
   * 10 m/s run from phase 2 to 3). ≈ 19 min.
   */
  medium: [
    { wait: 240, shrink: 120, radius: 0.65, dps: 1 },
    { wait: 80, shrink: 140, radius: 0.45, dps: 2 },
    { wait: 70, shrink: 105, radius: 0.29, dps: 3 },
    { wait: 50, shrink: 70, radius: 0.18, dps: 5 },
    { wait: 40, shrink: 50, radius: 0.1, dps: 7 },
    { wait: 25, shrink: 35, radius: 0.05, dps: 10 },
    { wait: 15, shrink: 35, radius: 0.02, dps: 14 },
    { wait: 10, shrink: 60, radius: 0, dps: 18 },
  ],
  /** Under 30 seats: a smaller first circle, seven phases. ≈ 15 min. */
  small: [
    { wait: 210, shrink: 100, radius: 0.5, dps: 1 },
    { wait: 70, shrink: 125, radius: 0.32, dps: 2 },
    { wait: 55, shrink: 80, radius: 0.2, dps: 3 },
    { wait: 40, shrink: 50, radius: 0.12, dps: 5 },
    { wait: 30, shrink: 40, radius: 0.06, dps: 7 },
    { wait: 20, shrink: 30, radius: 0.025, dps: 11 },
    { wait: 10, shrink: 60, radius: 0, dps: 16 },
  ],
} satisfies Record<string, ZonePhase[]>;
export type ZonePresetName = keyof typeof ZONE_PRESETS;

/** The preset for a match with `seats` participants (chosen once, at match creation). */
export const zonePresetFor = (seats: number): ZonePresetName =>
  seats >= 60 ? "full" : seats >= 30 ? "medium" : "small";

/** The live matches' table (100 seats). */
export const ZONE_PHASES = ZONE_PRESETS.full;
/** The first circle covers the whole island. */
export const ZONE_START_RADIUS = Math.ceil(WORLD_HALF * Math.SQRT2) + 100;
/** Half side of the square the first circle's centre is drawn from (m). */
export let ZONE_FIRST_REACH = 3900;
/** Test hook for tuning the reach (audit scripts). */
export const setZoneFirstReach = (m: number) => (ZONE_FIRST_REACH = m);
/** A new centre moves at most this share of (R − r) from the last (no impossible rotations). */
export const ZONE_SHIFT = 0.5;

/**
 * Exposure escalation (PUBG 2026 style, capped): standing in the gas raises its damage by up to
 * +50 % over 30 s; back inside, the exposure decays twice as fast as it built up. Healing can
 * never outpace the late gas (phase 6+: ≥ 10 HP/s base, the best heal is a medkit's 100 HP over
 * 7 s); the final circle closes to nothing, so no safe spot is left.
 */
export const GAS_EXPOSURE = { rampMs: 30_000, maxBonus: 0.5, decay: 2 } as const;
/** Gas damage per second for a phase's base DPS after `exposureMs` in the gas. */
export const gasDps = (dps: number, exposureMs: number) =>
  dps * (1 + GAS_EXPOSURE.maxBonus * Math.min(1, Math.max(0, exposureMs) / GAS_EXPOSURE.rampMs));

export type Circle = { x: number; z: number; r: number };
export type ZonePlan = {
  /** circles[0] is the starting circle; circles[i] is where phase i ends. */
  circles: Circle[];
  /** Phase boundaries (ms after the zone start): [waitEnd, shrinkEnd] per phase. */
  times: Array<[number, number]>;
  /** The phase table this plan follows. */
  phases: readonly ZonePhase[];
};

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Segments [ax, az, bx, bz] intersect (proper crossing, either way round). */
function crosses(a: number[], b: number[]) {
  const d = (p: number[], q: number[], r: number[]) =>
    (q[0]! - p[0]!) * (r[1]! - p[1]!) - (q[1]! - p[1]!) * (r[0]! - p[0]!);
  const [p1, p2, p3, p4] = [
    [a[0]!, a[1]!],
    [a[2]!, a[3]!],
    [b[0]!, b[1]!],
    [b[2]!, b[3]!],
  ];
  return d(p3, p4, p1) * d(p3, p4, p2) < 0 && d(p1, p2, p3) * d(p1, p2, p4) < 0;
}

export type ZoneOptions = {
  /** Shortens every wait and shrink (tests, short practice formats; 1 = the table). */
  timeScale?: number | undefined;
  /** Phase table (default: the 100-seat preset). */
  phases?: readonly ZonePhase[];
  /** Ground a player can stand and fight on (not inside a building): final circles only. */
  open?: ((x: number, z: number) => boolean) | undefined;
};

/**
 * Plan all circles for a match, map-aware (rejecting candidates, then falling back to the last
 * valid centre, which always nests):
 *  - every centre on land, outside lakes and the sea, inside the playable square;
 *  - mid and late circles mostly on land (≥ 55 % of samples) and mostly walkable (gentle
 *    slopes), so the fight has ground to happen on;
 *  - a centre that moves across a river must have a bridge within reach of the crossing (no
 *    death trap behind a channel);
 *  - the last circles' centres on open ground (`open`: not inside a building);
 *  - each move capped at ZONE_SHIFT × (R − r).
 * The first circle is drawn over the island's middle (where the plane flies), so endings spread
 * over the mainland and the southern island in proportion to their land.
 */
export function planZone(
  meta: WorldMeta,
  seed: number,
  heightAt: (x: number, z: number) => number,
  options: number | ZoneOptions = {},
): ZonePlan {
  const o: ZoneOptions = typeof options === "number" ? { timeScale: options } : options;
  const phases = o.phases ?? ZONE_PHASES;
  const timeScale = o.timeScale ?? 1;
  const random = rng(seed ^ 0x2f0e1d3c);
  const wet = (x: number, z: number) => {
    if (Math.abs(x) > WORLD_HALF - 200 || Math.abs(z) > WORLD_HALF - 200) return true;
    const h = heightAt(x, z);
    if (h < 2) return true;
    for (const w of meta.waterBodies) {
      const [x0, z0, x1, z1] = w.bounds;
      if (x >= x0 && x <= x1 && z >= z0 && z <= z1 && h < w.level + 0.5) return true;
    }
    return false;
  };
  // Share of 25 samples (a 5 × 5 grid over the circle's inner square) that are dry and walkable.
  const ground = (x: number, z: number, r: number) => {
    let dry = 0,
      walk = 0,
      n = 0;
    for (let i = -2; i <= 2; i++)
      for (let j = -2; j <= 2; j++) {
        const px = x + (i / 2) * r * 0.7,
          pz = z + (j / 2) * r * 0.7;
        n++;
        if (wet(px, pz)) continue;
        dry++;
        const s = Math.hypot(
          heightAt(px + 4, pz) - heightAt(px - 4, pz),
          heightAt(px, pz + 4) - heightAt(px, pz - 4),
        );
        if (s / 8 < 0.55) walk++;
      }
    return { dry: dry / n, walk: walk / n };
  };
  const riverTrap = (ax: number, az: number, bx: number, bz: number, reach: number) => {
    for (const river of meta.rivers)
      for (let k = 0; k + 1 < river.points.length; k++) {
        const [px, pz] = river.points[k]!,
          [qx, qz] = river.points[k + 1]!;
        if (!crosses([ax, az, bx, bz], [px, pz, qx, qz])) continue;
        const mx = (px + qx) / 2,
          mz = (pz + qz) / 2;
        const bridged = meta.bridges.some((b) => {
          const cx = (b.a[0] + b.b[0]) / 2,
            cz = (b.a[1] + b.b[1]) / 2;
          return Math.hypot(cx - mx, cz - mz) < reach;
        });
        if (!bridged) return true;
      }
    return false;
  };
  const circles: Circle[] = [{ x: 0, z: 0, r: ZONE_START_RADIUS }];
  phases.forEach((p, i) => {
    const prev = circles[circles.length - 1]!;
    const r = Math.round(p.radius * ZONE_REF_RADIUS);
    const first = i === 0;
    const reach = first ? 0 : Math.max(0, prev.r - r) * ZONE_SHIFT;
    const late = i >= phases.length - 3;
    let pick = { x: first ? 0 : prev.x, z: first ? 0 : prev.z };
    for (let tries = 0; tries < 300; tries++) {
      // Late in the search, relax the softer rules (ground share) before giving up.
      const strict = tries < 200;
      let x: number, z: number;
      if (first) {
        x = (random() * 2 - 1) * ZONE_FIRST_REACH;
        z = (random() * 2 - 1) * ZONE_FIRST_REACH;
        if (Math.hypot(x, z) + r > prev.r) continue;
      } else {
        const a = random() * Math.PI * 2,
          d = Math.sqrt(random()) * reach;
        x = prev.x + Math.cos(a) * d;
        z = prev.z + Math.sin(a) * d;
      }
      if (wet(x, z)) continue;
      if (r > 0 && r <= 1500) {
        const g = ground(x, z, r);
        if (strict && (g.dry < 0.55 || g.walk < 0.45)) continue;
        if (!first && riverTrap(prev.x, prev.z, x, z, Math.max(500, prev.r))) continue;
      }
      if (r === 0 || r < 120) {
        // The last circles: the very centre walkable and open.
        const g = ground(x, z, 30);
        if (g.walk < 0.6) continue;
      }
      if (late && o.open && !o.open(x, z)) continue;
      pick = { x, z };
      break;
    }
    circles.push({ x: Math.round(pick.x), z: Math.round(pick.z), r });
  });
  const times: Array<[number, number]> = [];
  let t = 0;
  for (const p of phases) {
    const waitEnd = t + p.wait * 1000 * timeScale,
      shrinkEnd = waitEnd + p.shrink * 1000 * timeScale;
    times.push([waitEnd, shrinkEnd]);
    t = shrinkEnd;
  }
  return { circles, times, phases };
}

export type ZoneState = {
  /** Phase 1..n (before the first wait ends counts as phase 1 waiting). */
  phase: number;
  /** Number of phases in the plan (the last is the final circle). */
  phases: number;
  shrinking: boolean;
  /** The circle now (gas outside it). */
  now: Circle;
  /** Where this phase's circle will end. */
  next: Circle;
  /** When the current wait or shrink ends (ms after the zone start). */
  until: number;
  /** Base gas damage per second outside the circle now (before exposure). */
  dps: number;
};

/**
 * The zone at `t` ms after the zone start: a pure function of the plan and the server's clock
 * (no frame counting); the shrink is linear in time (centre and radius together).
 */
export function zoneAt(plan: ZonePlan, t: number): ZoneState {
  const phases = plan.phases;
  for (let i = 0; i < phases.length; i++) {
    const [waitEnd, shrinkEnd] = plan.times[i]!;
    const from = plan.circles[i]!,
      to = plan.circles[i + 1]!;
    if (t < waitEnd)
      return {
        phase: i + 1,
        phases: phases.length,
        shrinking: false,
        now: from,
        next: to,
        until: waitEnd,
        dps: i === 0 ? 0 : phases[i - 1]!.dps,
      };
    if (t < shrinkEnd) {
      const k = (t - waitEnd) / (shrinkEnd - waitEnd);
      return {
        phase: i + 1,
        phases: phases.length,
        shrinking: true,
        now: {
          x: from.x + (to.x - from.x) * k,
          z: from.z + (to.z - from.z) * k,
          r: from.r + (to.r - from.r) * k,
        },
        next: to,
        until: shrinkEnd,
        dps: phases[i]!.dps,
      };
    }
  }
  const last = plan.circles[plan.circles.length - 1]!;
  return {
    phase: phases.length,
    phases: phases.length,
    shrinking: false,
    now: last,
    next: last,
    until: Infinity,
    // After the final close: the gas everywhere, at the final rate (the match resolves).
    dps: phases[phases.length - 1]!.dps,
  };
}

/** Outside the circle (on the boundary counts as inside; a closed circle is outside everywhere). */
export const outside = (c: Circle, x: number, z: number) =>
  c.r <= 0 || Math.hypot(x - c.x, z - c.z) > c.r;
