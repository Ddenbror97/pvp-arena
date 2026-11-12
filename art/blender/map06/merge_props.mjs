/**
 * Adds the street-life props (props.py → instance_sections.mjs) to the SANDGATE scene: the props'
 * section node joins the map's scene, its meshes, materials and textures come along, and the two
 * documents' buffers become the one a GLB holds. The base may already be meshopt-compressed (the
 * shipped file) and may already hold an earlier build of the props, which is replaced (so the props
 * can be rebuilt on their own: build_props.sh). meshopt runs over the result after.
 *
 *   node merge_props.mjs <base.glb> <props.glb> <out.glb>
 */
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { mergeDocuments, prune, unpartition } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";

const [base, props, output] = process.argv.slice(2);
await MeshoptDecoder.ready;
await MeshoptEncoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });
const doc = await io.read(base);
const add = await io.read(props);
const root = doc.getRoot();
const scene = root.getDefaultScene() ?? root.listScenes()[0];
const dispose = (node) => {
  for (const child of node.listChildren()) dispose(child);
  node.dispose();
};
const old = root.listNodes().filter((n) => n.getName() === "section-Street_Props");
for (const n of old) dispose(n);
if (old.length) await doc.transform(prune());
const map = mergeDocuments(doc, add);
for (const s of add.getRoot().listScenes())
  for (const n of s.listChildren()) {
    const node = map.get(n);
    for (const other of root.listScenes()) if (other !== scene) other.removeChild(node);
    scene.addChild(node);
  }
for (const s of root.listScenes()) if (s !== scene) s.dispose();
await doc.transform(unpartition());
await io.write(output, doc);
console.log(JSON.stringify({ nodes: root.listNodes().length, meshes: root.listMeshes().length }));
