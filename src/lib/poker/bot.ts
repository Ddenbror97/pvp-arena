/**
 * Texas Hold'em decision engine for labeled house bots.
 *
 * The database function `_poker_bot_decide` is the copy that runs in production.
 * Change the two together. Difficulty only changes these thresholds. It never
 * touches the deck, the seeds, or the payout math.
 *
 * The inputs are what the seat can already see: its own hole cards, the board,
 * the pot, the stacks, the legal actions, and how this street has been bet.
 */
import { rankOf, suitOf, type Card } from "./cards";
import { clockwise } from "./engine";
import { categoryOf, evaluate } from "./evaluator";

export type BotStyle = "casual" | "standard" | "competitive";
export type BotStreet = "PREFLOP" | "FLOP" | "TURN" | "RIVER";
export type BotPosition = "blind" | "early" | "middle" | "late";
export type BotAction = "FOLD" | "CHECK" | "CALL" | "BET" | "RAISE" | "ALL_IN";

export type BotLegal = {
  toCall: number;
  canFold: boolean;
  canCheck: boolean;
  canCall: boolean;
  callAmount: number;
  canRaise: boolean;
  minRaiseTo: number;
  maxRaiseTo: number;
  currentBet: number;
};

export type BotView = {
  style: BotStyle;
  hole: readonly [Card, Card];
  board: readonly Card[];
  pot: number;
  heroStack: number;
  heroStreetBet: number;
  effectiveStack: number;
  opponents: number;
  position: BotPosition;
  raisesThisStreet: number;
  bigBlind: number;
  /** Deterministic 0..9999. Same inputs always produce the same action. */
  roll: number;
  legal: BotLegal;
};

export type BotDecision = { action: BotAction; amount: number };

/** Thresholds. Higher fold/bet numbers play tighter. bluff is a roll ceiling. */
export const BOT_STYLE = {
  casual: { fold: 14, bet: 10, bluff: 400, raise: 78 },
  standard: { fold: 0, bet: 0, bluff: 900, raise: 68 },
  competitive: { fold: -10, bet: -8, bluff: 1600, raise: 60 },
} as const;

const POS: Record<BotPosition, number> = { late: -6, early: 8, middle: 0, blind: 4 };
const MADE = [18, 48, 66, 76, 84, 88, 94, 97, 99];

/** Late acts more often. Early and the blinds wait for a stronger hand. */
export function botPosition(
  seat: number,
  button: number,
  sb: number,
  bb: number,
  live: readonly number[],
  maxSeats: number,
): BotPosition {
  if (live.length <= 3) return seat === button ? "late" : "blind";
  if (seat === button) return "late";
  if (seat === sb || seat === bb) return "blind";
  const order = clockwise(live, button, maxSeats);
  const i = order.indexOf(seat);
  if (i < Math.floor(order.length / 2)) return "early";
  return "middle";
}

