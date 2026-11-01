/**
 * GPU instancing per culling section: every section node's children that share a mesh become
 * one EXT_mesh_gpu_instancing node inside that section. Unlike a scene-wide batch, each batch's
 * bounds stay local, so the renderer still frustum-culls trees section by section.
 *
 *   node instance_sections.mjs <in.glb> <out.glb>
 */
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS, EXTMeshGPUInstancing } from "@gltf-transform/extensions";

const [input, output] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(input);
const ext = doc.createExtension(EXTMeshGPUInstancing).setRequired(true);
const buffer = doc.getRoot().listBuffers()[0];
let batches = 0,
  instances = 0;
for (const section of doc.getRoot().listNodes()) {
  const groups = new Map();
  for (const child of section.listChildren()) {
    const mesh = child.getMesh();
    if (!mesh || child.listChildren().length) continue;
    if (!groups.has(mesh)) groups.set(mesh, []);
    groups.get(mesh).push(child);
  }
  for (const [mesh, nodes] of groups) {
    if (nodes.length < 2) continue;
    const t = new Float32Array(nodes.length * 3),
      r = new Float32Array(nodes.length * 4),
      s = new Float32Array(nodes.length * 3);
    nodes.forEach((n, i) => {
      t.set(n.getTranslation(), i * 3);
      r.set(n.getRotation(), i * 4);
      s.set(n.getScale(), i * 3);
    });
    const acc = (array, type) => doc.createAccessor().setType(type).setArray(array).setBuffer(buffer);
    const batch = doc
      .createNode(`${section.getName()}-${mesh.getName()}`)
      .setMesh(mesh)
      .setExtension(
        "EXT_mesh_gpu_instancing",
        ext
          .createInstancedMesh()
          .setAttribute("TRANSLATION", acc(t, "VEC3"))
          .setAttribute("ROTATION", acc(r, "VEC4"))
          .setAttribute("SCALE", acc(s, "VEC3")),
      );
    // Keep the shadow flag the first instance carried (glTF extras).
    batch.setExtras(nodes[0].getExtras());
    section.addChild(batch);
    for (const n of nodes) n.dispose();
    batches++;
    instances += nodes.length;
  }
}
await io.write(output, doc);
console.log(JSON.stringify({ batches, instances }));
