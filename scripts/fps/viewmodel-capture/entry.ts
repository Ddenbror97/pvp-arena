/**
 * Karambit viewmodel preview: the real first-person knife module (team arms, Blender clips) under
 * the renderer's view-scene lighting, rendered at chosen clip times.
 */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { AK_VIEWMODEL, M4_VIEWMODEL } from "../../../src/lib/fps/authored-viewmodel";
import {
  createKarambitViewmodel,
  KARAMBIT_VIEWMODEL_REST,
  karambitRestX,
} from "../../../src/lib/fps/karambit-viewmodel";

type Shot = {
  clip: string;
  t: number;
  name: string;
  rest?: [number, number, number, number, number, number];
  /** Override the hand control: position (m) and Euler XYZ (rad), plus knife angle. */
  hand?: [number, number, number, number, number, number, number?];
};
declare global {
  interface Window {
    viewmodelCapture: (
      variant: "ak" | "m4",
      shots: Shot[],
      w: number,
      h: number,
      fov?: number,
    ) => Promise<unknown>;
  }
}
window.viewmodelCapture = async (variantId, shots, w, h, fov = 60) => {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(w, h);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  document.body.replaceChildren(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x5d6b66);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.6;
  const camera = new THREE.PerspectiveCamera(fov, w / h, 0.03, 8);
  camera.layers.set(1);
  scene.add(camera);
  const sun = new THREE.DirectionalLight(0xffe0c6, 3),
    rim = new THREE.DirectionalLight(0xbfd6ff, 1.6);
  sun.position.set(-1, 3, 2);
  rim.position.set(2, 1.4, -2.5);
  for (const light of [new THREE.HemisphereLight(0xe4eaff, 0x392346, 1.8), sun, rim]) {
    light.layers.set(1);
    scene.add(light);
  }
  const group = new THREE.Group();
  camera.add(group);
  const rest = { ...KARAMBIT_VIEWMODEL_REST, x: karambitRestX(w / h) };
  group.position.set(rest.x, rest.y, rest.z);
  group.rotation.set(rest.pitch, rest.yaw, rest.roll);
  const vm = createKarambitViewmodel(group, variantId === "m4" ? M4_VIEWMODEL : AK_VIEWMODEL);
  await vm.ready;
  vm.root.visible = true;
  const out: Record<string, { image: string; calls: number; triangles: number }> = {};
  // Wait for lazily loaded textures (the Police forearm skin): TextureLoader assigns the image on load.
  const unloaded = () => {
    let missing = 0;
    vm.root.traverse((o) => {
      const material = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (material?.map && !material.map.image) missing++;
    });
    return missing;
  };
  for (let waited = 0; unloaded() > 0 && waited < 5000; waited += 50)
    await new Promise((done) => setTimeout(done, 50));
  for (const shot of shots) {
    const c = vm.animator!.seek(shot.clip, shot.t)!;
    if (shot.hand) {
      const [x, y, z, rx, ry, rz, knife] = shot.hand;
      c.handPosition.set(x, y, z);
      c.handRotation.setFromEuler(new THREE.Euler(rx, ry, rz));
      if (knife !== undefined) c.knifeRotation.setFromAxisAngle(new THREE.Vector3(1, 0, 0), knife);
    }
    vm.pose(c);
    group.position.set(
      rest.x + c.viewPosition.x,
      rest.y + c.viewPosition.y,
      rest.z + c.viewPosition.z,
    );
    camera.quaternion.copy(c.viewRotation);
    if (shot.rest) {
      const [x, y, z, pitch, yaw, roll] = shot.rest;
      group.position.set(x + c.viewPosition.x, y + c.viewPosition.y, z + c.viewPosition.z);
      group.rotation.set(pitch, yaw, roll);
    } else group.rotation.set(rest.pitch, rest.yaw, rest.roll);
    camera.updateMatrixWorld(true);
    renderer.info.reset();
    renderer.render(scene, camera);
    out[shot.name] = {
      image: renderer.domElement.toDataURL("image/jpeg", 0.9),
      calls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
    };
  }
  return out;
};
