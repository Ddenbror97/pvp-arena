/**
 * Our own Bauhaus-style apartment block (owner, 2026-11-04: "1." — an apartment block players
 * can enter, instead of the downloaded exterior shell): 4 storeys, white rendered walls, ribbon
 * windows, balcony bands rounding the south-east corner, a flat roof with a parapet and an
 * antenna. Inside: an entrance door on the west side into the stairwell (switchback stairs to
 * every floor), a corridor along the north wall, three flats per floor (two rooms each).
 *
 *   node art/blender/br/build_apartment.mjs        (run from the repo root)
 *
 * Writes public/fps/br/models/apartment.lod{0,1,2}.glb (one vertex-coloured draw each), its
 * collision boxes to art/br/procedural/apartment.boxes.json (build_collision.mjs reads them, mode
 * "boxes") and the models.json entry. Model space: metres, pivot at the bottom centre of the
 * walls, the balconies on +z (front), the entrance on −x. Original work (no third-party asset).
 */
import fs from "node:fs";
import { Document, NodeIO } from "@gltf-transform/core";

const W = 20,
  D = 12,
  STOREY = 3.2,
  FLOORS = 4,
  SLAB = 0.25,
  T = 0.3; // exterior wall
const X0 = -W / 2,
  X1 = W / 2,
  Z0 = -D / 2,
  Z1 = D / 2;
const C = {
  plaster: [0.93, 0.92, 0.89],
  inner: [0.84, 0.81, 0.75],
  floor: [0.5, 0.38, 0.27],
  stair: [0.6, 0.6, 0.58],
  glass: [0.13, 0.18, 0.24],
  frame: [0.16, 0.16, 0.17],
  roof: [0.55, 0.55, 0.53],
  rail: [0.2, 0.2, 0.21],
  wood: [0.42, 0.29, 0.18],
  bed: [0.45, 0.52, 0.62],
  sofa: [0.27, 0.36, 0.28],
  counter: [0.72, 0.72, 0.7],
};

/** Every part: [x0,y0,z0,x1,y1,z1], colour, collides?, lod (0: interior, 1: shell, 2: mass). */
const parts = [];
const box = (b, colour, { collide = true, lod = 1 } = {}) =>
  parts.push({ b: b.map((v) => +v.toFixed(3)), colour, collide, lod });

/**
 * A wall along `axis` (x or z) from a0 to a1, across from c0 to c1, between y0 and y1, with
 * rectangular holes [h0, h1, yLow, yHigh] (along the axis). Hole areas may hold glass.
 */
function wall(axis, a0, a1, c0, c1, y0, y1, holes, colour, opts = {}) {
  const cuts = [a0, a1, ...holes.flatMap((h) => [h[0], h[1]])].sort((p, q) => p - q);
  for (let i = 0; i + 1 < cuts.length; i++) {
    const s0 = cuts[i],
      s1 = cuts[i + 1];
    if (s1 - s0 < 1e-3) continue;
    const mid = (s0 + s1) / 2;
    const hole = holes.find((h) => mid > h[0] && mid < h[1]);
    const spans = hole
      ? [
          [y0, hole[2]],
          [hole[3], y1],
        ]
      : [[y0, y1]];
    for (const [ya, yb] of spans) {
      if (yb - ya < 1e-3) continue;
      box(axis === "x" ? [s0, ya, c0, s1, yb, c1] : [c0, ya, s0, c1, yb, s1], colour, opts);
    }
    if (hole?.[4]) {
      // Glass in the hole (visual: windows do not stop players walking — the sill does).
      const g = (c0 + c1) / 2;
      box(
        axis === "x"
          ? [s0, hole[2], g - 0.03, s1, hole[3], g + 0.03]
          : [g - 0.03, hole[2], s0, g + 0.03, hole[3], s1],
        C.glass,
        { collide: false, lod: opts.lod ?? 1 },
      );
    }
  }
}

// ------------------------------------------------------------------ the stairwell's footprint
const CORE_X1 = -6.7; // the core wall's west face
const FLIGHT_A = [X0 + T, -8.3],
  FLIGHT_B = [-8.1, CORE_X1];
const STAIR_Z0 = -3,
  STAIR_Z1 = 3,
  STEPS = 8;
const RISE = STOREY / 2 / STEPS,
  RUN = (STAIR_Z1 - STAIR_Z0) / STEPS;

