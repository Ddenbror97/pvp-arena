/**
 * Weapon attachments for the battle royale (owner, 2026-11-03), from "Free weapon accessories"
 * by LQC (CC BY 4.0, https://sketchfab.com/3d-models/free-weapon-accessories-d492ba2aaa304510a5eab5c62d16709b).
 *
 *   node br/build_attachments.mjs <extracted scene.gltf> <out.glb>     (run from art/blender)
 *
 * Keeps the eight pieces the item table uses (three sights, two scopes, a silencer, a
 * compensator and a flash hider), bakes each one's transform into its geometry in metres
 * (the pack is in decimetres), puts it at the origin (optics: base centred on the origin;
 * muzzle devices: rear face centred on the origin, the barrel axis along Z), resizes textures
 * to 512 px WebP and compresses the meshes with meshopt. Each top node is named after the
 * item's `mesh` in items.ts; the sights' reticle quads keep their own emissive material.
 */
import { NodeIO, getBounds } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  dedup,
  meshopt,
  prune,
  textureCompress,
  transformMesh,
  weld,
} from "@gltf-transform/functions";
import { MeshoptEncoder } from "meshoptimizer";
import sharp from "sharp";
import { mat4 } from "gl-matrix";

const [src, out] = process.argv.slice(2);
const KEEP = {
  "Sight 1": "optic",
  "Sight 2": "optic",
  "Sight 3": "optic",
  "Scope 1": "optic",
  "Scope 3.001": "optic",
  "Silencer 1": "muzzle",
  "Compensator 3": "muzzle",
  Flashhider: "muzzle",
};
const SCALE = 0.1;
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  "meshopt.encoder": MeshoptEncoder,
});
const doc = await io.read(src);
const root = doc.getRoot();
const scene = root.listScenes()[0];
const keep = [];
for (const node of root.listNodes()) {
  const kind = KEEP[node.getName()];
  if (!kind) continue;
  const b = getBounds(node);
  const centre = [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2];
  // Optics sit on their base; muzzle devices start at their rear face (+Z end).
  const anchor =
    kind === "optic" ? [centre[0], b.min[1], centre[2]] : [centre[0], centre[1], b.max[2]];
  const top = doc.createNode(node.getName());
  top.setExtras({
    kind,
    size: b.max.map((v, k) => +((v - b.min[k]) * SCALE).toFixed(4)),
  });
  for (const child of node.listChildren()) {
    const mesh = child.getMesh();
    if (!mesh) continue;
    const world = child.getWorldMatrix();
    const m = mat4.create();
    mat4.scale(m, m, [SCALE, SCALE, SCALE]);
    mat4.translate(
      m,
      m,
      anchor.map((v) => -v),
    );
    mat4.multiply(m, m, world);
    const copy = mesh.clone();
    transformMesh(copy, m);
    const part = doc.createNode(child.getName()).setMesh(copy);
    top.addChild(part);
  }
  keep.push(top);
}
for (const child of scene.listChildren()) scene.removeChild(child);
for (const n of keep) scene.addChild(n);
await doc.transform(
  prune(),
  dedup(),
  weld(),
  textureCompress({ encoder: sharp, targetFormat: "webp", resize: [512, 512], quality: 80 }),
  meshopt({ encoder: MeshoptEncoder, level: "medium" }),
);
await io.write(out, doc);
for (const n of keep) console.log(n.getName(), JSON.stringify(n.getExtras()));
