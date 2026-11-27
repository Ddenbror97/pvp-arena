/**
 * Faces added to (and boxes cut out of) a published model's LODs, for gaps a later pass left in a
 * building (owner, 2026-11-27: "buildings that is incompleted built … prison, some single
 * buildings": a window a stair crossed, a slot under the keep's courtyard parapet, an open
 * floor strip round a house's walls, a stair with no side).
 *
 * Each part is appended to the primitive whose material (or node) is named `prim`, in model
 * space. Its texture coordinates and colour are taken from that primitive's own triangle
 * nearest the new face and facing the same way: the affine map from position to texture
 * coordinates of that triangle is carried onto the new face, so a patch continues its
 * neighbour's texture whatever the kit's projection or the file's quantisation. `tint` replaces
 * the colour (vertex-coloured kits: the part's own colour). Render only: collision is
 * patch_collision.mjs's.
 *
 * Parts:
 *   { prim, box: [x0,y0,z0,x1,y1,z1], faces?: ["x0","x1","y0","y1","z0","z1"], tint?, why }
 *   (any part: `uvTile` maps it as textured-kit.mjs does, metres by the face's main axis over
 *   the material's tile, for the kit-built models whose coordinates are that projection)
 *   { prim, poly: [[x,z], …] (convex, either winding), y, down?: bool, tint?, why }
 *   { prim, quad: [[x,y,z] × 4] (counter-clockwise seen from the front), tint?, why }
 * Cuts (triangles of `prim`, or of every primitive, inside the box are removed):
 *   { prim?, box: [x0,y0,z0,x1,y1,z1], why }
 *
 *   node art/blender/br/patch_parts.mjs <spec.json>
 *   (spec: { tag, models: { id: { lods: [0, 1], parts: [...], cuts: [...] } } })
 *
 * Writes `<id>.<tag>.lod<N>.glb` and points the live and base manifests at them (as
 * add_pole.mjs: make the new revision's manifests first).
 */
import fs from "node:fs";
import path from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { meshopt, prune } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import { cutPrimitive } from "./mesh-cut.mjs";
import { editedManifests, modelFile } from "./model-files.mjs";

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });
const spec = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const dir = "public/fps/br/models";

const sub = (a, b) => a.map((v, i) => v - b[i]);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const unit = (a) => {
  const l = Math.hypot(...a) || 1;
  return a.map((v) => v / l);
};
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

/** A part's faces as polygons of model-space points, each with its outward normal. */
function polygons(part) {
  if (part.box) {
    const [x0, y0, z0, x1, y1, z1] = part.box;
    const all = {
      x0: [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]],
      x1: [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]],
      y0: [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]],
      y1: [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]],
      z0: [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]],
      z1: [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]],
    };
    return (part.faces ?? Object.keys(all)).map((f) => all[f]);
  }
  if (part.poly) {
    let pts = part.poly.map(([x, z]) => [x, part.y, z]);
    // Wind it to face up (or down).
    let area = 0;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i],
        q = pts[(i + 1) % pts.length];
      area += p[0] * q[2] - q[0] * p[2];
    }
    // Counter-clockwise seen from +y is clockwise in (x, z): area < 0.
    if (area > 0 !== !!part.down) pts = [...pts].reverse();
    return [pts];
  }
  if (part.quad) return [part.quad];
  throw new Error(`part without a shape: ${JSON.stringify(part)}`);
}

/** Every triangle of a primitive in model space, with its attribute values. */
function triangles(prim, W) {
  const pos = prim.getAttribute("POSITION"),
    idx = prim.getIndices();
  const n = idx ? idx.getCount() : pos.getCount();
  const out = [];
  for (let i = 0; i < n; i += 3) {
    const ids = [0, 1, 2].map((k) => (idx ? idx.getScalar(i + k) : i + k));
    const p = ids.map((j) => apply(W, pos.getElement(j, [])));
    const nrm = cross(sub(p[1], p[0]), sub(p[2], p[0]));
    if (Math.hypot(...nrm) < 1e-9) continue;
    out.push({ ids, p, n: unit(nrm), c: p[0].map((v, k) => (v + p[1][k] + p[2][k]) / 3) });
  }
  return out;
}

