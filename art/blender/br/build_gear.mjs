/**
 * Worn gear for the battle royale (owner, 2026-11-04: "upgrade the design of the helmets,
 * backpacks, vests … more details, realistic looks"): nine CC BY models from Sketchfab, one per
 * loot level, credited in public/fps/br/models/ATTRIBUTION.md.
 *
 *   node br/build_gear.mjs <staged dir> <out.glb>     (run from art/blender)
 *
 * <staged dir> holds one folder per piece, named after it ("helmet-1" … "backpack-3"), each
 * staged from its download zip by art/br/assets/stage.py. Each piece is baked to one mesh in
 * metres, turned so its front faces −Z with +Y up, centred on its bounding box, simplified to a
 * triangle budget, its textures resized to 512 px WebP, and placed under a top node named after
 * it. The game fits each piece to the wearer at run time (br/character-gear.ts), so only the
 * shape and orientation matter here, not the source's scale.
 */
import fs from "node:fs";
import path from "node:path";
import { Document, NodeIO, getBounds } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  dedup,
  flatten,
  join,
  mergeDocuments,
  meshopt,
  metalRough,
  prune,
  simplify,
  textureCompress,
  transformMesh,
  weld,
} from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";
import { mat4 } from "gl-matrix";

const [dir, out] = process.argv.slice(2);

/**
 * Per piece: turn (degrees about X, Y, Z, applied in that order) so that the front faces −Z and
 * up is +Y, and a triangle budget. Orientations were read off front/side renders of the sources.
 */
const PIECES = {
  // The chin strap hangs far below the shell: the crown band reaches further down.
  "helmet-1": { turn: [0, 0, 0], tris: 2100, crown: 0.5 },
  // A glossy black shell in the source: matte paint, as issued.
  "helmet-2": { turn: [0, -90, 0], tris: 3500, finish: { metal: 0.1, rough: 0.62 } },
  "helmet-3": { turn: [0, 90, 0], tris: 5000 },
  // A closed soft-armour vest (2k triangles in the source).
  "vest-1": { turn: [0, 0, 0], tris: 2000, cutAbove: 0.49 },
  // The plate carriers' pouches faced +Z in the sources.
  "vest-2": { turn: [0, 180, 0], tris: 4000 },
  "vest-3": { turn: [0, 180, 0], tris: 6000 },
  "backpack-1": { turn: [0, 0, 0], tris: 1500 },
  "backpack-2": { turn: [0, 0, 0], tris: 2800 },
  "backpack-3": { turn: [0, 0, 0], tris: 4500 },
};
const ONLY = process.env.ONLY?.split(",");
/** Sources (all CC BY 4.0), written to ATTRIBUTION-gear.md beside the output. */
const CREDITS = {
  "helmet-1": [
    "MICH 2001 military helmet",
    "HaizorWill",
    "https://sketchfab.com/3d-models/mich-2001-military-helmet-ad5907514a5343e3aca5ae0357b485a3",
  ],
  "helmet-2": [
    "Military Helmet",
    "ED BOX",
    "https://sketchfab.com/3d-models/military-helmet-7b344fdb2ce846539cb420fe4d37fc13",
  ],
  "helmet-3": [
    "Tactical Helmet with Headset (Game-Ready)",
    "Exactly",
    "https://sketchfab.com/3d-models/tactical-helmet-with-headset-game-ready-82adf376164f4d99a4e0b2949930e2ad",
  ],
  "vest-1": [
    "Vest",
    "Santeri Riikonen (eKross)",
    "https://sketchfab.com/3d-models/vest-a1a17b557c464838b9e770d3d5099d54",
  ],
  "vest-2": [
    "Low Poly Game Ready Armor Vest",
    "DanlyVostok",
    "https://sketchfab.com/3d-models/low-poly-game-ready-armor-vest-90c084b9a56441b1afcfa9293b6fe4af",
  ],
  "vest-3": [
    "Military Armor 3D Model",
    "Exactly",
    "https://sketchfab.com/3d-models/military-armor-3d-model-7cab57de2b844a60a43af4fd8b61a4a4",
  ],
  "backpack-1": [
    "Military Tactical Backpack",
    "Liam3D",
    "https://sketchfab.com/3d-models/military-tactical-backpack-9fa2da2c42234b58896e8d23393cac24",
  ],
  "backpack-2": [
    "Low Poly Game Ready Military Tactical Backpack",
    "DanlyVostok",
    "https://sketchfab.com/3d-models/low-poly-game-ready-military-tactical-backpack-95a4fc7300584384b56ce3add58dbc9f",
  ],
  "backpack-3": [
    "Tactical Explorer Backpack",
    "yronthal",
    "https://sketchfab.com/3d-models/tactical-explorer-backpack-adc0e037e7ce458ebd5418ba8f30d22b",
  ],
};

await MeshoptEncoder.ready;
await MeshoptSimplifier.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.encoder": MeshoptEncoder });

const target = new Document();
target.createBuffer();
const targetScene = target.createScene("gear");
const report = {};

