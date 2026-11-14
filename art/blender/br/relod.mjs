/**
 * Lighter far LODs for the models that carry most of a wide view's triangles (performance audit,
 * 2026-11-14).
 *
 * process_assets.mjs sizes a model's LODs from its class budget (LOD1 35 %, LOD2 10 % of, say, a
 * building's 10,000 triangles), so a model already under that share is never reduced: the brick
 * shop (3,082 triangles, 238 placed) kept 2,994 at 800 m and 1,076 at 4 km. From Downtown's
 * tallest roof the shops alone were 480 k triangles.
 *
 * This rebuilds only the LODs listed in PLAN, from the published files (the source downloads
 * are not needed), and writes a new manifest; nothing else in it changes, and collision is
 * untouched (LOD0, which the collision is built from, is never rewritten).
 *
 *   node art/blender/br/relod.mjs <from-manifest.json> <to-manifest.json>
 *   e.g. node art/blender/br/relod.mjs models.arena-v1.json models.lod-v1.json
 *
 * Each LOD is reduced from the file named by `from` (default: the same LOD) by edge collapse,
 * capped at `error` (default 2 % of the model's size; see `reduce`). Files are written as
 * `<id>.lod-v1.lod<N>.glb`. `ring` moves a model to another LOD distance class
 * (props-renderer.ts RINGS). Check every change with scripts/br/model-review (REV=lod-v1).
 *
 * Tried and dropped (model-review, 2026-11-14):
 * - A nearer ring for the towers' storeys (their LOD1 from 80 m): 150 k fewer triangles in
 *   Downtown, but the LOD1 has no inner walls, so every window past 80 m went dark.
 * - Thin structures (the pylon's far LOD, the pole transformer, the fire lookout): the error
 *   that takes their triangles takes the pole, the legs and the lattice first. The pole
 *   transformer's published LOD2 has already lost its pole that way (500 m and beyond). They
 *   need far LODs built by hand, not a simplifier.
 * - Collapsing across UV seams without a cap (the brick shop at 800 triangles): the brick
 *   texture smears in fans across the walls. With UVs weighed in and a 1 % cap it holds at
 *   about 1,600.
 */
import fs from "node:fs";
import path from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { compactPrimitive, meshopt, prune, weld } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";

// The game's meshoptimizer (1.x) for the simplifier: `Permissive` and the current sloppy mode.
const { MeshoptSimplifier } = await import(
  path.join(process.cwd(), "node_modules/meshoptimizer/index.js")
);
await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready]);

const TAG = "lod-v1";
/** Home furniture (the towers' flats and lounges): see RINGS.furniture. */
const FURNITURE = [
  "armchair",
  "bar-stool",
  "bath-set",
  "bathtub",
  "bed-set",
  "bookcase",
  "chandelier",
  "closet",
  "coffee-table",
  "computer-desk",
  "concierge-desk",
  "desk-set",
  "dining-set",
  "floor-lamp",
  "fridge-steel",
  "glass-table",
  "grand-piano",
  "island-counter",
  "kitchen-run",
  "lux-tv",
  "monstera",
  "office-chair",
  "plant-small",
  "pool-table",
  "pub-counter",
  "rug",
  "sofa-luxury",
  "sofa-modern",
  "treadmill",
  "weight-set",
];
/** model → { ring?, lods?: { <level>: { tris, from? } } } */
const PLAN = {
  // Downtown's and the Arena District's shop rows.
  "brick-shop": {
    ring: "shop",
    lods: { 1: { tris: 1400, seams: true, error: 0.01 }, 2: { tris: 140 } },
  },
  "bauhaus-block": { lods: { 2: { tris: 220 } } },
  // Rolling stock and roadside buildings whose far LOD was their near one.
  boxcar: { lods: { 1: { tris: 1000 }, 2: { tris: 260 } } },
  "rural-diner": { lods: { 2: { tris: 260 } } },
  // Parked cars by the hundred, to 1 km.
  "car-sedan": { lods: { 2: { tris: 110 } } },
  "car-pickup": { lods: { 2: { tris: 110 } } },
  // Furniture whose far LOD was its middle one.
  "kitchen-run": { lods: { 2: { tris: 240 } } },
  closet: { lods: { 2: { tris: 150 } } },
};
for (const id of FURNITURE) (PLAN[id] ??= {}).ring = "furniture";

