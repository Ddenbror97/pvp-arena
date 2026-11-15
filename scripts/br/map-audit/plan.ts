/**
 * Map audit: a plan of an area for layout work. Writes JSON (placements with their footprints,
 * roads, runways, a height grid) for a box, to be drawn by plan.py:
 *
 *   node scripts/br/map-audit/run.mjs plan <x0> <z0> <x1> <z1> <out.json> [cell]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { WORLD_ASSETS } from "@/lib/fps/br/world";

const buf = (p: string) => {
  const f = readFileSync(p);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const [x0, z0, x1, z1] = process.argv.slice(2, 6).map(Number) as [number, number, number, number];
const outFile = process.argv[6]!;
const cell = Number(process.argv[7] ?? 4);
const meta = JSON.parse(readFileSync(`public${WORLD_ASSETS.meta}`, "utf8"));
const col = JSON.parse(readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"));
const models = JSON.parse(readFileSync(`public${WORLD_ASSETS.models}`, "utf8")).models;
const hf = await decodeHeightfield(buf(`public${WORLD_ASSETS.height}`));
const cover = await decodeLandCover(buf(`public${WORLD_ASSETS.landcover}`));
const isl = buildIsland(hf, cover, meta, col);
const items = isl.layout
  .filter((p) => p.x > x0 - 60 && p.x < x1 + 60 && p.z > z0 - 60 && p.z < z1 + 60)
  .map((p) => {
    const s = models[p.model]?.size ?? [2, 2, 2];
    const odd = p.turn % 2 === 1;
    return {
      m: p.model,
      x: p.x,
      y: p.y,
      z: p.z,
      t: p.turn,
      poi: p.poi,
      w: odd ? s[2] : s[0],
      d: odd ? s[0] : s[2],
      h: s[1],
      cls: models[p.model]?.class,
    };
  });
const heights: number[][] = [];
for (let z = z0; z <= z1; z += cell) {
  const row: number[] = [];
  for (let x = x0; x <= x1; x += cell) row.push(+hf.heightAt(x, z).toFixed(2));
  heights.push(row);
}
writeFileSync(
  outFile,
  JSON.stringify({
    box: [x0, z0, x1, z1],
    cell,
    items,
    heights,
    roads: meta.roads,
    runways: meta.runways,
    pois: meta.pois.map(
      (p: { id: string; x: number; z: number; padRadius?: number; padHeight?: number }) => ({
        id: p.id,
        x: p.x,
        z: p.z,
        r: p.padRadius,
        h: p.padHeight,
      }),
    ),
  }),
);
console.log(items.length, "items");
