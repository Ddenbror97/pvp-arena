/**
 * Renders a side view of each tree model (LOD0) on a transparent background, orthographic and
 * evenly lit, for the far-vegetation impostors (crossed quads). Driven by capture.mjs.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

declare global {
  interface Window {
    impostor: (file: string, w: number, h: number) => Promise<{ width: number; height: number }>;
  }
}
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  preserveDrawingBuffer: true,
});
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x000000, 0);
document.body.appendChild(renderer.domElement);
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);

window.impostor = async (file, w, h) => {
  renderer.setSize(w, h);
  const scene = new THREE.Scene();
  // Soft, mostly ambient light: the impostor is lit again in the game, so bake little.
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8070, 2.2));
  const sun = new THREE.DirectionalLight(0xffffff, 0.6);
  sun.position.set(0.3, 1, 0.6);
  scene.add(sun);
  const gltf = await loader.loadAsync(file);
  scene.add(gltf.scene);
  const box = new THREE.Box3().setFromObject(gltf.scene);
  const size = box.getSize(new THREE.Vector3());
  const width = Math.max(size.x, size.z);
  const camera = new THREE.OrthographicCamera(-width / 2, width / 2, size.y, 0, -100, 100);
  camera.position.set(0, 0, 50);
  camera.lookAt(0, 0, 0);
  renderer.render(scene, camera);
  return { width, height: size.y };
};
