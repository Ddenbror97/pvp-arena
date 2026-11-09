import * as THREE from "three";
import type { HandleGrip } from "./authored-viewmodel";
import { SHORT_FOREARMS, type ForearmShape, type GripFrame } from "./fitted-rifle-hands";
import { scaledGuardGrip } from "./police-arms";
import { at, EASE, type Key, type ReloadClip, type ReloadKind, type Vec } from "./reload-animation";

/**
 * HK MP5 first person (art/blender/mp5, battle royale). Research notes (2026-11-09):
 *
 * - Idle: CS2's MP5-SD and Modern Warfare's MP5 hold the gun low at the right with a slight
 *   inward cant, the stock off the bottom edge, the receiver and the rear sight drum reading
 *   large and the short handguard held from below by the support hand; the muzzle points just
 *   left of the crosshair. Shorter and higher than the rifles' framing, so the rear drum and the
 *   cocking tube show over the hands.
 * - Manual of arms (H&K operator's manual; American Rifleman, "To Slap or Not to Slap"): the
 *   roller-delayed MP5 has no bolt hold-open. On an empty gun the support hand pulls the cocking
 *   lever (left side, front of the tube) fully back and rotates it up into the notch, changes the
 *   magazine (it must be inserted with the bolt open) and then slaps the lever down out of the
 *   notch so the bolt slams home on a fresh round: the "HK slap". With a round still chambered
 *   only the magazine is changed.
 *
 * Clip coordinates as reload-animation.ts: Weapon_Master pivot (right-hand grip) offsets in root
 * units and XYZ rotations (+X muzzle up, +Y muzzle left, −Z roll top right); the magazine in its
 * parent space (−Y down); the lever along +Z (rearward) and turned about its own Z (negative:
 * the knob, on the left, swings up).
 */

/** Cocking lever: full rearward travel (rig units ≈ 7.5 cm real) and the turn into the notch. */
export const MP5_LEVER = { travel: 0.15, lock: -0.62 } as const;

/** Viewmodel framing (weapon group, camera space), see the research notes above. */
export const MP5_VIEWMODEL_REST = {
  x: 0.125,
  y: -0.135,
  z: -0.18,
  pitch: 0.025,
  yaw: 0.04,
  roll: -0.05,
} as const;

/**
 * Support hand round the wide "tropical" handguard (half-width 0.062 rig units against the AK's
 * 0.038, its axis 0.028 higher): the AK wrap opened up and moved onto it, mid-handguard.
 */
export function mp5GuardGrip(): GripFrame {
  return { ...scaledGuardGrip(1.5, new THREE.Vector3(0, 0.02, 0.15)), handTwist: 1.2 };
}

/**
 * The lever grip: the fingers close round the knob, which sticks out of the tube's left side;
 * the wrap axis runs out along the knob, the wrist sits behind and below it on the left.
 */
export const MP5_HANDLE: HandleGrip = {
  marker: true,
  offset: new THREE.Vector3(-0.012, -0.004, 0.006),
  axis: new THREE.Vector3(-0.25, -0.15, 0.95),
  toWrist: new THREE.Vector3(-0.85, -0.45, 0.25),
  squeeze: 0.62,
  // Gun space; the reload cants the gun ≈ 0.55 rad top-right, which turns this down-left.
  elbow: new THREE.Vector3(0.08, -0.95, 0.48),
};

/**
 * Longer support forearm than the rifles' (the elbow further out along the same line): the MP5's
 * lever and the slap bring the hand high over the gun, and the forearm must still run out of
 * the bottom of the screen rather than end in the air.
 */
export const MP5_FOREARMS: ForearmShape = {
  ...SHORT_FOREARMS,
  elbow: { L: SHORT_FOREARMS.elbow.L.clone().multiplyScalar(1.6), R: SHORT_FOREARMS.elbow.R },
  sleeveStretch: 1.6,
};

const R: Vec = [0, 0, 0];
/** Magazine off screen (below and toward the body), and turned as the hand carries it. */
const OFF: Vec = [-0.12, -0.85, 0.12];
const OFF_ROT: Vec = [0.55, 0.2, 0.35];

/** Magazine out: the support hand thumbs the paddle and strips it down and away. */
function magOut(start: number, gone: number) {
  return {
    position: [
      { t: start, v: R },
      { t: start + 0.03, v: [0, -0.035, 0.004], ease: EASE.in },
      { t: gone, v: OFF, ease: EASE.in },
    ] as Key<Vec>[],
    rotation: [
      { t: start + 0.03, v: R },
      { t: gone, v: OFF_ROT, ease: EASE.in },
    ] as Key<Vec>[],
  };
}
/** Fresh magazine: up under the well tilted forward, aligned, then driven straight home. */
function magIn(from: number, near: number, seated: number) {
  return {
    position: [
      { t: from, v: OFF },
      { t: near, v: [0, -0.075, -0.01], ease: EASE.out },
      { t: seated, v: R, ease: EASE.in },
    ] as Key<Vec>[],
    rotation: [
      { t: from, v: OFF_ROT },
      { t: near, v: [0.1, 0.02, 0.02], ease: EASE.out },
      { t: seated, v: R, ease: EASE.in },
    ] as Key<Vec>[],
  };
}