const [fromFile, toFile] = process.argv.slice(2);
if (!toFile) throw new Error("usage: relod.mjs <from-manifest.json> <to-manifest.json>");
const dir = "public/fps/br/models";
const manifest = JSON.parse(fs.readFileSync(path.join(dir, fromFile), "utf8"));
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });

const triangles = (doc) =>
  doc
    .getRoot()
    .listMeshes()
    .flatMap((m) => m.listPrimitives())
    .reduce((s, p) => s + p.getIndices().getCount() / 3, 0);

/**
 * Reduce every primitive toward its share of `target` triangles by edge collapse, never moving
 * the surface more than `maxError` (a share of the model's size). The cap is what keeps thin
 * parts: uncapped, a pole or a lattice's bars collapse to nothing long before a wall does.
 * Textured primitives collapse with their UVs weighed in, and across UV seams only with
 * `seams` (the texture then stretches at the joins).
 */
function reduce(doc, target, maxError, seams) {
  const prims = doc
    .getRoot()
    .listMeshes()
    .flatMap((m) => m.listPrimitives())
    .filter((p) => p.getIndices() && p.getMode() === 4);
  const total = prims.reduce((s, p) => s + p.getIndices().getCount() / 3, 0);
  for (const p of prims) {
    const tris = p.getIndices().getCount() / 3;
    const goal = Math.max(8, Math.round((tris / total) * target));
    if (tris <= goal) continue;
    // (Positions may be stored quantised: the simplifier works on a float copy, the stored
    // attributes are only re-indexed.)
    const positions = Float32Array.from(p.getAttribute("POSITION").getArray());
    const indices = Uint32Array.from(p.getIndices().getArray());
    const uv = p.getAttribute("TEXCOORD_0");
    let uvs = null;
    if (uv) {
      uvs = new Float32Array(uv.getCount() * 2);
      const at = [0, 0];
      for (let i = 0; i < uv.getCount(); i++) uvs.set(uv.getElement(i, at), i * 2);
    }
    let best = indices;
    for (const error of [0.005, 0.01, 0.02, 0.04, 0.08, 0.15, 0.3].filter((e) => e <= maxError)) {
      const [out] = uvs
        ? MeshoptSimplifier.simplifyWithAttributes(
            indices,
            positions,
            3,
            uvs,
            2,
            [1, 1],
            null,
            goal * 3,
            error,
            seams ? ["Permissive"] : [],
          )
        : MeshoptSimplifier.simplify(indices, positions, 3, goal * 3, error, []);
      if (out.length === 0) break;
      best = out;
      if (out.length / 3 <= goal * 1.1) break;
    }
    p.getIndices().setArray(best);
    compactPrimitive(p);
  }
}

let changed = 0;
for (const [id, plan] of Object.entries(PLAN)) {
  const model = manifest.models[id];
  if (!model) throw new Error(`${id}: not in ${fromFile}`);
  if (plan.ring) model.ring = plan.ring;
  for (const [key, { tris, from, error = 0.02, seams = false }] of Object.entries(
    plan.lods ?? {},
  )) {
    const level = Number(key);
    const source = model.lods[from ?? level];
    const doc = await io.read(path.join("public", source.file));
    const before = triangles(doc);
    // Join the vertices that are the same point with the same UV, normal and colour (many models
    // arrive with every face on its own vertices, and edge collapse stops at every such join).
    await doc.transform(weld());
    reduce(doc, tris, error, seams);
    await doc.transform(prune(), meshopt({ encoder: MeshoptEncoder, level: "medium" }));
    const file = `/fps/br/models/${id}.${TAG}.lod${level}.glb`;
    const out = path.join("public", file);
    await io.write(out, doc);
    const after = triangles(doc);
    if (after > model.lods[level].tris)
      throw new Error(`${id} LOD${level}: ${after} triangles, more than before`);
    model.lods[level] = {
      ...source,
      ...model.lods[level],
      file,
      tris: after,
      kB: Math.round(fs.statSync(out).size / 1024),
    };
    changed++;
    console.log(`${id} LOD${level}: ${before} → ${after} triangles (asked ${tris})`);
  }
}
fs.writeFileSync(path.join(dir, toFile), JSON.stringify(manifest));
console.log(`${toFile}: ${changed} LODs rebuilt, ${Object.keys(PLAN).length} models touched`);
