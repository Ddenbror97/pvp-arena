import * as THREE from "three";
import type { HandleGrip } from "./authored-viewmodel";
import { SHORT_FOREARMS, type ForearmShape } from "./fitted-rifle-hands";
import { at, EASE, type Key, type ReloadClip, type ReloadKind, type Vec } from "./reload-animation";

/**
 * Franchi SPAS-12 first person (art/blender/spas12, battle royale). Research notes (2026-11-13):
 *
 * - The gun: a gas-operated 12 gauge that also works as a pump; here it is in its semi-automatic
 *   mode held on the trigger (items.ts: the battle royale's automatic shotgun), so the bolt
 *   cycles on every shot and the fore-end never moves. Eight shells in the tube under the barrel.
 * - Idle: Counter-Strike's XM1014 and Modern Warfare's SPAS-12 hold the gun low at the right like
 *   a rifle, the support hand under the fore-end, the heat shield and the big front sight
 *   reading over the hands.
 * - Manual of arms (Franchi SPAS-12 owner's manual): the tube is loaded from below, through the
 *   loading port behind the fore-end; each shell is pushed nose first past the carrier (the flap
 *   that closes the port, held down by the carrier-latch button on the receiver's right) until
 *   the shell stop catches its rim. The bolt locks open on the last shell; with shells in the
 *   tube it is let go and runs home on the first of them.
 *
 * So the reload is shell by shell (the server counts each one: br/combat.ts), and one clip holds
 * the three parts the server times separately (SPAS12_RELOAD): the gun rolled over so the port
 * faces the support hand, ONE shell fetched and pushed in (looped, a shell per pass: its first
 * and last pose are the same), and the gun brought back up. Empty: the bolt stays open through
 * the loading and slams home as the gun comes up.
 *
 * Clip coordinates as reload-animation.ts: Weapon_Master pivot (right-hand grip) offsets in root
 * units and XYZ rotations (+X muzzle up, +Y muzzle left, −Z roll top right); the shell (the
 * clip's "magazine") in the gun's space (−Y down, −Z toward the muzzle, 0 = pushed home inside
 * the tube); the bolt along +Z (rearward).
 */

/** The clip's three parts (fractions of the clip; the server's stage times map onto them). */
export const SPAS12_RELOAD = {
  /** The start ends and the first shell's pass begins. */
  insertFrom: 0.3,
  /** A pass ends: another one starts over at `insertFrom`, or the end plays on to 1. */
  insertTo: 0.65,
  /** Where in a pass the shell's rim snaps past the shell stop (the click). */
  seatAt: 0.6,
  /** Where in the end part an open bolt runs home (empty reload). */
  boltHomeAt: 0.3,
} as const;

/** Bolt travel (rig units ≈ 8.5 cm: the bolt face clears the ejection port). */
export const SPAS12_BOLT = { travel: 0.17 } as const;

/** How far the shell pushes the carrier up into the receiver on its way in (radians). */
export const SPAS12_CARRIER_LIFT = 0.3;

/**
 * Viewmodel framing (weapon group, camera space): the rifles' rest, a little lower and further
 * out: the SPAS-12 is the longest gun here and its heat shield is tall.
 */
export const SPAS12_VIEWMODEL_REST = {
  x: 0.14,
  y: -0.125,
  z: -0.19,
  pitch: 0.012,
  yaw: 0.014,
  roll: -0.05,
} as const;

/**
 * The bolt handle on the receiver's right, held overhand like the AK's (the reload never racks
 * it: the grip only gives the "racked" anchor its place).
 */
export const SPAS12_HANDLE: HandleGrip = {
  marker: true,
  offset: new THREE.Vector3(-0.04, 0.02, 0.004),
  axis: new THREE.Vector3(0, 0, 1),
  toWrist: new THREE.Vector3(-1, 0.3, 0.2),
  squeeze: 0.75,
  elbow: new THREE.Vector3(-0.42, -0.3, 0.3),
};

/** The rifles' forearms; the sleeve stretched for the reach down to the shells and back. */
export const SPAS12_FOREARMS: ForearmShape = {
  ...SHORT_FOREARMS,
  sleeveStretch: 1.5,
};

const R: Vec = [0, 0, 0];
/** The loading pose: rolled so the port (under the receiver) faces the support hand. */
const LOAD_AT: Vec = [-0.035, 0.085, 0.045];
const LOAD_TURN: Vec = [0.4, 0.25, -1.1];
/** The shell in the hand below the gun, out of the frame (and the hand's place without one). */
const OFF: Vec = [0.17, -0.7, 0.22];
const OFF_TURN: Vec = [0.5, 0.25, 0.3];
/** Under the port, nose up toward the carrier. */
const NEAR: Vec = [0, -0.095, 0.21];
const NEAR_TURN: Vec = [0.42, 0, 0];
/** The nose on the carrier, pushing it up. */
const ENTER: Vec = [0, -0.05, 0.125];
const ENTER_TURN: Vec = [0.2, 0, 0];
/** Where the hand stays (thumb on the brass) while the shell runs on into the tube. */
const THUMB: Vec = [0, -0.03, 0.1];

