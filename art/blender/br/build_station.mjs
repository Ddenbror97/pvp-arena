/**
 * The Arena District's railway station (owner, 2026-11-14: "build city around the arena or a big
 * train station? should be fun to play"): across the coast road from the district, at the west
 * end of railway line C (layout.ts RAILWAYS, arenaStation).
 *
 *  - rail-station: the station building, 48 × 14 m, two storeys and a roof terrace behind its
 *    parapet, the clock tower over the middle. Its floor is level with the platform (0.8 m): the
 *    booking hall through the ground floor (three doors to the platform, three to the forecourt
 *    down a flight of steps along the front), the ticket counter, the waiting room and the
 *    kiosk; offices upstairs off a corridor; a switchback stair at the west end from the hall to
 *    the upper floor and on to the roof.
 *  - station-platform: the platform, 120 × 6.2 m and 0.8 m high, ramps at both ends, the
 *    yellow safety line, and a canopy on columns along it over the track's edge.
 *
 * Collision is exact boxes; ceilings, trims and the clock are drawn only.
 *
 *   node art/blender/br/build_station.mjs        (run from the repo root)
 *
 * Model space: metres, pivot at the bottom centre; the platform side is −z, the forecourt +z.
 * Original work.
 */
import fs from "node:fs";
import { COLOURS as C, createKit, publish } from "./procedural-kit.mjs";

const TAG = "station-v1";
const K = {
  brick: [0.62, 0.34, 0.26],
  stone: [0.84, 0.81, 0.74],
  dark: [0.22, 0.23, 0.25],
  roof: [0.36, 0.38, 0.4],
  floor: [0.66, 0.63, 0.58],
  wallIn: [0.88, 0.86, 0.8],
  ceiling: [0.94, 0.94, 0.92],
  light: [1, 0.99, 0.94],
  wood: [0.45, 0.31, 0.2],
  counter: [0.55, 0.42, 0.3],
  clock: [0.96, 0.95, 0.9],
  green: [0.14, 0.32, 0.22],
  platform: [0.6, 0.6, 0.58],
  yellow: [0.92, 0.78, 0.12],
  steel: C.steel,
  rail: C.rail,
  stair: [0.62, 0.62, 0.6],
  glass: C.glass,
};

// ------------------------------------------------------------------ the building
const k = createKit();
const { box } = k;
const X = 24,
  Z = 7,
  T = 0.35;
/** Floor (level with the platform), the upper floor, the roof (walking levels). */
const G = 0.8,
  F1 = G + 4.6,
  R = F1 + 4.2;
const DOOR = 2.2,
  DH = 2.8;
// Base slab (the floor at platform level) and the steps down to the forecourt along the front.
box([-X, 0, -Z, X, G, Z], K.stone);
for (let s = 0; s < 2; s++)
  box([-X + 2, 0, Z + s * 0.4, X - 2, (G * (2 - s)) / 3, Z + (s + 1) * 0.4], K.stone);
// Outer walls: brick, stone bands; doors on both long sides (three each), windows.
const doorsAt = [-10, 0, 10];
// The windows are breakable panes (panes.ts; owner, 2026-11-14: "add breakble glas windows"):
// openings in the walls, the glass drawn and collided by the game while whole.
/** Panes in model space [x0, x1, z0, z1, y0, y1] (station-plan.json → panes.ts). */
const PANES = [];
const winG = [-19, -15, -5, 5, 15].map((u) => [u - 1.1, u + 1.1, G + 1.0, G + 3.4]);
const holesG = [...doorsAt.map((u) => [u - DOOR / 2, u + DOOR / 2, G, G + DH]), ...winG];
const holes1 = [-20, -15, -10, -5, 0, 5, 10, 15, 20].map((u) => [
  u - 1.1,
  u + 1.1,
  F1 + 1.0,
  F1 + 3.2,
]);
for (const s of [1, -1]) {
  const z0 = s > 0 ? Z - T : -Z,
    z1 = s > 0 ? Z : -Z + T;
  k.wall("x", -X, X, z0, z1, G, F1, holesG, K.brick);
  k.wall("x", -X, X, z0, z1, F1, R + 1.0, holes1, K.brick);
  const zc = (z0 + z1) / 2;
  for (const [a, b, y0, y1] of [...winG, ...holes1])
    PANES.push([a, b, zc - 0.03, zc + 0.03, y0, y1]);
}
for (const s of [1, -1]) {
  const x0 = s > 0 ? X - T : -X,
    x1 = s > 0 ? X : -X + T;
  // The east end: a door onto the platform's end; the west end (the stair) closed.
  k.wall(
    "z",
    -Z,
    Z,
    x0,
    x1,
    G,
    F1,
    s > 0 ? [[-1.1, 1.1, G, G + DH]] : [[-1.1, 1.1, G + 1.0, G + 3.4]],
    K.brick,
  );
  k.wall("z", -Z, Z, x0, x1, F1, R + 1.0, [[-1.1, 1.1, F1 + 1.0, F1 + 3.2]], K.brick);
  const xc = (x0 + x1) / 2;
  if (s < 0) PANES.push([xc - 0.03, xc + 0.03, -1.1, 1.1, G + 1.0, G + 3.4]);
  PANES.push([xc - 0.03, xc + 0.03, -1.1, 1.1, F1 + 1.0, F1 + 3.2]);
}
// Stone bands and cornice (drawn).
for (const y of [G + DH + 0.6, F1, R + 0.7])
  for (const s of [1, -1]) {
    box([-X - 0.05, y - 0.25, s > 0 ? Z : -Z - 0.08, X + 0.05, y, s > 0 ? Z + 0.08 : -Z], K.stone, {
      collide: false,
    });
    box([s > 0 ? X : -X - 0.08, y - 0.25, -Z - 0.05, s > 0 ? X + 0.08 : -X, y, Z + 0.05], K.stone, {
      collide: false,
    });
  }
