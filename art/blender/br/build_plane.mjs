/**
 * The flyable Cessna 172SP (owner, 2026-11-17: "a propeller airplane … high realistic airplane
 * design"), from "FREE Cessna 172SP" by NLM (CC BY 4.0, the owner's download). Its parts keep
 * their own nodes so the game can move them: the propeller (with its spinner), the ailerons
 * (left and right, split from one mesh), the flaps, the elevator, the rudder, the main wheels
 * and the nose wheel, each pivoted on its real hinge or axle. The rest is one body.
 *
 *   node art/blender/br/build_plane.mjs <zip>
 *
 * - Dropped: the "remove before flight" ribbons, their cords and the tie-down blocks, and the
 *   doors' animation (the doors stay shut).
 * - Frame (aircraft.ts): metres, nose to −z, x right, y up, the origin at the centre of gravity
 *   (a quarter of the wing's chord back from its leading edge, 1.1 m above the ground under the
 *   wheels). The download is a third of real size: scaled to the real 11 m span.
 * - Draws: the livery (Body), the tyres, the metal and the glass keep their textures (1024 px
 *   WebP, base colour only, as the island's other models); every other material is folded into
 *   one vertex-coloured draw.
 * - LOD0 ~45 k triangles with the moving parts; LOD1 ~9 k with only the propeller apart;
 *   LOD2 ~1.6 k, one draw.
 *
 * Writes public/fps/br/models/plane-c172.lod{0,1,2}.glb and art/br/plane-c172.json (the
 * parts' pivots and the measured gear, hull and seat points aircraft.ts is tuned to).
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  dedup,
  unweldPrimitive,
  join,
  meshopt,
  prune,
  simplify,
  textureCompress,
  weld,
} from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";

const zip = process.argv[2];
if (!zip) throw new Error("usage: build_plane.mjs <free_cessna_172sp.zip>");
await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready]);
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });

const stage = fs.mkdtempSync(path.join(os.tmpdir(), "plane-"));
execFileSync("python3", ["-I", "art/br/assets/stage.py", zip, "scene.gltf", stage], {
  stdio: ["ignore", "ignore", "inherit"],
});
const SRC = path.join(stage, "scene.gltf");

/** Real wingspan (m) over the download's: it is modelled at about a third of real size. */
const SPAN = 11;
/** The download's centre of gravity (its own units, nose +z): a quarter chord back. */
const CG_Z = 0.52;
/** The CG's height over the ground under the wheels (m, aircraft.ts's gear at −1.1). */
const CG_Y = 1.1;
const DROP_MATERIALS = new Set(["remove_before_flight", "Concrete"]);
/** The ribbons' cords (thin metal hanging from the wings to the blocks). */
const DROP_NODES = new Set(["Circle.005_49", "Plane.029_33", "Plane.022_20"]);
/** Moving parts: node names → part; `split`: by side (x < 0 left). Axis: what it turns about. */
const PARTS = {
  prop: { nodes: ["Plane_16", "Plane.011_13"], axis: "z" },
  aileron: { nodes: ["Plane.021_19"], split: true, axis: "x", hinge: "front" },
  flaps: { nodes: ["Plane.020_18"], axis: "x", hinge: "front" },
  elevator: { nodes: ["Plane.010_12"], axis: "x", hinge: "front" },
  rudder: { nodes: ["Plane.004_3", "Plane.003_2"], axis: "y", hinge: "front" },
  wheels: { nodes: ["Cube.002_8"], axis: "x", hinge: "centre" },
  noseWheel: { nodes: ["Cube.009_47"], axis: "x", hinge: "centre" },
};
const KEEP_TEXTURED = new Set(["Body", "Tyre", "Metal", "Window"]);
/** The registration's lettering in the livery's texture (UV; measured from Body_baseColor). */
const REG = { u: [0.0995, 0.1505], v: [0.5015, 0.6125] };

// ------------------------------------------------------------------ helpers
const mul = (a, b) => {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++)
      for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return o;
};
const apply = (m, [x, y, z], w = 1) => [
  m[0] * x + m[4] * y + m[8] * z + m[12] * w,
  m[1] * x + m[5] * y + m[9] * z + m[13] * w,
  m[2] * x + m[6] * y + m[10] * z + m[14] * w,
];

