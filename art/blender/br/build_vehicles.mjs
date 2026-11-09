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
 * A black-and-white police cruiser on the sedan (vehicle frame: nose −z, tyres at y 0): the
 * doors and the roof painted white (the body's triangles there move to a plain white paint),
 * "POLICE" along both front-to-rear doors, and a light bar on the roof whose red and blue
 * halves are named so the game can flash them while someone drives.
 */
async function policeLivery(doc, scene, isWheel) {
  const white = doc
    .createMaterial("police-white")
    .setBaseColorFactor([0.86, 0.87, 0.88, 1])
    .setRoughnessFactor(0.32)
    .setMetallicFactor(0.1);
  // The painted areas, as boxes cut out of the body with clean straight edges (each triangle is
  // clipped against the box's planes, not just sorted by its centre: no saw-tooth edges). The
  // doors: between the wheel arches, from the sill crease to the window line, facing out; the
  // roof: its top, between the windscreen and the rear window.
  const areas = [
    {
      y: [0.36, 0.86],
      z: [-0.86, 0.98],
      face: (n, c) => Math.abs(n[0]) > 0.45 && Math.sign(n[0]) === Math.sign(c[0]),
    },
    { y: [1.18, 9], z: [-0.3, 1.15], face: (n) => n[1] > 0.6 },
  ];
  let side = 0;
  for (const node of scene.listChildren().flatMap(function walk(n) {
    return [n, ...n.listChildren().flatMap(walk)];
  })) {
    const mesh = node.getMesh();
    if (!mesh || isWheel.has(node)) continue;
    for (const prim of mesh.listPrimitives()) {
      if (!/Bodymat/.test(prim.getMaterial()?.getName() ?? "")) continue;
      const idx = prim.getIndices();
      if (!idx) continue;
      const sems = prim.listSemantics();
      const attrs = sems.map((sem) => prim.getAttribute(sem));
      // Vertices as flat attribute lists (all semantics), so clipping can interpolate them.
      const verts = [];
      const count = attrs[0].getCount();
      for (let i = 0; i < count; i++) verts.push(attrs.map((a) => a.getElement(i, [])));
      const P = sems.indexOf("POSITION");
      const lerp = (a, b, t) => a.map((arr, k) => arr.map((x, j) => x + (b[k][j] - x) * t));
      const addVert = (vtx) => verts.push(vtx) - 1;
      // Split a polygon (vertex indices) by axis-aligned plane p[axis] = at.
      const split = (poly, axis, at) => {
        const lo = [],
          hi = [];
        for (let i = 0; i < poly.length; i++) {
          const a = poly[i],
            b = poly[(i + 1) % poly.length];
          const va = verts[a][P][axis] - at,
            vb = verts[b][P][axis] - at;
          (va < 0 ? lo : hi).push(a);
          if (va < 0 !== vb < 0) {
            const m = addVert(lerp(verts[a], verts[b], va / (va - vb)));
            lo.push(m);
            hi.push(m);
          }
        }
        return [lo.length >= 3 ? lo : null, hi.length >= 3 ? hi : null];
      };
      const fan = (poly, into) => {
        for (let i = 1; i + 1 < poly.length; i++) into.push(poly[0], poly[i], poly[i + 1]);
      };
      const keep = [],
        paint = [];
      for (let t = 0; t < idx.getCount(); t += 3) {
        const tri = [idx.getScalar(t), idx.getScalar(t + 1), idx.getScalar(t + 2)];
        const [p0, p1, p2] = tri.map((i) => verts[i][P]);
        const e1 = [0, 1, 2].map((k) => p1[k] - p0[k]),
          e2 = [0, 1, 2].map((k) => p2[k] - p0[k]);
        const n = [
          e1[1] * e2[2] - e1[2] * e2[1],
          e1[2] * e2[0] - e1[0] * e2[2],
          e1[0] * e2[1] - e1[1] * e2[0],
        ];
        const l = Math.hypot(...n) || 1;
        const un = n.map((x) => x / l);
        const c = [0, 1, 2].map((k) => (p0[k] + p1[k] + p2[k]) / 3);
        const area = areas.find((a) => a.face(un, c));
        if (!area) {
          keep.push(...tri);
          continue;
        }
        // Peel off what lies outside each of the box's four planes; the rest is painted.
        let poly = tri;
        for (const [axis, at, inside] of [
          [1, area.y[0], 1],
          [1, area.y[1], 0],
          [2, area.z[0], 1],
          [2, area.z[1], 0],
        ]) {
          const [lo, hi] = split(poly, axis, at);
          const out = inside ? lo : hi;
          poly = inside ? hi : lo;
          if (out) fan(out, keep);
          if (!poly) break;
        }
        if (poly) {
          fan(poly, paint);
          if (area === areas[0]) side = Math.max(side, Math.abs(c[0]));
        }
      }
      if (!paint.length) continue;
      // New attribute arrays (the originals plus the clip points) shared by both parts.
      sems.forEach((sem, k) => {
        const a = attrs[k];
        const size = a.getElementSize();
        const arr = new Float32Array(verts.length * size);
        verts.forEach((vtx, i) => arr.set(vtx[k], i * size));
        const next = doc.createAccessor().setType(a.getType()).setArray(arr).setNormalized(false);
        prim.setAttribute(sem, next);
      });
      const make = (list) =>
        doc
          .createAccessor()
          .setType("SCALAR")
          .setArray(verts.length > 65535 ? new Uint32Array(list) : new Uint16Array(list));
      prim.setIndices(make(keep));
      const painted = doc.createPrimitive().setIndices(make(paint)).setMaterial(white);
      for (const sem of sems) painted.setAttribute(sem, prim.getAttribute(sem));
      mesh.addPrimitive(painted);
    }
  }
  // "POLICE" decals: a quad on each side, just off the door skin.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="128"><text x="512" y="100" font-family="DejaVu Sans" font-weight="bold" font-size="104" letter-spacing="10" text-anchor="middle" fill="#0d1014">POLICE</text></svg>`;
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  const decal = doc
    .createMaterial("police-decal")
    .setBaseColorTexture(doc.createTexture("police-text").setImage(png).setMimeType("image/png"))
    .setAlphaMode("BLEND")
    .setRoughnessFactor(0.4)
    .setMetallicFactor(0);
  const quad = (name, corners, uvs, normal) => {
    const prim = doc
      .createPrimitive()
      .setAttribute(
        "POSITION",
        doc.createAccessor().setType("VEC3").setArray(new Float32Array(corners.flat())),
      )
      .setAttribute(
        "NORMAL",
        doc
          .createAccessor()
          .setType("VEC3")
          .setArray(new Float32Array([normal, normal, normal, normal].flat())),
      )
      .setAttribute(
        "TEXCOORD_0",
        doc.createAccessor().setType("VEC2").setArray(new Float32Array(uvs.flat())),
      )
      .setIndices(
        doc
          .createAccessor()
          .setType("SCALAR")
          .setArray(new Uint16Array([0, 1, 2, 0, 2, 3])),
      )
      .setMaterial(decal);
    scene.addChild(doc.createNode(name).setMesh(doc.createMesh(name).addPrimitive(prim)));
  };
  const x = side + 0.012,
    y0 = 0.54,
    y1 = 0.68,
    z0 = -0.62,
    z1 = 0.78;
  // Left side (seen from −x): the word runs front (−z) to back; right side: back to front.
  quad(
    "police-decal-L",
    [
      [-x, y0, z0],
      [-x, y0, z1],
      [-x, y1, z1],
      [-x, y1, z0],
    ],
    [
      [0, 1],
      [1, 1],
      [1, 0],
      [0, 0],
    ],
    [-1, 0, 0],
  );
  quad(
    "police-decal-R",
    [
      [x, y0, z1],
      [x, y0, z0],
      [x, y1, z0],
      [x, y1, z1],
    ],
    [
      [0, 1],
      [1, 1],
      [1, 0],
      [0, 0],
    ],
    [1, 0, 0],
  );
  // The light bar across the roof: a dark base and red (driver's side) and blue lenses.
  const box = (name, mat, [cx, cy, cz], [sx, sy, sz]) => {
    const p = [],
      nrm = [],
      ids = [];
    const faces = [
      [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ],
      [
        [-1, 0, 0],
        [0, 1, 0],
        [0, 0, -1],
      ],
      [
        [0, 1, 0],
        [0, 0, 1],
        [1, 0, 0],
      ],
      [
        [0, -1, 0],
        [0, 0, 1],
        [-1, 0, 0],
      ],
      [
        [0, 0, 1],
        [1, 0, 0],
        [0, 1, 0],
      ],
      [
        [0, 0, -1],
        [-1, 0, 0],
        [0, 1, 0],
      ],
    ];
    for (const [n, a, b] of faces) {
      const base = p.length / 3;
      for (const [sa, sb] of [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ]) {
        p.push(
          cx + ((n[0] + a[0] * sa + b[0] * sb) * sx) / 2,
          cy + ((n[1] + a[1] * sa + b[1] * sb) * sy) / 2,
          cz + ((n[2] + a[2] * sa + b[2] * sb) * sz) / 2,
        );
        nrm.push(...n);
      }
      ids.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    const prim = doc
      .createPrimitive()
      .setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(new Float32Array(p)))
      .setAttribute("NORMAL", doc.createAccessor().setType("VEC3").setArray(new Float32Array(nrm)))
      .setIndices(doc.createAccessor().setType("SCALAR").setArray(new Uint16Array(ids)))
      .setMaterial(mat);
    scene.addChild(doc.createNode(name).setMesh(doc.createMesh(name).addPrimitive(prim)));
  };
  const lens = (name, rgb) =>
    doc
      .createMaterial(name)
      .setBaseColorFactor([...rgb, 1])
      .setEmissiveFactor(rgb.map((c) => c * 0.35))
      .setRoughnessFactor(0.2);
  const roofY = 1.315,
    roofZ = 0.3;
  box(
    "lightbar-base",
    doc
      .createMaterial("lightbar-base")
      .setBaseColorFactor([0.05, 0.05, 0.06, 1])
      .setRoughnessFactor(0.6),
    [0, roofY + 0.03, roofZ],
    [1.12, 0.06, 0.24],
  );
  box(
    "lightbar-red",
    lens("lightbar-red", [0.85, 0.06, 0.05]),
    [-0.29, roofY + 0.1, roofZ],
    [0.52, 0.09, 0.2],
  );
  box(
    "lightbar-blue",
    lens("lightbar-blue", [0.05, 0.2, 0.95]),
    [0.29, roofY + 0.1, roofZ],
    [0.52, 0.09, 0.2],
  );
}

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
    // Owner, 2026-11-09: "make the black car police design" (as H1Z1's police cruiser).
    livery: "police",
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
    // wheel is the one under the bike's highest point) — except that on this model the highest
    // point is the tail (seen in the game, 2026-11-09: the bike rode backwards), so the other.
    wheels: { A: /^Cylinder\.005_/, B: /^Cylinder\.003_/ },
    tailHighest: true,
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
    const [f, r] = da < db !== !!cfg.tailHighest ? ["A", "B"] : ["B", "A"];
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
  if (cfg.livery === "police") await policeLivery(doc, scene, isWheel);

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
  // (The light bar's lenses keep their names: the game flashes them.)
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
