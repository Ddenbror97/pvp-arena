/**
 * Skyline Residences (owner, 2026-11-13: "build something diffrent, like high sky skrepers not to
 * high but should be highest building in the map so far. enterble, floors,rooms,elevator
 * working, like a apartment condiminium luxery small one"). Two residential towers on the
 * countryside between Central Hospital and Redstone Quarry, the tallest buildings on the island
 * (the old tallest you could enter was the airfield's 32 m control tower):
 *
 *  - condo-lobby: the ground floor of a tower (the entrance hall, the concierge, a lounge);
 *  - condo-floor: one residential floor, stacked (two apartments either side of the core, a sky
 *    lounge on the south front, balconies);
 *  - condo-roof-a / condo-roof-b: the roofs (a helipad and the lift's top stop; a pool deck);
 *  - condo-club: the clubhouse between them (gym, lounge and bar, the pool terrace).
 *
 * A tower is a stack of these placements, one storey (3.6 m) apart (layout.ts skyline), so a
 * floor is drawn and collided once for every storey and instanced by the renderer. Every floor
 * shares the core: a switchback stair (flights rise from this floor's slab to the next one's)
 * and the express lift's shaft (lifts.ts: its cab in the lobby and on the roof, shut doors on
 * the floors between). Panorama glass from the
 * sill to the ceiling on every side (panes.ts: whole until a bullet breaks it).
 *
 *   node art/blender/br/build_condo.mjs        (run from the repo root)
 *
 * Model space: metres, pivot at the bottom centre (the slab's underside), the south front (the
 * balconies) towards +z. Original work.
 */
import fs from "node:fs";
import { COLOURS as C, createKit, publish } from "./procedural-kit.mjs";

const TAG = "skyline-v1";
export const STOREY = 3.6;
const SLAB = 0.3;
/** Walking level above the model's origin (the slab's top). */
const FL = SLAB;
const T = 0.3,
  IT = 0.15;
/** The plate: x ±13, z ±11; the balconies to z 13. */
const X = 13,
  Z = 11,
  BAL = 2.2;
/** Window sill and head above the floor (the panorama glass). */
const SILL = 0.45,
  HEAD = 3.0;

const K = {
  white: [0.93, 0.93, 0.91],
  facade: [0.2, 0.21, 0.23],
  stone: [0.78, 0.76, 0.72],
  dark: [0.17, 0.18, 0.2],
  bronze: [0.42, 0.33, 0.24],
  wallIn: [0.9, 0.89, 0.86],
  wallWarm: [0.86, 0.82, 0.76],
  oak: [0.55, 0.4, 0.27],
  marble: [0.88, 0.87, 0.84],
  tile: [0.74, 0.75, 0.76],
  carpet: [0.36, 0.33, 0.31],
  ceiling: [0.95, 0.95, 0.94],
  light: [1, 0.98, 0.92],
  stair: [0.72, 0.71, 0.69],
  rail: [0.25, 0.25, 0.27],
  steel: C.steel,
  glass: C.glass,
  lift: [0.62, 0.6, 0.56],
  liftDoor: [0.7, 0.68, 0.62],
  panel: [0.15, 0.15, 0.16],
  pool: [0.2, 0.55, 0.75],
  deck: [0.56, 0.45, 0.34],
  helipad: [0.3, 0.32, 0.31],
  yellow: [0.9, 0.75, 0.15],
  grass: [0.32, 0.45, 0.24],
};

// ------------------------------------------------------------------ the core (every storey)
/** Stair: two 1.2 m flights either side of a 0.2 m divider, rising north from z START. */
const STEPS = 12,
  TREAD = 0.28,
  FLIGHT_W = 1.2;
export const STAIR = {
  A: [-4.2, -3.0],
  Dv: [-3.0, -2.8],
  B: [-2.8, -1.6],
  /** Flight A starts here (the hall side) and runs north to zEnd; the landing beyond it. */
  zStart: -3.2,
  zEnd: -3.2 - STEPS * TREAD,
  zLand: -Z + T,
};
/** The lift's cab (inside the shaft), its opening south onto the hall. */
export const LIFT_CAB = { x0: 1.4, x1: 4.2, z0: -10.4, z1: -7.6, door: [1.75, 3.85] };
const CORE = { x0: -4.5, x1: 4.5, z1: 1.2 };
/** Each apartment's front door: in the core's side walls, z ±0.5 round this. */
const APT_DOOR_Z = -1.6;

function kitFor() {
  const k = createKit();
  /** A wall along x (z0..z1 thick) or z (x0..x1 thick) with holes along its run. */
  const wallX = (x0, x1, z0, z1, y0, y1, holes, colour, opts) =>
    k.wall("x", x0, x1, z0, z1, y0, y1, holes, colour, opts);
  const wallZ = (z0, z1, x0, x1, y0, y1, holes, colour, opts) =>
    k.wall("z", z0, z1, x0, x1, y0, y1, holes, colour, opts);
  return { k, wallX, wallZ };
}

/**
 * The outside skin of one storey at walking level y: panorama glass in bays between slim
 * piers, the panes in panes.ts's list (`panes` out). `doors`: [face, at, width] openings
 * (ground-floor doors, balcony doors) cut through the glass to the floor.
 */
