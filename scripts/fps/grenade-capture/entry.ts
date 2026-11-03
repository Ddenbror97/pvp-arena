/**
 * Grenade preview: the real first-person grenade module (team arms, Blender clips) under the
 * renderer's view-scene lighting. The viewmodel always plays in the gameplay camera's frame (A);
 * the other cameras are the Blender file's inspection angles (art/blender/grenades CAMERAS:
 * right / left close-ups, front three-quarter, top-down, over the shoulder, slow-motion close-up,
 * projectile tracking). Inspection only: the game never cuts.
 */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { AK_VIEWMODEL, M4_VIEWMODEL } from "../../../src/lib/fps/authored-viewmodel";
import { createGrenadeViewmodel } from "../../../src/lib/fps/grenades/grenade-viewmodel";
import type { GrenadeView } from "../../../src/lib/fps/grenades/grenade-timeline";
import { createGrenadeWorldView } from "../../../src/lib/fps/grenades/grenade-world-view";
import {
  emptyGrenadeWorld,
  launchGrenade,
  publicGrenadeWorld,
  stepGrenadeWorld,
} from "../../../src/lib/fps/grenades/world";
import { compileMap, DEFAULT_MAP } from "../../../src/lib/fps/maps/registry";
import type { Player } from "../../../src/lib/fps/protocol";
import type { GrenadeType, ThrowKind } from "../../../src/lib/fps/grenades/rules";

export type Shot = { name: string; view: GrenadeView; camera: string };
declare global {
  interface Window {
    grenadeCapture: (variant: "ak" | "m4", shots: Shot[], w: number, h: number) => Promise<unknown>;
    grenadeLifecycle: (cycles: number) => Promise<unknown>;
    grenadePrograms: () => Promise<unknown>;
    grenadeWorldCapture: (plan: WorldPlan, w: number, h: number) => Promise<unknown>;
  }
}

/** Eye-space positions and look-at points (glTF axes), as in animate_grenades.py CAMERAS. */
const CAMERAS: Record<string, [[number, number, number], [number, number, number]]> = {
  A: [
    [0, 0, 0],
    [0.05, -0.12, -0.6],
  ],
  B: [
    [0.55, -0.1, -0.3],
    [0.14, -0.15, -0.4],
  ],
  C: [
    [-0.45, -0.05, -0.2],
    [0.08, -0.15, -0.4],
  ],
  D: [
    [0.35, 0.05, -1.05],
    [0.1, -0.15, -0.4],
  ],
  E: [
    [0.12, 0.45, -0.38],
    [0.12, -0.15, -0.4],
  ],
  F: [
    [0.35, 0.25, 0.55],
    [0.05, -0.15, -0.6],
  ],
  G: [
    [0.3, -0.02, -0.65],
    [0.12, -0.12, -0.4],
  ],
  H: [
    [1.2, 0.6, -1.5],
    [0.0, 0.0, -3.0],
  ],
};

window.grenadeLifecycle = async (cycles) => {
  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(320, 180);
  const scene = new THREE.Scene();
  const eye = new THREE.PerspectiveCamera(60, 16 / 9, 0.03, 8);
  eye.layers.set(1);
  scene.add(eye, new THREE.HemisphereLight(0xffffff, 0x333333, 2));
  renderer.render(scene, eye);
  const base = { ...renderer.info.memory };
  const out: unknown[] = [];
  for (let i = 0; i < cycles; i++) {
    const views = [
      createGrenadeViewmodel(eye, AK_VIEWMODEL),
      createGrenadeViewmodel(eye, M4_VIEWMODEL),
    ];
    await Promise.all(views.map((v) => v.ready));
    views[0]!.update(1 / 60, { kind: "hold", type: "he", t: 0.3, throw: "over" });
    views[1]!.update(1 / 60, { kind: "throw", type: "smoke", t: 0.05, throw: "under", air: false });
    renderer.render(scene, eye);
    const mounted = { ...renderer.info.memory };
    for (const v of views) v.update(1 / 60, { kind: "hidden" });
    renderer.render(scene, eye);
    for (const v of views) v.dispose();
    renderer.render(scene, eye);
    out.push({ cycle: i, mounted, afterDispose: { ...renderer.info.memory } });
  }
  renderer.dispose();
  return { base, cycles: out };
};

