import type * as THREE from "three";
import { bindPoseClip, type PoseClipData } from "./death-clip";

/**
 * The swimming stroke (owner, 2026-11-10: "add a swimming animation instead of the character
 * running in the water"): Adobe Mixamo's "Swimming", baked by scripts/fps/locomotion/
 * bake-swim.mjs into per-bone rotations for one stroke cycle, the forward travel taken out
 * (the server moves the swimmer). Presentation only: a swimming player's position and volumes
 * are the server's.
 */
export const SWIM_URL = "/fps/locomotion/swim-v1.json";

/** The hips below the water's surface (m), the body lying along it. */
const SWIM_HIPS: [number, number, number] = [0, -0.22, 0];

let data: PoseClipData | null = null;
let loading: Promise<PoseClipData | null> | null = null;

export function loadSwimClip(): Promise<PoseClipData | null> {
  if (data) return Promise.resolve(data);
  if (!loading)
    loading =
      typeof fetch === "undefined" || typeof location === "undefined"
        ? Promise.resolve(null)
        : fetch(SWIM_URL)
            .then((r) => (r.ok ? (r.json() as Promise<PoseClipData>) : null))
            .then((d) => (data = d))
            .catch(() => null);
  return loading;
}

export const swimClipReady = () => data !== null;

/** Bind the stroke to a rig whose bones are at rest; `apply(ms)` poses it, looping. */
export function bindSwimClip(root: THREE.Object3D, bones: Map<string, THREE.Bone>, unit: number) {
  return data ? bindPoseClip(data, root, bones, unit, { hipsAt: SWIM_HIPS }) : null;
}
