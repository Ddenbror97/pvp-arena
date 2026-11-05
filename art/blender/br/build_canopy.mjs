/**
 * The players' parachute (owner's parachute spec, 2026-11-05, after PUBG's classic canopy): a
 * ram-air wing, game-ready and original work, built procedurally so it can be rebuilt and tuned.
 *
 *   node art/blender/br/build_canopy.mjs        (run from the repo root)
 *
 * Writes public/fps/br/models/canopy.glb with:
 *   - "Canopy": the wing. 9 cells (10 ribs) on a spanwise arc, a cambered airfoil with a flatter
 *     underside, open cell inlets at the leading edge, puffed cells between the ribs, dark olive
 *     and black panels with darker seams (vertex colours, one material). Morph targets
 *     "brakeL"/"brakeR" pull that side's trailing edge down (steering), "flare" both.
 *   - "Lines": the suspension lines (A–D rows on every rib) meeting at two links above the
 *     shoulders, the brake lines cascading from the outer trailing edge to the toggles, and the
 *     four risers from the links down to the harness: one LINES primitive, with the same morph
 *     targets (the toggles come down with a pulled brake).
 *   - "CanopyFar": an 80-triangle stand-in for distant canopies (drawn instanced).
 * Units are metres; the origin is the harness between the shoulders, +y up, −z the direction of
 * flight (the leading edge), x the span.
 */
import fs from "node:fs";
import path from "node:path";
import { Document, NodeIO } from "@gltf-transform/core";

const OUT = path.resolve("public/fps/br/models/canopy.glb");

const SPAN = 8.4,
  CHORD = 3.0,
  HEIGHT = 5.4, // canopy centre above the harness
  ARC_R = 7.4, // spanwise arc radius (tips ≈ 1.3 m lower than the centre)
  CELLS = 9,
  THICK = 0.17, // airfoil thickness (of chord)
  CAMBER = 0.045,
  TRIM = 0.07; // leading edge lower than the trailing edge (rad)
const LINK = 0.5, // the links where the lines meet, above the shoulders
  LINK_X = 0.24,
  TOGGLE = { x: 0.3, y: 0.42, z: 0.06 }; // where the hands hold the toggles (neutral)

const theta = Math.asin(SPAN / 2 / ARC_R);
const smooth = (a, b, v) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** Half thickness (NACA 4-digit) and camber at chord fraction t. */
const half = (t) =>
  (THICK / 0.2) *
  (0.2969 * Math.sqrt(t) - 0.126 * t - 0.3516 * t * t + 0.2843 * t ** 3 - 0.1036 * t ** 4);
const camber = (t) =>
  t < 0.35
    ? (CAMBER / 0.35 ** 2) * (2 * 0.35 * t - t * t)
    : (CAMBER / 0.65 ** 2) * (1 - 2 * 0.35 + 2 * 0.35 * t - t * t);

/**
 * A point of the wing: u ∈ [−1, 1] across the span, t ∈ [0, 1] from the leading edge, s = +1 on
 * the upper surface, −1 on the lower, 0 on the camber line; `puff` adds the cell's bulge.
 */
function wing(u, t, s, puff = 0) {
  const lower = s < 0;
  // Local airfoil frame: chord along +z (LE at −chord/2), thickness along the arc's normal.
  const off = camber(t) * CHORD + s * half(t) * CHORD * (lower ? 0.45 : 1) + puff;
  let z = (t - 0.42) * CHORD,
    n = off;
  // Trim: nose down a little.
  const c = Math.cos(TRIM),
    sn = Math.sin(TRIM);
  [z, n] = [z * c - n * sn, z * sn + n * c];
  const a = u * theta;
  const r = ARC_R + n; // along the arc's radius (outward = up at the centre)
  return [Math.sin(a) * r, HEIGHT - ARC_R + Math.cos(a) * r, z];
}
/** Morph displacement for the brakes: the trailing edge pulled down on one side (sign). */
function brake(u, t, side) {
  const w = side > 0 ? smooth(0.05, 0.75, u) : smooth(0.05, 0.75, -u);
  const k = Math.max(0, (t - 0.55) / 0.45) ** 2 * w;
  return [0, -0.62 * k, -0.12 * k];
}

