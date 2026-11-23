/**
 * Back-to-back faces in two-sided materials, thinned to one (owner, 2026-11-22: "the two blank
 * ads banner blinking/flickers in the parachute on distance").
 *
 * A two-sided material draws every triangle from both sides. A model that also carries the back
 * of a sheet as its own triangle (the tall billboard's ad panels: a tan face looking out, a black
 * one looking in, in the same plane) then draws two surfaces at one depth from either side:
 * neither wins the depth test and the panel flips between tan and black as the camera moves.
 * offset_coplanar.mjs does not see these (it pairs faces looking the same way), and a lift does
 * not cure them either: a 1 cm gap, which holds on the near LOD, is under the depth buffer's step
 * from 300 m.
 *
 * Of each such pair (opposite normals, within `GAP` of each other, overlapping) the face looking
 * in, towards the model's centre, is dropped: the one left is drawn on both sides, so the model
 * looks the same from outside, and from inside the sheet shows its outer colour. Only the middle
 * and far LODs (seen from 100 m and more); the near LOD keeps both. Render only: collision is
 * built from its own boxes.
 *
 *   node art/blender/br/drop_backfaces.mjs <manifest.json> [--dry] [--tag=back-v1] [--only=ids]
 *
 * Writes <id>.<tag>.lod<N>.glb and points the manifest at it.
 */
import fs from "node:fs";
import path from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dequantize, meshopt, prune, unweld, weld } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import { modelFile } from "./model-files.mjs";

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });
const dir = "public/fps/br/models";
const args = process.argv.slice(2);
const dry = args.includes("--dry");
const TAG = args.find((a) => a.startsWith("--tag="))?.slice(6) ?? "back-v1";
const ONLY = args
  .find((a) => a.startsWith("--only="))
  ?.slice(7)
  .split(",");
const manifestArg = args.find((a) => !a.startsWith("--"));
if (!manifestArg) throw new Error("usage: drop_backfaces.mjs <manifest.json> [--dry] [--tag=…]");
const manifestFile = path.join(dir, manifestArg);
const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));

/** Back to back: normals within ~2.5° of opposite, planes this close (m). */
const GAP = 0.03;
/** Pairs sharing less than this (m²) are edges meeting, not faces fighting. */
const MIN_OVERLAP = 0.01;

