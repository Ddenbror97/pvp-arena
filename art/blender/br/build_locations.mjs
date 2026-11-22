/**
 * The enterable buildings of the 2026-11-15 locations upgrade (owner: "east port should be like
 * a real harbor port", "west point and island village, more buildings unique ones", "missing alot
 * of things to be a massive military base", "island airfield, also alot of deadspace", "ensure
 * new buildings can be enterble/door/stairs. if you cant find that build your self in blender").
 * Each is a spec for building-kit.mjs: doors the bake hangs, stairs to every floor, rooms.
 *
 *   node art/blender/br/build_locations.mjs [id ...]
 *
 * Writes public/fps/br/models/<id>.<tag>.lod{0,1,2}.glb, the models.json entry,
 * art/br/procedural/<id>.boxes.json and <id>.entrances.json.
 */
import fs from "node:fs";
import { makeBuilding } from "./building-kit.mjs";
import { createTexturedKit, publishTextured } from "./textured-kit.mjs";

const TAG = "loc-v1";
/** Flight length for a storey of `h` (risers ≤ 0.19, treads 0.27). */
const L = (h) => Math.ceil(h / 0.19) * 0.27;

const BRICK = { m: "plaster", tint: [1, 0.94, 0.9] };
const RED_BRICK = { m: "plaster", tint: [0.95, 0.78, 0.7] };
const STONE = { m: "rubble", tint: [1, 1, 1] };
const ASHLAR = { m: "stone", tint: [1, 0.98, 0.94] };
const WHITE = { m: "paint", tint: [0.95, 0.94, 0.9] };
const sheet = (tint) => ({ m: "metal", tint });

const chimney =
  (x, z, h) =>
  ({ k, top }) => {
    k.box([x - 0.4, top, z - 0.35, x + 0.4, top + h, z + 0.35], "paint", [0.62, 0.4, 0.34]);
    k.box(
      [x - 0.48, top + h, z - 0.43, x + 0.48, top + h + 0.12, z + 0.43],
      "concrete",
      [0.5, 0.5, 0.5],
      { collide: false },
    );
  };
/** A flat canopy over a door (on posts when deep). */
const canopy =
  (side, a0, a1, y, depth, tint, posts = false) =>
  ({ k, X, Z }) => {
    const b =
      side === "front"
        ? [a0, y, Z, a1, y + 0.15, Z + depth]
        : side === "back"
          ? [a0, y, -Z - depth, a1, y + 0.15, -Z]
          : side === "left"
            ? [-X - depth, y, a0, -X, y + 0.15, a1]
            : [X, y, a0, X + depth, y + 0.15, a1];
    k.box(b, "paint", tint);
    if (posts)
      for (const a of [a0 + 0.1, a1 - 0.1]) {
        const p =
          side === "front"
            ? [a - 0.08, 0, Z + depth - 0.2, a + 0.08, y, Z + depth - 0.04]
            : side === "back"
              ? [a - 0.08, 0, -Z - depth + 0.04, a + 0.08, y, -Z - depth + 0.2]
              : side === "left"
                ? [-X - depth + 0.04, 0, a - 0.08, -X - depth + 0.2, y, a + 0.08]
                : [X + depth - 0.2, 0, a - 0.08, X + depth - 0.04, y, a + 0.08];
        k.box(p, "paint", [0.6, 0.5, 0.4]);
      }
  };
const all =
  (...fs_) =>
  (ctx) =>
    fs_.forEach((f) => f(ctx));

