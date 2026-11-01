/**
 * Build the Police M4A1 viewmodel GLB: the Blender-built rifle (build_m4_viewmodel.py) on the
 * shared first-person arm rig of the AK viewmodel.
 *
 *   node merge_m4_viewmodel.mjs <ak-source.glb> <m4-rifle.glb> <out.glb>
 *
 * <ak-source.glb> is the decompressed shipped AK GLB (`npm run decompress`). It is only read:
 * the AK asset is never written. From it the M4 takes the arm mesh, skin, bones and the
 * right-hand GripR frame byte-for-byte (the runtime fits the hands procedurally against those
 * frames), and the bare-forearm accessories (olive rolled sleeve, field watch) that the Police
 * arms wear. The AK rifle is dropped. The source must be the AK GLB *before* the jacket sleeve
 * was added (add_jacket_to_ak.mjs), i.e. `git show <rev>:public/fps/models/ak47-authored.glb`.
 *
 * Placement: the M4 is moved forward so its pistol grip overlaps the AK's (side-view overlay in
 * art/blender/m4/README.md); the bore stays on the AK's bore line.
 */
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { mergeDocuments, prune, dedup, meshopt, textureCompress } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import sharp from "sharp";

/** Rifle-local forward shift (−Z is toward the muzzle) that lands the grip in the right hand. */
export const M4_GRIP_ALIGN = [0, 0, -0.54];
/** Support grip: middle of the quad-rail handguard, on the bore line. */
export const M4_GRIP_L = [0, 0, -0.76];

const [akSource, rifleGlb, outGlb] = process.argv.slice(2);
if (!outGlb) {
  console.error("usage: merge_m4_viewmodel.mjs <ak-source.glb> <m4-rifle.glb> <out.glb>");
  process.exit(2);
}
await MeshoptDecoder.ready;
await MeshoptEncoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });

const target = await io.read(akSource);
const source = await io.read(rifleGlb);
const root = target.getRoot();
const byName = (name) => root.listNodes().find((n) => n.getName() === name);
const originalScenes = new Set(root.listScenes());
const fp = byName("FP_ak47");
if (!fp) throw new Error("FP_ak47 root missing from the AK source");

const map = mergeDocuments(target, source);
const m4 = map.get(
  source
    .getRoot()
    .listNodes()
    .find((n) => n.getName() === "M4A1"),
);
if (!m4) throw new Error("M4A1 root missing from the rifle GLB");
for (const scene of root.listScenes()) if (scene.listChildren().includes(m4)) scene.removeChild(m4);

const gun = target.createNode("Gun_m4a1").setTranslation(M4_GRIP_ALIGN).addChild(m4);
fp.setName("FP_m4a1").addChild(gun);

// Drop the AK rifle (and a jacket sleeve, should the source already carry one).
const drop = (node) => {
  for (const child of node.listChildren()) drop(child);
  node.dispose();
};
drop(byName("Gun_ak47"));
for (const name of ["JacketSleeve", "SpareMagazine", "VGripMount"]) {
  const node = byName(name);
  if (node) drop(node);
}
byName("GripL").setTranslation(M4_GRIP_L);
for (const scene of root.listScenes()) if (!originalScenes.has(scene)) scene.dispose();

const [mainBuffer, ...extraBuffers] = root.listBuffers();
for (const accessor of root.listAccessors()) accessor.setBuffer(mainBuffer);
for (const buffer of extraBuffers) buffer.dispose();

const required = [
  "FPArms",
  "FPRig",
  "Hand_L",
  "GripL",
  "GripR",
  "Magazine",
  "MagazineGrip",
  "ChargingHandle",
  "MuzzleDeviceTip",
  "EjectionPort",
  "BoltCatch",
  "MagRelease",
  "ArmSleeve",
  "ArmWatch",
];
for (const name of required) if (!byName(name)) throw new Error(`missing node ${name}`);

await target.transform(
  prune({ keepLeaves: true, keepAttributes: true }),
  dedup(),
  textureCompress({ encoder: sharp, targetFormat: "webp", quality: 88 }),
  meshopt({ encoder: MeshoptEncoder, level: "medium" }),
);
await io.write(outGlb, target);
const tris = root
  .listMeshes()
  .reduce(
    (n, mesh) =>
      n + mesh.listPrimitives().reduce((s, p) => s + (p.getIndices()?.getCount() ?? 0) / 3, 0),
    0,
  );
console.log(`M4A1 viewmodel → ${outGlb}: ${root.listMeshes().length} meshes, ${tris} triangles`);
