/**
 * Map audit (owner, 2026-11-04: "Iron Peaks … fun sniper mountains, good to run up"): the
 * mountain north of Pine Ridge, as a player meets it.
 *
 *   node scripts/br/map-audit/run.mjs mountains [out.json]
 *
 * - Climbing: a breadth-first walk on a 2 m grid from the window's low border with the movement
 *   rules (each axis may rise at most MAX_SLOPE per metre on terrain, the real hull against
 *   boxes and trunks; any drop). Reports the share of the mountain a player can stand on, which
 *   perches are reached, from how many of eight directions, and the shortest walk to each.
 * - Sniping: from the rim of each perch (RIM m out toward the target, standing eye height), the
 *   share of ground points 100-1000 m out where a standing player could be seen (terrain, boxes
 *   and trunks block; "terrain only" ignores boxes and trunks).
 * - Cover on each perch: boxes within 12 m that are at least waist high.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { MAX_SLOPE } from "@/lib/fps/br/movement";
import type { CollisionData } from "@/lib/fps/br/static-world";
import { forEachTrunkNear } from "@/lib/fps/br/vegetation";
import type { WorldMeta } from "@/lib/fps/br/world";
import { MOVE_SPEED } from "@/lib/fps/simulation";

const buf = (p: string) => {
  const f = readFileSync(p);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const meta = JSON.parse(readFileSync("public/fps/br/world.v1.json", "utf8")) as WorldMeta & {
  perches?: Array<{ x: number; y: number; z: number }>;
};
const collision = JSON.parse(
  readFileSync("public/fps/br/models/collision.json", "utf8"),
) as CollisionData;
const hf = await decodeHeightfield(buf("public/fps/br/height.v1.hf"));
const cover = await decodeLandCover(buf("public/fps/br/landcover.v1.lc"));
const island = buildIsland(hf, cover, meta, collision);
const world = island.solid;

const peaks = meta.pois.find((p) => p.id === "iron-peaks")!;
const ridge = meta.pois.find((p) => p.id === "pine-ridge")!;
// The window: both POIs and a margin.
const X0 = Math.min(peaks.x - peaks.radius, ridge.x - ridge.radius) - 150,
  X1 = Math.max(peaks.x + peaks.radius, ridge.x + ridge.radius) + 150,
  Z0 = Math.max(-4950, Math.min(peaks.z - peaks.radius, ridge.z - ridge.radius) - 150),
  Z1 = Math.max(peaks.z + peaks.radius, ridge.z + ridge.radius) + 150;
const C = 2;
const nx = Math.round((X1 - X0) / C),
  nz = Math.round((Z1 - Z0) / C);
const H = new Float32Array(nx * nz);
const open = new Uint8Array(nx * nz);
for (let j = 0; j < nz; j++)
  for (let i = 0; i < nx; i++) {
    const x = X0 + i * C,
      z = Z0 + j * C;
    const y = hf.heightAt(x, z);
    H[j * nx + i] = y;
    open[j * nx + i] = world.blocked(x, y + 0.36, z, 1.4, 0.3) ? 0 : 1;
  }

// Walk from the low border (valleys and roads around the mountain).
const dist = new Float32Array(nx * nz).fill(Infinity);
const queue: number[] = [];
for (let i = 0; i < nx; i++)
  for (const j of [0, nz - 1]) {
    const k = j * nx + i;
    if (open[k] && H[k]! < 150) ((dist[k] = 0), queue.push(k));
  }
for (let j = 0; j < nz; j++)
  for (const i of [0, nx - 1]) {
    const k = j * nx + i;
    if (open[k] && H[k]! < 150) ((dist[k] = 0), queue.push(k));
  }
for (let q = 0; q < queue.length; q++) {
  const k = queue[q]!;
  const i = k % nx,
    j = (k - i) / nx;
  for (const [di, dj] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const) {
    const a = i + di,
      b = j + dj;
    if (a < 0 || b < 0 || a >= nx || b >= nz) continue;
    const n = b * nx + a;
    if (!open[n] || dist[n]! <= dist[k]! + C) continue;
    if (H[n]! - H[k]! > C * MAX_SLOPE) continue; // too steep to walk up this way
    dist[n] = dist[k]! + C;
    queue.push(n);
  }
}
const cell = (x: number, z: number) => {
  const i = Math.round((x - X0) / C),
    j = Math.round((z - Z0) / C);
  return i < 0 || j < 0 || i >= nx || j >= nz ? -1 : j * nx + i;
};

/** Share of the POI disc (and of its upper part) a player can walk onto. */
function standable(p: { x: number; z: number; radius: number }, above = -Infinity) {
  let all = 0,
    ok = 0;
  for (let z = p.z - p.radius; z <= p.z + p.radius; z += 6)
    for (let x = p.x - p.radius; x <= p.x + p.radius; x += 6) {
      if (Math.hypot(x - p.x, z - p.z) > p.radius) continue;
      const k = cell(x, z);
      if (k < 0 || H[k]! < above) continue;
      all++;
      if (dist[k]! < Infinity) ok++;
    }
  return all ? Math.round((ok / all) * 1000) / 10 : null;
}

