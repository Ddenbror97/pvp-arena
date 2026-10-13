import stage from "@/assets/slott/stage.webp";

/** Full-bleed art behind the reel symbols. Native 1024×850, almost the 5×4 window. */
export const SLOT_STAGE = stage;

let warming = false;

/**
 * Fetch and decode the reel backdrop before a client navigation paints the reels.
 * A detached Image is low priority unless fetchPriority is set, so the first call
 * asks for high and later calls do nothing.
 */
export function warmSlotStage(): void {
  if (typeof window === "undefined" || warming) return;
  warming = true;
  const img = new Image();
  img.decoding = "async";
  img.fetchPriority = "high";
  img.src = SLOT_STAGE;
  void img.decode().catch(() => {});
}
