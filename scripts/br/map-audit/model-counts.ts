/**
 * Map audit: how many times each model matching a prefix is placed, with its render class and
 * ring, and the triangles its placements draw at their near and middle LOD (the worst case:
 * all of them inside that ring).
 *   node scripts/br/map-audit/run.mjs model-counts <prefix>[,prefix…]
 */
import { readFileSync } from "node:fs";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { WORLD_ASSETS } from "@/lib/fps/br/world";

const buf = (p: string) => {
  const f = readFileSync(p);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const meta = JSON.parse(readFileSync(`public${WORLD_ASSETS.meta}`, "utf8"));
const col = JSON.parse(readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"));
const models = JSON.parse(readFileSync(`public${WORLD_ASSETS.models}`, "utf8")).models as Record<
  string,
  { class?: string; ring?: string; lods: Array<{ tris: number; draws: number }> }
>;
const hf = await decodeHeightfield(buf(`public${WORLD_ASSETS.height}`));
const cover = await decodeLandCover(buf(`public${WORLD_ASSETS.landcover}`));
const isl = buildIsland(hf, cover, meta, col);
const prefixes = process.argv[2]!.split(",");
const counts = new Map<string, number>();
for (const p of isl.layout)
  if (prefixes.some((q) => p.model.startsWith(q)))
    counts.set(p.model, (counts.get(p.model) ?? 0) + 1);
let near = 0;
for (const [id, n] of [...counts].sort((a, b) => b[1] - a[1])) {
  const m = models[id]!;
  near += n * m.lods[0]!.tris;
  console.log(
    `${id.padEnd(24)} ${String(n).padStart(4)}  ${(m.ring ?? m.class ?? "").padEnd(10)} ` +
      `lod tris ${m.lods.map((l) => `${l.tris}/${l.draws}d`).join(" ")}`,
  );
}
console.log(`placements ${[...counts.values()].reduce((a, b) => a + b, 0)}, all near ${near} tris`);
