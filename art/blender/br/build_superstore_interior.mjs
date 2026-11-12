/**
 * The Island Superstore's interior (owner, 2026-11-08: "audit inside the superstore as well: be
 * able to enter, fun to play inside, not just flat; should be like the Verdansk Superstore").
 * Placed on the store (same origin and turn), inside the Big Box Store shell, whose front glass
 * doors, side and back doors and loading docks building-access-v4 opens.
 *
 * The Verdansk Superstore plays as a maze of tall shelving behind the tills, a back stockroom and
 * a roof to fight from. Here:
 *  - sales hall (centre, 75 × 45 m under a 12 m ceiling): checkout lanes behind the four front
 *    entrances, thirteen double-sided gondola runs (2.3 m, every third 1.5 m to see and shoot
 *    over) split by a cross aisle, gaps and end caps; columns where the roof steps down;
 *  - west wing (grocery): freezer runs, produce bins, a deli counter; the pharmacy strip on the
 *    west side with tall shelving;
 *  - east wing (clothing and electronics): clothing racks, a block of fitting rooms (close
 *    quarters), an electronics counter, wall shelving;
 *  - stockroom along the back behind a partition with seven doorways: pallet racking, the
 *    loading docks, and an office mezzanine (deck at 4.6 m) over the middle with a railing
 *    overlooking the sales floor, four offices, two stairs up from the sales floor;
 *  - outside stairs up the back wall (east wing) and the west wall (west wing) onto the flat wing
 *    roofs (9 m), the store's sniper perches (a second model, superstore-stairs);
 *  - a store floor and a ceiling (the shell's roof has no inner faces).
 * Rebuilt (owner, 2026-11-11: "audit inside superstore, missing walls, stair case handle"): steel
 * stairs with stringers and handrails on both sides, rails along every open edge of the
 * mezzanine and its landings, the stockroom partition up to the ceiling, the shell's walls lined
 * inside, and the furniture boxes (tills, fridges, produce, clothing, wall shelving, wing
 * racking, office desks) replaced by the owner's downloads, placed by layout.ts
 * (superstoreFitout) on the same store frame.
 * Collision-only copies of the shell's walls (with its openings) and the ceiling make the
 * interior a room for the loot spots (loot-spots.ts); doors.ts treats the model as doorless (the
 * shell carries the doors).
 *
 *   node art/blender/br/build_superstore_interior.mjs        (run from the repo root)
 *
 * Store frame: front (+z) to the south car park. Writes
 * public/fps/br/models/superstore-{interior,stairs}.lod{0,1,2}.glb, their boxes and models.json
 * entries.
 * Original work.
 */
import { COLOURS as C, createKit, publish } from "./procedural-kit.mjs";

// The shell (collision of the Big Box Store, store frame, metres).
const FRONT = 34.1,
  BACK = -37.05,
  WEST = -73.45,
  EAST = 74.75;
const NOTCH = { x0: -61.2, x1: -36.4, z0: -1.6 }; // the open court in the front-west corner
const HALL = { x0: -37, x1: 38 }; // the tall middle block; the wings either side are lower
const HALL_CEIL = 12,
  WING_CEIL = 7.85;
const WING_ROOF = 9.0;
// Openings shared with building-access-v4.json (the shell's cuts and doors).
export const ENTRANCES = [
  [-9.9, -6.6],
  [-2.75, 0.5],
  [11.0, 14.3],
  [18.15, 21.4],
];
export const DOCKS = [
  [-5.8, -2.2],
  [1.7, 5.3],
  [9.2, 12.8],
];
export const DOORS = [
  { wall: "west", at: -22 },
  { wall: "east", at: -10 },
  { wall: "east", at: 20 },
  { wall: "notch", at: 8 },
  { wall: "back", at: 31.5 },
  { wall: "front", at: -67 },
];
const DOOR_W = 1.2,
  DOOR_H = 2.3;
// Partition between sales floor and stockroom, the mezzanine.
const PART_Z = -24;
const MEZZ = { x0: -30, x1: 30, z0: BACK + 0.05, z1: -21, y: 4.6 };

const WALL = [0.86, 0.85, 0.82];
const FLOOR = [0.74, 0.73, 0.7];
const STOCK_FLOOR = [0.55, 0.55, 0.53];
const CEIL = [0.72, 0.72, 0.7];
const GONDOLA = [0.32, 0.4, 0.52];
const RACK = [0.85, 0.42, 0.12];
const BEAM = [0.18, 0.32, 0.6];
const PRODUCT = [
  [0.8, 0.22, 0.18],
  [0.95, 0.75, 0.25],
  [0.25, 0.5, 0.75],
  [0.9, 0.9, 0.85],
  [0.3, 0.62, 0.32],
  [0.85, 0.45, 0.2],
  [0.6, 0.3, 0.55],
  [0.55, 0.42, 0.3],
];
const CARDBOARD = [0.62, 0.48, 0.3];

