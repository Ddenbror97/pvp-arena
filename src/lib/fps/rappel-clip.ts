import * as THREE from "three";
import { poseClipDrive } from "./death-clip";

/**
 * The rappel's animation (owner, 2026-11-15: "use blend to build the animation … the animation
 * you will build from scratch"): keyed in Blender on a control rig over the police character's
 * own joints (art/blender/rappel/build_rappel.py, rappel.blend) and baked to per-bone rotations
 * in the characters' root space, the way the death and the ladder climb are. Six clips, timed to
 * the shared mechanics (br/rappel.ts), the body's point moving in them as the server moves it so
 * a boot keyed on the wall stays where it is put:
 * - `on`: turning to the roof at the edge, taking the rope, sitting back over the edge and
 *   walking down the first of the wall (RAPPEL.onMs; backwards, it is the climb back over);
 * - `idle`: braced on the wall, leaning back on the rope (a loop);
 * - `hop`, `hop2`: the wall jump (HOP_MS), either boot back on the wall first;
 * - `climb`: walking up the wall hand over hand, 0.9 m a cycle (a loop; backwards, down);
 * - `land`: off the wall onto the floor (RAPPEL.landMs).
 * Each frame also says how firmly each boot is on the wall and each hand on the rope: the
 * character holds those there itself (authored-character.ts). Presentation only.
 */
export const RAPPEL_CLIP_URL = "/fps/locomotion/rappel-v1.json";

export type RappelClipName = "on" | "idle" | "hop" | "hop2" | "climb" | "land";

type Clip = {
  loop: boolean;
  rot: number[][];
  hips: number[][];
  /** Per frame: the left and right boot on the wall (0..1), hand on the rope (0..1). */
  plant: number[][];
  grip: number[][];
};
type RappelClipData = {
  fps: number;
  /** The authoring rig's hip height (m), and its ankle over its sole in those. */
  unit: number;
  ankle: number;
  bones: string[];
  restDir: number[][];
  clips: Record<RappelClipName, Clip>;
};

/** Metres of wall a cycle of `climb` walks. */
export const RAPPEL_CLIMB_CYCLE = 0.9;

let data: RappelClipData | null = null;
let loading: Promise<RappelClipData | null> | null = null;

export function loadRappelClip(): Promise<RappelClipData | null> {
  if (data) return Promise.resolve(data);
  if (!loading)
    loading =
      typeof fetch === "undefined" || typeof location === "undefined"
        ? Promise.resolve(null)
        : fetch(RAPPEL_CLIP_URL)
            .then((r) => (r.ok ? (r.json() as Promise<RappelClipData>) : null))
            .then((d) => (data = d))
            .catch(() => null);
  return loading;
}

export const rappelClipReady = () => data !== null;

/** A clip's length (ms): a loop's cycle, else to its last frame. 0 before the clips are in. */
export function rappelClipMs(name: RappelClipName) {
  const c = data?.clips[name];
  return c && data ? ((c.loop ? c.rot.length : c.rot.length - 1) / data.fps) * 1000 : 0;
}

/** What a frame says of the boots and hands, as last applied. */
export type RappelContacts = { plantL: number; plantR: number; gripL: number; gripR: number };

const qa = new THREE.Quaternion(),
  qb = new THREE.Quaternion(),
  q = new THREE.Quaternion(),
  q2 = new THREE.Quaternion(),
  rootQ = new THREE.Quaternion(),
  parentQ = new THREE.Quaternion(),
  v = new THREE.Vector3(),
  w = new THREE.Vector3();
const at = { i: 0, j: 0, t: 0 };

function frame(c: Clip, fps: number, ms: number) {
  const n = c.rot.length;
  const f = c.loop
    ? ((((ms / 1000) * fps) % n) + n) % n
    : Math.max(0, Math.min(n - 1, (ms / 1000) * fps));
  at.i = Math.min(n - 1, Math.floor(f));
  at.j = c.loop ? (at.i + 1) % n : Math.min(n - 1, at.i + 1);
  at.t = f - Math.floor(f);
}
const mixed = (a: number[], b: number[], k: number, t: number) => a[k]! + (b[k]! - a[k]!) * t;

