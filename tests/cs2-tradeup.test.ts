import { describe, expect, it } from "vitest";
import {
  TRADEUP_CATALOG,
  calculateTradeUp,
  expectedValue,
  type TradeInput,
} from "@/lib/cs2-tradeup";
import { GUIDES } from "@/content/guides";
import { BR_ACTIONS } from "@/lib/fps/br/br-settings";

const inputs = (id: string, count = 10): TradeInput[] =>
  Array.from({ length: count }, () => ({ collectionId: id, float: 0.1, min: 0, max: 1 }));

describe("source-backed guide corrections", () => {
  it("keeps the BR guide's dive control aligned with the game's binding", () => {
    const guide = GUIDES.find((g) => g.slug === "browser-battle-royale")!;
    const text = guide.sections.map((s) => s.body).join("\n");
    expect(text).toContain(`| Dive under canopy | ${BR_ACTIONS.dive.key.replace("Key", "")} |`);
    expect(text).not.toContain("| Dive under canopy | Left Ctrl |");
  });

  it("has complete corrected weapon tiers in the two case collections", () => {
    for (const id of ["dreams", "revolution"]) {
      const c = TRADEUP_CATALOG.find((c) => c.id === id)!;
      expect([
        c.skins.milspec.length,
        c.skins.restricted.length,
        c.skins.classified.length,
        c.skins.covert.length,
      ]).toEqual([7, 5, 3, 2]);
    }
    const c = TRADEUP_CATALOG.find((c) => c.id === "revolution")!;
    expect(c.skins.covert.map((s) => s.name)).toEqual(["AK-47 | Head Shot", "M4A4 | Temukau"]);
    expect(c.skins.restricted.some((s) => s.name === "M4A1-S | Emphorosaur-S")).toBe(true);
    expect(c.skins.classified.some((s) => s.name === "P2000 | Wicked Sick")).toBe(true);
    expect(TRADEUP_CATALOG.find((c) => c.id === "mirage")!.skins.classified).toEqual([]);
    expect(
      TRADEUP_CATALOG.find((c) => c.id === "mirage")!.skins.industrial.find(
        (s) => s.name === "Glock-18 | Groundwater",
      ),
    ).toMatchObject({ min: 0.06, max: 0.8 });
  });

  it("reproduces the guide's 7/3 example with all probability accounted for", () => {
    const recipe = [
      ...inputs("dreams", 7),
      ...inputs("revolution", 3).map((i) => ({ ...i, float: 0.2, max: 0.8 })),
    ];
    const r = calculateTradeUp(TRADEUP_CATALOG, recipe, "restricted");
    expect(r.errors).toEqual([]);
    expect(r.outcomes).toHaveLength(6);
    expect(r.avgNorm).toBeCloseTo(0.145);
    expect(r.outcomes.reduce((n, o) => n + o.probability, 0)).toBeCloseTo(1);
    for (const o of r.outcomes)
      expect(o.probability).toBeCloseTo(o.collectionId === "dreams" ? 7 / 30 : 0.1);
    expect(r.outcomes.find((o) => o.name === "AWP | Duality")!.float).toBeCloseTo(0.116);
    const prices = Object.fromEntries(r.outcomes.map((o) => [`${o.collectionId}:${o.name}`, 50]));
    expect(expectedValue(r.outcomes, prices, 46)).toBeCloseTo(4);
  });

  it("rejects missing next tiers instead of displaying partial probability or EV", () => {
    const r = calculateTradeUp(
      TRADEUP_CATALOG,
      [...inputs("dust2", 5), ...inputs("dreams", 5)],
      "classified",
    );
    expect(r.errors.join(" ")).toContain("no next-tier");
    expect(r.outcomes).toEqual([]);
  });

  it("does not fabricate a common knife/glove pool or float range", () => {
    const r = calculateTradeUp(TRADEUP_CATALOG, inputs("dreams", 5), "covert");
    expect(r.errors.join(" ")).toContain("not modelled");
    expect(r.outcomes).toEqual([]);
  });

  it("rejects invalid counts, unavailable tiers, StatTrak sources and floats", () => {
    for (const [recipe, rarity, st] of [
      [inputs("dreams", 9), "restricted", false],
      [inputs("inferno"), "restricted", false],
      [inputs("dust2"), "milspec", true],
      [inputs("dreams").map((i) => ({ ...i, float: 0.9, max: 0.5 })), "restricted", false],
      [inputs("dreams").map((i) => ({ ...i, float: NaN })), "restricted", false],
    ] as const) {
      const r = calculateTradeUp(TRADEUP_CATALOG, [...recipe], rarity, st);
      expect(r.errors.length).toBeGreaterThan(0);
      expect(r.outcomes).toEqual([]);
    }
  });
});