function skin(k, wallX, wallZ, y, top, doors, panes, { sill = SILL } = {}) {
  const faces = [
    // face, axis, run from..to, the wall's thickness range
    ["s", "x", -X, X, Z - T, Z],
    ["n", "x", -X, X, -Z, -Z + T],
    ["w", "z", -Z + T, Z - T, -X, -X + T],
    ["e", "z", -Z + T, Z - T, X - T, X],
  ];
  for (const [face, axis, a0, a1, c0, c1] of faces) {
    const holes = [];
    for (const [f, at, w] of doors)
      if (f === face) holes.push([at - w / 2, at + w / 2, y, y + 2.5]);
    // Glass bays 3 m apart between 0.3 m piers, round the doors.
    const len = a1 - a0;
    const n = Math.round(len / 3.2);
    const bay = len / n;
    for (let i = 0; i < n; i++) {
      const g0 = a0 + i * bay + 0.15,
        g1 = a0 + (i + 1) * bay - 0.15;
      const clash = holes.some(([h0, h1]) => h1 > g0 - 0.2 && h0 < g1 + 0.2);
      if (clash) continue;
      // The north face's middle (the core: stair and lift) stays solid.
      if (face === "n" && g1 > CORE.x0 - 0.2 && g0 < CORE.x1 + 0.2) continue;
      // An open hole in the model: the pane in it is panes.ts's (drawn and collided per match).
      holes.push([g0, g1, y + sill, y + HEAD]);
      const g = (c0 + c1) / 2;
      panes.push(
        axis === "x"
          ? { x0: g0, x1: g1, z0: g - 0.04, z1: g + 0.04, y0: y + sill, y1: y + HEAD }
          : { x0: g - 0.04, x1: g + 0.04, z0: g0, z1: g1, y0: y + sill, y1: y + HEAD },
      );
    }
    holes.sort((p, q) => p[0] - q[0]);
    if (axis === "x") wallX(a0, a1, c0, c1, y, top, holes, K.facade);
    else wallZ(a0, a1, c0, c1, y, top, holes, K.facade);
  }
  // The white slab edge at each floor (outside, drawn only): the tower's horizontal lines.
  const e0 = y - FL - 0.02,
    e1 = y + 0.08;
  k.box([-X - 0.1, e0, Z, X + 0.1, e1, Z + 0.1], K.white, { collide: false });
  k.box([-X - 0.1, e0, -Z - 0.1, X + 0.1, e1, -Z], K.white, { collide: false });
  k.box([-X - 0.1, e0, -Z, -X, e1, Z], K.white, { collide: false });
  k.box([X, e0, -Z, X + 0.1, e1, Z], K.white, { collide: false });
}

/** A slab over the plate at [y0, y1] minus rectangular holes [x0, x1, z0, z1]. */
function slab(k, x0, x1, z0, z1, y0, y1, holes, colour, opts = {}) {
  const xs = [x0, x1],
    zs = [z0, z1];
  for (const [a, b, c, d] of holes) {
    if (a > x0 && a < x1) xs.push(a);
    if (b > x0 && b < x1) xs.push(b);
    if (c > z0 && c < z1) zs.push(c);
    if (d > z0 && d < z1) zs.push(d);
  }
  xs.sort((p, q) => p - q);
  zs.sort((p, q) => p - q);
  for (let a = 0; a + 1 < xs.length; a++) {
    let run = null;
    for (let b = 0; b + 1 < zs.length; b++) {
      const mx = (xs[a] + xs[a + 1]) / 2,
        mz = (zs[b] + zs[b + 1]) / 2;
      const hole = holes.some(([p, q, r, s]) => mx > p && mx < q && mz > r && mz < s);
      if (!hole) run = run ? [run[0], zs[b + 1]] : [zs[b], zs[b + 1]];
      if ((hole || b + 2 === zs.length) && run) {
        if (xs[a + 1] - xs[a] > 1e-3 && run[1] - run[0] > 1e-3) {
          k.box([xs[a], y0, run[0], xs[a + 1], y1, run[1]], colour, opts);
          if (opts.ceiling)
            k.ceiling(xs[a], y0 - 0.01, run[0], xs[a + 1], run[1], K.ceiling, { lod: 0 });
        }
        run = null;
      }
    }
  }
}

/** The stair well's hole in a slab (the flights from the storey below arrive through it). */
const STAIR_HOLE = [STAIR.A[0], STAIR.B[1], STAIR.zLand, STAIR.zStart];

/**
 * The core at walking level y: the stair (flights up to y + STOREY when `up`), the rails round
 * the well arriving from below (`below`), the lift shaft and its cab, the hall's walls (the
 * apartments' doors, the lounge doorway).
 */