/** Average linear colour of a material's base colour (factor × texture mean). */
async function averageColour(material) {
  const f = material.getBaseColorFactor();
  const tex = material.getBaseColorTexture();
  if (!tex) return [f[0], f[1], f[2]];
  const { data } = await sharp(Buffer.from(tex.getImage()))
    .resize(32, 32, { fit: "fill" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const sum = [0, 0, 0];
  for (let i = 0; i < data.length; i += 4)
    for (let k = 0; k < 3; k++) sum[k] += Math.pow(data[i + k] / 255, 2.2);
  const n = data.length / 4;
  return [(f[0] * sum[0]) / n, (f[1] * sum[1]) / n, (f[2] * sum[2]) / n];
}

/**
 * One baked document: every kept primitive in the aircraft's frame, grouped into the body and
 * the parts. Each part's mesh is centred on its pivot (returned), the node set there.
 */
async function bake({ moving }) {
  const doc = await io.read(SRC);
  const root = doc.getRoot();
  for (const a of root.listAnimations()) a.dispose();
  // The download's units to the aircraft's: scale, nose to −z (a half turn about y), CG at 0.
  const s = SPAN / 3.69;
  const frame = [-s, 0, 0, 0, 0, s, 0, 0, 0, 0, -s, 0, 0, -CG_Y, CG_Z * s, 1];
  // The part each primitive belongs to.
  const partOf = new Map();
  for (const n of root.listNodes()) {
    for (const [part, def] of Object.entries(PARTS))
      if (def.nodes.includes(n.getName())) {
        const mark = (m) => {
          partOf.set(m, part);
          for (const c of m.listChildren()) mark(c);
        };
        mark(n);
      }
  }
  const drop = new Set();
  for (const n of root.listNodes())
    if (DROP_NODES.has(n.getName())) {
      const mark = (m) => {
        drop.add(m);
        for (const c of m.listChildren()) mark(c);
      };
      mark(n);
    }
  const scene = root.getDefaultScene() ?? root.listScenes()[0];
  const out = doc.createNode("plane-c172");
  const groups = new Map(); // part → Mesh
  const meshFor = (part) => {
    if (!groups.has(part)) groups.set(part, doc.createMesh(part));
    return groups.get(part);
  };
  // Bake each mesh node's world transform (and the frame) into its geometry.
  for (const n of root.listNodes()) {
    const mesh = n.getMesh();
    if (!mesh || drop.has(n)) continue;
    const world = mul(frame, n.getWorldMatrix());
    const part = (moving && partOf.get(n)) || (partOf.get(n) === "prop" ? "prop" : "body");
    for (const p of mesh.listPrimitives()) {
      const mat = p.getMaterial();
      if (mat && DROP_MATERIALS.has(mat.getName())) continue;
      const q = p.clone();
      const pos = q.getAttribute("POSITION");
      let pa = pos.getArray().slice();
      for (let i = 0; i < pa.length; i += 3) {
        const v = apply(world, [pa[i], pa[i + 1], pa[i + 2]]);
        pa[i] = v[0];
        pa[i + 1] = v[1];
        pa[i + 2] = v[2];
      }
      q.setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(pa));
      const nor = q.getAttribute("NORMAL");
      if (nor) {
        const na = nor.getArray().slice();
        for (let i = 0; i < na.length; i += 3) {
          const v = apply(world, [na[i], na[i + 1], na[i + 2]], 0);
          const l = Math.hypot(v[0], v[1], v[2]) || 1;
          na[i] = v[0] / l;
          na[i + 1] = v[1] / l;
          na[i + 2] = v[2] / l;
        }
        q.setAttribute("NORMAL", doc.createAccessor().setType("VEC3").setArray(na));
      }
      // The registration: the download maps both sides of the fuselage onto one half of the
      // livery, so on the right side "N923A" read backwards. The strips of triangles under the
      // lettering (REG: the band in UV they cover, edge to edge) are given their own vertices
      // and mirrored across the band, on the right side only.
      if (mat?.getName() === "Body" && q.getAttribute("TEXCOORD_0")) {
        const uv0 = q.getAttribute("TEXCOORD_0").getArray();
        const idx0 = q.getIndices()?.getArray();
        const inBand = (i) => {
          const u = uv0[i * 2],
            v = uv0[i * 2 + 1];
          return u >= REG.u[0] && u <= REG.u[1] && v >= REG.v[0] && v <= REG.v[1];
        };
        let any = false;
        if (idx0)
          for (let i = 0; i < idx0.length && !any; i += 3)
            any = [0, 1, 2].every((k) => inBand(idx0[i + k]) && pa[idx0[i + k] * 3] > 0.02);
        if (any) {
          unweldPrimitive(q);
          const posU = q.getAttribute("POSITION").getArray();
          const uv = q.getAttribute("TEXCOORD_0").getArray().slice();
          const inside = (i) => {
            const u = uv[i * 2],
              v = uv[i * 2 + 1];
            return u >= REG.u[0] && u <= REG.u[1] && v >= REG.v[0] && v <= REG.v[1];
          };
          for (let t = 0; t < uv.length / 2; t += 3)
            if ([0, 1, 2].every((k) => inside(t + k) && posU[(t + k) * 3] > 0.02))
              for (let k = 0; k < 3; k++)
                uv[(t + k) * 2 + 1] = REG.v[0] + REG.v[1] - uv[(t + k) * 2 + 1];
          q.setAttribute("TEXCOORD_0", doc.createAccessor().setType("VEC2").setArray(uv));
          pa = posU;
        }
      }
      // The frame mirrors x and z (a half turn: no mirror, the winding holds).
      if (PARTS[part]?.split) {
        // Ailerons: one mesh for both wings; one primitive per side (by its triangles' centre).
        for (const side of ["Left", "Right"]) {
          const r = q.clone();
          const idx = r.getIndices().getArray();
          const keep = [];
          for (let i = 0; i < idx.length; i += 3) {
            const cx = (pa[idx[i] * 3] + pa[idx[i + 1] * 3] + pa[idx[i + 2] * 3]) / 3;
            if (side === "Left" ? cx < 0 : cx >= 0) keep.push(idx[i], idx[i + 1], idx[i + 2]);
          }
          r.setIndices(doc.createAccessor().setType("SCALAR").setArray(new Uint32Array(keep)));
          meshFor(part + side).addPrimitive(r);
        }
        q.dispose();
      } else meshFor(part).addPrimitive(q);
    }
  }
  for (const n of root.listNodes()) if (n !== out) n.dispose();
  for (const sc of root.listScenes()) if (sc !== scene) sc.dispose();
  scene.addChild(out);
  // Pivots: the hinge at the part's leading edge (its most forward points: −z), or its centre.
  const pivots = {};
  for (const [part, mesh] of groups) {
    const base = part.replace(/Left|Right$/, "");
    const def = PARTS[base];
    let min = [Infinity, Infinity, Infinity],
      max = [-Infinity, -Infinity, -Infinity];
    for (const p of mesh.listPrimitives()) {
      const a = p.getAttribute("POSITION").getArray();
      const idx = p.getIndices()?.getArray();
      const each = (i) => {
        for (let k = 0; k < 3; k++) {
          min[k] = Math.min(min[k], a[i * 3 + k]);
          max[k] = Math.max(max[k], a[i * 3 + k]);
        }
      };
      if (idx) for (const i of idx) each(i);
      else for (let i = 0; i < a.length / 3; i++) each(i);
    }
    let pivot = [0, 0, 0];
    if (part !== "body") {
      const c = min.map((v, k) => (v + max[k]) / 2);
      if (def.hinge === "front") pivot = [c[0], c[1], min[2]];
      else if (base === "prop") {
        // The propeller turns about the spinner's axis (x, y) in its plane.
        pivot = [0, c[1], c[2]];
      } else pivot = c;
      if (base === "prop") pivot = [0, c[1], c[2]];
    }
    pivots[part] = {
      pivot: pivot.map((v) => +v.toFixed(3)),
      min: min.map((v) => +v.toFixed(3)),
      max: max.map((v) => +v.toFixed(3)),
      axis: def?.axis ?? null,
    };
    // Re-centre the part's geometry on its pivot.
    if (part !== "body")
      for (const p of mesh.listPrimitives()) {
        const acc = p.getAttribute("POSITION");
        const a = acc.getArray().slice();
        for (let i = 0; i < a.length; i += 3) for (let k = 0; k < 3; k++) a[i + k] -= pivot[k];
        p.setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(a));
      }
    const node = doc.createNode(part).setMesh(mesh).setTranslation(pivot);
    out.addChild(node);
  }
  return { doc, pivots };
}

