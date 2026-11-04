/**
 * A small single-storey house, fully enterable (owner, 2026-11-04: "a small house … built with
 * interiors"): siding walls, front and back doors, a living room across the front, kitchen and
 * bedroom at the back, furniture as cover, and an outside stair up the west wall onto the flat
 * roof (parapet, open at the stair).
 *
 *   node art/blender/br/build_house.mjs        (run from the repo root)
 *
 * Walls 10 × 8 m plus the stair: 11.2 × 8 m overall, centred; front (+z) to the street.
 * Writes public/fps/br/models/bungalow.lod{0,1,2}.glb, art/br/procedural/bungalow.boxes.json
 * and the models.json entry. Original work.
 */
import { COLOURS as C, createKit, publish } from "./procedural-kit.mjs";

const X0 = -4.4,
  X1 = 5.6,
  Z0 = -4,
  Z1 = 4,
  H = 3.0,
  T = 0.25;
const SX0 = -5.6; // the outside stair, west of the wall
const k = createKit();
const { box, wall, flight } = k;

// Walls: front door and windows, back door, side windows.
wall(
  "x",
  X0,
  X1,
  Z1 - T,
  Z1,
  0,
  H,
  [
    [1.0, 2.0, 0, 2.2],
    [-3.5, -0.5, 0.9, 2.1, true],
    [3.0, 4.8, 0.9, 2.1, true],
  ],
  C.siding,
);
wall(
  "x",
  X0,
  X1,
  Z0,
  Z0 + T,
  0,
  H,
  [
    [3.6, 4.6, 0, 2.2],
    [-3.5, -1.5, 1.0, 2.0, true],
    [0.5, 2.0, 1.0, 2.0, true],
  ],
  C.siding,
);
wall("z", Z0 + T, Z1 - T, X0, X0 + T, 0, H, [[0.5, 2.5, 1.0, 2.0, true]], C.siding);
wall(
  "z",
  Z0 + T,
  Z1 - T,
  X1 - T,
  X1,
  0,
  H,
  [
    [-2.5, -0.8, 1.0, 2.0, true],
    [1.0, 2.8, 1.0, 2.0, true],
  ],
  C.siding,
);
// Floor (visual: the pad), roof slab, parapet open where the stair arrives.
box([X0 + T, 0, Z0 + T, X1 - T, 0.02, Z1 - T], C.floor, { collide: false, lod: 0 });
box([X0, H - 0.2, Z0, X1, H, Z1], C.roof);
box([X0, H, Z1 - 0.2, X1, H + 0.8, Z1], C.siding);
box([X0, H, Z0, X1, H + 0.8, Z0 + 0.2], C.siding);
box([X1 - 0.2, H, Z0, X1, H + 0.8, Z1], C.siding);
box([X0, H, -1.6, X0 + 0.2, H + 0.8, Z1], C.siding);
// Interior: a wall across the back (two doorways), a wall between kitchen and bedroom.
wall(
  "x",
  X0 + T,
  X1 - T,
  -0.6,
  -0.48,
  0,
  H - 0.2,
  [
    [-2.6, -1.6, 0, 2.2],
    [2.6, 3.6, 0, 2.2],
  ],
  C.inner,
  { lod: 0 },
);
box([0.4, 0, Z0 + T, 0.52, H - 0.2, -0.6], C.inner, { lod: 0 });
// Furniture: sofa and table (front), kitchen counter (back east), bed and wardrobe (back west).
box([-3.9, 0, 1.6, -3.0, 0.85, 3.6], C.sofa, { lod: 0 });
box([-1.6, 0, 2.0, -0.6, 0.45, 2.8], C.wood, { lod: 0 });
box([0.8, 0, Z0 + T, 3.3, 0.9, Z0 + T + 0.6], C.counter, { lod: 0 });
box([-4.1, 0, -3.7, -2.7, 0.55, -1.7], C.bed, { lod: 0 });
box([-1.2, 0, -3.75, -0.1, 2.0, -3.2], C.wood, { lod: 0 });
// The outside stair: up the west wall from the front to the roof at the back.
flight(SX0, X0, 3.4, -2.4, 0, H, 15);
box([SX0, H - 0.3, -3.4, X0, H, -2.4], C.stair);
// A porch roof over the front door.
box([0.4, 2.5, Z1, 2.6, 2.62, Z1 + 1.2], C.roof, { collide: false });

const far = createKit();
far.box([X0, 0, Z0, X1, H + 0.8, Z1], C.siding, { lod: 2 });
far.box([SX0, 0, -3.4, X0, H, 3.4], C.stair, { lod: 2 });

await publish("bungalow", k, far, {
  title: "Small house with a roof stair",
  source: "art/blender/br/build_house.mjs",
  use: "enterable small house (towns, countryside)",
  size: [X1 - SX0, H + 0.8, Z1 - Z0],
});
