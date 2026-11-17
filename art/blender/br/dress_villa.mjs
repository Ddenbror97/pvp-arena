/**
 * The pool villa's interior dressed (owner, 2026-11-16: "fix the villas. issues inside the
 * building incorrectly built and add color/floor design"). access-v14 (art/br/fitout/estates.py)
 * fitted its rooms with flat boxes: one plaster colour for every wall, a plain floor colour,
 * and the download's own floor (a dark brown slab at 1.58–1.60 m) left in the same plane as
 * the fitted floor, which z-fought as dark lines and patches across every room. Its ceilings'
 * faces turned down rendered near black, and the stair was the walls' grey.
 *
 * On the current LOD0 and LOD1 (render only: collision is unchanged):
 *  - the download's floor faces under the fitted floors go;
 *  - the fitted floors: light stone tiles downstairs, oak planks upstairs (textured, LOD0);
 *  - the walls (faces turned into a room only): painted, a colour per room (sand, sage, clay,
 *    a soft blue, warm white);
 *  - the ceilings: painted white, lit as if facing up (as textured-kit.mjs does indoors);
 *  - the stair: oak.
 * Writes pool-villa.dress-v1.lod{0,1}.glb and points both manifests at them.
 *
 *   node art/blender/br/dress_villa.mjs [--dry]      (run from the repo root)
 */
import fs from "node:fs";
import path from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dequantize, meshopt, prune, unweld, weld } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import sharp from "sharp";
import { modelFile } from "./model-files.mjs";

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });
const dry = process.argv.includes("--dry");
const ID = "pool-villa";
const TAG = "dress-v1";
const dir = "public/fps/br/models";
const MANIFESTS = ["models.locations-v1.json", "models.json"];
const TEX = "art/br/blackwater/tex";

// estates.py's numbers (model-local metres): floors 1.58 / 5.07, ceilings 4.55 / 7.9.
const F0 = 1.58,
  F1 = 5.07,
  C0 = 4.55,
  C1 = 7.9;
/** Rooms: x0, x1, z0, z1, floor, ceiling, wall tint (linear). */
const ROOMS = [
  // Ground: the west wing (sage), the living room (sand), the north-east block (clay).
  [-10.8, -6.6, -7.2, 6.95, F0, C0, [0.62, 0.66, 0.55]],
  [-6.6, 8.1, 0.05, 5.9, F0, C0, [0.86, 0.78, 0.64]],
  [3.7, 8.1, -7.7, 0.05, F0, C0, [0.8, 0.6, 0.5]],
  // Upstairs: the west wing (soft blue), the bridge (warm white), the east wing (sage).
  [-10.9, -6.7, -6.4, 7.3, F1, C1, [0.62, 0.68, 0.76]],
  [-6.7, 2.0, -0.4, 4.4, F1, C1, [0.9, 0.87, 0.8]],
  [2.0, 6.4, -7.5, 7.3, F1, C1, [0.64, 0.68, 0.58]],
];
const STAIR = [-8.4, -7.2, -5.5, 1.0];
const PAD = 0.45;
/** Materials: texture, metres per tile, roughness, colour (multiplies the texture). */
const MATS = {
  tiles: { tex: "tiles", tile: 1.6, rough: 0.6, color: [0.95, 0.93, 0.88] },
  oak: { tex: "wood", tile: 2.0, rough: 0.7, color: [0.92, 0.78, 0.62] },
  // Painted plaster: colour alone (the kit's "plaster" set is a sandstone brick).
  paint: { tex: null, tile: 2.4, rough: 0.92, color: [1, 1, 1] },
};
const WHITE = [0.93, 0.92, 0.89];

const inRoom = (x, z, room, pad = PAD) =>
  x > room[0] - pad && x < room[1] + pad && z > room[2] - pad && z < room[3] + pad;
/**
 * A wall face turned into its room: it stands inside the room's rectangle (not the house's
 * outer faces just beyond it) and faces the room's middle more than away from it.
 */
