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
 *
 * --far (render stability 2026-11-23): the same for the buildings' far LODs, on an atlas of
 * their own (`farFacades`, material "facade-far").
 *
 *   node art/blender/br/build_facades.mjs <manifest-in> <revision> [atlasWidth] --far
 *   node scripts/br/facades/bake.mjs <revision>
 *
 * A building's far LOD was a few flat-coloured boxes, and its middle LOD is real geometry:
 * window bars, balcony slabs and frames a few centimetres to a metre across. From the plane or
 * under the canopy that geometry is smaller than a pixel hundreds of metres before the far LOD
 * takes over, and geometry is not filtered: every edge lands on a pixel or misses it, so a
 * tower's storeys broke into stripes that crawled with every metre flown, and where the far
 * LOD did take over the building turned into a blank box (owner, 2026-11-23: "blinking/flicker
 * buildings on distance … in the airplane/parachute", "the buildings looks strange"). A
 * texture is filtered (mipmaps): the near model's look, averaged to what a pixel covers at any
 * distance and height, and the same from one frame to the next. So the far LOD keeps its few
 * triangles (and its vertex colours, which the far proxies are cut from: far-buildings.ts)
 * and takes the near model's five views as a texture; it can then take over as early as it
 * needs to (props-renderer.ts).
 */
import fs from "node:fs";
import path from "node:path";
import { Document, NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { meshopt, prune, weld } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import { modelFile } from "./model-files.mjs";

const REPO = process.cwd();
const MODELS = path.join(REPO, "public/fps/br/models");
const FAR = process.argv.includes("--far");
const [manifestIn, revision, atlasWidthArg] = process.argv.slice(2).filter((a) => a !== "--far");
if (!manifestIn || !revision) {
  console.error("usage: build_facades.mjs <manifest-in> <revision> [atlasWidth] [--far]");
  process.exit(1);
}
const ATLAS_W = Number(atlasWidthArg ?? 4096);
/**
 * Empty texels round every view (filled by the bake's dilation): mips do not bleed. The far
 * atlas is seen from much further, so much smaller: three times the gutter, clean down to its
 * third mip and nearly to its fourth, and past that the renderer fades each wall to its view's
 * mean colour, which the bake writes into the far LOD's vertex colours (props-renderer.ts
 * FAR_FACADE_FADE, scripts/br/facades/bake.mjs).
 */
const GUTTER = FAR ? 12 : 4;
/** Largest side of one view (px). */
const MAX_SIDE = FAR ? 288 : 448;
/** --far: the ring classes whose far LODs are textured (the buildings), */
const FAR_RINGS = ["building", "dwelling", "shop", "outbuilding", "hero"];
/**
 * and where a far LOD first shows (props-renderer.ts RINGS[class][1]; AIR_FLAT.mid for the
 * models that hand over early from the air). 1 px ≈ distance / 700 m at 1080p, so 1700 /
 * distance texels a metre is one a pixel there; 1900 is a little over.
 */
const RING1 = { building: 800, dwelling: 600, shop: 600, outbuilding: 450, hero: 1100 };
const AIR_FLAT_MID = 300;
// (At most 5.5: the fade to the mean colour is by mip level, so a denser view is a plain wall
// sooner. At 5.5 a tower keeps its windows to a kilometre and a half at 1080p.)
const farDensity = (m) =>
  Math.max(
    2.5,
    Math.min(5.5, 1900 / (m.air === "far" ? AIR_FLAT_MID : (RING1[m.ring ?? m.class] ?? 600))),
  );
/**
 * Not for these: lattices and lines (a crane, a mast, a pylon: mostly air from every side, a
 * view of one is a view of what stands behind it) and rock (its colour is its look already).
 */
const FAR_SKIP = /crane|pylon|mast$|radio-tower|windmill|fire-lookout|pitch-lines|boulder|crag/;
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
      const e = [0, 0, 0, 0];
      for (let i = 0; i < pos.getCount(); i++) {
        pos.getElement(i, e);
        out[i * 3] = m[0] * e[0] + m[4] * e[1] + m[8] * e[2] + m[12];
        out[i * 3 + 1] = m[1] * e[0] + m[5] * e[1] + m[9] * e[2] + m[13];
        out[i * 3 + 2] = m[2] * e[0] + m[6] * e[1] + m[10] * e[2] + m[14];
      }
      // Normals (turned with the node) and colours (vertex × material, linear): the far LODs
      // keep theirs.
      const nrm = prim.getAttribute("NORMAL");
      const normals = nrm ? new Float32Array(pos.getCount() * 3) : null;
      for (let i = 0; nrm && i < pos.getCount(); i++) {
        nrm.getElement(i, e);
        const x = m[0] * e[0] + m[4] * e[1] + m[8] * e[2],
          y = m[1] * e[0] + m[5] * e[1] + m[9] * e[2],
          z = m[2] * e[0] + m[6] * e[1] + m[10] * e[2];
        const l = Math.hypot(x, y, z) || 1;
        normals.set([x / l, y / l, z / l], i * 3);
      }
      const base = prim.getMaterial()?.getBaseColorFactor() ?? [1, 1, 1, 1];
      const col = prim.getAttribute("COLOR_0");
      const colors = new Float32Array(pos.getCount() * 3);
      for (let i = 0; i < pos.getCount(); i++) {
        if (col) col.getElement(i, e);
        else e[0] = e[1] = e[2] = 1;
        colors.set([e[0] * base[0], e[1] * base[1], e[2] * base[2]], i * 3);
      }
      const idx = prim.getIndices();
      const indices = idx
        ? Uint32Array.from({ length: idx.getCount() }, (_, i) => idx.getScalar(i))
        : Uint32Array.from({ length: pos.getCount() }, (_, i) => i);
      prims.push({
        positions: out,
        normals,
        colors,
        indices,
        doubleSided: !!prim.getMaterial()?.getDoubleSided(),
      });
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
  const b = fs.readFileSync(modelFile(f));
  const json = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString("utf8"));
  return (
    !json.textures?.length &&
    json.meshes.length === 1 &&
    json.meshes[0].primitives.length === 1 &&
    json.materials?.[0]?.alphaMode !== "BLEND" &&
    !json.materials?.[0]?.emissiveFactor?.some((x) => x > 0)
  );
};
/**
 * --far: a tower's storey, stacked under the next one or under its roof. Its far LOD loses
 * every face that looks up or down (its balcony's deck and soffit, the lobby's plinth and
 * canopy): what is left is walls, each showing its side of the near model, balconies and all.
 * A deck is a strip 1.4 m deep seen at a slant, a fraction of a pixel from the air, lighter
 * than the wall behind it, and geometry is not filtered: twenty of them up a tower's side
 * showed as dashes that came and went with every metre flown.
 */
