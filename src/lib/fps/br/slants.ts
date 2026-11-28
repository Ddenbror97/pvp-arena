/**
 * Slanted walls as what they are (collision audit 2026-11-27, owner: "a lot laggy running with
 * the walls and corners … the building inside prison").
 *
 * The game's solids are axis-aligned boxes. A wall drawn at an angle (art/blender/br/
 * textured-kit.mjs `slab`: Blackwater's keep and quay, East Works' tanks, the Old Fortress's
 * round towers) was given a staircase of boxes round its centre line, each 0.375 × its thickness
 * out from the line in x and in z. Up to 0.6 m in front of the drawn face, with a notch every
 * 0.4–1.1 m: a body ran into corners it could not see, crept along them and caught on every
 * one, and a bullet or a look stopped short of the stone.
 *
 * The staircase is exact: from its boxes the wall it was made for is rebuilt to the millimetre
 * (and checked by making the staircase again from it: anything else is left as boxes). The wall
 * is a prism: a convex quadrilateral in plan (its two faces, its ends square or mitred where it
 * meets the next wall of the same run of walls) from y0 to y1. Its boxes stay in the world for
 * whatever reads boxes alone; the queries bodies, sight and shots use read the wall instead
 * (static-world.ts).
 *
 * Layout of one slant (SLANT floats): the plan's four corners (x, z) in order round it, the four
 * edges' outward unit normals (x, z), each edge's offset along its normal (the plane), the
 * quadrilateral's least extent along each normal, y0, y1, its thickness, its plan bounds (x0,
 * z0, x1, z1).
 */

/** Floats per slant. */
export const SLANT = 32;
export const S_CORNERS = 0;
export const S_NORMALS = 8;
export const S_PLANES = 16;
export const S_LEAST = 20;
export const S_Y0 = 24;
export const S_Y1 = 25;
export const S_THICK = 26;
export const S_BOUNDS = 28;

/** A wall rebuilt from its staircase, in the model's frame: its centre line, half thickness, y. */
export type SlantWall = {
  ax: number;
  az: number;
  bx: number;
  bz: number;
  half: number;
  y0: number;
  y1: number;
};

/** The kit's own rounding (textured-kit.mjs r3). */
const r3 = (v: number) => Math.round(v * 1000) / 1000;

/** The staircase textured-kit.mjs `slab` gives a wall of `n` boxes. */
function staircase(w: SlantWall, n: number): number[][] {
  const dx = w.bx - w.ax,
    dz = w.bz - w.az,
    e = w.half * 0.75;
  const out: number[][] = [];
  for (let k = 0; k < n; k++) {
    const xa = w.ax + (dx * k) / n,
      za = w.az + (dz * k) / n,
      xb = w.ax + (dx * (k + 1)) / n,
      zb = w.az + (dz * (k + 1)) / n;
    out.push(
      [
        Math.min(xa, xb) - e,
        w.y0,
        Math.min(za, zb) - e,
        Math.max(xa, xb) + e,
        w.y1,
        Math.max(za, zb) + e,
      ].map(r3),
    );
  }
  return out;
}

const TOL = 2.5e-3;
const near = (a: number, b: number) => Math.abs(a - b) < TOL;

/**
 * The slanted walls among a model's boxes (in its own frame), and which boxes they replace.
 * A run is two or more consecutive boxes of one size and height, each the last moved by the same
 * step in both x and z, overlapping it by the same margin in both: the kit's staircase. It is
 * taken only if making the staircase again from the wall rebuilt gives the same boxes.
 */
