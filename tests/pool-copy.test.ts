import { describe, expect, it } from "vitest";
import { matchNotice, spinSentence, stakeQuote, winSentence } from "../src/lib/pool/copy";

const STAKES = [100, 200, 500, 1000, 2500, 5000];

const base = {
  status: "PLAYING",
  youWon: false,
  youLost: false,
  payout: "$9.50",
  winReason: null,
  fouled: false,
  ballInHand: false,
  kitchenOnly: false,
  shootingEight: false,
  pocketChosen: false,
  mine: true,
  group: null as "solids" | "stripes" | null,
  breakShot: false,
  busy: false,
  rolling: false,
  offline: false,
  reconnecting: false,
  seat: "A" as const,
};

describe("stake quote", () => {
  it("conserves every stake tier in integer cents", () => {
    for (const stake of STAKES) {
      const quote = stakeQuote(stake);
      expect(quote.payout + quote.fee).toBe(quote.pot);
      expect(quote.pot).toBe(stake * 2);
      expect(quote.fee).toBe(Math.floor((quote.pot * 500) / 10_000));
    }
    expect(stakeQuote(500)).toEqual({ stake: 500, pot: 1000, fee: 50, payout: 950 });
  });
});

describe("match notice", () => {
  it("uses plain language and hides engine codes", () => {
    expect(matchNotice({ ...base, status: "WAITING" })).toBe("Waiting for opponent");
    expect(matchNotice({ ...base, status: "CANCELLED" })).toBe(
      "Match cancelled. Both stakes were refunded.",
    );
    expect(matchNotice({ ...base, fouled: true, ballInHand: true })).toBe(
      "Foul. Ball in hand — place the cue ball.",
    );
    expect(matchNotice({ ...base, ballInHand: true, kitchenOnly: true })).toBe(
      "Ball in hand — place the cue ball behind the head string.",
    );
    expect(matchNotice({ ...base, shootingEight: true, pocketChosen: false })).toBe(
      "Choose a pocket for the 8-ball",
    );
    expect(matchNotice({ ...base, group: "solids" })).toBe(
      "Your turn. Pocket your remaining solids.",
    );
    expect(matchNotice({ ...base, mine: false })).toBe("Opponent's turn");
    expect(matchNotice({ ...base, rolling: true })).toBe("Balls moving");
    expect(matchNotice({ ...base, busy: true })).toBe("Sending your shot");
    expect(matchNotice({ ...base, offline: true, busy: true })).toBe("Reconnecting");
    const won = matchNotice({
      ...base,
      status: "COMPLETED",
      youWon: true,
      winReason: "EIGHT_BALL",
    });
    expect(won).toBe("You won $9.50. The 8-ball fell in the called pocket.");
    expect(won).not.toMatch(/pool-phys|rpc|hash|ledger/i);
    expect(winSentence("NOT_A_CODE")).toBeNull();
  });

  it("describes spin without raw units", () => {
    expect(spinSentence(0, 0)).toBe("No side spin, no follow or draw");
    expect(spinSentence(-200, 400)).toBe("Left English, follow");
    expect(spinSentence(200, -400)).toBe("Right English, draw");
  });
});
