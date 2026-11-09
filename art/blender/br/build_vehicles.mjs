/**
 * Drivable vehicles for the battle royale (owner, 2026-11-08: "3 car designs and 1 motorbike",
 * like Warzone, H1Z1 and PUBG): four CC BY models from Sketchfab, credited in
 * public/fps/br/models/ATTRIBUTION.md.
 *
 *   node br/build_vehicles.mjs <downloads dir> <out.glb>     (run from art/blender)
 *
 * <downloads dir> holds each download's unzipped folder (named as Sketchfab names it). Each
 * vehicle is baked to metres, turned so its nose faces −Z with +Y up, scaled to its real
 * length, centred over its wheels with the tyres' bottoms at y = 0, its textures resized to
 * 512 px WebP (the specular layers dropped), and placed under a top node named after its kind
 * (sedan, suv, pickup, bike). The body is joined by material; every wheel is kept as its own
 * node "wheel-FL" … "wheel-RR" (bike: "wheel-F", "wheel-R") centred on its hub, so the game can
 * spin it and steer the front ones. Fit data (size, wheel hubs and radius, seat) go in the top
 * node's extras.
 */
import fs from "node:fs";
import path from "node:path";
import { Document, NodeIO, getBounds } from "@gltf-transform/core";
import { ALL_EXTENSIONS, KHRMaterialsSpecular } from "@gltf-transform/extensions";
import {
  dedup,
  flatten,
  join,
  mergeDocuments,
  meshopt,
  prune,
  simplify,
  textureCompress,
  transformMesh,
  weld,
} from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";
import { mat4 } from "gl-matrix";

const [dir, out] = process.argv.slice(2);

/**
 * Per vehicle: the download folder, its real length (m), which nodes are wheels (and which
 * corner each is), the triangle budget for the body, and the source's credit.
 */
const VEHICLES = {
  sedan: {
    folder: "murphy_92_-_low_poly_model",
    length: 4.75,
    wheels: {
      FL: /WheelStock_FL_/,
      FR: /WheelStock_FR_/,
      RL: /WheelStock_RL_/,
      RR: /WheelStock_RR_/,
    },
    tris: 14000,
    credit: [
      "Murphy '92 - Low poly model",
      "Daniel Zhabotinsky",
      "https://sketchfab.com/3d-models/murphy-92-low-poly-model-bae7fbb58bc04de1ab2d62cd056a4652",
    ],
  },
  suv: {
    folder: "bokaroo_67_-_low_poly_model",
    length: 4.45,
    wheels: {
      FL: /WheelStock_FL_/,
      FR: /WheelStock_FR_/,
      RL: /WheelStock_RL_/,
      RR: /WheelStock_RR_/,
    },
    tris: 16000,
    credit: [
      "Bokaroo '67 - Low poly model",
      "Daniel Zhabotinsky",
      "https://sketchfab.com/3d-models/bokaroo-67-low-poly-model-22015d1863d6455aa31cfd738b972c50",
    ],
  },
  pickup: {
    folder: "rancher_80_lifted_-_low_poly_model",
    length: 5.15,
    wheels: { FL: /WheelLift_FL_/, FR: /WheelLift_FR_/, RL: /WheelLift_RL_/, RR: /WheelLift_RR_/ },
    tris: 15000,
    credit: [
      "Rancher '80 Lifted - Low Poly model",
      "Daniel Zhabotinsky",
      "https://sketchfab.com/3d-models/rancher-80-lifted-low-poly-model-fbf1767c4c3a450caa59c6431af79263",
    ],
  },
  bike: {
    folder: "dirt_bike_off_road_bike_low_poly",
    length: 2.15,
    // The two tyred cylinders; which is the front is found from the handlebar (the front
    // wheel is the one under the bike's highest point).
    wheels: { A: /^Cylinder\.005_/, B: /^Cylinder\.003_/ },
    tris: 9000,
    credit: [
      "DIRT BIKE OFF ROAD BIKE LOW POLY",
      "nabeelashrafphotography",
      "https://sketchfab.com/3d-models/dirt-bike-off-road-bike-low-poly-dbcca404b21348c69938207d265b6035",
    ],
  },
};
const ONLY = process.env.ONLY?.split(",");

await MeshoptEncoder.ready;
await MeshoptSimplifier.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.encoder": MeshoptEncoder });

const target = new Document();
target.createBuffer();
const targetScene = target.createScene("vehicles");
const report = {};

