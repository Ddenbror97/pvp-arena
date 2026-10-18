/**
 * Presentation events derived from successive `poker_table_state` snapshots.
 *
 * Every event is read off authoritative server data: the append-only action log, the hand
 * status, and the settled result. Nothing here decides cards, bets or winners. Each event
 * has a stable id, so a re-render, refetch or reconnect never repeats one.
 */
import type { ActionKind, PokerHand, Street, TableState } from "./api";

type Base = { id: string; handId: number };
export type TableEvent =
  | { type: "state_restored"; id: string; handId: number | null }
  | (Base & { type: "hand_started"; handNo: number; button: number })
  /** Hole cards in Hold'em order: one card per player per round, from left of the button. */
  | (Base & { type: "hole_cards_dealt"; order: number[] })
  | (Base & {
      type: "player_action_accepted";
      seat: number;
      action: ActionKind;
      amount: number;
      toAmount: number | null;
      allIn: boolean;
      street: Street;
    })
  | (Base & {
      type: "community_cards_revealed";
      street: "FLOP" | "TURN" | "RIVER";
      cards: number[];
      /** The engine burns one card before every board street (docs/POKER.md, "Deal"). */
      burn: true;
    })
  | (Base & { type: "turn_changed"; seat: number; deadline: string | null })
  | (Base & { type: "pot_updated"; pot: number })
  | (Base & {
      type: "showdown";
      reveals: { seat: number; cards: number[]; handName: string | null }[];
    })
  | (Base & { type: "player_won"; seat: number; amount: number; handName: string | null })
  | (Base & { type: "hand_completed"; contested: boolean })
  | (Base & { type: "hand_voided"; reason: string | null });

export type TableEventType = TableEvent["type"];

export interface EventCursor {
  /** Highest action seq processed, per hand. */
  seq: Record<number, number>;
  started: Record<number, true>;
  dealt: Record<number, true>;
  finished: Record<number, true>;
  turn: string | null;
  pot: Record<number, number>;
  /** Hands older than this were finished before the viewer arrived. */
  floor: number;
}

const BOARD_STREETS = new Set(["FLOP", "TURN", "RIVER"]);
const BETTING_ACTIONS = new Set<ActionKind>([
  "POST_SB",
  "POST_BB",
  "POST_LIVE",
  "FOLD",
  "CHECK",
  "CALL",
  "BET",
  "RAISE",
  "TIMEOUT_FOLD",
  "TIMEOUT_CHECK",
]);

/** Chips already gathered into the middle (current street bets are still in front of seats). */
export function collectedPot(h: PokerHand) {
  const done = h.status === "COMPLETED" || h.status === "SETTLEMENT";
  return h.players.reduce((s, p) => s + p.total_bet - (done ? 0 : p.street_bet), 0);
}

function handsOf(s: TableState): PokerHand[] {
  const out: PokerHand[] = [];
  if (s.last_hand) out.push(s.last_hand);
  if (s.hand && s.hand.id !== s.last_hand?.id) out.push(s.hand);
  return out.sort((a, b) => a.id - b.id);
}

/** Marks everything currently visible as already presented. */
export function restoreCursor(s: TableState): EventCursor {
  const c: EventCursor = {
    seq: {},
    started: {},
    dealt: {},
    finished: {},
    turn: null,
    pot: {},
    floor: 0,
  };
  for (const h of handsOf(s)) {
    c.seq[h.id] = h.actions.reduce((m, a) => Math.max(m, a.seq), 0);
    c.started[h.id] = true;
    if (h.status !== "COMMIT") c.dealt[h.id] = true;
    if (h.status === "COMPLETED" || h.status === "VOIDED") c.finished[h.id] = true;
    c.pot[h.id] = collectedPot(h);
    c.floor = Math.max(c.floor, h.id);
  }
  const live = s.hand;
  if (live?.status === "BETTING" && live.to_act != null)
    c.turn = `${live.id}:${live.to_act}:${live.action_deadline}`;
  return c;
}

