import { AWP_TIMELINE } from "./awp-timeline";
import {
  EASE,
  type Key,
  type ReloadClip,
  type SupportAnchor,
  type SupportKey,
} from "./reload-animation";

/**
 * AWP first-person animation data (pure, testable without WebGL). Times come from
 * AWP_TIMELINE (milliseconds) and are converted to clip progress over the server's windows:
 * reloads over AWP.reloadMs (3.67 s), the bolt cycle over AWP.cycleMs (1.463 s).
 *
 * The support (left) hand works the magazine exactly like the rifles (reload-animation.ts:
 * anchors on the handguard and the baked magazine grip). The bolt is worked by the RIGHT hand:
 * it leaves the pistol grip, closes on the bolt knob, lifts it, draws it back (the case ejects),
 * pushes it home, turns it down and returns to the grip. That motion is `boltPose` below; the
 * viewmodel turns it into the bolt's and the trigger arm's transforms.
 */

type Vec = readonly [number, number, number];
const R: Vec = [0, 0, 0];
const at = (anchor: SupportAnchor, offset: Vec = R, rotation: Vec = R): SupportKey => ({
  anchor,
  offset,
  rotation,
});

/** Bolt geometry (rig units, see art/blender/awp/README.md). */
export const AWP_BOLT = {
  /** BoltHandle lift about its local +Z (the bore): +65°. */
  lift: 1.134,
  /** Bolt travel along +Z (rearward) when fully drawn. */
  travel: 0.198,
} as const;

/** AWP rest framing in the 60° viewmodel camera: lower right, scope prominent (reference). */
export const AWP_VIEWMODEL_REST = {
  x: 0.125,
  y: -0.1,
  z: -0.115,
  pitch: 0.02,
  yaw: 0.05,
  roll: -0.06,
};

const T = AWP_TIMELINE;
/** Milliseconds → reload progress. */
const r = (ms: number) => ms / T.reloadMs;
/** Magazine fully out of view below the rifle (its parent space). */
const MAG_AWAY: Vec = [-0.05, -0.6, 0.06];

/** Magazine reload with a round chambered (3.67 s): drop, swap, seat, tap, back to the guard. */
export const AWP_TACTICAL_RELOAD: ReloadClip = (() => {
  const c = T.tactical;
  return {
    kind: "tactical",
    weaponPosition: [
      { t: 0, v: R },
      { t: r(c.lower[1]), v: [0.0, 0.13, -0.03], ease: EASE.out },
      { t: r(c.insert[1] - 50), v: [0.0, 0.135, -0.03] },
      // Seated: the rifle is pushed up.
      { t: r(c.seat), v: [-0.003, 0.165, -0.035], ease: EASE.out },
      { t: r(c.tap[0] + 120), v: [0.0, 0.125, -0.03], ease: EASE.out },
      { t: r(c.tap[1]), v: [0.0, 0.13, -0.03], ease: EASE.out },
      { t: r(c.settle[0]), v: [0, -0.006, 0], ease: EASE.back },
      { t: 1, v: R },
    ],
    weaponRotation: [
      { t: 0, v: R },
      // Cant right and lift the muzzle a little: the magwell turns toward the support hand.
      { t: r(c.lower[1]), v: [0.2, 0.1, -0.5], ease: EASE.out },
      { t: r(c.insert[1] - 50), v: [0.22, 0.11, -0.54] },
      { t: r(c.seat), v: [0.28, 0.1, -0.5], ease: EASE.out },
      { t: r(c.tap[0] + 120), v: [0.2, 0.1, -0.48], ease: EASE.out },
      { t: r(c.tap[1]), v: [0.18, 0.09, -0.42], ease: EASE.out },
      { t: r(c.settle[0]), v: [-0.015, -0.01, -0.03], ease: EASE.back },
      { t: 1, v: R },
    ],
    magPosition: [
      { t: 0, v: R },
      { t: r(c.release), v: R },
      // Released into the waiting hand, stripped down and away (kept: tactical).
      { t: r(c.release + 60), v: [0, -0.03, 0], ease: EASE.in },
      { t: r(c.magOut[1]), v: MAG_AWAY, ease: EASE.in },
      { t: r(c.insert[0]), v: MAG_AWAY },
      // Fresh magazine: up under the well, aligned, pushed straight in.
      { t: r(c.insert[0] + 300), v: [0, -0.05, 0.004], ease: EASE.out },
      { t: r(c.seat), v: R, ease: EASE.in },
      // Tap: a firm push from below to confirm it is locked.
      { t: r(c.tap[0] + 120), v: [0, -0.006, 0], ease: EASE.out },
      { t: r(c.tap[1]), v: R, ease: EASE.out },
      { t: 1, v: R },
    ],
    magRotation: [
      { t: 0, v: R },
      { t: r(c.release + 60), v: R },
      { t: r(c.magOut[1]), v: [0.5, 0.2, 0.3], ease: EASE.in },
      { t: r(c.insert[0]), v: [0.5, 0.2, 0.3] },
      { t: r(c.insert[0] + 300), v: [0.05, 0.02, 0.02], ease: EASE.out },
      { t: r(c.seat), v: R, ease: EASE.in },
      { t: 1, v: R },
    ],
    // The bolt is never touched in a tactical reload.
    boltTravel: [
      { t: 0, v: 0 },
      { t: 1, v: 0 },
    ],
    support: [
      { t: 0, v: at("guard") },
      { t: r(c.lower[1] * 0.5), v: at("guard", [-0.02, -0.08, 0.05], [0, 0, 0.15]) },
      { t: r(c.handToMag[1]), v: at("mag"), ease: EASE.out },
      { t: r(c.magOut[1]), v: at("mag") },
      { t: r(c.insert[0]), v: at("mag") },
      { t: r(c.seat), v: at("mag") },
      { t: r(c.tap[1]), v: at("mag") },
      { t: r(c.handToGuard[1]), v: at("guard", [0, -0.015, 0.01], [0, 0, -0.04]), ease: EASE.back },
      { t: 1, v: at("guard") },
    ],
    phases: {
      lower: [0, r(c.lower[1])],
      out: [r(c.handToMag[0]), r(c.magOut[1])],
      insert: [r(c.insert[0]), r(c.seat)],
      return: [r(c.tap[1]), 1],
    },
  };
})();

