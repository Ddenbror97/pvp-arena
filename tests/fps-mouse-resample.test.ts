import { describe, expect, it } from "vitest";
import { isMacOS, MAX_LAG_MS, MouseResampler } from "@/lib/fps/mouse-resample";

/** A steady turn of `speed` counts/s reported at `reportHz`, drawn at `frameHz` for `ms`. */
function turn(reportHz: number, frameHz: number, speed: number, ms = 2000, jitter = 0) {
  const r = new MouseResampler();
  const report = 1000 / reportHz,
    frame = 1000 / frameHz;
  let nextReport = report,
    lastReport = 0,
    seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const raw: number[] = [],
    smooth: number[] = [];
  let rawFrame = 0,
    pushed = 0;
  for (let now = frame; now <= ms; now += frame) {
    while (nextReport <= now) {
      const d = speed * ((nextReport - lastReport) / 1000);
      r.push(d, 0, nextReport);
      pushed += d;
      rawFrame += d;
      lastReport = nextReport;
      nextReport += report * (1 + (rnd() - 0.5) * jitter);
    }
    raw.push(rawFrame);
    rawFrame = 0;
    smooth.push(r.take(now).dx);
  }
  // Let the last reports through (the mouse stops).
  const rest = r.take(ms + 100).dx;
  const spread = (xs: number[]) => {
    const tail = xs.slice(20);
    const mean = tail.reduce((a, b) => a + b, 0) / tail.length;
    return Math.sqrt(tail.reduce((a, b) => a + (b - mean) ** 2, 0) / tail.length) / mean;
  };
  return {
    raw: spread(raw),
    smooth: spread(smooth),
    total: smooth.reduce((a, b) => a + b, 0) + rest,
    pushed,
    lag: r.lag,
  };
}

describe("mouse look resampled onto the frame clock", () => {
  it("turns evenly when the mouse reports about as often as the screen draws (a Mac)", () => {
    for (const [hz, screen] of [
      [125, 120],
      [90, 120],
      [133, 120],
      [125, 144],
      [60, 120],
    ] as const) {
      const r = turn(hz, screen, 4000, 2000, 0.1);
      // Raw: frames got 0, 1 or 2 reports. Resampled: within a few per cent of each other.
      expect(r.raw).toBeGreaterThan(0.15);
      expect(r.smooth).toBeLessThan(0.08);
    }
  });

  it("never loses or invents a turn: the total equals the reports' sum", () => {
    const r = turn(125, 120, 3000);
    expect(r.total).toBeCloseTo(r.pushed, 6);
  });

  it("a fast mouse (1000 Hz) is practically unchanged: about a millisecond behind", () => {
    const r = turn(1000, 60, 4000);
    expect(r.lag).toBeLessThan(1.5);
    expect(r.smooth).toBeLessThan(0.02);
  });

  it("trails a slow mouse by at most MAX_LAG_MS, and the first move after a pause is not held", () => {
    const r = new MouseResampler();
    r.push(10, 0, 100);
    expect(r.take(101).dx).toBeCloseTo(10, 6);
    for (let t = 110; t < 400; t += 40) r.push(5, 5, t);
    expect(r.lag).toBeLessThanOrEqual(MAX_LAG_MS);
  });

  it("a stop applies the rest at once; reset drops what was not drawn", () => {
    const r = new MouseResampler();
    for (let t = 8; t <= 80; t += 8) r.push(8, -2, t);
    let x = 0;
    for (let t = 8; t <= 80; t += 8.33) x += r.take(t).dx;
    x += r.take(200).dx;
    expect(x).toBeCloseTo(80, 6);
    r.push(50, 0, 300);
    r.push(50, 0, 308);
    r.reset();
    expect(r.take(400)).toEqual({ dx: 0, dy: 0 });
  });

  it("an event stamped with the wall clock (old WebKit) still turns the view", () => {
    const r = new MouseResampler();
    r.push(25, 0, Date.now());
    expect(r.take(performance.now() + 50).dx).toBeCloseTo(25, 6);
  });

  it("knows a Mac (no low-latency canvas there)", () => {
    expect(isMacOS({ platform: "MacIntel", userAgent: "" })).toBe(true);
    expect(
      isMacOS({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" }),
    ).toBe(true);
    expect(
      isMacOS({ platform: "Win32", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }),
    ).toBe(false);
  });
});