const k = createKit();
const { box } = k;
/** Files of this build (the 2026-11-08 ones stay for older revisions). */
const TAG = "fitout-v2";

// --- Steel rails ------------------------------------------------------------------------------
const RAIL_H = 1.05;
const RAIL = [0.3, 0.31, 0.33];
/**
 * A guard rail along a straight, axis-aligned edge from a to b ([x, z]) on a floor at y: posts
 * about every 1.5 m, a top rail and a mid rail (drawn), and one thin collision box from the floor
 * to the top rail (a player neither walks nor falls through it, and shoots over it).
 */
const guard = (kit, a, b, y, { lod = 1 } = {}) => {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = Math.max(1, Math.ceil(len / 1.5));
  for (let i = 0; i <= n; i++) {
    const x = a[0] + ((b[0] - a[0]) * i) / n,
      z = a[1] + ((b[1] - a[1]) * i) / n;
    kit.box([x - 0.03, y, z - 0.03, x + 0.03, y + RAIL_H, z + 0.03], RAIL, { collide: false, lod });
  }
  kit.beam([a[0], y + RAIL_H - 0.03, a[1]], [b[0], y + RAIL_H - 0.03, b[1]], 0.06, 0.06, RAIL, {
    lod,
  });
  kit.beam([a[0], y + 0.5, a[1]], [b[0], y + 0.5, b[1]], 0.04, 0.04, RAIL, { lod });
  kit.box(
    [
      Math.min(a[0], b[0]) - 0.04,
      y,
      Math.min(a[1], b[1]) - 0.04,
      Math.max(a[0], b[0]) + 0.04,
      y + RAIL_H,
      Math.max(a[1], b[1]) + 0.04,
    ],
    RAIL,
    { visible: false },
  );
};
/**
 * One side of a straight flight that runs along `axis` from a0 (bottom, y0) to a1 (top,
 * y0 + rise) in `steps` treads, its side line at c: a steel stringer under the treads' edge, a
 * sloped handrail 1 m above the nosings with a mid rail, posts every third step, and collision
 * per tread from the floor below to 1 m above it (the flight's side stops a player; the stairs'
 * own treads stay walkable).
 */
const stairSide = (kit, axis, a0, a1, c, y0, rise, steps, { lod = 1, floor = 0 } = {}) => {
  const run = (a1 - a0) / steps,
    r = rise / steps;
  const P = (a, y) => (axis === "x" ? [a, y, c] : [c, y, a]);
  // The nosing line: the top of tread s is at y0 + (s + 1) r, between a0 + s run and a0 + (s+1) run.
  kit.beam(P(a0, y0 + r - 0.15), P(a1, y0 + rise - 0.15), 0.08, 0.3, C.steel, { lod });
  kit.beam(P(a0, y0 + r + 1.0), P(a1, y0 + rise + 1.0), 0.06, 0.06, RAIL, { lod });
  kit.beam(P(a0, y0 + r + 0.5), P(a1, y0 + rise + 0.5), 0.04, 0.04, RAIL, { lod });
  for (let s = 0; s < steps; s++) {
    const pa = a0 + s * run,
      pb = a0 + (s + 1) * run;
    const t = y0 + (s + 1) * r;
    if (s % 3 === 0 || s === steps - 1) {
      const at = (pa + pb) / 2;
      const [x, , z] = P(at, 0);
      kit.box([x - 0.03, t, z - 0.03, x + 0.03, t + 1.0, z + 0.03], RAIL, { collide: false, lod });
    }
    const [lo, hi] = [Math.min(pa, pb), Math.max(pa, pb)];
    kit.box(
      axis === "x"
        ? [lo, floor, c - 0.04, hi, t + 1.0, c + 0.04]
        : [c - 0.04, floor, lo, c + 0.04, t + 1.0, hi],
      RAIL,
      { visible: false },
    );
  }
};
let seed = 1;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const pick = (list) => list[Math.floor(rand() * list.length)];

