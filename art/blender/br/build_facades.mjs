/**
 * Facade atlas for the flat mid-distance LODs (owner, 2026-11-09: houses and buildings should
 * look higher quality). 55 models, the common houses among them, lost their textures at their
 * first LOD switch (houses at 100 m, cars at 35 m): the seam-respecting reduction missed its
 * budget and the pipeline fell back to an untextured, vertex-coloured silhouette.
 *
 * This keeps that silhouette's geometry and gives it the near model's look back, cheaply:
 *  - each model's LOD0 is rendered from five sides (±x, ±z and from above), unlit base colour
 *    only, into one shared atlas (scripts/br/facades/bake.mjs, from the layout written here);
 *  - every LOD1 triangle takes the view its normal faces and gets UVs by the same projection.
 * One texture and one material for all of them, so the far-LOD batch draws them in one call.
 *
 *   node art/blender/br/build_facades.mjs <manifest-in> <revision> [atlasWidth]   (repo root)
 *   node scripts/br/facades/bake.mjs                                            (then)
 *
 * Writes public/fps/br/models/<id>.<revision>.lod1.glb, models.<revision>.json (the manifest
 * with those LOD1s and a `facades` entry) and art/br/<revision>.json (the layout: per
 * model its bounds and five atlas rectangles, for the bake).
 */
import fs from "node:fs";
import path from "node:path";
import { Document, NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { meshopt, prune, weld } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";

const REPO = process.cwd();
const MODELS = path.join(REPO, "public/fps/br/models");
const [manifestIn, revision, atlasWidthArg] = process.argv.slice(2);
if (!manifestIn || !revision) {
  console.error("usage: build_facades.mjs <manifest-in> <revision> [atlasWidth]");
  process.exit(1);
}
const ATLAS_W = Number(atlasWidthArg ?? 4096);
/** Empty texels round every view (filled by the bake's dilation): mips do not bleed. */
const GUTTER = 4;
/** Largest side of one view (px). */
const MAX_SIDE = 448;
/**
 * LOD1 distances by class (props-renderer.ts RINGS[class][0]): texel density follows the
 * distance the LOD first shows at (1 px ≈ distance / 700 m at 1080p), with headroom.
 */
const RING0 = {
  small: 50,
  detail: 25,
  clutter: 25,
  prop: 70,
  vehicle: 35,
  structure: 140,
  building: 220,
  dwelling: 100,
  outbuilding: 70,
  hero: 300,
  aircraft: 250,
  rock: 60,
  bush: 40,
  yard: 35,
};
const density = (ring) => Math.max(4, Math.min(28, 1700 / (RING0[ring] ?? 70)));

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });

/**
 * The five views. `u`/`v`: [axis, sign] — the atlas' right and up directions in model space;
 * `toward`: [axis, sign] — from the model toward the camera. Shared with the bake.
 */
const VIEWS = [
  { id: "+x", u: [2, -1], v: [1, 1], toward: [0, 1] },
  { id: "-x", u: [2, 1], v: [1, 1], toward: [0, -1] },
  { id: "+z", u: [0, 1], v: [1, 1], toward: [2, 1] },
  { id: "-z", u: [0, -1], v: [1, 1], toward: [2, -1] },
  { id: "top", u: [0, 1], v: [2, -1], toward: [1, 1] },
];

/** World-space triangles of a GLB: positions per primitive with indices. */
async function read(file) {
  const doc = await io.read(file);
  const prims = [];
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const m = node.getWorldMatrix();
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute("POSITION");
      const out = new Float32Array(pos.getCount() * 3);
      const e = [0, 0, 0];
      for (let i = 0; i < pos.getCount(); i++) {
        pos.getElement(i, e);
        out[i * 3] = m[0] * e[0] + m[4] * e[1] + m[8] * e[2] + m[12];
        out[i * 3 + 1] = m[1] * e[0] + m[5] * e[1] + m[9] * e[2] + m[13];
        out[i * 3 + 2] = m[2] * e[0] + m[6] * e[1] + m[10] * e[2] + m[14];
      }
      const idx = prim.getIndices();
      const indices = idx
        ? Uint32Array.from({ length: idx.getCount() }, (_, i) => idx.getScalar(i))
        : Uint32Array.from({ length: pos.getCount() }, (_, i) => i);
      prims.push({ positions: out, indices });
    }
  }
  return { doc, prims };
}
function bounds(prims) {
  const min = [Infinity, Infinity, Infinity],
    max = [-Infinity, -Infinity, -Infinity];
  for (const { positions } of prims)
    for (let i = 0; i < positions.length; i++) {
      const a = i % 3;
      if (positions[i] < min[a]) min[a] = positions[i];
      if (positions[i] > max[a]) max[a] = positions[i];
    }
  return { min, max };
}

