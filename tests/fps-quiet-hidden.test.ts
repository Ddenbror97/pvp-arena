import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { quietWhileHidden } from "../src/lib/fps/quiet-hidden";

/** root → pivot → gun (quiet) → part → marker. */
function rig() {
  const root = new THREE.Group(),
    pivot = new THREE.Group(),
    gun = quietWhileHidden(new THREE.Group()),
    part = new THREE.Mesh(),
    marker = new THREE.Object3D();
  root.add(pivot);
  pivot.add(gun);
  gun.add(part);
  part.add(marker);
  gun.position.set(0, 1, 0);
  part.position.set(0, 0, 2);
  marker.position.set(3, 0, 0);
  return { root, pivot, gun, part, marker };
}
const x = (o: THREE.Object3D) => o.matrixWorld.elements[12];

describe("quietWhileHidden (performance audit 2026-11-14)", () => {
  it("refreshes a shown subtree exactly as before", () => {
    const { root, marker } = rig();
    root.position.x = 10;
    root.updateMatrixWorld();
    expect(marker.matrixWorld.elements.slice(12, 15)).toEqual([13, 1, 2]);
    root.position.x = 20;
    root.updateWorldMatrix(true, true);
    expect(x(marker)).toBe(23);
  });

  it("leaves a hidden subtree alone on both kinds of refresh from above", () => {
    const { root, pivot, gun, part, marker } = rig();
    root.updateMatrixWorld();
    gun.visible = false;
    root.position.x = 10;
    root.updateMatrixWorld();
    pivot.updateWorldMatrix(false, true);
    root.updateWorldMatrix(true, true);
    expect(x(pivot)).toBe(10); // the shown part of the tree follows
    expect([x(gun), x(part), x(marker)]).toEqual([0, 0, 3]); // the hidden part is not touched
  });

  it("catches up on the first refresh after it is shown, by either kind", () => {
    for (const refresh of [
      (o: THREE.Object3D) => o.updateMatrixWorld(),
      (o: THREE.Object3D) => o.updateWorldMatrix(false, true),
    ]) {
      const { root, gun, part, marker } = rig();
      // Even with matrices that are not recomposed every frame.
      part.matrixAutoUpdate = marker.matrixAutoUpdate = false;
      part.updateMatrix();
      marker.updateMatrix();
      root.updateMatrixWorld();
      gun.visible = false;
      root.position.x = 10;
      refresh(root);
      gun.visible = true;
      refresh(root);
      expect([x(gun), x(part), x(marker)]).toEqual([10, 10, 13]);
    }
  });

  it("still answers a caller that asks for the hidden object itself", () => {
    const { root, gun, marker } = rig();
    root.updateMatrixWorld();
    gun.visible = false;
    root.position.x = 10;
    root.updateMatrixWorld();
    // getWorldPosition and localToWorld refresh the object and its parents.
    expect(marker.getWorldPosition(new THREE.Vector3()).x).toBe(13);
    expect(gun.localToWorld(new THREE.Vector3(1, 0, 0)).x).toBe(11);
    // A measure of the whole hidden model (after loading): parents and children.
    root.position.x = 20;
    gun.updateWorldMatrix(true, true);
    expect(x(marker)).toBe(23);
  });
});
