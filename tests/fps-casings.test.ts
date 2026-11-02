import * as THREE from "three";
import { describe, expect, it } from "vitest";
import {
  AK_CASING,
  CASING_LIFETIME_MS,
  CASING_POOL,
  createShellCasings,
  M4_CASING,
} from "@/lib/fps/shell-casings";

const right = new THREE.Vector3(1, 0, 0),
  up = new THREE.Vector3(0, 1, 0),
  back = new THREE.Vector3(0, 0, 1);
function flight(spec: typeof AK_CASING) {
  const pool = createShellCasings(1, spec);
  pool.emit(new THREE.Vector3(), right, up, back, 0);
  for (let t = 16; t <= 160; t += 16) pool.update(16, t);
  const m = new THREE.Matrix4();
  pool.mesh.getMatrixAt(0, m);
  const p = new THREE.Vector3().setFromMatrixPosition(m);
  return { pool, p };
}

describe("ejected cases", () => {
  it("the AK's 7.62×39 steel case is shorter and fatter than the M4's 5.56 brass", () => {
    expect(AK_CASING.length).toBeLessThan(M4_CASING.length);
    expect(AK_CASING.radius).toBeGreaterThan(M4_CASING.radius);
    expect(AK_CASING.color).not.toBe(M4_CASING.color);
  });
  it("AK cases fly out to the right and slightly forward, M4 cases slightly rearward", () => {
    const ak = flight(AK_CASING),
      m4 = flight(M4_CASING);
    expect(ak.p.x).toBeGreaterThan(0.25);
    expect(ak.p.z).toBeLessThan(0);
    expect(m4.p.z).toBeGreaterThan(0);
    expect(ak.pool.live).toBe(1);
  });
  it("each pool stays bounded and empties after the lifetime", () => {
    const pool = createShellCasings(1, AK_CASING);
    for (let i = 0; i < CASING_POOL * 3; i++)
      pool.emit(new THREE.Vector3(), right, up, back, i * 10);
    pool.update(16, CASING_POOL * 30);
    expect(pool.live).toBeLessThanOrEqual(CASING_POOL);
    pool.update(16, CASING_POOL * 30 + CASING_LIFETIME_MS + 1);
    expect(pool.live).toBe(0);
    expect(pool.mesh.count).toBe(0);
    pool.dispose();
  });
});
