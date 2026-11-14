/**
 * Blackwater Prison's flagship buildings (owner, 2026-11-14: "the prison should be enterable,
 * different floors/levels/rooms … can look like the prison on the attached image [an oval sea
 * fort] … this should be the flagship of the map"; "What about a nice prison tower? enterable,
 * high, great design?"):
 *
 *  - bw-keep: the oval stone keep standing in its moat (build_world.py PRISON_MOAT). A ring of
 *    rooms round an open courtyard, 110 × 55 m, four floors and a roof: the gate halls through
 *    the south and north sides, cells along both long sides on the first and second floors,
 *    halls in the rounded ends (mess hall, laundry and showers, chapel, infirmary, library,
 *    gym, armoury, the warden's office), the control room and solitary on the third floor, a
 *    gallery (arcade) round the courtyard on every floor, four stair towers to the battlements.
 *  - bw-tower: the watchtower, 46 m: a stone shaft with a stair through seven floors (guard
 *    rooms, armoury, a radio room), the glazed control cab with a walkway round it, the roof
 *    with the searchlights and the mast.
 *  - bw-bridge: a stone bridge over the moat to a gate (deck, parapets, arch).
 *  - bw-quay: the moat's outer wall (the quay), with steps down to the water at four places.
 *
 * Textured (textured-kit.mjs: the owner's Poly Haven sets). The rooms' kinds go to
 * src/lib/fps/br/blackwater-plan.json; layout.ts furnishes them (the owner's downloads).
 *
 *   node art/blender/br/build_blackwater.mjs        (run from the repo root)
 *
 * Model space: metres, pivot at the ground floor's level, the keep's long axis along x, its
 * main gate to +z (south) at turn 0. Original work.
 */
import fs from "node:fs";
import { createTexturedKit, publishTextured } from "./textured-kit.mjs";

const TAG = "bw-v1";
const DEG = Math.PI / 180;

// ---------------------------------------------------------------------------------------- keep
/** Straight half-length (x), and the radii out from the long axis / the ends' centres. */
const HL = 27.5;
const RO = 27.5, // outer face
  RW = 26.1, // outer wall's inner face (1.4 m of stone)
  RP = 19.1, // the rooms' inner wall (room side)
  RG = 18.7, // … gallery side
  RA = 16.3, // the arcade's back (gallery 2.4 m)
  RC = 15.5; // the courtyard's edge (arcade piers 0.8 m)
/** Floors (top of slab) and the roof; slab thickness. */
const Y = [0, 4.6, 9.2, 13.8];
const ROOF = 18.4,
  SLAB = 0.35;
const BAYS = 9;
const BW = (2 * HL) / BAYS;
const bayX = (i) => [-HL + i * BW, -HL + (i + 1) * BW];
/** End segments (each end a half circle of SEG straight walls). */
const SEG = 6;
const segAngle = (k) => (-90 + (180 * k) / SEG) * DEG;
/** A point at radius r and angle a (radians, 0 along +x outward) round end e (±1). */
const endPt = (e, r, a) => [e * (HL + r * Math.cos(a)), r * Math.sin(a)];

const T = {
  stone: [1, 1, 1],
  stoneDark: [0.78, 0.76, 0.72],
  stoneWet: [0.52, 0.53, 0.5],
  inner: [0.9, 0.88, 0.84],
  cell: [0.82, 0.84, 0.8],
  floor: [0.85, 0.85, 0.85],
  court: [0.95, 0.95, 0.95],
  roof: [0.9, 0.9, 0.88],
  iron: [0.55, 0.55, 0.55],
  rail: [0.35, 0.34, 0.33],
  wood: [0.75, 0.7, 0.65],
  glass: [1, 1, 1],
  white: [0.92, 0.92, 0.9],
  red: [0.55, 0.12, 0.1],
};

const plan = { keep: { rooms: [], gates: [], stairs: [] }, tower: { rooms: [] } };

/**
 * A wall along x (from x0 to x1, z0..z1 thick, y0..y1) with holes [a0, a1, yLow, yHigh] along x.
 */
function wallX(k, x0, x1, z0, z1, y0, y1, holes, m, tint, opts = {}) {
  const cuts = [x0, x1, ...holes.flatMap((h) => [h[0], h[1]])].sort((a, b) => a - b);
  for (let i = 0; i + 1 < cuts.length; i++) {
    const a = cuts[i],
      b = cuts[i + 1];
    if (b - a < 1e-3) continue;
    const mid = (a + b) / 2;
    const h = holes.find((q) => mid > q[0] && mid < q[1]);
    if (!h) k.box([a, y0, z0, b, y1, z1], m, tint, opts);
    else {
      // (Only what is left of the wall below and above the hole: a hole may reach its top.)
      if (h[2] > y0) k.box([a, y0, z0, b, Math.min(h[2], y1), z1], m, tint, opts);
      if (h[3] < y1) k.box([a, Math.max(h[3], y0), z0, b, y1, z1], m, tint, opts);
    }
  }
}
/** The same along z. */
function wallZ(k, z0, z1, x0, x1, y0, y1, holes, m, tint, opts = {}) {
  const cuts = [z0, z1, ...holes.flatMap((h) => [h[0], h[1]])].sort((a, b) => a - b);
  for (let i = 0; i + 1 < cuts.length; i++) {
    const a = cuts[i],
      b = cuts[i + 1];
    if (b - a < 1e-3) continue;
    const mid = (a + b) / 2;
    const h = holes.find((q) => mid > q[0] && mid < q[1]);
    if (!h) k.box([x0, y0, a, x1, y1, b], m, tint, opts);
    else {
      if (h[2] > y0) k.box([x0, y0, a, x1, Math.min(h[2], y1), b], m, tint, opts);
      if (h[3] < y1) k.box([x0, Math.max(h[3], y0), a, x1, y1, b], m, tint, opts);
    }
  }
}
/**
 * A slanted wall from p to q (plan points) with holes [a0, a1, yLow, yHigh] measured along it,
 * `ext` m added at both ends (closes the outer corner between segments).
 */
function slabHoles(k, p, q, t, y0, y1, holes, m, tint, opts = {}) {
  const L = Math.hypot(q[0] - p[0], q[1] - p[1]);
  const ext = opts.ext ?? 0;
  const at = (s) => [p[0] + ((q[0] - p[0]) * s) / L, p[1] + ((q[1] - p[1]) * s) / L];
  const cuts = [-ext, L + ext, ...holes.flatMap((h) => [h[0], h[1]])].sort((a, b) => a - b);
  for (let i = 0; i + 1 < cuts.length; i++) {
    const a = cuts[i],
      b = cuts[i + 1];
    if (b - a < 1e-3) continue;
    const mid = (a + b) / 2;
    const h = holes.find((r) => mid > r[0] && mid < r[1]);
    const A = at(a),
      B = at(b);
    const o = { lod: opts.lod ?? 1, collide: opts.collide ?? true, inner: opts.inner };
    if (!h) k.slab(A[0], A[1], B[0], B[1], t, y0, y1, m, tint, o);
    else {
      if (h[2] > y0) k.slab(A[0], A[1], B[0], B[1], t, y0, h[2], m, tint, o);
      if (h[3] < y1) k.slab(A[0], A[1], B[0], B[1], t, h[3], y1, m, tint, o);
    }
  }
}

