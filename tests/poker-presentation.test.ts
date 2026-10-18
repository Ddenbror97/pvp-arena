/**
 * Presentation layer over recorded engine snapshots (src/lib/poker/replay/recorded-hands.json,
 * produced by tests/db/poker-record.integration.test.ts). Covers event derivation, the
 * director timeline, and the dealer voice queue.
 */
import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { DEALER_CLIP_DIR, DEALER_LINES, dealerLineId } from "../src/lib/poker/dealer-lines";
import fixture from "../src/lib/poker/replay/recorded-hands.json";
import type { TableState } from "../src/lib/poker/api";
import { deriveEvents, type EventCursor, type TableEvent } from "../src/lib/poker/events";
import { MAX_LAG_MS, PokerDirector, type Clock, type Flight } from "../src/lib/poker/director";
import {
  VoicePriority,
  VoiceService,
  type VoiceLine,
  type VoiceProvider,
} from "../src/lib/poker/voice";

const frames = (fixture as unknown as { frames: { label: string; state: TableState }[] }).frames;
const states = frames.map((f) => f.state);

function run(seq: TableState[]) {
  let cursor: EventCursor | null = null;
  const all: TableEvent[] = [];
  for (const s of seq) {
    const r = deriveEvents(cursor, s);
    cursor = r.cursor;
    all.push(...r.events);
  }
  return { all, cursor: cursor! };
}

const finalHands = () => {
  const byId = new Map<number, NonNullable<TableState["hand"]>>();
  for (const s of states) for (const h of [s.hand, s.last_hand]) if (h) byId.set(h.id, h);
  return [...byId.values()];
};

describe("deriveEvents", () => {
  it("restores the first snapshot without replaying anything", () => {
    const r = deriveEvents(null, states[0]!);
    expect(r.events.map((e) => e.type)).toEqual(["state_restored"]);
  });

  it("emits each hand's lifecycle once, in order, matching the authoritative result", () => {
    const { all } = run(states);
    const ids = all.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const h of finalHands().filter((x) => x.status === "COMPLETED")) {
      const ev = all.filter((e) => "handId" in e && e.handId === h.id);
      const types = ev.map((e) => e.type);
      expect(types[0]).toBe("hand_started");
      expect(types.indexOf("hole_cards_dealt")).toBeGreaterThan(0);
      expect(types[types.length - 1]).toBe("hand_completed");
      const deal = ev.find((e) => e.type === "hole_cards_dealt")!;
      if (deal.type !== "hole_cards_dealt") throw new Error();
      // Two rounds, one card per player per round, starting left of the button.
      const n = h.players.length;
      const byIndex = [...h.players]
        .sort((a, b) => a.deal_index - b.deal_index)
        .map((p) => p.seat_no);
      expect(deal.order).toEqual([...byIndex, ...byIndex]);
      expect(deal.order).toHaveLength(2 * n);
      const board = ev.flatMap((e) => (e.type === "community_cards_revealed" ? [e] : []));
      expect(board.map((b) => b.street)).toEqual(["FLOP", "TURN", "RIVER"].slice(0, board.length));
      expect(board.flatMap((b) => b.cards)).toEqual(h.board);
      const won = ev.flatMap((e) => (e.type === "player_won" ? [[e.seat, e.amount]] : []));
      expect(won).toEqual(
        h.players
          .filter((p) => (p.won ?? 0) > 0)
          .sort((a, b) => (b.won ?? 0) - (a.won ?? 0))
          .map((p) => [p.seat_no, p.won]),
      );
      // Showdown reveals only cards the server published for the hand.
      for (const e of ev)
        if (e.type === "showdown")
          for (const r of e.reveals)
            expect(r.cards).toEqual(h.players.find((p) => p.seat_no === r.seat)!.shown_cards);
    }
  });

  it("never carries private cards: deals have no card values", () => {
    const { all } = run(states);
    for (const e of all)
      if (e.type === "hole_cards_dealt") expect(Object.keys(e)).not.toContain("cards");
    const heroCards = new Set(states.flatMap((s) => s.me?.hole_cards ?? []));
    const shown = new Set(
      finalHands().flatMap((h) => [...h.board, ...h.players.flatMap((p) => p.shown_cards ?? [])]),
    );
    for (const e of all) {
      const cards =
        e.type === "community_cards_revealed"
          ? e.cards
          : e.type === "showdown"
            ? e.reveals.flatMap((r) => r.cards)
            : [];
      for (const c of cards) expect(shown.has(c) || !heroCards.has(c)).toBe(true);
    }
  });

  it("is idempotent for repeated snapshots (refetch, re-render, reconnect)", () => {
    let cursor: EventCursor | null = null;
    for (const s of states) {
      cursor = deriveEvents(cursor, s).cursor;
      const again = deriveEvents(cursor, s);
      expect(again.events).toEqual([]);
    }
  });

  it("recovers the same outcomes when polls skip snapshots", () => {
    const full = run(states)
      .all.filter((e) => e.type !== "turn_changed")
      .map((e) => e.id);
    const sparse = run(states.filter((_, i) => i % 3 === 0 || i === states.length - 1)).all;
    const keep = new Set([
      "community_cards_revealed",
      "player_won",
      "hand_completed",
      "hole_cards_dealt",
      "showdown",
    ]);
    expect(sparse.filter((e) => keep.has(e.type)).map((e) => e.id)).toEqual(
      full.filter((id) => run(states).all.find((e) => e.id === id && keep.has(e.type))),
    );
  });

  it("joining mid-hand restores instead of replaying the hand so far", () => {
    const mid = states.findIndex((s) => s.hand?.street === "TURN");
    const r = run(states.slice(mid));
    expect(r.all[0]!.type).toBe("state_restored");
    const midHand = states[mid]!.hand!.id;
    expect(
      r.all.some(
        (e) =>
          e.type === "community_cards_revealed" && e.handId === midHand && e.street !== "RIVER",
      ),
    ).toBe(false);
  });
});

