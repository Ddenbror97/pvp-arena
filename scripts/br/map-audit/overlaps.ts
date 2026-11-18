/**
 * Map audit: placements of one POI whose boxes overlap (debug): pairs of models (not plants)
 * whose footprints overlap and whose heights meet, with the overlap's size. Two models laid
 * through each other show each other's faces where they cross, and any faces they share in a
 * plane fight (flicker).
 *   node scripts/br/map-audit/run.mjs overlaps <poi> [min overlap m = 0.1]
 */
import { readFileSync } from "node:fs";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import type { CollisionData } from "@/lib/fps/br/static-world";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";
const buf = (p: string) => {
  const f = readFileSync(p);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const meta = JSON.parse(readFileSync(`public${WORLD_ASSETS.meta}`, "utf8")) as WorldMeta;
const collision = JSON.parse(
  readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"),
) as CollisionData;
const manifest = JSON.parse(readFileSync(`public${WORLD_ASSETS.models}`, "utf8")) as {
  models: Record<string, { size: number[]; class: string; ring?: string }>;
};
const hf = await decodeHeightfield(buf(`public${WORLD_ASSETS.height}`));
const island = buildIsland(
  hf,
  await decodeLandCover(buf(`public${WORLD_ASSETS.landcover}`)),
  meta,
  collision,
);
const [poiId, minArg] = process.argv.slice(2);
const min = Number(minArg ?? 0.1);
const here = island.layout.filter((p) => {
  const m = manifest.models[p.model];
  return (
    p.poi === poiId &&
    m &&
    !/tree|bush/.test(m.class) &&
    m.ring !== "undergrowth" &&
    !p.model.startsWith("torch")
  );
});
const box = (p: (typeof here)[number]) => {
  const s = manifest.models[p.model]!.size;
  const [w, d] = p.turn % 2 ? [s[2]!, s[0]!] : [s[0]!, s[2]!];
  return [p.x - w / 2, p.y, p.z - d / 2, p.x + w / 2, p.y + s[1]!, p.z + d / 2];
};
const boxes = here.map(box);
let n = 0;
for (let i = 0; i < here.length; i++)
  for (let j = i + 1; j < here.length; j++) {
    const a = boxes[i]!,
      b = boxes[j]!;
    const ox = Math.min(a[3]!, b[3]!) - Math.max(a[0]!, b[0]!),
      oy = Math.min(a[4]!, b[4]!) - Math.max(a[1]!, b[1]!),
      oz = Math.min(a[5]!, b[5]!) - Math.max(a[2]!, b[2]!);
    if (ox > min && oy > min && oz > min) {
      n++;
      const p = here[i]!,
        q = here[j]!;
      console.log(
        `${p.model}@${p.x.toFixed(1)},${p.y.toFixed(2)},${p.z.toFixed(1)} × ${q.model}@${q.x.toFixed(1)},${q.y.toFixed(2)},${q.z.toFixed(1)}: ${ox.toFixed(1)} × ${oy.toFixed(1)} × ${oz.toFixed(1)}`,
      );
    }
  }
console.log(`${n} overlapping pairs of ${here.length} placements`);
