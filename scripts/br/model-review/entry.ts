import { WORLD_ASSETS } from "@/lib/fps/br/world";
/**
 * Model review page: renders one processed Project Island model at its three LODs side by
 * side (same camera), next to a 1.8 m figure for scale. Driven by capture.mjs.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

type Manifest = {
  models: Record<
    string,
    { size: number[]; lods: Array<{ file: string; tris: number; draws: number }> }
  >;
};
declare global {
  interface Window {
    review: {
      ready: Promise<Manifest>;
      show: (id: string, angle?: number, view?: { top?: boolean; cut?: number }) => Promise<void>;
    };
  }
}

const W = 1500,
  H = 500;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(W, H);
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.setScissorTest(true);
document.body.appendChild(renderer.domElement);
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);

function stage() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9fb8cc);
  scene.add(new THREE.HemisphereLight(0xc9dcf0, 0x5a5040, 1.2));
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.4);
  sun.position.set(-0.55, 0.62, 0.45);
  scene.add(sun);
  return scene;
}

const ready = fetch(new URLSearchParams(location.search).get("models") ?? WORLD_ASSETS.models).then(
  (r) => r.json() as Promise<Manifest>,
);
window.review = {
  ready,
  async show(id, angle = 0, view?: { top?: boolean; cut?: number }) {
    const manifest = await ready;
    const m = manifest.models[id]!;
    const [sx, sy, sz] = m.size as [number, number, number];
    const span = Math.max(sx, sy, sz, 2.2);
    const scenes = await Promise.all(
      m.lods.map(async (lod) => {
        const scene = stage();
        const gltf = await loader.loadAsync(lod.file);
        scene.add(gltf.scene);
        const ground = new THREE.Mesh(
          new THREE.PlaneGeometry(span * 4, span * 4),
          new THREE.MeshStandardMaterial({ color: 0x6f6a5c, roughness: 1 }),
        );
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.01;
        scene.add(ground);
        // 1.8 m person-sized marker beside the model.
        const person = new THREE.Mesh(
          new THREE.CylinderGeometry(0.25, 0.25, 1.8, 10),
          new THREE.MeshStandardMaterial({ color: 0xd0302a }),
        );
        person.position.set(sx / 2 + 1, 0.9, 0);
        scene.add(person);
        return scene;
      }),
    );
    let camera: THREE.Camera;
    renderer.clippingPlanes = [];
    if (view?.top) {
      // A plan from above (+x right, +z down), a 1 m grid, everything above `cut` m clipped.
      const half = span * 0.6,
        aspect = W / 3 / H;
      const ortho = new THREE.OrthographicCamera(
        -half * aspect,
        half * aspect,
        half,
        -half,
        0.05,
        5000,
      );
      ortho.position.set(0, 500, 0);
      ortho.up.set(0, 0, -1);
      ortho.lookAt(0, 0, 0);
      camera = ortho;
      if (view.cut !== undefined)
        renderer.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, -1, 0), view.cut)];
      for (const scene of scenes) {
        const grid = new THREE.GridHelper(span * 2, Math.round(span * 2), 0xff3030, 0x303030);
        grid.position.y = 0.02;
        scene.add(grid);
      }
    } else {
      const persp = new THREE.PerspectiveCamera(40, W / 3 / H, 0.05, 5000);
      const d = span * 1.6;
      const a = 0.7 + angle;
      persp.position.set(Math.sin(a) * d * 1.17, sy * 0.55 + d * 0.3, Math.cos(a) * d * 1.17);
      persp.lookAt(0, sy * 0.4, 0);
      camera = persp;
    }
    scenes.forEach((scene, i) => {
      renderer.setViewport((i * W) / 3, 0, W / 3, H);
      renderer.setScissor((i * W) / 3, 0, W / 3, H);
      renderer.render(scene, camera);
    });
  },
};