// Upper floor slab (the stair's hole at the west end), roof slab (its hole too), ceilings.
const SX0 = -X + T,
  SX1 = -X + T + 4.6,
  SZ0 = -Z + T,
  SZ1 = -Z + T + 5.4;
for (const y of [F1, R]) {
  box([SX1, y - 0.3, -Z, X, y, Z], K.floor);
  box([-X, y - 0.3, SZ1, SX1, y, Z], K.floor);
  k.ceiling(-X + T, y - 0.31, -Z + T, X - T, Z - T, K.ceiling);
}
// The roof's parapet (the terrace walls) above R: the outer walls run to R + 1.0.
// A switchback stair at the west end: the landing strip along the west wall (SX0..SX1 at z
// SZ1..), flights along z.
function stairs(y0, y1) {
  const n = Math.ceil((y1 - y0) / 2 / 0.32);
  const half = (y1 - y0) / 2,
    run = 0.3;
  const zA = SZ1; // the flights start at the hole's edge and climb toward −z
  for (let i = 0; i < n; i++) {
    const r = (i + 1) * (half / n);
    box(
      [SX0, Math.max(y0, y0 + r - 0.3), zA - (i + 1) * run, SX0 + 2.1, y0 + r, zA - i * run],
      K.stair,
    );
    box(
      [
        SX0 + 2.5,
        Math.max(y0 + half, y0 + half + r - 0.3),
        zA - n * run + i * run,
        SX1,
        y0 + half + r,
        zA - n * run + (i + 1) * run,
      ],
      K.stair,
    );
  }
  // Half landing at the far end, the divider.
  box([SX0, y0 + half - 0.3, -Z + T, SX1, y0 + half, zA - n * run], K.stair);
  box([SX0 + 2.1, y0, zA - n * run, SX0 + 2.5, y1 + 1.0, zA], K.dark);
}
stairs(G, F1);
stairs(F1, R);
// Railings round the stair holes on the upper floor and the roof (the open side toward +x).
for (const y of [F1, R]) box([SX1, y, -Z + T, SX1 + 0.1, y + 1.05, SZ1], K.rail);
// Inside: the ticket counter along the east part of the hall, the waiting room's partition,
// the kiosk's counter; upstairs a corridor and offices.
box([8, G, -2.5, 20, G + 1.1, -1.9], K.counter);
box([8, G + 1.1, -2.5, 20, G + 1.15, -1.9], K.wood, { collide: false, lod: 0 });
k.wall("z", -Z + T, Z - T, -4.6, -4.45, G, F1 - 0.3, [[-1.2, 1.2, G, G + DH]], K.wallIn, {
  lod: 0,
});
box([-18, G, 3.2, -12, G + 1.05, 3.8], K.counter);
// Upstairs: corridor along the platform side (z −3.5..−0.5), offices to the front.
k.wall(
  "x",
  SX1,
  X - T,
  -0.6,
  -0.45,
  F1,
  R - 0.3,
  [-10, -2, 6, 14].map((u) => [u - 1.1, u + 1.1, F1, F1 + DH]),
  K.wallIn,
  {
    lod: 0,
  },
);
for (const u of [-6, 2, 10, 18])
  k.wall("z", -0.45, Z - T, u - 0.075, u + 0.075, F1, R - 0.3, [], K.wallIn, { lod: 0 });
// Lights.
for (const u of [-14, -4, 6, 16])
  box([u - 1.5, F1 - 0.36, -0.3, u + 1.5, F1 - 0.31, 0.3], K.light, { collide: false, lod: 0 });