function core(k, wallX, wallZ, y, { up, below, lounge = true, sideDoors = true, cab = true }) {
  const top = y + STOREY - FL; // the ceiling (the next slab's underside)
  const r = STOREY / 2 / STEPS;
  if (up) {
    for (let q = 0; q < STEPS; q++) {
      const za = STAIR.zStart - q * TREAD,
        zb = za - TREAD;
      const t = y + (q + 1) * r;
      k.box([STAIR.A[0], Math.max(y, t - 0.3), zb, STAIR.A[1], t, za], K.stair, { lod: 0 });
      const t2 = y + STOREY / 2 + (q + 1) * r;
      const zc = STAIR.zEnd + q * TREAD;
      k.box([STAIR.B[0], Math.max(y, t2 - 0.3), zc, STAIR.B[1], t2, zc + TREAD], K.stair, {
        lod: 0,
      });
    }
    // The landing half a storey up, to the north wall; the divider up to the next floor.
    k.box(
      [STAIR.A[0], y + STOREY / 2 - 0.3, STAIR.zLand, STAIR.B[1], y + STOREY / 2, STAIR.zEnd],
      K.stair,
      {
        lod: 0,
      },
    );
    k.box([STAIR.Dv[0], y, STAIR.zEnd, STAIR.Dv[1], y + STOREY, STAIR.zStart], K.wallIn, {
      lod: 0,
    });
  }
  if (below) {
    // Arriving from below: a rail along B's open side (the hall's), and across A's head when no
    // flight goes on up from here.
    k.box([STAIR.B[1], y, STAIR.zLand, STAIR.B[1] + 0.08, y + 1.05, STAIR.zStart], K.rail, {
      lod: 0,
    });
    if (!up)
      k.box([STAIR.A[0], y, STAIR.zStart - 0.08, STAIR.Dv[1], y + 1.05, STAIR.zStart], K.rail, {
        lod: 0,
      });
  }
  // The stair's east wall (between it and the lift lobby), from the north wall to the landing's
  // end: the hall reaches the flights from the south.
  wallZ(STAIR.zLand, STAIR.zEnd - 0.4, STAIR.B[1] + 0.3, STAIR.B[1] + 0.45, y, top, [], K.wallIn, {
    lod: 0,
  });
  // The lift shaft: walls round the cab, its opening south onto the lobby (2.1 m: no door is
  // fitted). The lift is an express (owner, 2026-11-13: "should go up to the top floor, not
  // stop at all floors"): the cab waits in the lobby and on the roof (`cab`); on the floors
  // between, the shaft's doors stay shut and the stair is the way.
  const L = LIFT_CAB;
  wallZ(L.z0 - 0.3, L.z1 + 0.3, L.x0 - 0.3, L.x0, y, top, [], K.wallIn, { lod: 0 });
  wallX(L.x0 - 0.3, L.x1, L.z0 - 0.3, L.z0, y, top, [], K.wallIn, { lod: 0 });
  wallX(
    L.x0 - 0.3,
    L.x1,
    L.z1,
    L.z1 + 0.3,
    y,
    top,
    cab ? [[L.door[0], L.door[1], y, y + 2.3]] : [],
    K.liftDoor,
    {
      lod: 0,
    },
  );
  if (!cab) {
    // The shut doors: two brushed leaves and the seam between them, in the bronze frame.
    const mid = (L.door[0] + L.door[1]) / 2;
    k.box([L.door[0], y, L.z1 + 0.3, mid - 0.01, y + 2.3, L.z1 + 0.33], K.steel, {
      collide: false,
      lod: 0,
    });
    k.box([mid + 0.01, y, L.z1 + 0.3, L.door[1], y + 2.3, L.z1 + 0.33], K.steel, {
      collide: false,
      lod: 0,
    });
  }
  if (cab) {
    // The cab: brushed panels, a mirror, the button panel by the door, a lit ceiling.
    k.box([L.x0, y + 0.01, L.z0, L.x1, y + 0.03, L.z1], K.marble, { collide: false, lod: 0 });
    k.box([L.x0, y + 0.9, L.z0, L.x0 + 0.03, y + 2.3, L.z1], K.bronze, { collide: false, lod: 0 });
    k.box([L.x1 - 0.03, y + 0.9, L.z0, L.x1, y + 0.85, L.z1], K.bronze, { collide: false, lod: 0 });
    k.box([L.x0 + 0.3, y + 0.9, L.z0, L.x1 - 0.3, y + 2.3, L.z0 + 0.02], K.glass, {
      collide: false,
      lod: 0,
    });
    // The button panel's bronze surround (lift-renderer.ts draws the lit buttons on it: 1.6 ×
    // 0.9 m, its middle 1.35 m up; lifts.ts PANEL).
    const pz = (L.z0 + L.z1) / 2;
    k.box([L.x1 - 0.03, y + 0.85, pz - 0.85, L.x1, y + 1.85, pz + 0.85], K.bronze, {
      collide: false,
      lod: 0,
    });
    k.ceiling(L.x0, y + 2.6, L.z0, L.x1, L.z1, K.light);
  }
  k.box([L.x0 - 0.3, y + 2.6, L.z0 - 0.3, L.x1, top, L.z1 + 0.3], K.wallIn, { lod: 0 });
  // The door frame (bronze) and the floor indicator over it.
  k.box([L.door[0] - 0.12, y, L.z1 + 0.3, L.door[0], y + 2.42, L.z1 + 0.34], K.bronze, {
    collide: false,
    lod: 0,
  });
  k.box([L.door[1], y, L.z1 + 0.3, L.door[1] + 0.12, y + 2.42, L.z1 + 0.34], K.bronze, {
    collide: false,
    lod: 0,
  });
  k.box(
    [L.door[0] - 0.12, y + 2.3, L.z1 + 0.3, L.door[1] + 0.12, y + 2.42, L.z1 + 0.34],
    K.bronze,
    {
      collide: false,
      lod: 0,
    },
  );
  k.box([2.5, y + 2.5, L.z1 + 0.3, 3.1, y + 2.7, L.z1 + 0.34], K.panel, { collide: false, lod: 0 });
  // Utility closet east of the shaft (the rest of the core's north end).
  wallZ(-Z + T, L.z1 + 0.3, L.x1, L.x1 + 0.3, y, top, [], K.wallIn, { lod: 0 });
  // The core's side walls (the apartments' doors), the lounge wall south of the hall.
  const side = (x0, x1) =>
    wallZ(
      -Z + T,
      CORE.z1,
      x0,
      x1,
      y,
      top,
      sideDoors ? [[APT_DOOR_Z - 0.5, APT_DOOR_Z + 0.5, y, y + 2.2]] : [],
      K.wallWarm,
      { lod: 0 },
    );
  side(CORE.x0, CORE.x0 + T);
  side(CORE.x1 - T, CORE.x1);
  if (lounge)
    wallX(
      CORE.x0 + T,
      CORE.x1 - T,
      CORE.z1 - IT,
      CORE.z1,
      y,
      top,
      [[-1.2, 1.2, y, y + 2.4]],
      K.wallWarm,
      {
        lod: 0,
      },
    );
  // Hall lights.
  for (const z of [-5.5, -2])
    k.ceiling(0.2, top - 0.02, z - 0.4, 3.6, z + 0.4, K.light, { lod: 0 });
}

