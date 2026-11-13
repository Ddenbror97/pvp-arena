/**
 * Cutouts from the two dealer sheets, aligned on one canvas.
 * Sheet B is scaled so her face matches sheet A. See manifest.json.
 */
import idleUrl from "../../assets/poker/dealer/frames/idle.webp";
import manifest from "../../assets/poker/dealer/manifest.json";

export const DEALER_CANVAS = manifest.canvas;
const anchorX = manifest.anchor[0];
const anchorY = manifest.anchor[1];
if (anchorX == null || anchorY == null) throw new Error("dealer manifest is missing its anchor");
export const DEALER_ANCHOR = {
  x: anchorX / manifest.canvas.w,
  y: anchorY / manifest.canvas.h,
};
/** Deck in her hands on the idle frame, as a fraction of the shared canvas. */
export const DEALER_DECK = { x: 0.39, y: 0.91 };

export const DEALER_IDLE_URL = idleUrl;

// The glob is eager: it is a table of URLs, not of images. A lazy one made every pose its own
// 60-byte script, fetched before the image it names could even be requested.
const urls = import.meta.glob("../../assets/poker/dealer/frames/*.webp", {
  query: "?url",
  import: "default",
  eager: true,
}) as Record<string, string>;

const frameUrls = new Map<string, string>(
  Object.entries(urls).map(([path, url]) => [path.slice(path.lastIndexOf("/") + 1, -5), url]),
);

const cache = new Map<string, string>([["idle", idleUrl]]);
const pending = new Map<string, Promise<string>>();

/** A frame that has already been fetched. Used so a paint can skip the idle stand-in. */
export function peekDealerFrame(id: string): string | null {
  return cache.get(id) ?? null;
}

async function decoded(url: string): Promise<void> {
  if (typeof window === "undefined") return;
  const img = new Image();
  img.decoding = "async";
  img.src = url;
  await img.decode().catch(() => {});
}

/**
 * Fetch and decode one pose. Calls made while a load is in flight share that
 * promise. The cache is updated only after the image is decoded, so a second caller
 * cannot be handed the idle image in place of the pose it asked for.
 */
export function loadDealerFrame(id: string): Promise<string> {
  const hit = cache.get(id);
  if (hit) return Promise.resolve(hit);
  const inflight = pending.get(id);
  if (inflight) return inflight;
  const url = frameUrls.get(id);
  if (!url) return Promise.reject(new Error(`missing dealer frame ${id}`));
  const promise = decoded(url).then(() => {
    cache.set(id, url);
    pending.delete(id);
    return url;
  });
  pending.set(id, promise);
  return promise;
}

/** Poses the live table can show. Gallery-only expressions load on demand. */
export const DEALER_CORE_FRAMES = [
  "idle",
  "wink",
  "shuffle-01",
  "shuffle-02",
  "shuffle-03",
  "shuffle-05",
  "deal-out-1",
  "deal-out-2",
  "deal-back-1",
  "deal-back-2",
  "waiting",
  "celebrate",
] as const;

export function preloadDealerFrames(ids: readonly string[] = DEALER_CORE_FRAMES): Promise<void> {
  return Promise.all(ids.map((id) => loadDealerFrame(id).catch(() => idleUrl))).then(() => {});
}
