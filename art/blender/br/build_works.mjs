/**
 * East Works rebuilt (owner, 2026-11-17: "poolish east works. build new enterble buildings with
 * levels, new colors and floor … there are some tower buildings, should look like the attached
 * image", "skorstenar should be enterble maybe with stairs"). The location's card shows a
 * power station: three tall brick boiler towers in a row with chimneys over them, round domed
 * tanks, flat halls round them, a road looping through.
 *
 *  - ew-boiler-tower: a 7-storey red-brick boiler house, tall factory windows, a stair to every
 *    floor and on to the roof, its chimney stack rising from the roof (three of them, the card's
 *    towers);
 *  - ew-chimney: the enterable chimney, a 10-storey square brick stack with slit windows, a
 *    stair up every storey to the lookout on its top (the works' sniper perch);
 *  - ew-control-house: the control and office block, three floors of rooms in their own
 *    colours, a roof terrace;
 *  - ew-turbine-hall: the long turbine hall, sheet-metal walls over a brick plinth, a gateway, a
 *    gallery along its back up a steel stair;
 *  - ew-workshop: a two-storey workshop and stores block;
 *  - ew-tank-white, ew-tank-grey: round storage tanks with domed tops, a stair up the side to a
 *    railed roof;
 *  - ew-pipe-rack: a steel pipe bridge on portal frames between the buildings;
 *  - ew-yard, ew-yard-lines, ew-road: 20 m squares of floor (drawn only): yard concrete, the
 *    same with painted lines and bays, asphalt with a centre line.
 *
 *   node art/blender/br/build_works.mjs [id ...]
 *
 * Writes public/fps/br/models/<id>.works-v1.lod{0,1,2}.glb, the models.json entry,
 * art/br/procedural/<id>.boxes.json and <id>.entrances.json, and the footprints and door
 * aprons in src/lib/fps/br/location-buildings.json.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { makeBuilding } from "./building-kit.mjs";
import { createTexturedKit, publishTextured } from "./textured-kit.mjs";

const TAG = "works-v1";
/** Flight length for a storey of `h` (risers ≤ 0.19, treads 0.27). */
const L = (h) => Math.ceil(h / 0.19) * 0.27;
const r2 = (v) => +v.toFixed(2);

// The works' colours: red brick (the plaster texture is brick), a darker engineering brick,
// cream render, blue-grey cladding, rust-red steel, safety yellow.
const BRICK = { m: "plaster", tint: [0.92, 0.66, 0.56] };
const DARK_BRICK = { m: "plaster", tint: [0.66, 0.42, 0.36] };
const CREAM = { m: "paint", tint: [0.9, 0.86, 0.74] };
const CLAD = [0.42, 0.52, 0.6];
const STEEL = [0.52, 0.2, 0.14];
const YELLOW = [0.95, 0.72, 0.08];
const TRIM = [0.62, 0.6, 0.56];

const all =
  (...fs_) =>
  (ctx) =>
    fs_.forEach((f) => f && f(ctx));

/** A square brick chimney stack from the roof (y0) up `h`, its crown banded and dark. */
const stack =
  (x, z, half, h) =>
  ({ k, far, top }) => {
    const y0 = top,
      y1 = top + h;
    k.box([x - half, y0, z - half, x + half, y1, z + half], DARK_BRICK.m, DARK_BRICK.tint);
    // Bands every 6 m and the crown (soot-black).
    for (let y = y0 + 6; y < y1 - 2; y += 6)
      k.box(
        [x - half - 0.08, y, z - half - 0.08, x + half + 0.08, y + 0.35, z + half + 0.08],
        "concrete",
        TRIM,
        { collide: false },
      );
    k.box(
      [x - half - 0.2, y1 - 1.6, z - half - 0.2, x + half + 0.2, y1, z + half + 0.2],
      "paint",
      [0.12, 0.11, 0.1],
      { collide: false },
    );
    far.box([x - half, y0, z - half, x + half, y1, z + half], "paint", [0.5, 0.3, 0.26], {
      collide: false,
    });
  };

