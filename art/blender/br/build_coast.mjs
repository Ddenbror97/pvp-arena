/**
 * The coastal towns' enterable houses (owner, 2026-11-17: "those two neighbourhoods need to be
 * upgraded to a similar look and layout as the image. build new houses/buildings enterable with
 * floor/color on walls"):
 *
 *  - Fisher's Cove: a fishing harbour village. Narrow painted houses (red, ochre, blue, green,
 *    salmon, white) under clay-tile gables, terraced along the quay and up the slope, a shop
 *    with an awning on the quay, balconies over the harbour.
 *  - Bayview: a Mediterranean marina town. White and pastel villas, town houses and a block of
 *    flats with flat roofs, parapets and roof terraces up the stair, balconies, pergola canopies;
 *    a glass-fronted beach club on the promenade.
 *
 * Each is a spec for building-kit.mjs (doors the bake hangs, a stair to every floor and to the
 * roof terraces, partitions with doorways, each storey's walls and floor in its own colours).
 *
 *   node art/blender/br/build_coast.mjs [id ...]
 *
 * Writes public/fps/br/models/<id>.coast-v1.lod{0,1,2}.glb, the models.json entry,
 * art/br/procedural/<id>.boxes.json and <id>.entrances.json, and the footprints and door
 * aprons in src/lib/fps/br/location-buildings.json.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { makeBuilding } from "./building-kit.mjs";
import { publishTextured } from "./textured-kit.mjs";

const TAG = "coast-v1";
/** Flight length for a storey of `h` (risers ≤ 0.19, treads 0.27). */
const L = (h) => Math.ceil(h / 0.19) * 0.27;
const paint = (tint) => ({ m: "paint", tint });
const WHITE_TRIM = [0.95, 0.94, 0.9];

/** A slab on the front wall at storey `L`'s floor, from x a to b, `depth` out, with railings. */
const balcony =
  (floor, a, b, depth, tint, rail = [0.2, 0.22, 0.24]) =>
  ({ k, Y, Z }) => {
    const y = Y(floor);
    k.box([a, y - 0.18, Z, b, y, Z + depth], "paint", tint);
    k.box([a, y, Z + depth - 0.06, b, y + 1.05, Z + depth], "paint", rail, { collide: true });
    for (const x of [a, b - 0.06])
      k.box([x, y, Z, x + 0.06, y + 1.05, Z + depth], "paint", rail, { collide: true, lod: 0 });
    // Brackets under it.
    for (const x of [a + 0.2, b - 0.32])
      k.box([x, y - 0.5, Z, x + 0.12, y - 0.18, Z + depth * 0.7], "paint", tint, {
        collide: false,
        lod: 0,
      });
  };
/** A shop awning over the front, from x a to b at height y, `depth` out. */
const awning =
  (a, b, y, depth, tint) =>
  ({ k, Z }) => {
    k.box([a, y, Z, b, y + 0.08, Z + depth], "paint", tint, { collide: false });
    k.box([a, y - 0.35, Z + depth - 0.04, b, y, Z + depth], "paint", tint, {
      collide: false,
      lod: 0,
    });
  };
/** A canopy on posts over the front terrace (a pergola's timber roof). */
const terrace =
  (a, b, y, depth, tint) =>
  ({ k, Z }) => {
    // The slats near only (past 100 m the beam and posts carry it).
    for (let x = a; x <= b + 1e-6; x += 0.6)
      k.box([x, y, Z, x + 0.08, y + 0.16, Z + depth], "wood", tint, { collide: false, lod: 0 });
    k.box([a, y - 0.16, Z + depth - 0.16, b + 0.08, y, Z + depth], "wood", tint, {
      collide: false,
    });
    for (const x of [a, b - 0.06])
      k.box([x, 0, Z + depth - 0.16, x + 0.16, y, Z + depth], "wood", tint);
  };
/** Flower boxes under the front's first-floor windows (near LOD only: details past 100 m). */
const flowerBoxes =
  (xs, floor, tint = [0.75, 0.2, 0.25]) =>
  ({ k, Y, Z }) => {
    for (const x of xs) {
      k.box(
        [x - 0.55, Y(floor) + 0.62, Z, x + 0.55, Y(floor) + 0.86, Z + 0.25],
        "wood",
        [0.6, 0.42, 0.3],
        { collide: false, lod: 0 },
      );
      k.box(
        [x - 0.5, Y(floor) + 0.86, Z + 0.03, x + 0.5, Y(floor) + 1.0, Z + 0.22],
        "paint",
        tint,
        { collide: false, lod: 0 },
      );
    }
  };
