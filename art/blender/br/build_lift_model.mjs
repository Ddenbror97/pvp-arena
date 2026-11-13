/**
 * The Skyline Residences lift (owner, 2026-11-13: "upgrade the elevator design, it looks like a
 * empty room … there should be a elevator door"): the owner's download "Elevator with Animation
 * LOWPOLY" by EFX (Sketchfab, CC BY 4.0; credited in public/fps/br/models/ATTRIBUTION.md) made a
 * game asset for lift-renderer.ts, which fits its parts to the condo's shaft and moves them.
 *
 *   node art/blender/br/build_lift_model.mjs <scene.gltf>   (run from the repo root)
 *     → public/fps/br/models/lift-cab.efx-v1.glb
 *
 * Kept: the cab (walnut walls, chrome handrail, lit ceiling, stone floor: `Elevator`), its
 * button panel (`ButtonsPanel`), the hall's call buttons (`OutsideButtons`), the floor display
 * over the door (`ScreenOutside`) and one door leaf (`Door1`, drawn as each of the four leaves:
 * the landing's pair and the cab's). Dropped: the wallpapered wall (the condo has its own), the
 * second leaf and the door animation (the leaves slide by code, on the ride's clock).
 * Flattened (each part a root node in metres, the source's own frame: +y up, the door on +z),
 * textures 512 px WebP, the mirror-like metal given some roughness (no reflections to show in
 * the game) and the emissive strengths toned down for the game's exposure. Meshopt.
 */
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { meshopt, prune, dedup, textureCompress, weld } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import sharp from "sharp";

const [src] = process.argv.slice(2);
if (!src) throw new Error("usage: build_lift_model.mjs <scene.gltf>");
await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });
const doc = await io.read(src);
const root = doc.getRoot();
const KEEP = ["Elevator", "ButtonsPanel", "OutsideButtons", "ScreenOutside", "Door1"];
for (const a of root.listAnimations()) a.dispose();
const drop = (n) => {
  for (const c of n.listChildren()) drop(c);
  n.dispose();
};
for (const n of root.listNodes()) if (n.getName() === "Wall" || n.getName() === "Door2") drop(n);
// Each kept part as a root group of its meshes, their world transforms baked in (metres).
const scene = root.listScenes()[0];
const groups = KEEP.map((name) => {
  const part = root.listNodes().find((n) => n.getName() === name);
  if (!part) throw new Error(`${name} missing`);
  const group = doc.createNode(`lift-${name}`);
  const meshes = [];
  const walk = (n) => {
    if (n.getMesh()) meshes.push([n, n.getWorldMatrix()]);
    n.listChildren().forEach(walk);
  };
  walk(part);
  for (const [n, m] of meshes) {
    const copy = doc.createNode(n.getName()).setMesh(n.getMesh()).setMatrix(m);
    group.addChild(copy);
  }
  return group;
});
for (const n of scene.listChildren()) drop(n);
for (const g of groups) scene.addChild(g);
for (const m of root.listMaterials()) {
  m.setDoubleSided(false);
  const ext = m.getExtension("KHR_materials_clearcoat");
  if (ext) m.setExtension("KHR_materials_clearcoat", null);
  const strength = m.getExtension("KHR_materials_emissive_strength");
  if (strength) m.setExtension("KHR_materials_emissive_strength", null);
  switch (m.getName()) {
    case "ElevatorMetal":
      m.setMetallicFactor(0.55).setRoughnessFactor(0.28).setBaseColorFactor([0.72, 0.72, 0.73, 1]);
      break;
    case "ElevatorFloor":
      m.setMetallicFactor(0).setRoughnessFactor(0.35);
      break;
    case "LightEmis":
      m.setEmissiveFactor([1.6, 1.55, 1.45].map((v) => Math.min(1, v)));
      break;
    case "ElevatorScreen":
    case "Buttons":
      m.setEmissiveFactor([1, 1, 1]);
      break;
  }
}
await doc.transform(
  prune(),
  dedup(),
  weld(),
  textureCompress({ encoder: sharp, targetFormat: "webp", quality: 82, resize: [512, 512] }),
  meshopt({ encoder: MeshoptEncoder, level: "medium" }),
);
const out = "public/fps/br/models/lift-cab.efx-v1.glb";
await io.write(out, doc);
const tris = root
  .listMeshes()
  .reduce(
    (n, m) => n + m.listPrimitives().reduce((s, p) => s + p.getIndices().getCount() / 3, 0),
    0,
  );
console.log(
  out,
  `${tris} tris`,
  scene
    .listChildren()
    .map((n) => n.getName())
    .join(", "),
);
