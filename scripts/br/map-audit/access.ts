/**
 * Map audit: can a player walk from outside a site to a point inside it? Breadth-first search on
 * a 0.5 m grid with the movement rules (step 0.35 m, MAX_SLOPE on terrain, no jumping, any drop,
 * the real hull), in a square window around the site; thin walls cannot be skipped at this
 * spacing. Targets: the loot items nearest each site's centre (they lie inside its buildings and
 * yards). Writes argv[2].
 */
import { readFileSync, writeFileSync } from "node:fs";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { rollLoot } from "@/lib/fps/br/loot";
import { MAX_SLOPE } from "@/lib/fps/br/movement";
import type { CollisionData } from "@/lib/fps/br/static-world";
import type { WorldMeta } from "@/lib/fps/br/world";
import { EYE_HEIGHT, PLAYER_RADIUS, STEP_HEIGHT } from "@/lib/fps/map";

const buf = (p: string) => {
  const f = readFileSync(p);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const meta = JSON.parse(readFileSync("public/fps/br/world.v1.json", "utf8")) as WorldMeta;
const collision = JSON.parse(
  readFileSync("public/fps/br/models/collision.json", "utf8"),
) as CollisionData;
const hf = await decodeHeightfield(buf("public/fps/br/height.v1.hf"));
const cover = await decodeLandCover(buf("public/fps/br/landcover.v1.lc"));
const island = buildIsland(hf, cover, meta, collision);
const world = island.solid;
const loot = rollLoot(1, island.layout, collision, world, meta);
const C = 0.5;

function access(
  cx: number,
  cz: number,
  half: number,
  targets: { x: number; y: number; z: number }[],
) {
  const n = Math.round((2 * half) / C);
  const x0 = cx - half,
    z0 = cz - half;
  const seen = new Map<number, number[]>();
  const queue: number[] = [];
  const add = (i: number, j: number, y: number) => {
    const k = j * n + i;
    const ys = seen.get(k);
    if (ys?.some((v) => Math.abs(v - y) < 0.3)) return;
    if (ys) ys.push(y);
    else seen.set(k, [y]);
    queue.push(i, j, y);
  };
  // Start: every open terrain cell on the window's border.
  for (let t = 0; t < n; t += 4)
    for (const [i, j] of [
      [t, 0],
      [t, n - 1],
      [0, t],
      [n - 1, t],
    ] as const) {
      const x = x0 + i * C,
        z = z0 + j * C;
      const y = world.supportAt(x, z, PLAYER_RADIUS, hf.heightAt(x, z) + 0.05);
      if (!world.blocked(x, y + 1e-3, z, EYE_HEIGHT + 0.2, PLAYER_RADIUS)) add(i, j, y);
    }
  let head = 0;
  while (head < queue.length) {
    const i = queue[head]!,
      j = queue[head + 1]!,
      y = queue[head + 2]!;
    head += 3;
    const x = x0 + i * C,
      z = z0 + j * C;
    for (const [di, dj] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const ni = i + di,
        nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= n || nj >= n) continue;
      const nx = x0 + ni * C,
        nz = z0 + nj * C;
      const ny = world.supportAt(nx, nz, PLAYER_RADIUS, y + STEP_HEIGHT);
      const here = hf.heightAt(x, z);
      const rise = hf.heightAt(nx, nz) - here;
      if (Math.abs(y - here) < 0.05 && rise > C * MAX_SLOPE) continue;
      if (world.blocked(nx, ny + 1e-3, nz, EYE_HEIGHT + 0.2, PLAYER_RADIUS)) continue;
      add(ni, nj, ny);
    }
  }
  return targets.map((t) => {
    const i = Math.round((t.x - x0) / C),
      j = Math.round((t.z - z0) / C);
    let ok = false;
    for (let dj = -2; dj <= 2 && !ok; dj++)
      for (let di = -2; di <= 2 && !ok; di++)
        if (seen.get((j + dj) * n + (i + di))?.some((v) => Math.abs(v - t.y) < 0.6)) ok = true;
    const indoor = world.blocked(t.x, t.y + 2.2, t.z, 10, 0.05);
    return { at: [Math.round(t.x), Math.round(t.y * 10) / 10, Math.round(t.z)], indoor, ok };
  });
}
const sites = [
  "blackwater-prison",
  "southern-military-base",
  "island-superstore",
  "central-hospital",
  "northstar-town",
  "redstone-quarry",
];
const out: Record<string, unknown> = {};
for (const id of sites) {
  const p = meta.pois.find((q) => q.id === id)!;
  const near = loot
    .filter((it) => Math.hypot(it.x - p.x, it.z - p.z) < Math.min(p.radius, 300))
    .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))
    .slice(0, 25);
  const res = access(p.x, p.z, Math.min(p.radius, 300) + 60, near);
  out[id] = {
    checked: res.length,
    reachable: res.filter((r) => r.ok).length,
    indoorChecked: res.filter((r) => r.indoor).length,
    indoorReachable: res.filter((r) => r.indoor && r.ok).length,
    unreachable: res.filter((r) => !r.ok),
  };
  console.log(id, JSON.stringify(out[id]));
}
writeFileSync(process.argv[2]!, JSON.stringify(out, null, 1));
