/**
 * Map audit, step 3: navigation on a 4 m grid built from the server's collision and movement
 * rules (highest support per cell from StaticWorld, MAX_SLOPE on terrain, STEP_HEIGHT on boxes,
 * swimming where the water is deeper than the wading depth), Dijkstra travel times at sprint
 * speed (swimming at swim speed), land-only reachability, and replays of found paths with the
 * real movement code (stepDrop) to confirm the grid agrees with the game.
 *
 *   node scripts/br/map-audit/run.mjs nav <out.json>
 */
import { readFileSync, writeFileSync } from "node:fs";
import { DROP, newDropBody, planeRoute, stepDrop, waterSurface } from "@/lib/fps/br/drop";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { MAX_SLOPE } from "@/lib/fps/br/movement";
import type { CollisionData } from "@/lib/fps/br/static-world";
import { WORLD_HALF, type WorldMeta } from "@/lib/fps/br/world";
import { EYE_HEIGHT, PLAYER_RADIUS, STEP_HEIGHT } from "@/lib/fps/map";
import { MOVE_SPEED, TICK_MS } from "@/lib/fps/simulation";

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
const COLS = "ABCDEFGHIJ";
const ref = (x: number, z: number) =>
  `${COLS[Math.floor((x + WORLD_HALF) / 1000)] ?? "?"}${Math.floor((z + WORLD_HALF) / 1000) + 1}`;
const r1 = (v: number) => Math.round(v * 10) / 10;

const C = 4,
  N = 2500;
const cx = (i: number) => -WORLD_HALF + (i + 0.5) * C;
const surface = new Float32Array(N * N);
const onTerrain = new Uint8Array(N * N);
const swim = new Uint8Array(N * N);
const solid = new Uint8Array(N * N);
for (let j = 0; j < N; j++)
  for (let i = 0; i < N; i++) {
    const x = cx(i),
      z = cx(j),
      k = j * N + i;
    const g = hf.heightAt(x, z);
    // The surface a player stands on here: bridge decks and dam crests count; a building's roof
    // makes the cell a raised block (walls are cliffs a player cannot step up).
    const s = world.supportAt(x, z, PLAYER_RADIUS, g + 80);
    surface[k] = s;
    onTerrain[k] = s - g < 0.05 ? 1 : 0;
    const w = waterSurface(meta, s, x, z);
    if (w !== null && w - s > DROP.wadeDepth) {
      swim[k] = 1;
      surface[k] = w;
    }
    // Standing room: a box between the feet and the head (a low overhang, a wall edge).
    // (A step of up to STEP_HEIGHT under the feet is climbed, as the movement code does.)
    if (
      !swim[k] &&
      world.blocked(x, s + STEP_HEIGHT + 0.01, z, EYE_HEIGHT + 0.2 - STEP_HEIGHT, 0.6)
    )
      solid[k] = 1;
  }

const SPRINT = MOVE_SPEED * 1.5;
const dirs = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, Math.SQRT2],
  [1, -1, Math.SQRT2],
  [-1, 1, Math.SQRT2],
  [-1, -1, Math.SQRT2],
] as const;
function passable(a: number, b: number, dist: number) {
  if (solid[b]) return false;
  const rise = surface[b]! - surface[a]!;
  if (swim[a] || swim[b]) return rise < 1.5; // climbing out of the water onto low banks only
  if (rise <= 0) return true; // dropping down (no fall damage on foot)
  if (onTerrain[a] && onTerrain[b]) return rise <= dist * MAX_SLOPE;
  return rise <= STEP_HEIGHT + 0.05;
}
// Binary heap Dijkstra over seconds.
function dijkstra(start: number, allowSwim: boolean) {
  const time = new Float64Array(N * N).fill(Infinity);
  const prev = new Int32Array(N * N).fill(-1);
  const heap: number[] = [],
    keys: number[] = [];
  const push = (n: number, t: number) => {
    heap.push(n);
    keys.push(t);
    let c = heap.length - 1;
    while (c > 0) {
      const p = (c - 1) >> 1;
      if (keys[p]! <= keys[c]!) break;
      [heap[p], heap[c]] = [heap[c]!, heap[p]!];
      [keys[p], keys[c]] = [keys[c]!, keys[p]!];
      c = p;
    }
  };
  const pop = () => {
    const n = heap[0]!,
      t = keys[0]!;
    const ln = heap.pop()!,
      lk = keys.pop()!;
    if (heap.length) {
      heap[0] = ln;
      keys[0] = lk;
      let c = 0;
      for (;;) {
        const l = 2 * c + 1,
          r = l + 1;
        let m = c;
        if (l < heap.length && keys[l]! < keys[m]!) m = l;
        if (r < heap.length && keys[r]! < keys[m]!) m = r;
        if (m === c) break;
        [heap[m], heap[c]] = [heap[c]!, heap[m]!];
        [keys[m], keys[c]] = [keys[c]!, keys[m]!];
        c = m;
      }
    }
    return [n, t] as const;
  };
  time[start] = 0;
  push(start, 0);
  while (heap.length) {
    const [n, t] = pop();
    if (t > time[n]!) continue;
    const i = n % N,
      j = (n / N) | 0;
    for (const [di, dj, f] of dirs) {
      const ni = i + di,
        nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= N || nj >= N) continue;
      const m = nj * N + ni;
      if (!allowSwim && swim[m]) continue;
      const dist = f * C;
      if (!passable(n, m, dist)) continue;
      const nt = t + dist / (swim[m] || swim[n] ? DROP.swimSpeed : SPRINT);
      if (nt < time[m]!) {
        time[m] = nt;
        prev[m] = n;
        push(m, nt);
      }
    }
  }
  return { time, prev };
}
const cellOf = (x: number, z: number) =>
  Math.min(N - 1, Math.max(0, Math.floor((z + WORLD_HALF) / C))) * N +
  Math.min(N - 1, Math.max(0, Math.floor((x + WORLD_HALF) / C)));