class FakeClock implements Clock {
  t = 1_000_000;
  timers: { at: number; fn: () => void; id: number }[] = [];
  private n = 0;
  now = () => this.t;
  setTimeout = (fn: () => void, ms: number) => {
    const id = ++this.n;
    this.timers.push({ at: this.t + ms, fn, id });
    return id;
  };
  clearTimeout = (id: unknown) => {
    this.timers = this.timers.filter((x) => x.id !== id);
  };
  advance(ms: number) {
    const end = this.t + ms;
    for (;;) {
      this.timers.sort((a, b) => a.at - b.at);
      const next = this.timers[0];
      if (!next || next.at > end) break;
      this.timers.shift();
      this.t = next.at;
      next.fn();
    }
    this.t = end;
  }
}

function director(o: { reduced?: boolean; fast?: boolean; mySeat?: number | null } = {}) {
  const clock = new FakeClock();
  const log = {
    sfx: [] as string[],
    voice: [] as VoiceLine[],
    flights: [] as Flight[],
    cancels: 0,
  };
  const d = new PokerDirector(
    {
      sfx: (s) => log.sfx.push(s),
      voice: (l) => log.voice.push(l),
      dropVoiceBelow: () => {},
      flight: (f) => log.flights.push(f),
      cancelFlights: () => log.cancels++,
    },
    {
      fast: () => !!o.fast,
      reduced: () => !!o.reduced,
      mySeat: () => o.mySeat ?? 0,
      name: (s) => `Seat ${s}`,
    },
    clock,
  );
  return { d, clock, log };
}

