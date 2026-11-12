import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { drawGlassOnce } from "@/lib/fps/blended-once";

/**
 * three draws a blended double-sided material in two passes and works its shader program out
 * again for each (twice a frame per mesh). Glass does not need the two passes; leaf cards keep
 * them (in one pass the Battle Royale bushes come out darker).
 */
describe("drawGlassOnce", () => {
  const mesh = (parameters: THREE.MeshStandardMaterialParameters) =>
    new THREE.Mesh(new THREE.PlaneGeometry(), new THREE.MeshStandardMaterial(parameters));

  it("draws see-through double-sided glass in one pass and leaves everything else alone", () => {
    const glass = mesh({ transparent: true, opacity: 0.3, side: THREE.DoubleSide }),
      leaves = mesh({ transparent: true, side: THREE.DoubleSide, map: new THREE.Texture() }),
      decal = mesh({ transparent: true, opacity: 0.5 }),
      wall = mesh({ side: THREE.DoubleSide });
    const both = new THREE.Mesh(new THREE.PlaneGeometry(), [
      new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.2, side: THREE.DoubleSide }),
      new THREE.MeshStandardMaterial(),
    ]);
    const root = new THREE.Group().add(glass, new THREE.Group().add(leaves, decal), wall, both);
    drawGlassOnce(root);
    const once = (m: THREE.Mesh, i = 0) =>
      (Array.isArray(m.material) ? m.material[i]! : m.material).forceSinglePass;
    expect(once(glass)).toBe(true);
    expect(once(both, 0)).toBe(true);
    expect([once(leaves), once(decal), once(wall), once(both, 1)]).toEqual([
      false,
      false,
      false,
      false,
    ]);
    // A copy of the material for another operator's arms keeps the setting.
    expect((glass.material as THREE.Material).clone().forceSinglePass).toBe(true);
  });
});
