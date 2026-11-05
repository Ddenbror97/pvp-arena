/** Map audit: per landmark POI, building overlaps with roads and the pad edge. */
import { readFileSync } from "node:fs";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import type { WorldMeta } from "@/lib/fps/br/world";
const buf = (p: string) => {
  const f = readFileSync(p);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const meta = JSON.parse(readFileSync("public/fps/br/world.v1.json", "utf8")) as WorldMeta;
const collision = JSON.parse(readFileSync("public/fps/br/models/collision.json", "utf8"));
const models = JSON.parse(readFileSync("public/fps/br/models/models.json", "utf8")).models;
const hf = await decodeHeightfield(buf("public/fps/br/height.v1.hf"));
const cover = await decodeLandCover(buf("public/fps/br/landcover.v1.lc"));
const island = buildIsland(hf, cover, meta, collision);
const ids = (
  process.argv[2] ?? "central-hospital,blackwater-prison,southern-military-base,east-works"
).split(",");
for (const id of ids) {
  const p = meta.pois.find((q) => q.id === id)!;
  const mine = island.layout.filter((l) => l.poi === id);
  const issues: string[] = [];
  for (const l of mine) {
    const m = models[l.model];
    if (!m || !["building", "hero", "structure"].includes(m.class)) continue;
    const [sx, , sz] = m.size;
    const [w, d] = l.turn % 2 ? [sz, sx] : [sx, sz];
    // Road centrelines through the footprint (6 m road half width allowance 3 m).
    for (const r of meta.roads)
      for (let k = 0; k + 1 < r.points.length; k++) {
        const [ax, az] = r.points[k]!,
          [bx, bz] = r.points[k + 1]!;
        for (let t = 0; t <= 1; t += 0.05) {
          const x = ax + (bx - ax) * t,
            z = az + (bz - az) * t;
          if (Math.abs(x - l.x) < w / 2 + 3 && Math.abs(z - l.z) < d / 2 + 3) {
            issues.push(`${l.model}@(${Math.round(l.x - p.x)},${Math.round(l.z - p.z)}) on a road`);
            t = 2;
            k = r.points.length;
          }
        }
      }
    const g = Math.min(
      ...[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
        [0, 0],
      ].map(([a, b]) => hf.heightAt(l.x + (a! * w) / 2, l.z + (b! * d) / 2)),
    );
    if (Math.abs(g - l.y) > 1)
      issues.push(
        `${l.model}@(${Math.round(l.x - p.x)},${Math.round(l.z - p.z)}) ground ${g.toFixed(1)} vs y ${l.y}`,
      );
  }
  for (const r of meta.roads)
    for (const [x, z] of r.points)
      if (Math.hypot(x - p.x, z - p.z) < 200 && process.env.ROADS)
        console.log("  road", Math.round(x - p.x), Math.round(z - p.z));
  console.log(id, mine.length, "placements;", [...new Set(issues)].join("; ") || "ok");
}
