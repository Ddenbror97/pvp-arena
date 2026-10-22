import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { canonicalUrl, indexableHead } from "@/lib/seo/indexable-head";
import { rootHead } from "@/lib/seo/root-head";
import { GAME_FACT_PAGES } from "@/lib/seo/game-facts";
import { STATIC_PATHS } from "@/routes/sitemap[.]xml";

const llms = readFileSync("public/llms.txt", "utf8");

describe("public SEO facts", () => {
  it("describes the live roulette wheel as 33 slots, not a leftover 15", () => {
    for (const file of [
      "src/content/guides/cs2-roulette.ts",
      "src/content/guides/hmac-sha256-provably-fair.ts",
      "src/content/guides/provably-fair-calculator.ts",
    ]) {
      const text = readFileSync(file, "utf8");
      expect(text, file).toContain("mod 33");
      expect(text, file).not.toContain("mod 15");
    }
  });

  it("describes six games and the 33-slot wheel", () => {
    expect(llms).toContain("six games");
    expect(llms).toContain("8-ball");
    expect(llms).toContain("33-slot");
    expect(llms).toContain("P2P Slott");
    expect(llms).toContain("six-max");
    expect(llms).toContain("5% of a pot only when a flop is dealt");
    expect(llms).toContain("rack seed does not pick the winner");
    expect(llms).not.toContain("five games");
    expect(llms).not.toContain("three games");
    expect(llms).not.toContain("15-slot");
  });

  it("canonicalises the apex host", () => {
    expect(canonicalUrl("/")).toBe("https://pvpspinarena.com/");
    expect(canonicalUrl("/poker")).toBe("https://pvpspinarena.com/poker");
    expect(canonicalUrl("/editorial")).toBe("https://pvpspinarena.com/editorial");
  });

  it("puts a canonical and index directive on a public page", () => {
    const head = indexableHead({
      path: "/fairness",
      title: "Fairness — Provably Fair Games | PVPspinArena",
      description: "Verify a committed seed after the round.",
      crumb: "Fairness",
    });
    expect(head.links[0]).toEqual({
      rel: "canonical",
      href: "https://pvpspinarena.com/fairness",
    });
    expect(head.meta).toContainEqual({ name: "robots", content: "index, follow" });
    expect(head.meta).toContainEqual({
      property: "og:url",
      content: "https://pvpspinarena.com/fairness",
    });
    const graph = JSON.parse(String(head.scripts[0].children)) as {
      "@graph": { "@type": string }[];
    };
    expect(graph["@graph"].map((node) => node["@type"])).toEqual(["WebPage", "BreadcrumbList"]);
  });

  it("does not emit a search action or a rating on the homepage graph", () => {
    const head = indexableHead({
      path: "/",
      title: "Jackpot",
      description: "Shared pot.",
      site: true,
    });
    const raw = String(head.scripts[0].children);
    expect(raw).not.toContain("SearchAction");
    expect(raw).not.toContain("AggregateRating");
    expect(raw).not.toContain("Review");
    expect(raw).toContain("Organization");
    expect(raw).toContain("WebSite");
  });

  it("publishes editorial and leaderboards in the sitemap list", () => {
    expect(STATIC_PATHS).toContain("/editorial");
    expect(STATIC_PATHS).toContain("/leaderboards");
    for (const path of ["/wallet", "/auth", "/admin", "/prestige"]) {
      expect(STATIC_PATHS).not.toContain(path);
    }
  });

  it("states the verified fee on every game page", () => {
    const blob = JSON.stringify(GAME_FACT_PAGES);
    expect(GAME_FACT_PAGES.jackpot.facts.some((f) => f.text.includes("5% of the pot"))).toBe(true);
    expect(
      GAME_FACT_PAGES.coinflip.facts.some((f) => f.text.includes("5% of the combined pot")),
    ).toBe(true);
    expect(GAME_FACT_PAGES.roulette.facts.some((f) => f.text.includes("7.88%"))).toBe(true);
    expect(GAME_FACT_PAGES.slott.facts.some((f) => f.text.includes("10%"))).toBe(true);
    expect(
      GAME_FACT_PAGES.poker.facts.some((f) => f.text.includes("only when a flop is dealt")),
    ).toBe(true);
    expect(GAME_FACT_PAGES.pool.facts.some((f) => f.text.includes("5% of the pot"))).toBe(true);
    expect(GAME_FACT_PAGES.pool.facts.some((f) => f.text.includes("does not draw a winner"))).toBe(
      true,
    );
    expect(blob).not.toMatch(/guaranteed fairness|risk-free|100% secure/i);
  });

  it("does not leave a denial that this site has no poker", () => {
    const banned = [
      "does not offer poker",
      "There is no poker on the site",
      "PVPspinArena is not a poker room",
      "is not a poker room.",
      "does not deal Texas Hold'em",
    ];
    const allow = new Set(["dealer-school.ts", "rocket-league-betting.ts"]);
    const hits: string[] = [];
    for (const name of readdirSync("src/content/guides")) {
      if (!name.endsWith(".ts") || allow.has(name) || name === "index.ts" || name === "types.ts")
        continue;
      const text = readFileSync(`src/content/guides/${name}`, "utf8");
      if (text.includes("four games")) hits.push(`${name}: four games`);
      for (const phrase of banned) {
        if (text.includes(phrase)) hits.push(`${name}: ${phrase}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it("noindexes an unknown URL from the root head and leaves a real page indexable", () => {
    const missing = rootHead(true, "/app.css", "/slot.webp");
    expect(missing.meta).toContainEqual({ name: "robots", content: "noindex" });
    expect(missing.meta).toContainEqual({ title: "Page not found | PVPspinArena" });
    const found = rootHead(false, "/app.css", "/slot.webp");
    expect(found.meta.some((item) => item.name === "robots")).toBe(false);
    expect(found.links[0]).toMatchObject({ rel: "stylesheet", href: "/app.css" });
  });
});
