import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { Seat, Weapon } from "./protocol";
import type { WeaponKit } from "./weapon";
import { createMuzzleFlash } from "./muzzle-flash";
import { playerVolumes } from "./player-volumes";

type Motion = { airborne?: boolean; weapon?: Weapon; reloading?: boolean };

/** Articulated cosmetic rig. The server shares head/body envelopes, never client mesh hits. */
export function createCharacter(seat: Seat, _branding: THREE.Material, weaponKit: WeaponKit) {
  const police = seat === "A",
    root = new THREE.Group(),
    upper = new THREE.Group();
  root.name = police ? "officer" : "masked-fighter";
  upper.name = "upper-body";
  root.add(upper);
  const textures: THREE.Texture[] = [],
    materials: THREE.Material[] = [];
  const mat = (color: number, roughness = 0.85, metalness = 0) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    materials.push(m);
    return m;
  };
  const cloth = mat(police ? 0x172333 : 0x292826),
    vest = mat(police ? 0x141a22 : 0x63573e),
    skin = mat(0xb98462, 0.75),
    glove = mat(0x17191d, 0.75),
    sole = mat(0x101214),
    leather = mat(0x26272a, 0.7),
    metal = mat(0x4d535a, 0.35, 0.7),
    lens = mat(police ? 0x15384b : 0x171a1d, 0.13, 0.85),
    beard = mat(0x37302d);
  const fabric = document.createElement("canvas");
  fabric.width = fabric.height = 128;
  const fp = fabric.getContext("2d")!,
    pixels = fp.createImageData(128, 128);
  for (let y = 0; y < 128; y++)
    for (let x = 0; x < 128; x++) {
      const n = (y * 128 + x) * 4,
        v = 95 + ((x + y) % 4 < 2 ? 40 : 0) + Math.sin(x * 0.19 + y * 0.27) * 13;
      for (let c = 0; c < 3; c++) pixels.data[n + c] = v;
      pixels.data[n + 3] = 255;
    }
  fp.putImageData(pixels, 0, 0);
  const weave = new THREE.CanvasTexture(fabric);
  weave.wrapS = weave.wrapT = THREE.RepeatWrapping;
  weave.repeat.set(3, 4);
  textures.push(weave);
  for (const m of [cloth, vest, glove]) {
    m.bumpMap = weave;
    m.bumpScale = 0.0018;
  }
  const mesh = (
    p: THREE.Object3D,
    g: THREE.BufferGeometry,
    m: THREE.Material,
    x = 0,
    y = 0,
    z = 0,
  ) => {
    const o = new THREE.Mesh(g, m);
    o.position.set(x, y, z);
    o.castShadow = o.receiveShadow = true;
    p.add(o);
    return o;
  };
  const box = (
    p: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    m: THREE.Material,
  ) => mesh(p, new THREE.BoxGeometry(w, h, d, 2, 2, 2), m, x, y, z);
  const oval = (
    p: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    m: THREE.Material,
  ) => {
    const o = mesh(p, new THREE.SphereGeometry(1, 16, 12), m, x, y, z);
    o.scale.set(w, h, d);
    return o;
  };
  const tube = (p: THREE.Object3D, points: number[][], r: number, m: THREE.Material) =>
    mesh(
      p,
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points.map((v) => new THREE.Vector3(v[0], v[1], v[2]))),
        12,
        r,
        6,
        false,
      ),
      m,
    );
  const patch = (
    p: THREE.Object3D,
    text: string,
    w: number,
    h: number,
    x: number,
    y: number,
    z: number,
  ) => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    const pen = canvas.getContext("2d")!;
    pen.fillStyle = police ? "#111b27" : "#494334";
    pen.fillRect(0, 0, 512, 256);
    pen.strokeStyle = "#8b8c86";
    pen.lineWidth = 5;
    pen.strokeRect(8, 8, 496, 240);
    pen.textAlign = "center";
    pen.fillStyle = "#e5e6e7";
    pen.font = "900 106px sans-serif";
    pen.fillText(text, 256, 162);
    if (police) {
      pen.fillStyle = "#ed36ce";
      pen.fillRect(35, 195, 110, 8);
      pen.fillStyle = "#27c7e9";
      pen.fillRect(367, 195, 110, 8);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    textures.push(texture);
    const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9 });
    materials.push(material);
    const o = mesh(p, new THREE.PlaneGeometry(w, h), material, x, y, z);
    o.rotation.y = Math.PI;
    return o;
  };
  // Tailored shoulder, chest and waist silhouette, with separate armor and equipment.
  const profile = [
    [0.12, 0.85],
    [0.18, 0.9],
    [0.205, 1.03],
    [0.235, 1.27],
    [0.215, 1.39],
    [0.15, 1.43],
  ].map((p) => new THREE.Vector2(p[0], p[1]));
  mesh(upper, new THREE.LatheGeometry(profile, 20), cloth).scale.z = 0.68;
  oval(upper, 0, 0.86, 0, 0.2, 0.13, 0.135, cloth);
  oval(upper, 0, 1.14, -0.115, 0.216, 0.255, 0.1, vest);
  oval(upper, 0, 1.14, 0.115, 0.204, 0.24, 0.085, vest);
  box(upper, 0, 0.88, 0, 0.43, 0.055, 0.29, glove);
  box(upper, 0, 0.88, -0.155, 0.065, 0.047, 0.025, metal);
  for (const side of [-1, 1]) {
    box(upper, side * 0.153, 1.35, 0, 0.06, 0.22, 0.29, vest);
    box(upper, side * 0.224, 0.87, 0.02, 0.055, 0.12, 0.13, glove);
  }
  for (let row = 0; row < 5; row++)
    box(upper, 0, 1.02 + row * 0.05, -0.212, 0.39, 0.012, 0.014, vest);
  for (const x of [-0.13, 0, 0.13]) {
    box(upper, x, 1.04, -0.235, 0.105, 0.17, 0.055, vest);
    box(upper, x, 1.11, -0.268, 0.108, 0.035, 0.009, glove);
    box(upper, x, 1.045, -0.269, 0.014, 0.12, 0.008, vest);
  }
  patch(upper, police ? "POLICE" : "PVP", 0.31, 0.115, 0, 1.28, -0.218);
  if (police) {
    box(upper, -0.17, 1.32, -0.223, 0.06, 0.125, 0.045, glove);
    for (let row = 0; row < 5; row++)
      box(upper, -0.17, 1.31 + row * 0.012, -0.249, 0.043, 0.004, 0.004, metal);
    tube(
      upper,
      [
        [-0.17, 1.39, -0.23],
        [-0.2, 1.45, -0.11],
        [-0.13, 1.48, 0.01],
      ],
      0.008,
      glove,
    );
  }
  const head = new THREE.Group();
  head.name = "combat-head";
  head.position.y = playerVolumes({ x: 0, y: 0, z: 0 }).head.center.y;
  upper.add(head);
  oval(head, 0, 0, 0, 0.142, 0.184, 0.137, skin);
  oval(head, 0, -0.08, -0.029, 0.12, 0.097, 0.106, skin);
  if (police) {
    const stubble = mesh(
      head,
      new THREE.SphereGeometry(1, 20, 10, Math.PI, Math.PI, Math.PI * 0.57, Math.PI * 0.4),
      beard,
      0,
      -0.005,
      -0.006,
    );
    stubble.scale.set(0.139, 0.18, 0.14);
    beard.color.setHex(0x695344);
  }
  mesh(upper, new THREE.CylinderGeometry(0.068, 0.079, 0.13, 16), skin, 0, 1.445, 0);
  oval(head, 0, -0.015, -0.126, 0.027, 0.044, 0.035, skin);
  oval(head, 0, -0.064, -0.126, 0.043, 0.009, 0.009, police ? beard : skin);
  for (const side of [-1, 1]) {
    oval(head, side * 0.143, -0.01, 0.003, 0.025, 0.043, 0.019, skin);
    oval(head, side * 0.067, 0.035, -0.129, 0.058, 0.041, 0.014, metal).rotation.z = side * 0.13;
    oval(head, side * 0.067, 0.035, -0.142, 0.052, 0.035, 0.009, lens).rotation.z = side * 0.13;
    tube(
      head,
      [
        [side * 0.12, 0.05, -0.13],
        [side * 0.145, 0.05, -0.02],
        [side * 0.14, 0.018, 0.03],
      ],
      0.004,
      metal,
    );
  }
  box(head, 0, 0.043, -0.148, 0.028, 0.005, 0.007, metal);
  if (police) {
    mesh(
      head,
      new THREE.SphereGeometry(0.151, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      cloth,
      0,
      0.035,
      0,
    ).scale.set(1, 0.9, 1);
    oval(head, 0, 0.052, -0.13, 0.151, 0.012, 0.13, cloth).rotation.x = -0.08;
    patch(head, "POLICE", 0.17, 0.055, 0, 0.111, -0.134);
    oval(head, -0.153, -0.014, 0, 0.012, 0.023, 0.012, glove);
    tube(
      head,
      [
        [-0.15, -0.02, 0.005],
        [-0.155, -0.06, 0.035],
        [-0.12, -0.12, 0.045],
        [-0.135, -0.18, 0.02],
      ],
      0.004,
      metal,
    );
  } else {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const pen = canvas.getContext("2d")!;
    pen.fillStyle = "#bcb5a2";
    pen.fillRect(0, 0, 256, 256);
    pen.fillStyle = "#252629";
    for (let y = 0; y < 256; y += 16)
      for (let x = 0; x < 256; x += 16) {
        pen.fillRect(x, y, 7, 7);
        pen.fillRect(x + 8, y + 8, 7, 7);
        pen.fillRect(x + 4, y + 4, 7, 3);
        pen.fillRect(x + 10, y, 3, 7);
      }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 1);
    texture.anisotropy = 4;
    textures.push(texture);
    const scarf = mat(0xffffff);
    scarf.map = texture;
    scarf.bumpMap = weave;
    scarf.bumpScale = 0.002;
    mesh(
      head,
      new THREE.SphereGeometry(0.156, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      scarf,
      0,
      0.036,
      0,
    ).scale.y = 0.94;
    oval(head, 0, -0.076, -0.012, 0.153, 0.11, 0.145, scarf);
    const drape = mesh(upper, new THREE.ConeGeometry(0.19, 0.23, 5), scarf, 0, 1.38, -0.12);
    drape.rotation.z = Math.PI;
    drape.scale.z = 0.42;
    tube(
      head,
      [
        [0.08, -0.07, 0.11],
        [0.12, -0.13, 0.14],
        [0.09, -0.26, 0.11],
      ],
      0.025,
      scarf,
    );
  }
  const segment = (
    parent: THREE.Group,
    top: number,
    bottom: number,
    material: THREE.Material,
    name: string,
  ) => {
    const group = new THREE.Group();
    group.name = name;
    parent.add(group);
    const geometry = new THREE.CylinderGeometry(top, bottom, 1, 14, 12),
      points = geometry.getAttribute("position");
    if (material === cloth)
      for (let i = 0; i < points.count; i++) {
        const fold =
          1 +
          Math.sin(points.getY(i) * 60 + Math.atan2(points.getZ(i), points.getX(i)) * 3) * 0.065;
        points.setX(i, points.getX(i) * fold);
        points.setZ(i, points.getZ(i) * fold);
      }
    geometry.computeVertexNormals();
    mesh(group, geometry, material);
    return group;
  };
  const arms = [-1, 1].map((side) => {
    const shoulder = segment(upper, 0.085, 0.071, cloth, `upper-arm-${side}`),
      forearm = segment(upper, 0.063, 0.045, skin, `forearm-${side}`);
    patch(shoulder, police ? "MIAMI" : "PVP", 0.105, 0.14, side * 0.08, 0.15, 0).rotation.y =
      (side * Math.PI) / 2;
    const elbow = oval(upper, 0, 0, 0, 0.063, 0.063, 0.063, skin);
    elbow.userData["articulated"] = true;
    return { shoulder, forearm, elbow };
  });
  const legs = [-1, 1].map((side) => {
    const thigh = segment(root, 0.102, 0.079, cloth, `thigh-${side}`),
      shin = segment(root, 0.077, 0.059, cloth, `shin-${side}`),
      foot = new THREE.Group();
    foot.name = `boot-${side}`;
    root.add(foot);
    oval(shin, 0, 0.31, -0.066, 0.077, 0.16, 0.035, vest);
    for (const y of [0.42, 0.19]) box(shin, 0, y, 0, 0.16, 0.045, 0.14, glove);
    box(thigh, side * 0.085, -0.13, 0, 0.045, 0.26, 0.12, vest);
    oval(foot, 0, 0.085, -0.044, 0.085, 0.08, 0.14, leather);
    box(foot, 0, 0.025, -0.044, 0.17, 0.045, 0.26, sole);
    for (let n = 0; n < 4; n++) box(foot, 0, 0.14, -0.09 + n * 0.025, 0.085, 0.007, 0.007, metal);
    const knee = oval(root, 0, 0, 0, 0.078, 0.078, 0.078, cloth);
    knee.userData["articulated"] = true;
    return { thigh, shin, foot, knee };
  });
  const weaponPivot = new THREE.Group();
  weaponPivot.position.set(0, 1.25, 0);
  weaponPivot.name = "aim-pivot";
  upper.add(weaponPivot);
  const rifle = weaponKit.rifle();
  rifle.position.set(0.06, -0.15, -0.25);
  rifle.scale.setScalar(0.75);
  weaponPivot.add(rifle);
  const pistol = new THREE.Group();
  pistol.position.copy(rifle.position);
  weaponPivot.add(pistol);
  box(pistol, 0, 0, -0.1, 0.045, 0.055, 0.21, metal);
  box(pistol, 0, -0.07, -0.04, 0.04, 0.12, 0.06, glove);
  const hands = [-1, 1].map((side) => {
    const hand = new THREE.Group();
    hand.name = side < 0 ? "support-grip" : "firing-grip";
    upper.add(hand);
    oval(hand, 0, 0, 0, 0.036, 0.048, 0.034, glove);
    for (let n = 0; n < 4; n++)
      tube(
        hand,
        [
          [-0.026, -0.025 + n * 0.015, 0.008],
          [-0.025, -0.025 + n * 0.015, -0.035],
          [0.018, -0.025 + n * 0.015, -0.044],
          [0.03, -0.025 + n * 0.015, -0.015],
        ],
        0.008,
        glove,
      );
    tube(
      hand,
      [
        [0.02, 0.025, 0.02],
        [0.035, 0.025, -0.01],
        [0.018, 0.035, -0.026],
      ],
      0.01,
      glove,
    );
    return hand;
  });
  const flash = createMuzzleFlash();
  flash.root.traverse((o) => o.layers.set(0));
  rifle.add(flash.root);
  const pistolFlash = createMuzzleFlash();
  pistolFlash.root.traverse((o) => o.layers.set(0));
  pistol.add(pistolFlash.root);
  // Bake fixed details per joint/material; articulation never rebuilds geometry.
  const groups: THREE.Group[] = [];
  root.traverse((o) => {
    if (o instanceof THREE.Group) groups.push(o);
  });
  for (const group of groups) {
    const batches = new Map<THREE.Material, THREE.Mesh[]>();
    for (const child of group.children)
      if (
        child instanceof THREE.Mesh &&
        !Array.isArray(child.material) &&
        !child.userData["articulated"] &&
        group !== flash.root &&
        group !== pistolFlash.root
      ) {
        const parts = batches.get(child.material) ?? [];
        parts.push(child);
        batches.set(child.material, parts);
      }
    for (const [material, parts] of batches)
      if (parts.length > 1) {
        const baked = parts.map((p) => {
          p.updateMatrix();
          return p.geometry.clone().applyMatrix4(p.matrix);
        });
        const geometry = mergeGeometries(baked);
        if (geometry) {
          for (const p of parts) {
            p.removeFromParent();
            p.geometry.dispose();
          }
          mesh(group, geometry, material);
        }
        for (const g of baked) g.dispose();
      }
  }
  const axis = new THREE.Vector3(0, 1, 0),
    direction = new THREE.Vector3(),
    bend = new THREE.Vector3(),
    joint = new THREE.Vector3(),
    end = new THREE.Vector3();
  const place = (o: THREE.Group, a: THREE.Vector3, b: THREE.Vector3) => {
    direction.copy(b).sub(a);
    o.position.copy(a).add(b).multiplyScalar(0.5);
    o.scale.y = direction.length();
    o.quaternion.setFromUnitVectors(axis, direction.normalize());
  };
  const solve = (
    a: THREE.Vector3,
    b: THREE.Vector3,
    pole: THREE.Vector3,
    first: THREE.Group,
    second: THREE.Group,
    l1: number,
    l2: number,
  ) => {
    direction.copy(b).sub(a);
    const d = THREE.MathUtils.clamp(direction.length(), 0.02, l1 + l2 - 0.001);
    direction.normalize();
    end.copy(a).addScaledVector(direction, d);
    bend.copy(pole).addScaledVector(direction, -pole.dot(direction)).normalize();
    const along = (l1 * l1 - l2 * l2 + d * d) / (2 * d),
      height = Math.sqrt(Math.max(0, l1 * l1 - along * along));
    joint.copy(a).addScaledVector(direction, along).addScaledVector(bend, height);
    place(first, a, joint);
    place(second, joint, end);
  };
  const a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    pole = new THREE.Vector3();
  let lastX = 0,
    lastZ = 0,
    initialized = false,
    gait = 0,
    speed = 0,
    flashUntil = 0,
    reloadBlend = 0,
    travelX = 0,
    travelZ = -1;
  return {
    root,
    shot(now: number) {
      flashUntil = now + 42;
    },
    update(
      dt: number,
      now: number,
      pitch: number,
      alive: boolean,
      crouched = false,
      motion: Motion = {},
    ) {
      const dx = initialized ? root.position.x - lastX : 0,
        dz = initialized ? root.position.z - lastZ : 0;
      initialized = true;
      lastX = root.position.x;
      lastZ = root.position.z;
      const distance = Math.min(0.4, Math.hypot(dx, dz)),
        seconds = Math.max(0.001, dt / 1000);
      speed = THREE.MathUtils.damp(speed, Math.min(7, distance / seconds), 12, seconds);
      if (distance > 0.0001) {
        const yaw = root.rotation.y;
        travelX = THREE.MathUtils.damp(
          travelX,
          (dx * Math.cos(yaw) - dz * Math.sin(yaw)) / distance,
          12,
          seconds,
        );
        travelZ = THREE.MathUtils.damp(
          travelZ,
          (dx * Math.sin(yaw) + dz * Math.cos(yaw)) / distance,
          12,
          seconds,
        );
      }
      gait += distance * 9;
      const stride = Math.min(1, speed / 3);
      upper.position.y = playerVolumes({ x: 0, y: 0, z: 0, crouched }).head.center.y - 1.6;
      head.rotation.x = pitch * 0.25;
      reloadBlend = THREE.MathUtils.damp(reloadBlend, motion.reloading ? 1 : 0, 10, seconds);
      weaponPivot.rotation.set(
        pitch + Math.max(0, (flashUntil - now) / 42) * 0.025,
        -0.015,
        -reloadBlend * 0.28,
      );
      weaponPivot.position.y = 1.25 + Math.sin(now * 0.0019) * 0.002 - reloadBlend * 0.06;
      const isPistol = motion.weapon === "pistol";
      rifle.visible = !isPistol;
      pistol.visible = isPistol;
      for (let i = 0; i < 2; i++) {
        const side = i === 0 ? -1 : 1,
          phase = gait + i * Math.PI,
          leg = legs[i]!,
          swing = Math.sin(phase) * 0.16 * stride * (crouched ? 0.55 : 1),
          lift = Math.max(0, Math.cos(phase)) * 0.075 * stride;
        leg.foot.position.set(
          side * 0.125 + swing * travelX * 0.65,
          lift + (motion.airborne ? 0.08 : 0),
          swing * travelZ,
        );
        a.set(side * 0.125, crouched ? 0.39 : 0.84, 0);
        b.copy(leg.foot.position);
        b.y += 0.11;
        pole.set(0, 0, -1);
        solve(a, b, pole, leg.thigh, leg.shin, 0.39, 0.37);
        leg.knee.position.copy(joint);
        leg.foot.rotation.x = motion.airborne ? -0.2 : Math.max(0, Math.sin(phase)) * 0.12 * stride;
        const hand = hands[i]!;
        hand.visible = !isPistol || side === 1;
        b.set(side < 0 ? 0.032 : 0.09, side < 0 ? -0.17 : -0.225, side < 0 ? -0.455 : -0.15);
        if (isPistol) b.set(0.06, -0.21, -0.29);
        b.applyEuler(weaponPivot.rotation).add(weaponPivot.position);
        hand.position.copy(b);
        hand.rotation.copy(weaponPivot.rotation);
        a.set(side * 0.252, 1.36, 0);
        pole.set(side, -0.6, -0.2);
        solve(a, b, pole, arms[i]!.shoulder, arms[i]!.forearm, 0.32, 0.31);
        arms[i]!.elbow.position.copy(joint);
      }
      flash.update(alive ? flashUntil - now : 0, -0.556, 0.018, Math.floor(flashUntil));
      pistolFlash.update(alive ? flashUntil - now : 0, -0.205, 0, Math.floor(flashUntil));
      root.visible = alive;
    },
    dispose() {
      for (const t of textures) t.dispose();
      for (const m of materials) m.dispose();
      flash.dispose();
      pistolFlash.dispose();
    },
  };
}