/** Factory columns on every floor (drawn and solid), a grid inside the walls. */
const columns =
  (xs, zs, floors) =>
  ({ k, Y }) => {
    for (let f = 0; f < floors; f++)
      for (const x of xs)
        for (const z of zs)
          k.box(
            [x - 0.2, Y(f), z - 0.2, x + 0.2, Y(f + 1) - 0.22, z + 0.2],
            "paint",
            [0.6, 0.58, 0.55],
            {
              lod: 0,
            },
          );
  };

/** A steel platform with rails outside a door at storey `floor` (a fire-escape landing). */
const ladderCage =
  (x, z0, z1, y0, y1) =>
  ({ k }) => {
    // A ladder's cage up a wall (drawn only: decoration on the stack's face).
    for (let y = y0; y < y1; y += 0.9)
      k.box([x - 0.35, y, z0, x + 0.35, y + 0.05, z1], "paint", [0.2, 0.2, 0.2], {
        collide: false,
        lod: 0,
      });
  };

const B = {
  // ---------------------------------------------------------------- the boiler towers
  "ew-boiler-tower": {
    title: "Boiler tower",
    use: "East Works: a 7-storey red-brick boiler house with its chimney stack, stairs to every floor and the roof",
    ring: "building",
    spec: (() => {
      const w = 14,
        d = 12,
        fh = 4.0;
      const X = w / 2,
        Z = d / 2;
      const c1 = r2(X - 0.25),
        c0 = r2(c1 - 1.2);
      const a0 = r2(Z - 1.4);
      return {
        w,
        d,
        floors: 7,
        midShell: true,
        fh,
        base: 0.2,
        wall: BRICK,
        trim: TRIM,
        bands: true,
        floorM: "yard",
        floorTint: [0.62, 0.62, 0.6],
        doors: [
          { side: "front", at: -3 },
          { side: "back", at: -3 },
          { side: "left", at: 0 },
        ],
        // Tall factory windows.
        windows: { step: 2.8, w: 1.5, sill: 1.0, head: 3.3 },
        stair: { axis: "z", a0, a1: r2(a0 - L(fh)), c0, c1 },
        roofAccess: true,
        roof: { type: "flat", parapet: 1.1, coping: TRIM },
        extra: all(
          columns([-3.5, 1.5], [-2, 2.5], 7),
          stack(-3.5, -2.5, 1.6, 22),
          // A ladder up the stack's face (drawn).
          ({ k, top }) => ladderCage(-3.5, -0.85, -0.75, top + 1, top + 21)({ k }),
        ),
      };
    })(),
  },
  // ---------------------------------------------------------------- the enterable chimney
  "ew-chimney": {
    title: "Chimney (enterable)",
    use: "East Works: a 36 m square brick chimney stack, a stair up every storey inside to the lookout on its top",
    ring: "building",
    spec: (() => {
      const w = 8,
        d = 8,
        fh = 3.6;
      const X = w / 2,
        Z = d / 2;
      const c1 = r2(X - 0.25),
        c0 = r2(c1 - 1.2);
      const a0 = r2(Z - 1.3);
      return {
        w,
        d,
        floors: 10,
        midShell: true,
        fh,
        base: 0.2,
        wt: 0.35,
        wall: DARK_BRICK,
        trim: [0.15, 0.14, 0.13],
        bands: false,
        floorM: "yard",
        floorTint: [0.55, 0.55, 0.53],
        doors: [{ side: "front", at: -1.6 }],
        // Slits for light and for shooting out.
        windows: { step: 2.6, w: 0.5, sill: 1.1, head: 2.3 },
        stair: { axis: "z", a0, a1: r2(a0 - L(fh)), c0, c1 },
        roofAccess: true,
        roof: { type: "flat", parapet: 1.15, coping: [0.12, 0.11, 0.1] },
        extra: all(({ k, far, top }) => {
          // Bands up the stack and its blackened crown round the lookout.
          for (let y = 6; y < top - 2; y += 7.2)
            k.box([-X - 0.1, y, -Z - 0.1, X + 0.1, y + 0.4, Z + 0.1], "concrete", TRIM, {
              collide: false,
            });
          k.box(
            [-X - 0.25, top - 1.2, -Z - 0.25, X + 0.25, top + 0.2, Z + 0.25],
            "paint",
            [0.12, 0.11, 0.1],
            { collide: false },
          );
          // A battered plinth (the stack widens at its foot).
          k.box([-X - 0.5, 0, -Z - 0.5, X + 0.5, 1.2, -Z], DARK_BRICK.m, DARK_BRICK.tint, {
            skip: ["bottom"],
          });
          k.box([-X - 0.5, 0, Z, -1.6 - 0.8, 1.2, Z + 0.5], DARK_BRICK.m, DARK_BRICK.tint, {
            skip: ["bottom"],
          });
          k.box([-1.6 + 0.8, 0, Z, X + 0.5, 1.2, Z + 0.5], DARK_BRICK.m, DARK_BRICK.tint, {
            skip: ["bottom"],
          });
          k.box([-X - 0.5, 0, -Z, -X, 1.2, Z], DARK_BRICK.m, DARK_BRICK.tint, { skip: ["bottom"] });
          k.box([X, 0, -Z, X + 0.5, 1.2, Z], DARK_BRICK.m, DARK_BRICK.tint, { skip: ["bottom"] });
          far.box([-X - 0.5, 0, -Z - 0.5, X + 0.5, 1.2, Z + 0.5], "paint", [0.42, 0.26, 0.22], {
            collide: false,
          });
        }),
      };
    })(),
  },
  // ---------------------------------------------------------------- the control house
  "ew-control-house": {
    title: "Works control house",
    use: "East Works: the control and office block, three floors of rooms in their own colours, a roof terrace",
    spec: (() => {
      const w = 24,
        d = 12,
        fh = 3.4;
      const X = w / 2,
        Z = d / 2;
      const c1 = r2(X - 0.25),
        c0 = r2(c1 - 1.2);
      const a0 = r2(Z - 1.4);
      return {
        palette: 2,
        w,
        d,
        floors: 3,
        midShell: true,
        fh,
        wall: CREAM,
        trim: [0.62, 0.22, 0.16],
        bands: true,
        plinthTint: [0.45, 0.32, 0.28],
        doors: [
          { side: "front", at: -5 },
          { side: "back", at: 4 },
          { side: "left", at: -2 },
        ],
        windows: { step: 2.4, w: 1.6, sill: 0.9, head: 2.4 },
        stair: { axis: "z", a0, a1: r2(a0 - L(fh)), c0, c1 },
        roofAccess: true,
        parts: [
          { axis: "z", at: 8.2, from: -5.75, to: 5.75, doors: [-1.5], floors: [0, 1, 2] },
          { axis: "z", at: -1, from: -5.75, to: 5.75, doors: [2.5], floors: [0, 1, 2] },
          { axis: "x", at: -1.5, from: -11.75, to: -1.1, doors: [-6.5], floors: [1, 2] },
        ],
        roof: { type: "flat", parapet: 1.0, coping: [0.62, 0.22, 0.16] },
        extra: ({ k, Z: z }) => {
          // The entrance canopy and a works sign band over it.
          k.box([-7.5, 2.75, z, -2.5, 2.9, z + 1.6], "paint", [0.62, 0.22, 0.16], {
            collide: false,
          });
          k.box([-7.5, 2.9, z + 1.5, -2.5, 3.3, z + 1.6], "paint", YELLOW, {
            collide: false,
            lod: 0,
          });
        },
      };
    })(),
  },
  // ---------------------------------------------------------------- the turbine hall
  "ew-turbine-hall": {
    title: "Turbine hall",
    use: "East Works: the long turbine hall, blue-grey cladding over a brick plinth, a gateway, a gallery along its back up a steel stair",
    ring: "building",
    spec: (() => {
      const w = 44,
        d = 22;
      const X = w / 2,
        Z = d / 2;
      return {
        w,
        d,
        floors: 1,
        midShell: true,
        fh: 11,
        wall: { m: "metal", tint: CLAD },
        trim: [0.85, 0.85, 0.82],
        floorM: "yard",
        floorTint: [0.6, 0.6, 0.58],
        doors: [
          { side: "front", at: -11, w: 5, h: 5.5, entrance: false },
          { side: "front", at: 6 },
          { side: "back", at: 12 },
          { side: "left", at: 4 },
          { side: "right", at: -4 },
        ],
        // A high band of windows (above the gallery) and a row at eye height.
        windows: { step: 4.4, w: 2.6, sill: 7.0, head: 9.6 },
        extraHoles: [-16, -4, 10, 16].map((a) => ({
          side: "front",
          floor: 0,
          a: a - 1.0,
          b: a + 1.0,
          y0: 1.1,
          y1: 2.6,
          glass: true,
        })),
        mezz: [
          {
            rect: [-X + 0.25, -Z + 0.25, X - 0.25, -Z + 5],
            y: 5.0,
            stair: { axis: "z", a0: r2(-Z + 5 + L(5)), a1: r2(-Z + 5), c0: 14, c1: 15.3 },
          },
        ],
        roof: {
          type: "gable",
          along: "x",
          pitch: 0.22,
          over: 0.5,
          m: "metal",
          tint: [0.5, 0.52, 0.55],
          farTint: [0.38, 0.4, 0.43],
        },
        extra: ({ k, X: x, Z: z }) => {
          // The brick plinth round the hall (to 1.1 m), a steel portal frame inside every 8 m.
          for (const [b, sk] of [
            [[-x - 0.06, 0, z - 0.02, x + 0.06, 1.1, z + 0.06], "z0"],
            [[-x - 0.06, 0, -z - 0.06, x + 0.06, 1.1, -z + 0.02], "z1"],
          ])
            k.box(b, BRICK.m, BRICK.tint, { collide: false, skip: [sk] });
          for (let px = -x + 6; px < x - 3; px += 8)
            for (const pz of [-z + 0.45, z - 0.45])
              k.box([px - 0.25, 0, pz - 0.2, px + 0.25, 10.8, pz + 0.2], "rust", STEEL, { lod: 0 });
          // A crane rail along each side at 9 m.
          for (const pz of [-z + 0.6, z - 0.6])
            k.box([-x + 0.3, 9.2, pz - 0.25, x - 0.3, 9.6, pz + 0.25], "rust", YELLOW, {
              collide: false,
              lod: 0,
            });
          // The turbine sets on the floor (two long casings).
          for (const tx of [-9, 7])
            k.box([tx - 6, 0.15, -1.6, tx + 6, 2.6, 1.6], "paint", [0.24, 0.42, 0.34]);
        },
      };
    })(),
  },
  // ---------------------------------------------------------------- the workshop block
  "ew-workshop": {
    title: "Workshop and stores",
    use: "East Works: a two-storey brick workshop and stores block, rooms on both floors, a flat roof up the stair",
    spec: (() => {
      const w = 18,
        d = 10,
        fh = 3.6;
      const X = w / 2,
        Z = d / 2;
      const c1 = r2(X - 0.25),
        c0 = r2(c1 - 1.2);
      const a0 = r2(Z - 1.4);
      return {
        palette: 7,
        w,
        d,
        floors: 2,
        midShell: true,
        fh,
        wall: BRICK,
        trim: [0.2, 0.32, 0.42],
        bands: true,
        doors: [
          { side: "front", at: -4, w: 3.2, h: 3.0, entrance: false },
          { side: "front", at: 2 },
          { side: "back", at: -2 },
        ],
        windows: { step: 2.6, w: 1.4, sill: 1.0, head: 2.6 },
        stair: { axis: "z", a0, a1: r2(a0 - L(fh)), c0, c1 },
        roofAccess: true,
        parts: [{ axis: "z", at: 5.4, from: -4.75, to: 4.75, doors: [-2.5], floors: [0, 1] }],
        roof: { type: "flat", parapet: 0.9, coping: [0.2, 0.32, 0.42] },
      };
    })(),
  },
};

