import { describe, expect, it } from "vitest";
import { damageImpact, damageSamples } from "../src/lib/fps/damage-audio";

describe("shared first-person damage audio", () => {
  it("distinguishes protected torso from exposed limbs and head", () => {
    expect(damageImpact("chest", true)).toBe("armor");
    expect(damageImpact("stomach", true)).toBe("armor");
    expect(damageImpact("legs", true)).toBe("body");
    expect(damageImpact("head", true)).toBe("head");
    expect(damageImpact("chest", false)).toBe("body");
    expect(damageImpact(undefined, true)).toBe("body");
  });
  it("produces bounded, immediate, distinct impacts at supported sample rates", () => {
    for (const rate of [44100, 48000]) {
      const variants = [];
      for (const kind of ["body", "armor", "head"] as const) {
        for (let variant = 0; variant < 3; variant++) {
          const pcm = damageSamples(rate, kind, variant);
          expect(pcm.length).toBe(Math.ceil(rate * 0.19));
          expect(pcm.every(Number.isFinite)).toBe(true);
          expect(Math.max(...pcm.map(Math.abs))).toBeLessThan(1);
          const energy = (data: Float32Array) =>
            Math.sqrt(data.reduce((sum, s) => sum + s * s, 0) / data.length);
          expect(energy(pcm.slice(0, Math.ceil(rate * 0.01)))).toBeGreaterThan(0.1);
          expect(energy(pcm.slice(-Math.ceil(rate * 0.02)))).toBeLessThan(0.01);
          variants.push(pcm.slice(0, 100).join(","));
        }
      }
      expect(new Set(variants).size).toBe(9);
    }
  });
});
