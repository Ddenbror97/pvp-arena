import * as THREE from "three";

/**
 * Ejected brass for the first-person M4A1: a bounded pool drawn as one InstancedMesh in the
 * weapon pass. Purely visual: positions are integrated per frame with gravity and spin, no
 * collision; each case lives LIFETIME_MS then its slot is reused (oldest first). The pool never
 * grows and nothing is allocated per shot or per frame.
 *
 * Units are the viewmodel scene's (≈ metres); a 5.56×45 case is 57 mm long, 9.6 mm across.
 */
export const CASING_POOL = 16;
export const CASING_LIFETIME_MS = 900;
const GRAVITY = -9.8;

export function createShellCasings(layer = 1) {
  const geometry = new THREE.CylinderGeometry(0.0046, 0.0048, 0.045, 10, 1);
  // Bottle neck: taper the top ring of vertices.
  const position = geometry.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < position.count; i++)
    if (position.getY(i) > 0.02) {
      position.setX(i, position.getX(i) * 0.62);
      position.setZ(i, position.getZ(i) * 0.62);
    }
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({
    name: "brass",
    color: 0xc9a254,
    metalness: 0.9,
    roughness: 0.32,
  });
  const mesh = new THREE.InstancedMesh(geometry, material, CASING_POOL);
  mesh.name = "shell-casings";
  mesh.frustumCulled = false;
  mesh.layers.set(layer);
  mesh.count = 0;
  const born = new Float64Array(CASING_POOL).fill(-Infinity),
    p = new Float32Array(CASING_POOL * 3),
    v = new Float32Array(CASING_POOL * 3),
    spin = new Float32Array(CASING_POOL * 3),
    angle = new Float32Array(CASING_POOL * 3);
  let next = 0,
    live = 0,
    shots = 0;
  const matrix = new THREE.Matrix4(),
    euler = new THREE.Euler(),
    quaternion = new THREE.Quaternion(),
    scale = new THREE.Vector3(1, 1, 1),
    at = new THREE.Vector3(),
    hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < CASING_POOL; i++) mesh.setMatrixAt(i, hidden);
  return {
    mesh,
    /**
     * Eject one case at `origin` (scene space) with `right`/`up`/`back` the weapon's axes in
     * scene space: out to the right, up, slightly rearward, plus `carry` (the shooter's motion).
     */
    emit(
      origin: THREE.Vector3,
      right: THREE.Vector3,
      up: THREE.Vector3,
      back: THREE.Vector3,
      now: number,
    ) {
      const i = next;
      next = (next + 1) % CASING_POOL;
      shots++;
      const jitter = ((shots * 7919) % 100) / 100 - 0.5;
      born[i] = now;
      p.set([origin.x, origin.y, origin.z], i * 3);
      const speedOut = 2.1 + jitter * 0.4,
        speedUp = 1.3 + jitter * 0.3,
        speedBack = 0.55;
      for (let k = 0; k < 3; k++) {
        const axis = k === 0 ? "x" : k === 1 ? "y" : "z";
        v[i * 3 + k] = right[axis] * speedOut + up[axis] * speedUp + back[axis] * speedBack;
      }
      spin.set([18 + jitter * 6, 4, 26 - jitter * 8], i * 3);
      angle.set([0, 0, Math.PI / 2], i * 3);
      mesh.count = CASING_POOL;
    },
    update(dt: number, now: number) {
      if (!mesh.count) return;
      const seconds = Math.min(0.05, Math.max(0, dt / 1000));
      live = 0;
      for (let i = 0; i < CASING_POOL; i++) {
        if (now - born[i]! > CASING_LIFETIME_MS) {
          if (born[i] !== -Infinity) {
            born[i] = -Infinity;
            mesh.setMatrixAt(i, hidden);
          }
          continue;
        }
        live++;
        v[i * 3 + 1]! += GRAVITY * seconds;
        for (let k = 0; k < 3; k++) {
          p[i * 3 + k]! += v[i * 3 + k]! * seconds;
          angle[i * 3 + k]! += spin[i * 3 + k]! * seconds;
        }
        quaternion.setFromEuler(euler.set(angle[i * 3]!, angle[i * 3 + 1]!, angle[i * 3 + 2]!));
        matrix.compose(at.set(p[i * 3]!, p[i * 3 + 1]!, p[i * 3 + 2]!), quaternion, scale);
        mesh.setMatrixAt(i, matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (!live) mesh.count = 0;
    },
    clear() {
      born.fill(-Infinity);
      for (let i = 0; i < CASING_POOL; i++) mesh.setMatrixAt(i, hidden);
      mesh.instanceMatrix.needsUpdate = true;
      mesh.count = 0;
    },
    get live() {
      return live;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      mesh.dispose();
    },
  };
}
