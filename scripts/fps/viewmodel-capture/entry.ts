/**
 * Karambit viewmodel preview: the real first-person knife module (team arms, Blender clips) under
 * the renderer's view-scene lighting, rendered at chosen clip times.
 */
import * as THREE from "three";
import type { KarambitControls } from "../../../src/lib/fps/karambit-animator";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import {
  AK_VIEWMODEL,
  M4_VIEWMODEL,
  createAuthoredViewmodel,
} from "../../../src/lib/fps/authored-viewmodel";
import { M4_INSPECT, sampleVec } from "../../../src/lib/fps/reload-animation";
import { AK_CASING, createShellCasings, M4_CASING } from "../../../src/lib/fps/shell-casings";
import {
  createKarambitViewmodel,
  KARAMBIT_VIEWMODEL_REST,
} from "../../../src/lib/fps/karambit-viewmodel";

type Shot = {
  clip: string;
  t: number;
  name: string;
  /**
   * Play the state machine instead of seeking a clip: draw, then each [seconds, moving]
   * segment at 60 fps (moving 1 = running), and capture the last frame. A segment may carry a
   * third element: an action at its start ("inspect", "slash", "stab", "jump", "land").
   */
  timeline?: Array<[number, number, string?]>;
  /** Override the right hand control: position (m) and Euler XYZ (rad), plus knife angle. */
  hand?: [number, number, number, number, number, number, number?];
  /** Finger overrides: right [middle, ring, little, thumb] closure; left [curl, open]. */
  fingers?: [number, number, number, number];
  fingersL?: [number, number];
  /** Right elbow offset override (camera-space metres). */
  elbow?: [number, number, number];
  /** Left hand override: position (m) and Euler XYZ (rad). */
  handL?: [number, number, number, number, number, number];
  /**
   * Development camera (the hands stay posed for the gameplay camera): "front" (facing the
   * player), "right", "left", "top", "three" (three-quarter, front right above), or [yaw, pitch,
   * distance] orbiting the point between the hands.
   */
  view?: "front" | "right" | "left" | "top" | "three" | [number, number, number];
  /** What a development camera looks at: the point between the hands (default) or the ring. */
  target?: "mid" | "ring" | "left";
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
  const rest = { ...KARAMBIT_VIEWMODEL_REST };
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
  // Eye marker for the development cameras (where the player's eye is).
  const eye = new THREE.Mesh(
    new THREE.SphereGeometry(0.012, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0xff3355 }),
  );
  eye.layers.set(1);
  scene.add(eye);
  for (const shot of shots) {
    const frame = {
      dt: 1 / 60,
      equipped: true,
      moving: 0,
      walking: false,
      backward: false,
      strafe: 0,
      airborne: false,
      reducedMotion: false,
    };
    let c: KarambitControls;
    const a = vm.animator!;
    if (shot.timeline) {
      a.update({ ...frame, equipped: false });
      c = a.update(frame);
      let airborne = false;
      for (const [seconds, moving, act] of shot.timeline) {
        if (act === "inspect") a.inspect();
        if (act === "slash" || act === "stab") a.attack(act);
        if (act === "jump") airborne = true;
        if (act === "land") airborne = false;
        for (let t = 0; t < seconds - 1e-6; t += 1 / 60)
          c = a.update({ ...frame, moving, airborne });
      }
    } else c = a.seek(shot.clip, shot.t)!;
    if (shot.hand) {
      const [x, y, z, rx, ry, rz, knife] = shot.hand;
      c.handPosition.set(x, y, z);
      c.handRotation.setFromEuler(new THREE.Euler(rx, ry, rz));
      if (knife !== undefined) c.knifeRotation.setFromAxisAngle(new THREE.Vector3(1, 0, 0), knife);
    }
    if (shot.handL) {
      const [x, y, z, rx, ry, rz] = shot.handL;
      c.handLPosition.set(x, y, z);
      c.handLRotation.setFromEuler(new THREE.Euler(rx, ry, rz));
    }
    if (shot.fingers) {
      c.fingers.set(shot.fingers[0], shot.fingers[1], shot.fingers[2]);
      c.thumb = shot.fingers[3];
    }
    if (shot.fingersL) c.fingersL.set(shot.fingersL[0], shot.fingersL[1]);
    if (shot.elbow) c.elbowR.set(...shot.elbow);
    camera.position.set(0, 0, 0);
    camera.quaternion.identity();
    group.position.set(
      rest.x + c.viewPosition.x,
      rest.y + c.viewPosition.y,
      rest.z + c.viewPosition.z,
    );
    group.rotation.set(rest.pitch, rest.yaw, rest.roll);
    camera.updateMatrixWorld(true);
    vm.pose(c);
    camera.quaternion.copy(c.viewRotation);
    camera.updateMatrixWorld(true);
    const saved = { position: camera.position.clone(), quaternion: camera.quaternion.clone() };
    eye.visible = !!shot.view;
    if (shot.view) {
      // Orbit the point between the wrists, holding the rig where the gameplay camera put it.
      const wr = vm.root.getObjectByName("karambit-wrist-R")!.getWorldPosition(new THREE.Vector3());
      const wl = vm.root.getObjectByName("karambit-wrist-L")!.getWorldPosition(new THREE.Vector3());
      const target =
        shot.target === "ring"
          ? vm.root.getObjectByName("karambit-ring")!.getWorldPosition(new THREE.Vector3())
          : wr
              .add(wl)
              .multiplyScalar(0.5)
              .add(new THREE.Vector3(0, 0.03, -0.04));
      const presets: Record<string, [number, number, number]> = {
        front: [Math.PI, 0.1, 0.62],
        right: [Math.PI / 2, 0.05, 0.62],
        left: [-Math.PI / 2, 0.05, 0.62],
        top: [0, -Math.PI / 2 + 0.02, 0.72],
        three: [2.3, 0.45, 0.72],
      };
      const [yaw, pitch, distance] =
        typeof shot.view === "string" ? presets[shot.view]! : shot.view;
      const offset = new THREE.Vector3(0, 0, distance).applyEuler(
        new THREE.Euler(-pitch, yaw, 0, "YXZ"),
      );
      group.updateWorldMatrix(true, false);
      const held = group.matrixWorld.clone();
      eye.position.copy(saved.position);
      camera.position.copy(target).add(offset);
      camera.up.set(0, 1, 0);
      camera.lookAt(target);
      camera.updateMatrixWorld(true);
      held.premultiply(camera.matrixWorld.clone().invert());
      held.decompose(group.position, group.quaternion, group.scale);
      camera.updateMatrixWorld(true);
    } else {
      // Report where the knife sits on screen (NDC) in this pose.
      const ring = vm.root.getObjectByName("karambit-ring")!;
      const tip = vm.root.getObjectByName("BladeTip");
      if (tip) {
        const ndc = (o: THREE.Object3D) =>
          o
            .getWorldPosition(new THREE.Vector3())
            .project(camera)
            .toArray()
            .slice(0, 2)
            .map((n) => +n.toFixed(2));
        console.warn(
          `TIP ${shot.name} ring ${ndc(ring)} tip ${ndc(tip)} fingers ${c.fingers.toArray().map((n) => n.toFixed(2))} thumb ${c.thumb.toFixed(2)} L ${c.fingersL.toArray().map((n) => n.toFixed(2))}`,
        );
      }
    }
    renderer.info.reset();
    renderer.render(scene, camera);
    out[shot.name] = {
      image: renderer.domElement.toDataURL("image/jpeg", 0.9),
      calls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
    };
    camera.position.copy(saved.position);
    camera.quaternion.copy(saved.quaternion);
    camera.up.set(0, 1, 0);
  }
  return out;
};

