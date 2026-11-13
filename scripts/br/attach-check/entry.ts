import * as THREE from "three";
import { fitCharacterGear, loadGearModels } from "@/lib/fps/br/character-gear";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { createBrViewmodel } from "@/lib/fps/br/br-viewmodel";
import type { Gun } from "@/lib/fps/br/inventory";
import {
  fitCharacterGun,
  loadAttachmentParts,
  type AttachmentParts,
} from "@/lib/fps/br/attachment-fit";
import { createCharacter } from "@/lib/fps/authored-character";
import { createWeaponKit } from "@/lib/fps/weapon";

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

/** Fire one shot and render `ms` later: the spent case in flight (casing check). */
w.eject = (gun: Gun, ms = 90) => {
  let t = 20_000;
  vm.setGun(gun);
  const frame = (dt: number) => {
    t += dt;
    vm.update(dt, t, {
      gun,
      aiming: false,
      reload: 0,
      empty: false,
      moving: false,
      sprinting: false,
      airborne: false,
      lookX: 0,
      lookY: 0,
      silenced: false,
      flash: false,
      knife: false,
      walking: false,
      backward: false,
      strafe: 0,
    });
  };
  for (let i = 0; i < 30; i++) frame(16);
  camera.position.set(0, 1.6, 0);
  camera.rotation.set(0, 0, 0);
  vm.shot(t);
  for (let elapsed = 0; elapsed < ms; elapsed += 15) frame(15);
  renderer.render(scene, camera);
  vm.render(camera, false);
  return true;
};

// Third person: other players' guns (the BR character, either rifle, attachments from the
// same fitting code the match uses).
const third = new THREE.Scene();
third.background = new THREE.Color(0x8fa7bd);
third.add(new THREE.HemisphereLight(0xe4eaff, 0x40382c, 2));
const sun = new THREE.DirectionalLight(0xfff0d8, 1.8);
sun.position.set(2, 4, 3);
third.add(sun);
const kit = createWeaponKit();
const plain = new THREE.MeshStandardMaterial({ color: 0x3a3833, roughness: 0.8 });
const chars = (["A", "B"] as const).map((seat) => {
  const c = createCharacter(seat, plain, kit, {
    worldRifle: true,
    bothRifles: true,
    bareHead: true,
  });
  third.add(c.root);
  return c;
});
let parts: AttachmentParts | null = null;
w.thirdReady = Promise.all([
  loadGearModels(loader, location.origin + "/fps/br/models/gear.glb"),
  ...chars.map((c) => c.ready),
  loadAttachmentParts(loader, location.origin + "/fps/br/models/attachments.glb").then((p) => {
    parts = p;
  }),
]).then(() => true);
w.third = (
  seat: 0 | 1,
  gun: Gun | null,
  view: "side" | "front" | "close" | "back" | "top" | "torso" | "face" | "profile" = "side",
  gear = 0,
) => {
  const c = chars[seat]!;
  for (const o of chars) o.root.visible = o === c;
  c.root.position.set(0, 0, 0);
  c.root.rotation.set(0, 0, 0);
  for (let i = 0; i < 30; i++) {
    c.update(16, 10_000 + i * 16, 0, true, false, {
      primary: gun ? gun.item : "none",
      silenced: gun?.muzzle === "silencer",
    });
    fitCharacterGun(c, parts, gun?.optic ?? null, gun?.muzzle ?? null);
    fitCharacterGear(c, gear);
  }
  const cam = new THREE.PerspectiveCamera(30, 960 / 540, 0.05, 50);
  if (view === "top" || view === "torso") {
    // Fit checks: straight down on the torso, or a tight side view of it (orthographic).
    const o = new THREE.OrthographicCamera(-0.55, 0.55, 0.31, -0.31, 0.01, 10);
    if (view === "top") {
      // Head and helmet hidden so the vest's top edge round the torso shows.
      o.position.set(0, 1.45, 0);
      o.up.set(0, 0, -1);
      o.lookAt(0, 0, 0);
      o.near = 0.01;
      o.far = 0.9;
    } else {
      o.position.set(3, 1.2, 0);
      o.lookAt(0, 1.2, 0);
    }
    o.updateProjectionMatrix();
    renderer.render(third, o);
    return true;
  }
  if (view === "face" || view === "profile") {
    // The head close up, from the front or the side (helmet fit over the face).
    cam.position.set(view === "face" ? 0 : 0.9, 1.62, view === "face" ? -0.9 : -0.05);
    cam.lookAt(0, 1.6, -0.05);
    renderer.render(third, cam);
    return true;
  }
  if (view === "side") cam.position.set(2.1, 1.35, -0.25);
  else if (view === "close") cam.position.set(0.95, 1.45, -0.45);
  else if (view === "back") cam.position.set(1.6, 1.6, 1.9);
  else cam.position.set(0.6, 1.5, -2.2);
  if (view === "back") cam.lookAt(0, 1.2, 0);
  else cam.lookAt(0.05, 1.27, view === "close" ? -0.3 : -0.35);
  renderer.render(third, cam);
  return true;
};

