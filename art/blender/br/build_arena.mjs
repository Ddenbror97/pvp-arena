/**
 * The Arena (owner, 2026-11-14: "the arena/stadium looks abit useless/empty. re build it to a
 * big arena with floors/levels … like a verdansk stadium area but better"; "ensure, enterble
 * buildings/levels/stairs/ building optimizations that rest of the map have"). One procedural
 * model, the centre of the Arena District (layout.ts arenaDistrict):
 *
 *  - the pitch (turf; the lines are their own model) behind a low wall, four players' tunnels
 *    under the stands at the middle of each side, out to the concourse;
 *  - the lower bowl: 18 tiers of 0.33 m (under the step height: climbed tier by tier anywhere)
 *    on all four sides and round the corners;
 *  - the ground concourse (L0) round it, 6 m high, with the rooms between it and the facade:
 *    changing rooms, gym, tactics room, toilets, kiosks with serving hatches, first aid,
 *    security, the club shop, stores (arena-plan.json lists them; layout.ts furnishes them);
 *    four 14 m gates through the facade, escalators up to L1;
 *  - the upper concourse (L1, 6.27 m) over it, open onto the top of the lower bowl, with the
 *    VIP lounge, the press room, the TV studio, bars and toilets along the facade;
 *  - the upper bowl: 16 tiers over L1 along the four sides, entered from the top walkway (L2,
 *    14.88 m) behind it;
 *  - four corner stair towers from the ground to L1, L2 and the roof catwalk (20 m), which runs
 *    round under the leading edge of the roof (sniper's gallery; floodlights, loudspeakers);
 *  - the roof over the stands on columns along the facade, two giant screens at the ends.
 *
 * Collision is exact boxes (tiers, slabs, walls, stairs, rails); seats, ceilings and trims are
 * drawn only. LOD 0 is everything; LOD 1 the shell (no rooms, seats or trims); LOD 2 a few boxes.
 *
 *   node art/blender/br/build_arena.mjs        (run from the repo root)
 *
 * Model space: metres, pivot at the bottom centre (the pitch), x along the pitch. Original work.
 */
import fs from "node:fs";
import { COLOURS as C, createKit, publish } from "./procedural-kit.mjs";

const TAG = "arena-v1";

// ------------------------------------------------------------------ dimensions
/** The front wall's inner face round the pitch (half sizes). */
const FX = 60,
  FZ = 42;
const FRONT_T = 0.3,
  FRONT_H = 0.95;
/** Lower bowl. */
const N1 = 18,
  RISE = 0.33,
  TREAD1 = 0.85;
const LX = FX + FRONT_T + N1 * TREAD1, // 75.6: its back
  LZ = FZ + FRONT_T + N1 * TREAD1; // 57.6
const LOWER_TOP = N1 * RISE; // 5.94
/** Floors. */
const F1 = LOWER_TOP + RISE; // 6.27
const SLAB = 0.3;
/** Facade (inner face) and its thickness. */
const OX = 92,
  OZ = 74,
  WALL = 0.4;
/** Upper bowl: its front (inner edge), tiers, the first tier's top. */
const UX = 76,
  UZ = 58;
const N2 = 16,
  TREAD2 = 0.8,
  U1 = 9.6;
const UBX = UX + N2 * TREAD2, // 88.8: its back
  UBZ = UZ + N2 * TREAD2; // 70.8
const UPPER_TOP = U1 + (N2 - 1) * RISE; // 14.55
const F2 = UPPER_TOP + RISE; // 14.88: the top walkway
const PARAPET = F2 + 1.15;
/** Roof catwalk (walking level) and the roof. */
const CAT = 20.0,
  CAT_IN = 71,
  CAT_W = 1.6;
const ROOF = 22.6,
  ROOF_IN = 69;
/** Tunnels: half width, clear height. */
const TUN = 3,
  TUN_H = 3.0;
/** Gates: half width, height. */
const GATE = 7,
  GATE_H = 4.6;
/** Rooms: L0 between the corridor and the facade; L1 along the facade under the upper bowl. */
const ROOM0 = 8.6, // depth (from the facade inward)
  ROOM1 = 6.4,
  ROOM1_H = 3.2;
const DOOR = 2.2,
  DOOR_H = 2.6;

const K = {
  concrete: [0.66, 0.65, 0.62],
  concreteDark: [0.45, 0.45, 0.44],
  facade: [0.88, 0.89, 0.9],
  facadeBand: [0.12, 0.27, 0.62],
  accent: [0.12, 0.27, 0.62],
  white: [0.93, 0.93, 0.92],
  seatA: [0.12, 0.27, 0.62],
  seatB: [0.9, 0.9, 0.88],
  seatC: [0.75, 0.12, 0.14],
  turf: [0.2, 0.46, 0.18],
  turfDark: [0.17, 0.41, 0.16],
  floor0: [0.52, 0.53, 0.53],
  floor1: [0.43, 0.42, 0.4],
  carpet: [0.25, 0.24, 0.28],
  wallIn: [0.85, 0.86, 0.85],
  wallRoom: [0.8, 0.83, 0.86],
  tile: [0.88, 0.9, 0.9],
  ceiling: [0.93, 0.94, 0.93],
  light: [1, 0.99, 0.94],
  steel: C.steel,
  rail: C.rail,
  stair: [0.62, 0.63, 0.62],
  roof: [0.82, 0.83, 0.85],
  roofDark: [0.35, 0.36, 0.38],
  screen: [0.05, 0.06, 0.08],
  screenFace: [0.1, 0.22, 0.42],
  lamp: [1, 0.98, 0.85],
  glass: C.glass,
  counter: [0.72, 0.72, 0.7],
  kioskSign: [0.95, 0.75, 0.2],
};

const k = createKit();
const { box } = k;
/** A box mirrored into all four quadrants (x and z signs). `b` in the +x +z quadrant. */
const quad4 = (b, colour, opts) => {
  for (const sx of [1, -1])
    for (const sz of [1, -1]) {
      const [x0, y0, z0, x1, y1, z1] = b;
      const xa = sx > 0 ? x0 : -x1,
        xb = sx > 0 ? x1 : -x0,
        za = sz > 0 ? z0 : -z1,
        zb = sz > 0 ? z1 : -z0;
      box([xa, y0, za, xb, y1, zb], colour, opts);
    }
};
/**
 * A rectangular ring band between half sizes (ax, az) and (bx, bz), y0..y1: the two long sides
 * across the full width, the two ends between them. `cut(side, a0, a1)` returns spans along the
 * side to leave out ([a0, a1] runs along x for the sides ±z, along z for the ends ±x).
 */
