/**
 * Share the first-person arm textures across the weapon viewmodels (cleanup 2026-11-09).
 *
 *   node art/blender/dedupe_viewmodel_textures.mjs            (run from the repo root)
 *
 * Every weapon viewmodel (ak47, m4a1, awp, mp5, deagle × team; the battle royale's SPAS-12) is built on the same arm rig,
 * so each GLB shipped its own copy of the glove, sleeve, watch and strap textures: 25 MB of
 * identical bytes across eight files, and one 2048² set decoded per weapon on load.
 *
 * This pass takes every texture whose image bytes are identical in two or more viewmodels,
 * writes it once to public/fps/models/viewmodel-shared.glb (textures only, each on a dummy
 * material named after its key) and replaces it in the weapon GLBs with a 1×1 placeholder of
 * the same colour space. public/fps/models/viewmodel-shared.json maps each weapon GLB's
 * material and slot to the shared key; the runtime (authored-assets.ts) swaps the placeholders
 * for the shared textures once both are loaded.
 *
 * Idempotent: a placeholder (1×1) never matches another file, and already-mapped slots are
 * kept. Re-run after a viewmodel is rebuilt. Weapon textures unique to one model are untouched.
 */
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const DIR = path.join(ROOT, "public/fps/models");
const VIEWMODELS = [
  "ak47-authored",
  "m4a1-authored",
  "awp-police",
  "awp-terrorist",
  "mp5-police",
  "mp5-terrorist",
  "deagle-police",
  "deagle-terrorist",
  // Battle royale only: the Police arms (the battle royale's own), no Terrorist build.
  "spas12-police",
];
const SLOTS = [
  ["baseColorTexture", "getBaseColorTexture", "setBaseColorTexture"],
  ["normalTexture", "getNormalTexture", "setNormalTexture"],
  ["metallicRoughnessTexture", "getMetallicRoughnessTexture", "setMetallicRoughnessTexture"],
  ["occlusionTexture", "getOcclusionTexture", "setOcclusionTexture"],
  ["emissiveTexture", "getEmissiveTexture", "setEmissiveTexture"],
];

await MeshoptDecoder.ready;
await MeshoptEncoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });

const hashOf = (image) => createHash("sha1").update(image).digest("hex").slice(0, 12);
const docs = new Map();
/** hash → { image, mimeType, uses: [{ model, material, slot }] } */
const byHash = new Map();
for (const id of VIEWMODELS) {
  const file = path.join(DIR, `${id}.glb`);
  if (!fs.existsSync(file)) continue;
  const doc = await io.read(file);
  docs.set(id, doc);
  for (const material of doc.getRoot().listMaterials())
    for (const [slot, get] of SLOTS) {
      const texture = material[get]();
      const image = texture?.getImage();
      if (!image) continue;
      const size = texture.getSize();
      if (size && size[0] <= 1 && size[1] <= 1) continue; // a placeholder from an earlier run
      const h = hashOf(image);
      const entry = byHash.get(h) ?? { image, mimeType: texture.getMimeType(), uses: [] };
      entry.uses.push({ model: id, material: material.getName(), slot, texture });
      byHash.set(h, entry);
    }
}

// The shared pack: an existing one is extended (keys are the content hash, so re-runs agree).
const packFile = path.join(DIR, "viewmodel-shared.glb");
const pack = fs.existsSync(packFile) ? await io.read(packFile) : (io.createDocument?.() ?? null);
const { Document } = await import("@gltf-transform/core");
const packDoc = pack ?? new Document();
const packRoot = packDoc.getRoot();
// A fresh document needs a buffer for its images, and a scene so GLTFLoader accepts it.
if (!packRoot.listBuffers().length) packDoc.createBuffer();
if (!packRoot.listScenes().length) packDoc.createScene("viewmodel-shared");
const have = new Set(packRoot.listMaterials().map((m) => m.getName()));

// Shared = the same bytes in two or more viewmodels, or already in the pack (a viewmodel added
// later: the others carry placeholders by then, so only the pack still has those bytes).
const shared = [...byHash].filter(
  ([h, e]) => new Set(e.uses.map((u) => u.model)).size >= 2 || have.has(`shared-${h}`),
);
if (!shared.length) {
  console.log("no shared textures");
  process.exit(0);
}
const mapFile = path.join(DIR, "viewmodel-shared.json");
const map = fs.existsSync(mapFile) ? JSON.parse(fs.readFileSync(mapFile, "utf8")) : {};
let saved = 0,
  packGrew = false;
const changed = new Set();
for (const [h, e] of shared) {
  const key = `shared-${h}`;
  if (!have.has(key)) {
    packGrew = true;
    const texture = packDoc.createTexture(key).setImage(e.image).setMimeType(e.mimeType);
    packDoc.createMaterial(key).setBaseColorTexture(texture);
    have.add(key);
  }
  // A 1×1 placeholder: mid grey for colour/ORM, flat normal (128,128,255) for normals.
  const normal = e.uses.some((u) => u.slot === "normalTexture");
  const placeholder = await sharp({
    create: {
      width: 1,
      height: 1,
      channels: 4,
      background: normal
        ? { r: 128, g: 128, b: 255, alpha: 255 }
        : { r: 128, g: 128, b: 128, alpha: 255 },
    },
  })
    .png()
    .toBuffer();
  for (const u of e.uses) {
    const doc = docs.get(u.model);
    const stub = doc
      .createTexture(`${u.texture.getName()}-shared`)
      .setImage(placeholder)
      .setMimeType("image/png");
    const material = doc
      .getRoot()
      .listMaterials()
      .find((m) => m.getName() === u.material);
    const set = SLOTS.find(([slot]) => slot === u.slot)[2];
    material[set](stub);
    changed.add(u.model);
    ((map[u.model] ??= {})[u.material] ??= {})[u.slot] = key;
    saved += e.image.byteLength;
  }
  // The originals are unreferenced now; the writer prunes them.
}
for (const [id, doc] of docs) {
  // (Only the viewmodels that changed are written: the others stay byte-identical.)
  if (!changed.has(id)) continue;
  // Drop textures nothing references any more.
  for (const t of doc.getRoot().listTextures())
    if (!t.listParents().some((p) => p.propertyType === "Material")) t.dispose();
  await io.write(path.join(DIR, `${id}.glb`), doc);
}
if (packGrew) await io.write(packFile, packDoc);
fs.writeFileSync(mapFile, JSON.stringify(map, null, 1) + "\n");
const packBytes = fs.statSync(packFile).size;
console.log(
  `${shared.length} shared textures → viewmodel-shared.glb (${(packBytes / 1e6).toFixed(1)} MB); ` +
    `${(saved / 1e6).toFixed(1)} MB removed from ${changed.size} viewmodel(s)`,
);
