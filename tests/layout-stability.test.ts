import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  crownPlacement,
  reservedCrownHeadroom,
} from "../src/components/prestige/PlayerPrestigeIdentity";
import { CROWN_ASSET_KEYS, FRAME_ASSET_KEYS } from "../src/components/prestige/frames";
import {
  RAIL_DESKTOP_MIN,
  RAIL_TIGHT_MAX,
  STRIP_COIN,
  railBoxHeight,
  stripMetrics,
} from "../src/components/roulette/strip-motion";

describe("hard-refresh layout reserves", () => {
  it("reserves the tallest crown so a late identity cannot grow a chat row", () => {
    const size = 32;
    const reserved = reservedCrownHeadroom(size);
    expect(reserved).toBeGreaterThan(0);
    for (const crown of CROWN_ASSET_KEYS) {
      expect(reserved).toBeGreaterThanOrEqual(crownPlacement(size, undefined, crown).headroom);
      for (const frame of FRAME_ASSET_KEYS) {
        expect(reserved).toBeGreaterThanOrEqual(crownPlacement(size, frame, crown).headroom);
      }
    }
  });

  it("sizes the roulette rail from the same breakpoints as the stylesheet", () => {
    const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
    expect(RAIL_DESKTOP_MIN).toBe(464);
    expect(RAIL_TIGHT_MAX).toBe(288);
    expect(css).toContain("(max-width: 463.98px)");
    expect(css).toContain("(max-width: 287.98px)");
    expect(css).toContain("--rail-coin: 108px");
    expect(railBoxHeight(stripMetrics(800))).toBe(STRIP_COIN + 16);
    const phone = stripMetrics(400);
    expect(phone.compact).toBe(true);
    expect(phone.gap).toBe(8);
    expect(railBoxHeight(phone)).toBe(phone.coin + 28);
    expect(stripMetrics(200).gap).toBe(4);
    expect(stripMetrics(RAIL_DESKTOP_MIN).compact).toBe(false);
  });
});