const storey = (id, m) => FAR && m.air === "far" && /-(floor|lobby)$/.test(id);
/** The LOD that takes the atlas: the first (the middle one), or with --far the last. */
const level = (m) => (FAR ? m.lods.length - 1 : 1);
const chosen = Object.entries(manifest.models).filter(([id, m]) => {
  const l0 = m.lods[0],
    l = m.lods[level(m)];
  if (FAR)
    return (
      FAR_RINGS.includes(m.ring ?? m.class) &&
      !FAR_SKIP.test(id) &&
      level(m) > 0 &&
      !l.facade &&
      l.file !== l0.file &&
      flat(l.file)
    );
  return l && l0.textureMB > 0 && l.file !== l0.file && flat(l.file);
});

// ------------------------------------------------------------------ layout
const rects = [];
const layout = { revision, views: VIEWS, gutter: GUTTER, models: {} };
const loaded = new Map();
for (const [id, m] of chosen) {
  const lod0 = await read(modelFile(m.lods[0].file));
  const lod1 = await read(modelFile(m.lods[level(m)].file));
  // The silhouette may poke a little outside the near model: bounds of both.
  const b = bounds([...lod0.prims, ...lod1.prims]);
  loaded.set(id, { lod1, b });
  const d = FAR ? farDensity(m) : density(m.ring ?? m.class);
  const size = [0, 1, 2].map((a) => Math.max(0.05, b.max[a] - b.min[a]));
  const longest = Math.max(...size);
  const k = Math.min(1, (MAX_SIDE - 2 * GUTTER) / (longest * d));
  layout.models[id] = { file: m.lods[0].file, min: b.min, max: b.max, rects: [] };
  if (FAR) layout.models[id].lod = `/fps/br/models/${id}.${revision}.lod${level(m)}.glb`;
  VIEWS.forEach((view, vi) => {
    // (A tower's storey has no top in its far LOD, below: the least a view can be.)
    const s = vi === 4 && storey(id, m) ? 0 : 1;
    const w = Math.max(8, Math.ceil(size[view.u[0]] * d * k * s)) + 2 * GUTTER;
    const h = Math.max(8, Math.ceil(size[view.v[0]] * d * k * s)) + 2 * GUTTER;
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
// Far off a window is the dark of the room behind it under a little sky: the bake paints the
// glass so, where the middle atlas looks through it (scripts/br/facades/entry.ts). Most
// buildings' glass is not in their models any more but panes of the game's own (panes.ts: they
// break), drawn only up close: the bake puts them back in their openings, or it would look
// through every window at a lit room.
if (FAR) {
  layout.glass = "opaque";
  const json = (f) => JSON.parse(fs.readFileSync(path.join(REPO, "src/lib/fps/br", f), "utf8"));
  const panes = {
    ...Object.fromEntries(
      Object.entries(json("skyline-plan.json").models).map(([id, m]) => [id, m.panes]),
    ),
    ...json("hospital-plan.json").panes,
    ...json("arena-plan.json").panes,
    ...json("station-plan.json").panes,
  };
  for (const [id, list] of Object.entries(json("window-panes.json").models))
    panes[id] = [...(panes[id] ?? []), ...list];
  // (Model space: x0, x1, z0, z1, y0, y1 a pane.)
  for (const [id, m] of Object.entries(layout.models))
    if (panes[id]?.length) m.panes = panes[id].flat().map((v) => +v.toFixed(3));
}

// ------------------------------------------------------------------ LOD1 with UVs
// The world itself (placements, collision) is unchanged: the manifest keeps its worldRevision,
// which the client checks against the collision file and the server.
const out = structuredClone(manifest);
const atlasFile = `/fps/br/models/atlas.${revision}.webp`;
out[FAR ? "farFacades" : "facades"] = {
  atlas: atlasFile,
  width: ATLAS_W,
  height: ATLAS_H,
  models: chosen.length,
};
let texels = 0;
for (const [id, m] of chosen) {
  const { lod1, b } = loaded.get(id);
  const size = [0, 1, 2].map((a) => Math.max(0.05, b.max[a] - b.min[a]));
  const pos = [],
    uv = [],
    nrm = [],
    col = [];
  const smooth = lod1.prims.every((p) => p.normals);
  for (const { positions, indices, normals, colors } of lod1.prims)
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
      if (Math.abs(ny) > 0.5 && storey(id, m)) continue;
      // Roofs and floors from above; walls from the side they face.
      const vi =
        Math.abs(ny) > 0.5 ? 4 : Math.abs(nx) >= Math.abs(nz) ? (nx > 0 ? 0 : 1) : nz > 0 ? 2 : 3;
      const view = VIEWS[vi];
      const [rx, ry, rw, rh] = layout.models[id].rects[vi];
      for (let k = 0; FAR && k < 3; k++) {
        const i = indices[t + k] * 3;
        if (smooth) nrm.push(normals[i], normals[i + 1], normals[i + 2]);
        col.push(colors[i], colors[i + 1], colors[i + 2]);
      }
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
    .createMaterial(FAR ? "facade-far" : "facade")
    .setRoughnessFactor(0.9)
    .setMetallicFactor(0)
    .setDoubleSided(FAR ? lod1.prims.some((p) => p.doubleSided) : true);
  const prim = doc
    .createPrimitive()
    .setAttribute("POSITION", position)
    .setAttribute("TEXCOORD_0", texcoord)
    .setMaterial(material);
  if (FAR) {
    // Its shading as it was, and its colours: not drawn (the renderer turns vertex colours off
    // on this material), they are what the far proxy beyond the last ring is cut from.
    if (smooth)
      prim.setAttribute(
        "NORMAL",
        doc.createAccessor().setType("VEC3").setArray(new Float32Array(nrm)).setBuffer(buffer),
      );
    prim.setAttribute(
      "COLOR_0",
      doc
        .createAccessor()
        .setType("VEC3")
        .setNormalized(true)
        .setArray(Uint8Array.from(col, (v) => Math.round(Math.min(1, Math.max(0, v)) * 255)))
        .setBuffer(buffer),
    );
  }
  doc.createScene().addChild(doc.createNode(id).setMesh(doc.createMesh(id).addPrimitive(prim)));
  // 16-bit texture coordinates: the atlas is up to 4096 px wide and every texel matters.
  // (keepAttributes: the file's material has no texture of its own, the UVs are still used.)
  await doc.transform(
    weld(),
    prune({ keepAttributes: true }),
    meshopt({ encoder: MeshoptEncoder, level: "medium", quantizeTexcoord: 16 }),
  );
  const n = level(m);
  const file = `/fps/br/models/${id}.${revision}.lod${n}.glb`;
  await io.write(path.join(REPO, "public", file), doc);
  const tris = pos.length / 9;
  out.models[id].lods[n] = {
    ...m.lods[n],
    file,
    tris,
    draws: 1,
    textureMB: 0,
    kB: Math.round(fs.statSync(path.join(REPO, "public", file)).size / 1024),
    ...(FAR ? { farFacade: true } : { facade: true }),
  };
}
fs.writeFileSync(path.join(MODELS, `models.${revision}.json`), JSON.stringify(out));
fs.writeFileSync(path.join(REPO, `art/br/${revision}.json`), JSON.stringify(layout, null, 1));
console.log(
  `${chosen.length} models, atlas ${ATLAS_W} × ${ATLAS_H} (${((used / ATLAS_H) * 100).toFixed(0)} % of the height used, ` +
    `${(texels / 1e6).toFixed(2)} M texels); models.${revision}.json`,
);
console.log(chosen.map(([id]) => id).join(" "));
