/**
 * Collision boxes for the processed Project Island models, shared by the server room and the
 * client prediction (axis-aligned boxes in model space, metres, pivot bottom centre).
 *
 *   node art/blender/br/build_collision.mjs        (run from the repo root, after process_assets)
 *
 * Mode per kit asset (`collision` in art/br/assets/kit.json; default by class):
 *  - "voxel" (buildings, structures, aircraft): the LOD0 surface is voxelised at VOXEL metres (or
 *    the asset's own `voxel`: a 100 m crag at 0.3 m would be tens of thousands of boxes) and
 *    greedily merged into boxes, so doorways, rooms, roofs and stairs openings stay walkable;
 *  - "solid": one box around the whole model (crates, containers, barriers: hard cover);
 *  - "none": no collision (trolleys, parachutes);
 *  - "boxes": authored boxes from art/br/procedural/<id>.boxes.json (procedural models).
 * Writes public/fps/br/models/collision.json: { voxel, models: { id: [[x0,y0,z0,x1,y1,z1], …] } }.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";

/** 0.3 m: stairs voxelise into risers below the 0.35 m step height, so they stay climbable. */
const VOXEL = 0.3;
const DEFAULT_VOXEL = VOXEL;
/** Coarser voxels per class: rocks need their rough shape, not stair precision. */
const CLASS_VOXEL = { rock: 0.8 };
const DEFAULT_MODE = {
  hero: "voxel",
  building: "voxel",
  aircraft: "voxel",
  structure: "voxel",
  prop: "solid",
  small: "solid",
  vehicle: "solid",
  tree: "none",
  rock: "voxel",
  bush: "none",
};
const REPO = process.cwd();
const kit = JSON.parse(fs.readFileSync("art/br/assets/kit.json", "utf8"));
const manifest = JSON.parse(fs.readFileSync("public/fps/br/models/models.json", "utf8"));
await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder });

/** World-space triangles of a GLB (node transforms applied; the pipeline bakes them anyway). */
export async function triangles(file) {
  const doc = await io.read(file);
  const out = [];
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const m = node.getWorldMatrix();
    const tf = (v) => [
      m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12],
      m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13],
      m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14],
    ];
    for (const p of mesh.listPrimitives()) {
      if (p.getMode() !== 4) continue;
      // Transparent glass still blocks movement and bullets (windows are walls).
      const pos = p.getAttribute("POSITION");
      const idx = p.getIndices();
      const n = idx ? idx.getCount() : pos.getCount();
      const v = [0, 0, 0];
      for (let i = 0; i < n; i += 3) {
        const tri = [];
        for (let k = 0; k < 3; k++)
          tri.push(tf(pos.getElement(idx ? idx.getScalar(i + k) : i + k, v).slice()));
        out.push(tri);
      }
    }
  }
  return out;
}

