/**
 * Map audit: a full 100-seat match's server ticks (stepBrMatch) with the island's loot and
 * vehicles, as the room runs it, from the countdown to `extra` ticks after everyone landed:
 * mean and p99 tick time (with the human's snapshot built and serialised every other tick, as
 * the room publishes at 15 Hz), and the phase. Profile it with node --cpu-prof.
 *   node scripts/br/map-audit/run.mjs tick-bench [seed=1] [extra=1350] [zoneTimeScale=1]
 */
import { readFileSync } from "node:fs";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { rollLoot } from "@/lib/fps/br/loot";
import { splitCheckpoint } from "../../../workers/fps/br-checkpoint";
import {
  BrSeatSync,
  checkpointBrMatch,
  BrSight,
  brViewFor,
  brViewFrame,
  createBrMatch,
  seatHuman,
  stepBrMatch,
} from "@/lib/fps/br/match";
import { spawnVehicles } from "@/lib/fps/br/vehicles";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";
import { TICK_MS } from "@/lib/fps/simulation";

const buf = (p: string) => {
  const f = readFileSync(p);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const meta = JSON.parse(readFileSync(`public${WORLD_ASSETS.meta}`, "utf8")) as WorldMeta;
const col = JSON.parse(readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"));
const hf = await decodeHeightfield(buf(`public${WORLD_ASSETS.height}`));
const isl = buildIsland(
  hf,
  await decodeLandCover(buf(`public${WORLD_ASSETS.landcover}`)),
  meta,
  col,
);
const world = isl.solid;
const seed = Number(process.argv[2] ?? 1),
  extra = Number(process.argv[3] ?? 1350);
const loot = rollLoot(seed, isl.layout, col, world, meta);
const s = createBrMatch(meta, seed, (x, z) => hf.heightAt(x, z), loot, {
  vehicles: spawnVehicles(meta, world, seed, isl.layout),
  zoneTimeScale: Number(process.argv[4] ?? 1),
  open: (x, z) => !world.blocked(x, hf.heightAt(x, z) + 0.1, z, 1.8, 0.6),
});
const me = seatHuman(s, "h1", "Human");
const sight = new BrSight(),
  sync = new BrSeatSync();
let now = 0;
const times: number[] = [];
let after = 0;
for (let i = 0; i < 60_000 && after < extra; i++) {
  const t = performance.now();
  stepBrMatch(s, world, meta, new Map(), (now += TICK_MS), TICK_MS);
  if (i % 2 === 0) {
    JSON.stringify(brViewFor(s, world, sight, me, now, sync, brViewFrame(s)));
    s.loot.flush();
  }
  times.push(performance.now() - t);
  if (
    s.phase === "active" &&
    s.seats.every((x) => x.dead || x.body.phase === "ground" || x.body.phase === "swim")
  )
    after++;
}
// The room's checkpoint every 5 s (workers/fps/br.ts saveCheckpoint): its synchronous part, the
// rows built and split, and the structured clone a storage put makes of them.
const cp: number[] = [];
for (let k = 0; k < 10; k++) {
  const t = performance.now();
  const { data, chunks } = splitCheckpoint(checkpointBrMatch(s, true) as never);
  structuredClone({ data, chunks });
  cp.push(performance.now() - t);
}
cp.sort((a, b) => a - b);
(globalThis as { gc?: () => void }).gc?.();
console.log(`heap after the match ${(process.memoryUsage().heapUsed / 2 ** 20).toFixed(0)} MB`);
console.log(`checkpoint with loot: median ${cp[5]!.toFixed(1)} ms`);
const sorted = [...times].sort((a, b) => a - b);
const p = (q: number) => sorted[Math.floor(sorted.length * q)]!.toFixed(2);
console.log(
  `${loot.length} items, ${times.length} ticks, mean ${(times.reduce((a, b) => a + b, 0) / times.length).toFixed(2)} ms, p99 ${p(0.99)} ms, p99.9 ${p(0.999)} ms, phase ${s.phase}`,
);
