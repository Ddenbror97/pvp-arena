/**
 * The Arena District's car park (`parking-deck`), procedural (owner, 2026-11-15: "ground
 * flicker here", the screenshot by the arena among a grid of bare posts). The download it
 * replaces ("Parking garage" by Idmenthal) was only a floor and its columns: no deck on them, and
 * its floor lay on the ground's own plane, so the two took turns pixel by pixel.
 *
 * Now a two-level open car park in the same 24 × 21.2 m footprint: a ground slab standing 0.12 m
 * proud of the ground (a kerb, nothing coplanar), a column grid, an upper deck at 3.4 m with a
 * parapet, and a ramp up to it along the north side (risers of 0.1 m: cars and bikes drive up,
 * players walk up). Bay lines on both levels, lamp posts on the deck.
 *
 *   node art/blender/br/build_carpark.mjs
 *
 * Model space: metres, pivot at the bottom centre, front +z at turn 0.
 */
import { COLOURS as C, createKit, publish } from "./procedural-kit.mjs";

const X = 12,
  Z = 10.6;
const KERB = 0.12;
const DECK = 3.4,
  SLAB = 0.35;
const RAMP_Z0 = 6.5; // the ramp's strip (z 6.5..10.6), rising along +x from x -12 to RAMP_X1
const RAMP_X1 = 8;
const RISERS = 34;
const K = {
  concrete: [0.62, 0.62, 0.6],
  deck: [0.5, 0.5, 0.49],
  column: [0.7, 0.7, 0.68],
  paint: [0.92, 0.88, 0.55],
  white: [0.9, 0.9, 0.88],
  parapet: [0.66, 0.66, 0.63],
  stripe: [0.85, 0.65, 0.15],
};

const k = createKit();
const far = createKit();

// Ground slab (a kerb's height proud of the ground).
k.box([-X, 0, -Z, X, KERB, Z], K.deck);
// Columns: a 6 m grid, under the deck (not in the ramp's strip, which is open above).
const colsX = [-X + 0.3, -6, 0, 6, X - 0.3];
const colsZ = [-Z + 0.3, -2, RAMP_Z0 - 0.3];
for (const cx of colsX)
  for (const cz of colsZ)
    k.box([cx - 0.25, KERB, cz - 0.25, cx + 0.25, DECK - SLAB, cz + 0.25], K.column);
for (const cx of [RAMP_X1, X - 0.3])
  k.box([cx - 0.25, KERB, Z - 0.55, cx + 0.25, DECK - SLAB, Z - 0.05], K.column);

// The upper deck: everything but the ramp's strip west of its head.
k.box([-X, DECK - SLAB, -Z, X, DECK, RAMP_Z0], K.deck);
k.box([RAMP_X1, DECK - SLAB, RAMP_Z0, X, DECK, Z], K.deck);
// Its edge band (a darker fascia), round the outside only.
k.box([-X - 0.05, DECK - SLAB - 0.15, -Z - 0.05, X + 0.05, DECK - SLAB, -Z + 0.3], K.concrete, {
  collide: false,
});
k.box([-X - 0.05, DECK - SLAB - 0.15, -Z + 0.3, -X + 0.3, DECK - SLAB, RAMP_Z0], K.concrete, {
  collide: false,
});
k.box([X - 0.3, DECK - SLAB - 0.15, -Z + 0.3, X + 0.05, DECK - SLAB, Z + 0.05], K.concrete, {
  collide: false,
});

// The ramp: risers of DECK / RISERS along +x from the ground slab to the deck (one box a
// riser, the tread's top at its higher end: an open soffit, headroom under nothing).
const run = (RAMP_X1 + X) / RISERS;
for (let i = 0; i < RISERS; i++) {
  const x0 = -X + i * run,
    x1 = x0 + run;
  const top = KERB + ((DECK - KERB) * (i + 1)) / RISERS;
  k.box([x0, Math.max(KERB, top - 0.35), RAMP_Z0 + 0.2, x1, top, Z - 0.6], K.deck);
}
// The ramp's walls: the outer (north) one and the inner one along the deck's edge (above the
// deck it is the deck's parapet).
k.box([-X, KERB, Z - 0.6, RAMP_X1, DECK + 1.0, Z], K.parapet);
k.box([-X + 2.5, KERB, RAMP_Z0, RAMP_X1, DECK - SLAB, RAMP_Z0 + 0.2], K.parapet);

// Parapets round the deck (1.0 m), open where the ramp arrives (x RAMP_X1..X at the ramp strip).
k.box([-X, DECK, -Z, X, DECK + 1.0, -Z + 0.2], K.parapet);
k.box([-X, DECK, -Z + 0.2, -X + 0.2, DECK + 1.0, RAMP_Z0 + 0.2], K.parapet);
k.box([X - 0.2, DECK, -Z + 0.2, X, DECK + 1.0, Z], K.parapet);
k.box([-X + 0.2, DECK, RAMP_Z0, RAMP_X1, DECK + 1.0, RAMP_Z0 + 0.2], K.parapet);
k.box([RAMP_X1, DECK, Z - 0.2, X - 0.2, DECK + 1.0, Z], K.parapet);
// A yellow-black stripe on the parapets' tops.
k.box([-X, DECK + 1.0, -Z, X, DECK + 1.04, -Z + 0.2], K.stripe, { collide: false });

// Bay lines: across the deck and the ground slab, two rows facing a middle aisle.
for (const y of [KERB, DECK])
  for (let x = -X + 2.6; x < X - 2; x += 2.6)
    for (const [z0, z1] of [
      [-Z + 0.4, -Z + 5.4],
      [RAMP_Z0 - 5.2, RAMP_Z0 - 0.4],
    ]) {
      if (y === DECK || z1 < RAMP_Z0)
        k.box([x - 0.06, y, z0, x + 0.06, y + 0.012, z1], K.white, { collide: false, lod: 0 });
    }
// Lamp posts on the deck.
for (const [lx, lz] of [
  [-6, -2],
  [6, -2],
])
  k.box([lx - 0.08, DECK, lz - 0.08, lx + 0.08, DECK + 4.2, lz + 0.08], C.rail);

// The far LOD: the slab, the deck and its parapet, the ramp's wall.
far.box([-X, 0, -Z, X, KERB, Z], K.deck, { collide: false, lod: 2 });
far.box([-X, DECK - SLAB, -Z, X, DECK + 1.0, RAMP_Z0], K.parapet, { collide: false, lod: 2 });
far.box([-X, KERB, Z - 0.6, X, DECK + 1.0, Z], K.parapet, { collide: false, lod: 2 });
for (const cx of [-X + 0.3, 0, X - 0.3])
  for (const cz of [-Z + 0.3, RAMP_Z0 - 0.3])
    far.box([cx - 0.25, KERB, cz - 0.25, cx + 0.25, DECK - SLAB, cz + 0.25], K.column, {
      collide: false,
      lod: 2,
    });

await publish("parking-deck", k, far, {
  tag: "carpark-v1",
  title: "Arena car park",
  source: "art/blender/br/build_carpark.mjs",
  use: "Arena District (2026-11-15): a two-level open car park, ramp to the upper deck",
  class: "building",
  ring: "outbuilding",
  size: [2 * X, DECK + 4.2, 2 * Z],
});
