/**
 * Every building's window glass made breakable (owner, 2026-11-23: "Add glass windows to
 * apartments/buildings … they should have the breaking window ones with the sound. also fix
 * buildings with a window but no glass, it looks like glass but there is nothing there. audit
 * all buldings/apartments/houses").
 *
 * The island's buildings drew their window glass in their own meshes, two ways:
 *  - the procedural houses, blocks and shops (procedural-kit.mjs, build_apartment.mjs): an
 *    opaque dark slab in the vertex colour `glass` (0.13 0.18 0.24) with no collision. It looked
 *    like glass, but nothing was there: a shot or a player went through it and nobody could see
 *    in or out;
 *  - the textured-kit buildings (the fortress, the coast towns, East Works, the 2026-11-15
 *    locations, Blackwater) and a few downloads: a see-through glass material, which no shot
 *    could break.
 *
 * This takes that glass out of each building's near LOD and lists it as panes (panes.ts): the
 * breakable glass Skyline Residences, the hospital's bridges and the Arena District have, with
 * its shards and the owner's glass sound. A pane is solid to players until a bullet breaks it,
 * for everyone; sight lines pass it. The middle and far LODs keep their glass (the panes are
 * drawn only while the building is at its near LOD: pane-renderer.ts).
 *
 * A glass group (triangles sharing corners) is a pane when it is an upright slab: at most
 * 0.16 m thick along x or z, at least 0.25 m wide and 0.3 m tall. Anything else (a curved
 * glasshouse, a sloped skylight) stays in the mesh. A pane wider than 1.8 m is split into equal
 * panes (a ribbon window breaks a section at a time). The collision boxes in a pane's opening
 * (the textured kit's glass collided as wall) are cut away, so a broken pane is an opening.
 *
 *   node art/blender/br/glass_panes.mjs <from-revision> <revision> [--only=id,…] [--dry]
 *
 * Writes `<id>.<revision>.lod0.glb`, models.<revision>.json and collision.<revision>.json (the
 * world revision), and src/lib/fps/br/window-panes.json (model space: x0, x1, z0, z1, y0, y1).
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

const [from, revision] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (!from || !revision) throw new Error("usage: glass_panes.mjs <from-revision> <revision>");
const dry = process.argv.includes("--dry");
const only = process.argv
  .find((a) => a.startsWith("--only="))
  ?.slice(7)
  .split(",");
const dir = "public/fps/br/models";
const manifest = JSON.parse(fs.readFileSync(path.join(dir, `models.${from}.json`), "utf8"));
const collision = JSON.parse(fs.readFileSync(path.join(dir, `collision.${from}.json`), "utf8"));

/** The procedural kits' window glass (vertex colour, linear). */
const GLASS_COLOURS = [[0.13, 0.18, 0.24]];
/** Models whose glass is not windows, or already panes (panes.ts' plans). */
const SKIP = new Set([
  "conservatory", // a glasshouse (glasshouse.mjs): its glass is the whole building
  "bw-greenhouse",
  "lux-yacht",
]);
const PLANNED =
  /^(condo|office|brick)-(lobby|floor|roof-a|roof-b|club)$|^hosp-bridge|^arena$|^rail-station$/;
/** A pane: an upright slab at most this thick (m), at least this wide and tall. */
const THIN = 0.16,
  MIN_W = 0.25,
  MIN_H = 0.3;
/** Wider panes are split into equal ones no wider than this (m). */
const SPLIT = 1.8,
  PART = 1.5;
/** A whole pane's collision is this thick (m): panes.ts tests a player's hull against it. */
const SLAB = 0.08;

const isBuilding = (e) =>
  e.class === "building" ||
  e.class === "hero" ||
  ["dwelling", "shop", "outbuilding"].includes(e.ring);

/** Whether a primitive is see-through glass (its whole material). */
function glassMaterial(mat) {
  if (!mat) return false;
  const name = mat.getName().toLowerCase();
  return (
    mat.getAlphaMode() === "BLEND" ||
    mat.getBaseColorFactor()[3] < 0.9 ||
    !!mat.getExtension("KHR_materials_transmission") ||
    /glass|window|pane/.test(name)
  );
}

