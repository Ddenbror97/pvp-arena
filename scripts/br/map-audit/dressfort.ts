/**
 * Map audit: the Old Fortress's dressing (layout.ts oldFortress) against its buildings.
 *   node scripts/br/map-audit/run.mjs dressfort
 * For every placement at the fortress that is not one of its buildings: does it stand on
 * something (its footprint's middle and corners supported at its height, for models that stand)
 * and is it clear of the buildings' collision (its box, a little inside its outline, against the
 * fortress's boxes)? Hung things (chandeliers, shields, banners, the bell) are checked for
 * clearance only; torches by tests/br-torch-flames.test.ts.
 */
import { readFileSync } from "node:fs";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { StaticWorld, type CollisionData } from "@/lib/fps/br/static-world";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";

const buf = (p: string) => {
  const f = readFileSync(p);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const meta = JSON.parse(readFileSync(`public${WORLD_ASSETS.meta}`, "utf8")) as WorldMeta;
const collision = JSON.parse(readFileSync(`public${WORLD_ASSETS.collision}`, "utf8")) as CollisionData;
const manifest = JSON.parse(readFileSync(`public${WORLD_ASSETS.models}`, "utf8")) as {
  models: Record<string, { size: number[] }>;
};
const hf = await decodeHeightfield(buf(`public${WORLD_ASSETS.height}`));
const cover = await decodeLandCover(buf(`public${WORLD_ASSETS.landcover}`));
const island = buildIsland(hf, cover, meta, collision);
const poi = meta.pois.find((p) => p.id === "old-fortress")!;
const here = island.layout.filter((p) => p.poi === poi.id);
const parts = here.filter((p) => p.model.startsWith("fort-"));
const world = new StaticWorld(hf, parts, collision, null);
const HUNG = /chandelier|shield|banner|bell|gargoyle|torch|flag/;
let bad = 0;
const f = (v: number) => v.toFixed(2);
for (const p of here) {
  if (p.model.startsWith("fort-") || p.model.startsWith("torch-")) continue;
  const s = manifest.models[p.model]!.size;
  const [w, d] = p.turn % 2 ? [s[2]!, s[0]!] : [s[0]!, s[2]!];
  const h = s[1]!;
  const issues: string[] = [];
  if (!HUNG.test(p.model)) {
    const pts = [
      [0, 0],
      [-w / 2 + 0.1, -d / 2 + 0.1],
      [w / 2 - 0.1, -d / 2 + 0.1],
      [-w / 2 + 0.1, d / 2 - 0.1],
      [w / 2 - 0.1, d / 2 - 0.1],
    ];
    const low = pts.filter(([a, b]) => {
      const g = Math.max(world.supportAt(p.x + a!, p.z + b!, 0.05, p.y + 0.1), hf.heightAt(p.x + a!, p.z + b!));
      return p.y - g > 0.08;
    }).length;
    if (low > 1) issues.push(`${low}/5 points unsupported`);
  }
  // Clear of the buildings: sample the box 0.1 m inside its outline.
  let hit = 0,
    n = 0,
    ex = "";
  for (let a = -w / 2 + 0.1; a <= w / 2 - 0.1 + 1e-6; a += Math.max(0.1, (w - 0.2) / 4))
    for (let b = -d / 2 + 0.1; b <= d / 2 - 0.1 + 1e-6; b += Math.max(0.1, (d - 0.2) / 4)) {
      n++;
      if (world.blocked(p.x + a, p.y + 0.12, p.z + b, Math.max(0.05, h - 0.24), 0.04)) {
        hit++;
        ex ||= `${f(p.x + a - poi.x)},${f(p.z + b - poi.z)}`;
      }
    }
  if (hit) issues.push(`${hit}/${n} samples inside walls (e.g. ${ex})`);
  if (issues.length) {
    bad++;
    console.log(
      `${p.model} at ${f(p.x - poi.x)}, ${f(p.y - poi.padHeight!)}, ${f(p.z - poi.z)} t${p.turn}: ${issues.join("; ")}`,
    );
  }
}
console.log(`${here.length} placements, ${parts.length} buildings; ${bad} with issues`);
