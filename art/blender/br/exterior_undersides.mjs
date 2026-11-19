/**
 * Undersides outside a building lit as undersides again (owner, 2026-11-18: "those apartments
 * flicker from distance while running/parachute, the side with the dark balconys").
 *
 * interior_style.mjs (2026-11-15) turned every downward face of the procedural shells to face up,
 * so the rooms' ceilings would catch the light. It did that to the outside too: the apartment's
 * balcony slabs, the window heads, the bungalow's and townhouse's eaves, the strip mall's canopy.
 * Lit from above, those undersides came out white on the near LOD and dark on the middle and far
 * ones (which interior_style never touched). Every time a block crossed the near LOD's distance
 * (100 m, more from the air), its undersides flashed white or dark; and in the near LOD a balcony's
 * white underside a pixel or two tall between the dark railing and the dark glass shimmered.
 *
 * A downward face of the vertex-coloured shell keeps its upward normal only if it is a ceiling:
 * level rays in eight directions from just under it all meet the model (walls, glass, doors)
 * within 80 m. Anything open to the outside on any side (a balcony, an eave, a canopy, a window
 * head) faces down again, as in the middle LOD. The interior materials ("Interior walls and
 * ceiling", "Access floor and steps") are left as they are.
 *
 *   node art/blender/br/exterior_undersides.mjs <models.<rev>.json> <tag> id,id,…
 *
 * Writes public/fps/br/models/<id>.<tag>.lod0.glb and points the manifest's LOD0 at it.
 */
import fs from "node:fs";
import path from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dequantize, meshopt, unweld, weld } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";

const INTERIOR = new Set(["Interior walls and ceiling", "Access floor and steps"]);
/** How far under the face the rays start (m), and how far they look. */
const BELOW = 0.03,
  REACH = 80;
const DIRS = Array.from({ length: 8 }, (_, k) => [
  Math.cos((k * Math.PI) / 4),
  0,
  Math.sin((k * Math.PI) / 4),
]);

const dir = "public/fps/br/models";
const [manifestName, tag, list] = process.argv.slice(2);
if (!list) throw new Error("usage: exterior_undersides.mjs <models.<rev>.json> <tag> <ids>");
const manifestPath = path.join(dir, manifestName);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  "meshopt.decoder": MeshoptDecoder,
  "meshopt.encoder": MeshoptEncoder,
});

/** Möller–Trumbore: distance along the ray, or Infinity. */
function hit(o, d, a, b, c) {
  const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]],
    e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const p = [d[1] * e2[2] - d[2] * e2[1], d[2] * e2[0] - d[0] * e2[2], d[0] * e2[1] - d[1] * e2[0]];
  const det = e1[0] * p[0] + e1[1] * p[1] + e1[2] * p[2];
  if (Math.abs(det) < 1e-12) return Infinity;
  const inv = 1 / det;
  const s = [o[0] - a[0], o[1] - a[1], o[2] - a[2]];
  const u = (s[0] * p[0] + s[1] * p[1] + s[2] * p[2]) * inv;
  if (u < 0 || u > 1) return Infinity;
  const q = [s[1] * e1[2] - s[2] * e1[1], s[2] * e1[0] - s[0] * e1[2], s[0] * e1[1] - s[1] * e1[0]];
  const v = (d[0] * q[0] + d[1] * q[1] + d[2] * q[2]) * inv;
  if (v < 0 || u + v > 1) return Infinity;
  const t = (e2[0] * q[0] + e2[1] * q[1] + e2[2] * q[2]) * inv;
  return t > 1e-4 ? t : Infinity;
}

for (const id of list.split(",").filter(Boolean)) {
  const entry = manifest.models[id];
  if (!entry) throw new Error(`${id}: not in ${manifestName}`);
  const doc = await io.read(`public${entry.lods[0].file}`);
  await doc.transform(dequantize(), unweld());
  // Every triangle in model space (for the rays), and the shell's downward ones (to judge).
  const all = [],
    judge = [];
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const m = node.getWorldMatrix();
    const w = (v) =>
      [0, 1, 2].map((r) => m[r] * v[0] + m[4 + r] * v[1] + m[8 + r] * v[2] + m[12 + r]);
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute("POSITION"),
        nrm = prim.getAttribute("NORMAL");
      const interior = INTERIOR.has(prim.getMaterial()?.getName() ?? "");
      for (let i = 0; i + 2 < pos.getCount(); i += 3) {
        const v = [0, 1, 2].map((k) => w(pos.getElement(i + k, [])));
        all.push(v);
        if (interior || !nrm) continue;
        const u = v[1].map((x, k) => x - v[0][k]),
          q = v[2].map((x, k) => x - v[0][k]);
        const ny = u[2] * q[0] - u[0] * q[2];
        const len = Math.hypot(u[1] * q[2] - u[2] * q[1], ny, u[0] * q[1] - u[1] * q[0]);
        if (len < 1e-6 || ny / len > -0.9) continue; // not a downward face
        if (nrm.getElement(i, [])[1] < 0.7) continue; // already faces down
        judge.push({ nrm, i, c: [0, 1, 2].map((k) => (v[0][k] + v[1][k] + v[2][k]) / 3) });
      }
    }
  }
  let outside = 0;
  for (const t of judge) {
    const o = [t.c[0], t.c[1] - BELOW, t.c[2]];
    const enclosed = DIRS.every((d) => all.some(([a, b, c]) => hit(o, d, a, b, c) < REACH));
    if (enclosed) continue;
    outside++;
    for (let k = 0; k < 3; k++) {
      const n = t.nrm.getElement(t.i + k, []);
      t.nrm.setElement(t.i + k, [-n[0], -n[1], -n[2]]);
    }
  }
  await doc.transform(weld(), meshopt({ encoder: MeshoptEncoder, level: "medium" }));
  const file = `${id}.${tag}.lod0.glb`;
  await io.write(path.join(dir, file), doc);
  entry.lods[0] = {
    ...entry.lods[0],
    file: `/fps/br/models/${file}`,
    kB: Math.round(fs.statSync(path.join(dir, file)).size / 1024),
  };
  console.log(`${id}: ${outside} of ${judge.length} lit undersides are outside (face down again)`);
}
fs.writeFileSync(
  manifestPath,
  JSON.stringify(manifest, null, manifestName === "models.json" ? 1 : 0) +
    (manifestName === "models.json" ? "\n" : ""),
);
