/**
 * Paint the battle royale's untextured models (owner, 2026-11-11: "there is some grey buildings").
 * A handful of models came without textures and with white vertex colours (the Sketchfab sources
 * have plain materials), so they drew as bare grey shapes: the airfield hangar, the open field
 * hangars and plane shelters, the army tent, the wooden lookout and the humvee.
 *
 * Each face gets a colour from what it is: a plinth, a wall, a roof, the frame or trusses inside,
 * canvas, timber, tyres; decided from the face's height in the model, its normal and whether it
 * lies on the shell or inside it. Panels and boards vary a few per cent (a hash of their place),
 * so a wall reads as sheets rather than one flat colour. The colours go into COLOR_0 (the faces
 * unwelded so each keeps its own); geometry, LOD triangle counts and collision are unchanged.
 * Writes `<id>.paint-v1.lod<N>.glb` and points the manifest's LODs at them.
 *
 *   node art/blender/br/paint_flat_models.mjs [manifest.json]
 *
 * The source LODs it read (eastport-v1's) were removed from public/ once superseded; to run it
 * again, restore them from git (`git checkout ce06bb85 -- public/fps/br/models/<file>`).
 */
import fs from "node:fs";
import path from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dequantize, meshopt, prune, unweld, weld } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });
const dir = "public/fps/br/models";
const manifestFile = path.join(dir, process.argv[2] ?? "models.eastport-v1.json");
const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));

const srgb = (r, g, b) => [r, g, b].map((c) => Math.pow(c, 2.2)); // vertex colours are linear
const C = {
  concrete: srgb(0.6, 0.58, 0.54),
  hangarWall: srgb(0.52, 0.57, 0.52),
  hangarRoof: srgb(0.45, 0.47, 0.48),
  steelDark: srgb(0.33, 0.31, 0.29),
  rust: srgb(0.42, 0.27, 0.18),
  roofGreen: srgb(0.36, 0.42, 0.35),
  canvas: srgb(0.45, 0.46, 0.31),
  canvasDark: srgb(0.36, 0.37, 0.25),
  timber: srgb(0.55, 0.42, 0.28),
  timberDark: srgb(0.4, 0.3, 0.2),
  roofTar: srgb(0.27, 0.26, 0.25),
  olive: srgb(0.42, 0.44, 0.31),
  tyre: srgb(0.07, 0.07, 0.07),
  glass: srgb(0.16, 0.19, 0.21),
};

/** Per model: a face → colour rule (positions in model units; bounds given). */
const RULES = {
  // The arched airfield hangar: concrete plinth, sage-green sheet walls, grey roof, dark steel
  // trusses and door frames inside.
  hangar: (f, b) => {
    // (The model stands on its own 62 m apron, so "inside the bounds" says nothing here.)
    if (f.y < b.min[1] + 0.35 && f.ny > 0.6) return C.concrete; // apron and floor
    if (f.y < b.min[1] + 1.25) return C.concrete; // plinth
    if (f.ny > 0.45) return panel(C.hangarRoof, f, 1.1);
    return panel(C.hangarWall, f, 1.1);
  },

  // Open field hangars / plane shelters: steel frame, green sheet roof.
  "field-hangar": (f, b) =>
    f.y > b.max[1] - 1.1 && Math.abs(f.ny) > 0.35 ? panel(C.roofGreen, f, 1) : C.steelDark,
  "plane-shelter": (f, b) =>
    f.y > b.max[1] - 1.1 && Math.abs(f.ny) > 0.35 ? panel(C.roofGreen, f, 1) : C.steelDark,
  // Army tent: olive canvas, darker door and seams low down, timber pegs.
  "army-tent": (f, b) => {
    if (f.y < b.min[1] + 0.12) return C.timberDark;
    if (!f.shell) return C.canvasDark; // door flap, frame, ropes
    return panel(C.canvas, f, 1.6, 0.05);
  },
  // Timber lookout tower: boards and posts, a tarred roof.
  lookout: (f, b) =>
    f.y > b.max[1] - 0.9 && f.ny > 0.4 ? C.roofTar : board(f.ny > 0.6 ? C.timberDark : C.timber, f),
  // Humvee: olive drab, dark tyres and glass.
  humvee: (f, b) => {
    const h = b.max[1] - b.min[1];
    if (f.y < b.min[1] + h * 0.28 && f.side) return C.tyre;
    if (f.y > b.min[1] + h * 0.55 && f.y < b.min[1] + h * 0.8 && Math.abs(f.ny) < 0.3 && f.shell)
      return C.glass;
    return C.olive;
  },
};