/** One apartment (west: s = −1, east: s = 1) at walking level y: rooms, kitchen run, lights. */
function apartment(k, wallX, wallZ, y, s) {
  const top = y + STOREY - FL;
  const xo = s * (X - T),
    xi = s * CORE.x1;
  const lo = Math.min(xo, xi),
    hi = Math.max(xo, xi);
  // The bedroom wing (north) behind a partition at z −3 with a doorway; bedroom (outer) and
  // bathroom (inner) split at 3.6 m from the core.
  const zp = -3;
  const xd = s * 7.6; // the bedroom / bathroom wall
  const doorX = s * 10.2;
  wallX(
    lo,
    hi,
    zp - IT / 2,
    zp + IT / 2,
    y,
    top,
    [
      [
        Math.min(doorX - s * 0.5, doorX + s * 0.5),
        Math.max(doorX - s * 0.5, doorX + s * 0.5),
        y,
        y + 2.2,
      ],
    ],
    K.wallIn,
    { lod: 0 },
  );
  wallZ(
    -Z + T,
    zp - IT / 2,
    Math.min(xd, xd + s * IT),
    Math.max(xd, xd + s * IT),
    y,
    top,
    [[-6.4, -5.4, y, y + 2.2]],
    K.wallIn,
    { lod: 0 },
  );
  // Bathroom tiles.
  const bx0 = Math.min(xd, xi),
    bx1 = Math.max(xd, xi);
  k.box([bx0, y + 0.01, -Z + T, bx1, y + 0.025, zp - IT / 2], K.tile, { collide: false, lod: 0 });
  // Oak floor in the living room and bedroom.
  k.box([lo, y + 0.01, zp + IT / 2, hi, y + 0.02, Z - T], K.oak, { collide: false, lod: 0 });
  const rx0 = Math.min(xo, xd),
    rx1 = Math.max(xo, xd);
  k.box([rx0, y + 0.01, -Z + T, rx1, y + 0.02, zp - IT / 2], K.carpet, { collide: false, lod: 0 });
  // Lights: living, dining, bedroom, bathroom.
  const cx = s * 8.8;
  for (const z of [6.5, 1.5])
    k.ceiling(cx - 1.2, top - 0.02, z - 0.5, cx + 1.2, z + 0.5, K.light, { lod: 0 });
  k.ceiling(s * 10.3 - 0.8, top - 0.02, -7.3, s * 10.3 + 0.8, -6.3, K.light, { lod: 0 });
  k.ceiling(s * 6 - 0.6, top - 0.02, -7.3, s * 6 + 0.6, -6.5, K.light, { lod: 0 });
}

const panesOf = {};
/** Each storey's doorways (doors.ts ModelDoor: centre at floor level, its axis and width). */
const doorsOf = {};
const door = (x, z, along, width, h = 2.2) => ({ x, z, y0: FL, y1: FL + h, along, width });
const roomsOf = {};
const liftsOf = {};

