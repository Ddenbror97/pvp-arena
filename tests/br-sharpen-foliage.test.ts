import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { FOLIAGE_STENCIL, markFoliage } from "@/lib/fps/br/sharpen";
import { createVegetation } from "@/lib/fps/br/vegetation-renderer";

/**
 * The trees and grass are not sharpened (owner, 2026-11-18: leaves "blinking" at 60–150 m while
 * running): they mark their pixels in the stencil and the sharpening pass skips the mark.
 */
describe("foliage left out of the sharpening", () => {
  it("marks a material's pixels in the stencil where it draws", () => {
    const m = new THREE.MeshStandardMaterial();
    markFoliage(m);
    expect(m.stencilWrite).toBe(true);
    expect(m.stencilRef).toBe(FOLIAGE_STENCIL);
    expect(m.stencilFunc).toBe(THREE.AlwaysStencilFunc);
    expect(m.stencilZPass).toBe(THREE.ReplaceStencilOp);
    expect(m.stencilWriteMask & FOLIAGE_STENCIL).toBe(FOLIAGE_STENCIL);
  });

  it("marks every tree form (procedural fallback)", () => {
    // The materials are made with the forms (no world needed until the first update).
    const veg = createVegetation({} as never, null);
    let meshes = 0;
    veg.root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      for (const m of ([] as THREE.Material[]).concat(mesh.material)) {
        meshes++;
        expect(m.stencilWrite, mesh.name).toBe(true);
        expect(m.stencilRef, mesh.name).toBe(FOLIAGE_STENCIL);
      }
    });
    expect(meshes).toBeGreaterThan(0);
  });
});
