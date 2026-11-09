import * as THREE from "three";
import type { HandleGrip } from "./authored-viewmodel";
import {
  magazineGrip,
  SHORT_FOREARMS,
  type ForearmShape,
  type GripFrame,
} from "./fitted-rifle-hands";
import { at, EASE, type Key, type ReloadClip, type ReloadKind, type Vec } from "./reload-animation";

/**
 * Desert Eagle first person (art/blender/deagle, battle royale). Research notes (2026-11-09):
 *
 * - Idle: CS2's and Modern Warfare's Deagle are held two-handed and pushed out from the body,
 *   lower right of centre, the long slide angled slightly in toward the crosshair; the support
 *   hand is cupped round the shooting hand (thumbs forward along the frame), both forearms
 *   rising from the bottom edge. Heavier and further out than the rifles' framing.
 * - Manual of arms (Magnum Research Mark XIX): the slide locks open on the last round; the
 *   magazine release is a button behind the trigger guard (left side), pressed by the right
 *   thumb. A reload is: press, the magazine drops free, the support hand brings the fresh one
 *   up and seats it with the heel of the palm; with the slide locked open the slide is racked
 *   (overhand, slingshot) or released, and it slams home on a round. The big .50 slide jumps a
 *   long way on every shot.
 *
 * Coordinates as mp5-animation.ts; the slide is the variant's "charging handle" (+Z rearward).
 */

/** Slide travel (rig units ≈ 5.5 cm real: the face clears the ejection port). */
export const DEAGLE_SLIDE = { travel: 0.11 } as const;

/**
 * Viewmodel framing (weapon group, camera space): lower right of centre with the barrel pointing
 * straight ahead, turned in only a few degrees toward the crosshair (as in CS); perspective alone
 * shows the slide's left flank. (The first framing turned it in 31°, which read as bent; owner,
 * 2026-11-09.)
 */
export const DEAGLE_VIEWMODEL_REST = {
  x: 0.14,
  y: -0.07,
  z: -0.21,
  pitch: 0.03,
  yaw: 0.08,
  roll: -0.06,
} as const;

/**
 * The two-hand grip. Shooting hand (owner, 2026-11-09: the AK hand sat low on the grip, index
 * under the guard): a high grip, the web of the hand up under the tang, the index pad on the
 * trigger, middle finger tight under the trigger guard, ring and little fingers down the front
 * strap, the thumb forward along the frame's left side below the slide stop. Support hand: the
 * closed wrap (as on a magazine) round the front of the grip and the shooting hand's fingers,
 * moved up with them.
 */
export const DEAGLE_HAND_SHIFT = new THREE.Vector3(0, 0.06, -0.008);
export function deagleGuardGrip(): GripFrame {
  return {
    ...magazineGrip(
      new THREE.Vector3(-0.01, -0.14, -0.28),
      new THREE.Vector3(0, -0.96, 0.27),
      new THREE.Vector3(-0.35, -0.3, 0.95),
      1.0,
    ),
    rightHand: true,
    cradle: false,
    rightHandShift: DEAGLE_HAND_SHIFT,
    rightIndex: new THREE.Vector3(-0.014, -0.03, -0.312),
    rightThumb: new THREE.Vector3(-0.05, -0.055, -0.262),
    rightFingers: [
      new THREE.Vector3(-0.042, -0.082, -0.284),
      new THREE.Vector3(-0.042, -0.12, -0.276),
      new THREE.Vector3(-0.04, -0.158, -0.268),
    ],
  };
}

/**
 * Forearms for the pistol hold: both rise from the bottom edge toward the hands, each within
 * ~20° of its hand's own line so the wrist stays locked (a bent path reads as a broken arm).
 */
export const DEAGLE_FOREARMS: ForearmShape = {
  ...SHORT_FOREARMS,
  elbow: {
    L: new THREE.Vector3(-0.4, -0.22, 0.55),
    R: new THREE.Vector3(0.15, -0.25, 0.6),
  },
};

/**
 * Overhand rack (the over-the-top technique): the heel of the support hand on the left-side rear
 * serrations, the four fingers over the top and down the right-side serrations at mid-height,
 * the thumb back at the rear of the slide pointing at the chest, not gripping.
 */
export const DEAGLE_HANDLE: HandleGrip = {
  marker: true,
  offset: new THREE.Vector3(-0.03, -0.015, -0.01),
  axis: new THREE.Vector3(0, 0, 1),
  toWrist: new THREE.Vector3(-1, -0.42, 0.28),
  squeeze: 0.7,
  // Gun space, in line with the hand (≈6° off its axis): the forearm runs straight from the wrist
  // down and back to the left, out of the bottom edge.
  elbow: new THREE.Vector3(-0.75, -0.6, 0.3),
  thumb: new THREE.Vector3(-0.05, -0.01, 0.075),
};