function keep() {
  const k = createTexturedKit();
  const far = createTexturedKit();
  const gateBay = 4;
  const stairBays = [0, BAYS - 1];
  const levelTop = (i) => (i + 1 < Y.length ? Y[i + 1] - SLAB : ROOF - SLAB);

  // ---------------------------------------------------------------- outer wall, straight sides
  for (const s of [1, -1]) {
    const z0 = s > 0 ? RW : -RO,
      z1 = s > 0 ? RO : -RW;
    // Under the water and up to the ground floor: solid, darker (wet), a plinth course.
    k.box([-HL - 0.2, -7, z0, HL + 0.2, 0, z1], "stone", T.stoneWet);
    k.box(
      [-HL - 0.2, -0.6, s > 0 ? RO : -RO - 0.35, HL + 0.2, 0.3, s > 0 ? RO + 0.35 : -RO],
      "stone",
      T.stoneDark,
      {
        collide: false,
      },
    );
    for (let L = 0; L < Y.length; L++) {
      const y0 = Y[L],
        y1 = L + 1 < Y.length ? Y[L + 1] : ROOF;
      const holes = [];
      for (let i = 0; i < BAYS; i++) {
        const [a, b] = bayX(i);
        const c = (a + b) / 2;
        if (L === 0 && i === gateBay) holes.push([c - 1.8, c + 1.8, y0, y0 + 3.9]);
        else if (L === 0)
          holes.push([c - 0.25, c + 0.25, y0 + 1.1, y0 + 2.7]); // arrow slit
        else if (stairBays.includes(i)) holes.push([c - 0.3, c + 0.3, y0 + 1.6, y0 + 3.2]);
        else if (L === 1 || L === 2) {
          // Two cells a bay: a barred window each.
          holes.push([c - BW / 4 - 0.45, c - BW / 4 + 0.45, y0 + 1.5, y0 + 2.8]);
          holes.push([c + BW / 4 - 0.45, c + BW / 4 + 0.45, y0 + 1.5, y0 + 2.8]);
        } else holes.push([c - 0.7, c + 0.7, y0 + 1.1, y0 + 3.0]);
      }
      wallX(k, -HL, HL, z0, z1, y0, y1, holes, "stone", T.stone);
      // Far: no holes.
      if (L === 0) far.box([-HL, -7, z0, HL, ROOF + 1.4, z1], "stone", [0.86, 0.82, 0.74]);
    }
    // A string course at each floor and the cornice under the battlements.
    for (const y of [...Y.slice(1), ROOF]) {
      k.box(
        [-HL, y - 0.25, s > 0 ? RO : -RO - 0.18, HL, y + 0.05, s > 0 ? RO + 0.18 : -RO],
        "stone",
        T.stoneDark,
        {
          collide: false,
        },
      );
    }
    // Battlements: the wall up 1.0 m, merlons every 2.0 m another 0.9 m.
    k.box([-HL, ROOF, z0, HL, ROOF + 1.0, z1], "stone", T.stone);
    for (let x = -HL + 0.5; x + 1.0 <= HL; x += 2.0)
      k.box([x, ROOF + 1.0, z0, x + 1.0, ROOF + 1.9, z1], "stone", T.stone);
  }

  // ---------------------------------------------------------------- outer wall, rounded ends
  for (const e of [1, -1]) {
    for (let s = 0; s < SEG; s++) {
      const a0 = segAngle(s),
        a1 = segAngle(s + 1);
      const p = endPt(e, (RO + RW) / 2, a0),
        q = endPt(e, (RO + RW) / 2, a1);
      const L = Math.hypot(q[0] - p[0], q[1] - p[1]);
      const ext = 0.25;
      // (Drawn with the outward face first: the slab's +n side is to the left of p→q.)
      const [P, Q] = e > 0 ? [p, q] : [q, p];
      slabHoles(k, P, Q, RO - RW, -7, 0, [], "stone", T.stoneWet, { ext });
      for (let Lv = 0; Lv < Y.length; Lv++) {
        const y0 = Y[Lv],
          y1 = Lv + 1 < Y.length ? Y[Lv + 1] : ROOF;
        const w = Lv === 0 ? 0.5 : 1.2;
        const hole = [
          L / 2 - w / 2,
          L / 2 + w / 2,
          y0 + (Lv === 0 ? 1.1 : 1.3),
          y0 + (Lv === 0 ? 2.7 : 3.0),
        ];
        slabHoles(k, P, Q, RO - RW, y0, y1, [hole], "stone", T.stone, { ext });
      }
      slabHoles(k, P, Q, RO - RW, ROOF, ROOF + 1.0, [], "stone", T.stone, { ext });
      // Merlons: two a segment.
      for (const f of [0.25, 0.7])
        slabHoles(
          k,
          P,
          Q,
          RO - RW,
          ROOF + 1.0,
          ROOF + 1.9,
          [
            [-1, f * L, 0, 99],
            [f * L + 1.0, L + 1, 0, 99],
          ],
          "stone",
          T.stone,
        );
      far.slab(P[0], P[1], Q[0], Q[1], RO - RW, -7, ROOF + 1.4, "stone", [0.86, 0.82, 0.74], {
        collide: false,
      });
      // String courses.
      for (const y of [...Y.slice(1), ROOF]) {
        const po = endPt(e, RO + 0.09, a0),
          qo = endPt(e, RO + 0.09, a1);
        const [Po, Qo] = e > 0 ? [po, qo] : [qo, po];
        k.slab(Po[0], Po[1], Qo[0], Qo[1], 0.18, y - 0.25, y + 0.05, "stone", T.stoneDark, {
          collide: false,
        });
      }
    }
  }

  // ------------------------------------------------------------------- floors, roof, ceilings
  const stairWell = (i, s) => {
    // The flights' footprint in a stair bay (x from 1.25 m in, both bands), side s.
    const [x0, x1] = bayX(i);
    const inward = i === 0; // flights rise towards +x in bay 0, towards -x in the last bay
    const a = inward ? x0 + 1.25 : x0,
      b = inward ? x1 : x1 - 1.25;
    return s > 0 ? [a, RW - 3.45, b, RW] : [a, -RW, b, -RW + 3.45];
  };
  const levels = [...Y.slice(1), ROOF];
  for (const y of [0, ...levels]) {
    const ground = y === 0;
    const roof = y === ROOF;
    const m = roof ? "tiles" : "floor";
    for (const s of [1, -1]) {
      // Straight sides: the ring from the courtyard's edge to the outer wall, minus the wells.
      const zr = s > 0 ? [RC, RW] : [-RW, -RC];
      const holes = ground ? [] : stairBays.map((i) => stairWell(i, s));
      // Cut the slab into x strips around the wells.
      const xs = [-HL, HL, ...holes.flatMap((h) => [h[0], h[2]])].sort((a, b) => a - b);
      for (let j = 0; j + 1 < xs.length; j++) {
        const a = xs[j],
          b = xs[j + 1];
        if (b - a < 1e-3) continue;
        const h = holes.find((w) => (a + b) / 2 > w[0] && (a + b) / 2 < w[2]);
        const parts = h
          ? [
              [zr[0], Math.min(zr[1], h[1])],
              [Math.max(zr[0], h[3]), zr[1]],
            ].filter(([p, q]) => q - p > 1e-3)
          : [zr];
        for (const [p, q] of parts)
          k.box([a, y - SLAB, p, b, y, q], m, roof ? T.roof : T.floor, {
            skip: ground ? ["bottom"] : [],
          });
      }
      if (roof)
        far.box([-HL, ROOF - SLAB, zr[0], HL, ROOF, zr[1]], "tiles", [0.6, 0.58, 0.55], {
          collide: false,
        });
    }
    // Rounded ends: each segment a quad from the courtyard's edge to the outer wall.
    for (const e of [1, -1])
      for (let s = 0; s < SEG; s++) {
        const a0 = segAngle(s),
          a1 = segAngle(s + 1);
        const pts = [
          endPt(e, RC, a0),
          endPt(e, RW + 0.1, a0),
          endPt(e, RW + 0.1, a1),
          endPt(e, RC, a1),
        ];
        const ordered = e > 0 ? pts : [...pts].reverse();
        k.poly(ordered, y, m, roof ? T.roof : T.floor, { thick: SLAB });
        if (!ground) k.poly(ordered, y - SLAB, "plaster", T.white, { collide: false, down: true });
        if (roof) far.poly(ordered, ROOF, "tiles", [0.6, 0.58, 0.55], { collide: false });
      }
  }
  // The courtyard: cobbles (straight part and the two half circles).
  k.box([-HL, -0.4, -RC, HL, 0.02, RC], "cobble", T.court, { skip: ["bottom"] });
  far.box([-HL, -0.4, -RC, HL, 0.02, RC], "paint", [0.55, 0.53, 0.5], { collide: false });
  for (const e of [1, -1])
    for (let s = 0; s < SEG; s++) {
      const pts = [[e * HL, 0], endPt(e, RC, segAngle(s)), endPt(e, RC, segAngle(s + 1))];
      const ordered = e > 0 ? [pts[0], pts[2], pts[1]] : pts;
      k.poly(ordered.reverse(), 0.02, "cobble", T.court, { thick: 0.42 });
      far.poly(ordered, 0.02, "paint", [0.55, 0.53, 0.5], { collide: false });
    }

  // ------------------------------------------------------------ inner walls: rooms and gallery
  for (let L = 0; L < Y.length; L++) {
    const y0 = Y[L],
      y1 = levelTop(L);
    for (const s of [1, -1]) {
      const zp0 = s > 0 ? RG : -RP,
        zp1 = s > 0 ? RP : -RG;
      // The rooms' wall onto the gallery: doorways (two a bay where the bay is two cells).
      const holes = [];
      for (let i = 0; i < BAYS; i++) {
        const [a, b] = bayX(i);
        const c = (a + b) / 2;
        const cells = (L === 1 || L === 2 || L === 3) && !stairBays.includes(i);
        if (L === 0 && i === gateBay) holes.push([c - 1.8, c + 1.8, y0, y0 + 3.9]);
        else if (cells) {
          holes.push([c - BW / 4 - 0.6, c - BW / 4 + 0.6, y0, y0 + 2.3]);
          holes.push([c + BW / 4 - 0.6, c + BW / 4 + 0.6, y0, y0 + 2.3]);
        } else holes.push([c - 0.8, c + 0.8, y0, y0 + 2.4]);
      }
      wallX(k, -HL, HL, zp0, zp1, y0, y1, holes, "plaster", L === 0 ? T.inner : T.cell, { lod: 0 });
      // Walls between bays (and between the two cells of a bay), outer wall to gallery wall.
      const zr0 = s > 0 ? RP : -RW,
        zr1 = s > 0 ? RW : -RP;
      for (let i = 0; i <= BAYS; i++) {
        const x = -HL + i * BW;
        if (i === 0 || i === BAYS) continue; // the rounded ends' halls meet the bays there
        const gateSide = L === 0 && (i === gateBay || i === gateBay + 1);
        k.box([x - 0.15, y0, zr0, x + 0.15, y1, zr1], "plaster", gateSide ? T.stone : T.inner, {
          lod: 0,
        });
        if (i > 0 && i < BAYS && (L === 1 || L === 2 || L === 3) && !stairBays.includes(i)) {
          const cx = x + BW / 2;
          if (i < BAYS - 1)
            k.box([cx - 0.1, y0, zr0, cx + 0.1, y1, zr1], "plaster", T.cell, { lod: 0 });
        }
      }
      // The arcade: a pier at each bay's edge, an arch head over each opening, a parapet on
      // the upper floors (1.05 m, solid: never fall into the courtyard by accident).
      const za0 = s > 0 ? RC : -RA,
        za1 = s > 0 ? RA : -RC;
      for (let i = 0; i <= BAYS; i++) {
        const x = -HL + i * BW;
        k.box([x - 0.4, y0, za0, x + 0.4, y1 + SLAB, za1], "stone", T.stone);
      }
      for (let i = 0; i < BAYS; i++) {
        const [a, b] = bayX(i);
        k.box([a + 0.4, y0 + 3.3, za0, b - 0.4, y1 + SLAB, za1], "stone", T.stone);
        if (L > 0) k.box([a + 0.4, y0, za0, b - 0.4, y0 + 1.05, za1], "stone", T.stone);
      }
    }
    // Rounded ends: the gallery wall (a doorway each segment), the arcade, a wall across the
    // middle (two halls an end).
    for (const e of [1, -1]) {
      for (let s = 0; s < SEG; s++) {
        const a0 = segAngle(s),
          a1 = segAngle(s + 1);
        const p = endPt(e, (RP + RG) / 2, a0),
          q = endPt(e, (RP + RG) / 2, a1);
        const [P, Q] = e > 0 ? [q, p] : [p, q]; // room side (+n) outward
        const L2 = Math.hypot(q[0] - p[0], q[1] - p[1]);
        slabHoles(
          k,
          P,
          Q,
          RP - RG,
          y0,
          y1,
          [[L2 / 2 - 0.8, L2 / 2 + 0.8, y0, y0 + 2.4]],
          "plaster",
          T.inner,
          { lod: 0, ext: 0.12 },
        );
        // Arcade: piers at the joints (one per joint, the straight sides' end piers at ±90°).
        if (s > 0) {
          const c = endPt(e, (RC + RA) / 2, a0);
          k.box([c[0] - 0.4, y0, c[1] - 0.4, c[0] + 0.4, y1 + SLAB, c[1] + 0.4], "stone", T.stone);
        }
        const pa = endPt(e, (RC + RA) / 2, a0),
          qa = endPt(e, (RC + RA) / 2, a1);
        const [PA, QA] = e > 0 ? [qa, pa] : [pa, qa];
        const La = Math.hypot(qa[0] - pa[0], qa[1] - pa[1]);
        slabHoles(k, PA, QA, RA - RC, y0 + 3.3, y1 + SLAB, [], "stone", T.stone, { ext: 0.1 });
        if (L > 0)
          slabHoles(
            k,
            PA,
            QA,
            RA - RC,
            y0,
            y0 + 1.05,
            [
              [-1, 0.45, 0, 99],
              [La - 0.45, La + 1, 0, 99],
            ],
            "stone",
            T.stone,
          );
      }
      // The wall across the end (θ = 0): from the gallery wall to the outer wall.
      const a = endPt(e, RP, 0),
        b = endPt(e, RW, 0);
      k.box([Math.min(a[0], b[0]), y0, -0.15, Math.max(a[0], b[0]), y1, 0.15], "plaster", T.inner, {
        lod: 0,
      });
    }
  }

  // ------------------------------------------------------------------------ the gate halls
  for (const s of [1, -1]) {
    const [a, b] = bayX(gateBay);
    const c = (a + b) / 2;
    // Vaulted: the hall's walls in stone, a heavy lintel outside, the keep's name over the
    // south gate (a painted band), iron studs on the open gate leaves (drawn back to the wall).
    const zo = s > 0 ? RO : -RO;
    k.box([c - 2.6, 3.9, zo - s * 0.1, c + 2.6, 4.5, zo + s * 0.35], "stone", T.stoneDark, {
      collide: false,
    });
    for (const side of [-1, 1]) {
      const x = c + side * 1.95;
      k.box(
        [x - 0.08, 0, s > 0 ? RW - 2.2 : -RW + 0.1, x + 0.08, 3.85, s > 0 ? RW - 0.1 : -RW + 2.2],
        "wood",
        T.wood,
        { lod: 0 },
      );
    }
    if (s > 0)
      k.box([c - 3.2, 4.6, RO, c + 3.2, 5.6, RO + 0.12], "paint", [0.12, 0.12, 0.13], {
        collide: false,
      });
    plan.keep.gates.push({ side: s > 0 ? "south" : "north", x: c, z: s * RO, width: 3.6 });
  }

  // ----------------------------------------------------------------------------- stair towers
  for (const s of [1, -1])
    for (const i of stairBays) {
      const [x0, x1] = bayX(i);
      const dir = i === 0 ? 1 : -1; // flights start at the bay's end-hall side
      const xs = dir > 0 ? x0 + 1.25 : x1 - 1.25; // first flight's foot
      const xe = xs + dir * 3.36; // its head (12 treads of 0.28)
      const bandA = s > 0 ? [RW - 1.65, RW - 0.05] : [-RW + 0.05, -RW + 1.65];
      const bandB = s > 0 ? [RW - 3.4, RW - 1.75] : [-RW + 1.75, -RW + 3.4];
      for (let L = 0; L < Y.length; L++) {
        const y0 = Y[L],
          yTop = L + 1 < Y.length ? Y[L + 1] : ROOF;
        const half = (yTop - y0) / 2;
        k.flight("x", xs, xe, bandA[0], bandA[1], y0, half, 12, "concrete", T.floor);
        // The landing at the turn.
        const lx0 = dir > 0 ? xe : x0,
          lx1 = dir > 0 ? x1 : xe;
        k.box(
          [
            lx0,
            y0 + half - 0.3,
            Math.min(bandA[0], bandB[0]),
            lx1,
            y0 + half,
            Math.max(bandA[1], bandB[1]),
          ],
          "concrete",
          T.floor,
          { lod: 0 },
        );
        k.flight(
          "x",
          xe,
          xs,
          bandB[0],
          bandB[1],
          y0 + half,
          yTop - y0 - half,
          12,
          "concrete",
          T.floor,
        );
        // The wall between the flights, and the rail along the well on the floor above.
        const zmid = (bandA[s > 0 ? 0 : 1] + bandB[s > 0 ? 1 : 0]) / 2;
        k.box(
          [Math.min(xs, xe), y0, zmid - 0.05, Math.max(xs, xe), yTop - 0.6, zmid + 0.05],
          "plaster",
          T.inner,
          { lod: 0 },
        );
        const zr = s > 0 ? RW - 3.45 : -RW + 3.45;
        const rx0 = dir > 0 ? xs : x0,
          rx1 = dir > 0 ? x1 : xs;
        k.box([rx0, yTop, zr - 0.04, rx1, yTop + 1.05, zr + 0.04], "rust", T.rail, { lod: 0 });
      }
      // On the roof: a rail along the well's open end, a canopy over the stair head on posts.
      const zw = s > 0 ? [RW - 3.45, RW] : [-RW, -RW + 3.45];
      const xr = dir > 0 ? x1 : x0;
      k.box([xr - 0.04, ROOF, zw[0], xr + 0.04, ROOF + 1.05, zw[1]], "rust", T.rail);
      const cz = s > 0 ? [RW - 3.8, RW] : [-RW, -RW + 3.8];
      for (const px of [x0 + 0.3, x1 - 0.55])
        for (const pz of [cz[0] + 0.1, cz[1] - 0.35])
          k.box([px, ROOF, pz, px + 0.25, ROOF + 2.7, pz + 0.25], "rust", T.iron);
      k.box([x0 + 0.2, ROOF + 2.7, cz[0], x1 - 0.2, ROOF + 2.95, cz[1]], "rust", T.iron);
      far.box(
        [x0 + 0.2, ROOF + 2.7, cz[0], x1 - 0.2, ROOF + 2.95, cz[1]],
        "paint",
        [0.4, 0.38, 0.36],
        { collide: false },
      );
      plan.keep.stairs.push({ x: (x0 + x1) / 2, z: s * (RW - 1.7), from: 0, to: ROOF });
    }
  // The courtyard's parapet on the roof (inner edge), 1.1 m.
  for (const s of [1, -1])
    k.box([-HL, ROOF, s > 0 ? RC : -RA, HL, ROOF + 1.1, s > 0 ? RA : -RC], "stone", T.stone);
  for (const e of [1, -1])
    for (let s = 0; s < SEG; s++) {
      const p = endPt(e, (RC + RA) / 2, segAngle(s)),
        q = endPt(e, (RC + RA) / 2, segAngle(s + 1));
      const [P, Q] = e > 0 ? [q, p] : [p, q];
      slabHoles(k, P, Q, RA - RC, ROOF, ROOF + 1.1, [], "stone", T.stone, { ext: 0.1 });
    }

  // ------------------------------------------------------------------------------ the rooms
  // Kinds by floor and place (layout.ts blackwaterFitout furnishes them).
  const sideKinds = {
    0: {
      1: ["intake", "guards", "visits", "visits", "guards", "intake"],
      [-1]: ["kitchen", "kitchen", "stores", "stores", "workshop", "workshop"],
    },
    1: { 1: "cell", [-1]: "cell" },
    2: { 1: "cell", [-1]: "cell" },
    3: {
      1: ["office", "control", "control", "control", "office", "office"],
      [-1]: ["solitary", "solitary", "solitary", "solitary", "solitary", "solitary"],
    },
  };
  const endKinds = {
    0: { 1: ["mess", "mess"], [-1]: ["laundry", "showers"] },
    1: { 1: ["infirmary", "infirmary"], [-1]: ["chapel", "chapel"] },
    2: { 1: ["gym", "gym"], [-1]: ["library", "library"] },
    3: { 1: ["armoury", "armoury"], [-1]: ["warden", "warden"] },
  };
  for (let L = 0; L < Y.length; L++) {
    for (const s of [1, -1]) {
      let n = 0;
      for (let i = 0; i < BAYS; i++) {
        if (stairBays.includes(i) || (L === 0 && i === gateBay)) continue;
        const [a, b] = bayX(i);
        const z0 = s > 0 ? RP : -RW,
          z1 = s > 0 ? RW : -RP;
        const kinds = sideKinds[L][s];
        if (typeof kinds === "string" || L === 3) {
          // Two rooms a bay (cells, the third floor's offices and solitary).
          for (const [p, q] of [
            [a, (a + b) / 2],
            [(a + b) / 2, b],
          ])
            plan.keep.rooms.push({
              floor: L,
              y: Y[L],
              kind: typeof kinds === "string" ? kinds : kinds[n % kinds.length],
              rect: [
                +(p + 0.15).toFixed(2),
                +z0.toFixed(2),
                +(q - 0.15).toFixed(2),
                +z1.toFixed(2),
              ],
              door: [+((p + q) / 2).toFixed(2), s > 0 ? RP : -RP],
              side: s,
            });
        } else
          plan.keep.rooms.push({
            floor: L,
            y: Y[L],
            kind: kinds[n % kinds.length],
            rect: [+(a + 0.15).toFixed(2), +z0.toFixed(2), +(b - 0.15).toFixed(2), +z1.toFixed(2)],
            door: [+((a + b) / 2).toFixed(2), s > 0 ? RP : -RP],
            side: s,
          });
        n++;
      }
    }
    for (const e of [1, -1])
      for (const half of [-1, 1]) {
        // The end's half on the north (half -1) or the south (half 1).
        const kinds = endKinds[L][e];
        plan.keep.rooms.push({
          floor: L,
          y: Y[L],
          kind: kinds[half > 0 ? 1 : 0],
          end: {
            e,
            half,
            cx: e * HL,
            r0: RP,
            r1: RW,
            a0: half > 0 ? 0 : -90,
            a1: half > 0 ? 90 : 0,
          },
        });
      }
  }
  plan.keep.size = [2 * (HL + RO), ROOF + 3.3, 2 * RO];
  plan.keep.floors = [...Y, ROOF];
  plan.keep.courtyard = { half: HL, r: RC };
  return { k, far };
}

