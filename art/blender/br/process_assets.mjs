/**
 * Project Island asset processor: turns licence-checked Sketchfab downloads into game-ready,
 * budgeted GLBs with three LODs. Performance over quality (owner, 2026-11-03).
 *
 *   node art/blender/br/process_assets.mjs [id ...]        (run from the repo root)
 *
 * Input: art/br/assets/kit.json (what to build, class budgets, fit sizes) and
 * art/br/assets/inventory.json (zip path, glTF member, licence, credit). Each download is staged
 * by art/br/assets/stage.py (sanitised, nothing executed) into a scratch folder.
 *
 * Per asset:
 *  1. spec/gloss → metal/rough; drop animation, skins, morph targets and expensive material
 *     extensions (transmission, clearcoat, sheen, volume, specular…): one cheap PBR material set;
 *  2. bake every node transform into the vertices, fit to the real-world size, pivot at the
 *     bottom centre (y = 0 is the ground), +z forward as authored;
 *  3. merge everything that shares a material into one primitive (draw calls = materials);
 *  4. weld + meshopt simplify to the class budget (LOD1 35 %, LOD2 10 %);
 *  5. textures to WebP, capped per class (LOD1 half, LOD2 quarter size);
 *  6. meshopt compression + quantisation (decoded by three's MeshoptDecoder, as in 1v1/5v5).
 *
 * Output: public/fps/br/models/<id>.lod{0,1,2}.glb and public/fps/br/models/models.json
 * (bounds, triangles, draws, texture memory per LOD, credit). Attribution lines go into
 * public/fps/br/models/ATTRIBUTION.md.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { NodeIO, ImageUtils, Logger } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  compactPrimitive,
  dedup,
  join,
  meshopt,
  metalRough,
  prune,
  textureCompress,
  weld,
  transformPrimitive,
} from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";

const REPO = process.cwd();
/**
 * meshoptimizer ≥ 1.0 for `permissive` assets: its Permissive flag collapses across UV seams
 * (scanned rocks are cut into thousands of UV islands; 0.22 stalls at ~4× the budget). The
 * pipeline's own pinned 0.22 does everything else; 1.1 is the one in the game's lockfile.
 */
const { MeshoptSimplifier: PermissiveSimplifier } = await import(
  path.join(REPO, "node_modules/meshoptimizer/index.js")
);
await PermissiveSimplifier.ready;
const kit = JSON.parse(fs.readFileSync("art/br/assets/kit.json", "utf8"));
const inventory = JSON.parse(fs.readFileSync("art/br/assets/inventory.json", "utf8"));
const assets = Array.isArray(inventory.assets) ? inventory.assets : Object.values(inventory.assets);
const byKey = new Map(assets.map((a) => [a.key, a]));
const OUT = path.join(REPO, "public/fps/br/models");
fs.mkdirSync(OUT, { recursive: true });
const manifestPath = path.join(OUT, "models.json");
const manifest = fs.existsSync(manifestPath)
  ? JSON.parse(fs.readFileSync(manifestPath, "utf8"))
  : { version: 1, models: {} };

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready]);
// Prune removes small disconnected pieces once they fall under the error (bolts, cables…).
MeshoptSimplifier.useExperimentalFeatures = true;
const io = new NodeIO()
  .setLogger(new Logger(Logger.Verbosity.WARN))
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });

/** Extensions three.js renders cheaply and the game keeps; everything else is removed. */
const KEEP = new Set([
  "KHR_mesh_quantization",
  "EXT_meshopt_compression",
  "EXT_texture_webp",
  "KHR_texture_transform",
  "KHR_materials_emissive_strength",
  "KHR_materials_unlit",
]);

const only = process.argv.slice(2);
// Procedural models (`procedural`: their own build script) are not downloads: skipped here.
const work = kit.assets.filter((a) => !a.procedural && (!only.length || only.includes(a.id)));
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "br-assets-"));

const triangles = (doc) => {
  let t = 0;
  for (const mesh of doc.getRoot().listMeshes())
    for (const p of mesh.listPrimitives()) {
      if (p.getMode() !== 4) continue;
      const idx = p.getIndices();
      t += (idx ? idx.getCount() : p.getAttribute("POSITION").getCount()) / 3;
    }
  return Math.round(t);
};
const draws = (doc) =>
  doc
    .getRoot()
    .listNodes()
    .reduce((n, node) => n + (node.getMesh()?.listPrimitives().length ?? 0), 0);
