import * as THREE from "three";
import { poseClipDrive } from "./death-clip";

/**
 * Swimming (owner, 2026-11-22): a head-up front crawl and a tread, posed on the character's own
 * skeleton every frame.
 *
 *  - Third person: the head is out of the water, the shoulders and the top of the chest break
 *    the surface, the hips and legs are under it. The arms alternate (one reaches forward into
 *    the water while the other pulls back under the body, then comes forward over the surface
 *    with a high elbow), the body rolls with them and the legs flutter-kick. Still, the swimmer
 *    comes upright and treads: the hands scull, the legs scissor.
 *  - First person (`view`): the same skeleton and the same stroke, set for the player's own
 *    eyes: the root's eye point is the camera, the body sits a little forward of it so the
 *    hands enter the water in the lower part of the view instead of under its edge, and the
 *    recovery passes beside the view, not through it. The caller hides the head.
 *
 * The root is on the water's surface over the swimmer's server position, facing −z; everything
 * here is in root space (m). The hands are placed by two-bone IK from the rig's own shoulders
 * with its own arm lengths, so both characters reach the same points with their own
 * proportions. Presentation only: position, speed and the hit volumes are the server's.
 */
export type SwimPose = {
  /** Stroke cycles so far (1 = each arm once). */
  cycle: number;
  /** 0 treading upright, 1 the full crawl. */
  crawl: number;
  /** Leaning into a turn, −1 (left) to 1 (right). */
  turn: number;
  /** First person: posed for the camera at the eye point. */
  view: boolean;
  /** First person: the camera's pitch (rad, negative looking down). */
  pitch?: number;
};

/** The eyes above the water's surface (m): the first-person camera's height while swimming. */
export const SWIM_EYE = 0.3;

/** Mixamo's T-pose: each driven bone's direction to its child (root space, facing −z). */
const BONES = [
  "Hips",
  "Spine",
  "Spine1",
  "Spine2",
  "Neck",
  "Head",
  "LeftShoulder",
  "LeftArm",
  "LeftForeArm",
  "LeftHand",
  "LeftUpLeg",
  "LeftLeg",
  "LeftFoot",
  "RightShoulder",
  "RightArm",
  "RightForeArm",
  "RightHand",
  "RightUpLeg",
  "RightLeg",
  "RightFoot",
];
const REST_DIR = [
  [0, 0.9999, -0.0129],
  [0, 0.9891, 0.147],
  [0, 0.9891, 0.147],
  [0, 0.9926, 0.1215],
  [0, 0.985, -0.1726],
  [0, 0.9467, -0.3222],
  [-0.9774, -0.0484, 0.206],
  [-1, 0, 0],
  [-1, 0, 0],
  [-1, 0, 0],
  [0, -1, -0.0078],
  [0, -0.9977, 0.0684],
  [0, -0.6317, -0.7752],
  [0.9774, -0.0484, 0.2059],
  [1, 0, 0],
  [1, 0, 0],
  [1, 0, 0],
  [0, -1, -0.0078],
  [0, -0.9977, 0.0684],
  [0, -0.6317, -0.7752],
];

type Key = readonly [p: number, x: number, y: number, z: number];
/**
 * The crawl hand's path over one cycle: [phase, out from the shoulder's line (m), height over
 * the water (m), forward of the shoulder in arm lengths (negative ahead)]. Entry and reach just
 * under the surface, the catch and the pull down and back under the body, out at the hip, then
 * forward over the water.
 */
const CRAWL_HAND: readonly Key[] = [
  [0.0, 0.01, 0.0, -0.84],
  [0.1, 0.0, -0.06, -0.97],
  [0.2, 0.02, -0.14, -0.92],
  [0.33, -0.07, -0.4, -0.34],
  [0.46, -0.03, -0.4, 0.28],
  [0.57, 0.1, -0.2, 0.72],
  [0.66, 0.17, 0.03, 0.6],
  [0.8, 0.26, 0.12, -0.02],
  [0.92, 0.12, 0.1, -0.58],
];
/**
 * The same, first person. Heights here are what the eye sees: the hand comes forward level with
 * the chin and spears into the water far enough ahead to sit in the lower third of the view; the
 * glove and the wrist go under (the water closes over them, the forearm standing out of it) and
 * glide there before the pull takes the arm down and back out of sight (owner, 2026-11-22:
 * "make sure water goes over the arms/gloves").
 */
