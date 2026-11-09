/** Offline portal/stair repair. Originals remain the reproducible inputs; output is versioned. */
import fs from "node:fs";
import path from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  dequantize,
  join,
  meshopt,
  prune,
  transformPrimitive,
  weld,
} from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import { triangles, voxelBoxes } from "./build_collision.mjs";

const spec = JSON.parse(fs.readFileSync(process.argv[2] ?? "art/br/building-access.json", "utf8"));
const dir = "public/fps/br/models";
const manifest = JSON.parse(
  fs.readFileSync(path.join(dir, spec.baseManifest ?? "models.json"), "utf8"),
);
const collision = JSON.parse(
  fs.readFileSync(path.join(dir, spec.baseCollision ?? "collision.json"), "utf8"),
);
manifest.worldRevision = collision.worldRevision = `building-${spec.version}`;
collision.entrances ??= {};
await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  "meshopt.decoder": MeshoptDecoder,
  "meshopt.encoder": MeshoptEncoder,
});

// Partition a convex polygon at a plane, interpolating every vertex attribute (UVs included).
function split(poly, axis, edge, sign) {
  const inside = [],
    outside = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i],
      b = poly[(i + 1) % poly.length];
    const da = (a.POSITION[axis] - edge) * sign,
      db = (b.POSITION[axis] - edge) * sign;
    (da <= 0 ? inside : outside).push(a);
    if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
      const t = da / (da - db),
        v = {};
      for (const sem of Object.keys(a)) v[sem] = a[sem].map((n, k) => n + (b[sem][k] - n) * t);
      inside.push(v);
      outside.push(v);
    }
  }
  return [inside, outside];
}

function subtract(poly, box) {
  if (
    [0, 1, 2].some(
      (k) =>
        Math.max(...poly.map((v) => v.POSITION[k])) <= box[k] ||
        Math.min(...poly.map((v) => v.POSITION[k])) >= box[k + 3],
    )
  )
    return [poly];
  const result = [];
  for (let axis = 0; axis < 3 && poly.length >= 3; axis++) {
    for (const [edge, sign] of [
      [box[axis], -1],
      [box[axis + 3], 1],
    ]) {
      const [inside, outside] = split(poly, axis, edge, sign);
      if (outside.length >= 3) result.push(outside);
      poly = inside;
      if (poly.length < 3) break;
    }
  }
  return result;
}

function cutPrimitive(doc, p, boxes, removeGround) {
  const attrs = Object.fromEntries(p.listSemantics().map((s) => [s, p.getAttribute(s)]));
  const arrays = Object.fromEntries(Object.keys(attrs).map((s) => [s, []]));
  const index = p.getIndices(),
    count = index?.getCount() ?? attrs.POSITION.getCount();
  const emit = (poly) => {
    for (let k = 1; k < poly.length - 1; k++) {
      const tri = [poly[0], poly[k], poly[k + 1]];
      const [a, b, c] = tri.map((v) => v.POSITION);
      const ab = b.map((n, i) => n - a[i]),
        ac = c.map((n, i) => n - a[i]);
      if (
        Math.hypot(
          ab[1] * ac[2] - ab[2] * ac[1],
          ab[2] * ac[0] - ab[0] * ac[2],
          ab[0] * ac[1] - ab[1] * ac[0],
        ) < 1e-8
      )
        continue;
      for (const v of tri)
        for (const sem of Object.keys(attrs)) {
          const values = v[sem];
          if (sem === "NORMAL") {
            const len = Math.hypot(...values) || 1;
            arrays[sem].push(...values.map((n) => n / len));
          } else arrays[sem].push(...values);
        }
    }
  };
  for (let i = 0; i < count; i += 3) {
    const tri = [0, 1, 2].map((k) =>
      Object.fromEntries(
        Object.entries(attrs).map(([s, a]) => [
          s,
          a.getElement(index ? index.getScalar(i + k) : i + k, []),
        ]),
      ),
    );
    // The island owns the ground. Embedded exterior dirt sheets at y=0 otherwise compete
    // with terrain at every camera angle. Keep raised decks and all building surfaces.
    if (removeGround && tri.every((v) => Math.abs(v.POSITION[1]) < 0.035)) continue;
    let pieces = [tri];
    for (const box of boxes) pieces = pieces.flatMap((poly) => subtract(poly, box));
    pieces.forEach(emit);
  }
  p.setIndices(null);
  for (const [sem, a] of Object.entries(attrs))
    p.setAttribute(
      sem,
      doc.createAccessor().setType(a.getType()).setArray(new Float32Array(arrays[sem])),
    );
}

