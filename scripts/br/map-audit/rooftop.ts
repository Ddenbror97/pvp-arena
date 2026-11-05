/**
 * Map audit: can a player walk from the street onto the roof of the apartment blocks (through
 * the door, up the stairs)? Breadth-first search on a 0.25 m grid with the movement rules, doors
 * open, in a window around one block. Prints the highest level reached and whether the roof is.
 */
import { readFileSync } from "node:fs";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { EYE_HEIGHT, PLAYER_RADIUS, STEP_HEIGHT } from "@/lib/fps/map";
const buf = (p: string) => {
  const f = readFileSync(p);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const meta = JSON.parse(readFileSync("public/fps/br/world.v1.json", "utf8"));
const collision = JSON.parse(readFileSync("public/fps/br/models/collision.json", "utf8"));
const hf = await decodeHeightfield(buf("public/fps/br/height.v1.hf"));
const cover = await decodeLandCover(buf("public/fps/br/landcover.v1.lc"));
const island = buildIsland(hf, cover, meta, collision);
const world = island.solid;
const models = JSON.parse(readFileSync("public/fps/br/models/models.json", "utf8")).models;
const a = island.layout.find((l) => l.model === (process.argv[2] ?? "apartment"))!;
const roof = a.y + Number(process.argv[3] ?? 4) * 3.2;
const C = 0.25,
  half = 22,
  n = Math.round((2 * half) / C);
const x0 = a.x - half,
  z0 = a.z - half;
const seen = new Map<number, number[]>();
const q: number[] = [];
const add = (i: number, j: number, y: number) => {
  const k = j * n + i;
  const ys = seen.get(k);
  if (ys?.some((v) => Math.abs(v - y) < 0.15)) return;
  (ys ?? seen.set(k, []).get(k)!).push(y);
  q.push(i, j, y);
};
for (let t = 0; t < n; t += 2) add(t, 0, world.supportAt(x0 + t * C, z0, PLAYER_RADIUS, a.y + 0.5));
let best = -Infinity;
while (q.length) {
  const y = q.pop()!,
    j = q.pop()!,
    i = q.pop()!;
  best = Math.max(best, y);
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
    if (world.blocked(nx, ny + 1e-3, nz, EYE_HEIGHT + 0.2, PLAYER_RADIUS)) continue;
    add(ni, nj, ny);
  }
}
console.log(
  a.model,
  `size ${models[a.model].size.join("×")}`,
  `highest floor reached ${(best - a.y).toFixed(2)} m, roof at ${(roof - a.y).toFixed(2)} m:`,
  best >= roof - 0.05 ? "ROOF REACHED" : "no roof",
);