// ---------------------------------------------------------------- round tanks (custom)
/**
 * A round storage tank: a ring of wall panels (slabs, solid), a low domed top (cone quads
 * over a flat roof that is walked on), a railing round the rim, and a straight stair up the
 * side on to a landing at the rim. `tint`: the shell, `band`: a painted band.
 */
function tank(id, { R = 8, H = 11, tint, band, title, use }) {
  const k = createTexturedKit();
  const far = createTexturedKit();
  const N = 24;
  const pt = (i, r = R) => [
    Math.cos((i / N) * Math.PI * 2) * r,
    Math.sin((i / N) * Math.PI * 2) * r,
  ];
  for (let i = 0; i < N; i++) {
    const [x0, z0] = pt(i),
      [x1, z1] = pt(i + 1);
    k.slab(x0, z0, x1, z1, 0.3, 0, H, "metal", tint);
    // The band.
    k.slab(x0, z0, x1, z1, 0.34, H * 0.62, H * 0.62 + 1.2, "paint", band, { collide: false });
    far.slab(
      x0,
      z0,
      x1,
      z1,
      0.3,
      0,
      H,
      "paint",
      tint.map((v) => v * 0.8),
      { collide: false },
    );
  }
  // The roof (walked on: collision in strips) and a shallow cone over its middle.
  const ring = [...Array(N).keys()].map((i) => pt(i, R - 0.1));
  k.poly(
    ring,
    H,
    "metal",
    tint.map((v) => v * 0.92),
    { strip: 1.0, thick: 0.4 },
  );
  far.poly(
    ring,
    H,
    "paint",
    tint.map((v) => v * 0.7),
    { collide: false },
  );
  const rc = R * 0.55,
    hc = 1.1;
  for (let i = 0; i < N; i++) {
    const [x0, z0] = pt(i, rc),
      [x1, z1] = pt(i + 1, rc);
    k.quad(
      [x0, H, z0],
      [0, H + hc, 0],
      [0, H + hc, 0],
      [x1, H, z1],
      "metal",
      tint.map((v) => v * 0.95),
      {
        n: [x0 / rc, 2.5, z0 / rc].map((v) => v / Math.hypot(x0 / rc, 2.5, z0 / rc)),
        facing: [0, 1, 0],
      },
    );
  }
  // The cone's collision: two stacked discs (low enough to step up on).
  for (const [r, h] of [
    [rc * 0.66, 0.35],
    [rc * 0.33, 0.7],
  ])
    k.solids.push([-r, H, -r, r, H + h, r].map(r2));
  // The railing round the rim (posts and a rail; a gap at the stair's landing).
  for (let i = 0; i < N; i++) {
    const [x0, z0] = pt(i, R - 0.2),
      [x1, z1] = pt(i + 1, R - 0.2);
    const mid = (i + 0.5) / N;
    // The landing at angle π/2 (+z): leave a gap there.
    if (Math.abs(mid - 0.25) < 0.03) continue;
    k.slab(x0, z0, x1, z1, 0.06, H + 0.95, H + 1.05, "paint", YELLOW, { collide: false });
    k.box([x0 - 0.04, H, z0 - 0.04, x0 + 0.04, H + 1.0, z0 + 0.04], "paint", YELLOW, {
      collide: false,
      lod: 0,
    });
    // (Its collision: a low wall the height of the rail.)
    k.solids.push(
      [
        Math.min(x0, x1) - 0.05,
        H,
        Math.min(z0, z1) - 0.05,
        Math.max(x0, x1) + 0.05,
        H + 1.05,
        Math.max(z0, z1) + 0.05,
      ].map(r2),
    );
  }
  // The stair: along x on the +z side, rising toward +x, onto a landing at the rim.
  const steps = Math.ceil(H / 0.19);
  const run = steps * 0.27;
  const sz0 = R + 0.35,
    sz1 = R + 1.55;
  k.flight("x", -run - 0.8, -0.8, sz0, sz1, 0, H, steps, "rust", [0.42, 0.42, 0.44]);
  // The landing (from the stair's head to the rim) and its rails.
  k.box([-0.8, H - 0.2, R - 0.5, 1.4, H, sz1], "rust", [0.42, 0.42, 0.44]);
  k.box([1.4, H, R - 0.2, 1.48, H + 1.05, sz1], "paint", YELLOW);
  k.box([-0.8, H, sz1, 1.48, H + 1.05, sz1 + 0.08], "paint", YELLOW);
  k.beam([-run - 0.8, 0.95, sz1 + 0.04], [-0.8, H + 0.95, sz1 + 0.04], 0.06, 0.06, "paint", YELLOW);
  // The stair's stringer under it (drawn).
  k.beam([-run - 0.8, -0.1, sz1 - 0.05], [-0.8, H - 0.3, sz1 - 0.05], 0.12, 0.3, "rust", STEEL);
  // A concrete ring foundation.
  for (let i = 0; i < N; i++) {
    const [x0, z0] = pt(i, R + 0.25),
      [x1, z1] = pt(i + 1, R + 0.25);
    k.slab(x0, z0, x1, z1, 0.5, 0, 0.35, "concrete", [0.6, 0.6, 0.58], { collide: false });
  }
  return {
    id,
    k,
    far,
    entry: {
      title,
      use,
      class: "structure",
      ring: "building",
      texture: 256,
      size: [r2(2 * R + 0.6), r2(H + hc), r2(2 * R + 0.6 + 1.6)],
    },
    foot: [r2(2 * R + 0.6), r2(2 * R + 3.4)],
  };
}