for (let n = 0; n < FLOORS; n++) {
  const y = n * STOREY,
    top = (n + 1) * STOREY;
  const ribbon = (a0, a1) => [a0, a1, y + 0.9, y + 2.3, true];
  // Exterior walls: ribbon windows south and north, a window band east, the entrance west.
  wall("x", X0, X1, Z1 - T, Z1, y, top, [ribbon(-6.2, 9.2)], C.plaster);
  wall(
    "x",
    X0,
    X1,
    Z0,
    Z0 + T,
    y,
    top,
    n === 0 ? [[3.5, 4.7, y, y + 2.2], ribbon(-6.2, 2.9), ribbon(5.3, 9.2)] : [ribbon(-6.2, 9.2)],
    C.plaster,
  );
  wall("z", Z0 + T, Z1 - T, X1 - T, X1, y, top, [ribbon(-4, 4)], C.plaster);
  wall(
    "z",
    Z0 + T,
    Z1 - T,
    X0,
    X0 + T,
    y,
    top,
    n === 0
      ? [
          [-5.4, -4.2, y, y + 2.2],
          [-1.6, 1.6, y + 1.0, y + 2.6, true],
        ]
      : [[-1.6, 1.6, y + 1.0, y + 2.6, true]],
    C.plaster,
  );
  // Floor slab of this storey (not the ground floor: that is the pad), with the stair opening.
  if (n > 0) {
    box([X0 + T, y - SLAB, Z0 + T, CORE_X1, y, STAIR_Z0], C.floor, { lod: 0 });
    box([CORE_X1, y - SLAB, Z0 + T, X1 - T, y, Z1 - T], C.floor, { lod: 0 });
  } else box([X0 + T, 0, Z0 + T, X1 - T, 0.02, Z1 - T], C.floor, { collide: false, lod: 0 });
  // Interior walls (0.15 m): the core wall with its door, the corridor wall with three flat
  // doors, the party walls, and a wall across each flat with a doorway between its two rooms.
  const ceil = top - SLAB;
  wall("z", Z0 + T, Z1 - T, CORE_X1, CORE_X1 + 0.15, y, ceil, [[-5.2, -4.0, y, y + 2.2]], C.inner, {
    lod: 0,
  });
  wall(
    "x",
    CORE_X1 + 0.15,
    X1 - T,
    -4.2,
    -4.05,
    y,
    ceil,
    [
      [-4.5, -3.5, y, y + 2.2],
      [1.0, 2.0, y, y + 2.2],
      [6.5, 7.5, y, y + 2.2],
    ],
    C.inner,
    { lod: 0 },
  );
  for (const px of [-1.25, 4.2]) box([px, y, -4.05, px + 0.15, ceil, Z1 - T], C.inner, { lod: 0 });
  for (const [fx0, fx1] of [
    [CORE_X1 + 0.15, -1.25],
    [-1.1, 4.2],
    [4.35, X1 - T],
  ])
    wall(
      "x",
      fx0,
      fx1,
      0.95,
      1.1,
      y,
      ceil,
      [[(fx0 + fx1) / 2 - 0.5, (fx0 + fx1) / 2 + 0.5, y, y + 2.2]],
      C.inner,
      { lod: 0 },
    );
  // Furniture (owner 2026-11-04: "add furnitures"): cover in every flat, kept off the straight
  // path from the corridor door through the room door (the flat's middle ±0.9 m).
  for (const [fx0, fx1] of [
    [CORE_X1 + 0.15, -1.25],
    [-1.1, 4.2],
    [4.35, X1 - T],
  ]) {
    const f = (b, colour) => box([b[0], y + b[1], b[2], b[3], y + b[4], b[5]], colour, { lod: 0 });
    // Bedroom (back): bed in the west corner, wardrobe against the east wall.
    f([fx0 + 0.1, 0, -1.2, fx0 + 1.5, 0.55, 0.85], C.bed);
    f([fx0 + 0.1, 0, 0.55, fx0 + 1.5, 0.95, 0.85], C.wood);
    f([fx1 - 0.65, 0, -3.9, fx1 - 0.05, 2.0, -2.6], C.wood);
    // Living room (front): sofa and low table west, kitchen counter east.
    f([fx0 + 0.1, 0, 2.3, fx0 + 1.0, 0.85, 4.4], C.sofa);
    f([fx0 + 1.25, 0, 2.9, fx0 + 1.85, 0.45, 3.9], C.wood);
    f([fx1 - 0.65, 0, 2.0, fx1 - 0.05, 0.9, 4.6], C.counter);
  }
  // Stairs up to the next floor (from the top floor: up to the roof, owner 2026-11-04: "make so
  // you can access the roof"): flight A north→south along the west wall, the half landing,
  // flight B back to the next floor's landing. Steps and landing are 0.3 m thick (a solid mass
  // would leave too little headroom on the flight below the next one).
  {
    const step = (x0, x1, z0, z1, t) =>
      box([x0, Math.max(y, t - 0.3), z0, x1, t, z1], C.stair, { lod: 0 });
    for (let k = 0; k < STEPS; k++) {
      step(
        FLIGHT_A[0],
        FLIGHT_A[1],
        STAIR_Z0 + k * RUN,
        STAIR_Z0 + (k + 1) * RUN,
        y + (k + 1) * RISE,
      );
      step(
        FLIGHT_B[0],
        FLIGHT_B[1],
        STAIR_Z1 - (k + 1) * RUN,
        STAIR_Z1 - k * RUN,
        y + STOREY / 2 + (k + 1) * RISE,
      );
    }
    step(FLIGHT_A[0], CORE_X1, STAIR_Z1, Z1 - T, y + STOREY / 2);
    // The divider between the flights (a wall, so nobody drops off a flight).
    box([FLIGHT_A[1], y, STAIR_Z0, FLIGHT_B[0], top + 1.0, STAIR_Z1], C.inner, { lod: 0 });
  }
  // Balcony band on the front (floors 1–3), its corner rounding the south-east (visual quarter
  // disc), and a railing (metal, solid to 1 m).
  if (n > 0) {
    box([-6.4, y - 0.2, Z1, X1, y, Z1 + 1.4], C.plaster);
    box([-6.4, y, Z1 + 1.3, X1, y + 1.0, Z1 + 1.4], C.rail, { lod: 1 });
  }
}
// Roof slab (open over the stairs), parapet, the stair house with its door onto the roof, and an
// antenna on the stair house.
const H = FLOORS * STOREY;
box([X0, H - SLAB, Z0, CORE_X1, H, STAIR_Z0], C.roof);
box([CORE_X1, H - SLAB, Z0, X1, H, Z1], C.roof);
box([X0, H, Z0, X1, H + 0.8, Z0 + 0.25], C.plaster);
box([X0, H, Z1 - 0.25, X1, H + 0.8, Z1], C.plaster);
box([X0, H, Z0, X0 + 0.25, H + 0.8, Z1], C.plaster);
box([X1 - 0.25, H, Z0, X1, H + 0.8, Z1], C.plaster);
const SH = H + 3.0; // the stair house's ceiling
wall("z", Z0 + T, Z1 - T, X0, X0 + T, H, SH, [], C.plaster);
wall("x", X0, CORE_X1 + 0.15, Z0, Z0 + T, H, SH, [], C.plaster);
wall("x", X0, CORE_X1 + 0.15, Z1 - T, Z1, H, SH, [], C.plaster);
wall("z", Z0 + T, Z1 - T, CORE_X1, CORE_X1 + 0.15, H, SH, [[-5.2, -4.0, H, H + 2.2]], C.plaster);
box([X0, SH, Z0, CORE_X1 + 0.15, SH + 0.2, Z1], C.roof);
box([-8.3, SH + 0.2, -0.05, -8.2, SH + 3.4, 0.05], C.rail, { collide: false });
box([-9.2, SH + 2.6, -0.03, -7.3, SH + 2.68, 0.03], C.rail, { collide: false });
box([-8.9, SH + 1.9, -0.03, -7.6, SH + 1.98, 0.03], C.rail, { collide: false });