// The roof: dark coping over the parapet; the clock tower over the middle of the front.
for (const s of [1, -1])
  box(
    [
      -X - 0.1,
      R + 1.0,
      s > 0 ? Z - 0.4 : -Z - 0.05,
      X + 0.1,
      R + 1.15,
      s > 0 ? Z + 0.05 : -Z + 0.4,
    ],
    K.dark,
  );
const TW = 3;
box([-TW, R, Z - 2 * TW, TW, R + 7.5, Z], K.brick);
box([-TW - 0.2, R + 7.5, Z - 2 * TW - 0.2, TW + 0.2, R + 7.8, Z + 0.2], K.stone);
// A pyramid-ish cap (two stacked boxes) and the clock faces.
box([-TW + 0.6, R + 7.8, Z - 2 * TW + 0.6, TW - 0.6, R + 9.0, Z - 0.6], K.green);
box([-1, R + 9.0, Z - TW - 1, 1, R + 10.2, Z - TW + 1], K.green);
box([-1.4, R + 4.2, Z + 0.01, 1.4, R + 6.8, Z + 0.06], K.clock, { collide: false });
box([-0.05, R + 5.5, Z + 0.06, 0.05, R + 6.6, Z + 0.09], K.dark, { collide: false });
box([-0.05, R + 5.45, Z + 0.06, 0.8, R + 5.55, Z + 0.09], K.dark, { collide: false });
// A canopy over the front doors.
box([-13, G + DH + 0.3, Z, 13, G + DH + 0.5, Z + 2.2], K.dark);
// The station's name board on the platform side.
box([-8, G + DH + 0.3, -Z - 0.08, 8, G + DH + 1.1, -Z], K.green, { collide: false });

fs.writeFileSync(
  "src/lib/fps/br/station-plan.json",
  JSON.stringify({ panes: { "rail-station": PANES.map((p) => p.map((v) => +v.toFixed(3))) } }) +
    "\n",
);

const far = createKit();
far.box([-X, 0, -Z, X, R + 1.15, Z], K.brick, { lod: 2 });
far.box([-TW, R, Z - 2 * TW, TW, R + 9.0, Z], K.brick, { lod: 2 });
await publish("rail-station", k, far, {
  tag: TAG,
  title: "Railway station",
  source: "art/blender/br/build_station.mjs",
  use: "Arena District (2026-11-14): the railway station (booking hall, offices, roof terrace, clock tower)",
  class: "building",
  ring: "building",
  size: [2 * X + 0.2, R + 10.2, 2 * Z + 1.4],
  glass: true,
});

// ------------------------------------------------------------------ the platform
const p = createKit();
const PX = 60,
  PZ = 3.1,
  PH = 0.8;
p.box([-PX, 0, -PZ, PX, PH, PZ], K.platform);
// Ramps at the ends (three 0.27 m steps each).
for (const s of [1, -1])
  for (let i = 0; i < 3; i++) {
    const a = s * (PX + i * 0.6),
      b = s * (PX + (i + 1) * 0.6);
    p.box(
      [Math.min(a, b), 0, -PZ + 1, Math.max(a, b), PH - (i + 1) * (PH / 3) + 0.001, PZ],
      K.platform,
    );
  }
// The yellow line along the track edge (−z), drawn.
p.box([-PX, PH, -PZ + 0.5, PX, PH + 0.01, -PZ + 0.62], K.yellow, { collide: false });
// The canopy: columns along the platform's middle, the roof over the track's edge.
for (let x = -PX + 5; x <= PX - 5; x += 10) {
  p.box([x - 0.15, PH, 0.35, x + 0.15, PH + 4.2, 0.65], K.green);
  p.beam([x, PH + 4.0, 0.5], [x, PH + 4.2, -PZ - 0.6], 0.15, 0.2, K.green);
}
p.box([-PX + 2, PH + 4.2, -PZ - 1.0, PX - 2, PH + 4.45, PZ - 0.4], K.roof);
const pfar = createKit();
pfar.box([-PX, 0, -PZ, PX, PH, PZ], K.platform, { lod: 2 });
pfar.box([-PX + 2, PH + 4.2, -PZ - 1.0, PX - 2, PH + 4.45, PZ - 0.4], K.roof, { lod: 2 });
await publish("station-platform", p, pfar, {
  tag: TAG,
  title: "Station platform",
  source: "art/blender/br/build_station.mjs",
  use: "Arena District (2026-11-14): the station's platform and canopy",
  class: "structure",
  ring: "building",
  size: [2 * PX + 3.6, PH + 4.45, 2 * PZ + 1.0],
});