// --------------------------------------------------------------------------------------- tower
/**
 * The watchtower: a 10 m square shaft (stone to the third floor, concrete above), seven floors
 * of 4.2 m with a switchback stair along its west half, rooms in its east half; the cab (13 m
 * square, glazed all round, a walkway outside) at 29.4 m, its roof at 33 m with searchlight
 * stands, a mast to 46 m.
 */
const TW = 5; // half width
const TS = 4.2; // storey
const TF = 7; // floors under the cab
const CAB = 29.4,
  CABH = 3.4,
  CABW = 6.5; // cab half width

function tower() {
  const k = createTexturedKit();
  const far = createTexturedKit();
  const W = 0.6; // wall
  const top = CAB;
  // Footing and the shaft's walls with windows, a door on the south face at the ground.
  k.box([-TW - 0.6, -1.5, -TW - 0.6, TW + 0.6, 0.12, TW + 0.6], "stone", T.stoneDark);
  for (let L = 0; L < TF; L++) {
    const y0 = L * TS,
      y1 = (L + 1) * TS;
    const m = L < 3 ? "stone" : "concrete";
    const tint = L < 3 ? T.stone : [0.9, 0.88, 0.84];
    const win = (c) => [c - 0.35, c + 0.35, y0 + 1.4, y0 + 2.9];
    // South (+z) and north faces: windows; the door in the south face's west half at L0.
    wallX(
      k,
      -TW,
      TW,
      TW - W,
      TW,
      y0,
      y1,
      L === 0 ? [[1.8, 3.2, y0, y0 + 2.4], win(-2.5)] : [win(-2.5), win(2.5)],
      m,
      tint,
    );
    wallX(k, -TW, TW, -TW, -TW + W, y0, y1, [win(-2.5), win(2.5)], m, tint);
    wallZ(k, -TW + W, TW - W, TW - W, TW, y0, y1, [win(0)], m, tint);
    wallZ(k, -TW + W, TW - W, -TW, -TW + W, y0, y1, [win(0)], m, tint);
    // Floors (east half; the stair's half has the landing strips only).
    if (L > 0) {
      k.box([0.15, y0 - 0.3, -TW + W, TW - W, y0, TW - W], "floor", T.floor);
      k.box([-TW + W, y0 - 0.3, -TW + W, 0.15, y0, -TW + W + 1.3], "floor", T.floor);
    }
    // The wall between the stair and the room, a doorway at the landing.
    wallZ(
      k,
      -TW + W,
      TW - W,
      0,
      0.3,
      y0,
      y1 - 0.3,
      [[-TW + W + 0.1, -TW + W + 1.3, y0, y0 + 2.3]],
      "plaster",
      T.inner,
      { lod: 0 },
    );
    // Switchback: up north→south along x∈[-TW+W, -2.4], back south→north along [-2.4, 0].
    const half = TS / 2;
    const zA0 = -TW + W + 1.3,
      zA1 = zA0 + 3.36;
    k.flight("z", zA0, zA1, -TW + W, -2.45, y0, half, 12, "concrete", T.floor);
    k.box([-TW + W, y0 + half - 0.3, zA1, 0, y0 + half, TW - W], "concrete", T.floor, { lod: 0 });
    k.flight("z", zA1, zA0, -2.35, 0, y0 + half, half, 12, "concrete", T.floor);
    k.box([-2.45, y0, zA0, -2.35, y0 + TS - 0.6, zA1], "plaster", T.inner, { lod: 0 });
    // Ceiling of the room under the next floor (lit face).
    plan.tower.rooms.push({
      floor: L,
      y: y0,
      kind: ["guard", "armoury", "guard", "radio", "bunks", "armoury", "guard"][L],
      rect: [0.45, -TW + W + 0.1, TW - W - 0.1, TW - W - 0.1],
    });
  }
  // Corner pilasters (quoins) the full height of the shaft, a string course at every floor,
  // a corbelled band under the cab: the tower reads as built, not as a box.
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const x0 = sx > 0 ? TW - 0.6 : -TW - 0.3,
        z0 = sz > 0 ? TW - 0.6 : -TW - 0.3;
      k.box([x0, 0, z0, x0 + 0.9, CAB - 2.2, z0 + 0.9], "stone", T.stoneDark, { collide: false });
    }
  for (let L = 1; L < TF; L++)
    k.box(
      [-TW - 0.12, L * TS - 0.22, -TW - 0.12, TW + 0.12, L * TS, TW + 0.12],
      "stone",
      T.stoneDark,
      { collide: false, skip: ["bottom"] },
    );
  for (let i = 0; i < 3; i++) {
    const g = 0.25 * (i + 1);
    k.box(
      [-TW - g, CAB - 1.2 + i * 0.25, -TW - g, TW + g, CAB - 0.95 + i * 0.25, TW + g],
      "concrete",
      [0.78, 0.76, 0.72],
      { collide: false },
    );
  }
  far.box([-TW, -1.5, -TW, TW, top, TW], "paint", [0.8, 0.77, 0.7], { collide: false });
  // The last flight reaches the cab floor; the cab: floor slab overhanging, a waist wall, glass,
  // corner posts, roof; a walkway outside it (rail), a door out onto it on the south side.
  // The cab's floor slab round the stair's opening (x -TW+W..0, z from the landing strip south).
  const E = CABW + 1.4,
    hx0 = -TW + W,
    hz0 = -TW + W + 1.3,
    hz1 = TW - W;
  k.box([-E, CAB - 0.4, -E, E, CAB, hz0], "concrete", [0.8, 0.8, 0.8]);
  k.box([-E, CAB - 0.4, hz1, E, CAB, E], "concrete", [0.8, 0.8, 0.8]);
  k.box([-E, CAB - 0.4, hz0, hx0, CAB, hz1], "concrete", [0.8, 0.8, 0.8]);
  k.box([0, CAB - 0.4, hz0, E, CAB, hz1], "concrete", [0.8, 0.8, 0.8]);
  // Rails round the opening (not across the landing strip, where the stair arrives).
  k.box([0, CAB, hz0, 0.06, CAB + 1.05, hz1], "rust", T.rail);
  k.box([hx0, CAB, hz1 - 0.06, 0.06, CAB + 1.05, hz1], "rust", T.rail);
  k.box([-2.45, CAB, hz0, -2.35, CAB + 1.05, hz0 + 3.36], "rust", T.rail);
  // Waist wall 1.0 m round the cab, glass above to the roof.
  const cw = CABW;
  wallX(
    k,
    -cw,
    cw,
    cw - 0.25,
    cw,
    CAB,
    CAB + 1.0,
    [[-1.0, 0.2, CAB, CAB + 2.3]],
    "concrete",
    [0.86, 0.84, 0.8],
  );
  wallX(k, -cw, cw, -cw, -cw + 0.25, CAB, CAB + 1.0, [], "concrete", [0.86, 0.84, 0.8]);
  wallZ(k, -cw + 0.25, cw - 0.25, cw - 0.25, cw, CAB, CAB + 1.0, [], "concrete", [0.86, 0.84, 0.8]);
  wallZ(
    k,
    -cw + 0.25,
    cw - 0.25,
    -cw,
    -cw + 0.25,
    CAB,
    CAB + 1.0,
    [],
    "concrete",
    [0.86, 0.84, 0.8],
  );
  // The door's frame above the waist (the glass leaves a doorway).
  for (const [x0, x1] of [
    [-cw, -1.0],
    [0.2, cw],
  ])
    k.box([x0, CAB + 1.0, cw - 0.12, x1, CAB + CABH, cw - 0.08], "glass", T.glass, {
      collide: true,
    });
  k.box([-1.0, CAB + 2.3, cw - 0.12, 0.2, CAB + CABH, cw - 0.08], "glass", T.glass, {
    collide: true,
  });
  k.box([-cw, CAB + 1.0, -cw + 0.08, cw, CAB + CABH, -cw + 0.12], "glass", T.glass);
  k.box([cw - 0.12, CAB + 1.0, -cw, cw - 0.08, CAB + CABH, cw], "glass", T.glass);
  k.box([-cw + 0.08, CAB + 1.0, -cw, -cw + 0.12, CAB + CABH, cw], "glass", T.glass);
  for (const x of [-cw, cw - 0.3])
    for (const z of [-cw, cw - 0.3])
      k.box([x, CAB, z, x + 0.3, CAB + CABH, z + 0.3], "rust", T.iron);
  k.box(
    [-cw - 0.6, CAB + CABH, -cw - 0.6, cw + 0.6, CAB + CABH + 0.45, cw + 0.6],
    "concrete",
    [0.7, 0.7, 0.7],
  );
  // The walkway's rail (1.1 m) round the slab's edge.
  const e = CABW + 1.4;
  for (const [b, axis] of [
    [[-e, CAB, e - 0.08, e, CAB + 1.1, e], "x"],
    [[-e, CAB, -e, e, CAB + 1.1, -e + 0.08], "x"],
    [[e - 0.08, CAB, -e, e, CAB + 1.1, e], "z"],
    [[-e, CAB, -e, -e + 0.08, CAB + 1.1, e], "z"],
  ]) {
    void axis;
    k.box(b, "rust", T.rail);
  }
  // A ladder hatch to the cab roof (the searchlights' platform): an iron ladder on the north
  // face, inside, up through a hatch; the roof's parapet.
  const RY = CAB + CABH + 0.45;
  for (let y = CAB + 0.3; y < RY; y += 0.3)
    k.box([-0.4, y, -cw + 0.3, 0.4, y + 0.06, -cw + 0.38], "rust", T.iron, {
      lod: 0,
      collide: false,
    });
  for (const [b] of [
    [[-cw - 0.6, RY, cw + 0.4, cw + 0.6, RY + 1.0, cw + 0.6]],
    [[-cw - 0.6, RY, -cw - 0.6, cw + 0.6, RY + 1.0, -cw - 0.4]],
    [[cw + 0.4, RY, -cw - 0.6, cw + 0.6, RY + 1.0, cw + 0.6]],
    [[-cw - 0.6, RY, -cw - 0.6, -cw - 0.4, RY + 1.0, cw + 0.6]],
  ])
    k.box(b, "concrete", [0.7, 0.7, 0.7]);
  // The mast.
  k.box([-0.25, RY, -0.25, 0.25, 46, 0.25], "rust", T.red, { collide: false });
  for (let y = RY + 2; y < 45; y += 3)
    k.box([-0.9, y, -0.05, 0.9, y + 0.1, 0.05], "rust", T.red, { collide: false });
  // A red band under the cab (the tower's mark from far away).
  k.box(
    [-TW - 0.05, CAB - 2.2, -TW - 0.05, TW + 0.05, CAB - 1.2, TW + 0.05],
    "paint",
    [0.62, 0.1, 0.08],
    { collide: false },
  );
  far.box(
    [-CABW - 1.4, CAB - 0.4, -CABW - 1.4, CABW + 1.4, CAB + CABH + 0.45, CABW + 1.4],
    "paint",
    [0.45, 0.5, 0.55],
    { collide: false },
  );
  far.box(
    [-TW - 0.05, CAB - 2.2, -TW - 0.05, TW + 0.05, CAB - 1.2, TW + 0.05],
    "paint",
    [0.62, 0.1, 0.08],
    { collide: false },
  );
  far.box([-0.25, RY, -0.25, 0.25, 46, 0.25], "paint", [0.6, 0.15, 0.1], { collide: false });
  plan.tower.cab = { y: CAB, half: CABW, roof: RY };
  plan.tower.door = [2.5, TW];
  plan.tower.size = [2 * (CABW + 1.4), 46, 2 * (CABW + 1.4)];
  return { k, far };
}

