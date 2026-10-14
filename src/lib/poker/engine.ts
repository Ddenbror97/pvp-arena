/**
 * No-limit Texas Hold'em betting rules. The database (`poker_act`, `_poker_*`)
 * is the authority; this module mirrors it for legal-action hints, replay and
 * SQL/TypeScript consistency tests. It never decides money on its own.
 */
import { evaluate } from "./evaluator";
import { settlePots, type Settlement } from "./pots";

export type Street = "PREFLOP" | "FLOP" | "TURN" | "RIVER" | "SHOWDOWN";
export const STREETS: Street[] = ["PREFLOP", "FLOP", "TURN", "RIVER", "SHOWDOWN"];

export type ActionType = "FOLD" | "CHECK" | "CALL" | "BET" | "RAISE" | "ALL_IN";

export type EnginePlayer = {
  seat: number;
  stack: number;
  street: number;
  total: number;
  folded: boolean;
  allIn: boolean;
  acted: boolean;
  /** Bet level when this player last acted this street (TDA reopen rule). */
  actedBet: number;
};

export type HandState = {
  players: EnginePlayer[];
  button: number;
  sbSeat: number;
  bbSeat: number;
  sb: number;
  bb: number;
  street: Street;
  currentBet: number;
  lastRaise: number;
  toAct: number | null;
  maxSeats: number;
  ended: boolean;
};

export type LegalActions = {
  seat: number;
  toCall: number;
  canFold: boolean;
  canCheck: boolean;
  canCall: boolean;
  callAmount: number;
  canRaise: boolean;
  /** Street totals ("raise to"). */
  minRaiseTo: number;
  maxRaiseTo: number;
};

export type HandSeatInput = { seat: number; stack: number; postsBigBlind?: boolean };

const dist = (from: number, to: number, n: number) => (to - from + n) % n;

/** Seats in clockwise order beginning after `from`. */
export function clockwise(seats: readonly number[], from: number, maxSeats: number) {
  return [...seats].sort((a, b) => {
    const da = dist(from, a, maxSeats) || maxSeats;
    const db = dist(from, b, maxSeats) || maxSeats;
    return da - db;
  });
}

/** Next participant clockwise strictly after `from`. */
export function nextSeat(seats: readonly number[], from: number, maxSeats: number) {
  return clockwise(seats, from, maxSeats)[0]!;
}

/** Blind positions for a hand. Heads-up: the button posts the small blind. */
export function blindSeats(seats: readonly number[], button: number, maxSeats: number) {
  if (seats.length < 2) throw new Error("NEED_TWO_PLAYERS");
  if (seats.length === 2) return { sbSeat: button, bbSeat: nextSeat(seats, button, maxSeats) };
  const sbSeat = nextSeat(seats, button, maxSeats);
  return { sbSeat, bbSeat: nextSeat(seats, sbSeat, maxSeats) };
}

/** Next button: first participant clockwise after the previous button. */
export function nextButton(seats: readonly number[], prevButton: number | null, maxSeats: number) {
  if (prevButton === null) return [...seats].sort((a, b) => a - b)[0]!;
  return nextSeat(seats, prevButton, maxSeats);
}

function post(p: EnginePlayer, amount: number) {
  const a = Math.min(amount, p.stack);
  p.stack -= a;
  p.street += a;
  p.total += a;
  if (p.stack === 0) p.allIn = true;
}

