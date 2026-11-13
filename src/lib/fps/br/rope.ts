import { ZIPLINE } from "./zipline";

/**
 * The Iron Peaks climbing ropes (owner, 2026-11-12: first "ONE realistic, fully functional
 * climbing rope … toward the zip-line starting area", then "the 4 climbing ropes on that mountain,
 * 2 infront 2 in back … going all the way to the buttom … player should be able to climb up from
 * the buttom"). Fixed braided ropes down the zip-line summit's faces, held off the rock on steel
 * stand-off brackets so a climber's feet walk up the face while the hands go hand over hand up
 * the rope (rope-climb.ts). Climbed through the ladder mechanics (ladders.ts: E to take hold, W
 * up, S down, still holds, E or jump lets go, server-authoritative, phase 7 rows).
 *
 * Why four, and why this long. The summit's cap is a cliff all the way round: on the terrain
 * alone nobody walks up it (movement.ts refuses ground steeper than 45° along a move; a flood of
 * the walkable ground from the lowlands stops 20–85 m below the plateau on every bearing). The
 * first rope's foot hung 48 m down the north-north-east face with 125 m of 55°–65° rock still
 * under it: it could not be reached from below. Each rope now runs from the summit's edge down
 * its face to the first ground a player can stand on and walk away from (40° or less for 6 m,
 * and reached on foot from the lowlands), surveyed on the island's terrain every 5° of bearing:
 *
 * - the front (south, towards Pine Ridge and the island; the first zip-line leaves over it at
 *   353°): south-south-east down to the shoulder under the summit, and south-west down to the
 *   shelf there;
 * - the back (north, towards the broadcast tower; the second zip-line lands over it at 175°):
 *   north-east and north-north-east (the first rope's line, lengthened) down to the saddle
 *   between the two summits. North-west of the landing the face falls 215–270 m without a
 *   break, so both back ropes are east of it.
 *
 * Deterministic from the heightfield (server and every client build the same paths). Frames:
 * world metres (x east, y up, z south); along a route `r` is the distance from the tower.
 */
export type Ground = { heightAt(x: number, z: number): number };

export const ROPE = {
  /** The rope's line off the rock (m): a climber leans back on it with the feet on the rock in
   * front, the knees bent (rope-climb.ts places the pelvis from this and the legs' length). */
  offFace: 0.5,
  /**
   * Climbing speed along the rope (m/s). A little under a walk on level ground (2.25 m/s): the
   * back ropes are 150 m and 205 m long, and at the first rope's 1.5 m/s the longer took 2 min
   * 17 s. At 2 m/s the four take 0:31, 0:37, 1:17 and 1:44 from the foot to the plateau.
   */
  speed: 2,
  /** Stand-off brackets up the face (m apart along it). */
  bracketEvery: 6.5,
  /** Where you stand to take hold at the foot: m out from the climb's start along the route,
   * and m to the side of the rope (beside its foot anchor, not on it). */
  standOut: 1.2,
  standSide: 0.9,
  /** Beyond the climb's two ends (m along the route): the rope's spare end coiled on the slope
   * out from its start (and kept clear of rocks that far); the top anchor (two bolts in the
   * plateau's rock) and where the climber steps off, in from the summit's edge. */
  anchorOut: 1.6,
  postIn: 1.9,
  exitIn: 3,
} as const;

/** One rope: its bearing from the tower (degrees from south towards east), and the climb's two
 * ends as distances from the tower (its start at the foot, its end at the summit's edge). */
export type RopeDef = { name: string; bearing: number; rBottom: number; rTop: number };

/**
 * The four ropes. Bearings and radii from the survey above (scripts/br/rope-survey.ts prints
 * it): `rTop` 1.5 m inside the edge where the plateau breaks into the face, `rBottom` the first
 * standable, reachable ground below it. Ladder ids follow this order (ladders.ts), the first
 * rope (2026-11-12, north-north-east) first.
 */
export const ROPES: readonly RopeDef[] = [
  { name: "north-north-east", bearing: 150, rBottom: 118, rTop: 12.5 },
  { name: "north-east", bearing: 125, rBottom: 94, rTop: 12.5 },
  { name: "south-south-east", bearing: 28, rBottom: 53, rTop: 16 },
  { name: "south-west", bearing: 315, rBottom: 48, rTop: 12.5 },
];

const T = ZIPLINE.tower;

export type RopePath = {
  /** The route's direction from the tower (x, z; unit), and the climber's facing: into the
   * face, back towards the tower (forward = (−sin, −cos) of `yaw`). */
  dir: readonly [number, number];
  yaw: number;
  /** Points along the rope's line (x, y, z per point), STEP m apart from the foot of the climb. */
  pts: number[];
  /** The climb's length (m): s runs 0 … length. */
  length: number;
  /** The rope's two ends, tied off as a climber leaves a fixed rope (owner, 2026-11-12: "they
   * are stuck in some metalic stuff into the mountain … like a climber have set the ropes
   * there"): `anchor` the bolt in the rock under the climb's start (world, on the rock), with
   * `coil` the spare rope coiled on the slope beside it; `post` the top anchor's master point
   * (world, just over the plateau's rock), two bolts and slings in from the edge. */
  anchor: [number, number, number];
  coil: [number, number, number];
  post: [number, number, number];
  /** Where you stand to take hold at the foot, and where you step off at the top (on the
   * ground). */
  foot: [number, number, number];
  exit: [number, number, number];
  /** Stand-off brackets: where each meets the rock and the rope. */
  brackets: Array<{ rock: [number, number, number]; rope: [number, number, number] }>;
  /** The line's bounds (x0, y0, z0, x1, y1, z1). */
  box: [number, number, number, number, number, number];
};

