/**
 * A climbable radio mast (owner, 2026-11-04: "a big antenna tower … to climb up to and be there
 * sniping … think like a player"): a steel stair tower 31 m high (the game has no ladders, so the
 * climb is a railed stair winding round a solid core, a quarter turn per side), a 7 × 7 m sniper
 * platform with a waist-high steel parapet (crouch for cover) and the antenna above it with its
 * red lamps. One way up and down: the stair is the risk, the top is the reward.
 *
 *   node art/blender/br/build_mast.mjs        (run from the repo root)
 *
 * Writes public/fps/br/models/sniper-mast.lod{0,1,2}.glb, art/br/procedural/sniper-mast.boxes.json
 * and the models.json entry. Original work.
 */
import { createKit, publish } from "./procedural-kit.mjs";

const STEEL = [0.5, 0.52, 0.55],
  RED = [0.72, 0.16, 0.13],
  WHITE = [0.88, 0.88, 0.86],
  GRATE = [0.38, 0.39, 0.4],
  LAMP = [0.95, 0.25, 0.2];
const H = 31.2; // platform floor (26 flights of 1.2 m)
const C = 1.7; // core half-size
const W = 1.2; // stair width
const R = C + W; // outer half-size of the stair ring (2.9)
const RISE = 0.2,
  STEPS = 6; // per side: 1.2 m up
const k = createKit();
const { box } = k;

// The core (solid: the stair winds round it), painted in red and white bands.
for (let y = 0, i = 0; y < H; y += 4, i++)
  box([-C, y, -C, C, Math.min(H, y + 4), C], i % 2 ? WHITE : RED);
// The stair: per side a corner landing then six steps along the side; the sides go round
// counter-clockwise seen from above (south → east → north → west), each 1.2 m higher.
const sides = [
  // [axis, fixed coordinate band, from, to] for the walking direction along that side.
  { along: "x", c0: C, c1: R, a0: -C, a1: C, dir: 1 }, // south side, walking +x
  { along: "z", c0: C, c1: R, a0: C, a1: -C, dir: -1 }, // east side, walking −z
  { along: "x", c0: -R, c1: -C, a0: C, a1: -C, dir: -1 }, // north side, walking −x
  { along: "z", c0: -R, c1: -C, a0: -C, a1: C, dir: 1 }, // west side, walking +z
];
const corners = [
  [-R, -C, C, R], // SW corner (start of the south side)
  [C, R, C, R], // SE
  [C, R, -R, -C], // NE
  [-R, -C, -R, -C], // NW
];
let y = 0,
  n = 0;