function ring(ax, az, bx, bz, y0, y1, colour, opts = {}, cuts = []) {
  const run = (side, from, to, make) => {
    let spans = [[from, to]];
    for (const c of cuts.filter((c) => c.side === side))
      spans = spans.flatMap(([a, b]) =>
        c.a1 <= a || c.a0 >= b
          ? [[a, b]]
          : [
              [a, Math.max(a, c.a0)],
              [Math.min(b, c.a1), b],
            ].filter(([p, q]) => q - p > 1e-3),
      );
    for (const [a, b] of spans) make(a, b);
  };
  run("+z", -bx, bx, (a, b) => box([a, y0, az, b, y1, bz], colour, opts));
  run("-z", -bx, bx, (a, b) => box([a, y0, -bz, b, y1, -az], colour, opts));
  run("+x", -az, az, (a, b) => box([ax, y0, a, bx, y1, b], colour, opts));
  run("-x", -az, az, (a, b) => box([-bx, y0, a, -ax, y1, b], colour, opts));
}
const ALL_SIDES = ["+z", "-z", "+x", "-x"];

// ------------------------------------------------------------------ the pitch
// Turf (drawn only: the ground under it is the pad), mown stripes.
for (let i = 0; i < 12; i++) {
  const x0 = -FX + (i * 2 * FX) / 12,
    x1 = -FX + ((i + 1) * 2 * FX) / 12;
  box([x0, 0, -FZ, x1, 0.04, FZ], i % 2 ? K.turf : K.turfDark, { collide: false, lod: 1 });
}
// The front wall round the pitch, cut at the four tunnels.
const tunnelCuts = [
  { side: "+z", a0: -TUN, a1: TUN },
  { side: "-z", a0: -TUN, a1: TUN },
  { side: "+x", a0: -TUN, a1: TUN },
  { side: "-x", a0: -TUN, a1: TUN },
];
ring(FX, FZ, FX + FRONT_T, FZ + FRONT_T, 0, FRONT_H, K.facadeBand, {}, tunnelCuts);
// A blue advertising band along the front wall's top.
ring(FX - 0.02, FZ - 0.02, FX, FZ, 0.35, FRONT_H, K.white, { collide: false, lod: 0 }, tunnelCuts);

// ------------------------------------------------------------------ the lower bowl
for (let t = 0; t < N1; t++) {
  const a = FRONT_T + t * TREAD1;
  const top = (t + 1) * RISE;
  const ax = FX + a,
    az = FZ + a,
    bx = ax + TREAD1,
    bz = az + TREAD1;
  // Over the tunnels: open in front (low tiers), roofed behind (the tiers start at its ceiling).
  if (top <= TUN_H + RISE) ring(ax, az, bx, bz, 0, top, K.concrete, {}, tunnelCuts);
  else {
    ring(ax, az, bx, bz, 0, top, K.concrete, {}, tunnelCuts);
    for (const side of ALL_SIDES) {
      const [x0, z0, x1, z1] =
        side === "+z"
          ? [-TUN, az, TUN, bz]
          : side === "-z"
            ? [-TUN, -bz, TUN, -az]
            : side === "+x"
              ? [ax, -TUN, bx, TUN]
              : [-bx, -TUN, -ax, TUN];
      box([x0, TUN_H, z0, x1, top, z1], K.concrete);
    }
  }
}
// Tunnel ceilings (lit) under the roofed part, and a strip light.
for (const side of ALL_SIDES) {
  let first = 0;
  while ((first + 1) * RISE <= TUN_H + RISE) first++;
  const a0 = FRONT_T + first * TREAD1,
    a1 = FRONT_T + N1 * TREAD1;
  const [x0, z0, x1, z1] =
    side === "+z"
      ? [-TUN, FZ + a0, TUN, FZ + a1]
      : side === "-z"
        ? [-TUN, -FZ - a1, TUN, -FZ - a0]
        : side === "+x"
          ? [FX + a0, -TUN, FX + a1, TUN]
          : [-FX - a1, -TUN, -FX - a0, TUN];
  k.ceiling(x0, TUN_H - 0.01, z0, x1, z1, K.ceiling);
}

// Seats on every tier (drawn only), blocks of colour; the aisles at the block ends stay bare.
function seats(tiers, tread, start, frontRise, y0, inset0, colourAt) {
  for (let t = 0; t < tiers; t++) {
    const a = start + t * tread;
    const top = y0 + t * RISE + frontRise;
    for (const side of ALL_SIDES) {
      const along = side === "+z" || side === "-z" ? inset0.x + a : inset0.z + a;
      const block = 10;
      const n = Math.max(1, Math.floor((2 * along - 2) / block));
      const len = (2 * along - 2) / n;
      for (let i = 0; i < n; i++) {
        const s0 = -along + 1 + i * len + 0.6,
          s1 = s0 + len - 1.2;
        // Tunnel notches: no seats over the open part.
        if (Math.abs((s0 + s1) / 2) < TUN + 3 && top < TUN_H + RISE + 0.01) continue;
        const colour = colourAt(t, i);
        const b0 = a + tread - 0.45,
          b1 = a + tread - 0.05;
        const place = (u0, u1, yy0, yy1, d0, d1) => {
          if (side === "+z")
            box([u0, yy0, inset0.z + d0, u1, yy1, inset0.z + d1], colour, OPT_SEAT);
          if (side === "-z")
            box([u0, yy0, -inset0.z - d1, u1, yy1, -inset0.z - d0], colour, OPT_SEAT);
          if (side === "+x")
            box([inset0.x + d0, yy0, u0, inset0.x + d1, yy1, u1], colour, OPT_SEAT);
          if (side === "-x")
            box([-inset0.x - d1, yy0, u0, -inset0.x - d0, yy1, u1], colour, OPT_SEAT);
        };
        // The row of seats as one block (pan to backrest): a third of the triangles of pans and
        // backs drawn apart, the same from a few metres off.
        place(s0, s1, top + 0.4, top + 0.86, b0 + 0.05, b1 - 0.04);
      }
    }
  }
}
const OPT_SEAT = { collide: false, lod: 0 };
seats(N1, TREAD1, FRONT_T, RISE, 0, { x: FX, z: FZ }, (t, i) =>
  (i + (t >> 2)) % 5 === 0 ? K.seatB : K.seatA,
);

