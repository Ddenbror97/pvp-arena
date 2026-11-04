/**
 * Battle royale guns from the owner's "94 weapons" pack (2026-11-04: "add those weapons to battle
 * royale … skip the AK/AWP/M4 … skip the RPG"): eight low-poly, untextured models in one OBJ.
 *
 *   node br/build_pack_guns.mjs "<all weapons.obj>" <out.glb>      (run from art/blender)
 *
 * Each gun is split into its connected parts (the modeller built them from separate blocks:
 * stock, receiver, grip, magazine, barrel …), so the parts get their own materials (parkerized
 * steel, polished steel, black polymer, flat-dark-earth polymer, walnut) instead of one grey,
 * and the SVD's fixed scope is left off (optics are attachments, as on the AWP). The gun is
 * scaled to its real length and laid out in metres with the bore along −Z, up +Y, the origin on
 * the bore line above the pistol grip. Marker nodes (empty, under the gun's node) give what the
 * viewmodel, the attachment fit and the world model need:
 * (each named "<id>_<marker>", e.g. "scar_Grip"):
 *   Grip     — top of the pistol grip, where the firing hand's web sits;
 *   Support  — under the handguard / fore-end, where the support hand holds (long guns);
 *   Muzzle   — the bore's end;   Rail — top of the receiver, where an optic's base sits;
 *   Magazine — a child mesh (when the gun has a detachable magazine) so reloads can move it.
 * One top node per gun, named after its item id; meshopt-compressed.
 */
