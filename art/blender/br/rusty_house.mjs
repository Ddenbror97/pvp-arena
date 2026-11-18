/**
 * The rusty stilt house made enterable (owner, 2026-11-18: "it cant be entered fix that and fix
 * the stairs").
 *
 * The owner's download (`rusty-house`, an AI-made scan) is a closed shell: its walls have no
 * openings, the front block is one hollow from the floor to the roof, and the collision was its
 * voxels (the stairs 30 cm blocks, the rooms solid). Here, on its LOD0:
 *  - doorways are cut through the walls (`DOORS`), each faced with plank jambs and a head;
 *  - the front block gets a floor at the deck's height and an upper floor at the balconies'
 *    (`SLABS`), so it is two rooms, one over the other;
 *  - the material is drawn double-sided, so the inside of the shell is a wall from within.
 * The collision is authored (`art/br/procedural/rusty-house.boxes.json`): the decks solid down
 * to the ground, the walls with their doorways, the floors, the roofs, the rails, and the three
 * flights as ramps of 5 cm steps (as the other buildings' stairs).
 *
 * Model space: y up from the stilts' feet, +z the front (porch), +x the veranda side.
 *
 *   node art/blender/br/rusty_house.mjs <manifest.json> <tag>
 * writes public/fps/br/models/rusty-house.<tag>.lod0.glb and the boxes file; then
 * kit collision "boxes", build_collision ONLY=rusty-house, add_models.
 */
import fs from "node:fs";
import path from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dequantize, meshopt, prune, unweld, weld } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });

const [manifestName, tag] = process.argv.slice(2);
if (!manifestName || !tag) throw new Error("usage: rusty_house.mjs <manifest.json> <tag>");
const ID = "rusty-house";
const DIR = "public/fps/br/models";

/** The deck (ground floor) and the upper floor (m). */
const DECK = 1.2,
  UPPER = 3.42;
/** Doorways: the wall's axis (0 x, 2 z) and plane, how far either side of it to cut, the
 * opening along the wall (`u`, the other horizontal axis) and its height. */
const DOORS = [
  // From the veranda into the back room (its walls 15 cm thick: 0.65 and 0.8).
  { axis: 0, at: 0.725, tol: 0.13, u: [-1.25, -0.25], y: [DECK - 0.1, DECK + 2.05] },
  // From the veranda into the front room.
  { axis: 0, at: 0.775, tol: 0.1, u: [0.75, 1.75], y: [DECK - 0.1, DECK + 2.05] },
  // Between the rooms.
  { axis: 2, at: 0.375, tol: 0.1, u: [-1.45, -0.45], y: [DECK - 0.1, DECK + 2.05] },
  // From the front room onto the porch.
  { axis: 2, at: 3.55, tol: 0.1, u: [-0.45, 0.55], y: [DECK - 0.1, DECK + 2.05] },
  // Upstairs: from the side balcony (the stair's top) into the upper room ...
  { axis: 0, at: 1.22, tol: 0.1, u: [0.6, 1.6], y: [UPPER - 0.1, UPPER + 2.0] },
  // ... and from the upper room onto the front balcony.
  { axis: 2, at: 3.55, tol: 0.1, u: [-0.45, 0.55], y: [UPPER - 0.1, UPPER + 2.0] },
];
/** Floors added inside the front block: [x0, z0, x1, z1, top, thickness]. */
const SLABS = [
  [-2.6, 0.38, 0.78, 3.53, DECK, 0.06],
  [-2.6, 0.38, 1.2, 3.53, UPPER, 0.12],
];

const manifest = JSON.parse(fs.readFileSync(path.join(DIR, manifestName), "utf8"));
const lod0 = manifest.models[ID].lods[0].file;
const doc = await io.read("public" + lod0);
await doc.transform(dequantize(), unweld());
const root = doc.getRoot();
const node = root.listNodes().find((n) => n.getMesh());
const prim = node.getMesh().listPrimitives()[0];
const W = node.getWorldMatrix();
const scale = Math.hypot(W[0], W[1], W[2]);
const T = [W[12], W[13], W[14]];
const toModel = (p) => [p[0] * scale + T[0], p[1] * scale + T[1], p[2] * scale + T[2]];
const toLocal = (p) => [(p[0] - T[0]) / scale, (p[1] - T[1]) / scale, (p[2] - T[2]) / scale];

const P = prim.getAttribute("POSITION"),
  N = prim.getAttribute("NORMAL"),
  UV = prim.getAttribute("TEXCOORD_0");
const count = P.getCount();
const verts = [];
for (let i = 0; i < count; i++)
  verts.push({ p: toModel(P.getElement(i, [])), n: N.getElement(i, []), uv: UV.getElement(i, []) });

