import { WORLD_HALF, type WorldMeta } from "./world";

/**
 * The play zone and its gas (PLAN §6.7, RESEARCH.md circle table: PUBG Erangel scaled ×1.25 to
 * the 10 km island). Nine phases: a wait, then the circle shrinks to the next one; outside the
 * current circle the gas deals its phase's damage per second (armour does not help). Every
 * circle's centre is chosen by the server from the match seed, inside the previous circle and
 * on land, so the final circles can land anywhere on the island, the dam and hills included.
 * Shared deterministic module (no three.js).
 */
export const ZONE_PHASES = [
  // wait (s) before shrinking, shrink (s), end radius (m), gas damage (HP/s outside)
  { wait: 390, shrink: 300, radius: 2496, dps: 0.4 },
  { wait: 180, shrink: 120, radius: 1498, dps: 0.6 },
  { wait: 130, shrink: 90, radius: 824, dps: 0.8 },
  { wait: 120, shrink: 60, radius: 453, dps: 1 },
  { wait: 100, shrink: 60, radius: 226, dps: 3 },
  { wait: 90, shrink: 30, radius: 114, dps: 5 },
  { wait: 70, shrink: 30, radius: 56, dps: 7 },
  { wait: 60, shrink: 30, radius: 29, dps: 9 },
  { wait: 60, shrink: 30, radius: 0, dps: 11 },
] as const;
/** The first circle covers the whole island. */
export const ZONE_START_RADIUS = Math.ceil(WORLD_HALF * Math.SQRT2) + 100;

export type Circle = { x: number; z: number; r: number };
export type ZonePlan = {
  /** circles[0] is the starting circle; circles[i] is where phase i ends. */
  circles: Circle[];
  /** Phase boundaries (ms after the zone start): [waitEnd, shrinkEnd] per phase. */
  times: Array<[number, number]>;
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

/**
 * Plan all circles for a match. `timeScale` shortens every wait and shrink (tests and short
 * practice formats; 1 = the table). The first circle's centre is on land near the island's
 * middle; each next centre lies within (R − r) of the previous one, on land when possible.
 */
export function planZone(
  meta: WorldMeta,
  seed: number,
  heightAt: (x: number, z: number) => number,
  timeScale = 1,
): ZonePlan {
  const random = rng(seed ^ 0x2f0e1d3c);
  const land = (x: number, z: number) => {
    if (Math.abs(x) > WORLD_HALF - 200 || Math.abs(z) > WORLD_HALF - 200) return false;
    if (heightAt(x, z) < 2) return false;
    for (const w of meta.waterBodies) {
      const [x0, z0, x1, z1] = w.bounds;
      if (x >= x0 && x <= x1 && z >= z0 && z <= z1 && heightAt(x, z) < w.level + 0.5) return false;
    }
    return true;
  };
  const circles: Circle[] = [{ x: 0, z: 0, r: ZONE_START_RADIUS }];
  for (const p of ZONE_PHASES) {
    const prev = circles[circles.length - 1]!;
    // The first real circle is kept toward the island's middle (it must fit the land).
    const reach = Math.max(0, (prev.r === ZONE_START_RADIUS ? 2400 : prev.r) - p.radius);
    let pick = { x: prev.x, z: prev.z };
    for (let tries = 0; tries < 60; tries++) {
      const a = random() * Math.PI * 2,
        d = Math.sqrt(random()) * reach;
      const x = prev.x + Math.cos(a) * d,
        z = prev.z + Math.sin(a) * d;
      if (land(x, z)) {
        pick = { x, z };
        break;
      }
    }
    circles.push({ x: Math.round(pick.x), z: Math.round(pick.z), r: p.radius });
  }
  const times: Array<[number, number]> = [];
  let t = 0;
  for (const p of ZONE_PHASES) {
    const waitEnd = t + p.wait * 1000 * timeScale,
      shrinkEnd = waitEnd + p.shrink * 1000 * timeScale;
    times.push([waitEnd, shrinkEnd]);
    t = shrinkEnd;
  }
  return { circles, times };
}

export type ZoneState = {
  /** Phase 1..9 (0: before the first wait ends counts as phase 1 waiting). */
  phase: number;
  shrinking: boolean;
  /** The circle now (gas outside it). */
  now: Circle;
  /** Where this phase's circle will end. */
  next: Circle;
  /** When the current wait or shrink ends (ms after the zone start). */
  until: number;
  dps: number;
};

/** The zone at `t` ms after the zone start. */
export function zoneAt(plan: ZonePlan, t: number): ZoneState {
  for (let i = 0; i < ZONE_PHASES.length; i++) {
    const [waitEnd, shrinkEnd] = plan.times[i]!;
    const from = plan.circles[i]!,
      to = plan.circles[i + 1]!;
    if (t < waitEnd)
      return {
        phase: i + 1,
        shrinking: false,
        now: from,
        next: to,
        until: waitEnd,
        dps: i === 0 ? 0 : ZONE_PHASES[i - 1]!.dps,
      };
    if (t < shrinkEnd) {
      const k = (t - waitEnd) / (shrinkEnd - waitEnd);
      return {
        phase: i + 1,
        shrinking: true,
        now: {
          x: from.x + (to.x - from.x) * k,
          z: from.z + (to.z - from.z) * k,
          r: from.r + (to.r - from.r) * k,
        },
        next: to,
        until: shrinkEnd,
        dps: ZONE_PHASES[i]!.dps,
      };
    }
  }
  const last = plan.circles[plan.circles.length - 1]!;
  return {
    phase: ZONE_PHASES.length,
    shrinking: false,
    now: last,
    next: last,
    until: Infinity,
    dps: ZONE_PHASES[ZONE_PHASES.length - 1]!.dps,
  };
}

export const outside = (c: Circle, x: number, z: number) => Math.hypot(x - c.x, z - c.z) > c.r;
