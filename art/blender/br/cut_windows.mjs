/**
 * Windows for the buildings that had none (owner, 2026-11-23: "Add glass windows to
 * apartments/buildings who does not have any windows at all … they should have the breaking
 * window ones with the sound").
 *
 *   node art/blender/br/cut_windows.mjs <from-revision> <revision> [--only=a,b] [--dry]
 *
 * For each model in WINDOWS, on each side and storey, the plain stretches of wall are found by
 * looking in at the near LOD (a 10 cm grid of rays): a flat outer face, its inner face a wall's
 * thickness behind it and a room behind that, with nothing in front and no opening, door or
 * trim near, and plain on the texture (the model's elevations: --el, from
 * scripts/br/elevations/capture.mjs). Windows go along each stretch at an even spacing. Where
 * a model's windows were only painted on its texture (dark rectangles on the elevations), the
 * painted window is made real instead. Each is cut through the wall
 * (every primitive, UVs interpolated: mesh-cut.mjs), lined (reveals), framed, given a sill
 * outside, and glazed with a breakable pane (window-panes.json, as glass_panes.mjs lists the
 * glass it took out of the near LODs); the wall's collision is opened where the glass stands,
 * so a broken window is an opening.
 *
 * Only the near LOD changes (the panes are drawn with it); the middle and far LODs keep their
 * plain walls.
 */
import fs from "node:fs";
import path from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  clearNodeTransform,
  dequantize,
  flatten,
  meshopt,
  prune,
  weld,
} from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import sharp from "sharp";
import { cutPrimitive } from "./mesh-cut.mjs";
import { modelFile } from "./model-files.mjs";

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  "meshopt.decoder": MeshoptDecoder,
  "meshopt.encoder": MeshoptEncoder,
});

const [from, revision] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const dry = process.argv.includes("--dry");
const only = process.argv
  .find((a) => a.startsWith("--only="))
  ?.slice(7)
  .split(",");
const dir = "public/fps/br/models";
const manifest = JSON.parse(fs.readFileSync(path.join(dir, `models.${from}.json`), "utf8"));
const collision = JSON.parse(fs.readFileSync(path.join(dir, `collision.${from}.json`), "utf8"));
const panesFile = "src/lib/fps/br/window-panes.json";
// The models' elevations (scripts/br/elevations/capture.mjs, of the from-revision): the
// textures' painted windows, and where a wall is plain.
const elDir = process.argv.find((a) => a.startsWith("--el="))?.slice(5);
if (!elDir) throw new Error("--el=<elevations dir> is required");
const windowPanes = JSON.parse(fs.readFileSync(panesFile, "utf8"));

/**
 * The buildings with no window anywhere (the window audit: no glass, no opening; the
 * elevations: blank walls), with their windows' size (m) and spacing (centre to centre).
 * `sides` limits the sides looked at (front +z, back −z, left −x, right +x).
 */