const lerp = (a, b, f) => a.map((x, k) => x + (b[k] - x) * f);
const mix = (a, b, f) => ({ p: lerp(a.p, b.p, f), n: lerp(a.n, b.n, f), uv: lerp(a.uv, b.uv, f) });

/** The part of a convex polygon on the side of `keep(v) >= 0`. */
function clip(poly, side) {
  const out = [];
  for (let k = 0; k < poly.length; k++) {
    const a = poly[k],
      b = poly[(k + 1) % poly.length];
    const sa = side(a),
      sb = side(b);
    if (sa >= 0) out.push(a);
    if (sa >= 0 !== sb >= 0) out.push(mix(a, b, sa / (sa - sb)));
  }
  return out;
}

/** A triangle with a door's opening taken out: the convex pieces left. */
function cut(tri, d) {
  const o = d.axis === 0 ? 2 : 0;
  const lines = [
    (v) => d.u[0] - v.p[o], // left of the opening
    (v) => v.p[o] - d.u[1], // right of it
    (v) => d.y[0] - v.p[1], // under it
    (v) => v.p[1] - d.y[1], // over it
  ];
  const pieces = [];
  let rest = tri;
  for (const line of lines) {
    if (rest.length < 3) break;
    const outside = clip(rest, line);
    if (outside.length >= 3) pieces.push(outside);
    rest = clip(rest, (v) => -line(v));
  }
  return pieces;
}

const area = (q) => {
  const [a, b, c] = q.map((v) => v.p);
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]],
    w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  return (
    Math.hypot(u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]) / 2
  );
};

let tris = [];
for (let i = 0; i < count; i += 3) tris.push([verts[i], verts[i + 1], verts[i + 2]]);
const before = tris.length;
let removed = 0;
for (const d of DOORS) {
  const o = d.axis === 0 ? 2 : 0;
  const next = [];
  for (const t of tris) {
    const near = t.every((v) => Math.abs(v.p[d.axis] - d.at) < d.tol);
    const lo = Math.min(...t.map((v) => v.p[o])),
      hi = Math.max(...t.map((v) => v.p[o])),
      ylo = Math.min(...t.map((v) => v.p[1])),
      yhi = Math.max(...t.map((v) => v.p[1]));
    if (!near || hi <= d.u[0] || lo >= d.u[1] || yhi <= d.y[0] || ylo >= d.y[1]) {
      next.push(t);
      continue;
    }
    removed++;
    for (const piece of cut(t, d))
      for (let k = 1; k + 1 < piece.length; k++) {
        const q = [piece[0], piece[k], piece[k + 1]];
        if (area(q) > 1e-6) next.push(q);
      }
  }
  tris = next;
}

// A patch of the veranda's planks for the new faces: the largest deck triangle facing up.
let src = null,
  best = 0;
for (const t of tris) {
  const c = [0, 1, 2].map((k) => (t[0].p[k] + t[1].p[k] + t[2].p[k]) / 3);
  const up = t.every((v) => v.n[1] > 0.9);
  if (!up || Math.abs(c[1] - DECK) > 0.06 || c[0] < 0.85 || c[0] > 2.2) continue;
  const a = area(t);
  if (a > best) ((best = a), (src = t));
}
if (!src) throw new Error("no deck plank to take the texture from");
// Barycentric patch: a small triangle round the source's centre, so every tile stays on it.
const centre = [0, 1].map((k) => (src[0].uv[k] + src[1].uv[k] + src[2].uv[k]) / 3);
const shrink = 0.45;
const patch = src.map((v) => centre.map((c, k) => c + (v.uv[k] - c) * shrink));
const tileUV = (fu, fv) =>
  [0, 1].map(
    (k) =>
      patch[0][k] + (patch[1][k] - patch[0][k]) * fu + (patch[2][k] - patch[0][k]) * fv * (1 - fu),
  );

