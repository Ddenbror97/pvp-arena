import { describe, expect, it } from "vitest";
import { BR_LAG, BrRemoteTimeline } from "@/lib/fps/br/lag";
import { VehicleRows } from "@/lib/fps/br/vehicle-rows";

const TICK = 1000 / 30;
const FRAME = 1000 / 60;
/** mulberry32: the same connection every run. */
function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
type Net = { latency: number; jitter: number; spikeEvery?: number; spike?: number };
/** Snapshots 15 a second over `net`, in order (a WebSocket): [taken at, arrives at]. */
function packets(net: Net, seconds: number, seed = 7, every = 2) {
  const rand = random(seed);
  const out: Array<{ at: number; arrives: number }> = [];
  let last = 0;
  for (let k = 1; k * every * TICK < seconds * 1000; k++) {
    const at = k * every * TICK;
    let late = net.latency + rand() * net.jitter;
    if (net.spikeEvery && rand() < 1 / net.spikeEvery) late += net.spike ?? 0;
    last = Math.max(last, at + late);
    out.push({ at, arrives: last });
  }
  return out;
}
const WIFI: Net = { latency: 60, jitter: 45, spikeEvery: 40, spike: 140 };
const MOBILE: Net = { latency: 110, jitter: 80, spikeEvery: 25, spike: 220 };

/** The timeline played over `net`: how the drawn moment moved, frame by frame. */
function play(net: Net, watching: boolean, seconds = 60) {
  const t = new BrRemoteTimeline();
  const queue = packets(net, seconds);
  let newest = -Infinity,
    previous = -Infinity,
    frames = 0,
    starved = 0,
    backwards = 0,
    worstStep = 0,
    leastStep = Infinity;
  for (let local = 0; local < seconds * 1000; local += FRAME) {
    while (queue.length && queue[0]!.arrives <= local) {
      const p = queue.shift()!;
      if (t.observe(p.at, p.arrives)) newest = p.at;
    }
    const at = t.sample(local, FRAME, watching);
    if (local > 20_000) {
      frames++;
      if (at > newest + 0.5) starved++;
      if (at < previous) backwards++;
      worstStep = Math.max(worstStep, at - previous);
      leastStep = Math.min(leastStep, at - previous);
    }
    previous = at;
  }
  return { starved: starved / frames, backwards, worstStep, leastStep, delay: t.playbackMs };
}