/** A residential storey: two apartments, the sky lounge, balconies; the core. */
function floorModel() {
  const { k, wallX, wallZ } = kitFor();
  const panes = [];
  const y = FL,
    top = STOREY;
  // The slab (its well over the stair from below), ceilings under the next slab.
  slab(k, -X, X, -Z, Z, 0, FL, [STAIR_HOLE], K.stone, {});
  k.ceiling(-X + T, top - 0.01, -Z + T, X - T, Z - T, K.ceiling, { lod: 0 });
  // The next storey's slab, as this one's ceiling (collision only, the well open): a storey is
  // a room on its own (doors.ts and the loot spots look for a ceiling over a floor).
  slab(k, -X + T, X - T, -Z + T, Z - T, top - 0.04, top, [STAIR_HOLE], K.stone, { visible: false });
  skin(
    k,
    wallX,
    wallZ,
    y,
    top,
    [
      ["s", -8.6, 2.4],
      ["s", 8.6, 2.4],
      ["s", 0, 2.4],
    ],
    panes,
  );
  core(k, wallX, wallZ, y, { up: true, below: true, cab: false });
  // The sky lounge's side walls (the flats' living rooms beyond them).
  for (const x of [CORE.x0, CORE.x1 - T])
    wallZ(CORE.z1, Z - T, x, x + T, y, top, [], K.wallWarm, { lod: 0 });
  apartment(k, wallX, wallZ, y, -1);
  apartment(k, wallX, wallZ, y, 1);
  // Balconies: a slab out to z 13 with a glass balustrade, privacy fins between them.
  balconies(k, 0);
  panesOf["condo-floor"] = panes;
  // The flats' front doors (in the core's side walls), their bedroom and bathroom doors.
  doorsOf["condo-floor"] = [-1, 1].flatMap((s) => [
    door(s * (CORE.x1 - T / 2), APT_DOOR_Z, "z", 1.0),
    door(s * 10.2, -3, "x", 1.0),
    door(s * (7.6 + IT / 2), -5.9, "z", 1.0),
  ]);
  // (No stop here: the express runs from the lobby to the roof.)
  liftsOf["condo-floor"] = null;
  roomsOf["condo-floor"] = rooms(FL);
  return { k, far: farSlice(STOREY, false) };
}

function balconies(k, y0) {
  k.box([-X, y0, Z, X, y0 + FL, Z + BAL], K.stone, {});
  k.box([-X, y0 + FL, Z, X, y0 + FL + 0.02, Z + BAL], K.deck, { collide: false, lod: 0 });
  // The balustrade: a bronze rail on glass (solid: nobody steps off), the ends too.
  const yy = y0 + FL;
  k.box([-X, yy, Z + BAL - 0.06, X, yy + 1.1, Z + BAL], K.glass, { collide: false });
  k.box([-X, yy, Z + BAL - 0.06, X, yy + 1.1, Z + BAL], K.glass, { visible: false });
  k.box([-X, yy + 1.05, Z + BAL - 0.08, X, yy + 1.12, Z + BAL + 0.02], K.bronze, {
    collide: false,
  });
  for (const x of [-X, X - 0.06]) k.box([x, yy, Z, x + 0.06, yy + 1.1, Z + BAL], K.glass, {});
  // Privacy fins between the units' balconies and the lounge's.
  for (const x of [-4.5, 4.5]) k.box([x - 0.1, yy, Z, x + 0.1, yy + 3.0, Z + BAL], K.white, {});
}

/** Rooms for the furnishing (layout.ts skylineFloor): kind and box, model space. */
function rooms(y) {
  const out = [];
  for (const s of [-1, 1]) {
    const o = s * (X - T),
      c = s * CORE.x1,
      d = s * 7.6;
    const box = (a, b, z0, z1) => [Math.min(a, b), Math.max(a, b), z0, z1];
    out.push({ kind: "living", side: s, y, box: box(o, c, -3 + IT / 2, Z - T) });
    out.push({ kind: "bedroom", side: s, y, box: box(o, d, -Z + T, -3 - IT / 2) });
    out.push({ kind: "bath", side: s, y, box: box(d, c, -Z + T, -3 - IT / 2) });
  }
  out.push({ kind: "lounge", side: 0, y, box: [CORE.x0 + T, CORE.x1 - T, CORE.z1, Z - T] });
  return out;
}

/** The far LOD of one storey: the glass box, the slab band, the balconies. */
function farSlice(h, roof) {
  const far = createKit();
  far.box([-X, 0, -Z, X, h, Z], roof ? K.stone : K.glass, { lod: 2 });
  far.box([-X - 0.05, h - 0.6, -Z - 0.05, X + 0.05, h, Z + 0.05], K.dark, { lod: 2 });
  if (!roof) far.box([-X, 0, Z, X, FL + 1.1, Z + BAL], K.white, { lod: 2 });
  return far;
}