// ------------------------------------------------------------------------------- guard post
/**
 * The wall's guard posts (owner, 2026-11-14: "make sure buildings enterable/door/stairs"): a
 * stone shaft with a door, an iron ladder inside it (ladders.ts MODEL_LADDERS "bw-post") up
 * through a hatch into the cab: a waist wall, open windows all round, a roof. 4.4 m square,
 * the cab 6 m square at 6.6 m.
 */
export const POST = { half: 2.2, wall: 0.35, cab: 6.6, cabHalf: 3.0, roof: 8.9 };
function post() {
  const k = createTexturedKit();
  const far = createTexturedKit();
  const { half: H, wall: W, cab: C, cabHalf: CH, roof: R } = POST;
  k.box([-H - 0.3, -1.2, -H - 0.3, H + 0.3, 0.1, H + 0.3], "stone", T.stoneDark);
  // The shaft: a door in the south face, slits in the others.
  wallX(
    k,
    -H,
    H,
    H - W,
    H,
    0.1,
    C - 0.3,
    [
      [-0.55, 0.55, 0.1, 2.3],
      [-0.2, 0.2, 3.6, 5.0],
    ],
    "stone",
    T.stone,
  );
  wallX(k, -H, H, -H, -H + W, 0.1, C - 0.3, [[-0.2, 0.2, 3.6, 5.0]], "stone", T.stone);
  wallZ(k, -H + W, H - W, H - W, H, 0.1, C - 0.3, [[-0.2, 0.2, 3.6, 5.0]], "stone", T.stone);
  wallZ(k, -H + W, H - W, -H, -H + W, 0.1, C - 0.3, [[-0.2, 0.2, 3.6, 5.0]], "stone", T.stone);
  // The cab's floor, a hatch over the ladder (x -0.6..0.6, z -1.85..-0.85) with rails on its
  // sides (the climber steps out south of it).
  const hx = 0.6,
    hz0 = -H + W,
    hz1 = -0.85;
  k.box([-CH, C - 0.3, -CH, CH, C, hz0], "concrete", [0.8, 0.8, 0.78]);
  k.box([-CH, C - 0.3, hz1, CH, C, CH], "concrete", [0.8, 0.8, 0.78]);
  k.box([-CH, C - 0.3, hz0, -hx, C, hz1], "concrete", [0.8, 0.8, 0.78]);
  k.box([hx, C - 0.3, hz0, CH, C, hz1], "concrete", [0.8, 0.8, 0.78]);
  for (const sx of [-1, 1])
    k.box([sx * hx - 0.03, C, hz0, sx * hx + 0.03, C + 1.0, hz1], "rust", T.rail, { lod: 0 });
  // The cab: a waist wall, posts at the corners and mid-sides, the roof with an overhang.
  for (const s of [-1, 1]) {
    k.box(
      [-CH, C, s > 0 ? CH - 0.2 : -CH, CH, C + 1.05, s > 0 ? CH : -CH + 0.2],
      "concrete",
      [0.86, 0.84, 0.8],
    );
    k.box(
      [s > 0 ? CH - 0.2 : -CH, C, -CH + 0.2, s > 0 ? CH : -CH + 0.2, C + 1.05, CH - 0.2],
      "concrete",
      [0.86, 0.84, 0.8],
    );
  }
  for (const x of [-CH, -0.1, CH - 0.2])
    for (const z of [-CH, -0.1, CH - 0.2]) {
      if (x === -0.1 && z === -0.1) continue;
      k.box([x, C + 1.05, z, x + 0.2, R, z + 0.2], "concrete", [0.55, 0.55, 0.55]);
    }
  k.box([-CH - 0.5, R, -CH - 0.5, CH + 0.5, R + 0.3, CH + 0.5], "concrete", [0.62, 0.62, 0.6]);
  k.box(
    [-H - 0.05, C - 1.0, -H - 0.05, H + 0.05, C - 0.6, H + 0.05],
    "concrete",
    [0.62, 0.12, 0.1],
    { collide: false },
  );
  far.box([-H, -1.2, -H, H, C, H], "paint", [0.8, 0.77, 0.7], { collide: false });
  far.box([-CH, C, -CH, CH, R + 0.3, CH], "paint", [0.62, 0.62, 0.6], { collide: false });
  return { k, far, size: [2 * CH + 1, R + 0.3, 2 * CH + 1] };
}