// Slope over the mountain (rise per metre, steepest axis), as a histogram.
const slopes = { "<0.5": 0, "0.5-1": 0, ">1 (wall)": 0 };
for (let z = peaks.z - peaks.radius; z <= peaks.z + peaks.radius; z += 6)
  for (let x = peaks.x - peaks.radius; x <= peaks.x + peaks.radius; x += 6) {
    if (Math.hypot(x - peaks.x, z - peaks.z) > peaks.radius) continue;
    const s = Math.max(
      Math.abs(hf.heightAt(x + 1, z) - hf.heightAt(x - 1, z)) / 2,
      Math.abs(hf.heightAt(x, z + 1) - hf.heightAt(x, z - 1)) / 2,
    );
    slopes[s < 0.5 ? "<0.5" : s <= 1 ? "0.5-1" : ">1 (wall)"]++;
  }

const RIM = Number(process.env.RIM ?? 12);
const perches = (meta.perches ?? []).map((p, n) => {
  // Reached: the nearest walkable cell within 8 m of the perch centre.
  let best = Infinity;
  for (let dz = -8; dz <= 8; dz += C)
    for (let dx = -8; dx <= 8; dx += C) {
      const k = cell(p.x + dx, p.z + dz);
      if (k >= 0 && Math.abs(H[k]! - p.y) < 3) best = Math.min(best, dist[k]!);
    }
  // Approaches: of eight directions, those with a walkable cell 40-60 m out that is lower
  // than the perch and connected (the climb can come from that side).
  const sides: string[] = [];
  const names = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  for (let s = 0; s < 8; s++) {
    const a = (s * Math.PI) / 4;
    let ok = false;
    for (let r = 40; r <= 60 && !ok; r += 4) {
      const k = cell(p.x + Math.sin(a) * r, p.z - Math.cos(a) * r);
      if (k >= 0 && dist[k]! < Infinity && H[k]! < p.y - 2) ok = true;
    }
    if (ok) sides.push(names[s]!);
  }
  // Sniping: standing targets 100-1000 m out.
  const band = (r0: number, r1: number) => {
    let all = 0,
      seen = 0;
    terrainSeen = 0;
    for (let r = r0; r < r1; r += 50)
      for (let s = 0; s < 72; s++) {
        const a = (s / 72) * Math.PI * 2;
        const tx = p.x + Math.sin(a) * r,
          tz = p.z - Math.cos(a) * r;
        const ty = hf.heightAt(tx, tz) + 1.2;
        if (ty < 1.2) continue; // the sea
        all++;
        // The sniper steps to the pad's rim facing the target (12 m out), standing.
        const ex = p.x + Math.sin(a) * RIM,
          ez = p.z - Math.cos(a) * RIM;
        const e = { x: ex, y: hf.heightAt(ex, ez) + 1.6, z: ez };
        const d = Math.hypot(tx - e.x, ty - e.y, tz - e.z);
        const hit = world.raycast(e.x, e.y, e.z, tx - e.x, ty - e.y, tz - e.z, d);
        if (!hit || hit.distance > d - 1.5) seen++;
        const g = hf.raycast(e.x, e.y, e.z, (tx - e.x) / d, (ty - e.y) / d, (tz - e.z) / d, d);
        if (!g || g.distance > d - 1.5) terrainSeen++;
      }
    return all
      ? `${Math.round((seen / all) * 100)}% (terrain only ${Math.round((terrainSeen / all) * 100)}%)`
      : null;
  };
  let terrainSeen = 0;
  // Cover: boxes near the perch that rise above the waist.
  let coverBoxes = 0;
  const b = world.boxes;
  world.forEachBox(p.x - 12, p.z - 12, p.x + 12, p.z + 12, (i) => {
    if (b[i * 6 + 4]! - p.y > 0.9) coverBoxes++;
  });
  // Trees around the perch (trunks block sight and bullets).
  const trees = (r: number) => {
    let t = 0;
    if (world.vegetation)
      forEachTrunkNear(world.vegetation, p.x, p.z, r, (tx, tz) => {
        if (Math.hypot(tx - p.x, tz - p.z) <= r) t++;
      });
    return t;
  };
  return {
    perch: n,
    trees: { "50 m": trees(50), "150 m": trees(150) },
    at: [Math.round(p.x), Math.round(p.z)],
    height: Math.round(p.y),
    reached: best < Infinity,
    walkM: best < Infinity ? Math.round(best) : null,
    walkS: best < Infinity ? Math.round(best / MOVE_SPEED) : null,
    approaches: sides,
    seenPct: {
      "100-300 m": band(100, 300),
      "300-600 m": band(300, 600),
      "600-1000 m": band(600, 1000),
    },
    coverBoxes,
  };
});

