/**
 * Map audit: every building model placed on the island — how many placements, whether it can
 * be entered (indoor loot spots), its doors (authored or inferred) and its size. Prints JSON.
 */
import { readFileSync } from "node:fs";
import { modelDoors } from "@/lib/fps/br/doors";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { modelSpots } from "@/lib/fps/br/loot-spots";
import type { CollisionData } from "@/lib/fps/br/static-world";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";
const buf = (p: string) => {
  const f = readFileSync(p);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const meta = JSON.parse(readFileSync("public/fps/br/world.v1.json", "utf8")) as WorldMeta;
const collision = JSON.parse(
  readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"),
) as CollisionData;
const models = JSON.parse(readFileSync(`public${WORLD_ASSETS.models}`, "utf8")).models;
const hf = await decodeHeightfield(buf("public/fps/br/height.v1.hf"));
const cover = await decodeLandCover(buf("public/fps/br/landcover.v1.lc"));
const island = buildIsland(hf, cover, meta, collision);
const rows: Record<
  string,
  {
    n: number;
    pois: Record<string, number>;
    indoor: number;
    doors: number;
    authored: boolean;
    size: number[];
  }
> = {};
for (const l of island.layout) {
  const m = models[l.model];
  if (m?.class !== "building") continue;
  let r = rows[l.model];
  if (!r) {
    const boxes = collision.models[l.model] ?? [];
    let x0 = Infinity,
      x1 = -Infinity,
      z0 = Infinity,
      z1 = -Infinity,
      y1 = 0;
    for (const b of boxes) {
      x0 = Math.min(x0, b[0]!);
      z0 = Math.min(z0, b[2]!);
      x1 = Math.max(x1, b[3]!);
      z1 = Math.max(z1, b[5]!);
      y1 = Math.max(y1, b[4]!);
    }
    r = rows[l.model] = {
      n: 0,
      pois: {},
      indoor: modelSpots(collision, l.model, "indoor", 2.5, 60).length,
      doors: modelDoors(collision, l.model).length,
      authored: !!collision.entrances?.[l.model],
      size: [x1 - x0, z1 - z0, y1].map((v) => +v.toFixed(1)),
    };
  }
  r.n++;
  r.pois[l.poi ?? "?"] = (r.pois[l.poi ?? "?"] ?? 0) + 1;
}
const list = Object.entries(rows).sort((a, b) => b[1].n - a[1].n);
for (const [id, r] of list)
  console.log(
    [
      id.padEnd(26),
      String(r.n).padStart(4),
      `indoor ${String(r.indoor).padStart(3)}`,
      `doors ${r.doors}`,
      r.authored ? "authored" : "inferred",
      r.size.join("x"),
      Object.entries(r.pois)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([p, n]) => `${p}:${n}`)
        .join(" "),
    ].join("  "),
  );
