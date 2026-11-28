/**
 * The battle royale's positional audio, shared by every sound placed in the world: gunshots,
 * footsteps, vehicle engines, doors, glass, grenades (owner, 2026-11-27: "audit the underlying
 * positional audio system rather than implementing separate, duplicated solutions for
 * vehicles, gunshots and footsteps"; PUBG and Warzone as the references).
 *
 * Before: every placed sound went through a Web Audio panner with the *linear* distance model
 * from 4 m to its hearing range. An AK-47 (heard to 140 m) was still at 75 % of its level 35 m
 * away and at half at 70 m: other players' shots hardly changed with the distance, then
 * stopped dead at the range. A silenced shot's range was cut twice (once by the server, once
 * here), so it fell silent at 18 % of the range it was sent to. The sources were placed in the
 * listener's frame by its yaw alone when they started, so the camera's pitch played no part,
 * and a sound kept the direction it started at while the view turned.
 *
 * Now: the listener is the camera itself (position and full orientation, every frame) and the
 * sources sit in the world. The level falls with distance as an inverse power from `ref` m:
 * -6 dB per doubling at power 1, so near is loud, medium noticeably quieter, far soft. It fades
 * smoothly to nothing over the last third of the range instead of being cut off. Air absorbs the
 * highs (a low-pass over distance, `air` m per e-fold of its cutoff): far shots lose their crack.
 * One ray through the static world when a sound starts (never continuously) tells whether a
 * wall, a floor or a hill is in the way: that muffles it. All of it is decided from what the
 * client already has; nothing new comes over the network.
 */

/** How a kind of sound carries. */
export type Falloff = {
  /** Full level within this (m). */
  ref: number;
  /** The slope past it: level = (ref / d) ^ power (1: −6 dB per doubling of the distance). */
  power: number;
  /** Air absorption: the low-pass cutoff falls by e every this many metres. */
  air: number;
};

/** Doors, glass, ropes, ladders, knives, grenades: the defaults for any placed sound. */
export const GENERIC_FALLOFF: Falloff = { ref: 4, power: 0.9, air: 160 };

/** Explosions (a grenade, a vehicle blowing up): heard across the area, deep at range. */
export const BLAST_FALLOFF: Falloff = { ref: 12, power: 0.9, air: 260 };

/** The guns by how they carry (items.ts WeaponDef.model). */
export type ShotClass = "pistol" | "smg" | "shotgun" | "rifle" | "marksman" | "sniper";
export const SHOT_CLASS: Record<string, ShotClass> = {
  deagle: "pistol",
  mp5: "smg",
  spas12: "shotgun",
  ak47: "rifle",
  m4a1s: "rifle",
  hunting: "marksman",
  awp: "sniper",
};
/**
 * Per class: a pistol's crack is close and falls off fast; a rifle carries; a sniper's report
 * carries furthest and keeps more of its body at range. Silenced: a dull thud, gone quickly.
 */
export const SHOT_FALLOFF: Record<ShotClass | "silenced", Falloff> = {
  pistol: { ref: 6, power: 1.15, air: 120 },
  smg: { ref: 6, power: 1.1, air: 130 },
  shotgun: { ref: 8, power: 1.05, air: 140 },
  rifle: { ref: 9, power: 1, air: 160 },
  marksman: { ref: 11, power: 0.95, air: 190 },
  sniper: { ref: 13, power: 0.9, air: 220 },
  silenced: { ref: 4, power: 1.2, air: 80 },
};

/**
 * Footsteps by pace (owner: "walking, sprinting and crouching have appropriately different
 * sound levels and audible ranges"): the range (m), the level at the feet, and how they fall
 * off. A step's detail goes quickly with distance (air 45 m), and sprinting is heard furthest.
 * Crouched and walking (the walk key) steps are quiet and close. Before, every step was heard
 * to 36 m at one level, and crouched or walking ones not at all.
 */
export type Pace = "crouch" | "walk" | "run" | "sprint";
export const STEP_PACE: Record<Pace, { range: number; gain: number; own: number } & Falloff> = {
  crouch: { range: 9, gain: 0.24, own: 0.1, ref: 1.5, power: 1.2, air: 30 },
  walk: { range: 16, gain: 0.34, own: 0.15, ref: 2, power: 1.1, air: 35 },
  run: { range: 32, gain: 0.52, own: 0.26, ref: 3, power: 0.95, air: 45 },
  sprint: { range: 42, gain: 0.66, own: 0.3, ref: 3.5, power: 0.9, air: 50 },
};
/** The farthest any step carries (the near ring the server always sends is 45 m). */
export const STEP_RANGE_MAX = STEP_PACE.sprint.range;

/** A footstep's pace from the body's speed (m/s: walk 2.25, crouch 2.4, run 5, sprint 7.5). */
export function stepPace(speed: number, crouched: boolean): Pace {
  if (crouched) return "crouch";
  if (speed < 3.4) return "walk";
  if (speed < 6.3) return "run";
  return "sprint";
}

/** Vehicle engines (others'): carry well, lose their rasp with distance. */
export const ENGINE_FALLOFF: Falloff = { ref: 6, power: 1.05, air: 150 };
export const ENGINE_RANGE = { car: 170, bike: 150 } as const;
/** At most this many other vehicles' engines sound at once (the nearest). */
export const ENGINE_VOICES = 6;

/** Muffled by a wall, a floor or a hill: this share of the level, and the cutoff at most. */
export const OCCLUDED = { gain: 0.5, cutoff: 1300, floorGain: 0.4, floorCutoff: 900 } as const;
/** Rays tested for occlusion only for sounds within this (m); past it the air does the work. */
export const OCCLUDE_M = 90;

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * The level (0..1) of a sound `d` m away that carries to `range` m: full within `ref`, an
 * inverse power past it, faded smoothly to 0 over the last third of the range (no hard cut).
 */
export function distanceGain(d: number, range: number, f: Falloff): number {
  if (!(d >= 0) || !(range > 0) || d >= range) return 0;
  const level = d <= f.ref ? 1 : (f.ref / d) ** f.power;
  return level * (1 - smoothstep(range * 0.66, range, d));
}

/** The low-pass cutoff (Hz) for a sound `d` m away: the air takes the highs. */
export function airCutoff(d: number, f: Falloff): number {
  return Math.max(700, Math.min(20000, 20000 * Math.exp(-Math.max(0, d - f.ref) / f.air)));
}

/** Below this level a sound is not played at all (no nodes for what nobody would hear). */
export const INAUDIBLE = 0.003;

/**
 * Occlusion's effect (one ray when the sound starts): `blocked` by the world between the
 * listener and the source; `floors` whether they are on different storeys (more than a storey
 * apart in height) with it blocked: a floor is heavier than a wall.
 */
export function occlusion(blocked: boolean, floors: boolean) {
  if (!blocked) return { gain: 1, cutoff: 20000 };
  return floors
    ? { gain: OCCLUDED.floorGain, cutoff: OCCLUDED.floorCutoff }
    : { gain: OCCLUDED.gain, cutoff: OCCLUDED.cutoff };
}
