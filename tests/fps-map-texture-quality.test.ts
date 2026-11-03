import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { sharpenMapColors } from "../src/lib/fps/map-texture-quality";
describe("bounded map color filtering", () => {
  it("improves shared color maps once without changing normal/data filtering or allocating images", () => {
    const map = new THREE.Texture(),
      normal = new THREE.Texture();
    const material = new THREE.MeshStandardMaterial({ map, normalMap: normal });
    const root = new THREE.Group();
    root.add(
      new THREE.Mesh(new THREE.BoxGeometry(), material),
      new THREE.Mesh(new THREE.BoxGeometry(), material),
    );
    const image = map.image,
      initialVersion = map.version;
    expect(sharpenMapColors(root, 16)).toEqual({ textures: 1, anisotropy: 4 });
    expect(map.anisotropy).toBe(4);
    expect(normal.anisotropy).toBe(1);
    expect(map.image).toBe(image);
    expect(map.version).toBe(initialVersion + 1);
    sharpenMapColors(root, 16);
    expect(map.version).toBe(initialVersion + 1);
  });
  it("respects hardware limits and handles unavailable capability data", () => {
    for (const max of [1, 2, NaN]) {
      const map = new THREE.Texture();
      const root = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ map }));
      sharpenMapColors(root, max);
      expect(map.anisotropy).toBe(Number.isFinite(max) ? max : 1);
    }
  });
});
