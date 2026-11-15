/**
 * The Bauhaus block (`bauhaus-block`), procedural (owner, 2026-11-15: "the apartment … still
 * broken inside with the stairs/floors", "outside" and "that building lag in the tight space",
 * three screenshots of the same block in the Arena District). The Free3D shell it replaces was a
 * single sheet, hollow and open in places: the storeys and the stair fitted inside it
 * (`bauhaus.py`, access-v25) could only cover part of it, the shell's balcony walls and its
 * diagonal band crossed the flats, the stair showed through its open ground floor, and the
 * corridors it left were narrow enough to catch on every jamb.
 *
 * Now a white four-storey block in the same 18 × 10.6 m footprint, built for play:
 *  - a lobby behind the front door, a switchback stair in the middle of the back (1.35 m flights,
 *    1 m landings, 0.17 m risers) from the ground to the roof, a stair house on the roof;
 *  - on every floor a hall in front of the stair and two flats, each of two rooms (a doorway
 *    between them), entered from the hall;
 *  - ribbon windows (glazed, solid) on all four sides, a balcony door from each corner room onto
 *    a rounded balcony at the front corners (floors 1–3), white parapets;
 *  - lit ceilings under every slab (the shell's down-facing undersides rendered near black).
 *
 *   node art/blender/br/build_bauhaus.mjs
 *
 * Model space: metres, pivot at the bottom centre, front +z at turn 0 (the old door's side).
 */
import { createTexturedKit, publishTextured } from "./textured-kit.mjs";

const TAG = "bauhaus-v4";
const X = 8.4, // the body's half width
  ZB = -4.0, // its back face
  ZF = 3.3; // its front face (the balconies reach 5.3)
const WT = 0.25; // outer walls
const IW = 0.2; // inner walls
const FH = 3.1; // storey
const BASE = 0.12; // ground floor (a step up from the street)
const LEVELS = 4;
const Y = (L) => BASE + L * FH; // floor tops; Y(4) is the roof
const SLAB = 0.25;
// The stair (centre of the back): flights along z, x −1.45..1.45 between its walls.
const SX = 1.45;
const SW = 0.25; // its side walls (x ±1.45..±1.7)
const S_BACK = ZB + WT; // −3.75
const MID = 1.0; // the half landing's depth (at the back)
const STEPS = 9;
const RUN = 0.28;
const S_FLIGHT0 = S_BACK + MID; // −2.75: flights from here…
const S_FLIGHT1 = S_FLIGHT0 + STEPS * RUN; // …to −0.23
const S_LAND1 = S_FLIGHT1 + 1.0; // 0.77: the floor landing's front, the hall beyond it
const DIV = 0.1; // the divider between the flights (x −0.1..0.1)
const PART = 5.0; // the flats' partition (x ±4.9..±5.1)
const DOOR_H = 2.15;
const WIN = [0.95, 2.45]; // window sill and head above the floor

const T = {
  white: [0.96, 0.96, 0.94],
  inner: [0.94, 0.93, 0.9],
  floor: [0.86, 0.74, 0.58],
  stair: [0.82, 0.82, 0.8],
  plinth: [0.55, 0.55, 0.54],
  ceiling: [1.0, 1.0, 0.98],
  glass: [0.32, 0.42, 0.48],
  rail: [0.16, 0.17, 0.18],
  roof: [0.62, 0.62, 0.6],
};

const k = createTexturedKit();
const far = createTexturedKit();

