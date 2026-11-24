/**
 * Window reveals lit as the wall they cut through (owner, 2026-11-24: "the open windows edges
 * still flicker this white line while running/moving").
 *
 * A window or door cut through a wall leaves its sill's top and its head's underside: faces as
 * deep as the wall (0.3 m) and lying flat. From the street, 30–50 m off at eye height, such a face
 * is a tenth or two of a pixel tall, so 4× MSAA catches it on some frames and misses it on
 * others; lit from above (or below) it is far brighter (or darker) than the wall beside it, so
 * the sill and the head of every opening blinked as a white line while the player moved.
 * Found on the owner's RTX 2050 (gpu-bench, the Bauhaus apartment block from 40 m, walking):
 * picking the triangle under each blinking pixel gave the walls' plaster caps first.
 *
 * Each such cap (a flat face between a wall's two faces, at most `THIN` apart) takes the normal
 * of the wall's outer face. It is then lit like the wall: a sliver of it, or none, looks the
 * same. Up close the sill reads a little flatter. Geometry, collision and colour are unchanged.
 * Writes `<id>.<tag>.lod<N>.glb` and points the manifest's LODs at them.
 *
 *   node art/blender/br/reveal_normals.mjs <manifest.json> --only=apartment [--dry] [--tag=reveal-v1]
 */
import fs from "node:fs";
import path from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dequantize, meshopt, prune, unweld, weld } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import { modelFile } from "./model-files.mjs";

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });
const dir = "public/fps/br/models";
const args = process.argv.slice(2);
const dry = args.includes("--dry");
const TAG = args.find((a) => a.startsWith("--tag="))?.slice(6) ?? "reveal-v1";
const manifestArg = args.find((a) => !a.startsWith("--"));
const ONLY = args
  .find((a) => a.startsWith("--only="))
  ?.slice(7)
  .split(",");
if (!manifestArg || !ONLY) throw new Error("usage: reveal_normals.mjs <manifest.json> --only=a,b");
const manifestFile = path.join(dir, manifestArg);
const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
/** A cap at most this deep (m): a wall's thickness, not a slab or a floor. */
const THIN = 0.4;
/** Same plane (m). */
const EPS = 0.012;

const report = [];
for (const id of ONLY) {
  const model = manifest.models[id];
  if (!model) throw new Error(`no model ${id}`);
  for (const [level, lod] of model.lods.entries()) {
    if (lod.farFacade) continue;
    const doc = await io.read(modelFile(lod.file));
    await doc.transform(dequantize(), unweld());
    const tris = [];
    for (const node of doc.getRoot().listNodes()) {
      const mesh = node.getMesh();
      if (!mesh) continue;
      const m = node.getWorldMatrix();
      const w = (v) => [
        m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12],
        m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13],
        m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14],
      ];
      for (const p of mesh.listPrimitives()) {
        if (p.getMode() !== 4) continue;
        const mat = p.getMaterial();
        if (mat && mat.getAlphaMode() !== "OPAQUE") continue;
        const pos = p.getAttribute("POSITION");
        if (!p.getAttribute("NORMAL")) continue;
        for (let i = 0; i + 2 < pos.getCount(); i += 3) {
          const v = [0, 1, 2].map((k) => w(pos.getElement(i + k, [])));
          const u = v[1].map((x, k) => x - v[0][k]),
            q = v[2].map((x, k) => x - v[0][k]);
          let n = [u[1] * q[2] - u[2] * q[1], u[2] * q[0] - u[0] * q[2], u[0] * q[1] - u[1] * q[0]];
          const len = Math.hypot(...n);
          if (len < 1e-6) continue;
          n = n.map((x) => x / len);
          tris.push({ p, i, v, n, m });
        }
      }
    }
    // The walls' faces: planes x = c (normal ±x) and z = c (normal ±z), with their y span.
    const planes = { 0: new Map(), 2: new Map() };
    const centre = [0, 0, 0];
    for (const t of tris) for (const v of t.v) for (const k of [0, 1, 2]) centre[k] += v[k];
    for (const k of [0, 1, 2]) centre[k] /= tris.length * 3;
    for (const t of tris)
      for (const ax of [0, 2])
        if (Math.abs(t.n[ax]) > 0.99) {
          const c = t.v[0][ax];
          const key = Math.round(c / EPS);
          const ys = t.v.map((v) => v[1]);
          const span = planes[ax].get(key) ?? [];
          span.push([Math.min(...ys), Math.max(...ys), Math.sign(t.n[ax])]);
          planes[ax].set(key, span);
        }
    const faceAt = (ax, c, y, sign) => {
      for (const dk of [-1, 0, 1])
        for (const [y0, y1, s] of planes[ax].get(Math.round(c / EPS) + dk) ?? [])
          if (s === sign && y >= y0 - EPS && y <= y1 + EPS) return true;
      return false;
    };
    let caps = 0;
    for (const t of tris) {
      if (Math.abs(t.n[1]) < 0.99) continue;
      const y = t.v[0][1];
      let out = null;
      for (const ax of [0, 2]) {
        const cs = t.v.map((v) => v[ax]);
        const lo = Math.min(...cs),
          hi = Math.max(...cs);
        if (hi - lo > THIN || hi - lo < 0.05) continue;
        // Between a wall's two faces: one facing -ax at `lo`, one facing +ax at `hi`.
        if (!faceAt(ax, lo, y, -1) || !faceAt(ax, hi, y, 1)) continue;
        // The outer face: the one away from the model's middle.
        const outward = Math.abs(hi - centre[ax]) > Math.abs(lo - centre[ax]) ? 1 : -1;
        out = ax === 0 ? [outward, 0, 0] : [0, 0, outward];
        break;
      }
      if (!out) continue;
      // The world normal back into the node's space (rotation and uniform scale only).
      const m = t.m;
      const s = Math.hypot(m[0], m[1], m[2]) || 1;
      const ln = [
        (m[0] * out[0] + m[1] * out[1] + m[2] * out[2]) / s,
        (m[4] * out[0] + m[5] * out[1] + m[6] * out[2]) / s,
        (m[8] * out[0] + m[9] * out[1] + m[10] * out[2]) / s,
      ];
      const nor = t.p.getAttribute("NORMAL");
      for (let k = 0; k < 3; k++) nor.setElement(t.i + k, ln);
      caps++;
    }
    report.push(`${id} lod${level}: ${caps} caps`);
    if (dry || !caps) continue;
    await doc.transform(
      prune({ keepAttributes: true }),
      weld(),
      meshopt({ encoder: MeshoptEncoder, level: "medium", quantizePosition: 16 }),
    );
    const file = `/fps/br/models/${id}.${TAG}.lod${level}.glb`;
    await io.write("public" + file, doc);
    model.lods[level] = { ...lod, file, kB: Math.round(fs.statSync("public" + file).size / 1024) };
  }
}
if (!dry) fs.writeFileSync(manifestFile, JSON.stringify(manifest));
console.log(report.join("\n"));
