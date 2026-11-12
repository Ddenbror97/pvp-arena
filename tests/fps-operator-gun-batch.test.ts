import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { createOperatorGunBatch } from "@/lib/fps/operator-gun-batch";

/**
 * The guns in the operators' hands are drawn once per part for all operators (render audit
 * 2026-11-11: nine operators cost more draw calls than the map). The operators' own gun meshes
 * stay in the scene, undrawn, and place the instances.
 */
describe("operator gun batch", () => {
  const camera = new THREE.PerspectiveCamera();
  const receiver = new THREE.BoxGeometry(0.1, 0.1, 0.8),
    magazine = new THREE.BoxGeometry(0.05, 0.2, 0.08),
    lens = new THREE.PlaneGeometry(0.03, 0.03);
  /** One operator: root → pivot → gun (receiver, magazine under it, a glass lens). */
  const operator = (scene: THREE.Scene, x: number) => {
    const root = new THREE.Group(),
      pivot = new THREE.Group(),
      gun = new THREE.Group();
    root.position.set(x, 0, 0);
    pivot.position.set(0, 1.25, 0);
    const body = new THREE.Mesh(receiver, new THREE.MeshStandardMaterial({ name: "Finish" }));
    body.name = "ReceiverGeometry";
    const mag = new THREE.Mesh(magazine, new THREE.MeshStandardMaterial({ name: "Finish" }));
    mag.name = "MagazineGeometry";
    mag.position.set(0, -0.12, 0.1);
    const glass = new THREE.Mesh(
      lens,
      new THREE.MeshStandardMaterial({ name: "Glass", transparent: true }),
    );
    body.add(mag);
    gun.add(body, glass);
    pivot.add(gun);
    root.add(pivot);
    scene.add(root);
    return { root, pivot, gun, body, mag, glass };
  };
  const batches = (scene: THREE.Scene) =>
    scene.children.filter(
      (o): o is THREE.InstancedMesh => (o as THREE.InstancedMesh).isInstancedMesh,
    );
  const matrixAt = (mesh: THREE.InstancedMesh, i: number) => {
    const m = new THREE.Matrix4();
    mesh.getMatrixAt(i, m);
    return m.elements.map((v) => +v.toFixed(5));
  };

  it("draws each part once for every operator, where the operator holds it", () => {
    const scene = new THREE.Scene();
    const batch = createOperatorGunBatch(scene, 10);
    const ops = [0, 2, 4].map((x) => operator(scene, x));
    for (const op of ops) batch.add(op.gun);
    // One instanced mesh per opaque part, whatever the number of operators.
    expect(batches(scene).map((b) => b.name)).toEqual([
      "operator-guns:ReceiverGeometry",
      "operator-guns:MagazineGeometry",
    ]);
    // The operators' own meshes are not drawn, the glass still is.
    for (const op of ops) {
      expect(op.body.layers.test(camera.layers)).toBe(false);
      expect(op.mag.layers.test(camera.layers)).toBe(false);
      expect(op.glass.layers.test(camera.layers)).toBe(true);
    }
    // A reload on the second operator, the third puts the gun away.
    ops[1]!.mag.position.y -= 0.09;
    ops[2]!.gun.visible = false;
    scene.updateMatrixWorld(true);
    batch.update();
    const [bodies, mags] = batches(scene) as [THREE.InstancedMesh, THREE.InstancedMesh];
    expect(bodies.count).toBe(2);
    expect(mags.count).toBe(2);
    expect(batch.drawn).toBe(2);
    expect(matrixAt(bodies, 0)).toEqual(
      ops[0]!.body.matrixWorld.elements.map((v) => +v.toFixed(5)),
    );
    expect(matrixAt(bodies, 1)).toEqual(
      ops[1]!.body.matrixWorld.elements.map((v) => +v.toFixed(5)),
    );
    expect(matrixAt(mags, 1)).toEqual(ops[1]!.mag.matrixWorld.elements.map((v) => +v.toFixed(5)));
    expect(matrixAt(mags, 1)[13]).toBeCloseTo(1.25 - 0.12 - 0.09, 5);
    // The instances carry world matrices: the batch itself sits at the origin, never culled.
    expect(bodies.matrixWorld.equals(new THREE.Matrix4())).toBe(true);
    expect(bodies.frustumCulled).toBe(false);
  });

  it("draws nothing while no operator is in view", () => {
    const scene = new THREE.Scene();
    const batch = createOperatorGunBatch(scene, 10);
    const ops = [0, 2].map((x) => operator(scene, x));
    for (const op of ops) batch.add(op.gun);
    for (const op of ops) op.root.visible = false;
    scene.updateMatrixWorld(true);
    batch.update();
    expect(batch.drawn).toBe(0);
    for (const b of batches(scene)) {
      expect(b.count).toBe(0);
      expect(b.visible).toBe(false);
    }
    // One instance of each for the shader compile before the first round.
    batch.prime();
    for (const b of batches(scene)) expect([b.count, b.visible]).toEqual([1, true]);
  });

  it("takes a gun once, leaves more copies than it has room for as they are, and gives the meshes back", () => {
    const scene = new THREE.Scene();
    const batch = createOperatorGunBatch(scene, 2);
    const ops = [0, 2, 4].map((x) => operator(scene, x));
    for (const op of ops) batch.add(op.gun);
    batch.add(ops[0]!.gun);
    scene.updateMatrixWorld(true);
    batch.update();
    expect(batches(scene)[0]!.count).toBe(2);
    // The third operator's gun is drawn as before.
    expect(ops[2]!.body.layers.test(camera.layers)).toBe(true);
    batch.dispose();
    expect(batches(scene)).toEqual([]);
    for (const op of ops) expect(op.body.layers.test(camera.layers)).toBe(true);
    // The model's geometry and the operators' materials are theirs: still usable.
    expect(receiver.getAttribute("position").count).toBeGreaterThan(0);
  });
});
