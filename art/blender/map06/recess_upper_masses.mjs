/** Repair an existing meshopt Sandgate export without rebuilding or re-encoding its textures.
 * Future full exports use the matching inset in build_sandgate.py instead.
 * node art/blender/map06/recess_upper_masses.mjs <original.glb> <repaired.glb>
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
assert(!doc.getRoot().getExtras().upperMassInset, "Already repaired");
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
      const lo = Math.min(...points.map((p) => p[1])),
        hi = Math.max(...points.map((p) => p[1]));
      const normal = vec3.normalize(
        vec3.create(),
        vec3.cross(
          vec3.create(),
          vec3.sub(vec3.create(), points[1], points[0]),
          vec3.sub(vec3.create(), points[2], points[0]),
        ),
      );
      // Only the planar upper mass caps start at the 8 m block roof. Windows, cornices,
      // sloped tiles, parapets, props and every playable-height face retain their positions.
      if (
        Math.abs(lo - 8) >= 0.004 ||
        hi - lo <= 0.6 ||
        Math.abs(normal[1]) >= 1e-5 ||
        !(Math.abs(normal[0]) > 0.99999 || Math.abs(normal[2]) > 0.99999)
      )
        continue;
      triangles++;
      const updates = changes.get(position) ?? new Map();
      changes.set(position, updates);
      ids.forEach((i, k) => {
        const local = vec3.transformMat4(
          vec3.create(),
          vec3.scaleAndAdd(vec3.create(), points[k], normal, -0.02),
          inverse,
        );
        if (updates.has(i)) assert(vec3.distance(updates.get(i), local) < 1e-5);
        updates.set(i, local);
      });
    }
  }
}
assert(triangles > 0, "No upper mass caps found");
for (const [position, updates] of changes)
  for (const [i, local] of updates) position.setElement(i, local);
doc.getRoot().setExtras({ ...doc.getRoot().getExtras(), upperMassInset: 0.02 });
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
