/**
 * Walls carried down into the ground (owner, 2026-11-25, Blackwater Prison: "a building looks
 * like to stand abit in the air"). The cell houses' downloaded shell (prison-block) starts
 * 0.2 m above its origin: the fit-out's floors sit at 0.06 m, and the shell's plinth band, walls
 * and portals end at y 0.20–0.23, so a light strip of the yard showed under the whole building.
 *
 * Every near-vertical triangle whose bottom edge lies in [FROM_LO, FROM_HI] gets a quad under
 * that edge down to TO (below the ground), in the same material, its texture continued (the
 * UVs extrapolated from the triangle's own mapping), normals and colours copied. Nothing is
 * moved or removed; collision is unchanged (render only). Writes `<id>.<tag>.lod<N>.glb` for
 * the near LODs and points the live and base manifests at them.
 *
 * `--lift-ground=<m>` instead lifts the up-facing faces lying in the model's ground plane
 * (|y| < 5 mm) by that much: the Blackwater chapel's door sill and the wood strip under its
 * door lay exactly in the yard's plane and fought it for the depth test (owner: the door
 * "flickers"). Only those faces move.
 *
 *   node art/blender/br/extend_footing.mjs <tag> id[,id…] [fromLo fromHi to]
 *   node art/blender/br/extend_footing.mjs <tag> id[,id…] --lift-ground=0.015
 *
 * `--band=ylo,yhi,toLo,toHi,x0,x1,z0,z1` copies the near-vertical faces lying in [ylo, yhi]
 * whose middle is in the box (model space) to [toLo, toHi] (near LOD only): the pool villa's
 * stair well, where the fit-out's ground-floor ceiling (4.55–4.70) and upper floor (4.87–5.07)
 * left a 17 cm slit round the well, open to the house's own shell and the outside beyond it
 * (owner, 2026-11-25: "the luxery mansion building is incorrect built inside", seen climbing
 * the stair). The ceiling's oak edge is copied up over the slit.
 *
 *   node art/blender/br/extend_footing.mjs <tag> id --band=4.55,4.7,4.69,4.88,-8.5,-7.1,-4.7,1.1
 *
 * `--cut=x0,x1,z0,z1,ylo,yhi` cuts the rectangle out of every horizontal face in [ylo, yhi]
 * (model space; the near LODs): the towers' lift shaft through the lobby's floor and tower B's
 * pool deck. Those floors ran on across the shaft 0–3 cm under the cab's floor at its stop, so
 * the building's floor fought the cab's and showed through it as the cab came in to the lobby
 * or the top (owner, 2026-11-25: "ett golv åker igenom hissen när man kommer upp till högsta
 * våningen eller när man åker ner och ska gå ut"). What is left of a face keeps its mapping
 * (attributes interpolated across the original triangle); collision is unchanged.
 *
 *   node art/blender/br/extend_footing.mjs <tag> condo-lobby --cut=1.4,4.2,-10.4,-7.6,-0.05,0.4
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
const LIFT = +(process.argv.find((a) => a.startsWith("--lift-ground="))?.slice(14) ?? 0);
const CUT = process.argv
  .find((a) => a.startsWith("--cut="))
  ?.slice(6)
  .split(",")
  .map(Number);
const BAND = process.argv
  .find((a) => a.startsWith("--band="))
  ?.slice(7)
  .split(",")
  .map(Number);
const [tag, list, lo = "0.15", hi = "0.26", to = "-0.12"] = process.argv
  .slice(2)
  .filter((a) => !a.startsWith("--"));
if (!list) throw new Error("usage: extend_footing.mjs <tag> id[,id…] [fromLo fromHi to]");
const FROM_LO = +lo,
  FROM_HI = +hi,
  TO = +to;
const dir = "public/fps/br/models";

const apply = (M, p) =>
  [0, 1, 2].map((r) => M[r] * p[0] + M[4 + r] * p[1] + M[8 + r] * p[2] + M[12 + r]);
/** Inverse of an affine 4×4 (column-major) applied to a point. */
function inverseApply(M, p) {
  const a = [
    [M[0], M[4], M[8]],
    [M[1], M[5], M[9]],
    [M[2], M[6], M[10]],
  ];
  const d = [p[0] - M[12], p[1] - M[13], p[2] - M[14]];
  const det =
    a[0][0] * (a[1][1] * a[2][2] - a[1][2] * a[2][1]) -
    a[0][1] * (a[1][0] * a[2][2] - a[1][2] * a[2][0]) +
    a[0][2] * (a[1][0] * a[2][1] - a[1][1] * a[2][0]);
  const inv = [
    [
      (a[1][1] * a[2][2] - a[1][2] * a[2][1]) / det,
      (a[0][2] * a[2][1] - a[0][1] * a[2][2]) / det,
      (a[0][1] * a[1][2] - a[0][2] * a[1][1]) / det,
    ],
    [
      (a[1][2] * a[2][0] - a[1][0] * a[2][2]) / det,
      (a[0][0] * a[2][2] - a[0][2] * a[2][0]) / det,
      (a[0][2] * a[1][0] - a[0][0] * a[1][2]) / det,
    ],
    [
      (a[1][0] * a[2][1] - a[1][1] * a[2][0]) / det,
      (a[0][1] * a[2][0] - a[0][0] * a[2][1]) / det,
      (a[0][0] * a[1][1] - a[0][1] * a[1][0]) / det,
    ],
  ];
  return inv.map((row) => row[0] * d[0] + row[1] * d[1] + row[2] * d[2]);
}
const sub = (a, b) => a.map((x, i) => x - b[i]);
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

