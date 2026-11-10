/**
 * The officer's hat in the battle royale (owner, 2026-11-10: "add this hat to the police in
 * battle royale"), worn until he loots a helmet (br/character-gear.ts). Source: "Classic
 * Detective hat" by 5XCISSORS on Sketchfab, under the Sketchfab Standard licence (the owner
 * chose to use it although it is not CC0/CC BY), credited in ATTRIBUTION-hat.md.
 *
 *   node br/build_hat.mjs <staged dir> <out.glb>     (run from art/blender)
 *
 * <staged dir> is the download staged by art/br/assets/stage.py (scene.gltf member). As in
 * build_gear.mjs: baked to one mesh in metres, front to −Z and +Y up, centred on its bounding
 * box, simplified, textures to 512 px WebP, meshopt-compressed, under a top node "hat" whose
 * extras carry the fit data (box, and the crown's opening at the band).
 */
import fs from "node:fs";
import path from "node:path";
import { NodeIO, getBounds } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  dedup,
  flatten,
  join,
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
 * Turn (degrees about X, then Y) so the hat sits level (the source is tipped forward) with a
 * peak to the front (−Z); the triangle budget.
 */
const TURN_X = Number(process.env.TURN_X ?? 22);
const TURN_Y = Number(process.env.TURN_Y ?? 0);
const TRIS = 3000;

await MeshoptEncoder.ready;
await MeshoptSimplifier.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.encoder": MeshoptEncoder });
const doc = await io.read(path.join(dir, "scene.gltf"));
await doc.transform(metalRough(), flatten());
const root = doc.getRoot();
const scene = root.listScenes()[0];
const turn = mat4.fromYRotation(mat4.create(), (TURN_Y * Math.PI) / 180);
mat4.rotateX(turn, turn, (TURN_X * Math.PI) / 180);
for (const node of root.listNodes()) {
  const mesh = node.getMesh();
  if (!mesh) continue;
  transformMesh(mesh, mat4.multiply(mat4.create(), turn, node.getWorldMatrix()));
  node.setMatrix(mat4.create());
}
for (const node of root.listNodes()) if (!node.getMesh()) node.setMatrix(mat4.create());
await doc.transform(join({ keepNamed: false }), weld());
const b = getBounds(scene);
// The two peaks' tips (lowest points at the front and the back): level when they match.
{
  const tips = { front: [0, Infinity, 0], back: [0, Infinity, 0] };
  for (const mesh of root.listMeshes())
    for (const p of mesh.listPrimitives()) {
      const pos = p.getAttribute("POSITION"),
        v = [0, 0, 0];
      for (let i = 0; i < pos.getCount(); i++) {
        pos.getElement(i, v);
        const t =
          v[2] < (b.min[2] * 2 + b.max[2]) / 3
            ? "front"
            : v[2] > (b.min[2] + b.max[2] * 2) / 3
              ? "back"
              : null;
        if (t && Math.abs(v[0]) < 0.03 && v[1] < tips[t][1]) tips[t] = [...v];
      }
    }
  console.log(
    "tips",
    JSON.stringify(tips),
    "size",
    b.max.map((v, i) => +(v - b.min[i]).toFixed(3)),
  );
}
const c = b.min.map((v, i) => -(v + b.max[i]) / 2);
for (const node of root.listNodes()) {
  const mesh = node.getMesh();
  if (mesh) transformMesh(mesh, mat4.fromTranslation(mat4.create(), c));
}
const count = () => {
  let n = 0;
  for (const mesh of root.listMeshes())
    for (const p of mesh.listPrimitives())
      n += (p.getIndices()?.getCount() ?? p.getAttribute("POSITION").getCount()) / 3;
  return n;
};
const from = count();
if (from > TRIS)
  await doc.transform(
    simplify({ simplifier: MeshoptSimplifier, ratio: TRIS / from, error: 0.02, lockBorder: true }),
  );
await doc.transform(
  textureCompress({ encoder: sharp, targetFormat: "webp", resize: [512, 512], quality: 82 }),
  prune(),
  dedup(),
);
const size = getBounds(scene);
// The crown's opening: vertices within a band just above the brim (the hatband), whose box the
// head goes into. The brim is the widest part at the bottom; the band starts 18–30 % up.
const H = size.max[1] - size.min[1];
const lo = size.min[1] + H * 0.18,
  hi = size.min[1] + H * 0.3;
const band = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
for (const mesh of root.listMeshes())
  for (const p of mesh.listPrimitives()) {
    const pos = p.getAttribute("POSITION"),
      v = [0, 0, 0];
    for (let i = 0; i < pos.getCount(); i++) {
      pos.getElement(i, v);
      if (v[1] < lo || v[1] > hi) continue;
      band.minX = Math.min(band.minX, v[0]);
      band.maxX = Math.max(band.maxX, v[0]);
      band.minZ = Math.min(band.minZ, v[2]);
      band.maxZ = Math.max(band.maxZ, v[2]);
    }
  }
const r4 = (v) => +v.toFixed(4);
const fit = {
  min: size.min.map(r4),
  max: size.max.map(r4),
  crown: Object.fromEntries(Object.entries(band).map(([k, v]) => [k, r4(v)])),
};
const top = doc.createNode("hat").setExtras({ fit });
for (const child of scene.listChildren()) top.addChild(child);
scene.addChild(top);
await doc.transform(prune({ keepLeaves: true }), dedup(), meshopt({ encoder: MeshoptEncoder }));
const buffer = root.listBuffers()[0];
for (const a of root.listAccessors()) a.setBuffer(buffer);
for (const x of root.listBuffers()) if (x !== buffer) x.dispose();
await io.write(out, doc);
fs.writeFileSync(
  path.join(path.dirname(out), "ATTRIBUTION-hat.md"),
  `# Officer's hat (hat.glb)\n\n- \`hat\`: "Classic Detective hat" by 5XCISSORS (https://sketchfab.com/3d-models/classic-detective-hat-a94c274ffd944818ab9dffb2018299b3), Sketchfab Standard licence (https://sketchfab.com/licenses). Simplified, reoriented, textures resized, fitted to the officer.\n`,
);
console.log(JSON.stringify({ trisFrom: from, tris: count(), fit }, null, 1));
console.log("wrote", out, fs.statSync(out).size, "bytes");
