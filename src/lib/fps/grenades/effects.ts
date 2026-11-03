import { traceWorld, type Vector } from "../collision";
import { eyeHeight } from "../map";
import type { GameMap } from "../maps/types";
import { GRENADES } from "./rules";

/**
 * What the grenades do, computed on the server from the gameplay collision (the same map data
 * movement and bullets use). Clients only draw it.
 *
 * - HE: damage falls off with distance; walls between the blast and the body block it (three
 *   sample points: legs, chest, head, so half-covered players take part of it); vests absorb part.
 * - Smoke: the cloud is a set of puffs flood-filled from where the grenade stopped, through open
 *   space only (it rolls round corners and through doorways, never through walls), inside a
 *   squat ellipsoid. Sight lines are blocked by how much puff they cross: the renderer draws the
 *   same puffs, so what blocks the server's sight checks is exactly what looks opaque on screen.
 * - Fire: flames flood-fill a grid over walkable floor from where the incendiary landed: they
 *   climb steps but not walls or ledges, never cross a wall, never drop to a floor below, and
 *   never burn inside smoke.
 */

// ---------------------------------------------------------------- shared geometry
/** True when a solid (bullet / sight solids: boxes, walls, structures, floor) lies between. */
export function segmentBlocked(a: Vector, b: Vector, map: GameMap): boolean {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    dz = b.z - a.z;
  const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (length < 1e-6) return false;
  const hit = traceWorld(a, { x: dx / length, y: dy / length, z: dz / length }, length, map);
  return !!hit && hit.distance < length - 1e-4;
}

/** Inside a bullet / sight solid. */
function insideSolid(p: Vector, map: GameMap): boolean {
  for (const b of map.worldBounds)
    if (
      p.x > b.minX &&
      p.x < b.maxX &&
      p.y > b.minY &&
      p.y < b.maxY &&
      p.z > b.minZ &&
      p.z < b.maxZ
    )
      return true;
  return false;
}

// ---------------------------------------------------------------- HE
const HE = GRENADES.he;
/** Sample points on a body (feet-relative heights) and their share of the blast. */
const HE_SAMPLES = [
  [0.3, 0.3],
  [-0.55, 0.4], // below the eye: chest
  [-0.08, 0.3], // head
] as const;

/**
 * Damage the blast at `center` deals to a player standing at `target` (feet), before the vest.
 * Returns 0 out of range or fully behind cover.
 */
export function heRawDamage(
  center: Vector,
  target: Vector & { crouched?: boolean },
  map: GameMap,
): number {
  const eye = eyeHeight(target);
  const chest = { x: target.x, y: target.y + eye - 0.55, z: target.z };
  const d = Math.hypot(chest.x - center.x, chest.y - center.y, chest.z - center.z);
  if (d >= HE.radius) return 0;
  let exposed = 0;
  for (const [height, share] of HE_SAMPLES) {
    const point = { x: target.x, y: target.y + (height > 0 ? height : eye + height), z: target.z };
    if (!segmentBlocked(center, point, map)) exposed += share;
  }
  if (exposed <= 0) return 0;
  return HE.damage * Math.pow(1 - d / HE.radius, HE.falloff) * exposed;
}

/** Apply the vest (mutates armor) and round: the damage actually dealt. */
export function heVestDamage(raw: number, target: { armor?: number }): number {
  let damage = raw;
  if ((target.armor ?? 0) > 0 && damage > 0) {
    const absorbed = Math.min(damage * HE.vestAbsorb, target.armor! / HE.vestCost);
    target.armor = Math.max(0, target.armor! - absorbed * HE.vestCost);
    damage -= absorbed;
  }
  return Math.floor(damage);
}

// ---------------------------------------------------------------- smoke
const SMOKE = GRENADES.smoke;
export type Smoke = {
  id: number;
  /** Server time the cloud started (ms). */
  at: number;
  /** Puff centres, flattened [x, y, z, …] in growth order (cm-rounded). */
  puffs: number[];
};

/**
 * The cloud's puffs for a grenade that popped at `at` (its centre; the floor is just below).
 * Breadth-first from the grenade over a grid, so the order is the order the cloud grows in.
 */
