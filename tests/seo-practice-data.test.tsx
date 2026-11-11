import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PracticeRuleData } from "@/components/guides/PracticeRuleData";
import { GUIDE_GAME_DATA } from "@/lib/game-snapshot/snapshot";

describe("first-party SEO data provenance", () => {
  it("labels the BR schedule as configuration, not recorded activity", () => {
    const html = renderToStaticMarkup(<PracticeRuleData slug="browser-battle-royale" />);
    expect(html).toContain("27:30");
    expect(html).toContain("excluding warm-up");
    expect(html).toContain("not observed completion times or cash results");
    expect(html).not.toContain("Recent settled");
  });

  it("does not attach our BR configuration to PUBG, ZombsRoyale or cash intent", () => {
    for (const slug of [
      "pubg-unblocked",
      "zombs-royale-unblocked",
      "battle-royale-for-money-hub",
    ]) {
      expect(renderToStaticMarkup(<PracticeRuleData slug={slug} />)).toBe("");
    }
  });

  it("labels pool practice as local, without inventing aggregate statistics", () => {
    const html = renderToStaticMarkup(<PracticeRuleData slug="8-ball-pool-aim" />);
    expect(html).toContain("2.54");
    expect(html).toContain("57.15");
    expect(html).toContain("local to your browser");
    expect(html).toContain("no match total, bot win rate or average score is claimed");
  });

  it("never presents our Hold'em or roulette samples as another game's activity", () => {
    for (const slug of [
      "razz-poker",
      "big-o-poker",
      "joker-poker",
      "skillz-review",
      "csgoroll-review",
      "coinpoker-review",
    ]) {
      expect(GUIDE_GAME_DATA[slug]).toBeUndefined();
    }
    expect(GUIDE_GAME_DATA["texas-holdem-rules"]).toBe("poker");
    expect(GUIDE_GAME_DATA["crypto-roulette"]).toBe("roulette");
  });
});
