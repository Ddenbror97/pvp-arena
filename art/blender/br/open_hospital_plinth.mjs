/**
 * The mega hospital's plinth band, opened at its doors (owner, 2026-11-16: "its a height to enter
 * the new hospital buildings at the door"). build_hospital.mjs drew the plinth as one box under
 * the whole block, 0.6 m high and 4 cm proud of the walls (drawn only, no collision). Its front
 * faces ran across the foot of every ground-floor door and its top filled the inside at 0.6 m,
 * so each door looked like a 0.6 m step up onto a raised floor, though the floor players walk on
 * is level with the street.
 *
 * On each block's near LODs (LOD0, LOD1) this replaces that box with what it was meant to be: the
 * band round the outside (its four outer faces and its 4 cm top ledge), with a gap of the door's
 * width at each door, and the band's cut ends. Positions only change where the box was; collision
 * is unchanged. Writes `<id>.plinth-v1.lod<N>.glb` and points both manifests at them.
 * build_hospital.mjs draws the band the same way from now on.
 *
 *   node art/blender/br/open_hospital_plinth.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dequantize, meshopt, prune, unweld, weld } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import plan from "../../../src/lib/fps/br/hospital-plan.json" with { type: "json" };
import { modelFile } from "./model-files.mjs";

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });
const TAG = "plinth-v1";
const dir = "public/fps/br/models";
const MANIFESTS = ["models.locations-v1.json", "models.json"];
const PLINTH = [0.55, 0.57, 0.58]; // build_hospital.mjs K.plinth
const TOP = 0.6,
  PROUD = 0.04,
  DOOR = 1.8; // build_hospital.mjs: plinth height, how far it stands out, door width

function invert(m) {
  const [a00, a01, a02, a03, a10, a11, a12, a13, a20, a21, a22, a23, a30, a31, a32, a33] = m;
  const b00 = a00 * a11 - a01 * a10,
    b01 = a00 * a12 - a02 * a10,
    b02 = a00 * a13 - a03 * a10,
    b03 = a01 * a12 - a02 * a11,
    b04 = a01 * a13 - a03 * a11,
    b05 = a02 * a13 - a03 * a12,
    b06 = a20 * a31 - a21 * a30,
    b07 = a20 * a32 - a22 * a30,
    b08 = a20 * a33 - a23 * a30,
    b09 = a21 * a32 - a22 * a31,
    b10 = a21 * a33 - a23 * a31,
    b11 = a22 * a33 - a23 * a32;
  const det = 1 / (b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06);
  return [
    (a11 * b11 - a12 * b10 + a13 * b09) * det,
    (a02 * b10 - a01 * b11 - a03 * b09) * det,
    (a31 * b05 - a32 * b04 + a33 * b03) * det,
    (a22 * b04 - a21 * b05 - a23 * b03) * det,
    (a12 * b08 - a10 * b11 - a13 * b07) * det,
    (a00 * b11 - a02 * b08 + a03 * b07) * det,
    (a32 * b02 - a30 * b05 - a33 * b01) * det,
    (a20 * b05 - a22 * b02 + a23 * b01) * det,
    (a10 * b10 - a11 * b08 + a13 * b06) * det,
    (a01 * b08 - a00 * b10 - a03 * b06) * det,
    (a30 * b04 - a31 * b02 + a33 * b00) * det,
    (a21 * b02 - a20 * b04 - a23 * b00) * det,
    (a11 * b07 - a10 * b09 - a12 * b06) * det,
    (a00 * b09 - a01 * b07 + a02 * b06) * det,
    (a31 * b01 - a30 * b03 - a32 * b00) * det,
    (a20 * b03 - a21 * b01 + a22 * b00) * det,
  ];
}
const apply = (M, p) =>
  [0, 1, 2].map((r) => M[r] * p[0] + M[4 + r] * p[1] + M[8 + r] * p[2] + M[12 + r]);
const applyDir = (M, p) => {
  const v = [0, 1, 2].map((r) => M[r] * p[0] + M[4 + r] * p[1] + M[8 + r] * p[2]);
  const l = Math.hypot(...v) || 1;
  return v.map((x) => x / l);
};

/** The band's new faces in model space: [corners a, b, c, d (counter-clockwise from outside), normal]. */
function band(box, doors) {
  const [x0, z0, x1, z1] = box; // the plinth's outer footprint
  const quads = [];
  // Along each side, the spans between doors (a door at `at` on that side; `u` runs along it).
  const sides = [
    { n: [0, 0, -1], u: [x0, x1], at: (u, y) => [u, y, z0], w: (u, y) => [u, y, z0 + PROUD] },
    { n: [0, 0, 1], u: [x0, x1], at: (u, y) => [u, y, z1], w: (u, y) => [u, y, z1 - PROUD] },
    { n: [-1, 0, 0], u: [z0, z1], at: (u, y) => [x0, y, u], w: (u, y) => [x0 + PROUD, y, u] },
    { n: [1, 0, 0], u: [z0, z1], at: (u, y) => [x1, y, u], w: (u, y) => [x1 - PROUD, y, u] },
  ];
  for (const s of sides) {
    const gaps = doors
      .filter((d) => d.n[0] === s.n[0] && d.n[2] === s.n[2])
      .map((d) => [d.at - DOOR / 2, d.at + DOOR / 2])
      .sort((a, b) => a[0] - b[0]);
    let spans = [[s.u[0], s.u[1]]];
    for (const [g0, g1] of gaps)
      spans = spans.flatMap(([a, b]) =>
        g1 <= a || g0 >= b
          ? [[a, b]]
          : [
              [a, g0],
              [g1, b],
            ].filter(([p, q]) => q - p > 1e-3),
      );
    for (const [a, b] of spans) {
      // Outer face, then the ledge on top (from the outer edge in to the wall).
      quads.push([s.at(a, 0), s.at(b, 0), s.at(b, TOP), s.at(a, TOP), s.n]);
      quads.push([s.at(a, TOP), s.at(b, TOP), s.w(b, TOP), s.w(a, TOP), [0, 1, 0]]);
      // The band's cut ends at a door (not at the block's corners).
      for (const [u, sign] of [
        [a, -1],
        [b, 1],
      ]) {
        if (Math.abs(u - s.u[0]) < 1e-3 || Math.abs(u - s.u[1]) < 1e-3) continue;
        const along = s.n[0] === 0 ? [sign, 0, 0] : [0, 0, sign];
        quads.push([s.at(u, 0), s.w(u, 0), s.w(u, TOP), s.at(u, TOP), along]);
      }
    }
  }
  // Wind every quad to face its normal.
  return quads.map(([a, b, c, d, n]) => {
    const u = [0, 1, 2].map((k) => b[k] - a[k]),
      w = [0, 1, 2].map((k) => d[k] - a[k]);
    const g = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    return g[0] * n[0] + g[1] * n[1] + g[2] * n[2] >= 0 ? [a, b, c, d, n] : [a, d, c, b, n];
  });
}

