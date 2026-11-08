import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { createCharacter } from "@/lib/fps/authored-character";
import { createWeaponKit } from "@/lib/fps/weapon";
import {
  createCanopy,
  DIVE_SWING,
  HARNESS_Y,
  hangCanopy,
  hangPilot,
  loadCanopy,
  type CanopyPose,
} from "@/lib/fps/br/canopy";

/**
 * Parachute check (owner's parachute spec §5): the game's canopy and character, posed by the
 * game's own code, from the rear, side, front, top, low and three-quarter views, and from the
 * gameplay camera. Driven by capture.mjs.
 */
const W = 960,
  H = 540;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(W, H);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa3b8c9);
scene.fog = new THREE.Fog(0xa3b8c9, 300, 1600);
scene.add(new THREE.HemisphereLight(0xe4eaff, 0x40382c, 2));
const sun = new THREE.DirectionalLight(0xfff0d8, 1.8);
sun.position.set(-2, 4, 3);
scene.add(sun);
// Ground far below with a grid (the drop as seen from the canopy).
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(4000, 4000).rotateX(-Math.PI / 2),
  new THREE.MeshStandardMaterial({ color: 0x6f7f52, roughness: 1 }),
);
ground.position.y = -180;
scene.add(ground);
const grid = new THREE.GridHelper(4000, 200, 0x4c5a3a, 0x58683f);
grid.position.y = -179.9;
scene.add(grid);

const kit = createWeaponKit();
const plain = new THREE.MeshStandardMaterial({ color: 0x3a3833, roughness: 0.8 });
const char = createCharacter("A", plain, kit, { worldRifle: true, bareHead: true });
scene.add(char.root);
type Show = {
  view: "rear" | "side" | "front" | "top" | "low" | "three-quarter" | "game";
  deploy?: number;
  landed?: number;
  brakeL?: number;
  brakeR?: number;
  dive?: number;
  flare?: number;
  height?: number;
  /** The pendulum's swing (radians); defaults to the settled swing for `dive`. */
  swing?: number;
  /** System bank (radians, + left). */
  roll?: number;
  /** Gameplay camera's look pitch (radians). */
  pitch?: number;
};
const w = window as unknown as Record<string, unknown>;
let canopy: ReturnType<typeof createCanopy> | null = null;
w.ready = Promise.all([
  char.ready,
  loadCanopy(loader, location.origin + "/fps/br/models/canopy.glb").then((t) => {
    canopy = createCanopy(t);
    scene.add(canopy.root);
  }),
]).then(() => true);
w.show = (o: Show) => {
  const pose: CanopyPose = {
    deploy: o.deploy ?? 10,
    landed: o.landed ?? -1,
    brakeL: o.brakeL ?? 0,
    brakeR: o.brakeR ?? 0,
    dive: o.dive ?? 0,
    time: 3,
  };
  const y = o.height ?? 0;
  // As br-arena.ts: pilot and wing hung from the harness, swung and banked together.
  const swing = o.swing ?? DIVE_SWING * pose.dive;
  const roll = o.roll ?? 0;
  const harness = new THREE.Vector3(0, y + HARNESS_Y, 0);
  hangPilot(char.root, harness, 0, swing, roll);
  for (let i = 0; i < 40; i++)
    char.update(16, 10_000 + i * 16, 0, true, false, {
      airborne: true,
      primary: "m4",
      canopy: {
        pullL: pose.brakeL,
        pullR: pose.brakeR,
        flare: o.flare ?? 0,
        toggleY: HARNESS_Y + 0.42,
        dive: Math.max(0, Math.min(1, swing / DIVE_SWING)),
      },
    });
  hangCanopy(canopy!.root, harness, 0, swing, roll);
  canopy!.pose(pose);
  const cam = new THREE.PerspectiveCamera(o.view === "game" ? 70 : 40, W / H, 0.1, 5000);
  const c = new THREE.Vector3(0, y + 3.2, 0);
  const at: Record<Show["view"], [number, number, number]> = {
    rear: [0, 3.6, 15],
    side: [16, 3.4, 0],
    front: [0, 2.6, -15],
    top: [0.01, 22, 0.01],
    low: [3, -5, 7],
    "three-quarter": [10, 6, 11],
    // The gameplay camera (br-arena.ts): behind and above, looking a little down.
    game: [0, 5.2, 10.5],
  };
  const [cx, cy, cz] = at[o.view];
  cam.position.set(cx, y + cy, cz);
  if (o.view === "game") {
    // br-arena.ts's chase camera, facing the way the pilot flies (heading 0, −z).
    const diving = Math.max(0, Math.min(1, swing / DIVE_SWING));
    const dist = 6.4 + 0.9 * diving;
    const camPitch = Math.max(-0.75, Math.min(0.3, o.pitch ?? -0.3)) - 0.14 - 0.22 * diving;
    cam.position.set(0, y + 2.5 - Math.sin(camPitch) * dist, Math.cos(camPitch) * dist);
    cam.lookAt(0, y + 2.5 - 1.2 * diving, -2.2 * diving);
    cam.fov = 70 + 7 * diving;
    cam.updateProjectionMatrix();
  } else cam.lookAt(c);
  renderer.render(scene, cam);
  return true;
};