// ---------------------------------------------------------------- the pipe rack
function pipeRack() {
  const k = createTexturedKit();
  const far = createTexturedKit();
  const LEN = 30,
    H = 6.5;
  for (let x = -LEN / 2; x <= LEN / 2 + 1e-6; x += 7.5) {
    for (const z of [-1.6, 1.6])
      k.box([x - 0.2, 0, z - 0.2, x + 0.2, H + 1.6, z + 0.2], "rust", STEEL);
    for (const y of [H, H + 1.4]) k.box([x - 0.18, y, -1.8, x + 0.18, y + 0.3, 1.8], "rust", STEEL);
    k.box([x - 0.5, 0, -2.1, x + 0.5, 0.3, 2.1], "concrete", [0.6, 0.6, 0.58], { lod: 0 });
  }
  // The pipes: three on the lower deck, two on the upper (octagonal-ish: square beams turned).
  const pipes = [
    [H + 0.6, -1.1, 0.55, [0.85, 0.85, 0.82]],
    [H + 0.6, 0, 0.45, YELLOW],
    [H + 0.6, 1.1, 0.55, [0.25, 0.4, 0.6]],
    [H + 1.95, -0.6, 0.4, [0.7, 0.2, 0.16]],
    [H + 1.95, 0.6, 0.4, [0.85, 0.85, 0.82]],
  ];
  for (const [y, z, s, tint] of pipes) {
    k.box([-LEN / 2 - 1, y - s / 2, z - s / 2, LEN / 2 + 1, y + s / 2, z + s / 2], "paint", tint, {
      collide: false,
    });
    far.box(
      [-LEN / 2 - 1, y - s / 2, z - s / 2, LEN / 2 + 1, y + s / 2, z + s / 2],
      "paint",
      tint,
      {
        collide: false,
      },
    );
  }
  far.box([-LEN / 2, 0, -0.2, LEN / 2, H, 0.2], "paint", [0.45, 0.2, 0.15], { collide: false });
  return {
    id: "ew-pipe-rack",
    k,
    far,
    entry: {
      title: "Pipe rack",
      use: "East Works: a steel pipe bridge on portal frames between the buildings, five pipes in two decks",
      class: "structure",
      ring: "structure",
      texture: 256,
      size: [LEN + 2, H + 2.4, 4.2],
    },
    foot: [LEN + 2, 4.2],
  };
}

