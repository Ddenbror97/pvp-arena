import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { listPanes, shatterAlong, withPanes, type Pane } from "@/lib/fps/br/panes";
import type { CollisionData } from "@/lib/fps/br/static-world";
import windowPanes from "@/lib/fps/br/window-panes.json";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";

/**
 * Every building's window glass breakable (owner, 2026-11-23: "Add glass windows to
 * apartments/buildings … they should have the breaking window ones with the sound. also fix
 * buildings with a window but no glass, it looks like glass but there is nothing there").
 * art/blender/br/glass_panes.mjs took the glass out of the buildings' near LODs and listed it
 * (window-panes.json); here on the island's own placements: whole glass stops a player, a shot
 * breaks it, and then the window is an opening (its collision was cut away where the textured
 * kit's glass had collided as wall).
 */
const buffer = (path: string) => {
  const b = readFileSync(path);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
};
const collision = JSON.parse(
  readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"),
) as CollisionData;
const manifest = JSON.parse(readFileSync(`public${WORLD_ASSETS.models}`, "utf8")) as {
  models: Record<string, { lods: Array<{ file: string }> }>;
};
const meta = JSON.parse(readFileSync(`public${WORLD_ASSETS.meta}`, "utf8")) as WorldMeta;
const hf = await decodeHeightfield(buffer(`public${WORLD_ASSETS.height}`));
const cover = await decodeLandCover(buffer(`public${WORLD_ASSETS.landcover}`));
const island = buildIsland(hf, cover, meta, collision);
const all = listPanes(island.panes);
const models = (windowPanes as unknown as { revision: string; models: Record<string, number[][]> })
  .models;

/** The middle of a pane, its thin axis (0: x, 2: z), and a point `d` m off it either way. */
function across(p: Pane, d: number) {
  const [x0, y0, z0, x1, y1, z1] = p.box;
  const thin = x1 - x0 < z1 - z0 ? 0 : 2;
  const mid = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2] as [number, number, number];
  const off = (s: number) =>
    [mid[0] + (thin === 0 ? s * d : 0), mid[1], mid[2] + (thin === 2 ? s * d : 0)] as [
      number,
      number,
      number,
    ];
  return { mid, thin, a: off(-1), b: off(1) };
}

describe("the buildings' windows are breakable glass", () => {
  it("belong to this world revision, and the near LODs they came out of are its own", () => {
    expect((windowPanes as { revision: string }).revision).toBe(WORLD_ASSETS.revision);
    const ids = Object.keys(models);
    // The procedural houses and blocks, the textured kit's towns and works among them.
    for (const id of [
      "apartment",
      "bungalow",
      "townhouse",
      "bauhaus-block",
      "cove-house-red",
      "rural-store-1",
      "rural-store-3",
      "rural-store-5",
      "brick-shop",
      "garage",
      "warehouse",
      "house",
      "rural-house",
      "rural-mobile-home",
      "rural-wood-1",
      "rural-wood-4",
      "rural-diner",
    ])
      expect(ids).toContain(id);
    for (const id of ids) {
      expect(manifest.models[id]!.lods[0]!.file).toContain(`.${WORLD_ASSETS.revision}.lod0.`);
      for (const [x0, x1, z0, z1, y0, y1] of models[id]!) {
        // Upright slabs, thin one way.
        expect(Math.min(x1! - x0!, z1! - z0!)).toBeLessThanOrEqual(0.081);
        expect(Math.max(x1! - x0!, z1! - z0!)).toBeGreaterThanOrEqual(0.25);
        expect(Math.max(x1! - x0!, z1! - z0!)).toBeLessThanOrEqual(1.81);
        expect(y1! - y0!).toBeGreaterThanOrEqual(0.3);
      }
    }
  });

  it("are placed with every building that has them, each knowing its building", () => {
    const windows = all.filter((p) => p.placement !== undefined);
    let expected = 0;
    for (const p of island.layout) expected += models[p.model]?.length ?? 0;
    expect(windows.length).toBe(expected);
    expect(windows.length).toBeGreaterThan(20_000);
    for (const p of windows.slice(0, 5000))
      expect(models[island.layout[p.placement!]!.model]).toBeDefined();
  });

  // (The procedural houses, the textured kit's towns and works, and the windows cut_windows.mjs
  // cut through blank walls and painted-on windows.)
  for (const model of [
    "bungalow",
    "apartment",
    "cove-house-red",
    "ew-control-house",
    "rural-store-1",
    "rural-store-3",
    "brick-shop",
    "garage",
    "house",
    "rural-house",
    "rural-wood-1",
    "rural-diner",
  ])
    it(`${model}: whole glass stops a player, a shot breaks it, then it is an opening`, () => {
      const broken = new Uint8Array(island.panes.count);
      const glazed = withPanes(island.solid, island.panes, broken);
      const at = island.layout.findIndex((p) => p.model === model);
      expect(at).toBeGreaterThanOrEqual(0);
      const panes = all.filter((p) => p.placement === at);
      expect(panes.length).toBe(models[model]!.length);
      // A pane with room for a hull (the widest at the lowest storey).
      const lowest = Math.min(...panes.map((p) => p.box[1]));
      const pane = panes
        .filter((p) => p.box[1] < lowest + 0.5)
        .sort((a, b) => {
          const w = (p: Pane) => Math.max(p.box[3] - p.box[0], p.box[5] - p.box[2]);
          return w(b) - w(a);
        })[0]!;
      const { mid, a, b } = across(pane, 0.6);
      // Whole: a body in the opening is blocked by the glass only.
      const feet = mid[1] - 0.2;
      expect(glazed.blocked(mid[0], feet, mid[2], 0.4, 0.05)).toBe(true);
      // The shot crosses it from outside: it breaks, and only it.
      const before = broken.reduce((n, v) => n + v, 0);
      shatterAlong(glazed, a[0], a[1], a[2], b[0] - a[0], 0, b[2] - a[2], 1.2);
      expect(broken[pane.id]).toBe(1);
      expect(broken.reduce((n, v) => n + v, 0)).toBe(before + 1);
      // Broken: nothing in the opening (the wall's collision was cut where the glass stood).
      expect(glazed.blocked(mid[0], feet, mid[2], 0.4, 0.05)).toBe(false);
      const ray = island.solid.raycast(a[0], a[1], a[2], b[0] - a[0], 0, b[2] - a[2], 1.2);
      expect(ray === null || ray.distance > 1.15).toBe(true);
    });
});
