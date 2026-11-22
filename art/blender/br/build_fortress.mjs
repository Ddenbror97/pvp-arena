/**
 * The Old Fortress (owner, 2026-11-17: "An old stone fortress with towers, battlements, underground
 * chambers, and a central courtyard. Multiple ways to breach the walls", "Build this complex
 * fortress, large one. mutlible floors, tunnels, secret paths"), after the owner's references:
 * Carcassonne's curtain walls and towers, a grey-gold limestone castle with round towers and
 * banners, a citadel on its rock.
 *
 * The fortress stands on its base (`fort-base`, BASE m of masonry on the hill's ledge,
 * art/br/old_fortress.py): the courtyard is its top, the cellars and the dungeon are inside it.
 * On it: curtain walls with a wall-walk behind crenellated parapets, round corner towers and
 * square flanking towers (their feet down on the ledge), the gatehouse over the ditch, the keep
 * (four storeys and a roof, corner turrets), the great hall, the barracks, the chapel and its bell
 * tower, the stables. Every level is reached on foot.
 *
 * The ways in: the bridge over the ditch to the gatehouse; the breach in the east wall (a rubble
 * slope from the ledge over the broken wall); the scaffold up the south wall to the wall-walk;
 * the west postern (a tunnel into the vaults); the sally port under the south tower (a tunnel to
 * the dungeon); and the culvert from the ditch (the secret way, under the bridge).
 *
 * Fortress coordinates: metres from the fortress's centre, x east, z south, y up from the ledge
 * (the base's foot); the courtyard at y = BASE. Each model is built in its own frame (origin at
 * its placement), front +z at turn 0. Collision is the textured kit's boxes.
 *
 *   node art/blender/br/build_fortress.mjs [id ...]
 *
 * Writes public/fps/br/models/<id>.<tag>.lod{0,1,2}.glb, the models.json entry,
 * art/br/procedural/<id>.boxes.json (and an empty entrances list: the fortress's doorways are
 * open arches); footprints in src/lib/fps/br/location-buildings.json.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { createTexturedKit, farTint, publishTextured } from "./textured-kit.mjs";

const TAG = process.env.TAG ?? "fort-v2";
const only = process.argv.slice(2);
const PLAN = "src/lib/fps/br/location-buildings.json";
const plan = JSON.parse(fs.readFileSync(PLAN, "utf8"));

export const BASE = 10;
const STONE = "castlestone",
  WALL = "castlewall",
  SLATE = "slate",
  FLOOR = "castlefloor",
  WOOD = "wood",
  COBBLE = "cobble",
  PAINT = "paint";
const WHITE = [1, 1, 1];
const DARK = [0.05, 0.045, 0.04];
// The far LODs' paint where one box stands for several parts: the textures' average colours
// (linear, textured-kit.mjs farTint). They were the averages read off the images, sRGB values
// about twice as light as the stone itself: the fortress stood pale on its hill from wherever
// its far LOD drew (owner, 2026-11-22: "the castle is white in a distance no color").
const FAR_STONE = farTint(WALL),
  FAR_SLATE = farTint(SLATE),
  FAR_WOOD = farTint(WOOD);
/** Stairs: risers and treads (m). */
/** A ramp's step under a flight (m): as the old buildings' stairs (stairBoxes(s, 0.05)). */
const RAMP_RISE = 0.05;
const RISE = 0.25,
  TREAD = 0.28;

// ---------------------------------------------------------------- boxes
const overlaps = (a, b) =>
  a[0] < b[3] - 1e-6 &&
  b[0] < a[3] - 1e-6 &&
  a[1] < b[4] - 1e-6 &&
  b[1] < a[4] - 1e-6 &&
  a[2] < b[5] - 1e-6 &&
  b[2] < a[5] - 1e-6;
function carve(b, cuts) {
  let pieces = [b];
  for (const h of cuts) {
    const next = [];
    for (const p of pieces) {
      if (!overlaps(p, h)) {
        next.push(p);
        continue;
      }
      const rest = [...p];
      for (let a = 0; a < 3; a++) {
        if (rest[a] < h[a]) {
          const q = [...rest];
          q[a + 3] = h[a];
          next.push(q);
          rest[a] = h[a];
        }
        if (rest[a + 3] > h[a + 3]) {
          const q = [...rest];
          q[a] = h[a + 3];
          next.push(q);
          rest[a + 3] = h[a + 3];
        }
      }
    }
    pieces = next;
  }
  return merge(pieces);
}
function merge(list) {
  const out = list.map((b) => [...b]);
  const eq = (a, b) => Math.abs(a - b) < 1e-6;
  for (let changed = true; changed;) {
    changed = false;
    for (let i = 0; i < out.length && !changed; i++)
      for (let j = i + 1; j < out.length && !changed; j++) {
        const p = out[i],
          q = out[j];
        for (let a = 0; a < 3 && !changed; a++) {
          const o = [0, 1, 2].filter((x) => x !== a);
          if (!o.every((x) => eq(p[x], q[x]) && eq(p[x + 3], q[x + 3]))) continue;
          if (eq(p[a + 3], q[a])) p[a + 3] = q[a + 3];
          else if (eq(q[a + 3], p[a])) p[a] = q[a];
          else continue;
          out.splice(j, 1);
          changed = true;
        }
      }
  }
  return out;
}
const rng = (seed) => {
  let s = seed * 7919 + 13;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
};

/**
 * The kit for one model: `k` the near and middle LODs, `far` the far LOD's blocks.
 * `mass(b, cuts)`: a solid with its rooms and openings carved out (the near LOD); the middle LOD
 * draws it with only the cuts that open outside (doorways, windows as niches), the far LOD its
 * box. Collision is the near LOD's pieces.
 */