const faces = [
  [0, 2, 1, 0, 3, 2],
  [4, 5, 6, 4, 6, 7],
  [0, 1, 5, 0, 5, 4],
  [3, 7, 6, 3, 6, 2],
  [0, 4, 7, 0, 7, 3],
  [1, 2, 6, 1, 6, 5],
];
function addBoxes(doc, boxes, color, lod, stairs, name = "Access floor and steps") {
  const pos = [],
    normals = [];
  const shapes = boxes.map((b) => ({ b, ramp: null }));
  if (lod === 0)
    shapes.push(...stairs.flatMap((s) => stairBoxes(s, 0.2)).map((b) => ({ b, ramp: null })));
  else shapes.push(...stairs.map((s) => ({ b: s.bounds, ramp: s })));
  for (const { b, ramp } of shapes) {
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
    if (ramp)
      for (const k of [2, 3, 6, 7]) {
        const axis = ramp.axis === "x" ? 0 : 2;
        const t = (v[k][axis] - b[axis]) / (b[axis + 3] - b[axis]);
        v[k][1] = b[1] + (b[4] - b[1]) * (ramp.high === "min" ? 1 - t : t);
      }
    faces.forEach((ids, i) => {
      if (lod > 0 && !ramp && i !== 3) return; // a two-sided floor sheet, no invisible slab sides
      for (let k = 0; k < ids.length; k += 3) {
        const tri = ids.slice(k, k + 3).map((j) => v[j]);
        const ab = tri[1].map((n, j) => n - tri[0][j]),
          ac = tri[2].map((n, j) => n - tri[0][j]);
        const normal = [
            ab[1] * ac[2] - ab[2] * ac[1],
            ab[2] * ac[0] - ab[0] * ac[2],
            ab[0] * ac[1] - ab[1] * ac[0],
          ],
          len = Math.hypot(...normal);
        if (len < 1e-8) continue;
        tri.forEach((p) => {
          pos.push(...p);
          normals.push(...normal.map((n) => n / len));
        });
      }
    });
  }
  // Reuse the far LOD's vertex-coloured material so the repaired silhouette remains one draw.
  const template = doc
    .getRoot()
    .listMeshes()
    .flatMap((m) => m.listPrimitives())
    .find((p) => p.getAttribute("COLOR_0") && !p.getMaterial()?.getBaseColorTexture());
  const material =
    template?.getMaterial() ??
    doc
      .createMaterial(name)
      .setBaseColorFactor([...color, 1])
      // glTF's default metallic factor is 1: with no environment map that renders black.
      .setMetallicFactor(0)
      .setRoughnessFactor(0.95)
      .setDoubleSided(true);
  const primitive = doc
    .createPrimitive()
    .setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(new Float32Array(pos)))
    .setMaterial(material);
  if (template) {
    for (const sem of template.listSemantics()) {
      if (sem === "POSITION") continue;
      const attr = template.getAttribute(sem),
        size = attr.getElementSize(),
        a = [];
      for (let i = 0; i < pos.length / 3; i++)
        for (let k = 0; k < size; k++)
          a.push(
            sem === "COLOR_0"
              ? k === 3
                ? 1
                : color[k]
              : sem === "NORMAL"
                ? normals[i * 3 + k]
                : 0,
          );
      primitive.setAttribute(
        sem,
        doc.createAccessor().setType(attr.getType()).setArray(new Float32Array(a)),
      );
    }
  } else
    primitive.setAttribute(
      "NORMAL",
      doc.createAccessor().setType("VEC3").setArray(new Float32Array(normals)),
    );
  doc
    .getRoot()
    .listScenes()[0]
    .addChild(
      doc
        .createNode("Walkable floors and stairs")
        .setMesh(doc.createMesh().addPrimitive(primitive)),
    );
}

function stairBoxes(s, maxRise) {
  const b = s.bounds,
    axis = s.axis === "x" ? 0 : 2,
    count = Math.ceil((b[4] - b[1]) / maxRise),
    result = [];
  for (let i = 0; i < count; i++) {
    const q = [...b],
      lo = i / count,
      hi = (i + 1) / count;
    q[axis] = b[axis] + (b[axis + 3] - b[axis]) * lo;
    q[axis + 3] = b[axis] + (b[axis + 3] - b[axis]) * hi;
    q[4] = b[1] + (b[4] - b[1]) * (s.high === "min" ? 1 - lo : hi);
    result.push(q);
  }
  return result;
}