/** FNV-1a, low 32 bits, then 0..9999. Matches `_poker_bot_roll` in SQL. */
export function botRoll(handId: number, seat: number, street: string, version: number) {
  let h = 2166136261;
  const s = `${handId}:${seat}:${street}:${version}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 10000;
}

/** Presentation delay in milliseconds. Matches `_poker_bot_delay_ms`. */
export function botDelayMs(action: BotAction, roll: number) {
  const [lo, hi] =
    action === "FOLD" || action === "CHECK"
      ? [800, 1800]
      : action === "CALL"
        ? [1000, 2500]
        : [1500, 3500];
  return lo + (roll % (hi - lo + 1));
}

function preflopScore(hole: readonly [Card, Card]) {
  let r1 = rankOf(hole[0]);
  let r2 = rankOf(hole[1]);
  if (r1 < r2) [r1, r2] = [r2, r1];
  const gap = r1 - r2;
  const suited = suitOf(hole[0]) === suitOf(hole[1]);
  let s = 0;
  if (gap === 0) s = (r1 + 2) * 6;
  else {
    s = (r1 + 2) * 2 + (r2 + 2);
    if (suited) s += 8;
    if (gap === 1) s += 6;
    else if (gap === 2) s += 2;
    else if (gap >= 4) s -= 4;
    if (r1 < 8 && gap > 2) s -= 6;
  }
  return Math.max(0, Math.min(100, s));
}

function bitCount(n: number) {
  let c = 0;
  while (n) {
    c += n & 1;
    n >>= 1;
  }
  return c;
}

/** Draw bonus from cards already dealt. Future board cards are not an input. */
function drawBonus(hole: readonly [Card, Card], board: readonly Card[]) {
  if (board.length < 3) return 0;
  const all = [...hole, ...board];
  const suits = [0, 0, 0, 0];
  const holeSuits = [0, 0, 0, 0];
  let mask = 0;
  let holeMask = 0;
  for (const c of all) {
    suits[suitOf(c)]!++;
    mask |= 1 << rankOf(c);
  }
  for (const c of hole) {
    holeSuits[suitOf(c)]!++;
    holeMask |= 1 << rankOf(c);
  }
  let flush = 0;
  for (let s = 0; s < 4; s++) if (suits[s] === 4 && holeSuits[s]! > 0) flush = 14;
  let straight = 0;
  for (let low = 0; low <= 9; low++) {
    const window = low === 9 ? (1 << 12) | 0b1111 : 0b11111 << low;
    if (bitCount(mask & window) !== 4) continue;
    if ((holeMask & window) === 0) continue;
    const run = low === 9 ? false : bitCount(mask & (0b1111 << low)) === 4 || bitCount(mask & (0b1111 << (low + 1))) === 4;
    straight = Math.max(straight, run ? 12 : 5);
  }
  return Math.min(20, flush + straight);
}

/** 0..100 from this seat's cards and the current board. */
export function botStrength(hole: readonly [Card, Card], board: readonly Card[]) {
  if (board.length < 3) return preflopScore(hole);
  const cat = categoryOf(evaluate([...hole, ...board]));
  const bonus = cat < 4 ? drawBonus(hole, board) : 0;
  return Math.min(99, (MADE[cat] ?? 18) + bonus);
}

function fallback(legal: BotLegal): BotDecision {
  if (legal.canCheck) return { action: "CHECK", amount: 0 };
  if (legal.canCall) return { action: "CALL", amount: 0 };
  return { action: "FOLD", amount: 0 };
}

function sized(
  kind: "BET" | "RAISE",
  view: BotView,
  shove: boolean,
): BotDecision {
  const { legal } = view;
  const target = Math.floor((view.pot * 2) / 3);
  const want =
    kind === "BET" ? Math.max(legal.minRaiseTo, target) : Math.max(legal.minRaiseTo, legal.currentBet + target);
  let to = Math.min(legal.maxRaiseTo, Math.max(legal.minRaiseTo, want));
  if (shove) to = legal.maxRaiseTo;
  if (to >= legal.maxRaiseTo && legal.maxRaiseTo === view.heroStreetBet + view.heroStack) {
    return { action: "ALL_IN", amount: legal.maxRaiseTo };
  }
  return { action: kind, amount: to };
}

/**
 * One action that is legal for `view`. A check is preferred to a free fold.
 * The amount of a bet or raise stays inside the legal minimum and maximum.
 */
export function chooseBotAction(view: BotView): BotDecision {
  const style = BOT_STYLE[view.style];
  const pos = POS[view.position];
  const strength = botStrength(view.hole, view.board);
  const oppAdj = Math.max(0, view.opponents - 1) * 4;
  const raiseAdj = view.raisesThisStreet * 6;
  const need = strength - style.fold - pos - oppAdj - raiseAdj;
  const legal = view.legal;
  const toCall = legal.canCall ? legal.callAmount : 0;
  const potOdds = toCall <= 0 ? 0 : Math.round((toCall * 100) / (view.pot + toCall));
  const short = view.bigBlind > 0 && view.effectiveStack <= view.bigBlind * 12;
  const raiseRoll = view.roll % 100;
  const raiseCut = 70 + (view.style === "competitive" ? 15 : view.style === "casual" ? -15 : 0);

  let decision: BotDecision;
  if (toCall > 0) {
    if (
      legal.canRaise &&
      (need >= style.raise || (short && need >= style.raise - 12)) &&
      raiseRoll < raiseCut
    ) {
      decision = sized("RAISE", view, short && need >= style.raise - 12);
    } else if (legal.canCall && need >= potOdds - (view.style === "casual" ? 0 : 4)) {
      decision = { action: "CALL", amount: 0 };
    } else if (legal.canFold) {
      decision = { action: "FOLD", amount: 0 };
    } else {
      decision = fallback(legal);
    }
  } else {
    const betBar = 58 + style.bet + pos + oppAdj;
    const bluff = view.roll < style.bluff && need >= 28 && view.position !== "early";
    if (legal.canRaise && legal.currentBet === 0 && (need >= betBar || bluff)) {
      decision = sized("BET", view, short && need >= style.raise);
    } else {
      decision = fallback(legal);
    }
  }

  if ((decision.action === "BET" || decision.action === "RAISE" || decision.action === "ALL_IN") && !legal.canRaise) {
    decision = fallback(legal);
  }
  if (decision.action === "CALL" && !legal.canCall) decision = fallback(legal);
  if (decision.action === "CHECK" && !legal.canCheck) decision = legal.canCall ? { action: "CALL", amount: 0 } : { action: "FOLD", amount: 0 };
  if (decision.action === "FOLD" && legal.canCheck) decision = { action: "CHECK", amount: 0 };
  if (decision.action === "BET" || decision.action === "RAISE") {
    const amount = Math.min(legal.maxRaiseTo, Math.max(legal.minRaiseTo, decision.amount));
    decision = { action: decision.action, amount };
  }
  return decision;
}