export function smokePuffs(at: Vector, map: GameMap): number[] {
  const s = SMOKE.spacing;
  const ground = at.y - GRENADES.physics.radius;
  const halfH = SMOKE.height / 2,
    midY = ground + halfH;
  const seed = { x: at.x, y: ground + s * 0.55, z: at.z };
  const key = (i: number, j: number, k: number) => `${i},${j},${k}`;
  const seen = new Set<string>([key(0, 0, 0)]);
  const queue: [number, number, number, Vector][] = [[0, 0, 0, seed]];
  const out: number[] = [];
  const round = (x: number) => Math.round(x * 100) / 100;
  const NEIGHBOURS = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 0, 1],
    [0, 0, -1],
    [0, 1, 0],
    [0, -1, 0],
  ] as const;
  for (let head = 0; head < queue.length && out.length / 3 < SMOKE.maxPuffs; head++) {
    const [i, j, k, p] = queue[head]!;
    out.push(round(p.x), round(p.y), round(p.z));
    for (const [di, dj, dk] of NEIGHBOURS) {
      const ni = i + di,
        nj = j + dj,
        nk = k + dk;
      const id = key(ni, nj, nk);
      if (seen.has(id)) continue;
      seen.add(id);
      const q = { x: seed.x + ni * s, y: seed.y + nj * s, z: seed.z + nk * s };
      const rx = (q.x - at.x) / SMOKE.radius,
        rz = (q.z - at.z) / SMOKE.radius,
        ry = (q.y - midY) / halfH;
      if (rx * rx + rz * rz + ry * ry > 1 || q.y < ground + 0.1) continue;
      if (insideSolid(q, map) || segmentBlocked(p, q, map)) continue;
      queue.push([ni, nj, nk, q]);
    }
  }
  return out;
}

/**
 * How a cloud looks / blocks at `now`: how many puffs are out, at what size (0–1 of SMOKE.puff),
 * and the overall density (1 solid, fading to 0). Shared by the sight test and the renderer.
 */
export function smokePhase(smoke: Pick<Smoke, "at" | "puffs">, now: number) {
  const age = now - smoke.at;
  const total = smoke.puffs.length / 3;
  const life = age / SMOKE.durationMs;
  const fadeStart = 1 - SMOKE.fadeMs / SMOKE.durationMs;
  const fade = life <= fadeStart ? 0 : Math.min(1, (life - fadeStart) / (1 - fadeStart));
  const grow = Math.min(1, Math.max(0, age / SMOKE.expandMs));
  return {
    age,
    total,
    /** Puffs released so far (the cloud floods outward over expandMs). */
    count: age < 0 ? 0 : Math.min(total, Math.ceil(total * Math.min(1, grow * 1.4))),
    grow,
    fade,
    density: 1 - fade,
    blocks: age >= 0 && fade < SMOKE.blockFade,
    over: age >= SMOKE.durationMs,
  };
}

/** Radius of puff `index` at `age` (each puff swells for 450 ms after it is released). */
export function puffRadius(index: number, total: number, age: number, fade: number) {
  const releasedAt = ((index / Math.max(1, total)) * SMOKE.expandMs) / 1.4;
  const swell = Math.min(1, Math.max(0, (age - releasedAt) / 450));
  return SMOKE.puff * (0.45 + 0.55 * swell) * swell * (1 - 0.35 * fade);
}

/** Summed length (m) of puff the segment a → b crosses in `smoke` at `now` (capped early). */
export function smokeDepth(a: Vector, b: Vector, smoke: Smoke, now: number, cap = Infinity) {
  const phase = smokePhase(smoke, now);
  if (!phase.blocks) return 0;
  const dx = b.x - a.x,
    dy = b.y - a.y,
    dz = b.z - a.z;
  const length2 = dx * dx + dy * dy + dz * dz;
  if (length2 < 1e-9) return 0;
  const length = Math.sqrt(length2);
  let depth = 0;
  const p = smoke.puffs;
  for (let i = 0; i < phase.count; i++) {
    const r = puffRadius(i, phase.total, phase.age, phase.fade);
    if (r <= 0) continue;
    const cx = p[i * 3]! - a.x,
      cy = p[i * 3 + 1]! - a.y,
      cz = p[i * 3 + 2]! - a.z;
    // Closest approach of the line to the puff centre.
    const t = (cx * dx + cy * dy + cz * dz) / length2;
    const ex = cx - dx * t,
      ey = cy - dy * t,
      ez = cz - dz * t;
    const miss2 = ex * ex + ey * ey + ez * ez;
    if (miss2 >= r * r) continue;
    const half = Math.sqrt(r * r - miss2) / length;
    const from = Math.max(0, t - half),
      to = Math.min(1, t + half);
    if (to > from) {
      depth += (to - from) * length;
      if (depth >= cap) return depth;
    }
  }
  return depth;
}

/** True when the clouds hide b from a (a sight line through enough smoke). */
export function smokeBlocks(
  a: Vector,
  b: Vector,
  smokes: readonly Smoke[] | undefined,
  now: number,
) {
  if (!smokes?.length) return false;
  let depth = 0;
  for (const smoke of smokes) {
    depth += smokeDepth(a, b, smoke, now, SMOKE.blockDepth - depth);
    if (depth >= SMOKE.blockDepth) return true;
  }
  return false;
}

