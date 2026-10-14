/**
 * Turns table events into a presentation timeline: dealer pose, card and chip flights,
 * sounds, voice lines, and which already-authoritative cards are visible yet.
 *
 * The director never decides game data. It only delays *showing* cards that the server
 * already dealt, by at most `MAX_LAG_MS`; past that it skips to the final picture. Betting
 * controls always use the live server state, so presentation never gates play.
 */
import type { PokerSfx } from "./audio";
import type { TableEvent } from "./events";
import { VoicePriority, type VoiceLine } from "./voice";

export type DealerPose = "intro" | "idle" | "shuffle" | "deal" | "reveal" | "wait" | "acknowledge";

export type Anchor =
  | { kind: "deck" }
  | { kind: "muck" }
  | { kind: "pot" }
  | { kind: "seat"; seat: number; slot?: number }
  | { kind: "bet"; seat: number }
  | { kind: "board"; index: number };

export interface Flight {
  id: string;
  kind: "card" | "chips";
  from: Anchor;
  to: Anchor;
  delayMs: number;
  durationMs: number;
  /** Face-down cards only: flights never carry card faces. */
  faceDown: true;
}

export interface Winner {
  seat: number;
  amount: number;
  handName: string | null;
}

export interface Presentation {
  pose: DealerPose;
  handId: number | null;
  /** Hole cards that have landed per seat (0..2). Undefined hand: everything shown. */
  holeShown: Record<number, number>;
  boardShown: number;
  /** Board indexes revealed in the last moment, for a brief highlight. */
  freshBoard: number[];
  /** Seats whose showdown cards are face up. */
  shownSeats: number[];
  potPulse: number;
  betPulse: Record<number, number>;
  winners: Winner[];
  toast: { id: string; text: string } | null;
  caption: { id: string; text: string } | null;
}

export interface DirectorSink {
  sfx(name: PokerSfx): void;
  voice(line: VoiceLine): void;
  dropVoiceBelow(p: VoicePriority): void;
  flight(f: Flight): void;
  cancelFlights(): void;
}

export interface DirectorOptions {
  fast: () => boolean;
  reduced: () => boolean;
  mySeat: () => number | null;
  name: (seat: number) => string;
}

export interface Clock {
  now(): number;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(t: unknown): void;
}

export const MAX_LAG_MS = 2600;

const BASE = {
  shuffle: 650,
  dealGap: 150,
  dealFlight: 420,
  burn: 260,
  boardGap: 170,
  boardFlight: 380,
  collect: 420,
  showdown: 650,
  payout: 700,
  settle: 1400,
  intro: 2600,
};

