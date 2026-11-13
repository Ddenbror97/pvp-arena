/**
 * MP5 / Desert Eagle runtime review (bundled by capture.mjs): the game's own first-person gun
 * (authored-viewmodel.ts with mp5-animation.ts / deagle-animation.ts) in the 60° viewmodel
 * camera at the gun's rest framing, posed at chosen moments of a shot and both reloads, seen
 * from the eye or from outside the rig (side, top, rear, front three-quarter, below).
 */
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import {
  AK_VIEWMODEL,
  AWP_POLICE_VIEWMODEL,
  AWP_TERRORIST_VIEWMODEL,
  HUNTING_POLICE_VIEWMODEL,
  createAuthoredViewmodel,
  M4_VIEWMODEL,
  DEAGLE_POLICE_VIEWMODEL,
  DEAGLE_TERRORIST_VIEWMODEL,
  MP5_POLICE_VIEWMODEL,
  MP5_TERRORIST_VIEWMODEL,
  SPAS12_POLICE_VIEWMODEL,
} from "../../../src/lib/fps/authored-viewmodel";
import {
  SPAS12_EQUIP_FROM,
  SPAS12_EQUIP_MS,
  SPAS12_INSPECT,
  SPAS12_VIEWMODEL_REST,
  spas12Equip,
} from "../../../src/lib/fps/spas12-animation";
import { sampleVec } from "../../../src/lib/fps/reload-animation";
import { DEAGLE_VIEWMODEL_REST } from "../../../src/lib/fps/deagle-animation";
import { MP5_VIEWMODEL_REST } from "../../../src/lib/fps/mp5-animation";
import {
  AWP_VIEWMODEL_REST,
  boltPose,
  RELOAD_BOLT,
  SHOT_BOLT,
} from "../../../src/lib/fps/awp-animation";
import { AWP } from "../../../src/lib/fps/primary";

export type Shot = {
  name: string;
  team: "police" | "terrorist";
  /**
   * "rest" | "shot" (kick 0..1) | "tactical" / "empty" (progress 0..1) | "locked" (empty, idle) |
   * "equip" / "inspect" (the SPAS-12's own, progress 0..1; br-viewmodel.ts applies the same).
   */
  kind: "rest" | "shot" | "tactical" | "empty" | "locked" | "equip" | "inspect";
  p?: number;
  kick?: number;
  /** Bolt actions: ms into the bolt cycle after a shot (kind "shot"). */
  ms?: number;
  /**
   * The eye, or a camera outside the rig: the right side (90°), the left side profile, top,
   * rear right, front right, front left from below, front left 45°, over the right shoulder,
   * and a close-up from underneath on the loading port / magazine well.
   */
  view?:
    | "eye"
    | "side"
    | "top"
    | "rear"
    | "front"
    | "below"
    | "left"
    | "frontleft"
    | "shoulder"
    | "bottom";
};
type Rest = { x: number; y: number; z: number; pitch: number; yaw: number; roll: number };
declare global {
  interface Window {
    review: (
      gun: "mp5" | "deagle" | "m4" | "awp" | "hunting" | "spas12",
      shots: Shot[],
      size: [number, number],
      rest?: Rest,
    ) => Promise<Record<string, string>>;
  }
}

