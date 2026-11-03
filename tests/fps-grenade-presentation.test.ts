import { describe, expect, it } from "vitest";
import { flightCorrectionDecay } from "../src/lib/fps/grenades/flight-presentation";
describe("Grenade flight presentation", () => {
  it("does not pull an airborne throw backwards while closing a late server correction", () => {
    for (const hz of [30, 60, 144])
      for (const speed of [0.1, 0.5, 5, 11, 17])
        for (const initial of [0.1, 1, 4, 7]) {
          const dt = 1 / hz;
          let offset = initial;
          for (let i = 0; i < hz * 2; i++) {
            const next = offset * flightCorrectionDecay(offset, speed, dt, false);
            expect(offset - next).toBeLessThanOrEqual(0.35 * speed * dt + 1e-9);
            expect(speed * dt + next - offset).toBeGreaterThan(0);
            offset = next;
          }
          expect(offset).toBeLessThan(initial);
        }
  });
  it("settles a resting grenade and never increases correction on an invalid frame delta", () => {
    expect(flightCorrectionDecay(1, 0, 0.09, true)).toBeCloseTo(Math.exp(-1));
    expect(flightCorrectionDecay(1, 10, -1, false)).toBe(1);
    expect(flightCorrectionDecay(0, 10, 1, false)).toBeGreaterThan(0);
  });
});
