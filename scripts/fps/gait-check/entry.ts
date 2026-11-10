import * as THREE from "three";
import { createCharacter } from "@/lib/fps/authored-character";
import { createWeaponKit } from "@/lib/fps/weapon";
import { loadLocomotion } from "@/lib/fps/locomotion";

/**
 * Gait check (2026-11-10): both characters driven by the game's own update at a gait's speed
 * and direction, drawn from the side (or the given view) at a few moments of the cycle.
 * Driven by capture.mjs: window.show({ seat, gait, t, view }).
 */
const W = 640,
  H = 480;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(W, H);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb7c6d4);
scene.add(new THREE.HemisphereLight(0xe4eaff, 0x40382c, 2));
const sun = new THREE.DirectionalLight(0xfff0d8, 1.8);
sun.position.set(3, 5, 2);
scene.add(sun);
const grid = new THREE.GridHelper(400, 400, 0x556644, 0x6a7a55);
scene.add(grid);
const kit = createWeaponKit();
const chars = {
  A: createCharacter("A", null, kit, { worldRifle: true }),
  B: createCharacter("B", null, kit, { worldRifle: true }),
};
const GAITS: Record<string, { speed: number; x: number; z: number; crouch?: boolean }> = {
  idle: { speed: 0, x: 0, z: -1 },
  walk: { speed: 1.4, x: 0, z: -1 },
  jog: { speed: 3.2, x: 0, z: -1 },
  run: { speed: 5.6, x: 0, z: -1 },
  back: { speed: 1.4, x: 0, z: 1 },
  left: { speed: 1.6, x: -1, z: 0 },
  right: { speed: 1.6, x: 1, z: 0 },
  crouch: { speed: 1.2, x: 0, z: -1, crouch: true },
};
const cam = new THREE.PerspectiveCamera(32, W / H, 0.1, 500);
declare global {
  interface Window {
    ready: Promise<unknown>;
    show: (o: { seat: "A" | "B"; gait: string; t: number; view?: "side" | "front" | "rear" }) => void;
    /** Highest arm extension (shoulder–hand over upper+fore arm) over `t` s of a gait at `speed`. */
    reach: (o: { seat: "A" | "B"; speed: number; x: number; z: number; t: number }) => number;
  }
}
window.ready = Promise.all([chars.A.ready, chars.B.ready, loadLocomotion()]);
window.show = ({ seat, gait, t, view = "side" }) => {
  for (const c of Object.values(chars)) {
    c.root.removeFromParent();
  }
  const actor = chars[seat];
  scene.add(actor.root);
  const g = GAITS[gait]!;
  actor.root.position.set(0, 0, 0);
  actor.root.rotation.y = 0;
  actor.resetMotion(g.speed, g.x, g.z);
  // Run the game's update for `t` seconds at 60 fps along the gait's direction.
  const steps = Math.round(t * 60);
  for (let i = 0; i <= steps; i++) {
    actor.root.position.x += (g.x * g.speed) / 60;
    actor.root.position.z += (g.z * g.speed) / 60;
    actor.update(1000 / 60, i * (1000 / 60), 0, true, !!g.crouch);
  }
  const p = actor.root.position;
  const eye =
    view === "side"
      ? new THREE.Vector3(p.x + 6, 1.1, p.z)
      : view === "front"
        ? new THREE.Vector3(p.x, 1.2, p.z - 6)
        : new THREE.Vector3(p.x, 1.2, p.z + 6);
  cam.position.copy(eye);
  cam.lookAt(p.x, 0.9, p.z);
  grid.position.set(Math.round(p.x), 0, Math.round(p.z));
  renderer.render(scene, cam);
};

window.reach = ({ seat, speed, x, z, t }) => {
  const actor = chars[seat];
  const bone = (n: string) => {
    let b: THREE.Object3D | undefined;
    actor.root.traverse((o) => {
      if ((o as THREE.Bone).isBone && o.name.replace(/^mixamorig:?/, "").replace(/_\d+$/, "") === n) b = o;
    });
    return b!;
  };
  const w = (o: THREE.Object3D) => o.getWorldPosition(new THREE.Vector3());
  actor.root.position.set(0, 0, 0);
  actor.resetMotion(speed, x, z);
  let worst = 0;
  for (let i = 0; i <= t * 60; i++) {
    actor.root.position.x += (x * speed) / 60;
    actor.root.position.z += (z * speed) / 60;
    actor.update(1000 / 60, i * (1000 / 60), 0, true, false);
    actor.root.updateMatrixWorld(true);
    for (const side of ["Left", "Right"]) {
      const a = w(bone(side + "Arm")),
        f = w(bone(side + "ForeArm")),
        h = w(bone(side + "Hand"));
      worst = Math.max(worst, a.distanceTo(h) / (a.distanceTo(f) + f.distanceTo(h)));
    }
  }
  return worst;
};
