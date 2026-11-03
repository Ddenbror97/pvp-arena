/** Verify the full sponsor footprints against the shipped map, including window/pipe clearance.
 * Run from any directory: node art/blender/map06/check_branding.mjs [map.glb]
 * Geometry-only GLB decode; no browser, image decode or runtime dependencies are added.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const bundled = await build({
  entryPoints: [path.join(root, "src/lib/fps/maps/sandgate-branding.ts")],
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
  logLevel: "error",
});
const { SANDGATE_SIGNS } = await import(
  "data:text/javascript;base64," + Buffer.from(bundled.outputFiles[0].contents).toString("base64")
);
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
loader.register((parser) => {
  parser.loadTextureImage = async () => null;
  return { name: "geometry-only-placement-check" };
});
const bytes = fs.readFileSync(process.argv[2] ?? path.join(root, "public/fps/models/sandgate.glb"));
const gltf = await loader.parseAsync(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  "",
);
gltf.scene.updateMatrixWorld(true);
const allowed = new Set(["sandstone", "plaster", "adobe", "brickplaster", "concrete", "metal"]);
let total = 0;
for (const sign of SANDGATE_SIGNS) {
  const normal = new THREE.Vector3(...sign.normal);
  const right = new THREE.Vector3(0, 1, 0).cross(normal);
  const center = new THREE.Vector3(...sign.at);
  const [w, h] = sign.size;
  assert(center.y - h / 2 > 4, `${sign.name} encroaches on playable height`);
  const nx = Math.ceil(w / 0.04),
    ny = Math.ceil(h / 0.04);
  for (let ix = 0; ix <= nx; ix++)
    for (let iy = 0; iy <= ny; iy++) {
      // Include all edges/corners. Even the empty tail notch must have clear wall behind it.
      const point = center.clone().addScaledVector(right, w * (ix / nx - 0.5));
      point.y += h * (iy / ny - 0.5);
      const ray = new THREE.Raycaster(
        point.clone().addScaledVector(normal, 0.4),
        normal.clone().negate(),
        0,
        0.85,
      );
      const hit = ray.intersectObject(gltf.scene, true)[0];
      const material = hit?.object.material;
      assert(
        hit &&
          allowed.has(material?.name) &&
          /-Props|Vehicles/.test(hit.object.name) &&
          Math.abs(hit.point.clone().sub(point).dot(normal)) <= 0.012 &&
          hit.face.normal.clone().transformDirection(hit.object.matrixWorld).dot(normal) >= 0.999,
        `${sign.name} crosses a facade feature at ${point.toArray().join(",")}`,
      );
      total++;
    }
}
console.log(JSON.stringify({ signs: SANDGATE_SIGNS.length, footprintSamples: total, clear: true }));
