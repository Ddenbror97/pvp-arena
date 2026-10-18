import { describe, expect, it } from "vitest";
import { parseCard } from "@/lib/poker/cards";
import { categoryOf, evaluate, handName } from "@/lib/poker/evaluator";
import { settlePots } from "@/lib/poker/pots";
import {
  act,
  dealPositions,
  legalActions,
  settleHand,
  startHand,
  type HandState,
} from "@/lib/poker/engine";

const cards = (s: string) => s.split(" ").map(parseCard);

function rng(seed: number) {
  let x = seed >>> 0 || 1;
  return () => {
    x ^= x << 13;
    x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    return x / 2 ** 32;
  };
}

/** Reference: best of all 5-card subsets, scored by the same evaluator on exactly five cards. */
function bruteBest(seven: number[]) {
  let best = -1;
  for (let a = 0; a < 7; a++)
    for (let b = a + 1; b < 7; b++) {
      const five = seven.filter((_, i) => i !== a && i !== b);
      best = Math.max(best, evaluate(five));
    }
  return best;
}

describe("poker evaluator", () => {
  it("ranks every category in order", () => {
    const hands = [
      "2c 7d 9h Jc Ks 3d 4s",
      "Ac Ad 9h Jc Ks 3d 4s",
      "Ac Ad 9h 9c Ks 3d 4s",
      "Ac Ad Ah 9c Ks 3d 4s",
      "5c 6d 7h 8c 9s Kd 2s",
      "2h 7h 9h Jh Kh 3d 4s",
      "Ac Ad Ah 9c 9s 3d 4s",
      "Ac Ad Ah As 9s 3d 4s",
      "5h 6h 7h 8h 9h Kd 2s",
    ].map((h) => evaluate(cards(h)));
    for (let i = 0; i < hands.length; i++) expect(categoryOf(hands[i]!)).toBe(i);
    for (let i = 1; i < hands.length; i++) expect(hands[i]!).toBeGreaterThan(hands[i - 1]!);
  });

  it("handles the wheel, broadway and kickers", () => {
    expect(evaluate(cards("Ac 2d 3h 4c 5s Kd Qs"))).toBeLessThan(
      evaluate(cards("2d 3h 4c 5s 6d Kd Qs")),
    );
    expect(handName(evaluate(cards("Ac 2c 3c 4c 5c Kd Qs")))).toBe("Straight flush");
    expect(evaluate(cards("Ac Kc Qc Jc Tc 2d 3s"))).toBeGreaterThan(
      evaluate(cards("9c Kc Qc Jc Tc 2d 3s")),
    );
    expect(evaluate(cards("Ac Ad Kh Qc 2s 3d 4s"))).toBeGreaterThan(
      evaluate(cards("Ac Ad Kh Jc 2s 3d 4s")),
    );
    expect(evaluate(cards("Ac Ad Kh Kc Qs Qd 4s"))).toBe(evaluate(cards("Ac Ad Kh Kc Qs 3d 4s")));
    expect(evaluate(cards("Ac Ad Ah Kc Ks Kd 4s"))).toBe(evaluate(cards("Ac Ad Ah Kc Ks 2d 4s")));
  });

  it("agrees with a brute-force best-five search on 20k random hands", () => {
    const r = rng(7);
    for (let n = 0; n < 20000; n++) {
      const deck = Array.from({ length: 52 }, (_, i) => i);
      for (let i = 51; i > 0; i--) {
        const j = Math.floor(r() * (i + 1));
        [deck[i], deck[j]] = [deck[j]!, deck[i]!];
      }
      const seven = deck.slice(0, 7);
      expect(evaluate(seven)).toBe(bruteBest(seven));
    }
  });
});

