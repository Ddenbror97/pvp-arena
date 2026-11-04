import fs from "node:fs";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";
await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder });
const doc = await io.read(process.argv[2]);
fs.mkdirSync(process.argv[3], { recursive: true });
doc
  .getRoot()
  .listTextures()
  .forEach((t, i) =>
    fs.writeFileSync(
      `${process.argv[3]}/${i}-${(t.getName() || "tex").replace(/[^\w-]/g, "_")}.${t.getMimeType().split("/")[1]}`,
      t.getImage(),
    ),
  );
console.log(
  doc
    .getRoot()
    .listMaterials()
    .map(
      (m) =>
        `${m.getName()} base=${!!m.getBaseColorTexture()} ao=${!!m.getOcclusionTexture()} metal=${m.getMetallicFactor()} ds=${m.getDoubleSided()} alpha=${m.getAlphaMode()}`,
    )
    .join("\n"),
);
