import { ROWS, WILD } from "@/lib/slott/paytable";

/** Shown before the first spin (the machine at rest). Reel-major, like the server grid. */
export const IDLE_GRID = [0, 5, 10, 15, 1, 6, 11, 16, 7, 8, 12, 17, 3, 2, 13, 18, 4, 9, 14, 19];

export interface ReelSpin {
  key: string;
  grid: number[];
  prev: number[];
  /** Local clock ms when the reels started (server reveal_at − spin_ms, offset-corrected). */
  startAt: number;
  durationMs: number;
  /** Result not in yet. The strip loops instead of landing. */
  pending?: boolean;
}

/** A shown spin is never shorter than this. Seeking a late clock is what snaps the board. */
const MIN_VISIBLE_MS = 2400;

/**
 * `openedOn` is the spin already on the board when this view armed.
 * `undefined` means the board is not armed yet. `null` means it was empty.
 * Any later spin plays, even if the server window has already closed.
 */
export function spinArrivedLive(openedOn: number | null | undefined, spinNo: number): boolean {
  if (openedOn === undefined) return false;
  return openedOn == null || spinNo > openedOn;
}

/**
 * Clock for the spin the viewer actually sees.
 * Always plays forward from `now`. A negative delay parks every reel on the
 * result, which is the flat "already landed" board. A refresh of a spin that
 * already finished does not replay.
 */
export function presentSpinStart(
  serverStartAt: number,
  durationMs: number,
  now = Date.now(),
  clickedAt?: number | null,
  liveArrival = false,
): { startAt: number; durationMs: number } | null {
  const duration = Math.max(durationMs, MIN_VISIBLE_MS);
  if (clickedAt != null || liveArrival) return { startAt: now, durationMs: duration };
  const elapsed = now - serverStartAt;
  if (elapsed >= 0 && elapsed < duration) return { startAt: now, durationMs: duration };
  return null;
}

const NORMAL = [0.42, 0.52, 0.62, 0.72, 0.84];
/** Added to every shown spin so the reels run a little longer than the server window. */
const SPIN_PAD_MS = 280;

/** Two or more WILDs on the first three reels. The reel travel stays the same; this only marks the sound. */
export function teases(grid: number[]): boolean {
  let n = 0;
  for (let c = 0; c < 3 * ROWS; c++) if (grid[c] === WILD) n++;
  return n >= 2;
}

/**
 * Offsets (ms from start) at which each reel stops.
 * Every spin uses the same curve. A second curve made some rounds travel
 * a different distance and read as a skipped or broken spin.
 */
export function reelStops(_grid: number[], durationMs: number): number[] {
  const span = durationMs + SPIN_PAD_MS;
  return NORMAL.map((f) => Math.round(f * span));
}

export function landedAt(spin: Pick<ReelSpin, "grid" | "startAt" | "durationMs">): number {
  return spin.startAt + reelStops(spin.grid, spin.durationMs)[4]!;
}
