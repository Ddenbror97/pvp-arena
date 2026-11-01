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
  ...CHARACTER_MODELS,
} as const;
