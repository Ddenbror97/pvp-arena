import { WORLD_ASSETS } from "@/lib/fps/br/world";
/**
 * Map audit: dead space. Where the island is walkable land with nothing on it (no building
 * within reach), measured on a 100 m grid from the data the game runs on; and, inside each
 * named place, how much of its footprint is empty lots. Writes JSON to argv[2]:
 *
 *   node scripts/br/map-audit/run.mjs deadspace <out.json>
 *
 * A 100 m cell is "dead" when it is land, mostly gentle (a building could stand there) and no
 * building or structure stands within 250 m of its centre. Dead cells are joined into areas
 * (4-neighbour), and each area is described: size, centre, nearest place, road access, cover.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import type { CollisionData } from "@/lib/fps/br/static-world";
import { LAND_COVER, WORLD_HALF, type WorldMeta } from "@/lib/fps/br/world";

const buf = (p: string) => {
  const f = readFileSync(p);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const meta = JSON.parse(readFileSync("public/fps/br/world.v1.json", "utf8")) as WorldMeta;
const collision = JSON.parse(
  readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"),
) as CollisionData;
const models = JSON.parse(readFileSync(`public${WORLD_ASSETS.models}`, "utf8")).models as Record<
  string,
  { class: string; size: number[] }
>;
const hf = await decodeHeightfield(buf("public/fps/br/height.v1.hf"));
const cover = await decodeLandCover(buf("public/fps/br/landcover.v1.lc"));
const island = buildIsland(hf, cover, meta, collision);

const COLS = "ABCDEFGHIJ";
const grid = (x: number, z: number) =>
  `${COLS[Math.max(0, Math.min(9, Math.floor((x + WORLD_HALF) / 1000)))]}${Math.max(1, Math.min(10, Math.floor((z + WORLD_HALF) / 1000) + 1))}`;

// Built things: buildings and structures with a real footprint.
const built = island.layout.filter((l) => {
  const m = models[l.model];
  return m && (m.class === "building" || m.class === "structure" || m.class === "hero");
});
const BIN = 250;
// Each with its footprint's half extents (a quarter turn swaps them), so a large building's
// whole floor counts as built, not only its centre.
type Foot = { x: number; z: number; hx: number; hz: number };
const bins = new Map<string, Foot[]>();
for (const b of built) {
  const size = models[b.model]!.size;
  const odd = b.turn % 2 === 1;
  const f: Foot = {
    x: b.x,
    z: b.z,
    hx: (odd ? size[2]! : size[0]!) / 2,
    hz: (odd ? size[0]! : size[2]!) / 2,
  };
  // Filed in every bin its footprint touches.
  for (let i = Math.floor((b.x - f.hx) / BIN); i <= Math.floor((b.x + f.hx) / BIN); i++)
    for (let j = Math.floor((b.z - f.hz) / BIN); j <= Math.floor((b.z + f.hz) / BIN); j++) {
      const k = `${i},${j}`;
      let a = bins.get(k);
      if (!a) bins.set(k, (a = []));
      a.push(f);
    }
}
const nearestBuilt = (x: number, z: number, max: number) => {
  let best = Infinity;
  const r = Math.ceil(max / BIN);
  const bx = Math.floor(x / BIN),
    bz = Math.floor(z / BIN);
  for (let i = -r; i <= r; i++)
    for (let j = -r; j <= r; j++)
      for (const b of bins.get(`${bx + i},${bz + j}`) ?? [])
        best = Math.min(
          best,
          Math.hypot(Math.max(0, Math.abs(b.x - x) - b.hx), Math.max(0, Math.abs(b.z - z) - b.hz)),
        );
  return best;
};
const segs: Array<[number, number, number, number]> = [];
for (const rd of meta.roads)
  for (let k = 1; k < rd.points.length; k++) {
    const a = rd.points[k - 1]!,
      b = rd.points[k]!;
    segs.push([a[0], a[1], b[0], b[1]]);
  }
const roadDist = (x: number, z: number) => {
  let best = Infinity;
  for (const [ax, az, bx, bz] of segs) {
    const dx = bx - ax,
      dz = bz - az,
      l2 = dx * dx + dz * dz;
    const t = l2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)) : 0;
    best = Math.min(best, Math.hypot(ax + dx * t - x, az + dz * t - z));
  }
  return best;
};
const slopeAt = (x: number, z: number) => {
  const gx = (hf.heightAt(x + 4, z) - hf.heightAt(x - 4, z)) / 8,
    gz = (hf.heightAt(x, z + 4) - hf.heightAt(x, z - 4)) / 8;
  return (Math.atan(Math.hypot(gx, gz)) * 180) / Math.PI;
};
const wet = (x: number, z: number) => {
  const h = hf.heightAt(x, z);
  if (h <= 1.2 || LAND_COVER[cover.classIdAt(x, z)] === "water") return true;
  return meta.waterBodies.some(
    (w) =>
      x >= w.bounds[0] &&
      x <= w.bounds[2] &&
      z >= w.bounds[1] &&
      z <= w.bounds[3] &&
      h < w.level + 0.5,
  );
};

// ---------------------------------------------------------------- 100 m dead cells
const CELL = 100,
  N = (2 * WORLD_HALF) / CELL;
const dead = new Uint8Array(N * N);
const info: Array<{ slope: number; cover: string; road: number; h: number } | null> = [];
for (let j = 0; j < N; j++)
  for (let i = 0; i < N; i++) {
    const x = -WORLD_HALF + (i + 0.5) * CELL,
      z = -WORLD_HALF + (j + 0.5) * CELL;
    let land = 0,
      gentle = 0,
      sl = 0;
    const counts: Record<string, number> = {};
    for (const [ox, oz] of [
      [-30, -30],
      [30, -30],
      [-30, 30],
      [30, 30],
      [0, 0],
    ] as const) {
      if (wet(x + ox, z + oz)) continue;
      land++;
      const s = slopeAt(x + ox, z + oz);
      sl += s;
      if (s < 9) gentle++;
      const c = LAND_COVER[cover.classIdAt(x + ox, z + oz)] ?? "grass";
      counts[c] = (counts[c] ?? 0) + 1;
    }
    info.push(null);
    if (land < 5 || gentle < 4) continue;
    if (Math.abs(x) > WORLD_HALF - 250 || Math.abs(z) > WORLD_HALF - 250) continue;
    if (nearestBuilt(x, z, 250) < 250) continue;
    dead[j * N + i] = 1;
    info[j * N + i] = {
      slope: +(sl / land).toFixed(1),
      cover: Object.entries(counts).sort((a, b) => b[1] - a[1])[0]![0],
      road: Math.round(roadDist(x, z)),
      h: +hf.heightAt(x, z).toFixed(1),
    };
  }
// Join into areas.
const seen = new Uint8Array(N * N);
const areas: Array<{
  cells: number;
  km2: number;
  x: number;
  z: number;
  grid: string;
  nearestPlace: string;
  placeDistM: number;
  roadM: number;
  meanSlope: number;
  cover: Record<string, number>;
  bbox: [number, number, number, number];
}> = [];
for (let s = 0; s < N * N; s++) {
  if (!dead[s] || seen[s]) continue;
  const stack = [s];
  seen[s] = 1;
  const members: number[] = [];
  while (stack.length) {
    const c = stack.pop()!;
    members.push(c);
    const i = c % N,
      j = Math.floor(c / N);
    for (const [di, dj] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const ni = i + di,
        nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= N || nj >= N) continue;
      const n = nj * N + ni;
      if (dead[n] && !seen[n]) {
        seen[n] = 1;
        stack.push(n);
      }
    }
  }
  if (members.length < 12) continue; // under 0.12 km²: a gap, not an area
  let sx = 0,
    sz = 0,
    road = Infinity,
    slope = 0;
  const cov: Record<string, number> = {};
  let x0 = Infinity,
    z0 = Infinity,
    x1 = -Infinity,
    z1 = -Infinity;
  for (const m of members) {
    const x = -WORLD_HALF + ((m % N) + 0.5) * CELL,
      z = -WORLD_HALF + (Math.floor(m / N) + 0.5) * CELL;
    sx += x;
    sz += z;
    x0 = Math.min(x0, x);
    z0 = Math.min(z0, z);
    x1 = Math.max(x1, x);
    z1 = Math.max(z1, z);
    const inf = info[m]!;
    road = Math.min(road, inf.road);
    slope += inf.slope;
    cov[inf.cover] = (cov[inf.cover] ?? 0) + 1;
  }
  const cx = sx / members.length,
    cz = sz / members.length;
  const near = meta.pois
    .map((p) => ({ p, d: Math.hypot(p.x - cx, p.z - cz) }))
    .sort((a, b) => a.d - b.d)[0]!;
  areas.push({
    cells: members.length,
    km2: +((members.length * CELL * CELL) / 1e6).toFixed(2),
    x: Math.round(cx),
    z: Math.round(cz),
    grid: grid(cx, cz),
    nearestPlace: near.p.name,
    placeDistM: Math.round(near.d),
    roadM: road,
    meanSlope: +(slope / members.length).toFixed(1),
    cover: cov,
    bbox: [x0, z0, x1, z1],
  });
}
areas.sort((a, b) => b.cells - a.cells);

// ---------------------------------------------------------------- empty lots inside places
const LOT = 50;
const places = meta.pois.map((p) => {
  const r = p.padRadius ?? p.radius * 0.5;
  let lots = 0,
    empty = 0;
  const emptyAt: Array<[number, number]> = [];
  for (let z = p.z - r; z <= p.z + r; z += LOT)
    for (let x = p.x - r; x <= p.x + r; x += LOT) {
      if (Math.hypot(x - p.x, z - p.z) > r || wet(x, z) || slopeAt(x, z) > 12) continue;
      lots++;
      if (nearestBuilt(x, z, 60) > 45) {
        empty++;
        emptyAt.push([Math.round(x), Math.round(z)]);
      }
    }
  return {
    name: p.name,
    kind: p.kind,
    grid: grid(p.x, p.z),
    radiusM: Math.round(r),
    lots,
    emptyShare: lots ? +(empty / lots).toFixed(2) : 0,
    emptyAt,
  };
});

writeFileSync(
  process.argv[2] ?? "deadspace.json",
  JSON.stringify(
    {
      areas,
      places,
      deadCells: [...dead].reduce((a, b) => a + b, 0),
      // Centres of the dead 100 m cells (for drawing them over the map).
      dead: [...dead].flatMap((d, k) =>
        d
          ? [[-WORLD_HALF + ((k % N) + 0.5) * CELL, -WORLD_HALF + (Math.floor(k / N) + 0.5) * CELL]]
          : [],
      ),
    },
    null,
    1,
  ),
);
console.log(`dead cells ${[...dead].reduce((a, b) => a + b, 0)}, areas ${areas.length}`);
for (const a of areas.slice(0, 25))
  console.log(
    `${a.grid} ${a.km2} km² at ${a.x},${a.z} near ${a.nearestPlace} (${a.placeDistM} m), road ${a.roadM} m, slope ${a.meanSlope}°`,
    JSON.stringify(a.cover),
  );
for (const p of places.sort((a, b) => b.emptyShare - a.emptyShare))
  console.log(
    `${p.name} (${p.grid}) r${p.radiusM} lots ${p.lots} empty ${Math.round(p.emptyShare * 100)}%`,
  );