window.review = async (gun, shots, [w, h], restOverride) => {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(w, h);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.body.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xb9a990);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.35;
  // The battle royale view-scene lights (br-viewmodel.ts).
  const hemi = new THREE.HemisphereLight(0xe4eaff, 0x40382c, 1.9);
  const key = new THREE.DirectionalLight(0xfff0d8, 1.6);
  key.position.set(-1, 2, 1);
  for (const l of [hemi, key]) {
    l.layers.set(1);
    scene.add(l);
  }
  const camera = new THREE.PerspectiveCamera(60, w / h, 0.01, 8);
  camera.layers.set(1);
  scene.add(camera);
  const group = new THREE.Group();
  camera.add(group);
  const RIFLE_REST = { x: 0.14, y: -0.12, z: -0.2, pitch: 0.012, yaw: 0.014, roll: -0.05 };
  const r =
    restOverride ??
    (gun === "mp5"
      ? MP5_VIEWMODEL_REST
      : gun === "m4"
        ? RIFLE_REST
        : gun === "spas12"
          ? SPAS12_VIEWMODEL_REST
          : gun === "awp" || gun === "hunting"
            ? AWP_VIEWMODEL_REST
            : DEAGLE_VIEWMODEL_REST);
  const bolted = gun === "awp" || gun === "hunting";
  group.position.set(r.x, r.y, r.z);
  group.rotation.set(r.pitch, r.yaw, r.roll);
  const views = {
    police: createAuthoredViewmodel(
      group,
      true,
      gun === "mp5"
        ? MP5_POLICE_VIEWMODEL
        : gun === "m4"
          ? M4_VIEWMODEL
          : gun === "spas12"
            ? SPAS12_POLICE_VIEWMODEL
            : gun === "awp"
              ? AWP_POLICE_VIEWMODEL
              : gun === "hunting"
                ? HUNTING_POLICE_VIEWMODEL
                : DEAGLE_POLICE_VIEWMODEL,
    ),
    terrorist: createAuthoredViewmodel(
      group,
      true,
      gun === "mp5"
        ? MP5_TERRORIST_VIEWMODEL
        : gun === "m4"
          ? AK_VIEWMODEL
          : gun === "spas12"
            ? // (Battle royale only: the SPAS-12 has no Terrorist build.)
              SPAS12_POLICE_VIEWMODEL
            : gun === "awp" || gun === "hunting"
              ? AWP_TERRORIST_VIEWMODEL
              : DEAGLE_TERRORIST_VIEWMODEL,
    ),
  };
  await Promise.all([views.police.ready, views.terrorist.ready]);
  // A floor far below for a horizon cue.
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: 0xa48d6c, roughness: 0.95 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.7;
  floor.layers.set(1);
  scene.add(floor);
  const out: Record<string, string> = {};
  for (const s of shots) {
    for (const [team, view] of Object.entries(views)) {
      if (team !== s.team) {
        view.update(false, 0, 0);
        continue;
      }
      const reload = s.kind === "tactical" || s.kind === "empty";
      const p = reload ? Math.min(0.9999, Math.max(1e-4, s.p ?? 0)) : 0;
      const bolt = !bolted
        ? null
        : s.kind === "empty"
          ? boltPose(p * AWP.reloadMs, RELOAD_BOLT)
          : s.kind === "shot" && s.ms !== undefined
            ? boltPose(s.ms, SHOT_BOLT)
            : null;
      view.update(
        true,
        p,
        s.kick ?? (s.kind === "shot" && !s.ms ? 1 : 0),
        s.kind === "empty" || s.kind === "locked" ? "empty" : "tactical",
        bolt,
      );
    }
    // The whole-viewmodel offsets of the equip and the inspection (camera space).
    group.position.set(r.x, r.y, r.z);
    group.rotation.set(r.pitch, r.yaw, r.roll);
    if (s.kind === "equip" || s.kind === "inspect") {
      const up = s.kind === "equip" ? spas12Equip((s.p ?? 0) * SPAS12_EQUIP_MS) : 1;
      const [px, py, pz] =
        s.kind === "equip"
          ? SPAS12_EQUIP_FROM.position
          : sampleVec(SPAS12_INSPECT.position, s.p ?? 0);
      const [rx, ry, rz] =
        s.kind === "equip"
          ? SPAS12_EQUIP_FROM.rotation
          : sampleVec(SPAS12_INSPECT.rotation, s.p ?? 0);
      group.position.set(r.x + px * up, r.y + py * up, r.z + pz * up);
      group.rotation.set(r.pitch + rx * up, r.yaw + ry * up, r.roll + rz * up);
    }
    scene.updateMatrixWorld(true);
    let eye: THREE.Camera = camera;
    if (s.view && s.view !== "eye") {
      const outside = new THREE.PerspectiveCamera(38, w / h, 0.01, 10);
      outside.layers.set(1);
      const box = new THREE.Box3().setFromObject(views[s.team].root);
      const centre = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3()).length();
      const dir = {
        side: [1, 0.08, 0.05],
        left: [-1, 0.1, 0.1],
        top: [0.05, 1, 0.15],
        rear: [0.35, 0.25, 1],
        front: [0.6, 0.3, -0.9],
        below: [-0.5, -0.6, -0.7],
        frontleft: [-0.72, 0.22, -0.66],
        shoulder: [0.42, 0.5, 1],
        bottom: [-0.75, -0.6, -0.3],
      }[s.view];
      const direction = new THREE.Vector3(...(dir as [number, number, number])).normalize();
      // The close-up looks at the loading port (the magazine well on the other guns) from under
      // the gun itself, whichever way a reload has turned it: its direction is the gun's own.
      const master = views[s.team].root.getObjectByName("Weapon_Master");
      const port =
        s.view === "bottom"
          ? (views[s.team].root.getObjectByName("LoadingPort") ??
            views[s.team].root.getObjectByName("Magazine"))
          : undefined;
      if (port && master) {
        port.getWorldPosition(centre);
        direction.transformDirection(master.matrixWorld);
        outside.up.set(0, 0, -1).transformDirection(master.matrixWorld);
      }
      const close = s.view === "frontleft" || s.view === "shoulder" ? 0.8 : 1.2;
      outside.position.copy(centre).addScaledVector(direction, size * (port ? 0.3 : close));
      outside.lookAt(centre);
      eye = outside;
    }
    renderer.render(scene, eye);
    out[s.name] = renderer.domElement.toDataURL("image/png");
  }
  return out;
};
