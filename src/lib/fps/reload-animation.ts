/**
 * Key-posed first-person AK reloads (CS/COD style): explosive moves, short settles.
 * Pure data + sampling so it is identical for both roles and testable without WebGL.
 *
 * Progress `p` runs 0 → 1 over the server's reload window (WEAPONS.rifle.reloadMs); both clips
 * fit that same window, so gameplay timing is unchanged.
 *
 * Empty (magazine was at 0 — the AK has no bolt hold-open, so it must be chambered):
 *   Break   0.00–0.30  weapon cants right; support hand takes the magazine, thumbs the paddle,
 *                      rocks it forward about the front lug and strips it.
 *   Insert  0.30–0.60  fresh magazine rises, front lug hooks the well, rocks back and slams home.
 *   Chamber 0.60–1.00  support hand comes over the dust cover, closes on the right-side knob,
 *                      racks it, lets the carrier fly forward and returns to the handguard.
 * Tactical (round still chambered): same magazine change with a more deliberate pace, a seating
 *   tug, and a direct return to the handguard — no charging handle.
 *
 * Magazine rotations are applied about the magazine's front locking lug (see authored-viewmodel),
 * which is what produces the AK's characteristic rock-out / rock-in instead of a straight drop.
 */

export type Ease = (t: number) => number;
export const EASE = {
  linear: (t: number) => t,
  inOut: (t: number) => t * t * (3 - 2 * t),
  out: (t: number) => 1 - (1 - t) ** 3,
  in: (t: number) => t * t * t,
  /** Fast arrival with a small overshoot: the "settle" in snappy FPS animation. */
  back: (t: number) => {
    const c = 1.9;
    return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
  },
} satisfies Record<string, Ease>;

type Vec = readonly [number, number, number];
export type Key<T> = { t: number; v: T; ease?: Ease };

function lerpVec(a: Vec, b: Vec, t: number): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** Sample a key track; each key's ease shapes the segment arriving into it. */
export function sampleSegment<T>(keys: readonly Key<T>[], p: number) {
  const t = Math.min(1, Math.max(0, p));
  if (t <= keys[0]!.t) return { a: keys[0]!.v, b: keys[0]!.v, k: 0 };
  for (let i = 1; i < keys.length; i++) {
    const next = keys[i]!;
    if (t <= next.t) {
      const prev = keys[i - 1]!;
      const span = next.t - prev.t;
      const local = span > 0 ? (t - prev.t) / span : 1;
      return { a: prev.v, b: next.v, k: (next.ease ?? EASE.inOut)(local) };
    }
  }
  const last = keys.at(-1)!.v;
  return { a: last, b: last, k: 1 };
}
export function sampleVec(keys: readonly Key<Vec>[], p: number) {
  const { a, b, k } = sampleSegment(keys, p);
  return lerpVec(a, b, k);
}
export function sampleNumber(keys: readonly Key<number>[], p: number) {
  const { a, b, k } = sampleSegment(keys, p);
  return a + (b - a) * k;
}

const R: Vec = [0, 0, 0];

/**
 * Where the support (left) hand's wrist is.
 *   guard   on the handguard (rest grip)
 *   mag     the baked magazine grip, riding the magazine
 *   handle  the baked charging-handle grip, riding the bolt
 *   racked  that same grip with the bolt held fully to the rear (after the hand lets go)
 * Offsets are in viewmodel-root units, rotated with the weapon; rotations add on top.
 */
export type SupportAnchor = "guard" | "mag" | "handle" | "racked";
export type SupportKey = { anchor: SupportAnchor; offset: Vec; rotation: Vec };
const at = (anchor: SupportAnchor, offset: Vec = R, rotation: Vec = R): SupportKey => ({
  anchor,
  offset,
  rotation,
});

export type ReloadKind = "tactical" | "empty";
export type ReloadClip = {
  kind: ReloadKind;
  /** Weapon_Master pivot (right-hand grip): position offset (root units) and XYZ rotation. */
  weaponPosition: Key<Vec>[];
  weaponRotation: Key<Vec>[];
  /** Magazine offset in its parent space; rotation is about the front locking lug. */
  magPosition: Key<Vec>[];
  magRotation: Key<Vec>[];
  /** Charging handle travel along +Z (rearward), in its parent's units. */
  boltTravel: Key<number>[];
  support: Key<SupportKey>[];
  phases: Record<string, readonly [number, number]>;
};

/** Full rearward travel of the charging handle, in its parent's units. */
export const BOLT_RACK = 0.11;

