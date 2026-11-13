import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AIRDROP, airdropContents, planAirdrops } from "@/lib/fps/br/airdrops";
import type { StaticWorld } from "@/lib/fps/br/static-world";
import type { WorldMeta } from "@/lib/fps/br/world";
import { planZone } from "@/lib/fps/br/zone";

// Flat open land 10 m up everywhere: every spot is a valid landing.
const world = {
  supportAt: () => 10,
  hf: { heightAt: () => 10 },
  blocked: () => false,
} as unknown as StaticWorld;
const meta = JSON.parse(readFileSync("public/fps/br/world.v1.json", "utf8")) as WorldMeta;

describe("supply drops (owner, 2026-11-13)", () => {
  it("three a match: the first as the first circle is revealed, then phases 3 and 5", () => {
    const zone = planZone(meta, 7, () => 10);
    const reveal = 95_000;
    const drops = planAirdrops(zone, world, meta, 7, 1_000_000, reveal);
    expect(drops.length).toBe(3);
    expect(drops[0]!.at).toBe(1_000_000 + reveal);
    expect(drops[1]!.at).toBe(1_000_000 + zone.times[1]![1]);
    expect(drops[2]!.at).toBe(1_000_000 + zone.times[3]![1]);
    // Each inside the circle its phase closes to (the first: the first circle).
    [1, 3, 5].forEach((ci, i) => {
      const c = zone.circles[ci]!,
        d = drops[i]!;
      expect(Math.hypot(d.x - c.x, d.z - c.z)).toBeLessThanOrEqual(c.r);
    });
    for (const d of drops) expect(d.landAt).toBeGreaterThan(d.at);
    // Warned well before the crate appears.
    expect(AIRDROP.warnMs).toBeGreaterThanOrEqual(10_000);
  });

  it("every crate: a sniper with 30 rounds, plates, a 6x scope and a silencer", () => {
    for (let id = 0; id < 3; id++)
      for (const seed of [1, 2, 99]) {
        const items = airdropContents(seed, id).map((l) => l.item);
        expect(items).toContain("awp");
        expect(airdropContents(seed, id).find((l) => l.item === "ammo-sniper")?.qty).toBe(30);
        expect(items).toContain("scope-6x");
        expect(items).toContain("silencer");
        expect(items.filter((i) => i === "plate").length).toBeGreaterThanOrEqual(2);
      }
  });
});