/** The ground floor: the entrance hall (south doors), the concierge, a lounge; the core. */
function lobbyModel() {
  const { k, wallX, wallZ } = kitFor();
  const panes = [];
  const y = FL,
    top = STOREY;
  k.box([-X - 0.5, 0, -Z - 0.5, X + 0.5, FL, Z + 3.5], K.stone, {});
  // Steps up onto the plinth at the entrance (0.15 m risers).
  k.box([-4, 0, Z + 3.5, 4, 0.15, Z + 4.1], K.stone, {});
  k.box([-X, y + 0.005, -Z + T, X, y + 0.02, Z - T], K.marble, { collide: false, lod: 0 });
  k.ceiling(-X + T, top - 0.01, -Z + T, X - T, Z - T, K.ceiling, { lod: 0 });
  slab(k, -X + T, X - T, -Z + T, Z - T, top - 0.04, top, [STAIR_HOLE], K.stone, { visible: false });
  skin(
    k,
    wallX,
    wallZ,
    y,
    top,
    [
      ["s", 0, 1.8],
      ["w", 4, 1.6],
      ["e", 4, 1.6],
    ],
    panes,
    { sill: 0.15 },
  );
  core(k, wallX, wallZ, y, { up: true, below: false, lounge: false, sideDoors: false });
  // The core's side walls open wide onto the hall (no apartment doors down here).
  // A canopy over the entrance, on two bronze posts.
  k.box([-5, 3.2, Z, 5, 3.45, Z + 4.5], K.dark, {});
  k.ceiling(-5, 3.19, Z, 5, Z + 4.5, K.light);
  for (const x of [-4.6, 4.6])
    k.box([x - 0.12, FL, Z + 4.1, x + 0.12, 3.2, Z + 4.35], K.bronze, {});
  // Columns in the hall.
  for (const x of [-8.5, 8.5])
    for (const z of [-4, 4]) k.box([x - 0.3, y, z - 0.3, x + 0.3, top, z + 0.3], K.white, {});
  for (const [x, z] of [
    [-8.5, 1],
    [8.5, 1],
    [0, 6],
  ])
    k.ceiling(x - 1.5, top - 0.02, z - 1.5, x + 1.5, z + 1.5, K.light, { lod: 0 });
  // The name over the entrance (a bronze band).
  k.box([-3.5, 3.5, Z + 4.45, 3.5, 3.9, Z + 4.55], K.bronze, { collide: false });
  panesOf["condo-lobby"] = panes;
  doorsOf["condo-lobby"] = [
    door(0, Z - T / 2, "x", 1.8, 2.5),
    door(-X + T / 2, 4, "z", 1.6, 2.5),
    door(X - T / 2, 4, "z", 1.6, 2.5),
  ];
  liftsOf["condo-lobby"] = { y: FL };
  roomsOf["condo-lobby"] = [
    { kind: "lobby", side: -1, y: FL, box: [-X + T, CORE.x0, -Z + T, Z - T] },
    { kind: "lobby-lounge", side: 1, y: FL, box: [CORE.x1, X - T, -Z + T, Z - T] },
    { kind: "lobby-front", side: 0, y: FL, box: [CORE.x0, CORE.x1, CORE.z1, Z - T] },
  ];
  return { k, far: farSlice(STOREY, false) };
}

/**
 * A roof: the slab (the stair well open from below, railed), the stair house and the lift's top
 * stop inside the core's roof house, the parapet. `variant` "a": the helipad; "b": the pool deck.
 */