const money = (c: number) => `$${(c / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

export const INITIAL: Presentation = {
  pose: "idle",
  handId: null,
  holeShown: {},
  boardShown: 0,
  freshBoard: [],
  shownSeats: [],
  potPulse: 0,
  betPulse: {},
  winners: [],
  toast: null,
  caption: null,
};

type Step = { at: number; run: () => void };

export class PokerDirector {
  private p: Presentation = INITIAL;
  private listeners = new Set<() => void>();
  private steps: Step[] = [];
  private timers = new Set<unknown>();
  private freeAt = 0;
  private handsSeen = 0;
  private lastTurnLine = -1e9;
  private board: number[] = [];
  constructor(
    private sink: DirectorSink,
    private opt: DirectorOptions,
    private clock: Clock = {
      now: () => Date.now(),
      setTimeout: (fn, ms) => setTimeout(fn, ms),
      clearTimeout: (t) => clearTimeout(t as ReturnType<typeof setTimeout>),
    },
  ) {}

  get state() {
    return this.p;
  }
  subscribe = (l: () => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
  getSnapshot = () => this.p;

  private set(patch: Partial<Presentation> | ((p: Presentation) => Partial<Presentation>)) {
    const next = typeof patch === "function" ? patch(this.p) : patch;
    this.p = { ...this.p, ...next };
    this.listeners.forEach((l) => l());
  }

  private scale(ms: number) {
    if (this.opt.reduced()) return 0;
    return Math.round(ms * (this.opt.fast() ? 0.45 : 1));
  }

  /** Queue `run` at `offset` ms into a serial beat of `duration` ms. */
  private beat(duration: number, build: (at: (offset: number, run: () => void) => void) => void) {
    const start = Math.max(this.clock.now(), this.freeAt);
    build((offset, run) => this.schedule(start + offset, run));
    this.freeAt = start + duration;
  }

  private schedule(at: number, run: () => void) {
    if (at <= this.clock.now() && this.steps.length === 0) {
      run();
      return;
    }
    const step: Step = { at, run };
    this.steps.push(step);
    const t = this.clock.setTimeout(
      () => {
        this.timers.delete(t);
        const i = this.steps.indexOf(step);
        if (i < 0) return;
        this.steps.splice(i, 1);
        run();
      },
      Math.max(0, at - this.clock.now()),
    );
    this.timers.add(t);
  }

  /** Apply every pending step now, in order, without animation. */
  flush() {
    for (const t of this.timers) this.clock.clearTimeout(t);
    this.timers.clear();
    const pending = this.steps.sort((a, b) => a.at - b.at);
    this.steps = [];
    this.sink.cancelFlights();
    const sink = this.sink;
    this.sink = { ...sink, sfx: () => {}, voice: () => {}, flight: () => {} };
    try {
      for (const s of pending) s.run();
    } finally {
      this.sink = sink;
    }
    this.freeAt = this.clock.now();
  }

  /** Settle pending work without sound or flights. Reusable: React may remount the same instance. */
  dispose() {
    this.flush();
  }

  /** First-visit greeting. */
  welcome() {
    const d = this.scale(BASE.intro) || 1800;
    this.beat(d, (at) => {
      at(0, () => {
        this.set({
          pose: "intro",
          caption: { id: "welcome", text: "Welcome to PVP SpinArena. Ready to play?" },
        });
        this.sink.voice({
          key: "welcome",
          text: "Welcome to PVP SpinArena. Ready to play?",
          priority: VoicePriority.Important,
          ttlMs: 4000,
        });
      });
      at(d, () => this.set({ pose: "idle", caption: null }));
    });
  }

  /** Restore to the authoritative picture without replaying anything. */
  restore(
    handId: number | null,
    dealtSeats: number[],
    boardLen: number,
    waiting: boolean,
    finished?: { shown: number[]; winners: Winner[] },
  ) {
    this.flush();
    this.board = Array.from({ length: boardLen }, () => -1);
    this.set({
      pose: waiting ? "wait" : "idle",
      handId,
      holeShown: Object.fromEntries(dealtSeats.map((s) => [s, 2])),
      boardShown: boardLen,
      freshBoard: [],
      shownSeats: finished?.shown ?? [],
      winners: finished?.winners ?? [],
      toast: null,
    });
  }

  /**
   * One snapshot's events. If earlier snapshots are still playing more than MAX_LAG_MS behind,
   * they settle instantly first; this batch always plays, so a single long sequence (an
   * all-in runout to showdown) animates while a backlog of stale ones does not.
   */
  handle(events: TableEvent[]) {
    if (events.length && this.freeAt - this.clock.now() > MAX_LAG_MS) this.flush();
    for (const e of events) {
      try {
        this.one(e);
      } catch {
        /* a presentation fault never touches the game */
      }
    }
  }

  private one(e: TableEvent) {
    const mine = (seat: number) => seat === this.opt.mySeat();
    switch (e.type) {
      case "state_restored":
        return;
      case "hand_started": {
        this.flush();
        this.handsSeen++;
        this.sink.dropVoiceBelow(VoicePriority.Important);
        this.board = [];
        const d = this.scale(BASE.shuffle);
        this.beat(d, (at) => {
          at(0, () => {
            this.set({
              pose: "shuffle",
              handId: e.handId,
              holeShown: {},
              boardShown: 0,
              freshBoard: [],
              shownSeats: [],
              winners: [],
              betPulse: {},
              toast: null,
              caption: null,
            });
            this.sink.sfx("shuffle");
          });
        });
        return;
      }
      case "hole_cards_dealt": {
        const gap = this.scale(BASE.dealGap);
        const fl = this.scale(BASE.dealFlight);
        const total = gap * e.order.length + fl;
        const meIn = this.opt.mySeat() != null && e.order.includes(this.opt.mySeat()!);
        this.beat(total, (at) => {
          at(0, () => {
            this.set({ pose: "deal", handId: e.handId });
            if (meIn && this.handsSeen <= 1)
              this.sink.voice({
                key: `${e.id}:v`,
                text: "Cards are coming your way.",
                priority: VoicePriority.Normal,
                ttlMs: 2000,
              });
            else if (this.handsSeen % 6 === 1)
              this.sink.voice({
                key: `${e.id}:v`,
                text: "Good luck, everyone.",
                priority: VoicePriority.Ambient,
                ttlMs: 2000,
              });
          });
          const round: Record<number, number> = {};
          e.order.forEach((seat, i) => {
            const slot = (round[seat] = (round[seat] ?? -1) + 1);
            at(i * gap, () => {
              this.sink.flight({
                id: `${e.id}:${i}`,
                kind: "card",
                from: { kind: "deck" },
                to: { kind: "seat", seat, slot },
                delayMs: 0,
                durationMs: fl,
                faceDown: true,
              });
              this.sink.sfx("deal");
            });
            at(i * gap + fl, () =>
              this.set((p) => ({
                holeShown: { ...p.holeShown, [seat]: Math.max(p.holeShown[seat] ?? 0, slot + 1) },
              })),
            );
          });
          at(total, () => this.set({ pose: "idle" }));
        });
        return;
      }
      case "player_action_accepted": {
        // Bets show immediately: they are the player's own feedback and never wait on the dealer.
        const chips =
          ["POST_SB", "POST_BB", "POST_LIVE", "CALL", "BET", "RAISE"].includes(e.action) &&
          e.amount > 0;
        if (chips) {
          this.sink.flight({
            id: `${e.id}:chips`,
            kind: "chips",
            from: { kind: "seat", seat: e.seat },
            to: { kind: "bet", seat: e.seat },
            delayMs: 0,
            durationMs: this.scale(300),
            faceDown: true,
          });
          this.sink.sfx("chip");
          this.set((p) => ({
            betPulse: { ...p.betPulse, [e.seat]: (p.betPulse[e.seat] ?? 0) + 1 },
          }));
        } else if (e.action === "FOLD" || e.action === "TIMEOUT_FOLD") {
          this.sink.flight({
            id: `${e.id}:muck`,
            kind: "card",
            from: { kind: "seat", seat: e.seat },
            to: { kind: "muck" },
            delayMs: 0,
            durationMs: this.scale(360),
            faceDown: true,
          });
          this.sink.sfx("tap");
        } else {
          this.sink.sfx("tap");
        }
        return;
      }
      case "pot_updated": {
        const d = this.scale(BASE.collect);
        this.beat(d, (at) => {
          at(0, () => {
            this.sink.flight({
              id: `${e.id}:collect`,
              kind: "chips",
              from: { kind: "bet", seat: -1 },
              to: { kind: "pot" },
              delayMs: 0,
              durationMs: d,
              faceDown: true,
            });
            this.sink.sfx("collect");
          });
          at(d, () => this.set((p) => ({ potPulse: p.potPulse + 1, betPulse: {} })));
        });
        return;
      }
      case "community_cards_revealed": {
        const burn = this.scale(BASE.burn);
        const gap = this.scale(BASE.boardGap);
        const fl = this.scale(BASE.boardFlight);
        const first = this.board.length;
        const total = burn + gap * (e.cards.length - 1) + fl + this.scale(250);
        const line =
          e.street === "FLOP"
            ? "Here comes the flop."
            : e.street === "TURN"
              ? "The turn."
              : "And the river.";
        this.board = [...this.board, ...e.cards];
        this.beat(total, (at) => {
          at(0, () => {
            this.set({ pose: "reveal", freshBoard: [] });
            this.sink.flight({
              id: `${e.id}:burn`,
              kind: "card",
              from: { kind: "deck" },
              to: { kind: "muck" },
              delayMs: 0,
              durationMs: burn,
              faceDown: true,
            });
            this.sink.sfx("deal");
            this.sink.voice({
              key: `${e.id}:v`,
              text: line,
              priority: VoicePriority.Normal,
              ttlMs: 1800,
            });
          });
          e.cards.forEach((_, i) => {
            const index = first + i;
            at(burn + i * gap, () => {
              this.sink.flight({
                id: `${e.id}:${i}`,
                kind: "card",
                from: { kind: "deck" },
                to: { kind: "board", index },
                delayMs: 0,
                durationMs: fl,
                faceDown: true,
              });
            });
            at(burn + i * gap + fl, () => {
              this.set((p) => ({
                boardShown: Math.max(p.boardShown, index + 1),
                freshBoard: [...p.freshBoard, index],
              }));
              this.sink.sfx("flip");
            });
          });
          at(total, () => this.set({ pose: "idle" }));
          at(total + this.scale(900), () => this.set({ freshBoard: [] }));
        });
        return;
      }
      case "turn_changed": {
        this.beat(0, (at) =>
          at(0, () => {
            this.set({ pose: "wait" });
            if (mine(e.seat)) {
              this.sink.sfx("turn");
              const now = this.clock.now();
              if (now - this.lastTurnLine > 45_000) {
                this.lastTurnLine = now;
                this.sink.voice({
                  key: e.id,
                  text: this.handsSeen % 2 ? "Your action." : "The action is on you.",
                  priority: VoicePriority.Normal,
                  ttlMs: 2500,
                });
              }
            }
          }),
        );
        return;
      }
      case "showdown": {
        const d = this.scale(BASE.showdown);
        this.beat(d, (at) =>
          at(0, () => {
            this.set({ pose: "reveal", shownSeats: e.reveals.map((r) => r.seat) });
            this.sink.sfx("flip");
          }),
        );
        return;
      }
      case "player_won": {
        const d = this.scale(BASE.payout);
        this.beat(d, (at) => {
          at(0, () => {
            this.sink.flight({
              id: `${e.id}:pay`,
              kind: "chips",
              from: { kind: "pot" },
              to: { kind: "seat", seat: e.seat },
              delayMs: 0,
              durationMs: d,
              faceDown: true,
            });
            this.sink.sfx("collect");
            const name = mine(e.seat) ? "You" : this.opt.name(e.seat);
            const verb = mine(e.seat) ? "win" : "wins";
            this.set((p) => ({
              pose: "acknowledge",
              winners: [...p.winners, { seat: e.seat, amount: e.amount, handName: e.handName }],
              toast: {
                id: e.id,
                text: `${name} ${verb} ${money(e.amount)}${e.handName ? ` with ${e.handName.toLowerCase()}` : ""}`,
              },
            }));
            if (mine(e.seat)) {
              this.sink.sfx("win");
              this.sink.voice({
                key: `${e.id}:v`,
                text: e.handName ? "Nice hand. The pot goes to you." : "The pot goes to you.",
                priority: VoicePriority.Normal,
                ttlMs: 3000,
              });
            } else if (this.handsSeen % 4 === 0) {
              this.sink.voice({
                key: `${e.id}:v`,
                text: "Well played.",
                priority: VoicePriority.Ambient,
                ttlMs: 2000,
              });
            }
          });
        });
        return;
      }
      case "hand_completed": {
        const d = this.scale(BASE.settle) || 1;
        this.beat(d, (at) => at(d, () => this.set({ pose: "idle", toast: null })));
        return;
      }
      case "hand_voided": {
        this.flush();
        this.set({
          pose: "idle",
          holeShown: {},
          boardShown: 0,
          toast: {
            id: e.id,
            text:
              e.reason === "player_left"
                ? "Hand cancelled: a player left before the deal. No money moved."
                : "Hand cancelled: a player didn't confirm the shuffle. No money moved.",
          },
        });
        return;
      }
    }
  }
}