const textureMB = (doc) =>
  doc
    .getRoot()
    .listTextures()
    .reduce((s, t) => {
      const [w, h] = ImageUtils.getSize(t.getImage(), t.getMimeType()) ?? [0, 0];
      return s + (w * h * 4 * 1.333) / 1048576;
    }, 0);

async function clean(doc) {
  const root = doc.getRoot();
  for (const a of root.listAnimations()) a.dispose();
  for (const s of root.listSkins()) s.dispose();
  for (const mesh of root.listMeshes()) {
    mesh.setWeights([]);
    for (const p of mesh.listPrimitives()) {
      for (const t of p.listTargets()) t.dispose();
      // Points and lines (helpers, wires) are not drawn by the game.
      if (p.getMode() !== 4) p.dispose();
      for (const sem of p.listSemantics?.() ?? [])
        if (/^(JOINTS|WEIGHTS|TEXCOORD_[1-9]|COLOR_)/.test(sem)) p.setAttribute(sem, null);
    }
  }
  if (
    root.listExtensionsUsed().some((e) => e.extensionName === "KHR_materials_pbrSpecularGlossiness")
  )
    await doc.transform(metalRough());
  for (const material of root.listMaterials()) {
    // Glass and other see-through materials become opaque-cheap or alpha-blended once.
    const transmission = material.getExtension("KHR_materials_transmission");
    if (transmission) {
      material.setAlphaMode("BLEND");
      const c = material.getBaseColorFactor();
      material.setBaseColorFactor([c[0], c[1], c[2], Math.min(c[3], 0.35)]);
    }
    // Without an environment map in the open world, metals read as black: keep them dielectric-ish.
    material.setMetallicFactor(Math.min(material.getMetallicFactor(), 0.3));
  }
  for (const ext of root.listExtensionsUsed()) if (!KEEP.has(ext.extensionName)) ext.dispose();
}

/**
 * Bake every node's world transform (times `scale`) into its own copy of the geometry, so
 * shared meshes and accessors are never transformed twice; the result is one root-level node
 * per mesh with an identity transform. Then put the pivot at the bottom centre. Returns the
 * bounds computed from the actual vertices.
 */
function bake(
  doc,
  scale,
  piece = null,
  exclude = [],
  zUp = false,
  { stretch = null, yaw = 0 } = {},
) {
  const root = doc.getRoot();
  const scene = root.getDefaultScene() ?? root.listScenes()[0];
  // `zUp`: a model exported with its height along z: turned about x, so (x, y, z) becomes
  // (x, z, -y); `zUp: -1` for one lying the other way up, (x, -z, y).
  const k = zUp === -1 ? -1 : 1;
  // `stretch` [sx, sy, sz]: scaled per axis (a bridge pylon made narrower to straddle a
  // narrower deck); `yaw` (degrees): turned about +y as three.js turns (x' = x cos + z sin), for
  // a model that must follow something placed off the axes (placements turn by quarter turns).
  const [sx, sy, sz] = stretch ?? [1, 1, 1];
  const c = Math.cos((yaw * Math.PI) / 180),
    sn = Math.sin((yaw * Math.PI) / 180);
  const S = zUp
    ? [scale, 0, 0, 0, 0, 0, -k * scale, 0, 0, k * scale, 0, 0, 0, 0, 0, 1]
    : [
        scale * sx * c,
        0,
        -scale * sx * sn,
        0,
        0,
        scale * sy,
        0,
        0,
        scale * sz * sn,
        0,
        scale * sz * c,
        0,
        0,
        0,
        0,
        1,
      ];
  const baked = [];
  // `piece`: keep only the sub-tree under the node with this name (one tree out of a pack), or
  // under any of a list of names (a fuel-pump forecourt out of a whole gas-station scene).
  // `exclude`: sub-trees to drop (a backdrop sphere, a ground plane).
  const pieces = piece === null ? null : [piece].flat();
  const visit = (node, inside = !pieces) => {
    if (exclude.includes(node.getName())) return;
    inside = inside || pieces.includes(node.getName());
    const mesh = inside ? node.getMesh() : null;
    if (mesh) {
      const world = multiply(S, node.getWorldMatrix());
      const copy = doc.createMesh(mesh.getName());
      for (const prim of mesh.listPrimitives()) {
        const p = prim.clone();
        for (const sem of p.listSemantics()) p.setAttribute(sem, prim.getAttribute(sem).clone());
        if (prim.getIndices()) p.setIndices(prim.getIndices().clone());
        transformPrimitive(p, world);
        copy.addPrimitive(p);
      }
      baked.push(doc.createNode(node.getName()).setMesh(copy));
    }
    for (const c of node.listChildren()) visit(c, inside);
  };
  for (const c of scene.listChildren()) visit(c);
  for (const node of root.listNodes()) if (!baked.includes(node)) node.dispose();
  for (const n of baked) scene.addChild(n);
  for (const mesh of root.listMeshes())
    if (!baked.some((n) => n.getMesh() === mesh)) mesh.dispose();
  const b = vertexBounds(doc);
  const shift = [-(b.min[0] + b.max[0]) / 2, -b.min[1], -(b.min[2] + b.max[2]) / 2];
  const T = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, shift[0], shift[1], shift[2], 1];
  for (const n of baked) for (const p of n.getMesh().listPrimitives()) transformPrimitive(p, T);
  return vertexBounds(doc);
}