const added = [];
/** A quad (corners in order) cut into tiles of about `size` m, each mapped onto the patch. */
function quad(a, b, c, d, n, size = 0.6) {
  const len = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
  const nu = Math.max(1, Math.round(len(a, b) / size)),
    nv = Math.max(1, Math.round(len(a, d) / size));
  const at = (fu, fv) => {
    const top = lerp(a, b, fu),
      bot = lerp(d, c, fu);
    return lerp(top, bot, fv);
  };
  for (let i = 0; i < nu; i++)
    for (let j = 0; j < nv; j++) {
      const corners = [
        [i / nu, j / nv],
        [(i + 1) / nu, j / nv],
        [(i + 1) / nu, (j + 1) / nv],
        [i / nu, (j + 1) / nv],
      ];
      const v = corners.map(([fu, fv], k) => ({
        p: at(fu, fv),
        n,
        uv: tileUV(k === 1 || k === 2 ? 0.9 : 0.05, k >= 2 ? 0.9 : 0.05),
      }));
      added.push([v[0], v[1], v[2]], [v[0], v[2], v[3]]);
    }
}
/** A box's six faces (outward). */
function box([x0, y0, z0, x1, y1, z1]) {
  quad([x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], [0, 1, 0]);
  quad([x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x0, y0, z0], [0, -1, 0]);
  quad([x0, y1, z1], [x1, y1, z1], [x1, y0, z1], [x0, y0, z1], [0, 0, 1]);
  quad([x1, y1, z0], [x0, y1, z0], [x0, y0, z0], [x1, y0, z0], [0, 0, -1]);
  quad([x1, y1, z1], [x1, y1, z0], [x1, y0, z0], [x1, y0, z1], [1, 0, 0]);
  quad([x0, y1, z0], [x0, y1, z1], [x0, y0, z1], [x0, y0, z0], [-1, 0, 0]);
}
for (const [x0, z0, x1, z1, top, th] of SLABS) box([x0, top - th, z0, x1, top, z1]);
// Plank jambs and a head round each doorway, 10 cm wide, through the wall and 5 cm proud of it.
for (const d of DOORS) {
  const depth = Math.max(d.tol, 0.1) + 0.05;
  const B = (u0, u1, y0, y1) =>
    d.axis === 0
      ? box([d.at - depth, y0, u0, d.at + depth, y1, u1])
      : box([u0, y0, d.at - depth, u1, y1, d.at + depth]);
  const floor = d.y[0] + 0.1;
  B(d.u[0] - 0.1, d.u[0], floor, d.y[1] + 0.1);
  B(d.u[1], d.u[1] + 0.1, floor, d.y[1] + 0.1);
  B(d.u[0] - 0.1, d.u[1] + 0.1, d.y[1], d.y[1] + 0.12);
}

// Winding: keep each new face's order matching its normal.
for (const t of added) {
  const [a, b, c] = t.map((v) => v.p);
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]],
    w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const g = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
  if (g[0] * t[0].n[0] + g[1] * t[0].n[1] + g[2] * t[0].n[2] < 0) [t[1], t[2]] = [t[2], t[1]];
}
const all = [...tris, ...added];
const pos = new Float32Array(all.length * 9),
  nor = new Float32Array(all.length * 9),
  uvs = new Float32Array(all.length * 6);
all.forEach((t, i) =>
  t.forEach((v, k) => {
    pos.set(toLocal(v.p), (i * 3 + k) * 3);
    nor.set(v.n, (i * 3 + k) * 3);
    uvs.set(v.uv, (i * 3 + k) * 2);
  }),
);
P.setArray(pos);
N.setArray(nor);
UV.setArray(uvs);
prim.getMaterial().setDoubleSided(true);
await doc.transform(
  weld(),
  prune(),
  meshopt({ encoder: MeshoptEncoder, level: "medium", quantizePosition: 16 }),
);
const out = `/fps/br/models/${ID}.${tag}.lod0.glb`;
await io.write("public" + out, doc);
console.log(
  `${ID} lod0: ${before} → ${all.length} tris (${removed} cut at ${DOORS.length} doorways, ${added.length} added) → ${out}`,
);