// --- Floor and ceiling ----------------------------------------------------------------------
const inNotch = (x, z) => x > NOTCH.x0 && x < NOTCH.x1 && z > NOTCH.z0;
// Floor: sales (front of the partition) and stockroom (behind it); none in the notch court.
box([WEST, 0, PART_Z, NOTCH.x0, 0.02, FRONT], FLOOR, { collide: false });
box([NOTCH.x0, 0, PART_Z, NOTCH.x1, 0.02, NOTCH.z0], FLOOR, { collide: false });
box([NOTCH.x1, 0, PART_Z, EAST, 0.02, FRONT], FLOOR, { collide: false });
box([WEST, 0, BACK, EAST, 0.02, PART_Z], STOCK_FLOOR, { collide: false });
// Ceilings (collision too: the loot spots need a roof within 14 m).
box([HALL.x0, HALL_CEIL, BACK, HALL.x1, HALL_CEIL + 0.15, NOTCH.z0], CEIL);
box([NOTCH.x1, HALL_CEIL, NOTCH.z0, HALL.x1, HALL_CEIL + 0.15, FRONT], CEIL);
box([WEST, WING_CEIL, BACK, HALL.x0, WING_CEIL + 0.15, NOTCH.z0], CEIL);
box([WEST, WING_CEIL, NOTCH.z0, NOTCH.x0, WING_CEIL + 0.15, FRONT], CEIL);
box([HALL.x1, WING_CEIL, BACK, EAST, WING_CEIL + 0.15, FRONT], CEIL);
// Fascias where the hall ceiling steps down to the wings.
box([HALL.x0 - 0.2, WING_CEIL, BACK, HALL.x0, HALL_CEIL, NOTCH.z0], WALL);
box([HALL.x1, WING_CEIL, BACK, HALL.x1 + 0.2, HALL_CEIL, FRONT], WALL);
// Columns along the step (cover in the open sales floor).
for (let z = -18; z <= 30; z += 8) {
  if (z > NOTCH.z0) {
    // west side of the hall faces the notch wall there: no column needed
  } else box([HALL.x0 - 0.35, 0, z - 0.35, HALL.x0 + 0.35, WING_CEIL, z + 0.35], WALL);
  box([HALL.x1 - 0.35, 0, z - 0.35, HALL.x1 + 0.35, WING_CEIL, z + 0.35], WALL);
}

// Light strips under the ceilings (rows of fluorescent fittings).
for (let x = HALL.x0 + 4; x < HALL.x1 - 2; x += 6)
  for (let z = BACK + 3; z < FRONT - 3; z += 9)
    if (!inNotch(x, z))
      box([x - 0.2, HALL_CEIL - 0.12, z, x + 0.2, HALL_CEIL, z + 6], [1, 1, 0.96], {
        collide: false,
      });
for (const [x0, x1, z0, z1] of [
  [WEST, HALL.x0, BACK, NOTCH.z0],
  [WEST, NOTCH.x0, NOTCH.z0, FRONT],
  [HALL.x1, EAST, BACK, FRONT],
])
  for (let x = x0 + 3; x < x1 - 1; x += 6)
    for (let z = z0 + 2; z < z1 - 2; z += 8)
      box(
        [x - 0.2, WING_CEIL - 0.12, z, x + 0.2, WING_CEIL, Math.min(z + 6, z1 - 1)],
        [1, 1, 0.96],
        {
          collide: false,
        },
      );
// The ceilings face down, away from the sun: draw their undersides (and the strips) with up
// normals so they read as lit (vertex colours, no interior lights in the island renderer).
const geometry = k.geometry;
k.geometry = (lod) => {
  const g = geometry(lod);
  for (let i = 0; i < g.nrm.length; i += 3)
    // (All of them: the mezzanine deck's underside drew black over the stockroom too.)
    if (g.nrm[i + 1] < -0.5) g.nrm[i + 1] = 1;
  return g;
};

// --- Collision copies of the shell walls (with its openings), for the room test --------------
const ghost = { visible: false };
const doorAt = (wall) => DOORS.filter((d) => d.wall === wall).map((d) => d.at);
const holes = (spans) => spans.map(([a, b]) => [a, b]);
const wallRun = (axis, a0, a1, c0, c1, y1, openings) => {
  const cuts = openings.filter(([h0, h1]) => h1 > a0 && h0 < a1).sort((p, q) => p[0] - q[0]);
  let a = a0;
  for (const [h0, h1] of [...cuts, [a1, a1]]) {
    if (h0 - a > 0.01)
      box(axis === "x" ? [a, 0, c0, h0, y1, c1] : [c0, 0, a, c1, y1, h0], WALL, ghost);
    a = Math.max(a, h1);
  }
};
const doorSpan = (at) => [at - DOOR_W / 2 - 0.05, at + DOOR_W / 2 + 0.05];
// Heights: the tall hall to its ceiling, the wings to theirs (never above the wing roofs).
const WING_TOP = WING_CEIL + 0.15,
  HALL_TOP = HALL_CEIL + 0.15;