/** The glass triangles of a document: [{ prim, tri, P (model space) }]. */
function glassTriangles(doc) {
  const out = [];
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const M = node.getWorldMatrix();
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute("POSITION"),
        idx = prim.getIndices(),
        col = prim.getAttribute("COLOR_0");
      if (!pos || !idx) continue;
      const whole = glassMaterial(prim.getMaterial());
      if (!whole && !col) continue;
      const v = [0, 0, 0, 0];
      const colourGlass = (i) => {
        col.getElement(i, v);
        return GLASS_COLOURS.some((g) => g.every((c, k) => Math.abs(v[k] - c) < 0.012));
      };
      const at = (i) => {
        pos.getElement(i, v);
        return [0, 1, 2].map((r) => M[r] * v[0] + M[4 + r] * v[1] + M[8 + r] * v[2] + M[12 + r]);
      };
      for (let t = 0; t * 3 + 2 < idx.getCount(); t++) {
        const ids = [0, 1, 2].map((k) => idx.getScalar(t * 3 + k));
        if (!whole && !ids.every(colourGlass)) continue;
        out.push({ prim, tri: t, P: ids.map(at) });
      }
    }
  }
  return out;
}

/** Triangles sharing a corner (to the millimetre) → groups. */
function groups(tris) {
  const parent = tris.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const corner = new Map();
  tris.forEach((t, i) => {
    for (const p of t.P) {
      const key = p.map((v) => Math.round(v * 1000)).join(",");
      const j = corner.get(key);
      if (j === undefined) corner.set(key, i);
      else parent[find(i)] = find(j);
    }
  });
  const out = new Map();
  tris.forEach((t, i) => {
    const r = find(i);
    (out.get(r) ?? out.set(r, []).get(r)).push(t);
  });
  return [...out.values()];
}

/** A group's box, and whether it is an upright slab across x (thin in z) or z (thin in x). */
function slab(group) {
  const b = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  for (const t of group)
    for (const p of t.P)
      for (let k = 0; k < 3; k++) {
        b[k] = Math.min(b[k], p[k]);
        b[k + 3] = Math.max(b[k + 3], p[k]);
      }
  const sx = b[3] - b[0],
    sy = b[4] - b[1],
    sz = b[5] - b[2];
  if (sy < MIN_H) return null;
  if (sz <= THIN && sx >= MIN_W) return { b, along: 0 };
  if (sx <= THIN && sz >= MIN_W) return { b, along: 2 };
  return null;
}

/** The panes of a slab (model space: x0, x1, z0, z1, y0, y1), split when wide. */
function panesOf({ b, along }) {
  const thin = along === 0 ? 2 : 0;
  const mid = (b[thin] + b[thin + 3]) / 2,
    t0 = mid - SLAB / 2,
    t1 = mid + SLAB / 2;
  const a0 = b[along],
    a1 = b[along + 3];
  const n = a1 - a0 > SPLIT ? Math.ceil((a1 - a0) / PART) : 1;
  const out = [];
  for (let i = 0; i < n; i++) {
    const u0 = a0 + ((a1 - a0) * i) / n,
      u1 = a0 + ((a1 - a0) * (i + 1)) / n;
    const r = (v) => +v.toFixed(3);
    out.push(
      along === 0
        ? [r(u0), r(u1), r(t0), r(t1), r(b[1]), r(b[4])]
        : [r(t0), r(t1), r(u0), r(u1), r(b[1]), r(b[4])],
    );
  }
  return out;
}

/** Box a minus box b: up to six boxes (x0, y0, z0, x1, y1, z1). */
export function subtractBox(a, b) {
  if ([0, 1, 2].some((k) => a[k + 3] <= b[k] || a[k] >= b[k + 3])) return [a];
  const out = [];
  let r = [...a];
  for (let k = 0; k < 3; k++) {
    if (r[k] < b[k]) {
      const piece = [...r];
      piece[k + 3] = b[k];
      out.push(piece);
      r[k] = b[k];
    }
    if (r[k + 3] > b[k + 3]) {
      const piece = [...r];
      piece[k] = b[k + 3];
      out.push(piece);
      r[k + 3] = b[k + 3];
    }
  }
  return out.filter((p) => [0, 1, 2].every((k) => p[k + 3] - p[k] > 1e-4));
}

