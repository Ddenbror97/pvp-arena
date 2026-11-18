/**
 * Map audit: which floors of the Old Fortress a player can walk to (debug).
 *   node scripts/br/map-audit/run.mjs floodfort [cell = 0.25]
 * Floods out from the courtyard and the ground outside over every cell joined by a step (up or
 * down at most STEP_HEIGHT, the standing hull clear), on the procedural collision boxes and flat
 * ground at the ledge's level, as walkfort does. Then lists every standable surface inside the
 * fortress that the flood did not reach, grouped by height, with a sample point: a floor, a
 * tower storey or a tunnel that nothing leads to.
 */
import { readFileSync } from "node:fs";
import type { Heightfield } from "@/lib/fps/br/heightfield";
import type { Placement } from "@/lib/fps/br/layout";
import { FORTRESS } from "@/lib/fps/br/fortress-plan";
import { STEP_HEIGHT } from "@/lib/fps/map";
import { StaticWorld, type CollisionData } from "@/lib/fps/br/static-world";

const models: Record<string, number[][]> = {};
for (const [m] of FORTRESS)
  models[m] ??= JSON.parse(readFileSync(`art/br/procedural/${m}.boxes.json`, "utf8"));
const world = new StaticWorld(
  { heightAt: () => 0, raycast: () => null } as unknown as Heightfield,
  FORTRESS.map(([model, x, y, z, turn]) => ({ model, x, y, z, turn, poi: "t" }) as Placement),
  { voxel: 0.1, models } as CollisionData,
  null,
);
const C = Number(process.argv[2] ?? 0.25);
const R = 0.35,
  H = 1.8;
const LO = -104,
  HI = 104,
  N = Math.round((HI - LO) / C);
const at = (i: number) => LO + (i + 0.5) * C;
const seen = new Map<number, Set<number>>(); // cell → reached heights (cm)
const key = (i: number, j: number) => i * N + j;
const q: Array<[number, number, number]> = [];
const visit = (i: number, j: number, y: number) => {
  const k = key(i, j),
    cm = Math.round(y * 100);
  let s = seen.get(k);
  if (!s) seen.set(k, (s = new Set()));
  for (const v of s) if (Math.abs(v - cm) <= 3) return;
  s.add(cm);
  q.push([i, j, y]);
};
const cell = (v: number) => Math.floor((v - LO) / C);
for (const [x, z, y] of [
  [0, -20, 10.5],
  [0, -104 + C, 0.5],
  [-30, 30, 10.5],
] as const) {
  const s = world.supportAt(x, z, R, y);
  visit(cell(x), cell(z), s);
}
let head = 0;
while (head < q.length) {
  const [i, j, y] = q[head++]!;
  for (const [di, dj] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    const ni = i + di!,
      nj = j + dj!;
    if (ni < 0 || nj < 0 || ni >= N || nj >= N) continue;
    const x = at(ni),
      z = at(nj);
    const s = world.supportAt(x, z, R, y + STEP_HEIGHT);
    if (y - s > STEP_HEIGHT) continue;
    if (world.blocked(x, s + 0.01, z, H, R)) continue;
    // The hull between the cells (a thin wall on the cell edge).
    if (world.blocked((x + at(i)) / 2, Math.max(s, y) + 0.01, (z + at(j)) / 2, H, R)) continue;
    visit(ni, nj, s);
  }
}
console.log(`reached ${q.length} cell levels`);
// Standable surfaces inside the walls' outline (and the bridge, scaffold) not reached.
const miss = new Map<string, { n: number; x: number; z: number; y: number }>();
const S = Math.max(1, Math.round(0.5 / C));
for (let i = 0; i < N; i += S)
  for (let j = 0; j < N; j += S) {
    const x = at(i),
      z = at(j);
    if (Math.abs(x) > 96 || Math.abs(z) > 96) continue;
    let top = 40;
    for (let n = 0; n < 12; n++) {
      const s = world.supportAt(x, z, R, top);
      if (s <= 0.001) break;
      const flat = [
        [0, 0],
        [0.3, 0],
        [-0.3, 0],
        [0, 0.3],
        [0, -0.3],
      ].every(([a, b]) => Math.abs(world.supportAt(x + a!, z + b!, 0.05, s + 0.05) - s) < 0.03);
      if (flat && !world.blocked(x, s + 0.01, z, H, R)) {
        const got = [...(seen.get(key(i, j)) ?? [])].some((v) => Math.abs(v - s * 100) <= 3);
        if (!got) {
          const band = Math.round(s * 2) / 2;
          const k = `${band}|${Math.floor(x / 12)}|${Math.floor(z / 12)}`;
          const m = miss.get(k) ?? { n: 0, x, z, y: s };
          m.n++;
          miss.set(k, m);
        }
      }
      top = s - H - 0.05;
      if (top < 0) break;
    }
  }
for (const m of [...miss.values()].filter((m) => m.n >= 3).sort((a, b) => a.y - b.y || a.x - b.x))
  console.log(
    `unreached y ${m.y.toFixed(2)}: ${m.n} cells (0.5 m), e.g. ${m.x.toFixed(1)}, ${m.z.toFixed(1)}`,
  );