// ----------------------------------------------------------------------------- bridge, quay
const MOAT = 16.0,
  WATER = -3.0;
function bridge() {
  const k = createTexturedKit();
  const far = createTexturedKit();
  const L = MOAT + 2.0,
    W = 2.6; // half width
  // Deck from z = -L/2 to L/2 at y 0, parapets, the arch (two piers in the water, a vault).
  k.box([-W, -0.7, -L / 2, W, 0.02, L / 2], "cobble", T.court);
  for (const s of [-1, 1]) {
    k.box(
      [s * W - (s > 0 ? 0.5 : 0), 0, -L / 2, s * W + (s > 0 ? 0 : 0.5), 1.0, L / 2],
      "stone",
      T.stone,
    );
    k.box(
      [s * W - (s > 0 ? 0.55 : -0.05), 1.0, -L / 2, s * W + (s > 0 ? 0.05 : 0.55), 1.15, L / 2],
      "stone",
      T.stoneDark,
      { collide: false },
    );
  }
  for (const z of [-L / 2 + 4.5, L / 2 - 4.5])
    k.box([-W, -7, z - 1.2, W, -0.7, z + 1.2], "stone", T.stoneWet);
  // The vault between the piers: stepped stone under the deck.
  for (let i = 0; i < 4; i++) {
    const zz = L / 2 - 5.7 - i * 0.6;
    k.box([-W, -1.2 - i * 0.4, -zz, W, -0.7, zz], "stone", T.stoneDark, { collide: false });
  }
  far.box([-W, -2, -L / 2, W, 1.0, L / 2], "paint", [0.75, 0.72, 0.66], { collide: false });
  return { k, far, size: [2 * W + 1, 8, L] };
}