export function startHand(opts: {
  seats: HandSeatInput[];
  button: number;
  sb: number;
  bb: number;
  maxSeats?: number;
}): HandState {
  const maxSeats = opts.maxSeats ?? 6;
  const seatNos = opts.seats.map((s) => s.seat);
  if (new Set(seatNos).size !== seatNos.length) throw new Error("DUPLICATE_SEAT");
  if (!seatNos.includes(opts.button)) throw new Error("BUTTON_NOT_SEATED");
  if (opts.sb <= 0 || opts.bb < opts.sb) throw new Error("INVALID_BLINDS");
  const { sbSeat, bbSeat } = blindSeats(seatNos, opts.button, maxSeats);
  const players: EnginePlayer[] = clockwise(seatNos, opts.button, maxSeats).map((seat) => {
    const s = opts.seats.find((x) => x.seat === seat)!;
    if (!Number.isInteger(s.stack) || s.stack <= 0) throw new Error("INVALID_STACK");
    return {
      seat,
      stack: s.stack,
      street: 0,
      total: 0,
      folded: false,
      allIn: false,
      acted: false,
      actedBet: 0,
    };
  });
  const by = (seat: number) => players.find((p) => p.seat === seat)!;
  for (const s of opts.seats) {
    const p = by(s.seat);
    if (s.seat === sbSeat) post(p, s.postsBigBlind ? opts.bb : opts.sb);
    else if (s.seat === bbSeat) post(p, opts.bb);
    else if (s.postsBigBlind) post(p, opts.bb);
  }
  const state: HandState = {
    players,
    button: opts.button,
    sbSeat,
    bbSeat,
    sb: opts.sb,
    bb: opts.bb,
    street: "PREFLOP",
    currentBet: opts.bb,
    lastRaise: opts.bb,
    toAct: null,
    maxSeats,
    ended: false,
  };
  const first = seatNos.length === 2 ? opts.button : nextSeat(seatNos, bbSeat, maxSeats);
  state.toAct = findToAct(state, first, true);
  if (state.toAct === null) advance(state);
  return state;
}

const contenders = (s: HandState) => s.players.filter((p) => !p.folded);
const actors = (s: HandState) => s.players.filter((p) => !p.folded && !p.allIn);

/**
 * Street total this player must reach to stay in. When every other contender is
 * all-in, nobody can contest more than the largest of their totals.
 */
function callTarget(s: HandState, p: EnginePlayer) {
  if (actors(s).some((o) => o.seat !== p.seat)) return s.currentBet;
  const others = contenders(s).filter((o) => o.seat !== p.seat);
  return Math.min(s.currentBet, Math.max(0, ...others.map((o) => o.street)));
}

export function needsAction(s: HandState, p: EnginePlayer) {
  if (p.folded || p.allIn) return false;
  if (p.street < callTarget(s, p)) return true;
  if (p.acted) return false;
  return actors(s).some((o) => o.seat !== p.seat);
}

/** First player needing action at or after `from` (inclusive) or strictly after. */
function findToAct(s: HandState, from: number, inclusive: boolean): number | null {
  const seats = s.players.map((p) => p.seat);
  const ordered = clockwise(seats, from, s.maxSeats);
  if (inclusive) {
    ordered.unshift(from);
    ordered.pop();
  }
  for (const seat of ordered) {
    const p = s.players.find((x) => x.seat === seat)!;
    if (needsAction(s, p)) return seat;
  }
  return null;
}

export function legalActions(s: HandState): LegalActions | null {
  if (s.ended || s.toAct === null) return null;
  const p = s.players.find((x) => x.seat === s.toAct)!;
  const toCall = Math.max(0, callTarget(s, p) - p.street);
  const allInTo = p.street + p.stack;
  const reopened = !p.acted || s.currentBet - p.actedBet >= s.lastRaise;
  const canRaise = reopened && allInTo > s.currentBet && actors(s).some((o) => o.seat !== p.seat);
  return {
    seat: p.seat,
    toCall,
    canFold: true,
    canCheck: toCall === 0,
    canCall: toCall > 0,
    callAmount: Math.min(toCall, p.stack),
    canRaise,
    minRaiseTo: canRaise ? Math.min(s.currentBet + s.lastRaise, allInTo) : 0,
    maxRaiseTo: canRaise ? allInTo : 0,
  };
}

/**
 * Apply an action. `amount` is the street total for BET / RAISE.
 * ALL_IN is normalised to CALL or RAISE by amount. Throws on illegal input.
 */
