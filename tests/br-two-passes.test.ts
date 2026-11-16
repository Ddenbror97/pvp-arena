import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { twoPasses } from "@/lib/fps/br/props-renderer";

/**
 * A blended two-sided material is drawn by three in two passes, its side switched and the
 * material marked changed for each: a shader lookup twice a frame for every such mesh in view.
 * The props renderer draws the same two passes as two meshes with one-sided materials instead.
 */
describe("blended two-sided prop materials", () => {
  it("become a back and a front material, back first, sharing their maps", () => {
    const map = new THREE.Texture();
    const leaf = new THREE.MeshStandardMaterial({
      map,
      transparent: true,
      side: THREE.DoubleSide,
      roughness: 0.7,
    });
    leaf.name = "BranchMat";
    const hook = () => {};
    leaf.onBeforeCompile = hook;
    const passes = twoPasses(leaf) as THREE.MeshStandardMaterial[];
    expect(passes).toHaveLength(2);
    expect(passes[0]!.side).toBe(THREE.BackSide);
    expect(passes[1]).toBe(leaf);
    expect(leaf.side).toBe(THREE.FrontSide);
    for (const m of passes) {
      expect(m.transparent).toBe(true);
      expect(m.map).toBe(map);
      expect(m.roughness).toBe(0.7);
      expect(m.onBeforeCompile).toBe(hook);
    }
    // Neither is two-sided any more: three has nothing to switch, so nothing to look up again.
    expect(passes.some((m) => m.side === THREE.DoubleSide)).toBe(false);
  });

  it("leaves every other material as it is", () => {
    const opaque = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide });
    const oneSided = new THREE.MeshStandardMaterial({ transparent: true });
    const glass = new THREE.MeshStandardMaterial({ transparent: true, side: THREE.DoubleSide });
    glass.forceSinglePass = true;
    const several = [opaque, oneSided];
    for (const m of [opaque, oneSided, glass]) {
      expect(twoPasses(m)).toEqual([m]);
    }
    expect(opaque.side).toBe(THREE.DoubleSide);
    expect(glass.side).toBe(THREE.DoubleSide);
    expect(twoPasses(several)).toEqual([several]);
  });
});