import fs from "node:fs";
import { Document, NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { meshopt, weld, prune, dedup } from "@gltf-transform/functions";
import { MeshoptEncoder } from "meshoptimizer";

const [src, out] = process.argv.slice(2);

/** PBR looks (base colour linear-ish sRGB values, metalness, roughness). */
const MATS = {
  steel: { c: [0.13, 0.135, 0.145], m: 0.75, r: 0.42 },
  bright: { c: [0.42, 0.43, 0.45], m: 0.9, r: 0.28 },
  polymer: { c: [0.055, 0.056, 0.06], m: 0.0, r: 0.72 },
  fde: { c: [0.3, 0.24, 0.15], m: 0.0, r: 0.7 },
  wood: { c: [0.2, 0.09, 0.04], m: 0.0, r: 0.55 },
  olive: { c: [0.16, 0.17, 0.12], m: 0.0, r: 0.75 },
};

/**
 * Per gun: OBJ object, real length (m), parts (index after sorting by the part's lowest x, butt
 * first) → material (default steel), parts to leave out, and which parts are the grip, the
 * support hold, the magazine and the rail; `face` splits a part's faces by position (butt → muzzle
 * fraction) when one block spans two materials.
 */
const GUNS = {
  m60: {
    obj: "Cube.002_Cube.003",
    length: 1.105,
    mats: { 0: "polymer", 1: "olive", 2: "olive", 3: "polymer", 14: "olive" },
    grip: 3,
    support: 14,
    rail: { part: 5, at: 0.5 },
  },
  svd: {
    obj: "Cube.012_Cube.030",
    length: 1.225,
    mats: { 0: "wood", 1: "wood", 17: "wood", 15: "steel" },
    drop: (b) => b.minY >= 0.86, // the PSO scope and its turret (optics are attachments)
    grip: 0,
    gripAt: { x: 0.27, y: "partTop" },
    support: 17,
    magazine: 15,
    rail: { part: 6, at: 0.6 },
  },
  scar: {
    obj: "Cube.006_Cube.049",
    length: 0.99,
    mats: {
      0: "polymer",
      1: "fde",
      2: "fde",
      3: "polymer",
      4: "polymer",
      5: "fde",
      6: "fde",
      9: "polymer",
      10: "polymer",
      11: "polymer",
    },
    grip: 4,
    support: 11,
    magazine: 9,
    rail: { part: 5, at: 0.45 },
  },
  pump: {
    obj: "Cube.001_Cube.077",
    length: 0.93,
    mats: { 0: "polymer", 5: "polymer" },
    grip: 0,
    gripAt: { x: 0.2, y: "partTop" },
    support: 5,
    rail: { part: 1, at: 0.6 },
  },
  hunting: {
    obj: "Cube_Cube.079",
    length: 1.06,
    mats: { 0: "wood", 1: "wood", 10: "wood" },
    // The stock block runs on through the receiver: the receiver end is steel.
    face: { 0: { from: 0.42, mat: "steel" }, 1: { from: 0.42, mat: "steel" } },
    grip: 1,
    gripAt: { x: 0.36, y: 0.55 },
    support: 10,
    rail: { x: 0.5 },
  },
  mp5: {
    obj: "Cube.016_Cube.091",
    length: 0.7,
    mats: { 0: "polymer", 3: "polymer", 4: "polymer", 7: "polymer" },
    grip: 3,
    support: 7,
    magazine: 6,
    rail: { part: 2, at: 0.35 },
  },
  pistol: {
    obj: "Cube.011_Cube.097",
    length: 0.2,
    mats: { 1: "polymer" },
    grip: 1,
    gripAt: { x: "partMax", y: "partTop" },
    supportAt: { x: 0.55, y: -0.9 },
    rail: { part: 2, at: 0.5 },
  },
  revolver: {
    obj: "Cylinder.001_Cylinder.060",
    length: 0.3,
    mats: { 0: "wood" },
    default: "bright",
    grip: 0,
    gripAt: { x: "partMax", y: "partTop" },
    supportAt: { x: 0.55, y: -0.9 },
    rail: { part: 6, at: 0.25 },
  },
};

// ---- OBJ (positions, normals, faces with v/vt/vn) per object
const objs = new Map();
const P = [],
  N = [];
let cur = null;
for (const line of fs.readFileSync(src, "utf8").split("\n")) {
  if (line.startsWith("o ")) objs.set((cur = line.slice(2).trim()), []);
  else if (line.startsWith("v ")) P.push(line.split(/\s+/).slice(1, 4).map(Number));
  else if (line.startsWith("vn ")) N.push(line.split(/\s+/).slice(1, 4).map(Number));
  else if (line.startsWith("f ")) {
    const f = line
      .trim()
      .split(/\s+/)
      .slice(1)
      .map((t) => {
        const [v, , n] = t.split("/");
        return [Number(v) - 1, n ? Number(n) - 1 : -1];
      });
    objs.get(cur).push(f);
  }
}

await MeshoptEncoder.ready;
const doc = new Document();
const buffer = doc.createBuffer();
const scene = doc.createScene("guns");
const mats = Object.fromEntries(
  Object.entries(MATS).map(([k, v]) => [
    k,
    doc
      .createMaterial(k)
      .setBaseColorFactor([...v.c, 1])
      .setMetallicFactor(v.m)
      .setRoughnessFactor(v.r),
  ]),
);
const report = {};
/** Marker nodes are added after the mesh optimisation (which prunes empty leaf nodes). */
const markers = [];

for (const [id, g] of Object.entries(GUNS)) {
  const faces = objs.get(g.obj);
  if (!faces) throw new Error(`no object ${g.obj}`);
  // Parts: union-find over welded positions.
  const key = new Map(),
    parent = [];
  const vid = (i) => {
    const k = P[i].map((c) => c.toFixed(4)).join(",");
    if (!key.has(k)) {
      key.set(k, parent.length);
      parent.push(parent.length);
    }
    return key.get(k);
  };
  const find = (a) => {
    while (parent[a] !== a) a = parent[a] = parent[parent[a]];
    return a;
  };
  const fw = faces.map((f) => f.map(([v]) => vid(v)));
  for (const f of fw) for (const a of f.slice(1)) parent[find(a)] = find(f[0]);
  const parts = new Map();
  faces.forEach((f, i) => {
    const r = find(fw[i][0]);
    if (!parts.has(r)) parts.set(r, { faces: [], minX: Infinity });
    const p = parts.get(r);
    p.faces.push(f);
    for (const [v] of f) p.minX = Math.min(p.minX, P[v][0]);
  });
  const list = [...parts.values()].sort((a, b) => a.minX - b.minX);
  // Whole-gun extent (butt → muzzle along +x in the OBJ) and per-part boxes.
  let x0 = Infinity,
    x1 = -Infinity;
  for (const f of faces)
    for (const [v] of f) ((x0 = Math.min(x0, P[v][0])), (x1 = Math.max(x1, P[v][0])));
  const L = x1 - x0,
    s = g.length / L;
  for (const p of list) {
    const b = {
      minX: Infinity,
      maxX: -Infinity,
      minY: Infinity,
      maxY: -Infinity,
      minZ: Infinity,
      maxZ: -Infinity,
    };
    for (const f of p.faces)
      for (const [v] of f) {
        const [x, y, z] = P[v];
        b.minX = Math.min(b.minX, x);
        b.maxX = Math.max(b.maxX, x);
        b.minY = Math.min(b.minY, y);
        b.maxY = Math.max(b.maxY, y);
        b.minZ = Math.min(b.minZ, z);
        b.maxZ = Math.max(b.maxZ, z);
      }
    p.box = b;
  }
  const zMid = (() => {
    let a = Infinity,
      b = -Infinity;
    for (const p of list) ((a = Math.min(a, p.box.minZ)), (b = Math.max(b, p.box.maxZ)));
    return (a + b) / 2;
  })();
  // Bore height: the part that reaches the muzzle (centre of its height).
  const muzzlePart = list.reduce(
    (m, p) =>
      p.box.maxX > m.box.maxX - 1e-6 && p.box.maxY - p.box.minY < m.box.maxY - m.box.minY ? p : m,
    list[0],
  );
  const boreY = (muzzlePart.box.minY + muzzlePart.box.maxY) / 2;
  // Grip point (OBJ units).
  const gp = list[g.grip].box;
  const gx =
    g.gripAt?.x === "partMax"
      ? gp.maxX - (gp.maxX - gp.minX) * 0.2
      : typeof g.gripAt?.x === "number"
        ? x0 + g.gripAt.x * L
        : (gp.minX + gp.maxX) / 2 + (gp.maxX - gp.minX) * 0.15;
  const gy =
    g.gripAt?.y === undefined || g.gripAt.y === "partTop"
      ? gp.maxY
      : gp.minY + (gp.maxY - gp.minY) * g.gripAt.y;
  // OBJ → gun frame: x (butt→muzzle) becomes −z, origin on the bore above the grip, metres.
  const tf = ([x, y, z]) => [(z - zMid) * s, (y - boreY) * s, -(x - gx) * s];
  const tn = ([x, y, z]) => [z, y, -x];

  const node = doc.createNode(id);
  scene.addChild(node);
  const byMat = new Map();
  const magFaces = [];
  list.forEach((p, i) => {
    if (g.drop?.(p.box)) return;
    for (const f of p.faces) {
      let m = g.mats[i] ?? g.default ?? "steel";
      const split = g.face?.[i];
      if (split) {
        const cx = f.reduce((a, [v]) => a + P[v][0], 0) / f.length;
        if ((cx - x0) / L >= split.from) m = split.mat;
      }
      const into = i === g.magazine ? magFaces : (byMat.get(m) ?? byMat.set(m, []).get(m));
      into.push({ f, m });
    }
  });
  const prim = (items, offset = [0, 0, 0]) => {
    const groups = new Map();
    for (const it of items) (groups.get(it.m) ?? groups.set(it.m, []).get(it.m)).push(it.f);
    const mesh = doc.createMesh();
    for (const [m, fs] of groups) {
      const pos = [],
        nor = [],
        idx = [];
      for (const f of fs) {
        const base = pos.length / 3;
        // Flat normal fallback when the OBJ has none for a corner.
        const a = tf(P[f[0][0]]),
          b = tf(P[f[1][0]]),
          c = tf(P[f[2][0]]);
        const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]],
          w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
        const fn = [
          u[1] * w[2] - u[2] * w[1],
          u[2] * w[0] - u[0] * w[2],
          u[0] * w[1] - u[1] * w[0],
        ];
        const fl = Math.hypot(...fn) || 1;
        for (const [v, n] of f) {
          const q = tf(P[v]);
          pos.push(q[0] - offset[0], q[1] - offset[1], q[2] - offset[2]);
          const nn = n >= 0 ? tn(N[n]) : fn.map((c) => c / fl);
          nor.push(...nn);
        }
        for (let k = 1; k + 1 < f.length; k++) idx.push(base, base + k, base + k + 1);
      }
      mesh.addPrimitive(
        doc
          .createPrimitive()
          .setMaterial(mats[m])
          .setAttribute(
            "POSITION",
            doc.createAccessor().setType("VEC3").setArray(new Float32Array(pos)).setBuffer(buffer),
          )
          .setAttribute(
            "NORMAL",
            doc.createAccessor().setType("VEC3").setArray(new Float32Array(nor)).setBuffer(buffer),
          )
          .setIndices(
            doc.createAccessor().setType("SCALAR").setArray(new Uint32Array(idx)).setBuffer(buffer),
          ),
      );
    }
    return mesh;
  };
  const body = doc.createNode(`${id}-body`).setMesh(prim([...byMat.values()].flat()));
  node.addChild(body);
  const round = (p) => p.map((v) => Math.round(v * 1e4) / 1e4);
  // Names carry the gun id: three.js renames duplicate node names on load ("Grip_1" …).
  const marker = (name, p, scale = 1) =>
    markers.push({ node, name: `${id}_${name}`, t: round(p), scale });
  marker("Grip", tf([gx, gy, zMid]));
  const mz = tf([x1, boreY, zMid]);
  marker("Muzzle", mz);
  if (g.rail.part !== undefined) {
    const r = list[g.rail.part].box;
    marker("Rail", tf([r.minX + (r.maxX - r.minX) * g.rail.at, r.maxY, zMid]));
  } else {
    // The highest surface over that point (sight posts and thin bits excepted).
    const x = x0 + g.rail.x * L;
    const top = Math.max(
      ...list
        .filter(
          (p) =>
            !g.drop?.(p.box) &&
            p.box.minX <= x &&
            p.box.maxX >= x &&
            p.box.maxX - p.box.minX > 0.05 * L,
        )
        .map((p) => p.box.maxY),
    );
    marker("Rail", tf([x, top, zMid]));
  }
  // Support: the axis of the handguard (its centre line), with its half-height (m) in the
  // node's scale, so the support hand's finger wrap can be opened to the handguard's size.
  // Handguns: under the frame ahead of the trigger guard (the support hand cups there).
  let support = null;
  if (g.support !== undefined) {
    const b = list[g.support].box;
    support = tf([(b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2, zMid]);
    const half = ((b.maxY - b.minY) / 2) * s;
    marker("Support", support, half);
  } else if (g.supportAt) {
    support = tf([
      x0 + g.supportAt.x * L,
      boreY + (g.supportAt.y ?? -0.6) * (gy > boreY ? 1 : boreY - gy),
      zMid,
    ]);
    marker("Support", support, 0.018);
  }
  if (magFaces.length) {
    const b = list[g.magazine].box;
    const top = tf([(b.minX + b.maxX) / 2, b.maxY, zMid]);
    const mag = doc.createNode(`${id}_Magazine`).setTranslation(top).setMesh(prim(magFaces, top));
    node.addChild(mag);
  }
  report[id] = {
    parts: list.length,
    dropped: list.filter((p) => g.drop?.(p.box)).length,
    lengthM: g.length,
    muzzle: mz.map((v) => +v.toFixed(3)),
    support: support?.map((v) => +v.toFixed(3)) ?? null,
    magazine: !!magFaces.length,
  };
}

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.encoder": MeshoptEncoder });
await doc.transform(
  weld(),
  dedup(),
  prune({ keepLeaves: true }),
  meshopt({ encoder: MeshoptEncoder, level: "medium" }),
);
for (const m of markers)
  m.node.addChild(doc.createNode(m.name).setTranslation(m.t).setScale([m.scale, m.scale, m.scale]));
await io.write(out, doc);
console.log(JSON.stringify(report, null, 1));
console.log("wrote", out, fs.statSync(out).size, "bytes");