export function voxelBoxes(tris, size, VOXEL = DEFAULT_VOXEL) {
  const min = [Infinity, Infinity, Infinity],
    max = [-Infinity, -Infinity, -Infinity];
  for (const t of tris)
    for (const p of t)
      for (let k = 0; k < 3; k++) {
        min[k] = Math.min(min[k], p[k]);
        max[k] = Math.max(max[k], p[k]);
      }
  const dims = [0, 1, 2].map((k) => Math.max(1, Math.ceil((max[k] - min[k]) / VOXEL) + 1));
  const [nx, ny, nz] = dims;
  const grid = new Uint8Array(nx * ny * nz);
  const id = (x, y, z) => (y * nz + z) * nx + x;
  const mark = (p) => {
    const x = Math.min(nx - 1, Math.floor((p[0] - min[0]) / VOXEL)),
      y = Math.min(ny - 1, Math.floor((p[1] - min[1]) / VOXEL)),
      z = Math.min(nz - 1, Math.floor((p[2] - min[2]) / VOXEL));
    grid[id(x, y, z)] = 1;
  };
  // Surface sampling at a third of a voxel: every voxel a triangle passes through is marked.
  const step = VOXEL / 3;
  for (const [a, b, c] of tris) {
    const ab = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]),
      ac = Math.hypot(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
    const nu = Math.max(1, Math.ceil(ab / step)),
      nv = Math.max(1, Math.ceil(ac / step));
    for (let i = 0; i <= nu; i++)
      for (let j = 0; j <= nv - (i * nv) / nu; j++) {
        const u = i / nu,
          w = j / nv;
        if (u + w > 1.0001) continue;
        mark([0, 1, 2].map((k) => a[k] + (b[k] - a[k]) * u + (c[k] - a[k]) * w));
      }
  }
  // Greedy merge: grow each box along x, then z, then y over filled, unused voxels.
  const used = new Uint8Array(grid.length);
  const boxes = [];
  for (let y = 0; y < ny; y++)
    for (let z = 0; z < nz; z++)
      for (let x = 0; x < nx; x++) {
        if (!grid[id(x, y, z)] || used[id(x, y, z)]) continue;
        let x1 = x;
        while (x1 + 1 < nx && grid[id(x1 + 1, y, z)] && !used[id(x1 + 1, y, z)]) x1++;
        const rowFree = (zz, yy) => {
          for (let xx = x; xx <= x1; xx++)
            if (!grid[id(xx, yy, zz)] || used[id(xx, yy, zz)]) return false;
          return true;
        };
        let z1 = z;
        while (z1 + 1 < nz && rowFree(z1 + 1, y)) z1++;
        const layerFree = (yy) => {
          for (let zz = z; zz <= z1; zz++) if (!rowFree(zz, yy)) return false;
          return true;
        };
        let y1 = y;
        while (y1 + 1 < ny && layerFree(y1 + 1)) y1++;
        for (let yy = y; yy <= y1; yy++)
          for (let zz = z; zz <= z1; zz++)
            for (let xx = x; xx <= x1; xx++) used[id(xx, yy, zz)] = 1;
        boxes.push(
          [x, y, z, x1 + 1, y1 + 1, z1 + 1].map((v, k) => +(min[k % 3] + v * VOXEL).toFixed(3)),
        );
      }
  // Clamp to the model's real bounds (voxels overhang by up to one voxel).
  for (const b of boxes)
    for (let k = 0; k < 3; k++) {
      b[k] = Math.max(b[k], +min[k].toFixed(3));
      b[k + 3] = Math.min(b[k + 3], +max[k].toFixed(3));
    }
  return boxes;
}

export async function buildCollision() {
  const out = { voxel: VOXEL, models: {} };
  for (const a of kit.assets) {
    const m = manifest.models[a.id];
    if (!m) throw new Error(`${a.id} not processed`);
    const mode = a.collision ?? DEFAULT_MODE[a.class];
    if (mode === "none") {
      out.models[a.id] = [];
      continue;
    }
    if (mode === "boxes") {
      // Authored boxes (procedural models write their exact collision next to their geometry).
      out.models[a.id] = JSON.parse(
        fs.readFileSync(`art/br/procedural/${a.id}.boxes.json`, "utf8"),
      );
      console.log(`${a.id.padEnd(18)} boxes  ${out.models[a.id].length} boxes`);
      continue;
    }
    const tris = await triangles(path.join(REPO, "public", m.lods[0].file));
    if (mode === "solid") {
      const min = [Infinity, Infinity, Infinity],
        max = [-Infinity, -Infinity, -Infinity];
      for (const t of tris)
        for (const p of t)
          for (let k = 0; k < 3; k++) {
            min[k] = Math.min(min[k], p[k]);
            max[k] = Math.max(max[k], p[k]);
          }
      out.models[a.id] = [[...min, ...max].map((v) => +v.toFixed(3))];
    } else
      // Ground-level slabs and kerbs under 0.35 m are dropped: the player walks on the pad itself
      // (voxelised floors would otherwise be a 0.3 m ledge at every doorway).
      out.models[a.id] = voxelBoxes(
        tris,
        undefined,
        a.voxel ?? CLASS_VOXEL[a.class] ?? VOXEL,
      ).filter((b) => b[4] > 0.35);
    console.log(`${a.id.padEnd(18)} ${mode.padEnd(6)} ${out.models[a.id].length} boxes`);
  }
  fs.writeFileSync("public/fps/br/models/collision.json", JSON.stringify(out));
  console.log(
    `collision.json ${(fs.statSync("public/fps/br/models/collision.json").size / 1024).toFixed(0)} kB`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await buildCollision();
