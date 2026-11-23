/**
 * Elevations of a model (elevations/capture.mjs): each side of its near LOD drawn flat-on in an
 * orthographic view at a fixed scale, in its own colours without light (albedo), so a facade's
 * painted windows can be found and measured in model space.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

declare global {
  interface Window {
    elevation: (
      file: string,
      side: string,
      pxPerM: number,
    ) => Promise<{ box: number[]; width: number; height: number }>;
  }
}
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const cache = new Map<string, THREE.Object3D>();

window.elevation = async (file, side, pxPerM) => {
  let model = cache.get(file);
  if (!model) {
    model = (await loader.loadAsync(file)).scene;
    model.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const old = mesh.material as THREE.MeshStandardMaterial;
      mesh.material = new THREE.MeshBasicMaterial({
        map: old.map ?? null,
        color: old.color ?? new THREE.Color(1, 1, 1),
        vertexColors: !!mesh.geometry.attributes["color"],
        side: THREE.DoubleSide,
        transparent: old.transparent,
        opacity: old.opacity,
        alphaTest: old.alphaTest,
      });
    });
    cache.set(file, model);
  }
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xff00ff);
  scene.add(model);
  const box = new THREE.Box3().setFromObject(model);
  const [x0, y0, z0] = box.min.toArray(),
    [x1, y1, z1] = box.max.toArray();
  // Looking in from each side: front (+z), back (−z), left (−x), right (+x); u runs along the
  // side as the audit's facades do (x for front/back, z for left/right, low to high).
  const along = side === "front" || side === "back" ? [x0, x1] : [z0, z1];
  const w = Math.ceil((along[1]! - along[0]!) * pxPerM),
    h = Math.ceil((y1 - y0) * pxPerM);
  renderer.setSize(w, h, false);
  // An orthographic camera whose left edge is u = along[0] (mirrored where looking along −u).
  const cam = new THREE.OrthographicCamera(
    -w / 2 / pxPerM,
    w / 2 / pxPerM,
    h / 2 / pxPerM,
    -h / 2 / pxPerM,
    0.01,
    1000,
  );
  const cx = (x0 + x1) / 2,
    cy = (y0 + y1) / 2,
    cz = (z0 + z1) / 2;
  const far = 400;
  if (side === "front") cam.position.set(cx, cy, z1 + far);
  if (side === "back") cam.position.set(cx, cy, z0 - far);
  if (side === "left") cam.position.set(x0 - far, cy, cz);
  if (side === "right") cam.position.set(x1 + far, cy, cz);
  cam.lookAt(cx, cy, cz);
  renderer.render(scene, cam);
  scene.remove(model);
  return { box: [x0, y0, z0, x1, y1, z1], width: w, height: h };
};
