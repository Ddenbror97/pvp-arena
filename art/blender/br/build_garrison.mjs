/**
 * The Southern Military Base's new buildings and its wall (owner, 2026-11-23: "southern military
 * base. road at the airfield going incorrectly, there is some metalic mini wall that the road
 * cross. also its way to much dead space areas. build new military buildings and maybe a wall
 * around the military base", "fun military buildings, bunkers maybe aswell? enterble multible
 * floros you name it").
 *
 *  - mb-ops-tower: the air operations tower, five storeys, its top floor glazed all round with
 *    a catwalk outside it, a stair to every floor and the roof (the base's sniper perch);
 *  - mb-command-bunker: the hardened command bunker, two storeys behind 60 cm walls with gun
 *    slits, rooms on both floors, sandbags on the roof, and an earth berm against each end that
 *    you can run up on to the roof;
 *  - mb-pillbox: a concrete pillbox at the gates, slits on every side, a stair up to its
 *    sandbagged roof;
 *  - mb-barracks-3s: a three-storey barrack block, rooms on every floor, a roof terrace;
 *  - mb-armory: the armoury, two storeys of corrugated steel over a concrete plinth, a vehicle
 *    gateway, the upper floor and the roof up a stair;
 *  - mb-wall: 4 m of the perimeter wall, 3.6 m of precast concrete with barbed wire along its
 *    top, in place of the knee-high hesco baskets.
 *
 *   node art/blender/br/build_garrison.mjs [id ...]
 *
 * Writes public/fps/br/models/<id>.<TAG>.lod{0,1,2}.glb (TAG=garrison-v1 unless set), the
 * models.json entry, art/br/procedural/<id>.boxes.json and <id>.entrances.json, and the
 * footprints and door aprons in src/lib/fps/br/location-buildings.json.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { makeBuilding } from "./building-kit.mjs";
import { createTexturedKit, publishTextured } from "./textured-kit.mjs";

const TAG = process.env.TAG ?? "garrison-v1";
/** Flight length for a storey of `h` (risers ≤ 0.19, treads 0.27). */
const L = (h) => Math.ceil(h / 0.19) * 0.27;
const r2 = (v) => +v.toFixed(2);

// The base's colours: sand-coloured and grey cast concrete (the "yard" texture: smooth panels
// with their joints), olive drab, khaki bags and earth (the mottled "floor" texture).
const SAND = { m: "yard", tint: [1.0, 0.92, 0.76] };
const GREY = { m: "yard", tint: [0.86, 0.86, 0.83] };
const OD = [0.3, 0.34, 0.22];
const OD_STEEL = { m: "metal", tint: [0.46, 0.52, 0.36] };
const BAG = [1.0, 0.94, 0.72];
const EARTH = [0.8, 0.8, 0.56];
const STEEL = [0.24, 0.25, 0.24];

const all =
  (...fs_) =>
  (ctx) =>
    fs_.forEach((f) => f && f(ctx));

/** A row of sandbags from (x0, z0) to (x1, z1) on y, `h` high, `t` thick (two courses drawn). */
const bags = (k, far, x0, z0, x1, z1, y, h = 0.75, t = 0.6) => {
  const alongX = Math.abs(x1 - x0) >= Math.abs(z1 - z0);
  const box = (a0, a1, yy0, yy1, inset) =>
    alongX
      ? [
          Math.min(x0, x1) + inset,
          yy0,
          z0 - t / 2 + inset,
          Math.max(x0, x1) - inset,
          yy1,
          z0 + t / 2 - inset,
        ]
      : [
          x0 - t / 2 + inset,
          yy0,
          Math.min(z0, z1) + inset,
          x0 + t / 2 - inset,
          yy1,
          Math.max(z0, z1) - inset,
        ];
  // Two courses, the upper set back a little: reads as stacked bags, solid as one.
  k.box(box(0, 0, y, y + h * 0.55, 0), "floor", BAG, { collide: false });
  k.box(
    box(0, 0, y + h * 0.55, y + h, 0.06),
    "floor",
    BAG.map((v) => v * 0.92),
    {
      collide: false,
    },
  );
  // One collision box for the row.
  k.box(box(0, 0, y, y + h, 0), "floor", BAG, { visible: false });
  far.box(box(0, 0, y, y + h, 0), "floor", BAG, { collide: false });
};