const front = [
  ...holes(ENTRANCES),
  ...doorAt("front")
    .filter((x) => x > NOTCH.x1)
    .map(doorSpan),
];
wallRun("x", NOTCH.x1, HALL.x1, FRONT, FRONT + 0.3, HALL_TOP, front);
wallRun("x", HALL.x1, EAST, FRONT, FRONT + 0.3, WING_TOP, front);
wallRun("x", WEST, NOTCH.x0, FRONT, FRONT + 0.3, WING_TOP, doorAt("front").map(doorSpan));
const back = [...holes(DOCKS), ...doorAt("back").map(doorSpan)];
wallRun("x", WEST, HALL.x0, BACK - 0.3, BACK, WING_TOP, back);
wallRun("x", HALL.x0, HALL.x1, BACK - 0.3, BACK, HALL_TOP, back);
wallRun("x", HALL.x1, EAST, BACK - 0.3, BACK, WING_TOP, back);
wallRun("z", BACK, FRONT, WEST - 0.3, WEST, WING_TOP, doorAt("west").map(doorSpan));
wallRun("z", BACK, FRONT, EAST, EAST + 0.3, WING_TOP, doorAt("east").map(doorSpan));
wallRun("x", NOTCH.x0, NOTCH.x1, NOTCH.z0 - 0.3, NOTCH.z0, WING_TOP, []);
wallRun("z", NOTCH.z0, FRONT, NOTCH.x0, NOTCH.x0 + 0.3, WING_TOP, []);
wallRun("z", NOTCH.z0, FRONT, NOTCH.x1 - 0.3, NOTCH.x1, HALL_TOP, doorAt("notch").map(doorSpan));

// --- The shell's walls lined inside ---------------------------------------------------------
// From inside, the shell showed its outside: speckled granite and storefront panels, with a dark
// seam where some walls met the ceiling. A painted lining 1–5 cm in front of each inner face
// (measured on the shell's collision), up to the ceiling, with the shell's openings (doors 2.3 m,
// docks 4.2 m). The storefront (the front wall) keeps its own look. Drawn only.
const LINE = [0.8, 0.79, 0.75];
const lined = (axis, a0, a1, c, inward, y1, holes) =>
  k.wall(
    axis,
    a0,
    a1,
    inward > 0 ? c + 0.01 : c - 0.05,
    inward > 0 ? c + 0.05 : c - 0.01,
    0,
    y1,
    holes.map(([h0, h1, top]) => [h0, h1, 0, top]),
    LINE,
    { collide: false },
  );
const doorHole = (at) => [at - DOOR_W / 2 - 0.05, at + DOOR_W / 2 + 0.05, DOOR_H + 0.05];
const SHELL = {
  west: -73.5,
  east: 74.75,
  back: -37.05,
  notchNorth: -1.6,
  notchWest: -61.45,
  notchEast: -36.3,
};
lined("z", BACK, FRONT, SHELL.west, 1, WING_CEIL, doorAt("west").map(doorHole));
lined("z", BACK, FRONT, SHELL.east, -1, WING_CEIL, doorAt("east").map(doorHole));
const backHoles = [...DOCKS.map(([a, b]) => [a, b, 4.25]), ...doorAt("back").map(doorHole)];
lined("x", SHELL.west, HALL.x0, SHELL.back, 1, WING_CEIL, backHoles);
lined("x", HALL.x0, HALL.x1, SHELL.back, 1, HALL_CEIL, backHoles);
lined("x", HALL.x1, SHELL.east, SHELL.back, 1, WING_CEIL, backHoles);
lined("x", SHELL.notchWest, SHELL.notchEast, SHELL.notchNorth, -1, WING_CEIL, []);
lined("z", SHELL.notchNorth, FRONT, SHELL.notchWest, -1, WING_CEIL, []);
lined("z", SHELL.notchNorth, FRONT, SHELL.notchEast, 1, HALL_CEIL, doorAt("notch").map(doorHole));

// --- Sales hall: gondola runs, end caps ------------------------------------------------------
// (The checkout lanes behind the entrances are the downloaded `ss-checkout` counters, placed by
// layout.ts.)
/** A double-sided shelving run along z: base, shelves of stock both sides, a top. */
const gondola = (x, z0, z1, h) => {
  box([x - 0.6, 0, z0, x + 0.6, h, z1], GONDOLA);
  if (z1 - z0 < 0.5) return;
  for (let level = 0; level < 3; level++) {
    const y = 0.15 + level * ((h - 0.3) / 3);
    if (y + 0.35 > h) break;
    for (const side of [-1, 1]) {
      const c = pick(PRODUCT);
      box(
        side < 0
          ? [x - 0.66, y, z0 + 0.1, x - 0.6, y + 0.35, z1 - 0.1]
          : [x + 0.6, y, z0 + 0.1, x + 0.66, y + 0.35, z1 - 0.1],
        c,
        { collide: false, lod: 0 },
      );
    }
  }
};
/** A low end-cap display at a run's end (crouch cover). */
const endCap = (x, z, dir) =>
  box(
    [x - 0.7, 0, Math.min(z, z + dir * 1.0), x + 0.7, 1.1, Math.max(z, z + dir * 1.0)],
    pick(PRODUCT),
  );
