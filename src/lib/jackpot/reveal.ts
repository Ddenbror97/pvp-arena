/**
 * How long a settled jackpot stays on screen. The wheel and the winner card
 * are presentation; the timestamps on the completed row are the clock.
 * Same lengths as the wheel and the stage, so a viewer who opens the page
 * mid-spin lands on the same frame as someone who never left.
 */
export const JACKPOT_SPIN_MS = 10_600;
export const JACKPOT_WINNER_MS = 6_500;

type RevealGame = {
  status: string;
  completed_at?: string | null;
  scheduled_end_at?: string | null;
};

/** Server-clock ms when the wheel should start, or null when this row is not a reveal. */
export function jackpotSpinStart(game: RevealGame | null | undefined): number | null {
  if (!game || game.status !== "COMPLETED" || !game.completed_at) return null;
  const done = Date.parse(game.completed_at);
  if (!Number.isFinite(done)) return null;
  const scheduled = game.scheduled_end_at ? Date.parse(game.scheduled_end_at) : done;
  const deadline = Number.isFinite(scheduled) ? scheduled : done;
  // Settlement can land after the countdown. The spin starts at the later of the two.
  return Math.max(deadline, done);
}

export function jackpotRevealEnds(game: RevealGame | null | undefined): number | null {
  const start = jackpotSpinStart(game);
  return start == null ? null : start + JACKPOT_SPIN_MS + JACKPOT_WINNER_MS;
}

/** True while the wheel or the winner card should still be showing. */
export function inJackpotReveal(game: RevealGame | null | undefined, now = Date.now()): boolean {
  const ends = jackpotRevealEnds(game);
  return ends != null && now < ends;
}

/**
 * The round still on the wheel wins over the empty game the server opens the
 * moment a draw settles. After the winner card, the open game is the round.
 */
export function preferJackpotRound<T extends RevealGame>(
  open: T | null,
  settled: T | null,
  now = Date.now(),
): T | null {
  if (settled && inJackpotReveal(settled, now)) return settled;
  return open;
}
