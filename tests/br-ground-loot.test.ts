import { readFileSync } from "node:fs";
import { afterEach, expect, test, vi } from "vitest";
import * as THREE from "three";
import {
  attachmentFallback,
  groundAttachment,
  groundGear,
} from "../src/lib/fps/br/ground-loot-models";

afterEach(() => vi.unstubAllGlobals());

test("floor gear has grounded geometry with small instanced material/triangle budgets", () => {
  vi.stubGlobal("document", {
    createElement: () => ({
      getContext: () => ({ fillRect() {}, fillText() {} }),
    }),
  });
  const models = groundGear();
  expect(models.size).toBe(12); // five ammunition kinds, the Extended Magazine, worn gear
  for (const [id, kind] of models) {
    kind.geometry.computeBoundingBox();
    const bounds = kind.geometry.boundingBox!;
    expect(Math.abs(bounds.min.y), id).toBeLessThan(0.002);
    expect(bounds.max.y, id).toBeLessThan(0.3);
    const triangles =
      (kind.geometry.index?.count ?? kind.geometry.getAttribute("position").count) / 3;
    expect(triangles, id).toBeGreaterThan(30);
    expect(triangles, id).toBeLessThan(1800);
    expect(kind.geometry.groups.length, id).toBeLessThanOrEqual(2);
    expect(
      (Array.isArray(kind.material) ? kind.material : [kind.material]).length,
      id,
    ).toBeLessThanOrEqual(2);
  }
});

test("textured accessories rest on their side without changing the shared equipped asset", () => {
  const source = new THREE.Group();
  source.position.set(1, 2, 3);
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.3, 12),
    new THREE.MeshStandardMaterial(),
  );
  body.position.y = 0.16;
  const uv = body.geometry.getAttribute("uv");
  body.geometry.setAttribute(
    "uv",
    new THREE.BufferAttribute(
      Uint16Array.from(uv.array, (value) => Math.round(value * 65535)),
      2,
      true,
    ),
  );
  source.add(body);
  const lens = new THREE.Mesh(
    new THREE.CircleGeometry(0.025, 12),
    new THREE.MeshStandardMaterial({ color: 0x395f67 }),
  );
  lens.position.y = 0.31;
  source.add(lens);
  source.updateMatrixWorld(true);
  const before = new THREE.Box3().setFromObject(source).clone();
  const baked = groundAttachment(source)!;
  baked.geometry.computeBoundingBox();
  const bounds = baked.geometry.boundingBox!;
  expect(bounds.min.y).toBeCloseTo(0, 5);
  expect(bounds.getCenter(new THREE.Vector3()).x).toBeCloseTo(0, 5);
  expect(bounds.getSize(new THREE.Vector3()).y).toBeLessThan(0.08);
  expect(baked.geometry.groups.length).toBe(2);
  expect(baked.geometry.getAttribute("uv").array).toBeInstanceOf(Float32Array);
  expect(new THREE.Box3().setFromObject(source)).toEqual(before);
  expect((baked.material as THREE.Material[])[0]).not.toBe(body.material);
});

test("download fallbacks are cylindrical accessories, grounded and visibly different from cases", () => {
  for (const [optic, long] of [
    [true, true],
    [true, false],
    [false, true],
    [false, false],
  ]) {
    const kind = attachmentFallback(optic!, long!);
    kind.geometry.computeBoundingBox();
    expect(kind.geometry.boundingBox!.min.y).toBeCloseTo(0, 5);
    expect(kind.geometry.getAttribute("position").count).toBeGreaterThan(100);
  }
});

test("ground accessory asset keeps every item, removes powered reticles and limits mesh detail", () => {
  const data = readFileSync("public/fps/br/models/ground-loot-v1.glb");
  expect(data.byteLength).toBeLessThan(1_200_000);
  const gltf = JSON.parse(data.subarray(20, 20 + data.readUInt32LE(12)).toString());
  expect(gltf.nodes.filter((n: { children?: number[] }) => n.children).length).toBe(17);
  expect(gltf.nodes.some((n: { name: string }) => /_Aim_/.test(n.name))).toBe(false);
  for (const mesh of gltf.meshes) {
    const triangles = mesh.primitives.reduce(
      (sum: number, p: { indices: number }) => sum + gltf.accessors[p.indices].count / 3,
      0,
    );
    expect(triangles, mesh.name).toBeLessThan(2800);
  }
});