for (let i = -6; i <= 6; i++) {
  const x = i * 4.2;
  const h = Math.abs(i) % 3 === 1 ? 1.5 : 2.3;
  // North run (to the cross aisle) and south run (to the tills), each broken once (the maze).
  const gapN = -18 + Math.floor(rand() * 4) * 4,
    gapS = 4 + Math.floor(rand() * 4) * 4;
  gondola(x, -19.5, gapN, h);
  gondola(x, gapN + 2.2, -1.6, h);
  gondola(x, 1.6, gapS, h);
  gondola(x, gapS + 2.2, 19.5, h);
  endCap(x, 19.5, 1);
  if (i % 2) endCap(x, -19.5, -1);
}
// Promotion pallets at the hall's sides and on the cross aisle's ends.
for (const [x, z] of [
  [-33, 12],
  [-33.5, 4],
  [33, 14],
  [34, 6],
  [-33, 18],
  [35, -12],
  [-34.5, -14],
]) {
  box([x - 0.6, 0, z - 0.5, x + 0.6, 0.14, z + 0.5], C.wood, { lod: 0 });
  box([x - 0.55, 0.14, z - 0.45, x + 0.55, 1.2, z + 0.45], CARDBOARD);
}

// --- West wing: grocery, the pharmacy strip ---------------------------------------------------
// (Fridges along the partition and the west wall, produce displays and freezer islands: the
// downloaded models, layout.ts.)
// Deli counter along the notch wall with a back shelf.
box([-58, 0, -4.4, -44, 1.1, -3.6], C.counter);
box([-58, 0, NOTCH.z0 - 0.9, -44, 2.2, NOTCH.z0 - 0.3], C.shelf);
// The pharmacy strip (west of the notch court): a tall gondola run down the middle (the wall
// shelving along the west wall is the downloaded `ss-shelf`), a counter at the back.
for (const x of [-66.5]) {
  gondola(x, 2, 14, 2.3);
  gondola(x, 16.2, 28, 2.3);
}
box([-63.5, 0, 3, -62.2, 1.1, 12], C.counter);
box([WEST + 0.1, 0, 30, -68.4, 1.4, 31], C.shelf);

// --- East wing: fitting rooms, electronics (clothing racks and mannequins: layout.ts) ---------
// Fitting rooms: two rows of cubicles off a corridor, curtains open.
{
  const fx0 = 62,
    fx1 = 74.4,
    z0 = 2,
    z1 = 14,
    h = 2.3;
  box([fx0, 0, z0, fx1, h, z0 + 0.12], WALL);
  box([fx0, 0, z1 - 0.12, fx1, h, z1], WALL);
  // Corridor along z = 8 (entered from the west); cubicles 2.4 m wide either side.
  for (let x = fx0; x <= fx1 + 0.01; x += 2.48) {
    box([x - 0.06, 0, z0, x + 0.06, h, 6.8], WALL);
    box([x - 0.06, 0, 9.2, x + 0.06, h, z1], WALL);
  }
  for (let x = fx0 + 1.24; x < fx1; x += 2.48) {
    box([x - 0.5, 0, z0 + 0.15, x + 0.5, 0.45, z0 + 0.6], C.wood, { lod: 0 });
    box([x - 0.5, 0, z1 - 0.6, x + 0.5, 0.45, z1 - 0.15], C.wood, { lod: 0 });
  }
}
// Electronics: a counter, display tables and wall shelving.
box([58, 0, 25, 72, 1.1, 26], C.counter);
box([71, 0, 26, 72, 1.1, 32], C.counter);
for (const [x, z] of [
  [62, 29.5],
  [66, 29.5],
  [62, 17],
  [66, 17],
  [70, 17],
])
  box([x - 1, 0, z - 0.7, x + 1, 0.85, z + 0.7], [0.2, 0.2, 0.22]);
// (Wall shelving along the east wall: the downloaded `ss-shelf`, layout.ts.)
// Tall gondolas in the east wing's back half.
for (let x = 44; x <= 66; x += 5.5) {
  gondola(x, -20, -11, 2.3);
  gondola(x, -8.6, -2, 2.3);
}