/** Fold every material outside `keep` into one vertex-coloured material (one draw per part). */
async function flatten(doc, keep) {
  const root = doc.getRoot();
  const flat = doc
    .createMaterial("flat")
    .setBaseColorFactor([1, 1, 1, 1])
    .setRoughnessFactor(0.75)
    .setMetallicFactor(0);
  const colours = new Map();
  for (const m of root.listMaterials())
    if (m !== flat && !keep.has(m.getName())) colours.set(m, await averageColour(m));
  for (const mesh of root.listMeshes())
    for (const p of mesh.listPrimitives()) {
      const m = p.getMaterial();
      if (!m || !colours.has(m)) continue;
      const c = colours.get(m);
      const n = p.getAttribute("POSITION").getCount();
      const col = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) col.set([c[0], c[1], c[2], 1], i * 4);
      for (const sem of p.listSemantics())
        if (sem !== "POSITION" && sem !== "NORMAL") p.setAttribute(sem, null);
      p.setAttribute("COLOR_0", doc.createAccessor().setType("VEC4").setArray(col));
      p.setMaterial(flat);
    }
  // Primitives without colours (the kept textured ones) need none; the flat ones share one.
  for (const m of colours.keys()) m.dispose();
  for (const m of root.listMaterials()) {
    m.setNormalTexture(null).setOcclusionTexture(null).setEmissiveTexture(null);
    if (m.getMetallicRoughnessTexture())
      m.setMetallicRoughnessTexture(null).setMetallicFactor(0.1).setRoughnessFactor(0.6);
  }
}

