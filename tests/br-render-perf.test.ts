import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { batchable, buildBatches } from "../src/lib/fps/br/props-batch";
import { brResolutionScale } from "../src/lib/fps/br/br-settings";

/** A far-LOD-like mesh: quantised int16 positions, uint8 colours, its node transform apart. */
function farLod(material: THREE.Material, size = 1) {
  const g = new THREE.BufferGeometry();
  g.setAttribute(
    "position",
    new THREE.BufferAttribute(new Int16Array([0, 0, 0, 32767, 0, 0, 0, 32767, 0]), 3, true),
  );
  g.setAttribute(
    "color",
    new THREE.BufferAttribute(new Uint8Array([255, 0, 0, 0, 255, 0, 0, 0, 255]), 3, true),
  );
  g.setIndex([0, 1, 2]);
  const mesh = new THREE.InstancedMesh(g, material, 4);
  const local = new THREE.Matrix4().makeScale(size, size, size);
  return { mesh, local };
}
const flat = () =>
  new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.9,
    metalness: 0,
    flatShading: true,
  });

describe("BR render performance (2026-11-09 real-GPU benchmark)", () => {
  it("keeps full resolution at the budget's first step and lowers it one step later", () => {
    expect(brResolutionScale(1)).toBe(1);
    expect(brResolutionScale(0.9)).toBe(1);
    expect(brResolutionScale(0.8)).toBeCloseTo(0.9);
    expect(brResolutionScale(0.6)).toBeCloseTo(0.7);
  });

  it("batches only opaque, untextured standard materials", () => {
    expect(batchable(flat())).toBe(true);
    const textured = flat();
    textured.map = new THREE.Texture();
    expect(batchable(textured)).toBe(false);
    expect(batchable(Object.assign(flat(), { transparent: true }))).toBe(false);
    const glowing = flat();
    glowing.emissive.set(0xffffff);
    expect(batchable(glowing)).toBe(false);
    expect(batchable(new THREE.MeshPhysicalMaterial())).toBe(false);
    expect(batchable([flat(), flat()])).toBe(false);
  });

  it("groups far LODs by material into one batch with the node transform baked in", () => {
    const a = farLod(flat(), 2),
      b = farLod(flat(), 3),
      single = farLod(Object.assign(flat(), { side: THREE.DoubleSide }));
    const members = [
      { ...a, placements: 10, model: "house" },
      { ...b, placements: 10, model: "house" }, // the same model's other far LOD
      { ...single, placements: 5, model: "shed" }, // alone in its group: stays instanced
    ];
    const batches = buildBatches(members);
    expect(batches).toHaveLength(1);
    const [batch] = batches;
    expect(batch!.members).toEqual([0, 1]);
    expect(batch!.geometry[2]).toBe(-1);
    // One model's LODs share their placements: room for 10 instances, not 20.
    expect(batch!.mesh.maxInstanceCount).toBe(10);
    // Positions dequantised (normalized int16) and scaled by each member's node transform.
    const box = new THREE.Box3();
    batch!.mesh.getBoundingBoxAt(batch!.geometry[1]!, box);
    expect(box.max.x).toBeCloseTo(3, 3);
    batch!.mesh.getBoundingBoxAt(batch!.geometry[0]!, box);
    expect(box.max.x).toBeCloseTo(2, 3);
    // Colours carried as floats; the batch does not cull or sort per instance (no per-frame walk).
    const color = batch!.mesh.geometry.getAttribute("color");
    expect(color.normalized).toBe(false);
    expect(color.getX(0)).toBeCloseTo(1);
    expect(batch!.mesh.perObjectFrustumCulled).toBe(false);
    expect(batch!.mesh.sortObjects).toBe(false);
    batch!.mesh.dispose();
  });
});
