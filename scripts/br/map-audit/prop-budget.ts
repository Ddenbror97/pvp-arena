/**
 * Map audit: the triangles the props renderer submits from a viewpoint, by LOD ring class and
 * by model (the renderer's own rings and 3D distances; LODs by distance only, as it selects).
 *   npx tsx scripts/br/map-audit/prop-budget.ts [x,y,z ...]
 * Without arguments: Northstar's street, Downtown's centre and its tallest roof, the arena.
 * WHAT_IF=<file.json> tries a change first: { "rings": { "<model>": [near, mid, far] },
 * "tris": { "<model>": [lod0, lod1, lod2] } }.
 */
import { readFileSync } from "node:fs";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { RINGS, type ModelManifest } from "@/lib/fps/br/props-renderer";
import { WORLD_ASSETS } from "@/lib/fps/br/world";

const buf = (p: string) => {
  const f = readFileSync(p);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const meta = JSON.parse(readFileSync(`public${WORLD_ASSETS.meta}`, "utf8"));
const col = JSON.parse(readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"));
const manifest = JSON.parse(readFileSync(`public${WORLD_ASSETS.models}`, "utf8")) as ModelManifest;
const hf = await decodeHeightfield(buf(`public${WORLD_ASSETS.height}`));
const cover = await decodeLandCover(buf(`public${WORLD_ASSETS.landcover}`));
const isl = buildIsland(hf, cover, meta, col);
const whatIf = process.env.WHAT_IF
  ? (JSON.parse(readFileSync(process.env.WHAT_IF, "utf8")) as {
      rings?: Record<string, [number, number, number]>;
      tris?: Record<string, number[]>;
    })
  : {};
const views: Record<string, [number, number, number]> =
  process.argv.length > 2
    ? Object.fromEntries(
        process.argv.slice(2).map((a) => [a, a.split(",").map(Number) as [number, number, number]]),
      )
    : {
        "northstar-street": [-3378.8, 20.6, -3447.8],
        "downtown-centre": [1300, 15.4, 455],
        "downtown-tower-roof": [1300, 95, 420],
        "arena-pitch": [-1827.5, 10.8, 2624.5],
      };
for (const [name, [cx, cy, cz]] of Object.entries(views)) {
  const byClass = new Map<string, number>();
  const byModel = new Map<string, number>();
  let total = 0,
    instances = 0;
  const draws = new Set<string>();
  for (const p of isl.layout) {
    const m = manifest.models[p.model]!;
    const cls = m.ring ?? m.class;
    const ring = whatIf.rings?.[p.model] ?? RINGS[cls] ?? RINGS["prop"]!;
    const d = Math.hypot(p.x - cx, p.y - cy, p.z - cz);
    const level = d <= ring[0] ? 0 : d <= ring[1] ? 1 : d <= ring[2] ? 2 : -1;
    if (level < 0) continue;
    const tris =
      whatIf.tris?.[p.model]?.[level] ?? m.lods[Math.min(level, m.lods.length - 1)]!.tris;
    total += tris;
    instances++;
    draws.add(`${p.model}.${level}`);
    byClass.set(cls, (byClass.get(cls) ?? 0) + tris);
    const key = `${p.model}.lod${level}`;
    byModel.set(key, (byModel.get(key) ?? 0) + tris);
  }
  const top = (m: Map<string, number>, n: number) =>
    [...m]
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([k, v]) => `${k} ${(v / 1000).toFixed(0)}k`)
      .join(", ");
  console.log(
    `\n${name}: ${(total / 1e6).toFixed(2)} M triangles, ${instances} instances, ${draws.size} model LODs`,
  );
  console.log(`  by class: ${top(byClass, 20)}`);
  console.log(`  by model: ${top(byModel, 28)}`);
}
