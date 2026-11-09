import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import type { CollisionData } from "@/lib/fps/br/static-world";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";

/**
 * The open country (owner, 2026-11-08: "upgrade the dead space areas, like fields, to be more
 * realistic: mountains, rocks… H1Z1's first map is the goal"): crags, cliff fields, outcrops,
 * ruins, lookouts, cabins, camps and pylon lines between the POIs (layout.ts wildlands).
 */
const buffer = (path: string) => {
  const b = readFileSync(path);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
};
const collision = JSON.parse(
  readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"),
) as CollisionData;
const meta = JSON.parse(readFileSync(`public${WORLD_ASSETS.meta}`, "utf8")) as WorldMeta;
const hf = await decodeHeightfield(buffer(`public${WORLD_ASSETS.height}`));
const cover = await decodeLandCover(buffer(`public${WORLD_ASSETS.landcover}`));
const island = buildIsland(hf, cover, meta, collision);
const count = (model: string) => island.layout.filter((p) => p.model === model).length;
const WILD = [
  "crag",
  "boulder-field",
  "abbey-ruins",
  "arch-ruins",
  "fire-lookout",
  "ruined-cabin",
  "log-stack",
  "excavator",
  "rust-container",
  "rail-tank",
  "wind-pump",
  "pylon",
];

describe("open country (wildlands)", () => {
  it("raises relief and story spots across the map", () => {
    expect(count("crag")).toBeGreaterThanOrEqual(8);
    expect(count("boulder-field")).toBeGreaterThanOrEqual(2);
    expect(count("rock-tall")).toBeGreaterThan(100);
    expect(count("abbey-ruins")).toBeGreaterThanOrEqual(6);
    expect(count("fire-lookout")).toBeGreaterThanOrEqual(10);
    expect(count("ruined-cabin")).toBeGreaterThanOrEqual(5);
    expect(count("log-stack")).toBeGreaterThan(20);
    expect(count("rust-container")).toBeGreaterThan(20);
    expect(count("pylon")).toBeGreaterThanOrEqual(15);
  });

  it("fills the open fields and grassland, not only the towns", () => {
    // 300 m cells of mostly open ground (grass or field at the centre) holding a story spot.
    const filled = new Set<string>();
    for (const p of island.layout)
      if (WILD.includes(p.model) || p.model === "rock-tall")
        filled.add(`${Math.floor(p.x / 300)},${Math.floor(p.z / 300)}`);
    let open = 0,
      dressed = 0;
    for (let gz = -16; gz < 16; gz++)
      for (let gx = -16; gx < 16; gx++) {
        const c = cover.classAt((gx + 0.5) * 300, (gz + 0.5) * 300);
        if (c !== "grass" && c !== "field") continue;
        open++;
        if (filled.has(`${gx},${gz}`)) dressed++;
      }
    expect(dressed / open).toBeGreaterThan(0.2);
  });

  it("keeps the story spots out of the POIs' grounds and off the water", () => {
    for (const p of island.layout.filter((q) => WILD.includes(q.model) && q.model !== "pylon")) {
      for (const poi of meta.pois)
        if (poi.padRadius)
          expect(Math.hypot(poi.x - p.x, poi.z - p.z), `${p.model} in ${poi.id}`).toBeGreaterThan(
            poi.padRadius + 100,
          );
      expect(hf.heightAt(p.x, p.z), `${p.model} at ${p.x},${p.z}`).toBeGreaterThan(2);
    }
  });

  it("strings the pylons in lines a wire can span", () => {
    const pylons = island.layout.filter((p) => p.model === "pylon");
    const spans = pylons.slice(1).map((p, k) => Math.hypot(p.x - pylons[k]!.x, p.z - pylons[k]!.z));
    // Most neighbours are one 300 m span apart (wired); a few gaps where a POI or town is crossed.
    expect(spans.filter((d) => d < 420).length).toBeGreaterThan(pylons.length * 0.7);
  });
});