describe("poker pots and fee", () => {
  it("returns the uncalled bet before the fee", () => {
    const s = settlePots(
      [
        { seat: 0, contributed: 1000, folded: false, score: 5 },
        { seat: 1, contributed: 400, folded: true },
      ],
      { feeBps: 500, flopDealt: true, button: 1 },
    );
    expect(s.refunds).toEqual({ 0: 600 });
    expect(s.pots).toHaveLength(1);
    expect(s.pots[0]).toMatchObject({ amount: 800, fee: 40 });
    expect(s.payouts).toEqual({ 0: 1360 });
    expect(s.feeTotal).toBe(40);
  });

  it("charges nothing when the hand ends before the flop", () => {
    const s = settlePots(
      [
        { seat: 2, contributed: 300, folded: false },
        { seat: 3, contributed: 100, folded: true },
        { seat: 4, contributed: 50, folded: true },
      ],
      { feeBps: 500, flopDealt: false, button: 1 },
    );
    expect(s.feeTotal).toBe(0);
    expect(s.refunds).toEqual({ 2: 200 });
    expect(s.payouts).toEqual({ 2: 450 });
  });

  it("builds side pots and charges 5% of each, floored", () => {
    const s = settlePots(
      [
        { seat: 0, contributed: 100, folded: false, score: 900 },
        { seat: 1, contributed: 500, folded: false, score: 500 },
        { seat: 2, contributed: 500, folded: false, score: 100 },
        { seat: 3, contributed: 77, folded: true },
      ],
      { feeBps: 500, flopDealt: true, button: 3 },
    );
    expect(s.pots.map((p) => p.amount)).toEqual([377, 800]);
    expect(s.pots.map((p) => p.fee)).toEqual([18, 40]);
    expect(s.pots[0]!.winners).toEqual([0]);
    expect(s.pots[1]!.winners).toEqual([1]);
    expect(s.payouts).toEqual({ 0: 359, 1: 760 });
    const total = 100 + 500 + 500 + 77;
    expect(Object.values(s.payouts).reduce((a, b) => a + b, 0) + s.feeTotal).toBe(total);
  });

  it("splits a pot and gives odd cents left of the button first", () => {
    const s = settlePots(
      [
        { seat: 1, contributed: 101, folded: false, score: 7 },
        { seat: 4, contributed: 101, folded: false, score: 7 },
        { seat: 5, contributed: 101, folded: false, score: 3 },
      ],
      { feeBps: 500, flopDealt: true, button: 3 },
    );
    expect(s.pots[0]).toMatchObject({ amount: 303, fee: 15 });
    expect(s.payouts).toEqual({ 4: 144, 1: 144 });
    const odd = settlePots(
      [
        { seat: 1, contributed: 50, folded: false, score: 7 },
        { seat: 4, contributed: 50, folded: false, score: 7 },
        { seat: 5, contributed: 1, folded: true },
      ],
      { feeBps: 500, flopDealt: true, button: 3 },
    );
    expect(odd.pots[0]).toMatchObject({ amount: 101, fee: 5 });
    expect(odd.payouts).toEqual({ 4: 48, 1: 48 });
    const three = settlePots(
      [
        { seat: 1, contributed: 20, folded: false, score: 7 },
        { seat: 4, contributed: 20, folded: false, score: 7 },
      ],
      { feeBps: 500, flopDealt: true, button: 3 },
    );
    expect(three.pots[0]).toMatchObject({ amount: 40, fee: 2 });
    expect(three.payouts).toEqual({ 4: 19, 1: 19 });
    const oddCent = settlePots(
      [
        { seat: 1, contributed: 21, folded: false, score: 7 },
        { seat: 4, contributed: 21, folded: false, score: 7 },
        { seat: 5, contributed: 1, folded: true },
      ],
      { feeBps: 0, flopDealt: true, button: 3 },
    );
    expect(oddCent.pots[0]).toMatchObject({ amount: 43, fee: 0, winners: [4, 1] });
    expect(oddCent.payouts).toEqual({ 4: 22, 1: 21 });
    const oddLeft = settlePots(
      [
        { seat: 1, contributed: 22, folded: false, score: 7 },
        { seat: 4, contributed: 21, folded: false, score: 7 },
      ],
      { feeBps: 0, flopDealt: true, button: 3 },
    );
    expect(oddLeft.refunds).toEqual({ 1: 1 });
    expect(oddLeft.payouts).toEqual({ 4: 21, 1: 22 });
  });

  it("conserves money on random multiway all-ins", () => {
    const r = rng(11);
    for (let n = 0; n < 5000; n++) {
      const k = 2 + Math.floor(r() * 5);
      const players = Array.from({ length: k }, (_, seat) => ({
        seat,
        contributed: Math.floor(r() * 5000),
        folded: r() < 0.3,
        score: Math.floor(r() * 4),
      }));
      if (!players.some((p) => !p.folded)) players[0]!.folded = false;
      const s = settlePots(players, { feeBps: 500, flopDealt: r() < 0.7, button: 0 });
      const total = players.reduce((a, p) => a + p.contributed, 0);
      const paid = Object.values(s.payouts).reduce((a, b) => a + b, 0);
      expect(paid + s.feeTotal).toBe(total);
      for (const p of players)
        if (p.folded) expect(s.payouts[p.seat] ?? 0).toBe(s.refunds[p.seat] ?? 0);
    }
  });
});

