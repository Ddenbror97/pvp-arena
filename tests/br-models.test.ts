import { existsSync, readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Processed Project Island models (art/blender/br/process_assets.mjs): every model in the kit is
 * built, licensed CC BY with a credit, inside its class budget, and its LODs get cheaper.
 */
type Lod = {
  file: string;
  tris: number;
  draws: number;
  textureMB: number;
  kB: number;
  size: number[];
};
const kit = JSON.parse(readFileSync("art/br/assets/kit.json", "utf8")) as {
  budgets: Record<string, { tris: number; draws: number; textureMB: number }>;
  assets: Array<{ id: string; class: string }>;
};
const manifest = JSON.parse(readFileSync("public/fps/br/models/models.json", "utf8")) as {
  models: Record<
    string,
    { licence: string; author: string; source: string; class: string; lods: Lod[] }
  >;
};
const attribution = readFileSync("public/fps/br/models/ATTRIBUTION.md", "utf8");

describe("Project Island models", () => {
  it("builds every kit asset, with a CC BY credit", () => {
    expect(Object.keys(manifest.models).sort()).toEqual(kit.assets.map((a) => a.id).sort());
    for (const [id, m] of Object.entries(manifest.models)) {
      expect(m.licence, id).toBe("CC BY 4.0");
      expect(m.author, id).toBeTruthy();
      expect(m.source, id).toMatch(/^https:\/\/sketchfab\.com\//);
      expect(attribution).toContain(m.source);
    }
  });

  it("keeps each model inside its class budget, with cheaper LODs", () => {
    for (const a of kit.assets) {
      const m = manifest.models[a.id]!;
      const budget = kit.budgets[a.class]!;
      const [l0, l1, l2] = m.lods as [Lod, Lod, Lod];
      // LOD0 may exceed the triangle target by up to 2× before it is rebuilt as a silhouette.
      expect(l0.tris, a.id).toBeLessThanOrEqual(budget.tris * 2);
      expect(l0.draws, a.id).toBeLessThanOrEqual(budget.draws + 1);
      expect(l0.textureMB, a.id).toBeLessThanOrEqual(budget.textureMB + 0.01);
      expect(l1.tris, a.id).toBeLessThanOrEqual(l0.tris);
      expect(l2.tris, a.id).toBeLessThanOrEqual(l1.tris);
      // The farthest LOD is one draw, except foliage, which keeps its alpha-tested materials.
      if (a.class === "tree") expect(l2.draws, a.id).toBeLessThanOrEqual(budget.draws);
      else expect(l2.draws, a.id).toBe(1);
      for (const lod of m.lods) {
        const file = `public${lod.file}`;
        expect(existsSync(file), file).toBe(true);
        expect(statSync(file).size).toBeGreaterThan(500);
      }
    }
  });

  it("stays small to download", () => {
    const total = Object.values(manifest.models).reduce(
      (s, m) => s + m.lods.reduce((t, l) => t + l.kB, 0),
      0,
    );
    // MB for all models and all LODs (the mainland towns added ~30 models in batch 3; models
    // stream by distance ring, so this is the whole-match total, not the first-frame download).
    expect(total / 1024).toBeLessThan(14);
  });
});
