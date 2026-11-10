import * as THREE from "three";
import { createCharacter } from "@/lib/fps/authored-character";
import { createWeaponKit } from "@/lib/fps/weapon";
import { loadLocomotion } from "@/lib/fps/locomotion";
import { deathPose } from "@/lib/fps/death-presentation";
import { loadDeathClip } from "@/lib/fps/death-clip";

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
    show: (o: {
      seat: "A" | "B";
      gait: string;
      t: number;
      view?: "side" | "front" | "rear";
    }) => void;
    /** Highest arm extension (shoulder–hand over upper+fore arm) over `t` s of a gait at `speed`. */
    reach: (o: { seat: "A" | "B"; speed: number; x: number; z: number; t: number }) => number;
    /** Median and worst world speed (m/s) of a planted ankle over `t` s of a gait. */
    slide: (o: { seat: "A" | "B"; speed: number; x: number; z: number; t: number }) => number[];
  }
}
window.ready = Promise.all([chars.A.ready, chars.B.ready, loadLocomotion(), loadDeathClip()]);
window.show = ({ seat, gait, t, view = "side" }) => {
  for (const c of Object.values(chars)) {
    c.root.removeFromParent();
  }
  const actor = chars[seat];
  scene.add(actor.root);
  if (gait === "death") {
    // Standing, then killed: `t` seconds into the death (the game's own deathPose and update).
    actor.root.position.set(0, 0, 0);
    actor.root.rotation.set(0, 0, 0);
    actor.resetMotion(0, 0, -1);
    for (let i = 0; i < 10; i++) actor.update(16, i * 16, 0, true, false);
    const steps = Math.round(t * 60);
    for (let i = 0; i <= steps; i++) {
      const c = deathPose((i * 1000) / 60, 0, 0, actor.deathClipMs);
      actor.root.position.y = c.height;
      actor.update(1000 / 60, 200 + i * (1000 / 60), 0, false, false, { death: c.progress });
    }
    cam.position.set(view === "front" ? 0.3 : 6, 1.4, view === "front" ? -6 : -0.4);
    cam.lookAt(0, 0.6, -0.5);
    grid.position.set(0, 0, 0);
    renderer.render(scene, cam);
    return;
  }
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
      if ((o as THREE.Bone).isBone && o.name.replace(/^mixamorig:?/, "").replace(/_\d+$/, "") === n)
        b = o;
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

window.slide = ({ seat, speed, x, z, t }) => {
  const actor = chars[seat];
  let foot: THREE.Object3D | undefined;
  actor.root.traverse((o) => {
    if ((o as THREE.Bone).isBone && /LeftFoot$/.test(o.name.replace(/_\d+$/, ""))) foot = o;
  });
  actor.root.position.set(0, 0, 0);
  actor.resetMotion(speed, x, z);
  const rows: THREE.Vector3[] = [];
  for (let i = 0; i <= t * 120; i++) {
    actor.root.position.x += (x * speed) / 120;
    actor.root.position.z += (z * speed) / 120;
    actor.update(1000 / 120, i * (1000 / 120), 0, true, false);
    actor.root.updateMatrixWorld(true);
    rows.push(foot!.getWorldPosition(new THREE.Vector3()));
  }
  const r = rows.slice(120),
    floor = Math.min(...r.map((v) => v.y));
  const sp: number[] = [];
  for (let i = 1; i < r.length; i++)
    if (r[i - 1]!.y < floor + 0.01 && r[i]!.y < floor + 0.01)
      sp.push(Math.hypot(r[i]!.x - r[i - 1]!.x, r[i]!.z - r[i - 1]!.z) * 120);
  sp.sort((a, b) => a - b);
  return [sp[sp.length >> 1] ?? 0, sp[sp.length - 1] ?? 0, sp.length];
};
