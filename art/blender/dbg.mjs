import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder });
const d = await io.read(process.argv[2]);
const r = d.getRoot();
console.log("skins", r.listSkins().length, "nodes w/ skin", r.listNodes().filter(n=>n.getSkin()).map(n=>n.getName()), "meshes", r.listMeshes().length, "scenes", r.listScenes().length, "buffers", r.listBuffers().length);
const fp = r.listNodes().find(n=>n.getName()==="FPArms"); console.log("FPArms parent chain", fp && fp.getParentNode()?.getName(), "in scene?", r.listScenes()[0].listChildren().map(c=>c.getName()));
