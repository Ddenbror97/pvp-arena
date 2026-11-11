import { describe, expect, it } from "vitest";
import {
  ConnectionTiming,
  NetworkObservations,
  MAX_REWIND_MS,
  readNetworkReport,
  REMOTE_DELAY_MS,
  SnapshotClock,
} from "../src/lib/fps/network";

describe("measured game connection timing", () => {
  it("does not drag playback backward when old packets arrive in a burst", () => {
    const clock = new SnapshotClock();
    clock.observe(1000, 100);
    clock.observe(1050, 550);
    clock.observe(1100, 551);
    expect(clock.now(600)).toBe(1500);
    clock.observe(1510, 610);
    expect(clock.now(620)).toBe(1520);
    clock.clear();
    clock.observe(1800, 1000);
    expect(clock.now(1010)).toBe(1810);
  });
  it("accepts only a current single-use server challenge", () => {
    const t = new ConnectionTiming(),
      p = t.challenge(1000)!;
    expect(t.pong("invented", 1010)).toBe(false);
    expect(t.pong(p.id, 1120)).toBe(true);
    expect(t.pong(p.id, 1121)).toBe(false);
    expect(t.challenge(1200)).toBeNull();
    expect(t.calibrated).toBe(false);
    expect(t.lookbackMs).toBe(0);
    expect(Number.isNaN(t.minRttMs)).toBe(true);
  });
  it("calibrates within a second of connecting, then measures once a second", () => {
    const t = new ConnectionTiming();
    let now = 0,
      sent = 0;
    // The room offers a challenge at every snapshot (here every 50 ms), answered 40 ms later.
    for (; now <= 900 && !t.calibrated; now += 50) {
      const p = t.challenge(now);
      if (p) {
        sent++;
        expect(t.pong(p.id, now + 40)).toBe(true);
      }
    }
    expect(t.calibrated).toBe(true);
    expect(sent).toBe(3);
    expect(now).toBeLessThanOrEqual(600);
    expect(t.minRttMs).toBe(40);
    const last = now - 50;
    expect(t.challenge(last + 500)).toBeNull();
    expect(t.challenge(last + 1000)).not.toBeNull();
  });
  it("still calibrates a connection slower than the fast challenge interval", () => {
    const t = new ConnectionTiming();
    const answers: Array<{ id: string; at: number }> = [];
    for (let now = 0; now <= 4000; now += 50) {
      while (answers.length && answers[0]!.at <= now) t.pong(answers.shift()!.id, now);
      const p = t.challenge(now);
      if (p) answers.push({ id: p.id, at: now + 400 });
    }
    expect(t.calibrated).toBe(true);
    expect(t.minRttMs).toBe(400);
  });
  it.each([30, 100, 180])("measures a %i ms latency profile without client clocks", (rtt) => {
    const t = new ConnectionTiming();
    for (let i = 0; i < 4; i++) {
      const p = t.challenge(i * 1000)!;
      expect(t.pong(p.id, i * 1000 + rtt)).toBe(true);
    }
    expect(t.report()).toMatchObject({ rttMs: rtt, jitterMs: 0 });
    expect(t.lookbackMs).toBe(Math.min(MAX_REWIND_MS, rtt + REMOTE_DELAY_MS));
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
    expect(t.lookbackMs).toBe(MAX_REWIND_MS);
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
