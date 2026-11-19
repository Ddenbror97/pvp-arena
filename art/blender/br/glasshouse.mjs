/**
 * The Victorian glasshouses glazed (owner, 2026-11-18: "the small house at the water ... is like a
 * växthus, think the black water prison have it aswell": no colours, a strange green). Both are
 * Ryoce's "Greenhouse Victorian": the Riverside Park conservatory (Downtown, by the river) and
 * Blackwater's prison greenhouse.
 *
 * The download draws its iron frames in a texture over whole panels, the glass between them
 * black: its glass was a see-through map the conversion lost. So the conservatory's near LOD
 * was a black box in a green lattice, and its far LODs (reduced without the texture) solid green
 * with folds where the reduction crossed the panels. The prison's copy had its texture dropped
 * and a flat green put on, so it was solid green at every distance.
 *
 * Here the panels are drawn twice from the near LOD's geometry: the frames, cut out of the
 * texture (alpha mask: what is black in it is not frame), and the glass, a pale blended tint
 * where the frames are not (two-sided, as the kit's window glass). The middle LODs are the same
 * shell without the fitted floors (10 k triangles: there is one of each on the island); the far
 * LOD is that shell in one opaque draw. The
 * prison's greenhouse is the same shell scaled to its size (16 m long; within 6 cm of its
 * current bounds, so its collision stands).
 *
 *   node art/blender/br/glasshouse.mjs <models.<rev>.json> <tag>
 *
 * Writes conservatory.<tag>.lod{0,1,2}.glb and bw-greenhouse.<tag>.lod{0,2}.glb (the far LODs
 * one opaque draw, the panes painted a pale glass colour).
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { meshopt, prune } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";

const dir = "public/fps/br/models";
const [manifestName, tag] = process.argv.slice(2);
if (!tag) throw new Error("usage: glasshouse.mjs <models.<rev>.json> <tag>");
const manifestPath = path.join(dir, manifestName);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  "meshopt.decoder": MeshoptDecoder,
  "meshopt.encoder": MeshoptEncoder,
});

/** A texel is frame (not glass) above this luminance (0–255): the glass is drawn black. */
const FRAME_LUM = 18;
/** The glass: the kit's window glass (procedural-kit.mjs writeGlb), a little more opaque. */
const GLASS = [158, 189, 204],
  GLASS_ALPHA = 0.34;
const FLOORS = "Access floor and steps";
/** The panes on the far LOD (opaque): the glass's tint over the sky, a little darker. */
const SOLID_GLASS = [150, 172, 178];

const src = manifest.models.conservatory.lods[0].file;
const size = (doc) => {
  const min = [Infinity, Infinity, Infinity],
    max = [-Infinity, -Infinity, -Infinity];
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const m = node.getWorldMatrix();
    for (const p of mesh.listPrimitives()) {
      const pos = p.getAttribute("POSITION");
      for (let i = 0; i < pos.getCount(); i++) {
        const v = pos.getElement(i, []);
        for (let k = 0; k < 3; k++) {
          const w = m[k] * v[0] + m[4 + k] * v[1] + m[8 + k] * v[2] + m[12 + k];
          min[k] = Math.min(min[k], w);
          max[k] = Math.max(max[k], w);
        }
      }
    }
  }
  return max.map((x, k) => +(x - min[k]).toFixed(3));
};

/**
 * The conservatory's near LOD, glazed; `floors`: keep the fitted floors; `scale`: of the shell;
 * `solid`: one opaque draw (the far LOD), the glass painted in a pale glass colour instead.
 */
