import * as THREE from "three";

/** Swept elliptical anatomy with tapered wrist, flexor volume and subtle vein relief. */
export function anatomicalForearm(wrist: THREE.Vector3, elbow: THREE.Vector3, radiusScale: number) {
  const rings = 36,
    sides = 28,
    positions: number[] = [],
    uv: number[] = [],
    indices: number[] = [];
  const axis = elbow.clone().sub(wrist).normalize(),
    right = new THREE.Vector3(1, 0, 0).addScaledVector(axis, -axis.x).normalize(),
    up = new THREE.Vector3().crossVectors(axis, right).normalize();
  const point = new THREE.Vector3();
  for (let ring = 0; ring <= rings; ring++) {
    const t = ring / rings,
      muscle = Math.sin(Math.PI * t) * 0.019,
      radius = (0.027 + t * 0.025 + muscle) * radiusScale;
    for (let side = 0; side <= sides; side++) {
      const angle = (side / sides) * Math.PI * 2;
      const flexor = 1 + 0.075 * Math.sin(angle * 2 + t * 2) * Math.sin(Math.PI * t);
      const vein =
        0.0007 *
        radiusScale *
        Math.exp(-Math.pow(Math.sin(angle - 0.6 - t * 0.7) / 0.065, 2)) *
        Math.sin(Math.PI * t);
      point
        .copy(wrist)
        .lerp(elbow, t)
        .addScaledVector(right, Math.cos(angle) * (radius * flexor + vein))
        .addScaledVector(up, Math.sin(angle) * (radius * 0.82 + vein));
      positions.push(point.x, point.y, point.z);
      uv.push((side / sides) * 2, t * 3);
      if (ring < rings && side < sides) {
        const a = ring * (sides + 1) + side,
          b = a + sides + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
