import { describe, expect, it } from "vitest";
import { publishedTopics } from "@/lib/guides/catalog";
import { TOPIC_NAV } from "@/lib/guides/topic-nav";

describe("footer topic links", () => {
  it("list every published topic once and nothing else", () => {
    const nav = TOPIC_NAV.map((t) => t.slug);
    expect(new Set(nav).size).toBe(nav.length);
    expect([...nav].sort()).toEqual(
      publishedTopics()
        .map((t) => t.slug)
        .sort(),
    );
  });
});