const WINDOWS = {
  // The brick corner shops: a shop front on one end, blank brick walls; the white one's
  // windows were only painted on.
  "rural-store-1": { w: 1.1, h: 1.3, sill: 1.0, every: 3.2 },
  "rural-store-3": { painted: true },
  "rural-store-5": { w: 1.1, h: 1.3, sill: 1.0, every: 3.2 },
  // The two-storey brick shop's painted windows.
  "brick-shop": { painted: true },
  // The farm garage: small side windows.
  garage: { w: 0.8, h: 0.7, sill: 1.3, every: 3.0, sides: ["left", "right", "back"] },
  // The quonset's end walls; the long shed's strip windows.
  "rural-quonset": { painted: true, w: 0.9, h: 0.9, sill: 1.2, every: 2.6 },
  warehouse: { w: 1.6, h: 0.8, sill: 1.4, every: 4.0 },
  // The painted windows the dark-rectangle test cannot see, read off the elevations
  // (2026-11-23, owner: "fix not done yet"): the clapboard house's shuttered sashes…
  house: {
    rects: {
      front: [
        [-4.95, -4.25, 3.25, 4.42],
        [-3.23, -2.56, 3.25, 4.42],
        [-1.77, -1.14, 3.25, 4.42],
        [-0.39, 0.36, 3.25, 4.42],
        [1.36, 2.03, 3.25, 4.42],
        [-4.95, -4.31, 1.32, 2.18],
        [-3.25, -2.59, 1.45, 2.18],
        [-0.39, 0.3, 1.45, 2.18],
        [1.33, 1.99, 1.32, 2.18],
      ],
      back: [
        [1.09, 1.69, 3.25, 4.4],
        [-0.75, -0.14, 3.25, 4.4],
        [-2.75, -2.14, 3.25, 4.4],
        [-4.64, -4.03, 3.25, 4.4],
        [1.09, 1.8, 1.05, 2.17],
        [-0.73, -0.12, 1.05, 2.17],
        [-2.75, -2.12, 1.05, 2.17],
        [-4.58, -3.97, 1.05, 2.17],
        [3.15, 5.75, 1.25, 2.85],
      ],
      left: [[-2.12, -1.73, 3.28, 4.37]],
      right: [[-1.1, -0.49, 3.57, 4.67]],
    },
  },
  // …the stone farmhouse's…
  "rural-house": {
    rects: {
      front: [
        [-1.86, -1.29, 1.47, 2.41],
        [1.32, 1.85, 2.05, 2.78],
      ],
      back: [
        [1.27, 1.83, 2.05, 2.78],
        [-1.89, -1.28, 1.47, 2.47],
      ],
      left: [
        [-1.99, -1.24, 1.44, 2.53],
        [0.98, 1.7, 1.46, 2.47],
      ],
      right: [
        [0.98, 1.72, 1.44, 2.53],
        [-2.0, -1.22, 1.44, 2.53],
      ],
    },
  },
  // …the mobile home's (and its two boarded-up ones)…
  "rural-mobile-home": {
    rects: {
      front: [
        [-2.29, -1.63, 1.53, 2.56],
        [-0.01, 0.62, 1.53, 2.56],
      ],
      back: [
        [-0.03, 0.61, 1.53, 2.56],
        [-2.33, -1.67, 1.53, 2.56],
      ],
      left: [
        [1.39, 2.13, 1.42, 2.53],
        [3.65, 4.39, 1.42, 2.53],
      ],
      right: [
        [3.66, 4.35, 1.45, 2.5],
        [1.41, 2.07, 1.45, 2.5],
        [-1.28, -0.6, 1.45, 2.5],
      ],
    },
  },
  // …the stilt house's sashes…
  "rural-wood-1": {
    rects: {
      front: [
        [-4.89, -4.06, 3.92, 4.99],
        [0.16, 0.99, 3.92, 4.99],
        [3.0, 3.83, 3.92, 4.99],
        [6.33, 7.1, 3.92, 4.99],
        [-0.34, 0.38, 7.72, 8.44],
      ],
      back: [
        [4.56, 5.42, 3.79, 4.99],
        [-0.44, 0.39, 3.79, 4.99],
        [-5.46, -4.63, 3.79, 4.99],
        [-0.38, 0.34, 7.72, 8.44],
      ],
      left: [
        [-4.64, -3.83, 3.79, 4.99],
        [1.03, 1.84, 3.79, 4.99],
      ],
      right: [
        [1.0, 1.88, 3.79, 4.99],
        [-4.67, -3.79, 3.79, 4.99],
      ],
    },
  },
  // …the bungalow's wide ones…
  "rural-wood-4": {
    rects: {
      front: [
        [-7.67, -5.7, 1.0, 2.45],
        [-4.0, -2.18, 1.0, 2.45],
        [2.16, 3.98, 1.0, 2.45],
        [5.69, 7.65, 1.0, 2.45],
      ],
      back: [
        [5.68, 7.67, 1.0, 2.43],
        [2.15, 4.17, 1.0, 2.43],
        [-4.18, -2.16, 1.0, 2.43],
        [-7.7, -5.69, 1.0, 2.43],
      ],
      left: [
        [-3.67, -1.68, 1.0, 2.46],
        [1.26, 3.2, 1.0, 2.46],
      ],
      right: [
        [1.28, 3.22, 0.96, 2.41],
        [-2.25, -1.0, 0.96, 2.41],
      ],
    },
  },
  // …and the diner's row (not the one with the air conditioner in it), with two new windows
  // on each of its blank ends.
  "rural-diner": {
    framed: ["left", "right"],
    rects: {
      front: [
        [-7.25, -6.13, 2.36, 3.34],
        [-5.84, -4.71, 2.36, 3.34],
        [-4.25, -3.13, 2.36, 3.34],
        [-2.84, -1.71, 2.36, 3.34],
        [1.83, 2.69, 2.36, 3.34],
        [3.08, 4.25, 2.36, 3.34],
        [4.75, 5.87, 2.36, 3.34],
      ],
      back: [
        [6.13, 7.25, 2.36, 3.3],
        [4.71, 5.84, 2.36, 3.3],
        [3.13, 4.25, 2.36, 3.3],
        [1.71, 2.84, 2.36, 3.3],
        [-4.25, -3.08, 2.36, 3.3],
        [-5.87, -4.75, 2.36, 3.3],
        [-7.32, -6.18, 2.36, 3.3],
      ],
      left: [
        [-2.4, -1.3, 2.35, 3.3],
        [0.6, 1.7, 2.35, 3.3],
      ],
      right: [
        [-2.4, -1.3, 2.35, 3.3],
        [0.6, 1.7, 2.35, 3.3],
      ],
    },
  },
};

/** Ray (origin o, unit dir d) against a triangle: distance or Infinity (both faces). */
function hit(o, d, P) {
  const [a, b, c] = P;
  const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]],
    e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const p = [d[1] * e2[2] - d[2] * e2[1], d[2] * e2[0] - d[0] * e2[2], d[0] * e2[1] - d[1] * e2[0]];
  const det = e1[0] * p[0] + e1[1] * p[1] + e1[2] * p[2];
  if (Math.abs(det) < 1e-12) return Infinity;
  const inv = 1 / det;
  const s = [o[0] - a[0], o[1] - a[1], o[2] - a[2]];
  const u = (s[0] * p[0] + s[1] * p[1] + s[2] * p[2]) * inv;
  if (u < -1e-6 || u > 1 + 1e-6) return Infinity;
  const q = [s[1] * e1[2] - s[2] * e1[1], s[2] * e1[0] - s[0] * e1[2], s[0] * e1[1] - s[1] * e1[0]];
  const w = (d[0] * q[0] + d[1] * q[1] + d[2] * q[2]) * inv;
  if (w < -1e-6 || u + w > 1 + 1e-6) return Infinity;
  const t = (e2[0] * q[0] + e2[1] * q[1] + e2[2] * q[2]) * inv;
  return t > 1e-4 ? t : Infinity;
}

