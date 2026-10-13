import { REELS, ROWS, SYMBOLS, type LineWin } from "@/lib/slott/paytable";
import { hitsDoneMs } from "./hits";

/**
 * After the reels land, each reel "cashes in" its symbol points left to right.
 * Purely presentational: it replays the score the server already computed.
 */
export const TALLY_STEP_MS = 130;

/** Points per reel (sum of symbol values in that column). */
export function reelValues(grid: number[]): number[] {
  return Array.from({ length: REELS }, (_, r) =>
    grid.slice(r * ROWS, r * ROWS + ROWS).reduce((a, s) => a + (SYMBOLS[s]?.value ?? 0), 0),
  );
}

/** Lines draw first (the bigger moment), then the base points count in. */
export function tallyStartMs(lines: LineWin[]): number {
  return lines.length ? hitsDoneMs(lines) + 160 : 120;
}

/** When the seat score should take the spin's points (the next turn may cut this short). */
export function tallyEndMs(lines: LineWin[]): number {
  return tallyStartMs(lines) + REELS * TALLY_STEP_MS + 200;
}