/** A wall along x (z0..z1 thick) with holes [x0, x1, yLow, yHigh, glass?]. */
function wallX(x0, x1, z0, z1, y0, y1, holes, m, tint, opts = {}) {
  const cuts = [x0, x1, ...holes.flatMap((h) => [h[0], h[1]])].sort((a, b) => a - b);
  for (let i = 0; i + 1 < cuts.length; i++) {
    const a = cuts[i],
      b = cuts[i + 1];
    if (b - a < 1e-3) continue;
    const mid = (a + b) / 2;
    const h = holes.find((q) => mid > q[0] && mid < q[1]);
    if (!h) k.box([a, y0, z0, b, y1, z1], m, tint, opts);
    else {
      if (h[2] > y0) k.box([a, y0, z0, b, Math.min(h[2], y1), z1], m, tint, opts);
      if (h[3] < y1) k.box([a, Math.max(h[3], y0), z0, b, y1, z1], m, tint, opts);
      if (h[4]) {
        const c = (z0 + z1) / 2;
        k.box([a, h[2], c - 0.03, b, h[3], c + 0.03], "glass", T.glass, { lod: opts.lod ?? 1 });
      }
    }
  }
}
/** The same along z (x0..x1 thick). */
function wallZ(z0, z1, x0, x1, y0, y1, holes, m, tint, opts = {}) {
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
      if (h[4]) {
        const c = (x0 + x1) / 2;
        k.box([c - 0.03, h[2], a, c + 0.03, h[3], b], "glass", T.glass, { lod: opts.lod ?? 1 });
      }
    }
  }
}
/** A lit ceiling over [x0, z0]–[x1, z1] at y (seen from below, lit as if it faced up). */
function ceiling(x0, z0, x1, z1, y) {
  k.quad([x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], "paint", T.ceiling, {
    lod: 0,
    n: [0, 1, 0],
    facing: [0, -1, 0],
  });
}

// ------------------------------------------------------------------ the shell
// Plinth (the ground floor's slab, a step proud of the street).
k.box([-X, 0, ZB, X, BASE, ZF], "concrete", T.plinth);
for (let L = 0; L < LEVELS; L++) {
  const y0 = Y(L),
    y1 = Y(L + 1);
  const win = (a, b, glass = true) => [a, b, y0 + WIN[0], y0 + WIN[1], glass];
  // Front: the lobby door on the ground floor (a window over the hall above), the rooms'
  // ribbons, the corner rooms' balcony doors (floors 1–3).
  const front = [win(-7.9, -5.4), win(-4.6, -2.2), win(2.2, 4.6), win(5.4, 7.9)];
  if (L === 0) front.push([-0.65, 0.65, y0, y0 + 2.3, false]);
  else {
    front.push(win(-0.9, 0.9));
    // The balcony doors (open) in the corner rooms' ribbons: glass either side.
    front.splice(3, 1, win(5.4, 6.1), [6.1, 7.1, y0, y0 + DOOR_H, false], win(7.1, 7.9));
    front.splice(0, 1, win(-7.9, -7.1), [-7.1, -6.1, y0, y0 + DOOR_H, false], win(-6.1, -5.4));
  }
  wallX(-X, X, ZF - WT, ZF, y0, y1, front, "paint", T.white);
  // Back: the rooms' ribbons, the stair's window at its half landing.
  wallX(
    -X,
    X,
    ZB,
    ZB + WT,
    y0,
    y1,
    [
      win(-7.9, -5.4),
      win(-4.6, -2.2),
      [-0.9, 0.9, y0 + FH / 2 + 0.9, y0 + FH / 2 + 2.1, true],
      win(2.2, 4.6),
      win(5.4, 7.9),
    ],
    "paint",
    T.white,
  );
  // Ends.
  for (const s of [-1, 1])
    wallZ(
      ZB + WT,
      ZF - WT,
      s > 0 ? X - WT : -X,
      s > 0 ? X : -X + WT,
      y0,
      y1,
      [[-2.6, 1.6, y0 + WIN[0], y0 + WIN[1], true]],
      "paint",
      T.white,
    );
}
// A dark plinth band and a thin white cornice at every slab line (round the outside only: a
// ring of boxes proud of the walls, never across the floor).
const ring = (y0, y1, out, tint, m = "paint") => {
  k.box([-X - out, y0, ZB - out, X + out, y1, ZB + 0.05], m, tint, { collide: false });
  k.box([-X - out, y0, ZF - 0.05, X + out, y1, ZF + out], m, tint, { collide: false });
  k.box([-X - out, y0, ZB + 0.05, -X + 0.05, y1, ZF - 0.05], m, tint, { collide: false });
  k.box([X - 0.05, y0, ZB + 0.05, X + out, y1, ZF - 0.05], m, tint, { collide: false });
};
for (let L = 1; L <= LEVELS; L++) ring(Y(L) - 0.3, Y(L) - 0.1, 0.06, [0.88, 0.88, 0.86]);

