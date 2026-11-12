/**
 * Climbing a fixed rope up a rock face (owner, 2026-11-12: "improve the climbing animation while
 * climbing the rope, the character does not do it in proper motions to look realistic"). The
 * first version played Mixamo's "Climbing A Rope" (a slow climb of a free-hanging rope: half a
 * metre in 2.6 s) with its phase tied to the distance climbed, which at the rope's speed ran the
 * clip at seven to ten times its pace: four tiny reaches a second, the feet pedalling.
 *
 * This is the climb itself, worked out for the pace it is climbed at: hand over hand up the rope
 * in long pulls (reach high, pull down past the chest to the hip, let go, reach again), the feet
 * walking up the rock in front in long steps, the body leaning back on the rope behind it, the
 * shoulders turning into each reach and the hips into each step. One cycle (a pull of each hand,
 * a step of each foot) is `cycle` metres of rope, so at 2 m/s it is 1.3 cycles a second: the
 * cadence of a run. A hand that grips stays on its spot of the rope and a foot that stands stays
 * on its spot of the rock while the body moves past: they are placed from the distance climbed,
 * not from time, so nothing slides at any speed, up or down, and every client shows the same
 * pose from the climber's position alone. Held still, the free hand takes the rope and the free
 * foot the rock (`settle`).
 *
 * Pure numbers (authored-character.ts turns them into the rig's pose with its limb solver).
 * Frame: the character's root on the rope's line (the server's point of the climber), +y up the
 * rope, −z into the rock, +x the climber's right; metres.
 */
export const ROPE_CLIMB = {
  /** Rope climbed per cycle (m). */
  cycle: 1.5,
  /** The part of a cycle both hands hold the rope at each change of hands. */
  overlap: 0.07,
  /** The hips (pelvis) up the rope from the root (m), and how far the upper body leans back
   * from the rope's line (rad, shared out over the spine). */
  hipsY: 0.9,
  lean: 0.2,
  /** The feet apart on the rock (m, each side of the rope's line). */
  footX: 0.17,
  /** The wrist beside and behind the rope it holds (m): the fist closes round the rope in
   * front of it (the reach is worked out to the wrist). */
  wristX: 0.045,
  wristZ: 0.07,
} as const;

/** The rig's measures at rest (root space, m): see authored-character.ts. */
export type RopeRig = {
  /** Upper arm plus forearm; thigh plus shin. */
  arm: number;
  leg: number;
  /** The ankle above the sole. */
  ankle: number;
  /** The right shoulder joint and the right hip joint from the pelvis (x right, y up, z back). */
  shoulder: readonly [number, number, number];
  hipJoint: readonly [number, number, number];
};

export type RopeLimb = {
  /** A hand: the middle of its grip (on the rope's line while it holds). A foot: its ankle. */
  x: number;
  y: number;
  z: number;
  /** A hand: 1 closed round the rope … 0 open, reaching. A foot: 1 standing on the rock … 0 at
   * the top of its step. */
  hold: number;
};
export type RopeClimbPose = {
  /** The pelvis (root space) and its turn about the rope (rad, + turns the right hip to the
   * rock) and its tilt (rad, + raises the right hip). */
  hips: [number, number, number];
  pelvisYaw: number;
  pelvisRoll: number;
  /** The chest over the pelvis: the same two, and the lean back from the rope. */
  chestYaw: number;
  chestRoll: number;
  lean: number;
  left: { hand: RopeLimb; foot: RopeLimb };
  right: { hand: RopeLimb; foot: RopeLimb };
};

export function ropeClimbPoseBuffer(): RopeClimbPose {
  const limb = (): RopeLimb => ({ x: 0, y: 0, z: 0, hold: 1 });
  return {
    hips: [0, 0, 0],
    pelvisYaw: 0,
    pelvisRoll: 0,
    chestYaw: 0,
    chestRoll: 0,
    lean: 0,
    left: { hand: limb(), foot: limb() },
    right: { hand: limb(), foot: limb() },
  };
}

const smooth = (k: number) => {
  const t = Math.max(0, Math.min(1, k));
  return t * t * (3 - 2 * t);
};
const frac = (v: number) => v - Math.floor(v);

/**
 * The pose `cycles` into the climb (the distance climbed over ROPE_CLIMB.cycle; any number,
 * either way), with the rock `wall` m in front of the rope's line. `settle` 0 … 1: held still,
 * the free hand on the rope and the free foot on the rock.
 */
