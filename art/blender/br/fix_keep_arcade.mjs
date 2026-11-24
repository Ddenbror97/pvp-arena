/**
 * Blackwater keep: the courtyard arcade's stacked boxes no longer overlap (owner, 2026-11-16:
 * "flicker in the arena", red lines along every gallery floor of the keep's courtyard).
 *
 * build_blackwater.mjs drew each floor's arch heads and piers up to the next floor's top plus
 * the slab (y1 + SLAB), and the next floor's parapet and piers from that floor's top (y0): the
 * two overlapped by 0.35 m with the same courtyard and gallery faces, and the floor slab's own
 * edge (brown) lay in the arch heads' courtyard face. Seen along the courtyard (a grazing view)
 * the coplanar faces traded places every frame: a dark stripe along each floor (the 1.5 cm lift
 * of offset_coplanar.mjs is not enough at that angle).
 *
 * Here, on the published LODs (the build script now draws it this way too):
 *  - the upper parapets and piers (and the roof's courtyard parapet) start at y0 + SLAB, on top
 *    of the arch heads, not inside them; their bottoms (hidden) go;
 *  - the floor and roof slabs' courtyard edges (hidden behind the arch heads) go.
 * Only faces in the arcade's ring (the courtyard's edge to the arcade's back) are touched.
 * Collision is unchanged (the parapets' tops and the arch heads stay where they were).
 *
 *   node art/blender/br/fix_keep_arcade.mjs [--dry]      (run from the repo root)
 *
 * Writes bw-keep.arcade-v1.lod{0,1}.glb from the manifest's current LOD0/LOD1 and points both
 * manifests at them.
 */
import fs from "node:fs";
import path from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dequantize, meshopt, prune, unweld, weld } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import { editedManifests, modelFile } from "./model-files.mjs";

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });
const dry = process.argv.includes("--dry");
const ID = "bw-keep";
const TAG = "arcade-v1";
const dir = "public/fps/br/models";
const MANIFESTS = editedManifests();

// build_blackwater.mjs's numbers.
const HL = 27.5,
  RA = 16.3,
  RC = 15.5;
const FLOORS = [4.6, 9.2, 13.8];
const ROOF = 18.4,
  SLAB = 0.35;
const TOL = 0.03;
const near = (a, b) => Math.abs(a - b) < TOL;
/** Distance from the keep's long axis (straight sides) or from an end's centre (rounded ends). */
const radial = (x, z) => (Math.abs(x) <= HL ? Math.abs(z) : Math.hypot(Math.abs(x) - HL, z));
const inRing = (P) => P.every(([x, , z]) => radial(x, z) > RC - 0.2 && radial(x, z) < RA + 0.2);

/** Upper parapet / pier / roof parapet: [bottom, top] spans whose bottom moves up by SLAB. */
const RAISE = [
  ...FLOORS.map((y) => [y, y + 1.05]),
  ...FLOORS.map((y, k) => [y, (FLOORS[k + 1] ?? ROOF) + SLAB]),
  [ROOF, ROOF + 1.1],
];