const all =
  (...fs_) =>
  (ctx) =>
    fs_.forEach((f) => f(ctx));

/**
 * A narrow harbour house: the stair along the right wall (rising to the back), the door left of
 * it, a room behind a partition on the ground floor.
 */
function harbourHouse({
  w,
  d,
  floors,
  fh = 2.9,
  wall,
  trim = WHITE_TRIM,
  palette,
  along = "z",
  pitch = 0.7,
  roofTint = [1, 1, 1],
  extra,
  holes = [],
  shop = false,
}) {
  const X = w / 2,
    Z = d / 2;
  const c1 = +(X - 0.25).toFixed(2),
    c0 = +(c1 - 1.1).toFixed(2);
  const a0 = +(Z - 1.3).toFixed(2);
  return {
    palette,
    w,
    d,
    floors,
    fh,
    wall: paint(wall),
    trim,
    bands: true,
    doors: [
      { side: "front", at: +(-X / 2).toFixed(2) },
      { side: "back", at: +(-X / 2).toFixed(2) },
    ],
    windows: { step: 2.2, w: 1.0, sill: 0.9, head: 2.1 },
    extraHoles: [
      ...(shop ? [{ side: "front", floor: 0, a: c0 - 0.2, b: c1 - 0.3, y0: 0.6, y1: 2.3 }] : []),
      ...holes,
    ],
    stair: { axis: "z", a0, a1: +(a0 - L(fh)).toFixed(2), c0, c1 },
    parts: [
      {
        axis: "x",
        at: +(-Z + 3.2).toFixed(2),
        from: -X + 0.25,
        to: c0 - 0.15,
        doors: [+(-X / 2).toFixed(2)],
        floors: [0],
      },
    ],
    roof: { type: "gable", along, pitch, tint: roofTint, over: 0.35 },
    extra,
  };
}

/**
 * A Mediterranean flat-roofed house: the stair along the right wall up to a roof terrace (its
 * stair house over the top flight), a parapet round the roof.
 */
function terraceHouse({
  w,
  d,
  floors,
  fh = 3.0,
  wall,
  trim,
  palette,
  parts = [],
  extra,
  holes = [],
  doors,
}) {
  const X = w / 2,
    Z = d / 2;
  const c1 = +(X - 0.25).toFixed(2),
    c0 = +(c1 - 1.15).toFixed(2);
  const a0 = +(Z - 1.4).toFixed(2);
  return {
    palette,
    w,
    d,
    floors,
    fh,
    wall: paint(wall),
    trim,
    bands: floors > 2,
    doors: doors ?? [
      { side: "front", at: +(-X / 3).toFixed(2) },
      { side: "back", at: +(-X / 3).toFixed(2) },
    ],
    windows: { step: 2.6, w: 1.2, sill: 0.9, head: 2.2 },
    extraHoles: holes,
    stair: { axis: "z", a0, a1: +(a0 - L(fh)).toFixed(2), c0, c1 },
    roofAccess: true,
    parts,
    roof: { type: "flat", parapet: 1.0, coping: trim },
    extra,
  };
}

/** French doors on to a front balcony, centred on x, on each floor listed. */
const frenchDoors = (x, floors_) =>
  floors_.map((floor) => ({
    side: "front",
    floor,
    a: x - 0.6,
    b: x + 0.6,
    y0: 0,
    y1: 2.2,
    glass: false,
  }));

