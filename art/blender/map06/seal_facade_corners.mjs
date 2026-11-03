/** Seal recessed inner building corners by extending their existing facade edges.
 * No new triangles, materials, draws, collision or texture encoding.
 * node art/blender/map06/seal_facade_corners.mjs <original.glb> <repaired.glb>
 * Future Blender exports implement the same overlap in Frame.wall.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS, EXTMeshoptCompression } from "@gltf-transform/extensions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import { mat4, vec3 } from "gl-matrix";

const [input, output] = process.argv.slice(2);
assert(input && output, "Expected input and output GLB paths");
await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  "meshopt.decoder": MeshoptDecoder,
  "meshopt.encoder": MeshoptEncoder,
});
const doc = await io.read(input);
assert(!doc.getRoot().getExtras().concaveSeamsSealed, "Already repaired");
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const inventory = (document) => ({
  textures: document
    .getRoot()
    .listTextures()
    .map((t) => digest(t.getImage())),
  nodes: document.getRoot().listNodes().length,
  materials: document.getRoot().listMaterials().length,
  attributes: document
    .getRoot()
    .listMeshes()
    .flatMap((mesh) =>
      mesh.listPrimitives().map((p) => ({
        indices: digest(new Uint8Array(p.getIndices().getArray().buffer)),
        data: p
          .listSemantics()
          .filter((s) => s !== "POSITION")
          .map((s) => {
            const attribute = p.getAttribute(s),
              array = attribute.getArray();
            return [s, digest(new Uint8Array(array.buffer, array.byteOffset, array.byteLength))];
          }),
      })),
    ),
  triangles: document
    .getRoot()
    .listMeshes()
    .reduce(
      (n, mesh) =>
        n + mesh.listPrimitives().reduce((n, p) => n + (p.getIndices()?.getCount() ?? 0) / 3, 0),
      0,
    ),
});
const original = inventory(doc);

// The layout is the same generated source consumed by the game and match server.
const { build } = await import("esbuild");
const bundle = await build({
  entryPoints: ["src/lib/fps/sandgate-layout.ts"],
  bundle: true,
  write: false,
  format: "esm",
});
const { SANDGATE_BOXES } = await import(
  "data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64")
);
const solids = SANDGATE_BOXES.filter((b) => b.id.startsWith("block-"));
const inside = (x, z) =>
  solids.some((b) => Math.abs(x - b.x) < b.w / 2 - 0.001 && Math.abs(z - b.z) < b.d / 2 - 0.001);
const corners = [];
for (let x = -39; x <= 39; x += 0.5)
  for (let z = -39; z <= 39; z += 0.5) {
    const open = [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ].filter(([sx, sz]) => !inside(x + sx * 0.1, z + sz * 0.1));
    if (open.length === 1) corners.push({ x, z, sx: open[0][0], sz: open[0][1] });
  }
const changes = new Map();
let triangles = 0;
for (const node of doc.getRoot().listNodes()) {
  const mesh = node.getMesh();
  if (!mesh || !/-Props|Vehicles/.test(mesh.getName())) continue;
  const world = node.getWorldMatrix(),
    inverse = mat4.invert(mat4.create(), world);
  assert(inverse);
  for (const primitive of mesh.listPrimitives()) {
    if (
      !["sandstone", "plaster", "adobe", "brickplaster", "concrete", "metal"].includes(
        primitive.getMaterial()?.getName(),
      )
    )
      continue;
    const position = primitive.getAttribute("POSITION"),
      indices = primitive.getIndices();
    if (!position || !indices) continue;
    for (let q = 0; q < indices.getCount(); q += 3) {
      const ids = [indices.getScalar(q), indices.getScalar(q + 1), indices.getScalar(q + 2)];
      const points = ids.map((i) =>
        vec3.transformMat4(vec3.create(), position.getElement(i, []), world),
      );
      const n = vec3.normalize(
        vec3.create(),
        vec3.cross(
          vec3.create(),
          vec3.sub(vec3.create(), points[1], points[0]),
          vec3.sub(vec3.create(), points[2], points[0]),
        ),
      );
      if (Math.abs(n[1]) > 1e-5) continue;
      for (const c of corners)
        for (const axis of [0, 2]) {
          const t = axis === 0 ? 2 : 0,
            sgn = axis === 0 ? c.sx : c.sz,
            ts = axis === 0 ? c.sz : c.sx;
          const line = axis === 0 ? c.x : c.z,
            end = axis === 0 ? c.z : c.x;
          // Only the recessed, outward-facing facade plane. Frames, windows, props and collision stay put.
          if (
            n[axis] * sgn < 0.99999 ||
            !points.every((p) => Math.abs(p[axis] - (line - sgn * 0.04)) < 0.004)
          )
            continue;
          const updates = changes.get(position) ?? new Map();
          let changed = false;
          ids.forEach((i, k) => {
            if (Math.abs(points[k][t] - end) > 0.004) return;
            const moved = vec3.clone(points[k]);
            moved[t] = end - ts * 0.05;
            const local = vec3.transformMat4(vec3.create(), moved, inverse);
            updates.set(i, local);
            changed = true;
          });
          if (changed) {
            triangles++;
            changes.set(position, updates);
          }
        }
    }
  }
}
assert(triangles > 0, "No recessed corner ends found");
for (const [position, updates] of changes) for (const [i, p] of updates) position.setElement(i, p);
doc.getRoot().setExtras({ ...doc.getRoot().getExtras(), concaveSeamsSealed: true });

doc
  .createExtension(EXTMeshoptCompression)
  .setRequired(true)
  .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
await io.write(output, doc);
const written = await io.read(output);
assert.deepEqual(inventory(written), original, "Texture bytes or scene topology changed");
console.log(
  JSON.stringify({
    triangles,
    vertices: [...changes.values()].reduce((n, u) => n + u.size, 0),
    unchangedTextureBytesAndTopology: true,
  }),
);