/**
 * Empty reload (bolt open, magazine empty): the empty magazine falls free while the hand fetches
 * the fresh one; seat it, the support hand returns to the fore-end, then the right hand works the
 * bolt to chamber a round (boltPose with the empty-reload times).
 */
export const AWP_EMPTY_RELOAD: ReloadClip = (() => {
  const c = T.empty;
  return {
    kind: "empty",
    weaponPosition: [
      { t: 0, v: R },
      { t: r(c.lower[1]), v: [0.0, 0.13, -0.03], ease: EASE.out },
      { t: r(c.insert[1] - 40), v: [0.0, 0.135, -0.03] },
      { t: r(c.seat), v: [-0.003, 0.17, -0.035], ease: EASE.out },
      // Back toward the shoulder for the bolt (the rifle rolls its right side up a little).
      { t: r(c.handToBolt[0]), v: [-0.006, 0.04, 0.025], ease: EASE.out },
      { t: r(c.back[1]), v: [-0.004, 0.035, 0.035] },
      // Bolt home: a small forward jolt.
      { t: r(c.forward[1]), v: [-0.004, 0.03, 0.012], ease: EASE.out },
      { t: r(c.settle[0]), v: [0, -0.006, 0], ease: EASE.back },
      { t: 1, v: R },
    ],
    weaponRotation: [
      { t: 0, v: R },
      { t: r(c.lower[1]), v: [0.2, 0.1, -0.5], ease: EASE.out },
      { t: r(c.insert[1] - 40), v: [0.22, 0.11, -0.54] },
      { t: r(c.seat), v: [0.29, 0.1, -0.5], ease: EASE.out },
      { t: r(c.handToBolt[0]), v: [0.06, 0.03, 0.1], ease: EASE.inOut },
      { t: r(c.back[1]), v: [0.07, 0.035, 0.13] },
      { t: r(c.forward[1]), v: [0.05, 0.03, 0.1], ease: EASE.out },
      { t: r(c.settle[0]), v: [-0.015, -0.01, -0.02], ease: EASE.back },
      { t: 1, v: R },
    ],
    magPosition: [
      { t: 0, v: R },
      { t: r(c.release), v: R },
      // Falls free under gravity.
      { t: r(c.release + 40), v: [0, -0.03, 0], ease: EASE.in },
      { t: r(c.magOut[1]), v: MAG_AWAY, ease: EASE.in },
      { t: r(c.insert[0]), v: MAG_AWAY },
      { t: r(c.insert[0] + 200), v: [0, -0.05, 0.004], ease: EASE.out },
      { t: r(c.seat), v: R, ease: EASE.in },
      { t: 1, v: R },
    ],
    magRotation: [
      { t: 0, v: R },
      { t: r(c.release + 40), v: R },
      { t: r(c.magOut[1]), v: [0.3, 0.1, 0.25], ease: EASE.in },
      { t: r(c.insert[0]), v: [0.5, 0.2, 0.3] },
      { t: r(c.insert[0] + 200), v: [0.05, 0.02, 0.02], ease: EASE.out },
      { t: r(c.seat), v: R, ease: EASE.in },
      { t: 1, v: R },
    ],
    boltTravel: [
      { t: 0, v: 0 },
      { t: 1, v: 0 },
    ],
    support: [
      { t: 0, v: at("guard") },
      // Straight down for the fresh magazine; the empty one drops on its own.
      { t: r(c.lower[1] * 0.4), v: at("guard", [0.003, -0.1, 0.06], [0, 0, 0.2]) },
      { t: r(c.magOut[1]), v: at("guard", [0.15, -0.5, 0.25], [0.3, 0, 0.4]), ease: EASE.in },
      { t: r(c.insert[0]), v: at("mag") },
      { t: r(c.seat), v: at("mag") },
      { t: r(c.seat + 80), v: at("mag") },
      { t: r(c.handToGuard[1]), v: at("guard", [0, -0.015, 0.01], [0, 0, -0.04]), ease: EASE.back },
      { t: 1, v: at("guard") },
    ],
    phases: {
      lower: [0, r(c.lower[1])],
      out: [r(c.handToMag[0]), r(c.magOut[1])],
      insert: [r(c.insert[0]), r(c.seat)],
      bolt: [r(c.handToBolt[0]), r(c.handToGrip[1])],
    },
  };
})();

