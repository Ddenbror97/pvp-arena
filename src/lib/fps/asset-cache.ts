import { brAssetFingerprint, loadBrAssetHashes, type BrAssetHashes } from "./br/asset-download";

/**
 * The game's files outside the BR island (characters, weapons, sounds, animation clips: shared
 * by 1v1, Defuse the Bomb and the battle royale), reused from the browser's store without asking
 * the server when their content is still the deployed file (final performance audit,
 * 2026-11-24).
 *
 * The site serves them with `max-age=0, must-revalidate`, so every match asked the server
 * about each of them again (about 105 requests per match). The production build lists every
 * file under public/fps by content (scripts/emit-br-asset-hashes.ts, the BR island's own list
 * aside); a file whose stored copy has the listed fingerprint is used as it is, and one that
 * does not is fetched afresh. As for the island (br/asset-download.ts): the list is asked for
 * once per page load, and without it (development, tests, a failed request, no SubtleCrypto)
 * everything is fetched as before.
 */
export const FPS_ASSET_HASHES = "/fps/asset-hashes.json";
declare const __FPS_ASSET_HASHES__: boolean | undefined;
export const fpsAssetHashesBuilt = () =>
  typeof __FPS_ASSET_HASHES__ !== "undefined" && __FPS_ASSET_HASHES__ === true;

let list: Promise<BrAssetHashes | null> | null = null;
/** The deploy's list (once per page load; asked for again after a failure). */
export function fpsAssetHashes(): Promise<BrAssetHashes | null> {
  if (!fpsAssetHashesBuilt() || typeof fetch === "undefined") return Promise.resolve(null);
  return (list ??= loadBrAssetHashes(
    new URL(FPS_ASSET_HASHES, location.href).href,
    new AbortController().signal,
  ).then((hashes) => {
    if (!hashes) list = null;
    return hashes;
  }));
}

/** The list's key for a URL of a file under /fps/ (not the island's /fps/br/), or null. */
export function fpsAssetKey(url: string): string | null {
  const at = url.indexOf("/fps/");
  if (at < 0) return null;
  const end = url.search(/[?#]/);
  const key = url.slice(at + "/fps/".length, end < 0 ? undefined : end);
  return key && !key.startsWith("br/") ? key : null;
}

/**
 * `fetch(url)` for one of the game's files: the stored copy when it is the deployed file,
 * otherwise (and whenever the list is unavailable) the network, as before. Resolves with a
 * Response like fetch; rejects only where fetch would.
 */
export async function fetchFpsAsset(url: string, hashes = fpsAssetHashes()): Promise<Response> {
  const key = fpsAssetKey(url);
  const expected = key ? ((await hashes)?.get(key) ?? null) : null;
  if (!expected) return fetch(url);
  try {
    const stored = await fetch(url, { cache: "force-cache" });
    if (stored.ok) {
      const data = await stored.arrayBuffer();
      if ((await brAssetFingerprint(data)) === expected)
        return new Response(data, { status: 200, headers: stored.headers });
    } else void stored.body?.cancel().catch(() => {});
  } catch {
    // Asked of the server below.
  }
  // Not the deployed file (an older deploy's copy, or none stored): ask the server.
  return fetch(url, { cache: "no-cache" });
}
