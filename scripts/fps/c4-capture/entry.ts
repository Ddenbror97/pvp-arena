/**
 * C4 plant preview: the real first-person C4 module (team arms, Blender clips) under the
 * renderer's view-scene lighting. The viewmodel always plays in the gameplay camera's frame (A);
 * the other cameras are inspection angles around the keypad (B close-up, C left three-quarter,
 * D right three-quarter, E side, F showcase orbit). Inspection only: the game never cuts.
 */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { AK_VIEWMODEL, M4_VIEWMODEL } from "../../../src/lib/fps/authored-viewmodel";
import { WORLD_C4_SCALE } from "../../../src/lib/fps/c4/world-c4";
import { createC4Viewmodel } from "../../../src/lib/fps/c4/c4-viewmodel";
import type { C4Presentation, C4View } from "../../../src/lib/fps/c4/c4-timeline";

export type Shot = {
  name: string;
  /** Plant clip time (s), or an exit clip after `exit` seconds of plant. */
  t: number;
  exit?: { kind: "complete" | "cancel"; since: number };
  /**
   * Police defuse instead of the plant: `t` seconds into a `total`-second defuse (10, or 5 with a
   * kit), the bomb `distance` metres ahead on the floor (horizontal) and turned `bearing` degrees,
   * seen from a kneeling eye (0.95 m). `exit` plays the completion or the cancel after `t`.
   */
  defuse?: {
    total: number;
    distance: number;
    bearing: number;
    exit?: { kind: "defused" | "defuse-cancel"; since: number };
  };
  camera: "A" | "B" | "C" | "D" | "E" | "F";
};
declare global {
  interface Window {
    c4Capture: (variant: "ak" | "m4", shots: Shot[], w: number, h: number) => Promise<unknown>;
    c4Lifecycle: (cycles: number) => Promise<unknown>;
  }
}

/**
 * Repeated create → plant + defuse → cancel → dispose of both teams' C4 views: GPU geometries,
 * textures and the animation mixer must come back to the baseline each time.
 */
window.c4Lifecycle = async (cycles) => {
  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(320, 180);
  const scene = new THREE.Scene();
  const eye = new THREE.PerspectiveCamera(60, 16 / 9, 0.03, 8);
  eye.layers.set(1);
  scene.add(eye, new THREE.HemisphereLight(0xffffff, 0x333333, 2));
  renderer.render(scene, eye);
  const base = { ...renderer.info.memory };
  const out: unknown[] = [];
  const bomb = new THREE.Matrix4().makeTranslation(0, -0.9, -0.6);
  for (let i = 0; i < cycles; i++) {
    const views = [createC4Viewmodel(eye, AK_VIEWMODEL), createC4Viewmodel(eye, M4_VIEWMODEL)];
    await Promise.all(views.map((v) => v.ready));
    views[0]!.update(1 / 60, { kind: "plant", elapsed: 1.2 });
    views[1]!.update(1 / 60, { kind: "defuse", elapsed: 3, total: 10 }, bomb);
    renderer.render(scene, eye);
    const mounted = { ...renderer.info.memory };
    views[0]!.update(1 / 60, { kind: "cancel", since: 0, at: 1.2 });
    views[1]!.update(1 / 60, { kind: "defuse-cancel", since: 0 }, bomb);
    renderer.render(scene, eye);
    for (const v of views) v.dispose();
    renderer.render(scene, eye);
    out.push({ cycle: i, mounted, afterDispose: { ...renderer.info.memory } });
  }
  renderer.dispose();
  return { base, cycles: out };
};

const KEYPAD = new THREE.Vector3(-0.0075, -0.03, 0.067);