async function patch(id, src, out) {
  const doc = await io.read(modelFile(src));
  await doc.transform(dequantize(), unweld());
  let added = 0,
    delta = 0;
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const M = node.getWorldMatrix();
    for (const prim of mesh.listPrimitives()) {
      if (prim.getIndices()) throw new Error(`${id}: indexed after unweld`);
      const sems = prim.listSemantics();
      const attrs = Object.fromEntries(sems.map((s) => [s, prim.getAttribute(s)]));
      const pos = attrs.POSITION;
      const n = pos.getCount();
      const extra = Object.fromEntries(sems.map((s) => [s, []]));
      const get = (s, i) => attrs[s].getElement(i, []);
      if (CUT) {
        const [x0, x1, z0, z1, ylo, yhi] = CUT;
        const keep = Object.fromEntries(sems.map((s) => [s, []]));
        // The four regions round the rectangle, each the intersection of half-planes
        // (a·x + b·z <= c), whose union is everything outside it.
        const regions = [
          [[1, 0, x0]],
          [[-1, 0, -x1]],
          [
            [-1, 0, -x0],
            [1, 0, x1],
            [0, 1, z0],
          ],
          [
            [-1, 0, -x0],
            [1, 0, x1],
            [0, -1, -z1],
          ],
        ];
        for (let t = 0; t < n; t += 3) {
          const W = [0, 1, 2].map((k) => apply(M, get("POSITION", t + k)));
          const g = cross(sub(W[1], W[0]), sub(W[2], W[0]));
          const len = Math.hypot(...g);
          const flat =
            len > 1e-9 && Math.abs(g[1] / len) > 0.95 && W.every((p) => p[1] >= ylo && p[1] <= yhi);
          const overlaps =
            flat &&
            Math.max(...W.map((p) => p[0])) > x0 + 1e-4 &&
            Math.min(...W.map((p) => p[0])) < x1 - 1e-4 &&
            Math.max(...W.map((p) => p[2])) > z0 + 1e-4 &&
            Math.min(...W.map((p) => p[2])) < z1 - 1e-4;
          if (!overlaps) {
            for (let k = 0; k < 3; k++) for (const sem of sems) keep[sem].push(...get(sem, t + k));
            continue;
          }
          // Barycentrics in the xz plane, to carry the attributes over.
          const [A, B, C] = W;
          const den = (B[2] - C[2]) * (A[0] - C[0]) + (C[0] - B[0]) * (A[2] - C[2]);
          const bary = (x, z) => {
            const w0 = ((B[2] - C[2]) * (x - C[0]) + (C[0] - B[0]) * (z - C[2])) / den,
              w1 = ((C[2] - A[2]) * (x - C[0]) + (A[0] - C[0]) * (z - C[2])) / den;
            return [w0, w1, 1 - w0 - w1];
          };
          const attrAt = (sem, w) => {
            const a = get(sem, t),
              b = get(sem, t + 1),
              c = get(sem, t + 2);
            return a.map((_, q) => a[q] * w[0] + b[q] * w[1] + c[q] * w[2]);
          };
          const clip = (poly, [a, b, c]) => {
            const out = [];
            for (let i = 0; i < poly.length; i++) {
              const P = poly[i],
                Q = poly[(i + 1) % poly.length];
              const dp = a * P[0] + b * P[2] - c,
                dq = a * Q[0] + b * Q[2] - c;
              if (dp <= 0) out.push(P);
              if (dp < 0 !== dq < 0 && dp !== dq) {
                const u = dp / (dp - dq);
                out.push(P.map((v, q) => v + (Q[q] - v) * u));
              }
            }
            return out;
          };
          for (const region of regions) {
            let poly = W.map((p) => [...p]);
            for (const h of region) poly = clip(poly, h);
            if (poly.length < 3) continue;
            for (let i = 1; i + 1 < poly.length; i++) {
              const tri = [poly[0], poly[i], poly[i + 1]];
              const a2 = cross(sub(tri[1], tri[0]), sub(tri[2], tri[0]));
              if (Math.hypot(...a2) < 1e-8) continue;
              for (const P of tri) {
                const w = bary(P[0], P[2]);
                for (const sem of sems)
                  keep[sem].push(...(sem === "POSITION" ? inverseApply(M, P) : attrAt(sem, w)));
              }
            }
          }
          added++;
        }
        delta += keep.POSITION.length / 9 - n / 3;
        for (const sem of sems) {
          const Arr = attrs[sem].getArray().constructor;
          attrs[sem].setArray(new Arr(keep[sem]));
        }
        continue;
      }
      if (BAND) {
        const [ylo, yhi, toLo, toHi, x0, x1, z0, z1] = BAND;
        const extra = Object.fromEntries(sems.map((s) => [s, []]));
        for (let t = 0; t < n; t += 3) {
          const L = [0, 1, 2].map((k) => get("POSITION", t + k));
          const W = L.map((p) => apply(M, p));
          if (!W.every((p) => p[1] >= ylo - 0.005 && p[1] <= yhi + 0.005)) continue;
          const cx = (W[0][0] + W[1][0] + W[2][0]) / 3,
            cz = (W[0][2] + W[1][2] + W[2][2]) / 3;
          if (cx < x0 || cx > x1 || cz < z0 || cz > z1) continue;
          const g = cross(sub(W[1], W[0]), sub(W[2], W[0]));
          const len = Math.hypot(...g);
          if (len < 1e-8 || Math.abs(g[1] / len) > 0.2) continue;
          for (let k = 0; k < 3; k++)
            for (const sem of sems) {
              if (sem !== "POSITION") {
                extra[sem].push(...get(sem, t + k));
                continue;
              }
              const P = W[k];
              const y = toLo + ((P[1] - ylo) / (yhi - ylo)) * (toHi - toLo);
              extra[sem].push(...inverseApply(M, [P[0], y, P[2]]));
            }
          added++;
        }
        if (extra.POSITION.length)
          for (const sem of sems) {
            const acc = attrs[sem];
            const Arr = acc.getArray().constructor;
            acc.setArray(new Arr([...Array.from(acc.getArray()), ...extra[sem]]));
          }
        continue;
      }
      if (LIFT) {
        const arr = pos.getArray();
        for (let t = 0; t < n; t += 3) {
          const W = [0, 1, 2].map((k) => apply(M, get("POSITION", t + k)));
          if (!W.every((p) => Math.abs(p[1]) < 0.005)) continue;
          const g = cross(sub(W[1], W[0]), sub(W[2], W[0]));
          if (g[1] <= 0) continue; // facing down
          for (let k = 0; k < 3; k++)
            arr.set(inverseApply(M, [W[k][0], W[k][1] + LIFT, W[k][2]]), (t + k) * 3);
          added++;
        }
        pos.setArray(arr);
        continue;
      }
      for (let t = 0; t < n; t += 3) {
        const L = [0, 1, 2].map((k) => get("POSITION", t + k));
        const W = L.map((p) => apply(M, p));
        const g = cross(sub(W[1], W[0]), sub(W[2], W[0]));
        const len = Math.hypot(...g);
        if (len < 1e-8 || Math.abs(g[1] / len) > 0.2) continue; // not a wall
        const bottom = [0, 1, 2].filter((k) => W[k][1] >= FROM_LO && W[k][1] <= FROM_HI);
        if (bottom.length !== 2) continue;
        const [i, j] = bottom;
        const k = 3 - i - j;
        if (W[k][1] < Math.max(W[i][1], W[j][1]) + 0.05) continue; // the edge is not the bottom
        if (Math.abs(W[i][1] - W[j][1]) > 0.04) continue; // a sloped edge
        // The triangle's affine map: a point P = W0 + s·e1 + u·e2 ↦ attribute A0 + s·dA1 + u·dA2.
        const e1 = sub(W[1], W[0]),
          e2 = sub(W[2], W[0]);
        const d11 = dot(e1, e1),
          d12 = dot(e1, e2),
          d22 = dot(e2, e2),
          den = d11 * d22 - d12 * d12;
        const bary = (P) => {
          const d = sub(P, W[0]);
          const a = dot(d, e1),
            b = dot(d, e2);
          return [(d22 * a - d12 * b) / den, (d11 * b - d12 * a) / den];
        };
        const below = [i, j].map((q) => [W[q][0], TO, W[q][2]]);
        // The edge in the triangle's winding (a → b → k, k above it); the quad under it keeps
        // the same facing: (b, a, a below) and (b, a below, b below).
        const [a, b] = (j - i + 3) % 3 === 1 ? [i, j] : [j, i];
        const aBelow = below[[i, j].indexOf(a)],
          bBelow = below[[i, j].indexOf(b)];
        const verts = [
          [b, W[b]],
          [a, W[a]],
          [a, aBelow],
          [b, W[b]],
          [a, aBelow],
          [b, bBelow],
        ];
        for (const [src, P] of verts) {
          const [s, u] = bary(P);
          for (const sem of sems) {
            if (sem === "POSITION") extra[sem].push(...inverseApply(M, P));
            else if (sem.startsWith("TEXCOORD")) {
              const A0 = get(sem, t),
                A1 = get(sem, t + 1),
                A2 = get(sem, t + 2);
              extra[sem].push(...A0.map((x, q) => x + s * (A1[q] - x) + u * (A2[q] - x)));
            } else extra[sem].push(...get(sem, t + src));
          }
        }
        added += 2;
      }
      if (!extra.POSITION.length) continue;
      for (const sem of sems) {
        const acc = attrs[sem];
        const old = Array.from(acc.getArray());
        const Arr = acc.getArray().constructor;
        acc.setArray(new Arr([...old, ...extra[sem]]));
      }
    }
  }
  if (!added && CUT) return null;
  if (!added) throw new Error(`${id} ${src}: nothing to change`);
  await doc.transform(weld(), prune(), meshopt({ encoder: MeshoptEncoder, level: "medium" }));
  await io.write(path.join("public", out), doc);
  console.log(
    `${id}: ${added} ${CUT ? "faces cut" : BAND ? "band faces copied" : LIFT ? "ground faces lifted" : "footing triangles"} → ${out}`,
  );
  return CUT ? delta : added;
}

const manifests = editedManifests().map((f) => [
  f,
  JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")),
]);
const done = new Map();
for (const id of list.split(",").filter(Boolean)) {
  const model = manifests[0][1].models[id];
  if (!model) throw new Error(`${id}: not in ${manifests[0][0]}`);
  for (const level of BAND ? [0] : [0, 1]) {
    if (CUT && !model.lods[level]) continue;
    const src = model.lods[level].file;
    const out = `/fps/br/models/${id}.${tag}.lod${level}.glb`;
    const added = await patch(id, src, out);
    if (added !== null) done.set(src, { out, added });
  }
}
for (const [file, manifest] of manifests) {
  for (const model of Object.values(manifest.models))
    model.lods = model.lods.map((lod) => {
      const d = done.get(lod.file);
      if (!d) return lod;
      return {
        ...lod,
        file: d.out,
        tris: lod.tris + (LIFT ? 0 : d.added),
        kB: Math.round(fs.statSync(path.join("public", d.out)).size / 1024),
      };
    });
  fs.writeFileSync(
    path.join(dir, file),
    file === "models.json" ? JSON.stringify(manifest, null, 1) + "\n" : JSON.stringify(manifest),
  );
}
