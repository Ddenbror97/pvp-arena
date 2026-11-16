/**
 * See-through faces lying on an opaque surface, removed (owner, 2026-11-16: "some flicker between
 * the glass to the concrete", on a tower roof's parapet). The towers' roofs stand a glass panel
 * on their 0.5 m parapet: a box, so its underside lies exactly on the parapet's top. Glass is
 * drawn from both sides and blended, so that underside is seen through the panel, in the same
 * plane as the white top below it: the two fight for every pixel along the parapet.
 *
 * A flat glass (blended) triangle is dropped when it lies in the plane of an opaque triangle of
 * the same model, facing the other way (glass standing on a parapet or a sill, or a pane's top
 * under a window head), and they overlap. Upright glass is left alone: dropping a pane's face
 * that lay on a frame changed how some windows look (the log cabin's went dark). Nothing else moves; collision is unchanged (render only). Writes
 * `<id>.glass-v1.lod<N>.glb` for the LODs that have any and points both manifests at them.
 *
 *   node art/blender/br/drop_glass_seats.mjs [--dry]
 */
import fs from "node:fs";
import path from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dequantize, meshopt, prune, weld } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import { modelFile } from "./model-files.mjs";

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });
const TAG = "glass-v1";
const dry = process.argv.includes("--dry");
const dir = "public/fps/br/models";
const MANIFESTS = ["models.locations-v1.json", "models.json"];
/** Same plane: within this along the normal (m; stored positions step about 1 mm here). */
const PLANE = 0.004;

/** Triangles of a primitive in model space: corners, unit normal, plane offset, centre. */
function triangles(node, prim) {
  const M = node.getWorldMatrix();
  const pos = prim.getAttribute("POSITION");
  const idx = prim.getIndices();
  const n = idx ? idx.getCount() : pos.getCount();
  const v = [0, 0, 0];
  const at = (i) => {
    pos.getElement(idx ? idx.getScalar(i) : i, v);
    return [0, 1, 2].map((r) => M[r] * v[0] + M[4 + r] * v[1] + M[8 + r] * v[2] + M[12 + r]);
  };
  const out = [];
  for (let t = 0; t + 2 < n; t += 3) {
    const P = [at(t), at(t + 1), at(t + 2)];
    const u = [0, 1, 2].map((k) => P[1][k] - P[0][k]),
      w = [0, 1, 2].map((k) => P[2][k] - P[0][k]);
    const g = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    const l = Math.hypot(...g);
    if (l < 1e-9) {
      out.push(null);
      continue;
    }
    const N = g.map((x) => x / l);
    out.push({
      P,
      N,
      d: N[0] * P[0][0] + N[1] * P[0][1] + N[2] * P[0][2],
      c: [0, 1, 2].map((k) => (P[0][k] + P[1][k] + P[2][k]) / 3),
    });
  }
  return out;
}

/** Point q (in t's plane) strictly inside triangle t. */
function inside(t, q) {
  const [a, b, c] = t.P;
  const v0 = [0, 1, 2].map((k) => c[k] - a[k]),
    v1 = [0, 1, 2].map((k) => b[k] - a[k]),
    v2 = [0, 1, 2].map((k) => q[k] - a[k]);
  const dot = (x, y) => x[0] * y[0] + x[1] * y[1] + x[2] * y[2];
  const d00 = dot(v0, v0),
    d01 = dot(v0, v1),
    d02 = dot(v0, v2),
    d11 = dot(v1, v1),
    d12 = dot(v1, v2);
  const den = d00 * d11 - d01 * d01;
  if (!den) return false;
  const u = (d11 * d02 - d01 * d12) / den,
    w = (d00 * d12 - d01 * d02) / den;
  return u > 0.01 && w > 0.01 && u + w < 0.99;
}

/** Drop the glass faces seated on opaque ones; returns how many. */
const stats = { area: 0, max: 0, up: 0 };
function dropSeats(doc) {
  Object.assign(stats, { area: 0, max: 0, up: 0 });
  const glass = [],
    opaque = [];
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    for (const prim of mesh.listPrimitives()) {
      const blended = prim.getMaterial()?.getAlphaMode() === "BLEND";
      const tris = triangles(node, prim);
      if (blended) glass.push({ prim, tris });
      else opaque.push(...tris.filter(Boolean));
    }
  }
  let dropped = 0;
  for (const { prim, tris } of glass) {
    const idx = prim.getIndices();
    if (!idx) continue;
    const keep = [];
    tris.forEach((g, t) => {
      const seated =
        g &&
        Math.abs(g.N[1]) > 0.9 &&
        opaque.some(
          (o) =>
            g.N[0] * o.N[0] + g.N[1] * o.N[1] + g.N[2] * o.N[2] < -0.999 &&
            Math.abs(g.d + o.d) < PLANE &&
            (inside(o, g.c) || inside(g, o.c)),
        );
      if (seated) {
        dropped++;
        const [a, b, c] = g.P;
        const u = [0, 1, 2].map((k) => b[k] - a[k]),
          w = [0, 1, 2].map((k) => c[k] - a[k]);
        const area =
          Math.hypot(
            u[1] * w[2] - u[2] * w[1],
            u[2] * w[0] - u[0] * w[2],
            u[0] * w[1] - u[1] * w[0],
          ) / 2;
        stats.area += area;
        stats.max = Math.max(stats.max, area);
        stats.up += Math.abs(g.N[1]) > 0.9 ? 1 : 0;
      } else for (let k = 0; k < 3; k++) keep.push(idx.getScalar(t * 3 + k));
    });
    if (keep.length !== idx.getCount())
      prim.setIndices(
        doc
          .createAccessor()
          .setType("SCALAR")
          .setArray(new Uint32Array(keep))
          .setBuffer(idx.getBuffer()),
      );
  }
  return dropped;
}

const manifests = MANIFESTS.map((f) => [f, JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"))]);
const live = manifests[0][1];
const done = new Map(); // source file → new file
for (const [id, model] of Object.entries(live.models)) {
  for (const [level, lod] of model.lods.entries()) {
    if (done.has(lod.file)) continue;
    const doc = await io.read(modelFile(lod.file));
    if (
      !doc
        .getRoot()
        .listMaterials()
        .some((m) => m.getAlphaMode() === "BLEND")
    )
      continue;
    await doc.transform(dequantize());
    const dropped = dropSeats(doc);
    if (!dropped) continue;
    const out = `/fps/br/models/${id}.${TAG}.lod${level}.glb`;
    console.log(
      `${id} LOD${level}: ${dropped} glass faces on opaque ones (${stats.area.toFixed(2)} m², largest ${stats.max.toFixed(3)} m², ${stats.up} horizontal) → ${out}`,
    );
    if (dry) continue;
    await doc.transform(weld(), prune(), meshopt({ encoder: MeshoptEncoder, level: "medium" }));
    await io.write(path.join("public", out), doc);
    done.set(lod.file, out);
  }
}
if (!dry) {
  for (const [file, manifest] of manifests) {
    for (const model of Object.values(manifest.models))
      for (const lod of model.lods) {
        const out = done.get(lod.file);
        if (!out) continue;
        const tris = (await io.read(path.join("public", out)))
          .getRoot()
          .listMeshes()
          .flatMap((m) => m.listPrimitives())
          .reduce((s, p) => s + p.getIndices().getCount() / 3, 0);
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
  console.log(`${done.size} files rewritten`);
}