const R: Vec = [0, 0, 0];
/** Spent magazine gone (fallen) / fresh one in the hand below the frame. */
const FALLEN: Vec = [0.02, -0.95, 0.1];
const FETCH: Vec = [-0.1, -0.55, 0.12];
const FETCH_ROT: Vec = [0.5, 0.25, 0.3];

/** Drop free on the button (gravity), fresh one up from below, palmed home. */
function magazine(release: number, fallen: number, fetched: number, near: number, seated: number) {
  return {
    position: [
      { t: 0, v: R },
      { t: release, v: R },
      { t: release + 0.025, v: [0, -0.03, 0.006], ease: EASE.in },
      { t: fallen, v: FALLEN, ease: EASE.in },
      // Swap: the fresh one appears in the hand below the frame.
      { t: fallen + 0.001, v: FETCH },
      { t: fetched, v: FETCH },
      { t: near, v: [0, -0.07, 0.018], ease: EASE.out },
      { t: seated, v: R, ease: EASE.in },
      { t: 1, v: R },
    ] as Key<Vec>[],
    rotation: [
      { t: 0, v: R },
      { t: release + 0.025, v: R },
      { t: fallen, v: [0.25, 0.1, 0.2], ease: EASE.in },
      { t: fallen + 0.001, v: FETCH_ROT },
      { t: fetched, v: FETCH_ROT },
      { t: near, v: [0.08, 0.02, 0.0], ease: EASE.out },
      { t: seated, v: R, ease: EASE.in },
      { t: 1, v: R },
    ] as Key<Vec>[],
  };
}

/** Magazine change: brought in and down a little, muzzle up, the grip's heel turned left. */
const MAG_POS: Vec = [-0.04, 0.02, -0.03];
const MAG_ROT: Vec = [0.42, -0.18, -0.5];
const weaponIn: Key<Vec>[] = [
  { t: 0, v: R },
  { t: 0.1, v: MAG_POS, ease: EASE.out },
];
const turnIn: Key<Vec>[] = [
  { t: 0, v: R },
  { t: 0.1, v: MAG_ROT, ease: EASE.out },
];
/** The palm seats the magazine: the pistol jumps up and settles. */
const SEAT_POS: Vec = [-0.04, 0.065, -0.035];
const SEAT_ROT: Vec = [0.52, -0.18, -0.48];

const tac = magazine(0.12, 0.26, 0.36, 0.5, 0.56);
/** Tactical (a round chambered): drop, fetch, seat, back to the two-hand grip (≈ 1.9 s). */
export const DEAGLE_TACTICAL_RELOAD: ReloadClip = {
  kind: "tactical",
  weaponPosition: [
    ...weaponIn,
    { t: 0.5, v: MAG_POS },
    { t: 0.56, v: SEAT_POS, ease: EASE.out },
    { t: 0.62, v: MAG_POS, ease: EASE.out },
    { t: 0.86, v: [0, -0.005, 0], ease: EASE.back },
    { t: 1, v: R },
  ],
  weaponRotation: [
    ...turnIn,
    { t: 0.5, v: MAG_ROT },
    { t: 0.56, v: SEAT_ROT, ease: EASE.out },
    { t: 0.62, v: MAG_ROT, ease: EASE.out },
    { t: 0.86, v: [-0.012, -0.01, -0.02], ease: EASE.back },
    { t: 1, v: R },
  ],
  magPosition: tac.position,
  magRotation: tac.rotation,
  boltTravel: [
    { t: 0, v: 0 },
    { t: 1, v: 0 },
  ],
  support: [
    { t: 0, v: at("guard") },
    // Off the grip, down out of view to the pouch...
    { t: 0.08, v: at("guard", [-0.03, -0.06, 0.04], [0, 0, 0.2]) },
    { t: 0.26, v: at("guard", [-0.12, -0.42, 0.12], [0.3, 0, 0.3]), ease: EASE.inOut },
    // ...and back up with the fresh magazine (the baked magazine grip rides it).
    { t: 0.36, v: at("mag"), ease: EASE.out },
    { t: 0.5, v: at("mag") },
    { t: 0.56, v: at("mag") },
    { t: 0.6, v: at("mag", [0, -0.035, 0.01]), ease: EASE.out },
    { t: 0.76, v: at("guard", [0, -0.012, 0.008], [0, 0, -0.04]), ease: EASE.back },
    { t: 1, v: at("guard") },
  ],
  phases: { out: [0, 0.3], insert: [0.3, 0.62], return: [0.62, 1] },
};

