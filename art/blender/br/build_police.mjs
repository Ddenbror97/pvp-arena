/**
 * A two-storey police station, fully enterable (owner, 2026-11-04: "a two-storey police station
 * built with interiors"): brick with a navy band and sign, glass double doors into a lobby with a
 * front desk; three barred holding cells along the back, an armoury room and a back door;
 * switchback stairs (east) to the offices upstairs and on to a roof stair house (parapet, radio
 * antenna). Furniture as cover.
 *
 *   node art/blender/br/build_police.mjs        (run from the repo root)
 *
 * 18 × 12 m, front (+z) to the street. Writes public/fps/br/models/police-station.lod{0,1,2}.glb,
 * art/br/procedural/police-station.boxes.json and the models.json entry. Original work.
 */
import { COLOURS as C, createKit, publish } from "./procedural-kit.mjs";

const X0 = -9,
  X1 = 9,
  Z0 = -6,
  Z1 = 6,
  STOREY = 3.4,
  FLOORS = 2,
  SLAB = 0.25,
  T = 0.3;
const H = FLOORS * STOREY;
// Stair core in the east end: flight A along the east wall (+z), flight B back (−z).
const CX = 5.6; // core wall (west face)
const FA = [7.3, X1 - T],
  FB = [CX + 0.15, 7.1];
const SZ0 = -3,
  SZ1 = 3,
  STEPS = 8;
const k = createKit();
const { box, wall } = k;

const step = (x0, x1, z0, z1, top, y) =>
  box([x0, Math.max(y, top - 0.3), z0, x1, top, z1], C.stair, { lod: 0 });

for (let n = 0; n < FLOORS; n++) {
  const y = n * STOREY,
    top = y + STOREY,
    ceil = top - SLAB;
  const ground = n === 0;
  // Exterior walls.
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
          [-0.8, 0.8, y, y + 2.4],
          [-7.5, -2, y + 0.9, y + 2.3, true],
          [2, 4.8, y + 0.9, y + 2.3, true],
        ]
      : [[-7.5, 4.8, y + 0.9, y + 2.3, true]],
    C.brick,
  );
  wall(
    "x",
    X0,
    X1,
    Z0,
    Z0 + T,
    y,
    top,
    ground ? [[3.4, 4.4, y, y + 2.2]] : [[-7.5, 4.8, y + 0.9, y + 2.3, true]],
    C.brick,
  );
  wall("z", Z0 + T, Z1 - T, X0, X0 + T, y, top, [[-1.5, 1.5, y + 1.0, y + 2.3, true]], C.brick);
  wall("z", Z0 + T, Z1 - T, X1 - T, X1, y, top, [], C.brick);
  // Slab (upstairs) with the stair opening over the flights.
  if (ground) box([X0 + T, 0, Z0 + T, X1 - T, 0.02, Z1 - T], C.floor, { collide: false, lod: 0 });
  else {
    box([X0 + T, y - SLAB, Z0 + T, CX, y, Z1 - T], C.floor, { lod: 0 });
    box([CX, y - SLAB, Z0 + T, X1 - T, y, SZ0], C.floor, { lod: 0 });
  }
  // Stair core: wall with a door to the rest of the floor, flights to the next level (from
  // the top floor: to the roof), a half landing at the front end.
  wall("z", Z0 + T, Z1 - T, CX, CX + 0.15, y, ceil, [[-5.2, -4.0, y, y + 2.2]], C.inner, {
    lod: 0,
  });
  const rise = STOREY / 2 / STEPS,
    run = (SZ1 - SZ0) / STEPS;
  for (let s = 0; s < STEPS; s++) {
    step(FA[0], FA[1], SZ0 + s * run, SZ0 + (s + 1) * run, y + (s + 1) * rise, y);
    step(FB[0], FB[1], SZ1 - (s + 1) * run, SZ1 - s * run, y + STOREY / 2 + (s + 1) * rise, y);
  }
  step(CX + 0.15, X1 - T, SZ1, Z1 - T, y + STOREY / 2, y);
  box([FB[1], y, SZ0, FA[0], top + 1.0, SZ1], C.inner, { lod: 0 });
  if (ground) {
    // Lobby: the front desk (an opening at its east end), benches; a wall behind the lobby
    // with a door to the cell corridor.
    box([-4.5, 0, 1.6, 2.8, 1.1, 2.1], C.wood, { lod: 0 });
    box([-8.4, 0, 4.6, -6.4, 0.5, 5.4], C.wood, { lod: 0 });
    wall(
      "x",
      X0 + T,
      CX,
      -0.6,
      -0.45,
      0,
      ceil,
      [
        [-1, 0.2, 0, 2.2],
        [3.6, 4.6, 0, 2.2],
      ],
      C.inner,
      { lod: 0 },
    );
    // Three holding cells along the back (x −8.7 … −0.6), bars in front (see-through, solid).
    for (const [c0, c1] of [
      [X0 + T, -6.1],
      [-6.0, -3.4],
      [-3.3, -0.6],
    ]) {
      box([c1, 0, Z0 + T, c1 + 0.12, ceil, -2.4], C.inner, { lod: 0 });
      // Bars: thin visual slats, one invisible solid box for collision (a 0.8 m cell door gap).
      for (let x = c0 + 0.1; x < c1 - 0.9; x += 0.22)
        box([x, 0, -2.45, x + 0.05, 2.6, -2.4], C.steel, { collide: false, lod: 0 });
      box([c0, 0, -2.46, c1 - 0.85, 2.6, -2.39], C.steel, { visible: false, lod: 0 });
      box([c0, 2.6, -2.46, c1, 2.75, -2.39], C.steel, { lod: 0 });
      box([c0 + 0.2, 0, -5.6, c0 + 0.8, 0.45, -3.6], C.wood, { lod: 0 }); // bunk
    }
    box([-0.6, 0, Z0 + T, -0.48, ceil, -2.4], C.inner, { lod: 0 });
    // Armoury (back east, by the back door): racks.
    box([0.4, 0, Z0 + T, 3.0, 1.9, Z0 + T + 0.5], C.steel, { lod: 0 });
    box([5.0, 0, -3.0, 5.5, 1.9, -0.8], C.steel, { lod: 0 });
  } else {
    // Offices: two rooms off a corridor along the stair wall; desks, cabinets.
    wall(
      "z",
      Z0 + T,
      Z1 - T,
      1.8,
      1.95,
      y,
      ceil,
      [
        [2.6, 3.8, y, y + 2.2],
        [-3.8, -2.6, y, y + 2.2],
      ],
      C.inner,
      { lod: 0 },
    );
    wall("x", X0 + T, 1.8, -0.05, 0.1, y, ceil, [[-3.4, -2.4, y, y + 2.2]], C.inner, { lod: 0 });
    for (const [dx, dz] of [
      [-6.5, 3.2],
      [-3.0, 3.2],
      [-6.5, -3.0],
      [-3.0, -3.0],
    ])
      box([dx, y, dz, dx + 1.6, y + 0.78, dz + 0.8], C.wood, { lod: 0 });
    box([X0 + T, y, -5.6, X0 + T + 0.5, y + 1.9, -3.6], C.steel, { lod: 0 });
    box([0.6, y, 4.9, 1.6, y + 1.9, Z1 - T], C.steel, { lod: 0 });
  }
}
// Roof: slab open over the flights, parapet, stair house with a door west, antenna.
box([X0, H - SLAB, Z0, CX, H, Z1], C.roof);
box([CX, H - SLAB, Z0, X1, H, SZ0], C.roof);
for (const b of [
  [X0, H, Z0, X1, H + 0.9, Z0 + 0.25],
  [X0, H, Z1 - 0.25, X1, H + 0.9, Z1],
  [X0, H, Z0, X0 + 0.25, H + 0.9, Z1],
])
  box(b, C.brick);