const { insertFrom: A, insertTo: B, seatAt, boltHomeAt } = SPAS12_RELOAD;
/** A time inside the pass (0 → 1), and inside the end part. */
const u = (k: number) => A + (B - A) * k;
const e = (k: number) => B + (1 - B) * k;

function clip(kind: ReloadKind): ReloadClip {
  const empty = kind === "empty";
  const home = e(boltHomeAt);
  return {
    kind,
    weaponPosition: [
      { t: 0, v: R },
      // (The hand lets go of the fore-end first; then the gun rolls over.)
      { t: A * 0.12, v: [0, 0.004, 0.004] },
      { t: A * 0.85, v: LOAD_AT },
      { t: A, v: LOAD_AT },
      // The pass: the gun dips to meet the hand, and jolts as the shell snaps home.
      { t: u(0.4), v: [LOAD_AT[0], LOAD_AT[1] - 0.006, LOAD_AT[2]] },
      { t: u(seatAt), v: [LOAD_AT[0], LOAD_AT[1] + 0.012, LOAD_AT[2] - 0.012], ease: EASE.out },
      { t: u(0.8), v: LOAD_AT, ease: EASE.out },
      { t: B, v: LOAD_AT },
      ...(empty
        ? ([
            { t: e(0.24), v: [-0.02, 0.05, 0.03] },
            // The bolt slams home: a short forward jolt.
            { t: home + 0.02, v: [-0.015, 0.04, -0.004], ease: EASE.out },
            { t: e(0.5), v: [-0.008, 0.02, 0.012], ease: EASE.out },
          ] as Key<Vec>[])
        : // Back up: most of the way over in one easy swing, then the settle.
          ([{ t: e(0.42), v: [-0.006, 0.012, 0.008] }] as Key<Vec>[])),
      { t: e(0.74), v: [0, -0.006, 0], ease: EASE.out },
      { t: 1, v: R },
    ],
    weaponRotation: [
      { t: 0, v: R },
      { t: A * 0.12, v: [0.02, 0.01, -0.04] },
      { t: A * 0.85, v: LOAD_TURN },
      { t: A, v: LOAD_TURN },
      { t: u(0.4), v: [LOAD_TURN[0] - 0.015, LOAD_TURN[1], LOAD_TURN[2] - 0.02] },
      { t: u(seatAt), v: [LOAD_TURN[0] + 0.03, LOAD_TURN[1], LOAD_TURN[2] + 0.03], ease: EASE.out },
      { t: u(0.8), v: LOAD_TURN, ease: EASE.out },
      { t: B, v: LOAD_TURN },
      ...(empty
        ? ([
            { t: e(0.24), v: [0.12, 0.1, -0.4] },
            { t: home + 0.02, v: [0.06, 0.08, -0.3], ease: EASE.out },
            { t: e(0.5), v: [0.04, 0.04, -0.14], ease: EASE.out },
          ] as Key<Vec>[])
        : ([{ t: e(0.42), v: [0.05, 0.03, -0.16] }] as Key<Vec>[])),
      { t: e(0.74), v: [-0.015, -0.01, -0.03], ease: EASE.out },
      { t: 1, v: R },
    ],
    // The shell: in the hand below the gun, up under the port, nose onto the carrier, then
    // thumbed forward until the stop takes its rim; the next pass starts with the next shell.
    magPosition: [
      { t: 0, v: OFF },
      { t: A, v: OFF },
      { t: u(0.36), v: NEAR, ease: EASE.out },
      { t: u(0.47), v: ENTER, ease: EASE.inOut },
      { t: u(seatAt), v: R, ease: EASE.in },
      { t: 1, v: R },
    ],
    magRotation: [
      { t: 0, v: OFF_TURN },
      { t: A, v: OFF_TURN },
      { t: u(0.36), v: NEAR_TURN, ease: EASE.out },
      { t: u(0.47), v: ENTER_TURN, ease: EASE.inOut },
      { t: u(seatAt), v: R, ease: EASE.in },
      { t: 1, v: R },
    ],
    boltTravel: empty
      ? [
          { t: 0, v: SPAS12_BOLT.travel },
          { t: home, v: SPAS12_BOLT.travel },
          // Let go: the spring drives it home on the first shell.
          { t: home + 0.02, v: 0, ease: EASE.in },
          { t: 1, v: 0 },
        ]
      : [
          { t: 0, v: 0 },
          { t: 1, v: 0 },
        ],
    // The carrier: pushed up by the shell's nose, dropping back as the rim passes the stop.
    carrierTurn: [
      { t: 0, v: 0 },
      { t: u(0.36), v: 0 },
      { t: u(0.47), v: SPAS12_CARRIER_LIFT, ease: EASE.out },
      { t: u(seatAt), v: SPAS12_CARRIER_LIFT },
      { t: u(seatAt + 0.08), v: 0, ease: EASE.out },
      { t: 1, v: 0 },
    ],
    support: [
      { t: 0, v: at("guard") },
      // Off the fore-end and straight down out of the frame for the first shell, before the
      // gun has rolled far (a hand still on the fore-end would be swung across the view).
      { t: A * 0.14, v: at("guard", [-0.02, -0.1, 0.07], [0, 0, 0.15]), ease: EASE.in },
      { t: A * 0.42, v: at("mag"), ease: EASE.inOut },
      { t: A, v: at("mag") },
      // (The baked hand holding the shell rides it up to the port...)
      { t: u(0.47), v: at("mag") },
      // ...stays there with the thumb on the brass while the shell runs in...
      { t: u(seatAt), v: at("mag", THUMB), ease: EASE.in },
      { t: u(seatAt + 0.1), v: at("mag", THUMB) },
      // ...and goes down for the next one.
      { t: B, v: at("mag", OFF), ease: EASE.inOut },
      // Back to the fore-end once the gun is nearly level again.
      { t: e(empty ? 0.5 : 0.3), v: at("mag", OFF) },
      { t: e(0.86), v: at("guard", [0, -0.015, 0.01], [0, 0, -0.04]), ease: EASE.back },
      { t: 1, v: at("guard") },
    ],
    phases: { start: [0, A], insert: [A, B], end: [B, 1] },
  };
}