// ------------------------------------------------------------------ floors and ceilings
const IN = { x0: -X + WT, x1: X - WT, z0: ZB + WT, z1: ZF - WT };
/** A floor slab at y (its top) over the body, minus the stair's well (levels above ground). */
function floor(y, well) {
  const rects = well
    ? [
        [IN.x0, IN.z0, -SX, IN.z1],
        [SX, IN.z0, IN.x1, IN.z1],
        [-SX, S_FLIGHT1, SX, IN.z1],
      ]
    : [[IN.x0, IN.z0, IN.x1, IN.z1]];
  for (const [x0, z0, x1, z1] of rects) {
    k.box([x0, y - SLAB, z0, x1, y, z1], "wood", T.floor, { lod: 0, skip: ["bottom"] });
    if (y > BASE + 0.1) ceiling(x0, z0, x1, z1, y - SLAB - 0.02);
  }
}
for (let L = 1; L < LEVELS; L++) floor(Y(L), true);
// The roof slab (the stair house stands over its well).
for (const [x0, z0, x1, z1] of [
  [IN.x0, IN.z0, -SX, IN.z1],
  [SX, IN.z0, IN.x1, IN.z1],
  [-SX, S_FLIGHT1, SX, IN.z1],
]) {
  k.box([x0, Y(LEVELS) - SLAB, z0, x1, Y(LEVELS), z1], "concrete", T.roof, { skip: ["bottom"] });
  ceiling(x0, z0, x1, z1, Y(LEVELS) - SLAB - 0.02);
}
// The ground floor's finish.
k.box([IN.x0, BASE - 0.02, IN.z0, IN.x1, BASE, IN.z1], "wood", T.floor, {
  lod: 0,
  collide: false,
  skip: ["bottom"],
});
// Parapet round the roof (white, 0.95 m) with a dark coping.
const RP = Y(LEVELS) + 0.95;
k.box([-X, Y(LEVELS), ZB, X, RP, ZB + 0.2], "paint", T.white);
k.box([-X, Y(LEVELS), ZF - 0.2, X, RP, ZF], "paint", T.white);
k.box([-X, Y(LEVELS), ZB + 0.2, -X + 0.2, RP, ZF - 0.2], "paint", T.white);
k.box([X - 0.2, Y(LEVELS), ZB + 0.2, X, RP, ZF - 0.2], "paint", T.white);
ring(RP, RP + 0.06, 0.03, [0.3, 0.3, 0.3], "concrete");