// ------------------------------------------------------------------ wing mesh
const pos = [],
  col = [],
  idx = [];
const tBrakeL = [],
  tBrakeR = [],
  tFlare = [];
const OLIVE = [0.17, 0.19, 0.13],
  BLACK = [0.07, 0.075, 0.07],
  SEAM = 0.55,
  INLET = [0.02, 0.02, 0.02];
const vert = (p, c, u, t) => {
  pos.push(...p);
  col.push(...c);
  const l = brake(u, t, -1),
    r = brake(u, t, 1);
  tBrakeL.push(...l);
  tBrakeR.push(...r);
  tFlare.push(l[0] + r[0], (l[1] + r[1]) * 0.75, (l[2] + r[2]) * 0.75);
  return pos.length / 3 - 1;
};
const SPAN_SEG = 6, // per cell
  CHORD_SEG = 14;
const tAt = (j) => {
  const v = j / CHORD_SEG;
  return v * v * 0.35 + v * 0.65; // denser at the leading edge
};
for (let cell = 0; cell < CELLS; cell++) {
  // Panels alternate olive and black (the reference's dark military canopy).
  const base = cell % 2 ? BLACK : OLIVE;
  for (const s of [1, -1]) {
    const grid = [];
    for (let i = 0; i <= SPAN_SEG; i++) {
      const f = i / SPAN_SEG;
      const u = ((cell + f) / CELLS) * 2 - 1;
      const row = [];
      for (let j = 0; j <= CHORD_SEG; j++) {
        const t = tAt(j);
        // The underside starts behind the inlet (cell openings at the leading edge).
        const tt = s < 0 ? 0.07 + t * 0.93 : t;
        const bulge =
          Math.sin(Math.PI * f) *
          (s > 0 ? 0.075 : -0.035) *
          Math.sin(Math.PI * Math.min(1, tt * 1.2 + 0.05));
        const seam = Math.min(f, 1 - f) < 0.07 || tt > 0.97 ? SEAM : 1;
        // The underside reads lit from within (light through the cells), not as a black slab.
        const shade = (s > 0 ? 1 : 1.9) * seam * (0.92 + 0.08 * Math.sin(tt * 9 + cell));
        row.push(
          vert(
            wing(u, tt, s, bulge),
            base.map((v) => v * shade),
            u,
            tt,
          ),
        );
      }
      grid.push(row);
    }
    for (let i = 0; i < SPAN_SEG; i++)
      for (let j = 0; j < CHORD_SEG; j++) {
        const a = grid[i][j],
          b = grid[i + 1][j],
          c = grid[i + 1][j + 1],
          d = grid[i][j + 1];
        if (s > 0) idx.push(a, d, b, b, d, c);
        else idx.push(a, b, d, b, c, d);
      }
  }
}
// Ribs: the airfoil walls between cells (fabric; the two ends are the canopy's side panels).
const RIB = [0.22, 0.24, 0.17];
for (let r = 0; r <= CELLS; r++) {
  const u = (r / CELLS) * 2 - 1;
  let prevU = -1,
    prevL = -1;
  for (let j = 0; j <= 10; j++) {
    const t = 0.07 + (j / 10) * 0.9;
    const up = vert(wing(u, t, 1), RIB, u, t),
      lo = vert(wing(u, t, -1), RIB, u, t);
    if (prevU >= 0) idx.push(prevU, up, prevL, up, lo, prevL);
    prevU = up;
    prevL = lo;
  }
}
// The inlet lip: from the nose down to where the underside starts (dark mouths).
for (let cell = 0; cell < CELLS; cell++)
  for (let i = 0; i < SPAN_SEG; i++) {
    const u0 = ((cell + i / SPAN_SEG) / CELLS) * 2 - 1,
      u1 = ((cell + (i + 1) / SPAN_SEG) / CELLS) * 2 - 1;
    const a = vert(wing(u0, 0.0, 1), INLET, u0, 0),
      b = vert(wing(u1, 0.0, 1), INLET, u1, 0),
      c = vert(wing(u1, 0.07, -1), INLET, u1, 0.07),
      d = vert(wing(u0, 0.07, -1), INLET, u0, 0.07);
    idx.push(a, b, d, b, c, d);
  }
