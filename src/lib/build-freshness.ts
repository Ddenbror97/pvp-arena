/**
 * A page left open across a deploy (owner, 2026-11-24: "stuck in loading screen, have to click
 * re-try, then hanging in the air"; a hard refresh fixed it). After a deploy the old page's
 * server functions (the match admission) and lazily loaded chunks no longer exist on the server,
 * and the old client cannot join the new match servers. Each build has an id, baked into the
 * client and published at /build.json; before joining a match, and when a chunk fails to load,
 * a page that is not the deployed build reloads itself once.
 */
declare const __APP_BUILD__: string | undefined;

const BUILD = typeof __APP_BUILD__ === "string" ? __APP_BUILD__ : null;
const RELOADED_KEY = "app-reloaded-for-build";

/** The deployed build's id, or null (development, offline, no file). */
export async function deployedBuild(): Promise<string | null> {
  try {
    const response = await fetch("/build.json", { cache: "no-store" });
    if (!response.ok) return null;
    const data = (await response.json()) as { id?: unknown };
    return typeof data.id === "string" && data.id ? data.id : null;
  } catch {
    return null;
  }
}

/** Reload once for a given deployed build (a page that still differs after it carries on). */
function reloadFor(id: string): boolean {
  try {
    if (sessionStorage.getItem(RELOADED_KEY) === id) return false;
    sessionStorage.setItem(RELOADED_KEY, id);
  } catch {
    // Storage blocked: reload anyway (a fresh page then matches the deployed build).
  }
  location.reload();
  return true;
}

/**
 * True when this page is not the deployed build and is reloading now (the caller stops).
 * False in development, when the build cannot be told, or when it is the deployed build.
 */
export async function reloadIfStale(): Promise<boolean> {
  if (!BUILD || typeof window === "undefined") return false;
  const deployed = await deployedBuild();
  if (!deployed || deployed === BUILD) return false;
  return reloadFor(deployed);
}

/** A lazily loaded chunk failed (Vite's preload error): reload if a new build is deployed. */
export function installStaleChunkReload() {
  if (!BUILD || typeof window === "undefined") return;
  window.addEventListener("vite:preloadError", (event) => {
    void reloadIfStale().then((reloading) => {
      if (reloading) event.preventDefault();
    });
  });
}
