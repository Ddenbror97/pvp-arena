import { describe, expect, it } from "vitest";
import { Cadence, sendRate } from "../workers/fps/room-clock";

/** The room's send schedule on a timer that fires once a tick (33 ms). */
function run(hz: number, firingMs = 33, seconds = 10) {
  const cadence = new Cadence(hz);
  const sent: number[] = [];
  for (let now = 1_000_000; now < 1_000_000 + seconds * 1000; now += firingMs)
    if (cadence.due(now)) sent.push(now);
  const gaps = sent.slice(1).map((t, i) => t - sent[i]!);
  return { perSecond: sent.length / seconds, maxGap: Math.max(...gaps) };
}

describe("room send cadence", () => {
  it("sends at the configured rate, not a rounded-down one", () => {
    expect(run(30).perSecond).toBeCloseTo(30, 0);
    const twenty = run(20);
    expect(twenty.perSecond).toBeGreaterThan(19.5);
    expect(twenty.perSecond).toBeLessThan(20.5);
    expect(twenty.maxGap).toBeLessThanOrEqual(66);
    const fifteen = run(15);
    expect(fifteen.perSecond).toBeGreaterThan(14.8);
    expect(fifteen.perSecond).toBeLessThan(15.4);
    expect(fifteen.maxGap).toBeLessThanOrEqual(66);
  });

  it("keeps the rate on a slightly slow timer and restarts after a stall", () => {
    for (const firing of [33.4, 34, 35]) {
      expect(run(15, firing).perSecond).toBeGreaterThan(14);
      expect(run(15, firing).perSecond).toBeLessThan(15.4);
      expect(run(20, firing).perSecond).toBeGreaterThan(19);
      expect(run(20, firing).perSecond).toBeLessThan(20.6);
    }
    const cadence = new Cadence(15);
    expect(cadence.due(1000)).toBe(true);
    // Five seconds stalled: one send, no burst to catch up.
    expect(cadence.due(6000)).toBe(true);
    expect(cadence.due(6033)).toBe(false);
    expect(cadence.due(6066)).toBe(true);
  });

  it("reads the rate from the environment within bounds", () => {
    expect(sendRate(undefined, 15)).toBe(15);
    expect(sendRate("20", 15)).toBe(20);
    expect(sendRate("60", 15)).toBe(15);
    expect(sendRate("5", 15)).toBe(15);
    expect(sendRate("abc", 15)).toBe(15);
  });
});
