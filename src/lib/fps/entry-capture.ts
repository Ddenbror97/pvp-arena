import { capturePointer } from "./pointer-capture";

let generation = 0;
let cancelledGeneration = -1;
let owner: string | null = null;
/** Preserve the Start/Join click's mouse permission across asynchronous loading in this SPA. */
export function reserveArenaPointer(matchId?: string) {
  if (typeof document === "undefined") return;
  const attempt = ++generation;
  owner = matchId ?? null;
  void capturePointer(document.body)
    .then(() => {
      if (
        attempt === generation &&
        attempt === cancelledGeneration &&
        document.pointerLockElement === document.body
      )
        document.exitPointerLock();
    })
    .catch(() => {
      /* Direct-entry browsers can still capture on a canvas click. */
    });
}
export function claimArenaPointer(matchId: string) {
  owner ??= matchId;
}
export function releaseArenaPointer(matchId?: string) {
  if (matchId && owner !== matchId) return;
  cancelledGeneration = generation;
  owner = null;
  if (typeof document !== "undefined" && document.pointerLockElement === document.body)
    document.exitPointerLock();
}
