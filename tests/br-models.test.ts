import { WORLD_ASSETS } from "@/lib/fps/br/world";
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
  assets: Array<{ id: string; class: string; procedural?: string }>;
};
const manifest = JSON.parse(readFileSync(`public${WORLD_ASSETS.models}`, "utf8")) as {
  models: Record<
    string,
    { licence: string; author: string; source: string; class: string; lods: Lod[] }
  >;
};
const attribution = readFileSync("public/fps/br/models/ATTRIBUTION.md", "utf8");

describe("Project Island models", () => {
  it("builds every kit asset, with a CC BY credit (or our own procedural work)", () => {
    expect(Object.keys(manifest.models).sort()).toEqual(kit.assets.map((a) => a.id).sort());
    for (const [id, m] of Object.entries(manifest.models)) {
      // Procedural buildings are our own work, built by their script in art/blender/br.
      if (kit.assets.find((a) => a.id === id)?.procedural) {
        expect(m.licence, id).toBe("Original work (procedural)");
        expect(m.source, id).toMatch(/^art\/blender\/br\/build_\w+\.mjs$/);
        continue;
      }
      // The Bauhaus block: Free3D Personal Use, used with the owner's approval (2026-11-04).
      if (id === "bauhaus-block") {
        expect(m.licence, id).toMatch(/^Free3D Personal Use/);
        continue;
      }
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
      if (a.class === "tree" || a.class === "bush")
        expect(l2.draws, a.id).toBeLessThanOrEqual(budget.draws);
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
    // stream by distance ring, so this is the whole-match total, not the first-frame download;
    // the Superstore grounds added 35 more, ~2.5 MB, the island polish 25, ~2 MB, and the
    // open country's rocks, ruins and story spots 19, ~2.3 MB, and the landmarks (railways,
    // port, power station, hospital, schools, salvage, graveyards, military) 39, ~3.9 MB,
    // 2026-11-08; the building audit's quarry, mine, cabin and fence models and the fitted
    // shells ~1.6 MB, 2026-11-09; the location audit's hospital, field hospital, works halls,
    // dam crane and buoys ~1.7 MB, 2026-11-09; Blackwater Prison's cell houses, towers,
    // floodlights, bars and bunks and Riverwood's sawmill, shacks and boats ~1.7 MB,
    // 2026-11-09; Southern Military Base's vehicles, bunkers, posts and sheds and Murder
    // Cabins' camp ~1.4 MB, 2026-11-09; Eastport's fishing hut and boats and the mountains'
    // scanned cliff and rocks ~0.47 MB, 2026-11-11; the Superstore's furniture, 23 models
    // from the owner's store downloads, ~0.9 MB, 2026-11-11; the strait's pylons, bridgehead
    // booths and lookouts, tetrapods, shore rocks, cliffs, driftwood and wrecks, ~0.6 MB,
    // 2026-11-11; the bridgeheads' guard towers and watchtowers, ~0.16 MB, 2026-11-11; the
    // strait roads' motel, its sign, picnic shelters, payphones and a produce stall, ~0.55 MB,
    // 2026-11-12; the motor court, its fuel dispensers, the reflector poles and the highway
    // stops' filling station, ~0.62 MB, 2026-11-12; the mega hospital's four blocks, sky
    // bridges and 28 furniture models from the owner's hospital downloads, ~1.7 MB, 2026-11-13; the
    // outer ring's plant, laundry, kitchen, canteen, fire engine and helicopters, ~1 MB, 2026-11-13).
    expect(total / 1024).toBeLessThan(41.0);
  });
});