const B = {
  // ---------------------------------------------------------------- Eastport harbour
  "harbour-office": {
    title: "Harbour master's office",
    use: "Eastport: the harbour master's office on the container quay (two floors, a stair on to the roof for the lookout)",
    spec: {
      palette: 6,
      w: 12,
      d: 9,
      floors: 2,
      fh: 3.2,
      wall: BRICK,
      bands: true,
      trim: [0.9, 0.9, 0.86],
      doors: [
        { side: "front", at: -2.5 },
        { side: "back", at: 3 },
      ],
      stair: { axis: "z", a0: 2.55, a1: 2.55 - L(3.2), c0: -5.75, c1: -4.65 },
      roofAccess: true,
      parts: [{ axis: "z", at: 1.2, from: -4.25, to: 4.25, doors: [0] }],
      roof: { type: "flat", parapet: 1.0 },
      extra: ({ k, top }) => {
        // A mast with a signal yard on the roof.
        k.box([3.5, top, -2.6, 3.7, top + 7, -2.4], "rust", [0.85, 0.85, 0.85]);
        k.box([2.3, top + 5.6, -2.55, 4.9, top + 5.7, -2.45], "rust", [0.85, 0.85, 0.85], {
          collide: false,
        });
      },
    },
  },
  "port-warehouse": {
    title: "Port warehouse",
    use: "Eastport: transit sheds on the quay (open loading bays, a mezzanine office along the back up a steel stair)",
    spec: {
      w: 36,
      d: 18,
      floors: 1,
      fh: 8,
      wall: sheet([0.6, 0.66, 0.72]),
      trim: [0.85, 0.55, 0.15],
      floorM: "concrete",
      floorTint: [0.62, 0.62, 0.6],
      doors: [
        { side: "front", at: -9, w: 6, h: 5.5, entrance: false },
        { side: "front", at: 9, w: 6, h: 5.5, entrance: false },
        { side: "front", at: 0 },
        { side: "back", at: 12 },
        { side: "left", at: 4 },
      ],
      windows: { step: 4, w: 2.4, sill: 5.8, head: 7.0 },
      mezz: [
        {
          rect: [-17.75, -8.75, -4, -3.75],
          y: 3.6,
          stair: { axis: "z", a0: -3.75 + L(3.45), a1: -3.75, c0: -6.3, c1: -5.1 },
        },
      ],
      roof: {
        type: "gable",
        along: "x",
        pitch: 0.2,
        m: "metal",
        tint: [0.55, 0.57, 0.6],
        over: 0.6,
      },
    },
  },
  "fish-market": {
    title: "Fish market hall",
    use: "Eastport: the fish market hall on the fishing quay (open arcades to the quay, stalls inside)",
    spec: {
      w: 24,
      d: 12,
      floors: 1,
      fh: 4.6,
      wall: RED_BRICK,
      trim: [0.92, 0.9, 0.85],
      floorM: "tiles",
      floorTint: [0.8, 0.8, 0.78],
      doors: [
        ...[-8, -4, 0, 4, 8].map((at) => ({ side: "front", at, w: 3, h: 3.4, entrance: false })),
        { side: "left", at: 0 },
        { side: "right", at: 0 },
        { side: "back", at: -6 },
      ],
      windows: { step: 4, w: 2, sill: 2.4, head: 3.8, sides: ["back"] },
      roof: {
        type: "gable",
        along: "x",
        pitch: 0.42,
        m: "metal",
        tint: [0.5, 0.56, 0.6],
        over: 0.8,
      },
    },
  },
  "customs-house": {
    title: "Customs house",
    use: "Eastport: the stone customs house at the head of the harbour (three floors of offices)",
    spec: {
      palette: 9,
      w: 14,
      d: 10,
      floors: 3,
      fh: 3.2,
      wall: ASHLAR,
      bands: true,
      trim: [0.85, 0.83, 0.78],
      doors: [
        { side: "front", at: -2 },
        { side: "left", at: -2.5 },
      ],
      stair: { axis: "z", a0: 2.9, a1: 2.9 - L(3.2), c0: 5.65, c1: 6.75 },
      parts: [
        { axis: "z", at: 1.5, from: -4.75, to: 4.75, doors: [3] },
        { axis: "x", at: -1.5, from: -6.75, to: 1.4, doors: [-3] },
      ],
      roof: { type: "flat", parapet: 1.1, coping: [0.8, 0.78, 0.72] },
    },
  },

  // ---------------------------------------------------------------- Southern Military Base
  "barracks-2s": {
    title: "Two-storey barracks",
    use: "Southern Military Base: two-storey barrack blocks (dormitories either side of the stair hall)",
    spec: {
      palette: 9,
      w: 26,
      d: 10,
      floors: 2,
      fh: 3.1,
      wall: { m: "concrete", tint: [0.86, 0.82, 0.7] },
      trim: [0.35, 0.38, 0.3],
      floorM: "floor",
      floorTint: [0.75, 0.73, 0.68],
      doors: [
        { side: "front", at: -6 },
        { side: "front", at: 6 },
        { side: "left", at: 0 },
        { side: "right", at: 1 },
      ],
      stair: { axis: "x", a0: -L(3.1) / 2, a1: L(3.1) / 2, c0: -4.75, c1: -3.65 },
      parts: [
        { axis: "z", at: -7.5, from: -4.75, to: 4.75, doors: [1.5] },
        { axis: "z", at: 7.5, from: -4.75, to: 4.75, doors: [1.5] },
      ],
      roof: {
        type: "gable",
        along: "x",
        pitch: 0.32,
        m: "metal",
        tint: [0.48, 0.55, 0.42],
      },
    },
  },
  "mess-hall": {
    title: "Mess hall",
    use: "Southern Military Base: the mess hall (one long hall, kitchen behind)",
    spec: {
      palette: 9,
      w: 22,
      d: 12,
      floors: 1,
      fh: 4,
      wall: { m: "concrete", tint: [0.84, 0.8, 0.68] },
      trim: [0.3, 0.33, 0.28],
      floorM: "tiles",
      floorTint: [0.78, 0.76, 0.72],
      doors: [
        { side: "front", at: -4 },
        { side: "front", at: 4 },
        { side: "back", at: 8 },
      ],
      windows: { step: 3, w: 1.6, sill: 1.2, head: 3.0 },
      parts: [{ axis: "x", at: -2.5, from: -10.75, to: 10.75, doors: [-5, 5] }],
      roof: {
        type: "gable",
        along: "x",
        pitch: 0.3,
        m: "metal",
        tint: [0.46, 0.52, 0.4],
      },
    },
  },
  "mil-hangar": {
    title: "Military hangar",
    use: "Southern Military Base: aircraft hangars on the flight line (open doors, offices on a mezzanine at the back)",
    spec: {
      w: 40,
      d: 30,
      floors: 1,
      fh: 10,
      wall: sheet([0.5, 0.56, 0.46]),
      trim: [0.3, 0.32, 0.28],
      floorM: "concrete",
      floorTint: [0.6, 0.6, 0.58],
      doors: [
        { side: "front", at: 0, w: 32, h: 8.5, entrance: false },
        { side: "back", at: 10 },
        { side: "left", at: 6 },
        { side: "right", at: 6 },
      ],
      windows: { step: 5, w: 3, sill: 7.0, head: 9.0, sides: ["left", "right", "back"] },
      mezz: [
        {
          rect: [-19.75, -14.75, -5, -9],
          y: 3.6,
          stair: { axis: "z", a0: -9 + L(3.45), a1: -9, c0: -7.6, c1: -6.4 },
        },
      ],
      roof: {
        type: "gable",
        along: "z",
        pitch: 0.22,
        m: "metal",
        tint: [0.46, 0.52, 0.42],
        over: 0.5,
      },
    },
  },

  // ---------------------------------------------------------------- Island Airfield
  "air-terminal": {
    title: "Airfield terminal",
    use: "Island Airfield: the passenger terminal (check-in hall, departure lounge upstairs, the roof terrace)",
    spec: {
      palette: 2,
      w: 40,
      d: 16,
      floors: 2,
      fh: 4,
      wall: { m: "paint", tint: [0.9, 0.9, 0.88] },
      trim: [0.3, 0.32, 0.36],
      floorM: "tiles",
      floorTint: [0.82, 0.82, 0.8],
      glassTint: [0.28, 0.4, 0.5],
      doors: [
        { side: "front", at: -8 },
        { side: "front", at: 8 },
        { side: "back", at: 0 },
        { side: "left", at: 2 },
      ],
      windows: { step: 2.6, w: 2.2, sill: 0.5, head: 3.4, sides: ["front", "back"] },
      stair: { axis: "x", a0: 12, a1: 12 - L(4), c0: -7.75, c1: -6.55 },
      roofAccess: true,
      parts: [{ axis: "z", at: -12, from: -7.75, to: 7.75, doors: [2], floors: [0, 1] }],
      roof: { type: "flat", parapet: 1.1, coping: [0.4, 0.42, 0.46] },
      bands: true,
    },
  },
  "control-tower": {
    title: "Control tower",
    use: "Island Airfield: the control tower (a stair to every floor, the glazed cab on top)",
    spec: {
      palette: 8,
      w: 7,
      d: 7,
      floors: 5,
      fh: 3.2,
      wall: { m: "concrete", tint: [0.88, 0.88, 0.86] },
      trim: [0.25, 0.27, 0.3],
      floorM: "floor",
      floorTint: [0.7, 0.7, 0.68],
      doors: [{ side: "front", at: 1.5 }],
      windows: { step: 2.4, w: 0.9, sill: 1.1, head: 2.0, floors: [0, 1, 2, 3] },
      extraHoles: ["front", "back", "left", "right"].map((side) => ({
        side,
        floor: 4,
        a: -2.9,
        b: 2.9,
        y0: 0.9,
        y1: 2.9,
        glass: true,
      })),
      stair: { axis: "z", a0: 2.3, a1: 2.3 - L(3.2), c0: -3.25, c1: -2.15 },
      roof: { type: "flat", parapet: 0.6, coping: [0.3, 0.3, 0.3] },
      extra: ({ k, top }) => {
        k.box([-0.1, top, -0.1, 0.1, top + 4, 0.1], "rust", [0.8, 0.8, 0.8], { collide: false });
        k.box([-1.2, top + 0.6, -1.2, 1.2, top + 1.2, 1.2], "paint", [0.85, 0.85, 0.85]);
      },
    },
  },
  "air-hangar": {
    title: "Maintenance hangar",
    use: "Island Airfield: maintenance hangars (open doors, a mezzanine office up a steel stair)",
    spec: {
      w: 44,
      d: 34,
      floors: 1,
      fh: 11,
      wall: sheet([0.72, 0.74, 0.76]),
      trim: [0.15, 0.3, 0.55],
      floorM: "concrete",
      floorTint: [0.64, 0.64, 0.62],
      doors: [
        { side: "front", at: 0, w: 36, h: 9.5, entrance: false },
        { side: "back", at: -12 },
        { side: "right", at: 10 },
      ],
      windows: { step: 5, w: 3, sill: 8, head: 10, sides: ["left", "right"] },
      mezz: [
        {
          rect: [6, -16.75, 21.75, -10],
          y: 3.6,
          stair: { axis: "z", a0: -10 + L(3.45), a1: -10, c0: 7.2, c1: 8.4 },
        },
      ],
      roof: {
        type: "gable",
        along: "z",
        pitch: 0.2,
        m: "metal",
        tint: [0.62, 0.64, 0.66],
        over: 0.5,
      },
    },
  },
  "crash-station": {
    title: "Airfield fire station",
    use: "Island Airfield: the crash and rescue station (two engine bays, the crew floor upstairs)",
    spec: {
      palette: 2,
      w: 18,
      d: 12,
      floors: 2,
      fh: 3.6,
      wall: RED_BRICK,
      trim: [0.85, 0.15, 0.12],
      bands: true,
      floorM: "concrete",
      floorTint: [0.62, 0.6, 0.58],
      doors: [
        { side: "front", at: -4, w: 4.2, h: 3.3, entrance: false },
        { side: "front", at: 2, w: 4.2, h: 3.3, entrance: false },
        { side: "front", at: 7 },
        { side: "back", at: -5 },
      ],
      stair: { axis: "z", a0: -4.55 + L(3.6), a1: -4.55, c0: 7.65, c1: 8.75 },
      parts: [{ axis: "z", at: 5.2, from: -5.75, to: 5.75, doors: [3.5], floors: [0] }],
      roof: { type: "flat", parapet: 0.9 },
    },
  },

  // ---------------------------------------------------------------- West Point / Island Village
  "village-inn": {
    title: "Village inn",
    use: "Island Village: the inn on the square (bar downstairs, rooms upstairs)",
    spec: {
      palette: 0,
      w: 14,
      d: 10,
      floors: 2,
      fh: 3.0,
      wall: STONE,
      trim: [0.35, 0.25, 0.18],
      doors: [
        { side: "front", at: -2 },
        { side: "back", at: 4 },
      ],
      stair: { axis: "z", a0: 3.0, a1: 3.0 - L(3), c0: 5.65, c1: 6.75 },
      parts: [
        { axis: "z", at: 1.2, from: -4.75, to: 4.75, doors: [2.5] },
        { axis: "x", at: -0.5, from: -6.75, to: 1.1, doors: [-3.5], floors: [1] },
      ],
      roof: { type: "gable", along: "x", pitch: 0.66, tint: [0.9, 0.9, 0.9] },
      extra: all(
        chimney(-4.5, -1.5, 1.6),
        canopy("front", -3.2, -0.8, 2.6, 1.2, [0.3, 0.22, 0.16]),
      ),
    },
  },
  "village-store": {
    title: "Village store",
    use: "Island Village: the general store (shop on the ground floor, a flat above)",
    spec: {
      palette: 7,
      w: 10,
      d: 9,
      floors: 2,
      fh: 3.1,
      wall: BRICK,
      trim: [0.2, 0.32, 0.25],
      doors: [
        { side: "front", at: 0 },
        { side: "back", at: 3 },
      ],
      extraHoles: [
        { side: "front", floor: 0, a: -4.2, b: -1.2, y0: 0.45, y1: 2.5 },
        { side: "front", floor: 0, a: 1.2, b: 4.2, y0: 0.45, y1: 2.5 },
      ],
      windows: { step: 2.6, w: 1.1, sill: 0.9, head: 2.2, skip: [["front", -5, 5]] },
      stair: { axis: "z", a0: 2.9, a1: 2.9 - L(3.1), c0: -4.75, c1: -3.65 },
      parts: [{ axis: "x", at: -1.5, from: -3.65, to: 4.75, doors: [1], floors: [0] }],
      roof: {
        type: "gable",
        along: "x",
        pitch: 0.6,
        tint: [0.62, 0.62, 0.68],
      },
      extra: all(canopy("front", -4.8, 4.8, 2.75, 1.5, [0.2, 0.45, 0.3]), chimney(3, -2, 1.4)),
    },
  },
  bakery: {
    title: "Bakery",
    use: "Island Village: the bakery (shop and oven room, a flat in the attic floor)",
    spec: {
      palette: 3,
      w: 8,
      d: 8,
      floors: 2,
      fh: 2.9,
      wall: { m: "paint", tint: [0.93, 0.8, 0.55] },
      trim: [0.45, 0.25, 0.15],
      doors: [
        { side: "front", at: -1.8 },
        { side: "left", at: -2 },
      ],
      extraHoles: [{ side: "front", floor: 0, a: 0, b: 3, y0: 0.6, y1: 2.3 }],
      stair: { axis: "z", a0: 2.5, a1: 2.5 - L(2.9), c0: 2.65, c1: 3.75 },
      parts: [{ axis: "x", at: -1.2, from: -3.75, to: 2.65, doors: [-1], floors: [0] }],
      roof: { type: "gable", along: "x", pitch: 0.7 },
      extra: all(chimney(-2.5, -1.5, 1.8), canopy("front", -0.2, 3.4, 2.5, 1.0, [0.6, 0.2, 0.15])),
    },
  },
  "cottage-stone": {
    title: "Stone cottage",
    use: "Island Village and West Point: fishermen's stone cottages (a stair to the bedroom floor)",
    spec: {
      palette: 1,
      w: 9,
      d: 6.5,
      floors: 2,
      fh: 2.7,
      wall: STONE,
      trim: [0.25, 0.3, 0.35],
      doors: [
        { side: "front", at: 1.5 },
        { side: "back", at: 2.6 },
      ],
      windows: { step: 2.6, w: 1.0, sill: 0.9, head: 2.0 },
      stair: { axis: "x", a0: -3.45, a1: -3.45 + L(2.7), c0: -3.0, c1: -1.9 },
      roof: {
        type: "gable",
        along: "x",
        pitch: 0.72,
        tint: [0.62, 0.6, 0.62],
      },
      extra: chimney(3.8, 0, 1.4),
    },
  },
  "cottage-wood": {
    title: "Timber cottage",
    use: "Island Village and West Point: red timber cottages with a porch",
    spec: {
      palette: 4,
      w: 9,
      d: 7,
      floors: 1,
      fh: 3.0,
      wall: { m: "wood", tint: [0.85, 0.42, 0.34] },
      trim: [0.95, 0.95, 0.92],
      doors: [
        { side: "front", at: 1 },
        { side: "back", at: -2 },
      ],
      windows: { step: 2.4, w: 1.1, sill: 0.9, head: 2.1 },
      parts: [{ axis: "x", at: -0.5, from: -4.25, to: 4.25, doors: [-2, 2.5] }],
      roof: {
        type: "gable",
        along: "x",
        pitch: 0.62,
        m: "metal",
        tint: [0.3, 0.3, 0.32],
      },
      extra: canopy("front", -0.6, 4.2, 2.6, 1.8, [0.95, 0.95, 0.92], true),
    },
  },
  "cottage-white": {
    title: "White cottage",
    use: "Island Village and West Point: tall white cottages, gable to the lane",
    spec: {
      palette: 2,
      w: 7,
      d: 8,
      floors: 2,
      fh: 2.9,
      wall: WHITE,
      trim: [0.2, 0.35, 0.55],
      doors: [
        { side: "front", at: -1.5 },
        { side: "left", at: -2.5 },
      ],
      windows: { step: 2.4, w: 1.0, sill: 0.9, head: 2.1 },
      stair: { axis: "z", a0: 2.6, a1: 2.6 - L(2.9), c0: 2.15, c1: 3.25 },
      roof: { type: "gable", along: "z", pitch: 0.75, tint: [1, 1, 1] },
      extra: chimney(0, -3, 1.2),
    },
  },
  boathouse: {
    title: "Boathouse",
    use: "West Point and Island Village shore: timber boathouses (the boat bay open to the water, a net loft upstairs)",
    spec: {
      w: 8,
      d: 14,
      floors: 2,
      fh: 3.0,
      wall: { m: "wood", tint: [0.72, 0.6, 0.48] },
      trim: [0.3, 0.25, 0.2],
      floorM: "wood",
      doors: [
        { side: "front", at: 0, w: 5, h: 2.9, entrance: false },
        { side: "back", at: 2 },
        { side: "left", at: -3 },
      ],
      windows: { step: 3, w: 1.0, sill: 1.0, head: 2.0, sides: ["left", "right"] },
      stair: { axis: "z", a0: -4, a1: -4 + L(3), c0: 2.65, c1: 3.75 },
      roof: {
        type: "gable",
        along: "z",
        pitch: 0.6,
        m: "metal",
        tint: [0.4, 0.42, 0.45],
      },
    },
  },
  "village-chapel": {
    title: "Chapel",
    reach: 3.0,
    use: "Island Village: the stone chapel and its bell tower",
    spec: {
      palette: 5,
      w: 9,
      d: 16,
      floors: 1,
      fh: 6.5,
      wall: ASHLAR,
      trim: [0.7, 0.68, 0.62],
      floorM: "tiles",
      floorTint: [0.75, 0.72, 0.68],
      doors: [
        { side: "front", at: 0, w: 1.3, h: 2.6 },
        { side: "left", at: -5 },
      ],
      windows: { step: 3, w: 0.9, sill: 2.2, head: 5.2, sides: ["left", "right"] },
      roof: {
        type: "gable",
        along: "z",
        pitch: 0.82,
        tint: [0.6, 0.6, 0.66],
      },
      extra: ({ k, far, Z, top }) => {
        // The bell tower over the back end (solid), its pyramid roof and an open belfry.
        const z0 = -Z - 3.4,
          z1 = -Z + 0.01;
        k.box([-1.7, 0, z0, 1.7, top + 4, z1], "stone", [1, 0.98, 0.94]);
        const h = top + 4;
        for (const [x0, x1] of [
          [-1.7, -1.2],
          [1.2, 1.7],
        ])
          k.box([x0, h, z0, x1, h + 2.2, z1], "stone", [1, 0.98, 0.94]);
        k.box([-1.2, h, z0, 1.2, h + 2.2, z0 + 0.5], "stone", [1, 0.98, 0.94]);
        k.box([-1.2, h, z1 - 0.5, 1.2, h + 2.2, z1], "stone", [1, 0.98, 0.94]);
        k.box(
          [-0.5, h + 0.8, (z0 + z1) / 2 - 0.5, 0.5, h + 1.8, (z0 + z1) / 2 + 0.5],
          "rust",
          [0.55, 0.45, 0.25],
          { collide: false },
        );
        const a = h + 2.2,
          apex = a + 3.2,
          c = (z0 + z1) / 2;
        const P = [
          [-1.9, z0 - 0.2],
          [1.9, z0 - 0.2],
          [1.9, z1 + 0.2],
          [-1.9, z1 + 0.2],
        ];
        for (let i = 0; i < 4; i++) {
          const [px, pz] = P[i],
            [qx, qz] = P[(i + 1) % 4];
          // Lit by the face's outward slope.
          const ox = (px + qx) / 2,
            oz = (pz + qz) / 2 - c;
          const ol = Math.hypot(ox, oz) || 1;
          const nn = [(ox / ol) * 0.83, 0.56, (oz / ol) * 0.83];
          k.quad(
            [px, a, pz],
            [qx, a, qz],
            [0, apex, c],
            [0, apex, c],
            "rooftile",
            [0.6, 0.6, 0.66],
            { n: nn, facing: nn },
          );
          far.quad(
            [px, a, pz],
            [qx, a, qz],
            [0, apex, c],
            [0, apex, c],
            "rooftile",
            [0.6, 0.6, 0.66],
            { n: nn, facing: nn },
          );
        }
        k.box([-1.9, a, z0 - 0.2, 1.9, a + 0.4, z1 + 0.2], "stone", [0.9, 0.88, 0.84], {
          visible: false,
        });
        far.box([-1.7, 0, z0, 1.7, a, z1], "stone", [0.9, 0.88, 0.84], { collide: false });
      },
    },
  },
  schoolhouse: {
    title: "Schoolhouse",
    use: "Island Village: the red-brick schoolhouse (three classrooms)",
    spec: {
      palette: 6,
      w: 18,
      d: 9,
      floors: 1,
      fh: 3.6,
      wall: RED_BRICK,
      trim: [0.92, 0.92, 0.88],
      doors: [
        { side: "front", at: 0 },
        { side: "back", at: -6 },
        { side: "right", at: 0 },
      ],
      windows: { step: 2.6, w: 1.4, sill: 0.9, head: 3.0 },
      parts: [
        { axis: "z", at: -3, from: -4.25, to: 4.25, doors: [2.5] },
        { axis: "z", at: 3, from: -4.25, to: 4.25, doors: [2.5] },
      ],
      roof: {
        type: "gable",
        along: "x",
        pitch: 0.55,
        tint: [0.62, 0.6, 0.62],
      },
      extra: all(canopy("front", -1.6, 1.6, 2.7, 1.4, [0.92, 0.92, 0.88], true), ({ k, top }) => {
        // A little bell cote on the ridge.
        k.box([-0.6, top + 2.2, -0.6, 0.6, top + 3.6, 0.6], "paint", [0.92, 0.92, 0.88], {
          collide: false,
        });
      }),
    },
  },
  "coastguard-station": {
    title: "Coast guard station",
    use: "West Point: the coast guard station on the point (two floors, the stair on to the lookout roof, a radio mast)",
    spec: {
      palette: 8,
      w: 10,
      d: 8,
      floors: 2,
      fh: 3.1,
      wall: WHITE,
      trim: [0.75, 0.12, 0.1],
      bands: true,
      doors: [
        { side: "front", at: 1.5 },
        { side: "right", at: 2 },
      ],
      stair: { axis: "z", a0: 2.6, a1: 2.6 - L(3.1), c0: -4.75, c1: -3.65 },
      roofAccess: true,
      parts: [{ axis: "z", at: 0.2, from: -3.75, to: 3.75, doors: [2.4] }],
      roof: { type: "flat", parapet: 1.0, coping: [0.75, 0.12, 0.1] },
      extra: ({ k, top }) => {
        k.box([3.6, top, -3.0, 3.8, top + 9, -2.8], "rust", [0.85, 0.85, 0.85], { collide: false });
        k.box([3.55, top, -3.05, 3.85, top + 1.2, -2.75], "rust", [0.85, 0.85, 0.85]);
      },
    },
  },
};

