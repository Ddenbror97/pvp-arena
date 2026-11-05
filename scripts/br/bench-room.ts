/**
 * Battle Royale server-cost benchmark (Phase 0): one room's per-tick CPU for 100 participants on
 * the real Project Island heightfield, to decide whether one Durable Object can run a match.
 *
 *   npx tsx scripts/br/bench-room.ts [players=100] [seconds=20]
 *
 * Models the expensive parts of a real room (not the full game rules):
 *  - movement on the terrain at 30 Hz (ground sampling, gravity, slope limit);
 *  - bots steering toward goals and the zone, choosing targets from a spatial grid;
 *  - shots: terrain raycasts up to 800 m plus a player hit test from the grid (~40 shots/s);
 *  - per-recipient snapshots at 20 Hz with interest management: everyone within 300 m, plus
 *    players within 1000 m that pass a terrain line-of-sight check, serialised to JSON.
 */
import { readFileSync } from "node:fs";
import { decodeHeightfield } from "../../src/lib/fps/br/heightfield";
import { WORLD_HALF } from "../../src/lib/fps/br/world";

const players = Number(process.argv[2] ?? 100);
const seconds = Number(process.argv[3] ?? 20);
const TICK_MS = 1000 / 30,
  SNAPSHOT_EVERY = 1.5; // 30 Hz ticks, 20 Hz snapshots
const NEAR = 300,
  FAR = 1000,
  CELL = 250;

const file = readFileSync("public/fps/br/height.v1.hf");
const hf = await decodeHeightfield(
  file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength),
);

type P = {
  id: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  hp: number;
  gx: number;
  gz: number;
  vy: number;
};
let seed = 7;
const rand = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
// Spread everyone over land like after a drop: clusters around a few hot spots.
const spots = [
  [-2800, -3500],
  [-1800, -1700],
  [-100, -1300],
  [1700, -1400],
  [2000, 500],
  [800, 2500],
  [-200, 3800],
  [3000, 3700],
  [-3000, 1500],
];
const ps: P[] = [];
for (let i = 0; i < players; i++) {
  const s = spots[i % spots.length]!;
  let x = 0,
    z = 0;
  for (let k = 0; k < 20; k++) {
    x = s[0]! + (rand() - 0.5) * 900;
    z = s[1]! + (rand() - 0.5) * 900;
    if (hf.heightAt(x, z) > 1) break;
  }
  ps.push({
    id: i,
    x,
    y: hf.heightAt(x, z),
    z,
    yaw: rand() * 6.28,
    hp: 100,
    gx: x + (rand() - 0.5) * 2000,
    gz: z + (rand() - 0.5) * 2000,
    vy: 0,
  });
}
const grid = new Map<number, P[]>();
const key = (x: number, z: number) =>
  Math.floor((x + WORLD_HALF) / CELL) * 1000 + Math.floor((z + WORLD_HALF) / CELL);
function rebuildGrid() {
  grid.clear();
  for (const p of ps) {
    if (p.hp <= 0) continue;
    const k = key(p.x, p.z);
    let list = grid.get(k);
    if (!list) grid.set(k, (list = []));
    list.push(p);
  }
}
function near(x: number, z: number, r: number, out: P[]) {
  out.length = 0;
  const c = Math.ceil(r / CELL);
  const cx = Math.floor((x + WORLD_HALF) / CELL),
    cz = Math.floor((z + WORLD_HALF) / CELL);
  for (let i = cx - c; i <= cx + c; i++)
    for (let j = cz - c; j <= cz + c; j++) {
      const list = grid.get(i * 1000 + j);
      if (list) for (const p of list) if (Math.hypot(p.x - x, p.z - z) <= r) out.push(p);
    }
  return out;
}

const scratch: P[] = [];
let shots = 0,
  losChecks = 0,
  bytes = 0,
  snapshots = 0;