/** Magazine out: hand on it, paddle pressed, rock forward about the lug, then strip it away. */
function magazineOut(start: number, rock: number, gone: number) {
  return {
    position: [
      { t: start, v: R },
      { t: rock, v: R },
      // Pull it down and toward the body, out of frame.
      { t: gone, v: [-0.15, -0.75, 0.15], ease: EASE.in },
    ] as Key<Vec>[],
    rotation: [
      { t: start, v: R },
      // Bottom swings forward about the front lug: the rear catch clears the paddle.
      { t: rock, v: [0.3, 0, 0], ease: EASE.inOut },
      { t: gone, v: [0.7, 0.2, 0.4], ease: EASE.in },
    ] as Key<Vec>[],
  };
}
/** Magazine in: rise tilted forward, hook the front lug, rock back and seat with a click. */
function magazineIn(offscreen: number, near: number, hooked: number, seated: number) {
  return {
    position: [
      { t: offscreen, v: [-0.15, -0.75, 0.15] },
      { t: near, v: [0, -0.04, -0.025], ease: EASE.out },
      { t: hooked, v: R, ease: EASE.inOut },
      { t: seated, v: R },
    ] as Key<Vec>[],
    rotation: [
      { t: offscreen, v: [0.7, 0.2, 0.4] },
      { t: near, v: [0.38, 0.02, 0.02], ease: EASE.out },
      { t: hooked, v: [0.34, 0, 0], ease: EASE.inOut },
      // Rock back is a quick final snap — the "click" frame the gun jolts on.
      { t: seated, v: R, ease: EASE.in },
    ] as Key<Vec>[],
  };
}

const emptyOut = magazineOut(0.13, 0.19, 0.3),
  emptyIn = magazineIn(0.38, 0.47, 0.5, 0.545);
export const EMPTY_RELOAD: ReloadClip = {
  kind: "empty",
  weaponPosition: [
    { t: 0, v: R },
    { t: 0.1, v: [0.03, 0.05, 0.02], ease: EASE.out },
    { t: 0.5, v: [0.035, 0.06, 0.02] },
    // Magazine seats: the whole rifle is shoved up for ~2 frames, then drops back.
    { t: 0.545, v: [0.03, 0.1, 0.015], ease: EASE.out },
    { t: 0.6, v: [0.02, 0.05, 0.02], ease: EASE.out },
    // The hand drags the rifle back a touch while racking.
    { t: 0.67, v: [-0.01, 0.07, 0.03] },
    { t: 0.755, v: [-0.012, 0.065, 0.055], ease: EASE.out },
    // Carrier slams home: a short forward jolt.
    { t: 0.785, v: [-0.01, 0.06, 0.005], ease: EASE.out },
    { t: 0.84, v: [-0.005, 0.035, 0.015], ease: EASE.out },
    { t: 0.94, v: [0, -0.006, 0], ease: EASE.back },
    { t: 1, v: R },
  ],
  weaponRotation: [
    { t: 0, v: R },
    // Break: cant top-right and lift the muzzle so the magwell faces the support hand.
    { t: 0.1, v: [0.16, 0.12, -0.5], ease: EASE.out },
    { t: 0.5, v: [0.2, 0.14, -0.55] },
    { t: 0.545, v: [0.27, 0.13, -0.5], ease: EASE.out },
    { t: 0.6, v: [0.18, 0.1, -0.42], ease: EASE.out },
    // Chamber: ease the cant back so the dust cover faces the camera for the overhand rack.
    { t: 0.67, v: [0.1, 0.08, -0.22] },
    { t: 0.755, v: [0.13, 0.1, -0.26], ease: EASE.out },
    { t: 0.785, v: [0.08, 0.08, -0.22], ease: EASE.out },
    { t: 0.84, v: [0.05, 0.04, -0.12], ease: EASE.out },
    { t: 0.94, v: [-0.015, -0.01, -0.03], ease: EASE.back },
    { t: 1, v: R },
  ],
  magPosition: [{ t: 0, v: R }, ...emptyOut.position, ...emptyIn.position, { t: 1, v: R }],
  magRotation: [{ t: 0, v: R }, ...emptyOut.rotation, ...emptyIn.rotation, { t: 1, v: R }],
  boltTravel: [
    { t: 0, v: 0 },
    { t: 0.68, v: 0 },
    { t: 0.755, v: BOLT_RACK, ease: EASE.out },
    // Released: spring drives the carrier home almost instantly.
    { t: 0.775, v: 0, ease: EASE.in },
    { t: 1, v: 0 },
  ],
  support: [
    { t: 0, v: at("guard") },
    // Release the handguard and drop toward the magazine.
    { t: 0.04, v: at("guard", [-0.02, -0.08, 0.04], [0, 0, 0.15]) },
    // Contact: the handguard hand lands exactly on the magazine-grip pose, then the baked
    // magazine-grip hand takes over and rides the magazine out, through the swap and back in.
    { t: 0.12, v: at("mag"), ease: EASE.out },
    { t: 0.3, v: at("mag") },
    { t: 0.38, v: at("mag") },
    { t: 0.545, v: at("mag") },
    { t: 0.59, v: at("mag") },
    // Up and over the dust cover to the knob...
    { t: 0.645, v: at("handle", [-0.02, 0.06, -0.05], [0, 0, 0.75]), ease: EASE.out },
    { t: 0.68, v: at("handle"), ease: EASE.inOut },
    // ...rack it fully back (the baked handle grip rides the bolt)...
    { t: 0.755, v: at("handle") },
    // ...and let go: the hand stays back and lifts off while the carrier flies forward.
    { t: 0.79, v: at("racked", [-0.03, 0.05, 0.05], [0, 0, 0.75]), ease: EASE.out },
    { t: 0.92, v: at("guard", [0, -0.015, 0.01], [0, 0, -0.04]), ease: EASE.back },
    { t: 1, v: at("guard") },
  ],
  phases: { break: [0, 0.3], insert: [0.3, 0.6], chamber: [0.6, 1] },
};

