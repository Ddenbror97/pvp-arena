/**
 * Map capture page: the game's map loader (registry + createMapEnvironment) under the
 * renderer's world lighting (renderer.ts: fog, hemisphere, sun with a static shadow map, ACES,
 * one-off PMREM reflection capture, environment intensity), rendered from named cameras.
 * Players are not drawn; renderer.info gives draw calls and triangles per view.
 */
import * as THREE from "three";
import { getMap } from "../../../src/lib/fps/maps/registry";
import { createMapEnvironment } from "../../../src/lib/fps/maps/environments";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";

type View = [number, number, number, number, number]; // x, y, z, yaw (0 = towards -z), pitch
declare global {
  interface Window {
    capture: (
      mapId: string,
      views: Record<string, View>,
      w: number,
      h: number,
      players?: Array<[string, number, number, number]>,
      quality?: "high" | "low",
    ) => Promise<unknown>;
    lifecycle: (mapIds: string[], cycles: number) => Promise<unknown>;
  }
}

/**
 * Map-switching / resource-cleanup check: mount each map's environment on one renderer, render
 * a frame, dispose it, repeat. GPU geometries/textures (renderer.info.memory) and programs must
 * return to the empty-scene baseline after every dispose and must not grow across cycles.
 */
window.lifecycle = async (mapIds, cycles) => {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(320, 180);
  document.body.replaceChildren(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(78, 16 / 9, 0.06, 300);
  camera.position.set(0, 1.6, 6);
  const heap = () =>
    (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? 0;
  const gc = () => (window as unknown as { gc?: () => void }).gc?.();
  const empty = new THREE.Scene();
  renderer.render(empty, camera);
  const base = { ...renderer.info.memory };
  const log: Array<Record<string, unknown>> = [];
  for (let c = 0; c < cycles; c++) {
    for (const id of mapIds) {
      const scene = new THREE.Scene();
      const env = createMapEnvironment(scene, getMap(id));
      await env.ready;
      env.setQuality?.("low");
      env.setQuality?.("high");
      env.update?.(0.016, 1000);
      renderer.render(scene, camera);
      const mounted = { ...renderer.info.memory };
      env.dispose();
      scene.clear();
      renderer.renderLists.dispose();
      renderer.render(empty, camera);
      gc();
      await new Promise((r) => setTimeout(r, 50));
      gc();
      log.push({
        cycle: c,
        map: id,
        mounted,
        afterDispose: { ...renderer.info.memory },
        programs: renderer.info.programs?.length ?? 0,
        heapMB: Math.round(heap() / 1e5) / 10,
      });
    }
  }
  renderer.dispose();
  return { base, log };
};

window.capture = async (mapId, views, w, h, players = [], quality = "high") => {
  const map = getMap(mapId);
  const lighting = map.presentation.lighting;
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(w, h);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = lighting.exposure;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  document.body.replaceChildren(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(lighting.background);
  scene.fog = new THREE.Fog(lighting.fog.color, lighting.fog.near, lighting.fog.far);
  scene.add(
    new THREE.HemisphereLight(
      lighting.hemisphere.sky,
      lighting.hemisphere.ground,
      lighting.hemisphere.intensity,
    ),
  );
  const sun = new THREE.DirectionalLight(lighting.sun.color, lighting.sun.intensity);
  sun.position.set(...lighting.sun.position);
  sun.castShadow = true;
  const shadow = map.presentation.shadow;
  sun.shadow.mapSize.set(shadow.mapSize, shadow.mapSize);
  Object.assign(sun.shadow.camera, {
    near: 1,
    far: shadow.far,
    left: -shadow.extent,
    right: shadow.extent,
    top: shadow.extent,
    bottom: -shadow.extent,
  });
  sun.shadow.normalBias = 0.03;
  scene.add(sun);
  const camera = new THREE.PerspectiveCamera(78, w / h, 0.06, map.presentation.viewDistance);
  camera.rotation.order = "YXZ";
  scene.add(camera);
  const t0 = performance.now();
  const env = createMapEnvironment(scene, map);
  await env.ready;
  const loadMs = performance.now() - t0;
  env.setQuality?.(quality);
  // Optional stand-ins: the game's character models (bind pose) at [model url, x, z, yaw].
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  for (const [url, x, z, yaw] of players) {
    const gltf = await loader.loadAsync(url);
    const body = clone(gltf.scene);
    const box = new THREE.Box3().setFromObject(body);
    body.scale.setScalar(1.8 / Math.max(0.01, box.max.y - box.min.y));
    body.position.set(x, 0, z);
    body.rotation.y = yaw;
    body.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) m.castShadow = m.receiveShadow = m.frustumCulled = true;
    });
    scene.add(body);
  }
  scene.updateMatrixWorld(true);
  scene.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.matrixAutoUpdate = false;
  });
  const pmrem = new THREE.PMREMGenerator(renderer);
  const reflections = pmrem.fromScene(scene, 0.04, 0.1, 100);
  pmrem.dispose();
  scene.environment = reflections.texture;
  scene.environmentIntensity = lighting.environmentIntensity;
  renderer.shadowMap.needsUpdate = true;
  scene.matrixWorldAutoUpdate = false;
  const out: Record<string, { image: string; calls: number; triangles: number; ms: number }> = {};
  for (const [name, [x, y, z, yaw, pitch]] of Object.entries(views)) {
    camera.position.set(x, y, z);
    camera.rotation.set(pitch, yaw, 0);
    camera.updateMatrixWorld(true);
    renderer.info.autoReset = false;
    renderer.info.reset();
    const s = performance.now();
    renderer.render(scene, camera);
    renderer.getContext().finish();
    out[name] = {
      image: renderer.domElement.toDataURL("image/jpeg", 0.88),
      calls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      ms: Math.round(performance.now() - s),
    };
  }
  return {
    loadMs: Math.round(loadMs),
    geometries: renderer.info.memory.geometries,
    textures: renderer.info.memory.textures,
    programs: renderer.info.programs?.length ?? 0,
    views: out,
  };
};
