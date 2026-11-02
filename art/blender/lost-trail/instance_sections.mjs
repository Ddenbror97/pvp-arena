/**
 * GPU instancing per culling section: every section node's children that share a mesh become
 * one EXT_mesh_gpu_instancing node inside that section. Unlike a scene-wide batch, each batch's
 * bounds stay local, so the renderer still frustum-culls trees section by section. Instance
 * order is shuffled (deterministically) so a batch's first N instances are an even subset.
 *
 *   node instance_sections.mjs <in.glb> <out.glb>
 */
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS, EXTMeshGPUInstancing } from "@gltf-transform/extensions";

const [input, output] = process.argv.slice(2);

function hash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}
function shuffle(list, seed) {
  let s = seed || 1;
  const next = () => {
    // mulberry32
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
}
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
    // Seeded shuffle: any prefix of a batch is a spatially even random subset, so the runtime's
    // low-quality setting can draw the first N instances (InstancedMesh.count) of a batch.
    shuffle(nodes, hash(`${section.getName()}-${mesh.getName()}`));
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
