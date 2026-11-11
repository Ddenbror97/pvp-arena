/**
 * Map capture page: the game's map loader (registry + createMapEnvironment) under the
 * renderer's world lighting (renderer.ts: fog, hemisphere, sun with a static shadow map, ACES,
 * one-off PMREM reflection capture, environment intensity), rendered from named cameras.
 * Players are not drawn; renderer.info gives draw calls and triangles per view.
 */
import * as THREE from "three";
import { getMap as registryMap } from "../../../src/lib/fps/maps/registry";
import { BOMB_MAPS, isBombMapId } from "../../../src/lib/fps/bomb/maps";

/** Registry maps plus the 5v5 maps (Bomb Defusal only, deliberately not in the 1v1 registry). */
const getMap = (id: string) => (isBombMapId(id) ? BOMB_MAPS[id].map : registryMap(id));
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
    ) => Promise<unknown>;
    lifecycle: (mapIds: string[], cycles: number) => Promise<unknown>;
    sweep: (mapId: string, views: View[], w: number, h: number) => Promise<unknown>;
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

window.capture = async (mapId, views, w, h, players = []) => {
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
    // One untimed frame first (program compiles, texture uploads, the one-off shadow-map
    // render), then the measured frames: calls, triangles and the median time of three
    // steady-state frames. gl.finish() does not wait under ANGLE/SwiftShader, so each frame
    // ends with a 1-pixel readback, which does.
    const gl = renderer.getContext();
    const pixel = new Uint8Array(4);
    const frame = () => {
      const s = performance.now();
      renderer.render(scene, camera);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
      return performance.now() - s;
    };
    frame();
    renderer.info.reset();
    const first = frame();
    const calls = renderer.info.render.calls,
      triangles = renderer.info.render.triangles;
    const ms = [first, frame(), frame()].sort((a, b) => a - b)[1] ?? first;
    out[name] = {
      image: renderer.domElement.toDataURL("image/jpeg", 0.88),
      calls,
      triangles,
      ms: Math.round(ms),
    };
  }
  return {
    loadMs: Math.round(loadMs),
    geometries: renderer.info.memory.geometries,
    textures: renderer.info.memory.textures,
    programs: renderer.info.programs?.length ?? 0,
    programUsers: (() => {
      const users = new Map<unknown, string[]>();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        for (const mat of Array.isArray(m.material) ? m.material : [m.material]) {
          const prog = (
            renderer.properties.get(mat) as { currentProgram?: { id: number; name: string } }
          ).currentProgram;
          if (!prog) continue;
          const list = users.get(prog) ?? [];
          list.push(
            `${m.name}:${mat.name}${(m as THREE.InstancedMesh).isInstancedMesh ? "[i]" : ""}`,
          );
          users.set(prog, list);
        }
      });
      return [...users].map(
        ([p, l]) =>
          `${(p as { id: number }).id} ${(p as { name: string }).name} :: ${[...new Set(l)].join(", ")}`,
      );
    })(),
    views: out,
  };
};

/**
 * Visibility sweep (render audit): for each view, what the renderer submits (frustum culling only:
 * draw calls and triangles) against what is actually visible. Every mesh is drawn into an
 * off-screen target in a flat colour of its own, with the depth test; a mesh with no pixel left is
 * drawn by the game for nothing (it is behind walls). Returns per view the submitted and the
 * visible calls / triangles, and per mesh how often it was submitted and how often it was hidden.
 */
window.sweep = async (mapId, views, w, h) => {
  const map = getMap(mapId);
  const renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.setPixelRatio(1);
  renderer.setSize(w, h);
  document.body.replaceChildren(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(78, w / h, 0.06, map.presentation.viewDistance);
  camera.rotation.order = "YXZ";
  scene.add(camera);
  const env = createMapEnvironment(scene, map);
  await env.ready;
  scene.updateMatrixWorld(true);
  const meshes: THREE.Mesh[] = [];
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && m.visible) meshes.push(m);
  });
  const tris = meshes.map((m) => {
    const g = m.geometry;
    const n = (g.index ? g.index.count : g.getAttribute("position").count) / 3;
    return Math.round(
      n * ((m as THREE.InstancedMesh).isInstancedMesh ? (m as THREE.InstancedMesh).count : 1),
    );
  });
  // One flat colour per mesh (id + 1 in RGB); alpha-tested cards count as their whole quad.
  meshes.forEach((m, i) => {
    const id = i + 1;
    const mat = new THREE.MeshBasicMaterial({ fog: false, side: THREE.DoubleSide });
    mat.color.setRGB((id & 255) / 255, ((id >> 8) & 255) / 255, 0, THREE.LinearSRGBColorSpace);
    m.material = mat;
    m.matrixAutoUpdate = false;
  });
  scene.background = new THREE.Color(0, 0, 0);
  const target = new THREE.WebGLRenderTarget(w, h, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    colorSpace: THREE.LinearSRGBColorSpace,
  });
  const pixels = new Uint8Array(w * h * 4);
  const submitted = new Uint32Array(meshes.length),
    hidden = new Uint32Array(meshes.length);
  const frustum = new THREE.Frustum(),
    pv = new THREE.Matrix4();
  const out: number[][] = [];
  const seen = new Uint8Array(meshes.length + 1);
  renderer.info.autoReset = false;
  for (const [x, y, z, yaw, pitch] of views) {
    camera.position.set(x, y, z);
    camera.rotation.set(pitch, yaw, 0);
    camera.updateMatrixWorld(true);
    renderer.setRenderTarget(target);
    renderer.info.reset();
    renderer.render(scene, camera);
    const calls = renderer.info.render.calls,
      triangles = renderer.info.render.triangles;
    renderer.readRenderTargetPixels(target, 0, 0, w, h, pixels);
    seen.fill(0);
    for (let i = 0; i < pixels.length; i += 4) seen[pixels[i]! | (pixels[i + 1]! << 8)] = 1;
    pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(pv);
    let visibleCalls = 0,
      visibleTris = 0;
    meshes.forEach((m, i) => {
      if (m.frustumCulled && !frustum.intersectsObject(m)) return;
      submitted[i]!++;
      if (seen[i + 1]) {
        visibleCalls++;
        visibleTris += tris[i]!;
      } else hidden[i]!++;
    });
    out.push([calls, triangles, visibleCalls, visibleTris]);
  }
  renderer.setRenderTarget(null);
  return {
    views: out,
    meshes: meshes.map((m, i) => ({
      name: m.name || m.parent?.name || `mesh${i}`,
      tris: tris[i],
      instanced: (m as THREE.InstancedMesh).isInstancedMesh ? (m as THREE.InstancedMesh).count : 0,
      submitted: submitted[i],
      hidden: hidden[i],
      size: (() => {
        const b = new THREE.Box3().setFromObject(m);
        return [b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z].map((v) => +v.toFixed(1));
      })(),
      center: (() => {
        const b = new THREE.Box3().setFromObject(m);
        return [(b.max.x + b.min.x) / 2, (b.max.y + b.min.y) / 2, (b.max.z + b.min.z) / 2].map(
          (v) => +v.toFixed(1),
        );
      })(),
    })),
  };
};
