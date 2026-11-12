import { describe, expect, it } from "vitest";
import { ROPE_CLIMB, ropeClimbPose, ropeClimbPoseBuffer, type RopeRig } from "@/lib/fps/rope-climb";

/**
 * The rope climb's pose (owner, 2026-11-12: "improve the climbing animation while climbing the
 * rope … proper motions to look realistic"): long pulls hand over hand and long steps up the
 * rock, placed from the distance climbed, so a hand that grips stays on its spot of the rope and
 * a foot that stands stays on its spot of the rock at any speed.
 */
/** The two rigs' measures (scripts/fps/rope-check prints them). */
const RIGS: Record<string, RopeRig> = {
  police: {
    arm: 0.563,
    leg: 0.774,
    ankle: 0.117,
    shoulder: [0.187, 0.461, 0.055],
    hipJoint: [0.098, -0.031, 0],
  },
  terrorist: {
    arm: 0.552,
    leg: 0.798,
    ankle: 0.101,
    shoulder: [0.19, 0.385, -0.012],
    hipJoint: [0.096, -0.078, -0.073],
  },
};
const WALL = 0.5;
const D = ROPE_CLIMB.cycle;

describe.each(Object.entries(RIGS))("rope climb (%s)", (_, rig) => {
  const at = (s: number, settle = 0) =>
    structuredClone(ropeClimbPose(s / D, WALL, rig, settle, ropeClimbPoseBuffer()));
  const limbs = ["left", "right"] as const;

  it("keeps a gripping hand on its spot of the rope and a standing foot on its spot of the rock", () => {
    const step = 0.01;
    let gripped = 0,
      stood = 0;
    for (let s = 20; s < 20 + 3 * D; s += step) {
      const a = at(s),
        b = at(s + step);
      for (const side of limbs) {
        if (a[side].hand.hold === 1 && b[side].hand.hold === 1) {
          gripped++;
          // On the rope's line, and where it was on the rope (the body has climbed `step`).
          expect(a[side].hand.x).toBe(0);
          expect(a[side].hand.z).toBe(0);
          expect(s + step + b[side].hand.y).toBeCloseTo(s + a[side].hand.y, 9);
        }
        if (a[side].foot.hold === 1 && b[side].foot.hold === 1) {
          stood++;
          // On the rock (the ankle its own height off it), where it was.
          expect(a[side].foot.z).toBeCloseTo(-WALL + rig.ankle, 9);
          expect(s + step + b[side].foot.y).toBeCloseTo(s + a[side].foot.y, 9);
        }
      }
    }
    // A hand holds for more than half of each cycle, a foot stands for a third or more.
    const samples = (3 * D) / step;
    expect(gripped / samples / 2).toBeGreaterThan(0.5);
    expect(stood / samples / 2).toBeGreaterThan(0.3);
  });

  it("always has a hand on the rope, changes hands with both on it, and steps foot by foot", () => {
    for (let s = 0; s < 2 * D; s += 0.005) {
      const p = at(s);
      expect(Math.max(p.left.hand.hold, p.right.hand.hold)).toBe(1);
      // Never both feet off the rock with only one hand closed... a foot or two hands hold.
      expect(p.left.foot.hold === 1 && p.right.foot.hold === 1).toBe(false);
    }
    // The right hand takes the rope high as the left foot steps onto the rock, and the other
    // pair half a cycle later (opposite hand and foot, as in a walk).
    const p0 = at(10 * D + 0.001),
      p1 = at(10.5 * D + 0.001);
    expect(p0.right.hand.y).toBeGreaterThan(p0.left.hand.y + 0.5);
    expect(p0.left.foot.y).toBeGreaterThan(p0.right.foot.y + 0.1);
    expect(p0.left.foot.hold).toBe(1);
    expect(p1.left.hand.y).toBeGreaterThan(p1.right.hand.y + 0.5);
    expect(p1.right.foot.hold).toBe(1);
    // Both hands on the rope at the change.
    expect(p0.left.hand.hold).toBe(1);
    expect(p0.right.hand.hold).toBe(1);
  });

  it("closes a hand on the rope every half cycle: where the grab is heard", () => {
    // br-arena.ts plays the rope's grab (br-audio.ts ropeGrab) each time the distance climbed
    // passes a multiple of half a cycle: there a reaching hand arrives and closes, high.
    for (const [k, side] of [
      [8, "right"],
      [8.5, "left"],
      [9, "right"],
    ] as const) {
      const before = at(k * D - 0.06)[side].hand,
        on = at(k * D + 1e-6)[side].hand,
        other = at(k * D + 1e-6)[side === "left" ? "right" : "left"].hand;
      expect(before.hold).toBeLessThan(1);
      expect(before.hold).toBeGreaterThan(0.2); // closing
      expect(on.hold).toBe(1);
      expect(on.y).toBeGreaterThan(other.y + 0.6);
      // And the opposite foot steps onto the rock with it (the boot's step is heard too).
      expect(at(k * D + 1e-6)[side === "left" ? "right" : "left"].foot.hold).toBe(1);
      expect(at(k * D - 0.06)[side === "left" ? "right" : "left"].foot.hold).toBeLessThan(1);
    }
  });

  it("pulls long: three quarters of a metre a hand, within the arm's and the leg's reach", () => {
    let top = -Infinity,
      bottom = Infinity;
    for (let s = 0; s < D; s += 0.005) {
      const p = at(s);
      for (const side of limbs) {
        const sign = side === "left" ? -1 : 1;
        if (p[side].hand.hold === 1) {
          top = Math.max(top, p[side].hand.y);
          bottom = Math.min(bottom, p[side].hand.y);
        }
        // The shoulder and the hip joint (leaning back with the spine) to the wrist and ankle.
        const sy = rig.shoulder[1] * Math.cos(p.lean) - rig.shoulder[2] * Math.sin(p.lean),
          sz = rig.shoulder[1] * Math.sin(p.lean) + rig.shoulder[2] * Math.cos(p.lean);
        const arm = Math.hypot(
          p[side].hand.x + sign * ROPE_CLIMB.wristX - sign * rig.shoulder[0],
          p[side].hand.y - (ROPE_CLIMB.hipsY + sy),
          p[side].hand.z + ROPE_CLIMB.wristZ - (p.hips[2] + sz),
        );
        if (p[side].hand.hold === 1) expect(arm).toBeLessThan(rig.arm * 0.97);
        const leg = Math.hypot(
          p[side].foot.x - sign * rig.hipJoint[0],
          p[side].foot.y - (ROPE_CLIMB.hipsY + rig.hipJoint[1]),
          p[side].foot.z - (p.hips[2] + rig.hipJoint[2]),
        );
        expect(leg).toBeLessThan(rig.leg * 0.95);
        // Bent knees: the foot never further than the leg can fold to.
        expect(leg).toBeGreaterThan(rig.leg * 0.55);
      }
    }
    expect(top - bottom).toBeGreaterThan(0.7);
    expect(top - bottom).toBeLessThanOrEqual(D * (0.5 + ROPE_CLIMB.overlap) + 1e-9);
  });

  it("moves without a jump from step to step, up and down, and round the cycle", () => {
    const step = 0.01; // a third of a frame at 2 m/s
    for (let s = 5; s < 5 + 2 * D; s += step) {
      const a = at(s),
        b = at(s + step);
      for (const side of limbs)
        for (const limb of ["hand", "foot"] as const) {
          // In the rope's own frame (the body's move taken out for what is held).
          const d = Math.hypot(
            a[side][limb].x - b[side][limb].x,
            a[side][limb].y - b[side][limb].y,
            a[side][limb].z - b[side][limb].z,
          );
          expect(d, `${side} ${limb} at ${s.toFixed(2)}`).toBeLessThan(0.05);
        }
      expect(Math.abs(a.chestYaw - b.chestYaw)).toBeLessThan(0.02);
    }
    // The same pose a whole cycle on, and the same either way (the phase is the place).
    const flat = (p: ReturnType<typeof at>) =>
      [p.hips, p.pelvisYaw, p.chestYaw, p.chestRoll, limbs.map((k) => [p[k].hand, p[k].foot])]
        .flat(3)
        .flatMap((v) => (typeof v === "number" ? [v] : Object.values(v)));
    const here = flat(at(7.3)),
      later = flat(at(7.3 + 4 * D));
    here.forEach((v, i) => expect(later[i]).toBeCloseTo(v, 9));
  });

  it("held still, takes the rope with both hands and the rock with both feet", () => {
    for (let s = 0; s < D; s += 0.05) {
      const p = at(s, 1);
      for (const side of limbs) {
        expect(p[side].hand.hold).toBeCloseTo(1, 9);
        expect(p[side].hand.x).toBeCloseTo(0, 9);
        expect(p[side].hand.z).toBeCloseTo(0, 9);
        expect(p[side].foot.hold).toBeCloseTo(1, 9);
        expect(p[side].foot.z).toBeCloseTo(-WALL + rig.ankle, 9);
      }
      // What already held has not moved.
      const moving = at(s, 0);
      for (const side of limbs) {
        if (moving[side].hand.hold === 1) expect(p[side].hand.y).toBe(moving[side].hand.y);
        if (moving[side].foot.hold === 1) expect(p[side].foot.y).toBe(moving[side].foot.y);
      }
    }
  });
});
