import { ARENA_MODELS } from "./model-assets";
import { warmStrikeLoadingImage } from "./loading";

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
  warmStrikeLoadingImage();
  warmArenaRenderer();
  assets ??= Promise.all(
    Object.values(ARENA_MODELS).map(async (url) => {
      const response = await fetch(url, { cache: "force-cache" });
      if (!response.ok) throw Error("Arena asset unavailable");
      await response.arrayBuffer();
    }),
  ).catch(() => {
    assets = undefined;
  });
}
