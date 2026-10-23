/**
 * Ruleset pvp-8ball-v1. The winner is this function applied to the rack and the
 * shots. The server runs it so a client cannot file a fake result. It does not
 * choose the winner, and the rack seed does not choose the winner either.
 *
 * Rack seed shuffles the fourteen coloured balls. The 8 is fixed in the centre
 * of the third row. That seed is the only randomness. Shots are not noised.
 *
 * Call-pocket applies only to the 8. Any other of your balls may fall in any
 * pocket. Pocketing the 8 on the break wins unless the cue ball is also
 * scratched, which loses. Pocketing the 8 before your group is clear loses.
 * The 8 in the wrong pocket loses. A scratch while pocketing the 8 loses.
 *
 * A foul is ball-in-hand anywhere, except the break, which is kitchen only.
 * Three shot-clock timeouts forfeit. A disconnect does not refund a match
 * that has already had a shot. Each shot gets one reconnect window, and
 * coming back does not start a new shot clock.
 */

import { sha256Hex } from "@/lib/fairness/core";
import {
  BALL_R,
  TABLE_H,
  TABLE_W,
  type Ball,
  type ShotInput,
  type SimResult,
  cloneBalls,
} from "./physics";

export const RULES_VERSION = "pvp-8ball-v1";
export const ENGINE_VERSION = "pool-engine-v1";

export type Group = "solids" | "stripes";
export type Seat = "A" | "B";

export type TableState = {
  v: 1;
  rules: typeof RULES_VERSION;
  physics: "pool-phys-v1" | "pool-phys-v2" | "pool-phys-v3";
  balls: Ball[];
  open: boolean;
  groupA: Group | null;
  turn: Seat;
  ballInHand: boolean;
  kitchenOnly: boolean;
  breakShot: boolean;
  timeouts: Record<Seat, number>;
  winner: Seat | null;
  reason: string | null;
  shot: number;
};

export type ShotEvent = {
  foul: boolean;
  foulReason: string | null;
  continue: boolean;
  pocketed: number[];
  winner: Seat | null;
  reason: string | null;
};

const GAP = 900;
const SPACING = BALL_R * 2 + GAP;

export function other(seat: Seat): Seat {
  return seat === "A" ? "B" : "A";
}

export function groupOf(id: number): Group | null {
  if (id >= 1 && id <= 7) return "solids";
  if (id >= 9 && id <= 15) return "stripes";
  return null;
}

export function seatGroup(state: TableState, seat: Seat): Group | null {
  if (state.groupA == null) return null;
  if (seat === "A") return state.groupA;
  return state.groupA === "solids" ? "stripes" : "solids";
}

export function groupClear(balls: readonly Ball[], group: Group): boolean {
  return balls.every((b) => groupOf(b.id) !== group || b.pocketed);
}

function xorshift(seed: Uint8Array): () => bigint {
  let s = 0n;
  for (let i = 0; i < 8; i++) s = (s << 8n) | BigInt(seed[i] ?? 0);
  if (s === 0n) s = 1n;
  const mask = (1n << 64n) - 1n;
  return () => {
    s ^= (s << 13n) & mask;
    s ^= s >> 7n;
    s ^= (s << 17n) & mask;
    s &= mask;
    return s;
  };
}

/** Fourteen ball ids with the back corners forced onto opposite groups. */
export function rackOrder(seed: Uint8Array): number[] {
  const balls = [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15];
  const next = xorshift(seed);
  for (let i = balls.length - 1; i > 0; i--) {
    const j = Number(next() % BigInt(i + 1));
    const a = balls[i];
    const b = balls[j];
    if (a == null || b == null) continue;
    balls[i] = b;
    balls[j] = a;
  }
  const back = [10, 11, 12, 13, 14];
  const left = balls[back[0] ?? 0];
  const right = balls[back[4] ?? 0];
  if (left != null && right != null && groupOf(left) === groupOf(right)) {
    const swapAt = back.slice(1, 4).find((slot) => groupOf(balls[slot] ?? 0) !== groupOf(left));
    const rightSlot = back[4] ?? 0;
    if (swapAt != null) {
      const tmp = balls[rightSlot];
      const swapped = balls[swapAt];
      if (tmp != null && swapped != null) {
        balls[rightSlot] = swapped;
        balls[swapAt] = tmp;
      }
    }
  }
  const slots: number[] = [];
  let k = 0;
  for (let slot = 0; slot < 15; slot++) {
    if (slot === 4) slots.push(8);
    else slots.push(balls[k++] ?? 1);
  }
  return slots;
}

