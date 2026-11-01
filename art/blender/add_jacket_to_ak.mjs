/**
 * Dress the Terrorist (AK-47) first-person arms in the white duty jacket.
 *
 *   node add_jacket_to_ak.mjs <ak-source.glb> <jacket-sleeve.glb> <out.glb>
 *
 * Adds `JacketSleeve` (arms/build_jacket_sleeve.py) under FPAccessories. Nothing else changes:
 * rifle, arm mesh, skin, bones, markers and the olive sleeve/watch stay as they are (the
 * runtime picks the jacket for the AK; check_rig_unchanged.mjs proves the rig is untouched).
 */
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { mergeDocuments, prune, dedup, meshopt } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";

const [akSource, jacketGlb, outGlb] = process.argv.slice(2);
if (!outGlb) {
  console.error("usage: add_jacket_to_ak.mjs <ak-source.glb> <jacket-sleeve.glb> <out.glb>");
  process.exit(2);
}
await MeshoptDecoder.ready;
await MeshoptEncoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });
const target = await io.read(akSource);
const root = target.getRoot();
const byName = (name) => root.listNodes().find((n) => n.getName() === name);
const scenes = new Set(root.listScenes());
for (const old of root.listNodes().filter((n) => n.getName() === "JacketSleeve")) old.dispose();
const jacketDoc = await io.read(jacketGlb);
const map = mergeDocuments(target, jacketDoc);
const sleeve = map.get(
  jacketDoc
    .getRoot()
    .listNodes()
    .find((n) => n.getName() === "JacketSleeve"),
);
if (!sleeve) throw new Error("JacketSleeve missing from the jacket GLB");
for (const scene of root.listScenes()) {
  if (scene.listChildren().includes(sleeve)) scene.removeChild(sleeve);
  if (!scenes.has(scene)) scene.dispose();
}
byName("FPAccessories").addChild(sleeve);
const [mainBuffer, ...extra] = root.listBuffers();
for (const accessor of root.listAccessors()) accessor.setBuffer(mainBuffer);
for (const buffer of extra) buffer.dispose();
await target.transform(
  prune({ keepLeaves: true, keepAttributes: true }),
  dedup(),
  meshopt({ encoder: MeshoptEncoder, level: "medium" }),
);
await io.write(outGlb, target);
console.log(`JacketSleeve added → ${outGlb}`);
