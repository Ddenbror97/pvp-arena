/**
 * Key-posed first-person AK reload (CS/COD style): explosive moves, short settles.
 * Pure data + sampling so it is identical for both roles and testable without WebGL.
 *
 * Progress `p` runs 0 → 1 over the server's reload window (WEAPONS.rifle.reloadMs).
 *   Break   0.00–0.30  weapon cants right, support hand strips the old magazine and drops it.
 *   Insert  0.30–0.60  fresh magazine rises, rocks in, slams (gun jolts up) and settles.
 *   Chamber 0.60–1.00  support hand goes under to the right-side handle, racks, releases, regrips.
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

/** Weapon_Master pivot (right-hand grip). Position in viewmodel-root units, rotation radians XYZ. */
export const WEAPON_POSITION: Key<Vec>[] = [
  { t: 0, v: R },
  { t: 0.1, v: [0.03, 0.05, 0.02], ease: EASE.out },
  { t: 0.5, v: [0.035, 0.06, 0.02] },
  // Magazine seats: the whole rifle is shoved up for ~2 frames, then drops back.
  { t: 0.545, v: [0.03, 0.1, 0.015], ease: EASE.out },
  { t: 0.6, v: [0.02, 0.045, 0.02], ease: EASE.out },
  { t: 0.68, v: [-0.02, 0.03, 0.03] },
  // Bolt released: snap forward recoil of the carrier.
  { t: 0.77, v: [-0.02, 0.03, 0.06], ease: EASE.out },
  { t: 0.82, v: [-0.015, 0.025, 0.02], ease: EASE.out },
  { t: 0.94, v: [0, -0.006, 0], ease: EASE.back },
  { t: 1, v: R },
];
export const WEAPON_ROTATION: Key<Vec>[] = [
  { t: 0, v: R },
  // Break: cant top-right and lift the muzzle so the magwell faces the support hand.
  { t: 0.1, v: [0.16, 0.12, -0.5], ease: EASE.out },
  { t: 0.5, v: [0.2, 0.14, -0.55] },
  { t: 0.545, v: [0.27, 0.13, -0.5], ease: EASE.out },
  { t: 0.6, v: [0.18, 0.12, -0.48], ease: EASE.out },
  // Chamber: keep the cant so the right-side handle faces the support hand coming from under.
  { t: 0.68, v: [0.1, 0.16, -0.34] },
  { t: 0.77, v: [0.15, 0.17, -0.38], ease: EASE.out },
  { t: 0.82, v: [0.08, 0.14, -0.32], ease: EASE.out },
  { t: 0.94, v: [-0.015, -0.01, -0.03], ease: EASE.back },
  { t: 1, v: R },
];

/** Magazine, in its own parent space (offset from rest). */
export const MAG_POSITION: Key<Vec>[] = [
  { t: 0, v: R },
  { t: 0.13, v: R },
  { t: 0.18, v: [0, -0.07, 0.02], ease: EASE.in },
  { t: 0.3, v: [-0.15, -0.75, 0.15], ease: EASE.in },
  { t: 0.38, v: [-0.15, -0.75, 0.15] },
  { t: 0.5, v: [-0.005, -0.1, -0.04], ease: EASE.out },
  { t: 0.545, v: R, ease: EASE.in },
  { t: 1, v: R },
];
export const MAG_ROTATION: Key<Vec>[] = [
  { t: 0, v: R },
  { t: 0.13, v: R },
  { t: 0.18, v: [0.25, 0, 0], ease: EASE.in },
  { t: 0.3, v: [0.6, 0.2, 0.4], ease: EASE.in },
  { t: 0.38, v: [0.6, 0.2, 0.4] },
  // Front-hook rock-in: the new mag arrives tilted forward then rotates back into the well.
  { t: 0.5, v: [0.38, 0, 0], ease: EASE.out },
  { t: 0.545, v: R, ease: EASE.in },
  { t: 1, v: R },
];

/** Charging handle travel along +Z (rearward), in its parent's units. */
export const BOLT_TRAVEL: Key<number>[] = [
  { t: 0, v: 0 },
  { t: 0.68, v: 0 },
  { t: 0.755, v: 0.11, ease: EASE.out },
  { t: 0.775, v: 0, ease: EASE.in },
  { t: 1, v: 0 },
];

export type SupportAnchor = "guard" | "mag" | "handle";
/**
 * Where the support (left) hand's wrist is. Offsets are in viewmodel-root units added to the
 * anchor; rotations are applied on top of the weapon's orientation when the anchor is on the gun.
 */
export const SUPPORT: Key<{ anchor: SupportAnchor; offset: Vec; rotation: Vec }>[] = [
  { t: 0, v: { anchor: "guard", offset: R, rotation: R } },
  { t: 0.04, v: { anchor: "guard", offset: [-0.02, -0.08, 0.04], rotation: [0, 0, 0.15] } },
  {
    t: 0.12,
    v: { anchor: "mag", offset: [-0.07, -0.27, 0.05], rotation: [0.45, 0.25, 0.25] },
    ease: EASE.out,
  },
  { t: 0.3, v: { anchor: "mag", offset: [-0.07, -0.27, 0.05], rotation: [0.45, 0.25, 0.25] } },
  { t: 0.38, v: { anchor: "mag", offset: [-0.07, -0.27, 0.05], rotation: [0.45, 0.25, 0.25] } },
  { t: 0.545, v: { anchor: "mag", offset: [-0.07, -0.27, 0.05], rotation: [0.45, 0.25, 0.25] } },
  // Thumb the magazine home, then dive under the receiver toward the handle.
  {
    t: 0.6,
    v: { anchor: "mag", offset: [-0.07, -0.32, 0.08], rotation: [0.45, 0.25, 0.25] },
    ease: EASE.out,
  },
  {
    t: 0.68,
    v: { anchor: "handle", offset: [-0.07, -0.21, 0.02], rotation: [0.35, 0.3, 0.2] },
    ease: EASE.out,
  },
  {
    t: 0.755,
    v: { anchor: "handle", offset: [-0.07, -0.21, 0.02], rotation: [0.35, 0.3, 0.2] },
  },
  {
    t: 0.8,
    v: { anchor: "handle", offset: [-0.1, -0.3, 0.2], rotation: [0.35, 0.3, 0.2] },
    ease: EASE.out,
  },
  {
    t: 0.92,
    v: { anchor: "guard", offset: [0, -0.015, 0.01], rotation: [0, 0, -0.04] },
    ease: EASE.back,
  },
  { t: 1, v: { anchor: "guard", offset: R, rotation: R } },
];

export const RELOAD_PHASES = {
  break: [0, 0.3],
  insert: [0.3, 0.6],
  chamber: [0.6, 1],
} as const;