function roofModel(variant) {
  const { k, wallX, wallZ } = kitFor();
  const y = FL;
  slab(k, -X, X, -Z, Z + BAL, 0, FL, [STAIR_HOLE], K.stone, {});
  // The core's roof house: the stair arrives in it, the lift stops in it; door south.
  const hx0 = CORE.x0,
    hx1 = CORE.x1,
    hz0 = -Z,
    hz1 = CORE.z1 - 1.2;
  const htop = y + 3.2;
  wallZ(hz0, hz1, hx0, hx0 + T, y, htop, [], K.white);
  wallZ(hz0, hz1, hx1 - T, hx1, y, htop, [], K.white);
  wallX(hx0, hx1, hz0, hz0 + T, y, htop, [], K.white);
  wallX(hx0, hx1, hz1 - T, hz1, y, htop, [[-0.8, 0.8, y, y + 2.3]], K.white);
  k.box([hx0 - 0.2, htop, hz0 - 0.2, hx1 + 0.2, htop + 0.3, hz1 + 0.2], K.dark, {});
  k.ceiling(hx0 + T, htop - 0.01, hz0 + T, hx1 - T, hz1 - T, K.ceiling, { lod: 0 });
  // The stair's rails and the lift shaft (its top stop) inside the house.
  core(k, wallX, wallZ, y, { up: false, below: true, lounge: false, sideDoors: false });
  // Parapet with a glass top (the view; solid).
  const P = 1.15;
  const ze = Z + BAL;
  wallX(-X, X, ze - 0.25, ze, y, y + 0.5, [], K.white);
  wallX(-X, X, -Z, -Z + 0.25, y, y + 0.5, [], K.white);
  wallZ(-Z, ze, -X, -X + 0.25, y, y + 0.5, [], K.white);
  wallZ(-Z, ze, X - 0.25, X, y, y + 0.5, [], K.white);
  for (const b of [
    [-X, y + 0.5, ze - 0.15, X, y + P, ze - 0.1],
    [-X, y + 0.5, -Z + 0.1, X, y + P, -Z + 0.15],
    [-X + 0.1, y + 0.5, -Z, -X + 0.15, y + P, ze],
    [X - 0.15, y + 0.5, -Z, X - 0.1, y + P, ze],
  ]) {
    k.box(b, K.glass, { collide: false });
    k.box(b, K.glass, { visible: false });
  }
  if (variant === "a") {
    // The helipad (south half of the roof), lights round it.
    const hz = 6.2;
    k.box([-7, y + 0.01, hz - 5.6, 7, y + 0.03, hz + 7], K.helipad, { collide: false });
    for (const [a, b, c, d] of [
      [-6.6, 6.6, hz - 5.2, hz - 4.9],
      [-6.6, 6.6, hz + 6.3, hz + 6.6],
      [-6.6, -6.3, hz - 5.2, hz + 6.6],
      [6.3, 6.6, hz - 5.2, hz + 6.6],
      [-2.2, -1.2, hz - 2, hz + 3.6],
      [1.2, 2.2, hz - 2, hz + 3.6],
      [-1.2, 1.2, hz + 0.3, hz + 1.3],
    ])
      k.box(
        [a, y + 0.03, c, b, y + 0.05, d],
        a < -2.3 || b > 2.3 || c < hz - 4 || d > hz + 6 ? K.yellow : K.white,
        {
          collide: false,
        },
      );
    // Plant north-west and north-east (cover).
    for (const x of [-9.5, 9.5]) k.box([x - 2, y, -9.5, x + 2, y + 1.7, -6.5], K.steel, {});
  } else {
    // The pool deck: timber, a pool along the south (water drawn, 0.5 m deep), planters.
    k.box([-X + 0.25, y + 0.01, -Z + 0.25, X - 0.25, y + 0.03, ze - 0.25], K.deck, {
      collide: false,
    });
    const p = [-9, 9, 4.5, 11.5];
    // The pool's rim stands 0.4 m proud; its water surface is the walkable floor at the rim's
    // height minus 0.35 (you wade in).
    k.box([p[0] - 0.4, y, p[2] - 0.4, p[1] + 0.4, y + 0.4, p[2]], K.white, {});
    k.box([p[0] - 0.4, y, p[3], p[1] + 0.4, y + 0.4, p[3] + 0.4], K.white, {});
    k.box([p[0] - 0.4, y, p[2], p[0], y + 0.4, p[3]], K.white, {});
    k.box([p[1], y, p[2], p[1] + 0.4, y + 0.4, p[3]], K.white, {});
    k.box([p[0], y + 0.33, p[2], p[1], y + 0.35, p[3]], K.pool, { collide: false });
    for (const x of [-11, 11]) k.box([x - 0.8, y, -9.8, x + 0.8, y + 0.7, -5], K.grass, {});
  }
  // The crown: white fins up from the parapet's corners, a ring between them (the towers'
  // silhouette from across the island).
  const crown = variant === "a" ? 5.5 : 3.5;
  for (const [cx, cz] of [
    [-X, -Z],
    [X - 0.5, -Z],
    [-X, ze - 0.5],
    [X - 0.5, ze - 0.5],
  ])
    k.box([cx, y, cz, cx + 0.5, y + crown, cz + 0.5], K.white, {});
  k.box([-X, y + crown - 0.4, -Z, X, y + crown, -Z + 0.3], K.white, { collide: false });
  k.box([-X, y + crown - 0.4, ze - 0.3, X, y + crown, ze], K.white, { collide: false });
  k.box([-X, y + crown - 0.4, -Z, -X + 0.3, y + crown, ze], K.white, { collide: false });
  k.box([X - 0.3, y + crown - 0.4, -Z, X, y + crown, ze], K.white, { collide: false });
  // The roof slab's edge band.
  k.box([-X - 0.08, 0, -Z - 0.08, X + 0.08, FL, ze + 0.08], K.dark, { collide: false });
  liftsOf[`condo-roof-${variant}`] = { y: FL };
  doorsOf[`condo-roof-${variant}`] = [door(0, hz1 - T / 2, "x", 1.6, 2.3)];
  roomsOf[`condo-roof-${variant}`] = [
    {
      kind: variant === "a" ? "helipad" : "pool-deck",
      side: 0,
      y: FL,
      box: [-X + 0.5, X - 0.5, CORE.z1, ze - 0.5],
    },
  ];
  const far = createKit();
  far.box([-X, 0, -Z, X, FL + 1.15, ze], K.stone, { lod: 2 });
  far.box([hx0, FL, hz0, hx1, htop + 0.3, hz1], K.white, { lod: 2 });
  for (const [cx, cz] of [
    [-X, -Z],
    [X - 0.5, -Z],
    [-X, ze - 0.5],
    [X - 0.5, ze - 0.5],
  ])
    far.box([cx, FL, cz, cx + 0.5, FL + crown, cz + 0.5], K.white, { lod: 2 });
  return { k, far };
}

/**
 * The clubhouse: one storey, 30 × 16 m: the gym (west), the lounge and bar (east), glass to the
 * pool terrace on the south; the pool beside it.
 */
