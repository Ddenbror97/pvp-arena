import { describe, expect, it } from "vitest";
import {
  chanceBps, estimatedChanceBps, formatBps, formatUsd, landingRotation, nextTimer, parseUsdToCents, wheelSegments,
} from "../src/lib/jackpot/math";

describe("money", () => {
  it("formats cents", () => {
    expect(formatUsd(1248500)).toBe("$12,485.00");
    expect(formatUsd(5)).toBe("$0.05");
  });
  it("parses input to integer cents without floats", () => {
    expect(parseUsdToCents("25")).toBe(2500);
    expect(parseUsdToCents("$0.1")).toBe(10);
    expect(parseUsdToCents("19.99")).toBe(1999);
    expect(parseUsdToCents("1.999")).toBeNull();
    expect(parseUsdToCents("-5")).toBeNull();
    expect(parseUsdToCents("abc")).toBeNull();
  });
});

describe("probability", () => {
  it("proportional chances from spec example", () => {
    expect(chanceBps(2500, 10000)).toBe(2500);
    expect(chanceBps(5000, 10000)).toBe(5000);
    expect(formatBps(3742)).toBe("37.42%");
  });
  it("multiple entries aggregate", () => {
    expect(chanceBps(100 + 50 + 100, 1000)).toBe(2500);
  });
  it("estimate includes the new amount in the pot", () => {
    expect(estimatedChanceBps(0, 7500, 2500)).toBe(2500);
  });
});

describe("timer rules", () => {
  const empty = { playerCount: 0, startedAtMs: null, endAtMs: null, maxEndAtMs: null };
  it("one player does not start the countdown", () => {
    expect(nextTimer(empty, 0, true).endAtMs).toBeNull();
  });
  it("second player starts 60s", () => {
    const s = nextTimer(nextTimer(empty, 0, true), 1000, true);
    expect(s.endAtMs).toBe(61000);
    expect(s.maxEndAtMs).toBe(181000);
  });
  it("new players add 10s, capped at 180s", () => {
    let s = nextTimer(nextTimer(empty, 0, true), 0, true);
    for (let i = 0; i < 20; i++) s = nextTimer(s, 0, true);
    expect(s.endAtMs).toBe(180000);
  });
  it("existing player adding more does not extend", () => {
    const s = nextTimer(nextTimer(empty, 0, true), 0, true);
    expect(nextTimer(s, 0, false).endAtMs).toBe(60000);
  });
});

describe("wheel", () => {
  it("segments are proportional", () => {
    const seg = wheelSegments([
      { user_id: "a", total_amount: 10 },
      { user_id: "b", total_amount: 20 },
      { user_id: "c", total_amount: 70 },
    ]);
    expect(seg[0].end).toBeCloseTo(36);
    expect(seg[2].start).toBeCloseTo(108);
  });
  it("landing rotation points at the ticket", () => {
    const rot = landingRotation(50, 100, 6, 0);
    expect(rot % 360).toBeCloseTo(180);
  });
});
