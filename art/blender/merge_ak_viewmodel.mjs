/**
 * Merge the Blender-processed rifle meshes back into the shipped viewmodel GLB.
 *
 *   node merge_ak_viewmodel.mjs <shipped.glb> <blender rifle.glb> <wear.png> <out.glb> <out wear.webp>
 *
 * <shipped.glb> may reference sibling textures (the original did: arms_*.webp); they are read
 * from its folder and embedded, so the output is one self-contained file.
 *
 * Only rifle mesh data is replaced (positions, normals, UV0 and the new wear UV1). Node names,
 * transforms, materials, the arm mesh, skin and the authored hand rig stay byte-for-byte the
 * source's, so the runtime grip fitting sees exactly the bone frames it was tuned on.
 */
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { mergeDocuments, prune, dedup, meshopt } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import sharp from "sharp";
const [shipped, processed, wearPng, outGlb, outWear] = process.argv.slice(2);
if (!outWear) {
  console.error("usage: merge_ak_viewmodel.mjs <shipped.glb> <rifle.glb> <wear.png> <out.glb> <out.webp>");
  process.exit(2);
}
await MeshoptDecoder.ready;
await MeshoptEncoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });

const target = await io.read(shipped);
const source = await io.read(processed);
const root = target.getRoot();
const originalNodes = new Map(root.listNodes().map((node) => [node.getName(), node]));
const originalScenes = new Set(root.listScenes());
const map = mergeDocuments(target, source);

let replaced = 0;
for (const node of source.getRoot().listNodes()) {
  const mesh = node.getMesh();
  if (!mesh) continue;
  const into = originalNodes.get(node.getName());
  if (!into?.getMesh()) throw new Error(`No mesh node named ${node.getName()} in the shipped GLB`);
  const before = into.getMesh().listPrimitives();
  const merged = map.get(mesh);
  const after = merged.listPrimitives();
  if (before.length !== after.length)
    throw new Error(`${node.getName()}: ${before.length} → ${after.length} primitives`);
  // Keep the shipped materials (the runtime keys its finishes by material name).
  after.forEach((primitive, i) => primitive.setMaterial(before[i].getMaterial()));
  if (!after.every((p) => p.getAttribute("TEXCOORD_1")))
    throw new Error(`${node.getName()}: missing wear UV (TEXCOORD_1)`);
  into.setMesh(merged);
  replaced++;
}
// The runtime never shows the spare magazine; ship without it.
for (const name of ["SpareMagazine"]) originalNodes.get(name)?.dispose();
for (const scene of root.listScenes()) if (!originalScenes.has(scene)) scene.dispose();
// One data buffer (the merge brought the Blender file's along), then meshopt adds its fallback.
const [mainBuffer, ...extraBuffers] = root.listBuffers();
for (const accessor of root.listAccessors()) accessor.setBuffer(mainBuffer);
for (const buffer of extraBuffers) buffer.dispose();
// Keep marker empties (GripL/R, MagazineGrip, MuzzleDeviceTip…) and the wear UV, which no
// glTF material references (only the runtime finish shader reads it).
await target.transform(prune({ keepLeaves: true, keepAttributes: true }), dedup(), meshopt({ encoder: MeshoptEncoder, level: "medium" }));
// Self-contained GLB: the arm textures that used to sit beside it are embedded.
await io.write(outGlb, target);

await sharp(wearPng).webp({ quality: 90, effort: 6 }).toFile(outWear);
console.log(`replaced ${replaced} rifle meshes → ${outGlb}; wear map → ${outWear}`);