// ------------------------------------------------------------------ the ground concourse (L0)
// Floor finish (drawn; the pad is the ground), the facade, the gates.
ring(LX, LZ, OX, OZ, 0, 0.02, K.floor0, { collide: false, lod: 1 });
const gateCuts = ALL_SIDES.map((side) => ({ side, a0: -GATE, a1: GATE }));
// The facade: plinth to the gates' head everywhere but the gates; above them to the parapet.
ring(OX, OZ, OX + WALL, OZ + WALL, 0, GATE_H, K.facade, {}, gateCuts);
// Windows in the facade on L0 (the rooms behind it) and on L1: glass bands (collide: a player
// is not walked through glass, bullets stop on it like on a wall).
const WIN = [
  [1.2, 3.6],
  [GATE_H, F1 - 0.2],
];
for (const [ya, yb] of WIN.slice(1)) ring(OX, OZ, OX + WALL, OZ + WALL, ya, yb, K.facade);
// From L1 up to the parapet: glass from L1's sill to the band, then the top band.
ring(OX, OZ, OX + WALL, OZ + WALL, F1 - 0.2, F1 + 1.0, K.facade);
// The glass band: breakable panes (panes.ts: drawn and collided by the game while whole, an
// opening once shot; owner, 2026-11-14: "add breakble glas windows on buildings … downtown/
// stadium") between thin mullions.
/** Breakable panes in model space [x0, x1, z0, z1, y0, y1] (arena-plan.json → panes.ts). */
const PANES = [];
const MULL = 0.12,
  PANE = 3;
for (const side of ALL_SIDES) {
  const half = side === "+z" || side === "-z" ? OX + WALL : OZ + WALL;
  const n = Math.round((2 * half) / PANE);
  const w = (2 * half) / n;
  for (let i = 0; i <= n; i++) {
    const u = -half + i * w;
    const at = (u0, u1, c0, c1) =>
      side === "+z"
        ? [u0, c0 + OZ, u1, c1 + OZ]
        : side === "-z"
          ? [u0, -OZ - c1, u1, -OZ - c0]
          : side === "+x"
            ? [c0 + OX, u0, c1 + OX, u1]
            : [-OX - c1, u0, -OX - c0, u1];
    const [mx0, mz0, mx1, mz1] = at(u - MULL / 2, u + MULL / 2, 0, WALL);
    box([mx0, F1 + 1.0, mz0, mx1, F1 + 3.6, mz1], K.facade);
    if (i < n) {
      const [x0, z0, x1, z1] = at(u + MULL / 2, u + w - MULL / 2, 0.15, 0.21);
      PANES.push([x0, x1, z0, z1, F1 + 1.0, F1 + 3.6].map((v) => +v.toFixed(3)));
    }
  }
}
ring(OX, OZ, OX + WALL, OZ + WALL, F1 + 3.6, PARAPET, K.facade);
// The club's blue band round the top of the facade, and over the gates.
ring(OX + WALL, OZ + WALL, OX + WALL + 0.06, OZ + WALL + 0.06, F2 - 0.4, F2 + 0.8, K.facadeBand, {
  collide: false,
  lod: 1,
});
ring(OX + WALL, OZ + WALL, OX + WALL + 0.06, OZ + WALL + 0.06, GATE_H, GATE_H + 1.2, K.facadeBand, {
  collide: false,
  lod: 1,
});

// L1 slab over the concourse (holes: corner stairwells, escalators).
const STAIR = { u0: 80, u1: 84.6, v0: 62, v1: 70.4 }; // in the +x +z corner (x: u, z: v)
const ESC = [
  // Escalators on the long sides' corridor (along x, rising toward +x): x0..x1, z0..z1.
  { x0: 30, x1: 43, z0: 60.4, z1: 63.2 },
  { x0: -43, x1: -30, z0: 60.4, z1: 63.2 },
];
/** A slab over the ring band x LX..OX / z LZ..OZ with rectangular holes (world x/z). */
function slabRing(y0, y1, colour, holes) {
  // The four sides and corners as rectangles, each minus the holes inside it.
  const rects = [];
  for (const sz of [1, -1]) {
    rects.push([-LX, sz > 0 ? LZ : -OZ, LX, sz > 0 ? OZ : -LZ]);
  }
  for (const sx of [1, -1]) rects.push([sx > 0 ? LX : -OX, -LZ, sx > 0 ? OX : -LX, LZ]);
  for (const sx of [1, -1])
    for (const sz of [1, -1])
      rects.push([sx > 0 ? LX : -OX, sz > 0 ? LZ : -OZ, sx > 0 ? OX : -LX, sz > 0 ? OZ : -LZ]);
  for (const r of rects)
    minus(r, holes).forEach(([a, b, c, d]) => box([a, y0, b, c, y1, d], colour));
}
/** A rectangle [x0,z0,x1,z1] minus holes, as rectangles (strips along x between hole edges). */
function minus(r, holes) {
  const [x0, z0, x1, z1] = r;
  const hs = holes
    .map(([a, b, c, d]) => [Math.max(a, x0), Math.max(b, z0), Math.min(c, x1), Math.min(d, z1)])
    .filter(([a, b, c, d]) => c - a > 1e-3 && d - b > 1e-3);
  if (!hs.length) return [r];
  const xs = [...new Set([x0, x1, ...hs.flatMap(([a, , c]) => [a, c])])].sort((p, q) => p - q);
  const out = [];
  for (let i = 0; i + 1 < xs.length; i++) {
    const a = xs[i],
      c = xs[i + 1];
    const mid = (a + c) / 2;
    const cover = hs.filter(([h0, , h1]) => mid > h0 && mid < h1).map(([, b, , d]) => [b, d]);
    cover.sort((p, q) => p[0] - q[0]);
    let z = z0;
    for (const [b, d] of cover) {
      if (b > z + 1e-3) out.push([a, z, c, b]);
      z = Math.max(z, d);
    }
    if (z1 > z + 1e-3) out.push([a, z, c, z1]);
  }
  return out;
}
const cornerHoles = (r) =>
  [1, -1].flatMap((sx) =>
    [1, -1].map((sz) => {
      const xa = sx > 0 ? r.u0 : -r.u1,
        xb = sx > 0 ? r.u1 : -r.u0,
        za = sz > 0 ? r.v0 : -r.v1,
        zb = sz > 0 ? r.v1 : -r.v0;
      return [xa, za, xb, zb];
    }),
  );
