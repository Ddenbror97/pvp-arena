import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { GUIDES, CLUSTER_GROUPS } from "@/content/guides";
import { FPS_PLAN_REUSE } from "@/content/guides/fps-topics";
import { pruneGuideAssets } from "../scripts/emit-guide-assets";
import removals from "../docs/seo/review-removals-2026-11-15.json";

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
    for (const slug of removals.retained) expect(published.has(slug), slug).toBe(true);
    for (const groups of Object.values(CLUSTER_GROUPS))
      for (const group of groups) expect(group.slugs.length, group.name).toBeGreaterThan(0);
  });

  it("removes retired static bodies during a rebuild while preserving current bodies and other files", () => {
    const directory = mkdtempSync(resolve(tmpdir(), "guide-prune-"));
    try {
      writeFileSync(resolve(directory, "bitz-casino-review.json"), '{"old":true}');
      writeFileSync(resolve(directory, "worldwinner-review.json"), '{"current":true}');
      writeFileSync(resolve(directory, "README.md"), "not a generated article");
      pruneGuideAssets(directory, ["worldwinner-review"]);
      expect(readdirSync(directory).sort()).toEqual(["README.md", "worldwinner-review.json"]);
      expect(readFileSync(resolve(directory, "worldwinner-review.json"), "utf8")).toBe(
        '{"current":true}',
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
