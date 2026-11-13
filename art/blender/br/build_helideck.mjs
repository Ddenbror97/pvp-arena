/**
 * A raised helideck (2026-11-13), in place of the downloaded "helipad" model at all five pads
 * (the military base, the airfield and the hospital's two). The download's chain-link fence came
 * out of decimation as solid dark panels full of holes, and its ground plate lay 2 cm over the
 * terrain (owner: "the helicopter platforms flicker … its the ground that flicker inside that
 * heli object").
 *
 * A 20 × 20 m steel deck 2.7 m up on nine columns and their beams (the helicopters stand on it;
 * cover and shade under it), its markings painted on (the white edge line, the yellow touchdown
 * circle, the H), green edge lights, an open railing round it, two straight stairs up against the
 * north and south edges (a way up from either side), and a wind sock on its pole.
 *
 *   node art/blender/br/build_helideck.mjs        (run from the repo root)
 *
 * Model space: metres, pivot at the bottom centre (the deck's centre on the ground). Original work.
 */
import { createKit, publish } from "./procedural-kit.mjs";

const DECK = [0.31, 0.33, 0.32],
  STEEL = [0.5, 0.52, 0.55],
  DARK = [0.24, 0.25, 0.26],
  WHITE = [0.93, 0.93, 0.9],
  YELLOW = [0.92, 0.74, 0.12],
  GREEN = [0.25, 0.85, 0.35],
  ORANGE = [0.95, 0.42, 0.1],
  STAIR = [0.45, 0.46, 0.47];
const R = 10; // half the deck
const Y = 2.7; // deck top
const TH = 0.35; // deck depth
const SW = 1.4; // stair width
/** 15 risers of 0.18 m from the ground to the deck: 14 steps between. */
const RISE = 0.18,
  STEPS = 14,
  TREAD = 0.28;
const RUN = STEPS * TREAD; // 3.92
/** Where each stair meets the deck (x of its landing) and the side it is on (z sign). */
const STAIRS = [
  { s: 1, top: -4.4 },
  { s: -1, top: 4.4 },
];
const k = createKit();
const { box } = k;
const lod1 = { lod: 1 };

// The deck and its columns and beams.
box([-R, Y - TH, -R, R, Y, R], DECK);
for (const x of [-R + 0.4, 0, R - 0.4])
  for (const z of [-R + 0.4, 0, R - 0.4])
    box([x - 0.25, 0, z - 0.25, x + 0.25, Y - TH, z + 0.25], STEEL);
for (const c of [-R + 0.4, 0, R - 0.4]) {
  box([-R, Y - TH - 0.4, c - 0.15, R, Y - TH, c + 0.15], DARK, { collide: false });
  box([c - 0.15, Y - TH - 0.4, -R, c + 0.15, Y - TH, R], DARK, { collide: false });
}
// Markings, drawn just over the deck (2 cm: no fight with it at any distance).
const M = Y + 0.02;
const paint = (b, colour) => box(b, colour, { collide: false });
paint([-R + 0.3, Y, -R + 0.3, R - 0.3, M, -R + 0.6], WHITE);
paint([-R + 0.3, Y, R - 0.6, R - 0.3, M, R - 0.3], WHITE);
paint([-R + 0.3, Y, -R + 0.6, -R + 0.6, M, R - 0.6], WHITE);
paint([R - 0.6, Y, -R + 0.6, R - 0.3, M, R - 0.6], WHITE);
// The touchdown circle: 40 strips round a 6 m radius, 0.5 m wide.
const N = 40,
  CR = 6;
for (let i = 0; i < N; i++) {
  const a0 = (i / N) * Math.PI * 2,
    a1 = ((i + 1.08) / N) * Math.PI * 2;
  k.beam(
    [Math.cos(a0) * CR, Y + 0.01, Math.sin(a0) * CR],
    [Math.cos(a1) * CR, Y + 0.01, Math.sin(a1) * CR],
    0.5,
    0.02,
    YELLOW,
  );
}
// The H (3 m wide, 4.5 m tall), its bars along z.
paint([-1.6, Y, -2.25, -0.9, M, 2.25], WHITE);
paint([0.9, Y, -2.25, 1.6, M, 2.25], WHITE);
paint([-0.9, Y, -0.35, 0.9, M, 0.35], WHITE);
// Edge lights every 2.5 m.
for (let t = -R + 1.25; t < R; t += 2.5)
  for (const [x, z] of [
    [t, -R + 0.15],
    [t, R - 0.15],
    [-R + 0.15, t],
    [R - 0.15, t],
  ])
    box([x - 0.1, Y, z - 0.1, x + 0.1, Y + 0.12, z + 0.1], GREEN, { collide: false, lod: 0 });