const close = (c, ref) =>
  Math.abs(c[0] - ref[0]) < 0.02 &&
  Math.abs(c[1] - ref[1]) < 0.02 &&
  Math.abs(c[2] - ref[2]) < 0.02;

async function patch(id, src, out) {
  const doc = await io.read(modelFile(src));
  await doc.transform(dequantize(), unweld());
  let removed = 0,
    added = 0;
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const M = node.getWorldMatrix(),
      inv = invert(M);
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute("POSITION"),
        nrm = prim.getAttribute("NORMAL"),
        col = prim.getAttribute("COLOR_0");
      if (!col || prim.getIndices()) continue;
      const n = pos.getCount();
      const v = [0, 0, 0],
        c = [0, 0, 0, 0];
      const world = (i) => apply(M, pos.getElement(i, v));
      // The plinth box: plinth-coloured triangles between y 0 and 0.6 on its outer planes or
      // across its whole top and bottom.
      const tris = [];
      const box = [Infinity, Infinity, -Infinity, -Infinity];
      for (let t = 0; t < n; t += 3) {
        const P = [world(t), world(t + 1), world(t + 2)];
        col.getElement(t, c);
        const plinth = close(c, PLINTH) && P.every((p) => p[1] > -0.01 && p[1] < TOP + 0.01);
        tris.push({ P, plinth });
        if (plinth)
          for (const p of P) {
            box[0] = Math.min(box[0], p[0]);
            box[1] = Math.min(box[1], p[2]);
            box[2] = Math.max(box[2], p[0]);
            box[3] = Math.max(box[3], p[2]);
          }
      }
      if (!tris.some((t) => t.plinth)) continue;
      // Only the box's own faces: on its outer planes, or its top/bottom spanning the block.
      const onBox = (P) => {
        const flat = P.every((p) => Math.abs(p[1] - P[0][1]) < 1e-3);
        if (flat) return Math.abs(P[0][1] - TOP) < 0.01 || Math.abs(P[0][1]) < 0.01;
        return [0, 1, 2, 3].some((k) =>
          P.every((p) => Math.abs((k % 2 ? p[2] : p[0]) - box[k]) < 0.005),
        );
      };
      const keep = tris.filter((t) => !(t.plinth && onBox(t.P)));
      removed += tris.length - keep.length;
      // The doors on this block, from the plan's aprons (1.5 m outside each door).
      const doors = plan.blocks[id].aprons.map(([ax, az]) => {
        const dx = Math.min(Math.abs(ax - box[0]), Math.abs(ax - box[2])),
          dz = Math.min(Math.abs(az - box[1]), Math.abs(az - box[3]));
        return dx < dz
          ? { n: [ax < 0 ? -1 : 1, 0, 0], at: az }
          : { n: [0, 0, az < 0 ? -1 : 1], at: ax };
      });
      const quads = band(box, doors);
      // Rebuild the attributes: what is kept, then the band (two triangles per quad).
      const P = [],
        N = [],
        C = [];
      const nv = [0, 0, 0],
        cv = [0, 0, 0, 0];
      const size = col.getElementSize();
      for (let t = 0; t < n; t += 3) {
        if (tris[t / 3].plinth && onBox(tris[t / 3].P)) continue;
        for (let k = 0; k < 3; k++) {
          P.push(...pos.getElement(t + k, v));
          N.push(...nrm.getElement(t + k, nv));
          C.push(...col.getElement(t + k, cv).slice(0, size));
        }
      }
      const colour = size === 4 ? [...PLINTH, 1] : PLINTH;
      for (const [a, b, cc, d, nn] of quads) {
        const local = applyDir(inv, nn);
        for (const p of [a, b, cc, a, cc, d]) {
          P.push(...apply(inv, p));
          N.push(...local);
          C.push(...colour);
        }
        added += 2;
      }
      const buf = pos.getBuffer();
      prim.setAttribute(
        "POSITION",
        doc.createAccessor().setType("VEC3").setArray(new Float32Array(P)).setBuffer(buf),
      );
      prim.setAttribute(
        "NORMAL",
        doc.createAccessor().setType("VEC3").setArray(new Float32Array(N)).setBuffer(buf),
      );
      prim.setAttribute(
        "COLOR_0",
        doc
          .createAccessor()
          .setType(size === 4 ? "VEC4" : "VEC3")
          .setArray(new Float32Array(C))
          .setBuffer(buf),
      );
      for (const sem of prim.listSemantics())
        if (!["POSITION", "NORMAL", "COLOR_0"].includes(sem)) throw new Error(`${id}: ${sem}`);
    }
  }
  if (!removed) throw new Error(`${id} ${src}: no plinth box found`);
  await doc.transform(weld(), prune(), meshopt({ encoder: MeshoptEncoder, level: "medium" }));
  await io.write(path.join("public", out), doc);
  console.log(`${id}: ${removed} plinth triangles out, ${added} in → ${out}`);
}

const manifests = MANIFESTS.map((f) => [f, JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"))]);
const done = new Map();
for (const id of Object.keys(plan.blocks)) {
  const model = manifests[0][1].models[id];
  for (const level of [0, 1]) {
    const src = model.lods[level].file;
    const out = `/fps/br/models/${id}.${TAG}.lod${level}.glb`;
    await patch(id, src, out);
    done.set(src, out);
  }
}
for (const [file, manifest] of manifests) {
  for (const model of Object.values(manifest.models))
    for (const lod of model.lods) {
      const out = done.get(lod.file);
      if (!out) continue;
      const doc = await io.read(path.join("public", out));
      const tris = doc
        .getRoot()
        .listMeshes()
        .flatMap((m) => m.listPrimitives())
        .reduce(
          (s, p) => s + (p.getIndices()?.getCount() ?? p.getAttribute("POSITION").getCount()) / 3,
          0,
        );
      Object.assign(lod, {
        file: out,
        tris,
        kB: Math.round(fs.statSync(path.join("public", out)).size / 1024),
      });
    }
  fs.writeFileSync(
    path.join(dir, file),
    file === "models.json" ? JSON.stringify(manifest, null, 1) + "\n" : JSON.stringify(manifest),
  );
}
