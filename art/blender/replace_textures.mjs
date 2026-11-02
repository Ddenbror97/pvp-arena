/**
 * Replace named textures' images in a GLB, nothing else.
 *
 *   node replace_textures.mjs <in.glb> <out.glb> <textureName>=<image.png> [...] [--webp-quality 90]
 *
 * Gloves (arms/retexture_gloves.py output, same UVs as the shipped mesh), for both rifles:
 *   node replace_textures.mjs ../../public/fps/models/ak47-authored.glb ../../public/fps/models/ak47-authored.glb \
 *     glove_basecolor=build/gloves/glove_basecolor.png glove_normal=build/gloves/glove_normal.png \
 *     glove_orm=build/gloves/glove_orm.png
 * Meshes, UVs, skins, materials and every other texture are untouched; images are re-encoded to
 * WebP at the source texture's size.
 */
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import sharp from "sharp";

const args = process.argv.slice(2);
const qi = args.indexOf("--webp-quality");
const quality = qi >= 0 ? Number(args.splice(qi, 2)[1]) : 90;
const [input, output, ...pairs] = args;
if (!pairs.length) {
  console.error(
    "usage: replace_textures.mjs <in.glb> <out.glb> <name>=<image> [...] [--webp-quality 90]",
  );
  process.exit(2);
}
await MeshoptDecoder.ready;
await MeshoptEncoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });
const doc = await io.read(input);
const textures = doc.getRoot().listTextures();
for (const pair of pairs) {
  const [name, file] = pair.split("=");
  const matches = textures.filter((t) => t.getName() === name);
  if (!matches.length) throw new Error(`texture ${name} not found in ${input}`);
  for (const texture of matches) {
    const [w, h] = texture.getSize() ?? [2048, 2048];
    const bytes = await sharp(file)
      .resize(w, h, { fit: "fill", kernel: "lanczos3" })
      .webp({ quality, effort: 6 })
      .toBuffer();
    const before = texture.getImage().byteLength;
    texture.setImage(new Uint8Array(bytes)).setMimeType("image/webp");
    console.log(
      `${name}: ${(before / 1024).toFixed(0)} KB → ${(bytes.byteLength / 1024).toFixed(0)} KB`,
    );
  }
}
await io.write(output, doc);
console.log(`→ ${output}`);