while (y + RISE * STEPS <= H + 1e-6) {
  const s = sides[n % 4],
    [cx0, cx1, cz0, cz1] = corners[n % 4];
  // Corner landing at the current height (a 0.3 m slab under it).
  if (y > 0) box([cx0, y - 0.3, cz0, cx1, y, cz1], GRATE);
  const run = (s.a1 - s.a0) / STEPS;
  for (let i = 0; i < STEPS; i++) {
    const t = y + (i + 1) * RISE;
    const a = s.a0 + i * run,
      b = s.a0 + (i + 1) * run;
    const lo = Math.min(a, b),
      hi = Math.max(a, b);
    box(
      s.along === "x"
        ? [lo, Math.max(0, t - 0.3), s.c0, hi, t, s.c1]
        : [s.c0, Math.max(0, t - 0.3), lo, s.c1, t, hi],
      GRATE,
    );
  }
  // The outer railing along this flight and its landing (1 m above the treads).
  const top = y + RISE * STEPS;
  const out = s.c0 === C ? R : -R; // the railing's side
  const rail = (x0, z0, x1, z1, base) =>
    box(
      [Math.min(x0, x1), base, Math.min(z0, z1), Math.max(x0, x1), base + 1.05, Math.max(z0, z1)],
      STEEL,
    );
  if (s.along === "x") rail(-R, out - (out > 0 ? 0.06 : -0.06), R, out, y);
  else rail(out - (out > 0 ? 0.06 : -0.06), -R, out, R, y);
  // The landing's outer edges get their own railing (the flight rails run lower).
  if (y > 0) {
    if (Math.abs(cx0) === R || Math.abs(cx1) === R) {
      const x = Math.abs(cx0) === R ? cx0 : cx1;
      box(
        [
          Math.min(x, x - Math.sign(x) * 0.06),
          y,
          cz0,
          Math.max(x, x - Math.sign(x) * 0.06),
          y + 1.05,
          cz1,
        ],
        STEEL,
      );
    }
    if (Math.abs(cz0) === R || Math.abs(cz1) === R) {
      const z = Math.abs(cz0) === R ? cz0 : cz1;
      box(
        [
          cx0,
          y,
          Math.min(z, z - Math.sign(z) * 0.06),
          cx1,
          y + 1.05,
          Math.max(z, z - Math.sign(z) * 0.06),
        ],
        STEEL,
      );
    }
  }
  y = top;
  n++;
}
// The platform: the last two flights climb through an open stairwell (no slab over them, so
// there is head room), the rest of the 7 × 7 m deck is grating.
const P = 3.5;
const bands = [
  [-R, R, C, R], // south
  [C, R, -R, R], // east
  [-R, R, -R, -C], // north
  [-R, -C, -R, R], // west
];
const open = [bands[(n - 1) % 4], bands[(n - 2) % 4]];
const cuts = [-P, -R, -C, C, R, P];
for (let i = 0; i < 5; i++)
  for (let j = 0; j < 5; j++) {
    const x0 = cuts[i],
      x1 = cuts[i + 1],
      z0 = cuts[j],
      z1 = cuts[j + 1];
    const mx = (x0 + x1) / 2,
      mz = (z0 + z1) / 2;
    if (open.some(([a0, a1, b0, b1]) => mx > a0 && mx < a1 && mz > b0 && mz < b1)) continue;
    box([x0, H - 0.3, z0, x1, H, z1], GRATE);
  }
// The core's top is the platform floor too (and the antenna's base).
// Parapet: steel plates 1.1 m (cover when crouched), posts at the corners.
box([-P, H, -P, P, H + 1.1, -P + 0.12], STEEL);
box([-P, H, P - 0.12, P, H + 1.1, P], STEEL);
box([-P, H, -P, -P + 0.12, H + 1.1, P], STEEL);
box([P - 0.12, H, -P, P, H + 1.1, P], STEEL);
// Antenna and lamps (no collision above head height: nothing to stand on up there).
box([-0.25, H, -0.25, 0.25, H + 14, 0.25], WHITE, { collide: false });
for (const h of [H + 7, H + 14]) box([-0.4, h, -0.4, 0.4, h + 0.4, 0.4], LAMP, { collide: false });
for (const [sx, sz] of [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
])
  box(
    [
      Math.min(0, sx * 1.6) - 0.12,
      H + 3,
      Math.min(0, sz * 1.6) - 0.12,
      Math.max(0, sx * 1.6) + 0.12,
      H + 3.25,
      Math.max(0, sz * 1.6) + 0.12,
    ],
    STEEL,
    { collide: false },
  );
// Corner legs (visual lattice), ring braces every 8 m.
for (const [sx, sz] of [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
])
  box([sx * R - 0.15, 0, sz * R - 0.15, sx * R + 0.15, H, sz * R + 0.15], RED, { collide: false });

const far = createKit();
far.box([-R, 0, -R, R, H, R], RED, { lod: 2 });
far.box([-P, H, -P, P, H + 1.1, P], STEEL, { lod: 2 });
far.box([-0.25, H, -0.25, 0.25, H + 14, 0.25], WHITE, { lod: 2 });

await publish("sniper-mast", k, far, {
  title: "Climbable radio mast",
  source: "art/blender/br/build_mast.mjs",
  use: "a 32 m stair mast with a sniper platform (hilltops, the superstore)",
  class: "structure",
  ring: "hero",
  size: [2 * P, H + 14.4, 2 * P],
});