function clubModel() {
  const { k, wallX, wallZ } = kitFor();
  const W = 15,
    D = 8,
    H = 3.6;
  const y = FL;
  k.box([-W - 0.5, 0, -D - 0.5, W + 0.5, FL, D + 12], K.stone, {});
  k.box([-W, y + 0.005, -D + T, W, y + 0.02, D - T], K.oak, { collide: false, lod: 0 });
  const panes = [];
  const front = [];
  for (let x = -W + 0.2; x + 2.9 <= W - 0.2; x += 3) front.push([x + 0.15, x + 2.75]);
  const holesS = front
    .filter(([a, b]) => !(b > -1.5 && a < 1.5))
    .map(([a, b]) => [a, b, y + 0.15, y + 3.2]);
  holesS.push([-1, 1, y, y + 2.4]);
  holesS.sort((p, q) => p[0] - q[0]);
  for (const [a, b, lo, hi] of holesS)
    if (hi - lo > 2.6)
      panes.push({ x0: a, x1: b, z0: D - T / 2 - 0.04, z1: D - T / 2 + 0.04, y0: lo, y1: hi });
  wallX(-W, W, D - T, D, y, y + H, holesS, K.white);
  wallX(
    -W,
    W,
    -D,
    -D + T,
    y,
    y + H,
    [
      [-6, -4.4, y, y + 2.3],
      [9, 10.6, y, y + 2.3],
    ],
    K.white,
  );
  wallZ(-D + T, D - T, -W, -W + T, y, y + H, [[-1, 1, y, y + 2.3]], K.white);
  wallZ(-D + T, D - T, W - T, W, y, y + H, [[-1, 1, y, y + 2.3]], K.white);
  // The partition between the gym and the lounge, a wide opening in it.
  // (It stops 3.5 m short of the south front: the entrance from the terrace opens on both.)
  wallZ(-D + T, D - 3.5, -0.08, 0.08, y, y + H, [[-2, 1.5, y, y + 2.6]], K.wallIn, { lod: 0 });
  k.box([-W - 0.6, y + H, -D - 0.6, W + 0.6, y + H + 0.4, D + 2.6], K.dark, {});
  k.ceiling(-W + T, y + H - 0.01, -D + T, W - T, D - T, K.ceiling, { lod: 0 });
  k.ceiling(-W, y + H - 0.01, D, W, D + 2.6, K.ceiling);
  for (const x of [-10, -5, 5, 10])
    k.ceiling(x - 1.2, y + H - 0.03, -1, x + 1.2, 1, K.light, { lod: 0 });
  // The pool on the terrace (water drawn), its rim.
  const p = [-10, 10, 4 + D, 10 + D];
  k.box([p[0] - 0.5, y, p[2] - 0.5, p[1] + 0.5, y + 0.3, p[2]], K.white, {});
  k.box([p[0] - 0.5, y, p[3], p[1] + 0.5, y + 0.3, p[3] + 0.5], K.white, {});
  k.box([p[0] - 0.5, y, p[2], p[0], y + 0.3, p[3]], K.white, {});
  k.box([p[1], y, p[2], p[1] + 0.5, y + 0.3, p[3]], K.white, {});
  k.box([p[0], y + 0.25, p[2], p[1], y + 0.27, p[3]], K.pool, { collide: false });
  k.box([-W, y + 0.005, D, W, y + 0.02, D + 11.5], K.deck, { collide: false });
  panesOf["condo-club"] = panes;
  doorsOf["condo-club"] = [
    door(0, D - T / 2, "x", 2.0, 2.4),
    door(-5.2, -D + T / 2, "x", 1.6, 2.3),
    door(9.8, -D + T / 2, "x", 1.6, 2.3),
    door(-W + T / 2, 0, "z", 2.0, 2.3),
    door(W - T / 2, 0, "z", 2.0, 2.3),
  ];
  roomsOf["condo-club"] = [
    { kind: "gym", side: -1, y: FL, box: [-W + T, -0.1, -D + T, D - T] },
    { kind: "club-lounge", side: 1, y: FL, box: [0.1, W - T, -D + T, D - T] },
    { kind: "terrace", side: 0, y: FL, box: [-W, W, D + 0.5, D + 11.5] },
  ];
  const far = createKit();
  far.box([-W, 0, -D, W, y + H + 0.4, D], K.glass, { lod: 2 });
  far.box([-W - 0.5, 0, D, W + 0.5, FL + 0.3, D + 12], K.stone, { lod: 2 });
  return { k, far, size: [2 * W + 1.2, +(y + H + 0.4).toFixed(2), 2 * D + 12.5] };
}

const plan = { storey: STOREY, floor: FL, stair: STAIR, cab: LIFT_CAB, models: {} };
const build = [
  ["condo-lobby", lobbyModel, [2 * X + 1, STOREY, 2 * Z + 4.6], "Skyline Residences: tower lobby"],
  [
    "condo-floor",
    floorModel,
    [2 * X, STOREY, 2 * Z + BAL],
    "Skyline Residences: residential floor",
  ],
  [
    "condo-roof-a",
    () => roofModel("a"),
    [2 * X, 5.8, 2 * Z + BAL],
    "Skyline Residences: roof and helipad",
  ],
  [
    "condo-roof-b",
    () => roofModel("b"),
    [2 * X, 3.8, 2 * Z + BAL],
    "Skyline Residences: roof pool deck",
  ],
  ["condo-club", clubModel, null, "Skyline Residences: clubhouse"],
];
for (const [id, fn, size0, title] of build) {
  const { k, far, size } = fn();
  await publish(id, k, far, {
    tag: TAG,
    title,
    source: "art/blender/br/build_condo.mjs",
    use: "Skyline Residences (2026-11-13): the luxury towers between the hospital and the quarry",
    class: "building",
    ring: "building",
    glass: true,
    size: size ?? size0,
  });
  if (doorsOf[id])
    fs.writeFileSync(`art/br/procedural/${id}.entrances.json`, JSON.stringify(doorsOf[id]) + "\n");
  plan.models[id] = {
    rooms: roomsOf[id] ?? [],
    panes: (panesOf[id] ?? []).map((p) => Object.values(p).map((v) => +v.toFixed(3))),
    lift: liftsOf[id] ?? null,
  };
}
fs.writeFileSync("src/lib/fps/br/skyline-plan.json", JSON.stringify(plan) + "\n");
console.log(
  Object.entries(plan.models)
    .map(([id, m]) => `${id}: ${m.rooms.length} rooms, ${m.panes.length} panes`)
    .join("; "),
);