export function findSlants(boxes: readonly (readonly number[])[]): {
  walls: SlantWall[];
  used: Uint8Array;
} {
  const walls: SlantWall[] = [];
  const used = new Uint8Array(boxes.length);
  let i = 0;
  while (i < boxes.length - 1) {
    const a = boxes[i]!,
      b = boxes[i + 1]!;
    const ox = b[0]! - a[0]!,
      oz = b[2]! - a[2]!,
      w = a[3]! - a[0]!,
      d = a[5]! - a[2]!;
    const e1 = (w - Math.abs(ox)) / 2,
      e2 = (d - Math.abs(oz)) / 2;
    const same = (q: readonly number[]) =>
      q[1] === a[1] && q[4] === a[4] && near(q[3]! - q[0]!, w) && near(q[5]! - q[2]!, d);
    if (!(Math.abs(ox) > 1e-3 && Math.abs(oz) > 1e-3 && near(e1, e2) && e1 > 0.01 && same(b))) {
      i++;
      continue;
    }
    let j = i + 1;
    while (j + 1 < boxes.length) {
      const c = boxes[j]!,
        n = boxes[j + 1]!;
      if (near(n[0]! - c[0]!, ox) && near(n[2]! - c[2]!, oz) && same(n)) j++;
      else break;
    }
    const n = j - i + 1,
      z = boxes[j]!,
      e = (e1 + e2) / 2;
    const cx0 = (a[0]! + a[3]!) / 2,
      cz0 = (a[2]! + a[5]!) / 2,
      cx1 = (z[0]! + z[3]!) / 2,
      cz1 = (z[2]! + z[5]!) / 2;
    const sx = (cx1 - cx0) / (n - 1),
      sz = (cz1 - cz0) / (n - 1);
    const wall: SlantWall = {
      ax: cx0 - sx / 2,
      az: cz0 - sz / 2,
      bx: cx1 + sx / 2,
      bz: cz1 + sz / 2,
      half: e / 0.75,
      y0: a[1]!,
      y1: a[4]!,
    };
    const again = staircase(wall, n);
    let exact = true;
    for (let k = 0; k < n && exact; k++)
      for (let v = 0; v < 6; v++)
        if (!near(again[k]![v]!, boxes[i + k]![v]!)) {
          exact = false;
          break;
        }
    if (exact) {
      walls.push(wall);
      for (let k = i; k <= j; k++) used[k] = 1;
    }
    i = j + 1;
  }
  return { walls, used };
}

/** Where the line p + s·u meets the line q + t·v (s), or NaN for parallel lines. */
function meet(
  px: number,
  pz: number,
  ux: number,
  uz: number,
  qx: number,
  qz: number,
  vx: number,
  vz: number,
) {
  const den = ux * vz - uz * vx;
  if (Math.abs(den) < 1e-9) return NaN;
  return ((qx - px) * vz - (qz - pz) * vx) / den;
}

/**
 * The walls as prisms (SLANT floats each), in the model's frame. Where two walls of the same
 * height and thickness share an end (the segments of the keep's rounded ends, a tank's ring)
 * the two are mitred, so the outside of the bend is closed and the inside has no step: a body
 * slides from one onto the next. Elsewhere the end is square, as drawn.
 */
export function slantPrisms(walls: readonly SlantWall[]): Float64Array {
  const out = new Float64Array(walls.length * SLANT);
  const dir = walls.map((w) => {
    const l = Math.sqrt((w.bx - w.ax) ** 2 + (w.bz - w.az) ** 2);
    return [(w.bx - w.ax) / l, (w.bz - w.az) / l] as const;
  });
  /**
   * A wall's corner beside end `at` (0: a, 1: b) on side `side` (±1 along its left normal):
   * square, or mitred against the next wall where their centre lines cross near both walls' ends
   * (the kit runs a wall up to 0.3 m past the joint into the next: `ext`).
   */
  const corner = (k: number, at: 0 | 1, side: 1 | -1): [number, number] => {
    const w = walls[k]!,
      [ux, uz] = dir[k]!;
    const len = Math.sqrt((w.bx - w.ax) ** 2 + (w.bz - w.az) ** 2);
    const fx = w.ax - uz * side * w.half,
      fz = w.az + ux * side * w.half;
    const square = at ? len : 0;
    for (let m = 0; m < walls.length; m++) {
      if (m === k) continue;
      const o = walls[m]!;
      if (!near(o.y0, w.y0) || !near(o.y1, w.y1) || Math.abs(o.half - w.half) > 0.01) continue;
      const [vx, vz] = dir[m]!;
      // In line (a wall carried on past a hole): nothing to mitre.
      if (Math.abs(ux * vz - uz * vx) < 0.05) continue;
      const tj = meet(w.ax, w.az, ux, uz, o.ax, o.az, vx, vz);
      if (!(Math.abs(tj - square) < 0.6)) continue;
      const jx = w.ax + ux * tj,
        jz = w.az + uz * tj;
      const toA = Math.hypot(o.ax - jx, o.az - jz),
        toB = Math.hypot(o.bx - jx, o.bz - jz);
      if (Math.min(toA, toB) > 0.6) continue;
      // The bend from one into the other along the run: past 80°, a corner: square, as drawn.
      const wx = toA < toB === (at === 1) ? vx : -vx,
        wz = toA < toB === (at === 1) ? vz : -vz;
      if (ux * wx + uz * wz < Math.cos((80 * Math.PI) / 180)) continue;
      // The neighbour's face line on this side: of its two, the one met nearest the joint.
      let best = NaN;
      for (const s2 of [1, -1]) {
        const gx = o.ax - vz * s2 * o.half,
          gz = o.az + vx * s2 * o.half;
        const t = meet(fx, fz, ux, uz, gx, gz, vx, vz);
        if (Number.isFinite(t) && !(Math.abs(t - tj) >= Math.abs(best - tj))) best = t;
      }
      if (Number.isFinite(best) && Math.abs(best - tj) < w.half * 1.2)
        return [fx + ux * best, fz + uz * best];
    }
    return [fx + ux * square, fz + uz * square];
  };
  for (let k = 0; k < walls.length; k++) {
    const o = k * SLANT,
      w = walls[k]!;
    // Round the plan: a's left, b's left, b's right, a's right.
    const pts = [corner(k, 0, 1), corner(k, 1, 1), corner(k, 1, -1), corner(k, 0, -1)];
    setPrism(out, o, pts, w.y0, w.y1, w.half * 2);
    // A mitre that would fold the quadrilateral (a short wall at a sharp bend): square ends.
    if (!convex(out, o))
      setPrism(
        out,
        o,
        [
          corner2(w, dir[k]!, 0, 1),
          corner2(w, dir[k]!, 1, 1),
          corner2(w, dir[k]!, 1, -1),
          corner2(w, dir[k]!, 0, -1),
        ],
        w.y0,
        w.y1,
        w.half * 2,
      );
  }
  return out;
}