const manifest = JSON.parse(fs.readFileSync(path.join(MODELS, manifestIn), "utf8"));
const flat = (f) => {
  // A LOD file the pipeline wrote as an untextured single-material silhouette.
  const b = fs.readFileSync(path.join(REPO, "public", f));
  const json = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString("utf8"));
  return (
    !json.textures?.length &&
    json.meshes.length === 1 &&
    json.meshes[0].primitives.length === 1 &&
    json.materials?.[0]?.alphaMode !== "BLEND" &&
    !json.materials?.[0]?.emissiveFactor?.some((x) => x > 0)
  );
};
const chosen = Object.entries(manifest.models).filter(([, m]) => {
  const [l0, l1] = m.lods;
  return l1 && l0.textureMB > 0 && l1.file !== l0.file && flat(l1.file);
});

// ------------------------------------------------------------------ layout
const rects = [];
const layout = { revision, views: VIEWS, gutter: GUTTER, models: {} };
const loaded = new Map();
for (const [id, m] of chosen) {
  const lod0 = await read(path.join(REPO, "public", m.lods[0].file));
  const lod1 = await read(path.join(REPO, "public", m.lods[1].file));
  // The silhouette may poke a little outside the near model: bounds of both.
  const b = bounds([...lod0.prims, ...lod1.prims]);
  loaded.set(id, { lod1, b });
  const d = density(m.ring ?? m.class);
  const size = [0, 1, 2].map((a) => Math.max(0.05, b.max[a] - b.min[a]));
  const longest = Math.max(...size);
  const k = Math.min(1, (MAX_SIDE - 2 * GUTTER) / (longest * d));
  layout.models[id] = { file: m.lods[0].file, min: b.min, max: b.max, rects: [] };
  VIEWS.forEach((view, vi) => {
    const w = Math.max(8, Math.ceil(size[view.u[0]] * d * k)) + 2 * GUTTER;
    const h = Math.max(8, Math.ceil(size[view.v[0]] * d * k)) + 2 * GUTTER;
    rects.push({ id, vi, w, h });
  });
}
// Shelf packing, tallest first.
rects.sort((a, b) => b.h - a.h || b.w - a.w);
let x = 0,
  y = 0,
  shelf = 0;
for (const r of rects) {
  if (x + r.w > ATLAS_W) {
    x = 0;
    y += shelf;
    shelf = 0;
  }
  r.x = x;
  r.y = y;
  x += r.w;
  shelf = Math.max(shelf, r.h);
}
const used = y + shelf;
// WebGL2 needs no power of two: the height actually used, to a multiple of 16.
const ATLAS_H = Math.ceil(used / 16) * 16;
for (const r of rects) layout.models[r.id].rects[r.vi] = [r.x, r.y, r.w, r.h];
layout.width = ATLAS_W;
layout.height = ATLAS_H;