/** The model-space triangles of a document (every node's world matrix applied). */
function trianglesOf(doc) {
  const out = [];
  let moved = false;
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const M = node.getWorldMatrix();
    if (M.some((v, i) => Math.abs(v - (i % 5 === 0 ? 1 : 0)) > 1e-6)) moved = true;
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute("POSITION");
      const idx = prim.getIndices();
      const n = idx ? idx.getCount() : pos.getCount();
      const v = [0, 0, 0];
      const at = (i) => {
        pos.getElement(idx ? idx.getScalar(i) : i, v);
        return [0, 1, 2].map((r) => M[r] * v[0] + M[4 + r] * v[1] + M[8 + r] * v[2] + M[12 + r]);
      };
      for (let t = 0; t + 2 < n; t += 3) {
        const P = [at(t), at(t + 1), at(t + 2)];
        const e1 = P[1].map((x, k) => x - P[0][k]),
          e2 = P[2].map((x, k) => x - P[0][k]);
        const nrm = [
          e1[1] * e2[2] - e1[2] * e2[1],
          e1[2] * e2[0] - e1[0] * e2[2],
          e1[0] * e2[1] - e1[1] * e2[0],
        ];
        const len = Math.hypot(...nrm);
        if (len < 1e-10) continue;
        out.push({ P, n: nrm.map((x) => x / len) });
      }
    }
  }
  return { tris: out, moved };
}

export function subtractBox(a, b) {
  if ([0, 1, 2].some((k) => a[k + 3] <= b[k] || a[k] >= b[k + 3])) return [a];
  const out = [],
    r = [...a];
  for (let k = 0; k < 3; k++) {
    if (r[k] < b[k]) {
      const q = [...r];
      q[k + 3] = b[k];
      out.push(q);
      r[k] = b[k];
    }
    if (r[k + 3] > b[k + 3]) {
      const q = [...r];
      q[k] = b[k + 3];
      out.push(q);
      r[k + 3] = b[k + 3];
    }
  }
  return out.filter((p) => [0, 1, 2].every((k) => p[k + 3] - p[k] > 1e-4));
}

/** Box (x0, y0, z0, x1, y1, z1) → triangles with outward normals (positions, normals). */
function boxTriangles(b, pos, nrm, skip = []) {
  const v = [
    [b[0], b[1], b[2]],
    [b[3], b[1], b[2]],
    [b[3], b[4], b[2]],
    [b[0], b[4], b[2]],
    [b[0], b[1], b[5]],
    [b[3], b[1], b[5]],
    [b[3], b[4], b[5]],
    [b[0], b[4], b[5]],
  ];
  const faces = [
    [
      [0, 3, 2, 1],
      [0, 0, -1],
    ],
    [
      [4, 5, 6, 7],
      [0, 0, 1],
    ],
    [
      [0, 1, 5, 4],
      [0, -1, 0],
    ],
    [
      [3, 7, 6, 2],
      [0, 1, 0],
    ],
    [
      [0, 4, 7, 3],
      [-1, 0, 0],
    ],
    [
      [1, 2, 6, 5],
      [1, 0, 0],
    ],
  ];
  faces.forEach(([q, n], i) => {
    if (skip.includes(i)) return;
    for (const t of [
      [q[0], q[1], q[2]],
      [q[0], q[2], q[3]],
    ])
      for (const k of t) {
        pos.push(...v[k]);
        nrm.push(...n);
      }
  });
}

/** A quad (four corners, counter-clockwise seen from its normal's side). */
function quad(c, n, pos, nrm) {
  for (const k of [0, 1, 2, 0, 2, 3]) {
    pos.push(...c[k]);
    nrm.push(...n);
  }
}

/**
 * One primitive (one draw) for parts of different colours: per-vertex colour (COLOR_0, as the
 * procedural buildings carry theirs) on a white material.
 */
function addMesh(doc, name, parts, roughness = 0.85) {
  const pos = [],
    nrm = [],
    col = [];
  for (const p of parts) {
    pos.push(...p.pos);
    nrm.push(...p.nrm);
    for (let i = 0; i < p.pos.length / 3; i++) col.push(...p.color);
  }
  if (!pos.length) return;
  const material = doc
    .createMaterial(name)
    .setBaseColorFactor([1, 1, 1, 1])
    // glTF's default metallic factor is 1: with no environment map that renders black.
    .setMetallicFactor(0)
    .setRoughnessFactor(roughness);
  const attr = (a) => doc.createAccessor().setType("VEC3").setArray(new Float32Array(a));
  const prim = doc
    .createPrimitive()
    .setAttribute("POSITION", attr(pos))
    .setAttribute("NORMAL", attr(nrm))
    .setAttribute("COLOR_0", attr(col))
    .setMaterial(material);
  doc
    .getRoot()
    .listScenes()[0]
    .addChild(doc.createNode(name).setMesh(doc.createMesh(name).addPrimitive(prim)));
}

/** Adds unindexed triangles (positions, normals) to a primitive (indexed or not). */
function appendTriangles(doc, prim, pos, nrm) {
  const P = prim.getAttribute("POSITION"),
    N = prim.getAttribute("NORMAL"),
    I = prim.getIndices();
  const n0 = P.getCount();
  const p = new Float32Array((n0 + pos.length / 3) * 3),
    q = new Float32Array((n0 + nrm.length / 3) * 3);
  p.set(P.getArray());
  p.set(pos, n0 * 3);
  q.set(N.getArray());
  q.set(nrm, n0 * 3);
  prim.setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(p));
  prim.setAttribute("NORMAL", doc.createAccessor().setType("VEC3").setArray(q));
  if (!I) return;
  const old = I.getArray();
  const idx = new Uint32Array(old.length + pos.length / 3);
  idx.set(old);
  for (let i = 0; i < pos.length / 3; i++) idx[old.length + i] = n0 + i;
  prim.setIndices(doc.createAccessor().setType("SCALAR").setArray(idx));
}