/**
 * Equip (client-only): the gun comes up from below the view, muzzle low and rolled out, into
 * the ready position with a short settle. Offsets on the whole viewmodel (gun and both hands),
 * camera space; `k` runs 1 → 0 over SPAS12_EQUIP_MS.
 */
export const SPAS12_EQUIP_MS = 420;
export const SPAS12_EQUIP_FROM = {
  position: [0.03, -0.2, 0.06],
  rotation: [-0.55, 0.18, 0.35],
} as const;
/** How much of the equip offset is left `ms` after the gun was drawn (1 → 0, eased out). */
export function spas12Equip(ms: number) {
  const t = Math.min(1, Math.max(0, ms / SPAS12_EQUIP_MS));
  // Fast up, then a small overshoot settling back (the gun's weight stopping at the shoulder).
  return 1 - EASE.back(t);
}

/**
 * Inspection (client-only, F; never touches ammunition or weapon state): offsets on the whole
 * viewmodel relative to the stable camera, as the M4's (reload-animation.ts M4_INSPECT).
 *   0.00–0.14  push it out and swing the muzzle left: the left side broadside, the heat shield
 *              and the folding stock's hinge in view
 *   0.14–0.38  hold, slight drift
 *   0.38–0.54  roll it the other way, top toward the camera: the receiver's top and right
 *              side, the ejection port and the bolt handle (the action)
 *   0.54–0.80  hold
 *   0.80–1.00  back to ready
 */
export const SPAS12_INSPECT_MS = 3600;
export const SPAS12_INSPECT: { position: Key<Vec>[]; rotation: Key<Vec>[] } = {
  position: [
    { t: 0, v: R },
    { t: 0.14, v: [0.0, 0.04, -0.1], ease: EASE.out },
    { t: 0.38, v: [-0.005, 0.045, -0.095] },
    { t: 0.54, v: [-0.06, 0.025, -0.04], ease: EASE.inOut },
    { t: 0.8, v: [-0.063, 0.028, -0.038] },
    { t: 1, v: R, ease: EASE.inOut },
  ],
  rotation: [
    { t: 0, v: R },
    { t: 0.14, v: [0.06, 0.85, 0.12], ease: EASE.out },
    { t: 0.38, v: [0.08, 0.9, 0.15] },
    // (Rolled this way the support forearm swings down out of the view, not across it.)
    { t: 0.54, v: [0.2, 0.35, 0.7], ease: EASE.inOut },
    { t: 0.8, v: [0.21, 0.33, 0.74] },
    { t: 1, v: R, ease: EASE.inOut },
  ],
};

export const SPAS12_RELOAD_CLIPS: Record<ReloadKind, ReloadClip> = {
  tactical: clip("tactical"),
  empty: clip("empty"),
};

/**
 * The clip time of a shell-by-shell reload: `stage` 0 the start, 1 a shell going in, 2 the end
 * (br/combat.ts), each `progress` 0 → 1 of its own length.
 */
export function spas12ClipTime(stage: 0 | 1 | 2, progress: number) {
  const k = Math.min(1, Math.max(0, progress));
  const t = stage === 0 ? A * k : stage === 1 ? u(k) : e(k);
  // Strictly inside the clip: 0 and 1 are the viewmodel's "not reloading".
  return Math.min(0.9999, Math.max(1e-4, t));
}
