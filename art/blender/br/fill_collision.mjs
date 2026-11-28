#!/usr/bin/env node
/**
 * Bullet fill (owner, 2026-11-23: "audit all objects in the world, to make walls/threes/rocks/
 * objects bulletproof so people cant hax thro"). Shots stop at the collision boxes, the ground
 * and the trees' trunks (static-world.ts raycast); whatever is drawn but has no box under it is
 * shot through. This finds, per model, the opaque surface of its near LOD that no
 * collision box covers, voxelises it and adds those voxels as boxes.
 *
 *   node art/blender/br/fill_collision.mjs --public=<dir> --models=<manifest> \
 *     --collision=<collision> --ids=a,b,… [--voxel=0.25] [--cover=0.5] [--cap=<m>] [--radius=<m>]
 *     [--out=<file>] [--merge=<fill.json>] [--panes=<window-panes.json>]
 *
 * Writes (or adds to) a fill file: { [id]: { [fp]: boxes } }, `fp` the fingerprint of the
 * model's own boxes the fill was made against and `boxes` encodeBoxes' text (collision-fill.ts
 * uses the variant whose fingerprint matches the boxes it finds, so a model whose collision
 * changes later gets no stale fill). The fill stops shots and sight only (static-world.ts).
 *
 * Left out: glass and anything see-through (blend or alpha-tested materials, and materials
 * named glass, window, pane, water, leaves, foliage, grass, curtain, net, rope, cable, wire,
 * fence, decal), the ground (voxels whose top is under 5 cm), the doorways (a metre round each
 * authored entrance, up to 2.3 m over its sill), the windows' breakable panes' openings
 * (window-panes.json: a broken pane is an opening, its muntins and frame no cover; 2026-11-27)
 * and whatever has a box beside it at its own height within `--cover` (0.2 m): a level shot
 * stops there or within 20 cm behind the surface anyway, and thickening a wall that has its box
 * would narrow its doors and stairs.
 */
import fs from "node:fs";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";
import { boxesFingerprint, encodeBoxes } from "./collision-fingerprint.mjs";

const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const PUB = arg("public", "public");
const models = JSON.parse(fs.readFileSync(arg("models"), "utf8")).models;
const collision = JSON.parse(fs.readFileSync(arg("collision"), "utf8"));
const ids = arg("ids", "").split(",").filter(Boolean);
const VOXEL = +arg("voxel", "0.25");
/** A surface within this of a box is covered (a shot stops at most this far behind it). */
const COVER = +arg("cover", "0.2");
/** Nothing above this (m; a tree's trunk, not its crown). */
const CAP = +arg("cap", "Infinity");
/** Nothing further than this from the model's vertical axis (m; a trunk under a low crown). */
const RADIUS = +arg("radius", "Infinity");
const OUT = arg("out", "src/lib/fps/br/collision-fill.json");
/** Model-space panes, [x0, x1, z0, z1, y0, y1] (glass_panes.mjs). */
const PANES = JSON.parse(
  fs.readFileSync(arg("panes", "src/lib/fps/br/window-panes.json"), "utf8"),
).models;
const fill = fs.existsSync(arg("merge", OUT))
  ? JSON.parse(fs.readFileSync(arg("merge", OUT), "utf8"))
  : {};

await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder });

const SEE_THROUGH =
  /glass|window|pane|water|leaf|leaves|foliage|grass|curtain|net\b|rope|cable|wire|fence|decal|shadow/i;

async function solidTriangles(file) {
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
      const mat = p.getMaterial();
      if (mat && mat.getAlphaMode() !== "OPAQUE") continue;
      if (SEE_THROUGH.test(mat?.getName() ?? "")) continue;
      const pos = p.getAttribute("POSITION");
      const idx = p.getIndices();
      const n = idx ? idx.getCount() : pos.getCount();
      for (let i = 0; i < n; i += 3) {
        const tri = [];
        for (let k = 0; k < 3; k++)
          tri.push(tf(pos.getElement(idx ? idx.getScalar(i + k) : i + k, [])));
        out.push(tri);
      }
    }
  }
  return out;
}