const VIEW_HAND: readonly Key[] = [
  [0.0, -0.03, 0.06, -0.9],
  [0.12, -0.05, -0.03, -1.0],
  [0.26, -0.04, -0.07, -0.97],
  [0.38, -0.08, -0.3, -0.5],
  [0.5, -0.02, -0.42, 0.2],
  [0.6, 0.12, -0.2, 0.7],
  [0.68, 0.22, 0.05, 0.55],
  [0.8, 0.27, 0.2, -0.12],
  [0.92, 0.07, 0.19, -0.68],
];
/** The elbow's way out from the arm's line over the cycle (x is outward). */
const CRAWL_POLE: readonly Key[] = [
  [0.0, 0.7, 0.7, 0.1],
  [0.15, 0.9, 0.35, 0],
  [0.33, 1, 0.45, -0.2],
  [0.5, 0.9, 0.2, 0.3],
  [0.62, 0.7, 0.7, 0.4],
  [0.8, 0.55, 1, 0.25],
  [0.92, 0.6, 0.9, 0.1],
];
/** The palm's facing over the cycle (x is outward): down on the reach, back through the pull. */
const CRAWL_PALM: readonly Key[] = [
  [0.0, 0.15, -1, 0.1],
  [0.12, 0, -1, 0.15],
  [0.25, 0, -0.75, 0.65],
  [0.4, -0.05, -0.25, 1],
  [0.55, 0, 0.15, 1],
  [0.66, -0.5, 0.1, 0.8],
  [0.8, -0.3, -0.6, 0.7],
  [0.92, 0.1, -1, 0.3],
];

const TAU = Math.PI * 2;
const X = new THREE.Vector3(1, 0, 0),
  Y = new THREE.Vector3(0, 1, 0),
  Z = new THREE.Vector3(0, 0, 1);
const smooth = (t: number) => t * t * (3 - 2 * t);

/** A closed Catmull–Rom through the keys at phase p (0..1), into `out`. */
function along(keys: readonly Key[], p: number, out: THREE.Vector3) {
  const n = keys.length;
  let i = n - 1;
  for (let k = 0; k < n; k++)
    if (keys[k]![0] <= p) i = k;
    else break;
  const k1 = keys[i]!,
    k2 = keys[(i + 1) % n]!,
    k0 = keys[(i + n - 1) % n]!,
    k3 = keys[(i + 2) % n]!;
  const span = (((k2[0] - k1[0]) % 1) + 1) % 1 || 1;
  const t = Math.min(1, Math.max(0, ((((p - k1[0]) % 1) + 1) % 1) / span));
  const t2 = t * t,
    t3 = t2 * t;
  const f = (a: number, b: number, c: number, d: number) =>
    0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (3 * b - 3 * c + d - a) * t3);
  return out.set(
    f(k0[1], k1[1], k2[1], k3[1]),
    f(k0[2], k1[2], k2[2], k3[2]),
    f(k0[3], k1[3], k2[3], k3[3]),
  );
}

const qa = new THREE.Quaternion(),
  qb = new THREE.Quaternion(),
  qc = new THREE.Quaternion(),
  qPitch = new THREE.Quaternion(),
  qHips = new THREE.Quaternion(),
  qChest = new THREE.Quaternion(),
  qHead = new THREE.Quaternion(),
  rootQ = new THREE.Quaternion(),
  parentQ = new THREE.Quaternion(),
  m4 = new THREE.Matrix4(),
  va = new THREE.Vector3(),
  vb = new THREE.Vector3(),
  vc = new THREE.Vector3(),
  hand = new THREE.Vector3(),
  tread = new THREE.Vector3(),
  pole = new THREE.Vector3(),
  palm = new THREE.Vector3(),
  shoulder = new THREE.Vector3(),
  upper = new THREE.Vector3(),
  fore = new THREE.Vector3(),
  bend = new THREE.Vector3(),
  normal = new THREE.Vector3(),
  head = new THREE.Vector3();