function kit() {
  const k = createTexturedKit();
  const far = createTexturedKit();
  const draw = (b, pieces, m, top, lod, tint) => {
    for (const p of pieces) {
      const skip = [];
      if (p[1] <= 0.001) skip.push("bottom");
      if (top && top !== m && p[4] >= b[4] - 1e-6) {
        skip.push("top");
        k.quad(
          [p[0], p[4], p[2]],
          [p[0], p[4], p[5]],
          [p[3], p[4], p[5]],
          [p[3], p[4], p[2]],
          top,
          tint,
          { n: [0, 1, 0], lod },
        );
      }
      k.box(p, m, tint, { skip, lod, collide: lod === 0 });
    }
  };
  const mass = (b, cuts = [], { m = STONE, top = null, tint = WHITE, farBox = true } = {}) => {
    draw(b, carve(b, cuts), m, top, 0, tint);
    const e = 1e-6;
    const outer = cuts.filter(
      (c) =>
        overlaps(b, c) &&
        (c[0] <= b[0] + e ||
          c[3] >= b[3] - e ||
          c[2] <= b[2] + e ||
          c[5] >= b[5] - e ||
          c[4] >= b[4] - e),
    );
    draw(b, carve(b, outer), m, top, "mid", tint);
    if (farBox) far.box(b, m, tint, { collide: false });
  };
  /** A floor surface drawn at y (near LOD), a thin collision slab under it. */
  const floor = (x0, z0, x1, z1, y, m = FLOOR, { collide = true, holes = [] } = {}) => {
    for (const p of carve(
      [x0, y - 0.3, z0, x1, y, z1],
      holes.map((h) => [h[0], y - 1, h[1], h[2], y + 1, h[3]]),
    )) {
      k.quad([p[0], y, p[2]], [p[0], y, p[5]], [p[3], y, p[5]], [p[3], y, p[2]], m, WHITE, {
        n: [0, 1, 0],
        lod: 0,
      });
      if (collide) k.box(p, m, WHITE, { visible: false });
    }
  };
  /**
   * A flight's collision (owner, 2026-11-18: "fix the stairs to not be hacky/laggy going up/down
   * as the rest of the stairs we fixed for old buildings"): the old buildings' stairs walk on a
   * ramp of 5 cm steps (repair_building_access.mjs stairBoxes), and these did on their 25 cm
   * treads, a riser a tick, up in a jolt and down in a drop. The same here: slices rising
   * RAMP_RISE each a quarter riser over the line through the treads' backs (the feet sink at
   * most three quarters of a riser at a tread's front), flat at the top, solid from `base` up.
   * The treads are drawn only.
   */
  const rampUnder = (axis, a, dir, c0, c1, y, rise, runLen, steps, base) => {
    const rr = rise / steps,
      tread = runLen / steps;
    const count = Math.max(1, Math.ceil(rise / RAMP_RISE));
    // (A quarter riser over the line through the treads' backs: stepped onto from the side, at a
    // turn, a ramp half a riser higher was a 35 cm step at its foot.)
    const at = (d) => Math.min(y + rise, Math.max(y, y + rr / 4 + (rr * d) / tread));
    for (let i = 0; i < count; i++) {
      const d0 = (runLen * i) / count,
        d1 = (runLen * (i + 1)) / count;
      const top = at((d0 + d1) / 2);
      const pa = a + dir * d0,
        pb = a + dir * d1;
      const lo = Math.min(pa, pb),
        hi = Math.max(pa, pb);
      k.box(
        axis === "x" ? [lo, base, c0, hi, top, c1] : [c0, base, lo, c1, top, hi],
        STONE,
        WHITE,
        { visible: false },
      );
    }
  };
  /**
   * A straight flight along x or z: from `a` (its foot) in direction `dir` (±1), across c0..c1,
   * rising `rise` from y in RISE steps of TREAD; solid from `base` (default: y) up to each tread.
   * Returns the run's end.
   */
  const flight = (
    axis,
    a,
    dir,
    c0,
    c1,
    y,
    rise,
    { base = y, m = STONE, lod = 0, tread = TREAD } = {},
  ) => {
    const n = Math.round(rise / RISE);
    const rr = rise / n;
    for (let s = 0; s < n; s++) {
      const pa = a + dir * s * tread,
        pb = a + dir * (s + 1) * tread;
      const lo = Math.min(pa, pb),
        hi = Math.max(pa, pb);
      const top = y + (s + 1) * rr;
      k.box(axis === "x" ? [lo, base, c0, hi, top, c1] : [c0, base, lo, c1, top, hi], m, WHITE, {
        lod,
        collide: false,
        ...(base <= 0.001 ? { skip: ["bottom"] } : {}),
      });
    }
    rampUnder(axis, a, dir, c0, c1, y, rise, n * tread, n, base);
    return a + dir * n * tread;
  };
  /** The run of a flight rising `rise`. */
  const run = (rise, tread = TREAD) => Math.round(rise / RISE) * tread;
  /**
   * Crenellations on a straight parapet along x (axis "x", c0..c1 its thickness in z) or z:
   * merlons `mw` wide with crenels `cw` between them, the parapet `sill` high under the crenels
   * and `h` high at the merlons, from y.
   */
  const parapet = (
    axis,
    a0,
    a1,
    c0,
    c1,
    y,
    { h = 1.8, sill = 0.95, mw = 1.5, cw = 0.9, m = STONE, gaps = [] } = {},
  ) => {
    const len = a1 - a0;
    const n = Math.max(1, Math.round((len + cw) / (mw + cw)));
    const step = (len + cw) / n;
    const w = step - cw;
    const B = (p, q, y0, y1) => (axis === "x" ? [p, y0, c0, q, y1, c1] : [c0, y0, p, c1, y1, q]);
    const cut = (p, q) => gaps.some(([g0, g1]) => q > g0 && p < g1);
    // The sill all along (gaps: broken away).
    for (const piece of carve(
      B(a0, a1, y, y + sill),
      gaps.map(([g0, g1]) => B(g0, g1, y - 1, y + 9)),
    ))
      k.box(piece, m, WHITE, { lod: 1 });
    for (let i = 0; i < n; i++) {
      const p = a0 + i * step,
        q = p + w;
      if (cut(p, q)) continue;
      k.box(B(p, q, y + sill, y + h), m, WHITE, { lod: 1 });
    }
  };
  /** Arrow slits: dark recesses drawn on a face (x = const or z = const), centre `c`, from y. */
  const slit = (axis, at, c, y, { w = 0.18, h = 1.6, out = 1 } = {}) => {
    const e = 0.02 * out;
    if (axis === "z")
      k.quad(
        [c - w / 2, y, at + e],
        [c + w / 2, y, at + e],
        [c + w / 2, y + h, at + e],
        [c - w / 2, y + h, at + e],
        PAINT,
        DARK,
        {
          n: [0, 0, out],
          lod: 1,
        },
      );
    else
      k.quad(
        [at + e, y, c - w / 2],
        [at + e, y, c + w / 2],
        [at + e, y + h, c + w / 2],
        [at + e, y + h, c - w / 2],
        PAINT,
        DARK,
        {
          n: [out, 0, 0],
          lod: 1,
        },
      );
  };
  /**
   * A round wall (tower): `n` straight segments from radius r0 to r1 about (cx, cz), y0..y1, the
   * first segment starting at angle `phase` (radians, from +x towards +z). `open`: openings
   * [a0, a1 (radians), y0, y1]: the segments whose middle falls in them are cut from y0 to y1.
   * Drawn: the outer face (`m`), the inner face (`inner`), the top and the openings' sills and
   * lintels. Collision: boxes along each segment.
   */
  const ring = (
    cx,
    cz,
    r0,
    r1,
    y0,
    y1,
    n,
    {
      phase = 0,
      open = [],
      m = STONE,
      inner = m,
      lod = 1,
      collide = true,
      top = true,
      only = null,
      ends = false,
    } = {},
  ) => {
    const d = (2 * Math.PI) / n;
    const cutOf = (j) => {
      const mid = phase + (((j % n) + n) % n) * d + d / 2;
      return open.find(([o0, o1]) => {
        const t = (((mid - o0) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        return (
          t <= (o1 - o0 + 2 * Math.PI) % (2 * Math.PI) || Math.abs(o1 - o0) >= 2 * Math.PI - 1e-6
        );
      });
    };
    for (let i = 0; i < n; i++) {
      if (only && !only(i)) continue;
      const a = phase + i * d,
        b = a + d,
        mid = a + d / 2;
      const cut = cutOf(i);
      const P0 = (r, ang, y) => [cx + Math.cos(ang) * r, y, cz + Math.sin(ang) * r];
      // An opening's reveals (owner, 2026-11-18, a round tower's door: "entrence_fix"): the
      // segments either side of it showed their hollow inside through the doorway. Drawn on the
      // cut segment's ends that meet a whole one, over the opening's height, facing into it.
      if (cut)
        for (const [ang, j, sign] of [
          [a, i - 1, 1],
          [b, i + 1, -1],
        ]) {
          if (cutOf(j) || (only && !only(((j % n) + n) % n))) continue;
          const ya = Math.max(y0, cut[2]),
            yb = Math.min(y1, cut[3]);
          if (yb - ya < 1e-3) continue;
          const tn = [-Math.sin(ang) * sign, 0, Math.cos(ang) * sign];
          k.quad(P0(r0, ang, ya), P0(r1, ang, ya), P0(r1, ang, yb), P0(r0, ang, yb), m, WHITE, {
            n: tn,
            lod,
          });
        }
      const spans = cut
        ? [
            [y0, cut[2]],
            [cut[3], y1],
          ].filter(([p, q]) => q - p > 1e-3)
        : [[y0, y1]];
      const P = (r, ang, y) => [cx + Math.cos(ang) * r, y, cz + Math.sin(ang) * r];
      for (const [ya, yb] of spans) {
        const nO = [Math.cos(mid), 0, Math.sin(mid)];
        k.quad(P(r1, a, ya), P(r1, b, ya), P(r1, b, yb), P(r1, a, yb), m, WHITE, { n: nO, lod });
        k.quad(P(r0, a, ya), P(r0, b, ya), P(r0, b, yb), P(r0, a, yb), inner, WHITE, {
          n: [-nO[0], 0, -nO[2]],
          lod,
        });
        if (top || yb < y1)
          k.quad(P(r0, a, yb), P(r1, a, yb), P(r1, b, yb), P(r0, b, yb), m, WHITE, {
            n: [0, 1, 0],
            lod,
          });
        if (ya > y0)
          k.quad(P(r0, a, ya), P(r1, a, ya), P(r1, b, ya), P(r0, b, ya), m, WHITE, {
            n: [0, 1, 0],
            facing: [0, -1, 0],
            lod,
          });
        // The segment's ends are hidden in the next ones (or the opening's reveals: drawn).
        if (cut || ends) {
          for (const ang of [a, b]) {
            const tn = [-Math.sin(ang), 0, Math.cos(ang)];
            k.quad(P(r0, ang, ya), P(r1, ang, ya), P(r1, ang, yb), P(r0, ang, yb), m, WHITE, {
              n: tn,
              lod,
              both: true,
            });
          }
        }
        if (!collide) continue;
        // Collision: the segment as a few boxes along it (inside its thickness).
        const steps = Math.max(1, Math.ceil((((r1 + r0) / 2) * d) / 0.8));
        for (let s = 0; s < steps; s++) {
          const aa = a + (d * s) / steps,
            bb = a + (d * (s + 1)) / steps,
            am = (aa + bb) / 2;
          const rm = (r0 + r1) / 2,
            half = (r1 - r0) * 0.42;
          const x = cx + Math.cos(am) * rm,
            z = cz + Math.sin(am) * rm;
          const ext = rm * Math.sin((bb - aa) / 2);
          const hx = Math.abs(Math.cos(am)) * half + Math.abs(Math.sin(am)) * ext,
            hz = Math.abs(Math.sin(am)) * half + Math.abs(Math.cos(am)) * ext;
          k.box([x - hx, ya, z - hz, x + hx, yb, z + hz], m, WHITE, { visible: false });
        }
      }
    }
  };
  /** Crenellations on a ring's top: the sill all round, every other segment of `n` a merlon. */
  const ringMerlons = (
    cx,
    cz,
    r0,
    r1,
    y,
    n,
    { h = 1.8, sill = 0.95, phase = 0, m = STONE } = {},
  ) => {
    ring(cx, cz, r0, r1, y, y + sill, n, { phase, m });
    ring(cx, cz, r0, r1, y + sill, y + h, n, { phase, m, only: (i) => i % 2 === 0, ends: true });
  };
  /** A slit drawn on a round face: at angle `a` on radius r, from y. */
  const roundSlit = (cx, cz, r, a, y, { w = 0.18, h = 1.6 } = {}) => {
    const da = w / 2 / r,
      rr = r + 0.03;
    const P = (ang, yy) => [cx + Math.cos(ang) * rr, yy, cz + Math.sin(ang) * rr];
    k.quad(P(a - da, y), P(a + da, y), P(a + da, y + h), P(a - da, y + h), PAINT, DARK, {
      n: [Math.cos(a), 0, Math.sin(a)],
      lod: 1,
    });
  };
  /** A round floor of radius r at y (strips of boxes), with rectangular holes [x0,z0,x1,z1]. */
  const disc = (cx, cz, r, y, { m = WOOD, holes = [], thick = 0.3, lod = 0 } = {}) => {
    const strip = 0.5;
    for (let x = -r; x < r - 1e-6; x += strip) {
      const xa = x,
        xb = Math.min(r, x + strip);
      // The strip's inner edge (its corners tuck under the ring round it), so the floor reaches
      // the wall all round (the outer edge left a gap at the rim).
      const edge = xa < 0 && xb > 0 ? 0 : Math.min(Math.abs(xa), Math.abs(xb));
      const h = Math.sqrt(Math.max(0, r * r - edge * edge));
      if (h < 0.05) continue;
      const b = [cx + xa, y - thick, cz - h, cx + xb, y, cz + h];
      for (const p of carve(
        b,
        holes.map((o) => [o[0], y - 9, o[1], o[2], y + 9, o[3]]),
      ))
        // Seen from below a storey's floor was see-through between its boards' sides (no
        // bottom faces): only a solid foot standing on the ground leaves its bottom out.
        k.box(p, m, WHITE, { lod, ...(thick >= 1 ? { skip: ["bottom"] } : {}) });
    }
  };
  /** A cone roof (drawn only): base radius r at y, apex h above, n sides. */
  const cone = (cx, cz, r, y, h, n, { m = SLATE, phase = 0, lod = 1 } = {}) => {
    const apex = [cx, y + h, cz];
    for (let i = 0; i < n; i++) {
      const a = phase + (i * 2 * Math.PI) / n,
        b = a + (2 * Math.PI) / n,
        mid = (a + b) / 2;
      const A = [cx + Math.cos(a) * r, y, cz + Math.sin(a) * r],
        B = [cx + Math.cos(b) * r, y, cz + Math.sin(b) * r];
      const s = r / Math.hypot(r, h);
      k.quad(A, B, apex, apex, m, WHITE, {
        n: [Math.cos(mid) * (h / Math.hypot(r, h)), s, Math.sin(mid) * (h / Math.hypot(r, h))],
        lod,
      });
      // The eaves' underside.
      k.quad([cx, y, cz], A, B, B, m, WHITE, { n: [0, 1, 0], facing: [0, -1, 0], lod });
    }
    far.box(
      [cx - r * 0.7, y, cz - r * 0.7, cx + r * 0.7, y + h * 0.5, cz + r * 0.7],
      PAINT,
      FAR_SLATE,
      { collide: false },
    );
  };
  /** A pitched roof over x0..x1 × z0..z1 from eaves y, ridge h above, along x or z. */
  const gable = (x0, z0, x1, z1, y, h, along, { m = SLATE, ends = STONE, over = 0.4 } = {}) => {
    if (along === "z") {
      const xm = (x0 + x1) / 2;
      const L = [x0 - over, y - over * (h / ((x1 - x0) / 2)), z0 - over],
        R = [x1 + over, y - over * (h / ((x1 - x0) / 2)), z0 - over];
      const top0 = [xm, y + h, z0 - over],
        top1 = [xm, y + h, z1 + over];
      const L1 = [L[0], L[1], z1 + over],
        R1 = [R[0], R[1], z1 + over];
      k.quad(L, L1, top1, top0, m, WHITE, { facing: [-h, (x1 - x0) / 2, 0] });
      k.quad(R, top0, top1, R1, m, WHITE, { facing: [h, (x1 - x0) / 2, 0] });
      k.quad(L, L1, top1, top0, WOOD, WHITE, { facing: [h, -(x1 - x0) / 2, 0] });
      k.quad(R, top0, top1, R1, WOOD, WHITE, { facing: [-h, -(x1 - x0) / 2, 0] });
      for (const z of [z0, z1])
        k.quad([x0, y, z], [x1, y, z], [xm, y + h, z], [xm, y + h, z], ends, WHITE, {
          n: [0, 0, z === z0 ? -1 : 1],
          both: true,
        });
      far.box([x0, y, z0, x1, y + h * 0.55, z1], PAINT, FAR_SLATE, { collide: false });
    } else {
      const zm = (z0 + z1) / 2;
      const N = [x0 - over, y - over * (h / ((z1 - z0) / 2)), z0 - over],
        S = [x0 - over, y - over * (h / ((z1 - z0) / 2)), z1 + over];
      const top0 = [x0 - over, y + h, zm],
        top1 = [x1 + over, y + h, zm];
      const N1 = [x1 + over, N[1], z0 - over],
        S1 = [x1 + over, S[1], z1 + over];
      k.quad(N, top0, top1, N1, m, WHITE, { facing: [0, (z1 - z0) / 2, -h] });
      k.quad(S, S1, top1, top0, m, WHITE, { facing: [0, (z1 - z0) / 2, h] });
      k.quad(N, top0, top1, N1, WOOD, WHITE, { facing: [0, -(z1 - z0) / 2, h] });
      k.quad(S, S1, top1, top0, WOOD, WHITE, { facing: [0, -(z1 - z0) / 2, -h] });
      for (const x of [x0, x1])
        k.quad([x, y, z0], [x, y, z1], [x, y + h, zm], [x, y + h, zm], ends, WHITE, {
          n: [x === x0 ? -1 : 1, 0, 0],
          both: true,
        });
      far.box([x0, y, z0, x1, y + h * 0.55, z1], PAINT, FAR_SLATE, { collide: false });
    }
    // Collision: a stepped block under the roof (nobody walks inside it).
    const steps = 4;
    for (let s = 0; s < steps; s++) {
      const f = s / steps,
        g = (s + 1) / steps;
      if (along === "z") {
        const w = ((x1 - x0) / 2) * (1 - f);
        const xm = (x0 + x1) / 2;
        k.box([xm - w, y + h * f, z0, xm + w, y + h * g, z1], m, WHITE, { visible: false });
      } else {
        const w = ((z1 - z0) / 2) * (1 - f);
        const zm = (z0 + z1) / 2;
        k.box([x0, y + h * f, zm - w, x1, y + h * g, zm + w], m, WHITE, { visible: false });
      }
    }
  };
  /** Loose stones (seeded), on y0. */
  const rubble = (cx, cz, r, count, seed, y0 = 0, m = STONE) => {
    const rnd = rng(seed);
    for (let i = 0; i < count; i++) {
      const a = rnd() * Math.PI * 2,
        d = Math.sqrt(rnd()) * r;
      const x = cx + Math.cos(a) * d,
        z = cz + Math.sin(a) * d;
      const w = 0.4 + rnd() * 0.8,
        h = 0.25 + rnd() * 0.45,
        dd = 0.35 + rnd() * 0.6;
      // (Drawn only: underfoot they would stop a walker, as kerbs too tall to step.)
      k.box([x - w / 2, y0, z - dd / 2, x + w / 2, y0 + h, z + dd / 2], m, WHITE, {
        skip: ["bottom"],
        lod: 0,
        collide: false,
      });
    }
  };
  return {
    k,
    far,
    mass,
    floor,
    flight,
    run,
    parapet,
    slit,
    ring,
    ringMerlons,
    roundSlit,
    disc,
    cone,
    gable,
    rubble,
  };
}

const publish = async (id, K, entry, foot) => {
  plan[id] = { foot, aprons: [] };
  if (only.length && !only.includes(id)) return;
  fs.writeFileSync(`art/br/procedural/${id}.entrances.json`, "[]\n");
  await publishTextured(id, K.k, K.far, {
    tag: TAG,
    source: "art/blender/br/build_fortress.mjs",
    textures:
      "Original work (procedural): art/blender/br/make_fortress_textures.py; cobble and wood: Poly Haven (CC0)",
    texture: 512,
    class: "building",
    ring: "building",
    ...entry,
  });
};

// ---------------------------------------------------------------- the base
// BASE m of masonry on the ledge: the courtyard on top (cobbles), and inside it two levels.
//  - The cellars (B1, floor 5): the keep's undercroft and a ring of galleries (north, south,
//    west under the great hall, east under the barracks), stairs up to the courtyard at the
//    keep, the hall, the barracks and two stair houses in the courtyard.
//  - The vaults (B2, floor 0, the ledge's level): the great vault (a pillared hall), the dungeon
//    (a corridor of ten cells, the torture room, the guard room), and three ways out: the west
//    postern (a tunnel to the west ledge), the sally port (a tunnel south under the south tower)
//    and the culvert (the secret way: a low drain north to the ditch).
export const FORT = {
  half: [86, 76],
  /** Court-level stair openings (fortress coordinates [x0, z0, x1, z1]): what stands on the
   *  courtyard leaves these open. */
  stairs: {
    keep: [-15.1, 4.9, -13.1, 10.7],
    ne: [37.9, -40.6, 39.9, -34.8],
    sw: [-40.1, 29.4, -38.1, 35.2],
    hall: [-70.1, -36.1, -68.1, -30.3],
    barracks: [68.1, -44.1, 70.1, -38.3],
  },
};
{
  const K = kit();
  const { k, mass, floor, flight } = K;
  const [HX, HZ] = FORT.half;
  const B1 = 5,
    B1T = 9.2;
  const cuts = [];
  const add = (...b) => cuts.push(...b);
  // B2: the great vault and the ways out.
  add([-22, 0, -34, 22, 4.4, 6]);
  add([-20.9, 0, -HZ - 0.1, -19.1, 2.2, -33.9]); // the culvert, to the ditch
  add([-HX - 0.1, 0, -31.5, -21.9, 2.8, -28.5]); // the west postern
  add([-1.5, 0, 5.9, 1.5, 3, 38.1]); // the vault to the dungeon
  add([-56, 0, 38, 56, 3.2, 41.5]); // the dungeon's corridor
  for (const c of [-50, -40, -30, -20, -10, 10, 20, 30, 40, 50]) {
    add([c - 3.5, 0, 42.5, c + 3.5, 3.2, 49]);
    add([c - 0.7, 0, 41.4, c + 0.7, 2.2, 42.6]);
  }
  add([-1.3, 0, 41.4, 1.3, 2.8, HZ + 0.1]); // the sally port, under the south tower
  add([-20, 0, 30, -7, 3.2, 37], [-14.2, 0, 36.9, -12.8, 2.2, 38.1]); // torture room
  add([7, 0, 30, 17.5, 3.2, 37], [11.3, 0, 36.9, 12.7, 2.2, 38.1]); // guard room
  // B1 ↔ B2: from the south gallery down to the dungeon; from the north gallery to the vault.
  add([19.9, 0, 29.4, 21.9, B1T, 35.5], [19.9, 0, 35.4, 21.9, 2.6, 38.1]);
  add([18.1, 0, -40.6, 20.1, B1T, -34]);
  // B1: the cellars.
  add([-15.4, B1, -2, 15, B1T, 18]); // the keep's undercroft
  add([-78, B1, 26, 78, B1T, 29.5]); // south gallery
  add([-78, B1, -44, -66, B1T, 29.5]); // west cellar (under the hall)
  add([66, B1, -44, 78, B1T, 29.5]); // east cellar (under the barracks)
  add([66, B1, -47.5, 72, B1T, -43.9]); // the barracks stair's foot (its flight ends at −44)
  add([-78, B1, -44, 78, B1T, -40.5]); // north gallery
  add([-1.6, B1, 17.9, 1.6, 8, 26.1], [-1.6, B1, -40.6, 1.6, 8, -1.9]);
  // The courtyard's stair openings (through the top).
  for (const s of Object.values(FORT.stairs)) add([s[0], B1, s[1], s[2], BASE + 0.1, s[3]]);
  mass([-HX, 0, -HZ, HX, BASE, HZ], cuts, { m: WALL, top: COBBLE });
  // The talus round the foot (cut where the tunnels come out).
  for (const p of carve(
    [-HX - 1, 0, -HZ - 1, HX + 1, 1.6, HZ + 1],
    [
      [-HX + 0.01, -1, -HZ + 0.01, HX - 0.01, 3, HZ - 0.01],
      [-20.9, -1, -HZ - 2, -19.1, 2.2, -HZ + 1],
      [-HX - 2, -1, -31.5, -HX + 1, 2.8, -28.5],
      [-1.3, -1, HZ - 1, 1.3, 2.8, HZ + 2],
    ],
  ))
    k.box(p, WALL, [0.9, 0.88, 0.84], { skip: ["bottom"] });
  // Pillars: the vault's and the undercroft's.
  for (const x of [-11, 0, 11])
    for (const z of [-24, -14, -4])
      k.box([x - 0.7, 0, z - 0.7, x + 0.7, 4.4, z + 0.7], STONE, WHITE, { lod: 0 });
  for (const x of [-6, 6])
    for (const z of [4, 12])
      k.box([x - 0.6, B1, z - 0.6, x + 0.6, B1T, z + 0.6], STONE, WHITE, { lod: 0 });
  // Floors (drawn): the vaults, the dungeon, the cellars.
  const holeOf = (s) => [s[0], s[1], s[2], s[3]];
  floor(-22, -34, 22, 6, 0.02, FLOOR, { collide: false });
  floor(-56, 38, 56, 41.5, 0.02, FLOOR, { collide: false });
  floor(-78, -44, 78, -40.5, B1 + 0.02, FLOOR, { collide: false, holes: [holeOf(FORT.stairs.ne)] });
  floor(66, -47.5, 72, -44, B1 + 0.02, FLOOR, { collide: false });
  floor(-78, 26, 78, 29.5, B1 + 0.02, FLOOR, { collide: false });
  floor(-15.4, -2, 15, 18, B1 + 0.02, FLOOR, { collide: false, holes: [holeOf(FORT.stairs.keep)] });
  // The stairs. Court → B1 (each foot on the cellar's floor, rising to the courtyard).
  {
    const s = FORT.stairs;
    // The keep's: down the undercroft's west side, its foot to the south.
    flight("z", s.keep[3] - 0.1, -1, s.keep[0] + 0.1, s.keep[2] - 0.1, B1, BASE - B1, { base: B1 });
    flight("z", s.ne[1] + 0.1, 1, s.ne[0] + 0.1, s.ne[2] - 0.1, B1, BASE - B1, { base: B1 });
    flight("z", s.sw[1] + 0.1, 1, s.sw[0] + 0.1, s.sw[2] - 0.1, B1, BASE - B1, { base: B1 });
    flight("z", s.hall[1] + 0.1, 1, s.hall[0] + 0.1, s.hall[2] - 0.1, B1, BASE - B1, { base: B1 });
    flight("z", s.barracks[1] + 0.1, 1, s.barracks[0] + 0.1, s.barracks[2] - 0.1, B1, BASE - B1, {
      base: B1,
    });
    // B1 → B2: the dungeon stair (its foot at the dungeon end) and the vault stair.
    flight("z", 35.5, -1, 19.9, 21.9, 0, B1, { base: 0 });
    k.box([19.9, 0, 29.4, 21.9, B1, 29.9], STONE, WHITE, { lod: 0 });
    flight("z", -34, -1, 18.1, 20.1, 0, B1, { base: 0 });
    k.box([18.1, 0, -40.6, 20.1, B1, -39.6], STONE, WHITE, { lod: 0 });
  }
  await publish(
    "fort-base",
    K,
    {
      title: "Old Fortress: the base",
      use: "Old Fortress: the masonry base the fortress stands on, the courtyard on top; the cellars (undercroft, galleries), the vaults (pillared hall, dungeon, torture and guard rooms) and the tunnels out (west postern, sally port, culvert) inside it (procedural, 2026-11-17)",
      size: [2 * HX + 2, BASE, 2 * HZ + 2],
    },
    [2 * HX + 2, 2 * HZ + 2],
  );
}

// ---------------------------------------------------------------- curtain walls
// A straight stretch, L long, along x, its outer face at z = +WT/2 (front +z), on the courtyard:
// 12 m of coursed rubble, the wall-walk on top behind a crenellated parapet (the outer side) and
// a low rail (the inner side). `stair`: the foot of a flight up its inner face to the walk (along
// +x). `gap`: a stretch of the parapet broken away (where the scaffold lands). `breach`: the wall
// broken down to a rubble crest CREST m over the courtyard, a rubble slope down inside.
const WT = 3.5,
  WH = 12,
  CREST = 4;
async function curtain(id, L, { stair = null, gap = null, breach = null } = {}) {
  const K = kit();
  const { k, mass, flight, parapet, slit, rubble } = K;
  const x0 = -L / 2,
    x1 = L / 2,
    z0 = -WT / 2,
    z1 = WT / 2;
  const cuts = [];
  if (breach) {
    // Jagged: the crest at CREST in the middle, rising stepwise to the wall's top at the ends.
    const [b0, b1] = breach;
    const rnd = rng(77);
    cuts.push([b0, CREST, z0 - 0.1, b1, WH + 3, z1 + 0.1]);
    for (let i = 0; i < 4; i++) {
      const w = 0.8 + rnd() * 1.4,
        h = CREST + 1.5 + i * 1.6 + rnd();
      cuts.push([b0 - (i + 1) * w, h, z0 - 0.1, b0, WH + 3, z1 + 0.1]);
      cuts.push([b1, h + rnd() * 0.8, z0 - 0.1, b1 + (i + 1) * w, WH + 3, z1 + 0.1]);
    }
  }
  mass([x0, 0, z0, x1, WH, z1], cuts, { m: WALL, top: FLOOR });
  // The parapet (outer) and the rail (inner), but not over the breach.
  const away = breach ? [[breach[0] - 7, breach[1] + 7]] : [];
  parapet("x", x0, x1, z1 - 0.6, z1, WH, { m: WALL, gaps: [...(gap ? [gap] : []), ...away] });
  const railGaps = [...away];
  if (stair !== null) railGaps.push([stair + K.run(WH) - 0.4, stair + K.run(WH) + 1.4]);
  for (const p of carve(
    [x0, WH, z0, x1, WH + 0.95, z0 + 0.3],
    railGaps.map(([a, b]) => [a, WH - 1, z0 - 1, b, WH + 3, z0 + 1]),
  ))
    k.box(p, WALL, WHITE);
  // Slits on the outer face every 6 m.
  for (let x = x0 + 4; x < x1 - 3; x += 6)
    if (!breach || x < breach[0] - 8 || x > breach[1] + 8) slit("z", z1, x, 5.5);
  if (stair !== null) {
    flight("x", stair, 1, z0 - 1.45, z0, 0, WH, { base: 0, m: WALL, lod: 1 });
  }
  if (breach) {
    // The rubble: from the crest down inside to the courtyard in steps.
    const [b0, b1] = breach;
    const n = Math.round(CREST / RISE);
    for (let s = 0; s < n; s++) {
      const za = z0 - s * 0.45;
      k.box(
        [b0 + 0.6, 0, za - 0.45, b1 - 0.6, CREST - (s + 1) * RISE + 0.01, za],
        WALL,
        [0.9, 0.88, 0.84],
        { skip: ["bottom"] },
      );
    }
    rubble((b0 + b1) / 2, z0 - 4, 4.5, 30, 81, 0, WALL);
    rubble((b0 + b1) / 2, 0, 3.5, 14, 82, CREST, WALL);
  }
  await publish(
    id,
    K,
    {
      title: `Old Fortress: curtain wall (${L} m${breach ? ", breached" : ""})`,
      use: `Old Fortress: a ${L} m stretch of the curtain wall, the wall-walk on top behind its crenellations${stair !== null ? ", a stair up its inner face" : ""}${gap ? ", the parapet broken where the scaffold lands" : ""}${breach ? ", broken down to a rubble crest (the east breach)" : ""} (procedural, 2026-11-17)`,
      size: [L, WH + 1.8, WT + (stair !== null ? 1.45 : 0) + (breach ? 7.2 : 0)],
    },
    [L, WT],
  );
}
await curtain("fort-wall-24", 24, { stair: -11 });
await curtain("fort-wall-28", 28);
await curtain("fort-wall-28s", 28, { stair: -12 });
await curtain("fort-wall-32", 32, { stair: -14 });
await curtain("fort-wall-32g", 32, { gap: [-4.2, -1.8] });
await curtain("fort-wall-42", 42);
await curtain("fort-wall-62", 62);
await curtain("fort-wall-62s", 62, { stair: -20 });
await curtain("fort-wall-breach", 26, { breach: [-4.5, 4.5] });

// ---------------------------------------------------------------- round corner towers
// At the base's corners (origin: the corner, on the ledge), three-quarters out over the ledge:
// a solid foot to the courtyard's level, then three storeys and the battlements on top. The door
// from the courtyard faces the courtyard (45° between +x and +z at turn 0); doors at the
// wall-walk's level (y = BASE + WH) open onto the walks along +x and +z. Stairs: a switchback of
// three flights round the room's south and west sides.
{
  const K = kit();
  const { k, ring, ringMerlons, roundSlit, disc, flight } = K;
  const R0 = 6.8,
    R1 = 9,
    N = 32;
  const F = [BASE, BASE + 6, BASE + 12, BASE + 18]; // 10, 16, 22, 28
  const WALK = BASE + WH; // 22
  ring(0, 0, R1 - 0.1, R1 + 0.6, 0, 1.6, N, { m: WALL }); // the talus
  // No top of its own (owner, 2026-11-18: "flicker_top_of_tower"): the roof's floor reaches
  // under the merlons' sill instead; the ring's top round its rim lay in the floor's plane,
  // overlapping its boards' corners, and the two fought along the parapet.
  ring(0, 0, R0, R1, 0, F[3], N, {
    m: STONE,
    top: false,
    open: [
      [0.6, 0.97, F[0], F[0] + 3.3],
      [0.0, 0.39, WALK, WALK + 3],
      [1.18, 1.571, WALK, WALK + 3],
    ],
  });
  ringMerlons(0, 0, R1 - 0.6, R1, F[3], N * 2);
  // The foot: solid up to the courtyard.
  disc(0, 0, R0 + 0.05, F[0], { m: FLOOR, thick: F[0], lod: 1 });
  const holeA = [-3.7, -4.7, 3.3, -3.3],
    holeB = [-4.7, -3.3, -3.3, 3.6],
    holeC = [-2.5, -4.7, 4.9, -3.3];
  disc(0, 0, R0 + 0.05, F[1], { m: WOOD, holes: [holeA] });
  disc(0, 0, R0 + 0.05, F[2], { m: WOOD, holes: [holeB] });
  disc(0, 0, R1 - 0.55, F[3], { m: FLOOR, holes: [holeC], lod: 1 });
  // Flights: A (10→16) along −x on the south side; B (16→22) along +z on the west side;
  // C (22→28) along +x over A's line, to the roof (its foot east of B's well, with room to turn
  // onto it from B's top round the well).
  flight("x", 3.2, -1, -4.6, -3.4, F[0], 6, { base: F[0] });
  flight("z", -3.2, 1, -4.6, -3.4, F[1], 6, { base: F[1] });
  flight("x", -2.0, 1, -4.6, -3.4, F[2], 6, { base: F[2], lod: 0 });
  // Rails round the roof's hatch and along the floors' holes (the side away from the flight's
  // top end).
  k.box([-2.5, F[3], -3.3, 3.4, F[3] + 1, -3.1], STONE, WHITE, { lod: 0 });
  k.box([-3.3, F[1], -3.3, 2.0, F[1] + 1, -3.1], WOOD, WHITE, { lod: 0 }); // clear of B's foot
  k.box([-3.3, F[2], -2.0, -3.1, F[2] + 1, 3.6], WOOD, WHITE, { lod: 0 });
  // Slits round the storeys (the courtyard's quarter has the door and the walls).
  for (const y of [F[1] + 1.6, F[2] + 1.6, F[3] - 3.6])
    for (let a = Math.PI * 0.62; a < Math.PI * 1.95; a += Math.PI / 4) roundSlit(0, 0, R1, a, y);
  for (let a = Math.PI * 0.75; a < Math.PI * 1.8; a += Math.PI / 3) roundSlit(0, 0, R1, a, 4);
  K.far.box([-R1, 0, -R1, R1, F[3] + 1.8, R1], PAINT, FAR_STONE, { collide: false });
  await publish(
    "fort-tower-round",
    K,
    {
      title: "Old Fortress: round corner tower",
      use: "Old Fortress: a round tower at a corner of the walls, three storeys over a solid foot, the battlements on top; doors to the courtyard and both wall-walks, a stair to the top (procedural, 2026-11-17)",
      size: [2 * R1 + 1.2, F[3] + 1.8, 2 * R1 + 1.2],
    },
    [2 * R1 + 1.2, 2 * R1 + 1.2],
  );
}

// ---------------------------------------------------------------- square flanking towers
// Astride the curtain wall (origin: on the base's face, on the ledge), 6 m out from the face and
// 8 m in, front +z: a solid foot to the courtyard, storeys at 10, 16 and 22 (the wall-walk's
// level: doors to the walks on both sides), the roof at 28 behind battlements. `sally`: the sally
// port runs through its foot.
async function squareTower(id, { sally = false } = {}) {
  const K = kit();
  const { k, mass, flight, parapet, slit } = K;
  const F = [BASE, BASE + 6, BASE + 12, BASE + 18];
  const WALK = BASE + WH;
  const cuts = [];
  for (const f of F.slice(0, 3)) cuts.push([-4.5, f, -6.5, 4.5, f + 5.6, 4.5]);
  cuts.push([-1.2, F[0], -8.1, 1.2, F[0] + 3.2, -6.4]); // to the courtyard
  cuts.push([4.4, WALK, -2.9, 6.1, WALK + 3, -0.6], [-6.1, WALK, -2.9, -4.4, WALK + 3, -0.6]); // to the walks
  cuts.push([2.9, F[1] - 0.5, -5.1, 4.5, F[1] + 0.1, 1.8]); // over A
  cuts.push([-3.6, F[2] - 0.5, -6.5, 3.3, F[2] + 0.1, -5.1]); // over B
  cuts.push([-3.3, F[3] - 0.5, 2.5, 3.6, F[3] + 0.1, 4.1]); // over C (the roof's hatch)
  if (sally) cuts.push([-1.3, 0, -8.1, 1.3, 2.8, 6.1]);
  // Windows: real loops (narrow) through the outer wall on the upper storeys.
  for (const f of [F[1], F[2]])
    for (const x of [-2.5, 2.5]) cuts.push([x - 0.2, f + 1.5, 4.4, x + 0.2, f + 3.3, 6.1]);
  mass([-6, 0, -8, 6, F[3], 6], cuts, { m: STONE, top: FLOOR });
  for (const p of carve([-6.6, 0, -8, 6.6, 1.6, 6.6], sally ? [[-1.3, -1, -9, 1.3, 2.8, 7]] : []))
    K.k.box(p, WALL, [0.9, 0.88, 0.84], { skip: ["bottom"], lod: 1 });
  parapet("x", -6, 6, 5.4, 6, F[3], {});
  parapet("x", -6, 6, -8, -7.4, F[3], {});
  parapet("z", -7.4, 5.4, -6, -5.4, F[3], {});
  parapet("z", -7.4, 5.4, 5.4, 6, F[3], {});
  // Flights.
  flight("z", -5, 1, 3.0, 4.4, F[0], 6, { base: F[0] });
  flight("x", 3.2, -1, -6.4, -5.2, F[1], 6, { base: F[1] });
  flight("x", -3.2, 1, 2.6, 4.0, F[2], 6, { base: F[2] });
  // Floors (drawn): wood on the storeys, stone on the ground and the roof.
  K.floor(-4.5, -6.5, 4.5, 4.5, F[0] + 0.02, FLOOR, { collide: false });
  K.floor(-4.5, -6.5, 4.5, 4.5, F[1] + 0.02, WOOD, {
    collide: false,
    holes: [[2.9, -5.1, 4.5, 1.8]],
  });
  K.floor(-4.5, -6.5, 4.5, 4.5, F[2] + 0.02, WOOD, {
    collide: false,
    holes: [[-3.6, -6.5, 3.3, -5.1]],
  });
  // Rails by the holes.
  k.box([2.7, F[1], -3.8, 2.9, F[1] + 1, 1.8], WOOD, WHITE, { lod: 0 });
  k.box([-2.4, F[2], -5.1, 3.3, F[2] + 1, -4.9], WOOD, WHITE, { lod: 0 });
  k.box([-3.3, F[3], 2.3, 2.3, F[3] + 1, 2.5], STONE, WHITE, { lod: 0 });
  for (const x of [-3.5, 0, 3.5]) slit("z", 6, x, 4.5);
  for (const z of [-5, 0, 4])
    for (const ax of [-6, 6]) slit("x", ax, z, F[3] - 3.6, { out: Math.sign(ax) });
  await publish(
    id,
    K,
    {
      title: `Old Fortress: square tower${sally ? " (sally port)" : ""}`,
      use: `Old Fortress: a square tower astride the curtain wall, three storeys over a solid foot, the roof behind battlements; doors to the courtyard and both wall-walks, a stair to the roof${sally ? "; the sally port's tunnel through its foot" : ""} (procedural, 2026-11-17)`,
      size: [13.2, F[3] + 1.8, 14.6],
    },
    [13.2, 14.6],
  );
}
await squareTower("fort-tower-square");
await squareTower("fort-tower-sally", { sally: true });

// ---------------------------------------------------------------- the gatehouse
// On the north face (origin: the face's middle, on the ditch's floor; front +z, turned to the
// north): two drum towers on the ditch with slate cones, the gate passage between them at the
// courtyard's level (the bridge lands at its mouth), the block behind over the passage: the
// guard room beside it, the murder room over it, the upper room at the walks' level (doors to
// both), the roof behind battlements.
{
  const K = kit();
  const { k, mass, flight, ring, disc, cone, parapet, slit, roundSlit } = K;
  const F = [BASE, BASE + 6, BASE + 12, BASE + 18];
  const WALK = BASE + WH;
  const PW = 2.6;
  // The drums.
  for (const sx of [-1, 1]) {
    const cx = sx * 9.5,
      cz = 2.5;
    // Only the drum's front: its back half stands inside the block behind (and the base), where
    // it would cut across the guard room and its stair's foot.
    const front = (r) => (i) =>
      cz + Math.sin(((i + 0.5) * 2 * Math.PI) / 24) * r - r * Math.sin(Math.PI / 24) > -0.6;
    ring(cx, cz, 4.6, 5.5, 0, F[3] + 2, 24, { m: STONE, only: front(5.5) });
    ring(cx, cz, 5.4, 6.1, 0, 1.6, 24, { m: WALL, only: front(6.1) });
    disc(cx, cz, 4.65, F[3] + 2, {
      m: STONE,
      thick: F[3] + 2,
      lod: 1,
      holes: [[cx - 6, cz - 6, cx + 6, 0]],
    });
    ring(cx, cz, 5.5, 5.9, F[3] + 1.4, F[3] + 2, 24, { m: STONE, only: front(5.9) }); // a corbel course
    cone(cx, cz, 6.3, F[3] + 2, 7.5, 24);
    for (const y of [5, F[1] + 2, F[2] + 2])
      for (const a of [0.2, 0.9, 1.6, 2.4])
        roundSlit(cx, cz, 5.5, sx > 0 ? a - 0.6 : Math.PI - a + 0.6, y);
  }
  // The gate's front between the drums and the block behind.
  const cuts = [];
  cuts.push([-PW, F[0], -14.1, PW, F[0] + 5.2, 6.4]); // the passage
  cuts.push(
    [-2.0, F[0] + 5.2, -14.1, 2.0, F[0] + 5.6, 6.4],
    [-1.2, F[0] + 5.6, -14.1, 1.2, F[0] + 5.9, 6.4],
  );
  // The guard room (east of the passage) and its stair hall; the murder room and the upper room.
  cuts.push([3.6, F[0], -12.5, 12.5, F[0] + 5.6, -1.5]);
  cuts.push([8.8, F[0], -14.1, 11, F[0] + 3.2, -12.4]); // its door from the courtyard
  cuts.push([-12.5, F[1], -12.5, 12.5, F[1] + 5.6, -1.5]);
  cuts.push([-12.5, F[2], -12.5, 12.5, F[2] + 5.6, -1.5]);
  cuts.push([12.4, WALK, -2.9, 14.1, WALK + 3, -0.6], [-14.1, WALK, -2.9, -12.4, WALK + 3, -0.6]);
  // Stair holes (a switchback in the east end: A and C along −z, B along +z).
  cuts.push([10.5, F[1] - 0.5, -10, 12.3, F[1] + 0.1, -2.8]);
  cuts.push([8.5, F[2] - 0.5, -10, 10.3, F[2] + 0.1, -2.8]);
  cuts.push([10.5, F[3] - 0.5, -10, 12.3, F[3] + 0.1, -2.8]);
  // Windows over the gate (the murder room's loops) and on the courtyard side.
  for (const x of [-1.5, 1.5]) cuts.push([x - 0.25, F[1] + 1.4, 3, x + 0.25, F[1] + 3.6, 6.4]);
  for (const x of [-8, -4, 4, 8])
    cuts.push([x - 0.6, F[2] + 1.4, -14.1, x + 0.6, F[2] + 3.6, -12.4]);
  mass([-14, F[0], -14, 14, F[3], 0], cuts, { m: STONE, top: FLOOR });
  mass([-5.6, 0, 0, 5.6, F[3], 6.3], cuts, { m: STONE, top: FLOOR });
  // The portcullis, raised in its slot: its spiked foot hangs a metre below the passage's roof
  // (drawn only; well over a head).
  for (let x = -PW + 0.25; x < PW - 0.1; x += 0.42)
    k.box([x - 0.05, F[0] + 4.3, 3.67, x + 0.05, F[0] + 5.19, 3.83], PAINT, DARK, {
      lod: 0,
      collide: false,
    });
  k.box([-PW, F[0] + 4.55, 3.66, PW, F[0] + 4.67, 3.84], PAINT, DARK, { lod: 0, collide: false });
  // The portcullis's slot (a dark band across the passage's roof) and the murder holes.
  k.quad(
    [-PW, F[0] + 5.19, 3.6],
    [PW, F[0] + 5.19, 3.6],
    [PW, F[0] + 5.19, 3.9],
    [-PW, F[0] + 5.19, 3.9],
    PAINT,
    DARK,
    { n: [0, 1, 0], facing: [0, -1, 0], lod: 0 },
  );
  for (const z of [-4, -8])
    k.quad(
      [-0.4, F[0] + 5.19, z - 0.4],
      [0.4, F[0] + 5.19, z - 0.4],
      [0.4, F[0] + 5.19, z + 0.4],
      [-0.4, F[0] + 5.19, z + 0.4],
      PAINT,
      DARK,
      { n: [0, 1, 0], facing: [0, -1, 0], lod: 0 },
    );
  // The passage's floor (flagstones over the courtyard level) and the rooms' floors.
  K.floor(-PW, -14, PW, 6.3, F[0] + 0.02, FLOOR, { collide: false });
  K.floor(3.6, -12.5, 12.5, -1.5, F[0] + 0.02, FLOOR, { collide: false });
  K.floor(-12.5, -12.5, 12.5, -1.5, F[1] + 0.02, WOOD, {
    collide: false,
    holes: [[10.5, -10, 12.3, -2.8]],
  });
  K.floor(-12.5, -12.5, 12.5, -1.5, F[2] + 0.02, WOOD, {
    collide: false,
    holes: [[8.5, -10, 10.3, -2.8]],
  });
  // Flights: A (10→16) east lane along −z; B (16→22) inner lane along +z; C (22→28) east lane.
  flight("z", -2.9, -1, 10.6, 12.2, F[0], 6, { base: F[0] });
  flight("z", -9.7, 1, 8.6, 10.2, F[1], 6, { base: F[1] });
  flight("z", -2.9, -1, 10.6, 12.2, F[2], 6, { base: F[2] });
  k.box([10.3, F[1], -8.4, 10.5, F[1] + 1, -2.8], WOOD, WHITE, { lod: 0 });
  k.box([8.3, F[2], -8.6, 8.5, F[2] + 1, -2.8], WOOD, WHITE, { lod: 0 });
  k.box([10.3, F[3], -8.4, 10.5, F[3] + 1, -2.8], STONE, WHITE, { lod: 0 });
  parapet("x", -14, 14, -14, -13.4, F[3], {});
  parapet("x", -5.6, 5.6, 5.7, 6.3, F[3], {});
  parapet("z", -13.4, 0, -14, -13.4, F[3], {});
  parapet("z", -13.4, 0, 13.4, 14, F[3], {});
  for (const x of [-4.4, 4.4]) slit("z", 6.3, x, F[1] + 1.5);
  await publish(
    "fort-gatehouse",
    K,
    {
      title: "Old Fortress: gatehouse",
      use: "Old Fortress: the gatehouse over the ditch, two drum towers with slate cones, the gate passage, the guard room, the murder room over the passage, the upper room at the walks' level and the roof (procedural, 2026-11-17)",
      size: [31.2, F[3] + 9.5, 22.4],
    },
    [31.2, 22.4],
  );
}

// ---------------------------------------------------------------- the keep
// In the courtyard's middle (origin: its centre, fortress (0, 8), on the courtyard), 34 × 28 m:
// four storeys of 6 m and the roof behind battlements, a turret at each corner with a slate
// cone. Doors north and south. A switchback stair up the east side (east lane and inner lane
// in turn) from the ground to the roof; the stair down to the undercroft on the west side (in the
// base). Arched windows on the hall storey and the chambers above, loops elsewhere.
export const KEEP = { at: [0, 8], half: [17, 14] };
{
  const K = kit();
  const { k, mass, flight, parapet, slit, ring, disc, cone } = K;
  const [HX, HZ] = KEEP.half;
  const T = 2;
  const S = 6;
  const F = [0, S, 2 * S, 3 * S, 4 * S]; // 0 6 12 18, roof 24
  const ix = HX - T,
    iz = HZ - T;
  const east = [13.2, 15],
    inner = [11.2, 13];
  const cuts = [];
  for (let i = 0; i < 4; i++) cuts.push([-ix, F[i], -iz, ix, F[i] + S - 0.4, iz]);
  cuts.push([-1.8, 0, -HZ - 0.1, 1.8, 4.2, -iz + 0.1], [-1.8, 0, iz - 0.1, 1.8, 4.2, HZ + 0.1]);
  // Stair holes: the floor over each flight (east lane at 6 and 18, inner lane at 12 and the roof).
  const hole = (lane, f) => [lane[0] - 0.1, f - 0.5, -2.8, lane[1] + 0.1, f + 0.1, 4.1];
  cuts.push(hole(east, F[1]), hole(inner, F[2]), hole(east, F[3]), hole(inner, F[4]));
  // Windows: the hall (6) and the chambers (12) arched, loops on the ground and the top storey.
  for (const f of [F[1], F[2]]) {
    const h = f === F[1] ? 3.2 : 2.4;
    for (const x of [-10, -5, 5]) {
      cuts.push([x - 0.7, f + 1.4, -HZ - 0.1, x + 0.7, f + 1.4 + h, -iz + 0.1]);
      cuts.push([x - 0.7, f + 1.4, iz - 0.1, x + 0.7, f + 1.4 + h, HZ + 0.1]);
    }
    for (const z of [-7, 0, 7])
      cuts.push([-HX - 0.1, f + 1.4, z - 0.7, -ix + 0.1, f + 1.4 + h, z + 0.7]);
    for (const z of [-7]) cuts.push([ix - 0.1, f + 1.4, z - 0.7, HX + 0.1, f + 1.4 + h, z + 0.7]);
  }
  for (const f of [F[0], F[3]]) {
    for (const x of [-10, -5, 5, 10]) {
      cuts.push([x - 0.2, f + 1.6, -HZ - 0.1, x + 0.2, f + 3.6, -iz + 0.1]);
      cuts.push([x - 0.2, f + 1.6, iz - 0.1, x + 0.2, f + 3.6, HZ + 0.1]);
    }
    for (const z of [-7, 0, 7])
      cuts.push([-HX - 0.1, f + 1.6, z - 0.2, -ix + 0.1, f + 3.6, z + 0.2]);
  }
  mass([-HX, 0, -HZ, HX, F[4], HZ], cuts, { m: STONE, top: FLOOR });
  // A plinth course and a string course at each floor (drawn).
  // Round the outside only, open at the doors (owner, 2026-11-18: "floor_issue_fort"): one box
  // under the whole keep, it stood a metre high across both doorways and over the ground floor.
  for (const p of carve(
    [-HX - 0.3, 0, -HZ - 0.3, HX + 0.3, 1.0, HZ + 0.3],
    [
      [-HX + 0.05, -1, -HZ + 0.05, HX - 0.05, 2, HZ - 0.05],
      // (Out through the plinth's 0.3 m too.)
      ...cuts.filter((c) => c[1] < 1).map((c) => [c[0], c[1], c[2] - 0.4, c[3], c[4], c[5] + 0.4]),
    ],
  ))
    k.box(p, STONE, [0.9, 0.88, 0.84], { skip: ["bottom"], collide: false });
  for (const f of [F[1], F[2], F[3]])
    for (const p of carve([-HX - 0.12, f - 0.3, -HZ - 0.12, HX + 0.12, f, HZ + 0.12], cuts))
      k.box(p, STONE, [0.95, 0.93, 0.9], { collide: false, skip: ["bottom"] });
  // The battlements, and the corner turrets with their cones.
  parapet("x", -HX + 2.6, HX - 2.6, -HZ, -HZ + 0.6, F[4]);
  parapet("x", -HX + 2.6, HX - 2.6, HZ - 0.6, HZ, F[4]);
  parapet("z", -HZ + 2.6, HZ - 2.6, -HX, -HX + 0.6, F[4]);
  parapet("z", -HZ + 2.6, HZ - 2.6, HX - 0.6, HX, F[4]);
  for (const [cx, cz] of [
    [-HX, -HZ],
    [HX, -HZ],
    [-HX, HZ],
    [HX, HZ],
  ]) {
    ring(cx, cz, 2.6, 3.2, F[3] + 1, F[4] + 6, 16, { m: STONE });
    // Down to the ground (owner, 2026-11-18: "did you forget to properly build the corner towers
    // buttom?"): below the top storey, the round of the turret that stands out of the keep's
    // corner (inside its walls the keep's own masonry), on a plinth like the keep's.
    const out = (i) => {
      const a = ((i + 0.5) * 2 * Math.PI) / 16;
      const x = cx + Math.cos(a) * 2.9,
        z = cz + Math.sin(a) * 2.9;
      return Math.abs(x) > HX - 0.05 || Math.abs(z) > HZ - 0.05;
    };
    ring(cx, cz, 2.6, 3.2, 0, F[3] + 1, 16, { m: STONE, only: out });
    ring(cx, cz, 3.15, 3.5, 0, 1.0, 16, { m: STONE, only: out });
    disc(cx, cz, 2.65, F[4] + 6, { m: STONE, thick: 7, lod: 1 });
    ring(cx, cz, 3.1, 3.5, F[4] + 5.4, F[4] + 6, 16, { m: STONE });
    cone(cx, cz, 3.7, F[4] + 6, 6.5, 16);
  }
  // Floors (drawn), the stair down's opening left on the ground floor.
  const down = [-15.1, -3.1, -13.1, 2.7];
  K.floor(-ix, -iz, ix, iz, 0.02, FLOOR, { collide: false, holes: [down] });
  K.floor(-ix, -iz, ix, iz, F[1] + 0.02, WOOD, {
    collide: false,
    holes: [[east[0] - 0.1, -2.8, east[1] + 0.1, 4.1]],
  });
  K.floor(-ix, -iz, ix, iz, F[2] + 0.02, WOOD, {
    collide: false,
    holes: [[inner[0] - 0.1, -2.8, inner[1] + 0.1, 4.1]],
  });
  K.floor(-ix, -iz, ix, iz, F[3] + 0.02, WOOD, {
    collide: false,
    holes: [[east[0] - 0.1, -2.8, east[1] + 0.1, 4.1]],
  });
  // Rails round the stair down (the undercroft's flight) and beside the holes.
  k.box([-15, 0, 2.7, -13, 1, 2.9], STONE, WHITE, { lod: 0 });
  k.box([-13.1, 0, -2.0, -12.9, 1, 2.9], STONE, WHITE, { lod: 0 });
  for (const f of [F[1], F[3]]) k.box([13.0, f, -1.5, 13.15, f + 1, 4.1], WOOD, WHITE, { lod: 0 });
  for (const f of [F[2], F[4]]) {
    k.box([10.95, f, -2.8, 11.1, f + 1, 2.8], f === F[4] ? STONE : WOOD, WHITE, { lod: 0 });
    k.box([13.0, f, -2.8, 13.15, f + 1, 2.8], f === F[4] ? STONE : WOOD, WHITE, { lod: 0 });
  }
  // The flights: east lane along −z (foot at z 4), inner lane along +z (foot at z −2.72).
  for (let i = 0; i < 4; i++) {
    const lane = i % 2 === 0 ? east : inner;
    const foot = i % 2 === 0 ? 4 : 4 - K.run(S);
    flight("z", foot, i % 2 === 0 ? -1 : 1, lane[0], lane[1], F[i], S, { base: F[i] });
  }
  // The second storey's chambers: a cross wall with doorways (x = 0).
  for (const p of carve(
    [-0.3, F[2], -iz, 0.3, F[2] + S - 0.4, iz],
    [
      [-1, F[2], -6, 1, F[2] + 2.6, -4],
      [-1, F[2], 4, 1, F[2] + 2.6, 6],
    ],
  ))
    k.box(p, STONE, WHITE, { lod: 0 });
  // The hall's hearth (west wall, the hall storey): a hood and a firebox.
  k.box([-ix, F[1], -2, -ix + 1.2, F[1] + 1.2, 2], STONE, WHITE, { lod: 0 });
  k.box([-ix, F[1] + 2.2, -2.4, -ix + 1.5, F[1] + 4.6, 2.4], STONE, WHITE, { lod: 0 });
  k.quad(
    [-ix + 0.01, F[1] + 0.2, -1.6],
    [-ix + 0.01, F[1] + 0.2, 1.6],
    [-ix + 0.01, F[1] + 1.15, 1.6],
    [-ix + 0.01, F[1] + 1.15, -1.6],
    PAINT,
    DARK,
    { n: [1, 0, 0], lod: 0 },
  );
  for (const x of [-12, -6, 6, 12]) slit("z", -HZ, x, F[4] - 3.6, { out: -1 });
  await publish(
    "fort-keep",
    K,
    {
      title: "Old Fortress: keep",
      use: "Old Fortress: the keep, four storeys (the great chamber, the hall with its hearth, the chambers, the top storey) and the roof behind battlements, corner turrets with slate cones; a stair from the ground to the roof, the stair down to the undercroft (procedural, 2026-11-17)",
      size: [2 * HX + 1.4, F[4] + 12.5, 2 * HZ + 1.4],
    },
    [2 * HX, 2 * HZ],
  );
}

// ---------------------------------------------------------------- the great hall
// Against the west wall (origin fortress (−74.25, −38), on the courtyard), 16.5 × 48 m: one tall
// hall under a slate roof, a timber gallery along its back wall (a stair at the south end), two
// doors and tall windows to the courtyard, the stair down to the west cellar.
{
  const K = kit();
  const { k, mass, flight, gable, slit } = K;
  const HX = 8.25,
    HZ = 24,
    T = 1.2,
    H = 10;
  const cuts = [[-HX + T, 0, -HZ + T, HX - T, H + 0.1, HZ - T]];
  for (const z of [-10, 10]) cuts.push([HX - T - 0.1, 0, z - 1.5, HX + 0.1, 4.2, z + 1.5]);
  for (const z of [-19, -4, 4, 19]) cuts.push([HX - T - 0.1, 3.4, z - 0.8, HX + 0.1, 7.8, z + 0.8]);
  for (const x of [-3, 3]) {
    cuts.push([x - 0.6, 5, -HZ - 0.1, x + 0.6, 8.2, -HZ + T + 0.1]);
    cuts.push([x - 0.6, 5, HZ - T - 0.1, x + 0.6, 8.2, HZ + 0.1]);
  }
  mass([-HX, 0, -HZ, HX, H, HZ], cuts, { m: STONE });
  gable(-HX, -HZ, HX, HZ, H, 5.5, "z");
  // A boarded ceiling under the roof (its sloped underside reads black from inside).
  k.box([-HX + T, H - 0.25, -HZ + T, HX - T, H, HZ - T], WOOD, WHITE, {
    lod: 0,
    collide: false,
    skip: ["top"],
  });
  // The floor (drawn), the cellar stair's opening, its rails.
  const st = [4.15, 1.9, 6.15, 7.7];
  K.floor(-HX + T, -HZ + T, HX - T, HZ - T, 0.02, FLOOR, { collide: false, holes: [st] });
  k.box([3.95, 0, 1.9, 4.15, 1, 7.7], STONE, WHITE, { lod: 0 });
  k.box([6.15, 0, 1.9, 6.35, 1, 7.7], STONE, WHITE, { lod: 0 });
  k.box([3.95, 0, 1.7, 6.35, 1, 1.9], STONE, WHITE, { lod: 0 });
  // The gallery: a timber floor on posts along the west wall, its rail, its stair (south end).
  const GX = -HX + T,
    GW = 2.6,
    GY = 4.5;
  k.box([GX, GY - 0.25, -HZ + T, GX + GW, GY, HZ - T], WOOD, WHITE, { lod: 0 });
  for (let z = -HZ + T + 2; z < HZ - T; z += 4.5)
    k.box([GX + GW - 0.3, 0, z - 0.15, GX + GW, GY - 0.25, z + 0.15], WOOD, WHITE, { lod: 0 });
  for (const p of carve(
    [GX + GW - 0.1, GY, -HZ + T, GX + GW, GY + 1, HZ - T],
    [[GX, GY - 1, 17.5, GX + GW + 1, GY + 3, 20.5]],
  ))
    k.box(p, WOOD, WHITE, { lod: 0 });
  flight("z", 13.6, 1, GX + GW + 0.1, GX + GW + 1.5, 0, GY, { base: 0, m: WOOD });
  // The hearth on the north wall, long tables' dais at the south end.
  k.box([-2.5, 0, -HZ + T, 2.5, 1.2, -HZ + T + 1.2], STONE, WHITE, { lod: 0 });
  k.box([-3, 2.4, -HZ + T, 3, 6.5, -HZ + T + 1.6], STONE, WHITE, { lod: 0 });
  k.quad(
    [-2.1, 0.2, -HZ + T + 0.01],
    [2.1, 0.2, -HZ + T + 0.01],
    [2.1, 1.15, -HZ + T + 0.01],
    [-2.1, 1.15, -HZ + T + 0.01],
    PAINT,
    DARK,
    { n: [0, 0, 1], lod: 0 },
  );
  k.box([-HX + T + 3, 0, HZ - T - 5, HX - T, 0.3, HZ - T], WOOD, WHITE, { lod: 0 }); // one step up
  await publish(
    "fort-hall",
    K,
    {
      title: "Old Fortress: great hall",
      use: "Old Fortress: the great hall against the west wall, a tall hall under a slate roof, its hearth, the dais and a timber gallery, the stair down to the west cellar (procedural, 2026-11-17)",
      ring: "building",
      size: [2 * HX + 0.8, H + 5.5, 2 * HZ + 0.8],
    },
    [2 * HX, 2 * HZ],
  );
}

// ---------------------------------------------------------------- the barracks
// Against the east wall (origin fortress (74.25, −46)), 16.5 × 36 m: two storeys and a roof
// behind a low crenellated parapet; partitions into three rooms a storey, stairs at both ends
// (up to the first storey in the south, to the roof in the north), the stair down to the east
// cellar.
{
  const K = kit();
  const { k, mass, flight, parapet } = K;
  const HX = 8.25,
    HZ = 18,
    T = 1;
  const F = [0, 5, 10];
  const cuts = [];
  for (const f of [F[0], F[1]]) cuts.push([-HX + T, f, -HZ + T, HX - T, f + 4.6, HZ - T]);
  for (const z of [-11, 0, 11]) cuts.push([-HX - 0.1, 0, z - 1.2, -HX + T + 0.1, 3.2, z + 1.2]);
  for (const f of [F[0], F[1]])
    for (const z of [-14, -6, 6, 14])
      cuts.push([-HX - 0.1, f + 1.4, z - 0.6, -HX + T + 0.1, f + 3.2, z + 0.6]);
  cuts.push([-7.3, F[1] - 0.5, 10.9, -5.7, F[1] + 0.1, 16.8]); // over the south stair
  cuts.push([-7.3, F[2] - 0.5, -16.8, -5.7, F[2] + 0.1, -10.9]); // the roof's hatch
  mass([-HX, 0, -HZ, HX, F[2], HZ], cuts, { m: STONE, top: FLOOR });
  parapet("x", -HX, HX, -HZ, -HZ + 0.5, F[2], { h: 1.4, sill: 0.9 });
  parapet("x", -HX, HX, HZ - 0.5, HZ, F[2], { h: 1.4, sill: 0.9 });
  parapet("z", -HZ + 0.5, HZ - 0.5, -HX, -HX + 0.5, F[2], { h: 1.4, sill: 0.9 });
  // Partitions (doorways in the middle).
  for (const f of [F[0], F[1]])
    for (const z of [-9, 1.5])
      for (const p of carve(
        [-HX + T, f, z - 0.15, HX - T, f + 4.6, z + 0.15],
        [[-1, f, z - 1, 1, f + 2.4, z + 1]],
      ))
        k.box(p, STONE, WHITE, { lod: 0 });
  flight("z", 11, 1, -7.2, -5.8, F[0], 5, { base: F[0] });
  flight("z", -11, -1, -7.2, -5.8, F[1], 5, { base: F[1] });
  k.box([-5.7, F[1], 10.9, -5.5, F[1] + 1, 15.5], STONE, WHITE, { lod: 0 });
  k.box([-5.7, F[2], -15.5, -5.5, F[2] + 1, -10.9], STONE, WHITE, { lod: 0 });
  const st = [-6.15, 1.9, -4.15, 7.7];
  K.floor(-HX + T, -HZ + T, HX - T, HZ - T, 0.02, FLOOR, { collide: false, holes: [st] });
  K.floor(-HX + T, -HZ + T, HX - T, HZ - T, F[1] + 0.02, WOOD, {
    collide: false,
    holes: [[-7.3, 10.9, -5.7, 16.8]],
  });
  k.box([-6.35, 0, 1.9, -6.15, 1, 7.7], STONE, WHITE, { lod: 0 });
  k.box([-4.15, 0, 1.9, -3.95, 1, 7.7], STONE, WHITE, { lod: 0 });
  k.box([-6.35, 0, 1.7, -3.95, 1, 1.9], STONE, WHITE, { lod: 0 });
  await publish(
    "fort-barracks",
    K,
    {
      title: "Old Fortress: barracks",
      use: "Old Fortress: the barracks against the east wall, two storeys of rooms and the roof behind a parapet, stairs at both ends, the stair down to the east cellar (procedural, 2026-11-17)",
      size: [2 * HX, F[2] + 1.4, 2 * HZ],
    },
    [2 * HX, 2 * HZ],
  );
}

// ---------------------------------------------------------------- the chapel and its bell tower
// South-east of the keep (origin fortress (48, 52)): a nave of 12 × 22 m under a slate roof, its
// door to the courtyard (north), lancet windows; the bell tower on its north-west corner, 8 × 8 m:
// a switchback of five flights to the belfry (open arches on every side) at 20 m, a slate spire.
{
  const K = kit();
  const { k, mass, flight, gable, cone } = K;
  const NX = 6,
    NZ = 11,
    T = 1,
    H = 9;
  const cuts = [[-NX + T, 0, -NZ + T, NX - T, H + 0.1, NZ - T]];
  cuts.push([-1.4, 0, -NZ - 0.1, 1.4, 4, -NZ + T + 0.1]);
  for (const z of [-5, 0, 5])
    for (const sx of [-1, 1])
      cuts.push(
        sx > 0
          ? [NX - T - 0.1, 3, z - 0.35, NX + 0.1, 7.2, z + 0.35]
          : [-NX - 0.1, 3, z - 0.35, -NX + T + 0.1, 7.2, z + 0.35],
      );
  cuts.push([-0.5, 3, NZ - T - 0.1, 0.5, 7.8, NZ + 0.1]);
  mass([-NX, 0, -NZ, NX, H, NZ], cuts, { m: STONE });
  gable(-NX, -NZ, NX, NZ, H, 5, "z");
  k.box([-NX + T, H - 0.25, -NZ + T, NX - T, H, NZ - T], WOOD, WHITE, {
    lod: 0,
    collide: false,
    skip: ["top"],
  });
  K.floor(-NX + T, -NZ + T, NX - T, NZ - T, 0.02, FLOOR, { collide: false });
  // The altar and its step; benches (stone) down the nave.
  k.box([-NX + T, 0, NZ - T - 3, NX - T, 0.3, NZ - T], STONE, WHITE, { lod: 0 });
  k.box([-1.4, 0.3, NZ - T - 1.6, 1.4, 1.3, NZ - T - 0.8], STONE, WHITE, { lod: 0 });
  for (let z = -6; z < 4; z += 2.2)
    for (const sx of [-1, 1])
      k.box(
        sx < 0
          ? [-NX + T + 0.4, 0, z, -0.8, 0.45, z + 0.5]
          : [0.8, 0, z, NX - T - 0.4, 0.45, z + 0.5],
        WOOD,
        WHITE,
        { lod: 0 },
      );
  // The bell tower: x −14..−6, z −11..−3.
  const BX0 = -14,
    BX1 = -6,
    BZ0 = -11,
    BZ1 = -3,
    BT = 1;
  const L = [0, 4, 8, 12, 16, 20];
  const lanes = [
    [BX0 + BT, BX0 + BT + 1.2],
    [BX1 - BT - 1.2, BX1 - BT],
  ];
  const tcuts = [[BX0 + BT, 0, BZ0 + BT, BX1 - BT, 24.1, BZ1 - BT]];
  tcuts.push([-11, 0, BZ0 - 0.1, -9, 3.2, BZ0 + BT + 0.1]); // the door
  // The belfry's arches.
  for (const c of [-12, -8]) {
    tcuts.push([c - 0.8, 20.6, BZ0 - 0.1, c + 0.8, 23.4, BZ0 + BT + 0.1]);
    tcuts.push([c - 0.8, 20.6, BZ1 - BT - 0.1, c + 0.8, 23.4, BZ1 + 0.1]);
  }
  for (const c of [-9, -5]) {
    tcuts.push([BX0 - 0.1, 20.6, c - 0.8, BX0 + BT + 0.1, 23.4, c + 0.8]);
    tcuts.push([BX1 - BT - 0.1, 20.6, c - 0.8, BX1 + 0.1, 23.4, c + 0.8]);
  }
  for (const y of [6, 10, 14]) tcuts.push([BX0 - 0.1, y, -7.2, BX0 + BT + 0.1, y + 1.6, -6.8]);
  mass([BX0, 0, BZ0, BX1, 24, BZ1], tcuts, { m: STONE });
  K.k.box([BX0 - 0.2, 23.6, BZ0 - 0.2, BX1 + 0.2, 24.2, BZ1 + 0.2], STONE, WHITE, {
    collide: false,
  });
  cone((BX0 + BX1) / 2, (BZ0 + BZ1) / 2, 6.2, 24.2, 7.5, 4, { phase: Math.PI / 4 });
  // Floors with holes over each flight (lane 0 along +z from z −9.6; lane 1 along −z from −4.4).
  const ix0 = BX0 + BT,
    ix1 = BX1 - BT,
    iz0 = BZ0 + BT,
    iz1 = BZ1 - BT;
  // Steep (a bell tower's), so each flight leaves a metre to stand at its foot and its top.
  const BTREAD = 0.25;
  const run = K.run(4, BTREAD);
  for (let i = 0; i < 5; i++) {
    const lane = lanes[i % 2];
    const foot = i % 2 === 0 ? iz0 + 1 : iz1 - 1;
    const dir = i % 2 === 0 ? 1 : -1;
    flight("z", foot, dir, lane[0], lane[1], L[i], 4, { base: L[i], tread: BTREAD });
    const z0 = Math.min(foot, foot + dir * run) - 0.1,
      z1 = Math.max(foot, foot + dir * run) + 0.1;
    const f = L[i + 1];
    const holes = [[lane[0] - 0.1, z0, lane[1] + 0.1, z1]];
    for (const p of carve(
      [ix0, f - 0.3, iz0, ix1, f, iz1],
      holes.map((h) => [h[0], f - 1, h[1], h[2], f + 1, h[3]]),
    ))
      k.box(p, f === 20 ? STONE : WOOD, WHITE, { lod: 0 });
    // A rail along the hole's inner side (open at the flight's top end).
    const rx = i % 2 === 0 ? lane[1] + 0.1 : lane[0] - 0.3;
    k.box([rx, f, dir > 0 ? z0 : z0 + 1.2, rx + 0.2, f + 1, dir > 0 ? z1 - 1.2 : z1], WOOD, WHITE, {
      lod: 0,
    });
  }
  // The bell's beam.
  k.box([BX0 + BT, 23.2, -7.2, BX1 - BT, 23.5, -6.8], WOOD, WHITE, { lod: 0, collide: false });
  await publish(
    "fort-chapel",
    K,
    {
      title: "Old Fortress: chapel and bell tower",
      use: "Old Fortress: the chapel (nave, altar, benches) and its bell tower, a stair of five flights to the belfry's open arches at 20 m under a slate spire (procedural, 2026-11-17)",
      size: [20, 31.7, 22],
    },
    [20, 22],
  );
}

// ---------------------------------------------------------------- the stables and the smithy
// Along the south wall (origin fortress (−63.5, 65)), between the south-west tower and the
// square tower (clear of its door): a timber lean-to on posts over a low stone back wall,
// stalls, the smithy's forge and chimney at the east end.
{
  const K = kit();
  const { k, mass } = K;
  const HX = 11,
    HZ = 5;
  mass([-HX, 0, HZ - 0.8, HX, 3, HZ], [], { m: WALL });
  for (let x = -HX; x <= HX + 0.01; x += HX / 4)
    k.box([x - 0.18, 0, -HZ, x + 0.18, 4.3, -HZ + 0.36], WOOD, WHITE);
  for (let x = -HX + HX / 4; x < HX - 8; x += HX / 4)
    k.box([x - 0.08, 0, -1, x + 0.08, 1.5, HZ - 0.8], WOOD, WHITE, { lod: 0 });
  // The roof: from 4.3 at the front to 5.8 at the back, slates on rafters.
  const y0 = 4.3,
    y1 = 5.8;
  k.quad(
    [-HX - 0.4, y0 - 0.1, -HZ - 0.5],
    [HX + 0.4, y0 - 0.1, -HZ - 0.5],
    [HX + 0.4, y1, HZ],
    [-HX - 0.4, y1, HZ],
    SLATE,
    WHITE,
    { facing: [0, 1, -0.15] },
  );
  k.quad(
    [-HX - 0.4, y0 - 0.1, -HZ - 0.5],
    [HX + 0.4, y0 - 0.1, -HZ - 0.5],
    [HX + 0.4, y1, HZ],
    [-HX - 0.4, y1, HZ],
    WOOD,
    WHITE,
    { facing: [0, -1, 0.15] },
  );
  k.box([-HX - 0.4, y0 - 0.3, -HZ - 0.5, HX + 0.4, y0, -HZ + 0.2], WOOD, WHITE);
  for (let s = 0; s < 3; s++) {
    const za = -HZ - 0.5 + ((2 * HZ + 0.5) * s) / 3,
      zb = -HZ - 0.5 + ((2 * HZ + 0.5) * (s + 1)) / 3;
    k.box(
      [-HX - 0.4, y0 + ((y1 - y0) * s) / 3, za, HX + 0.4, y0 + ((y1 - y0) * (s + 1)) / 3, zb],
      SLATE,
      WHITE,
      { visible: false },
    );
  }
  // The smithy: the forge (a stone hearth) and its chimney through the roof.
  k.box([HX - 6, 0, 1.6, HX - 3, 1.0, HZ - 0.8], STONE, WHITE);
  k.box([HX - 5.6, 1.0, 3, HX - 3.4, 8.5, HZ - 0.8], STONE, WHITE);
  k.quad(
    [HX - 5.4, 1.05, 2.4],
    [HX - 3.6, 1.05, 2.4],
    [HX - 3.6, 1.05, 3.9],
    [HX - 5.4, 1.05, 3.9],
    PAINT,
    [0.25, 0.08, 0.02],
    { n: [0, 1, 0], lod: 0 },
  );
  K.far.box([-HX, 0, -HZ, HX, 5, HZ], PAINT, FAR_WOOD, { collide: false, skip: ["top"] });
  K.far.quad([-HX, 5, -HZ], [-HX, 5, HZ], [HX, 5, HZ], [HX, 5, -HZ], PAINT, FAR_SLATE, {
    n: [0, 1, 0],
  });
  await publish(
    "fort-stables",
    K,
    {
      title: "Old Fortress: stables and smithy",
      use: "Old Fortress: the stables along the south wall, a timber lean-to over stalls, the smithy's forge and chimney (procedural, 2026-11-17)",
      ring: "dwelling",
      size: [2 * HX + 0.8, 8.5, 2 * HZ + 0.5],
    },
    [2 * HX + 0.8, 2 * HZ + 0.5],
  );
}

// ---------------------------------------------------------------- the cellar stair house
// Over a courtyard stair down to the cellars (origin: the stair's middle; the stair's top at +z):
// low walls on three sides, a little slate roof, open to the courtyard at the top of the stair.
{
  const K = kit();
  const { k, mass, gable } = K;
  mass([-1.4, 0, -3.4, -0.95, 2.6, 3.1], [], { m: STONE, farBox: false });
  mass([0.95, 0, -3.4, 1.4, 2.6, 3.1], [], { m: STONE, farBox: false });
  mass([-1.4, 0, -3.4, 1.4, 2.6, -2.95], [], { m: STONE, farBox: false });
  gable(-1.4, -3.4, 1.4, 3.1, 2.6, 1.2, "z", { over: 0.25 });
  // The far LOD: one block (its walls' three would outweigh the middle LOD).
  K.far.box([-1.4, 0, -3.4, 1.4, 3.2, 3.1], PAINT, FAR_STONE, { collide: false });
  await publish(
    "fort-cellar-stair",
    K,
    {
      title: "Old Fortress: cellar stair house",
      use: "Old Fortress: the little house over a courtyard stair down to the cellars (procedural, 2026-11-17)",
      ring: "dwelling",
      texture: 256,
      size: [3.3, 3.8, 7],
    },
    [3.3, 7],
  );
}

// ---------------------------------------------------------------- the bridge over the ditch
// From the bridgehead to the gate's mouth (origin: its middle, on the ditch's floor; north −z):
// a stone deck on two piers, parapets, the last stretch at the gate a timber drawbridge.
{
  const K = kit();
  const { k, mass } = K;
  const HZ = 12.35,
    W = 3,
    D = BASE;
  const cuts = [];
  for (const [a, b] of [
    [-HZ + 2.5, -4.6],
    [-2.4, 2.4],
    [4.6, HZ - 4.2],
  ]) {
    cuts.push([-W - 0.6, -1, a, W + 0.6, D - 2.2, b]);
    cuts.push([-W - 0.6, D - 2.2, a + 0.6, W + 0.6, D - 1.6, b - 0.6]);
  }
  mass([-W - 0.5, 0, -HZ, W + 0.5, D - 0.6, HZ - 4], cuts, { m: WALL });
  // The deck and parapets.
  mass([-W, D - 0.6, -HZ, W, D, HZ - 4], [], { m: STONE, top: COBBLE });
  for (const sx of [-1, 1])
    mass([sx > 0 ? W : -W - 0.5, D - 0.6, -HZ, sx > 0 ? W + 0.5 : -W, D + 1.0, HZ - 4], [], {
      m: STONE,
    });
  // The drawbridge (timber) to the gate.
  k.box([-W + 0.4, D - 0.35, HZ - 4, W - 0.4, D, HZ], WOOD, WHITE);
  for (let z = HZ - 4; z < HZ; z += 0.6)
    k.box([-W + 0.4, D - 0.02, z, W - 0.4, D + 0.03, z + 0.5], WOOD, [0.8, 0.75, 0.7], {
      collide: false,
    });
  await publish(
    "fort-bridge",
    K,
    {
      title: "Old Fortress: bridge and drawbridge",
      use: "Old Fortress: the stone bridge over the ditch to the gatehouse, on arches, the last stretch a timber drawbridge (procedural, 2026-11-17)",
      class: "structure",
      ring: "structure",
      size: [2 * W + 1, D + 1, 2 * HZ],
    },
    [2 * W + 1, 2 * HZ],
  );
}

// ---------------------------------------------------------------- the breach's rubble slope
// Against the base's east face (origin: the face, on the ledge; built in the fortress's frame,
// the ledge to +x): fallen masonry heaped from the ledge to the broken wall's crest
// (BASE + CREST over the ledge), climbable in RISE steps.
{
  const K = kit();
  const { k, rubble } = K;
  const top = BASE + CREST;
  const n = Math.round(top / RISE);
  const L = 22;
  const tr = L / n;
  for (let s = 0; s < n; s++) {
    const xa = L - (s + 1) * tr,
      xb = L - s * tr;
    const h = (s + 1) * RISE;
    const w = 5.5 - 1.2 * (s / n);
    k.box([xa, 0, -w, xb, h, w], WALL, [0.88, 0.86, 0.82], {
      skip: ["bottom"],
      lod: 1,
      collide: false,
    });
  }
  // Climbed on a ramp of RAMP_RISE steps, as the stairs (its 25 cm steps were a jolt a tick).
  const slices = Math.ceil(top / RAMP_RISE);
  for (let i = 0; i < slices; i++) {
    const xb = L - (L * i) / slices,
      xa = L - (L * (i + 1)) / slices;
    const h = Math.min(top, RISE / 4 + (top * (L - (xa + xb) / 2)) / L);
    const w = 5.5 - 1.2 * ((L - xb) / L);
    k.box([xa, 0, -w, xb, Math.max(RAMP_RISE, h), w], WALL, WHITE, { visible: false });
  }
  // Jumbled blocks over the heap (drawn only: the steps are what you climb).
  const rnd = rng(91);
  for (let i = 0; i < 70; i++) {
    const x = rnd() * L,
      z = (rnd() * 2 - 1) * 5;
    const h = (top * (L - x)) / L;
    const s = 0.5 + rnd() * 1.1;
    k.box(
      [x - s / 2, h - 0.2, z - s / 2, x + s / 2, h + s * 0.45, z + s / 2],
      rnd() < 0.5 ? WALL : STONE,
      WHITE,
      { collide: false, lod: 0 },
    );
  }
  rubble(L + 2, 0, 4, 18, 92);
  K.far.box([0, 0, -5, L, top * 0.5, 5], PAINT, FAR_STONE, { collide: false });
  await publish(
    "fort-rubble",
    K,
    {
      title: "Old Fortress: the breach's rubble",
      use: "Old Fortress: the fallen masonry heaped against the base's east face, up to the breached wall's crest (procedural, 2026-11-17)",
      class: "structure",
      ring: "structure",
      size: [L + 4, top + 0.8, 11],
    },
    [L, 11],
  );
}

// ---------------------------------------------------------------- the scaffold
// Up the south face to the wall-walk (origin on the ledge; built in the fortress's frame, the
// base's face at z = −4): a timber scaffold with four flights in two lanes, landings at both
// ends, the top walkway to the broken parapet. The owner's scaffolding downloads dress it.
{
  const K = kit();
  const { k, flight } = K;
  const top = BASE + WH;
  const rise = top / 4;
  const HX = 4.8;
  const A = [-1.2, 0.2],
    B = [0.6, 2.0];
  const r = K.run(rise);
  for (let i = 0; i < 4; i++) {
    const lane = i % 2 === 0 ? A : B;
    const dir = i % 2 === 0 ? 1 : -1;
    const foot = dir > 0 ? -r / 2 : r / 2;
    flight("x", foot, dir, lane[0], lane[1], i * rise, rise, { base: i * rise, m: WOOD, lod: 1 });
    // The landing at its top.
    const lx = dir > 0 ? [r / 2, HX] : [-HX, -r / 2];
    k.box([lx[0], (i + 1) * rise - 0.2, A[0], lx[1], (i + 1) * rise, B[1]], WOOD, WHITE);
  }
  // The top walkway to the wall: from the west landing to the base's face.
  k.box([-HX, top - 0.2, -4, -HX + 1.7, top, A[0]], WOOD, WHITE);
  // Rails on the outer side and the ends; posts and braces.
  for (let i = 1; i <= 4; i++)
    k.box([-HX, i * rise, B[1], HX, i * rise + 1, B[1] + 0.12], WOOD, WHITE);
  for (const x of [-HX, -1.6, 1.6, HX])
    for (const z of [-4, A[0], B[1]])
      k.box([x - 0.1, 0, z - 0.1, x + 0.1, top + 1, z + 0.1], WOOD, WHITE, { collide: z !== -4 });
  for (let i = 0; i < 4; i++)
    for (const z of [A[0], B[1]])
      K.k.beam([-HX, i * rise, z], [HX, (i + 1) * rise, z], 0.12, 0.12, WOOD);
  K.far.box([-HX, 0, -4, HX, top, B[1]], PAINT, FAR_WOOD, { collide: false });
  await publish(
    "fort-scaffold",
    K,
    {
      title: "Old Fortress: scaffold",
      use: "Old Fortress: a timber scaffold up the south face, four flights to the broken parapet of the wall-walk (procedural, 2026-11-17)",
      class: "structure",
      ring: "structure",
      size: [2 * HX, top + 1, 6.2],
    },
    [2 * HX, 6.2],
  );
}

fs.writeFileSync(
  PLAN,
  "{\n" +
    Object.entries(plan)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([id, v]) => ` ${JSON.stringify(id)}: ${JSON.stringify(v)}`)
      .join(",\n") +
    "\n}\n",
);
execFileSync("npx", ["prettier", "--write", PLAN], { stdio: "ignore" });
