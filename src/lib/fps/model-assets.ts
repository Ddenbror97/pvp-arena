/** Shared by intent preloading and model loaders so their cache URLs cannot drift. */
export const ARENA_MODELS = {
  rifle: "/fps/models/ak47-authored.glb",
  body: "/fps/models/tactical-body.glb",
  head: "/fps/models/reference-head-webp.glb",
} as const;