/** The rope's points are this far apart along it (m). */
export const ROPE_STEP = 0.25;
const STEP = ROPE_STEP;
const cache = new WeakMap<Ground, RopePath[]>();

/** The ropes, in ROPES' order (memoised per terrain, held weakly: see ladders.ts). */
export function ropePaths(ground: Ground): RopePath[] {
  let paths = cache.get(ground);
  if (!paths) cache.set(ground, (paths = ROPES.map((d) => ropePath(ground, d))));
  return paths;
}

/** One rope's line on the terrain. */
export function ropePath(ground: Ground, def: RopeDef): RopePath {
  const bearing = (def.bearing * Math.PI) / 180;
  const dir = [Math.sin(bearing), Math.cos(bearing)] as const;
  const along = (r: number) => [T.x + dir[0] * r, T.z + dir[1] * r] as const;
  const rAnchor = def.rBottom + ROPE.anchorOut,
    rPost = def.rTop - ROPE.postIn,
    rExit = def.rTop - ROPE.exitIn;
  const h = (r: number) => ground.heightAt(...along(r));
  // The face's profile (r, height) and its outward normal, the slope taken over ±2 m (the
  // heightfield's 3.9 m cells are bilinear: kinks at their edges are smoothed out).
  const line: Array<[number, number]> = [];
  for (let r = def.rBottom; r >= def.rTop - 1e-9; r -= 0.25) {
    const dy = (h(r + 2) - h(r - 2)) / 4; // negative: the face falls outward
    const n = Math.hypot(dy, 1);
    line.push([r - (dy / n) * ROPE.offFace, h(r) + (1 / n) * ROPE.offFace]);
  }
  // Smoothed (a taut rope has no kinks), then resampled at STEP along its length.
  const smooth = line.map((_, i) => {
    let sr = 0,
      sy = 0,
      n = 0;
    for (let k = Math.max(0, i - 8); k <= Math.min(line.length - 1, i + 8); k++) {
      sr += line[k]![0];
      sy += line[k]![1];
      n++;
    }
    return [sr / n, sy / n] as [number, number];
  });
  smooth[0] = line[0]!;
  smooth[smooth.length - 1] = line[line.length - 1]!;
  const cum = [0];
  for (let i = 1; i < smooth.length; i++)
    cum.push(
      cum[i - 1]! +
        Math.hypot(smooth[i]![0] - smooth[i - 1]![0], smooth[i]![1] - smooth[i - 1]![1]),
    );
  const length = cum[cum.length - 1]!;
  const pts: number[] = [];
  let k = 0;
  for (let s = 0; s <= length + 1e-9; s += STEP) {
    while (k + 2 < cum.length && cum[k + 1]! < s) k++;
    const t = Math.min(1, (s - cum[k]!) / (cum[k + 1]! - cum[k]! || 1));
    const r = smooth[k]![0] + (smooth[k + 1]![0] - smooth[k]![0]) * t,
      y = smooth[k]![1] + (smooth[k + 1]![1] - smooth[k]![1]) * t;
    const [x, z] = along(r);
    pts.push(x, y, z);
  }
  const climb = (pts.length / 3 - 1) * STEP;
  const [ax, az] = along(def.rBottom),
    [px, pz] = along(rPost),
    [cx0, cz0] = along(rAnchor - 0.2),
    [fx0, fz0] = along(def.rBottom + ROPE.standOut),
    [ex, ez] = along(rExit);
  const brackets: RopePath["brackets"] = [];
  for (let s = 3; s < climb - 2; s += ROPE.bracketEvery) {
    const i = Math.round(s / STEP) * 3;
    const rx = pts[i]!,
      ry = pts[i + 1]!,
      rz = pts[i + 2]!;
    // Back to the rock along the face's normal (horizontal part towards the tower).
    const r = Math.hypot(rx - T.x, rz - T.z);
    const dy = (h(r + 2) - h(r - 2)) / 4;
    const n = Math.hypot(dy, 1);
    const rr = r + (dy / n) * ROPE.offFace;
    const [bx, bz] = along(rr);
    brackets.push({ rock: [bx, h(rr), bz], rope: [rx, ry, rz] });
  }
  // Beside the rope (to the climber's right as they face the rock), not on its line.
  const fx = fx0 + dir[1] * ROPE.standSide,
    fz = fz0 - dir[0] * ROPE.standSide;
  const box: RopePath["box"] = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pts.length; i++) {
    box[i % 3] = Math.min(box[i % 3]!, pts[i]!);
    box[3 + (i % 3)] = Math.max(box[3 + (i % 3)]!, pts[i]!);
  }
  return {
    dir,
    yaw: Math.atan2(dir[0], dir[1]),
    pts,
    length: climb,
    anchor: [ax, h(def.rBottom), az],
    // (To the climber's left at the foot: they stand to its right to take hold.)
    coil: [
      cx0 - dir[1] * 0.85,
      ground.heightAt(cx0 - dir[1] * 0.85, cz0 + dir[0] * 0.85),
      cz0 + dir[0] * 0.85,
    ],
    post: [px, h(rPost) + 0.1, pz],
    foot: [fx, ground.heightAt(fx, fz), fz],
    exit: [ex, ground.heightAt(ex, ez), ez],
    brackets,
    box,
  };
}