// --- Stockroom partition, racking, docks ------------------------------------------------------
const partitionGaps = [-52, -40, -18, 18, 40, 55].map((x) => [x - 1.5, x + 1.5]);
/** The partition's top over x0..x1: the deck under the mezzanine, else the ceiling there. */
const ceilAt = (x0, x1) =>
  x0 >= MEZZ.x0 - 0.01 && x1 <= MEZZ.x1 + 0.01
    ? MEZZ.y - 0.3
    : x0 >= HALL.x0 - 0.01 && x1 <= HALL.x1 + 0.01
      ? HALL_CEIL
      : WING_CEIL;
partitionGaps.push([-2.5, 2.5]);
partitionGaps.sort((a, b) => a[0] - b[0]);
{
  let a = WEST;
  for (const [g0, g1] of [...partitionGaps, [EAST, EAST]]) {
    // Split where the mezzanine and the tall hall begin and end: under the deck the wall stops
    // at the deck; elsewhere it goes up to the ceiling (it stopped at 6 m, leaving a gap under
    // the 7.85 m wing ceilings and the 12 m hall ceiling).
    const cuts = [a, ...[HALL.x0, MEZZ.x0, MEZZ.x1, HALL.x1].filter((x) => x > a && x < g0), g0];
    for (let i = 0; i + 1 < cuts.length; i++) {
      const s0 = cuts[i],
        s1 = cuts[i + 1];
      if (s1 - s0 < 0.05) continue;
      box([s0, 0, PART_Z - 0.15, s1, ceilAt(s0, s1), PART_Z + 0.15], WALL);
    }
    a = g1;
  }
  // Lintels over the doorways outside the mezzanine (the opening stays 2.6 m high), to the
  // ceiling.
  for (const [g0, g1] of partitionGaps)
    if (g1 < MEZZ.x0 || g0 > MEZZ.x1)
      box([g0, 2.6, PART_Z - 0.15, g1, ceilAt(g0, g1), PART_Z + 0.15], WALL);
}
/** Pallet racking along x: upright frames, orange beams per level, boxes on most bays. */
const racking = (x0, x1, z, levels, levelH) => {
  const depth = 1.1;
  box([x0, 0, z - depth / 2, x1, levels * levelH, z + depth / 2], RACK, { visible: false });
  for (let x = x0; x <= x1 + 0.01; x += 2.7)
    box([x - 0.05, 0, z - depth / 2, x + 0.05, levels * levelH, z + depth / 2], BEAM, {
      collide: false,
    });
  for (let level = 0; level < levels; level++) {
    const y = level * levelH;
    if (level > 0)
      box([x0, y - 0.12, z - depth / 2, x1, y, z + depth / 2], RACK, { collide: false });
    for (let x = x0 + 0.1; x + 2.5 <= x1 + 0.01; x += 2.7) {
      if (rand() < 0.2) continue;
      box([x + 0.15, y, z - 0.45, x + 2.45, y + 0.12, z + 0.45], C.wood, {
        collide: false,
        lod: 0,
      });
      box(
        [x + 0.25, y + 0.12, z - 0.4, x + 2.35, y + Math.min(levelH - 0.35, 1.3), z + 0.4],
        CARDBOARD,
        {
          collide: false,
          lod: 0,
        },
      );
    }
  }
};
// Under the mezzanine (4.3 m clear): two-level racking either side of the docks.
for (const z of [-34, -29]) {
  racking(-28.5, -15, z, 2, 1.6);
  racking(17, 28.5, z, 2, 1.6);
}
// The wing stockrooms (7.85 m): rows of the downloaded 4 m pallet racking (`ss-pallet-rack`,
// layout.ts) with pallets of stock on its beams (here: the beams carry no collision of their
// own, the rack is one solid block).
const WING_RACKS = [];
for (const z of [-35.5, -30.6])
  for (const [x0, n] of [
    [-71.2, 2],
    [-58.6, 3],
    [33.4, 3],
    [50, 3],
    [64.2, 2],
  ])
    for (let i = 0; i < n; i++) WING_RACKS.push([x0 + 2.1 + i * 4.2, z]);
for (const [x, z] of WING_RACKS)
  for (const [y, h] of [
    [0, 0.65],
    [1.0, 1.25],
    [3.1, 0.75],
  ])
    for (const dx of [-1.05, 1.05]) {
      if (rand() < 0.2) continue;
      box([x + dx - 0.95, y, z - 0.5, x + dx + 0.95, y + 0.12, z + 0.5], C.wood, {
        collide: false,
        lod: 0,
      });
      box([x + dx - 0.85, y + 0.12, z - 0.45, x + dx + 0.85, y + 0.12 + h, z + 0.45], CARDBOARD, {
        collide: false,
        lod: 0,
      });
    }
