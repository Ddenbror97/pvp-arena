import * as THREE from "three";
import { dropDuplicateFaces } from "./duplicate-faces";
import { buildBatches } from "./props-batch";
import { sharpenMaterials, worldAnisotropy, worldTextureScale } from "./texture-quality";
import { createBuildingDetail, DETAIL_CLASSES } from "./building-detail";
import type { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { Placement } from "./layout";

/**
 * Instanced buildings and props for Project Island. Placement comes from layout.ts (shared with
 * the server's collision): the client decides only which LOD draws each placement, by distance,
 * the same for every player. Nothing that exists is ever hidden inside the gameplay range
 * (fairness invariant): every class is drawn out to at least 1 km.
 *
 *  - One InstancedMesh per model × LOD × material primitive; instance lists are rebuilt only
 *    when the camera has moved RESELECT metres (not every frame).
 *  - LOD files load on demand: the farthest LOD of every placed model at start (small), nearer
 *    LODs the first time an instance comes within their range; until then the next coarser LOD
 *    stands in.
 *  - Preloaded (the game): once every LOD is in, the far LODs that share a material, of the
 *    models placed only a few times (BATCH_MAX_PLACEMENTS), are moved into a few BatchedMeshes
 *    (props-batch.ts), one multi-draw call each.
 */
export type ModelManifest = {
  worldRevision?: string;
  /** The shared atlas of the mid-distance LODs named "facade" (build_facades.mjs). */
  facades?: { atlas: string; width: number; height: number };
  models: Record<
    string,
    { class: string; ring?: string; size: number[]; lods: Array<{ file: string; tris: number }> }
  >;
};

/** Distance (m) up to which each LOD is used, per class; beyond the last, not drawn. */
const RINGS: Record<string, [number, number, number]> = {
  small: [50, 180, 1000],
  // Clutter that neither hides nor stops a player (cones, bin bags, trolleys): near only, and
  // never the untextured far LOD (each LOD level drawn costs a draw call per model).
  detail: [25, 150, 150],
  // Knee- to head-high yard props (drums, tyres, reels, pipes, kiosks): textured LODs to 400 m.
  clutter: [25, 400, 400],
  prop: [70, 250, 1000],
  // Car parks hold dozens of cars within a few metres: full detail only up close.
  vehicle: [35, 160, 1000],
  structure: [140, 500, 2500],
  building: [220, 800, 4000],
  // Houses and outbuildings placed by the hundred in the towns (Northstar ≈ 700 buildings): full
  // detail only on the street you are in, cheap LODs (≈ 1/4 and 1/14 of LOD0) beyond.
  dwelling: [100, 350, 4000],
  outbuilding: [70, 250, 2500],
  hero: [300, 1100, 6000],
  aircraft: [250, 900, 5000],
  // Natural cover: rocks block bullets, so they draw far (the same for everyone); bushes only
  // conceal and draw to 600 m.
  rock: [60, 250, 1500],
  bush: [40, 160, 600],
  // House-lot fences (by the thousand in the towns): see-through and without collision, so
  // they neither hide nor stop anyone; boards up close, a panel mid-range, gone past 500 m.
  yard: [35, 140, 500],
};
const RESELECT = 8;
/**
 * Far LODs are batched only for models placed at most this many times. A BatchedMesh draws
 * with WebGL multi-draw, which Chrome on Windows (ANGLE/D3D11) runs as one real draw call per
 * visible instance inside its GPU process: a win for the 200 models placed a few times each
 * (one entry instead of a whole draw call), a loss for houses, fences and lamps placed by the
 * hundred, which one instanced draw handles (real-GPU benchmark, 2026-11-09: batching
 * everything took a town frame from 2.4 ms to 5.2 ms end to end, unseen from JavaScript).
 */
export const BATCH_MAX_PLACEMENTS = 32;
/** CPU per frame (ms) for a reselect pass before it continues next frame (a model at a time). */
const SLICE_MS = 1;
/** Camera moved this far (m) from a pass's origin: start over and finish at once (teleport). */
const JUMP = 150;
/**
 * Classes that hide or stop players draw the same for everyone at every view distance
 * (fairness, PLAN §10); the view distance scales the rest (buildings, structures, aircraft).
 */
const FIXED_RINGS = new Set([
  "detail",
  "clutter",
  "small",
  "prop",
  "vehicle",
  "rock",
  "bush",
  "yard",
]);
/** Scaled rings never end closer than this (m): beyond the 1 km range players are sent. */
const MIN_FAR = 1500;
const scaleRing = (ring: [number, number, number], k: number): [number, number, number] => [
  ring[0] * k,
  ring[1] * k,
  Math.max(MIN_FAR, ring[2] * Math.min(k, 1.25)),
];

/** Each instanced primitive keeps its node matrix (the dequantisation transform of
 * KHR_mesh_quantization lives on the node), applied after the placement. */
type LodMeshes = {
  meshes: THREE.InstancedMesh[];
  local: THREE.Matrix4[];
  tris: number;
  /** Instances drawn at the last reselect. */
  count: number;
  /** Batched (props-batch.ts): this LOD draws as `geometry` in batch `batch`. */
  batched?: { batch: number; geometry: number };
};
type ModelState = {
  id: string;
  /** LOD distance class (RINGS). */
  cls: string;
  ring: [number, number, number];
  base: [number, number, number];
  fixed: boolean;
  lods: Array<LodMeshes | null | "loading">;
};

export type PropsControls = {
  root: THREE.Object3D;
  /** Resolves when the farthest LOD of every placed model is loaded. */
  ready: Promise<void>;
  /** Reselect LODs (spread over frames; `full`: finish the pass now, e.g. a still capture). */
  update: (camera: THREE.Camera, full?: boolean) => void;
  /** View distance: detail and draw distances of the non-cover classes × `k` (0.7–1.6). */
  setDetailScale: (k: number) => void;
  stats: () => {
    instances: number;
    draws: number;
    triangles: number;
    loadedFiles: number;
    /** Largest triangle contributors this frame: "model.lodN" → triangles. */
    top: Record<string, number>;
  };
  dispose: () => void;
};

export function createProps(
  placements: Placement[],
  manifest: ModelManifest,
  loader: GLTFLoader,
  /**
   * Load every LOD before `ready` (all models and LODs are ~6 MB): the game does this behind the
   * loading screen so it can compile every shader up front and never hitch mid-match. Off, nearer
   * LODs stream in on demand (tools).
   */
  {
    preload = false,
    facades = null,
    detail = worldTextureScale() >= 1,
  }: {
    preload?: boolean;
    /** Close-up surface grain on the buildings' near LOD (building-detail.ts; off: low tier). */
    detail?: boolean;
    /** The facade atlas (manifest.facades), lent to every LOD whose material is "facade". */
    facades?: THREE.Texture | null;
  } = {},
): PropsControls {
  const root = new THREE.Group();
  root.name = "br-props";
  const byModel = new Map<string, Placement[]>();
  for (const p of placements) {
    let list = byModel.get(p.model);
    if (!list) byModel.set(p.model, (list = []));
    list.push(p);
  }
  const states = new Map<string, ModelState>();
  for (const id of byModel.keys()) {
    const m = manifest.models[id];
    if (!m) throw new Error(`Model ${id} missing from the manifest`);
    const cls = m.ring ?? m.class;
    const ring = RINGS[cls] ?? RINGS["prop"]!;
    states.set(id, {
      id,
      cls,
      ring,
      base: ring,
      fixed: FIXED_RINGS.has(cls),
      lods: m.lods.map(() => null),
    });
  }
  let loadedFiles = 0;
  let stopped = false;
  const grain = detail ? createBuildingDetail(Math.min(8, worldAnisotropy())) : null;
  /** Free a GLTF's GPU-side objects (a LOD that arrived after dispose, or one being replaced). */
  const freeGltf = (root: THREE.Object3D) => {
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry.dispose();
      for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        for (const v of Object.values(m))
          if (v instanceof THREE.Texture && v !== facades) v.dispose();
        m.dispose();
      }
    });
  };
  const placed = new THREE.Matrix4();
  const matrix = new THREE.Matrix4(),
    rotation = new THREE.Quaternion(),
    up = new THREE.Vector3(0, 1, 0),
    position = new THREE.Vector3(),
    unit = new THREE.Vector3(1, 1, 1);

  const load = async (state: ModelState, level: number) => {
    if (state.lods[level]) return;
    state.lods[level] = "loading";
    const gltf = await loader.loadAsync(manifest.models[state.id]!.lods[level]!.file);
    if (stopped) {
      // The arena was torn down while this LOD was in flight: nothing may reach the GPU.
      freeGltf(gltf.scene);
      state.lods[level] = null;
      return;
    }
    gltf.scene.updateMatrixWorld(true);
    sharpenMaterials(gltf.scene);
    const meshes: THREE.InstancedMesh[] = [];
    const local: THREE.Matrix4[] = [];
    const capacity = byModel.get(state.id)!.length;
    gltf.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      local.push(mesh.matrixWorld.clone());
      // Double-sided surfaces stored twice z-fight (flicker as the camera turns).
      for (const m of Array.isArray(mesh.material) ? [] : [mesh.material])
        dropDuplicateFaces(mesh.geometry, m);
      // Buildings up close: surface grain on the near LOD (building-detail.ts).
      if (
        grain &&
        level === 0 &&
        DETAIL_CLASSES.has(state.cls) &&
        !Array.isArray(mesh.material) &&
        grain.suits(mesh.material)
      )
        grain.apply(mesh.material as THREE.MeshStandardMaterial);
      // Mid-distance LODs mapped onto the shared facade atlas (build_facades.mjs).
      const facade = mesh.material as THREE.MeshStandardMaterial;
      if (!Array.isArray(mesh.material) && facade.name === "facade") {
        if (facades) facade.map = facades;
        // Without the atlas (its download failed): a neutral wall colour, not white.
        else facade.color.set(0x8a8a84);
        facade.needsUpdate = true;
      }
      const im = new THREE.InstancedMesh(mesh.geometry, mesh.material, capacity);
      im.name = `${state.id}.lod${level}`;
      im.count = 0;
      im.frustumCulled = false;
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      root.add(im);
      meshes.push(im);
    });
    state.lods[level] = {
      meshes,
      local,
      tris: manifest.models[state.id]!.lods[level]!.tris,
      count: 0,
    };
    loadedFiles++;
    dirty = true;
  };

  /** Far-LOD batches, and per batch and model the instance id of each placement (-1: none). */
  const batches: THREE.BatchedMesh[] = [];
  const batchIds = new Map<string, Int32Array[]>();
  const batchFarLods = () => {
    if (stopped) return;
    const members: Array<{ lod: LodMeshes; state: ModelState }> = [];
    for (const state of states.values())
      state.lods.forEach((lod, level) => {
        if (
          level > 0 &&
          lod &&
          lod !== "loading" &&
          lod.meshes.length === 1 &&
          byModel.get(state.id)!.length <= BATCH_MAX_PLACEMENTS
        )
          members.push({ lod, state });
      });
    const built = buildBatches(
      members.map(({ lod, state }) => ({
        mesh: lod.meshes[0]!,
        local: lod.local[0]!,
        placements: byModel.get(state.id)!.length,
        model: state.id,
      })),
      facades,
    );
    for (const b of built) {
      const k = batches.length;
      batches.push(b.mesh);
      root.add(b.mesh);
      for (const i of b.members) {
        const { lod, state } = members[i]!;
        lod.batched = { batch: k, geometry: b.geometry[i]! };
        // The instanced copy is no longer drawn: free it (the batch holds its own copy).
        const im = lod.meshes[0]!;
        root.remove(im);
        im.geometry.dispose();
        (im.material as THREE.Material).dispose();
        im.dispose();
        lod.meshes = [];
        let ids = batchIds.get(state.id);
        if (!ids) batchIds.set(state.id, (ids = []));
        if (!ids[k]) ids[k] = new Int32Array(byModel.get(state.id)!.length).fill(-1);
      }
    }
    dirty = true;
  };
  const ready = Promise.all(
    [...states.values()].flatMap((s) =>
      preload ? s.lods.map((_, level) => load(s, level)) : [load(s, s.lods.length - 1)],
    ),
  ).then(() => {
    if (preload) batchFarLods();
  });
  let lastX = Infinity,
    lastZ = Infinity,
    dirty = true;
  const cam = new THREE.Vector3();
  let instances = 0;
  /** Each placement's matrix, composed once (placements never move): 16 floats each. */
  const placedMatrices = new Map<string, Float32Array>();
  for (const [id, list] of byModel) {
    const arr = new Float32Array(list.length * 16);
    list.forEach((p, i) => {
      rotation.setFromAxisAngle(up, (p.turn * Math.PI) / 2);
      matrix.compose(position.set(p.x, p.y, p.z), rotation, unit).toArray(arr, i * 16);
    });
    placedMatrices.set(id, arr);
  }
  /** The reselect pass in progress: models in `order` from `cursor` (-1: none), from `pass`. */
  const order = [...states.keys()];
  let cursor = -1,
    passInstances = 0;
  const pass = new THREE.Vector3();
  const startPass = () => {
    pass.copy(cam);
    lastX = cam.x;
    lastZ = cam.z;
    dirty = false;
    cursor = 0;
    passInstances = 0;
  };
  const selectModel = (id: string) => {
    const state = states.get(id)!;
    for (const lod of state.lods)
      if (lod && lod !== "loading") {
        lod.count = 0;
        for (const m of lod.meshes) m.count = 0;
      }
    const ids = batchIds.get(id);
    /** Hide placement i in every batch except `keep`. */
    const hideBatched = (i: number, keep = -1) => {
      if (!ids) return;
      for (let k = 0; k < ids.length; k++) {
        const slot = ids[k];
        if (k !== keep && slot && slot[i]! >= 0) batches[k]!.setVisibleAt(slot[i]!, false);
      }
    };
    const list = byModel.get(id)!;
    const mats = placedMatrices.get(id)!;
    const r0 = state.ring[0] ** 2,
      r1 = state.ring[1] ** 2,
      r2 = state.ring[2] ** 2;
    for (let i = 0; i < list.length; i++) {
      const p = list[i]!;
      const dx = p.x - pass.x,
        dy = p.y - pass.y,
        dz = p.z - pass.z;
      const d2 = dx * dx + dy * dy + dz * dz;
      let level = d2 <= r0 ? 0 : d2 <= r1 ? 1 : d2 <= r2 ? 2 : -1;
      if (level < 0) {
        hideBatched(i);
        continue;
      }
      // Ask for the right LOD; draw the best one available meanwhile (never nothing).
      if (!state.lods[level]) void load(state, level);
      while (level < state.lods.length && (!state.lods[level] || state.lods[level] === "loading"))
        level++;
      const lod = state.lods[level];
      if (!lod || lod === "loading") {
        hideBatched(i);
        continue;
      }
      lod.count++;
      passInstances++;
      if (lod.batched) {
        const { batch: k, geometry } = lod.batched;
        const batch = batches[k]!,
          slot = ids![k]!;
        hideBatched(i, k);
        if (slot[i]! < 0) {
          slot[i] = batch.addInstance(geometry);
          batch.setMatrixAt(slot[i]!, matrix.fromArray(mats, i * 16));
        } else {
          if (batch.getGeometryIdAt(slot[i]!) !== geometry)
            batch.setGeometryIdAt(slot[i]!, geometry);
          batch.setVisibleAt(slot[i]!, true);
        }
        continue;
      }
      hideBatched(i);
      matrix.fromArray(mats, i * 16);
      for (let k = 0; k < lod.meshes.length; k++) {
        const m = lod.meshes[k]!;
        m.setMatrixAt(m.count++, placed.multiplyMatrices(matrix, lod.local[k]!));
      }
    }
    for (const lod of state.lods)
      if (lod && lod !== "loading")
        for (const m of lod.meshes) {
          m.visible = m.count > 0;
          m.instanceMatrix.clearUpdateRanges();
          m.instanceMatrix.addUpdateRange(0, m.count * 16);
          m.instanceMatrix.needsUpdate = true;
        }
  };

  return {
    root,
    ready,
    setDetailScale(k) {
      const scale = Math.max(0.5, Math.min(2, k));
      for (const st of states.values()) if (!st.fixed) st.ring = scaleRing(st.base, scale);
      dirty = true;
    },
    update(camera, full = false) {
      cam.setFromMatrixPosition(camera.matrixWorld);
      if (cursor < 0) {
        if (!dirty && Math.hypot(cam.x - lastX, cam.z - lastZ) < RESELECT) return;
        startPass();
      } else if (full || Math.hypot(cam.x - pass.x, cam.z - pass.z) > JUMP) {
        startPass(); // a jump: start over from here, all at once
        full = true;
      }
      // A pass walks every placement (33 k): spread over frames a model at a time, about
      // SLICE_MS a frame, so no single frame pays for all of it (2026-11-09: 4 ms median and
      // up to 46 ms in one frame every 8 m of movement before).
      const t0 = performance.now();
      while (cursor < order.length) {
        selectModel(order[cursor++]!);
        if (!full && performance.now() - t0 > SLICE_MS) break;
      }
      if (cursor >= order.length) {
        cursor = -1;
        instances = passInstances;
      }
    },
    stats() {
      let draws = 0,
        triangles = 0;
      const per: Array<[string, number]> = [];
      for (const state of states.values())
        state.lods.forEach((lod, level) => {
          if (!lod || lod === "loading") return;
          const n = lod.count;
          if (n) draws += lod.meshes.length;
          triangles += n * lod.tris;
          if (n) per.push([`${state.id}.lod${level}`, n * lod.tris]);
        });
      // A batch is one multi-draw call (WebGL multi-draw; three falls back to one per range).
      for (const b of batches) if (b.visible) draws++;
      per.sort((a, b) => b[1] - a[1]);
      return { instances, draws, triangles, loadedFiles, top: Object.fromEntries(per.slice(0, 6)) };
    },
    dispose() {
      stopped = true;
      grain?.dispose();
      for (const b of batches) {
        (b.material as THREE.Material).dispose();
        b.dispose();
      }
      for (const state of states.values())
        for (const lod of state.lods)
          if (lod && lod !== "loading")
            for (const m of lod.meshes) {
              m.geometry.dispose();
              const mats = Array.isArray(m.material) ? m.material : [m.material];
              for (const mat of mats) {
                // (The facade atlas is the caller's: island-scene.ts disposes it once.)
                for (const v of Object.values(mat))
                  if (v instanceof THREE.Texture && v !== facades) v.dispose();
                mat.dispose();
              }
              m.dispose();
            }
    },
  };
}
