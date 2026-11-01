/**
 * Character set. "operators" = the Blender-built Police (seat A) and Terrorist (seat B)
 * characters; "legacy" = the previous shared Mixamo tactical body with runtime tinting.
 * Flip to "legacy" to roll back without touching any other file (the old GLB is kept).
 */
export const CHARACTER_SET = "operators" as "operators" | "legacy";

export const CHARACTER_MODELS = {
  police: "/fps/models/police-operator.glb",
  terrorist: "/fps/models/terrorist-insurgent.glb",
  legacy: "/fps/models/tactical-body.glb",
} as const;

/** Shared by intent preloading and model loaders so their cache URLs cannot drift. */
export const ARENA_MODELS = {
  rifle: "/fps/models/ak47-authored.glb",
  head: "/fps/models/reference-head-webp.glb",
  ...(CHARACTER_SET === "operators"
    ? { police: CHARACTER_MODELS.police, terrorist: CHARACTER_MODELS.terrorist }
    : { body: CHARACTER_MODELS.legacy }),
} as const;
