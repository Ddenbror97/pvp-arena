import { WORLD_ASSETS } from "@/lib/fps/br/world";
/**
 * Map audit: what stops a player at given points (argv: out.json, then "x,z,tx,tz" …):
 * terrain slope ahead, boxes (with the model they belong to) and tree trunks around the hull.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { MAX_SLOPE } from "@/lib/fps/br/movement";
import { turnBox, type CollisionData } from "@/lib/fps/br/static-world";
import { forEachTrunkNear } from "@/lib/fps/br/vegetation";
import type { WorldMeta } from "@/lib/fps/br/world";
import { EYE_HEIGHT, PLAYER_RADIUS, STEP_HEIGHT } from "@/lib/fps/map";

const buf = (p: string) => {
  const f = readFileSync(p);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const meta = JSON.parse(readFileSync("public/fps/br/world.v1.json", "utf8")) as WorldMeta;
const collision = JSON.parse(
  readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"),
) as CollisionData;
const hf = await decodeHeightfield(buf("public/fps/br/height.v1.hf"));
const cover = await decodeLandCover(buf("public/fps/br/landcover.v1.lc"));
const island = buildIsland(hf, cover, meta, collision);
const world = island.solid;
// Box index → owner (placement model, or "extra" for bridge/dam boxes).
const owner: string[] = [];
for (const p of island.layout)
  for (const _ of collision.models[p.model] ?? []) owner.push(`${p.model}@${p.poi}`);
void turnBox;
const out: unknown[] = [];
for (const arg of process.argv.slice(3)) {
  const [x, z, tx, tz] = arg.split(",").map(Number) as [number, number, number, number];
  const len = Math.hypot(tx - x, tz - z);
  const ux = (tx - x) / len,
    uz = (tz - z) / len;
  const y = world.supportAt(x, z, PLAYER_RADIUS, hf.heightAt(x, z) + 30);
  const terrain: number[] = [];
  for (let d = 0; d <= 10; d += 1) terrain.push(+hf.heightAt(x + ux * d, z + uz * d).toFixed(2));
  const ahead = [0.25, 0.5, 1, 2].map((d) => {
    const nx = x + ux * d,
      nz = z + uz * d;
    const sup = world.supportAt(nx, nz, PLAYER_RADIUS, y + STEP_HEIGHT);
    const boxes: string[] = [];
    world.forEachBox(nx - 0.5, nz - 0.5, nx + 0.5, nz + 0.5, (i) => {
      const o = i * 6,
        b = world.boxes;
      if (
        nx + PLAYER_RADIUS > b[o]! &&
        nx - PLAYER_RADIUS < b[o + 3]! &&
        nz + PLAYER_RADIUS > b[o + 2]! &&
        nz - PLAYER_RADIUS < b[o + 5]! &&
        sup + EYE_HEIGHT + 0.2 > b[o + 1]! &&
        sup < b[o + 4]!
      )
        boxes.push(
          `${owner[i] ?? "extra(bridge/dam)"} y ${b[o + 1]!.toFixed(1)}..${b[o + 4]!.toFixed(1)} x ${b[o]!.toFixed(1)}..${b[o + 3]!.toFixed(1)} z ${b[o + 2]!.toFixed(1)}..${b[o + 5]!.toFixed(1)}`,
        );
    });
    const trunks: string[] = [];
    if (world.vegetation)
      forEachTrunkNear(world.vegetation, nx, nz, PLAYER_RADIUS + 1, (ttx, ttz, r) => {
        if (Math.hypot(ttx - nx, ttz - nz) < r + PLAYER_RADIUS)
          trunks.push(`trunk r${r.toFixed(2)}`);
      });
    return {
      d,
      support: +sup.toFixed(2),
      terrainRiseVsMax: +((hf.heightAt(nx, nz) - hf.heightAt(x, z)) / d).toFixed(2),
      blocked: world.blocked(nx, sup + 1e-4, nz, EYE_HEIGHT + 0.2, PLAYER_RADIUS),
      boxes,
      trunks,
    };
  });
  out.push({ at: [x, z], y: +y.toFixed(2), toward: [tx, tz], maxSlope: MAX_SLOPE, terrain, ahead });
}
writeFileSync(process.argv[2]!, JSON.stringify(out, null, 1));
console.log("ok");