export function act(s: HandState, seat: number, type: ActionType, amount = 0): HandState {
  const la = legalActions(s);
  if (!la || la.seat !== seat) throw new Error("NOT_YOUR_TURN");
  const p = s.players.find((x) => x.seat === seat)!;
  if (type === "ALL_IN") {
    const to = p.street + p.stack;
    if (to <= s.currentBet) type = "CALL";
    else {
      if (!la.canRaise) throw new Error("RAISE_NOT_ALLOWED");
      type = s.currentBet === 0 ? "BET" : "RAISE";
      amount = to;
    }
  }
  switch (type) {
    case "FOLD":
      p.folded = true;
      break;
    case "CHECK":
      if (!la.canCheck) throw new Error("CANNOT_CHECK");
      break;
    case "CALL":
      if (!la.canCall) throw new Error("NOTHING_TO_CALL");
      post(p, la.callAmount);
      break;
    case "BET":
    case "RAISE": {
      if (type === "BET" && s.currentBet !== 0) throw new Error("USE_RAISE");
      if (type === "RAISE" && s.currentBet === 0) throw new Error("USE_BET");
      if (!la.canRaise) throw new Error("RAISE_NOT_ALLOWED");
      if (!Number.isInteger(amount)) throw new Error("INVALID_AMOUNT");
      const allInTo = p.street + p.stack;
      if (amount > allInTo) throw new Error("AMOUNT_EXCEEDS_STACK");
      if (amount < la.minRaiseTo && amount !== allInTo) throw new Error("BELOW_MIN_RAISE");
      if (amount <= s.currentBet) throw new Error("BELOW_MIN_RAISE");
      const raiseBy = amount - s.currentBet;
      if (raiseBy >= s.lastRaise) s.lastRaise = raiseBy;
      s.currentBet = amount;
      post(p, amount - p.street);
      break;
    }
    default:
      throw new Error("UNKNOWN_ACTION");
  }
  p.acted = true;
  p.actedBet = s.currentBet;
  if (contenders(s).length === 1) {
    s.toAct = null;
    s.ended = true;
    return s;
  }
  s.toAct = findToAct(s, seat, false);
  if (s.toAct === null) advance(s);
  return s;
}

/** Timeout: check when free, otherwise fold. */
export function timeoutAction(s: HandState): ActionType {
  const la = legalActions(s);
  return la?.canCheck ? "CHECK" : "FOLD";
}

/** Close the betting round, move to the next street, or run out to showdown. */
function advance(s: HandState) {
  while (!s.ended) {
    if (contenders(s).length === 1) {
      s.ended = true;
      s.toAct = null;
      return;
    }
    const i = STREETS.indexOf(s.street);
    s.street = STREETS[i + 1]!;
    for (const p of s.players) {
      p.street = 0;
      p.acted = false;
      p.actedBet = 0;
    }
    s.currentBet = 0;
    s.lastRaise = s.bb;
    if (s.street === "SHOWDOWN") {
      s.ended = true;
      s.toAct = null;
      return;
    }
    s.toAct = findToAct(s, s.button, false);
    if (s.toAct !== null) return;
  }
}

/** Board cards visible on a street. */
export const boardCount = (street: Street) =>
  ({ PREFLOP: 0, FLOP: 3, TURN: 4, RIVER: 5, SHOWDOWN: 5 })[street];

/**
 * Deal positions in a 52-card deck for n participants ordered from the first
 * seat after the button: hole cards round-robin, then burn/flop/burn/turn/burn/river.
 */
export function dealPositions(n: number) {
  const hole = Array.from({ length: n }, (_, i) => [i, i + n] as const);
  const b = 2 * n;
  return { hole, flop: [b + 1, b + 2, b + 3], turn: b + 5, river: b + 7 };
}

/** Settle a finished hand. `board` must hold 5 cards when two or more players remain. */
export function settleHand(
  s: HandState,
  opts: { feeBps: number; holeCards: Record<number, readonly number[]>; board: readonly number[] },
): Settlement {
  if (!s.ended) throw new Error("HAND_NOT_FINISHED");
  const live = contenders(s);
  const flopDealt = s.street !== "PREFLOP" || opts.board.length >= 3;
  return settlePots(
    s.players.map((p) => ({
      seat: p.seat,
      contributed: p.total,
      folded: p.folded,
      score:
        !p.folded && live.length > 1
          ? evaluate([...opts.holeCards[p.seat]!, ...opts.board])
          : undefined,
    })),
    { feeBps: opts.feeBps, flopDealt, button: s.button, maxSeats: s.maxSeats },
  );
}
