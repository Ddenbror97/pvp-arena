/**
 * Coplanar faces lifted apart (owner, 2026-11-11: "there is some flicker cross some
 * buildings/towers", on the coping of a wall beside a roof stair). Within a model, two
 * triangles in the same plane, facing the same way and overlapping, z-fight: neither wins the
 * depth test, so the surface shimmers as the camera moves. A sweep of every building and
 * structure found them on roof parapets and copings (the prison block, the school, the airport
 * terminal, the superstore's wing roofs), on trim and window glazing laid on walls, and on a few
 * towers' platforms.
 *
 * The smaller triangle of each overlapping pair (trim, a coping, glazing: the detail laid on the
 * larger surface) is lifted `LIFT` along its normal, so it is drawn on top; identical duplicates
 * have one of them lifted. Each lifted triangle gets its own vertices, so nothing around it
 * moves. Collision is unchanged (render only). Writes `<id>.zfix-v1.lod<N>.glb` for the models
 * that have any and points the manifest's LODs at them.
 *
 *   node art/blender/br/offset_coplanar.mjs [manifest.json] [--dry]
 */
import fs from "node:fs";
import path from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dequantize, meshopt, prune, unweld, weld } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });
const dir = "public/fps/br/models";
const args = process.argv.slice(2);
const dry = args.includes("--dry");
const manifestFile = path.join(
  dir,
  args.find((a) => !a.startsWith("--")) ?? "models.paint-v1.json",
);
const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
const CLASSES = new Set(["building", "structure", "dwelling", "outbuilding", "hero"]);
/** How far the smaller face is lifted (m): beyond the depth buffer's step at LOD distances. */
const LIFT = 0.015;
/** Same plane: normals within ~2.5°, offsets within this (m). */
const PLANE = 0.004;

function inside(t, p) {
  const n = t.n;
  const ax =
    Math.abs(n[0]) > Math.abs(n[1])
      ? Math.abs(n[0]) > Math.abs(n[2])
        ? 0
        : 2
      : Math.abs(n[1]) > Math.abs(n[2])
        ? 1
        : 2;
  const [i, j] = [0, 1, 2].filter((k) => k !== ax);
  const s = (p1, p2, p3) => (p1[i] - p3[i]) * (p2[j] - p3[j]) - (p2[i] - p3[i]) * (p1[j] - p3[j]);
  const d1 = s(p, t.v[0], t.v[1]),
    d2 = s(p, t.v[1], t.v[2]),
    d3 = s(p, t.v[2], t.v[0]);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
}

const report = [];
for (const [id, model] of Object.entries(manifest.models)) {
  if (!CLASSES.has(model.class)) continue;
  for (const [level, lod] of model.lods.entries()) {
    const doc = await io.read("public" + lod.file);
    await doc.transform(dequantize(), unweld());
    const root = doc.getRoot();
    // Triangles of every primitive in model space (node transforms applied for the test only).
    const tris = [];
    for (const node of root.listNodes()) {
      const mesh = node.getMesh();
      if (!mesh) continue;
      const m = node.getWorldMatrix();
      const w = (v) => [
        m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12],
        m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13],
        m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14],
      ];
      // The lift in the primitive's own space: the inverse of the node's linear part applied
      // to a world-space normal is approximated by its transpose scaled (rigid + uniform scale).
      const scale = Math.hypot(m[0], m[1], m[2]) || 1;
      for (const p of mesh.listPrimitives()) {
        if (p.getMode() !== 4) continue;
        const mat = p.getMaterial();
        if (mat && mat.getAlphaMode() !== "OPAQUE") continue; // glass and decals blend anyway
        const pos = p.getAttribute("POSITION");
        for (let i = 0; i + 2 < pos.getCount(); i += 3) {
          const v = [0, 1, 2].map((k) => w(pos.getElement(i + k, [])));
          const u = v[1].map((x, k) => x - v[0][k]),
            q = v[2].map((x, k) => x - v[0][k]);
          let n = [u[1] * q[2] - u[2] * q[1], u[2] * q[0] - u[0] * q[2], u[0] * q[1] - u[1] * q[0]];
          const len = Math.hypot(...n);
          if (len < 2e-4) continue;
          n = n.map((x) => x / len);
          tris.push({
            p,
            i,
            v,
            n,
            m,
            scale,
            d: n[0] * v[0][0] + n[1] * v[0][1] + n[2] * v[0][2],
            area: len / 2,
            c: [0, 1, 2].map((k) => (v[0][k] + v[1][k] + v[2][k]) / 3),
          });
        }
      }
    }
    const grid = new Map();
    const key = (t, dd = 0) =>
      [
        Math.round(t.n[0] * 20),
        Math.round(t.n[1] * 20),
        Math.round(t.n[2] * 20),
        Math.round(t.d / 0.05) + dd,
      ].join();
    for (const t of tris) {
      const k = key(t);
      (grid.get(k) ?? grid.set(k, []).get(k)).push(t);
    }
    const lift = new Set();
    for (const t of tris) {
      if (lift.has(t)) continue;
      for (const dd of [-1, 0, 1])
        for (const u of grid.get(key(t, dd)) ?? []) {
          if (u === t || lift.has(u)) continue;
          const dot = t.n[0] * u.n[0] + t.n[1] * u.n[1] + t.n[2] * u.n[2];
          if (dot < 0.999 || Math.abs(t.d - u.d) > PLANE) continue;
          if (!(inside(t, u.c) || inside(u, t.c))) continue;
          lift.add(u.area <= t.area ? u : t);
        }
    }
    if (!lift.size) continue;
    for (const t of lift) {
      const pos = t.p.getAttribute("POSITION");
      // World normal → the primitive's space (rotation part transposed, scale undone).
      const m = t.m,
        s = t.scale;
      const ln = [
        (m[0] * t.n[0] + m[1] * t.n[1] + m[2] * t.n[2]) / s,
        (m[4] * t.n[0] + m[5] * t.n[1] + m[6] * t.n[2]) / s,
        (m[8] * t.n[0] + m[9] * t.n[1] + m[10] * t.n[2]) / s,
      ];
      const off = LIFT / s;
      for (let k = 0; k < 3; k++) {
        const v = pos.getElement(t.i + k, []);
        pos.setElement(t.i + k, [v[0] + ln[0] * off, v[1] + ln[1] * off, v[2] + ln[2] * off]);
      }
    }
    report.push(`${id} lod${level}: ${lift.size} faces lifted`);
    if (dry) continue;
    await doc.transform(
      prune({ keepAttributes: true }),
      weld(),
      meshopt({ encoder: MeshoptEncoder, level: "medium", quantizePosition: 16 }),
    );
    const file = `/fps/br/models/${id}.zfix-v1.lod${level}.glb`;
    await io.write("public" + file, doc);
    model.lods[level] = { ...lod, file, kB: Math.round(fs.statSync("public" + file).size / 1024) };
  }
}
if (!dry) fs.writeFileSync(manifestFile, JSON.stringify(manifest));
console.log(report.join("\n"));
