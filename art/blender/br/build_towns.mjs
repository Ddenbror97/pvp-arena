/**
 * The rebuilt first towns' houses into the island's model pipeline (owner, 2026-11-27: "re-build
 * 4 major citys … build 12 diffrent apartment/houses for each nighberhood with multible floors
 * and roof topps"; "build in blender in the cloud"). Northstar, Millhaven, Crossroads and
 * Riverwood get twelve designs each in place of the downloaded one-storey houses.
 *
 * The buildings are modelled in Blender (art/blender/br/towns: build_towns.py run with Blender's
 * Python module, `bpy`), which writes each one's glTF (objects <id>.near, .shell, .mid, .far)
 * and its collision, doors and walk routes (art/br/towns/blender/<id>.json). This reads them and
 * writes what the game loads, as the textured kit's buildings are written (textured-kit.mjs):
 *
 *  - LOD0: near + shell (walls with their openings, rooms, stairs, roofs, trim), the island's
 *    textures in world metres, the rooms' walls and floors on the materials interior-style.ts
 *    paints per placement;
 *  - LOD1: shell + mid (each storey's walls whole, the openings dark panes on them);
 *  - LOD2: far, one draw (the far facade atlas textures it later: build_facades.mjs --far);
 *  - art/br/procedural/<id>.boxes.json and <id>.entrances.json, the models.json entry, the
 *    footprint and door aprons in src/lib/fps/br/location-buildings.json.
 *
 *   /home/claude/bpyenv/bin/python art/blender/br/towns/build_towns.py   (Blender)
 *   node art/blender/br/build_towns.mjs [id …]                          (then this)
 *
 * Then, as the 2026-11-27 build went (ids: the 48, comma-separated; models.json's order kept):
 *   ONLY=<ids> node art/blender/br/build_collision.mjs
 *   node art/blender/br/add_models.mjs models.<live>.json collision.<live>.json towns-v1 <ids>
 *   node art/blender/br/offset_coplanar.mjs models.towns-v1.json --tag=zfix-v22 --only=<ids>
 *   node art/blender/br/glass_panes.mjs towns-v1 towns-v2 --only=<ids>   (merge its window-panes.json
 *     entries into the file's: it writes only these models)
 *   node art/blender/br/fill_collision.mjs --public=public --ids=<ids> \
 *     --models=public/fps/br/models/models.towns-v2.json --collision=public/fps/br/models/collision.towns-v2.json
 *   node art/blender/br/build_facades.mjs models.towns-v2.json far-facades-v3 4096 --far --density=2.8
 *   node scripts/br/facades/bake.mjs far-facades-v3
 *   BASE=doors.v27 ONLY=<ids> node scripts/br/doors/bake.mjs
 *   node art/blender/br/model-files.mjs
 * The collision's walls are horizontal bands with no slab in a glazed opening (its pane is solid
 * until shot): the island's collision payload has a budget (tests/br-static-world.test.ts).
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";
import { MATERIALS, publishTextured } from "./textured-kit.mjs";

const TAG = process.env.TAG ?? "towns-v1";
const SRC = "art/br/towns/blender";
await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder });

/** Triangles of a Blender export, per object class (near, shell, mid, far) and material. */
async function readBlender(file) {
  const doc = await io.read(file);
  const out = { near: [], shell: [], mid: [], far: [] };
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const cls = node.getName().split(".").pop();
    if (!out[cls]) throw new Error(`${file}: object ${node.getName()}`);
    for (const p of mesh.listPrimitives()) {
      const m = p
        .getMaterial()
        .getName()
        .replace(/^town-/, "")
        .replace(/\.\d+$/, "");
      if (!(m in MATERIALS)) throw new Error(`${file}: material ${m}`);
      const pos = p.getAttribute("POSITION").getArray();
      const nrm = p.getAttribute("NORMAL").getArray();
      // Blender writes its default colour layer first (white); the tints are the last one.
      const ca = p.getAttribute("COLOR_1") ?? p.getAttribute("COLOR_0");
      const cmax = ca ? (ca.getComponentType() === 5123 ? 65535 : 255) : 1;
      const col = ca?.getArray();
      const csz = ca?.getElementSize() ?? 4;
      const idx = p.getIndices()?.getArray() ?? [...Array(pos.length / 3).keys()];
      out[cls].push({ m, pos, nrm, col, cmax, csz, idx });
    }
  }
  return out;
}

