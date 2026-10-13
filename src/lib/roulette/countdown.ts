/** Label and fill for the roulette countdown. One clock, so the bar cannot say a round is waiting while it is already counting. */

export type CountdownRound = {
  status: string;
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

/** 1 at the opening of the betting window, 0 before it starts and after it ends. */
export function rouletteBarFill(
  active: boolean,
  startedAt: string | null,
  endsAt: string | null,
  nowMs: number,
): number {
  if (!active || !startedAt || !endsAt) return 0;
  const start = Date.parse(startedAt);
  const end = Date.parse(endsAt);
  const duration = end - start;
  if (!Number.isFinite(duration) || duration <= 0 || nowMs < start || nowMs >= end) return 0;
  return (end - nowMs) / duration;
}
