import * as THREE from "three";
import { Sky } from "three/addons/objects/Sky.js";
import { STRUCTURES, BOXES } from "./map";

/** Reference-inspired geometry, not a screenshot backdrop. Playable cover keeps its shared collider. */
export function addArenaArchitecture(scene: THREE.Scene, branding: THREE.Material) {
  let disposed = false;
  const textures: THREE.Texture[] = [];
  const steel = new THREE.MeshStandardMaterial({
    color: 0x252b38,
    metalness: 0.6,
    roughness: 0.43,
  });
  const frame = new THREE.MeshStandardMaterial({
    color: 0x111723,
    metalness: 0.65,
    roughness: 0.36,
  });
  const paint = new THREE.MeshStandardMaterial({
    color: 0x8542c6,
    emissive: 0x7020ba,
    emissiveIntensity: 0.8,
    roughness: 0.5,
  });
  const led = new THREE.MeshBasicMaterial({ color: 0xb15cff, toneMapped: false });
  const white = new THREE.MeshBasicMaterial({ color: 0xe6e2ff, toneMapped: false });
  const bannerMaterial = new THREE.MeshStandardMaterial({
    color: 0x120a23,
    roughness: 0.65,
    emissive: 0x1b0b2f,
    emissiveIntensity: 0.3,
  });
  const unitBox = new THREE.BoxGeometry(1, 1, 1),
    blocks: THREE.Mesh<THREE.BoxGeometry, THREE.Material>[] = [];
  const block = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    material: THREE.Material = steel,
  ) => {
    const mesh = new THREE.Mesh(unitBox, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, d);
    blocks.push(mesh);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  };
  for (const solid of STRUCTURES) {
    const mesh = block(solid.x, solid.y, solid.z, solid.w, solid.h, solid.d);
    mesh.name = solid.id;
  }
  const logo = new THREE.TextureLoader().load("/brand/arena-logo-email.png", () => {
    if (disposed) logo.dispose();
  });
  logo.colorSpace = THREE.SRGBColorSpace;
  textures.push(logo);
  const logoMaterial = new THREE.MeshStandardMaterial({
    map: logo,
    transparent: true,
    alphaTest: 0.03,
    roughness: 0.45,
    metalness: 0.1,
    depthWrite: false,
  });
  const logoPlane = (w: number, h: number, x: number, y: number, z: number, ry = 0) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), logoMaterial);
    mesh.position.set(x, y, z);
    mesh.rotation.y = ry;
    scene.add(mesh);
    return mesh;
  };
  for (const side of [-1, 1]) {
    // Projecting upper decks, signage towers and a framed main display.
    block(side * 11.995, 6.44, 0, 0.018, 0.055, 32, led).castShadow = false;
    block(side * 11.995, 2.45, 0, 0.018, 0.04, 27, paint).castShadow = false;
    block(0, 4.45, side * 16.01, 8.45, 2.9, 0.025, frame);
    for (const y of [3.03, 5.87])
      block(0, y, side * 15.99, 8.5, 0.035, 0.02, led).castShadow = false;
    for (const z of [-10, 10]) {
      const light = new THREE.PointLight(0x8f39ff, 22, 13, 2);
      light.position.set(side * 10.9, 2.8, z);
      scene.add(light);
      // Lower service door is a closed, inset wall surface; it is not a false playable tunnel.
      const door = block(side * 11.997, 1.2, z, 0.004, 2.35, 2.5, frame);
      door.castShadow = false;
      for (const zz of [-1.3, 1.3]) block(side * 11.992, 1.3, z + zz, 0.004, 2.5, 0.06, steel);
      block(side * 11.99, 2.46, z, 0.005, 0.04, 2.65, led).castShadow = false;
    }
    // Giant side billboards, oriented into the combat space.
    block(side * 11.997, 4.75, 0, 0.006, 2.7, 8.6, frame).castShadow = false;
    const board = new THREE.Mesh(new THREE.PlaneGeometry(8.3, 2.4), branding);
    board.position.set(side * 11.99, 4.75, 0);
    board.rotation.y = (-side * Math.PI) / 2;
    scene.add(board);
    for (const z of [-4.3, 4.3])
      block(side * 11.985, 4.75, z, 0.008, 2.75, 0.025, led).castShadow = false;
    for (const x of [-7, 7]) {
      const banner = new THREE.Mesh(new THREE.PlaneGeometry(1.65, 5.8), bannerMaterial);
      banner.position.set(x, 5.8, side * 15.998);
      if (side === 1) banner.rotation.y = Math.PI;
      scene.add(banner);
      logoPlane(1.45, 0.78, x, 6.4, side * 15.992, side === 1 ? Math.PI : 0);
      logoPlane(1.2, 0.64, x, 4.4, side * 15.992, side === 1 ? Math.PI : 0);
      for (const edge of [-0.87, 0.87]) block(x + edge, 5.8, side * 15.997, 0.025, 5.9, 0.006, led);
      for (const dx of [-0.65, 0, 0.65]) {
        const flood = block(x + dx, 9.47, side * 16.53, 0.3, 0.14, 0.03, white);
        flood.castShadow = false;
      }
    }
    // Exact native brand artwork on the floor, with painted ring and lane markings.
    const floorLogo = logoPlane(4.3, 2.3, 0, 0.008, side * 8);
    floorLogo.rotation.x = -Math.PI / 2;
    floorLogo.rotation.z = side === 1 ? 0 : Math.PI;
    for (const x of [-9.9, 9.9])
      block(x, 0.006, side * 9, 0.08, 0.008, 11, paint).castShadow = false;
    for (const x of [-8.2, 8.2])
      block(x, 0.006, side * 13.8, 3.5, 0.008, 0.08, paint).castShadow = false;
  }
  const ring = new THREE.Mesh(new THREE.RingGeometry(3.8, 3.88, 96), paint);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.008;
  scene.add(ring);
  // Cases receive inset ribs, diagonal reinforcing bars and branded plaques.
  for (const b of BOXES) {
    for (const side of [-1, 1]) {
      for (const level of [-1, 1])
        block(
          b.x,
          b.y + level * (b.h / 2 - 0.045),
          b.z + side * (b.d / 2 - 0.012),
          b.w,
          0.09,
          0.024,
          frame,
        );
      for (const edge of [-1, 1])
        block(
          b.x + edge * (b.w / 2 - 0.035),
          b.y,
          b.z + side * (b.d / 2 - 0.012),
          0.07,
          b.h,
          0.024,
          frame,
        );
      const length = Math.hypot(b.w * 0.65, b.h * 0.65);
      for (const diagonal of [-1, 1]) {
        const brace = block(b.x, b.y, b.z + side * (b.d / 2 - 0.009), 0.035, length, 0.018, steel);
        brace.rotation.z = diagonal * Math.atan2(b.w, b.h);
      }
      block(b.x, b.y - b.h * 0.3, b.z + side * (b.d / 2 - 0.006), b.w * 0.95, 0.025, 0.012, paint);
      if (b.w > 1.5) {
        const sign = new THREE.Mesh(
          new THREE.PlaneGeometry(Math.min(1.1, b.w * 0.5), Math.min(0.6, b.h * 0.4)),
          branding,
        );
        sign.position.set(b.x, b.y, b.z + side * (b.d / 2 + 0.002));
        if (side === -1) sign.rotation.y = Math.PI;
        scene.add(sign);
      }
    }
  }
  // Actual distant terrain supplies the mountain silhouette outside the playable facility.
  const terrain = new THREE.PlaneGeometry(280, 280, 90, 90);
  terrain.rotateX(-Math.PI / 2);
  const p = terrain.getAttribute("position"),
    colors = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      z = p.getZ(i),
      radius = Math.hypot(x, z),
      ramp = THREE.MathUtils.smoothstep(radius, 45, 80);
    const height =
      ramp *
        (10 +
          Math.abs(Math.sin(x * 0.055 + z * 0.027)) * 20 +
          Math.sin(z * 0.07) * 8 +
          Math.cos(x * 0.11) * 4 +
          Math.sin(x * 0.23 + z * 0.17) * 4 +
          Math.cos(x * 0.41 - z * 0.31) * 2) -
      5;
    p.setY(i, height);
    const c = new THREE.Color().setHSL(
      0.09,
      0.08,
      THREE.MathUtils.clamp(0.32 + height * 0.002, 0.3, 0.48),
    );
    colors.set([c.r, c.g, c.b], i * 3);
  }
  terrain.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  terrain.computeVertexNormals();
  const mountains = new THREE.Mesh(
    terrain,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }),
  );
  mountains.name = "distant-nonplayable-mountains";
  scene.add(mountains);
  const sky = new Sky();
  sky.scale.setScalar(400);
  sky.material.uniforms["turbidity"]!.value = 2;
  sky.material.uniforms["rayleigh"]!.value = 2;
  sky.material.uniforms["mieCoefficient"]!.value = 0.003;
  sky.material.uniforms["sunPosition"]!.value.set(-0.45, 0.82, 0);
  sky.material.uniforms["showSunDisc"]!.value = false;
  scene.add(sky);
  // Repeated frames, rails and ribs retain their exact transforms in a handful of static draws.
  const batches = new Map<
    string,
    { material: THREE.Material; shadow: boolean; meshes: THREE.Mesh[] }
  >();
  for (const mesh of blocks) {
    const key = mesh.material.uuid + String(mesh.castShadow);
    if (!batches.has(key))
      batches.set(key, { material: mesh.material, shadow: mesh.castShadow, meshes: [] });
    batches.get(key)!.meshes.push(mesh);
  }
  for (const group of batches.values()) {
    const batch = new THREE.InstancedMesh(unitBox, group.material, group.meshes.length);
    batch.castShadow = group.shadow;
    batch.receiveShadow = true;
    group.meshes.forEach((mesh, index) => {
      mesh.updateMatrix();
      batch.setMatrixAt(index, mesh.matrix);
      mesh.removeFromParent();
    });
    scene.add(batch);
  }
  return {
    dispose() {
      disposed = true;
      for (const t of textures) t.dispose();
    },
  };
}
