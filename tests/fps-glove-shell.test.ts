import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { outsideOut } from "@/lib/fps/fitted-rifle-hands";

/** Signed volume of an indexed shell: positive when wound outward. */
function volume(geometry: THREE.BufferGeometry) {
  const p = geometry.getAttribute("position"),
    index = geometry.index!;
  const a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    c = new THREE.Vector3();
  let v = 0;
  for (let t = 0; t < index.count; t += 3) {
    a.fromBufferAttribute(p, index.getX(t));
    b.fromBufferAttribute(p, index.getX(t + 1));
    c.fromBufferAttribute(p, index.getX(t + 2));
    v += a.dot(b.cross(c));
  }
  return v;
}
function insideOut() {
  const geometry = new THREE.SphereGeometry(0.05, 16, 12);
  geometry.computeTangents();
  const ids = geometry.index!.array;
  for (let t = 0; t < ids.length; t += 3) [ids[t + 1], ids[t + 2]] = [ids[t + 2]!, ids[t + 1]!];
  const n = geometry.getAttribute("normal");
  for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
  return geometry;
}

describe("first-person glove shell", () => {
  it("turns an inside-out glove shell the right way out (winding, normals, tangent sign)", () => {
    const geometry = insideOut();
    expect(volume(geometry)).toBeLessThan(0);
    const w = geometry.getAttribute("tangent").getW(0);
    expect(outsideOut(geometry)).toBe(true);
    expect(volume(geometry)).toBeGreaterThan(0);
    // Normals point away from the centre again.
    const p = geometry.getAttribute("position"),
      n = geometry.getAttribute("normal");
    let outward = 0;
    for (let i = 0; i < p.count; i++)
      if (
        new THREE.Vector3()
          .fromBufferAttribute(p, i)
          .dot(new THREE.Vector3().fromBufferAttribute(n, i)) > 0
      )
        outward++;
    expect(outward / p.count).toBeGreaterThan(0.95);
    expect(geometry.getAttribute("tangent").getW(0)).toBe(-w);
  });
  it("leaves a correctly wound shell alone", () => {
    const geometry = new THREE.SphereGeometry(0.05, 16, 12);
    const before = Array.from(geometry.index!.array);
    expect(outsideOut(geometry)).toBe(false);
    expect(Array.from(geometry.index!.array)).toEqual(before);
  });
});
