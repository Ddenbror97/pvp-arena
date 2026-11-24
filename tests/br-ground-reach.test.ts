import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GROUND, GROUND_REACH, GROUND_TILE_GLSL, groundTileUniforms } from "@/lib/fps/br/terrain";

/**
 * The ground's reach (terrain.ts GROUND.reach; owner, 2026-11-24: "increase even more the
 * distance on the ground to not be blurry like 50-70 meters infront of the character"): the
 * tile's filter along the view is kept short, so stones and tufts still show far ahead.
 */
describe("ground reach", () => {
  // The length (m) the tile is filtered over along the view, for a footprint that long (the
  // shader's rule, groundTile).
  const filtered = (footprint: number) =>
    footprint <= GROUND.reach
      ? footprint
      : GROUND.reach * (footprint / GROUND.reach) ** GROUND.reachGrow;
  // A pixel's footprint along the view on flat ground, from eye height (918 px, 70° upright).
  const footprint = (distance: number) => (distance * distance * (1.22 / 918)) / 1.7;

  it("keeps the filter far shorter than the footprint at 50–70 m, and never longer", () => {
    for (const d of [5, 10, 15, 26, 40, 60, 70, 95]) {
      const f = footprint(d);
      expect(filtered(f)).toBeLessThanOrEqual(f + 1e-9);
    }
    // Exact where the pixel resolves the tile anyway (a few metres ahead).
    expect(filtered(footprint(5))).toBeCloseTo(footprint(5), 6);
    // 60 m: more than 2 m of ground a pixel, filtered over less than half a metre.
    expect(footprint(60)).toBeGreaterThan(2);
    expect(filtered(footprint(60))).toBeLessThan(0.5);
    // Still growing with distance (a fixed length is noise far off: every pixel another stone).
    expect(filtered(footprint(60))).toBeGreaterThan(filtered(footprint(26)) * 1.5);
    expect(filtered(footprint(26))).toBeGreaterThan(filtered(footprint(15)) * 1.2);
  });

  it("ends beyond the near textures, where the view is from the air", () => {
    expect(GROUND.reachEnd).toBeGreaterThanOrEqual(GROUND.range * 1.5);
    const terrain = readFileSync("src/lib/fps/br/terrain.ts", "utf8");
    expect(terrain).toContain(
      "brExact = smoothstep(${GROUND.range.toFixed(1)}, ${GROUND.reachEnd.toFixed(1)}, camDist);",
    );
  });

  it("is one rule for the terrain and the road meshes, with shared uniforms", () => {
    expect(GROUND_TILE_GLSL).toContain("pow(reach / len, (1.0 - uGroundReach.y) * (1.0 - exact))");
    expect(GROUND_TILE_GLSL).toContain("reach = uGroundReach.x * perMetre");
    const u = groundTileUniforms();
    expect(u.uGroundReach).toBe(GROUND_REACH);
    expect([GROUND_REACH.value.x, GROUND_REACH.value.y]).toEqual([GROUND.reach, GROUND.reachGrow]);
    for (const file of ["terrain.ts", "structures-renderer.ts"]) {
      const src = readFileSync(`src/lib/fps/br/${file}`, "utf8");
      expect(src).toContain("${GROUND_TILE_GLSL}");
      expect(src).toContain("groundTile(uGroundA,");
    }
  });
});