async function glazed(floors, scale = 1, solid = false) {
  const doc = await io.read(`public${src}`);
  const root = doc.getRoot();
  for (const node of root.listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    if (mesh.listPrimitives().some((p) => p.getMaterial()?.getName() === FLOORS)) {
      if (!floors) node.dispose();
      continue;
    }
    for (const prim of mesh.listPrimitives()) {
      const mat = prim.getMaterial();
      const tex = mat?.getBaseColorTexture();
      if (!tex) continue;
      const { data, info } = await sharp(Buffer.from(tex.getImage()))
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const frame = Buffer.from(data),
        glass = Buffer.alloc(data.length);
      for (let i = 0; i < data.length; i += 4) {
        const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
        const isFrame = lum > FRAME_LUM;
        if (solid && !isFrame) frame.set(SOLID_GLASS, i);
        frame[i + 3] = isFrame || solid ? 255 : 0;
        glass.set([...GLASS, isFrame ? 0 : Math.round(GLASS_ALPHA * 255)], i);
      }
      const raw = { raw: { width: info.width, height: info.height, channels: 4 } };
      if (solid) {
        // The far LOD: one opaque draw, the panes a pale glass colour (they read as glass
        // from where this LOD is drawn, and the far LODs stay one draw each).
        const img = await sharp(frame, raw).webp({ quality: 90 }).toBuffer();
        tex.setImage(new Uint8Array(img)).setMimeType("image/webp");
        mat.setName("glasshouse-far").setAlphaMode("OPAQUE").setDoubleSided(true);
        continue;
      }
      const frameImg = await sharp(frame, raw).webp({ lossless: true }).toBuffer();
      const glassImg = await sharp(glass, raw).webp({ lossless: true }).toBuffer();
      tex.setImage(new Uint8Array(frameImg)).setMimeType("image/webp");
      mat.setName("glasshouse-frame").setAlphaMode("MASK").setAlphaCutoff(0.5).setDoubleSided(true);
      const glassTex = doc
        .createTexture("glasshouse-glass")
        .setImage(new Uint8Array(glassImg))
        .setMimeType("image/webp");
      const glassMat = doc
        .createMaterial("glasshouse-glass")
        .setBaseColorTexture(glassTex)
        .setBaseColorFactor([1, 1, 1, 1])
        .setAlphaMode("BLEND")
        .setDoubleSided(true)
        .setRoughnessFactor(0.15)
        .setMetallicFactor(0);
      // The same panels again, for the glass (the frames cut out of it by the alpha).
      const pane = prim.clone().setMaterial(glassMat);
      mesh.addPrimitive(pane);
    }
  }
  if (scale !== 1)
    for (const node of root.listScenes()[0].listChildren()) {
      node.setScale(node.getScale().map((s) => s * scale));
      node.setTranslation(node.getTranslation().map((t) => t * scale));
    }
  await doc.transform(prune(), meshopt({ encoder: MeshoptEncoder, level: "medium" }));
  return doc;
}

const write = async (doc, file) => {
  await io.write(path.join(dir, file), doc);
  return Math.round(fs.statSync(path.join(dir, file)).size / 1024);
};
const tris = (doc) =>
  doc
    .getRoot()
    .listMeshes()
    .flatMap((m) => m.listPrimitives())
    .reduce((s, p) => s + (p.getIndices()?.getCount() ?? 0) / 3, 0);

// The conservatory: the near LOD with its floors, the others the shell alone.
const near = await glazed(true);
const shell = await glazed(false);
const farShell = await glazed(false, 1, true);
const cons = manifest.models.conservatory;
const nearKB = await write(near, `conservatory.${tag}.lod0.glb`);
const shellKB = await write(shell, `conservatory.${tag}.lod1.glb`);
const farKB = await write(farShell, `conservatory.${tag}.lod2.glb`);
const draws = (doc) =>
  doc
    .getRoot()
    .listMeshes()
    .reduce((s, m) => s + m.listPrimitives().length, 0);
const entry = (file, doc, kB, sz) => ({
  file: `/fps/br/models/${file}`,
  tris: tris(doc),
  draws: draws(doc),
  textureMB: 1.33,
  kB,
  size: sz,
});
cons.lods = [
  entry(`conservatory.${tag}.lod0.glb`, near, nearKB, cons.size),
  entry(`conservatory.${tag}.lod1.glb`, shell, shellKB, cons.size),
  entry(`conservatory.${tag}.lod2.glb`, farShell, farKB, cons.size),
];

// The prison's greenhouse: the shell at its size.
const bw = manifest.models["bw-greenhouse"];
const k = bw.size[0] / size(shell)[0];
const prison = await glazed(false, k);
const prisonFar = await glazed(false, k, true);
const bwKB = await write(prison, `bw-greenhouse.${tag}.lod0.glb`);
const bwFarKB = await write(prisonFar, `bw-greenhouse.${tag}.lod2.glb`);
const bwSize = size(prison);
console.log(`bw-greenhouse: scale ${k.toFixed(4)}, size ${bwSize} (was ${bw.size})`);
bw.lods = [
  entry(`bw-greenhouse.${tag}.lod0.glb`, prison, bwKB, bw.size),
  entry(`bw-greenhouse.${tag}.lod0.glb`, prison, bwKB, bw.size),
  entry(`bw-greenhouse.${tag}.lod2.glb`, prisonFar, bwFarKB, bw.size),
];
fs.writeFileSync(manifestPath, JSON.stringify(manifest));
console.log(`conservatory: ${tris(near)} / ${tris(shell)} triangles, ${nearKB} / ${shellKB} kB`);