// ------------------------------------------------------------------ the stair
for (let L = 0; L < LEVELS; L++) {
  const y0 = Y(L),
    half = FH / 2;
  // Flight A: up from the floor landing toward the back (x −1.45..−0.1).
  k.flight("z", S_FLIGHT1, S_FLIGHT0, -SX, -DIV, y0, half, STEPS, "concrete", T.stair);
  // The half landing at the back.
  k.box([-SX, y0 + half - SLAB, S_BACK, SX, y0 + half, S_FLIGHT0], "concrete", T.stair, {
    lod: 0,
    skip: ["bottom"],
  });
  ceiling(-SX, S_BACK, SX, S_FLIGHT0, y0 + half - SLAB - 0.02);
  // Flight B: from the half landing back to the next floor's landing (x 0.1..1.45).
  k.flight("z", S_FLIGHT0, S_FLIGHT1, DIV, SX, y0 + half, half, STEPS, "concrete", T.stair);
  // Their soffits (lit), the dark nosing on each tread.
  for (const [a0, a1, c0, c1, ya, yb] of [
    [S_FLIGHT1, S_FLIGHT0, -SX, -DIV, y0, y0 + half],
    [S_FLIGHT0, S_FLIGHT1, DIV, SX, y0 + half, y0 + 2 * half],
  ]) {
    k.quad(
      [c0, ya - 0.3, a0],
      [c1, ya - 0.3, a0],
      [c1, yb - 0.3, a1],
      [c0, yb - 0.3, a1],
      "concrete",
      T.stair,
      { lod: 0, n: [0, 1, 0], facing: [0, -1, 0] },
    );
    for (let s = 0; s < STEPS; s++) {
      const a = a0 + ((a1 - a0) * (s + 1)) / STEPS;
      const yy = ya + ((yb - ya) * (s + 1)) / STEPS;
      const d = Math.sign(a1 - a0) * 0.04;
      k.box(
        [c0, yy - 0.01, Math.min(a - d, a), c1, yy + 0.004, Math.max(a - d, a)],
        "paint",
        [0.25, 0.25, 0.25],
        {
          lod: 0,
          collide: false,
        },
      );
    }
  }
  // The divider between the flights (the half landing's width left open).
  k.box([-DIV, y0, S_FLIGHT0, DIV, y0 + FH, S_FLIGHT1], "paint", T.inner, { lod: 0 });
  // A handrail on it, both sides.
  for (const s of [-1, 1])
    k.beam(
      [s * (DIV + 0.04), y0 + (s < 0 ? 0 : half) + 0.9, s < 0 ? S_FLIGHT1 : S_FLIGHT0],
      [s * (DIV + 0.04), y0 + (s < 0 ? half : 2 * half) + 0.9, s < 0 ? S_FLIGHT0 : S_FLIGHT1],
      0.05,
      0.05,
      "rust",
      T.rail,
      { lod: 0 },
    );
}
// The stair's side walls, ground to the roof (the hall's walls in front of it carry the flats'
// doors).
const Z_HALL = IN.z1;
for (const s of [-1, 1]) {
  const x0 = s > 0 ? SX : -SX - SW,
    x1 = s > 0 ? SX + SW : -SX;
  for (let L = 0; L < LEVELS; L++) {
    const y0 = Y(L);
    wallZ(
      S_BACK,
      Z_HALL,
      x0,
      x1,
      y0,
      Y(L + 1) - (L === LEVELS - 1 ? 0 : SLAB),
      [[S_LAND1 + 0.5, S_LAND1 + 1.5, y0, y0 + DOOR_H, false]],
      "paint",
      T.inner,
      { lod: 0 },
    );
  }
}

// ------------------------------------------------------------------ the flats
for (let L = 0; L < LEVELS; L++) {
  const y0 = Y(L),
    y1 = Y(L + 1) - (L === LEVELS - 1 ? 0 : SLAB);
  for (const s of [-1, 1]) {
    // The partition between the two rooms, a doorway in its middle.
    const px = s * PART;
    wallZ(
      IN.z0,
      IN.z1,
      px - IW / 2,
      px + IW / 2,
      y0,
      y1,
      [[-0.5, 0.5, y0, y0 + DOOR_H, false]],
      "paint",
      T.inner,
      {
        lod: 0,
      },
    );
  }
}

// ------------------------------------------------------------------ the stair house on the roof
const HX = SX + SW,
  HZ0 = ZB,
  HZ1 = S_LAND1 + 0.25,
  HY = Y(LEVELS) + 2.6;
wallX(
  -HX,
  HX,
  HZ1 - 0.2,
  HZ1,
  Y(LEVELS),
  HY,
  [[-0.6, 0.6, Y(LEVELS), Y(LEVELS) + DOOR_H, false]],
  "paint",
  T.white,
);
for (const s of [-1, 1])
  k.box([s > 0 ? SX : -HX, Y(LEVELS), HZ0 + WT, s > 0 ? HX : -SX, HY, HZ1 - 0.2], "paint", T.white);
k.box([-HX, Y(LEVELS), HZ0, HX, HY, HZ0 + WT], "paint", T.white);
k.box([-HX - 0.1, HY, HZ0 - 0.1, HX + 0.1, HY + 0.25, HZ1 + 0.1], "concrete", T.roof, {
  skip: ["bottom"],
});
ceiling(-SX, HZ0 + WT, SX, HZ1 - 0.2, HY - 0.02);