/** The triangle a new face takes its texture mapping and colour from. */
function reference(tris, face, normal, hint) {
  const centre = hint ?? face[0].map((_, k) => face.reduce((s, v) => s + v[k], 0) / face.length);
  let best = null;
  for (const t of tris) {
    if (dot(t.n, normal) < 0.98) continue;
    const off = Math.abs(dot(sub(centre, t.p[0]), t.n));
    const d = off * 4 + Math.hypot(...sub(centre, t.c));
    if (!best || d < best.d) best = { d, t };
  }
  if (!best) throw new Error(`no triangle facing ${normal.map((v) => v.toFixed(2))} to copy from`);
  return best.t;
}

/** Attribute values for a point from a reference triangle (affine in the triangle's plane). */
function attributes(prim, t, q, normal, tint, kitTile, worldNormal) {
  const e1 = sub(t.p[1], t.p[0]),
    e2 = sub(t.p[2], t.p[0]),
    d = sub(q, t.p[0]);
  // Solve d ≈ a e1 + b e2 (least squares in the plane).
  const a11 = dot(e1, e1),
    a12 = dot(e1, e2),
    a22 = dot(e2, e2),
    b1 = dot(d, e1),
    b2 = dot(d, e2);
  const det = a11 * a22 - a12 * a12;
  const a = (b1 * a22 - b2 * a12) / det,
    b = (a11 * b2 - a12 * b1) / det;
  const out = {};
  for (const s of prim.listSemantics()) {
    if (s === "POSITION") continue;
    const acc = prim.getAttribute(s);
    const v = t.ids.map((j) => acc.getElement(j, []));
    if (s === "NORMAL") out[s] = normal;
    else if (s === "TEXCOORD_0" && kitTile) {
      // The textured kit's own mapping (textured-kit.mjs geometry): metres by the face's main
      // axis over the material's tile.
      const [ax, ay, az] = worldNormal.map(Math.abs);
      const [u, w] = ay >= ax && ay >= az ? [q[0], q[2]] : ax >= az ? [q[2], -q[1]] : [q[0], -q[1]];
      out[s] = [u / kitTile, w / kitTile];
    } else if (s.startsWith("TEXCOORD"))
      out[s] = v[0].map((x, k) => x + a * (v[1][k] - x) + b * (v[2][k] - x));
    else if (s === "COLOR_0" && tint) out[s] = v[0].length === 4 ? [...tint, 1] : [...tint];
    else out[s] = v[0];
  }
  return out;
}

function findPrim(doc, name) {
  const all = doc
    .getRoot()
    .listNodes()
    .flatMap((node) => (node.getMesh()?.listPrimitives() ?? []).map((prim) => ({ node, prim })));
  // The material's name first; the node's only when no material has it.
  let found = all.filter(({ prim }) => prim.getMaterial()?.getName() === name);
  if (!found.length) found = all.filter(({ node }) => node.getName() === name);
  if (found.length !== 1)
    throw new Error(`primitive "${name}": ${found.length} found (material or node name)`);
  return found[0];
}

