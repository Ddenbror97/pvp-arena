/** Police (seat A) and Terrorist (seat B), fitted in Blender (art/blender/chars). */
export const CHARACTER_MODELS = {
  police: "/fps/models/police-swat.glb",
  terrorist: "/fps/models/terrorist-fighter.glb",
} as const;

/** Shared by intent preloading and model loaders so their cache URLs cannot drift. */
export const ARENA_MODELS = {
  rifle: "/fps/models/ak47-authored.glb",
  /** Police M4A1 (art/blender/m4): suppressed, carry handle, on the shared arm rig. */
  m4: "/fps/models/m4a1-authored.glb",
  /** AWP (art/blender/awp) merged onto each team's arm rig: Terrorist (AK rig), Police (M4 rig). */
  awpTerrorist: "/fps/models/awp-terrorist.glb",
  awpPolice: "/fps/models/awp-police.glb",
  /** Karambit (art/blender/karambit): knife mesh, attachment markers and animation clips. */
  karambit: "/fps/models/karambit.glb",
  /** HE · smoke · incendiary (art/blender/grenades): models, moving parts, first-person clips. */
  grenades: "/fps/models/grenades.glb",
  ...CHARACTER_MODELS,
} as const;

/**
 * Battle royale guns (owner, 2026-11-09: BR only, so the 1v1/5v5 lobby does not prefetch them):
 * MP5 (art/blender/mp5) and Desert Eagle (art/blender/deagle) merged onto each team's arm rig.
 */
export const BR_GUN_MODELS = {
  mp5Terrorist: "/fps/models/mp5-terrorist.glb",
  mp5Police: "/fps/models/mp5-police.glb",
  deagleTerrorist: "/fps/models/deagle-terrorist.glb",
  deaglePolice: "/fps/models/deagle-police.glb",
} as const;

/**
 * Third-person rifles for remote operators (art/blender/build_world_rifles.mjs): the authored
 * rifles without the first-person arm rig, simplified, 512 px textures. Used where many
 * operators are on screen (Bomb Defusal); the 1v1 keeps the full files.
 */
export const WORLD_RIFLES = {
  ak: "/fps/models/ak47-world.glb",
  m4: "/fps/models/m4a1-world.glb",
  awp: "/fps/models/awp-world.glb",
  mp5: "/fps/models/mp5-world.glb",
  deagle: "/fps/models/deagle-world.glb",
} as const;

/** Bomb Defusal only (not preloaded with the duel's arena models). */
export const BOMB_MODELS = {
  /** C4 (art/blender/c4): the device, keypad morphs, plant clips on a control rig. */
  c4: "/fps/models/c4.glb",
} as const;