const emp = magazine(0.1, 0.22, 0.31, 0.43, 0.49);
/** Empty (slide locked open): magazine change, overhand rack, the slide slams home. */
export const DEAGLE_EMPTY_RELOAD: ReloadClip = {
  kind: "empty",
  weaponPosition: [
    ...weaponIn,
    { t: 0.43, v: MAG_POS },
    { t: 0.49, v: SEAT_POS, ease: EASE.out },
    { t: 0.55, v: MAG_POS, ease: EASE.out },
    // Pushed out and turned so the slide's rear faces the support hand for the rack (the
    // pistol is close to the eye: the arm must not cross the camera); the pull drags it back.
    { t: 0.63, v: [0.06, 0.03, -0.2] },
    { t: 0.7, v: [0.06, 0.025, -0.16], ease: EASE.out },
    // Released: the slide slams home and throws the gun forward.
    { t: 0.725, v: [0.06, 0.02, -0.22], ease: EASE.out },
    { t: 0.8, v: [0.03, 0.015, -0.1], ease: EASE.out },
    { t: 0.92, v: [0, -0.005, 0], ease: EASE.back },
    { t: 1, v: R },
  ],
  weaponRotation: [
    ...turnIn,
    { t: 0.43, v: MAG_ROT },
    { t: 0.49, v: SEAT_ROT, ease: EASE.out },
    { t: 0.55, v: MAG_ROT, ease: EASE.out },
    { t: 0.63, v: [0.12, -0.42, 0.3] },
    { t: 0.7, v: [0.16, -0.44, 0.32], ease: EASE.out },
    { t: 0.725, v: [0.06, -0.4, 0.26], ease: EASE.out },
    { t: 0.8, v: [0.04, -0.2, 0.12], ease: EASE.out },
    { t: 0.92, v: [-0.012, -0.01, -0.02], ease: EASE.back },
    { t: 1, v: R },
  ],
  magPosition: emp.position,
  magRotation: emp.rotation,
  boltTravel: [
    // Locked open on the empty magazine...
    { t: 0, v: DEAGLE_SLIDE.travel },
    { t: 0.665, v: DEAGLE_SLIDE.travel },
    // ...pulled the last few millimetres off the stop, then let go.
    { t: 0.7, v: DEAGLE_SLIDE.travel + 0.01, ease: EASE.out },
    { t: 0.718, v: 0, ease: EASE.in },
    { t: 1, v: 0 },
  ],
  support: [
    { t: 0, v: at("guard") },
    { t: 0.07, v: at("guard", [-0.03, -0.06, 0.04], [0, 0, 0.2]) },
    { t: 0.22, v: at("guard", [-0.12, -0.42, 0.12], [0.3, 0, 0.3]), ease: EASE.inOut },
    { t: 0.31, v: at("mag"), ease: EASE.out },
    { t: 0.43, v: at("mag") },
    { t: 0.49, v: at("mag") },
    { t: 0.53, v: at("mag", [0, -0.035, 0.01]), ease: EASE.out },
    // Down out of view while the pistol turns for the rack (the magazine hand becomes the
    // overhand grip below the frame)...
    { t: 0.57, v: at("mag", [-0.04, -0.34, 0.1]), ease: EASE.in },
    { t: 0.59, v: at("handle", [-0.06, -0.34, 0.1]) },
    // ...up and over the top of the slide...
    { t: 0.63, v: at("handle", [-0.02, 0.06, 0.02]), ease: EASE.out },
    { t: 0.665, v: at("handle"), ease: EASE.inOut },
    // ...pull, and let go: the hand flies back off the slide.
    { t: 0.7, v: at("handle") },
    { t: 0.74, v: at("racked", [-0.02, 0.05, 0.06]), ease: EASE.out },
    { t: 0.88, v: at("guard", [0, -0.012, 0.008], [0, 0, -0.04]), ease: EASE.back },
    { t: 1, v: at("guard") },
  ],
  phases: { out: [0, 0.25], insert: [0.25, 0.55], rack: [0.55, 1] },
};

export const DEAGLE_RELOAD_CLIPS: Record<ReloadKind, ReloadClip> = {
  tactical: DEAGLE_TACTICAL_RELOAD,
  empty: DEAGLE_EMPTY_RELOAD,
};