/** A small, stable variation per panel (along the wall) or board: a few per cent lighter/darker. */
function hash(i) {
  let s = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b);
  s ^= s >>> 13;
  s = Math.imul(s, 0xc2b2ae35);
  return ((s ^ (s >>> 16)) >>> 0) / 4294967296;
}
function panel(c, f, width, amount = 0.07) {
  const along = Math.abs(f.nx) > Math.abs(f.nz) ? f.z : f.x;
  const k = 1 + (hash(Math.floor(along / width) * 7919 + Math.round(f.nx * 3) * 31) - 0.5) * amount;
  return c.map((v) => v * k);
}
function board(c, f) {
  const k = 1 + (hash(Math.floor(f.y / 0.16) * 131 + Math.floor((f.x + f.z) / 0.9)) - 0.5) * 0.14;
  return c.map((v) => v * k);
}

const report = [];
for (const [id, rule] of Object.entries(RULES)) {
  const model = manifest.models[id];
  if (!model) throw Error("no model " + id);
  for (const [level, lod] of model.lods.entries()) {
    const src = "public" + lod.file;
    const doc = await io.read(src);
    await doc.transform(dequantize(), unweld());
    const root = doc.getRoot();
    // Bounds over the whole model (all LODs share the size).
    const min = [Infinity, Infinity, Infinity],
      max = [-Infinity, -Infinity, -Infinity];
    const prims = [];
    for (const node of root.listNodes()) {
      const mesh = node.getMesh();
      if (!mesh) continue;
      const m = node.getWorldMatrix();
      for (const p of mesh.listPrimitives()) {
        prims.push({ p, m });
        const pos = p.getAttribute("POSITION");
        const v = [0, 0, 0];
        for (let i = 0; i < pos.getCount(); i++) {
          pos.getElement(i, v);
          const w = apply(m, v);
          for (let k = 0; k < 3; k++) {
            min[k] = Math.min(min[k], w[k]);
            max[k] = Math.max(max[k], w[k]);
          }
        }
      }
    }
    const b = { min, max };
    const inset = Math.min(1.2, (max[0] - min[0]) * 0.08, (max[2] - min[2]) * 0.08);
    for (const { p, m } of prims) {
      const pos = p.getAttribute("POSITION");
      const n = pos.getCount();
      let col = p.getAttribute("COLOR_0");
      const colors = new Float32Array(n * 4);
      const a = [0, 0, 0],
        c = [0, 0, 0],
        d = [0, 0, 0];
      for (let i = 0; i < n; i += 3) {
        const A = apply(m, pos.getElement(i, a)),
          B = apply(m, pos.getElement(i + 1, c)),
          D = apply(m, pos.getElement(i + 2, d));
        const ux = B[0] - A[0],
          uy = B[1] - A[1],
          uz = B[2] - A[2],
          vx = D[0] - A[0],
          vy = D[1] - A[1],
          vz = D[2] - A[2];
        let nx = uy * vz - uz * vy,
          ny = uz * vx - ux * vz,
          nz = ux * vy - uy * vx;
        const len = Math.hypot(nx, ny, nz) || 1;
        nx /= len;
        ny /= len;
        nz /= len;
        const x = (A[0] + B[0] + D[0]) / 3,
          y = (A[1] + B[1] + D[1]) / 3,
          z = (A[2] + B[2] + D[2]) / 3;
        // On the shell: near the bounding box's sides or top (the outer skin); inside: trusses,
        // frames, interior faces.
        const shell =
          x < min[0] + inset ||
          x > max[0] - inset ||
          z < min[2] + inset ||
          z > max[2] - inset ||
          y > max[1] - inset * 2 ||
          ny > 0.45;
        const side = x < min[0] + (max[0] - min[0]) * 0.22 || x > max[0] - (max[0] - min[0]) * 0.22;
        const rgb = rule({ x, y, z, nx, ny: Math.abs(ny), nz, shell, side }, b);
        for (let k = 0; k < 3; k++) {
          colors.set([rgb[0], rgb[1], rgb[2], 1], (i + k) * 4);
        }
      }
      if (!col) {
        col = doc.createAccessor().setType("VEC4");
        p.setAttribute("COLOR_0", col);
      }
      col.setType("VEC4").setArray(colors);
    }
    await doc.transform(
      prune({ keepAttributes: true }),
      weld(),
      meshopt({ encoder: MeshoptEncoder, level: "medium", quantizePosition: 16 }),
    );
    const file = `/fps/br/models/${id}.paint-v1.lod${level}.glb`;
    await io.write("public" + file, doc);
    const kB = Math.round(fs.statSync("public" + file).size / 1024);
    report.push(`${id} lod${level}: ${lod.file} → ${file} (${lod.kB} → ${kB} kB)`);
    model.lods[level] = { ...lod, file, kB };
  }
}
fs.writeFileSync(manifestFile, JSON.stringify(manifest));
console.log(report.join("\n"));

function apply(m, v) {
  const [x, y, z] = v;
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14],
  ];
}
