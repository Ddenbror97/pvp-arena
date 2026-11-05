/**
 * A strip mall for the Island Superstore (owner, 2026-11-04: "audit superstore island … should
 * look like the map"): one storey, four shop units side by side, each with a glass shopfront
 * and a door on the street, a back door, a doorway to the next unit, shelves and a counter as
 * cover; a steel stair up the east end onto the flat roof (parapet, open at the stair), a
 * canopy and a coloured sign over each unit.
 *
 *   node art/blender/br/build_stripmall.mjs        (run from the repo root)
 *
 * 44 × 16 m plus the stair (45.3 m overall), front (+z) to the lot. Writes
 * public/fps/br/models/strip-mall.lod{0,1,2}.glb, art/br/procedural/strip-mall.boxes.json and
 * the models.json entry. Original work.
 */
import { COLOURS as C, createKit, publish } from "./procedural-kit.mjs";

const X0 = -22,
  X1 = 22,
  Z0 = -8,
  Z1 = 8,
  H = 4.4,
  T = 0.3;
const SX1 = X1 + 1.3; // the outside stair, east of the wall
const UNITS = [-16.5, -5.5, 5.5, 16.5];
const SIGNS = [
  [0.72, 0.16, 0.13],
  [0.16, 0.32, 0.62],
  [0.2, 0.5, 0.26],
  [0.85, 0.66, 0.18],
];
const WALL = [0.78, 0.74, 0.66];
const k = createKit();
const { box, wall, flight } = k;

// Front: per unit a 1.6 m glass door opening and two shop windows (0.9 m sills: they can be
// vaulted, as broken glass).
wall(
  "x",
  X0,
  X1,
  Z1 - T,
  Z1,
  0,
  H,
  UNITS.flatMap((u) => [
    [u - 0.8, u + 0.8, 0, 2.3],
    [u - 4.8, u - 1.5, 0.9, 3.1, true],
    [u + 1.5, u + 4.8, 0.9, 3.1, true],
  ]),
  WALL,
);
// Back: a 1 m service door per unit.
wall(
  "x",
  X0,
  X1,
  Z0,
  Z0 + T,
  0,
  H,
  UNITS.map((u) => [u + 2.8, u + 3.8, 0, 2.2]),
  WALL,
);
wall("z", Z0 + T, Z1 - T, X0, X0 + T, 0, H, [[-1.5, 1.5, 1.0, 2.6, true]], WALL);
wall("z", Z0 + T, Z1 - T, X1 - T, X1, 0, H, [], WALL);
// Unit dividers with a doorway near the back.
for (const x of [-11, 0, 11])
  wall("z", Z0 + T, Z1 - T, x - 0.08, x + 0.08, 0, H - 0.25, [[-6.2, -5.2, 0, 2.2]], C.inner, {
    lod: 0,
  });
// Floor (visual), roof slab, parapet (open on the east where the stair arrives).
box([X0 + T, 0, Z0 + T, X1 - T, 0.02, Z1 - T], C.counter, { collide: false, lod: 0 });
box([X0, H - 0.25, Z0, X1, H, Z1], C.roof);
box([X0, H, Z1 - 0.2, X1, H + 0.9, Z1], WALL);
box([X0, H, Z0, X1, H + 0.9, Z0 + 0.2], WALL);
box([X0, H, Z0, X0 + 0.2, H + 0.9, Z1], WALL);
box([X1 - 0.2, H, Z0 + 3.2, X1, H + 0.9, Z1], WALL);
// Roof clutter (cover up there): two AC units.
box([-12, H, -4, -9.5, H + 1.2, -2], C.steel);
box([8, H, -4, 10.5, H + 1.2, -2], C.steel);
// Furniture per unit: wall shelves, a shelf island, the counter by the window.
for (const u of UNITS) {
  box([u - 5.2, 0, -4.2, u - 4.7, 1.9, 3.2], C.shelf, { lod: 0 });
  box([u - 2.2, 0, -2.4, u + 1.0, 1.5, -1.8], C.shelf, { lod: 0 });
  box([u + 2.0, 0, 3.4, u + 4.6, 1.0, 4.1], C.counter, { lod: 0 });
  box([u - 0.5, 0, -7.6, u + 1.8, 1.2, -6.9], C.wood, { lod: 0 });
}
// The stair: up the east wall from the front to the roof at the back.
flight(X1, SX1, Z1 - 0.5, Z0 + 3.2, 0, H, 18);
box([X1, H - 0.3, Z0 + 0.3, SX1, H, Z0 + 3.2], C.stair);
box([SX1 - 0.06, 0, Z0 + 0.3, SX1, H + 1.0, Z1 - 0.5], C.rail, { collide: false });
// Canopy and signs over the shopfronts.
box([X0, 3.25, Z1, X1, 3.4, Z1 + 1.8], C.roof, { collide: false });
UNITS.forEach((u, i) =>
  box([u - 4.6, 3.45, Z1, u + 4.6, 4.25, Z1 + 0.12], SIGNS[i], { collide: false }),
);

const far = createKit();
far.box([X0, 0, Z0, X1, H + 0.9, Z1], WALL, { lod: 2 });
far.box([X0, 0.9, Z1, X1, 3.1, Z1 + 0.03], C.glass, { lod: 2 });
UNITS.forEach((u, i) =>
  far.box([u - 4.6, 3.45, Z1, u + 4.6, 4.25, Z1 + 0.12], SIGNS[i], { lod: 2 }),
);
far.box([X1, 0, Z0 + 0.3, SX1, H, Z1 - 0.5], C.stair, { lod: 2 });

await publish("strip-mall", k, far, {
  title: "Strip mall (four shops)",
  source: "art/blender/br/build_stripmall.mjs",
  use: "enterable shop row around the Island Superstore: four units, back doors, roof stair",
  ring: "building",
  size: [SX1 - X0, H + 0.9, Z1 + 1.8 - Z0],
});
