import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";

const entries = new Map<string, { refs: number; ready: Promise<GLTF> }>();
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
          if (value instanceof THREE.Texture) textures.add(value);
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
    entry = { refs: 0, ready: loader.loadAsync(url) };
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
        void entry.ready.then(
          (gltf) => disposeSource(gltf.scene),
          () => {},
        );
      }
    },
  };
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