function subtractBox(box, cut) {
  if ([0, 1, 2].some((k) => box[k + 3] <= cut[k] || box[k] >= cut[k + 3])) return [box];
  const result = [],
    b = [...box];
  for (let k = 0; k < 3; k++) {
    if (b[k] < cut[k]) {
      const q = [...b];
      q[k + 3] = cut[k];
      result.push(q);
      b[k] = cut[k];
    }
    if (b[k + 3] > cut[k + 3]) {
      const q = [...b];
      q[k] = cut[k + 3];
      result.push(q);
      b[k + 3] = cut[k + 3];
    }
  }
  return result;
}

// The pristine imports, for a model whose earlier repair must be redone from scratch.
const originals = JSON.parse(fs.readFileSync(path.join(dir, "models.json"), "utf8"));
for (const [id, access] of Object.entries(spec.models)) {
  const m = manifest.models[id];
  access.floors ??= [];
  access.stairs ??= [];
  access.cuts ??= [];
  // Collision-only openings (e.g. a voxel-inflated newel post narrowing a porch gate).
  const clears = access.clear ?? [];
  if (access.collisionOnly) {
    // Collision-only stairs (the model already draws the flight): the voxel envelope of each
    // flight, up to its handrails (`clearUp` above the top tread, 1.3 m unless given), is
    // cleared, then the exact walkable profile and any solid landings go in. The meshes are
    // untouched.
    const envelopes = access.stairs.map((s) => [
      s.bounds[0] - (collision.voxel + 0.01),
      s.bounds[1] - 0.01,
      s.bounds[2] - (collision.voxel + 0.01),
      s.bounds[3] + (collision.voxel + 0.01),
      s.bounds[4] + (s.clearUp ?? 1.3),
      s.bounds[5] + (collision.voxel + 0.01),
    ]);
    collision.models[id] = [...clears, ...envelopes].reduce(
      (boxes, cut) => boxes.flatMap((b) => subtractBox(b, cut)),
      collision.models[id],
    );
    collision.models[id].push(
      ...access.stairs.flatMap((s) => stairBoxes(s, 0.05)),
      ...(access.solid ?? []),
    );
    // Towers name no doors: an empty list stops doors.ts inferring one from the new decks.
    if (access.doors) collision.entrances[id] = access.doors;
    console.log(
      id,
      JSON.stringify({
        boxes: collision.models[id].length,
        clears: clears.length,
        stairs: access.stairs.length,
      }),
    );
    continue;
  }
  if (access.source === "original") m.lods = originals.models[id].lods.map((l) => ({ ...l }));
  // meshFloors / meshStairs: the model already has the floor or steps drawn; the exact boxes
  // only replace their voxel collision (no recoloured slab over a textured floor).
  const floorCuts = access.meshFloors
    ? []
    : access.floors.map((b) => [b[0], b[1] - 0.002, b[2], b[3], b[4] + 0.002, b[5]]);
  const stairCuts = (access.meshStairs ? [] : access.stairs).map((s) => [
    s.bounds[0],
    s.bounds[1] - 0.01,
    s.bounds[2],
    s.bounds[3],
    s.bounds[4] + 0.01,
    s.bounds[5],
  ]);
  // `groups`: further drawn and solid boxes in their own colours (interior liners and ceilings,
  // painted apart from the floors). Like floors, they cut the shell faces they enclose.
  const groups = access.groups ?? [];
  const groupBoxes = groups.flatMap((g) => g.boxes);
  const groupCuts = groupBoxes.map((b) => [b[0], b[1] - 0.002, b[2], b[3], b[4] + 0.002, b[5]]);
  const cuts = [...access.cuts, ...floorCuts, ...stairCuts, ...groupCuts];
  for (let lod = 0; lod < m.lods.length; lod++) {
    const input = m.lods[lod],
      doc = await io.read(path.join("public", input.file));
    // Transform floating-point normals, not the source's packed normalized integers.
    await doc.transform(dequantize());
    const root = doc.getRoot(),
      scene = root.listScenes()[0],
      oldNodes = root.listNodes(),
      flat = [];
    for (const n of oldNodes)
      if (n.getMesh()) {
        const mesh = doc.createMesh();
        for (const original of n.getMesh().listPrimitives()) {
          const p = original.clone();
          for (const sem of p.listSemantics())
            p.setAttribute(sem, original.getAttribute(sem).clone());
          if (original.getIndices()) p.setIndices(original.getIndices().clone());
          transformPrimitive(p, n.getWorldMatrix());
          // `scale`: the whole model grows about its ground origin (a guard tower's cabin built
          // too low to stand in).
          if (access.scale)
            transformPrimitive(p, [
              access.scale, 0, 0, 0, 0, access.scale, 0, 0, 0, 0, access.scale, 0, 0, 0, 0, 1,
            ]);
          cutPrimitive(doc, p, cuts, access.removeGround);
          if (p.getAttribute("POSITION").getCount()) mesh.addPrimitive(p);
          p.getMaterial()?.setDoubleSided(true);
        }
        flat.push(doc.createNode(n.getName()).setMesh(mesh));
      }
    oldNodes.forEach((n) => n.dispose());
    flat.forEach((n) => scene.addChild(n));
    const drawFloors = access.meshFloors ? [] : access.floors,
      drawStairs = access.meshStairs ? [] : access.stairs;
    if (drawFloors.length || drawStairs.length)
      addBoxes(doc, drawFloors, access.color, lod, drawStairs);
    for (const g of groups) addBoxes(doc, g.boxes, g.color, lod, [], g.name);
    await doc.transform(
      prune(),
      join({ keepNamed: false }),
      weld(),
      meshopt({ encoder: MeshoptEncoder, level: "medium" }),
    );
    const file = `/fps/br/models/${id}.${spec.version}.lod${lod}.glb`;
    await io.write(path.join("public", file), doc);
    const geometry = await triangles(path.join("public", file));
    // A loop, not Math.max(...spread): the Superstore shell has too many vertices for the stack.
    const size = [0, 1, 2].map((k) => {
      let lo = Infinity,
        hi = -Infinity;
      for (const t of geometry)
        for (const p of t) {
          lo = Math.min(lo, p[k]);
          hi = Math.max(hi, p[k]);
        }
      return +(hi - lo).toFixed(3);
    });
    if (lod === 0) m.size = size;
    const tris = root
      .listMeshes()
      .flatMap((m) => m.listPrimitives())
      .reduce(
        (n, p) => n + (p.getIndices()?.getCount() ?? p.getAttribute("POSITION").getCount()) / 3,
        0,
      );
    m.lods[lod] = {
      ...input,
      size,
      file,
      tris,
      draws: root.listMeshes().reduce((n, m) => n + m.listPrimitives().length, 0),
      kB: Math.round(fs.statSync(path.join("public", file)).size / 1024),
    };
  }
  const tris = await triangles(path.join("public", m.lods[0].file));
  const exactFloors = [...access.floors, ...groupBoxes];
  const sampled = tris.filter(
    (t) =>
      !exactFloors.some((b) =>
        t.every((p) => p.every((v, k) => v >= b[k] - 0.005 && v <= b[k + 3] + 0.005)),
      ),
  );
  let boxes = voxelBoxes(sampled, undefined, collision.voxel);
  // Voxelisation extends a tread upwards by up to one cell. Remove that complete envelope,
  // not just the visible stair, before installing the precise walkable profile.
  const stairCollisionCuts = access.stairs
    .map((s) => [
      s.bounds[0],
      s.bounds[1] - 0.01,
      s.bounds[2],
      s.bounds[3],
      s.bounds[4] + 0.01,
      s.bounds[5],
      s.clearUp,
    ])
    .map((b) => [
      b[0] - (collision.voxel + 0.01),
      b[1],
      b[2] - (collision.voxel + 0.01),
      b[3] + (collision.voxel + 0.01),
      // A drawn flight's own rails (`clearUp` above the top tread) go with its voxel envelope.
      b[6] ? b[4] + b[6] : b[4] + (collision.voxel + 0.01),
      b[5] + (collision.voxel + 0.01),
    ]);
  const portalCollisionCuts = access.doors.map((d) =>
    d.along === "x"
      ? [d.x - d.width / 2 - 0.07, d.y0, d.z - 0.8, d.x + d.width / 2 + 0.07, d.y1, d.z + 0.8]
      : [d.x - 0.8, d.y0, d.z - d.width / 2 - 0.07, d.x + 0.8, d.y1, d.z + d.width / 2 + 0.07],
  );
  for (const cut of [...access.cuts, ...portalCollisionCuts, ...stairCollisionCuts, ...clears])
    boxes = boxes.flatMap((b) => subtractBox(b, cut));
  boxes.push(...exactFloors, ...access.stairs.flatMap((s) => stairBoxes(s, 0.05)));
  // Solid fill where the voxel shell leaves a gap a drawn surface closes (a recessed door).
  boxes.push(...(access.solid ?? []));
  collision.models[id] = boxes;
  collision.entrances[id] = access.doors;
  console.log(
    id,
    JSON.stringify({
      boxes: boxes.length,
      doors: access.doors.length,
      lods: m.lods.map((l) => l.tris),
    }),
  );
}
fs.writeFileSync(path.join(dir, `models.${spec.version}.json`), JSON.stringify(manifest));
fs.writeFileSync(path.join(dir, `collision.${spec.version}.json`), JSON.stringify(collision));
