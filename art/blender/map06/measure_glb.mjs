/**
 * Render-cost numbers for map GLBs: file size, draw calls (mesh primitives per node; a GPU
 * instanced node is one call), unique and rendered triangles, materials, textures and their
 * GPU memory (RGBA8 + full mip chain, as three.js uploads jpg/png/webp).
 *
 *   node measure_glb.mjs <a.glb> [b.glb ...] [--json out.json]
 */
import fs from "node:fs";
import path from "node:path";
import { NodeIO, ImageUtils } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";

const args = process.argv.slice(2);
const jsonAt = args.indexOf("--json");
const out = jsonAt >= 0 ? args.splice(jsonAt, 2)[1] : null;
await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder });

function tris(prim) {
  const idx = prim.getIndices();
  const n = idx ? idx.getCount() : prim.getAttribute("POSITION").getCount();
  return prim.getMode() === 4 ? n / 3 : 0;
}

const results = {};
for (const file of args) {
  const doc = await io.read(file);
  const root = doc.getRoot();
  let draws = 0,
    rendered = 0,
    instancedNodes = 0,
    shadowCasters = 0;
  for (const node of root.listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const inst = node.getExtension("EXT_mesh_gpu_instancing");
    const count = inst ? inst.listAttributes()[0].getCount() : 1;
    if (inst) instancedNodes++;
    const noShadow = node.getExtras()?.noShadow;
    for (const prim of mesh.listPrimitives()) {
      draws++;
      if (!noShadow) shadowCasters++;
      rendered += tris(prim) * count;
    }
  }
  let unique = 0;
  for (const mesh of root.listMeshes()) for (const p of mesh.listPrimitives()) unique += tris(p);
  let texBytes = 0;
  const textures = [];
  for (const t of root.listTextures()) {
    const size = ImageUtils.getSize(t.getImage(), t.getMimeType()) ?? [0, 0];
    texBytes += size[0] * size[1] * 4 * 1.333;
    textures.push(`${t.getName() || t.getURI()} ${size[0]}x${size[1]}`);
  }
  results[path.basename(file)] = {
    fileMB: +(fs.statSync(file).size / 1048576).toFixed(2),
    drawCalls: draws,
    shadowCasterDraws: shadowCasters,
    instancedNodes,
    trianglesRendered: Math.round(rendered),
    trianglesUnique: Math.round(unique),
    materials: root.listMaterials().length,
    textures: root.listTextures().length,
    textureGpuMB: +(texBytes / 1048576).toFixed(1),
  };
  if (process.env.VERBOSE) console.error(file, textures.join("\n  "));
}
console.table(results);
if (out) fs.writeFileSync(out, JSON.stringify(results, null, 1));