const SH = H + 3.0;
wall("z", Z0, Z1, X1 - T, X1, H, SH, [], C.brick);
wall("x", CX, X1 - T, Z0, Z0 + T, H, SH, [], C.brick);
wall("x", CX, X1 - T, Z1 - T, Z1, H, SH, [], C.brick);
wall("z", Z0 + T, Z1 - T, CX, CX + 0.15, H, SH, [[-5.2, -4.0, H, H + 2.2]], C.brick);
box([CX, SH, Z0, X1, SH + 0.2, Z1], C.roof);
box([7.2, SH + 0.2, 0, 7.3, SH + 5.5, 0.1], C.rail, { collide: false });
// Navy band and the sign over the doors.
box([X0, STOREY - 0.35, Z1, X1, STOREY + 0.05, Z1 + 0.05], C.navy, { collide: false });
box([-2.6, 2.6, Z1 + 0.05, 2.6, 3.0, Z1 + 0.15], C.sign, { collide: false });
box([-1.8, 2.45, Z1, 1.8, 2.55, Z1 + 1.6], C.roof, { collide: false });

const far = createKit();
far.box([X0, 0, Z0, X1, H + 0.9, Z1], C.brick, { lod: 2 });
far.box([CX, H, Z0, X1, SH + 0.2, Z1], C.brick, { lod: 2 });
far.box([-7.5, 0.9, Z1, 4.8, 2.3, Z1 + 0.02], C.glass, { lod: 2 });
far.box([-7.5, STOREY + 0.9, Z1, 4.8, STOREY + 2.3, Z1 + 0.02], C.glass, { lod: 2 });
far.box([X0, STOREY - 0.35, Z1, X1, STOREY + 0.05, Z1 + 0.05], C.navy, { lod: 2 });

await publish("police-station", k, far, {
  title: "Police station (two storeys)",
  source: "art/blender/br/build_police.mjs",
  use: "enterable police station: lobby, cells, armoury, offices, roof (one per town)",
  size: [X1 - X0, +(SH + 0.2).toFixed(2), Z1 - Z0],
});
