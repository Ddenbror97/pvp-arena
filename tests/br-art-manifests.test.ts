import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { WORLD_ASSETS } from "../src/lib/fps/br/world";
// @ts-expect-error: an art tool (plain ES module, no types)
import { editedManifests } from "../art/blender/br/model-files.mjs";

/**
 * Final performance audit 2026-11-24, item 8: five art scripts named the live model manifest
 * of their day ("models.locations-v1.json") and broke once a later revision retired it. They
 * now ask model-files.mjs for the manifests an edit updates, which reads the live one from
 * world.ts.
 */
const ART = path.join(process.cwd(), "art/blender/br");
const MODELS = path.join(process.cwd(), "public/fps/br/models");

describe("art tools' model manifests", () => {
  it("are the game's live manifest and the tools' base one, both on disk", () => {
    const [live, base] = editedManifests() as [string, string];
    expect(`/fps/br/models/${live}`).toBe(WORLD_ASSETS.models);
    expect(base).toBe("models.json");
    for (const f of [live, base]) expect(fs.existsSync(path.join(MODELS, f))).toBe(true);
  });

  it("are not named by a revision in the tools that edit the live one", () => {
    const named: string[] = [];
    for (const f of fs.readdirSync(ART).filter((f) => f.endsWith(".mjs"))) {
      const src = fs.readFileSync(path.join(ART, f), "utf8");
      // A default list of manifests to update (the old pattern): `["models.x.json", "models.json"]`.
      if (/\[\s*"models\.[\w.-]+\.json",\s*"models\.json"\s*\]/.test(src)) named.push(f);
    }
    expect(named).toEqual([]);
  });
});