/** The quay: the moat's outer wall, a stadium offset MOAT out from the keep's face. */
function quay() {
  const k = createTexturedKit();
  const far = createTexturedKit();
  const RQ = RO + MOAT; // the quay's face
  const T2 = 1.0;
  const gaps = (x) => Math.abs(x) < 3.2; // the bridges' landings (x = 0, both sides)
  // Straight sides, the wall from the bed to 0.9 m over the yard, a gap for each bridge.
  for (const s of [1, -1]) {
    const z0 = s > 0 ? RQ : -RQ - T2,
      z1 = s > 0 ? RQ + T2 : -RQ;
    // Gaps at the bridges' landings and at the heads of the steps down to the water (the wall's
    // top under them is the yard's level).
    wallX(
      k,
      -HL,
      HL,
      z0,
      z1,
      -7,
      0.9,
      [
        [-3.2, 3.2, 0.0, 9],
        [-11.4, -9.8, 0.0, 9],
        [9.8, 11.4, 0.0, 9],
      ],
      "stone",
      T.stone,
    );
    // The part under the water darker (a wet band to the waterline).
    k.box(
      [-HL, -7, s > 0 ? RQ - 0.02 : -RQ, HL, WATER + 0.25, s > 0 ? RQ : -RQ + 0.02],
      "stone",
      T.stoneWet,
      { collide: false },
    );
    far.box([-HL, -2, z0, HL, 0.9, z1], "paint", [0.75, 0.72, 0.66], { collide: false });
    void gaps;
  }
  for (const e of [1, -1])
    for (let s = 0; s < SEG; s++) {
      const p = endPt(e, RQ + T2 / 2, segAngle(s)),
        q = endPt(e, RQ + T2 / 2, segAngle(s + 1));
      const [P, Q] = e > 0 ? [q, p] : [p, q]; // the moat side (inner) faces −n
      slabHoles(k, P, Q, T2, -7, 0.9, [], "stone", T.stone, { ext: 0.3 });
      far.slab(P[0], P[1], Q[0], Q[1], T2, -2, 0.9, "paint", [0.75, 0.72, 0.66], {
        collide: false,
      });
    }
  // A paved walk along the top behind the wall (the yard's ground dips between the moat's last
  // grid cell and the next: covered, walkable, a few centimetres over the yard).
  const AP = 3.6;
  for (const s of [1, -1])
    k.box(
      [-HL, -0.35, s > 0 ? RQ + T2 : -RQ - T2 - AP, HL, 0.06, s > 0 ? RQ + T2 + AP : -RQ - T2],
      "cobble",
      T.court,
      { skip: ["bottom"] },
    );
  for (const e of [1, -1])
    for (let s = 0; s < SEG; s++) {
      const a0 = segAngle(s),
        a1 = segAngle(s + 1);
      k.poly(
        [
          endPt(e, RQ + T2 - 0.1, a0),
          endPt(e, RQ + T2 + AP, a0),
          endPt(e, RQ + T2 + AP, a1),
          endPt(e, RQ + T2 - 0.1, a1),
        ],
        0.06,
        "cobble",
        T.court,
        { thick: 0.41 },
      );
    }
  // Steps down to the water (four: two on each long side), along the quay's face, 1.4 m wide,
  // 12 steps from the yard (0) to under the water, a gap in the parapet at their head.
  const steps = [];
  for (const s of [1, -1])
    for (const dir of [1, -1]) {
      const z = s * (RQ - 0.75);
      k.flight(
        "x",
        dir * 14,
        dir * 10.6,
        z - 0.7,
        z + 0.7,
        WATER - 0.4,
        3.4,
        12,
        "stone",
        T.stoneDark,
      );
      steps.push([dir * 12.3, +z.toFixed(2)]);
    }
  plan.quay = { face: RQ, steps, water: WATER };
  return { k, far, size: [2 * (HL + RQ + T2 + 3.6), 8, 2 * (RQ + T2 + 3.6)] };
}

