import * as THREE from "three";
import { expect, it } from "vitest";
import { applyQuality, backgroundBatches } from "../src/lib/fps/maps/lost-trail-environment";

function batch(n: number) {
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial(), n);
  for (let i = 0; i < n; i++) mesh.setMatrixAt(i, new THREE.Matrix4().makeTranslation(i * 3, 0, 0));
  return mesh;
}

it("low quality thins only the background forest and high restores it exactly", () => {
  const root = new THREE.Group();
  const bg = Object.assign(new THREE.Group(), { name: "section-bg-wn" });
  const veg = Object.assign(new THREE.Group(), { name: "section-veg-wn" });
  const far = batch(9);
  const edge = batch(8);
  bg.add(Object.assign(new THREE.Group(), { name: "section-bg-wn-lib-tree" }).add(far));
  veg.add(edge);
  root.add(bg, veg);
  const batches = backgroundBatches(root);
  expect(batches.map((b) => b.mesh)).toEqual([far]);
  const original = Float32Array.from(far.instanceMatrix.array);

  applyQuality(batches, "low");
  expect(far.count).toBe(5);
  expect(edge.count).toBe(8);
  // Kept trees grow about their own base; their positions don't move.
  const m = new THREE.Matrix4();
  far.getMatrixAt(2, m);
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  m.decompose(p, new THREE.Quaternion(), s);
  expect(p.x).toBeCloseTo(6);
  expect(s.x).toBeGreaterThan(1.1);

  applyQuality(batches, "high");
  expect(far.count).toBe(9);
  expect(Array.from(far.instanceMatrix.array)).toEqual(Array.from(original));
});