function fillBoxes(tris, boxes, entrances, panes) {
  const min = [Infinity, Infinity, Infinity],
    max = [-Infinity, -Infinity, -Infinity];
  for (const t of tris)
    for (const p of t)
      for (let k = 0; k < 3; k++) {
        min[k] = Math.min(min[k], p[k]);
        max[k] = Math.max(max[k], p[k]);
      }
  const [nx, ny, nz] = [0, 1, 2].map((k) => Math.max(1, Math.ceil((max[k] - min[k]) / VOXEL) + 1));
  const grid = new Uint8Array(nx * ny * nz);
  const id = (x, y, z) => (y * nz + z) * nx + x;
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
        const q = [0, 1, 2].map((k) => a[k] + (b[k] - a[k]) * u + (c[k] - a[k]) * w);
        const x = Math.min(nx - 1, Math.floor((q[0] - min[0]) / VOXEL)),
          y = Math.min(ny - 1, Math.floor((q[1] - min[1]) / VOXEL)),
          z = Math.min(nz - 1, Math.floor((q[2] - min[2]) / VOXEL));
        grid[id(x, y, z)] = 1;
      }
  }
  // Clear what is covered, under the ground, or in a doorway. Up and down, a voxel holding a box's
  // own top or bottom face (a floor, a ceiling under its slab) is covered wherever the grid falls:
  // its centre is up to half a voxel off that face (the rebuilt towns' ceilings, 2026-11-27, were
  // filled storey by storey).
  const VTOL = Math.max(0.05, VOXEL / 2 + 0.01);
  const inside = (cx, cy, cz) =>
    boxes.some(
      (b) =>
        cx > b[0] - COVER &&
        cx < b[3] + COVER &&
        cy > b[1] - VTOL &&
        cy < b[4] + VTOL &&
        cz > b[2] - COVER &&
        cz < b[5] + COVER,
    );
  const doorway = (cx, cy, cz) =>
    entrances.some((e) => Math.hypot(cx - e.x, cz - e.z) < 1 && cy > e.y0 - 0.3 && cy < e.y0 + 2.3);
  // A pane's opening: its rectangle, through the wall's depth either side of the glass.
  const pane = (cx, cy, cz) =>
    panes.some((p) => {
      const thinX = p[1] - p[0] < p[3] - p[2];
      const [gx, gz] = thinX ? [0.2, 0] : [0, 0.2];
      return (
        cx > p[0] - gx &&
        cx < p[1] + gx &&
        cz > p[2] - gz &&
        cz < p[3] + gz &&
        cy > p[4] &&
        cy < p[5]
      );
    });
  let kept = 0;
  for (let y = 0; y < ny; y++)
    for (let z = 0; z < nz; z++)
      for (let x = 0; x < nx; x++) {
        const i = id(x, y, z);
        if (!grid[i]) continue;
        const cx = min[0] + (x + 0.5) * VOXEL,
          cy = min[1] + (y + 0.5) * VOXEL,
          cz = min[2] + (z + 0.5) * VOXEL;
        if (
          min[1] + (y + 1) * VOXEL < 0.05 ||
          min[1] + y * VOXEL > CAP ||
          Math.hypot(cx, cz) > RADIUS ||
          inside(cx, cy, cz) ||
          doorway(cx, cy, cz) ||
          pane(cx, cy, cz)
        )
          grid[i] = 0;
        else kept++;
      }
  // Greedy merge as build_collision.mjs does.
  const used = new Uint8Array(grid.length);
  const out = [];
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
        const b = [x, y, z, x1 + 1, y1 + 1, z1 + 1].map((v, k) => min[k % 3] + v * VOXEL);
        for (let k = 0; k < 3; k++) {
          b[k] = Math.max(b[k], min[k]);
          b[k + 3] = Math.min(b[k + 3], max[k]);
        }
        // A voxel straddling the bounds can clamp to nothing (or inside out): no box then.
        if (b[3] - b[0] < 0.02 || b[4] - b[1] < 0.02 || b[5] - b[2] < 0.02) continue;
        out.push(b.map((v) => +v.toFixed(3)));
      }
  return { boxes: out, voxels: kept };
}

for (const mid of ids) {
  const e = models[mid];
  if (!e) {
    console.warn(`${mid}: not in the manifest`);
    continue;
  }
  const own = collision.models[mid] ?? [];
  const tris = await solidTriangles(`${PUB}${e.lods[0].file}`);
  const { boxes, voxels } = fillBoxes(
    tris,
    own,
    collision.entrances?.[mid] ?? [],
    PANES[mid] ?? [],
  );
  const fp = boxesFingerprint(own);
  const list = { ...fill[mid] };
  delete list[fp];
  if (boxes.length) list[fp] = encodeBoxes(boxes);
  if (Object.keys(list).length) fill[mid] = list;
  else delete fill[mid];
  console.log(
    `${mid}: ${own.length} boxes, ${voxels} uncovered voxels → ${boxes.length} fill boxes`,
  );
}
fs.writeFileSync(OUT, JSON.stringify(fill));