function patch(doc) {
  const stats = { raised: 0, bottoms: 0, edges: 0 };
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    // The node's transform is the quantisation's scale and offset (no rotation): positions are
    // read into model space through it and written back through its inverse.
    const M = node.getWorldMatrix();
    if ([1, 2, 4, 6, 8, 9].some((i) => Math.abs(M[i]) > 1e-9))
      throw new Error(`${node.getName()}: unexpected rotation in the node transform`);
    const S = [M[0], M[5], M[10]],
      O = [M[12], M[13], M[14]];
    for (const prim of mesh.listPrimitives()) {
      const mat = prim.getMaterial()?.getName() ?? "";
      const stone = mat.endsWith("-stone");
      const slab = mat.endsWith("-floor") || mat.endsWith("-tiles");
      if (!stone && !slab) continue;
      const pos = prim.getAttribute("POSITION");
      const arr = pos.getArray();
      const idx =
        prim.getIndices()?.getArray() ?? Uint32Array.from(arr.keys()).slice(0, arr.length / 3);
      const keep = [];
      for (let t = 0; t < idx.length; t += 3) {
        const I = [idx[t], idx[t + 1], idx[t + 2]];
        const P = I.map((i) => [0, 1, 2].map((k) => arr[i * 3 + k] * S[k] + O[k]));
        const ys = P.map((p) => p[1]);
        const lo = Math.min(...ys),
          hi = Math.max(...ys);
        const u = [0, 1, 2].map((k) => P[1][k] - P[0][k]),
          w = [0, 1, 2].map((k) => P[2][k] - P[0][k]);
        const ny = u[2] * w[0] - u[0] * w[2];
        const flat = hi - lo < TOL;
        if (!inRing(P)) {
          keep.push(...I);
          continue;
        }
        if (slab) {
          // A slab's courtyard edge: vertical, from a floor's (or the roof's) top down SLAB.
          const edge =
            !flat &&
            [...FLOORS, ROOF].some((y) => near(hi, y) && near(lo, y - SLAB)) &&
            P.every(([x, , z]) => near(radial(x, z), RC));
          if (edge) stats.edges++;
          else keep.push(...I);
          continue;
        }
        // A parapet's or an upper pier's bottom (facing down): hidden once it sits on the arch.
        if (flat && ny < 0 && RAISE.some(([y0]) => near(lo, y0))) {
          stats.bottoms++;
          continue;
        }
        const span = !flat && RAISE.find(([y0, y1]) => near(lo, y0) && near(hi, y1));
        if (span) {
          for (const i of I)
            if (near(arr[i * 3 + 1] * S[1] + O[1], span[0]))
              arr[i * 3 + 1] = (span[0] + SLAB - O[1]) / S[1];
          stats.raised++;
        }
        keep.push(...I);
      }
      pos.setArray(arr);
      if (keep.length !== idx.length)
        prim.setIndices(
          doc
            .createAccessor()
            .setType("SCALAR")
            .setArray(new Uint32Array(keep))
            .setBuffer(pos.getBuffer()),
        );
    }
  }
  return stats;
}

const manifests = MANIFESTS.map((f) => [f, JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"))]);
const live = manifests[0][1].models[ID];
const done = new Map();
for (const level of [0, 1]) {
  const src = live.lods[level].file;
  const doc = await io.read(modelFile(src));
  // Every triangle its own vertices first, so moving a parapet's corner moves nothing else.
  await doc.transform(dequantize(), unweld());
  const stats = patch(doc);
  const out = `/fps/br/models/${ID}.${TAG}.lod${level}.glb`;
  console.log(
    `${ID} LOD${level} (${path.basename(src)}): ${stats.raised} faces raised, ${stats.bottoms} bottoms and ${stats.edges} slab edges dropped → ${out}`,
  );
  if (dry) continue;
  await doc.transform(weld(), prune(), meshopt({ encoder: MeshoptEncoder, level: "medium" }));
  await io.write(path.join("public", out), doc);
  done.set(src, out);
}
if (!dry) {
  for (const [file, manifest] of manifests) {
    for (const lod of manifest.models[ID].lods) {
      const out = done.get(lod.file);
      if (!out) continue;
      const tris = (await io.read(path.join("public", out)))
        .getRoot()
        .listMeshes()
        .flatMap((m) => m.listPrimitives())
        .reduce((s, p) => s + p.getIndices().getCount() / 3, 0);
      Object.assign(lod, {
        file: out,
        tris,
        kB: Math.round(fs.statSync(path.join("public", out)).size / 1024),
      });
    }
    fs.writeFileSync(
      path.join(dir, file),
      file === "models.json" ? JSON.stringify(manifest, null, 1) + "\n" : JSON.stringify(manifest),
    );
  }
}
