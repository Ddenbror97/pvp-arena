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
    // The server opens the next row as the last spin stops and starts its clock a few seconds later.
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

/**
 * Before the betting clock starts the bar fills from the row's opening to full, then it drains
 * from 1 at the opening of the betting window to 0 at its end. 0 outside a betting round.
 */
export function rouletteBarFill(
  active: boolean,
  opensAt: string | null,
  startedAt: string | null,
  endsAt: string | null,
  nowMs: number,
): number {
  if (!active || !startedAt || !endsAt) return 0;
  const start = Date.parse(startedAt);
  const end = Date.parse(endsAt);
  const duration = end - start;
  if (!Number.isFinite(duration) || duration <= 0 || nowMs >= end) return 0;
  if (nowMs < start) {
    const open = opensAt ? Date.parse(opensAt) : NaN;
    if (!Number.isFinite(open) || open >= start) return 1;
    return Math.min(1, Math.max(0, (nowMs - open) / (start - open)));
  }
  return (end - nowMs) / duration;
}
