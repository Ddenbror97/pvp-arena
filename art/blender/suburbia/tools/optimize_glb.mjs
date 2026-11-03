/**
 * SUBURBAN SHOWDOWN: draw-call and texture clean-up for the exported scene, run by build.sh
 * between the Blender export and quantize/instance/meshopt. Every step keeps the look:
 *
 * 1. A base-color texture that is one flat colour (largest per-channel standard deviation
 *    at most MAX_SD out of 255: the Sketchfab props' 256 px swatches for bin bodies, boxes,
 *    sign poles, the tower's paint) becomes the material's base-color factor: the mean of the
 *    texture, in linear light. Only on materials with no other texture, so the project's
 *    tiling surfaces (asphalt, grass, hedge: base colour + normal map) keep their grain. The
 *    texture is removed, and so are UV sets that no longer feed any texture.
 * 2. KHR_materials_specular is removed from fully metallic materials without a metal/rough
 *    texture: three.js applies specular only to the dielectric part, so it has no effect there,
 *    but it turns MeshStandardMaterial into MeshPhysicalMaterial (an extra shader program).
 * 3. Inside one mesh, primitives whose materials are now plain colours with the same
 *    metalness, roughness (within ROUGHNESS_TOLERANCE), alpha mode and sidedness are joined
 *    into one primitive. Their colours go into a tiny palette texture (one 4 × 4 px block per
 *    colour, nearest filtering, no mipmaps, so blocks never blend) and each vertex's UV points
 *    at its block. One draw call instead of several, per mesh (and per instanced batch), on the
 *    same textured shader program the props already use: vertex colours would add programs.
 *
 *   node art/blender/suburbia/tools/optimize_glb.mjs in.glb out.glb
 */
import { NodeIO, TextureInfo } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, joinPrimitives, prune } from "@gltf-transform/functions";
import sharp from "sharp";

const MAX_SD = 12;
const ROUGHNESS_TOLERANCE = 0.01;
const [input, output] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(input);
const root = doc.getRoot();
const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);
const report = { flattened: [], specular: [], joined: [] };

// 1. Flat base-color textures → factors.
const baseColorUsers = (texture) =>
  root.listMaterials().filter((m) => m.getBaseColorTexture() === texture);
const usedElsewhere = (texture) =>
  root
    .listMaterials()
    .some(
      (m) =>
        m.getNormalTexture() === texture ||
        m.getMetallicRoughnessTexture() === texture ||
        m.getOcclusionTexture() === texture ||
        m.getEmissiveTexture() === texture ||
        m.listExtensions().some((e) => e.listProperties?.().includes?.(texture)),
    );
for (const texture of root.listTextures()) {
  const users = baseColorUsers(texture);
  if (!users.length || usedElsewhere(texture)) continue;
  // Materials with extensions stay as they are (a plain physical material would need a
  // shader program of its own, where now it shares one with its textured neighbours).
  const onlyTexture = (m) =>
    !m.listExtensions().length &&
    !m.getNormalTexture() &&
    !m.getMetallicRoughnessTexture() &&
    !m.getOcclusionTexture() &&
    !m.getEmissiveTexture();
  if (!users.every(onlyTexture)) continue;
  const { data, info } = await sharp(Buffer.from(texture.getImage()))
    .raw()
    .toBuffer({ resolveWithObject: true });
  const channels = info.channels,
    pixels = data.length / channels;
  const sum = new Array(channels).fill(0),
    squares = new Array(channels).fill(0),
    linear = [0, 0, 0];
  for (let i = 0; i < data.length; i += channels)
    for (let k = 0; k < channels; k++) {
      sum[k] += data[i + k];
      squares[k] += data[i + k] ** 2;
      if (k < 3) linear[k] += toLinear(data[i + k] / 255);
    }
  const sd = Math.max(
    ...sum.map((s, k) => Math.sqrt(Math.max(0, squares[k] / pixels - (s / pixels) ** 2))),
  );
  const alpha = channels === 4 ? sum[3] / pixels / 255 : 1;
  if (sd > MAX_SD) continue;
  const mean = linear.map((v) => v / pixels);
  for (const material of users) {
    const [r, g, b, a] = material.getBaseColorFactor();
    material.setBaseColorFactor([r * mean[0], g * mean[1], b * mean[2], a * alpha]);
    material.setBaseColorTexture(null);
  }
  report.flattened.push(`${texture.getName()} (sd ${sd.toFixed(1)})`);
  texture.dispose();
}

const textured = (m) =>
  !!(
    m.getBaseColorTexture() ||
    m.getNormalTexture() ||
    m.getMetallicRoughnessTexture() ||
    m.getOcclusionTexture() ||
    m.getEmissiveTexture() ||
    m.listExtensions().some((e) => e.extensionName !== "KHR_materials_emissive_strength")
  );
for (const mesh of root.listMeshes())
  for (const prim of mesh.listPrimitives()) {
    const material = prim.getMaterial();
    if (material && !textured(material))
      for (const semantic of prim.listSemantics())
        if (semantic.startsWith("TEXCOORD_")) prim.setAttribute(semantic, null);
  }