const wingTris = idx.length / 3;

// ------------------------------------------------------------------ lines
const lpos = [],
  lBL = [],
  lBR = [],
  lFl = [];
const lineVert = (p, dl = [0, 0, 0], dr = [0, 0, 0]) => {
  lpos.push(...p);
  lBL.push(...dl);
  lBR.push(...dr);
  lFl.push((dl[0] + dr[0]) * 0.75, (dl[1] + dr[1]) * 0.75, (dl[2] + dr[2]) * 0.75);
};
const seg = (a, b, da, db, ra, rb) => {
  lineVert(a, da, ra);
  lineVert(b, db, rb);
};
const zero = [0, 0, 0];
for (let r = 0; r <= CELLS; r++) {
  const u = (r / CELLS) * 2 - 1;
  const link = [u < 0 ? -LINK_X : LINK_X, LINK, 0];
  // Lines cascade: each pair of rows joins 1.2 m below the canopy, then runs to the link.
  for (const [ta, tb] of [
    [0.1, 0.33],
    [0.55, 0.8],
  ]) {
    const pa = wing(u, ta, -1),
      pb = wing(u, tb, -1);
    const joint = [((pa[0] + pb[0]) / 2) * 0.9, (pa[1] + pb[1]) / 2 - 1.2, (pa[2] + pb[2]) / 2];
    seg(pa, joint, zero, zero, zero, zero);
    seg(pb, joint, zero, zero, zero, zero);
    seg(joint, link, zero, zero, zero, zero);
  }
}
// Brake lines: from the outer trailing edge (four points a side) to a cascade, then the toggle.
for (const side of [-1, 1]) {
  const toggle = [side * TOGGLE.x, TOGGLE.y, TOGGLE.z];
  const pulled = [0, -0.42, -0.05]; // the toggle at full brake
  const cascade = [side * 1.9, 2.6, 1.0];
  for (const u of [0.35, 0.55, 0.75, 0.95]) {
    const te = wing(side * u, 1, 0);
    const d = brake(side * u, 1, side);
    seg(
      te,
      cascade,
      side < 0 ? d : zero,
      side < 0 ? [0, -0.3, -0.05] : zero,
      side > 0 ? d : zero,
      side > 0 ? [0, -0.3, -0.05] : zero,
    );
  }
  seg(
    cascade,
    toggle,
    side < 0 ? [0, -0.3, -0.05] : zero,
    side < 0 ? pulled : zero,
    side > 0 ? [0, -0.3, -0.05] : zero,
    side > 0 ? pulled : zero,
  );
  // Risers: front and rear, from the link down to the harness at the shoulders.
  for (const dz of [-0.05, 0.05])
    seg([side * LINK_X, LINK, dz], [side * 0.17, 0.02, dz], zero, zero, zero, zero);
}

// ------------------------------------------------------------------ far stand-in
const fpos = [],
  fidx = [];
const FU = 8,
  FT = 4;
for (const s of [1, -1]) {
  const base = fpos.length / 3;
  for (let i = 0; i <= FU; i++)
    for (let j = 0; j <= FT; j++) {
      const u = (i / FU) * 2 - 1,
        t = j / FT;
      fpos.push(...wing(u, s < 0 ? 0.07 + t * 0.93 : t, s));
    }
  for (let i = 0; i < FU; i++)
    for (let j = 0; j < FT; j++) {
      const a = base + i * (FT + 1) + j,
        b = a + FT + 1;
      if (s > 0) fidx.push(a, a + 1, b, b, a + 1, b + 1);
      else fidx.push(a, b, a + 1, b, b + 1, a + 1);
    }
}

// ------------------------------------------------------------------ glTF
const doc = new Document();
const buffer = doc.createBuffer();
const acc = (type, arr, ctor = Float32Array) =>
  doc.createAccessor().setType(type).setArray(new ctor(arr)).setBuffer(buffer);