/**
 * An earth berm against a wall: a slope from the ground at `a0` up to `y1` at `a1` along `axis`,
 * `c0..c1` across, drawn as a sloped top and its two flanks; walkable: steps of at most 0.3 m
 * (the player climbs 0.35) under the slope, not drawn.
 */
const berm = (k, far, axis, a0, a1, c0, c1, y1, tint = EARTH) => {
  const P = (a, y, c) => (axis === "x" ? [a, y, c] : [c, y, a]);
  const up = axis === "x" ? [0, 1, 0] : [0, 1, 0];
  k.quad(P(a0, 0, c0), P(a0, 0, c1), P(a1, y1, c1), P(a1, y1, c0), "floor", tint, {
    n: up,
    facing: [0, 1, 0],
  });
  far.quad(P(a0, 0, c0), P(a0, 0, c1), P(a1, y1, c1), P(a1, y1, c0), "floor", tint, {
    n: up,
    facing: [0, 1, 0],
  });
  // The flanks: triangles (a quad with two corners the same), facing out.
  for (const [c, sgn] of [
    [c0, -1],
    [c1, 1],
  ]) {
    const n = axis === "x" ? [0, 0, sgn] : [sgn, 0, 0];
    k.quad(
      P(a0, 0, c),
      P(a1, 0, c),
      P(a1, y1, c),
      P(a1, y1, c),
      "floor",
      tint.map((v) => v * 0.85),
      {
        n,
        facing: n,
      },
    );
    far.quad(P(a0, 0, c), P(a1, 0, c), P(a1, y1, c), P(a1, y1, c), "floor", tint, {
      n,
      facing: n,
    });
  }
  const steps = Math.ceil(y1 / 0.3);
  for (let s = 0; s < steps; s++) {
    const top = ((s + 1) * y1) / steps;
    const pa = a0 + ((a1 - a0) * s) / steps,
      pb = a1;
    // Each step a box from its edge to the wall, at its height (the slope's surface rides over
    // the steps' noses, at most 0.3 m above any tread).
    const b =
      axis === "x"
        ? [Math.min(pa, pb), 0, c0, Math.max(pa, pb), top - (y1 / steps) * 0.5, c1]
        : [c0, 0, Math.min(pa, pb), c1, top - (y1 / steps) * 0.5, Math.max(pa, pb)];
    k.box(b, "floor", tint, { visible: false });
  }
};

/** Railings round a rectangle at y (drawn only, plus an invisible 1.1 m collision rail). */
const rails = (k, x0, z0, x1, z1, y, { gap = null } = {}) => {
  const post = 0.06,
    h = 1.05;
  const edge = (a, b, alongX, c) => {
    k.beam(
      alongX ? [a, y + h, c] : [c, y + h, a],
      alongX ? [b, y + h, c] : [c, y + h, b],
      0.06,
      0.06,
      "paint",
      STEEL,
      { lod: 0 },
    );
    k.beam(
      alongX ? [a, y + h / 2, c] : [c, y + h / 2, a],
      alongX ? [b, y + h / 2, c] : [c, y + h / 2, b],
      0.04,
      0.04,
      "paint",
      STEEL,
      { lod: 0 },
    );
    for (let p = a; p <= b + 1e-3; p += 1.5)
      k.box(
        alongX
          ? [p - post / 2, y, c - post / 2, p + post / 2, y + h, c + post / 2]
          : [c - post / 2, y, p - post / 2, c + post / 2, y + h, p + post / 2],
        "paint",
        STEEL,
        { collide: false, lod: 0 },
      );
    k.box(
      alongX ? [a, y, c - 0.05, b, y + 1.1, c + 0.05] : [c - 0.05, y, a, c + 0.05, y + 1.1, b],
      "paint",
      STEEL,
      { visible: false },
    );
  };
  edge(x0, x1, true, z0);
  edge(x0, x1, true, z1);
  edge(z0, z1, false, x0);
  if (gap) {
    edge(z0, gap[0], false, x1);
    edge(gap[1], z1, false, x1);
  } else edge(z0, z1, false, x1);
};