// ------------------------------------------------------------------ meshes
/** Quarter-disc fans (the balcony corners) as extra triangles, visual only. */
function quarterDiscs() {
  const out = [];
  for (let n = 1; n < FLOORS; n++) {
    const y = n * STOREY;
    const segs = 8,
      r = 1.4;
    for (let s = 0; s < segs; s++) {
      const a0 = (s / segs) * (Math.PI / 2),
        a1 = ((s + 1) / segs) * (Math.PI / 2);
      const p = (a, yy) => [X1 + Math.sin(a) * r, yy, Z1 + Math.cos(a) * r - 0.0];
      const c = [X1, 0, Z1];
      for (const yy of [y, y - 0.2]) {
        const tri = [[c[0], yy, c[2]], p(a0, yy), p(a1, yy)];
        out.push({ tri: yy === y ? tri : [tri[0], tri[2], tri[1]], colour: C.plaster });
      }
      // Rim (two triangles) and the railing's curve.
      out.push({ tri: [p(a0, y), p(a0, y - 0.2), p(a1, y - 0.2)], colour: C.plaster });
      out.push({ tri: [p(a0, y), p(a1, y - 0.2), p(a1, y)], colour: C.plaster });
      out.push({ tri: [p(a0, y + 1), p(a0, y), p(a1, y)], colour: C.rail });
      out.push({ tri: [p(a0, y + 1), p(a1, y), p(a1, y + 1)], colour: C.rail });
    }
  }
  return out;
}

