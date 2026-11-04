/**
 * Map audit, step 2: traversal and collision probes with the server's own movement
 * (`stepDrop`: walking, stepping, slopes, swimming) and collision (`StaticWorld`).
 *
 *   node scripts/br/map-audit/run.mjs probes <out.json>
 */
import { readFileSync, writeFileSync } from "node:fs";
import { DROP, newDropBody, planeRoute, stepDrop, waterSurface } from "@/lib/fps/br/drop";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { rollLoot } from "@/lib/fps/br/loot";
import { MAX_SLOPE } from "@/lib/fps/br/movement";
import type { CollisionData } from "@/lib/fps/br/static-world";
import { WORLD_HALF, type WorldMeta } from "@/lib/fps/br/world";
import { planZone, ZONE_PHASES } from "@/lib/fps/br/zone";
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
const route = planeRoute(1);
const COLS = "ABCDEFGHIJ";
const ref = (x: number, z: number) =>
  `${COLS[Math.floor((x + WORLD_HALF) / 1000)] ?? "?"}${Math.floor((z + WORLD_HALF) / 1000) + 1}`;
const r1 = (v: number) => Math.round(v * 10) / 10;

// ------------------------------------------------------------------ a scripted walker
type Walk = {
  reached: boolean;
  seconds: number;
  distance: number;
  swamM: number;
  stuck: Array<[number, number, string]>;
  minY: number;
  maxY: number;
};
function walk(
  from: [number, number],
  to: [number, number],
  opts: { sprint?: boolean; maxS?: number; arrive?: number; startY?: number } = {},
): Walk {
  const b = newDropBody();
  b.phase = "ground";
  b.x = from[0];
  b.z = from[1];
  b.y = opts.startY ?? world.supportAt(b.x, b.z, PLAYER_RADIUS, 1e4);
  b.grounded = true;
  const surf = waterSurface(meta, hf.heightAt(b.x, b.z), b.x, b.z);
  if (surf !== null && surf - hf.heightAt(b.x, b.z) > DROP.wadeDepth) {
    b.phase = "swim";
    b.y = surf;
  }
  const maxTicks = Math.round(((opts.maxS ?? 900) * 1000) / TICK_MS);
  const out: Walk = {
    reached: false,
    seconds: 0,
    distance: 0,
    swamM: 0,
    stuck: [],
    minY: b.y,
    maxY: b.y,
  };
  let lastProgress = 0,
    best = Infinity,
    detour = 0,
    side = 1;
  for (let t = 0; t < maxTicks; t++) {
    const dx = to[0] - b.x,
      dz = to[1] - b.z;
    const d = Math.hypot(dx, dz);
    if (d <= (opts.arrive ?? 2)) {
      out.reached = true;
      out.seconds = (t * TICK_MS) / 1000;
      return out;
    }
    if (d < best - 0.5) {
      best = d;
      lastProgress = t;
    }
    // Blocked for 2 s: side-step for 1.5 s (alternating sides), jumping; give up after 25 s.
    const stalled = t - lastProgress;
    if (stalled > 60 && detour <= 0) {
      detour = 45;
      side = -side;
    }
    if (stalled > 750) {
      out.stuck.push([r1(b.x), r1(b.z), ref(b.x, b.z)]);
      out.seconds = (t * TICK_MS) / 1000;
      return out;
    }
    let yaw = Math.atan2(-dx, -dz);
    if (detour > 0) {
      yaw += (side * Math.PI) / 2;
      detour--;
    }
    const px = b.x,
      pz = b.z,
      wasSwim = b.phase === "swim";
    stepDrop(
      world,
      meta,
      route,
      b,
      {
        forward: 1,
        strafe: 0,
        yaw,
        sprint: opts.sprint ?? true,
        jump: detour > 0 && detour % 15 === 0,
      },
      1e9,
      TICK_MS,
    );
    const step = Math.hypot(b.x - px, b.z - pz);
    out.distance += step;
    if (wasSwim) out.swamM += step;
    out.minY = Math.min(out.minY, b.y);
    out.maxY = Math.max(out.maxY, b.y);
  }
  out.seconds = (maxTicks * TICK_MS) / 1000;
  out.stuck.push([r1(b.x), r1(b.z), ref(b.x, b.z) + " (time out)"]);
  return out;
}
const summary = (w: Walk) => ({
  reached: w.reached,
  s: r1(w.seconds),
  m: Math.round(w.distance),
  swamM: Math.round(w.swamM),
  yRange: [r1(w.minY), r1(w.maxY)],
  stuck: w.stuck,
});
const along = (a: number[], b: number[], t: number): [number, number] => [
  a[0]! + (b[0]! - a[0]!) * t,
  a[1]! + (b[1]! - a[1]!) * t,
];

