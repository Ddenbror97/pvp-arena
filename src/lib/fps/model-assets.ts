/** Police (seat A) and Terrorist (seat B), fitted in Blender (art/blender/chars). */
export const CHARACTER_MODELS = {
  police: "/fps/models/police-swat.glb",
  terrorist: "/fps/models/terrorist-fighter.glb",
} as const;

/** Shared by intent preloading and model loaders so their cache URLs cannot drift. */
export const ARENA_MODELS = {
  rifle: "/fps/models/ak47-authored.glb",
  ...CHARACTER_MODELS,
} as const;