/** The rope's point `s` m up the climb (clamped to it), into `out`. */
export function ropeAt(p: RopePath, s: number, out: { x: number; y: number; z: number }) {
  const f = Math.max(0, Math.min(p.length, s)) / STEP;
  const i = Math.min(Math.floor(f), p.pts.length / 3 - 2),
    t = f - i;
  const a = i * 3,
    b = a + 3;
  out.x = p.pts[a]! + (p.pts[b]! - p.pts[a]!) * t;
  out.y = p.pts[a + 1]! + (p.pts[b + 1]! - p.pts[a + 1]!) * t;
  out.z = p.pts[a + 2]! + (p.pts[b + 2]! - p.pts[a + 2]!) * t;
  return out;
}

/** The rope's direction (unit, up the climb) at `s`. */
export function ropeTangent(p: RopePath, s: number, out: { x: number; y: number; z: number }) {
  const f = Math.max(0, Math.min(p.length, s)) / STEP;
  const i = Math.min(Math.floor(f), p.pts.length / 3 - 2);
  const a = i * 3,
    b = a + 3;
  const dx = p.pts[b]! - p.pts[a]!,
    dy = p.pts[b + 1]! - p.pts[a + 1]!,
    dz = p.pts[b + 2]! - p.pts[a + 2]!;
  const n = Math.hypot(dx, dy, dz) || 1;
  out.x = dx / n;
  out.y = dy / n;
  out.z = dz / n;
  return out;
}

/** How far up the climb a point on the rope's line is, or null off it (within `tol` m). */
export function ropeS(p: RopePath, x: number, y: number, z: number, tol = 0.06): number | null {
  const [x0, y0, z0, x1, y1, z1] = p.box;
  if (x < x0 - tol || x > x1 + tol || y < y0 - tol || y > y1 + tol || z < z0 - tol || z > z1 + tol)
    return null;
  let best = tol,
    found: number | null = null;
  const n = p.pts.length / 3;
  for (let i = 0; i + 1 < n; i++) {
    const a = i * 3,
      b = a + 3;
    const vx = p.pts[b]! - p.pts[a]!,
      vy = p.pts[b + 1]! - p.pts[a + 1]!,
      vz = p.pts[b + 2]! - p.pts[a + 2]!;
    const len2 = vx * vx + vy * vy + vz * vz || 1;
    const t = Math.max(
      0,
      Math.min(
        1,
        ((x - p.pts[a]!) * vx + (y - p.pts[a + 1]!) * vy + (z - p.pts[a + 2]!) * vz) / len2,
      ),
    );
    const d = Math.hypot(
      x - p.pts[a]! - vx * t,
      y - p.pts[a + 1]! - vy * t,
      z - p.pts[a + 2]! - vz * t,
    );
    if (d < best) {
      best = d;
      found = (i + t) * STEP;
    }
  }
  return found;
}

/**
 * Is (x, z) within `margin` m of a rope's route, from where its climber steps off on the plateau
 * to its foot anchor? The layout keeps its rocks off the routes (layout.ts crags).
 */
export function onRopeRoute(x: number, z: number, margin: number) {
  for (const def of ROPES) {
    const bearing = (def.bearing * Math.PI) / 180;
    const dx = Math.sin(bearing),
      dz = Math.cos(bearing);
    const r = (x - T.x) * dx + (z - T.z) * dz,
      off = Math.abs((x - T.x) * dz - (z - T.z) * dx);
    const r0 = def.rTop - ROPE.exitIn,
      r1 = def.rBottom + ROPE.anchorOut;
    const beyond = Math.max(0, r0 - r, r - r1);
    if (Math.hypot(off, beyond) <= margin) return true;
  }
  return false;
}

/** Vegetation kept off each rope's face, its foot and its exit ([x, z, radius]). */
export function ropeClearings(): Array<[number, number, number]> {
  const out: Array<[number, number, number]> = [];
  for (const def of ROPES) {
    const bearing = (def.bearing * Math.PI) / 180;
    for (let r = def.rTop - ROPE.exitIn; r <= def.rBottom + ROPE.anchorOut + 2; r += 4)
      out.push([T.x + Math.sin(bearing) * r, T.z + Math.cos(bearing) * r, 4.5]);
  }
  return out;
}