describe("battle royale playback clock (spectator audit)", () => {
  it("advances with the frames: no step ahead and no standing still as packets come early or late", () => {
    for (const net of [{ latency: 35, jitter: 12 }, WIFI]) {
      const r = play(net, true);
      expect(r.backwards).toBe(0);
      // Within a tenth of a frame of the frame's own time, every frame.
      expect(r.worstStep).toBeLessThanOrEqual(FRAME * (1 + BR_LAG.slew) + 1e-6);
      expect(r.leastStep).toBeGreaterThanOrEqual(FRAME * (1 - BR_LAG.slew) - 1e-6);
    }
  });
  it("a spectator's delay covers the connection's late packets; a player's stays within its bounds", () => {
    for (const net of [WIFI, MOBILE]) {
      const watching = play(net, true),
        playing = play(net, false);
      // (Before: the watched player stood still and jumped on at each of these.)
      expect(playing.starved).toBeGreaterThan(0.02);
      // (The mobile connection's worst gap is past the spectator's bound: a rare one shows.)
      expect(watching.starved).toBeLessThan(net === WIFI ? 0.005 : 0.02);
      expect(watching.starved).toBeLessThan(playing.starved / 4);
      expect(playing.delay).toBeLessThanOrEqual(BR_LAG.playbackMaxMs);
      expect(watching.delay).toBeLessThanOrEqual(BR_LAG.watchMaxMs);
    }
    // On a steady connection a spectator is no later than a player.
    const lan = { latency: 5, jitter: 2 };
    expect(play(lan, true).delay).toBeLessThanOrEqual(play(lan, false).delay + 3);
  });
  it("what a player reports is how far behind the clock the others are drawn", () => {
    const t = new BrRemoteTimeline();
    let local = 0;
    for (let k = 1; k < 200; k++) {
      const at = k * 2 * TICK;
      t.observe(at, at + 40);
      for (; local < at + 40 + 2 * TICK; local += FRAME) t.sample(local, FRAME);
    }
    // Server clock now = local − 40; drawn = that − playback.
    const drawn = t.sample(local, FRAME);
    expect(local - 40 - drawn).toBeCloseTo(t.playbackMs, -1);
    expect(t.playbackMs).toBeGreaterThanOrEqual(BR_LAG.playbackMinMs);
    expect(t.playbackMs).toBeLessThanOrEqual(BR_LAG.playbackMaxMs);
  });
  it("finds the room's clock again after the room stalled (its tick count fell behind)", () => {
    const t = new BrRemoteTimeline();
    let local = 0,
      newest = 0;
    const run = (from: number, to: number, shift: number) => {
      let starved = 0,
        frames = 0;
      for (let k = from; k < to; k++) {
        const at = k * 2 * TICK;
        const arrives = at + shift + 30;
        for (; local < arrives; local += FRAME) {
          const drawn = t.sample(local, FRAME);
          frames++;
          if (drawn > newest + 0.5) starved++;
        }
        if (t.observe(at, arrives)) newest = at;
      }
      return starved / frames;
    };
    expect(run(1, 150, 0)).toBeLessThan(0.05);
    // The room lost 600 ms: every snapshot from now on is that much later for its stamp.
    run(150, 160, 600);
    // Within a second and a half it is interpolating again (it used to take five).
    run(160, 172, 600);
    expect(run(172, 300, 600)).toBeLessThan(0.02);
  });
});

describe("battle royale vehicles on the room's clock", () => {
  const row = (x: number) => [3, 0, x, 0, 0];
  it("draws between the rows about the moment asked for, whenever they arrived", () => {
    const v = new VehicleRows();
    for (let k = 0; k < 6; k++) v.push(1000 + k * 67, row(k * 2), 1000 + (k - 1) * 67);
    expect(v.sample(1000 + 2.5 * 67)).toBe(true);
    expect(v.a[2]! + (v.b[2]! - v.a[2]!) * v.k).toBeCloseTo(5, 6);
    // Past the newest and before the oldest: that row.
    v.sample(5000);
    expect(v.b[2]! * v.k + v.a[2]! * (1 - v.k)).toBe(10);
    v.sample(0);
    expect(v.b[2]! * v.k + v.a[2]! * (1 - v.k)).toBe(0);
  });
  it("a vehicle that stood is not gliding to its next row for as long as it stood", () => {
    const v = new VehicleRows();
    v.push(1000, row(0), 933);
    // Not sent for ten seconds (unchanged), then it drives off: one row per snapshot.
    v.push(11_067, row(1), 11_000);
    v.push(11_134, row(3), 11_067);
    const at = (t: number) => (v.sample(t), v.a[2]! + (v.b[2]! - v.a[2]!) * v.k);
    expect(at(6000)).toBe(0);
    expect(at(11_000)).toBe(0);
    expect(at(11_033.5)).toBeCloseTo(0.5, 6);
    expect(at(11_100.5)).toBeCloseTo(2, 6);
  });
  it("starts again from a row that is not newer (a restarted room)", () => {
    const v = new VehicleRows();
    v.push(50_000, row(9), 49_933);
    v.push(100, row(1), 33);
    expect(v.rows.length).toBe(1);
    v.sample(100);
    expect(v.b[2]).toBe(1);
  });
  it("keeps a bounded history", () => {
    const v = new VehicleRows();
    for (let k = 0; k < 500; k++) v.push(k * 33, row(k), (k - 1) * 33);
    expect(v.rows.length).toBeLessThanOrEqual(16);
  });
});