// The landing strip at each floor (v0..v0+2) is floor; the hole is over the flights.
const stairHole = { ...STAIR, v0: STAIR.v0 + 2 };
const escHoles = ESC.flatMap((e) => [
  [e.x0, e.z0, e.x1, e.z1],
  [e.x0, -e.z1, e.x1, -e.z0],
]);
slabRing(F1 - SLAB, F1, K.floor1, [...cornerHoles(stairHole), ...escHoles]);
// The L0 ceiling (lit) under it.
for (const r of [
  [-LX, LZ, LX, OZ],
  [-LX, -OZ, LX, -LZ],
  [LX, -LZ, OX, LZ],
  [-OX, -LZ, -LX, LZ],
])
  k.ceiling(r[0], F1 - SLAB - 0.01, r[1], r[2], r[3], K.ceiling);
// Strip lights along the concourse ceilings.
for (const s of [1, -1]) {
  box(
    [-LX + 2, F1 - SLAB - 0.06, s * (LZ + 3) - 0.2, LX - 2, F1 - SLAB - 0.01, s * (LZ + 3) + 0.2],
    K.light,
    {
      collide: false,
      lod: 0,
    },
  );
  box(
    [s * (LX + 3) - 0.2, F1 - SLAB - 0.06, -LZ + 2, s * (LX + 3) + 0.2, F1 - SLAB - 0.01, LZ - 2],
    K.light,
    {
      collide: false,
      lod: 0,
    },
  );
}

// ------------------------------------------------------------------ escalators (L0 → L1)
// The ridden part: invisible steps under the escalator model (layout.ts places it), 19 steps
// of 0.33 m, side walls; railings round its hole on L1.
const ESC_STEPS = 19;
for (const e of ESC)
  for (const sz of [1, -1]) {
    const z0 = sz > 0 ? e.z0 : -e.z1,
      z1 = sz > 0 ? e.z1 : -e.z0;
    const run = (e.x1 - e.x0 - 1.2) / ESC_STEPS;
    // (The escalator rises toward +x on the +z side and toward −x on the −z side: the two runs
    // of a long side go opposite ways.)
    const up = sz > 0 ? 1 : -1;
    const start = up > 0 ? e.x0 + 0.6 : e.x1 - 0.6;
    for (let s = 0; s < ESC_STEPS; s++) {
      const a = start + up * s * run,
        b = start + up * (s + 1) * run;
      const top = (s + 1) * (F1 / ESC_STEPS);
      box(
        [Math.min(a, b), Math.max(0, top - 0.4), z0 + 0.25, Math.max(a, b), top, z1 - 0.25],
        K.stair,
        {
          visible: false,
        },
      );
    }
    // The top step runs onto L1 (the slab's hole edge): a short plate.
    const end = start + up * ESC_STEPS * run;
    box(
      [
        Math.min(end, end + up * 0.6),
        F1 - 0.3,
        z0 + 0.25,
        Math.max(end, end + up * 0.6),
        F1,
        z1 - 0.25,
      ],
      K.stair,
      {
        visible: false,
      },
    );
    // Its side walls (collision; the model's balustrades are drawn).
    box([e.x0, 0, z0, e.x1, F1 + 1.05, z0 + 0.25], K.rail, { visible: false });
    box([e.x0, 0, z1 - 0.25, e.x1, F1 + 1.05, z1], K.rail, { visible: false });
    // On L1: a railing across the low end of the hole.
    const low = up > 0 ? e.x0 : e.x1 - 0.2;
    box([low, F1, z0, low + 0.2, F1 + 1.05, z1], K.rail, { visible: false });
  }

// ------------------------------------------------------------------ rooms
/** The plan for layout.ts: rooms (kind, rectangle in model space, floor height, door point). */
const plan = { tag: TAG, rooms: [], escalators: [], gates: [], tunnels: [], screens: [] };
/**
 * A row of rooms along one side between the corridor line and the facade. `side`: "+z" etc.;
 * `depth`: from the facade inward; `cells`: [from, to, kind] along the side (x for ±z, z for
 * ±x); floor y, wall height h; kiosks get a serving hatch instead of a door.
 */
