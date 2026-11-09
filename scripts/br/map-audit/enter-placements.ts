/**
 * Map audit: for every placed building that has rooms (indoor loot spots), can a player walk in
 * from outside at its actual island placement, doors open? Breadth-first search on a 0.5 m grid
 * (movement rules as access.ts) in a window around the building, from the window's edge, to its
 * indoor spots. Prints per model: placements, reachable, and the blocked ones' positions.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { withDoors } from "@/lib/fps/br/doors";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { modelSpots, turnPoint } from "@/lib/fps/br/loot-spots";
import { MAX_SLOPE } from "@/lib/fps/br/movement";
import type { CollisionData } from "@/lib/fps/br/static-world";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";
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
const world = withDoors(
  island.solid,
  island.doors,
  new Uint8Array(island.doors.doors.length).fill(1),
);
const C = Number(process.env.CELL ?? 0.5);
const only = process.argv[3]?.split(",");
function reach(
  cx: number,
  cz: number,
  half: number,
  targets: { x: number; y: number; z: number }[],
) {
  const n = Math.round((2 * half) / C),
    x0 = cx - half,
    z0 = cz - half;
  const seen = new Map<number, number[]>();
  const queue: number[] = [];
  const add = (i: number, j: number, y: number) => {
    const k = j * n + i,
      ys = seen.get(k);
    if (ys?.some((v) => Math.abs(v - y) < 0.3)) return;
    if (ys) ys.push(y);
    else seen.set(k, [y]);
    queue.push(i, j, y);
  };
  for (let t = 0; t < n; t += 2)
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
      if (Math.abs(y - here) < 0.05 && hf.heightAt(nx, nz) - here > C * MAX_SLOPE) continue;
      if (world.blocked(nx, ny + 1e-3, nz, EYE_HEIGHT + 0.2, PLAYER_RADIUS)) continue;
      add(ni, nj, ny);
    }
  }
  if (process.env.DBG) console.log("reached cells", seen.size, "of", n * n, "start", queue.length);
  return targets.filter((t) => {
    const i = Math.round((t.x - x0) / C),
      j = Math.round((t.z - z0) / C);
    if (process.env.DBG)
      console.log(
        "t",
        t,
        i,
        j,
        seen.get(j * n + i),
        [-1, 0, 1].map((d) => seen.get((j + d) * n + i)),
      );
    for (let dj = -1; dj <= 1; dj++)
      for (let di = -1; di <= 1; di++)
        if (seen.get((j + dj) * n + (i + di))?.some((v) => Math.abs(v - t.y) < 0.6)) return true;
    return false;
  }).length;
}
const rows: Record<string, { n: number; ok: number; blocked: number[][] }> = {};
for (const p of island.layout) {
  if (only && !only.includes(p.model)) continue;
  const spots = modelSpots(collision, p.model, "indoor", 2.5, 60);
  if (!spots.length) continue;
  const boxes = collision.models[p.model]!;
  const r = Math.max(
    ...boxes.map((b) =>
      Math.max(Math.abs(b[0]!), Math.abs(b[3]!), Math.abs(b[2]!), Math.abs(b[5]!)),
    ),
  );
  const targets = spots.slice(0, 6).map((s) => {
    const [x, z] = turnPoint(s.x, s.z, p.turn);
    return { x: p.x + x, y: p.y + s.y, z: p.z + z };
  });
  const got = reach(p.x, p.z, Math.min(r + 12, 60), targets);
  const row = (rows[p.model] ??= { n: 0, ok: 0, blocked: [] });
  row.n++;
  if (got > 0) row.ok++;
  else row.blocked.push([Math.round(p.x), Math.round(p.z), p.turn, p.poi as unknown as number]);
}
for (const [m, r] of Object.entries(rows).sort((a, b) => b[1].n - a[1].n))
  console.log(
    m.padEnd(22),
    `${r.ok}/${r.n} enterable`,
    r.blocked.length ? JSON.stringify(r.blocked.slice(0, 6)) : "",
  );
writeFileSync(process.argv[2] ?? "/dev/null", JSON.stringify(rows));