function corner2(
  w: SlantWall,
  [ux, uz]: readonly [number, number],
  at: 0 | 1,
  side: 1 | -1,
): [number, number] {
  return [(at ? w.bx : w.ax) - uz * side * w.half, (at ? w.bz : w.az) + ux * side * w.half];
}

/** Fill one prism from its plan's corners (in order round it), y0, y1 and thickness. */
export function setPrism(
  out: Float64Array,
  o: number,
  pts: ReadonlyArray<readonly [number, number]>,
  y0: number,
  y1: number,
  thick: number,
) {
  let cx = 0,
    cz = 0;
  for (const [x, z] of pts) {
    cx += x / 4;
    cz += z / 4;
  }
  let x0 = Infinity,
    z0 = Infinity,
    x1 = -Infinity,
    z1 = -Infinity;
  for (let k = 0; k < 4; k++) {
    const [px, pz] = pts[k]!,
      [qx, qz] = pts[(k + 1) & 3]!;
    out[o + S_CORNERS + k * 2] = px;
    out[o + S_CORNERS + k * 2 + 1] = pz;
    let nx = qz - pz,
      nz = -(qx - px);
    const l = Math.sqrt(nx * nx + nz * nz) || 1;
    nx /= l;
    nz /= l;
    // Outward: away from the middle.
    if ((px - cx) * nx + (pz - cz) * nz < 0) {
      nx = -nx;
      nz = -nz;
    }
    out[o + S_NORMALS + k * 2] = nx;
    out[o + S_NORMALS + k * 2 + 1] = nz;
    out[o + S_PLANES + k] = px * nx + pz * nz;
    let least = Infinity;
    for (const [x, z] of pts) least = Math.min(least, x * nx + z * nz);
    out[o + S_LEAST + k] = least;
    x0 = Math.min(x0, px);
    z0 = Math.min(z0, pz);
    x1 = Math.max(x1, px);
    z1 = Math.max(z1, pz);
  }
  out[o + S_Y0] = y0;
  out[o + S_Y1] = y1;
  out[o + S_THICK] = thick;
  out[o + S_BOUNDS] = x0;
  out[o + S_BOUNDS + 1] = z0;
  out[o + S_BOUNDS + 2] = x1;
  out[o + S_BOUNDS + 3] = z1;
}

/** Every corner on the inner side of every other edge's plane (a convex quadrilateral). */
function convex(s: Float64Array, o: number) {
  for (let k = 0; k < 4; k++)
    for (let c = 0; c < 4; c++) {
      const v =
        s[o + c * 2]! * s[o + S_NORMALS + k * 2]! +
        s[o + c * 2 + 1]! * s[o + S_NORMALS + k * 2 + 1]!;
      if (v > s[o + S_PLANES + k]! + 1e-6) return false;
    }
  return true;
}