async function patch(src, out, model) {
  const doc = await io.read(modelFile(src));
  let added = 0,
    cut = 0;
  for (const c of model.cuts ?? []) {
    const targets = c.prim
      ? [findPrim(doc, c.prim)]
      : doc
          .getRoot()
          .listNodes()
          .flatMap((node) => (node.getMesh()?.listPrimitives() ?? []).map((prim) => ({ node, prim })));
    for (const { node, prim } of targets) {
      const inv = invert(node.getWorldMatrix());
      const a = apply(inv, c.box.slice(0, 3)),
        b = apply(inv, c.box.slice(3));
      const box = [0, 1, 2].map((k) => Math.min(a[k], b[k]));
      box.push(...[0, 1, 2].map((k) => Math.max(a[k], b[k])));
      const before = (prim.getIndices()?.getCount() ?? prim.getAttribute("POSITION").getCount()) / 3;
      cutPrimitive(doc, prim, [box], false);
      cut += before - prim.getAttribute("POSITION").getCount() / 3;
    }
  }
  // Group the parts by primitive, append each group in one go.
  const groups = new Map();
  for (const part of model.parts ?? []) {
    if (!groups.has(part.prim)) groups.set(part.prim, []);
    groups.get(part.prim).push(part);
  }
  for (const [name, parts] of groups) {
    const { node, prim } = findPrim(doc, name);
    const W = node.getWorldMatrix(),
      inv = invert(W);
    const tris = triangles(prim, W);
    const sems = prim.listSemantics();
    const extra = Object.fromEntries(sems.map((s) => [s, []]));
    const newIdx = [];
    const count = prim.getAttribute("POSITION").getCount();
    let next = count;
    for (const part of parts)
      for (const face of polygons(part)) {
        const normal = unit(cross(sub(face[1], face[0]), sub(face[2], face[0])));
        // (A kit-mapped part with its own colour needs no triangle to copy from.)
        const own = part.uvTile && part.tint;
        const t = own ? tris[0] : reference(tris, face, normal, part.ref);
        const ln = unit(sub(apply(inv, normal), apply(inv, [0, 0, 0])));
        for (const q of face) {
          const at = attributes(prim, t, q, ln, part.tint, part.uvTile, normal);
          for (const s of sems)
            extra[s].push(...(s === "POSITION" ? apply(inv, q) : at[s]));
        }
        for (let k = 1; k + 1 < face.length; k++) newIdx.push(next, next + k, next + k + 1);
        next += face.length;
        added += face.length - 2;
      }
    for (const s of sems) {
      const acc = prim.getAttribute(s);
      const old = Array.from({ length: count }, (_, q) => acc.getElement(q, [])).flat();
      acc.setNormalized(false);
      acc.setArray(new Float32Array([...old, ...extra[s]]));
    }
    const idx = prim.getIndices();
    const oldIdx = idx ? Array.from(idx.getArray()) : Array.from({ length: count }, (_, i) => i);
    if (idx) idx.setArray(new Uint32Array([...oldIdx, ...newIdx]));
    else prim.setIndices(doc.createAccessor().setType("SCALAR").setArray(new Uint32Array([...oldIdx, ...newIdx])));
  }
  await doc.transform(prune(), meshopt({ encoder: MeshoptEncoder, level: "medium" }));
  await io.write(path.join("public", out), doc);
  return { added, cut: Math.round(cut) };
}

const manifests = editedManifests().map((f) => [
  f,
  JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")),
]);
const done = new Map();
for (const [id, model] of Object.entries(spec.models)) {
  const entry = manifests[0][1].models[id];
  if (!entry) throw new Error(`${id}: not in ${manifests[0][0]}`);
  for (const level of model.lods ?? [0, 1]) {
    const src = entry.lods[level].file;
    const out = `/fps/br/models/${id}.${spec.tag}.lod${level}.glb`;
    // Run once per tag: a second run would patch its own output again.
    if (src === out) throw new Error(`${id} lod${level}: already ${spec.tag} (run on fresh manifests)`);
    const lodModel = {
      parts: (model.parts ?? []).filter((p) => (p.lods ?? model.lods ?? [0, 1]).includes(level)),
      cuts: (model.cuts ?? []).filter((c) => (c.lods ?? model.lods ?? [0, 1]).includes(level)),
    };
    const r = await patch(src, out, lodModel);
    done.set(src, { out, added: r.added - r.cut });
    console.log(`${id} lod${level}: +${r.added} triangles, ${-r.cut >= 0 ? "+" : "−"}${Math.abs(r.cut)} from cuts → ${out}`);
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
        tris: lod.tris + d.added,
        kB: Math.round(fs.statSync(path.join("public", d.out)).size / 1024),
      };
    });
  fs.writeFileSync(
    path.join(dir, file),
    file === "models.json" ? JSON.stringify(manifest, null, 1) + "\n" : JSON.stringify(manifest),
  );
}