const tacticalOut = magazineOut(0.15, 0.22, 0.33),
  tacticalIn = magazineIn(0.42, 0.52, 0.555, 0.6);
export const TACTICAL_RELOAD: ReloadClip = {
  kind: "tactical",
  weaponPosition: [
    { t: 0, v: R },
    { t: 0.12, v: [0.03, 0.05, 0.02], ease: EASE.out },
    { t: 0.555, v: [0.035, 0.06, 0.02] },
    { t: 0.6, v: [0.03, 0.095, 0.015], ease: EASE.out },
    // Seating tug: the support hand pulls down on the magazine to confirm it is locked.
    { t: 0.66, v: [0.03, 0.035, 0.02], ease: EASE.out },
    { t: 0.72, v: [0.025, 0.05, 0.02], ease: EASE.out },
    { t: 0.88, v: [0, -0.006, 0], ease: EASE.back },
    { t: 1, v: R },
  ],
  weaponRotation: [
    { t: 0, v: R },
    { t: 0.12, v: [0.14, 0.1, -0.46], ease: EASE.out },
    { t: 0.555, v: [0.18, 0.12, -0.5] },
    { t: 0.6, v: [0.25, 0.11, -0.46], ease: EASE.out },
    { t: 0.66, v: [0.14, 0.1, -0.44], ease: EASE.out },
    { t: 0.72, v: [0.12, 0.08, -0.36], ease: EASE.out },
    { t: 0.88, v: [-0.015, -0.01, -0.03], ease: EASE.back },
    { t: 1, v: R },
  ],
  magPosition: [
    { t: 0, v: R },
    ...tacticalOut.position,
    ...tacticalIn.position,
    { t: 0.66, v: [0, -0.012, 0], ease: EASE.out },
    { t: 0.7, v: R, ease: EASE.out },
    { t: 1, v: R },
  ],
  magRotation: [{ t: 0, v: R }, ...tacticalOut.rotation, ...tacticalIn.rotation, { t: 1, v: R }],
  boltTravel: [
    { t: 0, v: 0 },
    { t: 1, v: 0 },
  ],
  support: [
    { t: 0, v: at("guard") },
    { t: 0.05, v: at("guard", [-0.02, -0.08, 0.04], [0, 0, 0.15]) },
    { t: 0.14, v: at("mag"), ease: EASE.out },
    { t: 0.33, v: at("mag") },
    { t: 0.42, v: at("mag") },
    { t: 0.6, v: at("mag") },
    { t: 0.7, v: at("mag") },
    { t: 0.84, v: at("guard", [0, -0.015, 0.01], [0, 0, -0.04]), ease: EASE.back },
    { t: 1, v: at("guard") },
  ],
  phases: { break: [0, 0.33], insert: [0.33, 0.64], return: [0.64, 1] },
};

export const RELOAD_CLIPS: Record<ReloadKind, ReloadClip> = {
  tactical: TACTICAL_RELOAD,
  empty: EMPTY_RELOAD,
};

// Back-compat names: the empty (full) reload.
export const WEAPON_POSITION = EMPTY_RELOAD.weaponPosition;
export const WEAPON_ROTATION = EMPTY_RELOAD.weaponRotation;
export const MAG_POSITION = EMPTY_RELOAD.magPosition;
export const MAG_ROTATION = EMPTY_RELOAD.magRotation;
export const BOLT_TRAVEL = EMPTY_RELOAD.boltTravel;
export const SUPPORT = EMPTY_RELOAD.support;
export const RELOAD_PHASES = EMPTY_RELOAD.phases as {
  break: readonly [number, number];
  insert: readonly [number, number];
  chamber: readonly [number, number];
};
