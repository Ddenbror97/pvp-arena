/**
 * Presentation math for the roulette strip.
 * The server already chose the slot; this only maps server time onto the track.
 */

const SUBPIXEL = 64;

// One third at full speed, a brake through 5/9, then the crawl.
// On the 7s server clock that is about 2.3s, 1.6s, and 3.1s.
// Late speeds stay low so most of the track is the opening blur.
// Position is the integral of that speed, so the pace never jumps.
const FAST_T = 3 / 9;
const SLOW_T = 5 / 9;
const EASE_T = [0, FAST_T, (FAST_T + SLOW_T) / 2, SLOW_T, 0.72, 0.84, 0.94, 1];
const EASE_V = [1, 1, 0.48, 0.26, 0.12, 0.045, 0.012, 0];
const EASE_D = [0];
for (let i = 0; i < EASE_T.length - 1; i++) {
  const dt = EASE_T[i + 1]! - EASE_T[i]!;
  EASE_D.push(EASE_D[i]! + (dt * (EASE_V[i]! + EASE_V[i + 1]!)) / 2);
}
const EASE_TOTAL = EASE_D[EASE_D.length - 1] || 1;

const SPIN_STATES = new Set(["LOCKED", "SPINNING", "SETTLEMENT", "COMPLETED"]);

function at(value: string | null | undefined): number {
  if (!value) return 0;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
}

/**
 * Strip clock. Betting-window end starts the roll so the strip does not wait
 * for the worker to flip LOCKED. Official spin duration still sets the land.
 */
export function stripClock(
  game: {
    status?: string | null;
    betting_ends_at?: string | null;
    spin_start_at?: string | null;
    spin_end_at?: string | null;
    spin_ms?: number | null;
  } | null,
  ms: number,
): { start: number; end: number; spinning: boolean } {
  if (!game) return { start: 0, end: 0, spinning: false };
  const officialStart = at(game.spin_start_at);
  const officialEnd = at(game.spin_end_at);
  const betEnd = at(game.betting_ends_at);
  const cfg = Number(game.spin_ms);
  const duration =
    officialEnd > officialStart
      ? officialEnd - officialStart
      : Number.isFinite(cfg) && cfg > 0
        ? cfg
        : 0;
  const status = game.status ?? "";
  const inSpin = SPIN_STATES.has(status);
  const bettingClosed = betEnd > 0 && ms >= betEnd && (status === "BETTING" || inSpin);
  const start = bettingClosed ? betEnd : officialStart;
  const end = start > 0 && duration > 0 ? start + duration : 0;
  const spinning = start > 0 && end > start && (inSpin || (status === "BETTING" && bettingClosed));
  return { start, end, spinning };
}

export function stripEase(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  let i = 0;
  while (i < EASE_T.length - 2 && x > EASE_T[i + 1]!) i++;
  const t0 = EASE_T[i]!;
  const dt = EASE_T[i + 1]! - t0;
  const u = dt > 0 ? (x - t0) / dt : 1;
  const v0 = EASE_V[i]!;
  const v1 = EASE_V[i + 1]!;
  const raw = EASE_D[i]! + dt * (v0 * u + ((v1 - v0) * u * u) / 2);
  return raw / EASE_TOTAL;
}

/**
 * The strip starts on the server's spin clock even before the winning slot reaches
 * this browser. Until then it heads for `aim`; once the slot is known (`steerAt`),
 * the remaining distance is re-spread over the rest of the ease, so the motion stays
 * continuous and still stops on `target` at `end`.
 */
export function stripOffset(input: {
  ms: number;
  spinning: boolean;
  start: number;
  end: number;
  base: number;
  target: number | null;
  aim?: number;
  steerAt?: number | null;
}): number {
  const { ms, spinning, start, end, base, target } = input;
  if (!(spinning && end > start)) return base;
  const span = end - start;
  const e = stripEase((ms - start) / span);
  const aim = input.aim ?? target ?? base;
  if (target == null) return base + (aim - base) * e;
  const steerAt = input.steerAt ?? null;
  if (steerAt == null || steerAt <= start || aim === target) return base + (target - base) * e;
  const from = stripEase((steerAt - start) / span);
  if (from >= 1) return target;
  const path = base + (aim - base) * e;
  if (e <= from) return path;
  return path + (target - aim) * ((e - from) / (1 - from));
}

/**
 * Snap to 1/64 CSS pixel. Whole-pixel rounding holds the slow tail still and
 * then jumps a full pixel, which reads as jitter on every spin.
 */
export function stripTranslateX(width: number, offset: number): number {
  return Math.round((width / 2 - offset) * SUBPIXEL) / SUBPIXEL;
}

export function stripTranslate(width: number, offset: number): string {
  return `translate3d(${stripTranslateX(width, offset)}px,0,0)`;
}

/**
 * Furthest stop from the center of the 108px coin. The artwork's metal lip
 * starts well inside the box, so a stop near 49px reads as the gap.
 */
const LAND_FACE = 34;
export const STRIP_COIN = 108;
export const STRIP_GAP = 8;
export const STRIP_TILE = STRIP_COIN + STRIP_GAP;

export type StripMetrics = { coin: number; gap: number; tile: number; compact: boolean };

/** Phone widths fit four larger coins. Wider screens keep the 108px coin. */
export function stripMetrics(width: number): StripMetrics {
  const full = { coin: STRIP_COIN, gap: STRIP_GAP, tile: STRIP_TILE, compact: false };
  if (!(width > 0) || width >= STRIP_TILE * 4) return full;
  const pitch = width / 4;
  const gap = pitch < 72 ? 4 : 8;
  const coin = Math.min(STRIP_COIN, Math.max(56, Math.floor(pitch - gap)));
  return { coin, gap, tile: coin + gap, compact: true };
}

/**
 * Pixels from the winning coin's center. Same for every viewer of a round.
 * Each round picks a new spot across the painted face, left or right of the arrow.
 */
export function stripLandOffset(roundId: number): number {
  const id = Math.abs(Math.trunc(roundId)) || 1;
  let x = Math.imul(id, 0x9e3779b1) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b) >>> 0;
  x = (x ^ (x >>> 16)) >>> 0;
  const side = x & 1 ? 1 : -1;
  const frac = ((x >>> 1) % 1000) / 999;
  return side * (2 + frac * (LAND_FACE - 2));
}
