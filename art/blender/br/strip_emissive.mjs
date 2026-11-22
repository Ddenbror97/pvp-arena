/**
 * Glow taken off materials that are not lights (owner, 2026-11-19: "white items at east works,
 * fix"). Some downloads carry an emissive colour on their whole surface with no emissive map,
 * so the model is lit from inside at that strength wherever it stands: East Works' Dirty Pipes
 * pieces (0.75 grey) and Eastport's trawler (1.0) were white on their near and middle LODs, and
 * the lifeguard tower's booth (0.38) glowed grey. Their far LODs, reduced without it, were the
 * right colour. Lamps, signs and screens keep theirs.
 *
 *   node art/blender/br/strip_emissive.mjs <models.<rev>.json> <tag> id:material,id:material,…
 *
 * (`id` alone: every material of the model.) Writes <id>.<tag>.lod<N>.glb for each LOD that has
 * such a material and points the manifest at it.
 */
import fs from "node:fs";
import path from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";

const dir = "public/fps/br/models";
const [manifestName, tag, list] = process.argv.slice(2);
if (!list) throw new Error("usage: strip_emissive.mjs <models.<rev>.json> <tag> id[:material],…");
const manifestPath = path.join(dir, manifestName);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  "meshopt.decoder": MeshoptDecoder,
  "meshopt.encoder": MeshoptEncoder,
});

const wanted = new Map();
for (const item of list.split(",").filter(Boolean)) {
  const [id, material] = item.split(":");
  if (!manifest.models[id]) throw new Error(`${id}: not in ${manifestName}`);
  if (!wanted.has(id)) wanted.set(id, new Set());
  if (material) wanted.get(id).add(material);
}

for (const [id, materials] of wanted) {
  const entry = manifest.models[id];
  for (const [level, lod] of entry.lods.entries()) {
    // The file is read as stored (already meshopt-compressed), so it is written back the same.
    const doc = await io.read(`public${lod.file}`);
    let changed = 0;
    for (const m of doc.getRoot().listMaterials()) {
      if (materials.size && !materials.has(m.getName())) continue;
      if (m.getEmissiveTexture() || Math.max(...m.getEmissiveFactor()) === 0) continue;
      m.setEmissiveFactor([0, 0, 0]);
      m.setExtension("KHR_materials_emissive_strength", null);
      changed++;
    }
    if (!changed) continue;
    const file = `${id}.${tag}.lod${level}.glb`;
    await io.write(path.join(dir, file), doc);
    entry.lods[level] = {
      ...lod,
      file: `/fps/br/models/${file}`,
      kB: Math.round(fs.statSync(path.join(dir, file)).size / 1024),
    };
    console.log(`${id} LOD ${level}: glow off on ${changed} material(s)`);
  }
}
fs.writeFileSync(
  manifestPath,
  JSON.stringify(manifest, null, manifestName === "models.json" ? 1 : 0) +
    (manifestName === "models.json" ? "\n" : ""),
);