/** Shader programs: compiled at "load" with the hands in the ready pose, then every state drawn. */
window.grenadePrograms = async () => {
  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(320, 180);
  const scene = new THREE.Scene();
  const eye = new THREE.PerspectiveCamera(60, 16 / 9, 0.03, 8);
  eye.layers.set(1);
  const light = new THREE.HemisphereLight(0xffffff, 0x333333, 2);
  light.layers.set(1);
  scene.add(eye, light);
  const vm = createGrenadeViewmodel(eye, AK_VIEWMODEL);
  await vm.ready;
  vm.update(0, { kind: "ready", type: "he", t: 0, move: 0 });
  await renderer.compileAsync(scene, eye);
  const names = () =>
    (renderer.info.programs ?? []).map((p) => p.name + ":" + p.cacheKey.slice(0, 60));
  const compiled = names();
  vm.update(0, { kind: "hidden" });
  renderer.render(scene, eye);
  const added: Record<string, string[]> = {};
  for (const view of [
    { kind: "equip", type: "he", t: 0.1 },
    { kind: "ready", type: "smoke", t: 0.1, move: 0 },
    { kind: "hold", type: "fire", t: 0.2, throw: "over" },
    { kind: "throw", type: "he", t: 0.3, throw: "under", air: false },
    { kind: "inspect", type: "smoke", t: 1 },
  ] as GrenadeView[]) {
    vm.update(1 / 60, view);
    renderer.render(scene, eye);
    added[view.kind] = names().filter((n) => !compiled.includes(n));
  }
  return { compiled: compiled.length, added };
};

/**
 * The world view (flight, blast, smoke, fire) on a small yard: a floor, a wall and a crate, run
 * by the server's own grenade world (stepGrenadeWorld), filmed by a tracking camera.
 */