export function ropeClimbPose(
  cycles: number,
  wall: number,
  rig: RopeRig,
  settle: number,
  out: RopeClimbPose,
): RopeClimbPose {
  const D = ROPE_CLIMB.cycle;
  const phase = frac(cycles);
  const turn = Math.cos(phase * Math.PI * 2);
  // The pelvis: behind the rope, as far as lets the feet stand on the rock with bent knees.
  const ankleZ = -wall + rig.ankle;
  const hipsZ = Math.max(0.1, Math.min(0.3, 0.72 * rig.leg + ankleZ - rig.hipJoint[2]));
  // A little surge with each pull (twice a cycle) and a sway onto the standing foot.
  const live = 1 - settle;
  out.hips[0] = -0.025 * turn * live;
  out.hips[1] = ROPE_CLIMB.hipsY + 0.02 * Math.cos(phase * Math.PI * 4 + 0.6) * live;
  out.hips[2] = hipsZ;
  // The right hand takes the rope high at phase 0 as the left foot steps up: the right
  // shoulder is up and turned to the rock, the left hip up and turned to it.
  out.chestYaw = 0.2 * turn * live;
  out.chestRoll = 0.1 * turn * live;
  out.pelvisYaw = -0.1 * turn * live;
  out.pelvisRoll = -0.07 * turn * live;
  out.lean = ROPE_CLIMB.lean;
  const sin = Math.sin(out.lean),
    cos = Math.cos(out.lean);
  // Hands. The shoulder joint, leaning back with the spine; the wrist's reach along the rope
  // from it (the arm never quite straight).
  const sy = rig.shoulder[1] * cos - rig.shoulder[2] * sin,
    sz = rig.shoulder[1] * sin + rig.shoulder[2] * cos;
  // (From the pelvis' mean place: the grips and the steps do not move with its surge.)
  const shoulderY = ROPE_CLIMB.hipsY + sy,
    shoulderZ = hipsZ + sz;
  const span = Math.sqrt(
    Math.max(
      0.01,
      (0.96 * rig.arm) ** 2 -
        (shoulderZ - ROPE_CLIMB.wristZ) ** 2 -
        (rig.shoulder[0] - ROPE_CLIMB.wristX) ** 2,
    ),
  );
  const held = 0.5 + ROPE_CLIMB.overlap,
    travel = Math.min(D * held, span * 1.96);
  const top = shoulderY + span * 0.98,
    bottom = top - travel;
  // Feet. The hip joint; the ankle's reach down the rock from it.
  const jointY = ROPE_CLIMB.hipsY + rig.hipJoint[1],
    jointZ = hipsZ + rig.hipJoint[2];
  const drop = Math.sqrt(
    Math.max(
      0.01,
      (0.94 * rig.leg) ** 2 - (jointZ - ankleZ) ** 2 - (ROPE_CLIMB.footX - rig.hipJoint[0]) ** 2,
    ),
  );
  const high = jointY + 0.05,
    low = jointY - drop,
    stand = Math.min(0.46, (high - low) / D);
  for (const side of ["left", "right"] as const) {
    const sign = side === "left" ? -1 : 1;
    // The right hand grips at phase 0, the left half a cycle later.
    const hp = frac(phase + (side === "left" ? 0.5 : 0));
    const hand = out[side].hand;
    hand.x = 0;
    hand.z = 0;
    if (hp < held) {
      // On the rope: the grip stays where it is, the body climbs past it.
      hand.y = top - (travel * hp) / held;
      hand.hold = 1;
    } else {
      // Let go, out round the other hand and up to the next grip (opening, then closing on
      // the rope again); the reach is quicker than the pull and eases in and out.
      const u = (hp - held) / (1 - held);
      const lift = Math.sin(u * Math.PI);
      hand.y = bottom + travel * smooth(u);
      hand.x += sign * 0.07 * lift;
      hand.z += 0.05 * lift;
      hand.hold = 1 - smooth(u / 0.25) + smooth((u - 0.8) / 0.2);
      if (settle > 0) {
        // Held still: this hand on the rope too, between the grips.
        const rest = (top + bottom) / 2;
        hand.y += (rest - hand.y) * settle;
        hand.x -= hand.x * settle;
        hand.z -= hand.z * settle;
        hand.hold += (1 - hand.hold) * settle;
      }
    }
    // The left foot steps onto the rock at phase 0 (with the right hand), the right at 0.5.
    const fp = frac(phase + (side === "left" ? 0 : 0.5));
    const foot = out[side].foot;
    foot.x = sign * ROPE_CLIMB.footX;
    foot.z = ankleZ;
    if (fp < stand) {
      // Standing: the foot stays on its spot of the rock, the body climbs past it.
      foot.y = high - D * fp;
      foot.hold = 1;
    } else {
      // Off the rock, up and in for the next step (the knee coming up), down onto it.
      const u = (fp - stand) / (1 - stand);
      const lift = Math.sin(u * Math.PI);
      foot.y = high - D * stand + D * stand * smooth(u);
      foot.z += 0.13 * lift;
      foot.hold = 1 - lift;
      if (settle > 0) {
        // Held still: this foot on the rock too, under the hip.
        const rest = (high + low) / 2;
        foot.y += (rest - foot.y) * settle;
        foot.z += (ankleZ - foot.z) * settle;
        foot.hold += (1 - foot.hold) * settle;
      }
    }
  }
  return out;
}
