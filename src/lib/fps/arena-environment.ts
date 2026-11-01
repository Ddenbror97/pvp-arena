import * as THREE from "three";
import { Sky } from "three/addons/objects/Sky.js";
import { ARENA, BOXES, FLOOR, STRUCTURES, WALLS, type Solid } from "./map";
import { retainAuthoredAsset } from "./authored-assets";

/** Blender-built PVPSPINARENA aim arena (art/blender/map); dresses exactly the map.ts solids. */
export const ARENA_MAP_URL = "/fps/models/aim-arena.glb";

/**
 * The 1v1 aim arena's render scene. A plain blockout built from the shared gameplay solids is
 * visible at once (and remains as the fallback if the GLB cannot load); the authored map replaces
 * it when `ready` resolves. Gameplay never reads these meshes: movement, bullets and visibility
 * use map.ts. Static: the renderer freezes matrices, captures reflections and renders the
 * shadow map once after `ready`.
 */
export function createArenaEnvironment(scene: THREE.Scene) {
  let disposed = false;
  const owned = {
    geometries: new Set<THREE.BufferGeometry>(),
    materials: new Set<THREE.Material>(),
    textures: new Set<THREE.Texture>(),
  };
  // Warm late-afternoon Mediterranean sky; the sun direction matches the renderer's light.
  const sky = new Sky();
  sky.scale.setScalar(400);
  const uniforms = sky.material.uniforms;
  uniforms["turbidity"]!.value = 6.5;
  uniforms["rayleigh"]!.value = 1.6;
  uniforms["mieCoefficient"]!.value = 0.004;
  uniforms["mieDirectionalG"]!.value = 0.82;
  uniforms["sunPosition"]!.value.set(21, 15, -24).normalize();
  sky.frustumCulled = false;
  sky.castShadow = false;
  sky.name = "sky";
  scene.add(sky);
  owned.geometries.add(sky.geometry);
  owned.materials.add(sky.material);

  // Blockout: one merged mesh per surface, from the same solids the server simulates.
  const blockout = new THREE.Group();
  blockout.name = "arena-blockout";
  const tint: Record<Solid["surface"], number> = {
    concrete: 0xc9b38f,
    metal: 0x7d8a8c,
    wood: 0x9a7448,
  };
  const unit = new THREE.BoxGeometry(1, 1, 1);
  owned.geometries.add(unit);
  for (const surface of ["concrete", "metal", "wood"] as const) {
    const solids = [...BOXES, ...STRUCTURES, ...WALLS].filter((s) => s.surface === surface);
    const material = new THREE.MeshStandardMaterial({ color: tint[surface], roughness: 0.85 });
    owned.materials.add(material);
    const mesh = new THREE.InstancedMesh(unit, material, solids.length);
    const matrix = new THREE.Matrix4();
    solids.forEach((s, i) =>
      mesh.setMatrixAt(
        i,
        matrix.compose(
          new THREE.Vector3(s.x, s.y, s.z),
          new THREE.Quaternion(),
          new THREE.Vector3(s.w, s.h, s.d),
        ),
      ),
    );
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.name = `blockout-${surface}`;
    blockout.add(mesh);
  }
  const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xb59f7c, roughness: 0.9 });
  owned.materials.add(floorMaterial);
  const floor = new THREE.Mesh(unit, floorMaterial);
  floor.position.set(FLOOR.x, FLOOR.y, FLOOR.z);
  floor.scale.set(FLOOR.w + 12, FLOOR.h, FLOOR.d + 12);
  floor.receiveShadow = true;
  blockout.add(floor);
  scene.add(blockout);

  const asset = retainAuthoredAsset(ARENA_MAP_URL);
  let map: THREE.Object3D | undefined;
  const ready = asset.ready
    .then((gltf) => {
      if (disposed) return;
      // Clone the node tree only: geometry, materials and textures stay shared with the cached
      // source (released by `asset.release()`), and frustum culling stays on per section.
      map = gltf.scene.clone(true);
      map.name = "aim-arena";
      map.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        const extras = object.userData as { castShadow?: boolean; noShadow?: boolean };
        object.receiveShadow = true;
        // Big static masses cast; foliage cards, decals and banners only receive.
        object.castShadow = !extras.noShadow;
        object.matrixAutoUpdate = false;
      });
      scene.add(map);
      blockout.removeFromParent();
    })
    .catch((error) => console.warn("Aim arena map unavailable; keeping the blockout.", error));

  return {
    ready,
    /** Bounds of the playable rectangle, for shadow framing. */
    bounds: { width: ARENA.width, depth: ARENA.depth },
    dispose() {
      disposed = true;
      map?.removeFromParent();
      blockout.removeFromParent();
      sky.removeFromParent();
      for (const g of owned.geometries) g.dispose();
      for (const m of owned.materials) m.dispose();
      for (const t of owned.textures) t.dispose();
      for (const child of blockout.children)
        if (child instanceof THREE.InstancedMesh) child.dispose();
      asset.release();
    },
  };
}
