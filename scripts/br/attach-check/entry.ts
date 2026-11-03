import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { createBrViewmodel } from "@/lib/fps/br/br-viewmodel";
import type { Gun } from "@/lib/fps/br/inventory";

/** Viewmodel + attachment check: renders one gun/attachment combination per call. */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(960, 540);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const vm = createBrViewmodel(renderer, loader, location.origin + "/");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8fa7bd);
const camera = new THREE.PerspectiveCamera(75, 960 / 540, 0.1, 100);
scene.add(new THREE.GridHelper(40, 40));
camera.position.set(0, 1.6, 0);
// Crosshair reference.
const w = window as unknown as Record<string, unknown>;
w.ready = vm.ready.then(() => true);
w.show = (gun: Gun, aiming: boolean, side = false) => {
  let t = 0;
  vm.setGun(gun);
  for (let i = 0; i < 40; i++) {
    t += 16;
    vm.update(16, 10_000 + t, {
      gun,
      aiming,
      reload: 0,
      empty: false,
      moving: false,
      sprinting: false,
      airborne: false,
      lookX: 0,
      lookY: 0,
      silenced: false,
      flash: false,
    });
    vm.setGun(gun);
  }
  camera.position.set(0, 1.6, 0);
  camera.rotation.set(0, 0, 0);
  if (side) {
    // Side view: the gun turned broadside and pushed out so all of it is in frame.
    vm.group.rotation.set(0, Math.PI / 2, 0);
    vm.group.position.set(0.2, -0.02, -1.15);
  }
  renderer.render(scene, camera);
  vm.render(camera, false);
  return true;
};
