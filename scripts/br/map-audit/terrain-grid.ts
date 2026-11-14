/**
 * Map audit: heights and land cover on a grid round a point (planning a site).
 *   npx tsx scripts/br/map-audit/terrain-grid.ts <x> <z> <half> <step>
 */
import { readFileSync } from "node:fs";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { LAND_COVER, WORLD_ASSETS } from "@/lib/fps/br/world";

const buf = (p: string) => {
  const f = readFileSync(p);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const hf = await decodeHeightfield(buf(`public${WORLD_ASSETS.height}`));
const cover = await decodeLandCover(buf(`public${WORLD_ASSETS.landcover}`));
const [cx, cz, half, step] = process.argv.slice(2).map(Number) as [number, number, number, number];
const rows: string[] = [];
for (let z = cz - half; z <= cz + half; z += step) {
  const row: string[] = [];
  for (let x = cx - half; x <= cx + half; x += step) {
    const c = LAND_COVER[cover.classIdAt(x, z)]!;
    row.push(`${Math.round(hf.heightAt(x, z)).toString().padStart(4)}${c[0]}`);
  }
  rows.push(`${String(z).padStart(6)} ${row.join(" ")}`);
}
console.log(`x from ${cx - half} step ${step}`);
console.log(rows.join("\n"));
