/**
 * Floors with a finish (owner, 2026-11-27, of the apartments' stairwell and corridor: "add
 * klinkers och golv saknas. leta efter fler lägenheter som saknar"): moves a model's floor
 * triangles into their own primitives, materials named "Floor finish: <kind>", which the props
 * renderer draws with a pattern (interior-style.ts applyFloorFinish: ceramic tiles with grout,
 * planks, marble slabs, carpet, decking). No textures: the pattern is drawn in the shader over
 * the triangles' own colour (klinker: a colour picked per building).
 *
 *   node art/blender/br/floor_finish.mjs <spec.json>
 *   spec: { tag, models: { id: { lods: [0], rules: [rule, …] } } }
 *   rule: { kind, prim?, colour?: [r,g,b], up?: bool (default true: faces up only; false: every
 *           face, a stair's risers too), box?: [x0,y0,z0,x1,y1,z1] (the triangle's centre
 *           inside), recolour?: [r,g,b], why }
 *
 * A triangle goes to the first rule it matches (in the order given). Writes
 * `<id>.<tag>.lod<N>.glb` (over a file of that tag already there: patch_parts.mjs's) and points
 * the live and base manifests at it.
 */
import fs from "node:fs";
import path from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { meshopt, prune, unweld, weld } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import { editedManifests, modelFile } from "./model-files.mjs";

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });
const spec = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const dir = "public/fps/br/models";
const near = (c, k) => k.every((v, i) => Math.abs(c[i] - v) < 0.012);

/** Split an (unwelded) primitive's triangles at world planes [axis, value]: all attributes. */
function slicePrimitive(doc, prim, W, planes) {
  const sems = prim.listSemantics();
  const pos = prim.getAttribute("POSITION");
  const inv = invert(W);
  const local = (axis, value) => {
    // The plane x|z = value in world → in the node's space (scale/translate only, no turn here).
    const p = [0, 0, 0];
    p[axis] = value;
    return [0, 1, 2].map(
      (r) => inv[r] * p[0] + inv[4 + r] * p[1] + inv[8 + r] * p[2] + inv[12 + r],
    )[axis];
  };
  let tris = [];
  for (let t = 0; t < pos.getCount(); t += 3)
    tris.push(
      [t, t + 1, t + 2].map((i) =>
        Object.fromEntries(sems.map((s) => [s, prim.getAttribute(s).getElement(i, [])])),
      ),
    );
  for (const [axis, value] of planes) {
    const v = local(axis, value);
    const next = [];
    for (const tri of tris) {
      const d = tri.map((q) => q.POSITION[axis] - v);
      if (d.every((x) => x >= -1e-5) || d.every((x) => x <= 1e-5)) {
        next.push(tri);
        continue;
      }
      for (const side of [1, -1]) {
        const poly = [];
        for (let i = 0; i < 3; i++) {
          const a = tri[i],
            b = tri[(i + 1) % 3];
          const da = d[i] * side,
            db = d[(i + 1) % 3] * side;
          if (da >= 0) poly.push(a);
          if ((da > 0 && db < 0) || (da < 0 && db > 0)) {
            const f = da / (da - db);
            poly.push(
              Object.fromEntries(sems.map((s) => [s, a[s].map((x, k) => x + (b[s][k] - x) * f)])),
            );
          }
        }
        for (let k = 1; k + 1 < poly.length; k++) next.push([poly[0], poly[k], poly[k + 1]]);
      }
    }
    tris = next;
  }
  for (const s of sems) {
    const a = prim.getAttribute(s);
    a.setNormalized(false);
    a.setArray(new Float32Array(tris.flatMap((tri) => tri.flatMap((q) => q[s]))));
  }
  prim.setIndices(null);
}

function invert(m) {
  // Affine inverse of a column-major 4×4 (no shear).
  const a = [m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]];
  const det =
    a[0] * (a[4] * a[8] - a[5] * a[7]) -
    a[3] * (a[1] * a[8] - a[2] * a[7]) +
    a[6] * (a[1] * a[5] - a[2] * a[4]);
  const i = [
    (a[4] * a[8] - a[5] * a[7]) / det,
    (a[2] * a[7] - a[1] * a[8]) / det,
    (a[1] * a[5] - a[2] * a[4]) / det,
    (a[5] * a[6] - a[3] * a[8]) / det,
    (a[0] * a[8] - a[2] * a[6]) / det,
    (a[2] * a[3] - a[0] * a[5]) / det,
    (a[3] * a[7] - a[4] * a[6]) / det,
    (a[1] * a[6] - a[0] * a[7]) / det,
    (a[0] * a[4] - a[1] * a[3]) / det,
  ];
  const t = [m[12], m[13], m[14]];
  const it = [0, 1, 2].map((r) => -(i[r] * t[0] + i[3 + r] * t[1] + i[6 + r] * t[2]));
  return [i[0], i[1], i[2], 0, i[3], i[4], i[5], 0, i[6], i[7], i[8], 0, it[0], it[1], it[2], 1];
}