/** World-space bounds of one node's mesh (after flatten, its matrix is its world). */
function meshBounds(node) {
  const m = node.getWorldMatrix();
  const min = [Infinity, Infinity, Infinity],
    max = [-Infinity, -Infinity, -Infinity],
    v = [0, 0, 0],
    w = [0, 0, 0];
  for (const p of node.getMesh().listPrimitives()) {
    const pos = p.getAttribute("POSITION");
    for (let i = 0; i < pos.getCount(); i++) {
      pos.getElement(i, v);
      w[0] = m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12];
      w[1] = m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13];
      w[2] = m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14];
      for (let k = 0; k < 3; k++) {
        min[k] = Math.min(min[k], w[k]);
        max[k] = Math.max(max[k], w[k]);
      }
    }
  }
  return { min, max, c: min.map((x, k) => (x + max[k]) / 2) };
}

for (const [kind, cfg] of Object.entries(VEHICLES)) {
  if (ONLY && !ONLY.includes(kind)) continue;
  const src = path.join(dir, cfg.folder, "scene.gltf");
  if (!fs.existsSync(src)) {
    console.log("skip (not downloaded):", kind);
    continue;
  }
  const doc = await io.read(src);
  const root = doc.getRoot();
  // The specular layers (KHR_materials_specular) add four textures for no visible gain here.
  for (const e of root.listExtensionsUsed())
    if (e.extensionName === KHRMaterialsSpecular.EXTENSION_NAME) e.dispose();
  // Lights and cameras from the source scene are not part of the vehicle.
  for (const n of root.listNodes()) {
    if (n.getLight?.()) n.setExtension("KHR_lights_punctual", null);
    if (n.getCamera()) n.setCamera(null);
  }
  await doc.transform(flatten());
  const scene = root.listScenes()[0];

  // Wheels: the mesh nodes named after each wheel (the source's "<wheel>_<material>_0").
  const wheelNodes = {};
  for (const [corner, re] of Object.entries(cfg.wheels)) {
    const meshes = root.listNodes().filter((n) => n.getMesh() && re.test(n.getName()));
    if (!meshes.length) throw new Error(`${kind}: wheel ${corner} not found`);
    wheelNodes[corner] = meshes;
  }
  const isWheel = new Set(Object.values(wheelNodes).flat());

  // Orientation from the wheels: up stays +Y (the Sketchfab root makes it so); turn about Y so
  // the front axle lies toward −Z.
  const centre = (nodes) => {
    const b = nodes.map(meshBounds);
    const min = [0, 1, 2].map((k) => Math.min(...b.map((x) => x.min[k]))),
      max = [0, 1, 2].map((k) => Math.max(...b.map((x) => x.max[k])));
    return { c: min.map((x, k) => (x + max[k]) / 2), min, max };
  };
  let front, rear;
  if (kind === "bike") {
    // The handlebar (the highest point of the bike) is over the front wheel.
    const all = root.listNodes().filter((n) => n.getMesh() && !isWheel.has(n));
    let top = null;
    for (const n of all) {
      const b = meshBounds(n);
      if (!top || b.max[1] > top.max[1]) top = b;
    }
    const a = centre(wheelNodes.A).c,
      b = centre(wheelNodes.B).c;
    const da = Math.hypot(a[0] - top.c[0], a[2] - top.c[2]),
      db = Math.hypot(b[0] - top.c[0], b[2] - top.c[2]);
    const [f, r] = da < db ? ["A", "B"] : ["B", "A"];
    wheelNodes.F = wheelNodes[f];
    wheelNodes.R = wheelNodes[r];
    delete wheelNodes.A;
    delete wheelNodes.B;
    front = centre(wheelNodes.F).c;
    rear = centre(wheelNodes.R).c;
  } else {
    front = centre([...wheelNodes.FL, ...wheelNodes.FR]).c;
    rear = centre([...wheelNodes.RL, ...wheelNodes.RR]).c;
  }
  // Rotate about Y so (front − rear) points along −Z.
  const yaw = Math.atan2(front[0] - rear[0], front[2] - rear[2]);
  const turn = mat4.fromYRotation(mat4.create(), Math.PI - yaw);
  for (const node of root.listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    transformMesh(mesh, mat4.multiply(mat4.create(), turn, node.getWorldMatrix()));
    node.setMatrix(mat4.create());
  }
  for (const node of root.listNodes()) if (!node.getMesh()) node.setMatrix(mat4.create());
  // Scale to the real length, then: centred between the axles across and along, tyres at y 0.
  let b = getBounds(scene);
  const k = cfg.length / (b.max[2] - b.min[2]);
  const scale = mat4.fromScaling(mat4.create(), [k, k, k]);
  for (const node of root.listNodes()) if (node.getMesh()) transformMesh(node.getMesh(), scale);
  b = getBounds(scene);
  const wheelBox = centre(Object.values(wheelNodes).flat());
  const shift = mat4.fromTranslation(mat4.create(), [
    -(b.min[0] + b.max[0]) / 2,
    -wheelBox.min[1],
    -(wheelBox.min[2] + wheelBox.max[2]) / 2,
  ]);
  for (const node of root.listNodes()) if (node.getMesh()) transformMesh(node.getMesh(), shift);

  // Each wheel: its meshes into one node at the hub, the geometry recentred on it.
  const hubs = {};
  let radius = 0;
  for (const [corner, nodes] of Object.entries(wheelNodes)) {
    const w = centre(nodes);
    const hub = w.c;
    radius = Math.max(radius, (w.max[1] - w.min[1]) / 2);
    hubs[corner] = hub.map((v) => +v.toFixed(4));
    const wheel = doc.createNode(`wheel-${corner}`).setTranslation(hub);
    const back = mat4.fromTranslation(
      mat4.create(),
      hub.map((v) => -v),
    );
    for (const n of nodes) {
      transformMesh(n.getMesh(), back);
      n.setName(`wheel-${corner}-mesh`);
      // Under the wheel node (detached from wherever flatten left it).
      for (const p of n.listParents()) if (p.propertyType === "Node") p.removeChild(n);
      scene.removeChild(n);
      wheel.addChild(n);
    }
    scene.addChild(wheel);
  }
  // The body: everything else joined by material, simplified to its budget.
  await doc.transform(join({ keepNamed: true }), weld());
  let tris = 0;
  for (const mesh of root.listMeshes())
    for (const p of mesh.listPrimitives())
      tris += (p.getIndices()?.getCount() ?? p.getAttribute("POSITION").getCount()) / 3;
  const ratio = Math.min(1, cfg.tris / tris);
  if (ratio < 1)
    await doc.transform(
      simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.002, lockBorder: true }),
    );
  await doc.transform(
    textureCompress({ encoder: sharp, targetFormat: "webp", resize: [512, 512], quality: 84 }),
    prune({ keepLeaves: true }),
    dedup(),
  );
  let after = 0;
  for (const mesh of root.listMeshes())
    for (const p of mesh.listPrimitives())
      after += (p.getIndices()?.getCount() ?? p.getAttribute("POSITION").getCount()) / 3;
  const size = getBounds(scene);
  const fit = {
    size: size.max.map((v, i) => +(v - size.min[i]).toFixed(3)),
    min: size.min.map((v) => +v.toFixed(3)),
    max: size.max.map((v) => +v.toFixed(3)),
    hubs,
    radius: +radius.toFixed(3),
  };
  report[kind] = { trisFrom: tris, tris: after, ...fit };
  const before = new Set(target.getRoot().listNodes());
  mergeDocuments(target, doc);
  const top = target.createNode(kind).setExtras({ fit });
  targetScene.addChild(top);
  for (const s of target.getRoot().listScenes())
    if (s !== targetScene) {
      for (const child of s.listChildren()) if (!before.has(child)) top.addChild(child);
      s.dispose();
    }
}

const buffer = target.getRoot().listBuffers()[0];
for (const a of target.getRoot().listAccessors()) a.setBuffer(buffer);
for (const b of target.getRoot().listBuffers()) if (b !== buffer) b.dispose();
await target.transform(
  prune({ keepLeaves: true }),
  dedup(),
  meshopt({ encoder: MeshoptEncoder, level: "medium" }),
);
await io.write(out, target);
console.log(JSON.stringify(report, null, 1));
console.log("wrote", out, fs.statSync(out).size, "bytes");
fs.writeFileSync(
  path.join(path.dirname(out), "ATTRIBUTION-vehicles.md"),
  `# Drivable vehicles (vehicles.glb)\n\nThe battle royale's cars and motorbike, all under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Built by art/blender/br/build_vehicles.mjs.\n\n${Object.entries(
    VEHICLES,
  )
    .map(
      ([
        id,
        {
          credit: [title, author, url],
        },
      ]) =>
        `- \`${id}\`: "${title}" by ${author} (${url}), licensed under CC BY 4.0. Reoriented, rescaled, simplified and re-textured; wheels separated for steering and rolling.`,
    )
    .join("\n")}\n`,
);
