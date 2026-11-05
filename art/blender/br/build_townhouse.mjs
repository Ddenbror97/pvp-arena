/**
 * A two-storey brick townhouse with a shop downstairs and a flat upstairs, fully enterable
 * (owner, 2026-11-04: "buildings with full interiors"): shop door and windows on the front, a
 * back door, a straight stair along the west wall to the flat and on up to a stair house on the
 * roof (parapet all round); shop counter and shelves, flat furniture as cover.
 *
 *   node art/blender/br/build_townhouse.mjs        (run from the repo root)
 *
 * 10 × 10 m, front (+z) to the street. Writes public/fps/br/models/townhouse.lod{0,1,2}.glb,
 * art/br/procedural/townhouse.boxes.json and the models.json entry. Original work.
 */
import { COLOURS as C, createKit, publish } from "./procedural-kit.mjs";

const W = 10,
  D = 10,
  STOREY = 3.2,
  FLOORS = 2,
  SLAB = 0.25,
  T = 0.3;
const X0 = -W / 2,
  X1 = W / 2,
  Z0 = -D / 2,
  Z1 = D / 2;
const H = FLOORS * STOREY;
// The stair: along the west wall, rising towards the back (−z).
const SX0 = X0 + T,
  SX1 = -3.5,
  S_LOW = 3.4,
  S_HIGH = -2.2;
const k = createKit();
const { box, wall, flight } = k;

for (let n = 0; n < FLOORS; n++) {
  const y = n * STOREY,
    top = y + STOREY,
    ceil = top - SLAB;
  const ground = n === 0;
  // Front: shop door and big windows on the ground floor, a ribbon window upstairs.
  wall(
    "x",
    X0,
    X1,
    Z1 - T,
    Z1,
    y,
    top,
    ground
      ? [
          [-0.6, 0.6, y, y + 2.2],
          [-4.2, -1.2, y + 0.5, y + 2.6, true],
          [1.2, 4.2, y + 0.5, y + 2.6, true],
        ]
      : [[-4.2, 4.2, y + 0.9, y + 2.3, true]],
    C.brick,
  );
  // Back: a back door downstairs, windows.
  wall(
    "x",
    X0,
    X1,
    Z0,
    Z0 + T,
    y,
    top,
    ground
      ? [
          [2.5, 3.5, y, y + 2.2],
          [-2, 1, y + 1, y + 2.2, true],
        ]
      : [[-2, 3.5, y + 0.9, y + 2.3, true]],
    C.brick,
  );
  wall("z", Z0 + T, Z1 - T, X0, X0 + T, y, top, [[-1, 1, y + 1.2, y + 2.3, true]], C.brick);
  wall("z", Z0 + T, Z1 - T, X1 - T, X1, y, top, [[-1.5, 1.5, y + 1.0, y + 2.3, true]], C.brick);
  // Floors: the ground storey's is visual (the pad); upstairs a slab open over the stair.
  if (ground) box([X0 + T, 0, Z0 + T, X1 - T, 0.02, Z1 - T], C.floor, { collide: false, lod: 0 });
  else {
    box([X0 + T, y - SLAB, Z0 + T, SX1, y, S_HIGH], C.floor, { lod: 0 });
    box([X0 + T, y - SLAB, S_LOW, SX1, y, Z1 - T], C.floor, { lod: 0 });
    box([SX1, y - SLAB, Z0 + T, X1 - T, y, Z1 - T], C.floor, { lod: 0 });
  }
  // The stair to the next level (on the top floor: to the roof), walled off from the rooms.
  flight(SX0, SX1, S_LOW, S_HIGH, y, STOREY, 16);
  box([SX1, y, S_HIGH, SX1 + 0.15, ceil, S_LOW], C.inner, { lod: 0 });
  if (ground) {
    // The shop: a counter, wall shelves and an aisle shelf.
    box([1.0, 0, -1.0, 4.2, 1.0, -0.4], C.counter, { lod: 0 });
    box([-3.0, 0, Z0 + T, 1.5, 1.8, Z0 + T + 0.45], C.shelf, { lod: 0 });
    box([-2.0, 0, 1.4, 1.6, 1.4, 1.8], C.shelf, { lod: 0 });
    box([X1 - T - 0.45, 0, 1.5, X1 - T, 1.8, 4.2], C.shelf, { lod: 0 });
  } else {
    // The flat: a wall across with a door between the back room (bed) and the front (sofa).
    wall("x", SX1 + 0.15, X1 - T, -0.1, 0.05, y, ceil, [[0.5, 1.5, y, y + 2.2]], C.inner, {
      lod: 0,
    });
    box([2.6, y, -4.6, 4.6, y + 0.55, -3.2], C.bed, { lod: 0 });
    box([-3.2, y, -4.6, -2.0, y + 2.0, -4.0], C.wood, { lod: 0 });
    box([-1.4, y, 2.6, 0.6, y + 0.85, 3.5], C.sofa, { lod: 0 });
    box([3.9, y, 1.5, 4.6, y + 0.9, 4.4], C.counter, { lod: 0 });
  }
}
// Roof: slab open over the stair, parapet, the stair house over the stair with a door east.
box([X0, H - SLAB, Z0, SX1, H, S_HIGH], C.roof);
box([X0, H - SLAB, S_LOW, SX1, H, Z1], C.roof);
box([SX1, H - SLAB, Z0, X1, H, Z1], C.roof);
for (const b of [
  [X0, H, Z0, X1, H + 0.9, Z0 + 0.25],
  [X0, H, Z1 - 0.25, X1, H + 0.9, Z1],
  [X1 - 0.25, H, Z0, X1, H + 0.9, Z1],
])
  box(b, C.brick);
const SH = H + 2.9;
wall("z", Z0, Z1, X0, X0 + T, H, SH, [], C.brick);
wall("x", X0 + T, SX1 + 0.3, Z0, Z0 + T, H, SH, [], C.brick);
wall("x", X0 + T, SX1 + 0.3, Z1 - T, Z1, H, SH, [], C.brick);
wall("z", Z0 + T, Z1 - T, SX1 + 0.15, SX1 + 0.3, H, SH, [[-4.6, -3.4, H, H + 2.2]], C.brick);
box([X0, SH, Z0, SX1 + 0.3, SH + 0.2, Z1], C.roof);
// A shop sign over the door.
box([-2.5, 2.7, Z1, 2.5, 3.1, Z1 + 0.12], [0.85, 0.75, 0.3], { collide: false });

// Far LOD: the mass, the stair house, the shop windows.
const far = createKit();
far.box([X0, 0, Z0, X1, H + 0.9, Z1], C.brick, { lod: 2 });
far.box([X0, H, Z0, SX1 + 0.3, SH + 0.2, Z1], C.brick, { lod: 2 });
far.box([-4.2, 0.5, Z1, 4.2, 2.6, Z1 + 0.02], C.glass, { lod: 2 });
far.box([-4.2, STOREY + 0.9, Z1, 4.2, STOREY + 2.3, Z1 + 0.02], C.glass, { lod: 2 });

await publish("townhouse", k, far, {
  title: "Brick townhouse (shop and flat)",
  source: "art/blender/br/build_townhouse.mjs",
  use: "enterable shop with a flat above (town cores)",
  size: [W, +(SH + 0.2).toFixed(2), D],
});