/**
 * A prism moved into the world: turned `turn` quarter turns about +y (as turnBox), then offset.
 * Writes into `out` at `o`.
 */
export function placePrism(
  src: Float64Array,
  so: number,
  turn: number,
  px: number,
  py: number,
  pz: number,
  out: Float64Array,
  o: number,
) {
  const t = turn & 3;
  const pts: Array<[number, number]> = [];
  for (let k = 0; k < 4; k++) {
    const x = src[so + k * 2]!,
      z = src[so + k * 2 + 1]!;
    // turnBox: 1: (x, z) → (z, -x); 2: (-x, -z); 3: (-z, x).
    const [tx, tz] = t === 1 ? [z, -x] : t === 2 ? [-x, -z] : t === 3 ? [-z, x] : [x, z];
    pts.push([tx + px, tz + pz]);
  }
  setPrism(out, o, pts, src[so + S_Y0]! + py, src[so + S_Y1]! + py, src[so + S_THICK]!);
}

/**
 * Does the square hull (x ± r, z ± r, y up to y + height) overlap prism o? The same strictness
 * as a box (static-world.ts blocked: touching is not overlapping, to 1e-7).
 */
export function prismOverlaps(
  s: Float64Array,
  o: number,
  x: number,
  y: number,
  z: number,
  height: number,
  r: number,
): boolean {
  if (!(y + height > s[o + S_Y0]! + 1e-7 && y < s[o + S_Y1]! - 1e-7)) return false;
  if (!(
    x + r > s[o + S_BOUNDS]! + 1e-7 &&
    x - r < s[o + S_BOUNDS + 2]! - 1e-7 &&
    z + r > s[o + S_BOUNDS + 1]! + 1e-7 &&
    z - r < s[o + S_BOUNDS + 3]! - 1e-7
  ))
    return false;
  for (let k = 0; k < 4; k++) {
    const nx = s[o + S_NORMALS + k * 2]!,
      nz = s[o + S_NORMALS + k * 2 + 1]!;
    const c = x * nx + z * nz,
      rr = r * (Math.abs(nx) + Math.abs(nz));
    if (!(c - rr < s[o + S_PLANES + k]! - 1e-7 && c + rr > s[o + S_LEAST + k]! + 1e-7))
      return false;
  }
  return true;
}

/** Does the square footprint (x ± r, z ± r) overlap prism o's plan (a support test, no margin)? */
export function prismUnder(s: Float64Array, o: number, x: number, z: number, r: number): boolean {
  if (!(
    x + r > s[o + S_BOUNDS]! &&
    x - r < s[o + S_BOUNDS + 2]! &&
    z + r > s[o + S_BOUNDS + 1]! &&
    z - r < s[o + S_BOUNDS + 3]!
  ))
    return false;
  for (let k = 0; k < 4; k++) {
    const nx = s[o + S_NORMALS + k * 2]!,
      nz = s[o + S_NORMALS + k * 2 + 1]!;
    const c = x * nx + z * nz,
      rr = r * (Math.abs(nx) + Math.abs(nz));
    if (!(c - rr < s[o + S_PLANES + k]! && c + rr > s[o + S_LEAST + k]!)) return false;
  }
  return true;
}

/**
 * The face of prism o a square hull at (x, z) is held by: the edge (0–3) along whose normal it
 * overlaps least, if that is less than its overlap along x and along z (else -1: met by a
 * corner, a box's case); and how far the hull is from that face's plane (≥ 0 outside).
 */
export function prismFace(
  s: Float64Array,
  o: number,
  x: number,
  z: number,
  r: number,
  out: { edge: number; gap: number },
): boolean {
  let best = Infinity,
    edge = -1,
    gap = 0;
  for (let k = 0; k < 4; k++) {
    const nx = s[o + S_NORMALS + k * 2]!,
      nz = s[o + S_NORMALS + k * 2 + 1]!;
    const c = x * nx + z * nz,
      rr = r * (Math.abs(nx) + Math.abs(nz));
    const depth = s[o + S_PLANES + k]! - (c - rr);
    if (depth < best) {
      best = depth;
      edge = k;
      gap = -depth;
    }
  }
  const ox = Math.min(s[o + S_BOUNDS + 2]!, x + r) - Math.max(s[o + S_BOUNDS]!, x - r),
    oz = Math.min(s[o + S_BOUNDS + 3]!, z + r) - Math.max(s[o + S_BOUNDS + 1]!, z - r);
  if (!(best < Math.min(ox, oz))) return false;
  out.edge = edge;
  out.gap = gap;
  return true;
}