export const AWP_RELOAD_CLIPS = { tactical: AWP_TACTICAL_RELOAD, empty: AWP_EMPTY_RELOAD } as const;

/** Bolt-manipulation times (ms on one clock): hand in, lift, back, forward, lower, hand out. */
export type BoltTimes = {
  handIn: readonly [number, number];
  lift: readonly [number, number];
  back: readonly [number, number];
  forward: readonly [number, number];
  lower: readonly [number, number];
  handOut: readonly [number, number];
};
/** The bolt cycle after a shot (ms since the shot). */
export const SHOT_BOLT: BoltTimes = {
  handIn: T.bolt.handToBolt,
  lift: T.bolt.lift,
  back: T.bolt.back,
  forward: T.bolt.forward,
  lower: T.bolt.lower,
  handOut: T.bolt.handToGrip,
};
/** The bolt part of the empty reload (ms since the reload started). */
export const RELOAD_BOLT: BoltTimes = {
  handIn: T.empty.handToBolt,
  lift: T.empty.lift,
  back: T.empty.back,
  forward: T.empty.forward,
  lower: T.empty.lower2,
  handOut: T.empty.handToGrip,
};

const ramp = (ms: number, [a, b]: readonly [number, number], ease = EASE.inOut) =>
  ms <= a ? 0 : ms >= b ? 1 : ease((ms - a) / (b - a));

/**
 * The bolt and right hand at `ms` on a BoltTimes clock.
 *   hand    0 on the pistol grip → 1 closed on the knob
 *   lift    0 locked → 1 handle up (× AWP_BOLT.lift about the bore)
 *   back    0 forward → 1 fully drawn (× AWP_BOLT.travel)
 *   cant    0 → 1 the rifle rolls its right side up toward the camera while the bolt is worked
 */
export function boltPose(ms: number, times: BoltTimes) {
  const hand =
    ms < times.handOut[0]
      ? ramp(ms, times.handIn, EASE.out)
      : 1 - ramp(ms, times.handOut, EASE.inOut);
  const lift =
    ms < times.lower[0] ? ramp(ms, times.lift, EASE.out) : 1 - ramp(ms, times.lower, EASE.in);
  const back =
    ms < times.forward[0] ? ramp(ms, times.back, EASE.out) : 1 - ramp(ms, times.forward, EASE.in);
  // The arc of the hand on its way to the knob and back: a short lift off the grip.
  const travel = Math.sin(Math.PI * Math.min(1, Math.max(0, hand)));
  const cant =
    ms < times.handOut[0]
      ? ramp(ms, [times.handIn[0], times.lift[1]], EASE.inOut)
      : 1 - ramp(ms, times.handOut, EASE.inOut);
  return { hand, lift, back, travel: hand > 0 && hand < 1 ? travel : 0, cant };
}
export type BoltPose = ReturnType<typeof boltPose>;

/** Rifle motion while the bolt is worked: roll (z) and a small pitch, scaled by `cant`. */
export const BOLT_CANT = { pitch: -0.02, yaw: 0.1, roll: 0.25, y: -0.05, z: -0.16 } as const;

/** Shot recoil for the AWP viewmodel: a heavy, slow kick (scales the shared `kick`). */
export const AWP_KICK = { back: 0.06, pitch: 0.09 } as const;

/** Keyframes helper for tests: every clip's keys are in time order and within 0..1. */
export function clipKeys(clip: ReloadClip): Key<unknown>[][] {
  return [
    clip.weaponPosition,
    clip.weaponRotation,
    clip.magPosition,
    clip.magRotation,
    clip.boltTravel,
    clip.support,
  ];
}