const fabric = doc
  .createMaterial("Fabric")
  .setBaseColorFactor([1, 1, 1, 1])
  .setRoughnessFactor(0.92)
  .setMetallicFactor(0)
  .setDoubleSided(true);
const cord = doc
  .createMaterial("Cord")
  .setBaseColorFactor([0.3, 0.3, 0.28, 1])
  .setRoughnessFactor(1)
  .setMetallicFactor(0);
const names = ["brakeL", "brakeR", "flare"];
const target = (name, arr) =>
  doc.createPrimitiveTarget(name).setAttribute("POSITION", acc("VEC3", arr));

const wingPrim = doc
  .createPrimitive()
  .setAttribute("POSITION", acc("VEC3", pos))
  .setAttribute("COLOR_0", acc("VEC3", col))
  .setIndices(acc("SCALAR", idx, Uint32Array))
  .setMaterial(fabric);
wingPrim.addTarget(target("brakeL", tBrakeL));
wingPrim.addTarget(target("brakeR", tBrakeR));
wingPrim.addTarget(target("flare", tFlare));
const wingMesh = doc
  .createMesh("Canopy")
  .addPrimitive(wingPrim)
  .setWeights([0, 0, 0])
  .setExtras({ targetNames: names });

const linePrim = doc
  .createPrimitive()
  .setMode(1) // LINES
  .setAttribute("POSITION", acc("VEC3", lpos))
  .setMaterial(cord);
linePrim.addTarget(target("brakeL", lBL));
linePrim.addTarget(target("brakeR", lBR));
linePrim.addTarget(target("flare", lFl));
const lineMesh = doc
  .createMesh("Lines")
  .addPrimitive(linePrim)
  .setWeights([0, 0, 0])
  .setExtras({ targetNames: names });

const farPrim = doc
  .createPrimitive()
  .setAttribute("POSITION", acc("VEC3", fpos))
  .setIndices(acc("SCALAR", fidx, Uint32Array))
  .setMaterial(
    doc
      .createMaterial("FabricFar")
      .setBaseColorFactor([0.1, 0.11, 0.09, 1])
      .setRoughnessFactor(1)
      .setMetallicFactor(0)
      .setDoubleSided(true),
  );
const farMesh = doc.createMesh("CanopyFar").addPrimitive(farPrim);

const scene = doc.createScene("Canopy");
scene.addChild(doc.createNode("Canopy").setMesh(wingMesh));
scene.addChild(doc.createNode("Lines").setMesh(lineMesh));
scene.addChild(doc.createNode("CanopyFar").setMesh(farMesh));
doc.getRoot().setDefaultScene(scene);

// Normals for the wing (smooth, from the triangles).
{
  const n = new Float32Array(pos.length);
  for (let i = 0; i < idx.length; i += 3) {
    const [a, b, c] = [idx[i] * 3, idx[i + 1] * 3, idx[i + 2] * 3];
    const e1 = [pos[b] - pos[a], pos[b + 1] - pos[a + 1], pos[b + 2] - pos[a + 2]];
    const e2 = [pos[c] - pos[a], pos[c + 1] - pos[a + 1], pos[c + 2] - pos[a + 2]];
    const nx = e1[1] * e2[2] - e1[2] * e2[1],
      ny = e1[2] * e2[0] - e1[0] * e2[2],
      nz = e1[0] * e2[1] - e1[1] * e2[0];
    for (const v of [a, b, c]) {
      n[v] += nx;
      n[v + 1] += ny;
      n[v + 2] += nz;
    }
  }
  for (let i = 0; i < n.length; i += 3) {
    const l = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1;
    n[i] /= l;
    n[i + 1] /= l;
    n[i + 2] /= l;
  }
  wingPrim.setAttribute("NORMAL", acc("VEC3", n));
}

await new NodeIO().write(OUT, doc);
console.log(
  `canopy.glb: wing ${wingTris} triangles, ${lpos.length / 6} lines, far ${fidx.length / 3} triangles, ${(fs.statSync(OUT).size / 1024).toFixed(0)} KB`,
);