function roomRow(side, depth, cells, y, h, ceilingAt) {
  const outer = side === "+z" || side === "-z" ? OZ : OX;
  const inner = outer - depth;
  const s = side[0] === "+" ? 1 : -1;
  const alongX = side === "+z" || side === "-z";
  const W = (a0, a1, c0, c1, y0, y1, holes, colour) =>
    alongX
      ? k.wall("x", a0, a1, Math.min(c0, c1), Math.max(c0, c1), y0, y1, holes, colour, { lod: 0 })
      : k.wall("z", a0, a1, Math.min(c0, c1), Math.max(c0, c1), y0, y1, holes, colour, { lod: 0 });
  const across = (at, c0, c1, y0, y1, holes, colour) =>
    // A partition at `at` along the side, from c0 to c1 (inward from the facade).
    alongX
      ? k.wall(
          "z",
          Math.min(c0, c1),
          Math.max(c0, c1),
          at - 0.075,
          at + 0.075,
          y0,
          y1,
          holes,
          colour,
          { lod: 0 },
        )
      : k.wall(
          "x",
          Math.min(c0, c1),
          Math.max(c0, c1),
          at - 0.075,
          at + 0.075,
          y0,
          y1,
          holes,
          colour,
          { lod: 0 },
        );
  for (const [a0, a1, kind] of cells) {
    const mid = (a0 + a1) / 2;
    const kiosk = kind === "kiosk" || kind === "bar";
    // The room's front: a door (or a hatch and a side door for a kiosk).
    const holes = kiosk
      ? [
          [mid - 3, mid + 1.5, y + 1.0, y + 2.3],
          [a1 - 2.6, a1 - 0.4, y, y + DOOR_H],
        ]
      : kind === "lounge"
        ? [
            [a0 + 1, mid - 1.5, y + 0.9, y + h - 0.4],
            [mid - DOOR / 2, mid + DOOR / 2, y, y + DOOR_H],
            [mid + 1.5, a1 - 1, y + 0.9, y + h - 0.4],
          ]
        : [[mid - DOOR / 2, mid + DOOR / 2, y, y + DOOR_H]];
    W(a0, a1, s * inner, s * (inner + 0.15), y, y + h, holes, K.wallRoom);
    // A lounge's glass front: breakable panes in its two openings.
    if (kind === "lounge")
      for (const [h0, h1] of [
        [a0 + 1, mid - 1.5],
        [mid + 1.5, a1 - 1],
      ])
        for (let q = h0; q < h1 - 0.01; q += (h1 - h0) / Math.ceil((h1 - h0) / 3)) {
          const q1 = q + (h1 - h0) / Math.ceil((h1 - h0) / 3);
          const c0 = Math.min(s * inner, s * (inner + 0.15)) + 0.045,
            c1 = c0 + 0.06;
          const b = alongX ? [q, q1, c0, c1] : [c0, c1, q, q1];
          PANES.push([...b, y + 0.9, y + h - 0.4].map((v) => +v.toFixed(3)));
        }
    across(a0, s * inner, s * outer, y, y + h, [], K.wallRoom);
    across(a1, s * inner, s * outer, y, y + h, [], K.wallRoom);
    // Kiosk counter behind the hatch, its sign over it.
    if (kiosk) {
      const c = s * (inner + 0.15 + 0.35);
      if (alongX) {
        box([mid - 3, y, c - 0.3, mid + 1.5, y + 1.0, c + 0.3], K.counter, { lod: 0 });
        box(
          [
            mid - 3,
            y + 2.4,
            s * inner - s * 0.04 - 0.02,
            mid + 1.5,
            y + 2.9,
            s * inner - s * 0.04 + 0.02,
          ],
          K.kioskSign,
          {
            collide: false,
            lod: 0,
          },
        );
      } else {
        box([c - 0.3, y, mid - 3, c + 0.3, y + 1.0, mid + 1.5], K.counter, { lod: 0 });
        box(
          [
            s * inner - s * 0.04 - 0.02,
            y + 2.4,
            mid - 3,
            s * inner - s * 0.04 + 0.02,
            y + 2.9,
            mid + 1.5,
          ],
          K.kioskSign,
          {
            collide: false,
            lod: 0,
          },
        );
      }
    }
    if (ceilingAt) {
      const [x0, z0, x1, z1] = alongX
        ? [a0, Math.min(s * inner, s * outer), a1, Math.max(s * inner, s * outer)]
        : [Math.min(s * inner, s * outer), a0, Math.max(s * inner, s * outer), a1];
      box([x0, y + h, z0, x1, y + h + 0.15, z1], K.concreteDark, { lod: 0 });
      k.ceiling(x0, y + h - 0.01, z0, x1, z1, K.ceiling);
    }
    const [x0, z0, x1, z1] = alongX
      ? [a0, Math.min(s * inner, s * outer), a1, Math.max(s * inner, s * outer)]
      : [Math.min(s * inner, s * outer), a0, Math.max(s * inner, s * outer), a1];
    plan.rooms.push({
      kind,
      side,
      x0: +x0.toFixed(2),
      z0: +z0.toFixed(2),
      x1: +x1.toFixed(2),
      z1: +z1.toFixed(2),
      y: +y.toFixed(2),
      door: alongX
        ? [+mid.toFixed(2), +(s * inner).toFixed(2)]
        : [+(s * inner).toFixed(2), +mid.toFixed(2)],
    });
  }
}
// L0 rooms (to the ceiling slab), the long sides then the ends. Kinds per layout.ts arena.
roomRow(
  "+z",
  ROOM0,
  [
    [-74, -52, "lockers-home"],
    [-52, -36, "gym"],
    [-36, -20, "tactics"],
    [-20, -9, "kiosk"],
    [9, 20, "kiosk"],
    [20, 30, "toilets"],
    [44, 58, "lockers-away"],
    [58, 74, "showers"],
  ],
  0,
  F1 - SLAB,
  false,
);
roomRow(
  "-z",
  ROOM0,
  [
    [-74, -60, "toilets"],
    [-60, -46, "kiosk"],
    [-28, -16, "first-aid"],
    [-16, -9, "security"],
    [9, 22, "kiosk"],
    [22, 28, "store"],
    [46, 60, "shop"],
    [60, 74, "toilets"],
  ],
  0,
  F1 - SLAB,
  false,
);
for (const s of ["+x", "-x"])
  roomRow(
    s,
    ROOM0,
    [
      [-56, -42, "kiosk"],
      [-42, -30, "toilets"],
      [-30, -18, "store"],
      [-18, -9, "ticket"],
      [9, 20, "office"],
      [20, 32, "kiosk"],
      [32, 44, "toilets"],
      [44, 56, "staff"],
    ],
    0,
    F1 - SLAB,
    false,
  );
// L1 rooms along the facade (their own ceilings under the upper bowl).
roomRow(
  "+z",
  ROOM1,
  [
    [-74, -40, "lounge"],
    [-40, -28, "bar"],
    [-28, -14, "press"],
    [14, 30, "studio"],
    [30, 42, "toilets"],
    [42, 74, "lounge"],
  ],
  F1,
  ROOM1_H,
  true,
);
roomRow(
  "-z",
  ROOM1,
  [
    [-74, -58, "bar"],
    [-58, -46, "toilets"],
    [-46, -14, "lounge"],
    [14, 30, "bar"],
    [30, 42, "toilets"],
    [42, 74, "office"],
  ],
  F1,
  ROOM1_H,
  true,
);
for (const s of ["+x", "-x"])
  roomRow(
    s,
    ROOM1,
    [
      [-56, -40, "bar"],
      [-40, -28, "toilets"],
      [28, 40, "kiosk"],
      [40, 56, "office"],
    ],
    F1,
    ROOM1_H,
    true,
  );
