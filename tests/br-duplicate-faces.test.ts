import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { dropDuplicateFaces } from "@/lib/fps/br/duplicate-faces";

/** A quad stored twice (front and back copies, the back with its own vertices and winding). */
function twiceStoredQuad() {
  const g = new THREE.BufferGeometry();
  const p = [0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0];
  g.setAttribute("position", new THREE.Float32BufferAttribute([...p, ...p], 3));
  g.setAttribute(
    "normal",
    new THREE.Float32BufferAttribute(
      [...Array(4).fill([0, 0, 1]).flat(), ...Array(4).fill([0, 0, -1]).flat()],
      3,
    ),
  );
  g.setIndex([0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6]);
  return g;
}

describe("double-sided surfaces stored twice (z-fight flicker)", () => {
  it("drops the second copy under a double-sided material", () => {
    const g = twiceStoredQuad();
    expect(dropDuplicateFaces(g, new THREE.MeshStandardMaterial({ side: THREE.DoubleSide }))).toBe(
      2,
    );
    expect(Array.from(g.index!.array)).toEqual([0, 1, 2, 0, 2, 3]);
  });
  it("keeps both copies under a single-sided material (each faces its own way)", () => {
    const g = twiceStoredQuad();
    expect(dropDuplicateFaces(g, new THREE.MeshStandardMaterial())).toBe(0);
    expect(g.index!.count).toBe(12);
  });
  it("keeps distinct triangles that share an edge", () => {
    const g = twiceStoredQuad();
    g.setIndex([0, 1, 2, 0, 2, 3]);
    expect(dropDuplicateFaces(g, new THREE.MeshStandardMaterial({ side: THREE.DoubleSide }))).toBe(
      0,
    );
  });
});
