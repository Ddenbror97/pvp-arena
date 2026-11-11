import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEFAULT_MAP_KEY, ROTATION_MAP_KEYS } from "../src/lib/fps/maps/ids";
import { ROTATION_ART_PRELOAD } from "../src/lib/fps/maps/loading-art";
import { ROTATION_LOADING_IMAGES } from "../src/lib/fps/maps/loading-screens";
import { DEFAULT_MAP_ID, ROTATION_MAP_IDS } from "../src/lib/fps/maps/registry";

/**
 * Modules the script of every page reaches (the page shell and the parts of route files that
 * are not split out) must not import the FPS map registry: it carries every map's geometry
 * and compiles the maps when it loads (platform audit 2026-11-10: 60 KB on every page).
 */
describe("page shell stays free of map geometry", () => {
  it.each([
    "src/lib/fps/duel.functions.ts",
    "src/lib/fps/maps/loading-art.ts",
    "src/routes/fps.$matchId.tsx",
    "src/lib/fps/maps/ids.ts",
    "src/lib/fps/queue.ts",
    "src/lib/fps/api.ts",
    "src/lib/fps/showcase.ts",
    "src/components/fps/FpsQueueNotice.tsx",
  ])("%s does not import the registry or a map", (file) => {
    const source = readFileSync(file, "utf8");
    expect(source).not.toMatch(/from "[^"]*maps\/(registry|catalog|loading-screens)"/);
    expect(source).not.toMatch(/from "[^"]*-layout"/);
  });

  it("the id-only module lists exactly the registry's default and rotation", () => {
    expect(DEFAULT_MAP_KEY).toBe(DEFAULT_MAP_ID);
    expect([...ROTATION_MAP_KEYS]).toEqual([...ROTATION_MAP_IDS]);
    expect([...ROTATION_ART_PRELOAD]).toEqual([...ROTATION_LOADING_IMAGES]);
  });
});