// Tiled floors in the wet rooms, carpet in the lounges (drawn over the slab/ground).
for (const r of plan.rooms) {
  const c = ["toilets", "showers"].includes(r.kind)
    ? K.tile
    : r.kind === "lounge"
      ? K.carpet
      : null;
  if (c)
    box([r.x0 + 0.1, r.y, r.z0 + 0.1, r.x1 - 0.1, r.y + 0.015, r.z1 - 0.1], c, {
      collide: false,
      lod: 0,
    });
}

// ------------------------------------------------------------------ the upper bowl and L2
// Along the four sides only (the corners are the stair towers): tiers as slabs over L1.
for (let t = 0; t < N2; t++) {
  const top = U1 + t * RISE;
  const a = t * TREAD2;
  // Long sides (±z): x within ±UX; ends (±x): z within ±UZ.
  for (const s of [1, -1]) {
    const z0 = UZ + a,
      z1 = z0 + TREAD2;
    box([-UX, top - 0.45, s > 0 ? z0 : -z1, UX, top, s > 0 ? z1 : -z0], K.concrete);
    const x0 = UX + a,
      x1 = x0 + TREAD2;
    box([s > 0 ? x0 : -x1, top - 0.45, -UZ, s > 0 ? x1 : -x0, top, UZ], K.concrete);
    // The ends of a long side's tiers against the towers: a stepped side wall (railing height).
    for (const ex of [1, -1]) {
      box(
        [
          ex > 0 ? UX - 0.25 : -UX,
          top,
          s > 0 ? z0 : -z1,
          ex > 0 ? UX : -UX + 0.25,
          top + 1.1,
          s > 0 ? z1 : -z0,
        ],
        K.concrete,
      );
      box(
        [
          s > 0 ? x0 : -x1,
          top,
          ex > 0 ? UZ - 0.25 : -UZ,
          s > 0 ? x1 : -x0,
          top + 1.1,
          ex > 0 ? UZ : -UZ + 0.25,
        ],
        K.concrete,
      );
    }
  }
}
// The upper bowl's underside skin (lit like a ceiling): a sloped sheet over L1 per side.
for (const s of [1, -1]) {
  const up = [0, 1, 0];
  // (A tread lower than the tiers' undersides: the sloped skin passes under every tier, never
  // through one, so their stepped undersides never show through it.)
  const yF = U1 - 0.45 - RISE - 0.04,
    yB = UPPER_TOP - 0.45 - RISE - 0.04;
  k.sheet([-UX, yF, s * UZ], [UX, yF, s * UZ], [UX, yB, s * UBZ], [-UX, yB, s * UBZ], K.ceiling, {
    n: up,
  });
  k.sheet([-UX, yB, s * UBZ], [UX, yB, s * UBZ], [UX, yF, s * UZ], [-UX, yF, s * UZ], K.ceiling, {
    n: up,
  });
  k.sheet([s * UX, yF, -UZ], [s * UX, yF, UZ], [s * UBX, yB, UZ], [s * UBX, yB, -UZ], K.ceiling, {
    n: up,
  });
  k.sheet([s * UBX, yB, -UZ], [s * UBX, yB, UZ], [s * UX, yF, UZ], [s * UX, yF, -UZ], K.ceiling, {
    n: up,
  });
}
// The front parapet of the upper bowl (over the lower bowl's back).
for (const s of [1, -1]) {
  box([-UX, U1 - 0.45, s > 0 ? UZ : -UZ - 0.2, UX, U1 + 1.0, s > 0 ? UZ + 0.2 : -UZ], K.white);
  box([s > 0 ? UX : -UX - 0.2, U1 - 0.45, -UZ, s > 0 ? UX + 0.2 : -UX, U1 + 1.0, UZ], K.white);
}
seats(N2, TREAD2, 0, 0, U1, { x: UX, z: UZ }, (t, i) =>
  (i + t) % 7 === 3 ? K.seatC : (i + (t >> 2)) % 4 === 0 ? K.seatB : K.seatA,
);
// L2: the top walkway behind the upper bowl, along the facade (sides), and the corner floors
// (the stair towers) at L1 and L2.
for (const s of [1, -1]) {
  box([-UX, F2 - SLAB, s > 0 ? UBZ : -OZ, UX, F2, s > 0 ? OZ : -UBZ], K.floor1);
  box([s > 0 ? UBX : -OX, F2 - SLAB, -UZ, s > 0 ? OX : -UBX, F2, UZ], K.floor1);
}
// Corner squares: L2 floor with the stair hole (L1 is part of slabRing).
for (const sx of [1, -1])
  for (const sz of [1, -1]) {
    const r = [sx > 0 ? UX : -OX, sz > 0 ? UZ : -OZ, sx > 0 ? OX : -UX, sz > 0 ? OZ : -UZ];
    const h = cornerHoles(stairHole).filter(
      ([a, b, c, d]) => a < r[2] && c > r[0] && b < r[3] && d > r[1],
    );
    for (const [a, b, c, d] of minus(r, h)) box([a, F2 - SLAB, b, c, F2, d], K.floor1);
  }

// ------------------------------------------------------------------ corner stair towers
/**
 * A switchback stair from y0 to y1 in the corner (sx, sz): flight A (u 80–82) rises away from
 * the landing at v 62–64, the half landing at v 68.4–70.4, flight B (u 82.6–84.6) back down to
 * the next floor's landing. Built in the +x +z corner's frame and mirrored.
 */
