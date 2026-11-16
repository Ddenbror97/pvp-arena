/**
 * A livery for aircraft whose download is plain white (owner, 2026-11-16: "add color to the
 * smaller airplanes beside that one, they are just white"): the Cessna 310s parked by the A320
 * at the island airfield.
 *
 * Each face gets a colour from where it is on the plane (model space: nose toward +z, up +y):
 * the lower body, the fin and the tip tanks in navy, the rest white. (Stripes narrower than the
 * model's triangles come out as a sawtooth.)
 * Only light faces are painted (the source white); windows, tyres and the dark trim keep their
 * colour. Colours go into COLOR_0 (multiplied with a texture where the part has one); the faces
 * are unwelded so each keeps its own. Geometry, LOD triangle counts and collision are unchanged.
 * Writes `<id>.livery-v1.lod<N>.glb` and points both manifests' LODs at them.
 *
 *   node art/blender/br/paint_aircraft.mjs        (run from the repo root)
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
const TAG = "livery-v1";
const dir = "public/fps/br/models";
const MANIFESTS = ["models.locations-v1.json", "models.json"];

const srgb = (r, g, b) => [r, g, b].map((c) => Math.pow(c, 2.2)); // vertex colours are linear
const WHITE = srgb(0.95, 0.95, 0.94);
const NAVY = srgb(0.1, 0.17, 0.38);

/** Per model: face centre (x, y, z) → colour, or null to leave the face as it is. */
const RULES = {
  // Cessna 310: cabin 0.9–2.4 m, fuselage half-width ≤ 0.62 m, tip tanks beyond |x| 5.1 m,
  // fin behind z −3 m above 2 m.
  cessna310: ([x, y, z]) => {
    const ax = Math.abs(x);
    if (ax > 5.1) return NAVY; // tip tanks
    if (ax < 0.3 && z < -3 && y > 2.0) return NAVY; // fin
    // (A narrow cheatline came out as a sawtooth: the cabin sides are a few long triangles.)
    const body = ax < 0.66 && z > -4.6 && z < 4.6;
    return body && y < 1.3 ? NAVY : WHITE; // lower body
  },
};

/** The face's current colour is the source white (not a window, tyre or dark trim). */
const light = (c) => c[0] > 0.6 && c[1] > 0.6 && c[2] > 0.6;

for (const file of MANIFESTS) {
  const manifestFile = path.join(dir, file);
  const raw = fs.readFileSync(manifestFile, "utf8");
  const manifest = JSON.parse(raw);
  for (const [id, rule] of Object.entries(RULES)) {
    const model = manifest.models[id];
    if (!model) throw new Error(`${id}: not in ${file}`);
    for (const [level, lod] of model.lods.entries()) {
      const out = `/fps/br/models/${id}.${TAG}.lod${level}.glb`;
      if (lod.file === out) continue;
      if (!fs.existsSync(path.join("public", out))) {
        const doc = await io.read(modelFile(lod.file));
        await doc.transform(dequantize(), unweld());
        for (const node of doc.getRoot().listNodes()) {
          const mesh = node.getMesh();
          if (!mesh) continue;
          const M = node.getWorldMatrix();
          for (const p of mesh.listPrimitives()) {
            const pos = p.getAttribute("POSITION");
            const n = pos.getCount();
            const old = p.getAttribute("COLOR_0");
            // A textured part has no colours yet: white, so the texture shows as before.
            const colours = new Float32Array(n * 3).fill(1);
            const v = [0, 0, 0, 0];
            if (old)
              for (let i = 0; i < n; i++) colours.set(old.getElement(i, v).slice(0, 3), i * 3);
            const world = (i) => {
              pos.getElement(i, v);
              return [0, 1, 2].map(
                (r) => M[r] * v[0] + M[4 + r] * v[1] + M[8 + r] * v[2] + M[12 + r],
              );
            };
            let painted = 0;
            for (let t = 0; t + 2 < n; t += 3) {
              const c = [0, 1, 2].map((k) => colours[t * 3 + k]);
              if (!light(c)) continue;
              const [a, b, d] = [world(t), world(t + 1), world(t + 2)];
              const paint = rule([0, 1, 2].map((k) => (a[k] + b[k] + d[k]) / 3));
              if (!paint) continue;
              // A textured part keeps its texture's shading: the paint over the source white.
              const tint = old ? paint : paint.map((x, k) => x / Math.max(WHITE[k], 1e-3));
              for (let k = 0; k < 3; k++)
                colours.set(old ? tint : tint.map((x) => Math.min(1, x)), (t + k) * 3);
              painted++;
            }
            if (!painted) continue;
            p.setAttribute(
              "COLOR_0",
              doc.createAccessor().setType("VEC3").setArray(colours).setBuffer(pos.getBuffer()),
            );
          }
        }
        await doc.transform(weld(), prune(), meshopt({ encoder: MeshoptEncoder, level: "medium" }));
        await io.write(path.join("public", out), doc);
        console.log(`${id} LOD${level} → ${out}`);
      }
      model.lods[level] = {
        ...lod,
        file: out,
        kB: Math.round(fs.statSync(path.join("public", out)).size / 1024),
      };
    }
  }
  fs.writeFileSync(
    manifestFile,
    file === "models.json" ? JSON.stringify(manifest, null, 1) + "\n" : JSON.stringify(manifest),
  );
}