export function rackBalls(seed: Uint8Array): Ball[] {
  const order = rackOrder(seed);
  const apexX = Math.floor((TABLE_W * 3) / 4);
  const apexY = Math.floor(TABLE_H / 2);
  const balls: Ball[] = [
    {
      id: 0,
      x: Math.floor(TABLE_W / 4),
      y: apexY,
      vx: 0,
      vy: 0,
      spin: 0,
      pocketed: false,
    },
  ];
  let slot = 0;
  for (let row = 0; row < 5; row++) {
    for (let k = 0; k <= row; k++) {
      const id = order[slot++] ?? 1;
      const x = apexX + Math.floor((row * SPACING * 866) / 1000);
      const y = apexY + Math.floor(((2 * k - row) * SPACING) / 2);
      balls.push({ id, x, y, vx: 0, vy: 0, spin: 0, pocketed: false });
    }
  }
  balls.sort((a, b) => a.id - b.id);
  return balls;
}

export function freshTable(
  seed: Uint8Array,
  physics: TableState["physics"] = "pool-phys-v3",
): TableState {
  return {
    v: 1,
    rules: RULES_VERSION,
    physics,
    balls: rackBalls(seed),
    open: true,
    groupA: null,
    turn: "A",
    ballInHand: true,
    kitchenOnly: true,
    breakShot: true,
    timeouts: { A: 0, B: 0 },
    winner: null,
    reason: null,
    shot: 0,
  };
}

export async function seedHash(seed: Uint8Array): Promise<string> {
  return sha256Hex(seed);
}

const FNV_OFFSET = 0xcbf29ce484222325n;
const FNV_PRIME = 0x100000001b3n;
const FNV_MASK = (1n << 64n) - 1n;

/** Canonical line hashed for every stored step. SQL pool_state_hash builds the same text. */
export function stateCanon(state: TableState): string {
  const body = state.balls.map((b) => `${b.id}:${b.x}:${b.y}:${b.pocketed ? 1 : 0}`).join("|");
  const extra = [
    state.turn,
    state.open ? 1 : 0,
    state.groupA ?? "-",
    state.ballInHand ? 1 : 0,
    state.kitchenOnly ? 1 : 0,
    state.breakShot ? 1 : 0,
    state.winner ?? "-",
    state.reason ?? "-",
    state.shot,
    state.timeouts.A,
    state.timeouts.B,
  ].join(":");
  return `${body}#${extra}`;
}

export function stateHash(state: TableState): string {
  const text = stateCanon(state);
  let h = FNV_OFFSET;
  for (let i = 0; i < text.length; i++) {
    h ^= BigInt(text.charCodeAt(i));
    h = (h * FNV_PRIME) & FNV_MASK;
  }
  return h.toString(16).padStart(16, "0");
}

export function overlaps(balls: readonly Ball[], x: number, y: number, ignore: number): boolean {
  for (const b of balls) {
    if (b.pocketed || b.id === ignore) continue;
    const dx = b.x - x;
    const dy = b.y - y;
    const need = BALL_R * 2 + 200;
    if (dx * dx + dy * dy < need * need) return true;
  }
  return false;
}

export function legalPlacement(state: TableState, x: number, y: number): boolean {
  if (!Number.isInteger(x) || !Number.isInteger(y)) return false;
  if (x < BALL_R || y < BALL_R || x > TABLE_W - BALL_R || y > TABLE_H - BALL_R) return false;
  if (state.kitchenOnly && x > Math.floor(TABLE_W / 4)) return false;
  return !overlaps(state.balls, x, y, 0);
}

export function placeCue(state: TableState, shot: ShotInput): string | null {
  if (!state.ballInHand) return null;
  if (shot.placeX == null || shot.placeY == null) return "PLACE_CUE";
  if (!legalPlacement(state, shot.placeX, shot.placeY)) return "ILLEGAL_PLACEMENT";
  const cue = state.balls.find((b) => b.id === 0);
  if (!cue) return "CUE_MISSING";
  cue.x = shot.placeX;
  cue.y = shot.placeY;
  cue.pocketed = false;
  cue.vx = 0;
  cue.vy = 0;
  return null;
}

function ownGroup(state: TableState): Group | null {
  return seatGroup(state, state.turn);
}