// ------------------------------------------------------------------------------------- write
const K = keep();
await publishTextured("bw-keep", K.k, K.far, {
  tag: TAG,
  title: "Blackwater Prison: the keep",
  source: "art/blender/br/build_blackwater.mjs",
  use: "Blackwater Prison (2026-11-14): the oval keep in its moat, four floors round a courtyard, cells, halls, battlements",
  class: "hero",
  ring: "building",
  size: plan.keep.size,
});
const TWR = tower();
await publishTextured("bw-tower", TWR.k, TWR.far, {
  tag: TAG,
  title: "Blackwater Prison: the watchtower",
  source: "art/blender/br/build_blackwater.mjs",
  use: "Blackwater Prison (2026-11-14): the 46 m watchtower, seven floors, the glazed cab, the mast",
  ring: "building",
  texture: 512,
  size: plan.tower.size,
});
const PST = post();
await publishTextured("bw-post", PST.k, PST.far, {
  tag: TAG,
  title: "Blackwater Prison: guard post",
  source: "art/blender/br/build_blackwater.mjs",
  use: "Blackwater Prison (2026-11-14): the wall's guard posts, a door, a ladder inside to the cab",
  class: "structure",
  ring: "structure",
  texture: 512,
  size: PST.size,
});
const BR = bridge();
await publishTextured("bw-bridge", BR.k, BR.far, {
  tag: TAG,
  title: "Blackwater Prison: moat bridge",
  source: "art/blender/br/build_blackwater.mjs",
  use: "Blackwater Prison (2026-11-14): stone bridge over the moat to the keep's gates",
  class: "structure",
  ring: "structure",
  texture: 512,
  size: BR.size,
});
const Q = quay();
await publishTextured("bw-quay", Q.k, Q.far, {
  tag: TAG,
  title: "Blackwater Prison: the moat's quay",
  source: "art/blender/br/build_blackwater.mjs",
  use: "Blackwater Prison (2026-11-14): the moat's outer wall, steps down to the water",
  class: "structure",
  ring: "structure",
  texture: 512,
  size: Q.size,
});
fs.writeFileSync("src/lib/fps/br/blackwater-plan.json", JSON.stringify(plan) + "\n");
console.log(`plan: ${plan.keep.rooms.length} keep rooms, ${plan.tower.rooms.length} tower rooms`);
