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
import { depthLayerUniforms, patchDepthLayers } from "../../../src/lib/fps/maps/depth-layers";
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
      layers?: boolean,
    ) => Promise<unknown>;
    lifecycle: (mapIds: string[], cycles: number) => Promise<unknown>;
    sweep: (mapId: string, views: View[], w: number, h: number) => Promise<unknown>;
    flicker: (
      mapId: string,
      views: View[],
      w: number,
      h: number,
      plan: { meshes: Record<string, { base: number; triangles: number }> },
      layers?: boolean,
      compare?: boolean,
    ) => Promise<unknown>;
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

window.capture = async (mapId, views, w, h, players = [], layers = true) => {
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
  // `layers` off: the map as it was before maps/depth-layers.ts (the "before" of a comparison).
  depthLayerUniforms.scale.value = layers ? 1 : 0;
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

/**
 * Z-fighting sweep (owner, 2026-11-12: "flicker … on the frames on the walls"). Every triangle
 * is drawn in a flat colour of its own (its number in `plan`, from find_coplanar.mjs; meshes the
 * plan does not know, instanced props among them, get one colour each), with each mesh's own
 * culling, depth write and polygon offset. Per view:
 *
 *  - `ties`: the same frame drawn twice, once letting a face win a pixel at equal depth and once
 *    not. A pixel that changes owner has two faces at exactly the same depth: which shows is up
 *    to the order they are drawn in and to how the graphics card rounds. Patches only; single
 *    lines of tied pixels (an edge where two faces meet) are counted in `tieLines`.
 *  - `near`: a second frame from half a millimetre to the side. Where two faces are closer than
 *    the depth buffer can tell apart, whole patches change owner; an ordinary edge moves by a
 *    fraction of a pixel (a pixel counts when one beside it and one above or below it changed).
 *  - `moved` (with `compare`): the frame once more with the depth layers (maps/depth-layers.ts)
 *    switched off, and the pixels the layers gave to another face, from the old owner to the new
 *    (patches; single lines of pixels are only counted, in `lines`).
 *
 * `layers` false draws the map without the depth layers throughout (the state before them).
 */
type FlickerPair = { n: number; worst: number; at: number };
window.flicker = async (mapId, views, w, h, plan, layers = true, compare = false) => {
  const map = getMap(mapId);
  const renderer = new THREE.WebGLRenderer({ antialias: false });
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
  const planned = Object.values(plan.meshes).reduce((n, m) => Math.max(n, m.base + m.triangles), 0);
  /** Names of the meshes drawn in one colour: owner `planned + 1 + k` is `others[k]`. */
  const others: string[] = [];
  const ids: THREE.Material[] = [];
  const made: THREE.BufferGeometry[] = [];
  const corner = new THREE.Vector3();
  depthLayerUniforms.scale.value = layers ? 1 : 0;
  for (const m of meshes) {
    const real = Array.isArray(m.material) ? m.material[0]! : m.material;
    const mat = new THREE.MeshBasicMaterial({
      fog: false,
      side: real.side,
      transparent: real.transparent,
      depthWrite: real.depthWrite,
      depthTest: real.depthTest,
      polygonOffset: real.polygonOffset,
      polygonOffsetFactor: real.polygonOffsetFactor,
      polygonOffsetUnits: real.polygonOffsetUnits,
    });
    ids.push(mat);
    const entry =
      plan.meshes[`${m.name}|${real.name}`] ?? plan.meshes[`${m.parent?.name ?? ""}|${real.name}`];
    const position = m.geometry.getAttribute("position");
    const index = m.geometry.index;
    const count = (index ? index.count : position.count) / 3;
    if (entry && !(m as THREE.InstancedMesh).isInstancedMesh && count === entry.triangles) {
      // One colour per triangle, and the mesh's own depth layers and normals with it.
      const layer = m.geometry.getAttribute("depthLayer");
      const normal = m.geometry.getAttribute("normal");
      const points = new Float32Array(count * 9),
        normals = new Float32Array(count * 9),
        layersOf = new Float32Array(count * 3),
        colours = new Uint8Array(count * 9);
      for (let t = 0; t < count; t++) {
        const id = entry.base + t + 1;
        for (let c = 0; c < 3; c++) {
          const v = index ? index.getX(t * 3 + c) : t * 3 + c;
          corner.fromBufferAttribute(position, v);
          points.set([corner.x, corner.y, corner.z], t * 9 + c * 3);
          if (normal) {
            corner.fromBufferAttribute(normal, v);
            normals.set([corner.x, corner.y, corner.z], t * 9 + c * 3);
          }
          if (layer) layersOf[t * 3 + c] = layer.getX(v);
          colours.set([id & 255, (id >> 8) & 255, (id >> 16) & 255], t * 9 + c * 3);
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(points, 3));
      geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
      geometry.setAttribute("depthLayer", new THREE.BufferAttribute(layersOf, 1));
      geometry.setAttribute("color", new THREE.BufferAttribute(colours, 3, true));
      made.push(geometry);
      m.geometry = geometry;
      mat.vertexColors = true;
      patchDepthLayers(mat);
    } else {
      others.push(`${m.name || m.parent?.name || "?"} (${real.name})`);
      const id = planned + others.length;
      mat.color.setRGB(
        (id & 255) / 255,
        ((id >> 8) & 255) / 255,
        ((id >> 16) & 255) / 255,
        THREE.LinearSRGBColorSpace,
      );
    }
    m.material = mat;
    m.matrixAutoUpdate = false;
  }
  // What is drawn into here, for the layers' slope term.
  depthLayerUniforms.viewport.value.set(w, h);
  scene.background = new THREE.Color(0, 0, 0);
  const target = new THREE.WebGLRenderTarget(w, h, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    colorSpace: THREE.LinearSRGBColorSpace,
  });
  const frame = () => new Uint8Array(w * h * 4);
  const a = frame(),
    b = frame(),
    s = frame(),
    c = frame();
  const shot = (out: Uint8Array) => {
    camera.updateMatrixWorld(true);
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
    renderer.readRenderTargetPixels(target, 0, 0, w, h, out);
  };
  const owner = (f: Uint8Array, i: number) => f[i]! | (f[i + 1]! << 8) | (f[i + 2]! << 16);
  const ties = new Map<number, FlickerPair>(),
    near = new Map<number, FlickerPair>(),
    moved = new Map<number, FlickerPair>();
  const perView: Array<[number, number]> = [];
  let stray = 0,
    lines = 0,
    tieLines = 0;
  const tally = (into: Map<number, FlickerPair>, here: Map<number, number>, vi: number) => {
    let sum = 0;
    for (const [key, n] of here) {
      const e = into.get(key) ?? { n: 0, worst: 0, at: -1 };
      e.n += n;
      if (n > e.worst) {
        e.worst = n;
        e.at = vi;
      }
      into.set(key, e);
      sum += n;
    }
    return sum;
  };
  const right = new THREE.Vector3();
  const here = new Map<number, number>();
  for (const [vi, [x, y, z, yaw, pitch]] of views.entries()) {
    camera.position.set(x, y, z);
    camera.rotation.set(pitch, yaw, 0);
    shot(a);
    for (const m of ids) m.depthFunc = THREE.LessDepth;
    shot(b);
    for (const m of ids) m.depthFunc = THREE.LessEqualDepth;
    // Ties: owners as an unordered pair.
    // In patches, like the near-ties: where a face inside a wall meets the wall's surface along
    // an edge, the two tie on the one line of pixels of that edge.
    const tiedAt = (i: number) =>
      i >= 0 &&
      i < a.length &&
      owner(a, i) !== owner(b, i) &&
      owner(a, i) !== 0 &&
      owner(b, i) !== 0;
    here.clear();
    for (let i = 0; i < a.length; i += 4) {
      const p = owner(a, i),
        q = owner(b, i);
      if (p > planned + others.length) stray++;
      if (!tiedAt(i)) continue;
      if (!(tiedAt(i - 4) || tiedAt(i + 4)) || !(tiedAt(i - w * 4) || tiedAt(i + w * 4))) {
        tieLines++;
        continue;
      }
      const key = Math.min(p, q) * 16777216 + Math.max(p, q);
      here.set(key, (here.get(key) ?? 0) + 1);
    }
    const tied = tally(ties, here, vi);
    if (compare && layers) {
      depthLayerUniforms.scale.value = 0;
      shot(c);
      depthLayerUniforms.scale.value = 1;
      // In patches only: along an inside corner a face on a layer takes a line of pixels from
      // the face it meets (the offset grows with the slope), which moves the corner by a pixel.
      const went = (i: number) =>
        i >= 0 && i < a.length && owner(c, i) !== owner(a, i) && owner(c, i) !== 0;
      here.clear();
      for (let i = 0; i < a.length; i += 4) {
        if (!went(i) || !owner(a, i)) continue;
        if (!(went(i - 4) || went(i + 4)) || !(went(i - w * 4) || went(i + w * 4))) {
          lines++;
          continue;
        }
        const key = owner(c, i) * 16777216 + owner(a, i);
        here.set(key, (here.get(key) ?? 0) + 1);
      }
      tally(moved, here, vi);
    }
    camera.position.add(right.set(1, 0, 0).applyEuler(camera.rotation).multiplyScalar(0.0005));
    shot(s);
    const differs = (i: number) =>
      i >= 0 &&
      i < a.length &&
      owner(a, i) !== owner(s, i) &&
      owner(a, i) !== 0 &&
      owner(s, i) !== 0;
    here.clear();
    for (let i = 0; i < a.length; i += 4) {
      if (!differs(i)) continue;
      if (!(differs(i - 4) || differs(i + 4)) || !(differs(i - w * 4) || differs(i + w * 4)))
        continue;
      const p = owner(a, i),
        q = owner(s, i);
      const key = Math.min(p, q) * 16777216 + Math.max(p, q);
      here.set(key, (here.get(key) ?? 0) + 1);
    }
    perView.push([tied, tally(near, here, vi)]);
    // A single view: also a picture of it, ties in red and near-ties in yellow.
    if (views.length === 1) {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const g = canvas.getContext("2d")!;
      const img = g.createImageData(w, h);
      for (let i = 0; i < a.length; i += 4) {
        const o = ((h - 1 - Math.floor(i / 4 / w)) * w + ((i / 4) % w)) * 4;
        const shade = 60 + ((a[i]! * 37 + a[i + 1]! * 91 + a[i + 2]! * 53) % 150);
        const tie = owner(a, i) !== owner(b, i);
        const hot = differs(i);
        img.data[o] = tie || hot ? 255 : shade;
        img.data[o + 1] = tie ? 0 : hot ? 220 : shade;
        img.data[o + 2] = tie || hot ? 0 : shade;
        img.data[o + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      (window as unknown as { flickerPicture?: string }).flickerPicture =
        canvas.toDataURL("image/png");
    }
    if (vi % 50 === 0) await new Promise((r) => setTimeout(r, 0));
  }
  renderer.setRenderTarget(null);
  target.dispose();
  for (const g of made) g.dispose();
  env.dispose();
  renderer.dispose();
  const rows = (m: Map<number, FlickerPair>) =>
    [...m].map(([key, e]) => [Math.floor(key / 16777216), key % 16777216, e.n, e.worst, e.at]);
  return {
    planned,
    others,
    stray,
    lines,
    tieLines,
    perView,
    ties: rows(ties),
    near: rows(near),
    moved: rows(moved),
  };
};
