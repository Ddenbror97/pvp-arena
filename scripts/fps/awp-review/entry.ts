/**
 * AWP runtime review (bundled by capture.mjs): the game's own first-person AWP
 * (authored-viewmodel.ts + awp-animation.ts) in the 60° viewmodel camera at the AWP rest
 * framing, posed at chosen moments of the bolt cycle and both reloads.
 */
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import {
  AWP_POLICE_VIEWMODEL,
  AWP_TERRORIST_VIEWMODEL,
  createAuthoredViewmodel,
} from "../../../src/lib/fps/authored-viewmodel";
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
  /** "rest" | "bolt" (ms since the shot) | "tactical" / "empty" (ms since the reload began). */
  kind: "rest" | "bolt" | "tactical" | "empty";
  ms?: number;
  kick?: number;
  /** Look at the rig from outside (right side / from above) instead of the eye. */
  view?: "eye" | "side" | "top" | "rear";
};
declare global {
  interface Window {
    review: (shots: Shot[], size: [number, number]) => Promise<Record<string, string>>;
  }
}

window.review = async (shots, [w, h]) => {
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
  // The game's view-scene lights (renderer.ts).
  const hemi = new THREE.HemisphereLight(0xe4eaff, 0x392346, 1.8);
  const sun = new THREE.DirectionalLight(0xffe0c6, 3);
  sun.position.set(-1, 3, 2);
  const rim = new THREE.DirectionalLight(0xbfd6ff, 1.6);
  rim.position.set(2, 1.4, -2.5);
  for (const l of [hemi, sun, rim]) {
    l.layers.set(1);
    scene.add(l);
  }
  const camera = new THREE.PerspectiveCamera(60, w / h, 0.03, 8);
  camera.layers.set(1);
  scene.add(camera);
  const group = new THREE.Group();
  camera.add(group);
  const r = AWP_VIEWMODEL_REST;
  group.position.set(r.x, r.y, r.z);
  group.rotation.set(r.pitch, r.yaw, r.roll);
  const views = {
    police: createAuthoredViewmodel(group, true, AWP_POLICE_VIEWMODEL),
    terrorist: createAuthoredViewmodel(group, true, AWP_TERRORIST_VIEWMODEL),
  };
  await Promise.all([views.police.ready, views.terrorist.ready]);
  const out: Record<string, string> = {};
  for (const s of shots) {
    for (const [team, view] of Object.entries(views)) {
      if (team !== s.team) {
        view.update(false, 0, 0);
        continue;
      }
      const ms = s.ms ?? 0;
      const reload = s.kind === "tactical" || s.kind === "empty";
      const bolt =
        s.kind === "bolt"
          ? boltPose(ms, SHOT_BOLT)
          : s.kind === "empty"
            ? boltPose(ms, RELOAD_BOLT)
            : null;
      view.update(
        true,
        reload ? Math.max(1e-4, ms / AWP.reloadMs) : 0,
        s.kick ?? 0,
        s.kind === "empty" ? "empty" : "tactical",
        bolt,
      );
    }
    scene.updateMatrixWorld(true);
    let eye: THREE.Camera = camera;
    if (s.view && s.view !== "eye") {
      // Orbit camera on the viewmodel layer, framing the receiver.
      const outside = new THREE.PerspectiveCamera(40, w / h, 0.01, 10);
      outside.layers.set(1);
      const centre = new THREE.Vector3(0.12, -0.12, -0.45);
      camera.localToWorld(centre);
      const offset =
        s.view === "side"
          ? new THREE.Vector3(0.9, 0.05, -0.1)
          : s.view === "top"
            ? new THREE.Vector3(0.05, 0.9, 0.05)
            : new THREE.Vector3(0.25, 0.15, 0.7);
      outside.position.copy(centre).add(offset);
      outside.lookAt(centre);
      eye = outside;
    }
    renderer.render(scene, eye);
    out[s.name] = renderer.domElement.toDataURL("image/png");
  }
  return out;
};