/** Column-major 4×4 multiply (a · b). */
function multiply(a, b) {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++)
      for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return o;
}

function vertexBounds(doc) {
  const min = [Infinity, Infinity, Infinity],
    max = [-Infinity, -Infinity, -Infinity];
  for (const mesh of doc.getRoot().listMeshes())
    for (const p of mesh.listPrimitives()) {
      const pos = p.getAttribute("POSITION");
      if (!pos) continue;
      const v = [0, 0, 0];
      for (let i = 0; i < pos.getCount(); i++) {
        pos.getElement(i, v);
        for (let k = 0; k < 3; k++) {
          if (v[k] < min[k]) min[k] = v[k];
          if (v[k] > max[k]) max[k] = v[k];
        }
      }
    }
  return { min, max };
}

function fitScale(bounds, fit) {
  if (!fit) return 1;
  const size = [0, 1, 2].map((i) => bounds.max[i] - bounds.min[i]);
  if (fit.y) return fit.y / size[1];
  if (fit.max) return fit.max / Math.max(size[0], size[2]);
  return 1;
}

/**
 * Reduce the whole document to about `target` triangles: every primitive gets its share, and
 * the allowed error grows until the share is met (performance over quality). Small disconnected
 * parts are pruned as the error grows.
 */
function reduce(doc, target, { prune = true, permissive = false } = {}) {
  const prims = doc
    .getRoot()
    .listMeshes()
    .flatMap((m) => m.listPrimitives())
    .filter((p) => p.getIndices() && p.getMode() === 4);
  const total = prims.reduce((s, p) => s + p.getIndices().getCount() / 3, 0);
  if (total <= target) return;
  for (const p of prims) {
    const tris = p.getIndices().getCount() / 3;
    const goal = Math.max(4, Math.floor((tris / total) * target));
    if (tris <= goal) continue;
    const pos = p.getAttribute("POSITION").getArray();
    const positions = pos instanceof Float32Array ? pos : Float32Array.from(pos);
    const indices = Uint32Array.from(p.getIndices().getArray());
    let best = indices;
    for (const error of [0.005, 0.015, 0.04, 0.1, 0.25, 0.6]) {
      // Prune (drop small disconnected pieces) only while the error is small: at large errors it
      // removes whole limbs of a model (forklift masts, parachute canopies).
      let [out] = permissive
        ? PermissiveSimplifier.simplify(indices, positions, 3, goal * 3, error, ["Permissive"])
        : MeshoptSimplifier.simplify(
            indices,
            positions,
            3,
            goal * 3,
            error,
            prune && error <= 0.04 ? ["Prune"] : [],
          );
      // Pruning drops whole disconnected pieces; models built from many small panels would
      // lose nearly everything, so then simplify without it (the silhouette survives).
      if (out.length / 3 < Math.min(tris, goal) * 0.25)
        [out] = MeshoptSimplifier.simplify(indices, positions, 3, goal * 3, error, []);
      if (out.length === 0) break;
      best = out;
      if (out.length / 3 <= goal * 1.15) break;
    }
    if (best.length === 0) {
      p.dispose();
      continue;
    }
    p.getIndices().setArray(best);
    compactPrimitive(p);
  }
}