/** Triangles of a written model. */
function counts(doc) {
  const prims = doc
    .getRoot()
    .listMeshes()
    .flatMap((m) => m.listPrimitives());
  return { tris: prims.reduce((s, p) => s + p.getIndices().getCount() / 3, 0) };
}

/** A side's elevation: its painted windows (model space) and a test for plain wall. */
async function loadElevation(id, sideName, opts) {
  const darkness = typeof opts === "object" ? (opts.dark ?? 0.55) : 0.55,
    filled = typeof opts === "object" ? (opts.fill ?? 0.7) : 0.7;
  const meta = JSON.parse(fs.readFileSync(path.join(elDir, `${id}.json`), "utf8"));
  const { data, info } = await sharp(path.join(elDir, `${id}-${sideName}.png`))
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const W = info.width,
    H = info.height,
    px = meta.px;
  const [bx0, , bz0, bx1, by1, bz1] = meta.box;
  const [ua, ub] = sideName === "front" || sideName === "back" ? [bx0, bx1] : [bz0, bz1];
  // (Looking along −u from the back and the right: the image runs from u's high end.)
  const mirrored = sideName === "back" || sideName === "right";
  const lum = new Float32Array(W * H),
    wall = new Uint8Array(W * H);
  const values = [];
  for (let i = 0; i < W * H; i++) {
    const r = data[i * 3] / 255,
      g = data[i * 3 + 1] / 255,
      b = data[i * 3 + 2] / 255;
    lum[i] = (r + g + b) / 3;
    wall[i] = r > 0.95 && b > 0.95 && g < 0.05 ? 0 : 1; // the magenta background
    if (wall[i]) values.push(lum[i]);
  }
  values.sort((a, b) => a - b);
  const med = values[values.length >> 1] ?? 0.5;
  const col = (u) => (mirrored ? (ub - u) * px : (u - ua) * px);
  const row = (y) => (by1 - y) * px;
  const uOf = (c) => (mirrored ? ub - c / px : ua + c / px);
  /** Whether the wall's texture is plain over a rectangle (no feature, no gap). */
  const plain = (a0, a1, y0, y1) => {
    const c0 = Math.max(0, Math.floor(Math.min(col(a0), col(a1)))),
      c1 = Math.min(W, Math.ceil(Math.max(col(a0), col(a1)))),
      r0 = Math.max(0, Math.floor(row(y1))),
      r1 = Math.min(H, Math.ceil(row(y0)));
    if (c1 <= c0 || r1 <= r0) return false;
    let odd = 0;
    for (let r = r0; r < r1; r++)
      for (let c = c0; c < c1; c++) {
        const i = r * W + c;
        if (!wall[i] || Math.abs(lum[i] - med) > 0.35 * med) odd++;
      }
    return odd / ((r1 - r0) * (c1 - c0)) < 0.03;
  };
  // Dark rectangles: connected dark pixels (under 0.55 of the wall's median), mostly filling
  // their bounds; stacked parts of one window (a painted transom) joined.
  const dark = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) dark[i] = wall[i] && lum[i] < darkness * med ? 1 : 0;
  const seen = new Uint8Array(W * H);
  let rects = [];
  for (let i = 0; i < W * H; i++) {
    if (!dark[i] || seen[i]) continue;
    const stack = [i];
    seen[i] = 1;
    let n = 0,
      c0 = W,
      c1 = 0,
      r0 = H,
      r1 = 0;
    while (stack.length) {
      const k = stack.pop(),
        c = k % W,
        r = (k - c) / W;
      n++;
      c0 = Math.min(c0, c);
      c1 = Math.max(c1, c + 1);
      r0 = Math.min(r0, r);
      r1 = Math.max(r1, r + 1);
      for (const [dc, dr] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const cc = c + dc,
          rr = r + dr;
        if (cc < 0 || rr < 0 || cc >= W || rr >= H) continue;
        const j = rr * W + cc;
        if (dark[j] && !seen[j]) {
          seen[j] = 1;
          stack.push(j);
        }
      }
    }
    rects.push({ c0, c1, r0, r1, n });
  }
  rects = rects.filter((r) => r.n / ((r.c1 - r.c0) * (r.r1 - r.r0)) >= filled);
  for (let merged = true; merged;) {
    merged = false;
    for (const a of rects)
      for (const b of rects) {
        if (a === b || a.gone || b.gone) continue;
        const overlap = Math.min(a.c1, b.c1) - Math.max(a.c0, b.c0);
        const gap = Math.max(a.r0, b.r0) - Math.min(a.r1, b.r1);
        if (overlap < 0.8 * Math.max(a.c1 - a.c0, b.c1 - b.c0) || gap > 0.2 * px) continue;
        a.c0 = Math.min(a.c0, b.c0);
        a.c1 = Math.max(a.c1, b.c1);
        a.r0 = Math.min(a.r0, b.r0);
        a.r1 = Math.max(a.r1, b.r1);
        b.gone = merged = true;
      }
    rects = rects.filter((r) => !r.gone);
  }
  return {
    plain,
    dark: rects.map((r) => {
      const [p, q] = [uOf(r.c0), uOf(r.c1)];
      return {
        a0: +Math.min(p, q).toFixed(3),
        a1: +Math.max(p, q).toFixed(3),
        y0: +(by1 - r.r1 / px).toFixed(3),
        y1: +(by1 - r.r0 / px).toFixed(3),
      };
    }),
  };
}

