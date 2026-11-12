import { ZIPLINE } from "./zipline";

/**
 * The Iron Peaks climbing rope (owner, 2026-11-12: "build ONE realistic, fully functional climbing
 * rope from a suitable lower point on Iron Peaks toward the zip-line starting area"). A fixed
 * braided rope up the summit's steepest face, held off the rock on steel stand-off brackets so a
 * climber's feet walk up the face while the hands go hand over hand up the rope (Mixamo "Climbing
 * A Rope", rope-clip.ts). Climbed through the ladder mechanics (ladders.ts: E to take hold, W up,
 * S down, still holds, E or jump lets go, server-authoritative, phase 7 rows).
 *
 * The route was surveyed on the island's terrain (2026-11-12): every bearing from the watchtower
 * (the zip-line's) and every pair of radii 10–90 m, scored by the on-foot detour it saves per
 * metre of rope. The face 150° from the tower's south (north-north-east) is the steepest the
 * summit has: 58°–73° for 48 m of height, which on foot (45° at most) is a 99.5 m detour round the
 * shoulder. The rope runs straight up its fall line from a stand on the slope at its foot to the
 * summit's edge 12.5 m from the tower; the climber steps over onto the plateau 9.5 m from the
 * tower, a short walk from its stair and ladder up to the zip-line's deck.
 *
 * Deterministic from the heightfield (server and every client build the same path). Frames:
 * world metres (x east, y up, z south); along the route `r` is the distance from the tower.
 */
export type Ground = { heightAt(x: number, z: number): number };

export const ROPE = {
  /** The route's bearing from the tower (rad from +z towards +x) and its two ends (radii, m). */
  bearing: (150 * Math.PI) / 180,
  /** The rope's foot anchor on the slope, the start of the climb, the summit's edge (the end of
   * the climb), the anchor post over the edge, and where the climber steps off. */
  rAnchor: 34.6,
  rBottom: 33,
  rTop: 12.5,
  rPost: 10.6,
  rExit: 9.5,
  /** The rope's line off the rock (m): the clip's feet plant this far in front of the grip
   * (rope-v1.json wallZ, 0.93 hip heights, on a 0.97 m hip). */
  offFace: 0.9,
  /**
   * Climbing speed along the rope (m/s): about 20 % faster than the same climb on foot at a
   * walk. On foot (45° at most) the step-off point is a 99.5 m walk from the rope's foot round
   * the shoulder: 44.2 s at the walk (2.25 m/s). The rope's 52.75 m at 1.5 m/s, with taking hold
   * (0.7 s) and stepping over the edge (1.1 s), is 37.0 s (20 % faster). A run (5 m/s) is still
   * quicker (19.9 s): the rope is the steady way up, not a shortcut past every player.
   */
  speed: 1.5,
  /** Stand-off brackets up the face (m apart along it). */
  bracketEvery: 6.5,
  /** Where you stand to take hold at the foot: m out from the climb's start along the route,
   * and m to the side of the rope (beside its foot anchor, not on it). */
  standOut: 1.2,
  standSide: 0.9,
} as const;

const T = ZIPLINE.tower;
export const ROPE_DIR = [Math.sin(ROPE.bearing), Math.cos(ROPE.bearing)] as const;
/** The climber faces into the face: back towards the tower (forward = (−sin, −cos)). */
export const ROPE_YAW = Math.atan2(ROPE_DIR[0], ROPE_DIR[1]);
const along = (r: number) => [T.x + ROPE_DIR[0] * r, T.z + ROPE_DIR[1] * r] as const;

export type RopePath = {
  /** Points along the rope's line (x, y, z per point), STEP m apart from the foot of the climb. */
  pts: number[];
  /** The climb's length (m): s runs 0 … length. */
  length: number;
  /** The rope beyond the climb: the foot anchor and the top post (world). */
  anchor: [number, number, number];
  post: [number, number, number];
  /** Where you stand to take hold at the foot, and where you step off at the top (on the
   * ground). */
  foot: [number, number, number];
  exit: [number, number, number];
  /** Stand-off brackets: where each meets the rock and the rope. */
  brackets: Array<{ rock: [number, number, number]; rope: [number, number, number] }>;
};

const STEP = 0.25;
let cache: { key: Ground; path: RopePath } | null = null;

/** The rope (memoised per terrain). */
export function ropePath(ground: Ground): RopePath {
  if (cache?.key === ground) return cache.path;
  const h = (r: number) => ground.heightAt(...along(r));
  // The face's profile (r, height) and its outward normal, the slope taken over ±2 m (the
  // heightfield's 3.9 m cells are bilinear: kinks at their edges are smoothed out).
  const line: Array<[number, number]> = [];
  for (let r = ROPE.rBottom; r >= ROPE.rTop - 1e-9; r -= 0.25) {
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
  const [ax, az] = along(ROPE.rAnchor),
    [px, pz] = along(ROPE.rPost),
    [fx0, fz0] = along(ROPE.rBottom + ROPE.standOut),
    [ex, ez] = along(ROPE.rExit);
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
  const fx = fx0 + ROPE_DIR[1] * ROPE.standSide,
    fz = fz0 - ROPE_DIR[0] * ROPE.standSide;
  const path: RopePath = {
    pts,
    length: climb,
    anchor: [ax, h(ROPE.rAnchor) + 0.15, az],
    post: [px, h(ROPE.rPost) + 1.05, pz],
    foot: [fx, ground.heightAt(fx, fz), fz],
    exit: [ex, ground.heightAt(ex, ez), ez],
    brackets,
  };
  cache = { key: ground, path };
  return path;
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

/** Vegetation kept off the rope's face, its foot and its exit ([x, z, radius]). */
export function ropeClearings(): Array<[number, number, number]> {
  const out: Array<[number, number, number]> = [];
  for (let r = ROPE.rExit; r <= ROPE.rAnchor + 2; r += 4) out.push([...along(r), 4.5]);
  return out;
}

/** The anchors' and brackets' plates (solid, small): world boxes x0, y0, z0, x1, y1, z1. */
export function ropeBoxes(ground: Ground): number[][] {
  const p = ropePath(ground);
  const box = ([x, y, z]: [number, number, number], w: number, hgt: number) => [
    x - w,
    y - 0.1,
    z - w,
    x + w,
    y + hgt,
    z + w,
  ];
  // The top post (a steel post with its eye) and the foot anchor's block.
  return [box([p.post[0], p.post[1] - 1.05, p.post[2]], 0.09, 1.2), box(p.anchor, 0.18, 0.25)];
}
