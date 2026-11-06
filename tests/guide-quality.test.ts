import { describe, expect, it } from "vitest";
import { GUIDES } from "@/content/guides";
import {
  QUALITY_SCORE_CAP_WHEN_CRITICAL,
  criticalQualityFailures,
  repeatedGuideBodyFailures,
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
  it("detects substantial cross-page padding even when every page has a different opening", () => {
    const block = Array.from({ length: 100 }, (_, i) => `shared${i}`).join(" ");
    const pages = Array.from({ length: 8 }, (_, i) => ({
      slug: `topic-${i}`,
      text: `An original answer about topic ${i}.\n\n${block}\n\n${block} second\n\n${block} third\n\n${block} fourth\n\n${block} fifth`,
    }));
    expect(repeatedGuideBodyFailures(pages)).toHaveLength(8);
    // A shared legal notice alone is not treated as an article's duplicated body.
    expect(
      repeatedGuideBodyFailures(
        pages.map((p, i) => ({
          ...p,
          text: `${block}\n\n${Array.from({ length: 700 }, (_, n) => `topic${i}word${n}`).join(" ")}`,
        })),
      ),
    ).toEqual([]);
  });

  it("keeps the published catalogue free of substantial repeated padding", () => {
    expect(
      repeatedGuideBodyFailures(
        GUIDES.map((g) => ({
          slug: g.slug,
          text: [
            g.answer,
            ...g.facts,
            ...g.sections.map((s) => s.body),
            ...g.faqs.map((f) => f.a),
          ].join("\n\n"),
        })),
      ),
    ).toEqual([]);
  });

  it("keeps the priority legal and payment corrections sourced and published", () => {
    for (const slug of [
      "online-gambling-legal-kentucky",
      "online-gambling-legal-south-carolina",
      "thunderpick-review",
      "worldwinner-review",
      "how-to-withdraw-from-metamask",
      "metamask-swap-fees",
      "how-to-send-crypto",
      "connect-ledger-to-metamask",
      "sent-crypto-to-wrong-network",
      "casino-withdrawal-pending",
      "crypto-casino-minimum-deposit",
    ]) {
      const guide = GUIDES.find((g) => g.slug === slug)!;
      expect(guide, slug).toBeTruthy();
      expect(guide.sources.length, slug).toBeGreaterThan(0);
      expect(
        criticalQualityFailures([guide.answer, ...guide.sections.map((s) => s.body)].join("\n\n")),
        slug,
      ).toEqual([]);
    }
  });
  it("flags a keyword skeleton even when the page is long", () => {
    const text = `${"word ".repeat(2000)} Keep that definition in the first line of your note`;
    const failures = criticalQualityFailures(text);
    expect(failures.some((f) => f.includes("skeleton"))).toBe(true);
    expect(QUALITY_SCORE_CAP_WHEN_CRITICAL).toBeLessThan(50);
  });

  it("flags a fee closer pasted twice", () => {
    const line =
      "Prefer a small test withdrawal on a quiet day over a large first deposit during a hype spike.";
    expect(
      criticalQualityFailures(`${line}\n\n${line}`).some((f) => f.includes("fee closer")),
    ).toBe(true);
    expect(criticalQualityFailures(line)).toEqual([]);
  });

  it("keeps the remediated URLs published, sourced, and free of the skeleton", () => {
    for (const slug of REMEDIATED) {
      const guide = GUIDES.find((g) => g.slug === slug);
      expect(guide, slug).toBeTruthy();
      const text = [guide!.answer, ...guide!.facts, ...guide!.sections.map((s) => s.body)].join(
        "\n\n",
      );
      expect(criticalQualityFailures(text), slug).toEqual([]);
      expect(guide!.sources.length, slug).toBeGreaterThan(0);
    }
  });
});
