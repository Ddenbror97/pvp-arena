import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder });
const doc = await io.read(process.argv[2]);
for (const m of doc.getRoot().listMeshes())
  for (const p of m.listPrimitives()) {
    const pos = p.getAttribute("POSITION");
    console.log(m.getName(), "mode", p.getMode(), "verts", pos.getCount(), "idx", p.getIndices()?.getCount(), pos.getArray().constructor.name, pos.getNormalized(), "attrs", p.listSemantics().join(","));
  }