// Loose stock by the docks.
for (const [x, z] of [
  [-8, -33],
  [-8.2, -31.6],
  [7.6, -32],
  [14.5, -33.5],
  [14.6, -30.6],
  [-1, -27],
]) {
  box([x - 0.6, 0, z - 0.5, x + 0.6, 0.14, z + 0.5], C.wood, { lod: 0 });
  box([x - 0.55, 0.14, z - 0.45, x + 0.55, 1.3, z + 0.45], CARDBOARD);
}
// Dock levellers and bumpers at each bay.
for (const [a, b] of DOCKS) {
  box([a + 0.2, 0, BACK + 0.05, b - 0.2, 0.08, BACK + 2.4], [0.4, 0.4, 0.38], {
    collide: false,
    lod: 0,
  });
  box([a - 0.35, 0.4, BACK + 0.05, a - 0.05, 1.0, BACK + 0.3], [0.1, 0.1, 0.1], {
    collide: false,
    lod: 0,
  });
  box([b + 0.05, 0.4, BACK + 0.05, b + 0.35, 1.0, BACK + 0.3], [0.1, 0.1, 0.1], {
    collide: false,
    lod: 0,
  });
}

// --- The mezzanine: deck, railing, offices, stairs --------------------------------------------
box([MEZZ.x0, MEZZ.y - 0.3, MEZZ.z0, MEZZ.x1, MEZZ.y, MEZZ.z1], C.steel);
// Deck posts at the front edge (the partition carries the back).
for (let x = MEZZ.x0 + 0.2; x <= MEZZ.x1; x += 7.5)
  box([x - 0.15, 0, MEZZ.z1 - 0.3, x + 0.15, MEZZ.y - 0.3, MEZZ.z1], C.steel);
// Rails (1.05 m: shoot over them, crouch behind them) along every open edge of the deck: the
// whole front (it stopped 1.6 m short of each end: two open drops), and both ends between the
// end office and the partition (open drops into the stockroom). The stairs' landings meet the
// deck's ends between the partition and the front.
guard(k, [MEZZ.x0, MEZZ.z1 - 0.04], [MEZZ.x1, MEZZ.z1 - 0.04], MEZZ.y);
for (const x of [MEZZ.x0, MEZZ.x1]) guard(k, [x, -30.5], [x, PART_Z - 0.15], MEZZ.y);
// Offices along the back of the deck: front wall with a door and a window per office.
const OFFICES = [
  [-30, -15],
  [-15, 0],
  [0, 15],
  [15, 30],
];
const OZ = -30.5,
  OH = 3.0;
for (const [o0, o1] of OFFICES) {
  const door = o0 + 2,
    win = (o0 + o1) / 2 + 1.5;
  k.wall(
    "x",
    o0,
    o1,
    OZ - 0.1,
    OZ + 0.1,
    MEZZ.y,
    MEZZ.y + OH,
    [
      [door - 0.6, door + 0.6, MEZZ.y, MEZZ.y + 2.2],
      [win - 2, win + 2, MEZZ.y + 1.0, MEZZ.y + 2.2, true],
    ],
    WALL,
  );
  box([o1 - 0.08, MEZZ.y, MEZZ.z0, o1 + 0.08, MEZZ.y + OH, OZ - 0.1], WALL);
  // (Desks, chairs and filing cabinets: the downloaded office kit, layout.ts.)
}
box([MEZZ.x0 - 0.08, MEZZ.y, MEZZ.z0, MEZZ.x0 + 0.08, MEZZ.y + OH, OZ - 0.1], WALL);
// Crates on the walkway (cover up there).
box([-8, MEZZ.y, -27, -6.8, MEZZ.y + 1.0, -25.8], CARDBOARD);
box([9, MEZZ.y, -26.5, 10.2, MEZZ.y + 1.0, -25.3], CARDBOARD);
// Stairs up from the sales floor at both ends of the deck: a flight along z beside the deck,
// rising north to a landing level with it.
const STEPS = 16;
for (const [s0, s1] of [
  [MEZZ.x0 - 1.6, MEZZ.x0],
  [MEZZ.x1, MEZZ.x1 + 1.6],
]) {
  k.flight(s0, s1, -5, -19.4, 0, MEZZ.y, STEPS);
  // The landing reaches the partition (it stopped 0.85 m short: a hole to the floor).
  box([s0, MEZZ.y - 0.3, PART_Z + 0.15, s1, MEZZ.y, -19.4], C.steel);
  const outer = s0 < 0 ? s0 : s1,
    inner = s0 < 0 ? s1 : s0;
  // Both sides of the flight: stringer, handrail, posts, collision (it was a solid 5.6 m panel
  // on the outer side, and nothing on the side over the sales floor).
  for (const c of [outer, inner]) stairSide(k, "z", -5, -19.4, c, 0, MEZZ.y, STEPS);
  // The landing: its outer side to the partition, its inner side to the deck's front edge.
  guard(k, [outer, -19.4], [outer, PART_Z + 0.15], MEZZ.y);
  guard(k, [inner, -19.4], [inner, MEZZ.z1], MEZZ.y);
}

