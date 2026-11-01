/**
 * Character set (seat A = Police, seat B = Terrorist):
 * - "sourced": downloaded, artist-made characters fitted in Blender (art/blender/chars/fit_sourced.py),
 *   each with its own head;
 * - "operators": the script-built Blender characters on the shared fitted head;
 * - "legacy": the previous shared Mixamo tactical body with runtime tinting.
 * Switch here to roll back without touching any other file (all GLBs are kept).
 */
export const CHARACTER_SET = "sourced" as "sourced" | "operators" | "legacy";

export const CHARACTER_MODELS = {
  policeSourced: "/fps/models/police-swat.glb",
  terroristSourced: "/fps/models/terrorist-fighter.glb",
  police: "/fps/models/police-operator.glb",
  terrorist: "/fps/models/terrorist-insurgent.glb",
  legacy: "/fps/models/tactical-body.glb",
} as const;

/** Shared by intent preloading and model loaders so their cache URLs cannot drift. */
export const ARENA_MODELS = {
  rifle: "/fps/models/ak47-authored.glb",
  head: "/fps/models/reference-head-webp.glb",
  ...(CHARACTER_SET === "sourced"
    ? { police: CHARACTER_MODELS.policeSourced, terrorist: CHARACTER_MODELS.terroristSourced }
    : CHARACTER_SET === "operators"
      ? { police: CHARACTER_MODELS.police, terrorist: CHARACTER_MODELS.terrorist }
      : { body: CHARACTER_MODELS.legacy }),
} as const;
