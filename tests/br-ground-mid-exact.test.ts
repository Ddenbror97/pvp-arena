import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { STEADY } from "../src/lib/fps/br/scene-target";

/**
 * The crawl beyond ~25 m from eye height (owner, 2026-11-24: "after the red line it is still
 * same issue … myrornas krig"): the grazing mid grain's samples are filtered exactly, without
 * the doubling on paving, and the steadying pass on foot holds the fine jumps.
 */
describe("ground beyond the red line", () => {
  const src = readFileSync("src/lib/fps/br/terrain.ts", "utf8");

  it("takes the mid grain's enlarged samples exactly, at their level", () => {
    expect(src).toContain(
      "brMid = near > 0.0 ? 1.0 : 0.0;\n            vec3 midA = groundAlbedo(lt, mxz, mdx, mdy);",
    );
    expect(src).toContain("midStony = stony;\n            brMid = 0.0;");
    expect(src).toContain("k *= mix(uGroundSharpen, 1.0, max(grazing, brMid));");
    expect(src).toContain("max(max(brExact, brMid), grazing)");
  });

  it("no longer doubles the mid grain's contrast on paving", () => {
    expect(src).not.toContain("(ratio - 1.0) * (1.0 + pavement)");
    expect(src).toContain("midRatio = clamp(ratio, 0.45, 1.85);");
    expect(src).toContain('"br-terrain-v10"');
  });

  it("holds every fine jump on foot, never a big one", () => {
    expect(STEADY.foot.from).toBe(0);
    expect(STEADY.foot.to).toBeLessThanOrEqual(0.005);
    expect(STEADY.foot.capFrom).toBeGreaterThan(STEADY.foot.to * 10);
  });
});
