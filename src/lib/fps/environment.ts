import * as THREE from "three";
import { ARENA, BOXES, WALLS, FLOOR, type Surface } from "./map";
import { addArenaArchitecture } from "./arena-architecture";

/** Materials and small inset details decorate the same solid envelopes used by the server. */
export function createArenaEnvironment(scene: THREE.Scene, branding: THREE.Material) {
  const textures: THREE.Texture[] = [];
  let disposed = false;
  let seed = 7039;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const texture = (surface: Surface) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 512;
    const context = canvas.getContext("2d")!,
      pixels = context.createImageData(512, 512);
    const base =
      surface === "wood" ? [112, 84, 54] : surface === "metal" ? [86, 98, 101] : [137, 137, 128];
    for (let y = 0; y < 512; y++)
      for (let x = 0; x < 512; x++) {
        const noise = (random() - 0.5) * 22;
        const grain =
          surface === "wood"
            ? Math.sin(y * 0.18 + Math.sin(x * 0.009) * 4) * 10
            : surface === "metal"
              ? Math.sin((x * Math.PI) / 16) * 7
              : Math.sin(x * 0.04) * Math.sin(y * 0.03) * 4;
        const seam = surface === "wood" && y % 128 < 3 ? -28 : 0;
        const offset = (y * 512 + x) * 4;
        for (let c = 0; c < 3; c++) pixels.data[offset + c] = base[c]! + noise + grain + seam;
        pixels.data[offset + 3] = 255;
      }
    context.putImageData(pixels, 0, 0);
    context.globalAlpha = 0.1;
    for (let i = 0; i < 100; i++) {
      context.strokeStyle = i % 2 ? "#272624" : "#d6d2ba";
      context.lineWidth = random() * 2 + 0.2;
      const x = random() * 512,
        y = random() * 512;
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + (surface === "wood" ? 120 : random() * 35), y + random() * 5);
      context.stroke();
    }
    context.globalAlpha = 1;
    const map = new THREE.CanvasTexture(canvas);
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
    textures.push(map);
    const bump = map.clone();
    bump.colorSpace = THREE.NoColorSpace;
    textures.push(bump);
    return { map, bump };
  };
  const makeMaterial = (surface: Surface) => {
    const { map, bump } = texture(surface);
    return new THREE.MeshStandardMaterial({
      map,
      bumpMap: bump,
      bumpScale: surface === "concrete" ? 0.035 : 0.018,
      roughness: surface === "metal" ? 0.62 : 0.92,
      metalness: surface === "metal" ? 0.32 : 0,
    });
  };
  const materials = {
    concrete: makeMaterial("concrete"),
    metal: makeMaterial("metal"),
    wood: makeMaterial("wood"),
  };
  const steel = new THREE.MeshStandardMaterial({
    color: 0x474b4b,
    roughness: 0.65,
    metalness: 0.45,
  });
  const dark = new THREE.MeshStandardMaterial({ color: 0x343837, roughness: 0.9 });
  const purple = new THREE.MeshStandardMaterial({
    color: 0x6c3b99,
    emissive: 0x512077,
    emissiveIntensity: 0.35,
  });
  const mesh = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    mat: THREE.Material,
  ) => {
    const geometry = new THREE.BoxGeometry(w, h, d),
      uv = geometry.getAttribute("uv");
    // Three metres per material tile, shared across walls and differently sized cover.
    for (let face = 0; face < 6; face++)
      for (let corner = 0; corner < 4; corner++) {
        const i = face * 4 + corner,
          span = face < 2 ? [d, h] : face < 4 ? [w, d] : [w, h];
        uv.setXY(i, (uv.getX(i) * span[0]!) / 3, (uv.getY(i) * span[1]!) / 3);
      }
    const object = new THREE.Mesh(geometry, mat);
    object.position.set(x, y, z);
    object.castShadow = true;
    object.receiveShadow = true;
    scene.add(object);
    return object;
  };
  const details: THREE.Matrix4[] = [];
  const dummy = new THREE.Object3D();
  const detail = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    rotation = 0,
  ) => {
    dummy.position.set(x, y, z);
    dummy.scale.set(w, h, d);
    dummy.rotation.set(0, 0, rotation);
    dummy.updateMatrix();
    details.push(dummy.matrix.clone());
  };
  const floorMat = materials.concrete.clone();
  const concreteImage = new THREE.TextureLoader().load(
    "/fps/concrete-albedo-v2.webp",
    (image) => {
      if (disposed) return;
      materials.concrete.map = image;
      floorMat.map = image;
      materials.concrete.needsUpdate = true;
      floorMat.needsUpdate = true;
    },
    undefined,
    () => console.warn("FPS concrete image unavailable; retaining the procedural material."),
  );
  concreteImage.colorSpace = THREE.SRGBColorSpace;
  concreteImage.wrapS = concreteImage.wrapT = THREE.RepeatWrapping;
  concreteImage.anisotropy = 4;
  textures.push(concreteImage);
  floorMat.color.setHex(0x969eab);
  floorMat.roughness = 0.43;
  floorMat.metalness = 0.16;
  materials.metal.color.setHex(0x666781);
  materials.metal.roughness = 0.43;
  materials.wood.color.setHex(0x786e88);
  mesh(FLOOR.x, FLOOR.y, FLOOR.z, FLOOR.w, FLOOR.h, FLOOR.d, floorMat).castShadow = false;
  for (const wall of WALLS) {
    const m = mesh(wall.x, wall.y, wall.z, wall.w, wall.h, wall.d, materials.concrete);
    m.name = wall.id;
  }
  for (const b of BOXES) {
    const m = mesh(b.x, b.y, b.z, b.w - 0.002, b.h, b.d - 0.002, materials[b.surface]);
    m.name = b.id;
    const bottom = b.y - b.h / 2;
    if (b.surface === "metal") {
      // Corrugation ribs, corner posts and door locks share one instanced draw.
      for (const sign of [-1, 1]) {
        for (let i = 0; i < 18; i++)
          detail(
            b.x + sign * (b.w / 2 - 0.006),
            b.y,
            b.z - b.d / 2 + 0.14 + (i * (b.d - 0.28)) / 17,
            0.012,
            b.h - 0.12,
            0.035,
          );
        for (const x of [-1, 1])
          detail(b.x + x * (b.w / 2 - 0.045), b.y, b.z + sign * (b.d / 2 - 0.025), 0.09, b.h, 0.05);
        detail(b.x, b.y, b.z + sign * (b.d / 2 - 0.012), 0.025, b.h - 0.06, 0.024);
        for (const x of [-0.75, 0.75])
          detail(b.x + x, b.y, b.z + sign * (b.d / 2 - 0.02), 0.035, b.h - 0.22, 0.04);
        for (const y of [bottom + 0.08, bottom + b.h - 0.08])
          detail(b.x, y, b.z + sign * (b.d / 2 - 0.025), b.w, 0.1, 0.05);
      }
      for (const sign of [-1, 1]) {
        const plate = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.58), branding);
        plate.position.set(b.x + sign * (b.w / 2 + 0.001), b.y + 0.2, b.z);
        plate.rotation.y = (sign * Math.PI) / 2;
        scene.add(plate);
      }
    } else if (b.surface === "wood") {
      for (const sign of [-1, 1]) {
        for (const y of [bottom + 0.07, bottom + b.h - 0.07])
          detail(b.x, y, b.z + sign * (b.d / 2 - 0.018), b.w, 0.1, 0.036);
        for (const x of [-1, 1])
          detail(b.x + x * (b.w / 2 - 0.05), b.y, b.z + sign * (b.d / 2 - 0.025), 0.1, b.h, 0.05);
        for (const x of [-1, 1]) detail(b.x + x * (b.w / 2 - 0.018), b.y, b.z, 0.036, 0.1, b.d);
      }
    } else {
      for (const sign of [-1, 1]) {
        detail(b.x, bottom + 0.055, b.z + sign * (b.d / 2 - 0.02), b.w - 0.05, 0.05, 0.04);
        for (const x of [-1, 1])
          detail(
            b.x + x * (b.w / 2 - 0.045),
            b.y,
            b.z + sign * (b.d / 2 - 0.006),
            0.035,
            b.h - 0.06,
            0.012,
          );
      }
    }
  }
  for (const side of [-1, 1]) {
    for (let z = -14; z <= 14; z += 4)
      detail(side * (ARENA.width / 2 + 0.12), 3.2, z, 0.24, 6.4, 0.16);
    detail(side * (ARENA.width / 2 + 0.04), 5.9, 0, 0.08, 0.18, 32);
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(8, 2.5), branding);
    banner.position.set(0, 4.45, side * 15.995);
    if (side === 1) banner.rotation.y = Math.PI;
    scene.add(banner);
    mesh(side * 11.995, 4.9, 0, 0.008, 0.045, 10, purple);
    const light = new THREE.PointLight(0x8657be, 3, 8, 2);
    light.position.set(side * 10.8, 4.7, 0);
    scene.add(light);
  }
  // Painted floor markings have no volume; the floor below is a shared solid.
  for (const side of [-1, 1])
    for (const x of [-9.5, 9.5]) {
      mesh(x, 0.003, side * 11.5, 0.06, 0.005, 5, dark).castShadow = false;
      mesh(x + side * 0.5, 0.003, side * 14, 0.95, 0.005, 0.06, dark).castShadow = false;
    }
  const braces = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), steel, details.length);
  for (let i = 0; i < details.length; i++) braces.setMatrixAt(i, details[i]!);
  braces.castShadow = true;
  braces.receiveShadow = true;
  scene.add(braces);
  const architecture = addArenaArchitecture(scene, branding);
  return {
    dispose() {
      disposed = true;
      architecture.dispose();
      for (const t of textures) t.dispose();
    },
  };
}