let setup: ReturnType<typeof init> | null = null;
window.c4Capture = async (variantId, shots, w, h) => {
  setup ??= init(variantId, w, h);
  return (await setup)(shots);
};
async function init(variantId: "ak" | "m4", w: number, h: number) {
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
  // The gameplay eye (camera A) carries the viewmodel; previews render from `view`.
  const eye = new THREE.PerspectiveCamera(60, w / h, 0.03, 8);
  eye.layers.set(1);
  scene.add(eye);
  const view = new THREE.PerspectiveCamera(40, w / h, 0.005, 8);
  view.layers.set(1);
  scene.add(view);
  const sun = new THREE.DirectionalLight(0xffe0c6, 3),
    rim = new THREE.DirectionalLight(0xbfd6ff, 1.6);
  sun.position.set(-1, 3, 2);
  rim.position.set(2, 1.4, -2.5);
  for (const light of [new THREE.HemisphereLight(0xe4eaff, 0x392346, 1.8), sun, rim]) {
    light.layers.set(1);
    scene.add(light);
  }
  const vm = createC4Viewmodel(eye, variantId === "m4" ? M4_VIEWMODEL : AK_VIEWMODEL);
  await vm.ready;
  // Wait for lazily loaded textures.
  for (let waited = 0; waited < 3000; waited += 50) {
    let missing = 0;
    vm.root.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (m?.map && !m.map.image) missing++;
    });
    if (!missing) break;
    await new Promise((r) => setTimeout(r, 50));
  }
  const cues: string[] = [];
  vm.onCue = (name) => cues.push(name);
  return async (shots: Shot[]) => {
    const out: Record<string, unknown> = {};
    cues.length = 0;
    const keypad = new THREE.Vector3(),
      up = new THREE.Vector3(),
      face = new THREE.Vector3(),
      right = new THREE.Vector3();
    let lastExit = -1;
    const bombWorld = new THREE.Matrix4();
    for (const shot of shots) {
      if (shot.defuse) {
        // Kneeling eye at the origin looking at the bomb's keypad on the floor ahead.
        const d = shot.defuse;
        const bomb = new THREE.Vector3(0, 0, -d.distance);
        bombWorld
          .makeTranslation(bomb.x, bomb.y, bomb.z)
          .multiply(new THREE.Matrix4().makeRotationY(THREE.MathUtils.degToRad(d.bearing)))
          .multiply(new THREE.Matrix4().makeRotationX(-Math.PI / 2))
          .multiply(new THREE.Matrix4().makeScale(WORLD_C4_SCALE, WORLD_C4_SCALE, WORLD_C4_SCALE));
        eye.position.set(0, 0.95, 0);
        eye.lookAt(bomb.x, 0.08, bomb.z);
        eye.updateMatrixWorld(true);
        vm.update(0, { kind: "hidden" });
        const step = 1 / 60;
        vm.update(step, { kind: "defuse", elapsed: shot.t, total: d.total }, bombWorld);
        if (d.exit)
          for (let s = 0; s <= d.exit.since + 1e-6; s += step) {
            const view: C4View = { kind: d.exit.kind, since: s };
            vm.update(s === 0 ? 0 : step, view, bombWorld);
          }
        lastExit = 1;
      } else if (shot.exit) {
        eye.position.set(0, 0, 0);
        eye.quaternion.identity();
        // Play the plant up to `t`, then the exit clip for `since` seconds at 60 fps.
        vm.update(0, { kind: "hidden" });
        vm.update(0, { kind: "plant", elapsed: shot.t });
        const step = 1 / 60;
        for (let s = 0; s <= shot.exit.since + 1e-6; s += step) {
          const p: C4Presentation =
            shot.exit.kind === "cancel"
              ? { kind: "cancel", since: s, at: shot.t }
              : { kind: "complete", since: s };
          vm.update(s === 0 ? 0 : step, p);
        }
        lastExit = 1;
      } else {
        eye.position.set(0, 0, 0);
        eye.quaternion.identity();
        if (lastExit > 0) vm.update(0, { kind: "hidden" });
        lastExit = -1;
        vm.update(1 / 60, { kind: "plant", elapsed: shot.t });
      }
      eye.updateMatrixWorld(true);
      let camera: THREE.Camera = eye;
      if (shot.camera !== "A") {
        vm.deviceToWorld(KEYPAD, keypad);
        vm.deviceToWorld(new THREE.Vector3(0, 0.1, 0.067), up)
          .sub(keypad)
          .normalize();
        vm.deviceToWorld(new THREE.Vector3(0, 0, 0.167), face)
          .sub(keypad)
          .normalize();
        right.crossVectors(up, face).normalize();
        const at = (r: number, u: number, f: number, d: number) =>
          view.position
            .copy(keypad)
            .addScaledVector(right, r * d)
            .addScaledVector(up, u * d)
            .addScaledVector(face, f * d);
        if (shot.camera === "B") at(-0.45, -0.25, 1, 0.3);
        else if (shot.camera === "C") at(-0.85, -0.2, 0.7, 0.42);
        else if (shot.camera === "D") at(0.7, 0.4, 0.75, 0.42);
        else if (shot.camera === "E") at(1, 0.05, 0.08, 0.45);
        else {
          // Showcase: a slow orbit from the left over the top to the right as the plant plays.
          const a = -1.1 + (shot.t / 3.2) * 2.2;
          at(Math.sin(a), 0.35, Math.cos(a), 0.55);
        }
        view.up.copy(shot.camera === "E" ? face : up);
        view.lookAt(keypad);
        view.updateMatrixWorld(true);
        camera = view;
      }
      renderer.info.reset();
      renderer.render(scene, camera);
      out[shot.name] = {
        image: renderer.domElement.toDataURL("image/jpeg", 0.9),
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        debug: (() => {
          const d = vm.debug();
          return d
            ? {
                tip: d.tip.toArray(),
                pressed: Object.entries(d.depressions).filter(([, v]) => v > 0),
              }
            : null;
        })(),
      };
    }
    out["_cues"] = cues;
    out["_memory"] = { ...renderer.info.memory, programs: renderer.info.programs?.length ?? 0 };
    return out;
  };
}