const emptyOut = magOut(0.27, 0.4),
  emptyIn = magIn(0.47, 0.57, 0.625);
/** Empty: lock back → magazine change → HK slap (≈ 2.4 s). */
export const MP5_EMPTY_RELOAD: ReloadClip = {
  kind: "empty",
  weaponPosition: [
    { t: 0, v: R },
    // Brought in and up so the tube's left side faces the support hand.
    { t: 0.08, v: [-0.02, 0.06, 0.03], ease: EASE.out },
    // The pull drags the gun back a touch.
    { t: 0.17, v: [-0.028, 0.065, 0.05], ease: EASE.out },
    { t: 0.22, v: [-0.02, 0.06, 0.03] },
    // Magazine change: lifted, magwell toward the hand.
    { t: 0.3, v: [0.005, 0.075, 0.03], ease: EASE.out },
    { t: 0.575, v: [0.005, 0.08, 0.03] },
    // Seat: shoved up for two frames.
    { t: 0.625, v: [0.0, 0.115, 0.025], ease: EASE.out },
    { t: 0.67, v: [-0.01, 0.07, 0.03], ease: EASE.out },
    // Slap: the strike drives the gun down and forward, then it recovers.
    { t: 0.745, v: [-0.02, 0.075, 0.035] },
    { t: 0.77, v: [-0.018, 0.035, 0.0], ease: EASE.out },
    { t: 0.84, v: [-0.01, 0.03, 0.015], ease: EASE.out },
    { t: 0.94, v: [0, -0.006, 0], ease: EASE.back },
    { t: 1, v: R },
  ],
  weaponRotation: [
    { t: 0, v: R },
    // Cant top right and turn the muzzle left: the cocking tube's left side to the camera.
    { t: 0.08, v: [0.1, 0.22, -0.55], ease: EASE.out },
    { t: 0.17, v: [0.13, 0.24, -0.6], ease: EASE.out },
    { t: 0.22, v: [0.1, 0.2, -0.55] },
    { t: 0.3, v: [0.2, 0.14, -0.58], ease: EASE.out },
    { t: 0.575, v: [0.24, 0.16, -0.62] },
    { t: 0.625, v: [0.31, 0.15, -0.58], ease: EASE.out },
    { t: 0.67, v: [0.16, 0.2, -0.56], ease: EASE.out },
    { t: 0.745, v: [0.12, 0.22, -0.56] },
    { t: 0.77, v: [0.03, 0.2, -0.5], ease: EASE.out },
    { t: 0.84, v: [0.05, 0.1, -0.24], ease: EASE.out },
    { t: 0.94, v: [-0.015, -0.01, -0.03], ease: EASE.back },
    { t: 1, v: R },
  ],
  magPosition: [{ t: 0, v: R }, ...emptyOut.position, ...emptyIn.position, { t: 1, v: R }],
  magRotation: [{ t: 0, v: R }, ...emptyOut.rotation, ...emptyIn.rotation, { t: 1, v: R }],
  boltTravel: [
    { t: 0, v: 0 },
    { t: 0.105, v: 0 },
    // Pulled fully back...
    { t: 0.165, v: MP5_LEVER.travel, ease: EASE.out },
    { t: 0.755, v: MP5_LEVER.travel },
    // ...and, slapped out of the notch, flies home on the bolt spring.
    { t: 0.772, v: 0, ease: EASE.in },
    { t: 1, v: 0 },
  ],
  handleTurn: [
    { t: 0, v: 0 },
    { t: 0.165, v: 0 },
    // Rotated up into the notch: locked open.
    { t: 0.2, v: MP5_LEVER.lock, ease: EASE.inOut },
    { t: 0.74, v: MP5_LEVER.lock },
    // The slap knocks it down out of the notch.
    { t: 0.755, v: 0, ease: EASE.in },
    { t: 1, v: 0 },
  ],
  support: [
    { t: 0, v: at("guard") },
    // Off the handguard, up and back to the lever...
    { t: 0.04, v: at("guard", [-0.02, 0.02, 0.05], [0, 0, 0.1]) },
    { t: 0.08, v: at("handle", [-0.03, 0.0, -0.01], [1.25, 0, 0]), ease: EASE.out },
    { t: 0.105, v: at("handle"), ease: EASE.inOut },
    // ...pull it back and hook it up (the baked lever grip rides the lever)...
    { t: 0.165, v: at("handle") },
    { t: 0.2, v: at("handle") },
    // ...let go, down to the magazine: the thumb presses the paddle.
    { t: 0.225, v: at("racked", [-0.02, 0.04, 0.02], [0.7, 0, 0]), ease: EASE.out },
    { t: 0.27, v: at("mag"), ease: EASE.inOut },
    { t: 0.4, v: at("mag") },
    { t: 0.47, v: at("mag") },
    { t: 0.625, v: at("mag") },
    { t: 0.67, v: at("mag") },
    // Up over the locked lever, then the slap: palm down onto it and through.
    { t: 0.715, v: at("racked", [-0.015, 0.035, 0.01], [1.25, 0, 0]), ease: EASE.out },
    { t: 0.745, v: at("racked", [0, 0.012, 0], [1.2, 0, 0]), ease: EASE.in },
    { t: 0.77, v: at("racked", [0.0, -0.035, -0.06], [1.0, 0, 0]), ease: EASE.out },
    { t: 0.9, v: at("guard", [0, -0.015, 0.01], [0, 0, -0.04]), ease: EASE.back },
    { t: 1, v: at("guard") },
  ],
  phases: { lock: [0, 0.24], magazine: [0.24, 0.67], slap: [0.67, 1] },
};