// 2. Specular on metals without a metal/rough texture does nothing in three.js.
for (const material of root.listMaterials()) {
  const specular = material.getExtension("KHR_materials_specular");
  if (specular && material.getMetallicFactor() === 1 && !material.getMetallicRoughnessTexture()) {
    material.setExtension("KHR_materials_specular", null);
    report.specular.push(material.getName());
  }
}

// 3. Join plain-colour primitives within each mesh through vertex colours.
const plainKey = (prim) => {
  const m = prim.getMaterial();
  if (!m || textured(m) || prim.getMode() !== 4 || prim.listTargets().length) return null;
  if (m.listExtensions().length || m.getEmissiveFactor().some((v) => v > 0)) return null;
  return [
    m.getAlphaMode(),
    m.getDoubleSided(),
    m.getMetallicFactor().toFixed(3),
    m.getBaseColorFactor()[3].toFixed(3),
    !!prim.getIndices(),
    prim.listSemantics().sort().join(","),
  ].join("|");
};
for (const mesh of root.listMeshes()) {
  const groups = new Map();
  for (const prim of mesh.listPrimitives()) {
    const key = plainKey(prim);
    if (key) groups.set(key, [...(groups.get(key) ?? []), prim]);
  }
  for (const prims of groups.values()) {
    // Split each key's primitives further by roughness tolerance.
    prims.sort(
      (a, b) => a.getMaterial().getRoughnessFactor() - b.getMaterial().getRoughnessFactor(),
    );
    const clusters = [];
    for (const prim of prims) {
      const last = clusters.at(-1);
      const r = prim.getMaterial().getRoughnessFactor();
      if (last && r - last[0].getMaterial().getRoughnessFactor() <= ROUGHNESS_TOLERANCE)
        last.push(prim);
      else clusters.push([prim]);
    }
    for (const cluster of clusters) {
      if (cluster.length < 2) continue;
      const first = cluster[0].getMaterial();
      const roughness =
        cluster.reduce((s, p) => s + p.getMaterial().getRoughnessFactor(), 0) / cluster.length;
      const merged = first
        .clone()
        .setName(`${mesh.getName()}-plain`)
        .setBaseColorFactor([1, 1, 1, first.getBaseColorFactor()[3]])
        .setRoughnessFactor(roughness);
      const BLOCK = 4;
      const palette = Buffer.alloc(cluster.length * BLOCK * BLOCK * 3);
      const width = cluster.length * BLOCK;
      cluster.forEach((prim, slot) => {
        const rgb = prim
          .getMaterial()
          .getBaseColorFactor()
          .slice(0, 3)
          .map((c) => Math.round(toSrgb(c) * 255));
        for (let y = 0; y < BLOCK; y++)
          for (let x = 0; x < BLOCK; x++) palette.set(rgb, (y * width + slot * BLOCK + x) * 3);
        const position = prim.getAttribute("POSITION");
        const uv = new Float32Array(position.getCount() * 2);
        for (let i = 0; i < position.getCount(); i++)
          uv.set([(slot + 0.5) / cluster.length, 0.5], i * 2);
        prim.setAttribute(
          "TEXCOORD_0",
          doc.createAccessor().setType("VEC2").setArray(uv).setBuffer(position.getBuffer()),
        );
        prim.setMaterial(merged);
      });
      const image = await sharp(palette, { raw: { width, height: BLOCK, channels: 3 } })
        .png()
        .toBuffer();
      const texture = doc
        .createTexture(`${mesh.getName()}-palette`)
        .setImage(new Uint8Array(image))
        .setMimeType("image/png");
      merged.setBaseColorTexture(texture);
      merged
        .getBaseColorTextureInfo()
        .setMinFilter(TextureInfo.MinFilter.NEAREST)
        .setMagFilter(TextureInfo.MagFilter.NEAREST)
        .setWrapS(TextureInfo.WrapMode.CLAMP_TO_EDGE)
        .setWrapT(TextureInfo.WrapMode.CLAMP_TO_EDGE);
      // joinPrimitives needs identical accessor types: unquantized float data at this stage.
      const joined = joinPrimitives(cluster);
      for (const prim of cluster) {
        mesh.removePrimitive(prim);
        prim.dispose();
      }
      mesh.addPrimitive(joined);
      report.joined.push(`${mesh.getName()}: ${cluster.length} primitives → 1`);
    }
  }
}

await doc.transform(dedup(), prune());
await io.write(output, doc);
console.log(
  `OPTIMIZE flattened ${report.flattened.length} textures, removed specular on ${report.specular.length} metals, joined ${report.joined.length} groups`,
);
for (const line of report.flattened) console.log(`  flat   ${line}`);
for (const line of report.specular) console.log(`  spec   ${line}`);
for (const line of report.joined) console.log(`  join   ${line}`);
console.log(
  `  materials ${root.listMaterials().length}, textures ${root.listTextures().length}, primitives ${root.listMeshes().reduce((n, m) => n + m.listPrimitives().length, 0)}`,
);