function stairs(y0, y1) {
  const steps = Math.ceil((y1 - y0) / 2 / 0.33);
  const half = (y1 - y0) / 2;
  const run = 0.3;
  const vA = STAIR.v0 + 2; // 64
  const vMid = vA + steps * run; // where the half landing starts
  for (let i = 0; i < steps; i++) {
    const r = (i + 1) * (half / steps);
    // Flight A: rising along +v.
    quad4([80, Math.max(y0, y0 + r - 0.35), vA + i * run, 82, y0 + r, vA + (i + 1) * run], K.stair);
    // Flight B: from the half landing down… rising along −v towards the next floor.
    quad4(
      [
        82.6,
        Math.max(y0 + half, y0 + half + r - 0.35),
        vMid - (i + 1) * run,
        84.6,
        y0 + half + r,
        vMid - i * run,
      ],
      K.stair,
    );
  }
  // The half landing.
  quad4([80, y0 + half - 0.3, vMid, 84.6, y0 + half, vMid + 2], K.stair);
  // The divider between the flights (not across the half landing), full height of this storey.
  quad4([82, y0, vA, 82.6, y1 + 1.1, vMid], K.concreteDark);
  return vMid + 2;
}
const towerTops = [];
let landingEnd = 0;
for (const [y0, y1] of [
  [0, F1],
  [F1, F2],
  [F2, CAT],
]) {
  landingEnd = Math.max(landingEnd, stairs(y0, y1));
  towerTops.push(y1);
}
// The stairwell's walls: the two long sides and the far end, ground to above the catwalk
// level; the landing end open at every floor.
quad4([79.8, 0, STAIR.v0 + 2, 80, CAT + 2.6, landingEnd + 0.2], K.wallIn);
quad4([84.6, 0, STAIR.v0 + 2, 84.8, CAT + 2.6, landingEnd + 0.2], K.wallIn);
quad4([79.8, 0, landingEnd, 84.8, CAT + 2.6, landingEnd + 0.2], K.wallIn);
// The top deck at the catwalk's level (from the stairwell's landing toward the pitch) and the
// bridge platform onto the catwalk's corner.
quad4([UX, CAT - SLAB, UZ, 84.8, CAT, STAIR.v0 + 2], K.floor1);
const PLAT = { x0: CAT_IN, z0: CAT_IN - (UX - UZ) - 1, x1: UX + 2.5, z1: UZ };
quad4([PLAT.x0, CAT - SLAB, PLAT.z0, PLAT.x1, CAT, PLAT.z1], K.floor1);
// Railings: the deck's open sides (toward the pitch past the platform, the far side), the
// platform's inner and outer edges.
quad4([UX, CAT, UZ, UX + 0.05, CAT + 1.05, STAIR.v0 + 2], K.rail);
quad4([84.6, CAT, UZ, 84.8, CAT + 1.05, STAIR.v0 + 2], K.rail);
quad4([PLAT.x1, CAT, UZ - 0.05, 84.6, CAT + 1.05, UZ], K.rail);
quad4([PLAT.x0, CAT, PLAT.z0, PLAT.x1, CAT + 1.05, PLAT.z0 + 0.05], K.rail);
quad4([PLAT.x1 - 0.05, CAT, PLAT.z0, PLAT.x1, CAT + 1.05, UZ - 0.05], K.rail);
// Tower walls over L2 toward the upper bowl ends and the top walkways: the stair box is closed
// by the walls above; the deck is open to the pitch.

// ------------------------------------------------------------------ the roof and the catwalk
// Columns along the facade (from the parapet to the roof), the roof slab over the stands.
for (const side of ALL_SIDES) {
  const half = side === "+z" || side === "-z" ? OX : OZ;
  for (let u = -half; u <= half + 1e-6; u += (2 * half) / 8) {
    const [x0, z0, x1, z1] =
      side === "+z"
        ? [u - 0.4, OZ, u + 0.4, OZ + WALL]
        : side === "-z"
          ? [u - 0.4, -OZ - WALL, u + 0.4, -OZ]
          : side === "+x"
            ? [OX, u - 0.4, OX + WALL, u + 0.4]
            : [-OX - WALL, u - 0.4, -OX, u + 0.4];
    box([x0, PARAPET, z0, x1, ROOF, z1], K.steel);
  }
}
const RIN_Z = ROOF_IN - (UX - UZ); // keep the roof's overhang the same on all sides
ring(ROOF_IN, RIN_Z, OX + WALL + 0.6, OZ + WALL + 0.6, ROOF, ROOF + 0.45, K.roof);
// Its leading edge: a blue fascia with floodlight boxes along it.
ring(ROOF_IN - 0.2, RIN_Z - 0.2, ROOF_IN, RIN_Z, ROOF - 1.0, ROOF + 0.45, K.facadeBand, {
  collide: false,
  lod: 1,
});
for (const side of ALL_SIDES) {
  const half = side === "+z" || side === "-z" ? ROOF_IN : RIN_Z;
  for (let u = -half + 4; u < half - 3; u += 7) {
    const [x0, z0, x1, z1] =
      side === "+z"
        ? [u, RIN_Z - 0.5, u + 2.2, RIN_Z - 0.2]
        : side === "-z"
          ? [u, -RIN_Z + 0.2, u + 2.2, -RIN_Z + 0.5]
          : side === "+x"
            ? [ROOF_IN - 0.5, u, ROOF_IN - 0.2, u + 2.2]
            : [-ROOF_IN + 0.2, u, -ROOF_IN + 0.5, u + 2.2];
    box([x0, ROOF - 0.9, z0, x1, ROOF - 0.1, z1], K.lamp, { collide: false, lod: 1 });
  }
}
// Lit underside of the roof.
for (const r of [
  [-ROOF_IN, RIN_Z, ROOF_IN, OZ + WALL + 0.6],
  [-ROOF_IN, -OZ - WALL - 0.6, ROOF_IN, -RIN_Z],
  [ROOF_IN, -OZ - WALL - 0.6, OX + WALL + 0.6, OZ + WALL + 0.6],
  [-OX - WALL - 0.6, -OZ - WALL - 0.6, -ROOF_IN, OZ + WALL + 0.6],
])
  k.ceiling(r[0], ROOF - 0.01, r[1], r[2], r[3], K.ceiling, { lod: 1 });