/** The rotation taking the frame (d0 along, n0 across) onto (d along, n across). */
function frame(d: THREE.Vector3, n: THREE.Vector3, restInverse: THREE.Quaternion) {
  va.copy(n).addScaledVector(d, -n.dot(d));
  if (va.lengthSq() < 1e-8) va.set(0, 1, 0).addScaledVector(d, -d.y);
  va.normalize();
  vb.crossVectors(d, va);
  return qa.setFromRotationMatrix(m4.makeBasis(d, va, vb)).multiply(restInverse);
}
const restFrame = (d: THREE.Vector3, n: THREE.Vector3) =>
  new THREE.Quaternion()
    .setFromRotationMatrix(new THREE.Matrix4().makeBasis(d, n, d.clone().cross(n)))
    .invert();
const DOWN = new THREE.Vector3(0, -1, 0);
const ARM_REST = {
  Left: restFrame(new THREE.Vector3(-1, 0, 0), DOWN),
  Right: restFrame(new THREE.Vector3(1, 0, 0), DOWN),
};

/**
 * Bind the stroke to a rig whose bones are at rest (the character resets them at the start of
 * every update); `apply(pose)` poses the whole body. Null without the Mixamo-named bones.
 */
/**
 * How the head rides the water (m, about the eye point): twice a stroke cycle in the crawl, once
 * treading. The first-person camera rides it too, so the eyes stay in the head that is drawn.
 */
export const swimBob = (cycle: number, crawl: number) => {
  const w = smooth(Math.max(0, Math.min(1, crawl)));
  return (
    w * 0.022 * Math.sin(Math.PI * 4 * (cycle + 0.1)) +
    (1 - w) * 0.03 * Math.sin(Math.PI * 2 * (cycle + 0.25))
  );
};

