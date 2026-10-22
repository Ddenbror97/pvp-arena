/** The strip currently animating. A second start with the same token is ignored; cleanup retires only its own token. */
export function claimReelRun(ran: { current: string | null }, token: string): boolean {
  if (ran.current === token) return false;
  ran.current = token;
  return true;
}

export function releaseReelRun(ran: { current: string | null }, token: string) {
  if (ran.current === token) ran.current = null;
}

/** Landed window is the server column. Filler never replaces it. */
export function reelStrip(
  spin: { pending: boolean; head: number[]; filler: number[]; column: number[] } | null,
  idle: number[],
): number[] {
  if (!spin) return idle;
  return spin.pending
    ? [...spin.head, ...spin.filler, ...spin.head]
    : [...spin.head, ...spin.filler, ...spin.column];
}

export function visibleColumn(strip: number[], rows: number): number[] {
  return strip.slice(Math.max(0, strip.length - rows));
}