// ------------------------------------------------------------------ 1. bridges and the dam
const crossings = meta.bridges.map((br) => {
  const len = Math.hypot(br.b[0] - br.a[0], br.b[1] - br.a[1]);
  const ext = 80 / len;
  const A = along(br.a, br.b, -ext),
    B = along(br.a, br.b, 1 + ext);
  // Deck sampling: support height across the deck and at its edges (railings).
  const deck: number[] = [];
  for (let k = 0; k <= 20; k++) {
    const [x, z] = along(br.a, br.b, k / 20);
    deck.push(r1(world.supportAt(x, z, PLAYER_RADIUS, br.deck + 2)));
  }
  // Across the deck at mid-span: can a player walk off the side?
  const mid = along(br.a, br.b, 0.5);
  const nx = -(br.b[1] - br.a[1]) / len,
    nz = (br.b[0] - br.a[0]) / len;
  const sideWalk = walk(mid, [mid[0] + nx * (br.width / 2 + 6), mid[1] + nz * (br.width / 2 + 6)], {
    sprint: false,
    maxS: 20,
    startY: world.supportAt(mid[0], mid[1], PLAYER_RADIUS, br.deck + 2),
  });
  return {
    id: br.id,
    cells: [ref(br.a[0], br.a[1]), ref(br.b[0], br.b[1])],
    lengthM: Math.round(len),
    deck: br.deck,
    width: br.width,
    there: summary(walk(A, B)),
    back: summary(walk(B, A)),
    deckSupport: deck,
    offTheSide: { leftDeck: sideWalk.reached, fellTo: r1(sideWalk.minY) },
  };
});

// ------------------------------------------------------------------ 2. roads over rivers
type River = { id: string; width: number; points: [number, number][] };
const rivers = meta.rivers as unknown as River[];
const segDist = (p: [number, number], a: number[], b: number[]) => {
  const vx = b[0]! - a[0]!,
    vz = b[1]! - a[1]!;
  const t = Math.max(
    0,
    Math.min(1, ((p[0] - a[0]!) * vx + (p[1] - a[1]!) * vz) / (vx * vx + vz * vz || 1)),
  );
  return Math.hypot(p[0] - a[0]! - vx * t, p[1] - a[1]! - vz * t);
};
const fords: Array<{ at: [number, number]; cell: string; river: string; depth: number }> = [];
for (const rd of meta.roads)
  for (let k = 1; k < rd.points.length; k++) {
    const a = rd.points[k - 1]!,
      b = rd.points[k]!;
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 4));
    for (let s = 0; s <= n; s++) {
      const p = along(a, b, s / n);
      const g = hf.heightAt(p[0], p[1]);
      const w = waterSurface(meta, g, p[0], p[1]);
      if (w === null || w - g <= DROP.wadeDepth) continue;
      const rv = rivers.find((r) =>
        r.points.some((q, i) => i > 0 && segDist(p, r.points[i - 1]!, q) < r.width / 2 + 25),
      );
      // Inland water under a road with no bridge deck above it.
      const onBridge = meta.bridges.some((br) => segDist(p, br.a, br.b) < br.width);
      if (onBridge) continue;
      if (!fords.some((f) => Math.hypot(f.at[0] - p[0], f.at[1] - p[1]) < 60))
        fords.push({
          at: [r1(p[0]), r1(p[1])],
          cell: ref(p[0], p[1]),
          river: rv ? rv.id : g < 0 ? "sea/strait" : "lake",
          depth: r1(w - g),
        });
    }
  }