/** A point inside a live cloud (incendiaries fizzle there; fire never burns inside smoke). */
export function insideSmoke(p: Vector, smokes: readonly Smoke[] | undefined, now: number) {
  if (!smokes) return false;
  for (const smoke of smokes) {
    const phase = smokePhase(smoke, now);
    if (!phase.blocks) continue;
    const q = smoke.puffs;
    for (let i = 0; i < phase.count; i++) {
      const r = puffRadius(i, phase.total, phase.age, phase.fade) + 0.15;
      const dx = q[i * 3]! - p.x,
        dy = q[i * 3 + 1]! - p.y,
        dz = q[i * 3 + 2]! - p.z;
      if (dx * dx + dy * dy + dz * dz < r * r) return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------- fire
const FIRE = GRENADES.fire;
export type Fire = {
  id: number;
  /** Server time the incendiary burst (ms). */
  at: number;
  /** Cells, flattened [x, y, z, delayMs, …]: floor point and when it catches. */
  cells: number[];
  /** Cells put out by smoke (indices). */
  out?: number[];
};

const DOWN = { x: 0, y: -1, z: 0 };
/**
 * The flames for an incendiary that landed at `at` (grenade centre, resting on a floor).
 * Breadth-first over a grid on the floor; a cell catches when there is floor under it within a
 * step of its neighbour's height and no wall between them.
 */
export function fireCells(
  at: Vector,
  map: GameMap,
  smokes: readonly Smoke[] | undefined,
  now: number,
): number[] {
  const c = FIRE.cell;
  const ground = at.y - GRENADES.physics.radius;
  const out: number[] = [];
  const seen = new Set<string>(["0,0"]);
  const queue: [number, number, Vector][] = [[0, 0, { x: at.x, y: ground, z: at.z }]];
  const round = (x: number) => Math.round(x * 100) / 100;
  for (let head = 0; head < queue.length && out.length / 4 < FIRE.maxCells; head++) {
    const [i, k, p] = queue[head]!;
    if (!insideSmoke({ x: p.x, y: p.y + 0.3, z: p.z }, smokes, now)) {
      const d = Math.hypot(p.x - at.x, p.z - at.z);
      out.push(round(p.x), round(p.y), round(p.z), Math.round((d / FIRE.spreadSpeed) * 1000));
    }
    for (const [di, dk] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const ni = i + di,
        nk = k + dk;
      const id = `${ni},${nk}`;
      if (seen.has(id)) continue;
      const x = at.x + ni * c,
        z = at.z + nk * c;
      if (Math.hypot(x - at.x, z - at.z) > FIRE.radius) continue;
      // Floor under the cell, near the neighbour's height (from above: a floor below is never
      // reached, a ledge above is never climbed).
      const top = p.y + FIRE.stepUp + 0.05;
      const floor = traceWorld({ x, y: top, z }, DOWN, FIRE.stepUp * 2 + 0.1, map);
      if (!floor || floor.normal.y < 0.5) continue;
      const y = floor.point.y;
      if (Math.abs(y - p.y) > FIRE.stepUp) continue;
      // No wall between the two cells (just above the higher floor).
      const lift = Math.max(y, p.y) + 0.18;
      if (segmentBlocked({ x: p.x, y: lift, z: p.z }, { x, y: lift, z }, map)) continue;
      seen.add(id);
      queue.push([ni, nk, { x, y, z }]);
    }
  }
  return out;
}

/** Cell `i` burning at `now` (caught, not out, not burnt down). */
export function cellBurning(fire: Fire, i: number, now: number) {
  const age = now - fire.at;
  return (
    age >= fire.cells[i * 4 + 3]! && age < FIRE.durationMs && !(fire.out && fire.out.includes(i))
  );
}

/** Standing in flames: a burning cell under the player's feet. */
export function inFire(p: Vector, fires: readonly Fire[] | undefined, now: number): Fire | null {
  if (!fires) return null;
  for (const fire of fires) {
    const n = fire.cells.length / 4;
    for (let i = 0; i < n; i++) {
      const cx = fire.cells[i * 4]!,
        cy = fire.cells[i * 4 + 1]!,
        cz = fire.cells[i * 4 + 2]!;
      if (
        Math.abs(p.x - cx) < FIRE.reach &&
        Math.abs(p.z - cz) < FIRE.reach &&
        p.y > cy - 0.3 &&
        p.y < cy + 0.6 &&
        cellBurning(fire, i, now)
      )
        return fire;
    }
  }
  return null;
}

/** Put out the cells a new cloud covers (CS: smoke extinguishes fire). Returns how many. */
export function extinguish(fire: Fire, smoke: Smoke, now: number): number {
  let count = 0;
  const n = fire.cells.length / 4;
  // Judge against the cloud's full extent (it grows over the fire within a second or two).
  const full = { ...smoke, at: now - SMOKE.expandMs - 500 };
  for (let i = 0; i < n; i++) {
    if (fire.out?.includes(i)) continue;
    const p = { x: fire.cells[i * 4]!, y: fire.cells[i * 4 + 1]! + 0.3, z: fire.cells[i * 4 + 2]! };
    if (insideSmoke(p, [full], now)) {
      (fire.out ??= []).push(i);
      count++;
    }
  }
  return count;
}
