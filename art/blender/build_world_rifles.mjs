/**
 * Third-person ("world") rifles for remote operators, derived from the shipped first-person GLBs.
 *
 * A remote operator used the full first-person file with the arm rig removed at runtime: the
 * M4 is still ~35 k triangles and 7 draws, the AK ~30 k and 11 draws, with 2–4 K textures. One
 * opponent in a 1v1 never noticed; nine in Bomb Defusal did (render audit 2026-11-03: each
 * operator ≈ 35–55 k triangles, 11–13 draws). Here the arm rig, sleeves, watch and spare
 * magazine are removed, the geometry is simplified (meshoptimizer, error-bounded, attributes
 * preserved), primitives sharing a material are joined, and textures are capped at 512 px.
 * Node names the runtime looks up (magazine, bolt, charging handle, muzzle markers) are kept.
 *
 *   node art/blender/build_world_rifles.mjs
 * → public/fps/models/ak47-world.glb, m4a1-world.glb (then report triangles/draws/bytes)
 */
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  dedup,
  join,
  meshopt,
  prune,
  reorder,
  simplify,
  textureCompress,
  weld,
} from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";
import { mat4 } from "gl-matrix";
import fs from "node:fs";
import path from "node:path";

const HERE = path.dirname(new URL(import.meta.url).pathname);
const MODELS = path.resolve(HERE, "../../public/fps/models");
const REMOVE = ["FPArms", "FPAccessories", "FPRig", "SpareMagazine"];
const RIFLES = [
  ["ak47-authored.glb", "ak47-world.glb"],
  ["m4a1-authored.glb", "m4a1-world.glb"],
];
await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  "meshopt.decoder": MeshoptDecoder,
  "meshopt.encoder": MeshoptEncoder,
});

const stats = (doc) => {
  let tris = 0,
    prims = 0;
  for (const m of doc.getRoot().listMeshes())
    for (const p of m.listPrimitives()) {
      prims++;
      tris += (p.getIndices()?.getCount() ?? p.getAttribute("POSITION").getCount()) / 3;
    }
  return { tris, prims, textures: doc.getRoot().listTextures().length };
};

for (const [from, to] of RIFLES) {
  const doc = await io.read(path.join(MODELS, from));
  const before = stats(doc);
  const root = doc.getRoot();
  // Every node under a removed name goes, with its meshes (prune collects the orphans).
  const doomed = new Set();
  const collect = (n) => {
    doomed.add(n);
    for (const c of n.listChildren()) collect(c);
  };
  for (const n of root.listNodes()) {
    if (!REMOVE.includes(n.getName())) continue;
    collect(n);
  }
  // Loose POV accessories (sleeves, watch) sit outside FPAccessories in some exports.
  for (const n of root.listNodes())
    if (/Sleeve|Watch|Arm(?!or)/i.test(n.getName()) && n.getMesh()) collect(n);
  for (const n of doomed) n.dispose();
  // Empty marker nodes (muzzle tip, ejection port, grips) are what the runtime reads; some
  // transforms prune empty leaves whatever the options, so record them and restore them after.
  const parentOf = new Map();
  for (const n of root.listNodes()) for (const c of n.listChildren()) parentOf.set(c, n);
  const markers = root
    .listNodes()
    .filter((n) => !n.getMesh() && !n.listChildren().length && parentOf.get(n))
    .map((n) => {
      // The ancestor chain with each local matrix: a joined/removed parent folds into the marker.
      const chain = [];
      for (let a = parentOf.get(n); a; a = parentOf.get(a))
        chain.push([a.getName(), a.getMatrix()]);
      return { name: n.getName(), matrix: n.getMatrix(), chain };
    });
  for (const s of root.listSkins()) s.dispose();
  for (const a of root.listAnimations()) a.dispose();
  // Strip skinning attributes left on the rifle meshes (the world rifle is rigid).
  for (const m of root.listMeshes())
    for (const p of m.listPrimitives())
      for (const s of ["JOINTS_0", "WEIGHTS_0"]) p.setAttribute(s, null);
  await doc.transform(
    prune({ keepLeaves: true, keepAttributes: false }),
    dedup(),
    weld(),
    // Keep ~20% of triangles, never moving a vertex by more than 0.3% of each part's size
    // (a few mm on the rifle): invisible on a third-person rifle beyond arm's length.
    simplify({ simplifier: MeshoptSimplifier, ratio: 0.2, error: 0.004, lockBorder: false }),
    // Join only primitives under the same parent, keeping named, animated parts separate.
    join({ keepNamed: true }),
    textureCompress({ encoder: sharp, targetFormat: "webp", resize: [512, 512], quality: 82 }),
    prune({ keepLeaves: true, keepAttributes: false }),
    reorder({ encoder: MeshoptEncoder }),
    meshopt({ encoder: MeshoptEncoder, level: "medium" }),
  );
  for (const m of markers) {
    if (root.listNodes().some((n) => n.getName() === m.name)) continue;
    let local = mat4.clone(m.matrix);
    for (const [name, matrix] of m.chain) {
      const parent = root.listNodes().find((n) => n.getName() === name);
      if (parent) {
        parent.addChild(doc.createNode(m.name).setMatrix(local));
        break;
      }
      local = mat4.multiply(mat4.create(), matrix, local);
    }
  }
  const after = stats(doc);
  const lost = [
    "MuzzleDeviceTip",
    "EjectionPort",
    "Magazine",
    "ChargingHandle",
    "GripL",
    "GripR",
  ].filter((n) => !root.listNodes().some((node) => node.getName() === n));
  if (lost.length) throw new Error(`${to}: runtime markers lost: ${lost.join(", ")}`);
  const out = path.join(MODELS, to);
  await io.write(out, doc);
  console.log(
    JSON.stringify({
      file: to,
      before,
      after,
      bytes: fs.statSync(out).size,
      sourceBytes: fs.statSync(path.join(MODELS, from)).size,
    }),
  );
}
