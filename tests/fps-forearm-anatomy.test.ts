import { describe, expect, it } from "vitest";
import { FOREARM_PROFILE, sampleForearmProfile } from "@/lib/fps/fitted-rifle-hands";

/** Perimeter of the same superellipse cross-section the extrusion builds (n = 2.4). */
function girth(width: number, depth: number) {
  const steps = 720;
  let length = 0,
    previous: [number, number] | undefined;
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * Math.PI * 2,
      cos = Math.cos(angle),
      sin = Math.sin(angle);
    const r = 1 / ((Math.abs(cos) / width) ** 2.4 + (Math.abs(sin) / depth) ** 2.4) ** (1 / 2.4);
    const point: [number, number] = [cos * r, sin * r];
    if (previous) length += Math.hypot(point[0] - previous[0], point[1] - previous[1]);
    previous = point;
  }
  return length;
}

describe("viewmodel forearm anatomy", () => {
  const samples = Array.from({ length: 51 }, (_, i) => sampleForearmProfile(i / 50));
  const girths = samples.map((s) => girth(s.width, s.depth));
  const wrist = girths[0]!,
    widest = Math.max(...girths);

  it("matches adult-male wrist and forearm girths, not a tube", () => {
    expect(wrist).toBeGreaterThan(0.155);
    expect(wrist).toBeLessThan(0.19);
    expect(widest).toBeGreaterThan(0.25);
    expect(widest).toBeLessThan(0.3);
    // A real forearm is ~1.5x its wrist; the old tube was ~2.4x with a pinched wrist.
    expect(widest / wrist).toBeGreaterThan(1.35);
    expect(widest / wrist).toBeLessThan(1.75);
  });

  it("is flat at the wrist and rounder at the muscle belly", () => {
    const first = samples[0]!,
      belly = samples[40]!;
    expect(first.width / first.depth).toBeGreaterThan(1.4);
    expect(belly.width / belly.depth).toBeLessThan(first.width / first.depth);
  });

  it("puts the widest point in the upper forearm and tapers smoothly", () => {
    expect(girths.indexOf(widest) / 50).toBeGreaterThan(0.6);
    for (let i = 1; i < girths.length; i++)
      expect(Math.abs(girths[i]! - girths[i - 1]!)).toBeLessThan(0.006);
    expect(FOREARM_PROFILE[0]!.t).toBe(0);
    expect(FOREARM_PROFILE.at(-1)!.t).toBe(1);
  });
});