const B = {
  // ---------------------------------------------------------------- Fisher's Cove
  "cove-house-red": {
    title: "Harbour house (red)",
    use: "Fisher's Cove: a narrow red harbour house, two floors under a clay-tile gable",
    spec: harbourHouse({
      w: 6.5,
      d: 8,
      floors: 2,
      wall: [0.68, 0.18, 0.14],
      palette: 3,
      extra: flowerBoxes([-1.6], 1),
    }),
  },
  "cove-house-yellow": {
    title: "Harbour house (ochre)",
    use: "Fisher's Cove: a tall ochre harbour house, three floors, a balcony over the harbour",
    spec: harbourHouse({
      w: 6,
      d: 9,
      floors: 3,
      wall: [0.93, 0.72, 0.3],
      palette: 0,
      along: "x",
      pitch: 0.55,
      holes: frenchDoors(-1.2, [1]),
      extra: balcony(1, -2.4, 0, 1.0, WHITE_TRIM),
    }),
  },
  "cove-house-blue": {
    title: "Harbour house (blue)",
    use: "Fisher's Cove: a blue harbour house, two floors, a balcony over the door",
    spec: harbourHouse({
      w: 7,
      d: 8,
      floors: 2,
      wall: [0.42, 0.6, 0.78],
      palette: 5,
      holes: frenchDoors(-1.75, [1]),
      extra: balcony(1, -3.0, -0.5, 0.9, WHITE_TRIM),
    }),
  },
  "cove-house-green": {
    title: "Harbour shop (green)",
    use: "Fisher's Cove: the green chandlery on the quay, a shop window and an awning, a flat over it",
    spec: harbourHouse({
      w: 8,
      d: 8,
      floors: 2,
      wall: [0.4, 0.6, 0.48],
      palette: 7,
      shop: true,
      along: "x",
      pitch: 0.5,
      extra: awning(-3.9, 3.9, 2.55, 1.6, [0.8, 0.22, 0.2]),
    }),
  },
  "cove-house-salmon": {
    title: "Harbour house (salmon)",
    use: "Fisher's Cove: a tall salmon-pink harbour house, three floors",
    spec: harbourHouse({
      w: 6,
      d: 8,
      floors: 3,
      wall: [0.92, 0.56, 0.48],
      palette: 2,
      extra: flowerBoxes([-1.5], 1, [0.95, 0.85, 0.3]),
    }),
  },
  "cove-house-white": {
    title: "Harbour house (white)",
    use: "Fisher's Cove: a white harbour house with blue shutters' trim, two floors",
    spec: harbourHouse({
      w: 7,
      d: 9,
      floors: 2,
      wall: [0.95, 0.94, 0.9],
      trim: [0.2, 0.36, 0.6],
      palette: 6,
      along: "x",
      pitch: 0.6,
      extra: flowerBoxes([-1.75, 1.0], 1, [0.85, 0.25, 0.5]),
    }),
  },
  "cove-house-orange": {
    title: "Harbour house (orange)",
    use: "Fisher's Cove: an orange harbour house, two floors, a balcony to the sea",
    spec: harbourHouse({
      w: 6.5,
      d: 8.5,
      floors: 2,
      wall: [0.9, 0.5, 0.22],
      palette: 9,
      holes: frenchDoors(-1.6, [1]),
      extra: balcony(1, -2.9, -0.3, 0.9, WHITE_TRIM),
    }),
  },

  // ---------------------------------------------------------------- Bayview
  "bay-villa-white": {
    title: "Villa (white)",
    use: "Bayview: a white two-storey villa, a pergola over the front terrace, a roof terrace",
    spec: terraceHouse({
      w: 12,
      d: 10,
      floors: 2,
      wall: [0.96, 0.95, 0.92],
      trim: [0.25, 0.45, 0.65],
      palette: 2,
      parts: [{ axis: "z", at: 0.5, from: -4.75, to: 1.5, doors: [-2], floors: [0, 1] }],
      holes: frenchDoors(3.0, [1]),
      extra: all(
        terrace(-5.8, 1.6, 2.7, 2.6, [0.6, 0.42, 0.28]),
        balcony(1, 1.8, 4.2, 1.0, [0.96, 0.95, 0.92], [0.25, 0.45, 0.65]),
      ),
    }),
  },
  "bay-villa-cream": {
    title: "Villa (cream)",
    use: "Bayview: a cream villa with terracotta trim, two floors, a roof terrace",
    spec: terraceHouse({
      w: 10,
      d: 9,
      floors: 2,
      wall: [0.96, 0.88, 0.74],
      trim: [0.72, 0.36, 0.24],
      palette: 7,
      parts: [{ axis: "x", at: -1.0, from: -4.75, to: 2.5, doors: [-2.5], floors: [0, 1] }],
      holes: frenchDoors(-2.5, [1]),
      extra: balcony(1, -4.0, -1.0, 1.0, [0.96, 0.88, 0.74], [0.72, 0.36, 0.24]),
    }),
  },
  "bay-townhouse-pink": {
    title: "Town house (pink)",
    use: "Bayview: a narrow pink town house, three floors and a roof terrace",
    spec: terraceHouse({
      w: 7,
      d: 10,
      floors: 3,
      wall: [0.95, 0.74, 0.7],
      trim: WHITE_TRIM,
      palette: 4,
      holes: frenchDoors(-1.5, [1, 2]),
      extra: all(balcony(1, -2.7, -0.3, 0.8, WHITE_TRIM), balcony(2, -2.7, -0.3, 0.8, WHITE_TRIM)),
    }),
  },
  "bay-townhouse-yellow": {
    title: "Town house (yellow)",
    use: "Bayview: a narrow pale-yellow town house, three floors and a roof terrace",
    spec: terraceHouse({
      w: 7,
      d: 10,
      floors: 3,
      wall: [0.97, 0.88, 0.58],
      trim: [0.3, 0.5, 0.42],
      palette: 8,
      holes: frenchDoors(-1.5, [1, 2]),
      extra: all(
        balcony(1, -2.7, -0.3, 0.8, [0.3, 0.5, 0.42]),
        balcony(2, -2.7, -0.3, 0.8, [0.3, 0.5, 0.42]),
      ),
    }),
  },
  "bay-apartments": {
    title: "Marina apartments",
    use: "Bayview: a white block of flats over the marina, four floors, balconies, a roof terrace",
    spec: terraceHouse({
      w: 16,
      d: 11,
      floors: 4,
      wall: [0.95, 0.95, 0.93],
      trim: [0.2, 0.42, 0.62],
      palette: 1,
      doors: [
        { side: "front", at: 4.5 },
        { side: "back", at: 4.5 },
      ],
      // The flats either side of the stair hall (the stair along the right wall).
      parts: [
        { axis: "z", at: 3.2, from: -5.25, to: 5.25, doors: [3.6], floors: [0, 1, 2, 3] },
        { axis: "z", at: -2.5, from: -5.25, to: 5.25, doors: [-3.5, 3.0], floors: [0, 1, 2, 3] },
      ],
      holes: [...frenchDoors(-5.2, [1, 2, 3]), ...frenchDoors(0.3, [1, 2, 3])],
      extra: all(
        ...[1, 2, 3].flatMap((f) => [
          balcony(f, -6.6, -3.8, 1.2, [0.95, 0.95, 0.93], [0.2, 0.42, 0.62]),
          balcony(f, -1.1, 1.7, 1.2, [0.95, 0.95, 0.93], [0.2, 0.42, 0.62]),
        ]),
      ),
    }),
  },
  "bay-beach-club": {
    title: "Beach club",
    use: "Bayview: the glass-fronted beach club on the promenade, a roof terrace over the sea",
    spec: terraceHouse({
      w: 14,
      d: 9,
      floors: 1,
      fh: 3.4,
      wall: [0.97, 0.97, 0.95],
      trim: [0.15, 0.35, 0.55],
      palette: 2,
      doors: [
        { side: "front", at: -1.5, w: 2.4, h: 2.6, entrance: false },
        { side: "front", at: 2.5 },
        { side: "back", at: -4 },
      ],
      holes: [
        { side: "front", floor: 0, a: -6.4, b: -3.0, y0: 0.4, y1: 2.9 },
        { side: "front", floor: 0, a: 3.5, b: 5.2, y0: 0.4, y1: 2.9 },
      ],
      extra: terrace(-6.9, 5.2, 3.0, 3.0, [0.62, 0.44, 0.3]),
    }),
  },
};

const only = process.argv.slice(2);
// Footprints and door aprons for layout.ts (FOOT, ENTRANCE_APRONS): the size's plan (x, z at
// turn 0) and a point 1.2 m outside each door (3 m outside a gateway).
const PLAN = "src/lib/fps/br/location-buildings.json";
const plan = JSON.parse(fs.readFileSync(PLAN, "utf8"));
for (const [id, def] of Object.entries(B)) {
  if (only.length && !only.includes(id)) continue;
  const b = makeBuilding(def.spec);
  await publishTextured(id, b.k, b.far, {
    tag: TAG,
    title: def.title,
    source: "art/blender/br/build_coast.mjs",
    use: `${def.use} (procedural, 2026-11-17)`,
    class: "building",
    ring: "dwelling",
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
