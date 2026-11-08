import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland, type Island } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import type { CollisionData } from "@/lib/fps/br/static-world";
import { cellTrees, cellOf, TREE_STRIDE } from "@/lib/fps/br/vegetation";
import type { WorldMeta } from "@/lib/fps/br/world";

const buffer = (path: string) => {
  const f = readFileSync(path);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const meta = JSON.parse(readFileSync("public/fps/br/world.v1.json", "utf8")) as WorldMeta;
const collision = JSON.parse(
  readFileSync("public/fps/br/models/collision.json", "utf8"),
) as CollisionData;
const manifest = JSON.parse(readFileSync("public/fps/br/models/models.json", "utf8")) as {
  models: Record<string, { ring: string; lods: Array<{ tris: number }> }>;
};
let island: Island;
beforeAll(async () => {
  const [hf, cover] = await Promise.all([
    decodeHeightfield(buffer("public/fps/br/height.v1.hf")),
    decodeLandCover(buffer("public/fps/br/landcover.v1.lc")),
  ]);
  island = buildIsland(hf, cover, meta, collision);
}, 60_000);

const FENCES = new Set(["yard-fence", "picket-fence"]);

describe("town house lots (owner, 2026-11-05: neighbourhoods like H1Z1)", () => {
  it("fences lots in every grid town, with cheap, see-through, collision-free sections", () => {
    for (const town of ["northstar-town", "millhaven", "crossroads", "riverwood"]) {
      const n = island.layout.filter((p) => p.poi === town && FENCES.has(p.model)).length;
      expect(n, town).toBeGreaterThan(500);
    }
    for (const id of FENCES) {
      // No collision: a fence a player cannot jump would trap people in yards.
      expect(collision.models[id]).toEqual([]);
      const m = manifest.models[id]!;
      expect(m.ring).toBe("yard");
      expect(m.lods.at(-1)!.tris).toBeLessThanOrEqual(12);
    }
  });

  it("never runs a fence through a building", () => {
    const solid = island.layout.filter(
      (p) => !FENCES.has(p.model) && (collision.models[p.model]?.length ?? 0) > 0,
    );
    const boxes = solid.map((p) => {
      const [w, d] = [0, 2].map((axis) => {
        const bs = collision.models[p.model]!;
        return Math.max(...bs.map((b) => Math.max(Math.abs(b[axis]!), Math.abs(b[axis + 3]!))));
      }) as [number, number];
      const [hx, hz] = p.turn % 2 ? [d, w] : [w, d];
      return { x: p.x, z: p.z, hx, hz, model: p.model };
    });
    const big = boxes.filter((b) => b.hx > 3 && b.hz > 3);
    const fences = island.layout.filter((p) => FENCES.has(p.model));
    const inside = fences.filter((f) =>
      big.some((b) => Math.abs(f.x - b.x) < b.hx - 0.5 && Math.abs(f.z - b.z) < b.hz - 0.5),
    );
    expect(inside.length / fences.length).toBeLessThan(0.002);
  });

  it("plants yard trees through the shared vegetation (drawn and collided like any tree)", () => {
    expect(island.layout.some((p) => p.model.startsWith("tree-"))).toBe(false);
    const p = meta.pois.find((q) => q.id === "northstar-town")!;
    let planted = 0;
    for (let ci = cellOf(p.x - 400); ci <= cellOf(p.x + 400); ci++)
      for (let cj = cellOf(p.z - 400); cj <= cellOf(p.z + 400); cj++) {
        const t = cellTrees(island.vegetation, ci, cj);
        for (let k = 0; k < t.length; k += TREE_STRIDE)
          if (Math.hypot(t[k]! - p.x, t[k + 2]! - p.z) < (p.padRadius ?? 0)) planted++;
      }
    // The town pad grows no trees of its own: these are the yards'.
    expect(planted).toBeGreaterThan(40);
  });
});