/** The area two triangles share, projected on the first one's main axis (m²). */
function overlapArea(t, u) {
  const n = t.n.map(Math.abs);
  const ax = n[0] > n[1] ? (n[0] > n[2] ? 0 : 2) : n[1] > n[2] ? 1 : 2;
  const [i, j] = [0, 1, 2].filter((k) => k !== ax);
  const P = (v) => [v[i], v[j]];
  const ccw = (q) => {
    const a = (q[1][0] - q[0][0]) * (q[2][1] - q[0][1]) - (q[2][0] - q[0][0]) * (q[1][1] - q[0][1]);
    return a < 0 ? [q[0], q[2], q[1]] : q;
  };
  let poly = ccw(t.v.map(P));
  const clip = ccw(u.v.map(P));
  for (let e = 0; e < 3 && poly.length; e++) {
    const a = clip[e],
      b = clip[(e + 1) % 3];
    const side = (p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    const out = [];
    for (let k = 0; k < poly.length; k++) {
      const p = poly[k],
        q = poly[(k + 1) % poly.length];
      const sp = side(p),
        sq = side(q);
      if (sp >= 0) out.push(p);
      if (sp >= 0 !== sq >= 0) {
        const f = sp / (sp - sq);
        out.push([p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f]);
      }
    }
    poly = out;
  }
  let area = 0;
  for (let k = 0; k < poly.length; k++) {
    const p = poly[k],
      q = poly[(k + 1) % poly.length];
    area += p[0] * q[1] - q[0] * p[1];
  }
  return Math.abs(area) / 2 / Math.max(1e-6, Math.abs(t.n[ax]));
}

const report = [];
for (const [id, model] of Object.entries(manifest.models)) {
  if (ONLY && !ONLY.includes(id)) continue;
  for (const [level, lod] of model.lods.entries()) {
    if (level === 0) continue;
    const doc = await io.read(modelFile(lod.file));
    const root = doc.getRoot();
    const twoSided = root
      .listMeshes()
      .some((m) =>
        m
          .listPrimitives()
          .some(
            (p) =>
              p.getMaterial()?.getDoubleSided() && p.getMaterial()?.getAlphaMode() === "OPAQUE",
          ),
      );
    if (!twoSided) continue;
    await doc.transform(dequantize(), unweld());
    const tris = [];
    const lo = [Infinity, Infinity, Infinity],
      hi = [-Infinity, -Infinity, -Infinity];
    for (const node of root.listNodes()) {
      const mesh = node.getMesh();
      if (!mesh) continue;
      const m = node.getWorldMatrix();
      const w = (v) => [
        m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12],
        m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13],
        m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14],
      ];
      for (const p of mesh.listPrimitives()) {
        if (p.getMode() !== 4) continue;
        const pos = p.getAttribute("POSITION");
        const mat = p.getMaterial();
        const use = mat?.getDoubleSided() && mat.getAlphaMode() === "OPAQUE";
        for (let i = 0; i + 2 < pos.getCount(); i += 3) {
          const v = [0, 1, 2].map((k) => w(pos.getElement(i + k, [])));
          for (const q of v)
            for (let k = 0; k < 3; k++)
              ((lo[k] = Math.min(lo[k], q[k])), (hi[k] = Math.max(hi[k], q[k])));
          if (!use) continue;
          const a = v[1].map((x, k) => x - v[0][k]),
            b = v[2].map((x, k) => x - v[0][k]);
          let n = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
          const len = Math.hypot(...n);
          if (len < 2e-4) continue;
          n = n.map((x) => x / len);
          tris.push({
            p,
            i,
            v,
            n,
            d: n[0] * v[0][0] + n[1] * v[0][1] + n[2] * v[0][2],
            area: len / 2,
            c: [0, 1, 2].map((k) => (v[0][k] + v[1][k] + v[2][k]) / 3),
          });
        }
      }
    }
    const centre = lo.map((v, k) => (v + hi[k]) / 2);
    // Buckets by the line through the origin along the normal (either sign) and the plane's offset.
    const key = (t, dd = 0) => {
      const s = t.n[0] + t.n[1] * 1.3 + t.n[2] * 1.7 >= 0 ? 1 : -1;
      return [
        Math.round(t.n[0] * s * 20),
        Math.round(t.n[1] * s * 20),
        Math.round(t.n[2] * s * 20),
        Math.round((t.d * s) / 0.05) + dd,
      ].join();
    };
    const grid = new Map();
    for (const t of tris) (grid.get(key(t)) ?? grid.set(key(t), []).get(key(t))).push(t);
    const drop = new Set();
    let area = 0;
    for (const t of tris) {
      if (drop.has(t)) continue;
      for (const dd of [-1, 0, 1])
        for (const u of grid.get(key(t, dd)) ?? []) {
          if (u === t || drop.has(u) || drop.has(t)) continue;
          const dot = t.n[0] * u.n[0] + t.n[1] * u.n[1] + t.n[2] * u.n[2];
          if (dot > -0.999 || Math.abs(t.d + u.d) > GAP) continue;
          if (overlapArea(t, u) < MIN_OVERLAP) continue;
          // The one looking in, towards the model's centre.
          const inward = (x) => x.n.reduce((s, v, k) => s + v * (centre[k] - x.c[k]), 0);
          const out = inward(t) > inward(u) ? t : u;
          drop.add(out);
          area += out.area;
        }
    }
    if (!drop.size) continue;
    report.push(`${id} lod${level}: ${drop.size} back faces dropped (${area.toFixed(1)} m²)`);
    if (dry) continue;
    // Collapse each dropped triangle to a point; prune/weld then remove it.
    for (const t of drop) {
      const pos = t.p.getAttribute("POSITION");
      const v0 = pos.getElement(t.i, []);
      pos.setElement(t.i + 1, v0);
      pos.setElement(t.i + 2, v0);
    }
    for (const mesh of root.listMeshes())
      for (const p of mesh.listPrimitives()) {
        const pos = p.getAttribute("POSITION");
        if (!pos || p.getMode() !== 4) continue;
        const keep = [];
        for (let i = 0; i + 2 < pos.getCount(); i += 3) {
          const [a, b, c] = [0, 1, 2].map((k) => pos.getElement(i + k, []));
          const same = (x, y) => x[0] === y[0] && x[1] === y[1] && x[2] === y[2];
          if (!(same(a, b) && same(b, c))) keep.push(i, i + 1, i + 2);
        }
        if (keep.length === pos.getCount()) continue;
        for (const sem of p.listSemantics()) {
          const acc = p.getAttribute(sem);
          const size = acc.getElementSize();
          const src = acc.getArray();
          const out = new src.constructor(keep.length * size);
          keep.forEach((i, k) => {
            for (let e = 0; e < size; e++) out[k * size + e] = src[i * size + e];
          });
          acc.setArray(out);
        }
      }
    await doc.transform(
      prune({ keepAttributes: true }),
      weld(),
      meshopt({ encoder: MeshoptEncoder, level: "medium", quantizePosition: 16 }),
    );
    const file = `/fps/br/models/${id}.${TAG}.lod${level}.glb`;
    await io.write("public" + file, doc);
    let tris2 = 0;
    for (const mesh of (await io.read("public" + file)).getRoot().listMeshes())
      for (const p of mesh.listPrimitives()) tris2 += (p.getIndices()?.getCount() ?? 0) / 3;
    model.lods[level] = {
      ...lod,
      file,
      tris: tris2,
      kB: Math.round(fs.statSync("public" + file).size / 1024),
    };
  }
}
if (!dry) fs.writeFileSync(manifestFile, JSON.stringify(manifest));
console.log(report.join("\n") || "none");