const tickTimes: number[] = [];
const total = Math.round((seconds * 1000) / TICK_MS);
let snapAccumulator = 0;
for (let t = 0; t < total; t++) {
  const a = performance.now();
  // Movement + bot steering.
  for (const p of ps) {
    if (p.hp <= 0) continue;
    const dx = p.gx - p.x,
      dz = p.gz - p.z,
      d = Math.hypot(dx, dz);
    if (d < 5) {
      p.gx = p.x + (rand() - 0.5) * 2000;
      p.gz = p.z + (rand() - 0.5) * 2000;
      continue;
    }
    const step = (5 * TICK_MS) / 1000;
    const nx = p.x + (dx / d) * step,
      nz = p.z + (dz / d) * step;
    const ground = hf.heightAt(nx, nz);
    if (ground < 0.2 || ground - hf.heightAt(p.x, p.z) > step * 1.2) {
      p.gx = p.x - dx;
      p.gz = p.z - dz;
      continue;
    }
    p.x = nx;
    p.z = nz;
    p.vy -= (9.8 * TICK_MS) / 1000;
    p.y = Math.max(ground, p.y + (p.vy * TICK_MS) / 1000);
    if (p.y === ground) p.vy = 0;
    p.yaw = Math.atan2(-dx, -dz);
  }
  rebuildGrid();
  // Shots: ~40/s across the room, each a terrain raycast and a grid hit test.
  const shotsThisTick = Math.round((40 * TICK_MS) / 1000 + (rand() < 0.33 ? 1 : 0));
  for (let s = 0; s < shotsThisTick; s++) {
    const shooter = ps[Math.floor(rand() * ps.length)]!;
    const targets = near(shooter.x, shooter.z, 800, scratch);
    const target = targets[Math.floor(rand() * targets.length)];
    if (!target || target === shooter) continue;
    const dx = target.x - shooter.x,
      dy = target.y + 1.2 - (shooter.y + 1.6),
      dz = target.z - shooter.z;
    const dist = Math.hypot(dx, dy, dz);
    hf.raycast(shooter.x, shooter.y + 1.6, shooter.z, dx, dy, dz, dist);
    shots++;
  }
  // Snapshots at 20 Hz: per recipient, interest-managed.
  snapAccumulator += 1;
  if (snapAccumulator >= SNAPSHOT_EVERY) {
    snapAccumulator -= SNAPSHOT_EVERY;
    for (const r of ps) {
      const visible: Array<[number, number, number, number, number]> = [];
      for (const o of near(r.x, r.z, FAR, scratch)) {
        if (o === r) continue;
        const d = Math.hypot(o.x - r.x, o.z - r.z);
        if (d > NEAR) {
          losChecks++;
          const dx = o.x - r.x,
            dy = o.y + 1.6 - (r.y + 1.6),
            dz = o.z - r.z;
          if (hf.raycast(r.x, r.y + 1.6, r.z, dx, dy, dz, Math.hypot(dx, dy, dz))) continue;
        }
        visible.push([
          o.id,
          Math.round(o.x * 10),
          Math.round(o.y * 10),
          Math.round(o.z * 10),
          Math.round(o.yaw * 100),
        ]);
      }
      const json = JSON.stringify({ t, you: [r.x, r.y, r.z, r.hp], players: visible });
      bytes += json.length;
      snapshots++;
    }
  }
  tickTimes.push(performance.now() - a);
}
tickTimes.sort((x, y) => x - y);
const pct = (q: number) => tickTimes[Math.floor((tickTimes.length - 1) * q)]!.toFixed(2);
const mean = tickTimes.reduce((s, v) => s + v, 0) / tickTimes.length;
console.log(
  JSON.stringify({
    players,
    ticks: tickTimes.length,
    msPerTick: {
      mean: +mean.toFixed(2),
      p50: +pct(0.5),
      p95: +pct(0.95),
      p99: +pct(0.99),
      max: +pct(1),
    },
    cpuShareOf30Hz: +(mean / TICK_MS).toFixed(3),
    shotsPerSecond: +(shots / seconds).toFixed(1),
    losChecksPerSecond: +(losChecks / seconds).toFixed(0),
    snapshotKBpsPerPlayer: +(bytes / seconds / players / 1024).toFixed(2),
    snapshotsPerSecond: +(snapshots / seconds).toFixed(0),
  }),
);
