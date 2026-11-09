/**
 * Interior review page: one Project Island model (LOD0) with its fitted door panels, seen from
 * any eye point in model space. Driven by capture.mjs to check, building by building, that each
 * door fills its opening and that the rooms behind it look right.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { islandDoors } from "@/lib/fps/br/doors";
import { createDoorRenderer, type DoorLookData } from "@/lib/fps/br/door-renderer";
import type { CollisionData } from "@/lib/fps/br/static-world";
import { DOOR_ASSETS, WORLD_ASSETS } from "@/lib/fps/br/world";

type Manifest = { models: Record<string, { size: number[]; lods: Array<{ file: string }> }> };
type Door = { x: number; z: number; y0: number; y1: number; along: "x" | "z"; width: number };
declare global {
  interface Window {
    interior: {
      ready: Promise<void>;
      load: (id: string) => Promise<{ doors: Door[]; size: number[]; boxes: number[][] }>;
      view: (eye: number[], target: number[], open: boolean, boxes?: boolean) => void;
    };
  }
}

const W = 960,
  H = 540;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(W, H);
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const camera = new THREE.PerspectiveCamera(70, W / H, 0.05, 2000);

let manifest: Manifest,
  collision: CollisionData,
  look: { data: DoorLookData; atlas: THREE.Texture };
const ready = (async () => {
  [manifest, collision] = await Promise.all([
    fetch(new URLSearchParams(location.search).get("models") ?? WORLD_ASSETS.models).then((r) =>
      r.json(),
    ),
    fetch(new URLSearchParams(location.search).get("collision") ?? WORLD_ASSETS.collision).then(
      (r) => r.json(),
    ),
  ]);
  const data = (await fetch(DOOR_ASSETS.meta).then((r) => r.json())) as DoorLookData;
  const atlas = await new THREE.TextureLoader().loadAsync(DOOR_ASSETS.atlas);
  atlas.colorSpace = THREE.SRGBColorSpace;
  look = { data, atlas };
})();

let scene = new THREE.Scene();
let doors: ReturnType<typeof createDoorRenderer> | null = null;
let doorCount = 0;
let wire: THREE.Object3D | null = null;
let clock = 1000;
window.interior = {
  ready,
  async load(id) {
    await ready;
    doors?.dispose();
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x9fb8cc);
    scene.add(new THREE.HemisphereLight(0xc9dcf0, 0x5a5040, 1.2));
    const sun = new THREE.DirectionalLight(0xfff0d8, 2.4);
    sun.position.set(-0.55, 0.62, 0.45);
    scene.add(sun);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(600, 600),
      new THREE.MeshStandardMaterial({ color: 0x6f6a5c, roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    scene.add(ground);
    const m = manifest.models[id]!;
    scene.add((await loader.loadAsync(m.lods[0]!.file)).scene);
    const set = islandDoors([{ model: id, turn: 0, x: 0, y: 0, z: 0, poi: "review" }], collision);
    doorCount = set.doors.length;
    doors = createDoorRenderer(scene, set, look);
    const boxes = collision.models[id] ?? [];
    const g = new THREE.BufferGeometry();
    const pos: number[] = [];
    for (const b of boxes) {
      const [x0, y0, z0, x1, y1, z1] = b as [number, number, number, number, number, number];
      const c = [
        [x0, y0, z0],
        [x1, y0, z0],
        [x1, y0, z1],
        [x0, y0, z1],
        [x0, y1, z0],
        [x1, y1, z0],
        [x1, y1, z1],
        [x0, y1, z1],
      ];
      for (const [a, b2] of [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 0],
        [4, 5],
        [5, 6],
        [6, 7],
        [7, 4],
        [0, 4],
        [1, 5],
        [2, 6],
        [3, 7],
      ])
        pos.push(...c[a]!, ...c[b2]!);
    }
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    wire = new THREE.LineSegments(
      g,
      new THREE.LineBasicMaterial({ color: 0xff2020, depthTest: false }),
    );
    wire.renderOrder = 10;
    return { doors: set.doors as unknown as Door[], size: m.size, boxes };
  },
  view(eye, target, open, boxes = false) {
    const state = new Uint8Array(doorCount).fill(open ? 1 : 0);
    doors?.apply({ open: open ? [...Array(doorCount).keys()] : [] }, state);
    camera.position.set(eye[0]!, eye[1]!, eye[2]!);
    camera.lookAt(target[0]!, target[1]!, target[2]!);
    clock += 1000;
    doors?.update(16, clock, camera.position);
    if (wire) {
      if (boxes) scene.add(wire);
      else scene.remove(wire);
    }
    renderer.render(scene, camera);
  },
};
