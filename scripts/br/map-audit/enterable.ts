import { WORLD_ASSETS } from "@/lib/fps/br/world";
/**
 * Map audit: per town, how many buildings can be entered (indoor loot spots in the model's
 * collision) and how much loot lies indoors. Writes nothing; prints a table.
 */
import { readFileSync } from "node:fs";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { rollLoot } from "@/lib/fps/br/loot";
import { modelSpots } from "@/lib/fps/br/loot-spots";
import type { CollisionData } from "@/lib/fps/br/static-world";
import type { WorldMeta } from "@/lib/fps/br/world";
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
const loot = rollLoot(1, island.layout, collision, island.solid, meta);
const indoorSpots = (m: string) => modelSpots(collision, m, "indoor", 2.5, 60).length;
const towns = (process.argv[2] ?? "northstar-town,millhaven,crossroads,riverwood").split(",");
const perModel: Record<string, number> = {};
for (const id of towns) {
  const mine = island.layout.filter((l) => l.poi === id && models[l.model]?.class === "building");
  const enter = mine.filter((l) => indoorSpots(l.model) > 0);
  for (const l of mine) perModel[l.model] = indoorSpots(l.model);
  const p = meta.pois.find((q) => q.id === id)!;
  const here = loot.filter((it) => mine.some((l) => Math.hypot(it.x - l.x, it.z - l.z) < 15));
  const indoor = here.filter((it) => island.solid.blocked(it.x, it.y + 2.2, it.z, 10, 0.05));
  console.log(
    id,
    `buildings ${mine.length}, enterable ${enter.length}, loot near buildings ${here.length}, indoors ${indoor.length}`,
    p.name,
  );
}
console.log("indoor spots per model", JSON.stringify(perModel));
