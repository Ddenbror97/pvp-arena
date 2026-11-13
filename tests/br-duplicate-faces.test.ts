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
  it("agrees with a position-by-position comparison on quantised, interleaved models", () => {
    // The plain rule, as text keys: the same three positions (in any order) seen before.
    const plain = (g: THREE.BufferGeometry) => {
      const pos = g.getAttribute("position");
      const key = (i: number) => `${pos.getX(i)},${pos.getY(i)},${pos.getZ(i)}`;
      const seen = new Set<string>();
      const keep: number[] = [];
      const src = g.index!.array;
      for (let t = 0; t + 2 < src.length; t += 3) {
        const k = [key(src[t]!), key(src[t + 1]!), key(src[t + 2]!)].sort().join("|");
        if (seen.has(k)) continue;
        seen.add(k);
        keep.push(src[t]!, src[t + 1]!, src[t + 2]!);
      }
      return keep;
    };
    let state = 12345;
    const random = () => (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 2 ** 32;
    const double = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide });
    for (const kind of ["float", "int16", "interleaved"] as const) {
      // 600 vertices on a coarse lattice (many share a position), 900 random triangles.
      const count = 600;
      const values = Array.from({ length: count * 3 }, () => Math.floor(random() * 7) - 3);
      const g = new THREE.BufferGeometry();
      if (kind === "float")
        g.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(
            values.map((v) => v * 0.25),
            3,
          ),
        );
      else if (kind === "int16")
        g.setAttribute(
          "position",
          new THREE.BufferAttribute(new Int16Array(values.map((v) => v * 4000)), 3, true),
        );
      else {
        // Position after two other components, as meshopt-packed models store it.
        const packed = new Int16Array(count * 5);
        for (let i = 0; i < count; i++) {
          packed[i * 5] = i;
          packed[i * 5 + 1] = -i;
          for (let k = 0; k < 3; k++) packed[i * 5 + 2 + k] = values[i * 3 + k]! * 4000;
        }
        g.setAttribute(
          "position",
          new THREE.InterleavedBufferAttribute(new THREE.InterleavedBuffer(packed, 5), 3, 2, true),
        );
      }
      g.setIndex(Array.from({ length: 2700 }, () => Math.floor(random() * count)));
      const expected = plain(g);
      const removed = dropDuplicateFaces(g, double);
      expect(removed, kind).toBe((2700 - expected.length) / 3);
      expect(removed, kind).toBeGreaterThan(0);
      expect(Array.from(g.index!.array), kind).toEqual(expected);
    }
  });
});