/** Average linear colour of a material (base colour factor × mean of its base colour texture). */
const averages = new Map();
async function averageColour(material) {
  const tex = material.getBaseColorTexture();
  const f = material.getBaseColorFactor();
  let rgb = [1, 1, 1];
  if (tex) {
    if (!averages.has(tex)) {
      try {
        // Alpha-weighted mean in linear space (transparent texels are often white or black
        // filler and must not tint the result); greyscale images become RGBA here too.
        const { data } = await sharp(Buffer.from(tex.getImage()))
          .resize(64, 64, { fit: "fill" })
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true });
        const sum = [0, 0, 0];
        let weight = 0;
        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3] / 255;
          for (let k = 0; k < 3; k++) sum[k] += Math.pow(data[i + k] / 255, 2.2) * a;
          weight += a;
        }
        averages.set(tex, weight > 0 ? sum.map((v) => v / weight) : [0.5, 0.5, 0.5]);
      } catch {
        averages.set(tex, [0.5, 0.5, 0.5]);
      }
    }
    rgb = averages.get(tex);
  }
  // Baked ambient occlusion darkens the base colour in LOD0; keep that in flat colours.
  const ao = material.getOcclusionTexture();
  let occlusion = 1;
  if (ao) {
    if (!averages.has(ao)) {
      try {
        const stats = await sharp(Buffer.from(ao.getImage())).stats();
        averages.set(ao, [stats.channels[0].mean / 255]);
      } catch {
        averages.set(ao, [1]);
      }
    }
    occlusion = 0.35 + 0.65 * averages.get(ao)[0];
  }
  return [f[0] * rgb[0] * occlusion, f[1] * rgb[1] * occlusion, f[2] * rgb[2] * occlusion];
}

/**
 * Turn the primitives of every material except the `keep` largest (by triangles) into
 * vertex-coloured geometry sharing ONE untextured material, so they join into a single draw.
 * With `silhouette`, every material is converted, normals are dropped (three.js then shades
 * flat) and vertices are welded by position (1 mm) so the reducer is not blocked by seams.
 */
async function flatten(doc, keep, silhouette = false) {
  const root = doc.getRoot();
  const prims = root.listMeshes().flatMap((m) => m.listPrimitives());
  const trisOf = new Map();
  for (const p of prims) {
    const m = p.getMaterial();
    const n = (p.getIndices()?.getCount() ?? p.getAttribute("POSITION").getCount()) / 3;
    trisOf.set(m, (trisOf.get(m) ?? 0) + n);
  }
  const ranked = [...trisOf.keys()].sort((a, b) => trisOf.get(b) - trisOf.get(a));
  const kept = new Set(
    silhouette ? [] : ranked.slice(0, Math.max(0, keep - 1 + (ranked.length <= keep ? 1 : 0))),
  );
  if (kept.size === ranked.length) return;
  // Double-sided when any merged material was (single planes such as fences, panels, cages).
  const doubleSided = ranked.some((m) => m && !kept.has(m) && m.getDoubleSided());
  const flat = doc
    .createMaterial("flat")
    .setRoughnessFactor(0.9)
    .setMetallicFactor(0)
    .setDoubleSided(doubleSided);
  for (const p of prims) {
    const m = p.getMaterial();
    if (kept.has(m)) continue;
    // Already vertex-coloured (an earlier pass): keep those colours.
    const existing = p.getAttribute("COLOR_0");
    const [r, g, b] = existing ? [1, 1, 1] : m ? await averageColour(m) : [0.6, 0.6, 0.6];
    const pos = p.getAttribute("POSITION");
    const source = existing
      ? Array.from({ length: pos.getCount() }, (_, i) => existing.getElement(i, [0, 0, 0, 0]))
      : null;
    let firstOf = null;
    let indices = p.getIndices()?.getArray();
    let count = pos.getCount();
    let positions = null;
    if (silhouette) {
      const ids = new Map();
      const welded = [];
      const remap = new Uint32Array(count);
      const v = [0, 0, 0];
      for (let i = 0; i < count; i++) {
        pos.getElement(i, v);
        const key = `${Math.round(v[0] * 1000)},${Math.round(v[1] * 1000)},${Math.round(v[2] * 1000)}`;
        let id = ids.get(key);
        if (id === undefined) {
          id = welded.length / 3;
          ids.set(key, id);
          welded.push(v[0], v[1], v[2]);
        }
        remap[i] = id;
      }
      indices = indices ? Uint32Array.from(indices, (i) => remap[i]) : Uint32Array.from(remap);
      firstOf = new Uint32Array(welded.length / 3);
      for (let i = count - 1; i >= 0; i--) firstOf[remap[i]] = i;
      positions = Float32Array.from(welded);
      count = welded.length / 3;
      for (const sem of p.listSemantics()) p.setAttribute(sem, null);
      p.setAttribute(
        "POSITION",
        doc.createAccessor().setType("VEC3").setArray(positions).setBuffer(pos.getBuffer()),
      );
      p.setIndices(
        doc.createAccessor().setType("SCALAR").setArray(indices).setBuffer(pos.getBuffer()),
      );
    } else {
      for (const sem of p.listSemantics())
        if (!/^(POSITION|NORMAL)$/.test(sem)) p.setAttribute(sem, null);
    }
    const colours = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const c = source ? source[firstOf ? firstOf[i] : i] : null;
      colours.set(c ? [c[0], c[1], c[2]] : [r, g, b], i * 3);
    }
    p.setAttribute(
      "COLOR_0",
      doc.createAccessor().setType("VEC3").setArray(colours).setBuffer(pos.getBuffer()),
    );
    p.setMaterial(flat);
  }
}