function geometry(maxLod) {
  const pos = [],
    nrm = [],
    col = [];
  const quad = (a, b, c, d, n, colour) => {
    for (const v of [a, b, c, a, c, d]) {
      pos.push(...v);
      nrm.push(...n);
      col.push(...colour, 1);
    }
  };
  for (const p of parts) {
    if (p.lod < maxLod) continue;
    const [x0, y0, z0, x1, y1, z1] = p.b;
    const c = p.colour;
    quad([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [0, 1, 0], c);
    quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0], c);
    quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], c);
    quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], c);
    quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], c);
    quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], c);
  }
  if (maxLod <= 1)
    for (const { tri, colour } of quarterDiscs()) {
      const [a, b, c] = tri;
      const u = b.map((v, i) => v - a[i]),
        w = c.map((v, i) => v - a[i]);
      const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
      const l = Math.hypot(...n) || 1;
      for (const v of tri) {
        pos.push(...v);
        nrm.push(...n.map((x) => x / l));
        col.push(...colour, 1);
      }
    }
  return { pos: new Float32Array(pos), nrm: new Float32Array(nrm), col: new Float32Array(col) };
}

/** LOD2: the mass (one box), the balcony bands and a dark band per window row. */
function farParts() {
  parts.length = 0;
  box([X0, 0, Z0, X1, FLOORS * STOREY + 0.8, Z1], C.plaster, { lod: 2 });
  for (let n = 0; n < FLOORS; n++) {
    const y = n * STOREY;
    box([-6.2, y + 0.9, Z1, 9.2, y + 2.3, Z1 + 0.02], C.glass, { lod: 2 });
    box([-6.2, y + 0.9, Z0 - 0.02, 9.2, y + 2.3, Z0], C.glass, { lod: 2 });
    if (n > 0) box([-6.4, y - 0.2, Z1, X1, y + 1.0, Z1 + 1.4], C.plaster, { lod: 2 });
  }
}

const io = new NodeIO();
async function write(file, g) {
  const doc = new Document();
  const buf = doc.createBuffer();
  const mat = doc
    .createMaterial("apartment")
    .setBaseColorFactor([1, 1, 1, 1])
    .setRoughnessFactor(0.9)
    .setMetallicFactor(0);
  const prim = doc
    .createPrimitive()
    .setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(g.pos).setBuffer(buf))
    .setAttribute("NORMAL", doc.createAccessor().setType("VEC3").setArray(g.nrm).setBuffer(buf))
    .setAttribute("COLOR_0", doc.createAccessor().setType("VEC4").setArray(g.col).setBuffer(buf))
    .setMaterial(mat);
  const mesh = doc.createMesh("apartment").addPrimitive(prim);
  doc.createScene().addChild(doc.createNode("apartment").setMesh(mesh));
  await io.write(file, doc);
  return { tris: g.pos.length / 9, kB: Math.round(fs.statSync(file).size / 1024) };
}

const OUT = "public/fps/br/models";
const collision = parts.filter((p) => p.collide).map((p) => p.b);
const lods = [];
lods.push(await write(`${OUT}/apartment.lod0.glb`, geometry(0)));
lods.push(await write(`${OUT}/apartment.lod1.glb`, geometry(1)));
farParts();
lods.push(await write(`${OUT}/apartment.lod2.glb`, geometry(2)));
fs.mkdirSync("art/br/procedural", { recursive: true });
fs.writeFileSync("art/br/procedural/apartment.boxes.json", JSON.stringify(collision) + "\n");
const size = [W, +(FLOORS * STOREY + 6.4).toFixed(2), +(D + 1.4).toFixed(2)];
const manifestPath = `${OUT}/models.json`;
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
manifest.models.apartment = {
  title: "Bauhaus apartment block",
  author: "PvPSpinArena",
  source: "art/blender/br/build_apartment.mjs",
  licence: "Original work (procedural)",
  class: "building",
  ring: "dwelling",
  use: "enterable apartment blocks (Northstar, Millhaven)",
  scale: 1,
  sourceTris: lods[0].tris,
  size,
  lods: lods.map((l, i) => ({
    file: `/fps/br/models/apartment.lod${i}.glb`,
    tris: l.tris,
    draws: 1,
    textureMB: 0,
    kB: l.kB,
    size,
  })),
};
manifest.models = Object.fromEntries(
  Object.entries(manifest.models).sort(([a], [b]) => a.localeCompare(b)),
);
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1) + "\n");
console.log(
  `apartment: ${lods.map((l) => l.tris).join(" / ")} tris, ${collision.length} collision boxes`,
);
