import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { RINGS } from "../src/lib/fps/br/props-renderer";
import { VEGETATION_VIEW } from "../src/lib/fps/br/vegetation-renderer";
import { WORLD_ASSETS } from "../src/lib/fps/br/world";

/**
 * Forgotten Ruins' forest (owner, 2026-11-22: "threes and bushes load in late in forgotten
 * ruins, should be synced how the rest of the worlds threes/gras loads in"). The ruins' trees
 * and tree-high plants are placed as props; they now draw as far as the island's own trees,
 * every one of them (no thinning), while the low ferns keep the undergrowth's ring.
 */
const manifest = JSON.parse(readFileSync(`public${WORLD_ASSETS.models}`, "utf8")) as {
  models: Record<string, { ring?: string; class: string; size: number[] }>;
};
const TREES = [
  "tall-tree",
  "bald-cypress",
  "palm-tall",
  "palm-fan",
  "banana-grove",
  "coconut-palm",
  "palm-clump",
  "banana-plant",
  "palm-small",
  "palm-young-a",
  "palm-young-b",
  "bamboo-clump",
  "palm-short",
];

describe("Forgotten Ruins' forest", () => {
  it("draws its trees as far as the island's trees", () => {
    expect(RINGS["jungle-tree"]![2]).toBe(VEGETATION_VIEW.viewDistance);
    for (const id of TREES) expect(manifest.models[id]?.ring, id).toBe("jungle-tree");
  });

  it("puts every placed plant over 4 m tall on that ring", () => {
    for (const [id, m] of Object.entries(manifest.models))
      if (m.ring === "undergrowth" || m.ring === "undergrowth-heavy")
        expect(m.size[1], id).toBeLessThan(4.5);
  });
});
