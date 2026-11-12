import type * as THREE from "three";
import { bindPoseClip, type PoseClipData } from "./death-clip";

/**
 * Climbing a rope (owner, 2026-11-12: the Iron Peaks climbing rope, "use the attached climbing
 * animation"): Adobe Mixamo's "Climbing A Rope", baked by scripts/fps/locomotion/bake-rope.mjs
 * into per-bone rotations for one climbing cycle (hand over hand up the rope, the feet walking up
 * the rock face in front, the body leaning back on the rope), the climb taken out (the server
 * moves the climber). The cycle's phase is the distance climbed along the rope (rope.ts), so the
 * hands keep their grip and every client shows the same pose. Presentation only.
 */
export const ROPE_URL = "/fps/locomotion/rope-v1.json";

type RopeClipData = PoseClipData & {
  /** Climb per cycle, the hands' grip ahead of the mean hips, the lowest foot below them and the
   * face the feet stand on beyond the grip (hip heights; the face is at −z). */
  climb: number;
  gripZ: number;
  footY: number;
  wallZ: number;
};

let data: RopeClipData | null = null;
let loading: Promise<RopeClipData | null> | null = null;

export function loadRopeClip(): Promise<RopeClipData | null> {
  if (data) return Promise.resolve(data);
  if (!loading)
    loading =
      typeof fetch === "undefined" || typeof location === "undefined"
        ? Promise.resolve(null)
        : fetch(ROPE_URL)
            .then((r) => (r.ok ? (r.json() as Promise<RopeClipData>) : null))
            .then((d) => (data = d))
            .catch(() => null);
  return loading;
}

export const ropeClipReady = () => data !== null;
/** Distance climbed per cycle (hip heights), once loaded (else the bake's 0.514). */
export const ropeClimbPerCycle = () => data?.climb ?? 0.514;

/**
 * Bind the climb to a rig whose bones are at rest. The character's root is on the rope's line at
 * the climber's lowest foot, its +y up the rope and its −z into the rock face (the face is the
 * clip's wallZ × the rig's hip height in front of the grip); `apply(cycles)` poses it that far
 * into the climb (looping, either way).
 */
export function bindRopeClip(root: THREE.Object3D, bones: Map<string, THREE.Bone>, unit: number) {
  if (!data) return null;
  const d = data;
  const cycleMs = (d.rot.length / d.fps) * 1000;
  // The hips over the lowest foot, and back from the rope's line so the grip falls on it.
  const rig = bindPoseClip(d, root, bones, unit, { hipsAt: [0, -d.footY * unit, -d.gripZ * unit] });
  if (!rig) return null;
  return { apply: (cycles: number) => rig.apply(cycles * cycleMs) };
}