// --- Far LOD: the interior does not show from afar (the ceiling, hidden in the shell) ---------
const far = createKit();
far.box([HALL.x0, HALL_CEIL, BACK, HALL.x1, HALL_CEIL + 0.15, NOTCH.z0], CEIL, { lod: 2 });

await publish("superstore-interior", k, far, {
  tag: TAG,
  title: "Island Superstore interior",
  source: "art/blender/br/build_superstore_interior.mjs",
  use: "Island Superstore: sales maze, tills, grocery and clothing wings, fitting rooms, stockroom racking, office mezzanine",
  ring: "building",
  size: [EAST + 0.3 - (WEST - 0.3), HALL_CEIL + 0.15, FRONT + 0.3 - (BACK - 0.3)],
});

// --- Outside stairs onto the wing roofs (their own model: from the roofs, the interior's room
// test must not see a way down through its ceiling) --------------------------------------------
const st = createKit();
/** A straight flight from (a0 → a1) along `axis`, rising `rise` over `steps`, across c0..c1. */
const flight = (axis, a0, a1, c0, c1, rise, steps) => {
  const run = (a1 - a0) / steps,
    r = rise / steps;
  for (let s = 0; s < steps; s++) {
    const pa = a0 + s * run,
      pb = a0 + (s + 1) * run;
    const t = (s + 1) * r;
    const [lo, hi] = [Math.min(pa, pb), Math.max(pa, pb)];
    st.box(
      axis === "x"
        ? [lo, Math.max(0, t - 0.3), c0, hi, t, c1]
        : [c0, Math.max(0, t - 0.3), lo, c1, t, hi],
      C.stair,
    );
  }
};
// East wing roof: up the back wall's outside face, rising east to the roof's corner.
// Clear of the roof's eave (to z = BACK − 0.9 at 8.1 m); the landing meets the eave's top.
flight("x", 46, 73.2, BACK - 2.6, BACK - 1.05, WING_ROOF - 0.3, 29);
st.box([73.2, WING_ROOF - 0.6, BACK - 2.6, EAST + 0.3, WING_ROOF, BACK - 0.88], C.stair);
// Handrails on both sides (the outer "rail" was a 10 m sheet without collision: a player walked
// off a 9 m stair; the inner side leaves 0.8 m to the wall), and round the landing.
stairSide(st, "x", 46, 73.2, BACK - 2.6, 0, WING_ROOF - 0.3, 29);
stairSide(st, "x", 46, 73.2, BACK - 1.05, 0, WING_ROOF - 0.3, 29);
guard(st, [73.2, BACK - 2.6], [EAST + 0.3, BACK - 2.6], WING_ROOF);
guard(st, [EAST + 0.3, BACK - 2.6], [EAST + 0.3, BACK - 0.88], WING_ROOF);
// West wing roof: up the west wall's outside face, rising north.
flight("z", 22, -6, WEST - 1.6, WEST - 0.25, WING_ROOF - 0.3, 29);
st.box([WEST - 1.6, WING_ROOF - 0.6, -10, WEST - 0.25, WING_ROOF, -6], C.stair);
// The outer side (the wall side is flush with the wall), and round the landing.
stairSide(st, "z", 22, -6, WEST - 1.6, 0, WING_ROOF - 0.3, 29);
guard(st, [WEST - 1.6, -6], [WEST - 1.6, -10], WING_ROOF);
guard(st, [WEST - 1.6, -10], [WEST - 0.25, -10], WING_ROOF);
const stFar = createKit();
stFar.box([46, 0, BACK - 2.6, EAST + 0.3, WING_ROOF, BACK - 1.05], C.stair, { lod: 2 });
stFar.box([WEST - 1.6, 0, -10, WEST - 0.25, WING_ROOF, 22], C.stair, { lod: 2 });

await publish("superstore-stairs", st, stFar, {
  tag: TAG,
  title: "Island Superstore roof stairs",
  source: "art/blender/br/build_superstore_interior.mjs",
  use: "Island Superstore: steel stairs up the back and west walls onto the wing roofs",
  class: "structure",
  ring: "structure",
  size: [EAST + 0.3 - (WEST - 1.66), WING_ROOF + 1.0, FRONT - (BACK - 2.66)],
});