/** The nearest open (not solid, not water) cell to a point. */
function openNear(x: number, z: number) {
  const c = cellOf(x, z);
  const i0 = c % N,
    j0 = (c / N) | 0;
  for (let r = 0; r < 60; r++)
    for (let dj = -r; dj <= r; dj++)
      for (let di = -r; di <= r; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
        const k = (j0 + dj) * N + (i0 + di);
        if (k >= 0 && k < N * N && !solid[k] && !swim[k] && onTerrain[k]) return k;
      }
  return c;
}
const pois = meta.pois.map((p) => ({ id: p.id, cell: openNear(p.x, p.z) }));
const crossroads = pois.find((p) => p.id === "crossroads")!;

// Land-only reachability from Crossroads: which land is cut off without swimming.
const dry = dijkstra(crossroads.cell, false);
let landCells = 0,
  cutOff = 0;
const cutCells: Record<string, number> = {};
for (let k = 0; k < N * N; k++) {
  if (swim[k] || solid[k] || surface[k]! < 0.5) continue;
  landCells++;
  if (!Number.isFinite(dry.time[k]!)) {
    cutOff++;
    const r = ref(cx(k % N), cx((k / N) | 0));
    cutCells[r] = (cutCells[r] ?? 0) + 1;
  }
}
// Large cut-off pockets only (≥ 0.5 % of a grid square).
const cutSummary = Object.entries(cutCells)
  .filter(([, n]) => n * C * C >= 5000)
  .sort((a, b) => b[1] - a[1])
  .map(([r, n]) => [r, Math.round((n * C * C) / 1000) / 1000]); // km²

// Travel matrix with swimming allowed, plus land-only.
const matrix: Record<string, Record<string, { s: number; dryS: number | null }>> = {};
const pathOf = (prev: Int32Array, to: number) => {
  const out: number[] = [];
  for (let n = to; n !== -1; n = prev[n]!) out.push(n);
  return out.reverse();
};
const paths: Record<string, number[]> = {};
const nearest = new Float32Array(N * N).fill(Infinity);
for (const a of pois) {
  const wet = dijkstra(a.cell, true);
  for (let k = 0; k < N * N; k++) if (wet.time[k]! < nearest[k]!) nearest[k] = wet.time[k]!;
  const dryA = dijkstra(a.cell, false);
  matrix[a.id] = {};
  for (const b of pois) {
    if (a === b) continue;
    const s = wet.time[b.cell]!,
      d = dryA.time[b.cell]!;
    matrix[a.id]![b.id] = { s: Math.round(s), dryS: Number.isFinite(d) ? Math.round(d) : null };
    if (a.id < b.id) paths[`${a.id}>${b.id}`] = pathOf(wet.prev, b.cell);
  }
}
// The farthest land from any POI (time to the nearest POI): isolated stretches.
const isolated: Array<[string, number]> = [];
const perCell: Record<string, number> = {};
for (let k = 0; k < N * N; k++) {
  if (swim[k] || surface[k]! < 0.5 || !Number.isFinite(nearest[k]!)) continue;
  const r = ref(cx(k % N), cx((k / N) | 0));
  perCell[r] = Math.max(perCell[r] ?? 0, nearest[k]!);
}
for (const [r, t] of Object.entries(perCell)) isolated.push([r, Math.round(t)]);
isolated.sort((a, b) => b[1] - a[1]);

