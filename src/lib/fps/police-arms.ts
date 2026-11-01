import * as THREE from "three";
import type { GripFrame } from "./fitted-rifle-hands";

/**
 * Support-hand grip on the M4 quad rail. The finger targets were authored on the slimmer AK
 * handguard (half-width ≈ 0.038 viewmodel units); the rail is ≈ 0.055, so the wrap is opened
 * slightly about the handguard axis and nudged onto the rail's near side, keeping the fingers on
 * its faces instead of inside it.
 */
const HANDGUARD_AXIS = new THREE.Vector3(0, -0.011, -0.851);
export function policeGuardGrip(
  scale = 1.1,
  shift = new THREE.Vector3(0.008, 0.006, 0),
): GripFrame {
  return {
    point: (v) =>
      v
        .clone()
        .sub(HANDGUARD_AXIS)
        .multiply(new THREE.Vector3(scale, scale, 1))
        .add(HANDGUARD_AXIS)
        .add(shift),
    direction: (v) => v.clone(),
    rightHand: true,
  };
}
