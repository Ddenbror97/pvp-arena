/** Floor-pickup LOD of the existing CC-BY accessory and gear packs; equipped models are untouched. */
import fs from "node:fs";
import { createRequire } from "node:module";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  dequantize,
  dedup,
  weld,
  prune,
  simplifyPrimitive,
  textureCompress,
  meshopt,
  mergeDocuments,
  unpartition,
} from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";
const { MeshoptSimplifier: FloorSimplifier } = createRequire(
  new URL("../../../package.json", import.meta.url),
)("meshoptimizer");

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready]);
await FloorSimplifier.ready;
MeshoptSimplifier.useExperimentalFeatures = true;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  "meshopt.decoder": MeshoptDecoder,
  "meshopt.encoder": MeshoptEncoder,
});
const dir = "public/fps/br/models/";
const doc = await io.read(dir + "attachments.glb");
const gear = await io.read(dir + "gear.glb");
const copied = mergeDocuments(doc, gear);
const importedScene = copied.get(gear.getRoot().listScenes()[0]);
for (const child of importedScene.listChildren()) doc.getRoot().listScenes()[0].addChild(child);
importedScene.dispose();
for (const n of [...doc.getRoot().listNodes()]) if (/_Aim_/.test(n.getName())) n.dispose();
await doc.transform(dequantize(), weld());
for (const mesh of doc.getRoot().listMeshes())
  for (const p of mesh.listPrimitives()) {
    const count = p.getIndices().getCount() / 3;
    const target = /Material/.test(mesh.getName()) ? 120 : 1000;
    if (count > target)
      simplifyPrimitive(p, {
        simplifier: MeshoptSimplifier,
        ratio: target / count,
        error: 0.008,
        lockBorder: false,
      });
    if (p.getIndices().getCount() / 3 > 3000)
      simplifyPrimitive(p, {
        simplifier: MeshoptSimplifier,
        ratio: 1800 / (p.getIndices().getCount() / 3),
        error: 0.08,
        lockBorder: false,
      });
    // Some source gear consists of thousands of disconnected stitched/detail islands.
    // Match the island asset pipeline's small-error pruning, keeping the substantial shell.
    if (p.getIndices().getCount() / 3 > 3000) {
      const indices = Uint32Array.from(p.getIndices().getArray());
      const positions = Float32Array.from(p.getAttribute("POSITION").getArray());
      for (const error of [0.01, 0.02, 0.04]) {
        const [out] = MeshoptSimplifier.simplify(indices, positions, 3, 1800 * 3, error, ["Prune"]);
        if (out.length >= 900 * 3 && out.length < p.getIndices().getCount())
          p.getIndices().setArray(out);
        if (p.getIndices().getCount() / 3 <= 2400) break;
      }
      if (p.getIndices().getCount() / 3 > 3000) {
        const [out] = FloorSimplifier.simplifySloppy(indices, positions, 3, null, 1800 * 3, 0.05);
        if (out.length >= 900 * 3) p.getIndices().setArray(out);
      }
    }
  }
await doc.transform(
  unpartition(),
  prune(),
  dedup(),
  textureCompress({ encoder: sharp, targetFormat: "webp", resize: [256, 256], quality: 88 }),
  meshopt({ encoder: MeshoptEncoder, level: "medium" }),
);
doc.getRoot().getAsset().extras = {
  purpose: "Instanced floor pickups",
  source: "attachments.glb and gear.glb; CC BY credits in ATTRIBUTION.md and ATTRIBUTION-gear.md",
};
const out = dir + "ground-loot-v1.glb";
await io.write(out, doc);
console.log(
  JSON.stringify({
    bytes: fs.statSync(out).size,
    meshes: doc
      .getRoot()
      .listMeshes()
      .map((m) => ({
        name: m.getName(),
        triangles: m.listPrimitives().reduce((n, p) => n + p.getIndices().getCount() / 3, 0),
      })),
  }),
);