/** The e2e fps-world-rifle check: largest hand-to-grip gap over pitch, crouch and reload. */
w.gripGap = (seat: 0 | 1) => {
  const c = chars[seat]!;
  let max = 0;
  const worst: string[] = [];
  for (const crouch of [false, true])
    for (const pitch of [-0.45, 0, 0.45])
      for (const reloading of [false, true]) {
        c.update(16, 1100, pitch, true, crouch, { reloading });
        c.root.updateMatrixWorld(true);
        for (const side of ["Left", "Right"]) {
          const hand = c.root.getObjectByName(side + "Hand")!;
          const grip = c.root.getObjectByName(side === "Left" ? "GripL" : "GripR");
          if (!grip) continue;
          const gap = hand
            .getWorldPosition(new THREE.Vector3())
            .distanceTo(grip.getWorldPosition(new THREE.Vector3()));
          if (gap > 0.1)
            worst.push(`${side} p${pitch} c${+crouch} r${+reloading} ${gap.toFixed(3)}`);
          max = Math.max(max, gap);
        }
      }
  return [max, worst.join("; ")];
};

/** Shoulder vs gun stock (character-root metres; the character faces −Z): for the stock seat. */
w.shoulder = (seat: 0 | 1, gun: Gun) => {
  const c = chars[seat]!;
  for (const o of chars) o.root.visible = o === c;
  c.root.position.set(0, 0, 0);
  c.root.rotation.set(0, 0, 0);
  for (let i = 0; i < 30; i++)
    c.update(16, 10_000 + i * 16, 0, true, false, {
      primary: gun.item as "ak47" | "m4" | "awp" | "hunting",
      silenced: gun.muzzle === "silencer",
    });
  c.root.updateWorldMatrix(true, true);
  const inv = new THREE.Matrix4().copy(c.root.matrixWorld).invert();
  const at = (name: string) => {
    const o = c.root.getObjectByName(name);
    return o
      ? o
          .getWorldPosition(new THREE.Vector3())
          .applyMatrix4(inv)
          .toArray()
          .map((v) => +v.toFixed(3))
      : null;
  };
  const held = (c as unknown as { heldWeapon(): { master: THREE.Object3D } | null }).heldWeapon();
  const box = new THREE.Box3();
  held?.master.traverse((o) => {
    if (o instanceof THREE.Mesh && o.visible) {
      o.geometry.computeBoundingBox();
      box.union(
        o.geometry
          .boundingBox!.clone()
          .applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld)),
      );
    }
  });
  return {
    rightShoulder: at("RightShoulder"),
    rightArm: at("RightArm"),
    neck: at("Neck"),
    head: at("Head"),
    gunMin: box.min.toArray().map((v) => +v.toFixed(3)),
    gunMax: box.max.toArray().map((v) => +v.toFixed(3)),
  };
};

/** The helmet fit measured on each character (character-gear.ts). */
w.helmetFit = () =>
  chars.map((c) => {
    const f = c.root.userData["helmetFit"] as
      { skull: THREE.Box3; fit: THREE.Vector3; at: THREE.Vector3 } | undefined;
    return f
      ? {
          min: f.skull.min.toArray().map((v) => +v.toFixed(3)),
          max: f.skull.max.toArray().map((v) => +v.toFixed(3)),
          fit: f.fit.toArray().map((v) => +v.toFixed(3)),
          at: f.at.toArray().map((v) => +v.toFixed(3)),
        }
      : null;
  });

/** The torso box measured for vests and packs on each character (character-gear.ts). */
w.torsoFit = () =>
  chars.map((c) => {
    const f = c.root.userData["torsoFit"] as { torso: THREE.Box3 } | undefined;
    return f
      ? {
          min: f.torso.min.toArray().map((v) => +v.toFixed(3)),
          max: f.torso.max.toArray().map((v) => +v.toFixed(3)),
        }
      : null;
  });
