/**
 * FBX-only downloads to a glTF zip process_assets.mjs can read (owner's 2026-11-23 download:
 * the JAC3D Military Props pack, CC BY 4.0, FBX + PNG only; there is no Blender here).
 *
 *   node art/br/assets/convert_fbx.mjs <download.zip> <out.zip>
 *
 * The download is read in memory (nothing from it is written out but the listed FBX meshes and
 * base-colour PNGs, and nothing is executed): each FBX goes through three.js's own FBXLoader
 * (texture loading stubbed: the pack's PNGs are attached here by name), every mesh's world
 * transform is baked into its vertices, and each model becomes one named node of one scene with
 * its base-colour texture. The pack's licence text travels in the zip as license.txt.
 * process_assets.mjs then picks a model out with `piece` (kit.json) and fits, simplifies and
 * budgets it like any other download.
 */
import fs from "node:fs";
import path from "node:path";
import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { unzipSync, zipSync } from "three/examples/jsm/libs/fflate.module.js";
import { Document, NodeIO } from "@gltf-transform/core";

const [src, out] = process.argv.slice(2);
if (!src || !out) throw new Error("usage: convert_fbx.mjs <download.zip> <out.zip>");

// The pieces kept from Milprops_pack_01 (magazines and shells are hand-sized: not placed).
const ROOT = "Milprops_pack_01/";
const RACK = { fbx: "Missile Rack/missile_rack.fbx", tex: "Missile Rack/missile_rack_diffuse.png" };
const MISSILE = { fbx: "Missiles/missile.fbx", tex: "Missiles/missile_diffuse_green.png" };
// The rack's four cradles (cm, as authored): centres across x, bottoms at 18.3 cm; the missile's
// body is 10.5 cm in radius and 210.8 cm long, authored standing: laid along z in each cradle.
const CRADLES = [-53, -19, 17, 53];
const laid = (x) =>
  new THREE.Matrix4()
    .makeTranslation(x, 18.3 + 10.5, -105.4)
    .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));
const MODELS = [
  {
    name: "barrel_green",
    parts: [{ fbx: "Barrels/barrel.fbx", tex: "Barrels/barrel_diffuse_green.png" }],
  },
  {
    name: "barrel_fuel",
    parts: [{ fbx: "Barrels/barrel.fbx", tex: "Barrels/barrel_diffuse_black_flammable.png" }],
  },
  { name: "box", parts: [{ fbx: "Box/box.FBX", tex: "Box/box_diffuse.png" }] },
  { name: "missile_rack", parts: [RACK] },
  {
    name: "missile_rack_loaded",
    parts: [RACK, ...CRADLES.map((x) => ({ ...MISSILE, matrix: laid(x) }))],
  },
  { name: "missile", parts: [MISSILE] },
];
const LICENCE = "Readme.txt";

const files = unzipSync(new Uint8Array(fs.readFileSync(src)), {
  filter: (f) =>
    f.originalSize < 200 * 1024 * 1024 &&
    (f.name === ROOT + LICENCE ||
      MODELS.some((m) => m.parts.some((p) => f.name === ROOT + p.fbx || f.name === ROOT + p.tex))),
});
const member = (name) => {
  const data = files[ROOT + name];
  if (!data) throw new Error(`${name} not in ${src}`);
  return data;
};

// No images are loaded from inside the FBX (they would need a DOM); the PNGs are attached below.
THREE.TextureLoader.prototype.load = () => new THREE.Texture();
const loader = new FBXLoader();

const doc = new Document();
const buffer = doc.createBuffer();
const scene = doc.createScene("milprops");
// One material per texture, one parsed FBX per file: shared by the models that reuse them.
const materials = new Map();
const materialFor = (tex) => {
  if (!materials.has(tex)) {
    const name = path.basename(tex, ".png");
    const image = doc
      .createTexture(name)
      .setImage(member(tex))
      .setMimeType("image/png")
      .setURI(`textures/${name}.png`);
    materials.set(
      tex,
      doc
        .createMaterial(name)
        .setBaseColorTexture(image)
        .setMetallicFactor(0)
        .setRoughnessFactor(0.8),
    );
  }
  return materials.get(tex);
};
const parsed = new Map();
const parse = (file) => {
  if (!parsed.has(file)) {
    const fbx = member(file);
    const group = loader.parse(
      fbx.buffer.slice(fbx.byteOffset, fbx.byteOffset + fbx.byteLength),
      "",
    );
    group.updateMatrixWorld(true);
    parsed.set(file, group);
  }
  return parsed.get(file);
};
const accessor = (type, array) =>
  doc.createAccessor().setType(type).setArray(new Float32Array(array)).setBuffer(buffer);
for (const m of MODELS) {
  const mesh = doc.createMesh(m.name);
  let tris = 0;
  for (const part of m.parts) {
    const material = materialFor(part.tex);
    parse(part.fbx).traverse((o) => {
      if (!o.isMesh) return;
      const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      g.applyMatrix4(o.matrixWorld);
      if (part.matrix) g.applyMatrix4(part.matrix);
      const pos = g.getAttribute("position");
      const prim = doc
        .createPrimitive()
        .setMaterial(material)
        .setAttribute("POSITION", accessor("VEC3", pos.array));
      const nrm = g.getAttribute("normal");
      if (nrm) prim.setAttribute("NORMAL", accessor("VEC3", nrm.array));
      const uv = g.getAttribute("uv");
      if (uv) prim.setAttribute("TEXCOORD_0", accessor("VEC2", uv.array));
      mesh.addPrimitive(prim);
      tris += pos.count / 3;
    });
  }
  scene.addChild(doc.createNode(m.name).setMesh(mesh));
  console.log(`${m.name}: ${tris} triangles`);
}

const tmp = fs.mkdtempSync(path.join(path.dirname(path.resolve(out)), ".convert-"));
await new NodeIO().write(path.join(tmp, "scene.gltf"), doc);
const zip = { "license.txt": member(LICENCE) };
const walk = (dir, rel = "") => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, rel + e.name + "/");
    else zip[rel + e.name] = new Uint8Array(fs.readFileSync(p));
  }
};
walk(tmp);
fs.writeFileSync(out, zipSync(zip, { level: 6 }));
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`${out}: ${Object.keys(zip).join(", ")}`);
