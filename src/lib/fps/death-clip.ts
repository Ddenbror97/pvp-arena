import * as THREE from "three";

/**
 * The death animation (owner, 2026-11-10: replace the rigid tip-over in 1v1, 5v5 and the battle
 * royale): Adobe Mixamo's "Death From The Front", baked by scripts/fps/locomotion/bake-death.mjs
 * into per-bone rotations in the characters' root space. Applied to any rig with Mixamo bone
 * names: each bone is first turned from its own rest direction onto the clip's (the rigs' rest
 * poses differ from Mixamo's), then by the clip's rotation at the time; the hips follow the
 * clip's path scaled to the rig. Presentation only: the eliminated player's server position and
 * volumes are unchanged.
 */
export const DEATH_URL = "/fps/locomotion/death-front-v1.json";

type DeathData = {
  fps: number;
  bones: string[];
  restDir: number[][];
  rot: number[][];
  hips: number[][];
};

let data: DeathData | null = null;
let loading: Promise<DeathData | null> | null = null;

export function loadDeathClip(): Promise<DeathData | null> {
  if (data) return Promise.resolve(data);
  if (!loading)
    loading =
      typeof fetch === "undefined" || typeof location === "undefined"
        ? Promise.resolve(null)
        : fetch(DEATH_URL)
            .then((r) => (r.ok ? (r.json() as Promise<DeathData>) : null))
            .then((d) => (data = d))
            .catch(() => null);
  return loading;
}

/** Length of the animation (ms); 0 before it has loaded. */
export const deathClipMs = () => (data ? ((data.rot.length - 1) / data.fps) * 1000 : 0);

const qa = new THREE.Quaternion(),
  qb = new THREE.Quaternion(),
  q = new THREE.Quaternion(),
  rootQ = new THREE.Quaternion(),
  parentQ = new THREE.Quaternion(),
  v = new THREE.Vector3(),
  w = new THREE.Vector3();

/**
 * A rig's binding to the clip, made once its bones are at rest (the character's load).
 * `bones` maps Mixamo names (without the "mixamorig" prefix) to the rig's bones. Bind with the
 * bones at rest (the character resets them at the start of every update).
 */
export function bindDeathClip(
  root: THREE.Object3D,
  bones: Map<string, THREE.Bone>,
  /** The rig's rest hip height in root space (m): the hips' path is in these units. */
  unit: number,
) {
  const d = data;
  if (!d) return null;
  root.updateWorldMatrix(true, true);
  const toRoot = root.getWorldQuaternion(new THREE.Quaternion()).invert();
  const hips = bones.get("Hips");
  if (!hips) return null;
  const children: Record<string, string> = {
    Hips: "Spine",
    Spine: "Spine1",
    Spine1: "Spine2",
    Spine2: "Neck",
    Neck: "Head",
    Head: "HeadTop_End",
  };
  for (const s of ["Left", "Right"]) {
    children[s + "Shoulder"] = s + "Arm";
    children[s + "Arm"] = s + "ForeArm";
    children[s + "ForeArm"] = s + "Hand";
    children[s + "Hand"] = s + "HandMiddle1";
    children[s + "UpLeg"] = s + "Leg";
    children[s + "Leg"] = s + "Foot";
    children[s + "Foot"] = s + "ToeBase";
  }
  // Per driven bone: the rig's rest rotation in root space, pre-turned onto the clip's rest
  // direction (a bone whose child is missing keeps its own rest direction).
  const drive = d.bones.flatMap((name, i) => {
    const bone = bones.get(name);
    if (!bone) return [];
    const base = toRoot.clone().multiply(bone.getWorldQuaternion(new THREE.Quaternion()));
    const child = bones.get(children[name] ?? "");
    if (child) {
      const own = root
        .worldToLocal(child.getWorldPosition(new THREE.Vector3()))
        .sub(root.worldToLocal(bone.getWorldPosition(new THREE.Vector3())))
        .normalize();
      const clip = new THREE.Vector3().fromArray(d.restDir[i]!);
      base.premultiply(new THREE.Quaternion().setFromUnitVectors(own, clip));
    }
    return [{ bone, index: i, base }];
  });
  const start = d.hips[0]!;
  return {
    /** Pose the rig `ms` into the animation (held at its last frame after it). */
    apply(ms: number) {
      const f = Math.max(0, Math.min(d.rot.length - 1, (ms / 1000) * d.fps));
      const i = Math.floor(f),
        j = Math.min(d.rot.length - 1, i + 1),
        t = f - i;
      root.getWorldQuaternion(rootQ);
      for (const { bone, index, base } of drive) {
        const k = index * 4,
          a = d.rot[i]!,
          b = d.rot[j]!;
        qa.set(a[k]!, a[k + 1]!, a[k + 2]!, a[k + 3]!);
        qb.set(b[k]!, b[k + 1]!, b[k + 2]!, b[k + 3]!);
        q.slerpQuaternions(qa, qb, t).multiply(base).premultiply(rootQ);
        bone.parent!.getWorldQuaternion(parentQ);
        bone.quaternion.copy(parentQ.invert().multiply(q));
        bone.updateWorldMatrix(false, true);
      }
      // The hips' path from where the body stood (in the rig's units), in root space.
      const a = d.hips[i]!,
        b = d.hips[j]!;
      v.set(
        (a[0]! + (b[0]! - a[0]!) * t - start[0]!) * unit,
        (a[1]! + (b[1]! - a[1]!) * t) * unit,
        (a[2]! + (b[2]! - a[2]!) * t - start[2]!) * unit,
      );
      root.localToWorld(v);
      hips.parent!.worldToLocal(w.copy(v));
      hips.position.copy(w);
      hips.updateWorldMatrix(false, true);
    },
  };
}
