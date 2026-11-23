import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { PARKED_FOOT, REPLACED } from "@/lib/fps/br/parked-cars";
import { turnBox, type CollisionData } from "@/lib/fps/br/static-world";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";

/**
 * The parked vehicles (vehicles-v1; owner, 2026-11-23: "audit all veicels. some are broken like
 * this taxi … spread them around the map, replace broken cars").
 */
const manifest = JSON.parse(readFileSync(`public${WORLD_ASSETS.models}`, "utf8")) as {
  models: Record<
    string,
    { class: string; sourceTris: number; size: number[]; lods: Array<{ tris: number }> }
  >;
};
const collision = () =>
  JSON.parse(readFileSync(`public${WORLD_ASSETS.collision}`, "utf8")) as CollisionData;

describe("the new vehicle models", () => {
  const ids = Object.keys(PARKED_FOOT);

  it("are in this revision, with collision, and kept most of their shape", () => {
    const c = collision();
    for (const id of ids) {
      const m = manifest.models[id];
      expect(m, id).toBeDefined();
      expect(m!.class).toBe("vehicle");
      expect(c.models[id]?.length, id).toBeGreaterThan(0);
      // The broken ones kept 13–17 % of their triangles: bumpers hung, wheels sank.
      expect(m!.lods[0]!.tris / m!.sourceTris, id).toBeGreaterThan(0.45);
    }
  });

  it("lie along x like the cars they replace, with layout footprints that fit them", () => {
    for (const id of ids) {
      const [len, , width] = manifest.models[id]!.size as [number, number, number];
      expect(len, id).toBeGreaterThan(width);
      const [fl, fw] = PARKED_FOOT[id]!;
      expect(fl).toBeGreaterThanOrEqual(len);
      expect(fw).toBeGreaterThanOrEqual(width);
    }
  });
});

describe("on the island", async () => {
  const buffer = (path: string) => {
    const b = readFileSync(path);
    return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
  };
  const meta = JSON.parse(readFileSync(`public${WORLD_ASSETS.meta}`, "utf8")) as WorldMeta;
  const hf = await decodeHeightfield(buffer(`public${WORLD_ASSETS.height}`));
  const cover = await decodeLandCover(buffer(`public${WORLD_ASSETS.landcover}`));
  const island = buildIsland(hf, cover, meta, collision());
  const cars = island.layout.filter((p) => p.model in PARKED_FOOT);

  it("no broken car is left, bar the kept rusty school buses and the airfield's fire tender", () => {
    const left = island.layout.filter((p) => REPLACED.has(p.model)).map((p) => p.model);
    expect(left.filter((m) => m !== "school-bus" && m !== "fire-truck")).toEqual([]);
    expect(cars.length).toBeGreaterThan(1400);
  });

  it("every street has a mix: many models, none more than one car in ten", () => {
    const count = new Map<string, number>();
    for (const p of cars) count.set(p.model, (count.get(p.model) ?? 0) + 1);
    expect(count.size).toBeGreaterThan(25);
    for (const [id, n] of count)
      if (id !== "civ-taxi") expect(n / cars.length, id).toBeLessThan(0.1);
    // Downtown's taxis stay taxis; the police station's cruisers are patrol cars.
    expect(
      island.layout.filter((p) => p.poi === "downtown" && p.model === "civ-taxi").length,
    ).toBeGreaterThan(50);
    expect(count.get("civ-police")).toBeGreaterThan(5);
  });

  it("two cars never share a space", () => {
    const c = collision();
    const box = (p: (typeof cars)[number]) => {
      const t = turnBox(c.models[p.model]![0]!, p.turn);
      return [p.x + t[0], p.z + t[2], p.x + t[3], p.z + t[5]];
    };
    const both: string[] = [];
    for (let i = 0; i < cars.length; i++)
      for (let j = i + 1; j < cars.length; j++) {
        if (Math.abs(cars[i]!.x - cars[j]!.x) > 12 || Math.abs(cars[i]!.z - cars[j]!.z) > 12)
          continue;
        const a = box(cars[i]!),
          b = box(cars[j]!);
        if (
          a[0]! < b[2]! - 0.1 &&
          a[2]! > b[0]! + 0.1 &&
          a[1]! < b[3]! - 0.1 &&
          a[3]! > b[1]! + 0.1
        )
          both.push(
            `${cars[i]!.model}@${cars[i]!.x},${cars[i]!.z} ${cars[j]!.model}@${cars[j]!.x},${cars[j]!.z}`,
          );
      }
    expect(both).toEqual([]);
  });
});