/**
 * Where a ray from (ox, oy, oz) along (dx, dy, dz) enters prism o (0 if it starts inside), or
 * Infinity: as static-world.ts `slab` for a box. `face` gets the plane it entered by (0–3 an
 * edge, 4 the underside, 5 the top; -1 started inside).
 */
export function prismRay(
  s: Float64Array,
  o: number,
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  face?: { face: number },
): number {
  let enter = 0,
    exit = Infinity,
    by = -1;
  if (Math.abs(dy) < 1e-12) {
    if (oy < s[o + S_Y0]! || oy > s[o + S_Y1]!) return Infinity;
  } else {
    const a = (s[o + S_Y0]! - oy) / dy,
      c = (s[o + S_Y1]! - oy) / dy;
    const lo = Math.min(a, c);
    if (lo > enter) {
      enter = lo;
      by = dy > 0 ? 4 : 5;
    }
    exit = Math.min(exit, Math.max(a, c));
    if (enter > exit) return Infinity;
  }
  for (let k = 0; k < 4; k++) {
    const nx = s[o + S_NORMALS + k * 2]!,
      nz = s[o + S_NORMALS + k * 2 + 1]!;
    const den = nx * dx + nz * dz,
      num = s[o + S_PLANES + k]! - (nx * ox + nz * oz);
    if (Math.abs(den) < 1e-12) {
      if (num < 0) return Infinity;
      continue;
    }
    const t = num / den;
    if (den < 0) {
      if (t > enter) {
        enter = t;
        by = k;
      }
    } else if (t < exit) exit = t;
    if (enter > exit) return Infinity;
  }
  if (exit < 0) return Infinity;
  if (face) face.face = by;
  return enter;
}

/** The plane (0–3 an edge, 4 the underside, 5 the top) a point on prism o's surface lies on. */
export function prismNearestFace(
  s: Float64Array,
  o: number,
  x: number,
  y: number,
  z: number,
): number {
  let face = 4,
    best = Math.abs(y - s[o + S_Y0]!);
  if (Math.abs(s[o + S_Y1]! - y) < best) {
    face = 5;
    best = Math.abs(s[o + S_Y1]! - y);
  }
  for (let k = 0; k < 4; k++) {
    const d = Math.abs(
      s[o + S_PLANES + k]! - (x * s[o + S_NORMALS + k * 2]! + z * s[o + S_NORMALS + k * 2 + 1]!),
    );
    if (d < best) {
      best = d;
      face = k;
    }
  }
  return face;
}

/** The outward normal of prism o's plane `face` (prismRay's): x, y, z. */
export function prismNormal(s: Float64Array, o: number, face: number): [number, number, number] {
  if (face === 4) return [0, -1, 0];
  if (face === 5 || face < 0) return [0, 1, 0];
  return [s[o + S_NORMALS + face * 2]!, 0, s[o + S_NORMALS + face * 2 + 1]!];
}

/**
 * How far (x, y, z), on prism o's surface, is inside the edges of the face it lies on: the least
 * distance to the other planes but the face's opposite (the canary's "entered well inside its
 * face", as for a box).
 */
export function prismInside(s: Float64Array, o: number, x: number, y: number, z: number): number {
  const d = [0, 0, 0, 0, y - s[o + S_Y0]!, s[o + S_Y1]! - y];
  for (let k = 0; k < 4; k++)
    d[k] =
      s[o + S_PLANES + k]! - (x * s[o + S_NORMALS + k * 2]! + z * s[o + S_NORMALS + k * 2 + 1]!);
  let face = 0;
  for (let k = 1; k < 6; k++) if (Math.abs(d[k]!) < Math.abs(d[face]!)) face = k;
  const opposite = face < 4 ? (face + 2) & 3 : face === 4 ? 5 : 4;
  let inside = Infinity;
  for (let k = 0; k < 6; k++) if (k !== face && k !== opposite) inside = Math.min(inside, d[k]!);
  return inside;
}