const report = {
  window: { x: [Math.round(X0), Math.round(X1)], z: [Math.round(Z0), Math.round(Z1)] },
  ironPeaks: {
    top: Math.round(H.reduce((m, v) => Math.max(m, v), -Infinity)),
    standablePct: standable(peaks),
    standableAbove200mPct: standable(peaks, 200),
    standableAbove280mPct: standable(peaks, 280),
    slopeCells: slopes,
  },
  pineRidge: { standablePct: standable(ridge) },
  perches,
};
console.log(JSON.stringify(report, null, 1));
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 1));

// Optional picture: walkable (green), too steep (red), blocked (grey), by height shade.
if (process.env.PNG) {
  const sharp = (await import("sharp")).default;
  const px = Buffer.alloc(nx * nz * 3);
  for (let k = 0; k < nx * nz; k++) {
    const v = Math.max(0, Math.min(1, H[k]! / 380));
    const g = 60 + v * 160;
    const [r, gg, bb] = !open[k]
      ? [90, 90, 90]
      : dist[k]! < Infinity
        ? [g * 0.45, g, g * 0.45]
        : [g, g * 0.3, g * 0.3];
    px[k * 3] = r;
    px[k * 3 + 1] = gg;
    px[k * 3 + 2] = bb;
  }
  for (const p of meta.perches ?? [])
    for (let d = -5; d <= 5; d++)
      for (const [x, z] of [
        [p.x + d * C, p.z],
        [p.x, p.z + d * C],
      ] as const) {
        const k = cell(x, z);
        if (k >= 0) px.set([255, 255, 0], k * 3);
      }
  await sharp(px, { raw: { width: nx, height: nz, channels: 3 } })
    .png()
    .toFile(process.env.PNG);
}