const inward = (room, n, cx, cz) => {
  if (!inRoom(cx, cz, room, 0.2)) return false;
  const mx = (room[0] + room[1]) / 2 - cx,
    mz = (room[2] + room[3]) / 2 - cz;
  // Towards the nearer wall's inside: the face's normal along the room's shorter offset.
  const dx = Math.min(cx - room[0], room[1] - cx),
    dz = Math.min(cz - room[2], room[3] - cz);
  return dx < dz ? n[0] * Math.sign(mx) > 0 : n[2] * Math.sign(mz) > 0;
};
const lum = (c) => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];

async function texture(doc, cache, name, px) {
  if (!cache.has(name)) {
    const bytes = await sharp(fs.readFileSync(`${TEX}/${name}.jpg`))
      .resize(px, px)
      .jpeg({ quality: 82 })
      .toBuffer();
    cache.set(name, doc.createTexture(name).setImage(bytes).setMimeType("image/jpeg"));
  }
  return cache.get(name);
}

async function dress(doc, level) {
  await doc.transform(dequantize(), unweld());
  const root = doc.getRoot();
  const stats = { dropped: 0, floors: 0, walls: 0, ceilings: 0, stair: 0 };
  const cache = new Map();
  /** Per material: positions, normals, uvs, colours (in the flat primitive's node space). */
  const out = { tiles: [], oak: [], paint: [] };
  let host = null;
  for (const node of root.listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const M = node.getWorldMatrix();
    if ([1, 2, 4, 6, 8, 9].some((i) => Math.abs(M[i]) > 1e-9))
      throw new Error(`${node.getName()}: rotation in the node transform`);
    const S = [M[0], M[5], M[10]],
      O = [M[12], M[13], M[14]];
    for (const prim of mesh.listPrimitives()) {
      const colour = prim.getAttribute("COLOR_0");
      if (!colour) continue; // the download's textured parts stay as they are
      host ??= { node, mesh, prim, S, O };
      const pos = prim.getAttribute("POSITION");
      const nor = prim.getAttribute("NORMAL");
      const idx =
        prim.getIndices()?.getArray() ?? Uint32Array.from({ length: pos.getCount() }, (_, i) => i);
      const keep = [];
      for (let t = 0; t < idx.length; t += 3) {
        const I = [idx[t], idx[t + 1], idx[t + 2]];
        const L = I.map((i) => pos.getElement(i, []));
        const P = L.map((p) => p.map((v, k) => v * S[k] + O[k]));
        const c = colour.getElement(I[0], []).slice(0, 3);
        const ys = P.map((p) => p[1]);
        const lo = Math.min(...ys),
          hi = Math.max(...ys);
        const u = [0, 1, 2].map((k) => P[1][k] - P[0][k]),
          w = [0, 1, 2].map((k) => P[2][k] - P[0][k]);
        const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
        const nl = Math.hypot(...n) || 1;
        const ny = n[1] / nl;
        const cx = (P[0][0] + P[1][0] + P[2][0]) / 3,
          cz = (P[0][2] + P[1][2] + P[2][2]) / 3;
        const room = ROOMS.find((r) => inRoom(cx, cz, r) && lo > r[4] - 0.25 && hi < r[5] + 0.45);
        // Windows, glazing and dark trim keep their colours.
        if (!room || lum(c) < 0.1) {
          keep.push(...I);
          continue;
        }
        const flat = hi - lo < 0.03;
        const floorY = room[4];
        // The download's floor in the fitted floor's plane (its dark brown, 1.58–1.60 / 5.07).
        if (flat && ny > 0.9 && Math.abs(lo - floorY) < 0.04 && lum(c) < 0.3) {
          stats.dropped++;
          continue;
        }
        const stair =
          cx > STAIR[0] - 0.05 &&
          cx < STAIR[1] + 0.05 &&
          cz > STAIR[2] - 0.05 &&
          cz < STAIR[3] + 0.05 &&
          lo >= F0 - 0.05 &&
          hi <= F1 + 0.05;
        let mat, tint, up;
        if (stair) {
          mat = "oak";
          tint = MATS.oak.color;
          stats.stair++;
        } else if (flat && ny > 0.9 && Math.abs(hi - floorY) < 0.06) {
          mat = floorY === F0 ? "tiles" : "oak";
          tint = MATS[mat].color;
          stats.floors++;
        } else if (flat && ny < -0.9) {
          mat = "paint";
          tint = WHITE;
          up = true; // a ceiling: lit as if it faced up (faces turned down render near black)
          stats.ceilings++;
        } else if (Math.abs(ny) < 0.3 && inward(room, n, cx, cz)) {
          mat = "paint";
          tint = room[6];
          stats.walls++;
        } else {
          keep.push(...I);
          continue;
        }
        const g = out[mat];
        const tile = MATS[mat].tile;
        for (let k = 0; k < 3; k++) {
          const p = P[k];
          const pn = nor ? nor.getElement(I[k], []) : [n[0] / nl, n[1] / nl, n[2] / nl];
          // Box-projected world UVs: floors and ceilings in x/z, walls along their run.
          const uv =
            Math.abs(ny) > 0.7
              ? [p[0] / tile, p[2] / tile]
              : Math.abs(n[0]) > Math.abs(n[2])
                ? [p[2] / tile, p[1] / tile]
                : [p[0] / tile, p[1] / tile];
          g.push({ p: L[k], n: up ? [0, 1, 0] : pn, uv, c: tint });
        }
      }
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
  if (!host) throw new Error("no vertex-coloured primitive");
  const buffer = root.listBuffers()[0];
  for (const [name, verts] of Object.entries(out)) {
    if (!verts.length) continue;
    const spec = MATS[name];
    const material = doc
      .createMaterial(`${ID}-${name}`)
      .setBaseColorFactor([1, 1, 1, 1])
      .setRoughnessFactor(spec.rough)
      .setMetallicFactor(0);
    // The textures on LOD0; LOD1 (from 35 m, through windows) takes the colours alone.
    if (level === 0 && spec.tex)
      material.setBaseColorTexture(await texture(doc, cache, spec.tex, 512));
    const acc = (type, data) =>
      doc.createAccessor().setType(type).setArray(new Float32Array(data)).setBuffer(buffer);
    const prim = doc
      .createPrimitive()
      .setMaterial(material)
      .setAttribute(
        "POSITION",
        acc(
          "VEC3",
          verts.flatMap((v) => v.p),
        ),
      )
      .setAttribute(
        "NORMAL",
        acc(
          "VEC3",
          verts.flatMap((v) => v.n),
        ),
      )
      .setAttribute(
        "COLOR_0",
        acc(
          "VEC3",
          verts.flatMap((v) => v.c),
        ),
      );
    if (level === 0 && spec.tex)
      prim.setAttribute(
        "TEXCOORD_0",
        acc(
          "VEC2",
          verts.flatMap((v) => v.uv),
        ),
      );
    host.mesh.addPrimitive(prim);
  }
  return stats;
}

const manifests = MANIFESTS.map((f) => [f, JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"))]);
const live = manifests[0][1].models[ID];
const done = new Map();
for (const level of [0, 1]) {
  const src = live.lods[level].file;
  const doc = await io.read(modelFile(src));
  const stats = await dress(doc, level);
  const outFile = `/fps/br/models/${ID}.${TAG}.lod${level}.glb`;
  console.log(`${ID} LOD${level} (${path.basename(src)}): ${JSON.stringify(stats)} → ${outFile}`);
  if (dry) continue;
  await doc.transform(weld(), prune(), meshopt({ encoder: MeshoptEncoder, level: "medium" }));
  await io.write(path.join("public", outFile), doc);
  done.set(src, outFile);
}
if (!dry) {
  for (const [file, manifest] of manifests) {
    for (const lod of manifest.models[ID].lods) {
      const outFile = done.get(lod.file);
      if (!outFile) continue;
      const d = await io.read(path.join("public", outFile));
      const prims = d
        .getRoot()
        .listMeshes()
        .flatMap((m) => m.listPrimitives());
      Object.assign(lod, {
        file: outFile,
        tris: prims.reduce((s, p) => s + p.getIndices().getCount() / 3, 0),
        draws: prims.length,
        kB: Math.round(fs.statSync(path.join("public", outFile)).size / 1024),
      });
    }
    fs.writeFileSync(
      path.join(dir, file),
      file === "models.json" ? JSON.stringify(manifest, null, 1) + "\n" : JSON.stringify(manifest),
    );
  }
}