const tacOut = magOut(0.13, 0.27),
  tacIn = magIn(0.37, 0.5, 0.56);
/** Tactical (a round chambered): magazine change, a seating smack, back to the handguard. */
export const MP5_TACTICAL_RELOAD: ReloadClip = {
  kind: "tactical",
  weaponPosition: [
    { t: 0, v: R },
    { t: 0.12, v: [0.005, 0.07, 0.03], ease: EASE.out },
    { t: 0.5, v: [0.005, 0.08, 0.03] },
    { t: 0.56, v: [0.0, 0.115, 0.025], ease: EASE.out },
    // Palm smack under the magazine to be sure it is locked.
    { t: 0.62, v: [0.0, 0.07, 0.03], ease: EASE.out },
    { t: 0.665, v: [0.0, 0.1, 0.028], ease: EASE.out },
    { t: 0.71, v: [0.0, 0.075, 0.03], ease: EASE.out },
    { t: 0.88, v: [0, -0.006, 0], ease: EASE.back },
    { t: 1, v: R },
  ],
  weaponRotation: [
    { t: 0, v: R },
    { t: 0.12, v: [0.19, 0.14, -0.56], ease: EASE.out },
    { t: 0.5, v: [0.23, 0.16, -0.6] },
    { t: 0.56, v: [0.3, 0.15, -0.56], ease: EASE.out },
    { t: 0.62, v: [0.18, 0.14, -0.54], ease: EASE.out },
    { t: 0.665, v: [0.24, 0.14, -0.55], ease: EASE.out },
    { t: 0.71, v: [0.15, 0.1, -0.45], ease: EASE.out },
    { t: 0.88, v: [-0.015, -0.01, -0.03], ease: EASE.back },
    { t: 1, v: R },
  ],
  magPosition: [
    { t: 0, v: R },
    ...tacOut.position,
    ...tacIn.position,
    { t: 0.665, v: [0, 0.004, 0], ease: EASE.out },
    { t: 0.69, v: R },
    { t: 1, v: R },
  ],
  magRotation: [{ t: 0, v: R }, ...tacOut.rotation, ...tacIn.rotation, { t: 1, v: R }],
  boltTravel: [
    { t: 0, v: 0 },
    { t: 1, v: 0 },
  ],
  support: [
    { t: 0, v: at("guard") },
    { t: 0.05, v: at("guard", [-0.02, -0.08, 0.04], [0, 0, 0.15]) },
    { t: 0.13, v: at("mag"), ease: EASE.out },
    { t: 0.27, v: at("mag") },
    { t: 0.37, v: at("mag") },
    { t: 0.56, v: at("mag") },
    // The heel of the hand drops off and smacks the floor plate.
    { t: 0.615, v: at("mag", [0, -0.05, 0.01]), ease: EASE.out },
    { t: 0.66, v: at("mag", [0, -0.012, 0]), ease: EASE.in },
    { t: 0.7, v: at("mag", [0, -0.03, 0.01]), ease: EASE.out },
    { t: 0.84, v: at("guard", [0, -0.015, 0.01], [0, 0, -0.04]), ease: EASE.back },
    { t: 1, v: at("guard") },
  ],
  phases: { out: [0, 0.3], insert: [0.3, 0.71], return: [0.71, 1] },
};

export const MP5_RELOAD_CLIPS: Record<ReloadKind, ReloadClip> = {
  tactical: MP5_TACTICAL_RELOAD,
  empty: MP5_EMPTY_RELOAD,
};
