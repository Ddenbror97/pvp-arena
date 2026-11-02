import * as THREE from "three";

/**
 * Ejected cases for the first-person rifles: a bounded pool drawn as one InstancedMesh in the
 * weapon pass. Purely visual: positions are integrated per frame with gravity and spin, no
 * collision; each case lives LIFETIME_MS then its slot is reused (oldest first). The pool never
 * grows and nothing is allocated per shot or per frame.
 *
 * Units are the viewmodel scene's (≈ metres), drawn at the viewmodel's scale (×0.8).
 */
export const CASING_POOL = 16;
export const CASING_LIFETIME_MS = 900;
const GRAVITY = -9.8;

export type CasingSpec = {
  name: string;
  /** Base and body-top radius, length (scene units). */
  radius: number;
  topRadius: number;
  length: number;
  /** Shoulder: height (fraction of length) where the neck starts, and its radius scale. */
  shoulder: number;
  neck: number;
  color: number;
  metalness: number;
  roughness: number;
  /** Ejection speeds (m/s): out to the right, up, and backward (negative: forward). */
  speed: { out: number; up: number; back: number };
};
/** M4A1: 5.56×45 brass, 57 mm long, 9.6 mm across; up, right and a little rearward. */
export const M4_CASING: CasingSpec = {
  name: "brass",
  radius: 0.0048,
  topRadius: 0.0046,
  length: 0.045,
  shoulder: 0.94,
  neck: 0.62,
  color: 0xc9a254,
  metalness: 0.9,
  roughness: 0.32,
  speed: { out: 2.1, up: 1.3, back: 0.55 },
};
/**
 * AK-47: 7.62×39 lacquered steel, 39 mm long and 11.3 mm at the base with a strong taper and a
 * short neck; the AK throws its cases hard to the right and slightly forward.
 */
export const AK_CASING: CasingSpec = {
  name: "lacquered-steel",
  radius: 0.0057,
  topRadius: 0.0049,
  length: 0.031,
  shoulder: 0.84,
  neck: 0.7,
  color: 0x5f5640,
  metalness: 0.7,
  roughness: 0.42,
  speed: { out: 2.6, up: 1.1, back: -0.25 },
};

export function createShellCasings(layer = 1, spec: CasingSpec = M4_CASING) {
  const geometry = new THREE.CylinderGeometry(spec.topRadius, spec.radius, spec.length, 10, 4);
  // Bottle neck: taper the rings above the shoulder.
  const position = geometry.getAttribute("position") as THREE.BufferAttribute;
  const shoulderY = spec.length * (spec.shoulder - 0.5);
  for (let i = 0; i < position.count; i++)
    if (position.getY(i) > shoulderY - 1e-6) {
      position.setX(i, position.getX(i) * spec.neck);
      position.setZ(i, position.getZ(i) * spec.neck);
    }
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({
    name: spec.name,
    color: spec.color,
    metalness: spec.metalness,
    roughness: spec.roughness,
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
      const speedOut = spec.speed.out + jitter * 0.4,
        speedUp = spec.speed.up + jitter * 0.3,
        speedBack = spec.speed.back;
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