const panes = {};
const report = [];
let files = 0;
for (const [id, entry] of Object.entries(manifest.models)) {
  if (!isBuilding(entry) || SKIP.has(id) || PLANNED.test(id)) continue;
  if (only && !only.includes(id)) continue;
  const lod = entry.lods[0];
  const doc = await io.read(modelFile(lod.file));
  await doc.transform(dequantize());
  const tris = glassTriangles(doc);
  if (!tris.length) continue;
  const list = [],
    drop = new Map(); // prim → Set of triangle indices
  let kept = 0,
    doors = 0,
    openings = [];
  // Floor levels: the ground and the tops of the model's slabs (collision boxes under 0.45 m
  // thick and 1.2 m across both ways).
  const floors = [0];
  for (const c of collision.models[id] ?? [])
    if (c[4] - c[1] < 0.45 && c[3] - c[0] > 1.2 && c[5] - c[2] > 1.2) floors.push(c[4]);
  for (const g of groups(tris)) {
    const s = slab(g);
    if (!s) {
      kept += g.length;
      continue;
    }
    // A glazed door (tall glass standing on a floor: the police station's lobby doors) stays as
    // it is: a pane there would shut the way in until someone shot it.
    if (s.b[4] - s.b[1] > 1.8 && floors.some((f) => s.b[1] - f > -0.05 && s.b[1] - f < 0.3)) {
      doors++;
      kept += g.length;
      continue;
    }
    list.push(...panesOf(s));
    openings.push(s);
    for (const t of g) (drop.get(t.prim) ?? drop.set(t.prim, new Set()).get(t.prim)).add(t.tri);
  }
  if (!list.length) continue;
  // Collision: open each pane's opening through the wall (its own height and width, 0.2 m
  // either side of the glass).
  const boxes = collision.models[id] ?? [];
  let cut = 0;
  let next = boxes;
  for (const { b, along } of openings) {
    const thin = along === 0 ? 2 : 0;
    const hole = [...b];
    const mid = (b[thin] + b[thin + 3]) / 2;
    hole[thin] = mid - 0.2;
    hole[thin + 3] = mid + 0.2;
    hole[along] += 0.02;
    hole[along + 3] -= 0.02;
    hole[1] += 0.02;
    hole[4] -= 0.02;
    const after = [];
    for (const box of next) {
      const parts = subtractBox(box, hole);
      if (parts.length !== 1 || parts[0] !== box) cut++;
      after.push(...parts);
    }
    next = after;
  }
  collision.models[id] = next;
  panes[id] = list;
  report.push(
    `${id.padEnd(22)} panes ${String(list.length).padStart(4)} (openings ${String(openings.length).padStart(3)})  glass triangles kept ${String(kept).padStart(5)} (doors ${doors})  collision boxes cut ${cut}`,
  );
  if (dry) continue;
  for (const [prim, set] of drop) {
    const idx = prim.getIndices();
    const keep = [];
    for (let t = 0; t * 3 + 2 < idx.getCount(); t++)
      if (!set.has(t)) for (let k = 0; k < 3; k++) keep.push(idx.getScalar(t * 3 + k));
    if (keep.length)
      prim.setIndices(
        doc
          .createAccessor()
          .setType("SCALAR")
          .setArray(new Uint32Array(keep))
          .setBuffer(idx.getBuffer()),
      );
    else prim.dispose();
  }
  await doc.transform(weld(), prune(), meshopt({ encoder: MeshoptEncoder, level: "medium" }));
  const out = `/fps/br/models/${id}.${revision}.lod0.glb`;
  await io.write(path.join("public", out), doc);
  const written = await io.read(path.join("public", out));
  lod.file = out;
  lod.tris = written
    .getRoot()
    .listMeshes()
    .flatMap((m) => m.listPrimitives())
    .reduce((s, p) => s + p.getIndices().getCount() / 3, 0);
  lod.kB = Math.round(fs.statSync(path.join("public", out)).size / 1024);
  files++;
}
console.log(report.join("\n"));
const total = Object.values(panes).reduce((s, l) => s + l.length, 0);
console.log(
  `${Object.keys(panes).length} models, ${total} panes per set of placements, ${files} files`,
);
if (!dry) {
  manifest.worldRevision = collision.worldRevision = revision;
  fs.writeFileSync(path.join(dir, `models.${revision}.json`), JSON.stringify(manifest));
  fs.writeFileSync(path.join(dir, `collision.${revision}.json`), JSON.stringify(collision));
  fs.writeFileSync(
    "src/lib/fps/br/window-panes.json",
    JSON.stringify({ revision, models: panes }, null, 1) + "\n",
  );
}
