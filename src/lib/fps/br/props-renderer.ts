import * as THREE from "three";
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
 */
export type ModelManifest = {
  models: Record<
    string,
    { class: string; ring?: string; size: number[]; lods: Array<{ file: string; tris: number }> }
  >;
};

/** Distance (m) up to which each LOD is used, per class; beyond the last, not drawn. */
const RINGS: Record<string, [number, number, number]> = {
  small: [50, 180, 1000],
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
 * Classes that hide or stop players draw the same for everyone at every view distance
 * (fairness, PLAN §10); the view distance scales the rest (buildings, structures, aircraft).
 */
const FIXED_RINGS = new Set(["small", "prop", "vehicle", "rock", "bush", "yard"]);
/** Scaled rings never end closer than this (m): beyond the 1 km range players are sent. */
const MIN_FAR = 1500;
const scaleRing = (ring: [number, number, number], k: number): [number, number, number] => [
  ring[0] * k,
  ring[1] * k,
  Math.max(MIN_FAR, ring[2] * Math.min(k, 1.25)),
];

/** Each instanced primitive keeps its node matrix (the dequantisation transform of
 * KHR_mesh_quantization lives on the node), applied after the placement. */
type LodMeshes = { meshes: THREE.InstancedMesh[]; local: THREE.Matrix4[]; tris: number };
type ModelState = {
  id: string;
  ring: [number, number, number];
  base: [number, number, number];
  fixed: boolean;
  lods: Array<LodMeshes | null | "loading">;
};

export type PropsControls = {
  root: THREE.Object3D;
  /** Resolves when the farthest LOD of every placed model is loaded. */
  ready: Promise<void>;
  update: (camera: THREE.Camera) => void;
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
  { preload = false }: { preload?: boolean } = {},
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
      ring,
      base: ring,
      fixed: FIXED_RINGS.has(cls),
      lods: m.lods.map(() => null),
    });
  }
  let loadedFiles = 0;
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
    gltf.scene.updateMatrixWorld(true);
    const meshes: THREE.InstancedMesh[] = [];
    const local: THREE.Matrix4[] = [];
    const capacity = byModel.get(state.id)!.length;
    gltf.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      local.push(mesh.matrixWorld.clone());
      const im = new THREE.InstancedMesh(mesh.geometry, mesh.material, capacity);
      im.name = `${state.id}.lod${level}`;
      im.count = 0;
      im.frustumCulled = false;
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      root.add(im);
      meshes.push(im);
    });
    state.lods[level] = { meshes, local, tris: manifest.models[state.id]!.lods[level]!.tris };
    loadedFiles++;
    dirty = true;
  };

  const ready = Promise.all(
    [...states.values()].flatMap((s) =>
      preload ? s.lods.map((_, level) => load(s, level)) : [load(s, s.lods.length - 1)],
    ),
  ).then(() => {});
  let lastX = Infinity,
    lastZ = Infinity,
    dirty = true;
  const cam = new THREE.Vector3();
  let instances = 0;

  return {
    root,
    ready,
    setDetailScale(k) {
      const scale = Math.max(0.5, Math.min(2, k));
      for (const st of states.values()) if (!st.fixed) st.ring = scaleRing(st.base, scale);
      dirty = true;
    },
    update(camera) {
      cam.setFromMatrixPosition(camera.matrixWorld);
      if (!dirty && Math.hypot(cam.x - lastX, cam.z - lastZ) < RESELECT) return;
      lastX = cam.x;
      lastZ = cam.z;
      dirty = false;
      instances = 0;
      for (const [id, state] of states) {
        for (const lod of state.lods)
          if (lod && lod !== "loading") for (const m of lod.meshes) m.count = 0;
        for (const p of byModel.get(id)!) {
          const d = Math.hypot(p.x - cam.x, p.y - cam.y, p.z - cam.z);
          let level = state.ring.findIndex((r) => d <= r);
          if (level < 0) continue;
          // Ask for the right LOD; draw the best one available meanwhile (never nothing).
          if (!state.lods[level]) void load(state, level);
          while (
            level < state.lods.length &&
            (!state.lods[level] || state.lods[level] === "loading")
          )
            level++;
          const lod = state.lods[level];
          if (!lod || lod === "loading") continue;
          rotation.setFromAxisAngle(up, (p.turn * Math.PI) / 2);
          matrix.compose(position.set(p.x, p.y, p.z), rotation, unit);
          lod.meshes.forEach((m, k) =>
            m.setMatrixAt(m.count++, placed.multiplyMatrices(matrix, lod.local[k]!)),
          );
          instances++;
        }
        for (const lod of state.lods)
          if (lod && lod !== "loading")
            for (const m of lod.meshes) {
              m.visible = m.count > 0;
              m.instanceMatrix.clearUpdateRanges();
              m.instanceMatrix.addUpdateRange(0, m.count * 16);
              m.instanceMatrix.needsUpdate = true;
            }
      }
    },
    stats() {
      let draws = 0,
        triangles = 0;
      const per: Array<[string, number]> = [];
      for (const state of states.values())
        state.lods.forEach((lod, level) => {
          if (!lod || lod === "loading") return;
          const n = lod.meshes[0]?.count ?? 0;
          if (n) draws += lod.meshes.length;
          triangles += n * lod.tris;
          if (n) per.push([`${state.id}.lod${level}`, n * lod.tris]);
        });
      per.sort((a, b) => b[1] - a[1]);
      return { instances, draws, triangles, loadedFiles, top: Object.fromEntries(per.slice(0, 6)) };
    },
    dispose() {
      for (const state of states.values())
        for (const lod of state.lods)
          if (lod && lod !== "loading")
            for (const m of lod.meshes) {
              m.geometry.dispose();
              const mats = Array.isArray(m.material) ? m.material : [m.material];
              for (const mat of mats) {
                for (const v of Object.values(mat)) if (v instanceof THREE.Texture) v.dispose();
                mat.dispose();
              }
              m.dispose();
            }
    },
  };
}
