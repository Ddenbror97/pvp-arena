import type * as THREE from "three";
import { bindPoseClip, type PoseClipData } from "./death-clip";

/**
 * Climbing a ladder (owner, 2026-11-11: "add climbing ladder animation, use attached file"):
 * Adobe Mixamo's "Climbing Ladder", baked by scripts/fps/locomotion/bake-ladder.mjs into per-bone
 * rotations for one climbing cycle (both hands and both feet a step up), the climb taken out (the
 * server moves the climber). The cycle's phase is the height climbed (ladders.ts: two rungs a
 * cycle), so the hands meet the rungs and every client shows the same pose. Presentation only.
 */
export const LADDER_URL = "/fps/locomotion/ladder-v1.json";

type LadderClipData = PoseClipData & {
  /** Climb per cycle, the hands' grip ahead of the mean hips, the lowest foot below (hip heights). */
  climb: number;
  gripZ: number;
  footY: number;
};

let data: LadderClipData | null = null;
let loading: Promise<LadderClipData | null> | null = null;

export function loadLadderClip(): Promise<LadderClipData | null> {
  if (data) return Promise.resolve(data);
  if (!loading)
    loading =
      typeof fetch === "undefined" || typeof location === "undefined"
        ? Promise.resolve(null)
        : fetch(LADDER_URL)
            .then((r) => (r.ok ? (r.json() as Promise<LadderClipData>) : null))
            .then((d) => (data = d))
            .catch(() => null);
  return loading;
}

export const ladderClipReady = () => data !== null;

/**
 * Bind the climb to a rig whose bones are at rest. The character's root is at the climber's
 * feet, `standOff` m out from the ladder's plane and turned to face it along the root's +z (the
 * clip's own facing); `apply(cycles)` poses it that far into the climb (looping, either way).
 */
export function bindLadderClip(
  root: THREE.Object3D,
  bones: Map<string, THREE.Bone>,
  unit: number,
  standOff: number,
) {
  if (!data) return null;
  const d = data;
  const cycleMs = (d.rot.length / d.fps) * 1000;
  // The hips over the lowest foot, and back from the plane so the grip falls on it.
  const rig = bindPoseClip(d, root, bones, unit, {
    hipsAt: [0, -d.footY * unit, standOff - d.gripZ * unit],
  });
  if (!rig) return null;
  return { apply: (cycles: number) => rig.apply(cycles * cycleMs) };
}
