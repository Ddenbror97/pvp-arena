import { WORLD_ASSETS } from "@/lib/fps/br/world";
/**
 * Map audit: where a new place of radius R fits in a box: little relief, no water, no buildings
 * on it, a road nearby. node scripts/br/map-audit/run.mjs sitefind x0 z0 x1 z1 R
 */
import { readFileSync } from "node:fs";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import type { CollisionData } from "@/lib/fps/br/static-world";
import { LAND_COVER, type WorldMeta } from "@/lib/fps/br/world";

const buf = (p: string) => {
  const f = readFileSync(p);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const meta = JSON.parse(readFileSync("public/fps/br/world.v1.json", "utf8")) as WorldMeta;
const collision = JSON.parse(readFileSync(`public${WORLD_ASSETS.collision}`, "utf8")) as CollisionData;
const models = JSON.parse(readFileSync(`public${WORLD_ASSETS.models}`, "utf8")).models as Record<string, { class: string }>;
const hf = await decodeHeightfield(buf("public/fps/br/height.v1.hf"));
const cover = await decodeLandCover(buf("public/fps/br/landcover.v1.lc"));
const island = buildIsland(hf, cover, meta, collision);
const [x0, z0, x1, z1, R] = process.argv.slice(2).map(Number) as [number, number, number, number, number];
const built = island.layout.filter((l) => ["building", "structure", "hero"].includes(models[l.model]?.class ?? ""));
const res: Array<[number, string]> = [];
for (let cz = z0; cz <= z1; cz += 50)
  for (let cx = x0; cx <= x1; cx += 50) {
    let lo = Infinity, hi = -Infinity, wet = 0, n = 0;
    for (let a = 0; a < 24; a++)
      for (const f of [0, 0.35, 0.7, 1]) {
        const x = cx + Math.cos((a / 24) * 6.283) * R * f, z = cz + Math.sin((a / 24) * 6.283) * R * f;
        const h = hf.heightAt(x, z);
        n++;
        if (h < 1.5 || LAND_COVER[cover.classIdAt(x, z)] === "water" || meta.waterBodies.some((w) => x >= w.bounds[0] && x <= w.bounds[2] && z >= w.bounds[1] && z <= w.bounds[3] && h < w.level + 1)) wet++;
        lo = Math.min(lo, h); hi = Math.max(hi, h);
      }
    const inside = built.filter((b) => Math.hypot(b.x - cx, b.z - cz) < R + 20).length;
    let road = Infinity;
    for (const rd of meta.roads) for (const p of rd.points) road = Math.min(road, Math.hypot(p[0] - cx, p[1] - cz));
    const rivers = (meta.rivers ?? []).some((r: { points: number[][] }) => r.points.some((p) => Math.hypot(p[0] - cx, p[1] - cz) < R + 30));
    if (wet || inside || rivers) continue;
    const score = hi - lo + road / 40;
    res.push([score, `${cx},${cz} relief ${(hi - lo).toFixed(1)} h ${lo.toFixed(1)}-${hi.toFixed(1)} road ${Math.round(road)}`]);
  }
res.sort((a, b) => a[0] - b[0]);
for (const r of res.slice(0, 15)) console.log(r[1]);
console.log(res.length, "candidates");
