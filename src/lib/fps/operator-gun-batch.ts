import * as THREE from "three";

/**
 * The guns in the operators' hands, drawn once per part instead of once per part per operator
 * (render audit 2026-11-11: "Nine in view cost more than the Iron District map itself"). A
 * world rifle is 6 to 11 meshes, every operator of a side carries the same one, and each mesh
 * was its own draw call: 79 calls for the guns of nine operators against 81 for the map in its
 * median view. The meshes of one part share their geometry (the cached model) and have equal
 * materials, so one instanced mesh per part draws all of them.
 *
 * The operators' own meshes stay in the scene graph on a layer no camera draws: the character
 * code still poses them (shouldering, reloads, the magazine dropping), and their world matrices
 * place the instances. A gun is drawn while it and everything above it is visible, exactly as
 * before.
 */
/** A layer no camera renders. */
const UNDRAWN = 31;

const shown = (object: THREE.Object3D | null) => {
  for (; object; object = object.parent) if (!object.visible) return false;
  return true;
};

export function createOperatorGunBatch(scene: THREE.Scene, capacity: number) {
  type Batch = { instances: THREE.InstancedMesh; parts: THREE.Mesh[] };
  const batches = new Map<string, Batch>();
  const taken = new WeakSet<THREE.Object3D>();
  return {
    /** Batch the meshes of one operator's gun (a loaded world model's root). Once per gun. */
    add(gun: THREE.Object3D) {
      if (taken.has(gun)) return;
      taken.add(gun);
      gun.traverse((object) => {
        const part = object as THREE.Mesh;
        if (!part.isMesh || (part as THREE.SkinnedMesh).isSkinnedMesh) return;
        const material = part.material;
        // Glass and other blended parts are sorted by distance, one object at a time.
        if (Array.isArray(material) || material.transparent) return;
        const key = `${part.geometry.uuid}|${material.name}`;
        let batch = batches.get(key);
        if (!batch) {
          // Every operator's copy of this part has an equal material (the same model, finish
          // and scale): the first one's draws them all.
          const instances = new THREE.InstancedMesh(part.geometry, material, capacity);
          instances.name = `operator-guns:${part.name}`;
          instances.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
          // The instances are anywhere on the map; the operators are culled one by one.
          instances.frustumCulled = false;
          instances.castShadow = false;
          instances.receiveShadow = part.receiveShadow;
          instances.count = 0;
          scene.add(instances);
          batches.set(key, (batch = { instances, parts: [] }));
        }
        if (batch.parts.length >= capacity) return;
        batch.parts.push(part);
        part.layers.set(UNDRAWN);
      });
    },
    /** One instance of everything, so the instanced programs compile before the first round. */
    prime() {
      for (const { instances } of batches.values()) {
        instances.count = 1;
        instances.visible = true;
      }
    },
    /** After the operators are posed and their world matrices are current. */
    update() {
      for (const { instances, parts } of batches.values()) {
        let count = 0;
        for (const part of parts) if (shown(part)) instances.setMatrixAt(count++, part.matrixWorld);
        instances.count = count;
        instances.visible = count > 0;
        if (count) instances.instanceMatrix.needsUpdate = true;
      }
    },
    /** Draw calls the batch makes now (for the diagnostics). */
    get drawn() {
      let n = 0;
      for (const { instances } of batches.values()) if (instances.visible) n++;
      return n;
    },
    dispose() {
      for (const { instances, parts } of batches.values()) {
        instances.removeFromParent();
        instances.dispose();
        for (const part of parts) part.layers.set(0);
      }
      batches.clear();
    },
  };
}
