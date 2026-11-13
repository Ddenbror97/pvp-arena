import { PERK_EFFECT, perkOn, type TabletState } from "./perks";

/**
 * The battle royale's own reload timing for the first-person clips (owner, 2026-11-11: "reload
 * animation is laggy compared to 1v1/5v5 … the AWP"). As in 1v1/5v5 (renderer.ts), the clips
 * and the AWP's bolt take the reload's progress, 0 at the start and 1 at the end, measured
 * against the reload's real length (the Quick Hands perk shortens it, combat.ts startReload).
 */
export function reloadLengthMs(reloadMs: number, tablet: TabletState | null | undefined) {
  return reloadMs * (perkOn(tablet, "quick-hands") ? PERK_EFFECT.reload : 1);
}

/** Progress 0..1 of a reload ending at `until` (server clock), or 0 when none runs. */
export function reloadProgress(until: number, serverNow: number, lengthMs: number) {
  const left = until ? Math.max(0, until - serverNow) : 0;
  if (left <= 0 || lengthMs <= 0) return 0;
  return Math.min(1, Math.max(0, 1 - left / lengthMs));
}

/**
 * A shell-by-shell reload (items.ts `shells`; the SPAS-12): how far its running stage is, 0 → 1,
 * and the stage's real length (Quick Hands shortens every stage, combat.ts). The stage ends at
 * `until`; past it (the next stage's snapshot not here yet) the answer stays 1, so the clip
 * holds its last pose instead of dropping to rest for a frame.
 */
export function shellStage(
  tube: { startMs: number; insertMs: number; endMs: number },
  shells: { stage: 0 | 1 | 2 },
  until: number,
  serverNow: number,
  tablet: TabletState | null | undefined,
) {
  const ms = reloadLengthMs(
    shells.stage === 0 ? tube.startMs : shells.stage === 1 ? tube.insertMs : tube.endMs,
    tablet,
  );
  return { ms, progress: Math.min(1, Math.max(0, 1 - (until - serverNow) / ms)) };
}

/** The clip time (0..1, 0 at rest) and the AWP bolt's clip ms for a reload at `progress`. */
export function reloadClip(progress: number, awpReloadMs: number) {
  const t = progress > 0 && progress < 1 ? progress : 0;
  return { t, boltMs: t * awpReloadMs };
}
