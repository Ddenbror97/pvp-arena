let renderer: Promise<typeof import("./renderer")> | undefined;
/** Download/parse on match intent, instantiate WebGL only inside the match. */
export function loadArenaRenderer() {
  return (renderer ??= import("./renderer").catch((error) => {
    renderer = undefined;
    throw error;
  }));
}
export function warmArenaRenderer() {
  if (typeof window !== "undefined") void loadArenaRenderer().catch(() => {});
}
let assets: Promise<unknown> | undefined;
/** Explicit create/join intent only; keep ordinary site navigation lightweight. */
export function warmArenaAssets() {
  warmArenaRenderer();
  assets ??= Promise.all(
    ["ak47-authored.glb", "tactical-body.glb", "reference-head-webp.glb"].map(async (name) => {
      const response = await fetch(`/fps/models/${name}`, { cache: "force-cache" });
      if (!response.ok) throw Error("Arena asset unavailable");
      await response.arrayBuffer();
    }),
  ).catch(() => {
    assets = undefined;
  });
}