/** Keep only base colour (and emissive-free, opaque-cheap) maps for small classes. */
function stripDetailMaps(doc, { keepOcclusion = false } = {}) {
  for (const m of doc.getRoot().listMaterials()) {
    m.setNormalTexture(null);
    if (!keepOcclusion) m.setOcclusionTexture(null);
    m.setEmissiveTexture(null);
    if (m.getMetallicRoughnessTexture()) {
      m.setMetallicRoughnessTexture(null);
      m.setMetallicFactor(0).setRoughnessFactor(0.85);
    }
  }
}

/** Remove up-facing triangles lying within `h` of the model's bottom (y = 0 after bake). */
function dropFloor(doc, h) {
  for (const mesh of doc.getRoot().listMeshes())
    for (const p of mesh.listPrimitives()) {
      const pos = p.getAttribute("POSITION");
      const idx = p.getIndices();
      const n = idx ? idx.getCount() : pos.getCount();
      const at = (i) => pos.getElement(idx ? idx.getScalar(i) : i, [0, 0, 0]);
      const keep = [];
      for (let t = 0; t < n; t += 3) {
        const [a, b, c] = [at(t), at(t + 1), at(t + 2)];
        const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]],
          v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
        const ny = u[2] * v[0] - u[0] * v[2],
          len = Math.hypot(u[1] * v[2] - u[2] * v[1], ny, u[0] * v[1] - u[1] * v[0]) || 1;
        const flat = Math.abs(ny / len) > 0.8;
        if (flat && a[1] < h && b[1] < h && c[1] < h) continue;
        for (const i of [t, t + 1, t + 2]) keep.push(idx ? idx.getScalar(i) : i);
      }
      const out = doc.createAccessor().setType("SCALAR").setArray(new Uint32Array(keep));
      if (idx) out.setBuffer(idx.getBuffer());
      else out.setBuffer(pos.getBuffer());
      p.setIndices(out);
    }
}

