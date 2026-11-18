/**
 * Map audit: flat ground markings (lot lines, pitch and yard lines) against the ground under
 * them (debug): how far the ground rises over (buries) or falls under (floats) the marking.
 *   node scripts/br/map-audit/run.mjs decals
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
  models: Record<string, { size: number[] }>;
};
const hf = await decodeHeightfield(buf(`public${WORLD_ASSETS.height}`));
const island = buildIsland(
  hf,
  await decodeLandCover(buf(`public${WORLD_ASSETS.landcover}`)),
  meta,
  collision,
);
for (const p of island.layout) {
  if (!/lot-lines|pitch-lines|yard-lines/.test(p.model)) continue;
  const s = manifest.models[p.model]!.size;
  const [w, d] = p.turn % 2 ? [s[2]!, s[0]!] : [s[0]!, s[2]!];
  let up = -Infinity,
    down = Infinity;
  for (let a = -w / 2; a <= w / 2 + 1e-6; a += w / 8)
    for (let b = -d / 2; b <= d / 2 + 1e-6; b += d / 4) {
      const g = hf.heightAt(p.x + a, p.z + b) - p.y;
      up = Math.max(up, g);
      down = Math.min(down, g);
    }
  if (up > 0.03 || down < -0.05)
    console.log(
      `${p.model} ${p.poi} ${p.x.toFixed(0)},${p.z.toFixed(0)}: ground ${down.toFixed(2)}..${up.toFixed(2)} m from it`,
    );
}