const B = {
  // ---------------------------------------------------------------- the operations tower
  "mb-ops-tower": {
    title: "Air operations tower",
    // (The catwalk stands 1.2 m out of the walls.)
    grow: [2.4, 2.4],
    use: "Southern Military Base: a five-storey operations tower over the flight line, its top floor glazed all round with a catwalk outside, a stair to every floor and the roof",
    ring: "building",
    spec: (() => {
      const w = 10,
        d = 10,
        fh = 3.4,
        n = 5;
      const X = w / 2,
        Z = d / 2;
      const c1 = r2(X - 0.25),
        c0 = r2(c1 - 1.2);
      const a0 = r2(Z - 1.4);
      // The glazed top floor: a ribbon on every side.
      const ribbon = ["front", "back", "left", "right"].map((side) => ({
        side,
        floor: n - 1,
        a: side === "front" || side === "back" ? -3.9 : -3.6,
        b: side === "front" || side === "back" ? 3.9 : 3.6,
        y0: 0.85,
        y1: 2.85,
      }));
      return {
        w,
        d,
        floors: n,
        midShell: true,
        fh,
        base: 0.2,
        wall: SAND,
        trim: OD,
        bands: true,
        floorM: "floor",
        floorTint: [0.64, 0.64, 0.6],
        doors: [
          { side: "front", at: -2.4 },
          { side: "back", at: -2.4 },
        ],
        windows: { step: 2.6, w: 1.0, sill: 1.0, head: 2.1, floors: [0, 1, 2, 3] },
        extraHoles: ribbon,
        glassTint: [0.22, 0.3, 0.34],
        stair: { axis: "z", a0, a1: r2(a0 - L(fh)), c0, c1 },
        roofAccess: true,
        roof: { type: "flat", parapet: 1.1, coping: OD },
        extra: ({ k, far, Y, top }) => {
          // The catwalk round the glazed floor: a steel deck 1.2 m wide with a rail.
          const y = Y(n - 1),
            o = 1.2;
          for (const b of [
            [-X - o, y - 0.12, Z, X + o, y, Z + o],
            [-X - o, y - 0.12, -Z - o, X + o, y, -Z],
            [-X - o, y - 0.12, -Z, -X, y, Z],
            [X, y - 0.12, -Z, X + o, y, Z],
          ])
            k.box(b, "metal", [0.4, 0.42, 0.4]);
          rails(k, -X - o + 0.05, -Z - o + 0.05, X + o - 0.05, Z + o - 0.05, y);
          // An overhang over the glazing (its shade line) and the mast on the roof.
          k.box([-X - 0.6, y + fh - 0.3, -Z - 0.6, X + 0.6, y + fh - 0.05, Z + 0.6], "paint", OD, {
            collide: false,
          });
          const mx = -X + 1.5,
            mz = -Z + 1.5;
          k.box(
            [mx - 0.12, top, mz - 0.12, mx + 0.12, top + 9, mz + 0.12],
            "paint",
            [0.85, 0.2, 0.15],
            { collide: false },
          );
          for (let h = 2; h < 9; h += 2.2)
            k.box(
              [mx - 0.6, top + h, mz - 0.03, mx + 0.6, top + h + 0.06, mz + 0.03],
              "paint",
              STEEL,
              { collide: false, lod: 0 },
            );
          // A radar on a plinth on the roof.
          k.box([1.2, top, -2.2, 3.2, top + 0.8, -0.2], "yard", GREY.tint);
          k.box([0.8, top + 1.4, -1.25, 3.6, top + 2.4, -1.15], "paint", [0.85, 0.86, 0.84], {
            collide: false,
          });
          k.box([2.1, top + 0.8, -1.3, 2.3, top + 1.4, -1.1], "paint", STEEL, { collide: false });
          far.box(
            [mx - 0.2, top, mz - 0.2, mx + 0.2, top + 9, mz + 0.2],
            "paint",
            [0.85, 0.2, 0.15],
            { collide: false },
          );
        },
      };
    })(),
  },
  // ---------------------------------------------------------------- the command bunker
  "mb-command-bunker": {
    title: "Command bunker",
    // (The berms run 15 m out from each end, the blast walls 2.6 m from the front.)
    grow: [30, 2.6],
    use: "Southern Military Base: a hardened two-storey command bunker, 60 cm walls with gun slits, rooms on both floors, sandbags on the roof, earth berms up to the roof at both ends",
    ring: "building",
    spec: (() => {
      const w = 26,
        d = 16,
        fh = 3.2,
        n = 2,
        wt = 0.6;
      const X = w / 2,
        Z = d / 2;
      const zIn = r2(-Z + wt);
      return {
        w,
        d,
        midShell: true,
        floors: n,
        fh,
        wt,
        base: 0.2,
        wall: GREY,
        trim: OD,
        floorM: "floor",
        floorTint: [0.55, 0.56, 0.52],
        ceilingTint: [0.78, 0.78, 0.74],
        doors: [
          { side: "front", at: -9 },
          { side: "front", at: 9 },
          { side: "back", at: -9.5 },
        ],
        // Gun slits along the long sides (the ends are under the berms).
        // (Open: firing ports, no glass.)
        windows: {
          step: 3.0,
          w: 0.8,
          sill: 1.25,
          head: 1.75,
          sides: ["front", "back"],
          glass: false,
        },
        stair: { axis: "x", a0: 3.6, a1: r2(3.6 - L(fh)), c0: zIn, c1: r2(zIn + 1.2) },
        roofAccess: true,
        parts: [
          { axis: "z", at: -5, from: zIn, to: r2(Z - wt), doors: [2.5], floors: [0, 1] },
          { axis: "z", at: 6.2, from: zIn, to: r2(Z - wt), doors: [-2.5], floors: [0, 1] },
        ],
        roof: { type: "flat", parapet: 0.3, coping: GREY.tint },
        extra: ({ k, far, top }) => {
          // Sandbag positions round the roof's long edges, gaps to shoot through.
          for (const z of [Z - 0.45, -Z + 0.45])
            for (const [x0, x1] of [
              [-X + 0.6, -6.5],
              [-4.5, 1],
              [3, 8.5],
              [10.5, X - 0.6],
            ])
              bags(k, far, x0, z, x1, z, top + 0.3, 0.7);
          // The berms: earth banked against both ends, up to the parapet's top (6.6 + 0.3 m).
          const reach = 15;
          berm(k, far, "x", -X - reach, -X, -Z + 1.2, Z - 1.2, top + 0.3);
          berm(k, far, "x", X + reach, X, -Z + 1.2, Z - 1.2, top + 0.3);
          // A blast wall before each front door (an L of concrete) and a vent stack on the roof.
          for (const x of [-9, 9]) {
            k.box([x - 2.2, 0, Z + 2.2, x + 2.2, 2.4, Z + 2.6], "yard", GREY.tint);
            far.box([x - 2.2, 0, Z + 2.2, x + 2.2, 2.4, Z + 2.6], "yard", GREY.tint, {
              collide: false,
            });
          }
          k.box([-1.2, top, 3.4, -0.2, top + 1.6, 4.4], "yard", GREY.tint);
          k.box([-1.35, top + 1.6, 3.25, -0.05, top + 1.75, 4.55], "paint", STEEL, {
            collide: false,
          });
        },
      };
    })(),
  },
  // ---------------------------------------------------------------- the pillbox
  "mb-pillbox": {
    title: "Pillbox",
    use: "Southern Military Base: a concrete pillbox at the gates, gun slits on every side, a stair to its sandbagged roof",
    ring: "outbuilding",
    spec: (() => {
      const w = 7,
        d = 7,
        fh = 2.8,
        wt = 0.5;
      const X = w / 2,
        Z = d / 2;
      const c1 = r2(X - wt),
        c0 = r2(c1 - 1.1);
      // (A metre of floor at the flight's foot: its sides are railed, so it is climbed from its
      // end, not stepped on to from beside it.)
      const a0 = r2(Z - wt - 1.0);
      return {
        w,
        d,
        floors: 1,
        fh,
        wt,
        base: 0.2,
        wall: GREY,
        trim: OD,
        floorM: "floor",
        floorTint: [0.52, 0.52, 0.5],
        ceilingTint: [0.7, 0.7, 0.66],
        doors: [{ side: "back", at: -1.6 }],
        windows: { step: 2.0, w: 0.9, sill: 1.2, head: 1.6, glass: false },
        stair: { axis: "z", a0, a1: r2(a0 - L(fh)), c0, c1 },
        roofAccess: true,
        roof: { type: "flat", parapet: 0.2, coping: GREY.tint },
        extra: ({ k, far, top }) => {
          // Bags round the roof (the stair house stands at the right-hand back corner).
          bags(k, far, -X + 0.35, Z - 0.35, X - 0.35, Z - 0.35, top + 0.2, 0.75, 0.55);
          bags(k, far, -X + 0.35, -Z + 0.35, -0.5, -Z + 0.35, top + 0.2, 0.75, 0.55);
          bags(k, far, -X + 0.35, -Z + 0.35, -X + 0.35, Z - 0.35, top + 0.2, 0.75, 0.55);
        },
      };
    })(),
  },
  // ---------------------------------------------------------------- the barrack block
  "mb-barracks-3s": {
    title: "Barrack block (three storeys)",
    use: "Southern Military Base: a three-storey barrack block, rooms on every floor, a stair to each and on to the roof terrace",
    ring: "building",
    spec: (() => {
      const w = 32,
        d = 11,
        fh = 3.2;
      const X = w / 2,
        Z = d / 2;
      const zIn = r2(-Z + 0.25);
      return {
        palette: 9,
        w,
        d,
        floors: 3,
        midShell: true,
        fh,
        wall: SAND,
        trim: OD,
        bands: true,
        plinthTint: [0.5, 0.48, 0.42],
        doors: [
          { side: "front", at: -10 },
          { side: "front", at: 10 },
          { side: "back", at: -12 },
          { side: "left", at: 0 },
          { side: "right", at: 0 },
        ],
        windows: { step: 2.8, w: 1.3, sill: 0.9, head: 2.2 },
        stair: { axis: "x", a0: 2.4, a1: r2(2.4 - L(fh)), c0: zIn, c1: r2(zIn + 1.2) },
        roofAccess: true,
        parts: [
          { axis: "z", at: -6, from: zIn, to: r2(Z - 0.25), doors: [2], floors: [0, 1, 2] },
          { axis: "z", at: 6, from: zIn, to: r2(Z - 0.25), doors: [2], floors: [0, 1, 2] },
        ],
        roof: { type: "flat", parapet: 1.0, coping: OD },
        extra: ({ k, far, top }) => {
          // The roof terrace: sandbag positions at the corners, water tanks on stands.
          bags(k, far, -X + 0.6, Z - 0.6, -X + 5.6, Z - 0.6, top + 1.0, 0.5);
          bags(k, far, X - 5.6, -Z + 0.6, X - 0.6, -Z + 0.6, top + 1.0, 0.5);
          for (const x of [-11, 11]) {
            k.box([x - 1.2, top, -1.6, x + 1.2, top + 0.6, 0.8], "metal", STEEL);
            k.box([x - 1.1, top + 0.6, -1.5, x + 1.1, top + 2.0, 0.7], "paint", [0.36, 0.4, 0.3]);
          }
        },
      };
    })(),
  },
  // ---------------------------------------------------------------- the armoury
  "mb-armory": {
    title: "Armoury",
    use: "Southern Military Base: a two-storey armoury of corrugated steel on a concrete plinth, a vehicle gateway, the upper floor and the roof up a stair",
    ring: "building",
    spec: (() => {
      const w = 22,
        d = 14,
        fh = 3.8,
        wt = 0.3;
      const X = w / 2,
        Z = d / 2;
      const c0 = r2(-X + wt),
        c1 = r2(c0 + 1.2);
      const a0 = r2(-Z + 1.4);
      return {
        w,
        d,
        midShell: true,
        floors: 2,
        fh,
        wt,
        base: 0.25,
        plinthOut: 0.15,
        wall: OD_STEEL,
        trim: [0.86, 0.72, 0.1],
        floorM: "yard",
        floorTint: [0.6, 0.6, 0.58],
        doors: [
          { side: "front", at: -3, w: 4.2, h: 3.3 },
          { side: "front", at: 4.5 },
          { side: "back", at: 6 },
          { side: "right", at: 3 },
        ],
        // A high strip of windows (the racks stand under them).
        windows: { step: 3.4, w: 1.8, sill: 2.1, head: 3.0 },
        stair: { axis: "z", a0, a1: r2(a0 + L(fh)), c0, c1 },
        roofAccess: true,
        roof: { type: "flat", parapet: 0.9, coping: [0.86, 0.72, 0.1] },
        extra: ({ k, far, Y, top }) => {
          // Yellow-and-black hazard bands either side of the gateway, a sign board over it.
          for (const x of [-5.35, -0.65])
            k.box([x - 0.15, 0.25, Z, x + 0.15, 3.55, Z + 0.06], "paint", [0.9, 0.74, 0.08], {
              collide: false,
            });
          k.box([-6, Y(1) - 0.3, Z, 0, Y(1) + 0.6, Z + 0.08], "paint", [0.16, 0.2, 0.14], {
            collide: false,
          });
          k.box(
            [-5.6, Y(1) - 0.05, Z + 0.08, -0.4, Y(1) + 0.35, Z + 0.1],
            "paint",
            [0.92, 0.9, 0.82],
            { collide: false, lod: 0 },
          );
          // A loading ramp before the gateway.
          k.box([-5.2, 0, Z, -0.8, 0.12, Z + 2.5], "yard", GREY.tint);
          // Vents along the roof.
          for (const x of [-6, 0, 6])
            k.box([x - 0.7, top, -1, x + 0.7, top + 0.9, 1], "metal", STEEL);
          far.box([-6.7, top, -1, 6.7, top + 0.9, 1], "metal", STEEL, { collide: false });
        },
      };
    })(),
  },
};