/** A kit-like geometry source for publishTextured: per material, flat triangles. */
function geometry(groups) {
  const by = new Map();
  for (const g of groups) {
    if (!by.has(g.m)) by.set(g.m, { pos: [], nrm: [], uv: [], col: [] });
    const b = by.get(g.m);
    const tile = MATERIALS[g.m]?.tile ?? 3;
    for (let t = 0; t < g.idx.length; t += 3) {
      const vs = [g.idx[t], g.idx[t + 1], g.idx[t + 2]];
      // The triangle's own normal (flat faces): the texture's projection axis, as the kit maps.
      const P = vs.map((i) => [g.pos[i * 3], g.pos[i * 3 + 1], g.pos[i * 3 + 2]]);
      const u = [0, 1, 2].map((k) => P[1][k] - P[0][k]),
        w = [0, 1, 2].map((k) => P[2][k] - P[0][k]);
      let n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
      const l = Math.hypot(...n);
      if (l < 1e-9) continue;
      n = n.map((v) => v / l);
      // A ceiling indoors renders near black facing down: lit as if it faced up (the kit's way).
      const lit = g.m === "int" && n[1] < -0.7 ? [0, 1, 0] : n;
      const ax = Math.abs(n[0]),
        ay = Math.abs(n[1]),
        az = Math.abs(n[2]);
      for (const [k, i] of vs.entries()) {
        const p = P[k];
        b.pos.push(...p);
        b.nrm.push(...lit);
        const c = g.col
          ? [0, 1, 2].map((q) => +(g.col[i * g.csz + q] / g.cmax).toFixed(4))
          : [1, 1, 1];
        b.col.push(...c, 1);
        const [s, r] =
          ay >= ax && ay >= az ? [p[0], p[2]] : ax >= az ? [p[2], -p[1]] : [p[0], -p[1]];
        b.uv.push(s / tile, r / tile);
      }
    }
  }
  return by;
}

const only = process.argv.slice(2);
const ids = fs
  .readdirSync(SRC)
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.slice(0, -5))
  .filter((id) => (only.length ? only.includes(id) : !id.startsWith("test-")))
  .sort();
const PLAN = "src/lib/fps/br/location-buildings.json";
const plan = JSON.parse(fs.readFileSync(PLAN, "utf8"));
for (const id of ids) {
  const meta = JSON.parse(fs.readFileSync(`${SRC}/${id}.json`, "utf8"));
  const parts = await readBlender(`${SRC}/${id}.glb`);
  const kit = {
    solids: meta.boxes,
    geometry: (maxLod) =>
      geometry(maxLod === 0 ? [...parts.near, ...parts.shell] : [...parts.shell, ...parts.mid]),
  };
  const far = { geometry: () => geometry(parts.far) };
  // Its size: what the near LOD spans (centred on the pivot by build_towns.py).
  let x = 0,
    y = 0,
    z = 0;
  for (const g of [...parts.near, ...parts.shell])
    for (let i = 0; i < g.pos.length; i += 3) {
      x = Math.max(x, Math.abs(g.pos[i]));
      y = Math.max(y, g.pos[i + 1]);
      z = Math.max(z, Math.abs(g.pos[i + 2]));
    }
  await publishTextured(id, kit, far, {
    tag: TAG,
    title: meta.title,
    source: "art/blender/br/build_towns.mjs",
    textures:
      "Original work (procedural, art/blender/br/make_town_textures.py: brick, siding, battens, shingles, stucco) and Poly Haven (CC0): the owner's downloads, art/br/blackwater/tex",
    use: `${meta.use} (modelled in Blender, 2026-11-27)`,
    class: "building",
    ring: "dwelling",
    texture: 256,
    size: [+(2 * x).toFixed(2), +y.toFixed(2), +(2 * z).toFixed(2)],
  });
  fs.writeFileSync(`art/br/procedural/${id}.entrances.json`, JSON.stringify(meta.entrances) + "\n");
  plan[id] = { foot: meta.foot, aprons: meta.aprons };
}
fs.writeFileSync(
  PLAN,
  "{\n" +
    Object.entries(plan)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([id, v]) => ` ${JSON.stringify(id)}: ${JSON.stringify(v)}`)
      .join(",\n") +
    "\n}\n",
);
execFileSync("npx", ["prettier", "--write", PLAN], { stdio: "ignore" });
