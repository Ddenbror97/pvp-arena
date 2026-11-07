import * as THREE from "three";
/** Put the visible aim point on the camera ray after the weapon's final animation/sway rotation. */
export function alignedSightPosition(
  out: THREE.Vector3,
  point: THREE.Vector3,
  rotation: THREE.Quaternion,
  eye: number,
) {
  out.copy(point).applyQuaternion(rotation).multiplyScalar(-1);
  out.z -= eye;
  return out;
}