/** An open railing along x (fixed z) or z (fixed x) from a to b on the floor at y. */
const railing = (axis, at, a, b, y, opts = lod1) => {
  const [lo, hi] = [Math.min(a, b), Math.max(a, b)];
  const bx = (p0, p1, y0, y1, w, colour, o) =>
    axis === "x"
      ? box([p0, y0, at - w, p1, y1, at + w], colour, o)
      : box([at - w, y0, p0, at + w, y1, p1], colour, o);
  bx(lo, hi, y, y + 1.05, 0.05, STEEL, { visible: false });
  bx(lo, hi, y + 0.98, y + 1.05, 0.035, STEEL, { collide: false, ...opts });
  bx(lo, hi, y + 0.5, y + 0.55, 0.02, STEEL, { collide: false, ...opts });
  const n = Math.max(1, Math.round((hi - lo) / 1.6));
  for (let q = 0; q <= n; q++) {
    const c = lo + ((hi - lo) * q) / n;
    bx(Math.max(lo, c - 0.03), Math.min(hi, c + 0.03), y, y + 0.98, 0.03, STEEL, {
      collide: false,
      ...opts,
    });
  }
};
// Railing round the deck, open where each stair lands (its landing's width along the edge).
for (const z of [-1, 1]) {
  const st = STAIRS.find((q) => q.s === z);
  const gap = [st.top - SW / 2 - 0.05, st.top + SW / 2 + 0.05];
  railing("x", z * (R - 0.05), -R, gap[0], Y);
  railing("x", z * (R - 0.05), gap[1], R, Y);
}
railing("z", -R + 0.05, -R, R, Y);
railing("z", R - 0.05, -R, R, Y);

// The stairs: a landing at deck level outside the edge, then a straight flight along the edge,
// down away from the landing (toward −x on the south side, +x on the north).
for (const { s, top } of STAIRS) {
  const z0 = s * R,
    z1 = s * (R + SW); // the stair's band beside the deck
  const [za, zb] = [Math.min(z0, z1), Math.max(z0, z1)];
  const lx0 = top - SW / 2,
    lx1 = top + SW / 2;
  box([lx0, Y - TH, za, lx1, Y, zb], DECK); // landing
  // Down along x away from the landing: −x for the south stair (s = 1), +x for the north.
  const dir = s > 0 ? -1 : 1;
  const start = s > 0 ? lx0 : lx1; // the flight's top edge
  for (let q = 0; q < STEPS; q++) {
    const t = Y - q * RISE; // top of step q (q = 0 at the landing, a step down from it)
    const a = start + dir * q * TREAD,
      b = start + dir * (q + 1) * TREAD;
    box([Math.min(a, b), Math.max(0, t - RISE - 0.3), za, Math.max(a, b), t - RISE, zb], STAIR);
  }
  const foot = start + dir * RUN;
  // Stringers (both faces of the band), a soffit under the flight: the sawtooth hidden.
  for (const z of [za, zb]) {
    const quad = [
      [start, Y - RISE, z],
      [start, Y - RISE - 0.45, z],
      [foot, 0, z],
      [foot, 0.05, z],
    ];
    k.sheet(quad[0], quad[1], quad[2], quad[3], DARK, { lod: 1 });
    k.sheet(quad[3], quad[2], quad[1], quad[0], DARK, { lod: 1 });
  }
  // Handrails both sides, from the landing down to the foot, posts at the ends and middle.
  for (const z of [za + 0.04, zb - 0.04]) {
    k.beam([start, Y + 0.95, z], [foot, 0.95, z], 0.05, 0.05, STEEL);
    for (const t of [0, 0.5, 1]) {
      const x = start + (foot - start) * t,
        y = Y - RISE - (Y - RISE) * t;
      box([x - 0.03, y, z - 0.03, x + 0.03, y + 0.95, z + 0.03], STEEL, { collide: false });
    }
  }
  // The landing's outer rail and the end beyond the flight's top.
  railing("x", s * (R + SW - 0.05), lx0, lx1, Y);
  railing("z", s > 0 ? lx1 - 0.05 : lx0 + 0.05, za, zb, Y);
}

// The wind sock on the north-east corner: its pole and the sock, blowing off the deck.
box([R - 0.6, Y, -R + 0.4, R - 0.45, Y + 4.2, -R + 0.55], WHITE, { collide: false });
for (let i = 0; i < 4; i++)
  k.beam(
    [R - 0.5 + i * 0.6, Y + 4.0 - i * 0.12, -R + 0.47],
    [R - 0.5 + (i + 1) * 0.6, Y + 4.0 - (i + 1) * 0.12, -R + 0.47],
    0.42 - i * 0.06,
    0.42 - i * 0.06,
    i % 2 ? WHITE : ORANGE,
  );

const far = createKit();
far.box([-R, Y - TH, -R, R, Y, R], DECK, { lod: 2 });
for (const x of [-R + 0.4, R - 0.4])
  for (const z of [-R + 0.4, R - 0.4])
    far.box([x - 0.25, 0, z - 0.25, x + 0.25, Y - TH, z + 0.25], STEEL, { lod: 2 });
far.box([-1.6, Y, -2.25, 1.6, Y + 0.02, 2.25], WHITE, { lod: 2 });

await publish("helideck", k, far, {
  tag: "v1",
  title: "Raised helideck",
  source: "art/blender/br/build_helideck.mjs",
  use: "helicopter pads (the military base, the airfield, the hospital): a deck 2.7 m up, stairs",
  class: "structure",
  ring: "building",
  size: [2 * R + 2.6, Y + 4.6, 2 * (R + SW)],
});
