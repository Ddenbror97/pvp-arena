/**
 * A solid pole added to a stand model whose own pole is too thin to read or was decimated away
 * (owner, 2026-11-26, Central Hospital: the vital signs monitors stood "in the air": the
 * downloaded stand's pole is a 4-sided sliver in LOD0 and gone in LOD1, so the monitor and its
 * basket hung over the floor on nothing).
 *
 * An open 10-sided tube from y0 to y1 round the vertical axis at (x, z), radius r (model space),
 * appended to the primitive nearest the axis's foot, with that vertex's texture coordinate and
 * colour (the stand's own finish) and radial normals. Render only; collision unchanged. Writes
 * `<id>.<tag>.lod<N>.glb` for LOD0 and LOD1 and points the live and base manifests at them.
 *
 *   node art/blender/br/add_pole.mjs <tag> <id> x z r y0 y1
 */
import fs from "node:fs";
import path from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { meshopt, prune } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import { editedManifests, modelFile } from "./model-files.mjs";

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });
const [tag, id, ...nums] = process.argv.slice(2);
const [AX, AZ, R, Y0, Y1] = nums.map(Number);
if (!tag || !id || [AX, AZ, R, Y0, Y1].some((v) => !Number.isFinite(v)))
  throw new Error("usage: add_pole.mjs <tag> <id> x z r y0 y1");
const SIDES = 10;
const dir = "public/fps/br/models";

const apply = (M, [x, y, z]) => [
  M[0] * x + M[4] * y + M[8] * z + M[12],
  M[1] * x + M[5] * y + M[9] * z + M[13],
  M[2] * x + M[6] * y + M[10] * z + M[14],
];
/** The inverse of an affine column-major 4×4. */
function invert(m) {
  const [a, b, c, , d, e, f, , g, h, i, , tx, ty, tz] = m;
  const A = e * i - f * h,
    B = -(d * i - f * g),
    C = d * h - e * g;
  const det = a * A + b * B + c * C;
  const r = [
    A / det,
    (c * h - b * i) / det,
    (b * f - c * e) / det,
    0,
    B / det,
    (a * i - c * g) / det,
    (c * d - a * f) / det,
    0,
    C / det,
    (b * g - a * h) / det,
    (a * e - b * d) / det,
    0,
    0,
    0,
    0,
    1,
  ];
  const t = apply(r, [tx, ty, tz]);
  r[12] = -t[0];
  r[13] = -t[1];
  r[14] = -t[2];
  return r;
}

async function patch(src, out) {
  const doc = await io.read(modelFile(src));
  // The primitive with the vertex nearest the axis's foot.
  let best = null;
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const W = node.getWorldMatrix();
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute("POSITION");
      for (let k = 0; k < pos.getCount(); k++) {
        const [x, y, z] = apply(W, pos.getElement(k, []));
        const d = Math.hypot(x - AX, (y - Y0) * 0.5, z - AZ);
        if (!best || d < best.d) best = { d, node, prim, k };
      }
    }
  }
  if (!best) throw new Error(`${src}: no geometry`);
  const { node, prim, k } = best;
  const Winv = invert(node.getWorldMatrix());
  const sems = prim.listSemantics();
  const count = prim.getAttribute("POSITION").getCount();
  const extra = Object.fromEntries(sems.map((s) => [s, []]));
  // Ring of SIDES at each end: index base + 2*j (bottom) and + 2*j + 1 (top).
  for (let j = 0; j < SIDES; j++) {
    const t = (j / SIDES) * Math.PI * 2;
    const [cx, sz] = [Math.cos(t), Math.sin(t)];
    for (const y of [Y0, Y1]) {
      for (const s of sems) {
        const acc = prim.getAttribute(s);
        if (s === "POSITION") extra[s].push(...apply(Winv, [AX + cx * R, y, AZ + sz * R]));
        else if (s === "NORMAL") {
          // Normals turn with the node's rotation only: carry the direction through the
          // inverse and back to unit length.
          const o = apply(Winv, [0, 0, 0]);
          const n = apply(Winv, [cx, 0, sz]).map((v, q) => v - o[q]);
          const l = Math.hypot(...n) || 1;
          extra[s].push(...n.map((v) => v / l));
        } else if (s === "TANGENT") extra[s].push(1, 0, 0, 1);
        else extra[s].push(...acc.getElement(k, []));
      }
    }
  }
  for (const s of sems) {
    const acc = prim.getAttribute(s);
    const Arr = acc.getArray().constructor;
    // Quantised (meshopt) attributes: store floats instead; the encoder quantises again.
    const old = Array.from({ length: count }, (_, q) => acc.getElement(q, [])).flat();
    acc.setNormalized(false);
    acc.setArray(new Float32Array([...old, ...extra[s]]));
    void Arr;
  }
  const idx = prim.getIndices();
  const tri = [];
  for (let j = 0; j < SIDES; j++) {
    const a = count + 2 * j,
      b = count + 2 * ((j + 1) % SIDES);
    // Outward-facing (counter-clockwise seen from outside).
    tri.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const oldIdx = Array.from(idx.getArray());
  idx.setArray(new Uint32Array([...oldIdx, ...tri]));
  await doc.transform(prune(), meshopt({ encoder: MeshoptEncoder, level: "medium" }));
  await io.write(path.join("public", out), doc);
  console.log(`${id}: pole (${SIDES * 2} triangles) → ${out}`);
  return SIDES * 2;
}

const manifests = editedManifests().map((f) => [
  f,
  JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")),
]);
const model = manifests[0][1].models[id];
if (!model) throw new Error(`${id}: not in ${manifests[0][0]}`);
const done = new Map();
for (const level of [0, 1]) {
  const src = model.lods[level].file;
  const out = `/fps/br/models/${id}.${tag}.lod${level}.glb`;
  done.set(src, { out, added: await patch(src, out) });
}
for (const [file, manifest] of manifests) {
  for (const m of Object.values(manifest.models))
    m.lods = m.lods.map((lod) => {
      const d = done.get(lod.file);
      if (!d) return lod;
      return {
        ...lod,
        file: d.out,
        tris: lod.tris + d.added,
        kB: Math.round(fs.statSync(path.join("public", d.out)).size / 1024),
      };
    });
  fs.writeFileSync(
    path.join(dir, file),
    file === "models.json" ? JSON.stringify(manifest, null, 1) + "\n" : JSON.stringify(manifest),
  );
}