// ------------------------------------------------------------------ 3. approaches into each POI
const approaches = meta.pois.map((p) => {
  const results: Array<{
    from: string;
    reached: boolean;
    s: number;
    swamM: number;
    stuck: unknown;
  }> = [];
  const dirs = 16;
  for (let i = 0; i < dirs; i++) {
    const a = (i / dirs) * Math.PI * 2;
    const R = p.radius * 1.15;
    const from: [number, number] = [p.x + Math.cos(a) * R, p.z + Math.sin(a) * R];
    const w = walk(from, [p.x, p.z], { maxS: 600, arrive: Math.max(6, (p.padRadius ?? 0) * 0.1) });
    results.push({
      from: ref(from[0], from[1]),
      reached: w.reached,
      s: r1(w.seconds),
      swamM: Math.round(w.swamM),
      stuck: w.stuck[0] ?? null,
    });
  }
  return {
    id: p.id,
    reachedFrom: results.filter((r) => r.reached).length,
    of: dirs,
    medianS: r1([...results].sort((x, y) => x.s - y.s)[dirs >> 1]!.s),
    swimApproaches: results.filter((r) => r.swamM > 5).length,
    failures: results.filter((r) => !r.reached),
  };
});

// ------------------------------------------------------------------ 4. quarry and peaks
const quarry = meta.pois.find((p) => p.id === "redstone-quarry")!;
let qLow = { h: Infinity, x: 0, z: 0 };
for (let x = quarry.x - 600; x <= quarry.x + 600; x += 10)
  for (let z = quarry.z - 600; z <= quarry.z + 600; z += 10) {
    const h = hf.heightAt(x, z);
    if (h < qLow.h) qLow = { h, x, z };
  }
const quarryRim: [number, number] = [quarry.x - 900, quarry.z];
const quarryProfile: number[] = [];
for (let k = 0; k <= 30; k++)
  quarryProfile.push(r1(hf.heightAt(quarry.x - 900 + k * 30, quarry.z)));
const peaks = meta.pois.find((p) => p.id === "iron-peaks")!;
let top = { h: -Infinity, x: 0, z: 0 };
for (let x = peaks.x - 900; x <= peaks.x + 900; x += 8)
  for (let z = peaks.z - 900; z <= peaks.z + 900; z += 8) {
    const h = hf.heightAt(x, z);
    if (h > top.h) top = { h, x, z };
  }
// Steep (unwalkable) share of the peaks area.
let steep = 0,
  n = 0;
for (let x = peaks.x - 800; x <= peaks.x + 800; x += 6)
  for (let z = peaks.z - 800; z <= peaks.z + 800; z += 6) {
    const g =
      Math.hypot(
        hf.heightAt(x + 2, z) - hf.heightAt(x - 2, z),
        hf.heightAt(x, z + 2) - hf.heightAt(x, z - 2),
      ) / 4;
    n++;
    if (g > MAX_SLOPE) steep++;
  }
const summitFrom = [0, 1, 2, 3].map((i) => {
  const a = (i / 4) * Math.PI * 2;
  const from: [number, number] = [top.x + Math.cos(a) * 1000, top.z + Math.sin(a) * 1000];
  return { from: ref(...from), ...summary(walk(from, [top.x, top.z], { maxS: 900, arrive: 6 })) };
});
const terrainFeatures = {
  quarry: {
    lowest: { ...qLow, h: r1(qLow.h), cell: ref(qLow.x, qLow.z) },
    profileWestToEast30m: quarryProfile,
    rimToBottom: summary(walk(quarryRim, [qLow.x, qLow.z], { maxS: 600, arrive: 8 })),
    bottomToRim: summary(walk([qLow.x, qLow.z], quarryRim, { maxS: 600, arrive: 8 })),
  },
  ironPeaks: {
    summit: { h: r1(top.h), x: top.x, z: top.z, cell: ref(top.x, top.z) },
    unwalkableShare: +(steep / n).toFixed(3),
    summitFrom,
  },
};