const only = process.argv.slice(2);
// Footprints and door aprons for layout.ts (FOOT, ENTRANCE_APRONS): the size's plan (x, z at
// turn 0) and a point 1.2 m outside each door (3 m outside a gateway).
const PLAN = "src/lib/fps/br/location-buildings.json";
const plan = fs.existsSync(PLAN) ? JSON.parse(fs.readFileSync(PLAN, "utf8")) : {};
for (const [id, def] of Object.entries(B)) {
  if (only.length && !only.includes(id)) continue;
  const b = makeBuilding(def.spec);
  // (Anything built beyond the walls on the plan, as the chapel's tower: the footprint grows
  // both ways, the pivot stays in the middle.)
  if (def.reach) b.size[2] = +(b.size[2] + 2 * def.reach).toFixed(2);
  await publishTextured(id, b.k, b.far, {
    tag: TAG,
    title: def.title,
    source: "art/blender/br/build_locations.mjs",
    use: `${def.use} (procedural, 2026-11-15)`,
    class: "building",
    // (The large ones are seen from afar: the building ring's distances.)
    ring: [
      "port-warehouse",
      "fish-market",
      "customs-house",
      "harbour-office",
      "mil-hangar",
      "air-terminal",
      "control-tower",
      "air-hangar",
    ].includes(id)
      ? "building"
      : "dwelling",
    texture: 256,
    size: b.size,
  });
  fs.writeFileSync(`art/br/procedural/${id}.entrances.json`, JSON.stringify(b.entrances) + "\n");
  const S = def.spec;
  const aprons = (S.doors ?? []).map((q) => {
    const out = (q.w ?? 1.3) > 1.4 ? 3 : 1.2;
    const r = (v) => +v.toFixed(2);
    return q.side === "front"
      ? [r(q.at), r(S.d / 2 + out)]
      : q.side === "back"
        ? [r(q.at), r(-S.d / 2 - out)]
        : q.side === "left"
          ? [r(-S.w / 2 - out), r(q.at)]
          : [r(S.w / 2 + out), r(q.at)];
  });
  plan[id] = { foot: [b.size[0], b.size[2]], aprons };
}
// The quay wall (no doors): Eastport's container terminal face.
{
  const k = createTexturedKit(),
    far = createTexturedKit();
  const LEN = 40,
    H = 16,
    T = 1.4;
  k.box([-LEN / 2, 0, -T / 2, LEN / 2, H, T / 2], "concrete", [0.78, 0.76, 0.72]);
  // The capping beam (a lip over the face) and the black fenders down it every 8 m.
  k.box(
    [-LEN / 2, H - 0.05, -T / 2 - 0.25, LEN / 2, H + 0.25, T / 2],
    "concrete",
    [0.86, 0.85, 0.82],
  );
  for (let x = -LEN / 2 + 4; x < LEN / 2; x += 8)
    k.box([x - 0.6, H - 5.5, -T / 2 - 0.55, x + 0.6, H - 0.4, -T / 2], "rust", [0.12, 0.12, 0.12], {
      collide: false,
    });
  // Yellow edge paint on the capping beam's top.
  k.box(
    [-LEN / 2, H + 0.25, -T / 2 - 0.25, LEN / 2, H + 0.27, -T / 2 + 0.2],
    "paint",
    [0.95, 0.78, 0.1],
    { collide: false },
  );
  far.box([-LEN / 2, 0, -T / 2, LEN / 2, H + 0.25, T / 2], "concrete", [0.78, 0.76, 0.72], {
    collide: false,
  });
  if (!only.length || only.includes("quay-wall")) {
    await publishTextured("quay-wall", k, far, {
      tag: TAG,
      title: "Quay wall",
      source: "art/blender/br/build_locations.mjs",
      use: "Eastport: the container terminal's quay wall, face to the berth (fenders, a capping beam) (procedural, 2026-11-15)",
      class: "structure",
      ring: "structure",
      texture: 256,
      size: [LEN, H + 0.27, T + 0.55],
    });
  }
  plan["quay-wall"] = { foot: [LEN, T + 0.55], aprons: [] };
}
// ISO 40 ft shipping containers (12.19 × 2.59 × 2.44 m) in four liveries, for the terminal's
// stacks: corrugated sides, corner posts and rails, the door end at +x with its locking bars.
for (const [id, tint, name] of [
  ["iso-40-red", [0.72, 0.2, 0.16], "red"],
  ["iso-40-blue", [0.18, 0.36, 0.62], "blue"],
  ["iso-40-green", [0.22, 0.48, 0.3], "green"],
  ["iso-40-grey", [0.7, 0.7, 0.68], "grey"],
  ["iso-40-orange", [0.86, 0.46, 0.14], "orange"],
]) {
  const k = createTexturedKit(),
    far = createTexturedKit();
  const X = 12.19 / 2,
    H = 2.59,
    Z = 2.44 / 2;
  const dark = tint.map((v) => v * 0.55);
  // The box: corrugated sheet all round (ribs vertical on the sides), a plain roof.
  k.box([-X + 0.12, 0.12, -Z + 0.02, X - 0.12, H - 0.1, Z - 0.02], "metal", tint, {
    collide: false,
  });
  k.box([-X, 0, -Z, X, H, Z], "metal", tint, { visible: false });
  k.box(
    [-X + 0.1, H - 0.1, -Z + 0.04, X - 0.1, H - 0.04, Z - 0.04],
    "paint",
    tint.map((v) => v * 0.9),
    { collide: false, skip: ["bottom"] },
  );
  // Corner posts, top and bottom rails (the frame, a shade darker).
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      k.box(
        [
          sx > 0 ? X - 0.15 : -X,
          0,
          sz > 0 ? Z - 0.15 : -Z,
          sx > 0 ? X : -X + 0.15,
          H,
          sz > 0 ? Z : -Z + 0.15,
        ],
        "paint",
        dark,
        { collide: false },
      );
  for (const y of [0, H - 0.12])
    for (const sz of [-1, 1])
      k.box(
        [-X + 0.15, y, sz > 0 ? Z - 0.1 : -Z, X - 0.15, y + 0.12, sz > 0 ? Z : -Z + 0.1],
        "paint",
        dark,
        { collide: false },
      );
  // The door end: two leaves, four locking bars.
  k.box([X - 0.12, 0.12, -0.012, X - 0.02, H - 0.12, 0.012], "paint", dark, { collide: false });
  for (const zb of [-0.85, -0.35, 0.35, 0.85])
    k.box([X - 0.05, 0.2, zb - 0.025, X + 0.01, H - 0.2, zb + 0.025], "rust", [0.35, 0.35, 0.35], {
      collide: false,
    });
  far.box([-X, 0, -Z, X, H, Z], "metal", tint, { collide: false });
  if (!only.length || only.includes(id))
    await publishTextured(id, k, far, {
      tag: TAG,
      title: `Shipping container (${name})`,
      source: "art/blender/br/build_locations.mjs",
      use: "Eastport: the container terminal's stacks (procedural ISO 40 ft box, 2026-11-15)",
      class: "prop",
      ring: "structure",
      texture: 256,
      size: [12.19, H, 2.44],
    });
  plan[id] = { foot: [12.2, 2.45], aprons: [] };
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