function handEvents(h: PokerHand, c: EventCursor, live: boolean, out: TableEvent[]) {
  if (!c.started[h.id]) {
    c.started[h.id] = true;
    out.push({
      type: "hand_started",
      id: `${h.id}:start`,
      handId: h.id,
      handNo: h.hand_no,
      button: h.button_seat,
    });
  }
  if (h.status === "VOIDED") {
    if (!c.finished[h.id]) {
      c.finished[h.id] = true;
      out.push({ type: "hand_voided", id: `${h.id}:void`, handId: h.id, reason: h.void_reason });
    }
    c.seq[h.id] = h.actions.reduce((m, a) => Math.max(m, a.seq), c.seq[h.id] ?? 0);
    return;
  }
  if (h.status !== "COMMIT" && !c.dealt[h.id]) {
    c.dealt[h.id] = true;
    const ordered = [...h.players]
      .sort((a, b) => a.deal_index - b.deal_index)
      .map((p) => p.seat_no);
    out.push({
      type: "hole_cards_dealt",
      id: `${h.id}:deal`,
      handId: h.id,
      order: [...ordered, ...ordered],
    });
  }

  // Replay the action log so per-street pots are reported at the moment the board moves.
  const seen = c.seq[h.id] ?? 0;
  const actions = h.actions.filter((a) => a.seq > seen).sort((a, b) => a.seq - b.seq);
  for (const a of actions) {
    if (a.action === "BOARD" && a.cards && BOARD_STREETS.has(a.street)) {
      const pot = potBefore(h, a.seq);
      if (pot !== c.pot[h.id]) {
        c.pot[h.id] = pot;
        out.push({ type: "pot_updated", id: `${h.id}:pot:${a.seq}`, handId: h.id, pot });
      }
      out.push({
        type: "community_cards_revealed",
        id: `${h.id}:a:${a.seq}`,
        handId: h.id,
        street: a.street as "FLOP" | "TURN" | "RIVER",
        cards: a.cards,
        burn: true,
      });
    } else if (BETTING_ACTIONS.has(a.action) && a.seat_no != null) {
      out.push({
        type: "player_action_accepted",
        id: `${h.id}:a:${a.seq}`,
        handId: h.id,
        seat: a.seat_no,
        action: a.action,
        amount: Number(a.amount),
        toAmount: a.to_amount == null ? null : Number(a.to_amount),
        allIn: a.all_in,
        street: a.street,
      });
    }
    c.seq[h.id] = a.seq;
  }

  if (live && h.status === "BETTING" && h.to_act != null) {
    const k = `${h.id}:${h.to_act}:${h.action_deadline}`;
    if (k !== c.turn) {
      c.turn = k;
      out.push({
        type: "turn_changed",
        id: `turn:${k}`,
        handId: h.id,
        seat: h.to_act,
        deadline: h.action_deadline,
      });
    }
  }

  if (h.status === "COMPLETED" && !c.finished[h.id]) {
    c.finished[h.id] = true;
    const pot = collectedPot(h);
    if (pot !== c.pot[h.id]) {
      c.pot[h.id] = pot;
      out.push({ type: "pot_updated", id: `${h.id}:pot:end`, handId: h.id, pot });
    }
    const live = h.players.filter((p) => !p.folded);
    const reveals = h.players
      .filter((p) => p.shown_cards && p.shown_cards.length === 2)
      .map((p) => ({ seat: p.seat_no, cards: p.shown_cards!, handName: p.hand_name }));
    if (reveals.length)
      out.push({ type: "showdown", id: `${h.id}:showdown`, handId: h.id, reveals });
    for (const p of [...h.players].sort((a, b) => (b.won ?? 0) - (a.won ?? 0)))
      if ((p.won ?? 0) > 0)
        out.push({
          type: "player_won",
          id: `${h.id}:won:${p.seat_no}`,
          handId: h.id,
          seat: p.seat_no,
          amount: Number(p.won),
          handName: p.hand_name,
        });
    out.push({
      type: "hand_completed",
      id: `${h.id}:done`,
      handId: h.id,
      contested: live.length > 1,
    });
  }
}

/** Collected pot just before action `seq`: every bet placed on earlier streets. */
function potBefore(h: PokerHand, seq: number) {
  let pot = 0;
  for (const a of h.actions)
    if (a.seq < seq && BETTING_ACTIONS.has(a.action)) pot += Number(a.amount);
  return pot;
}

/**
 * Events between the presented cursor and a new snapshot. A null cursor restores: the
 * current table is shown as-is with no replayed animations.
 */
export function deriveEvents(
  cursor: EventCursor | null,
  s: TableState,
): { events: TableEvent[]; cursor: EventCursor } {
  if (!cursor) {
    return {
      events: [
        {
          type: "state_restored",
          id: `restore:${s.hand?.id ?? s.last_hand?.id ?? 0}`,
          handId: s.hand?.id ?? null,
        },
      ],
      cursor: restoreCursor(s),
    };
  }
  const c: EventCursor = {
    seq: { ...cursor.seq },
    started: { ...cursor.started },
    dealt: { ...cursor.dealt },
    finished: { ...cursor.finished },
    turn: cursor.turn,
    pot: { ...cursor.pot },
    floor: cursor.floor,
  };
  const out: TableEvent[] = [];
  for (const h of handsOf(s)) {
    if (h.id < c.floor && !c.started[h.id]) continue;
    handEvents(h, c, h.id === s.hand?.id, out);
  }
  return { events: out, cursor: c };
}
