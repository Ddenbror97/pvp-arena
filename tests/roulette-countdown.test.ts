import { describe, expect, it } from "vitest";
import { rouletteBarFill, rouletteBarLabel } from "../src/lib/roulette/countdown";

const opens = "2026-10-15T16:32:17.725Z";
const starts = "2026-10-15T16:32:21.265Z";
const ends = "2026-10-15T16:32:40.265Z";
const at = (iso: string, deltaMs = 0) => Date.parse(iso) + deltaMs;
const round = {
  status: "BETTING",
  created_at: opens,
  betting_seconds: 19,
  betting_started_at: starts,
  betting_ends_at: ends,
};

describe("roulette countdown before the betting clock starts", () => {
  it("fills from the row opening to full, so the bar never stands still", () => {
    expect(rouletteBarFill(true, opens, starts, ends, at(opens))).toBe(0);
    const half = rouletteBarFill(true, opens, starts, ends, at(opens, 1770));
    expect(half).toBeCloseTo(0.5, 2);
    expect(rouletteBarFill(true, opens, starts, ends, at(starts, -1))).toBeCloseTo(1, 3);
  });
  it("counts down to the start instead of freezing at the full betting time", () => {
    expect(rouletteBarLabel(round, at(starts, -2000))).toBe("Next round in 2.0s");
    expect(rouletteBarLabel(round, at(starts, -500))).toBe("Next round in 0.5s");
  });
  it("is full when the opening time is unknown", () => {
    expect(rouletteBarFill(true, null, starts, ends, at(starts, -1000))).toBe(1);
  });
});

describe("roulette countdown during betting", () => {
  it("drains from full at the start to empty at the end", () => {
    expect(rouletteBarFill(true, opens, starts, ends, at(starts))).toBe(1);
    expect(rouletteBarFill(true, opens, starts, ends, at(starts, 9500))).toBeCloseTo(0.5, 3);
    expect(rouletteBarFill(true, opens, starts, ends, at(ends))).toBe(0);
    expect(rouletteBarLabel(round, at(starts, 1000))).toBe("Rolling in 18.0s");
  });
  it("is empty outside a betting round", () => {
    expect(rouletteBarFill(false, opens, starts, ends, at(starts, 1000))).toBe(0);
  });
});