for (const [name, cfg] of Object.entries(PIECES)) {
  if (ONLY && !ONLY.includes(name)) continue;
  const src = path.join(dir, name, "scene.gltf");
  if (!fs.existsSync(src)) {
    console.log("skip (not staged):", name);
    continue;
  }
  const doc = await io.read(src);
  // Specular-glossiness sources become metal-roughness like the rest.
  await doc.transform(metalRough(), flatten());
  const root = doc.getRoot();
  const scene = root.listScenes()[0];
  // Bake every mesh node's world transform (and the turn) into its geometry.
  const turn = mat4.create();
  mat4.rotateZ(turn, turn, (cfg.turn[2] * Math.PI) / 180);
  mat4.rotateY(turn, turn, (cfg.turn[1] * Math.PI) / 180);
  mat4.rotateX(turn, turn, (cfg.turn[0] * Math.PI) / 180);
  for (const node of root.listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const m = mat4.multiply(mat4.create(), turn, node.getWorldMatrix());
    transformMesh(mesh, m);
    node.setMatrix(mat4.create());
  }
  for (const node of root.listNodes()) if (!node.getMesh()) node.setMatrix(mat4.create());
  await doc.transform(join({ keepNamed: false }), weld());
  // Straps modelled over a bulkier shoulder rig loop far above the vest and stand off any other
  // body: every triangle reaching above `cutAbove` (a fraction of the height) is removed.
  if (cfg.cutAbove) {
    const b0 = getBounds(scene);
    const y0 = b0.min[1] + (b0.max[1] - b0.min[1]) * cfg.cutAbove;
    for (const mesh of root.listMeshes())
      for (const p of mesh.listPrimitives()) {
        const pos = p.getAttribute("POSITION"),
          idx = p.getIndices();
        if (!idx) continue;
        const y = (j) => pos.getElement(idx.getScalar(j), [0, 0, 0])[1];
        const keep = [];
        for (let k = 0; k + 2 < idx.getCount(); k += 3)
          if (Math.max(y(k), y(k + 1), y(k + 2)) <= y0)
            keep.push(idx.getScalar(k), idx.getScalar(k + 1), idx.getScalar(k + 2));
        idx.setArray(new Uint32Array(keep));
      }
    await doc.transform(prune());
  }
  // Centre on the bounding box.
  const b = getBounds(scene);
  const c = b.min.map((v, i) => -(v + b.max[i]) / 2);
  for (const node of root.listNodes()) {
    const mesh = node.getMesh();
    if (mesh) transformMesh(mesh, mat4.fromTranslation(mat4.create(), c));
  }
  let tris = 0;
  for (const mesh of root.listMeshes())
    for (const p of mesh.listPrimitives())
      tris += (p.getIndices()?.getCount() ?? p.getAttribute("POSITION").getCount()) / 3;
  const ratio = Math.min(1, cfg.tris / tris);
  if (ratio < 1)
    await doc.transform(
      simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.08, lockBorder: false }),
    );
  if (cfg.finish)
    for (const m of root.listMaterials())
      m.setMetallicFactor(cfg.finish.metal)
        .setRoughnessFactor(cfg.finish.rough)
        .setMetallicRoughnessTexture(null);
  if (cfg.finish?.color)
    for (const m of root.listMaterials()) m.setBaseColorFactor([...cfg.finish.color, 1]);
  await doc.transform(
    textureCompress({ encoder: sharp, targetFormat: "webp", resize: [512, 512], quality: 82 }),
    prune(),
    dedup(),
  );
  let after = 0;
  for (const mesh of root.listMeshes())
    for (const p of mesh.listPrimitives())
      after += (p.getIndices()?.getCount() ?? p.getAttribute("POSITION").getCount()) / 3;
  const size = getBounds(scene);
  // Fit data for the game (top node extras): the crown band — vertices in the top 35 % of the
  // piece's height — is the shell alone (no chin straps, headset or hanging webbing), so its
  // width fits a helmet to a skull; for vests and packs the full box is used.
  const band = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
  const cut = size.max[1] - (size.max[1] - size.min[1]) * (cfg.crown ?? 0.35);
  for (const mesh of root.listMeshes())
    for (const p of mesh.listPrimitives()) {
      const pos = p.getAttribute("POSITION"),
        v = [0, 0, 0];
      for (let i = 0; i < pos.getCount(); i++) {
        pos.getElement(i, v);
        if (v[1] < cut) continue;
        band.minX = Math.min(band.minX, v[0]);
        band.maxX = Math.max(band.maxX, v[0]);
        band.minZ = Math.min(band.minZ, v[2]);
        band.maxZ = Math.max(band.maxZ, v[2]);
      }
    }
  // Vests: the inner opening (rays from the vest's centre at chest height: the first surface
  // forward, back and to each side is the inside of the front plate, back plate and side
  // panels), which wraps the torso. Packs: the back panel's plane (rays from the straps side;
  // the median depth, so strap loops do not count). Triangles, not vertices: the low-poly
  // plates have vertices only at their corners.
  const faces = [];
  for (const mesh of root.listMeshes())
    for (const p of mesh.listPrimitives()) {
      const pos = p.getAttribute("POSITION"),
        idx = p.getIndices();
      const n = idx ? idx.getCount() : pos.getCount();
      for (let k = 0; k + 2 < n; k += 3) {
        const at = (j) => pos.getElement(idx ? idx.getScalar(j) : j, [0, 0, 0]);
        faces.push([at(k), at(k + 1), at(k + 2)]);
      }
    }
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  /** Distance to the first triangle along the ray (Möller–Trumbore), or Infinity. */
  const cast = (o, d) => {
    let best = Infinity;
    for (const [a, b, c] of faces) {
      const e1 = sub(b, a),
        e2 = sub(c, a),
        pv = cross(d, e2),
        det = dot(e1, pv);
      if (Math.abs(det) < 1e-12) continue;
      const tv = sub(o, a),
        u = dot(tv, pv) / det;
      if (u < 0 || u > 1) continue;
      const qv = cross(tv, e1),
        v = dot(d, qv) / det;
      if (v < 0 || u + v > 1) continue;
      const t = dot(e2, qv) / det;
      if (t > 1e-6 && t < best) best = t;
    }
    return best;
  };
  const median = (a) => {
    const f = a.filter(Number.isFinite).sort((x, y) => x - y);
    return f.length ? f[Math.floor(f.length / 2)] : null;
  };
  const W = size.max[0] - size.min[0],
    H = size.max[1] - size.min[1],
    D = size.max[2] - size.min[2];
  const cx = (size.min[0] + size.max[0]) / 2,
    cz = (size.min[2] + size.max[2]) / 2;
  let inner = null,
    panel = null;
  if (name.startsWith("vest")) {
    const hs = [0.45, 0.55, 0.65].map((f) => size.min[1] + H * f);
    const reach = (d) => median(hs.map((y) => cast([cx, y, cz], d)));
    // Open sides (no cummerbund at that height): the outer edge less a fabric's thickness.
    const f = reach([0, 0, -1]) ?? D / 2 - 0.02 * D,
      b = reach([0, 0, 1]) ?? D / 2 - 0.02 * D,
      l = reach([-1, 0, 0]) ?? W / 2 - 0.05 * W,
      r = reach([1, 0, 0]) ?? W / 2 - 0.05 * W;
    inner = {
      minX: +(cx - l).toFixed(4),
      maxX: +(cx + r).toFixed(4),
      minZ: +(cz - f).toFixed(4),
      maxZ: +(cz + b).toFixed(4),
    };
  }
  if (name.startsWith("backpack")) {
    const hits = [];
    for (const fx of [-0.2, -0.1, 0, 0.1, 0.2])
      for (const fy of [0.3, 0.4, 0.5, 0.6, 0.7]) {
        const t = cast([cx + W * fx, size.min[1] + H * fy, size.min[2] - 0.01], [0, 0, 1]);
        if (Number.isFinite(t)) hits.push(size.min[2] - 0.01 + t);
      }
    const m = median(hits);
    if (m !== null) panel = +m.toFixed(4);
  }
  const fit = {
    min: size.min.map((v) => +v.toFixed(4)),
    max: size.max.map((v) => +v.toFixed(4)),
    crown: Object.fromEntries(Object.entries(band).map(([k, v]) => [k, +v.toFixed(4)])),
    ...(inner ? { inner } : {}),
    ...(panel !== null ? { panel } : {}),
  };
  report[name + "-fit"] = { inner, panel, min: fit.min, max: fit.max };
  report[name] = {
    trisFrom: tris,
    tris: after,
    size: size.max.map((v, i) => +(v - size.min[i]).toFixed(3)),
  };
  // Into the output: one top node per piece, its meshes under it.
  const before = new Set(target.getRoot().listNodes());
  mergeDocuments(target, doc);
  const top = target.createNode(name).setExtras({ fit });
  targetScene.addChild(top);
  for (const s of target.getRoot().listScenes())
    if (s !== targetScene) {
      for (const child of s.listChildren()) if (!before.has(child)) top.addChild(child);
      s.dispose();
    }
}

// One buffer, compressed.
const buffer = target.getRoot().listBuffers()[0];
for (const a of target.getRoot().listAccessors()) a.setBuffer(buffer);
for (const b of target.getRoot().listBuffers()) if (b !== buffer) b.dispose();
await target.transform(
  prune({ keepLeaves: true }),
  dedup(),
  meshopt({ encoder: MeshoptEncoder, level: "medium" }),
);
await io.write(out, target);
fs.writeFileSync(
  path.join(path.dirname(out), "ATTRIBUTION-gear.md"),
  `# Worn gear (gear.glb)\n\nHelmets, vests and backpacks worn by battle royale players, all under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Built by art/blender/br/build_gear.mjs.\n\n${Object.entries(
    CREDITS,
  )
    .map(
      ([id, [title, author, url]]) =>
        `- \`${id}\`: "${title}" by ${author} (${url}), licensed under CC BY 4.0. Simplified, reoriented, re-textured and fitted to the characters.`,
    )
    .join("\n")}\n`,
);
console.log(JSON.stringify(report, null, 1));
console.log("wrote", out, fs.statSync(out).size, "bytes");