// Replays: follow a found path with the real movement (pure pursuit on its cells).
const route = planeRoute(1);
function replay(path: number[]) {
  const b = newDropBody();
  const first = path[0]!;
  b.phase = swim[first] ? "swim" : "ground";
  b.x = cx(first % N);
  b.z = cx((first / N) | 0);
  b.y = surface[first]!;
  b.grounded = b.phase === "ground";
  let target = 0,
    ticks = 0,
    stall = 0,
    best = Infinity;
  const pts = path.map((k) => [cx(k % N), cx((k / N) | 0)] as const);
  while (target < pts.length && ticks < 30000) {
    // Advance to the path point nearest the body among the next 12 (corners get cut).
    let bestK = target,
      bestD = Infinity;
    for (let q = target; q < Math.min(pts.length, target + 12); q++) {
      const dq = Math.hypot(pts[q]![0] - b.x, pts[q]![1] - b.z);
      if (dq < bestD) {
        bestD = dq;
        bestK = q;
      }
    }
    if (bestD < 6) target = Math.min(pts.length - 1, bestK + 1);
    const [tx, tz] = pts[Math.min(pts.length - 1, target + 2)]!;
    const d = Math.hypot(tx - b.x, tz - b.z);
    if (target >= pts.length - 1 && d < 3) return { ok: true, s: r1((ticks * TICK_MS) / 1000) };
    const yaw = Math.atan2(-(tx - b.x), -(tz - b.z));
    const remaining = pts.length - target;
    if (remaining < best) {
      best = remaining;
      stall = 0;
    } else if (++stall > 300)
      return { ok: false, s: r1((ticks * TICK_MS) / 1000), at: [r1(b.x), r1(b.z), ref(b.x, b.z)] };
    stepDrop(
      world,
      meta,
      route,
      b,
      { forward: 1, strafe: 0, yaw, sprint: true, jump: stall > 60 && stall % 20 === 0 },
      1e9,
      TICK_MS,
    );
    ticks++;
  }
  return { ok: false, s: r1((ticks * TICK_MS) / 1000), at: [r1(b.x), r1(b.z), ref(b.x, b.z)] };
}
const replays: Record<string, unknown> = {};
const want = [
  "crossroads>island-superstore",
  "island-airfield>riverwood",
  "blackwater-prison>crossroads",
  "central-hospital>redstone-quarry",
  "millhaven>old-dam",
  "murder-cabins>old-dam",
  "iron-peaks>pine-ridge",
  "east-works>island-airfield",
  "northstar-town>millhaven",
];
for (const key of want) {
  const p = paths[key];
  if (!p) continue;
  const [a, b] = key.split(">") as [string, string];
  replays[key] = { gridS: matrix[a]![b]!.s, ...replay(p) };
}
// Which bridge do island trips use? Count path cells near each bridge for mainland → island trips.
const bridgeUse: Record<string, number> = {};
for (const [key, p] of Object.entries(paths)) {
  const [a, b] = key.split(">") as [string, string];
  const za = meta.pois.find((q) => q.id === a)!.z,
    zb = meta.pois.find((q) => q.id === b)!.z;
  if (za > 2650 === zb > 2650) continue;
  let used = "swim";
  for (const br of meta.bridges.slice(0, 2))
    if (
      p.some(
        (k) =>
          Math.hypot(
            cx(k % N) - (br.a[0] + br.b[0]) / 2,
            cx((k / N) | 0) - (br.a[1] + br.b[1]) / 2,
          ) < 30,
      )
    )
      used = br.id;
  bridgeUse[used] = (bridgeUse[used] ?? 0) + 1;
}
writeFileSync(
  process.argv[2] ?? "nav.json",
  JSON.stringify(
    {
      grid: { cellM: C, sprintMs: SPRINT, swimMs: DROP.swimSpeed },
      landKm2: Math.round((landCells * C * C) / 1e4) / 100,
      cutOffWithoutSwimmingKm2: Math.round((cutOff * C * C) / 1e4) / 100,
      cutOffPockets: cutSummary,
      matrix,
      isolatedWorstPerCell: isolated.slice(0, 15),
      replays,
      bridgeUse,
    },
    null,
    1,
  ),
);
console.log("ok");
