import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { GUIDES, CLUSTER_GROUPS } from "@/content/guides";
import { FPS_PLAN_REUSE } from "@/content/guides/fps-topics";
import { pruneGuideAssets } from "../scripts/emit-guide-assets";
import removals from "../docs/seo/review-removals-2026-11-15.json";
import removals2 from "../docs/seo/review-removals-2026-11-18.json";
import { GONE_GUIDES, MOVED_GUIDES, retiredGuideResponse } from "@/lib/guides/retired";

describe("retired review articles", () => {
  it("removes the agreed reviews without removing the retained selection or leaving references", () => {
    expect(removals.removed).toHaveLength(163);
    expect(removals.retained).toHaveLength(40);
    const published = new Set(GUIDES.map((guide) => guide.slug));
    const references = JSON.stringify([GUIDES, CLUSTER_GROUPS, FPS_PLAN_REUSE]);
    for (const slug of removals.removed) {
      expect(published.has(slug), slug).toBe(false);
      expect(references, slug).not.toContain(slug);
    }
    for (const slug of removals.retained)
      if (!removals2.removed.includes(slug)) expect(published.has(slug), slug).toBe(true);
    for (const groups of Object.values(CLUSTER_GROUPS))
      for (const group of groups) expect(group.slugs.length, group.name).toBeGreaterThan(0);
  });

  it("removes retired static bodies during a rebuild while preserving current bodies and other files", () => {
    const directory = mkdtempSync(resolve(tmpdir(), "guide-prune-"));
    try {
      writeFileSync(resolve(directory, "bitz-casino-review.json"), '{"old":true}');
      writeFileSync(resolve(directory, "avia-games-review.json"), '{"current":true}');
      writeFileSync(resolve(directory, "README.md"), "not a generated article");
      pruneGuideAssets(directory, ["avia-games-review"]);
      expect(readdirSync(directory).sort()).toEqual(["README.md", "avia-games-review.json"]);
      expect(readFileSync(resolve(directory, "avia-games-review.json"), "utf8")).toBe(
        '{"current":true}',
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("removes the second review batch and answers every retired URL with a 301 or a 410", () => {
    expect(removals2.removed).toHaveLength(22);
    const published = new Set(GUIDES.map((guide) => guide.slug));
    const references = JSON.stringify([GUIDES, CLUSTER_GROUPS, FPS_PLAN_REUSE]);
    for (const slug of removals2.removed) {
      expect(published.has(slug), slug).toBe(false);
      expect(references, slug).not.toContain(`"${slug}"`);
      expect(references, slug).not.toContain(`/guides/${slug})`);
    }
    for (const slug of removals2.retained) expect(published.has(slug), slug).toBe(true);
    for (const [from, to] of Object.entries(MOVED_GUIDES)) {
      expect(published.has(from), from).toBe(false);
      expect(published.has(to), `${from} -> ${to}`).toBe(true);
      const res = retiredGuideResponse(new URL(`https://pvpspinarena.com/guides/${from}`))!;
      expect(res.status).toBe(301);
      expect(res.headers.get("location")).toBe(`https://pvpspinarena.com/guides/${to}`);
    }
    for (const slug of [...removals.removed, ...removals2.removed]) {
      const res = retiredGuideResponse(new URL(`https://pvpspinarena.com/guides/${slug}`))!;
      expect([301, 410], slug).toContain(res.status);
      if (res.status === 410) expect(GONE_GUIDES.has(slug)).toBe(true);
    }
    expect(retiredGuideResponse(new URL("https://pvpspinarena.com/guides/house-edge"))).toBeNull();
    expect(
      retiredGuideResponse(new URL("https://pvpspinarena.com/guides/topics/poker")),
    ).toBeNull();
  });
});