// The catwalk ring under the leading edge (walking level CAT), railings both sides, hangers.
const CZ = CAT_IN - (UX - UZ);
ring(CAT_IN, CZ, CAT_IN + CAT_W, CZ + CAT_W, CAT - 0.2, CAT, K.steel);
ring(CAT_IN - 0.05, CZ - 0.05, CAT_IN, CZ, CAT, CAT + 1.05, K.rail, { visible: false });
// (The outer rail stops short of the corners: the platforms to the stair towers join there.)
const BIG = 999;
ring(
  CAT_IN + CAT_W,
  CZ + CAT_W,
  CAT_IN + CAT_W + 0.05,
  CZ + CAT_W + 0.05,
  CAT,
  CAT + 1.05,
  K.rail,
  {
    visible: false,
  },
  [
    { side: "+z", a0: CAT_IN - 0.6, a1: BIG },
    { side: "+z", a0: -BIG, a1: -CAT_IN + 0.6 },
    { side: "-z", a0: CAT_IN - 0.6, a1: BIG },
    { side: "-z", a0: -BIG, a1: -CAT_IN + 0.6 },
    { side: "+x", a0: CZ - 0.6, a1: BIG },
    { side: "+x", a0: -BIG, a1: -CZ + 0.6 },
    { side: "-x", a0: CZ - 0.6, a1: BIG },
    { side: "-x", a0: -BIG, a1: -CZ + 0.6 },
  ],
);
// (Drawn rails: a handrail and a mid rail on each side.)
for (const [a, b] of [
  [CAT_IN - 0.04, CAT_IN],
  [CAT_IN + CAT_W, CAT_IN + CAT_W + 0.04],
]) {
  const d = b - CAT_IN;
  ring(a, a - CAT_IN + CZ, b, d + CZ, CAT + 1.0, CAT + 1.05, K.steel, { collide: false, lod: 0 });
  ring(a, a - CAT_IN + CZ, b, d + CZ, CAT + 0.5, CAT + 0.54, K.steel, { collide: false, lod: 0 });
}
// Hangers from the roof every 6 m.
for (const side of ALL_SIDES) {
  const half = side === "+z" || side === "-z" ? CAT_IN : CZ;
  for (let u = -half; u <= half; u += 6) {
    for (const off of [0.05, CAT_W - 0.05]) {
      const [x, z] =
        side === "+z"
          ? [u, CZ + off]
          : side === "-z"
            ? [u, -CZ - off]
            : side === "+x"
              ? [CAT_IN + off, u]
              : [-CAT_IN - off, u];
      box([x - 0.03, CAT + 1.05, z - 0.03, x + 0.03, ROOF, z + 0.03], K.steel, {
        collide: false,
        lod: 0,
      });
    }
  }
}
// The catwalk's corners meet the tower decks: the platform built above reaches it (its gap in
// the inner rail at the corner).

// ------------------------------------------------------------------ the giant screens
// One at each end, hung under the roof over the end stands, facing the pitch.
for (const s of [1, -1]) {
  const x = s * (ROOF_IN - 1.5);
  box([x - 0.6, 12.5, -11, x + 0.6, 19.5, 11], K.screen, { collide: false, lod: 1 });
  box(
    s > 0 ? [x - 0.64, 13, -10.4, x - 0.6, 19, 10.4] : [x + 0.6, 13, -10.4, x + 0.64, 19, 10.4],
    K.screenFace,
    { collide: false, lod: 1 },
  );
  for (const z of [-9, 9])
    box([x - 0.05, 19.5, z - 0.05, x + 0.05, ROOF, z + 0.05], K.steel, { collide: false, lod: 0 });
  plan.screens.push({ x: +x.toFixed(2), y: 12.5, facing: -s });
}

// ------------------------------------------------------------------ the plan
plan.escalators = ESC.flatMap((e) => [
  { x: (e.x0 + e.x1) / 2, z: (e.z0 + e.z1) / 2, up: 1 },
  { x: (e.x0 + e.x1) / 2, z: -(e.z0 + e.z1) / 2, up: -1 },
]);
plan.gates = ALL_SIDES.map((side) => ({ side }));
plan.tunnels = ALL_SIDES.map((side) => ({ side }));
Object.assign(plan, {
  panes: { arena: PANES },
  pitch: [FX, FZ],
  lower: [LX, LZ, LOWER_TOP],
  floors: [0, F1, F2, CAT],
  facade: [OX + WALL, OZ + WALL],
  roof: ROOF,
  catwalk: [CAT_IN, CZ, CAT_W],
  stair: STAIR,
});
fs.writeFileSync("src/lib/fps/br/arena-plan.json", JSON.stringify(plan, null, 1) + "\n");

// ------------------------------------------------------------------ far LOD
const far = createKit();
const F = (b, c) => far.box(b, c, { lod: 2 });
// Facade box with its top band, the bowl as a few steps, the roof ring, the pitch.
for (const [ax, az, bx, bz, y0, y1, c] of [
  [OX, OZ, OX + WALL, OZ + WALL, 0, PARAPET, K.facade],
  [OX, OZ, OX + WALL + 0.06, OZ + WALL + 0.06, F2 - 0.4, F2 + 0.8, K.facadeBand],
  [ROOF_IN, RIN_Z, OX + WALL + 0.6, OZ + WALL + 0.6, ROOF, ROOF + 0.45, K.roof],
  [FX, FZ, FX + 8, FZ + 8, 0, 2.6, K.seatA],
  [FX + 8, FZ + 8, LX, LZ, 0, LOWER_TOP, K.seatA],
  [UX, UZ, UBX, UBZ, U1, UPPER_TOP, K.seatA],
]) {
  F([-bx, y0, az, bx, y1, bz], c);
  F([-bx, y0, -bz, bx, y1, -az], c);
  F([ax, y0, -az, bx, y1, az], c);
  F([-bx, y0, -az, -ax, y1, az], c);
}
F([-FX, 0, -FZ, FX, 0.04, FZ], K.turf);

await publish("arena", k, far, {
  tag: TAG,
  title: "The Arena",
  source: "art/blender/br/build_arena.mjs",
  use: "Arena District (2026-11-14): the arena (pitch, two bowls, concourses, rooms, stair towers, roof catwalk)",
  class: "hero",
  ring: "hero",
  size: [2 * (OX + WALL + 0.6), ROOF + 0.45, 2 * (OZ + WALL + 0.6)],
  glass: true,
});