const SIDES = [
  { name: "front", axis: 2, sign: -1, along: 0 },
  { name: "back", axis: 2, sign: 1, along: 0 },
  { name: "left", axis: 0, sign: 1, along: 2 },
  { name: "right", axis: 0, sign: -1, along: 2 },
];
const STEP = 0.1;

const report = [];
let files = 0;
for (const [id, spec] of Object.entries(WINDOWS)) {
  if (only && !only.includes(id)) continue;
  const entry = manifest.models[id];
  const lod = entry.lods[0];
  const doc = await io.read(modelFile(lod.file));
  await doc.transform(dequantize(), flatten());
  // Model space in the primitives themselves (the cuts are made there).
  for (const node of doc.getRoot().listNodes()) if (node.getMesh()) clearNodeTransform(node);
  const { tris, moved } = trianglesOf(doc);
  if (moved) {
    report.push(`${id}: skipped (its nodes are transformed)`);
    continue;
  }
  const box = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  for (const t of tris)
    for (const p of t.P)
      for (let k = 0; k < 3; k++) {
        box[k] = Math.min(box[k], p[k]);
        box[k + 3] = Math.max(box[k + 3], p[k]);
      }
  // Storeys: the ground and the tops of the model's slabs (collision boxes under 0.45 m thick
  // and 2 m across both ways), each with room for a storey above it.
  const levels = [];
  for (const c of collision.models[id] ?? [])
    if (c[4] - c[1] < 0.45 && c[3] - c[0] > 2 && c[5] - c[2] > 2) levels.push(c[4]);
  levels.push(0);
  levels.sort((a, b) => a - b);
  const storeys = [];
  for (const l of levels)
    if (!storeys.length || l - storeys.at(-1) > 2.2) storeys.push(l);
    else if (l < 0.6 && l > storeys.at(-1)) storeys[storeys.length - 1] = l; // the ground floor's top
  const windows = [];
  for (const side of SIDES) {
    if (spec.sides && !spec.sides.includes(side.name)) continue;
    const { axis, sign, along } = side;
    const outer = sign < 0 ? box[axis + 3] + 1 : box[axis] - 1;
    const d = [0, 0, 0];
    d[axis] = sign;
    // The triangles that face this way or its opposite (walls), binned along the side.
    const walls = tris.filter((t) => Math.abs(t.n[axis]) > 0.2);
    const u0 = box[along],
      u1 = box[along + 3];
    const BIN = 0.5;
    const nb = Math.ceil((u1 - u0) / BIN) + 1;
    const bins = Array.from({ length: nb }, () => []);
    walls.forEach((t) => {
      const us = t.P.map((p) => p[along]);
      const a = Math.max(0, Math.floor((Math.min(...us) - u0) / BIN)),
        b = Math.min(nb - 1, Math.floor((Math.max(...us) - u0) / BIN));
      for (let k = a; k <= b; k++) bins[k].push(t);
    });
    /** The hits looking in at (u, y): depths from the side's bounds, nearest first. */
    const probe = (u, y) => {
      const o = [0, y, 0];
      o[along] = u;
      o[axis] = outer;
      const hits = [];
      for (const t of bins[Math.min(nb - 1, Math.max(0, Math.floor((u - u0) / BIN)))] ?? []) {
        const s = hit(o, d, t.P);
        if (s < Infinity) hits.push({ t: s - 1, n: t.n });
      }
      hits.sort((a, b) => a.t - b.t);
      // Merge coincident hits (a shared edge, two faces on one plane).
      return hits.filter((h, i) => i === 0 || h.t - hits[i - 1].t > 0.01);
    };
    if (process.argv.includes("--probe"))
      for (const f of [0.25, 0.5, 0.75])
        console.log(
          id,
          side.name,
          f,
          JSON.stringify(
            probe(u0 + (u1 - u0) * f, storeys[0] + spec.sill + spec.h / 2).map((h) => [
              +h.t.toFixed(3),
              +h.n[axis].toFixed(2),
            ]),
          ),
        );
    /** The wall over a rectangle (and M round it): its outer and inner depths, or null. */
    let why = "";
    const fail = (u, y, h, r) => {
      why = `${r} at ${u.toFixed(2)},${y.toFixed(2)}: ${h
        .slice(0, 5)
        .map((x) => `${x.t.toFixed(3)}/${x.n[axis].toFixed(2)}`)
        .join(" ")}`;
      return null;
    };
    const wallAt = (a0, a1, y0, y1, M, maxD = 1) => {
      let outerD = null,
        innerD = null;
      for (let u = a0 - M; u <= a1 + M + 1e-6; u += STEP)
        for (let y = y0 - M; y <= y1 + M + 1e-6; y += STEP) {
          const h = probe(u, y);
          // A flat outer face within a metre of the bounds (or maxD), facing out…
          if (!h.length || h[0].t > maxD || Math.abs(h[0].n[axis]) < 0.97)
            return fail(u, y, h, "outer");
          // …its inner face a wall's thickness behind (or none: a single sheet)…
          const two = h.length > 1 && h[1].t - h[0].t <= 0.6 && Math.abs(h[1].n[axis]) > 0.97;
          const inner = two ? h[1] : h[0],
            rest = h[two ? 2 : 1];
          // …and a room behind it: the far side of the building, not within 0.8 m.
          if (!rest || rest.t - inner.t < 0.8) return fail(u, y, h, "room");
          outerD ??= h[0].t;
          innerD ??= inner.t;
          if (Math.abs(h[0].t - outerD) > 0.03 || Math.abs(inner.t - innerD) > 0.05)
            return fail(u, y, h, `flat (${outerD.toFixed(3)}/${innerD.toFixed(3)})`);
        }
      return { outerD, innerD };
    };
    /**
     * The wall behind a window read off by hand: the faces across the window (sashes, shutter
     * slats, brackets in front of it: anything not facing out or in is passed by) down to its
     * last layer (siding, sheathing, the interior liner: faces at most 55 cm apart, 75 cm in
     * all), a room behind, and its outer face within 15 cm everywhere (sashes are set in).
     */
    const manualWall = (a0, a1, y0, y1) => {
      let outerD = Infinity,
        innerD = -Infinity,
        first = null;
      for (let u = a0 + 0.03; u <= a1 - 0.03 + 1e-6; u += STEP)
        for (let y = y0 + 0.03; y <= y1 - 0.03 + 1e-6; y += STEP) {
          const all = probe(u, y);
          const h = all.filter((x) => Math.abs(x.n[axis]) > 0.9);
          if (!h.length || h[0].t > 4.5) return fail(u, y, all, "outer");
          let j = 0;
          while (j + 1 < h.length && h[j + 1].t - h[j].t <= 0.55 && h[j + 1].t - h[0].t <= 0.75)
            j++;
          if (!h[j + 1] || h[j + 1].t - h[j].t < 0.8) return fail(u, y, all, "room");
          first ??= h[0].t;
          if (Math.abs(h[0].t - first) > 0.15) return fail(u, y, all, `flat (${first.toFixed(3)})`);
          outerD = Math.min(outerD, h[0].t);
          innerD = Math.max(innerD, h[j].t);
        }
      return first === null ? null : { outerD, innerD };
    };
    const el = await loadElevation(id, side.name, spec.painted);
    // Windows read off the elevations by hand (model space: along the side, then up): the
    // painted ones the dark-rectangle test cannot see (light glass, shutters, muntins), and
    // `framed` sides' new ones. (Up to 2.5 m in: behind a porch.)
    for (const [a0, a1, y0, y1] of spec.rects?.[side.name] ?? []) {
      const wall = manualWall(a0, a1, y0, y1);
      const framed = spec.framed?.includes(side.name) ?? false;
      if (wall) {
        windows.push({ side, a0, a1, y0, y1, ...wall, painted: !framed });
        continue;
      }
      // An opening already (a window with no glass in it): the wall's depth from just above
      // it, and only the glass to add.
      const reason = why;
      const head = manualWall(a0, a1, y1 + 0.08, y1 + 0.2);
      const through = probe((a0 + a1) / 2, (y0 + y1) / 2);
      if (head && (!through.length || through[0].t > head.innerD + 0.5))
        windows.push({ side, a0, a1, y0, y1, ...head, painted: true, open: true });
      else
        report.push(
          `${id.padEnd(16)} ${side.name} [${a0}, ${a1}, ${y0}, ${y1}]: no plain wall (${reason})`,
        );
    }
    // The painted windows (dark rectangles on the wall's texture) made real, where the wall
    // behind them is a plain wall with a room behind it.
    if (spec.painted)
      for (const r of el.dark) {
        const w = r.a1 - r.a0,
          h = r.y1 - r.y0;
        if (w < 0.4 || w > 2.6 || h < (spec.minH ?? 0.6) || h > 2.8) continue;
        const wall = wallAt(r.a0, r.a1, r.y0, r.y1, 0.05);
        if (wall) windows.push({ side, ...r, ...wall, painted: true });
      }
    if (!spec.w) continue;
    for (const floor of storeys) {
      const y0 = floor + spec.sill,
        y1 = y0 + spec.h;
      if (y1 > box[4] - 0.3) continue;
      // Every 10 cm along the side, whether a window centred there would fit (a plain stretch
      // of wall, in its shape and on its texture), and its depths.
      const fits = [];
      for (let c = u0 + spec.w / 2 + 0.5; c <= u1 - spec.w / 2 - 0.5; c += STEP) {
        const a0 = c - spec.w / 2,
          a1 = c + spec.w / 2;
        const plain =
          el.plain(a0 - 0.3, a1 + 0.3, y0 - 0.3, y1 + 0.3) &&
          !windows.some(
            (w) => w.side === side && w.a0 < a1 + 0.6 && w.a1 > a0 - 0.6 && w.y0 < y1 && w.y1 > y0,
          );
        const wall = plain && wallAt(a0, a1, y0, y1, 0.2);
        fits.push(wall ? { c, ...wall } : null);
      }
      // Runs of centres that fit → windows spaced evenly along each.
      for (let i = 0; i < fits.length;) {
        if (!fits[i]) {
          i++;
          continue;
        }
        let j = i;
        while (j + 1 < fits.length && fits[j + 1]) j++;
        const a = fits[i].c,
          b = fits[j].c;
        const count = Math.floor((b - a) / spec.every) + 1;
        const first = (a + b) / 2 - ((count - 1) * spec.every) / 2;
        for (let k = 0; k < count; k++) {
          const c = first + k * spec.every;
          const f = fits[Math.round((c - u0 - spec.w / 2 - 0.5) / STEP)] ?? fits[i];
          windows.push({
            side,
            a0: c - spec.w / 2,
            a1: c + spec.w / 2,
            y0,
            y1,
            outerD: f.outerD,
            innerD: f.innerD,
          });
        }
        i = j + 1;
      }
    }
  }
  if (!windows.length) {
    report.push(`${id.padEnd(16)} no wall fits a window`);
    continue;
  }
  // Model space: a window's box across its wall (outer face − 3 cm to inner face + 3 cm).
  const at = (side, depth) => (side.sign < 0 ? box[side.axis + 3] - depth : box[side.axis] + depth);
  const cuts = [],
    panes = [],
    holes = [];
  const frame = { pos: [], nrm: [] },
    reveal = { pos: [], nrm: [] };
  for (const w of windows) {
    const { side, a0, a1, y0, y1, outerD, innerD } = w;
    const { axis, along } = side;
    const span = (d0, d1) => {
      const p = at(side, d0),
        q = at(side, d1);
      return [Math.min(p, q), Math.max(p, q)];
    };
    const mk = (u, v, y, Y, dd) => {
      const b = [0, y, 0, 0, Y, 0];
      b[along] = u;
      b[along + 3] = v;
      b[axis] = dd[0];
      b[axis + 3] = dd[1];
      return b;
    };
    const wall = span(outerD - 0.03, innerD + 0.03);
    if (!w.open) cuts.push(mk(a0, a1, y0, y1, wall));
    // Collision: the opening through the wall and well either side of it (voxel walls).
    holes.push(mk(a0 + 0.02, a1 - 0.02, y0 + 0.02, y1 - 0.02, span(outerD - 0.4, innerD + 0.4)));
    // The pane: 8 cm of glass in the middle of the wall.
    const mid = (outerD + innerD) / 2;
    const g = span(mid - 0.04, mid + 0.04);
    // (Wider than 1.8 m: in equal parts, as glass_panes.mjs splits wide glass.)
    const parts = Math.ceil((a1 - a0) / 1.8 - 1e-9);
    for (let k = 0; k < parts; k++) {
      const pb = mk(a0 + ((a1 - a0) * k) / parts, a0 + ((a1 - a0) * (k + 1)) / parts, y0, y1, g);
      panes.push([pb[0], pb[3], pb[2], pb[5], pb[1], pb[4]].map((v) => +v.toFixed(3)));
    }
    // The reveals: the wall's cut faces round the opening, facing into it.
    if (w.open) continue;
    const ws = span(outerD, innerD);
    const P = (u, y, dd) => {
      const p = [0, y, 0];
      p[along] = u;
      p[axis] = dd;
      return p;
    };
    const n = (k, s) => {
      const v = [0, 0, 0];
      v[k] = s;
      return v;
    };
    const [d0, d1] = ws;
    // Sill and head (normals up and down), jambs (normals along the side).
    quad(
      [P(a0, y0, d0), P(a1, y0, d0), P(a1, y0, d1), P(a0, y0, d1)],
      n(1, 1),
      reveal.pos,
      reveal.nrm,
    );
    quad(
      [P(a0, y1, d0), P(a0, y1, d1), P(a1, y1, d1), P(a1, y1, d0)],
      n(1, -1),
      reveal.pos,
      reveal.nrm,
    );
    quad(
      [P(a0, y0, d0), P(a0, y0, d1), P(a0, y1, d1), P(a0, y1, d0)],
      n(along, 1),
      reveal.pos,
      reveal.nrm,
    );
    quad(
      [P(a1, y0, d0), P(a1, y1, d0), P(a1, y1, d1), P(a1, y0, d1)],
      n(along, -1),
      reveal.pos,
      reveal.nrm,
    );
    // The frame round the glass (5 cm, 12 cm deep) and a sill outside (a painted window has
    // its own, painted).
    if (w.painted) continue;
    const fd = span(mid - 0.06, mid + 0.06);
    const F = 0.05;
    for (const b of [
      mk(a0, a1, y0, y0 + F, fd),
      mk(a0, a1, y1 - F, y1, fd),
      mk(a0, a0 + F, y0 + F, y1 - F, fd),
      mk(a1 - F, a1, y0 + F, y1 - F, fd),
    ])
      boxTriangles(b, frame.pos, frame.nrm);
    boxTriangles(
      mk(a0 - 0.06, a1 + 0.06, y0 - 0.06, y0, span(outerD - 0.07, outerD + 0.05)),
      frame.pos,
      frame.nrm,
    );
  }
  // Collision.
  let next = collision.models[id] ?? [],
    cutBoxes = 0;
  for (const hole of holes) {
    const after = [];
    for (const b of next) {
      const parts = subtractBox(b, hole);
      if (parts.length !== 1 || parts[0] !== b) cutBoxes++;
      after.push(...parts);
    }
    next = after;
  }
  const bySide = {};
  for (const w of windows) bySide[w.side.name] = (bySide[w.side.name] ?? 0) + 1;
  report.push(
    `${id.padEnd(16)} windows ${String(windows.length).padStart(3)} (${Object.entries(bySide)
      .map(([s, n]) => `${s} ${n}`)
      .join(
        ", ",
      )}; storeys ${storeys.map((s) => s.toFixed(2)).join(" ")})  collision boxes cut ${cutBoxes}`,
  );
  if (dry) continue;
  collision.models[id] = next;
  windowPanes.models[id] = [...(windowPanes.models[id] ?? []), ...panes];
  for (const mesh of doc.getRoot().listMeshes())
    for (const prim of mesh.listPrimitives()) cutPrimitive(doc, prim, cuts, false);
  // Only reveals (painted windows): onto the model's own plain liner when it has one (its
  // interior walls' colour, no extra draw); else, and with frames, one vertex-coloured draw.
  const liner = frame.pos.length
    ? null
    : doc
        .getRoot()
        .listMeshes()
        .flatMap((m) => m.listPrimitives())
        .find(
          (p) =>
            p.listSemantics().sort().join() === "NORMAL,POSITION" &&
            !p.getMaterial()?.getBaseColorTexture(),
        );
  let trimDraw = true;
  if (liner && reveal.pos.length) {
    appendTriangles(doc, liner, reveal.pos, reveal.nrm);
    trimDraw = false;
  } else
    addMesh(doc, "Window trim", [
      { color: [0.58, 0.56, 0.52], ...reveal },
      { color: [0.86, 0.86, 0.83], ...frame },
    ]);
  await doc.transform(weld(), prune(), meshopt({ encoder: MeshoptEncoder, level: "medium" }));
  const out = `/fps/br/models/${id}.${revision}.lod0.glb`;
  await io.write(path.join("public", out), doc);
  const written = await io.read(path.join("public", out));
  lod.file = out;
  lod.tris = counts(written).tris;
  // (One more draw: the trim. The pane is drawn with the island's glass.)
  if (lod.draws !== undefined && trimDraw) lod.draws++;
  lod.kB = Math.round(fs.statSync(path.join("public", out)).size / 1024);
  files++;
  // The middle LOD (100–600 m): the new windows drawn on it, dark glass in a white frame 1.5 cm
  // proud of its wall, so they do not vanish as the building steps down from its near LOD (the
  // painted ones are on its texture already).
  const framed = windows.filter((w) => !w.painted);
  const mid = entry.lods[1];
  // (Not a flat facade LOD: those take one atlas, build_facades.mjs, and keep the walls it
  // baked.)
  if (framed.length && mid && !mid.facade) {
    const far = await io.read(modelFile(mid.file));
    await far.transform(dequantize(), flatten());
    for (const node of far.getRoot().listNodes()) if (node.getMesh()) clearNodeTransform(node);
    const farTris = trianglesOf(far).tris;
    const glass = { pos: [], nrm: [] },
      rim = { pos: [], nrm: [] };
    for (const w of framed) {
      const { side, a0, a1, y0, y1 } = w;
      const { axis, sign, along } = side;
      const o = [0, (y0 + y1) / 2, 0];
      o[along] = (a0 + a1) / 2;
      o[axis] = sign < 0 ? box[axis + 3] + 1 : box[axis] - 1;
      const d = [0, 0, 0];
      d[axis] = sign;
      let t = Infinity;
      for (const tri of farTris) if (Math.abs(tri.n[axis]) > 0.9) t = Math.min(t, hit(o, d, tri.P));
      if (t === Infinity || t > 3.5) continue;
      const face = o[axis] + sign * (t - 0.015);
      const P = (u, y) => {
        const p = [0, y, 0];
        p[along] = u;
        p[axis] = face;
        return p;
      };
      const nrm = [0, 0, 0];
      nrm[axis] = -sign;
      // Counter-clockwise seen from outside (along −sign on the axis).
      const q = (u, v, y, Y, into) => {
        const c = [P(u, y), P(v, y), P(v, Y), P(u, Y)];
        const e1 = c[1].map((x, k) => x - c[0][k]),
          e2 = c[2].map((x, k) => x - c[0][k]);
        const n = [
          e1[1] * e2[2] - e1[2] * e2[1],
          e1[2] * e2[0] - e1[0] * e2[2],
          e1[0] * e2[1] - e1[1] * e2[0],
        ];
        quad(n[axis] * -sign > 0 ? c : [c[0], c[3], c[2], c[1]], nrm, into.pos, into.nrm);
      };
      const F = 0.06;
      q(a0 + F, a1 - F, y0 + F, y1 - F, glass);
      q(a0, a1, y0, y0 + F, rim);
      q(a0, a1, y1 - F, y1, rim);
      q(a0, a0 + F, y0 + F, y1 - F, rim);
      q(a1 - F, a1, y0 + F, y1 - F, rim);
    }
    addMesh(
      far,
      "Window glass and frames",
      [
        { color: [0.1, 0.13, 0.17], ...glass },
        { color: [0.86, 0.86, 0.83], ...rim },
      ],
      0.5,
    );
    await far.transform(weld(), prune(), meshopt({ encoder: MeshoptEncoder, level: "medium" }));
    const farOut = `/fps/br/models/${id}.${revision}.lod1.glb`;
    await io.write(path.join("public", farOut), far);
    const back = await io.read(path.join("public", farOut));
    mid.file = farOut;
    mid.tris = counts(back).tris;
    if (mid.draws !== undefined) mid.draws++;
    mid.kB = Math.round(fs.statSync(path.join("public", farOut)).size / 1024);
    files++;
  }
}
console.log(report.join("\n"));
if (!dry) {
  manifest.worldRevision = collision.worldRevision = revision;
  fs.writeFileSync(path.join(dir, `models.${revision}.json`), JSON.stringify(manifest));
  fs.writeFileSync(path.join(dir, `collision.${revision}.json`), JSON.stringify(collision));
  windowPanes.revision = revision;
  fs.writeFileSync(panesFile, JSON.stringify(windowPanes, null, 1) + "\n");
  console.log(`${files} files`);
}