// ------------------------------------------------------------------ the entrance
k.box([-1.6, Y(1) - 0.75, ZF, 1.6, Y(1) - 0.55, ZF + 1.3], "concrete", T.white, { skip: [] });
ceiling(-1.6, ZF, 1.6, ZF + 1.3, Y(1) - 0.77);

// ------------------------------------------------------------------ the balconies
/** The rounded corner balcony on side s (−1 west, +1 east) at floor y. */
function balcony(s, y) {
  const R = 1.8,
    cx = s * (X + 0.6 - R),
    cz = ZF + 2.0 - R;
  const pts = [[s * 4.9, ZF]];
  pts.push([s * (X + 0.6), ZF]);
  for (let i = 0; i <= 8; i++) {
    const a = (i / 8) * (Math.PI / 2);
    pts.push([cx + s * R * Math.cos(a), cz + R * Math.sin(a)]);
  }
  pts.push([s * 4.9, ZF + 2.0]);
  // (Wound the same way on both sides: the poly's fan faces up either way.)
  const P = s > 0 ? pts : [...pts].reverse();
  k.poly(P, y, "tiles", [0.85, 0.83, 0.8], { thick: 0.22 });
  k.poly(P, y - 0.22, "paint", T.ceiling, { down: true, collide: false });
  // Its edge and its solid white parapet (1.0 m) along the outside, from the wall round.
  const edge = [[s * X, ZF], ...pts.slice(1)]; // from the body's corner round to the front
  edge.push([s * 4.9, ZF + 2.0]);
  for (let i = 0; i + 1 < edge.length; i++) {
    const [ax, az] = edge[i],
      [bx, bz] = edge[i + 1];
    k.slab(ax, az, bx, bz, 0.12, y - 0.22, y + 1.0, "paint", T.white);
  }
  // The inner end (toward the middle) closed by the parapet too.
  k.slab(s * 4.9, ZF + 2.0, s * 4.9, ZF, 0.12, y - 0.22, y + 1.0, "paint", T.white);
  // A dark steel rail along the parapet's top.
  for (let i = 0; i + 1 < edge.length; i++)
    k.beam(
      [edge[i][0], y + 1.03, edge[i][1]],
      [edge[i + 1][0], y + 1.03, edge[i + 1][1]],
      0.06,
      0.05,
      "rust",
      T.rail,
    );
}
for (let L = 1; L < LEVELS; L++) for (const s of [-1, 1]) balcony(s, Y(L));

// ------------------------------------------------------------------ the far LOD
far.box([-X, 0, ZB, X, Y(LEVELS) + 0.95, ZF], "paint", T.white, { collide: false });
for (let L = 0; L < LEVELS; L++) {
  const y0 = Y(L);
  far.box([-7.9, y0 + WIN[0], ZF, 7.9, y0 + WIN[1], ZF + 0.04], "glass", T.glass, {
    collide: false,
  });
  far.box([-7.9, y0 + WIN[0], ZB - 0.04, 7.9, y0 + WIN[1], ZB], "glass", T.glass, {
    collide: false,
  });
  if (L > 0)
    for (const s of [-1, 1])
      far.box(
        [s > 0 ? 4.9 : -X - 0.6, y0 - 0.22, ZF, s > 0 ? X + 0.6 : -4.9, y0 + 1.0, ZF + 2.0],
        "paint",
        T.white,
        {
          collide: false,
        },
      );
}
far.box([-HX, Y(LEVELS), HZ0, HX, HY, HZ1], "paint", T.white, { collide: false });

await publishTextured("bauhaus-block", k, far, {
  tag: TAG,
  title: "Bauhaus block",
  source: "art/blender/br/build_bauhaus.mjs",
  use: "Towns, Downtown and the Arena District: a white four-storey block of flats (procedural, 2026-11-15; replaces the Free3D shell)",
  class: "building",
  ring: "dwelling",
  texture: 512,
  size: [2 * (X + 0.6), HY + 0.25, ZF + 2.0 - ZB],
});
