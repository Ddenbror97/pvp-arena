/**
 * Map audit: how many trees stand within each distance of a viewpoint, over a grid of the whole
 * island, by species (what a ring of real tree models at that radius has to draw).
 *   npx tsx scripts/br/map-audit/tree-rings.ts [radius ...]   (default 60 100 140 180 250)
 */
import { readFileSync } from "node:fs";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { cellOf, cellTrees, SPECIES, TREE_STRIDE } from "@/lib/fps/br/vegetation";
import { WORLD_ASSETS, WORLD_HALF } from "@/lib/fps/br/world";

const buf = (p: string) => {
  const f = readFileSync(p);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const meta = JSON.parse(readFileSync(`public${WORLD_ASSETS.meta}`, "utf8"));
const col = JSON.parse(readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"));
const hf = await decodeHeightfield(buf(`public${WORLD_ASSETS.height}`));
const cover = await decodeLandCover(buf(`public${WORLD_ASSETS.landcover}`));
const isl = buildIsland(hf, cover, meta, col);
const radii = process.argv.slice(2).map(Number);
if (!radii.length) radii.push(60, 100, 140, 180, 250);
const R = Math.max(...radii);
const rows: Array<{ x: number; z: number; counts: number[][] }> = [];
for (let z = -WORLD_HALF + 400; z < WORLD_HALF - 400; z += 300)
  for (let x = -WORLD_HALF + 400; x < WORLD_HALF - 400; x += 300) {
    const counts = radii.map(() => SPECIES.map(() => 0));
    for (let cj = cellOf(z - R); cj <= cellOf(z + R); cj++)
      for (let ci = cellOf(x - R); ci <= cellOf(x + R); ci++) {
        const t = cellTrees(isl.vegetation, ci, cj);
        for (let k = 0; k < t.length; k += TREE_STRIDE) {
          const d = Math.hypot(t[k]! - x, t[k + 2]! - z);
          radii.forEach((r, i) => d < r && counts[i]![t[k + 5]!]!++);
        }
      }
    rows.push({ x, z, counts });
  }
const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);
radii.forEach((r, i) => {
  const totals = rows.map((row) => sum(row.counts[i]!)).sort((a, b) => a - b);
  const q = (p: number) => totals[Math.min(totals.length - 1, Math.floor(totals.length * p))]!;
  const worst = rows.reduce((a, b) => (sum(b.counts[i]!) > sum(a.counts[i]!) ? b : a));
  console.log(
    `r=${r} m: median ${q(0.5)}, p90 ${q(0.9)}, p99 ${q(0.99)}, max ${q(1)} at (${worst.x}, ${worst.z}) ${SPECIES.map((s, k) => `${s} ${worst.counts[i]![k]}`).join(", ")}`,
  );
});