// ---------------------------------------------------------------- the perimeter wall
/**
 * 4 m of the perimeter wall along x: a precast concrete T-wall 3.6 m high on its footing, an
 * olive band near its top, and a barbed-wire outrigger along the crest (posts every 2 m, three
 * strands, drawn only and near only).
 */
function wallSection() {
  const k = createTexturedKit();
  const far = createTexturedKit();
  const LEN = 4,
    H = 3.6,
    T = 0.45;
  const X = LEN / 2;
  k.box([-X, 0, -0.9, X, 0.35, 0.9], "yard", GREY.tint, { skip: ["bottom"] });
  // (Its ends drawn: at a gate the wall ends; where two sections meet, the two ends lie
  // face to face inside the wall.)
  k.box([-X, 0.35, -T / 2, X, H, T / 2], "yard", [0.94, 0.92, 0.86]);
  // The joints between panels (every 2 m: two panels a section) and the olive band.
  for (const x of [-X, 0])
    for (const z of [T / 2, -T / 2])
      k.box([x - 0.02, 0.35, z - 0.012, x + 0.02, H, z + 0.012], "paint", [0.42, 0.42, 0.4], {
        collide: false,
        lod: 0,
      });
  for (const z of [T / 2, -T / 2])
    k.box([-X, H - 0.75, z - 0.01, X, H - 0.45, z + 0.01], "paint", OD, { collide: false });
  for (const x of [-1.5, 0.5]) {
    k.beam([x, H, 0], [x, H + 0.55, 0.32], 0.05, 0.05, "paint", STEEL, { lod: 0 });
    k.beam([x, H, 0], [x, H + 0.55, -0.32], 0.05, 0.05, "paint", STEEL, { lod: 0 });
  }
  for (const [y, z] of [
    [H + 0.18, 0.11],
    [H + 0.36, 0.21],
    [H + 0.54, 0.31],
    [H + 0.18, -0.11],
    [H + 0.36, -0.21],
    [H + 0.54, -0.31],
  ])
    k.beam([-X, y, z], [X, y, z], 0.02, 0.02, "paint", STEEL, { lod: 0 });
  // (Collision up to the wire: nobody steps over it.)
  k.box([-X, H, -T / 2, X, H + 0.5, T / 2], "yard", GREY.tint, { visible: false });
  far.box([-X, 0, -T / 2, X, H, T / 2], "yard", [0.94, 0.92, 0.86], {
    collide: false,
    skip: ["x0", "x1", "bottom"],
  });
  return {
    id: "mb-wall",
    k,
    far,
    entry: {
      title: "Perimeter wall (4 m)",
      use: "Southern Military Base: 4 m of the perimeter wall, 3.6 m of precast concrete with barbed wire along its top",
      class: "structure",
      ring: "structure",
      texture: 256,
      size: [LEN, H + 0.6, 1.8],
    },
    foot: [LEN, 1.8],
  };
}