async function finish(src, out, rules) {
  const doc = await io.read(modelFile(src));
  await doc.transform(unweld());
  const root = doc.getRoot();
  const materials = new Map();
  const material = (kind) => {
    const name = `Floor finish: ${kind}`;
    if (!materials.has(name))
      materials.set(
        name,
        doc
          .createMaterial(name)
          .setBaseColorFactor([1, 1, 1, 1])
          .setRoughnessFactor(0.75)
          .setMetallicFactor(0),
      );
    return materials.get(name);
  };
  const moved = {};
  for (const node of root.listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const W = node.getWorldMatrix();
    const world = (p) =>
      [0, 1, 2].map((r) => W[r] * p[0] + W[4 + r] * p[1] + W[8 + r] * p[2] + W[12 + r]);
    for (const prim of mesh.listPrimitives()) {
      const name = prim.getMaterial()?.getName() ?? "";
      if (name.startsWith("Floor finish: ")) continue;
      const pos = prim.getAttribute("POSITION"),
        col = prim.getAttribute("COLOR_0");
      const mine = rules.filter((r) => !r.prim || r.prim === name);
      if (!mine.length || !pos) continue;
      // Triangles across a rule's box edge are split there first (a floor is one big polygon).
      const planes = mine.flatMap((r) =>
        r.box
          ? [
              [0, r.box[0]],
              [0, r.box[3]],
              [2, r.box[2]],
              [2, r.box[5]],
            ]
          : [],
      );
      if (planes.length) slicePrimitive(doc, prim, W, planes);
      const count = pos.getCount();
      const groups = new Map(); // rule index → vertex ids
      const keep = [];
      for (let t = 0; t < count; t += 3) {
        const P = [t, t + 1, t + 2].map((i) => world(pos.getElement(i, [])));
        const e1 = P[1].map((v, k) => v - P[0][k]),
          e2 = P[2].map((v, k) => v - P[0][k]);
        const n = [
          e1[1] * e2[2] - e1[2] * e2[1],
          e1[2] * e2[0] - e1[0] * e2[2],
          e1[0] * e2[1] - e1[1] * e2[0],
        ];
        const l = Math.hypot(...n) || 1;
        const up = n[1] / l > 0.7,
          notDown = n[1] / l > -0.7;
        const c = col ? col.getElement(t, []).slice(0, 3) : null;
        const ctr = [0, 1, 2].map((k) => (P[0][k] + P[1][k] + P[2][k]) / 3);
        const r = mine.findIndex(
          (rule) =>
            (rule.up === false ? notDown : up) &&
            (!rule.colour || (c && near(c, rule.colour))) &&
            (!rule.box ||
              (ctr[0] >= rule.box[0] &&
                ctr[0] <= rule.box[3] &&
                ctr[1] >= rule.box[1] &&
                ctr[1] <= rule.box[4] &&
                ctr[2] >= rule.box[2] &&
                ctr[2] <= rule.box[5])),
        );
        if (r < 0) keep.push(t, t + 1, t + 2);
        else {
          if (!groups.has(r)) groups.set(r, []);
          groups.get(r).push(t, t + 1, t + 2);
        }
      }
      if (!groups.size) continue;
      const make = (verts, mat, recolour) => {
        const p = doc.createPrimitive().setMaterial(mat);
        for (const sem of prim.listSemantics()) {
          const a = prim.getAttribute(sem);
          const size = a.getElementSize();
          const arr = new Float32Array(verts.length * size);
          const e = [];
          verts.forEach((v, j) => {
            a.getElement(v, e);
            for (let k = 0; k < size; k++) arr[j * size + k] = e[k];
            if (sem === "COLOR_0" && recolour)
              for (let k = 0; k < 3; k++) arr[j * size + k] = recolour[k];
          });
          p.setAttribute(
            sem,
            doc.createAccessor().setType(a.getType()).setArray(arr).setBuffer(pos.getBuffer()),
          );
        }
        return p;
      };
      for (const [r, verts] of groups) {
        const rule = mine[r];
        let p = make(verts, material(rule.kind), rule.recolour);
        // A white floor primitive without vertex colours: give it the rule's colour.
        if (!prim.getAttribute("COLOR_0") && rule.recolour) {
          const arr = new Float32Array(verts.length * 3);
          for (let j = 0; j < verts.length; j++) arr.set(rule.recolour, j * 3);
          p.setAttribute(
            "COLOR_0",
            doc.createAccessor().setType("VEC3").setArray(arr).setBuffer(pos.getBuffer()),
          );
        }
        mesh.addPrimitive(p);
        moved[rule.kind] = (moved[rule.kind] ?? 0) + verts.length / 3;
      }
      if (keep.length) mesh.addPrimitive(make(keep, prim.getMaterial(), null));
      mesh.removePrimitive(prim);
      prim.dispose();
    }
  }
  await doc.transform(prune(), weld(), meshopt({ encoder: MeshoptEncoder, level: "medium" }));
  await io.write(path.join("public", out), doc);
  return { moved, draws: root.listMeshes().reduce((s, m) => s + m.listPrimitives().length, 0) };
}

const manifests = editedManifests().map((f) => [
  f,
  JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")),
]);
const done = new Map();
for (const [id, model] of Object.entries(spec.models)) {
  const entry = manifests[0][1].models[id];
  if (!entry) throw new Error(`${id}: not in ${manifests[0][0]}`);
  for (const level of model.lods ?? [0]) {
    const src = entry.lods[level].file;
    const out = `/fps/br/models/${id}.${spec.tag}.lod${level}.glb`;
    const r = await finish(src, out, model.rules);
    done.set(src, { out, draws: r.draws });
    console.log(`${id} lod${level}: ${JSON.stringify(r.moved)} → ${out} (${r.draws} draws)`);
  }
}
for (const [file, manifest] of manifests) {
  for (const m of Object.values(manifest.models))
    m.lods = m.lods.map((lod) => {
      const d = done.get(lod.file);
      if (!d) return lod;
      return {
        ...lod,
        file: d.out,
        draws: d.draws,
        kB: Math.round(fs.statSync(path.join("public", d.out)).size / 1024),
      };
    });
  fs.writeFileSync(
    path.join(dir, file),
    file === "models.json" ? JSON.stringify(manifest, null, 1) + "\n" : JSON.stringify(manifest),
  );
}