export function applyShot(
  state: TableState,
  sim: SimResult,
): { state: TableState; event: ShotEvent } {
  const next: TableState = {
    ...state,
    balls: cloneBalls(sim.balls).map((b) => ({ ...b, vx: 0, vy: 0, spin: 0 })),
    timeouts: { ...state.timeouts },
    shot: state.shot + 1,
    ballInHand: false,
    kitchenOnly: false,
    breakShot: false,
  };
  const me = state.turn;
  const opp = other(me);
  const pocketed = sim.pocketed.filter((id) => id !== 0);
  const eight = pocketed.includes(8);
  const mine = ownGroup(state);
  const cleared = mine != null && groupClear(state.balls, mine);

  const lose = (reason: string): { state: TableState; event: ShotEvent } => {
    next.winner = opp;
    next.reason = reason;
    next.turn = opp;
    return {
      state: next,
      event: { foul: true, foulReason: reason, continue: false, pocketed, winner: opp, reason },
    };
  };
  const win = (reason: string): { state: TableState; event: ShotEvent } => {
    next.winner = me;
    next.reason = reason;
    return {
      state: next,
      event: { foul: false, foulReason: null, continue: false, pocketed, winner: me, reason },
    };
  };

  if (eight && sim.cueScratch)
    return lose(state.breakShot ? "EIGHT_AND_SCRATCH_ON_BREAK" : "SCRATCH_ON_EIGHT");
  if (eight && state.breakShot) return win("EIGHT_ON_BREAK");
  if (eight && !cleared) return lose("EIGHT_EARLY");
  if (eight && cleared) return win("EIGHT_BALL");

  let foul: string | null = null;
  if (state.breakShot) {
    const objectPocket = pocketed.length > 0;
    if (!objectPocket && sim.breakRails < 4) foul = "ILLEGAL_BREAK";
  }
  if (!foul && sim.firstContact == null) foul = "NO_CONTACT";
  if (!foul && mine != null && !cleared && groupOf(sim.firstContact ?? 0) !== mine)
    foul = "WRONG_BALL";
  if (!foul && cleared && sim.firstContact !== 8) foul = "WRONG_BALL";
  if (!foul && sim.cueScratch) foul = "SCRATCH";
  if (!foul && pocketed.length === 0 && !sim.railAfterContact && !state.breakShot) foul = "NO_RAIL";

  if (!foul && state.open) {
    const firstGroup = pocketed.map(groupOf).find((g): g is Group => g != null);
    if (firstGroup) {
      next.open = false;
      next.groupA = me === "A" ? firstGroup : firstGroup === "solids" ? "stripes" : "solids";
    }
  }

  const assigned = ownGroup(next);
  const pocketedOwn = assigned != null && pocketed.some((id) => groupOf(id) === assigned);
  const pocketedOpen = state.open && pocketed.some((id) => groupOf(id) != null);
  const keep = !foul && (pocketedOwn || pocketedOpen);

  if (foul) {
    next.turn = opp;
    next.ballInHand = true;
    next.kitchenOnly = false;
    return {
      state: next,
      event: {
        foul: true,
        foulReason: foul,
        continue: false,
        pocketed,
        winner: null,
        reason: null,
      },
    };
  }
  if (!keep) next.turn = opp;
  return {
    state: next,
    event: { foul: false, foulReason: null, continue: keep, pocketed, winner: null, reason: null },
  };
}

/**
 * Called pocket is an input, not part of the resting hash. A missing call when
 * the 8 is the legal ball rejects the shot and leaves the table unchanged.
 */
export function applyPlayedShot(
  state: TableState,
  sim: SimResult,
  calledPocket: number | null,
): { state: TableState; event: ShotEvent } {
  const mine = ownGroup(state);
  const cleared = mine != null && groupClear(state.balls, mine);
  const shootingEight = cleared && !state.breakShot;
  if (shootingEight && calledPocket == null) {
    return {
      state: { ...state, balls: cloneBalls(state.balls) },
      event: {
        foul: false,
        foulReason: null,
        continue: false,
        pocketed: [],
        winner: null,
        reason: "CALL_POCKET",
      },
    };
  }
  const wrapped = applyShot(state, sim);
  if (wrapped.event.reason !== "EIGHT_BALL" || !shootingEight) return wrapped;
  if (sim.pocketOf[8] === calledPocket) return wrapped;
  const next = wrapped.state;
  const opp = other(state.turn);
  next.winner = opp;
  next.reason = "EIGHT_WRONG_POCKET";
  next.turn = opp;
  return {
    state: next,
    event: {
      foul: true,
      foulReason: "EIGHT_WRONG_POCKET",
      continue: false,
      pocketed: sim.pocketed.filter((id) => id !== 0),
      winner: opp,
      reason: "EIGHT_WRONG_POCKET",
    },
  };
}

export function applyForfeit(state: TableState, seat: Seat): TableState {
  return {
    ...state,
    balls: cloneBalls(state.balls),
    winner: other(seat),
    reason: "FORFEIT",
    turn: other(seat),
    ballInHand: false,
    kitchenOnly: false,
    shot: state.shot + 1,
  };
}

export function applyTimeout(state: TableState): TableState {
  const next: TableState = {
    ...state,
    balls: cloneBalls(state.balls),
    timeouts: { ...state.timeouts },
    ballInHand: true,
    kitchenOnly: false,
    breakShot: false,
  };
  const me = state.turn;
  next.timeouts[me] += 1;
  if (next.timeouts[me] >= 3) {
    next.winner = other(me);
    next.reason = "TIMEOUT_FORFEIT";
    next.ballInHand = false;
  }
  next.turn = other(me);
  next.shot += 1;
  return next;
}