type WorldPlan = {
  throws: {
    type: GrenadeType;
    kind: ThrowKind;
    at: number;
    x: number;
    z: number;
    yaw: number;
    pitch: number;
  }[];
  shots: {
    name: string;
    t: number;
    camera: [number, number, number];
    target: [number, number, number] | "projectile";
  }[];
};
const box = (id: string, x: number, y: number, z: number, w: number, h: number, d: number) => ({
  id,
  x,
  y,
  z,
  w,
  h,
  d,
  surface: "concrete" as const,
});
window.grenadeWorldCapture = async (plan, w, h) => {
  const map = compileMap({
    ...DEFAULT_MAP,
    id: "grenade-yard",
    arena: { width: 60, depth: 60 },
    boxes: [box("wall", 0, 1.5, -12, 10, 3, 0.3), box("crate", 4, 0.6, -6, 1.2, 1.2, 1.2)],
    walls: [],
    structures: [],
    barriers: [],
  });
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(w, h);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  document.body.replaceChildren(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9fb4c4);
  scene.fog = new THREE.Fog(0x9fb4c4, 30, 120);
  const sun = new THREE.DirectionalLight(0xfff0dd, 2.6);
  sun.position.set(-6, 10, 4);
  scene.add(sun, new THREE.HemisphereLight(0xdfe8ff, 0x6b5a48, 1.4));
  const mat = new THREE.MeshStandardMaterial({ color: 0xb49a78, roughness: 0.9 });
  for (const b of [...map.boxes, map.floor]) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), mat);
    mesh.position.set(b.x, b.y, b.z);
    scene.add(mesh);
  }
  const camera = new THREE.PerspectiveCamera(60, w / h, 0.05, 200);
  scene.add(camera);
  const view = createGrenadeWorldView(scene, map);
  await view.ready;
  await renderer.compileAsync(scene, camera);
  const programs = renderer.info.programs?.length ?? 0;
  const world = emptyGrenadeWorld();
  const out: Record<string, unknown> = {};
  const done = new Set<number>();
  let t = 0;
  const shots = [...plan.shots].sort((a, b) => a.t - b.t);
  for (const shot of shots) {
    for (; t <= shot.t; t += 33.333) {
      for (const th of plan.throws)
        if (th.at >= t - 33.333 && th.at < t && !done.has(th.at)) {
          done.add(th.at);
          const p = {
            x: th.x,
            y: 0,
            z: th.z,
            yaw: th.yaw,
            pitch: th.pitch,
            crouched: false,
          } as Player;
          const projectile = launchGrenade(
            world,
            map,
            0,
            p,
            { type: th.type, kind: th.kind, release: th.at, spawn: th.at },
            { x: 0, y: 0, z: 0 },
            t,
          );
          const { sim: _s, ...open } = projectile;
          view.adopt(open, false, t);
        }
      for (const det of stepGrenadeWorld(world, map, t)) view.detonate(det, t, null);
      view.update(t, publicGrenadeWorld(world), camera, 33.333 / 1000);
    }
    camera.position.set(...shot.camera);
    const flying = world.flying[0]?.sim;
    if (shot.target === "projectile" && flying) camera.lookAt(flying.x, flying.y, flying.z);
    else if (shot.target !== "projectile") camera.lookAt(...shot.target);
    camera.updateMatrixWorld();
    view.update(shot.t, publicGrenadeWorld(world), camera, 0.001);
    renderer.info.reset();
    renderer.render(scene, camera);
    out[shot.name] = {
      image: renderer.domElement.toDataURL("image/jpeg", 0.88),
      calls: renderer.info.render.calls,
      world: {
        flying: world.flying.length,
        smokes: world.smokes.length,
        fires: world.fires.length,
      },
    };
  }
  out["_programs"] = { atLoad: programs, after: renderer.info.programs?.length ?? 0 };
  return out;
};

let setup: ReturnType<typeof init> | null = null;
window.grenadeCapture = async (variantId, shots, w, h) => {
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
  // A floor grid far below for spatial reference in the inspection views.
  const grid = new THREE.GridHelper(4, 40, 0x333333, 0x444444);
  grid.position.y = -1.5;
  grid.layers.set(1);
  scene.add(grid);
  const vm = createGrenadeViewmodel(eye, variantId === "m4" ? M4_VIEWMODEL : AK_VIEWMODEL);
  await vm.ready;
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
  vm.onCue = (name, type) => cues.push(`${type}:${name}`);
  return async (shots: Shot[]) => {
    const out: Record<string, unknown> = {};
    cues.length = 0;
    for (const shot of shots) {
      eye.position.set(0, 0, 0);
      eye.quaternion.identity();
      eye.updateMatrixWorld(true);
      vm.update(1 / 60, shot.view);
      let camera: THREE.Camera = eye;
      if (shot.camera !== "A") {
        const [pos, at] = CAMERAS[shot.camera]!;
        view.position.set(...pos);
        view.lookAt(new THREE.Vector3(...at));
        view.updateMatrixWorld(true);
        camera = view;
      }
      renderer.info.reset();
      renderer.render(scene, camera);
      out[shot.name] = {
        image: renderer.domElement.toDataURL("image/jpeg", 0.9),
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        grenade: vm
          .grenadeWorld(new THREE.Vector3())
          ?.toArray()
          .map((x) => +x.toFixed(3)),
      };
    }
    out["_cues"] = cues;
    out["_memory"] = { ...renderer.info.memory, programs: renderer.info.programs?.length ?? 0 };
    return out;
  };
}
