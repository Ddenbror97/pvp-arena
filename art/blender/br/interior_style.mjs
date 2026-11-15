/**
 * Interiors that differ from house to house (owner, 2026-11-15: "audit all buildings that dont
 * have any color/design inside the house? example colors on the walls and wood on the floor?
 * many houses looks the same in the interior"). Prepares a revision's near LODs for the props
 * renderer's interior style (interior-style.ts), which paints each placement's rooms its own
 * way (wall colour, a floor of planks, tiles or carpet, light ceilings) from where it stands:
 *
 *  - the downloads' building-access surfaces (materials "Interior walls and ceiling" and
 *    "Access floor and steps", repair_building_access.mjs) are kept as they are, their ceilings
 *    turned to face up for the light (a downward face indoors renders near black);
 *  - the vertex-coloured procedural buildings (procedural-kit.mjs: bungalow, townhouse,
 *    apartment, police station, strip mall) are split: the partitions (the kit's `inner`
 *    colour) and the inside faces of the outer walls (facing the middle, below the parapets)
 *    become "Interior walls and ceiling", the floors (`floor`, facing up) "Access floor and
 *    steps"; every downward face is lit as a ceiling.
 *
 *   node art/blender/br/interior_style.mjs <models.<rev>.json> <tag> id,id,…
 *
 * Writes public/fps/br/models/<id>.<tag>.lod0.glb and points the manifest's LOD0 at it.
 */
import fs from "node:fs";
import path from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dequantize, meshopt, weld } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";

const WALLS = "Interior walls and ceiling";
const FLOORS = "Access floor and steps";
const dir = "public/fps/br/models";
const [manifestName, tag, list] = process.argv.slice(2);
if (!list) throw new Error("usage: interior_style.mjs <models.<rev>.json> <tag> <ids>");
const manifestPath = path.join(dir, manifestName);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  "meshopt.decoder": MeshoptDecoder,
  "meshopt.encoder": MeshoptEncoder,
});
// procedural-kit.mjs COLOURS.inner and .floor (8-bit vertex colours).
const INNER = [0.84, 0.81, 0.75],
  FLOOR = [0.5, 0.38, 0.27];
const near = (c, k) =>
  Math.abs(c[0] - k[0]) < 0.012 && Math.abs(c[1] - k[1]) < 0.012 && Math.abs(c[2] - k[2]) < 0.012;

