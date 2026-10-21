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
export const DEALER_DECK = { x: 0.4, y: 0.91 };

export const DEALER_IDLE_URL = idleUrl;

const loaders = import.meta.glob("../../assets/poker/dealer/frames/*.webp", {
  query: "?url",
  import: "default",
}) as Record<string, () => Promise<string>>;

const cache = new Map<string, string>([["idle", idleUrl]]);
const pending = new Map<string, Promise<string>>();

function loaderFor(id: string): (() => Promise<string>) | undefined {
  const suffix = `/${id}.webp`;
  const key = Object.keys(loaders).find((k) => k.endsWith(suffix));
  return key ? loaders[key] : undefined;
}

/** A frame that has already been fetched. Used so a paint can skip the idle stand-in. */
export function peekDealerFrame(id: string): string | null {
  return cache.get(id) ?? null;
}

/**
 * Resolve and decode one pose. Calls made while a load is in flight share that
 * promise. The cache is updated only after the URL is known, so a second caller
 * cannot be handed the idle image in place of the pose it asked for.
 */
export function loadDealerFrame(id: string): Promise<string> {
  const hit = cache.get(id);
  if (hit) return Promise.resolve(hit);
  const inflight = pending.get(id);
  if (inflight) return inflight;
  const load = loaderFor(id);
  if (!load) return Promise.reject(new Error(`missing dealer frame ${id}`));
  const promise = load()
    .then(async (url) => {
      if (typeof window !== "undefined") {
        const img = new Image();
        img.decoding = "async";
        img.src = url;
        await img.decode().catch(() => {});
      }
      cache.set(id, url);
      pending.delete(id);
      return url;
    })
    .catch((err: unknown) => {
      pending.delete(id);
      throw err;
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
  "deal-02",
  "deal-05",
  "waiting",
  "celebrate",
] as const;

export function preloadDealerFrames(ids: readonly string[] = DEALER_CORE_FRAMES): Promise<void> {
  return Promise.all(ids.map((id) => loadDealerFrame(id).catch(() => idleUrl))).then(() => {});
}

export function dealerFrameIds(): string[] {
  return manifest.frames.map((frame: { id: string }) => frame.id);
}