const contact = (
  rows: number[][],
  rows2: number[][] | undefined,
  k: number,
  ai: number,
  aj: number,
  aT: number,
  bi: number,
  bj: number,
  bT: number,
  mix: number,
) => {
  const h = mixed(rows[ai]!, rows[aj]!, k, aT);
  return rows2 ? h + (mixed(rows2[bi]!, rows2[bj]!, k, bT) - h) * mix : h;
};

/**
 * Bind the clips to a rig whose bones are at rest; `unit` is the rig's rest hip height in root
 * space (m). The character's root is at the body's point (the feet's place under the hips),
 * its −z into the wall.
 */
export function bindRappelClip(root: THREE.Object3D, bones: Map<string, THREE.Bone>, unit: number) {
  if (!data) return null;
  const d = data;
  const hips = bones.get("Hips");
  if (!hips) return null;
  const drive = poseClipDrive(d, root, bones);
  return {
    /** The ankle joint off the wall when the sole is flat on it (m, on this rig). */
    ankle: d.ankle * unit,
    /**
     * Pose the rig `ms` into clip `a`, blended `mix` (0..1) of the way to `ms2` into clip `b`.
     * The boots' and hands' contacts go to `out`.
     */
    apply(
      a: RappelClipName,
      ms: number,
      b: RappelClipName | null,
      ms2: number,
      mix: number,
      out: RappelContacts,
    ) {
      const ca = d.clips[a],
        cb = b && mix > 0.001 ? d.clips[b] : null;
      frame(ca, d.fps, ms);
      const ai = at.i,
        aj = at.j,
        aT = at.t;
      if (cb) frame(cb, d.fps, ms2);
      const bi = at.i,
        bj = at.j,
        bT = at.t;
      root.getWorldQuaternion(rootQ);
      for (const { bone, index, base } of drive) {
        const k = index * 4;
        let r = ca.rot[ai]!,
          s = ca.rot[aj]!;
        qa.set(r[k]!, r[k + 1]!, r[k + 2]!, r[k + 3]!);
        qb.set(s[k]!, s[k + 1]!, s[k + 2]!, s[k + 3]!);
        q.slerpQuaternions(qa, qb, aT);
        if (cb) {
          r = cb.rot[bi]!;
          s = cb.rot[bj]!;
          qa.set(r[k]!, r[k + 1]!, r[k + 2]!, r[k + 3]!);
          qb.set(s[k]!, s[k + 1]!, s[k + 2]!, s[k + 3]!);
          q.slerp(q2.slerpQuaternions(qa, qb, bT), mix);
        }
        q.multiply(base).premultiply(rootQ);
        bone.parent!.getWorldQuaternion(parentQ);
        bone.quaternion.copy(parentQ.invert().multiply(q));
        bone.updateWorldMatrix(false, true);
      }
      // The hips' place from the body's point, in this rig's hip heights.
      for (let k = 0; k < 3; k++) {
        let h = mixed(ca.hips[ai]!, ca.hips[aj]!, k, aT);
        if (cb) h += (mixed(cb.hips[bi]!, cb.hips[bj]!, k, bT) - h) * mix;
        v.setComponent(k, h * unit);
      }
      root.localToWorld(v);
      hips.parent!.worldToLocal(w.copy(v));
      hips.position.copy(w);
      hips.updateWorldMatrix(false, true);
      const pa = ca.plant,
        pb = cb?.plant,
        ga = ca.grip,
        gb = cb?.grip;
      out.plantL = contact(pa, pb, 0, ai, aj, aT, bi, bj, bT, mix);
      out.plantR = contact(pa, pb, 1, ai, aj, aT, bi, bj, bT, mix);
      out.gripL = contact(ga, gb, 0, ai, aj, aT, bi, bj, bT, mix);
      out.gripR = contact(ga, gb, 1, ai, aj, aT, bi, bj, bT, mix);
    },
  };
}
