/**
 * The Stadium's stand and pitch markings (owner, 2026-11-13: the map audit's Stadium site).
 *
 * `stadium-stand`: a 48 m covered terrace. Fourteen tiers of 0.33 m (under the step height, so
 * the terrace is climbed tier by tier anywhere along it) and 0.85 m deep, seat rows in the club's
 * blue and white on every tier, a front wall to the pitch, side walls stepping up with the tiers,
 * a back wall, and a cantilevered roof on columns over the whole terrace (shade, and a skyline
 * from far off). The pitch side is +z.
 *
 * `pitch-lines`: a football pitch's markings, 105 × 68 m along x, painted 2 cm over the turf:
 * touch and goal lines, the halfway line, the centre circle and spot, both penalty and goal
 * areas, the penalty spots and arcs. Nothing to collide with.
 *
 *   node art/blender/br/build_stand.mjs        (run from the repo root)
 *
 * Model space: metres, pivot at the bottom centre. Original work.
 */
import { createKit, publish } from "./procedural-kit.mjs";

const CONCRETE = [0.62, 0.61, 0.58],
  DARK = [0.33, 0.34, 0.36],
  STEEL = [0.5, 0.52, 0.55],
  ROOF = [0.82, 0.83, 0.85],
  BLUE = [0.12, 0.27, 0.62],
  WHITE = [0.9, 0.9, 0.88],
  LINE = [0.95, 0.95, 0.93];

// ------------------------------------------------------------------ the stand
const L = 48; // length along x
const H = L / 2;
const TIERS = 14,
  RISE = 0.33,
  TREAD = 0.85;
const FRONT = 6.5; // z of the front face (pitch side)
const TOP = TIERS * RISE; // 4.62
const BACK = FRONT - TIERS * TREAD; // -5.4
const ROOF_Y = TOP + 6.2;

const k = createKit();
const { box } = k;
// The front wall and the walk in front of the first tier.
box([-H, 0, FRONT - 0.3, H, 1.15, FRONT], CONCRETE);
// The tiers, each a solid step from the ground (the terrace is solid: no gaps to fall into).
for (let t = 0; t < TIERS; t++) {
  const z1 = FRONT - 0.3 - t * TREAD,
    z0 = z1 - TREAD;
  box([-H, 0, z0, H, (t + 1) * RISE, z1], CONCRETE);
  // The seat row at the back of the tier: blocks of blue and white, see-through to bullets? No:
  // seats are visual only (low, so a player walks along the tier through them).
  const y = (t + 1) * RISE;
  for (let s = 0; s < 6; s++) {
    const x0 = -H + 0.6 + s * ((L - 1.2) / 6),
      x1 = x0 + (L - 1.2) / 6 - 0.4;
    const colour = (s + (t % 4 < 2 ? 0 : 1)) % 2 ? WHITE : BLUE;
    // Seat pan and back.
    box([x0, y + 0.42, z0 + 0.05, x1, y + 0.47, z0 + 0.45], colour, { collide: false });
    box([x0, y + 0.47, z0 + 0.05, x1, y + 0.85, z0 + 0.12], colour, { collide: false });
    box([x0, y, z0 + 0.15, x1, y + 0.42, z0 + 0.35], DARK, { collide: false, lod: 0 });
  }
}
// The back wall over the top tier, and the side walls stepping up with the tiers (a railing
// height above each tier, so nobody walks off the ends).
box([-H, TOP, BACK - 0.3, H, TOP + 2.2, BACK], CONCRETE);
for (const sx of [-1, 1]) {
  const x0 = sx < 0 ? -H : H - 0.3,
    x1 = x0 + 0.3;
  for (let t = 0; t < TIERS; t++) {
    const z1 = FRONT - 0.3 - t * TREAD,
      z0 = z1 - TREAD;
    box([x0, (t + 1) * RISE, z0, x1, (t + 1) * RISE + 1.1, z1], CONCRETE);
  }
  box([x0, 1.15, FRONT - 0.3, x1, 1.15 + 0.01, FRONT], CONCRETE, { collide: false });
}
// The roof: columns along the back, a cantilevered slab out to the front wall, the fascia.
for (let x = -H + 0.5; x <= H - 0.5 + 1e-6; x += (L - 1) / 4) {
  box([x - 0.25, TOP + 2.2, BACK - 0.3, x + 0.25, ROOF_Y, BACK + 0.2], STEEL);
  // The cantilever's raking strut down from the roof's front third to the column.
  k.beam([x, ROOF_Y - 0.2, BACK + 4], [x, TOP + 2.4, BACK], 0.18, 0.18, STEEL);
}
box([-H, ROOF_Y, BACK - 0.6, H, ROOF_Y + 0.35, FRONT + 0.4], ROOF);
box([-H, ROOF_Y - 0.6, FRONT + 0.2, H, ROOF_Y + 0.35, FRONT + 0.4], BLUE, { collide: false });