export function bindSwimStroke(root: THREE.Object3D, bones: Map<string, THREE.Bone>) {
  const hips = bones.get("Hips"),
    headBone = bones.get("Head"),
    top = bones.get("HeadTop_End");
  if (!hips || !headBone) return null;
  // The sourced (Valve-named) rig's middle finger, under the name the hand's direction is
  // looked up by: without it the hand keeps its own rest direction and hangs off the wrist.
  const named = new Map(bones);
  for (const side of ["Left", "Right"]) {
    const finger = bones.get(`arm ${side.toLowerCase()} finger 3a`);
    if (finger && !named.has(side + "HandMiddle1")) named.set(side + "HandMiddle1", finger);
  }
  const drive = new Map(
    poseClipDrive({ bones: BONES, restDir: REST_DIR }, root, named).map((d) => [
      BONES[d.index]!,
      d,
    ]),
  );
  for (const name of BONES) if (!drive.has(name)) return null;
  root.updateWorldMatrix(true, true);
  const at = (name: string) =>
    root.worldToLocal(bones.get(name)!.getWorldPosition(new THREE.Vector3()));
  const arm = (side: "Left" | "Right") => {
    const s = at(side + "Arm"),
      e = at(side + "ForeArm"),
      h = at(side + "Hand");
    return { upper: s.distanceTo(e), fore: e.distanceTo(h) };
  };
  const arms = { Left: arm("Left"), Right: arm("Right") };
  // Each hand's height over the water at the last pose (NaN: none yet), and where hands have
  // gone through the surface since they were last read: [x, z (root space), strength] each.
  const handY = { Left: NaN, Right: NaN };
  const splashes: number[] = [];
  /** Root-space rotation `d` (from the T-pose) onto a bone. */
  const set = (name: string, d: THREE.Quaternion) => {
    const { bone, base } = drive.get(name)!;
    qb.copy(d).multiply(base).premultiply(rootQ);
    bone.parent!.getWorldQuaternion(parentQ);
    bone.quaternion.copy(parentQ.invert().multiply(qb));
    bone.updateWorldMatrix(false, true);
  };
  const local = (bone: THREE.Object3D, out: THREE.Vector3) =>
    root.worldToLocal(bone.getWorldPosition(out));

  return {
    apply({ cycle, crawl, turn, view, pitch = 0 }: SwimPose) {
      const w = smooth(Math.max(0, Math.min(1, crawl)));
      const c = cycle - Math.floor(cycle);
      root.getWorldQuaternion(rootQ);
      // The body's lean from upright: a little forward treading, well forward in the crawl
      // (head up, the chest on the surface, the hips under it).
      const lean = view ? 0.16 + 0.1 * w : 0.2 + 0.86 * w;
      // The roll with the stroke (the reaching arm's shoulder down and forward), plus the turn.
      const roll =
        (view ? 0.2 : 0.36) * w * Math.sin(TAU * (c + 0.07)) +
        (1 - w) * 0.07 * Math.sin(TAU * c) +
        turn * (view ? 0.1 : 0.2);
      qPitch.setFromAxisAngle(X, -(lean + (view ? 0 : 0.12 * w)));
      qHips.copy(qPitch).multiply(qc.setFromAxisAngle(Y, roll * 0.45));
      qPitch.setFromAxisAngle(X, -(lean - (view ? 0 : 0.1 * w)));
      qChest.copy(qPitch).multiply(qc.setFromAxisAngle(Y, roll));
      // The head stays level and looks where the swimmer is going, a little into the turn.
      qHead
        .setFromAxisAngle(Y, -turn * 0.25 + roll * 0.12)
        .multiply(qc.setFromAxisAngle(X, -0.05 - 0.1 * w));
      set("Hips", qHips);
      set("Spine", qc.slerpQuaternions(qHips, qChest, 0.35));
      set("Spine1", qc.slerpQuaternions(qHips, qChest, 0.7));
      set("Spine2", qChest);
      set("Neck", qc.slerpQuaternions(qChest, qHead, 0.55));
      set("Head", qHead);
      // The hips go where they put the eyes at the eye point.
      local(headBone, head);
      if (top) head.lerp(local(top, va), 0.45);
      const bob = swimBob(c, crawl);
      // (First person: only the arms are drawn, and their shoulders sit higher and further
      // forward than a neck would let them, as first-person arms do, so the reach and the
      // entry are in the lower part of the view and not under its edge.)
      // Looking down, they move back under the camera with the look, so the view never reaches
      // the arms' open ends at the shoulders.
      const back = view ? Math.min(0.3, 0.55 * Math.max(0, -pitch)) : 0;
      va.set(0, SWIM_EYE - 0.03 + bob + (view ? 0.02 - back * 0.3 : 0), view ? back - 0.17 : 0).sub(
        head,
      );
      root.localToWorld(local(hips, vb).add(va));
      hips.parent!.worldToLocal(vb);
      hips.position.copy(vb);
      hips.updateWorldMatrix(false, true);

      for (const side of ["Left", "Right"] as const) {
        const s = side === "Right" ? 1 : -1;
        const lengths = arms[side];
        const reach = lengths.upper + lengths.fore;
        // The shoulder girdle goes with the chest, shrugged up and forward with the reach.
        let p = (c + (side === "Right" ? 0 : 0.5)) % 1;
        // First person, the reach is held out in front until the other hand is nearly there (a
        // catch-up stroke, as swimmers with the head up do), so an arm is always in view and
        // for part of each stroke both are.
        if (view)
          p =
            p < 0.52
              ? (p / 0.52) * 0.26
              : p < 0.68
                ? 0.26 + ((p - 0.52) / 0.16) * 0.34
                : 0.6 + ((p - 0.68) / 0.32) * 0.4;
        const forward = Math.max(0, Math.cos(TAU * (p - 0.08)));
        qc.copy(qChest)
          .multiply(qa.setFromAxisAngle(Z, s * 0.22 * w * forward))
          .multiply(qa.setFromAxisAngle(Y, s * 0.12 * w * forward));
        set(side + "Shoulder", qc);
        local(bones.get(side + "Arm")!, shoulder);
        // The crawl hand: out from the shoulder's line, over the water, ahead of the shoulder.
        along(view ? VIEW_HAND : CRAWL_HAND, p, hand);
        // (First person: from the body's middle line, so the roll does not carry the reaching
        // hand across the view.)
        hand.set(
          view ? s * (0.19 + hand.x) : shoulder.x + s * hand.x,
          hand.y,
          shoulder.z + hand.z * reach,
        );
        // Treading: the hands scull out to the sides just under the surface, in small loops.
        const loop = TAU * (c * 2 + (side === "Right" ? 0 : 0.5));
        tread.set(
          s * (0.36 + 0.09 * Math.sin(loop)),
          -0.17 + 0.035 * Math.sin(loop * 2),
          -0.2 + 0.07 * Math.cos(loop),
        );
        // (First person: in front, low in the view.)
        if (view)
          tread.set(
            s * (0.25 + 0.1 * Math.sin(loop)),
            // (Sculling in the surface: the water laps over the gloves.)
            -0.035 + 0.04 * Math.sin(loop * 2),
            -0.5 + 0.05 * Math.cos(loop),
          );
        hand.lerp(tread, 1 - w);
        // Through the surface (the root stands in it): going in, a splash; coming out, a
        // smaller one. For whoever draws them (br/swim-splash.ts); a full list drops new ones.
        const was = handY[side];
        handY[side] = hand.y;
        if (was === was && was > 0 !== hand.y > 0 && splashes.length < 24)
          splashes.push(
            hand.x,
            hand.z - 0.1,
            (hand.y > 0 ? 0.3 : 0.4) + (hand.y > 0 ? 0.3 : 0.6) * w,
          );
        along(CRAWL_POLE, p, pole);
        pole.x *= s;
        pole.lerp(vc.set(s * 0.8, -0.35, 0.5), 1 - w);
        along(CRAWL_PALM, p, palm);
        palm.x *= s;
        palm.lerp(vc.set(s * 0.3 * Math.cos(loop), -1, 0.1), 1 - w).normalize();
        // Two-bone IK: the elbow in the pole's plane.
        va.copy(hand).sub(shoulder);
        const far = reach * 0.995,
          near = Math.abs(lengths.upper - lengths.fore) + 0.02;
        const d = Math.max(near, Math.min(far, va.length()));
        va.normalize();
        bend.copy(pole).addScaledVector(va, -pole.dot(va));
        if (bend.lengthSq() < 1e-6) bend.set(s, 0, 0).addScaledVector(va, -s * va.x);
        bend.normalize();
        const a = (lengths.upper ** 2 - lengths.fore ** 2 + d * d) / (2 * d);
        const h = Math.sqrt(Math.max(0, lengths.upper ** 2 - a * a));
        upper.copy(va).multiplyScalar(a).addScaledVector(bend, h);
        fore.copy(va).multiplyScalar(d).sub(upper).normalize();
        upper.normalize();
        // Each bone's twist: the elbow's hinge on the upper arm, the palm on the forearm.
        if (side === "Right") normal.crossVectors(upper, bend);
        else normal.crossVectors(bend, upper);
        set(side + "Arm", frame(upper, normal, ARM_REST[side]));
        vc.copy(palm).addScaledVector(fore, -palm.dot(fore)).normalize();
        normal.addScaledVector(fore, -normal.dot(fore)).normalize();
        if (normal.dot(vc) < -0.3) normal.negate();
        normal.lerp(vc, 0.6).normalize();
        set(side + "ForeArm", frame(fore, normal, ARM_REST[side]));
        // The hand: along the forearm, the wrist giving a little to the water on the pull.
        const pull = Math.max(0, Math.sin(TAU * (p - 0.2))) * w;
        fore.addScaledVector(palm, -0.18 * pull).normalize();
        set(side + "Hand", frame(fore, palm, ARM_REST[side]));

        // The legs: a flutter kick trailing behind the hips (three beats to an arm's stroke),
        // a slow scissor under the body when treading.
        const beat = TAU * (c * 3 + (side === "Right" ? 0 : 0.5));
        const scissor = TAU * (c + (side === "Right" ? 0 : 0.5));
        const trail = lean + 0.34 * w;
        const thigh =
          trail + w * 0.2 * Math.sin(beat) + (1 - w) * (0.32 * Math.sin(scissor) + 0.12);
        const knee =
          w * (0.14 + 0.22 * Math.max(0, Math.sin(beat - 1.1))) +
          (1 - w) * (0.55 + 0.35 * Math.sin(scissor - 1.3));
        qb.copy(qc.setFromAxisAngle(Y, roll * 0.45)).multiply(
          qc.setFromAxisAngle(Z, s * (0.05 + 0.1 * (1 - w))),
        );
        qc.setFromAxisAngle(X, -thigh).multiply(qb);
        set(side + "UpLeg", qc);
        const shin = qc.premultiply(qa.setFromAxisAngle(X, -knee));
        set(side + "Leg", shin);
        // Toes pointed back.
        set(side + "Foot", shin.multiply(qa.setFromAxisAngle(X, -0.75 - 0.15 * w)));
      }
      root.updateWorldMatrix(true, true);
    },
    splashes,
    /** Out of the water: the next swim starts with no hand remembered above or below it. */
    reset() {
      handY.Left = handY.Right = NaN;
      splashes.length = 0;
    },
  };
}
