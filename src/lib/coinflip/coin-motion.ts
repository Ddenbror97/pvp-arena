/**
 * Presentation-only coin rotation. The angle is a pure function of elapsed
 * server time and the server-decided side; there is no randomness anywhere.
 *   Quadratic ease-out for 3.8s: launch speed, then steadily slower, no edge hang.
 *   HEADS lands on 0deg, TAILS on 180deg.
 *
 * The side becomes visible once a tick moves the game to FLIPPING, so it can
 * reach a slow browser late. Until it is known the coin keeps the launch speed
 * (it never slows onto a face), and a side that arrives after the ease-out
 * would have begun lands with a short ease-out instead of snapping.
 */
export const ANIMATION_MS = 3800;
export const LATE_LAND_MS = 2000;
/** Full turns. Few enough that the slowing faces stay readable. */
const BASE_TURNS = 7;
/** Ease-out exponent. 2 = fast start, speed falling in a straight line to zero. */
const EASE_N = 2;
/** After this fraction, an unknown side is "late" and must not join the ease-out mid-spin. */
const SLOW_START = 0.25;
/** Lift holds here while the side is still unknown, so the coin stays airborne. */
const AIRBORNE = 0.4;

/** Launch speed, degrees per ms. Matches the ease-out derivative at t = 0. */
const FAST_DEG_PER_MS = (EASE_N * BASE_TURNS * 360) / ANIMATION_MS;

export type Side = "HEADS" | "TAILS";

function easeOut(u: number) {
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  return 1 - (1 - u) ** EASE_N;
}

/** On-time path: side known before the ease-out is underway. */
export function coinAngle(elapsedMs: number, side: Side | null) {
  const turns = BASE_TURNS + (side === "TAILS" ? 0.5 : 0);
  return easeOut(elapsedMs / ANIMATION_MS) * turns * 360;
}

/** Side unknown: launch speed the whole time, so it never settles on a face. */
function spinningAngle(elapsedMs: number) {
  return Math.max(0, elapsedMs) * FAST_DEG_PER_MS;
}

export interface CoinMotion {
  start: number;
  side: Side | null;
  /** Client time the side arrived, when this client had already seen the flip without it. */
  revealAt: number | null;
}

const lateReveal = (m: CoinMotion) =>
  m.revealAt != null && m.revealAt - m.start > SLOW_START * ANIMATION_MS;

/**
 * Late landing: ease-out cubic from the spinning angle to the first matching face at least
 * LATE_LAND_MS of cruise away; its duration is stretched so the initial speed equals full speed.
 */
function lateLanding(m: CoinMotion) {
  const from = spinningAngle(m.revealAt! - m.start);
  const face = m.side === "TAILS" ? 180 : 0;
  const min = from + (FAST_DEG_PER_MS * LATE_LAND_MS) / 3;
  const to = min + ((face - (min % 360) + 360) % 360);
  return { from, to, duration: (3 * (to - from)) / FAST_DEG_PER_MS };
}

/** When the coin rests on the authoritative face (Infinity while the side is unknown). */
export function coinLandingTime(m: CoinMotion) {
  if (m.side == null) return Infinity;
  return lateReveal(m) ? m.revealAt! + lateLanding(m).duration : m.start + ANIMATION_MS;
}

/** 0..1 progress of the coin's lift arc; holds airborne while the side is unknown. */
export function liftProgress(m: CoinMotion, ms: number) {
  const e = Math.max(0, ms - m.start);
  if (m.side == null) return Math.min(e / ANIMATION_MS, AIRBORNE);
  if (!lateReveal(m)) return Math.min(1, e / ANIMATION_MS);
  const k = Math.min(1, Math.max(0, (ms - m.revealAt!) / lateLanding(m).duration));
  return SLOW_START + (1 - SLOW_START) * k;
}

export function coinAngleAt(m: CoinMotion, ms: number) {
  const t = Math.max(0, ms - m.start);
  if (m.side == null) return spinningAngle(t);
  if (!lateReveal(m)) return coinAngle(Math.min(ANIMATION_MS, t), m.side);
  const { from, to, duration } = lateLanding(m);
  const k = Math.min(1, Math.max(0, (t - (m.revealAt! - m.start)) / duration));
  return from + (to - from) * (1 - (1 - k) ** 3);
}
