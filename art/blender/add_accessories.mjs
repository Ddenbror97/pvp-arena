/**
 * Add Blender-built arm accessories to a viewmodel GLB, under FPAccessories.
 *
 *   node add_accessories.mjs <source.glb> <out.glb> <part.glb>:<NodeName> [...] [--max-size 1024] [--webp-quality 90]
 *
 * Police (M4) duty jacket:
 *   node add_accessories.mjs ../../public/fps/models/m4a1-authored.glb \
 *     ../../public/fps/models/m4a1-authored.glb \
 *     build/police/police-sleeve.glb:PoliceSleeve build/police/jacket-watch.glb:JacketWatch \
 *     --max-size 1024 --webp-quality 90
 *
 * `--max-size` / `--webp-quality` re-encode only the added parts' textures (the 2048 twill normal
 * map is 1.3 MB; at 1024 / q90 it is ~0.45 MB and looks the same at viewmodel distance).
 *
 * An existing node with the same name is replaced. Rifle, arm mesh, skin, bones and markers are
 * untouched (check with check_rig_unchanged.mjs). Generalises add_jacket_to_ak.mjs.
 */
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { mergeDocuments, prune, dedup, meshopt } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import sharp from "sharp";

const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(name);
  if (i < 0) return undefined;
  return Number(args.splice(i, 2)[1]);
};
const maxSize = option("--max-size"),
  quality = option("--webp-quality");
const [source, out, ...parts] = args;
if (!parts.length) {
  console.error("usage: add_accessories.mjs <source.glb> <out.glb> <part.glb>:<NodeName> [...]");
  process.exit(2);
}
await MeshoptDecoder.ready;
await MeshoptEncoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });
const target = await io.read(source);
const root = target.getRoot();
const accessories = root.listNodes().find((n) => n.getName() === "FPAccessories");
if (!accessories) throw new Error("FPAccessories missing from " + source);
const scenes = new Set(root.listScenes());
for (const part of parts) {
  const [file, name] = part.split(":");
  for (const old of root.listNodes().filter((n) => n.getName() === name)) {
    old.traverse((n) => n !== old && n.dispose());
    old.dispose();
  }
  const doc = await io.read(file);
  // Textures the target already has (the watch's, shared with the bare-arm watch) are left as
  // they are so dedup() merges them instead of shipping a second copy.
  const existing = new Set(root.listTextures().map((t) => t.getName()));
  if (maxSize || quality)
    for (const texture of doc.getRoot().listTextures()) {
      if (existing.has(texture.getName())) continue;
      const [w, h] = texture.getSize() ?? [0, 0];
      let image = sharp(Buffer.from(texture.getImage()));
      if (maxSize && Math.max(w, h) > maxSize)
        image = image.resize(maxSize, maxSize, { fit: "inside", kernel: "lanczos3" });
      const bytes = await image.webp({ quality: quality ?? 90, effort: 6 }).toBuffer();
      texture.setImage(new Uint8Array(bytes)).setMimeType("image/webp");
    }
  const map = mergeDocuments(target, doc);
  const node = map.get(
    doc
      .getRoot()
      .listNodes()
      .find((n) => n.getName() === name),
  );
  if (!node) throw new Error(`${name} missing from ${file}`);
  for (const scene of root.listScenes()) {
    if (scene.listChildren().includes(node)) scene.removeChild(node);
    if (!scenes.has(scene)) scene.dispose();
  }
  accessories.addChild(node);
  console.log(`${name} added from ${file}`);
}
const [mainBuffer, ...extra] = root.listBuffers();
for (const accessor of root.listAccessors()) accessor.setBuffer(mainBuffer);
for (const buffer of extra) buffer.dispose();
await target.transform(
  prune({ keepLeaves: true, keepAttributes: true }),
  dedup(),
  meshopt({ encoder: MeshoptEncoder, level: "medium" }),
);
await io.write(out, target);
console.log(`→ ${out}`);