const seats3 = [
  { seat: 0, stack: 1000 },
  { seat: 2, stack: 1000 },
  { seat: 4, stack: 1000 },
];

describe("poker betting rules", () => {
  it("posts blinds and opens preflop action left of the big blind", () => {
    const s = startHand({ seats: seats3, button: 0, sb: 5, bb: 10 });
    expect([s.sbSeat, s.bbSeat]).toEqual([2, 4]);
    expect(s.toAct).toBe(0);
    expect(legalActions(s)).toMatchObject({
      toCall: 10,
      minRaiseTo: 20,
      maxRaiseTo: 1000,
      canRaise: true,
    });
  });

  it("heads-up: button posts the small blind, acts first preflop and last after the flop", () => {
    const s = startHand({
      seats: [
        { seat: 1, stack: 500 },
        { seat: 3, stack: 500 },
      ],
      button: 3,
      sb: 5,
      bb: 10,
    });
    expect([s.sbSeat, s.bbSeat, s.toAct]).toEqual([3, 1, 3]);
    act(s, 3, "CALL");
    expect(s.toAct).toBe(1);
    act(s, 1, "CHECK");
    expect(s.street).toBe("FLOP");
    expect(s.toAct).toBe(1);
  });

  it("gives the big blind the option when everyone limps", () => {
    const s = startHand({ seats: seats3, button: 0, sb: 5, bb: 10 });
    act(s, 0, "CALL");
    act(s, 2, "CALL");
    expect(s.toAct).toBe(4);
    expect(legalActions(s)).toMatchObject({ canCheck: true, canRaise: true });
    act(s, 4, "CHECK");
    expect(s.street).toBe("FLOP");
    expect(s.toAct).toBe(2);
  });

  it("enforces the minimum raise and the last full raise size", () => {
    const s = startHand({ seats: seats3, button: 0, sb: 5, bb: 10 });
    expect(() => act(s, 0, "RAISE", 15)).toThrow("BELOW_MIN_RAISE");
    act(s, 0, "RAISE", 30);
    expect(legalActions(s)).toMatchObject({ minRaiseTo: 50 });
    act(s, 2, "RAISE", 80);
    expect(legalActions(s)).toMatchObject({ minRaiseTo: 130 });
  });

  it("a short all-in does not reopen betting for a player who already acted", () => {
    const s = startHand({
      seats: [
        { seat: 0, stack: 1000 },
        { seat: 1, stack: 1000 },
        { seat: 2, stack: 45 },
      ],
      button: 2,
      sb: 5,
      bb: 10,
    });
    // seat 0 SB, seat 1 BB, seat 2 (button) acts first.
    act(s, 2, "CALL");
    act(s, 0, "CALL");
    act(s, 1, "CHECK");
    expect(s.street).toBe("FLOP");
    act(s, 0, "BET", 30);
    act(s, 1, "CALL");
    act(s, 2, "ALL_IN");
    expect(s.currentBet).toBe(35);
    expect(s.toAct).toBe(0);
    expect(legalActions(s)).toMatchObject({ canRaise: false, toCall: 5 });
    act(s, 0, "CALL");
    expect(legalActions(s)).toMatchObject({ seat: 1, canRaise: false });
  });

  it("runs the board out when the remaining players are all-in", () => {
    const s = startHand({
      seats: [
        { seat: 0, stack: 300 },
        { seat: 1, stack: 1000 },
      ],
      button: 0,
      sb: 5,
      bb: 10,
    });
    act(s, 0, "ALL_IN");
    act(s, 1, "CALL");
    expect(s.ended).toBe(true);
    expect(s.street).toBe("SHOWDOWN");
  });

  it("a big blind all-in for less than the small blind needs no call", () => {
    const s = startHand({
      seats: [
        { seat: 0, stack: 1000 },
        { seat: 1, stack: 3 },
      ],
      button: 0,
      sb: 5,
      bb: 10,
    });
    expect(s.ended).toBe(true);
    const settled = settleHand(s, {
      feeBps: 500,
      holeCards: { 0: cards("Ac Ad"), 1: cards("2c 7d") },
      board: cards("Kh Qs 9c 4d 3h"),
    });
    expect(settled.refunds).toEqual({ 0: 2 });
    expect(settled.payouts).toEqual({ 0: 8 });
    expect(settled.feeTotal).toBe(0);
  });

  it("a walk ends the hand with no fee", () => {
    const s = startHand({ seats: seats3, button: 0, sb: 5, bb: 10 });
    act(s, 0, "FOLD");
    act(s, 2, "FOLD");
    expect(s.ended).toBe(true);
    const settled = settleHand(s, { feeBps: 500, holeCards: {}, board: [] });
    expect(settled.payouts).toEqual({ 4: 15 });
    expect(settled.feeTotal).toBe(0);
  });

  it("a new player posting a live big blind can check the option", () => {
    const s = startHand({
      seats: [
        { seat: 0, stack: 1000 },
        { seat: 2, stack: 1000 },
        { seat: 4, stack: 1000 },
        { seat: 5, stack: 1000, postsBigBlind: true },
      ],
      button: 0,
      sb: 5,
      bb: 10,
    });
    act(s, 5, "CHECK");
    act(s, 0, "CALL");
    act(s, 2, "CALL");
    act(s, 4, "CHECK");
    expect(s.street).toBe("FLOP");
  });

  it("deals hole cards round-robin then burn, flop, burn, turn, burn, river", () => {
    expect(dealPositions(3)).toEqual({
      hole: [
        [0, 3],
        [1, 4],
        [2, 5],
      ],
      flop: [7, 8, 9],
      turn: 11,
      river: 13,
    });
  });

  it("money is conserved over random full hands", () => {
    const r = rng(23);
    for (let n = 0; n < 3000; n++) {
      const k = 2 + Math.floor(r() * 5);
      const seatNos = [0, 1, 2, 3, 4, 5].sort(() => r() - 0.5).slice(0, k);
      const seats = seatNos.map((seat) => ({ seat, stack: 1 + Math.floor(r() * 3000) }));
      const s: HandState = startHand({ seats, button: seatNos[0]!, sb: 5, bb: 10 });
      const start = seats.reduce((a, x) => a + x.stack, 0);
      let guard = 0;
      while (!s.ended && guard++ < 200) {
        const la = legalActions(s)!;
        const roll = r();
        if (roll < 0.15) act(s, la.seat, "FOLD");
        else if (roll < 0.3 && la.canRaise) act(s, la.seat, "ALL_IN");
        else if (roll < 0.5 && la.canRaise)
          act(s, la.seat, s.currentBet === 0 ? "BET" : "RAISE", la.minRaiseTo);
        else act(s, la.seat, la.canCheck ? "CHECK" : "CALL");
      }
      expect(s.ended).toBe(true);
      const deck = Array.from({ length: 52 }, (_, i) => i).sort(() => r() - 0.5);
      const pos = dealPositions(s.players.length);
      const hole: Record<number, number[]> = {};
      s.players.forEach((p, i) => (hole[p.seat] = pos.hole[i]!.map((x) => deck[x]!)));
      const board = [...pos.flop, pos.turn, pos.river].map((x) => deck[x]!);
      const settled = settleHand(s, { feeBps: 500, holeCards: hole, board });
      const end = s.players.reduce((a, p) => a + p.stack + (settled.payouts[p.seat] ?? 0), 0);
      expect(end + settled.feeTotal).toBe(start);
    }
  });
});