// ------------------------------------------------------------------ 5. loot reachable on foot
// Breadth-first search on a 0.5 m grid with the movement rules (step 0.35 m, no jumping, any
// drop), from open ground 30 m away to the item.
const loot = rollLoot(1, island.layout, collision, world, meta);
function reachable(item: { x: number; y: number; z: number }) {
  const C = 0.5,
    R = 36;
  const key = (i: number, j: number, y: number) => `${i},${j},${Math.round(y * 4)}`;
  const seen = new Set<string>();
  const queue: Array<[number, number, number]> = [];
  for (let a = 0; a < 8; a++) {
    const x = item.x + Math.cos((a / 8) * Math.PI * 2) * 30,
      z = item.z + Math.sin((a / 8) * Math.PI * 2) * 30;
    const y = world.supportAt(x, z, PLAYER_RADIUS, 1e4);
    if (
      Math.abs(y - hf.heightAt(x, z)) < 0.1 &&
      !world.blocked(x, y + 1e-3, z, EYE_HEIGHT + 0.2, PLAYER_RADIUS)
    ) {
      const i = Math.round((x - item.x) / C),
        j = Math.round((z - item.z) / C);
      queue.push([i, j, y]);
      seen.add(key(i, j, y));
    }
  }
  if (!queue.length) return null;
  let head = 0;
  while (head < queue.length && queue.length < 60000) {
    const [i, j, y] = queue[head++]!;
    const x = item.x + i * C,
      z = item.z + j * C;
    if (Math.hypot(x - item.x, z - item.z) < 1.2 && Math.abs(y - item.y) < 0.6) return true;
    for (const [di, dj] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const ni = i + di,
        nj = j + dj;
      if (Math.abs(ni) * C > R || Math.abs(nj) * C > R) continue;
      const nx = item.x + ni * C,
        nz = item.z + nj * C;
      const ny = world.supportAt(nx, nz, PLAYER_RADIUS, y + STEP_HEIGHT);
      if (ny < y - 6) continue;
      const tr = hf.heightAt(nx, nz) - hf.heightAt(x, z);
      if (Math.abs(y - hf.heightAt(x, z)) < 0.05 && tr > C * MAX_SLOPE) continue;
      if (world.blocked(nx, ny + 1e-3, nz, EYE_HEIGHT + 0.2, PLAYER_RADIUS)) continue;
      const k = key(ni, nj, ny);
      if (seen.has(k)) continue;
      seen.add(k);
      queue.push([ni, nj, ny]);
    }
  }
  return false;
}
// Stratified sample: every 9th item.
const lootChecks: Array<{
  item: string;
  cell: string;
  ok: boolean | null;
  at: number[];
  indoor: boolean;
}> = [];
for (let k = 0; k < loot.length; k += 9) {
  const it = loot[k]!;
  // Indoors: something solid overhead (a roof or upper floor within 12 m).
  const indoor = world.blocked(it.x, it.y + 2.2, it.z, 10, 0.05);
  lootChecks.push({
    item: it.item,
    cell: ref(it.x, it.z),
    ok: reachable(it),
    at: [r1(it.x), r1(it.y), r1(it.z)],
    indoor,
  });
}

// ------------------------------------------------------------------ 6. landing spots
let landingStuck = 0,
  landingWater = 0,
  landingSamples = 0;
