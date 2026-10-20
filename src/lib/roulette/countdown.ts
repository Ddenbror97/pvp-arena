/** Label and fill for the roulette countdown. One clock, so the bar cannot say a round is waiting while it is already counting. */

export type CountdownRound = {
  status: string;
  created_at?: string | null;
  betting_seconds?: number | null;
  betting_started_at?: string | null;
  betting_ends_at?: string | null;
  spin_start_at?: string | null;
  spin_end_at?: string | null;
};

export function rouletteBarLabel(game: CountdownRound | null, nowMs: number): string {
  if (!game || game.status === "WAITING") return "Waiting for the first bet";
  if (game.status === "BETTING") {
    const end = game.betting_ends_at ? Date.parse(game.betting_ends_at) : NaN;
    if (!Number.isFinite(end) || end <= nowMs) return "";
    // The server opens the next row as the last spin stops and starts its clock 1.5s later.
    const start = game.betting_started_at ? Date.parse(game.betting_started_at) : NaN;
    if (Number.isFinite(start) && nowMs < start)
      return `Next round in ${((start - nowMs) / 1000).toFixed(1)}s`;
    const seconds = Number(game.betting_seconds);
    const left = (end - nowMs) / 1000;
    const shown = Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds, left) : left;
    return `Rolling in ${shown.toFixed(1)}s`;
  }
  if (game.status === "LOCKED" || game.status === "SPINNING") return "";
  if (game.status === "SETTLEMENT" || game.status === "COMPLETED" || game.status === "CANCELLED")
    return "";
  return "Waiting for the first bet";
}

export const RESULT_HOLD_MS = 1500;
export const RESULT_HOLD_MAX_MS = 6000;

/**
 * When the finished round's result stops being shown: at the next round's betting start, but no
 * sooner than RESULT_HOLD_MS and no later than RESULT_HOLD_MAX_MS after the spin ended. Without a
 * known next start (NaN) the result is held for RESULT_HOLD_MS.
 */
export function resultHoldUntil(spinEndMs: number, nextStartMs: number): number {
  if (!Number.isFinite(nextStartMs)) return spinEndMs + RESULT_HOLD_MS;
  return Math.max(
    spinEndMs + RESULT_HOLD_MS,
    Math.min(nextStartMs, spinEndMs + RESULT_HOLD_MAX_MS),
  );
}

/**
 * Where a round's drain starts. A round first shown before its betting clock starts drains from
 * the row's opening, so the bar keeps moving down through the gap instead of freezing or refilling.
 * Otherwise it drains from the betting start. NaN when the round has no betting window.
 */
export function rouletteBarAnchor(
  opensAt: string | null,
  startedAt: string | null,
  firstSeenMs: number,
): number {
  const start = startedAt ? Date.parse(startedAt) : NaN;
  if (!Number.isFinite(start) || firstSeenMs >= start) return start;
  const open = opensAt ? Date.parse(opensAt) : NaN;
  return Number.isFinite(open) && open < start ? open : start;
}

/** Drains from 1 at the anchor to 0 at the betting end; never rises. 0 outside a betting round. */
export function rouletteBarFill(
  active: boolean,
  anchorMs: number,
  endsAt: string | null,
  nowMs: number,
): number {
  if (!active || !endsAt) return 0;
  const end = Date.parse(endsAt);
  const duration = end - anchorMs;
  if (!Number.isFinite(duration) || duration <= 0 || nowMs >= end) return 0;
  return Math.min(1, (end - nowMs) / duration);
}
