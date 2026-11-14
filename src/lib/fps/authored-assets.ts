import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { drawGlassOnce } from "./blended-once";

type AssetEntry = {
  refs: number;
  ready: Promise<GLTF>;
  source?: GLTF;
  shared?: { release(): void };
};
const entries = new Map<string, AssetEntry>();

/**
 * Textures the weapon viewmodels share (art/blender/dedupe_viewmodel_textures.mjs): the arm,
 * glove, sleeve and watch textures are shipped once in viewmodel-shared.glb, and each weapon
 * GLB carries 1×1 placeholders in their slots. viewmodel-shared.json says, per weapon file,
 * material and slot, which shared texture goes there. Fetched once, with the first weapon.
 */
const SHARED_PACK = "/fps/models/viewmodel-shared.glb";
const SHARED_MAP = "/fps/models/viewmodel-shared.json";
type SharedMap = Record<string, Record<string, Record<string, string>>>;
let sharedMap: Promise<SharedMap> | null = null;
const sharedTextures = new WeakSet<THREE.Texture>();
const packMaterials = new WeakMap<GLTF, THREE.MeshStandardMaterial[]>();
const loadSharedMap = () =>
  (sharedMap ??= fetch(SHARED_MAP)
    .then((r): Promise<SharedMap> => (r.ok ? r.json() : Promise.resolve({})))
    .catch((): SharedMap => ({})));
const SLOTS = ["map", "normalMap", "metalnessMap", "roughnessMap", "aoMap", "emissiveMap"] as const;
/** glTF slot names (the map file's keys) → the three.js material properties they load into. */
const GLTF_SLOTS: Record<string, readonly (typeof SLOTS)[number][]> = {
  baseColorTexture: ["map"],
  normalTexture: ["normalMap"],
  metallicRoughnessTexture: ["metalnessMap", "roughnessMap"],
  occlusionTexture: ["aoMap"],
  emissiveTexture: ["emissiveMap"],
};
async function attachShared(url: string, gltf: GLTF, entry: AssetEntry) {
  const map = await loadSharedMap();
  const file = url
    .split("/")
    .pop()!
    .replace(/\.glb$/, "");
  const wanted = map[file];
  if (!wanted) return;
  const pack = retainAuthoredAsset(SHARED_PACK);
  entry.shared = pack;
  const shared = await pack.ready;
  const byKey = new Map<string, THREE.Texture>();
  // The pack's textures hang off dummy materials named by key (not placed in its scene).
  const materials = packMaterials.get(shared)!;
  for (const m of materials) if (m.map) byKey.set(m.name, m.map);
  gltf.scene.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    for (const material of Array.isArray(o.material) ? o.material : [o.material]) {
      const slots = wanted[(material as THREE.Material).name];
      if (!slots) continue;
      const standard = material as THREE.MeshStandardMaterial;
      for (const [gltfSlot, key] of Object.entries(slots)) {
        const texture = byKey.get(key);
        if (!texture) continue;
        sharedTextures.add(texture);
        for (const prop of GLTF_SLOTS[gltfSlot] ?? []) {
          const placeholder = standard[prop];
          // The placeholder's sampling settings (set by the glTF) are the ones the real
          // texture should have, so a shared texture reused by several weapons agrees.
          if (placeholder && placeholder !== texture) {
            texture.colorSpace = placeholder.colorSpace;
            texture.flipY = placeholder.flipY;
            texture.wrapS = placeholder.wrapS;
            texture.wrapT = placeholder.wrapT;
            texture.needsUpdate = true;
            placeholder.dispose();
          }
          standard[prop] = texture;
        }
      }
      standard.needsUpdate = true;
    }
  });
}
/** The shared pack's textures live on materials outside its scene: dispose those directly. */
function disposePack(gltf: GLTF) {
  // attachShared resolved these before any weapon became ready. Dispose synchronously:
  // after renderer.dispose() the texture listeners no longer have their GL handles.
  for (const m of packMaterials.get(gltf) ?? []) {
    m.map?.dispose();
    m.dispose();
  }
  packMaterials.delete(gltf);
}
function disposeSource(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>(),
    materials = new Set<THREE.Material>(),
    textures = new Set<THREE.Texture>();
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        materials.add(material);
        for (const value of Object.values(material))
          if (value instanceof THREE.Texture && !sharedTextures.has(value)) textures.add(value);
      }
    }
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
  for (const texture of textures) texture.dispose();
}
/** One decoded mesh/texture source per arena asset; rigs and materials are instance-owned. */
export function retainAuthoredAsset(url: string) {
  let entry = entries.get(url);
  if (!entry) {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    const created: AssetEntry = { refs: 0, ready: loader.loadAsync(url) };
    created.ready = created.ready.then(async (source) => {
      if (url === SHARED_PACK) {
        const materials = (await Promise.all(
          (source.parser.json.materials ?? []).map((_: unknown, i: number) =>
            source.parser.getDependency("material", i),
          ),
        )) as THREE.MeshStandardMaterial[];
        packMaterials.set(source, materials);
      } else await attachShared(url, source, created);
      drawGlassOnce(source.scene);
      created.source = source;
      return source;
    });
    entry = created;
    entries.set(url, entry);
  }
  entry.refs++;
  let released = false;
  return {
    ready: entry.ready,
    release() {
      if (released) return;
      released = true;
      if (--entry.refs === 0) {
        entries.delete(url);
        // Loaded textures must be released before WebGLRenderer.dispose clears
        // its texture properties. Deferring this to a microtask loses those GL
        // handles and leaks allocations when the arena is remounted in an SPA.
        const dispose = (g: GLTF) => {
          if (url === SHARED_PACK) disposePack(g);
          else disposeSource(g.scene);
          // attachShared can acquire this after an owner has left during loading.
          // Release it after readiness, not only at the earlier release() call.
          entry.shared?.release();
        };
        if (entry.source) dispose(entry.source);
        else void entry.ready.then(dispose, () => entry.shared?.release());
      }
    },
  };
}
/** Diagnostics (scripts/br/leak-check): the assets still retained, with their holder counts. */
export function retainedAuthoredAssets() {
  return [...entries].map(([url, e]) => `${url.split("/").pop()} x${e.refs}`);
}
export function cloneAuthoredModel(source: THREE.Object3D) {
  const root = clone(source),
    materials = new Map<THREE.Material, THREE.Material>(),
    skeletons = new Set<THREE.Skeleton>();
  // Preserve source sharing within this instance, while keeping different rigs
  // independently tintable. Cloning per mesh multiplies program/material work.
  const copy = (m: THREE.Material) => {
    let instance = materials.get(m);
    if (!instance) {
      instance = m.clone();
      materials.set(m, instance);
    }
    return instance;
  };
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      if (object instanceof THREE.SkinnedMesh) skeletons.add(object.skeleton);
      object.frustumCulled = false;
      object.castShadow = object.receiveShadow = true;
      object.material = Array.isArray(object.material)
        ? object.material.map(copy)
        : copy(object.material);
    }
  });
  return {
    root,
    dispose() {
      for (const material of materials.values()) material.dispose();
      for (const skeleton of skeletons) skeleton.dispose();
    },
  };
}
