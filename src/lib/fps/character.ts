import * as THREE from "three";
import type { Seat } from "./protocol";
import { AK_MUZZLE, type WeaponKit } from "./weapon";

/** Reference-inspired, fully three-dimensional cosmetics. Hit volumes stay in simulation.ts. */
export function createCharacter(seat: Seat, branding: THREE.Material, weaponKit: WeaponKit) {
  const police = seat === "A",
    root = new THREE.Group();
  root.name = police ? "officer" : "masked-fighter";
  const cloth = new THREE.MeshStandardMaterial({
    color: police ? 0x17253c : 0x34322f,
    roughness: 0.94,
  });
  const webbing = new THREE.MeshStandardMaterial({
    color: police ? 0x101721 : 0x5d5940,
    roughness: 0.86,
  });
  const skin = new THREE.MeshStandardMaterial({ color: 0xb48262, roughness: 0.82 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x111119, roughness: 0.72 });
  const glass = new THREE.MeshStandardMaterial({
    color: police ? 0x164b6f : 0x292032,
    metalness: 0.85,
    roughness: 0.15,
  });
  const accent = new THREE.MeshStandardMaterial({
    color: police ? 0x38cbe4 : 0x9748e8,
    emissive: police ? 0x125567 : 0x351061,
    emissiveIntensity: 0.35,
  });
  let scarfTexture: THREE.CanvasTexture | undefined;
  const scarf = webbing.clone();
  if (!police) {
    const woven = document.createElement("canvas");
    woven.width = 128;
    woven.height = 128;
    const pen = woven.getContext("2d")!;
    pen.fillStyle = "#b7b09a";
    pen.fillRect(0, 0, 128, 128);
    pen.strokeStyle = "#28292a";
    pen.lineWidth = 3;
    for (let y = -16; y < 144; y += 16)
      for (let x = -16; x < 144; x += 16) {
        pen.beginPath();
        pen.moveTo(x, y + 8);
        pen.lineTo(x + 8, y);
        pen.lineTo(x + 16, y + 8);
        pen.lineTo(x + 8, y + 16);
        pen.closePath();
        pen.stroke();
      }
    scarfTexture = new THREE.CanvasTexture(woven);
    scarfTexture.colorSpace = THREE.SRGBColorSpace;
    scarf.map = scarfTexture;
    scarf.color.setHex(0xffffff);
  }
  const mesh = (
    parent: THREE.Object3D,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
  ) => {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const box = (
    parent: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    material: THREE.Material,
  ) => mesh(parent, new THREE.BoxGeometry(w, h, d), material, x, y, z);
  mesh(root, new THREE.CapsuleGeometry(0.235, 0.36, 5, 10), cloth, 0, 1.12, 0);
  box(root, 0, 1.13, -0.17, 0.45, 0.45, 0.14, webbing);
  box(root, 0, 1.13, 0.17, 0.43, 0.42, 0.1, webbing);
  for (const side of [-1, 1]) {
    box(root, side * 0.18, 1.34, -0.02, 0.055, 0.24, 0.36, webbing);
    box(root, side * 0.13, 1.03, -0.27, 0.105, 0.16, 0.07, webbing);
    box(root, side * 0.25, 0.87, 0.01, 0.09, 0.1, 0.15, rubber);
  }
  box(root, 0, 0.87, 0, 0.49, 0.065, 0.32, rubber);
  const head = new THREE.Group();
  head.position.y = 1.59;
  root.add(head);
  mesh(head, new THREE.SphereGeometry(0.175, 12, 10), skin, 0, 0, 0).scale.set(0.92, 1.08, 0.95);
  for (const side of [-1, 1])
    mesh(head, new THREE.SphereGeometry(0.036, 6, 6), skin, side * 0.16, -0.005, 0);
  box(head, 0, 0.035, -0.16, 0.285, 0.07, 0.045, glass);
  box(head, 0, -0.005, -0.185, 0.035, 0.035, 0.045, skin);
  if (police) {
    mesh(
      head,
      new THREE.SphereGeometry(0.184, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
      cloth,
      0,
      0.055,
      0,
    );
    box(head, 0, 0.06, -0.17, 0.29, 0.022, 0.23, cloth);
    box(head, -0.13, -0.065, -0.01, 0.055, 0.075, 0.035, rubber);
    box(root, -0.18, 1.31, -0.26, 0.065, 0.13, 0.06, rubber);
  } else {
    mesh(head, new THREE.SphereGeometry(0.182, 12, 10), scarf, 0, -0.035, 0.015).scale.set(
      1,
      0.72,
      1,
    );
    mesh(
      head,
      new THREE.SphereGeometry(0.184, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
      scarf,
      0,
      0.045,
      0,
    );
    mesh(root, new THREE.ConeGeometry(0.24, 0.27, 4), scarf, 0, 1.35, -0.16).rotation.z = Math.PI;
    // Stylized woven bands remain readable without high-resolution textures.
    for (let i = 0; i < 5; i++) box(head, 0, -0.13 + i * 0.035, -0.16, 0.27, 0.009, 0.018, cloth);
  }
  box(root, 0.21, 1.27, -0.255, 0.035, 0.09, 0.018, accent);
  const patchCanvas = document.createElement("canvas");
  patchCanvas.width = 256;
  patchCanvas.height = 96;
  const ctx = patchCanvas.getContext("2d")!;
  ctx.fillStyle = police ? "#101722" : "#474632";
  ctx.fillRect(0, 0, 256, 96);
  ctx.textAlign = "center";
  ctx.fillStyle = "#e9e4f4";
  ctx.font = "900 48px sans-serif";
  ctx.fillText(police ? "POLICE" : "PVP", 128, 64);
  const texture = new THREE.CanvasTexture(patchCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const patchMaterial = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8 });
  const patch = mesh(root, new THREE.PlaneGeometry(0.29, 0.105), patchMaterial, 0, 1.24, -0.246);
  patch.rotation.y = Math.PI;
  const legs: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(side * 0.125, 0.83, 0);
    root.add(leg);
    legs.push(leg);
    mesh(leg, new THREE.CapsuleGeometry(0.095, 0.48, 4, 8), cloth, 0, -0.32, 0);
    box(leg, 0, -0.42, -0.085, 0.16, 0.15, 0.055, webbing);
    box(leg, 0, -0.73, -0.055, 0.19, 0.17, 0.31, rubber);
  }
  const arms: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.29, 1.33, 0);
    root.add(arm);
    arms.push(arm);
    mesh(arm, new THREE.CapsuleGeometry(0.08, 0.19, 4, 8), cloth, 0, -0.16, 0);
    mesh(arm, new THREE.CapsuleGeometry(0.065, 0.18, 4, 8), skin, 0, -0.29, -0.14).rotation.x =
      Math.PI / 2;
    box(arm, 0, -0.29, -0.28, 0.12, 0.1, 0.12, rubber);
    arm.rotation.x = -0.22;
    arm.rotation.z = side * 0.12;
  }
  const rifle = weaponKit.rifle();
  rifle.scale.setScalar(0.75);
  rifle.position.set(0.12, 1.05, -0.35);
  root.add(rifle);
  const flash = mesh(
    rifle,
    new THREE.ConeGeometry(0.045, 0.13, 5),
    new THREE.MeshBasicMaterial({ color: 0xffc471 }),
    0,
    0.015,
    AK_MUZZLE.z - 0.065,
  );
  flash.rotation.x = -Math.PI / 2;
  flash.visible = false;
  let gait = 0,
    lastX = 0,
    lastZ = 0,
    initialized = false,
    flashUntil = 0;
  const upper = root.children
    .filter((object) => !legs.includes(object as THREE.Group))
    .map((object) => ({ object, y: object.position.y }));
  return {
    root,
    shot(now: number) {
      flashUntil = now + 45;
    },
    update(dt: number, now: number, pitch: number, alive: boolean, crouched = false) {
      const distance = initialized
        ? Math.hypot(root.position.x - lastX, root.position.z - lastZ)
        : 0;
      initialized = true;
      lastX = root.position.x;
      lastZ = root.position.z;
      gait += Math.min(distance, 0.4) * 9;
      const stride = Math.min(1, (distance / Math.max(0.001, dt)) * 150);
      legs[0]!.rotation.x = Math.sin(gait) * 0.48 * stride;
      legs[1]!.rotation.x = -Math.sin(gait) * 0.48 * stride;
      for (const pose of upper) pose.object.position.y = pose.y - (crouched ? 0.65 : 0);
      for (const leg of legs) {
        leg.position.y = crouched ? 0.43 : 0.83;
        leg.scale.y = crouched ? 0.6 : 1;
        if (crouched) leg.rotation.x += 0.6;
      }
      head.rotation.x = pitch * 0.5;
      rifle.rotation.x = pitch;
      arms[0]!.rotation.x = -0.22 + pitch * 0.6;
      arms[1]!.rotation.x = -0.22 + pitch * 0.6;
      flash.visible = alive && now < flashUntil;
      root.visible = alive;
    },
    dispose() {
      texture.dispose();
      scarfTexture?.dispose();
      scarf.dispose();
    },
  };
}