// ---------------------------------------------------------------- the yard floor
/**
 * 20 m squares of floor laid on the pad (drawn only: the ground under them is the walk),
 * a hand's breadth proud of it. `lines`: yellow lane edges and parking bays; `road`: asphalt
 * with white edge lines and a dashed centre line.
 */
function yard(id, kind) {
  const k = createTexturedKit();
  const far = createTexturedKit();
  const S = 10,
    h = 0.05;
  const m = kind === "road" ? "asphalt" : "yard";
  k.quad([-S, h, -S], [-S, h, S], [S, h, S], [S, h, -S], m, [1, 1, 1], { n: [0, 1, 0] });
  const line = (x0, z0, x1, z1, tint) =>
    k.quad(
      [x0, h + 0.01, z0],
      [x0, h + 0.01, z1],
      [x1, h + 0.01, z1],
      [x1, h + 0.01, z0],
      "paint",
      tint,
      {
        n: [0, 1, 0],
        lod: 0,
      },
    );
  if (kind === "lines") {
    // A walkway lane along one edge, parking bays along the other.
    line(-S, -S + 2.0, S, -S + 2.15, YELLOW);
    line(-S, -S + 4.0, S, -S + 4.15, YELLOW);
    for (let x = -S + 1; x <= S - 1; x += 3)
      line(x - 0.07, S - 5.5, x + 0.07, S - 0.4, [0.92, 0.92, 0.9]);
    line(-S + 0.93, S - 5.5, S - 0.93, S - 5.36, [0.92, 0.92, 0.9]);
    // Hatching in the middle (a no-parking box).
    for (let t = -4; t <= 4; t += 1.2)
      k.quad(
        [t - 0.12, h + 0.01, -1.5],
        [t + 1.2 - 0.12, h + 0.01, 1.5],
        [t + 1.2 + 0.12, h + 0.01, 1.5],
        [t + 0.12, h + 0.01, -1.5],
        "paint",
        YELLOW,
        { n: [0, 1, 0], lod: 0 },
      );
  }
  if (kind === "road") {
    line(-S, -3.6, S, -3.45, [0.92, 0.92, 0.9]);
    line(-S, 3.45, S, 3.6, [0.92, 0.92, 0.9]);
    for (let x = -S + 0.5; x < S; x += 5) line(x, -0.07, x + 2.5, 0.07, [0.92, 0.92, 0.9]);
  }
  // (The far LOD a single quad: no cheaper than the near one otherwise.)
  far.quad(
    [-S, h, -S],
    [-S, h, S],
    [S, h, S],
    [S, h, -S],
    "paint",
    kind === "road" ? [0.22, 0.22, 0.23] : [0.6, 0.59, 0.56],
    {
      n: [0, 1, 0],
    },
  );
  return {
    id,
    k,
    far,
    entry: {
      title:
        kind === "road"
          ? "Works road (asphalt)"
          : kind === "lines"
            ? "Yard with markings"
            : "Yard concrete",
      use: `East Works: 20 m of ${kind === "road" ? "asphalt road with its lines" : kind === "lines" ? "yard concrete with painted lanes and bays" : "yard concrete in 4 m bays"}, drawn only`,
      class: "structure",
      ring: "structure",
      texture: 512,
      size: [2 * S, h * 1.4, 2 * S],
    },
    foot: [2 * S, 2 * S],
  };
}