const stuckSpots: Array<[number, number, string]> = [];
let seed = 12345;
const rnd = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
while (landingSamples < 20000) {
  const x = (rnd() - 0.5) * 9800,
    z = (rnd() - 0.5) * 9800;
  if (hf.heightAt(x, z) < 0.5) continue;
  landingSamples++;
  const y = world.supportAt(x, z, PLAYER_RADIUS, 1e4);
  if (waterSurface(meta, hf.heightAt(x, z), x, z) !== null) landingWater++;
  if (world.blocked(x, y + 1e-3, z, EYE_HEIGHT + 0.2, PLAYER_RADIUS)) {
    landingStuck++;
    if (stuckSpots.length < 12) stuckSpots.push([r1(x), r1(z), ref(x, z)]);
  }
}

// ------------------------------------------------------------------ 7. the zone
const islandZ = 2650; // the strait's centre line (south of it: the southern island)
let finalOnIsland = 0,
  finalInWater = 0,
  midOnIsland = 0;
const finals: Record<string, number> = {};
const SEEDS = 2000;
for (let s = 1; s <= SEEDS; s++) {
  const plan = planZone(meta, s, (x, z) => hf.heightAt(x, z));
  const f = plan.circles.at(-1)!;
  if (f.z > islandZ) finalOnIsland++;
  if (hf.heightAt(f.x, f.z) <= 0.5) finalInWater++;
  const m = plan.circles[4]!;
  if (m.z - m.r > islandZ) midOnIsland++;
  finals[ref(f.x, f.z)] = (finals[ref(f.x, f.z)] ?? 0) + 1;
}
// Worst case for a player on the far mainland when the circle sits on the island: the longest
// distance to cover in phase 1's wait + shrink at sprint speed.
const phase1 = ZONE_PHASES[0]!;

// ------------------------------------------------------------------ 8. travel times
const pick = [
  "northstar-town",
  "millhaven",
  "crossroads",
  "central-hospital",
  "redstone-quarry",
  "riverwood",
  "blackwater-prison",
  "southern-military-base",
  "murder-cabins",
  "old-dam",
  "island-superstore",
  "island-airfield",
  "iron-peaks",
  "pine-ridge",
  "east-works",
];
const P = (id: string) => meta.pois.find((p) => p.id === id)!;
const travel: Array<{
  a: string;
  b: string;
  straightM: number;
  s: number;
  reached: boolean;
  swamM: number;
}> = [];
for (let i = 0; i < pick.length; i++) {
  const a = P(pick[i]!);
  const near = pick
    .filter((id) => id !== a.id)
    .map((id) => P(id))
    .sort((x, y) => Math.hypot(x.x - a.x, x.z - a.z) - Math.hypot(y.x - a.x, y.z - a.z))
    .slice(0, 2);
  for (const b of near) {
    if (travel.some((t) => t.a === b.id && t.b === a.id)) continue;
    const w = walk([a.x, a.z], [b.x, b.z], { maxS: 1500, arrive: 15 });
    travel.push({
      a: a.id,
      b: b.id,
      straightM: Math.round(Math.hypot(b.x - a.x, b.z - a.z)),
      s: r1(w.seconds),
      reached: w.reached,
      swamM: Math.round(w.swamM),
    });
  }
}

writeFileSync(
  process.argv[2] ?? "probes.json",
  JSON.stringify(
    {
      speeds: { runMs: MOVE_SPEED, sprintMs: MOVE_SPEED * 1.5, swimMs: DROP.swimSpeed },
      crossings,
      fords,
      approaches,
      terrainFeatures,
      loot: {
        sampled: lootChecks.length,
        reachable: lootChecks.filter((l) => l.ok === true).length,
        unreachable: lootChecks.filter((l) => l.ok === false),
        undetermined: lootChecks.filter((l) => l.ok === null).length,
      },
      landing: {
        samples: landingSamples,
        insideGeometry: landingStuck,
        inWater: landingWater,
        stuckSpots,
      },
      zone: {
        seeds: SEEDS,
        finalOnIsland,
        finalInWater,
        phase5OnIslandOnly: midOnIsland,
        finalCells: Object.entries(finals).sort((a, b) => b[1] - a[1]),
        phase1: phase1,
      },
      travel,
    },
    null,
    1,
  ),
);
console.log("ok");