for (const id of list.split(",").filter(Boolean)) {
  const entry = manifest.models[id];
  if (!entry) throw new Error(`${id}: not in ${manifestName}`);
  const src = `public${entry.lods[0].file}`;
  const doc = await io.read(src);
  await doc.transform(dequantize());
  const root = doc.getRoot();
  let split = 0,
    lit = 0;
  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const mat = prim.getMaterial();
      const name = mat?.getName() ?? "";
      const pos = prim.getAttribute("POSITION"),
        nrm = prim.getAttribute("NORMAL"),
        col = prim.getAttribute("COLOR_0");
      if (!pos || !nrm) continue;
      const idx = prim.getIndices();
      const count = idx ? idx.getCount() : pos.getCount();
      const at = (i) => (idx ? idx.getScalar(i) : i);
      if (name === WALLS || name === FLOORS) {
        // Ceilings face up for the light.
        const v = [];
        for (let i = 0; i < nrm.getCount(); i++) {
          nrm.getElement(i, v);
          if (v[1] < -0.7) {
            nrm.setElement(i, [-v[0], -v[1], -v[2]]);
            lit++;
          }
        }
        continue;
      }
      if (!col || mat?.getBaseColorTexture()) continue;
      // A vertex-coloured procedural shell: sort its triangles.
      const bbMin = [Infinity, Infinity, Infinity],
        bbMax = [-Infinity, -Infinity, -Infinity];
      const p = [],
        n = [],
        c = [];
      for (let i = 0; i < pos.getCount(); i++) {
        pos.getElement(i, p);
        for (let k = 0; k < 3; k++) {
          bbMin[k] = Math.min(bbMin[k], p[k]);
          bbMax[k] = Math.max(bbMax[k], p[k]);
        }
      }
      const cx = (bbMin[0] + bbMax[0]) / 2,
        cz = (bbMin[2] + bbMax[2]) / 2;
      const groups = { shell: [], walls: [], floors: [] };
      for (let t = 0; t < count; t += 3) {
        const vs = [at(t), at(t + 1), at(t + 2)];
        const P = vs.map((i) => pos.getElement(i, []));
        const N = nrm.getElement(vs[0], []);
        const C = col.getElement(vs[0], []);
        const ctr = [0, 1, 2].map((k) => (P[0][k] + P[1][k] + P[2][k]) / 3);
        const vertical = Math.abs(N[1]) < 0.3;
        const towardMiddle = N[0] * (cx - ctr[0]) + N[2] * (cz - ctr[2]) > 0;
        const lowEnough = Math.max(P[0][1], P[1][1], P[2][1]) < bbMax[1] - 1.2;
        let g = "shell";
        if (near(C, INNER)) g = "walls";
        else if (near(C, FLOOR) && N[1] > 0.7) g = "floors";
        // The inside face of an outer wall: vertical, facing the middle, below the parapets,
        // not glass (dark) and not a 2 cm sliver.
        else if (vertical && towardMiddle && lowEnough && C[0] + C[1] + C[2] > 1.0) {
          const span = Math.max(
            ...[0, 2].map(
              (k) => Math.max(P[0][k], P[1][k], P[2][k]) - Math.min(P[0][k], P[1][k], P[2][k]),
            ),
          );
          if (span > 0.4) g = "walls";
        }
        groups[g].push(...vs);
      }
      if (!groups.walls.length && !groups.floors.length) continue;
      // Rebuild: the shell keeps the primitive (its indices), the rest get their own.
      const attrs = prim.listSemantics();
      const make = (tris, material, recolour) => {
        const out = doc.createPrimitive().setMaterial(material);
        for (const sem of attrs) {
          const a = prim.getAttribute(sem);
          const size = a.getElementSize();
          const arr = new Float32Array(tris.length * size);
          const e = [];
          tris.forEach((vi, j) => {
            a.getElement(vi, e);
            for (let k = 0; k < size; k++) arr[j * size + k] = e[k];
            if (sem === "COLOR_0" && recolour)
              for (let k = 0; k < 3; k++) arr[j * size + k] = recolour[k];
            if (sem === "NORMAL" && arr[j * size + 1] < -0.7)
              for (let k = 0; k < 3; k++) arr[j * size + k] = -arr[j * size + k];
          });
          out.setAttribute(
            sem,
            doc.createAccessor().setType(a.getType()).setArray(arr).setBuffer(pos.getBuffer()),
          );
        }
        return out;
      };
      const wallMat = doc
        .createMaterial(WALLS)
        .setBaseColorFactor([1, 1, 1, 1])
        .setRoughnessFactor(0.92)
        .setMetallicFactor(0);
      const floorMat = doc
        .createMaterial(FLOORS)
        .setBaseColorFactor([1, 1, 1, 1])
        .setRoughnessFactor(0.8)
        .setMetallicFactor(0);
      const shell = make(groups.shell, mat, null);
      if (groups.walls.length) mesh.addPrimitive(make(groups.walls, wallMat, [0.95, 0.94, 0.9]));
      if (groups.floors.length) mesh.addPrimitive(make(groups.floors, floorMat, [1, 1, 1]));
      mesh.addPrimitive(shell);
      mesh.removePrimitive(prim);
      prim.dispose();
      split += groups.walls.length / 3 + groups.floors.length / 3;
    }
  }
  await doc.transform(weld(), meshopt({ encoder: MeshoptEncoder, level: "medium" }));
  const file = `${id}.${tag}.lod0.glb`;
  await io.write(path.join(dir, file), doc);
  entry.lods[0] = {
    ...entry.lods[0],
    file: `/fps/br/models/${file}`,
    draws: root.listMeshes().reduce((s, m) => s + m.listPrimitives().length, 0),
    kB: Math.round(fs.statSync(path.join(dir, file)).size / 1024),
  };
  console.log(`${id}: ${split} triangles to the interior, ${lit} ceiling normals turned up`);
}
fs.writeFileSync(
  manifestPath,
  JSON.stringify(manifest, null, manifestName === "models.json" ? 1 : 0) +
    (manifestName === "models.json" ? "\n" : ""),
);
