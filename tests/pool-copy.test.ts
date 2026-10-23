import { describe, expect, it } from "vitest";
import { matchNotice, parseStakeDollars, spinSentence, stakeDraft, stakeQuote, winSentence } from "../src/lib/pool/copy";

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
  decided: false,
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

  it("reads a typed dollar stake inside $1 to $50", () => {
    expect(parseStakeDollars("5")).toBe(500);
    expect(parseStakeDollars("$10")).toBe(1000);
    expect(parseStakeDollars("1.5")).toBe(150);
    expect(parseStakeDollars("1.01")).toBe(101);
    expect(parseStakeDollars("50")).toBe(5000);
    expect(parseStakeDollars("1")).toBe(100);
    expect(stakeDraft(500)).toBe("5");
    expect(stakeDraft(150)).toBe("1.50");
    expect(parseStakeDollars("0.50")).toBeNull();
    expect(parseStakeDollars("51")).toBeNull();
    expect(parseStakeDollars("5.555")).toBeNull();
    expect(parseStakeDollars("")).toBeNull();
    expect(parseStakeDollars("12", 100, 1000)).toBeNull();
  });
});

describe("match notice", () => {
  it("uses plain language and hides engine codes", () => {
    expect(matchNotice({ ...base, status: "WAITING" })).toBe(
      "Waiting for an opponent. Your stake stays locked for up to 24 hours.",
    );
    expect(matchNotice({ ...base, status: "WAITING", seat: "B" })).toBe("Waiting for an opponent");
    expect(matchNotice({ ...base, status: "CANCELLED", cancelReason: "WAITING_EXPIRED" })).toBe(
      "No opponent joined in 24 hours. Your stake was refunded.",
    );
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
    expect(
      matchNotice({ ...base, shootingEight: true, ballInHand: true, pocketChosen: false }),
    ).toBe("Place the cue ball, then choose a pocket for the 8-ball.");
    expect(
      matchNotice({ ...base, shootingEight: true, ballInHand: true, fouled: true, pocketChosen: false }),
    ).toBe("Foul. Place the cue ball, then choose a pocket for the 8-ball.");
    expect(matchNotice({ ...base, shootingEight: true, mine: false, ballInHand: true })).toBe(
      "Opponent has ball in hand and is shooting the 8-ball.",
    );
    expect(matchNotice({ ...base, shootingEight: true, mine: false, ballInHand: false })).toBe(
      "Opponent is shooting the 8-ball.",
    );
    expect(matchNotice({ ...base, mine: false, ballInHand: true })).toBe("Opponent has ball in hand.");
    expect(
      matchNotice({
        ...base,
        decided: true,
        youWon: true,
        winReason: "EIGHT_BALL",
        ballInHand: true,
      }),
    ).toBe("You won the rack. The 8-ball fell in the called pocket.");
    expect(matchNotice({ ...base, group: "solids" })).toBe(
      "Your turn. Pocket your remaining solids.",
    );
    expect(matchNotice({ ...base, breakShot: true, group: null })).toBe(
      "Your turn. Drag to aim, drag back, and release to shoot.",
    );
    expect(matchNotice({ ...base, group: null })).toBe(
      "Your turn. Drag back and release to shoot.",
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
