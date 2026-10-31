import { describe, expect, it } from "vitest";
import {
  ConnectionTiming,
  NetworkObservations,
  readNetworkReport,
  REMOTE_DELAY_MS,
} from "../src/lib/fps/network";

describe("measured game connection timing", () => {
  it("accepts only a current single-use server challenge", () => {
    const t = new ConnectionTiming(),
      p = t.challenge(1000)!;
    expect(t.pong("invented", 1010)).toBe(false);
    expect(t.pong(p.id, 1120)).toBe(true);
    expect(t.pong(p.id, 1121)).toBe(false);
    expect(t.challenge(1500)).toBeNull();
    expect(t.calibrated).toBe(false);
    expect(t.lookbackMs).toBe(0);
  });
  it.each([30, 100, 180])("measures a %i ms latency profile without client clocks", (rtt) => {
    const t = new ConnectionTiming();
    for (let i = 0; i < 4; i++) {
      const p = t.challenge(i * 1000)!;
      expect(t.pong(p.id, i * 1000 + rtt)).toBe(true);
    }
    expect(t.report()).toMatchObject({ rttMs: rtt, jitterMs: 0 });
    expect(t.lookbackMs).toBe(Math.min(200, rtt + REMOTE_DELAY_MS));
  });
  it("uses the lowest recent RTT and caps rewind even when all pongs are delayed", () => {
    const t = new ConnectionTiming();
    for (const [i, rtt] of [80, 80, 1800, 80].entries()) {
      const p = t.challenge(i * 2000)!;
      t.pong(p.id, i * 2000 + rtt);
    }
    expect(t.lookbackMs).toBe(80 + REMOTE_DELAY_MS);
    for (let i = 4; i < 22; i++) {
      const p = t.challenge(i * 2000)!;
      t.pong(p.id, i * 2000 + 1800);
    }
    expect(t.lookbackMs).toBe(200);
    const p = t.challenge(46000)!;
    expect(t.pong(p.id, 50000)).toBe(false);
  });
  it("measures snapshot gaps and shot acknowledgements without inventing packet loss", () => {
    const n = new NetworkObservations();
    [0, 50, 100, 185, 235].forEach((v) => n.snapshot(v));
    n.shot(10, 100);
    n.acknowledge(10, 220);
    n.acknowledge(10, 221);
    n.shot(20, 300);
    n.acknowledge(19, 400);
    expect(n.summary()).toMatchObject({ snapshotGapP95: 85, shotAckP50: 100, shotAckP95: 120 });
    expect(n.summary()).not.toHaveProperty("packetLoss");
    n.reset();
    expect(n.summary().shotAckP50).toBeNull();
  });
  it("rejects malformed network reports", () => {
    expect(readNetworkReport({ rttMs: Infinity })).toBeNull();
    expect(
      readNetworkReport({
        rttMs: 80,
        rttP95Ms: 90,
        jitterMs: 4,
        tickHz: 29.4,
        authMs: 7,
        processingMs: 8,
      }),
    ).not.toBeNull();
  });
});
