import { describe, expect, it } from "vitest";
import { GUIDES } from "@/content/guides";
import {
  QUALITY_SCORE_CAP_WHEN_CRITICAL,
  criticalQualityFailures,
} from "@/lib/guides/quality";

const REMEDIATED = [
  "deposit-match-bonus",
  "casino-referral-bonus",
  "reload-bonus-casino",
  "casino-comps",
  "crypto-casino-affiliate-program",
  "malta-gaming-authority-license",
  "gambling-tax-uk",
  "gasless-transactions",
  "account-abstraction-wallet",
  "ton-wallet",
  "pai-gow-poker",
  "casino-war-game",
  "sic-bo-online",
  "penny-slots-online",
  "high-limit-slots",
  "blackjack-tournaments",
  "heads-up-poker-strategy",
  "polymarket-vs-kalshi",
  "nfl-betting",
  "nba-betting",
  "ufc-betting",
  "soccer-betting",
  "tennis-betting",
  "boxing-betting",
  "f1-betting",
] as const;

describe("critical guide quality", () => {
  it("flags a keyword skeleton even when the page is long", () => {
    const text = `${"word ".repeat(2000)} Keep that definition in the first line of your note`;
    const failures = criticalQualityFailures(text);
    expect(failures.some((f) => f.includes("skeleton"))).toBe(true);
    expect(QUALITY_SCORE_CAP_WHEN_CRITICAL).toBeLessThan(50);
  });

  it("flags a fee closer pasted twice", () => {
    const line =
      "Prefer a small test withdrawal on a quiet day over a large first deposit during a hype spike.";
    expect(criticalQualityFailures(`${line}\n\n${line}`).some((f) => f.includes("fee closer"))).toBe(
      true,
    );
    expect(criticalQualityFailures(line)).toEqual([]);
  });

  it("keeps the remediated URLs published, sourced, and free of the skeleton", () => {
    for (const slug of REMEDIATED) {
      const guide = GUIDES.find((g) => g.slug === slug);
      expect(guide, slug).toBeTruthy();
      const text = [guide!.answer, ...guide!.facts, ...guide!.sections.map((s) => s.body)].join("\n\n");
      expect(criticalQualityFailures(text), slug).toEqual([]);
      expect(guide!.sources.length, slug).toBeGreaterThan(0);
    }
  });
});
