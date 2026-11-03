import * as THREE from "three";

/**
 * Hand posing shared by the first-person props that are held in the team's own arms (the C4,
 * the grenades): the rig's finger chains posed by forward kinematics in the hand's frame, baked
 * into glove meshes by the caller, and the vertices used as contact points.
 */
export type Side = "L" | "R";
export const bone = (side: Side, n: number) => `Bone_${side}${String(n).padStart(3, "0")}`;
export const FINGERS = { index: 5, middle: 9, ring: 13, little: 17 } as const;
export const THUMB = 20;

/** Finger joint flexion toward the palm (radians) at the knuckle, middle and end joints, and the
 * spread about the palm normal (positive toward the index side). */
export type Finger = readonly [mcp: number, pip: number, dip: number, spread: number];
/** Thumb phalanx directions in the hand frame: [along the hand, toward the palm, toward the index side]. */
export type Thumb = readonly [readonly number[], readonly number[], readonly number[]];
export type HandPose = Record<keyof typeof FINGERS, Finger> & { thumb: Thumb };
export const deg = THREE.MathUtils.degToRad;
export const f = (mcp: number, pip: number, dip: number, spread = 0): Finger => [
  deg(mcp),
  deg(pip),
  deg(dip),
  deg(spread),
];
export function basisQuaternion(along: THREE.Vector3, palm: THREE.Vector3) {
  const x = along.clone().normalize();
  const y = palm.clone().addScaledVector(x, -palm.dot(x)).normalize();
  return new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(x, y, new THREE.Vector3().crossVectors(x, y)),
  );
}

export type HandFrame = {
  wrist: THREE.Vector3;
  hand: THREE.Vector3;
  across: THREE.Vector3;
  palm: THREE.Vector3;
};
/** The hand's frame in instance space from the rifle pose (wrist, axis to the middle knuckle,
 * little → index across the knuckles, palm normal on the side the fingers curl to). */
export function handFrame(inst: THREE.Object3D, side: Side): HandFrame {
  inst.updateWorldMatrix(true, true);
  const at = (name: string) =>
    inst.worldToLocal(inst.getObjectByName(name)!.getWorldPosition(new THREE.Vector3()));
  const wrist = at(`Hand_${side}`);
  const across = at(bone(side, FINGERS.index))
    .sub(at(bone(side, FINGERS.little)))
    .normalize();
  const hand = at(bone(side, FINGERS.middle)).sub(wrist);
  hand.addScaledVector(across, -hand.dot(across)).normalize();
  const palm = new THREE.Vector3().crossVectors(across, hand).normalize();
  const curl = at(`${bone(side, FINGERS.middle + 2)}_end`).sub(at(bone(side, FINGERS.middle)));
  if (palm.dot(curl) < 0) palm.negate();
  return { wrist, hand, across, palm };
}

/** Set `joint` so its child points at `goal` (instance space; rotation only). */
function aim(
  inst: THREE.Object3D,
  joint: THREE.Object3D,
  child: THREE.Object3D,
  goal: THREE.Vector3,
) {
  inst.updateWorldMatrix(true, true);
  const from = joint.getWorldPosition(new THREE.Vector3());
  const now = child.getWorldPosition(new THREE.Vector3()).sub(from).normalize();
  const to = inst.localToWorld(goal.clone()).sub(from).normalize();
  const rotation = joint
    .getWorldQuaternion(new THREE.Quaternion())
    .premultiply(new THREE.Quaternion().setFromUnitVectors(now, to));
  joint.quaternion.copy(
    joint.parent!.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(rotation),
  );
}

/** Pose every finger and the thumb of one hand (forward kinematics in the hand frame). */
export function poseHand(inst: THREE.Object3D, side: Side, pose: HandPose, frame: HandFrame) {
  inst.updateWorldMatrix(true, true);
  const at = (name: string) =>
    inst.worldToLocal(inst.getObjectByName(name)!.getWorldPosition(new THREE.Vector3()));
  const chain = (base: number) => [
    inst.getObjectByName(bone(side, base))!,
    inst.getObjectByName(bone(side, base + 1))!,
    inst.getObjectByName(bone(side, base + 2))!,
    inst.getObjectByName(`${bone(side, base + 2)}_end`)!,
  ];
  const lengths = (base: number) => {
    const p = [
      bone(side, base),
      bone(side, base + 1),
      bone(side, base + 2),
      `${bone(side, base + 2)}_end`,
    ].map(at);
    return [p[0]!.distanceTo(p[1]!), p[1]!.distanceTo(p[2]!), p[2]!.distanceTo(p[3]!)];
  };
  const { hand, across, palm } = frame;
  for (const [name, base] of Object.entries(FINGERS) as [keyof typeof FINGERS, number][]) {
    const [mcp, pip, dip, spread] = pose[name];
    const bones = chain(base);
    const l = lengths(base);
    const along = hand
      .clone()
      .multiplyScalar(Math.cos(spread))
      .addScaledVector(across, Math.sin(spread));
    const dir = (a: number) =>
      along.clone().multiplyScalar(Math.cos(a)).addScaledVector(palm, Math.sin(a));
    const p1 = at(bone(side, base)).addScaledVector(dir(mcp), l[0]!);
    aim(inst, bones[0]!, bones[1]!, p1);
    const p2 = p1.clone().addScaledVector(dir(mcp + pip), l[1]!);
    aim(inst, bones[1]!, bones[2]!, p2);
    const p3 = p2.clone().addScaledVector(dir(mcp + pip + dip), l[2]!);
    aim(inst, bones[2]!, bones[3]!, p3);
  }
  const thumb = chain(THUMB),
    l = lengths(THUMB);
  let p = at(bone(side, THUMB));
  for (let i = 0; i < 3; i++) {
    const [h, pa, a] = pose.thumb[i]!;
    const d = hand
      .clone()
      .multiplyScalar(h!)
      .addScaledVector(palm, pa!)
      .addScaledVector(across, a!)
      .normalize();
    p = p.clone().addScaledVector(d, l[i]!);
    aim(inst, thumb[i]!, thumb[i + 1]!, p);
  }
  inst.updateWorldMatrix(true, true);
}

export function vertex(geometry: THREE.BufferGeometry, index: number) {
  return new THREE.Vector3().fromBufferAttribute(geometry.getAttribute("position"), index);
}
export function extremeVertex(
  gloves: THREE.BufferGeometry,
  near: THREE.Vector3,
  reach: number,
  facing: THREE.Vector3,
) {
  const positions = gloves.getAttribute("position"),
    p = new THREE.Vector3();
  let best = -1,
    score = -Infinity;
  for (let i = 0; i < positions.count; i++) {
    p.fromBufferAttribute(positions, i);
    if (p.distanceTo(near) > reach) continue;
    const s = p.sub(near).dot(facing);
    if (s > score) {
      score = s;
      best = i;
    }
  }
  if (best < 0) throw new Error("Hand contact point not found");
  return best;
}