// ------------------------------------------------------------------ LOD1 with UVs
// The world itself (placements, collision) is unchanged: the manifest keeps its worldRevision,
// which the client checks against the collision file and the server.
const out = structuredClone(manifest);
const atlasFile = `/fps/br/models/atlas.${revision}.webp`;
out.facades = { atlas: atlasFile, width: ATLAS_W, height: ATLAS_H, models: chosen.length };
let texels = 0;
for (const [id, m] of chosen) {
  const { lod1, b } = loaded.get(id);
  const size = [0, 1, 2].map((a) => Math.max(0.05, b.max[a] - b.min[a]));
  const pos = [],
    uv = [];
  for (const { positions, indices } of lod1.prims)
    for (let t = 0; t < indices.length; t += 3) {
      const p = [0, 1, 2].map((k) => {
        const i = indices[t + k] * 3;
        return [positions[i], positions[i + 1], positions[i + 2]];
      });
      const e1 = p[1].map((v, a) => v - p[0][a]),
        e2 = p[2].map((v, a) => v - p[0][a]);
      const n = [
        e1[1] * e2[2] - e1[2] * e2[1],
        e1[2] * e2[0] - e1[0] * e2[2],
        e1[0] * e2[1] - e1[1] * e2[0],
      ];
      const len = Math.hypot(...n) || 1;
      const nx = n[0] / len,
        ny = n[1] / len,
        nz = n[2] / len;
      // Roofs and floors from above; walls from the side they face.
      const vi =
        Math.abs(ny) > 0.5 ? 4 : Math.abs(nx) >= Math.abs(nz) ? (nx > 0 ? 0 : 1) : nz > 0 ? 2 : 3;
      const view = VIEWS[vi];
      const [rx, ry, rw, rh] = layout.models[id].rects[vi];
      for (const q of p) {
        const along = ([axis, sign]) => {
          const f = (q[axis] - b.min[axis]) / size[axis];
          return Math.min(1, Math.max(0, sign > 0 ? f : 1 - f));
        };
        const px = rx + GUTTER + along(view.u) * (rw - 2 * GUTTER);
        const py = ry + GUTTER + (1 - along(view.v)) * (rh - 2 * GUTTER); // image rows run down
        pos.push(...q);
        uv.push(px / ATLAS_W, py / ATLAS_H);
      }
    }
  for (const r of layout.models[id].rects) texels += r[2] * r[3];
  const doc = new Document();
  const buffer = doc.createBuffer();
  const position = doc
    .createAccessor()
    .setType("VEC3")
    .setArray(new Float32Array(pos))
    .setBuffer(buffer);
  const texcoord = doc
    .createAccessor()
    .setType("VEC2")
    .setArray(new Float32Array(uv))
    .setBuffer(buffer);
  // Named for the renderer, which lends it the shared atlas (props-renderer.ts).
  const material = doc
    .createMaterial("facade")
    .setRoughnessFactor(0.9)
    .setMetallicFactor(0)
    .setDoubleSided(true);
  const prim = doc
    .createPrimitive()
    .setAttribute("POSITION", position)
    .setAttribute("TEXCOORD_0", texcoord)
    .setMaterial(material);
  doc.createScene().addChild(doc.createNode(id).setMesh(doc.createMesh(id).addPrimitive(prim)));
  // 16-bit texture coordinates: the atlas is up to 4096 px wide and every texel matters.
  // (keepAttributes: the file's material has no texture of its own, the UVs are still used.)
  await doc.transform(
    weld(),
    prune({ keepAttributes: true }),
    meshopt({ encoder: MeshoptEncoder, level: "medium", quantizeTexcoord: 16 }),
  );
  const file = `/fps/br/models/${id}.${revision}.lod1.glb`;
  await io.write(path.join(REPO, "public", file), doc);
  const tris = pos.length / 9;
  out.models[id].lods[1] = {
    ...m.lods[1],
    file,
    tris,
    draws: 1,
    textureMB: 0,
    kB: Math.round(fs.statSync(path.join(REPO, "public", file)).size / 1024),
    facade: true,
  };
}
fs.writeFileSync(path.join(MODELS, `models.${revision}.json`), JSON.stringify(out));
fs.writeFileSync(path.join(REPO, `art/br/${revision}.json`), JSON.stringify(layout, null, 1));
console.log(
  `${chosen.length} models, atlas ${ATLAS_W} × ${ATLAS_H} (${((used / ATLAS_H) * 100).toFixed(0)} % of the height used, ` +
    `${(texels / 1e6).toFixed(2)} M texels); models.${revision}.json`,
);
console.log(chosen.map(([id]) => id).join(" "));