describe("PokerDirector", () => {
  const { all } = run(states);
  const hand2 = finalHands().find((h) => h.board.length === 5 && h.players.length === 3)!;
  const events2 = all.filter((e) => "handId" in e && e.handId === hand2.id);

  it("shows hole cards only after their flight lands, and the board street by street", () => {
    const { d, clock, log } = director();
    d.handle(events2.filter((e) => ["hand_started", "hole_cards_dealt"].includes(e.type)));
    expect(d.state.handId).toBe(hand2.id);
    expect(Object.values(d.state.holeShown).reduce((a, b) => a + b, 0)).toBe(0);
    clock.advance(10_000);
    for (const p of hand2.players) expect(d.state.holeShown[p.seat_no]).toBe(2);
    const cardFlights = log.flights.filter((f) => f.kind === "card");
    expect(cardFlights).toHaveLength(2 * hand2.players.length);
    // Flights never carry faces.
    for (const f of log.flights) expect(Object.keys(f)).not.toContain("card");
    d.handle(events2.filter((e) => e.type === "community_cards_revealed" && e.street === "FLOP"));
    expect(d.state.boardShown).toBe(0);
    clock.advance(10_000);
    expect(d.state.boardShown).toBe(3);
  });

  it("presents a whole hand to the final authoritative picture", () => {
    const { d, clock, log } = director();
    d.handle(events2);
    clock.advance(30_000);
    expect(d.state.boardShown).toBe(5);
    expect(d.state.winners.map((w) => [w.seat, w.amount])).toEqual(
      hand2.players
        .filter((p) => (p.won ?? 0) > 0)
        .sort((a, b) => (b.won ?? 0) - (a.won ?? 0))
        .map((p) => [p.seat_no, p.won]),
    );
    expect(d.state.pose).toBe("idle");
    const keys = log.voice.map((v) => v.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("never lags the server by more than MAX_LAG_MS: a burst skips to the final state", () => {
    const { d, clock } = director();
    d.handle(all);
    // Whatever is still scheduled must finish within the lag budget.
    clock.advance(MAX_LAG_MS + 3000);
    const last = finalHands().sort((a, b) => b.id - a.id)[0]!;
    expect(d.state.handId).toBe(last.id);
  });

  it("animates one long sequence (all-in runout to showdown) instead of skipping it", () => {
    const allIn = frames.findIndex((f) => f.label === "CryptoKing CALL");
    const { cursor } = run(states.slice(0, allIn));
    const { events } = deriveEvents(cursor, states[allIn]!);
    expect(events.some((e) => e.type === "player_won")).toBe(true);
    const { d, clock, log } = director({ mySeat: 0 });
    d.restore(states[allIn - 1]!.hand!.id, [0, 2], 4, false);
    d.handle(events);
    expect(d.state.boardShown).toBe(4);
    expect(d.state.winners).toHaveLength(0);
    clock.advance(10_000);
    expect(d.state.boardShown).toBe(5);
    expect(d.state.winners.length).toBeGreaterThan(0);
    expect(log.flights.some((f) => f.durationMs > 0 && f.to.kind === "board")).toBe(true);
  });

  it("reduced motion: no animated flights, final state immediately", () => {
    const { d, clock, log } = director({ reduced: true });
    d.handle(events2);
    clock.advance(0);
    expect(d.state.boardShown).toBe(5);
    expect(log.flights.every((f) => f.durationMs === 0)).toBe(true);
  });

  it("dispose cancels pending work", () => {
    const { d, clock, log } = director();
    d.handle(events2);
    d.dispose();
    const before = log.sfx.length;
    clock.advance(30_000);
    expect(log.sfx.length).toBe(before);
    expect(clock.timers).toHaveLength(0);
  });

  it("speaks the turn prompt only on the viewer's own turn and not every street", () => {
    const { d, clock, log } = director({ mySeat: 0 });
    d.handle(events2);
    clock.advance(30_000);
    const turnLines = log.voice.filter((v) => /action/i.test(v.text));
    expect(turnLines.length).toBeLessThanOrEqual(1);
  });

  it("speaks only recorded dealer lines, and every line has its clip", () => {
    const spoken: VoiceLine[] = [];
    for (const seat of [0, 1, 2, null]) {
      const { d, clock, log } = director({ mySeat: seat });
      d.welcome();
      d.handle(all);
      clock.advance(120_000);
      spoken.push(...log.voice);
    }
    expect(spoken.length).toBeGreaterThan(3);
    for (const v of spoken) expect(dealerLineId(v.text), v.text).not.toBeNull();
    for (const id of Object.keys(DEALER_LINES))
      expect(existsSync(join("public", DEALER_CLIP_DIR, `${id}.mp3`)), id).toBe(true);
  });
});

class FakeVoice implements VoiceProvider {
  name = "fake";
  spoken: string[] = [];
  cancelled = 0;
  private end: (() => void) | null = null;
  available() {
    return true;
  }
  speak(text: string) {
    this.spoken.push(text);
    return new Promise<void>((r) => (this.end = r));
  }
  finish() {
    const e = this.end;
    this.end = null;
    e?.();
  }
  cancel() {
    this.cancelled++;
    this.finish();
  }
}
const tickAsync = () => new Promise((r) => setTimeout(r, 0));

describe("VoiceService", () => {
  const make = (o: { enabled?: boolean; unlocked?: boolean } = {}) => {
    const p = new FakeVoice();
    let now = 0;
    const v = new VoiceService(p, {
      enabled: () => o.enabled ?? true,
      unlocked: () => o.unlocked ?? true,
      volume: () => 1,
      now: () => now,
    });
    return { p, v, setNow: (n: number) => (now = n) };
  };

  it("speaks one line at a time and never repeats a key", async () => {
    const { p, v } = make();
    expect(v.say({ key: "a", text: "Here comes the flop.", priority: VoicePriority.Normal })).toBe(
      true,
    );
    expect(v.say({ key: "a", text: "Here comes the flop.", priority: VoicePriority.Normal })).toBe(
      false,
    );
    v.say({ key: "b", text: "The turn.", priority: VoicePriority.Normal });
    expect(p.spoken).toEqual(["Here comes the flop."]);
    p.finish();
    await tickAsync();
    expect(p.spoken).toEqual(["Here comes the flop.", "The turn."]);
    p.finish();
    await tickAsync();
    expect(v.say({ key: "b", text: "The turn.", priority: VoicePriority.Normal })).toBe(false);
  });

  it("an important line interrupts ambient chatter", async () => {
    const { p, v } = make();
    v.say({ key: "luck", text: "Good luck, everyone.", priority: VoicePriority.Ambient });
    v.say({ key: "you", text: "The pot goes to you.", priority: VoicePriority.Important });
    await tickAsync();
    expect(p.cancelled).toBe(1);
    expect(p.spoken).toEqual(["Good luck, everyone.", "The pot goes to you."]);
  });

  it("drops stale lines and keeps the backlog short", async () => {
    const { p, v, setNow } = make();
    v.say({ key: "1", text: "one", priority: VoicePriority.Normal });
    v.say({ key: "2", text: "two", priority: VoicePriority.Normal, ttlMs: 1000 });
    v.say({ key: "3", text: "three", priority: VoicePriority.Normal });
    v.say({ key: "4", text: "four", priority: VoicePriority.Normal });
    expect(v.pending.length).toBeLessThanOrEqual(2);
    setNow(5000);
    p.finish();
    await tickAsync();
    expect(p.spoken).not.toContain("two");
  });

  it("is silent when disabled or before a user gesture, and does not replay later", () => {
    const off = make({ enabled: false });
    expect(off.v.say({ key: "x", text: "hi", priority: VoicePriority.Important })).toBe(false);
    expect(off.p.spoken).toEqual([]);
    const locked = make({ unlocked: false });
    expect(locked.v.say({ key: "x", text: "hi", priority: VoicePriority.Important })).toBe(false);
    expect(locked.p.spoken).toEqual([]);
  });

  it("dropBelow clears stale chatter when a new hand starts", () => {
    const { p, v } = make();
    v.say({ key: "a", text: "a", priority: VoicePriority.Ambient });
    v.say({ key: "b", text: "b", priority: VoicePriority.Ambient });
    v.dropBelow(VoicePriority.Important);
    expect(v.pending).toEqual([]);
    expect(p.cancelled).toBe(1);
  });
});
