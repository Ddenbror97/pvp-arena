import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PAVED } from "../src/lib/fps/br/terrain";

/**
 * Paving on the terrain over its whole footprint (owner, 2026-11-24, the airfield's apron:
 * "it looks better but can be improved"): no reach, no half-level sharpening, contrast given
 * back from the filtered colour.
 */
describe("paved ground grain", () => {
  const src = readFileSync("src/lib/fps/br/terrain.ts", "utf8");

  it("filters paving at its exact level over the whole footprint", () => {
    expect(src).toContain("if (!paved) k *= uGroundSharpen;");
    expect(src).toContain("uGroundLite < 0.5, paved ? 1.0 : brExact)");
  });

  it("raises paving's contrast with the footprint, bounded, from the filtered colour", () => {
    expect(PAVED.gain).toBeGreaterThan(0);
    expect(PAVED.gain).toBeLessThanOrEqual(1.5);
    expect(PAVED.gainFrom).toBeLessThan(PAVED.gainTo);
    expect(src).toContain("gc = fr * clamp(vec3(1.0) + (gc / fr - 1.0) * (1.0 + ");
  });

  it("is a new terrain program", () => {
    expect(src).toContain('"br-terrain-v10"');
  });
});