const credits = [];
for (const item of work) {
  const src = byKey.get(item.key);
  if (!src) throw new Error(`${item.id}: ${item.key} not in inventory`);
  if (src.licence.verdict !== "OK") throw new Error(`${item.id}: licence ${src.licence.verdict}`);
  const zip = src.zips.find((z) => z.present !== false && fs.existsSync(z.path));
  if (!zip) throw new Error(`${item.id}: zip missing`);
  const budget = kit.budgets[item.class];
  const stage = path.join(scratch, item.id);
  execFileSync("python3", ["-I", "art/br/assets/stage.py", zip.path, src.gltf_member, stage], {
    stdio: ["ignore", "ignore", "inherit"],
  });
  const file = fs.existsSync(path.join(stage, "scene.gltf"))
    ? path.join(stage, "scene.gltf")
    : path.join(stage, path.basename(src.gltf_member));
  const t0 = performance.now();

  // Measure at scale 1 to compute the fit, then build every LOD from a fresh read.
  const probe = await io.read(file);
  await clean(probe);
  const xf = { stretch: item.stretch, yaw: item.yaw ?? 0 };
  const raw = bake(probe, 1, item.piece, item.exclude, item.zUp, xf);
  if (!Number.isFinite(raw.min[0])) throw new Error(`${item.id}: piece ${item.piece} not found`);
  const scale = fitScale(raw, item.fit);
  const sourceTris = triangles(probe);

  const lods = [];
  for (const [level, lod] of kit.lods.entries()) {
    const doc = await io.read(file);
    await clean(doc);
    // `noEmissive`: a baked glow map that would light the whole model white in the open world.
    if (item.noEmissive)
      for (const m of doc.getRoot().listMaterials())
        m.setEmissiveTexture(null).setEmissiveFactor([0, 0, 0]);
    // `colour` (sRGB 0..1): a paint for a download whose materials are plain white (an office
    // kit modelled in SketchUp, an untextured checkout): the base colour of every untextured
    // material, so the piece does not draw as a bare white shape.
    // `recolour`: textured materials too (their texture dropped): a model whose texture is a
    // near-black bake (the strait pylons).
    if (item.colour)
      for (const m of doc.getRoot().listMaterials())
        if (!m.getBaseColorTexture() || item.recolour) {
          m.setBaseColorTexture(null);
          m.setBaseColorFactor([...item.colour.map((c) => Math.pow(c, 2.2)), 1]);
        }
    const bounds = bake(doc, scale, item.piece, item.exclude, item.zUp, xf);
    // `dropFloor` (m): the flat ground a download stands on (a wreck's painted sand plate) cut
    // away: triangles facing up whose three corners lie within this height of the bottom.
    if (item.dropFloor) dropFloor(doc, item.dropFloor);
    // `sink` (m): the model set this far down, its base below the ground it is placed on (a
    // motel's 1.4 m foundation pad, drawn standing on a parking lot the import's other pieces
    // carried, sunk to a kerb's height).
    if (item.sink)
      for (const mesh of doc.getRoot().listMeshes())
        for (const p of mesh.listPrimitives())
          transformPrimitive(p, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, -item.sink, 0, 1]);
    await doc.transform(dedup(), join({ keepNamed: false }), weld(), prune());
    // Per-asset override for models placed by the hundred (town houses, garages).
    const target = item.lodTris?.[level] ?? Math.max(60, budget.tris * lod.ratio);
    // `keepTextures` per asset: alpha-tested see-through models (a chain-link fence) keep their
    // texture at every LOD, like foliage; the untextured silhouette would be a solid panel.
    const keepTextures = budget.keepTextures || item.keepTextures;
    if (!budget.detailMaps) stripDetailMaps(doc);
    else if (level > 0) stripDetailMaps(doc, { keepOcclusion: true });
    // Draw calls: the largest materials stay textured, the rest merge into one coloured draw.
    // Foliage keeps its alpha-tested textures at every LOD (a flat colour would turn leaf
    // cards into solid planes).
    // (`draws` per asset: a building whose fit-out adds its own coloured groups keeps fewer.)
    if (!keepTextures) await flatten(doc, item.draws ?? budget.draws);
    await doc.transform(join({ keepNamed: false }), prune());
    // Foliage is made of separate leaf cards: never prune them away (the canopy would thin out).
    // `permissive` per asset: scanned rocks and ruins are cut into UV islands whose seams stop the
    // reduction early; collapsing across them keeps the texture instead of a flat silhouette.
    reduce(doc, target, { prune: !keepTextures, permissive: item.permissive });
    // Seams (UV and normal splits) stop the seam-respecting reduction early. If it misses the
    // budget by more than half (LOD0: double), or for the farthest LOD, rebuild as an
    // untextured, flat-shaded silhouette in ONE draw: positions only, so nothing blocks the
    // collapse (performance over quality).
    if (
      !keepTextures &&
      (level === kit.lods.length - 1 || triangles(doc) > target * (level === 0 ? 2 : 1.5))
    ) {
      await flatten(doc, 0, true);
      await doc.transform(join({ keepNamed: false }), prune());
      reduce(doc, target);
    }
    await doc.transform(prune());
    // Textures: class size, then halve until under the class's memory cap for this LOD.
    // Per-asset cap (kit pieces share one colour atlas, which needs far fewer pixels).
    let px = Math.max(
      64,
      Math.round(Math.min(budget.texture, item.texture ?? Infinity) * lod.texture),
    );
    const capMB = budget.textureMB * lod.texture * lod.texture;
    await doc.transform(
      textureCompress({ encoder: sharp, targetFormat: "webp", resize: [px, px], quality: 82 }),
    );
    while (textureMB(doc) > capMB && px > 64) {
      px = Math.round(px / 2);
      await doc.transform(
        textureCompress({ encoder: sharp, targetFormat: "webp", resize: [px, px], quality: 82 }),
      );
    }
    await doc.transform(prune(), meshopt({ encoder: MeshoptEncoder, level: "medium" }));
    const out = path.join(OUT, `${item.id}.lod${level}.glb`);
    await io.write(out, doc);
    lods.push({
      file: `/fps/br/models/${item.id}.lod${level}.glb`,
      tris: triangles(doc),
      draws: draws(doc),
      textureMB: +textureMB(doc).toFixed(2),
      kB: Math.round(fs.statSync(out).size / 1024),
      size: [0, 1, 2].map((i) => +(bounds.max[i] - bounds.min[i]).toFixed(2)),
    });
    // A reduction that went nowhere (many small disconnected parts the silhouette pass cannot
    // weld) must not cost more than the nearer LOD: reuse that one (one draw for the far LOD).
    const prev = lods[level - 1],
      cur = lods[level];
    if (prev && cur.tris > prev.tris && (level < kit.lods.length - 1 || prev.draws === 1)) {
      fs.copyFileSync(path.join(REPO, "public", prev.file), out);
      lods[level] = { ...prev, file: cur.file };
    }
  }
  fs.rmSync(stage, { recursive: true, force: true });
  manifest.models[item.id] = {
    title: src.title,
    author: src.author,
    source: src.source,
    licence: src.licence.label,
    class: item.class,
    /** LOD distance class used by the renderer (defaults to the budget class). */
    ring: item.ring ?? item.class,
    use: item.use,
    scale: +scale.toFixed(6),
    sourceTris,
    size: lods[0].size,
    lods,
  };
  credits.push(item.id);
  const l0 = lods[0];
  console.log(
    `${item.id.padEnd(18)} ${String(sourceTris).padStart(7)} → ${String(l0.tris).padStart(6)} / ${lods[1].tris} / ${lods[2].tris} tris, ${l0.draws} draws, ${l0.textureMB} MB tex, ${l0.kB} kB, size ${l0.size.join("×")} m (${((performance.now() - t0) / 1000).toFixed(1)} s)`,
  );
}
fs.rmSync(scratch, { recursive: true, force: true });
// A full run drops models that left the kit (and their files).
if (!only.length)
  for (const [id, m] of Object.entries(manifest.models))
    if (!kit.assets.some((a) => a.id === id)) {
      for (const lod of m.lods) fs.rmSync(path.join(REPO, "public", lod.file), { force: true });
      delete manifest.models[id];
    }
manifest.models = Object.fromEntries(
  Object.entries(manifest.models).sort(([a], [b]) => a.localeCompare(b)),
);
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1) + "\n");
const lines = Object.entries(manifest.models).map(
  ([id, m]) =>
    `- \`${id}\`: "${m.title}" by ${m.author} (${m.source}), licensed under ${m.licence}. Simplified, rescaled and re-textured for the game.`,
);
fs.writeFileSync(
  path.join(OUT, "ATTRIBUTION.md"),
  `# Project Island models\n\nThird-party models used in the Battle Royale map, all under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Generated by art/blender/br/process_assets.mjs.\n\n${lines.join("\n")}\n`,
);
console.log(`${credits.length} models → ${path.relative(REPO, OUT)}`);
