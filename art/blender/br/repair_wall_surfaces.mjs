/** Render-only repair over the versioned access assets. Collision and original sources stay unchanged. */
import fs from "node:fs";
import path from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  dequantize,
  transformPrimitive,
  weld,
  meshopt,
  prune,
  simplify,
} from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import { resolveCoplanarSurfaces } from "./coplanar-surfaces.mjs";
await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready]);
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });
const dir = "public/fps/br/models",
  manifest = JSON.parse(
    fs.readFileSync(path.join(dir, process.argv[2] ?? "models.access-v1.json")),
  );
const version = process.argv[3] ?? "walls-v1";
const selection = process.argv[4];
const only = selection
  ? new Set(
      selection.endsWith(".json")
        ? Object.keys(JSON.parse(fs.readFileSync(selection, "utf8")).models)
        : selection.split(","),
    )
  : null;
manifest.surfaceRevision = version.replace("walls-", "wall-surfaces-");
const report = [];
for (const [id, model] of Object.entries(manifest.models)) {
  if (only && !only.has(id)) continue;
  if (
    model.class !== "building" &&
    !["superstore", "garage", "shed", "rural-mobile-home"].includes(id)
  )
    continue;
  for (const [level, lod] of model.lods.entries()) {
    const doc = await io.read("public" + lod.file);
    await doc.transform(dequantize());
    const root = doc.getRoot(),
      nodes = [...root.listNodes()],
      scene = root.listScenes()[0],
      primitives = [],
      faces = [];
    for (const node of nodes) {
      if (!node.getMesh()) continue;
      const mesh = doc.createMesh();
      for (const original of node.getMesh().listPrimitives()) {
        if (original.getMode() !== 4) throw Error("Non-triangle building primitive " + id);
        const p = original.clone();
        for (const sem of p.listSemantics())
          p.setAttribute(sem, original.getAttribute(sem).clone());
        if (p.getIndices()) p.setIndices(p.getIndices().clone());
        transformPrimitive(p, node.getWorldMatrix());
        mesh.addPrimitive(p);
        const attrs = Object.fromEntries(p.listSemantics().map((s) => [s, p.getAttribute(s)])),
          indices = p.getIndices(),
          count = indices?.getCount() ?? attrs.POSITION.getCount();
        const ref = {
          p,
          attrs,
          mesh,
          values: Object.fromEntries(Object.keys(attrs).map((s) => [s, []])),
        };
        primitives.push(ref);
        for (let i = 0; i < count; i += 3)
          faces.push({
            ref,
            opaque:
              (p.getMaterial()?.getAlphaMode() ?? "OPAQUE") === "OPAQUE" &&
              (p.getMaterial()?.getBaseColorFactor()[3] ?? 1) === 1,
            doubleSided: p.getMaterial()?.getDoubleSided() ?? false,
            priority: /trim|frame|sign/i.test(p.getMaterial()?.getName() ?? "") ? 1 : 0,
            vertices: [0, 1, 2].map((k) =>
              Object.fromEntries(
                Object.entries(attrs).map(([sem, a]) => [
                  sem,
                  a.getElement(indices ? indices.getScalar(i + k) : i + k, []),
                ]),
              ),
            ),
          });
      }
      scene.addChild(doc.createNode(node.getName()).setMesh(mesh));
    }
    const repaired = resolveCoplanarSurfaces(faces);
    if (!repaired.overlapsResolved) continue;
    nodes.forEach((n) => n.dispose());
    for (const face of repaired.faces)
      for (const v of face.vertices)
        for (const sem of Object.keys(face.ref.attrs)) {
          const values = v[sem];
          if (sem === "NORMAL") {
            const length = Math.hypot(...values) || 1;
            face.ref.values[sem].push(...values.map((n) => n / length));
          } else face.ref.values[sem].push(...values);
        }
    for (const { p, attrs, mesh, values } of primitives) {
      if (!values.POSITION.length) {
        mesh.removePrimitive(p);
        continue;
      }
      p.setIndices(null);
      for (const [sem, a] of Object.entries(attrs))
        p.setAttribute(
          sem,
          doc.createAccessor().setType(a.getType()).setArray(new Float32Array(values[sem])),
        );
    }
    await doc.transform(prune(), weld());
    const triangleCount = () =>
      root
        .listMeshes()
        .flatMap((m) => m.listPrimitives())
        .reduce(
          (n, p) => n + (p.getIndices()?.getCount() ?? p.getAttribute("POSITION").getCount()) / 3,
          0,
        );
    if (level > 0 && triangleCount() > model.lods[level - 1].tris) {
      // Remove redundant collinear subdivisions only: no geometric approximation/quality reduction.
      await doc.transform(
        simplify({
          simplifier: MeshoptSimplifier,
          ratio: model.lods[level - 1].tris / triangleCount(),
          error: 0,
        }),
      );
      if (triangleCount() > model.lods[level - 1].tris)
        throw Error("LOD budget requires an exact repair: " + id);
    }
    await doc.transform(
      meshopt({ encoder: MeshoptEncoder, level: "medium", quantizePosition: 16 }),
    );
    const file = `/fps/br/models/${id}.${version}.lod${level}.glb`;
    await io.write("public" + file, doc);
    const tris = root
      .listMeshes()
      .flatMap((m) => m.listPrimitives())
      .reduce(
        (n, p) => n + (p.getIndices()?.getCount() ?? p.getAttribute("POSITION").getCount()) / 3,
        0,
      );
    const result = {
      id,
      level,
      before: lod.tris,
      after: tris,
      overlaps: repaired.overlapsResolved,
      area: repaired.coveredArea,
    };
    report.push(result);
    console.log(JSON.stringify(result));
    model.lods[level] = {
      ...lod,
      file,
      tris,
      draws: root.listMeshes().reduce((n, m) => n + m.listPrimitives().length, 0),
      kB: Math.round(fs.statSync("public" + file).size / 1024),
    };
  }
}
fs.writeFileSync(path.join(dir, `models.${version}.json`), JSON.stringify(manifest));
fs.mkdirSync("art/br/build", { recursive: true });
fs.writeFileSync(`art/br/build/${manifest.surfaceRevision}.json`, JSON.stringify(report, null, 2));