const only = process.argv.slice(2);
const PLAN = "src/lib/fps/br/location-buildings.json";
const plan = JSON.parse(fs.readFileSync(PLAN, "utf8"));
for (const [id, def] of Object.entries(B)) {
  if (only.length && !only.includes(id)) continue;
  const b = makeBuilding(def.spec);
  await publishTextured(id, b.k, b.far, {
    tag: TAG,
    title: def.title,
    source: "art/blender/br/build_works.mjs",
    use: `${def.use} (procedural, 2026-11-17)`,
    class: "building",
    ring: def.ring ?? "dwelling",
    texture: 256,
    size: b.size,
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
  plan[id] = { foot: [b.size[0], b.size[2]], aprons };
}
for (const c of [
  tank("ew-tank-white", {
    R: 8,
    H: 11,
    tint: [0.92, 0.92, 0.9],
    band: [0.7, 0.18, 0.14],
    title: "Domed storage tank (white)",
    use: "East Works: a round storage tank, its domed top railed and reached up a stair on its side",
  }),
  tank("ew-tank-grey", {
    R: 6.5,
    H: 9,
    tint: [0.66, 0.68, 0.7],
    band: [0.2, 0.36, 0.56],
    title: "Domed storage tank (grey)",
    use: "East Works: a smaller round tank, a stair up its side on to the railed top",
  }),
  pipeRack(),
  yard("ew-yard", "plain"),
  yard("ew-yard-lines", "lines"),
  yard("ew-road", "road"),
]) {
  if (only.length && !only.includes(c.id)) continue;
  await publishTextured(c.id, c.k, c.far, {
    tag: TAG,
    source: "art/blender/br/build_works.mjs",
    ...c.entry,
    use: `${c.entry.use} (procedural, 2026-11-17)`,
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
// (The repository keeps it as prettier writes it.)
execFileSync("npx", ["prettier", "--write", PLAN], { stdio: "ignore" });