// Far: the terrace as one wedge of boxes, the roof.
const far = createKit();
for (let t = 0; t < TIERS; t += 2) {
  const z1 = FRONT - 0.3 - t * TREAD;
  far.box([-H, 0, z1 - 2 * TREAD, H, (t + 2) * RISE, z1], CONCRETE, { lod: 2 });
}
far.box([-H, ROOF_Y, BACK - 0.6, H, ROOF_Y + 0.35, FRONT + 0.4], ROOF, { lod: 2 });
far.box([-H, TOP, BACK - 0.3, H, ROOF_Y, BACK], CONCRETE, { lod: 2 });

await publish("stadium-stand", k, far, {
  tag: "v1",
  title: "Stadium stand",
  source: "art/blender/br/build_stand.mjs",
  use: "Stadium (2026-11-13): the covered terraces round the pitch (tiers climbable, roof)",
  class: "structure",
  ring: "building",
  size: [L, ROOF_Y + 0.35, FRONT + 0.4 - (BACK - 0.6)],
});

// ------------------------------------------------------------------ the pitch markings
const P = createKit();
const W = 0.12; // line width
const Y = 0.02;
const line = (x0, z0, x1, z1) =>
  P.box(
    [
      Math.min(x0, x1) - W / 2,
      0,
      Math.min(z0, z1) - W / 2,
      Math.max(x0, x1) + W / 2,
      Y,
      Math.max(z0, z1) + W / 2,
    ],
    LINE,
    {
      collide: false,
    },
  );
const PX = 52.5,
  PZ = 34;
line(-PX, -PZ, PX, -PZ);
line(-PX, PZ, PX, PZ);
line(-PX, -PZ, -PX, PZ);
line(PX, -PZ, PX, PZ);
line(0, -PZ, 0, PZ);
const arc = (cx, cz, r, a0, a1, n) => {
  for (let i = 0; i < n; i++) {
    const p = a0 + ((a1 - a0) * i) / n,
      q = a0 + ((a1 - a0) * (i + 1)) / n;
    P.beam(
      [cx + Math.cos(p) * r, Y / 2, cz + Math.sin(p) * r],
      [cx + Math.cos(q) * r, Y / 2, cz + Math.sin(q) * r],
      W,
      Y,
      LINE,
    );
  }
};
arc(0, 0, 9.15, 0, Math.PI * 2, 48);
P.box([-0.25, 0, -0.25, 0.25, Y, 0.25], LINE, { collide: false });
for (const s of [-1, 1]) {
  // Penalty area (16.5 m deep, 40.3 m wide), goal area (5.5 × 18.3), the spot, the arc.
  const g = s * PX;
  line(g, -20.15, g - s * 16.5, -20.15);
  line(g, 20.15, g - s * 16.5, 20.15);
  line(g - s * 16.5, -20.15, g - s * 16.5, 20.15);
  line(g, -9.15, g - s * 5.5, -9.15);
  line(g, 9.15, g - s * 5.5, 9.15);
  line(g - s * 5.5, -9.15, g - s * 5.5, 9.15);
  const spot = g - s * 11;
  P.box([spot - 0.2, 0, -0.2, spot + 0.2, Y, 0.2], LINE, { collide: false });
  // The arc outside the penalty area: the part of the 9.15 m circle beyond 16.5 m.
  const a = Math.acos(5.5 / 9.15);
  arc(spot, 0, 9.15, s > 0 ? Math.PI - a : -a, s > 0 ? Math.PI + a : a, 16);
}
const pfar = createKit();
pfar.box([-PX, 0, -PZ, PX, 0.01, -PZ + W], LINE, { collide: false, lod: 2 });
await publish("pitch-lines", P, pfar, {
  tag: "v1",
  title: "Football pitch markings",
  source: "art/blender/br/build_stand.mjs",
  use: "Stadium (2026-11-13): the pitch's lines on the turf",
  class: "small",
  ring: "building",
  size: [2 * PX + W, Y, 2 * PZ + W],
});
