import * as THREE from "three";

/**
 * three draws a blended double-sided material in two passes, back faces then front, and marks
 * the material changed for each: its shader program is worked out again twice a frame, for
 * every mesh that uses it, for as long as it is in view. Measured with the frame loop running
 * hot: 2 a frame in 5v5 (the first-person watch glass, 6 kB of garbage a frame) and 4 of the 16
 * a frame on the Battle Royale island (tower glass, the gas wall), each with the program
 * lookup's CPU time.
 *
 * Glass is evenly see-through, so the order its two sides are drawn in does not show: one pass
 * gives the same picture (checked on the prison tower, pixel for pixel). Leaf cards are left
 * alone. Their see-through parts come from the texture, and in one pass the Battle Royale
 * bushes come out darker.
 */
export function drawGlassOnce(root: THREE.Object3D) {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material])
      if (material.transparent && material.side === THREE.DoubleSide && material.opacity < 1)
        material.forceSinglePass = true;
  });
}
