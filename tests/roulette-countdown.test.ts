import { describe, expect, it } from "vitest";
import {
  RESULT_HOLD_MAX_MS,
  RESULT_HOLD_MS,
  resultHoldUntil,
  rouletteBarAnchor,
  rouletteBarFill,
  rouletteBarLabel,
} from "../src/lib/roulette/countdown";

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

const samples = (anchor: number, from: number) =>
  Array.from({ length: 300 }, (_, i) => rouletteBarFill(true, anchor, ends, from + i * 100));

describe("roulette countdown first shown before the betting clock starts", () => {
  const anchor = rouletteBarAnchor(opens, starts, at(opens, 1000));

  it("anchors at the row opening", () => {
    expect(anchor).toBe(at(opens));
  });
  it("drains through the gap and the betting window without ever rising", () => {
    const fills = samples(anchor, at(opens, 1000));
    for (let i = 1; i < fills.length; i++) expect(fills[i]).toBeLessThanOrEqual(fills[i - 1]);
    expect(fills[0]).toBeLessThan(1);
    expect(fills[0]).toBeGreaterThan(fills[fills.length - 1]);
    expect(rouletteBarFill(true, anchor, ends, at(ends))).toBe(0);
  });
  it("counts down to the start instead of freezing at the full betting time", () => {
    expect(rouletteBarLabel(round, at(starts, -2000))).toBe("Next round in 2.0s");
    expect(rouletteBarLabel(round, at(starts, -500))).toBe("Next round in 0.5s");
  });
  it("anchors at the start when the opening time is unknown or not earlier", () => {
    expect(rouletteBarAnchor(null, starts, at(starts, -1000))).toBe(at(starts));
    expect(rouletteBarAnchor(starts, starts, at(starts, -1000))).toBe(at(starts));
  });
});

describe("roulette countdown first shown once betting has started", () => {
  const anchor = rouletteBarAnchor(opens, starts, at(starts));

  it("drains from full at the start to empty at the end", () => {
    expect(anchor).toBe(at(starts));
    expect(rouletteBarFill(true, anchor, ends, at(starts))).toBe(1);
    expect(rouletteBarFill(true, anchor, ends, at(starts, 9500))).toBeCloseTo(0.5, 3);
    expect(rouletteBarFill(true, anchor, ends, at(ends))).toBe(0);
    expect(rouletteBarLabel(round, at(starts, 1000))).toBe("Rolling in 18.0s");
  });
  it("never rises", () => {
    const fills = samples(anchor, at(starts));
    for (let i = 1; i < fills.length; i++) expect(fills[i]).toBeLessThanOrEqual(fills[i - 1]);
  });
  it("is empty outside a betting round or without a window", () => {
    expect(rouletteBarFill(false, anchor, ends, at(starts, 1000))).toBe(0);
    expect(rouletteBarFill(true, NaN, ends, at(starts, 1000))).toBe(0);
    expect(rouletteBarAnchor(opens, null, at(opens))).toBeNaN();
  });
});

describe("roulette result hold", () => {
  const spinEnd = Date.parse("2026-10-15T16:32:17.625Z");

  it("uses a 1.5s minimum and a 6s cap", () => {
    expect(RESULT_HOLD_MS).toBe(1500);
    expect(RESULT_HOLD_MAX_MS).toBe(6000);
  });
  it("hands over when the next round's betting clock starts on schedule", () => {
    expect(resultHoldUntil(spinEnd, spinEnd + 1640)).toBe(spinEnd + 1640);
  });
  it("holds for the minimum when the next round starts sooner", () => {
    expect(resultHoldUntil(spinEnd, spinEnd + 1000)).toBe(spinEnd + RESULT_HOLD_MS);
    expect(resultHoldUntil(spinEnd, spinEnd - 500)).toBe(spinEnd + RESULT_HOLD_MS);
  });
  it("stops at the cap when the next round starts later", () => {
    expect(resultHoldUntil(spinEnd, spinEnd + 9000)).toBe(spinEnd + RESULT_HOLD_MAX_MS);
  });
  it("is exact at both boundaries", () => {
    expect(resultHoldUntil(spinEnd, spinEnd + RESULT_HOLD_MS)).toBe(spinEnd + RESULT_HOLD_MS);
    expect(resultHoldUntil(spinEnd, spinEnd + RESULT_HOLD_MAX_MS)).toBe(
      spinEnd + RESULT_HOLD_MAX_MS,
    );
  });
  it("holds for the minimum when the next start is unknown", () => {
    expect(resultHoldUntil(spinEnd, NaN)).toBe(spinEnd + RESULT_HOLD_MS);
  });
});