// ---- Collision ----
/** Steps of at most 5 cm from (y0 at u0) to (y1 at u1) along `axis`, solid down to `base`. */
function ramp(axis, u0, u1, y0, y1, a0, a1, base) {
  const n = Math.ceil(Math.abs(y1 - y0) / 0.05),
    boxes = [];
  for (let i = 0; i < n; i++) {
    const f0 = i / n,
      f1 = (i + 1) / n;
    const ua = u0 + (u1 - u0) * f0,
      ub = u0 + (u1 - u0) * f1;
    const top = y0 + (y1 - y0) * f1;
    const [lo, hi] = [Math.min(ua, ub), Math.max(ua, ub)];
    boxes.push(axis === 2 ? [a0, base, lo, a1, top, hi] : [lo, base, a0, hi, top, a1]);
  }
  return boxes;
}
/** A box with some boxes taken out (each cut only along the axes it spans). */
function minus(b, ...cuts) {
  let parts = [b];
  for (const c of cuts) {
    const next = [];
    for (const q of parts) {
      if ([0, 1, 2].some((k) => q[k + 3] <= c[k] || q[k] >= c[k + 3])) {
        next.push(q);
        continue;
      }
      const r = [...q];
      for (let k = 0; k < 3; k++) {
        if (r[k] < c[k]) {
          const s = [...r];
          s[k + 3] = c[k];
          next.push(s);
          r[k] = c[k];
        }
        if (r[k + 3] > c[k + 3]) {
          const s = [...r];
          s[k] = c[k + 3];
          next.push(s);
          r[k + 3] = c[k + 3];
        }
      }
    }
    parts = next;
  }
  return parts;
}
const doorHole = (d) => {
  const o = d.axis === 0 ? 2 : 0;
  const c = [0, 0, 0, 0, 0, 0];
  c[d.axis] = d.at - 1;
  c[d.axis + 3] = d.at + 1;
  c[o] = d.u[0];
  c[o + 3] = d.u[1];
  c[1] = d.y[0] + 0.1;
  c[4] = d.y[1];
  return c;
};
const holes = DOORS.map(doorHole);
const R = 1.0; // rail height
const boxes = [
  // Decks, solid to the ground (no crawling under the house): the body, the veranda, the porch.
  [-2.75, 0, -4.25, 0.8, DECK, 3.6],
  [0.8, 0, -4.25, 2.3, DECK, 3.6],
  [-2.9, 0, 3.6, 2.25, DECK, 4.5],
  // Ground-floor walls (doorways cut out).
  ...minus([-2.75, DECK, -4.25, -2.6, 3.4, 0.35]),
  ...minus([-2.75, DECK, -4.25, 0.8, 3.4, -4.1]),
  ...minus([0.65, DECK, -4.25, 0.8, 3.4, 0.35], ...holes),
  ...minus([-2.75, DECK, 0.3, 0.8, UPPER - 0.12, 0.42], ...holes),
  ...minus([0.7, DECK, 0.42, 0.85, UPPER - 0.12, 3.6], ...holes),
  ...minus([-2.75, DECK, 3.5, 0.8, UPPER - 0.12, 3.6], ...holes),
  ...minus([-2.75, UPPER - 0.12, 3.5, 1.25, 5.45, 3.6], ...holes),
  // The front block's left wall to the eaves, the upper floor, the upper room's walls.
  [-2.75, DECK, 0.35, -2.6, 5.45, 3.6],
  [-2.75, UPPER - 0.12, 0.42, 1.25, UPPER, 3.5],
  ...minus([-2.75, UPPER, 0.3, 1.25, 5.45, 0.42]),
  ...minus([1.15, UPPER, 0.42, 1.25, 5.45, 3.5], ...holes),
  // Roofs: the front block's, the back room's (its gable over the walls), the veranda's.
  [-2.9, 5.45, 0.2, 1.4, 6.95, 3.75],
  [-2.95, 3.4, -4.4, 0.95, 4.95, 0.3],
  [0.8, 3.15, -4.4, 2.7, 3.4, 0.35],
  // Balconies round the upper room: the side one (the stair's top), the front, the left.
  [1.25, UPPER - 0.12, 0.35, 2.25, UPPER, 1.95],
  [-2.9, UPPER - 0.12, 3.6, 1.3, UPPER, 4.5],
  [-3.7, UPPER - 0.12, 0.35, -2.75, UPPER, 3.6],
  // Rails.
  [2.2, DECK, -4.0, 2.3, DECK + R, 1.95],
  [-2.9, DECK, 4.42, 2.25, DECK + R, 4.5],
  [-2.9, DECK, 3.6, -2.82, DECK + R, 4.42],
  [-2.9, UPPER, 4.42, 1.3, UPPER + R, 4.5],
  [2.17, UPPER, 0.35, 2.25, UPPER + R, 1.5],
  [-3.7, UPPER, 0.35, -3.62, UPPER + R, 3.6],
  // The landing between the two outer flights.
  [2.25, 0, 2.75, 3.45, 1.85, 4.3],
  [3.4, 1.85, 2.75, 3.48, 1.85 + R, 4.3],
  [2.25, 1.85, 4.25, 3.48, 1.85 + R, 4.33],
  // The upper flight's foot, off the landing.
  [1.4, DECK, 3.3, 2.25, 1.88, 3.6],
  // Flights: the back stair (ground → veranda), the outer stair (ground → landing), the upper
  // flight (landing → side balcony).
  ...ramp(2, -5.05, -4.25, 0, DECK, 1.0, 2.05, 0),
  ...ramp(2, 0.75, 2.75, 0, 1.85, 2.35, 3.45, 0),
  ...ramp(2, 3.3, 1.95, 1.88, UPPER, 1.4, 2.25, DECK),
].map((b) => b.map((x) => Math.round(x * 1000) / 1000));
const boxFile = `art/br/procedural/${ID}.boxes.json`;
fs.writeFileSync(boxFile, JSON.stringify(boxes) + "\n");
console.log(`${boxes.length} collision boxes → ${boxFile}`);