function tris(doc) {
  let t = 0;
  for (const m of doc.getRoot().listMeshes())
    for (const p of m.listPrimitives())
      t += (p.getIndices()?.getCount() ?? p.getAttribute("POSITION").getCount()) / 3;
  return t;
}

/** Reduce each part toward `ratio` of its triangles (bounded by `error`, a share of the size). */
async function reduce(doc, ratio, error) {
  await doc.transform(
    weld(),
    simplify({ simplifier: MeshoptSimplifier, ratio, error, lockBorder: false }),
  );
}

const OUT = "public/fps/br/models";
const lods = [];
const report = {};
for (const [level, opt] of [
  [0, { moving: true, keep: KEEP_TEXTURED, ratio: 0.22, error: 0.0015, px: 1024 }],
  [1, { moving: false, keep: new Set(["Body", "Window"]), ratio: 0.05, error: 0.006, px: 512 }],
  [2, { moving: false, keep: new Set(["Body"]), ratio: 0.02, error: 0.012, px: 256 }],
]) {
  const { doc, pivots } = await bake(opt);
  await flatten(doc, opt.keep);
  await doc.transform(dedup(), join({ keepNamed: true }), prune());
  await reduce(doc, opt.ratio, opt.error);
  await doc.transform(
    prune(),
    textureCompress({
      encoder: sharp,
      targetFormat: "webp",
      resize: [opt.px, opt.px],
      quality: 82,
    }),
    meshopt({ encoder: MeshoptEncoder, level: "medium" }),
  );
  const file = `${OUT}/plane-c172.lod${level}.glb`;
  await io.write(file, doc);
  const draws = doc
    .getRoot()
    .listMeshes()
    .reduce((n, m) => n + m.listPrimitives().length, 0);
  lods.push({
    file: `/fps/br/models/plane-c172.lod${level}.glb`,
    tris: Math.round(tris(doc)),
    draws,
    kB: Math.round(fs.statSync(file).size / 1024),
  });
  if (level === 0) Object.assign(report, pivots);
}
fs.writeFileSync(
  "art/br/plane-c172.json",
  JSON.stringify(
    {
      source: "https://sketchfab.com/3d-models/free-cessna-172sp-c9cadc2f026946da8cf9715a683739e9",
      lods,
      parts: report,
    },
    null,
    1,
  ) + "\n",
);
console.log(JSON.stringify(lods));
fs.rmSync(stage, { recursive: true, force: true });
