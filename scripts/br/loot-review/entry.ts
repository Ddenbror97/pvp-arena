/**
 * Ground-loot review: the game's own loot renderer (createLootRenderer) lays every gun and ammo
 * box on a flat patch of ground, lit like the island's daytime, for side-by-side screenshots.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { createLootRenderer } from "@/lib/fps/br/loot-renderer";
import { itemCode, type LootRow } from "@/lib/fps/br/loot-world";
import type { ItemId } from "@/lib/fps/br/items";

const W = innerWidth,
  H = innerHeight;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(W, H);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fb4c8);
scene.add(new THREE.HemisphereLight(0xdfe9f5, 0x55603f, 1.4));
const sun = new THREE.DirectionalLight(0xfff1dc, 2.4);
sun.position.set(4, 8, 3);
scene.add(sun);
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 40).rotateX(-Math.PI / 2),
  new THREE.MeshStandardMaterial({ color: 0x6f6a55, roughness: 1 }),
);
scene.add(ground);
const camera = new THREE.PerspectiveCamera(50, W / H, 0.05, 100);
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const loot = createLootRenderer(scene, loader, location.origin + "/");
const LAYOUT: ItemId[][] = [
  ["ak47", "m4", "awp", "mp5", "deagle"],
  ["ammo-rifle", "ammo-sniper", "ammo-9mm", "ammo-50ae"],
];
const rows: LootRow[] = [];
let id = 1;
LAYOUT.forEach((line, r) =>
  line.forEach((item, i) => {
    const x = (i - (line.length - 1) / 2) * (r === 0 ? 0.95 : 0.6);
    const z = r === 0 ? -0.55 : 0.35;
    const gun = r === 0;
    rows.push([id++, itemCode(item), x, 0, z, gun ? 1 : 30, -1, gun ? 7 : -1, -1, -1] as LootRow);
  }),
);
loot.apply({ add: rows, del: [] });
const eye = new THREE.Vector3();
function view(name: string) {
  if (name === "top") camera.position.set(0, 3.2, 1.6);
  else if (name === "player") camera.position.set(0, 1.62, 2.4);
  else camera.position.set(0.9, 0.9, 1.6);
  camera.lookAt(0, 0, -0.1);
  eye.copy(camera.position);
  loot.update(eye);
  renderer.render(scene, camera);
}
(window as unknown as { review: unknown }).review = {
  ready: loot.ready.then(() => true),
  view,
};
