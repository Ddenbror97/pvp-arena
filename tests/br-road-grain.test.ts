import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ROAD_GRAIN, ROAD_GRAIN_MODE } from "../src/lib/fps/br/structures-renderer";

/**
 * The roads' near asphalt over its whole footprint (owner, 2026-11-24: "i rather have the blurr
 * then that [flicker]"; "its only the asfalt roads not the gras"): no GROUND.reach on the
 * roads, some of the averaged-away contrast given back as a function of the filtered colour.
 */
describe("road grain", () => {
  const src = readFileSync("src/lib/fps/br/structures-renderer.ts", "utf8");

  it("filters the roads' tile over the whole footprint by default", () => {
    expect(ROAD_GRAIN_MODE.value.x).toBe(1);
    expect(src).toContain("rdx, rdy, uScale, true, uRoadGrain.x)");
    expect(src).not.toContain("rdx, rdy, uScale, true, 0.0)");
  });

  it("gives back contrast with the footprint, bounded, from the filtered colour alone", () => {
    expect(ROAD_GRAIN_MODE.value.y).toBe(ROAD_GRAIN.gain);
    expect(ROAD_GRAIN.gain).toBeGreaterThan(0);
    expect(ROAD_GRAIN.gain).toBeLessThanOrEqual(1.5);
    expect(ROAD_GRAIN.gainFrom).toBeLessThan(ROAD_GRAIN.gainTo);
    expect(src).toContain("(1.0 + uRoadGrain.y * smoothstep(");
    expect(src).toContain("0.4, 1.8);");
  });

  it("is the roads' and the bridges' decks' (one uniform), new programs for both", () => {
    expect(src).toContain("uRoadGrain: ROAD_GRAIN_MODE,");
    expect(src).toContain('"br-roads-v11"');
    expect(src).toContain('"br-bridges-v4"');
  });
});