/**
 * Rifle viewmodel preview (team arms dress: sleeves, watch): the real authored rifle module at
 * the renderer's rest framing. Shots: { name, reload?: 0–1 progress, kind?, inspect?: 0–1 (M4
 * inspect clip progress) }.
 */
type RifleShot = {
  name: string;
  reload?: number;
  kind?: "tactical" | "empty";
  inspect?: number;
  /** Eject a case from the port and show it this many ms into its flight. */
  casing?: number;
  /** Case close-up: hide the rifle and show three cases (side, head, mouth) in front of the lens. */
  studio?: boolean;
};
declare global {
  interface Window {
    rifleCapture: (
      variant: "ak" | "m4",
      shots: RifleShot[],
      w: number,
      h: number,
      fov?: number,
      guardTwist?: number,
    ) => Promise<unknown>;
  }
}
/** renderer.ts VIEWMODEL_REST / M4_VIEWMODEL_REST (identical framing). */
const RIFLE_REST = { x: 0.14, y: -0.12, z: -0.2, pitch: 0.012, yaw: 0.014, roll: -0.05 };
window.rifleCapture = async (variantId, shots, w, h, fov = 60, guardTwist) => {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(w, h);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  document.body.replaceChildren(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x5d6b66);
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(
    new RoomEnvironment(),
    0.04,
  ).texture;
  scene.environmentIntensity = 0.6;
  const camera = new THREE.PerspectiveCamera(fov, w / h, 0.03, 8);
  camera.layers.enableAll();
  scene.add(camera);
  const sun = new THREE.DirectionalLight(0xffe0c6, 3),
    rim = new THREE.DirectionalLight(0xbfd6ff, 1.6);
  sun.position.set(-1, 3, 2);
  rim.position.set(2, 1.4, -2.5);
  scene.add(new THREE.HemisphereLight(0xe4eaff, 0x392346, 1.8), sun, rim);
  const group = new THREE.Group();
  camera.add(group);
  const base = variantId === "m4" ? M4_VIEWMODEL : AK_VIEWMODEL;
  // --guard-twist=<rad>: preview the support hand turned about its own axis (wrist fixed).
  const variant =
    guardTwist === undefined ? base : { ...base, guard: { ...base.guard, handTwist: guardTwist } };
  const vm = createAuthoredViewmodel(group, true, variant);
  await vm.ready;
  const out: Record<string, { image: string; calls: number; triangles: number }> = {};
  const casings = createShellCasings(0, variantId === "m4" ? M4_CASING : AK_CASING);
  scene.add(casings.mesh);
  for (const shot of shots) {
    vm.update(true, shot.reload ?? 0, 0, shot.kind ?? "tactical");
    const ip = shot.inspect !== undefined ? sampleVec(M4_INSPECT.position, shot.inspect) : null,
      ir = shot.inspect !== undefined ? sampleVec(M4_INSPECT.rotation, shot.inspect) : null;
    group.position.set(
      RIFLE_REST.x + (ip?.[0] ?? 0),
      RIFLE_REST.y + (ip?.[1] ?? 0),
      RIFLE_REST.z + (ip?.[2] ?? 0),
    );
    group.rotation.set(
      RIFLE_REST.pitch + (ir?.[0] ?? 0),
      RIFLE_REST.yaw + (ir?.[1] ?? 0),
      RIFLE_REST.roll + (ir?.[2] ?? 0),
    );
    camera.updateMatrixWorld(true);
    casings.clear();
    group.visible = !shot.studio;
    if (shot.studio) {
      casings.emit(
        new THREE.Vector3(),
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(0, 0, 1),
        0,
      );
      const poses: Array<[number, number, number, number, number, number]> = [
        [-0.018, 0.002, -0.11, 0.25, 0, Math.PI / 2 + 0.15],
        [0.012, 0.004, -0.11, 1.9, 0.5, 0.2],
        [0.036, -0.004, -0.11, -1.05, 0.2, -0.35],
      ];
      poses.forEach(([x, y, z, rx, ry, rz], i) => {
        const m = new THREE.Matrix4().compose(
          new THREE.Vector3(x, y, z).applyMatrix4(camera.matrixWorld),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
          new THREE.Vector3(1, 1, 1),
        );
        casings.mesh.setMatrixAt(i, m);
      });
      casings.mesh.count = poses.length;
      casings.mesh.instanceMatrix.needsUpdate = true;
    } else if (shot.casing !== undefined) {
      // As the renderer does: port and weapon axes into scene space, then advance the flight.
      const at = new THREE.Vector3();
      if (vm.ejectionPort(at)) {
        group.updateWorldMatrix(true, false);
        group.localToWorld(at);
        const axis = (x: number, y: number, z: number) =>
          new THREE.Vector3(x, y, z).transformDirection(group.matrixWorld);
        casings.emit(at, axis(1, 0, 0), axis(0, 1, 0), axis(0, 0, 1), 0);
        for (let t = 16; t <= shot.casing; t += 16) casings.update(16, t);
      }
    }
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
