import { describe, expect, it } from "vitest";
import { parseCard } from "../src/lib/poker/cards";
import {
  botDelayMs,
  botRoll,
  botStrength,
  chooseBotAction,
  type BotLegal,
  type BotView,
} from "../src/lib/poker/bot";

const cards = (codes: string) => codes.split(/\s+/).filter(Boolean).map(parseCard);
const hole = (codes: string) => {
  const [a, b] = cards(codes);
  return [a!, b!] as const;
};

const open: BotLegal = {
  toCall: 0,
  canFold: true,
  canCheck: true,
  canCall: false,
  callAmount: 0,
  canRaise: true,
  minRaiseTo: 10,
  maxRaiseTo: 500,
  currentBet: 0,
};

function view(patch: Partial<BotView> & Pick<BotView, "hole">): BotView {
  return {
    style: "standard",
    board: [],
    pot: 30,
    heroStack: 500,
    heroStreetBet: 0,
    effectiveStack: 500,
    opponents: 1,
    position: "late",
    raisesThisStreet: 0,
    bigBlind: 10,
    roll: 0,
    legal: open,
    ...patch,
  };
}

describe("poker bot decisions", () => {
  it("repeats the same decision for the same view", () => {
    const v = view({ hole: hole("As Kd"), roll: 1234 });
    expect(chooseBotAction(v)).toEqual(chooseBotAction(v));
  });

  it("bets a strong unpaired broadway and checks junk when nobody has bet", () => {
    const aces = chooseBotAction(view({ hole: hole("Ah Ad") }));
    const junk = chooseBotAction(view({ hole: hole("7c 2d"), roll: 5000 }));
    expect(["BET", "RAISE", "ALL_IN"]).toContain(aces.action);
    expect(junk.action).toBe("CHECK");
  });

  it("folds a weak hand against a large bet and never folds a free check", () => {
    const facing: BotLegal = {
      ...open,
      toCall: 80,
      canCheck: false,
      canCall: true,
      callAmount: 80,
      currentBet: 80,
      minRaiseTo: 160,
    };
    const folded = chooseBotAction(
      view({ hole: hole("7c 2d"), pot: 100, legal: facing, roll: 5000 }),
    );
    expect(folded.action).toBe("FOLD");
    const free = chooseBotAction(view({ hole: hole("7c 2d"), roll: 1 }));
    expect(free.action).toBe("CHECK");
  });

  it("keeps a bet inside the legal raise bounds", () => {
    const decision = chooseBotAction(view({ hole: hole("Ah Ad"), pot: 90, roll: 10 }));
    if (decision.action === "BET" || decision.action === "RAISE") {
      expect(decision.amount).toBeGreaterThanOrEqual(open.minRaiseTo);
      expect(decision.amount).toBeLessThanOrEqual(open.maxRaiseTo);
    } else {
      expect(decision.action).toBe("ALL_IN");
    }
  });

  it("does not bet when raising is illegal", () => {
    const checked = chooseBotAction(
      view({
        hole: hole("Ah Ad"),
        legal: { ...open, canRaise: false, minRaiseTo: 0, maxRaiseTo: 0 },
      }),
    );
    expect(checked.action).toBe("CHECK");
  });

  it("plays the same cards differently across the three styles", () => {
    const board = cards("Kd 9c 2s");
    const actions = (["casual", "standard", "competitive"] as const).map((style) =>
      chooseBotAction(
        view({
          style,
          hole: hole("Kh 8d"),
          board,
          pot: 80,
          position: "middle",
          roll: 5000,
        }),
      ).action,
    );
    expect(actions[0]).toBe("CHECK");
    expect(actions[2]).toBe("BET");
  });

  it("uses only the seat's own cards for strength", () => {
    const board = cards("Ah Kd 2c");
    const withAce = botStrength(hole("As 9d"), board);
    const without = botStrength(hole("7c 3d"), board);
    expect(withAce).toBeGreaterThan(without);
  });

  it("bounds the presentation delay by the action", () => {
    for (let roll = 0; roll < 10000; roll += 137) {
      expect(botDelayMs("CHECK", roll)).toBeGreaterThanOrEqual(800);
      expect(botDelayMs("FOLD", roll)).toBeLessThanOrEqual(1800);
      expect(botDelayMs("CALL", roll)).toBeGreaterThanOrEqual(1000);
      expect(botDelayMs("CALL", roll)).toBeLessThanOrEqual(2500);
      expect(botDelayMs("BET", roll)).toBeGreaterThanOrEqual(1500);
      expect(botDelayMs("RAISE", roll)).toBeLessThanOrEqual(3500);
    }
  });

  it("derives a stable roll", () => {
    expect(botRoll(42, 3, "FLOP", 7)).toBe(botRoll(42, 3, "FLOP", 7));
    expect(botRoll(42, 3, "FLOP", 7)).not.toBe(botRoll(42, 3, "TURN", 7));
  });
});
