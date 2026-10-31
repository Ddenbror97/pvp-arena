/**
 * Swap the first-person arms in the shipped viewmodel GLB for the Blender-built ones.
 *
 *   node arms/merge_arms.mjs <shipped.glb> <gloves dir> <out.glb> [accessories.glb]
 *
 * <gloves dir> holds gloves.json/gloves.bin (bind-space game mesh, joints already indexed into
 * the shipped skin) and, when built, glove_basecolor.png / glove_normal.png / glove_orm.png.
 * The skin, every joint and every rifle node stay exactly as shipped: only the FPArms mesh data
 * and the "arms" material's textures change. [accessories.glb] (watch, sleeves) is added under
 * a hidden "FPAccessories" node; the runtime wraps those meshes onto the forearms.
 */
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { mergeDocuments, prune, dedup, meshopt } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const [shipped, glovesDir, outGlb, accessories] = process.argv.slice(2);
if (!outGlb) {
  console.error("usage: merge_arms.mjs <shipped.glb> <gloves dir> <out.glb> [accessories.glb]");
  process.exit(2);
}
await MeshoptDecoder.ready;
await MeshoptEncoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });
const doc = await io.read(shipped);
const root = doc.getRoot();
const buffer = root.listBuffers()[0];

const meta = JSON.parse(readFileSync(join(glovesDir, "gloves.json"), "utf8"));
const bin = readFileSync(join(glovesDir, "gloves.bin"));
const typed = { float32: Float32Array, uint16: Uint16Array, uint32: Uint32Array };
const view = (name) => {
  const m = meta[name];
  const Type = typed[m.dtype];
  const count = m.shape.reduce((a, b) => a * b, 1);
  return new Type(bin.buffer.slice(bin.byteOffset + m.offset, bin.byteOffset + m.offset + count * Type.BYTES_PER_ELEMENT));
};
const types = { 1: "SCALAR", 2: "VEC2", 3: "VEC3", 4: "VEC4" };
const accessor = (name, semantic) =>
  doc
    .createAccessor(semantic)
    .setBuffer(buffer)
    .setType(types[meta[name].shape[1] ?? 1])
    .setArray(view(name));

const arms = root.listNodes().find((n) => n.getName() === "FPArms");
const primitive = arms.getMesh().listPrimitives()[0];
if (arms.getMesh().listPrimitives().length !== 1) throw new Error("FPArms: expected one primitive");
for (const semantic of primitive.listSemantics()) primitive.setAttribute(semantic, null);
for (const semantic of ["POSITION", "NORMAL", "TANGENT", "TEXCOORD_0", "JOINTS_0", "WEIGHTS_0"])
  primitive.setAttribute(semantic, accessor(semantic, semantic));
const indices = view("indices");
primitive.setIndices(doc.createAccessor("indices").setBuffer(buffer).setType("SCALAR").setArray(indices));

// Glove textures: base colour (sRGB), tangent-space normal, occlusion/roughness/metal.
const material = primitive.getMaterial();
const texture = async (file, name, mime = "image/webp") => {
  const path = join(glovesDir, file);
  if (!existsSync(path)) return null;
  const image = await sharp(path).webp({ quality: name === "normal" ? 95 : 90, effort: 6 }).toBuffer();
  return doc.createTexture(`glove_${name}`).setImage(image).setMimeType(mime);
};
const base = await texture("glove_basecolor.png", "basecolor");
if (base) {
  const normal = await texture("glove_normal.png", "normal");
  const orm = await texture("glove_orm.png", "orm");
  material
    .setBaseColorTexture(base)
    .setBaseColorFactor([1, 1, 1, 1])
    .setNormalTexture(normal)
    .setNormalScale(1)
    .setOcclusionTexture(orm)
    .setOcclusionStrength(1)
    .setMetallicRoughnessTexture(orm)
    .setRoughnessFactor(1)
    .setMetallicFactor(1);
  for (const info of [material.getBaseColorTextureInfo(), material.getNormalTextureInfo(), material.getOcclusionTextureInfo(), material.getMetallicRoughnessTextureInfo()])
    info.setTexCoord(0);
}

if (accessories) {
  const extra = await io.read(accessories);
  const map = mergeDocuments(doc, extra);
  const holder = doc.createNode("FPAccessories");
  const scene = root.getDefaultScene() ?? root.listScenes()[0];
  for (const node of extra.getRoot().listScenes()[0].listChildren()) holder.addChild(map.get(node));
  const rig = root.listNodes().find((n) => n.getName() === "FPRig");
  (rig.getParentNode() ?? scene).addChild(holder);
  for (const s of root.listScenes()) if (s !== scene) s.dispose();
}

const [mainBuffer, ...extraBuffers] = root.listBuffers();
for (const a of root.listAccessors()) a.setBuffer(mainBuffer);
for (const b of extraBuffers) b.dispose();
await doc.transform(prune({ keepLeaves: true, keepAttributes: true }), dedup(), meshopt({ encoder: MeshoptEncoder, level: "medium" }));
await io.write(outGlb, doc);
console.log(`FPArms: ${meta.POSITION.count} vertices, ${indices.length / 3} triangles → ${outGlb}`);