const only = process.argv.slice(2);
const PLAN = "src/lib/fps/br/location-buildings.json";
const plan = JSON.parse(fs.readFileSync(PLAN, "utf8"));
for (const [id, def] of Object.entries(B)) {
  if (only.length && !only.includes(id)) continue;
  const b = makeBuilding(def.spec);
  const g = def.grow ?? [0, 0];
  const size = [r2(b.size[0] + g[0]), b.size[1], r2(b.size[2] + g[1])];
  await publishTextured(id, b.k, b.far, {
    tag: TAG,
    title: def.title,
    source: "art/blender/br/build_garrison.mjs",
    use: `${def.use} (procedural, 2026-11-23)`,
    class: "building",
    ring: def.ring ?? "dwelling",
    texture: 256,
    size,
  });
  fs.writeFileSync(`art/br/procedural/${id}.entrances.json`, JSON.stringify(b.entrances) + "\n");
  const S = def.spec;
  const aprons = (S.doors ?? []).map((q) => {
    const out = (q.w ?? 1.3) > 1.4 ? 3 : 1.2;
    return q.side === "front"
      ? [r2(q.at), r2(S.d / 2 + out)]
      : q.side === "back"
        ? [r2(q.at), r2(-S.d / 2 - out)]
        : q.side === "left"
          ? [r2(-S.w / 2 - out), r2(q.at)]
          : [r2(S.w / 2 + out), r2(q.at)];
  });
  plan[id] = { foot: [size[0], size[2]], aprons };
}
for (const c of [wallSection()]) {
  if (only.length && !only.includes(c.id)) continue;
  await publishTextured(c.id, c.k, c.far, {
    tag: TAG,
    source: "art/blender/br/build_garrison.mjs",
    ...c.entry,
    use: `${c.entry.use} (procedural, 2026-11-23)`,
  });
  fs.writeFileSync(`art/br/procedural/${c.id}.entrances.json`, "[]\n");
  plan[c.id] = { foot: c.foot, aprons: [] };
}
fs.writeFileSync(
  PLAN,
  "{\n" +
    Object.entries(plan)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([id, v]) => ` ${JSON.stringify(id)}: ${JSON.stringify(v)}`)
      .join(",\n") +
    "\n}\n",
);
execFileSync("npx", ["prettier", "--write", PLAN], { stdio: "ignore" });
