import { PRISON_WALL } from "./walls";
import type { WorldMeta } from "./world";

/**
 * Where every processed model stands on Project Island (shared by the server's collision and the
 * client's rendering, so both see the same buildings). Deterministic: authored layouts per POI
 * plus integer-hash scatter; no randomness at runtime.
 *
 * Rotations are quarter turns only, so the models' axis-aligned collision boxes stay exact.
 */
export type Placement = {
  model: string;
  x: number;
  y: number;
  z: number;
  /** Quarter turns about +y (0..3): 1 = 90° counter-clockwise seen from above. */
  turn: 0 | 1 | 2 | 3;
  poi: string;
};

function hash(a: number, b: number) {
  let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ 0x5bd1e995;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

type Poi = WorldMeta["pois"][number];

function builder(poi: Poi, out: Placement[]) {
  const y = poi.padHeight ?? 0;
  const at = (model: string, dx: number, dz: number, turn: Placement["turn"] = 0) =>
    out.push({
      model,
      x: +(poi.x + dx).toFixed(2),
      y,
      z: +(poi.z + dz).toFixed(2),
      turn,
      poi: poi.id,
    });
  /** A straight run of `model` every `step` metres from (x0,z0) to (x1,z1), skipping gaps. */
  const row = (
    model: string,
    x0: number,
    z0: number,
    x1: number,
    z1: number,
    step: number,
    turn: Placement["turn"] = 0,
    gaps: Array<[number, number]> = [],
  ) => {
    const length = Math.hypot(x1 - x0, z1 - z0);
    const n = Math.max(1, Math.floor(length / step));
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const dx = x0 + (x1 - x0) * t,
        dz = z0 + (z1 - z0) * t;
      if (gaps.some(([gx, gz]) => Math.hypot(dx - gx, dz - gz) < 9)) continue;
      at(model, dx, dz, turn);
    }
  };
  /** `count` copies scattered in a rectangle on a 4 m lattice (deterministic, no overlaps). */
  const scatter = (
    model: string,
    count: number,
    cx: number,
    cz: number,
    w: number,
    d: number,
    salt: number,
  ) => {
    const taken = new Set<string>();
    for (let k = 0, tries = 0; k < count && tries < count * 20; tries++) {
      const gx = Math.floor(hash(salt, tries * 2) * (w / 4)),
        gz = Math.floor(hash(salt, tries * 2 + 1) * (d / 4));
      const key = `${gx},${gz}`;
      if (taken.has(key)) continue;
      taken.add(key);
      at(
        model,
        cx - w / 2 + gx * 4 + 2,
        cz - d / 2 + gz * 4 + 2,
        (Math.floor(hash(salt + 7, tries) * 4) % 4) as Placement["turn"],
      );
      k++;
    }
  };
  return { at, row, scatter };
}

/** Southern Military Base (G7, mainland, north of the strait): hesco perimeter with gates and
 * towers, HQ, barracks, camp, helipads. */
function militaryBase(poi: Poi, out: Placement[]) {
  const { at, row, scatter } = builder(poi, out);
  const h = 165; // half side of the walled compound (pad radius 280 m)
  const gates: Array<[number, number]> = [
    [0, h],
    [0, -h],
    [h, 0],
  ];
  row("hesco", -h, -h, h, -h, 1.3, 0, gates);
  row("hesco", -h, h, h, h, 1.3, 0, gates);
  row("hesco", -h, -h, -h, h, 1.3, 1, gates);
  row("hesco", h, -h, h, h, 1.3, 1, gates);
  // Gates: a booth just inside, a chicane of barriers just outside.
  for (const side of [1, -1]) {
    at("checkpoint", 12, side * (h - 9), 0);
    at("jersey", -4, side * (h + 14), 1);
    at("jersey", 4, side * (h + 16), 1);
  }
  at("checkpoint", h - 9, 12, 1);
  at("jersey", h + 14, -4, 0);
  at("jersey", h + 16, 4, 0);
  for (const [x, z] of [
    [-h + 4, -h + 4],
    [h - 4, -h + 4],
    [-h + 4, h - 4],
    [h - 4, h - 4],
    [-h + 4, 0],
    [0, -h + 4 + 40],
  ])
    at("guard-tower", x!, z!, 0);
  at("watchtower", 60, h - 6, 0);
  at("watchtower", -60, -h + 6, 2);
  // Headquarters in the middle, barracks rows to the west, tents to the east.
  at("military-hq", 0, 0, 0);
  for (let i = 0; i < 3; i++) {
    at("barracks", -110, -70 + i * 32, 1);
    at("barracks", -70, -70 + i * 32, 1);
  }
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 2; j++) at(i % 2 ? "tent" : "tent-large", 70 + j * 22, -90 + i * 20, 0);
  // Helipads with a parked Chinook, radar trucks, the radio mast, fuel and supplies.
  at("helipad", 40, 95, 0);
  at("chinook", 40, 95, 1);
  at("helipad", 85, 95, 0);
  at("radar-truck", -30, 75, 0);
  at("radar-truck", -48, 75, 0);
  at("radio-mast", -130, 120, 0);
  at("fuel-tank", 130, 40, 1);
  at("fuel-tank", 130, 55, 1);
  for (let i = 0; i < 3; i++) {
    at("container-40", 125, -130 + i * 6, 0);
    at("container-20", 105, -130 + i * 6, 0);
  }
  at("sandbags", 0, 140, 0);
  at("sandbags", -140, 0, 1);
  at("sandbags", 140, -60, 3);
  scatter("military-crate", 14, 30, -40, 60, 30, 101);
  scatter("military-crate", 8, -40, 120, 40, 24, 102);
}

/**
 * Island Superstore (F9), following the concept map: the store in the middle of a large paved
 * lot, car parks north and south (abandoned cars as cover, barrier rows, trolleys), a column of
 * small blocks on the west edge, a row of blocks on the east edge, a large block north-east and a
 * cluster south-east; the service yard on the store's west side.
 */
function superstore(poi: Poi, out: Placement[]) {
  const { at, row, scatter } = builder(poi, out);
  at("superstore", 0, 0, 0);
  // Car parks: barrier rows with cars parked on both sides, nose to the barrier.
  // Car parks: rows of parking bays (abandoned cars nose to nose, about one bay in six taken),
  // a barrier line only along the lot's outer edge, with an entrance in the middle.
  const lot = (z0: number, rows: number, x0: number, x1: number, salt: number) => {
    const dir = Math.sign(z0);
    for (let r = 0; r < rows; r++) {
      const z = z0 + r * 20 * dir;
      for (let x = x0 + 2; x <= x1 - 2; x += 3)
        for (const side of [-1, 1]) {
          if (Math.abs(x - (x0 + x1) / 2) < 10 || hash(salt + r * 31 + side, Math.round(x)) > 0.17)
            continue;
          const pick = hash(salt + 5, Math.round(x * 7 + r + side * 3));
          at(
            pick < 0.4 ? "car-sedan" : pick < 0.75 ? "car-pickup" : "car-cruiser",
            x,
            z + side * 2.8,
            side > 0 ? 1 : 3,
          );
        }
    }
    const edge = z0 + (rows - 1) * 20 * dir + 10 * dir;
    row("jersey", x0, edge, x1, edge, 2.1, 1, [
      [(x0 + x1) / 2 - 6, edge],
      [(x0 + x1) / 2 + 6, edge],
    ]);
  };
  lot(-62, 4, -110, 50, 401);
  lot(60, 7, -120, 120, 402);
  scatter("trolley", 18, 0, 118, 220, 120, 403);
  // West edge: a column of small blocks (map: four light-roofed buildings).
  at("brick-shop", -178, -110, 1);
  at("brick-shop", -178, -70, 1);
  at("abandoned-building", -178, -25, 0);
  at("fire-station", -184, 30, 1);
  at("brick-shop", -178, 95, 1);
  at("warehouse", -178, 165, 0);
  // East edge: a row of blocks, the big north-east block and the south-east cluster.
  at("warehouse", 178, -95, 0);
  at("brick-shop", 178, -35, 1);
  at("brick-shop", 178, 5, 1);
  at("abandoned-building", 178, 50, 0);
  at("fire-station", 110, -160, 0);
  at("brick-shop", 150, 200, 0);
  at("brick-shop", 150, 222, 0);
  at("garage", 182, 210, 1);
  // Service yard on the store's west side.
  for (let i = 0; i < 4; i++) at("container-40", -100 - i * 5, -2, 1);
  for (let i = 0; i < 3; i++) at("dumpsters", -88, 18 + i * 6, 1);
  scatter("pallets", 8, -125, 24, 28, 14, 404);
  scatter("boxes", 6, -125, 24, 28, 14, 405);
  at("forklift", -112, -24, 0);
  at("pallet-truck", -104, -30, 0);
  // The stock room: shelving inside the store (aisles run north–south).
  for (let i = 0; i < 8; i++) at("store-shelves", -45 + i * 9, 0, 0);
  for (let i = 0; i < 6; i++) at("warehouse-rack", 40 + i * 3, -25, 0);
}

/** Island Village (D9): the small grid of houses west of the Superstore. */
function islandVillage(poi: Poi, out: Placement[]) {
  const { at } = builder(poi, out);
  const houses = ["house", "rural-house", "house", "abandoned-building", "rural-house", "house"];
  let k = 0;
  for (let gz = -1; gz <= 1; gz++)
    for (let gx = -1; gx <= 1; gx++) {
      if (gx === 0 && gz === 0) continue; // the crossroads in the middle
      const x = gx * 38,
        z = gz * 34;
      at(
        houses[k++ % houses.length]!,
        x - 6,
        z,
        (gx < 0 ? 1 : gx > 0 ? 3 : gz < 0 ? 0 : 2) as Placement["turn"],
      );
      at("garage", x + 10, z + 6, 0);
      if (hash(501, k) < 0.5) at(hash(502, k) < 0.5 ? "car-sedan" : "car-pickup", x + 12, z - 9, 0);
    }
}

/** West Point (C9/D9): the red-roofed compound at the island's western end. */
function westPoint(poi: Poi, out: Placement[]) {
  const { at } = builder(poi, out);
  at("fire-station", 0, 0, 0);
  at("garage", 24, -8, 1);
  at("container-20", -22, 10, 1);
  at("car-pickup", 18, 12, 0);
}

/**
 * Island Airfield (I9): a small civilian airstrip on the Superstore island, as on the concept
 * map (a Verdansk-style Superstore island, not a military island; the military base is on the
 * mainland at G7): a row of hangars along the north side, the control tower and a few
 * buildings in the middle, fuel and freight. The runway passes ~85 m south-west of the centre.
 */
function airfield(poi: Poi, out: Placement[]) {
  const { at, scatter } = builder(poi, out);
  at("hangar-j", -150, -170, 0);
  at("hangar", -70, -160, 0);
  at("hangar", 5, -160, 0);
  at("hangar-j", 85, -170, 0);
  at("warehouse", 160, -150, 0);
  at("atc-tower", -90, -60, 0);
  at("fire-station", -30, -70, 0);
  at("brick-shop", 30, -60, 0);
  at("warehouse", 100, -60, 1);
  for (let i = 0; i < 3; i++) at("fuel-tank", -160, -90 + i * 14, 0);
  for (let i = 0; i < 3; i++) at("container-20", 160, -90 + i * 4, 0);
  at("container-40", 150, -40, 0);
  at("forklift", 135, -45, 1);
  scatter("pallets", 8, 60, -110, 50, 14, 301);
  scatter("boxes", 6, 60, -110, 50, 14, 302);
  at("car-pickup", -50, -100, 0);
  at("car-sedan", -40, -100, 0);
}

/** Shared context for layouts that need the world beyond their own POI (roads, ground). */
type Context = {
  meta: WorldMeta;
  heightAt: (x: number, z: number) => number;
  /** Land-cover class id (landcover.ts): 0 water, 1 sand, 2 grass, 3 field, 4 forest, … */
  coverAt: (x: number, z: number) => number;
};

/** Road segments bucketed in a 64 m grid (built once per world metadata object). */
const ROAD_CELL = 64;
const roadIndex = new WeakMap<WorldMeta, Map<number, number[]>>();
function roadSegments(meta: WorldMeta) {
  let index = roadIndex.get(meta);
  if (index) return index;
  index = new Map();
  for (const r of meta.roads)
    for (let k = 0; k + 1 < r.points.length; k++) {
      const [ax, az] = r.points[k]!,
        [bx, bz] = r.points[k + 1]!;
      for (
        let cz = Math.floor(Math.min(az, bz) / ROAD_CELL);
        cz <= Math.floor(Math.max(az, bz) / ROAD_CELL);
        cz++
      )
        for (
          let cx = Math.floor(Math.min(ax, bx) / ROAD_CELL);
          cx <= Math.floor(Math.max(ax, bx) / ROAD_CELL);
          cx++
        ) {
          const key = cz * 4096 + cx;
          let list = index.get(key);
          if (!list) index.set(key, (list = []));
          list.push(ax, az, bx, bz);
        }
    }
  roadIndex.set(meta, index);
  return index;
}

/** Distance from a world point to the nearest road centreline, or `limit` if none is closer. */
function roadDistance(meta: WorldMeta, x: number, z: number, limit = 40) {
  const index = roadSegments(meta);
  let best = limit;
  for (
    let cz = Math.floor((z - limit) / ROAD_CELL);
    cz <= Math.floor((z + limit) / ROAD_CELL);
    cz++
  )
    for (
      let cx = Math.floor((x - limit) / ROAD_CELL);
      cx <= Math.floor((x + limit) / ROAD_CELL);
      cx++
    ) {
      const list = index.get(cz * 4096 + cx);
      if (!list) continue;
      for (let k = 0; k < list.length; k += 4) {
        const ax = list[k]!,
          az = list[k + 1]!,
          vx = list[k + 2]! - ax,
          vz = list[k + 3]! - az,
          len2 = vx * vx + vz * vz || 1;
        const u = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / len2));
        best = Math.min(best, Math.hypot(x - ax - vx * u, z - az - vz * u));
      }
    }
  return best;
}

/** Pads are fully flat out to 85% of their radius, then blend into the terrain (build_world.py). */
const FLAT = 0.86;

/**
 * A town on a street grid, following the concept map: lots of `lot` metres inside a radius,
 * every third row and column left open as a street, and no building on a road the map draws.
 * Buildings come from `palette` (each must fit a lot at any quarter turn); a few cars on the
 * streets. `landmarks` are placed first at fixed offsets and keep their lots free.
 */
function town(
  poi: Poi,
  out: Placement[],
  ctx: Context,
  o: {
    /** Defaults to the flat part of the POI's pad. */
    radius?: number;
    palette: string[];
    salt: number;
    lot?: number;
    fill?: number;
    landmarks?: Array<[string, number, number, Placement["turn"], number]>;
    cars?: number;
  },
) {
  const { at } = builder(poi, out);
  const lot = o.lot ?? 32;
  const taken: Array<[number, number, number]> = [];
  for (const [model, dx, dz, turn, r] of o.landmarks ?? []) {
    at(model, dx, dz, turn);
    taken.push([dx, dz, r]);
  }
  const flat = (poi.padRadius ?? 0) * FLAT;
  const radius = Math.min(o.radius ?? flat, flat);
  const n = Math.ceil(radius / lot);
  let cars = 0;
  for (let gz = -n; gz <= n; gz++)
    for (let gx = -n; gx <= n; gx++) {
      const dx = gx * lot,
        dz = gz * lot;
      // The whole lot (not just its centre) must sit on the flattened pad.
      if (Math.hypot(Math.abs(dx) + lot / 2, Math.abs(dz) + lot / 2) > radius) continue;
      const street = gx % 3 === 0 || gz % 3 === 0;
      if (street) {
        // Abandoned cars along the streets (cover between blocks).
        if (
          cars < (o.cars ?? 8) &&
          hash(o.salt + 9, gx * 101 + gz) < 0.18 &&
          gx % 3 === 0 &&
          gz % 3 !== 0
        ) {
          at(hash(o.salt + 10, gx + gz * 7) < 0.5 ? "car-sedan" : "car-pickup", dx + 3, dz, 0);
          cars++;
        }
        continue;
      }
      if (taken.some(([tx, tz, r]) => Math.hypot(dx - tx, dz - tz) < r + lot * 0.6)) continue;
      // Keep the map's roads clear (half a road plus half a house plus a pavement).
      if (roadDistance(ctx.meta, poi.x + dx, poi.z + dz) < 12) continue;
      if (hash(o.salt, gx * 31 + gz * 977) > (o.fill ?? 0.88)) continue;
      const model = o.palette[Math.floor(hash(o.salt + 1, gx * 17 + gz * 13) * o.palette.length)]!;
      // Face the nearer street.
      const turn = (
        Math.abs(gx % 3) === 1 ? (gx > 0 ? 1 : 3) : gz > 0 ? 0 : 2
      ) as Placement["turn"];
      at(model, dx, dz, turn);
    }
}

/** Footprints (x, z extent in m at turn 0, models.json sizes rounded up) of town buildings. */
const FOOT: Record<string, [number, number]> = {
  house: [12.2, 7.7],
  "rural-house": [7.1, 8],
  "rural-wood-1": [21.3, 17.5],
  "rural-wood-4": [27.9, 14.7],
  "rural-store-1": [8.5, 12.8],
  "rural-store-3": [6.3, 13.8],
  "rural-store-5": [8.6, 20.3],
  "brick-shop": [24.4, 7.4],
  "rural-diner": [18.5, 9.2],
  "abandoned-building": [5.6, 7.6],
  "fire-station": [31.5, 23.8],
  garage: [5.3, 8.2],
  "rural-mobile-home": [6.8, 11.6],
  shed: [6.2, 4.2],
  "ind-warehouse-1": [34, 13.6],
  "ind-warehouse-3": [24.6, 25.4],
  warehouse: [16.2, 46.5],
  "ind-generic-2": [5.1, 4.8],
  "rural-quonset": [9.6, 12.7],
  barn: [19, 19],
  "ind-office-trailer": [11.5, 6],
  cabin: [7.8, 9.2],
  "ind-factory": [46.7, 95.5],
  "ind-hangar": [50, 60.2],
  "ind-building-1": [27.2, 47.7],
  "ind-watertower": [10, 10],
  "ind-tank": [17.9, 18],
};
/** A footprint turned by quarter turns: [x extent, z extent]. */
const footAt = (model: string, turn: Placement["turn"]): [number, number] => {
  const [w, d] = FOOT[model] ?? [10, 10];
  return turn % 2 ? [d, w] : [w, d];
};

type TownPalettes = {
  /** Dense blocks (roof density ≥ 0.3): shops, apartments, commercial. */
  core: string[];
  /** Ordinary blocks: houses. */
  homes: string[];
  /** Sparse blocks (< 0.15): farmhouses, sheds, barns. */
  edge: string[];
  /** Blocks from this column eastward use the industrial palette. */
  industryFrom?: number;
  industry?: string[];
};

/**
 * A town on its concept-map street grid (world.v1.json `town`): every built block gets buildings
 * along its four street fronts, facing the street, as many as the block's roof density on the map
 * calls for, with yards between them; sparse blocks get a few farm buildings; parked cars line
 * the streets. `landmarks` (model, x, z offsets from the POI, turn) are placed first. Buildings
 * never overlap (axis-aligned footprints, quarter turns).
 */
function gridTown(
  poi: Poi,
  out: Placement[],
  ctx: Context,
  pal: TownPalettes,
  salt: number,
  landmarks: Array<[string, number, number, Placement["turn"]]> = [],
) {
  const t = poi.town;
  if (!t) return;
  const y = poi.padHeight ?? 0;
  const taken: Array<[number, number, number, number]> = [];
  const free = (x0: number, z0: number, x1: number, z1: number) =>
    !taken.some(([a, b, c, d]) => x0 < c && x1 > a && z0 < d && z1 > b);
  const put = (model: string, x: number, z: number, turn: Placement["turn"], margin = 1.5) => {
    const [w, d] = footAt(model, turn);
    const x0 = x - w / 2 - margin,
      x1 = x + w / 2 + margin,
      z0 = z - d / 2 - margin,
      z1 = z + d / 2 + margin;
    if (!free(x0, z0, x1, z1)) return false;
    taken.push([x0, z0, x1, z1]);
    out.push({ model, x: +x.toFixed(2), y, z: +z.toFixed(2), turn, poi: poi.id });
    return true;
  };
  for (const [model, dx, dz, turn] of landmarks) put(model, poi.x + dx, poi.z + dz, turn, 4);
  const half = t.street / 2 + 3; // half the street plus a pavement
  let n = 0;
  for (const [i, j, dens] of t.blocks) {
    if (dens < 0.08) continue;
    const bx0 = t.xs[i]! + half,
      bx1 = t.xs[i + 1]! - half,
      bz0 = t.zs[j]! + half,
      bz1 = t.zs[j + 1]! - half;
    if (bx1 - bx0 < 14 || bz1 - bz0 < 14) continue;
    const industrial = pal.industryFrom !== undefined && i >= pal.industryFrom && !!pal.industry;
    const palette = industrial
      ? pal.industry!
      : dens >= 0.3
        ? pal.core
        : dens >= 0.15
          ? pal.homes
          : pal.edge;
    // Share of the frontage that is built (the rest is yards and gaps).
    const fill = Math.min(1, Math.max(0.35, dens / 0.3));
    const sides: Array<{ turn: Placement["turn"]; along: "x" | "z"; at: number; inward: 1 | -1 }> =
      [
        { turn: 2, along: "x", at: bz0, inward: 1 }, // north front, faces -z
        { turn: 0, along: "x", at: bz1, inward: -1 }, // south front
        { turn: 3, along: "z", at: bx0, inward: 1 }, // west front, faces -x
        { turn: 1, along: "z", at: bx1, inward: -1 }, // east front
      ];
    for (const [k, side] of sides.entries()) {
      const start = side.along === "x" ? bx0 : bz0,
        end = side.along === "x" ? bx1 : bz1;
      let pos = start + 2 + hash(salt + k, i * 97 + j) * 6;
      let tries = 0;
      while (pos < end - 4 && tries++ < 60) {
        const model = palette[Math.floor(hash(salt + 11, n++) * palette.length)]!;
        const [w, d] = footAt(model, side.turn);
        const front = side.along === "x" ? w : d,
          depth = side.along === "x" ? d : w;
        if (pos + front > end) {
          pos += 3;
          continue;
        }
        const setback = 1.5 + hash(salt + 13, n) * 3.5;
        const across = side.at + side.inward * (setback + depth / 2);
        const cx = side.along === "x" ? pos + front / 2 : across,
          cz = side.along === "x" ? across : pos + front / 2;
        if (hash(salt + 17, n) <= fill) put(model, cx, cz, side.turn);
        // A yard or a driveway between buildings.
        pos += front + 3 + hash(salt + 19, n) * (industrial ? 6 : 10);
      }
    }
    // Back yards: a shed or a garage now and then, inside the block.
    const cx = (bx0 + bx1) / 2,
      cz = (bz0 + bz1) / 2;
    for (let k = 0; k < 3; k++) {
      if (hash(salt + 23, i * 31 + j * 7 + k) > 0.45) continue;
      const model = industrial
        ? "ind-office-trailer"
        : hash(salt + 29, n++) < 0.5
          ? "shed"
          : "garage";
      const ox = (hash(salt + 31, n) - 0.5) * (bx1 - bx0) * 0.4,
        oz = (hash(salt + 37, n) - 0.5) * (bz1 - bz0) * 0.4;
      put(model, cx + ox, cz + oz, (Math.floor(hash(salt + 41, n) * 4) % 4) as Placement["turn"]);
    }
  }
  // Parked cars along the streets (cover between blocks), on the kerb side.
  for (let j = 0; j < t.zs.length; j++)
    for (let x = t.xs[0]! + 20; x < t.xs[t.xs.length - 1]! - 20; x += 23) {
      if (hash(salt + 43, j * 1009 + Math.round(x)) > 0.22) continue;
      const side = hash(salt + 47, j * 13 + Math.round(x)) < 0.5 ? -1 : 1;
      const z = t.zs[j]! + side * (t.street / 2 - 1.3);
      if (!free(x - 3, z - 1.5, x + 3, z + 1.5)) continue;
      const model = hash(salt + 53, Math.round(x) + j) < 0.6 ? "car-sedan" : "car-pickup";
      out.push({ model, x: +x.toFixed(2), y, z: +z.toFixed(2), turn: 1, poi: poi.id });
    }
  void ctx;
}

/** Whether a point lies in a town grid (plus `margin` m). */
function inTown(meta: WorldMeta, x: number, z: number, margin: number) {
  return meta.pois.some((p) => {
    const t = p.town;
    if (!t) return false;
    return (
      x > t.xs[0]! - margin &&
      x < t.xs[t.xs.length - 1]! + margin &&
      z > t.zs[0]! - margin &&
      z < t.zs[t.zs.length - 1]! + margin
    );
  });
}

/** Whether ground at height `h` is under a lake or the sea there. */
function underwater(meta: WorldMeta, x: number, z: number, h: number) {
  if (h < 2) return true;
  for (const w of meta.waterBodies) {
    const [x0, z0, x1, z1] = w.bounds;
    if (x >= x0 && x <= x1 && z >= z0 && z <= z1 && h < w.level + 0.5) return true;
  }
  return false;
}

/** Whether a point is on a runway or within `margin` m of its edge. */
function onRunway(meta: WorldMeta, x: number, z: number, margin: number) {
  return meta.runways.some((r) => {
    const vx = r.b[0] - r.a[0],
      vz = r.b[1] - r.a[1];
    const u = Math.max(
      0,
      Math.min(1, ((x - r.a[0]) * vx + (z - r.a[1]) * vz) / (vx * vx + vz * vz)),
    );
    return Math.hypot(x - r.a[0] - vx * u, z - r.a[1] - vz * u) < r.width / 2 + margin;
  });
}

/** Distance from a point to the nearest bridge or dam centreline. */
function bridgeDistance(meta: WorldMeta, x: number, z: number) {
  let best = Infinity;
  for (const { a, b } of meta.bridges) {
    const vx = b[0] - a[0],
      vz = b[1] - a[1];
    const u = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / (vx * vx + vz * vz)));
    best = Math.min(best, Math.hypot(x - a[0] - vx * u, z - a[1] - vz * u));
  }
  return best;
}

/**
 * Buildings scattered on flat-enough ground around a POI without a pad (cabins, forest camps,
 * quarry benches): each footprint of half-size `foot` must vary by under `flat` metres, be dry,
 * and keep clear of roads, bridges and the dam.
 */
function hamlet(
  poi: Poi,
  out: Placement[],
  ctx: Context,
  o: {
    radius: number;
    palette: string[];
    count: number;
    salt: number;
    /** Centre offset from the POI (m). */
    at?: [number, number];
    foot?: number;
    flat?: number;
  },
) {
  const foot = o.foot ?? 5;
  const flat = o.flat ?? 1.2;
  const [cx, cz] = [poi.x + (o.at?.[0] ?? 0), poi.z + (o.at?.[1] ?? 0)];
  const placed: Array<[number, number]> = [];
  for (let tries = 0; placed.length < o.count && tries < o.count * 60; tries++) {
    const a = hash(o.salt, tries) * Math.PI * 2,
      d = Math.sqrt(hash(o.salt + 1, tries)) * o.radius;
    const x = cx + Math.cos(a) * d,
      z = cz + Math.sin(a) * d;
    if (placed.some(([px, pz]) => Math.hypot(px - x, pz - z) < Math.max(28, foot * 2 + 8)))
      continue;
    const low = buildable(ctx, x, z, foot, flat);
    if (low === null) continue;
    placed.push([x, z]);
    out.push({
      model: o.palette[placed.length % o.palette.length]!,
      x: +x.toFixed(2),
      y: +low.toFixed(2),
      z: +z.toFixed(2),
      turn: (Math.floor(hash(o.salt + 2, tries) * 4) % 4) as Placement["turn"],
      poi: poi.id,
    });
  }
}

/**
 * Redstone Quarry (I2): the terraced pit is carved by the world builder; the processing plant
 * sits on the eastern benches and a small works yard on the south-western rim (as drawn).
 */
function quarry(poi: Poi, out: Placement[], ctx: Context) {
  // Landmarks: the processing hall on the flat pit floor, the big shed and factory on the benches.
  hamlet(poi, out, ctx, {
    radius: 60,
    foot: 30,
    flat: 2,
    count: 1,
    salt: 615,
    palette: ["ind-hangar"],
  });
  hamlet(poi, out, ctx, {
    at: [560, -40],
    radius: 260,
    foot: 24,
    flat: 2.5,
    count: 2,
    salt: 616,
    palette: ["ind-factory", "ind-warehouse-1"],
  });
  hamlet(poi, out, ctx, {
    at: [560, -40],
    radius: 220,
    foot: 13,
    flat: 1.5,
    count: 9,
    salt: 611,
    palette: [
      "ind-warehouse-3",
      "ind-tank",
      "ind-portal-crane",
      "ind-silo",
      "ind-office-trailer",
      "container-40",
    ],
  });
  hamlet(poi, out, ctx, {
    at: [-520, 420],
    radius: 180,
    foot: 7,
    count: 7,
    salt: 612,
    palette: ["ind-office-trailer", "rural-quonset", "ind-generic-2", "garage", "rural-trailer"],
  });
}

/**
 * Iron Peaks (E–F1): sniper positions (spec §3) on the summit perches the world builder flattens
 * (world.v1.json `perches`, highest first): a radio mast on the top summit as the landmark seen
 * across the map, then guard towers and sandbag nests with an ammo crate.
 */
function ironPeaks(poi: Poi, out: Placement[], ctx: Context) {
  (ctx.meta.perches ?? []).forEach(({ x, z, y }, i) => {
    const model = i === 0 ? "radio-mast" : i % 2 ? "watchtower" : "sandbags";
    out.push({ model, x, y, z, turn: 0, poi: poi.id });
    if (model === "sandbags")
      out.push({ model: "military-crate", x: x + 5, y, z, turn: 1, poi: poi.id });
  });
}

/** Old Dam (C5): the dam wall is world data (bridges.ts); a power house and sheds by its ends. */
function oldDam(poi: Poi, out: Placement[], ctx: Context) {
  const dam = ctx.meta.bridges.find((b) => b.id === "old-dam");
  if (!dam) return;
  for (const [end, salt] of [
    [dam.a, 613],
    [dam.b, 614],
  ] as const)
    hamlet(poi, out, ctx, {
      at: [end[0] - poi.x, end[1] - poi.z],
      radius: 160,
      foot: 9,
      flat: 1.5,
      count: 4,
      salt,
      palette: ["ind-warehouse-1", "ind-office-trailer", "ind-generic-2", "shed"],
    });
}

/** Northstar Town (B1–C2): the map's largest street grid; shops and apartments in the dense
 * middle, houses around them, farmhouses on the fringes. */
function northstar(poi: Poi, out: Placement[], ctx: Context) {
  gridTown(
    poi,
    out,
    ctx,
    {
      core: [
        "brick-shop",
        "abandoned-building",
        "rural-store-1",
        "rural-store-5",
        "rural-diner",
        "abandoned-building",
        "rural-wood-1",
        "house",
      ],
      homes: ["house", "rural-house", "house", "rural-wood-1", "rural-store-3", "garage"],
      edge: ["rural-house", "barn", "shed", "rural-wood-4", "rural-mobile-home"],
    },
    601,
    [["fire-station", 0, 0, 0]],
  );
}

/** Millhaven (B3–D4): the industrial town: the water tower over the main street (as drawn), shops
 * and houses in the west and middle, warehouses and a factory in the eastern blocks. */
function millhaven(poi: Poi, out: Placement[], ctx: Context) {
  gridTown(
    poi,
    out,
    ctx,
    {
      core: [
        "brick-shop",
        "rural-store-5",
        "rural-store-1",
        "abandoned-building",
        "rural-wood-1",
        "house",
      ],
      homes: ["house", "rural-house", "rural-store-3", "house", "garage", "rural-wood-4"],
      edge: ["rural-house", "shed", "rural-quonset", "rural-mobile-home"],
      industryFrom: 6,
      industry: [
        "ind-warehouse-1",
        "ind-warehouse-3",
        "warehouse",
        "rural-quonset",
        "ind-warehouse-1",
      ],
    },
    602,
    [
      // Concept map px (356, 335) and (410, 385).
      ["ind-watertower", 322, -398, 0],
      ["ind-factory", 779, 25, 0],
    ],
  );
}

/** Crossroads (E3–F5): the junction town: shops and the diner in the middle, houses and farm
 * buildings toward the fields around it. */
function crossroads(poi: Poi, out: Placement[], ctx: Context) {
  gridTown(
    poi,
    out,
    ctx,
    {
      core: [
        "rural-store-1",
        "rural-store-5",
        "brick-shop",
        "rural-diner",
        "rural-store-3",
        "house",
      ],
      homes: ["house", "rural-house", "garage", "rural-wood-1", "house"],
      edge: ["barn", "rural-house", "shed", "rural-quonset"],
    },
    603,
  );
}

/**
 * Central Hospital (H4): a campus of large blocks (concept map: many blocks inside a ring road),
 * the helipad as its landmark, car parks front and back, ambulance bay by the west wing.
 */
function hospital(poi: Poi, out: Placement[], ctx: Context) {
  const { at, scatter } = builder(poi, out);
  at("ind-building-10", -40, -20, 0);
  at("ind-building-10", 40, -20, 0);
  at("ind-building-1", 0, 60, 1);
  at("ind-terminal", 0, -95, 0);
  at("ind-building-1", 110, -30, 0);
  at("warehouse", -110, -30, 0);
  at("helipad", 110, 50, 0);
  at("ind-generic-2", -110, 40, 0);
  scatter("car-sedan", 12, 0, 130, 120, 40, 604);
  scatter("car-cruiser", 4, -110, 90, 40, 40, 605);
  scatter("car-pickup", 5, 110, -100, 40, 30, 606);
  void ctx;
}

/** Riverwood (H5–I6): the riverside town: houses and gardens on its grid, a few shops along the
 * main road. */
function riverwood(poi: Poi, out: Placement[], ctx: Context) {
  gridTown(
    poi,
    out,
    ctx,
    {
      core: ["rural-store-5", "brick-shop", "house", "rural-store-1", "rural-wood-1"],
      homes: ["house", "rural-house", "house", "rural-mobile-home", "garage", "rural-wood-4"],
      edge: ["rural-house", "barn", "shed", "rural-mobile-home"],
    },
    607,
  );
}

/**
 * Blackwater Prison (E6): the star-shaped wall is world data (walls.ts); inside, three cell
 * blocks around a yard, the admin block by the gate, guard towers in the bastions and a
 * checkpoint outside the north gate.
 */
function prison(poi: Poi, out: Placement[], ctx: Context) {
  const { at } = builder(poi, out);
  at("ind-building-1", -45, 10, 0);
  at("ind-building-1", 45, 10, 0);
  at("ind-building-1", 0, 62, 1);
  at("ind-warehouse-1", 0, -55, 0);
  at("ind-office-trailer", -38, -62, 0);
  // Guard towers just inside the four bastion tips.
  const d = 80;
  for (const [x, z] of [
    [-d, -d],
    [d, -d],
    [-d, d],
    [d, d],
  ])
    at("watchtower", x!, z!, 0);
  at("checkpoint", 10, -PRISON_WALL.side - 14, 0);
  at("jersey", -8, -PRISON_WALL.side - 22, 1);
  at("jersey", 8, -PRISON_WALL.side - 22, 1);
  void ctx;
}

/** East Works (J7): tank farm, cranes and sheds. */
function eastWorks(poi: Poi, out: Placement[], ctx: Context) {
  const { at, scatter } = builder(poi, out);
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 2; j++) at("ind-tank", -80 + i * 24, -70 + j * 24, 0);
  for (let i = 0; i < 6; i++) at("ind-silo", 10 + i * 6, -80, 0);
  at("ind-hangar", 70, 0, 0);
  at("ind-warehouse-3", -60, 50, 0);
  at("ind-portal-crane", 10, 60, 0);
  for (let i = 0; i < 4; i++) at("container-40", 40 + (i % 2) * 14, 50 + Math.floor(i / 2) * 5, 0);
  at("ind-office-trailer", -10, 20, 0);
  scatter("pallets", 8, 0, 100, 60, 20, 608);
  void ctx;
}

/** Murder Cabins (C7) and Pine Ridge (C3/D3): cabins and sheds in the woods (no pad). */
function murderCabins(poi: Poi, out: Placement[], ctx: Context) {
  hamlet(poi, out, ctx, {
    radius: 260,
    palette: ["cabin", "shed", "cabin", "rural-mobile-home", "cabin", "barn"],
    count: 14,
    salt: 609,
  });
}
function pineRidge(poi: Poi, out: Placement[], ctx: Context) {
  hamlet(poi, out, ctx, {
    radius: 220,
    palette: ["cabin", "shed", "rural-wood-4", "cabin"],
    count: 8,
    salt: 610,
  });
}

const LAYOUTS: Record<string, (poi: Poi, out: Placement[], ctx: Context) => void> = {
  "northstar-town": northstar,
  millhaven,
  crossroads,
  "central-hospital": hospital,
  riverwood,
  "blackwater-prison": prison,
  "east-works": eastWorks,
  "murder-cabins": murderCabins,
  "pine-ridge": pineRidge,
  "redstone-quarry": quarry,
  "iron-peaks": ironPeaks,
  "old-dam": oldDam,
  "southern-military-base": militaryBase,
  "island-superstore": superstore,
  "island-village": islandVillage,
  "west-point": westPoint,
  "island-airfield": airfield,
};

/** Ground under a footprint of half-size `foot`: its low point, or null if not buildable. */
function buildable(ctx: Context, x: number, z: number, foot: number, flat: number) {
  const hs = [-foot, 0, foot].flatMap((ox) =>
    [-foot, 0, foot].map((oz) => ctx.heightAt(x + ox, z + oz)),
  );
  const low = Math.min(...hs);
  if (Math.max(...hs) - low > flat || underwater(ctx.meta, x, z, low)) return null;
  if (roadDistance(ctx.meta, x, z) < foot + 6) return null;
  if (bridgeDistance(ctx.meta, x, z) < foot + 14) return null;
  if (onRunway(ctx.meta, x, z, foot + 25)) return null;
  return low;
}

/** Site plans in the site's frame: u along the road, v away from it (m); `foot` half-size. */
type SitePart = { model: string; u: number; v: number; foot: number; chance?: number };
const SITES: Record<string, SitePart[]> = {
  farm: [
    { model: "barn", u: 0, v: 22, foot: 10 },
    { model: "rural-house", u: -30, v: 2, foot: 5 },
    { model: "shed", u: 22, v: 4, foot: 4 },
    { model: "hay-bales", u: 16, v: 38, foot: 3 },
    { model: "hay-bales", u: 22, v: 42, foot: 3, chance: 0.6 },
    { model: "rural-quonset", u: -26, v: 30, foot: 7, chance: 0.4 },
  ],
  house: [
    { model: "rural-house", u: 0, v: 0, foot: 5 },
    { model: "garage", u: 14, v: 4, foot: 4, chance: 0.5 },
    { model: "shed", u: -13, v: 10, foot: 4, chance: 0.4 },
  ],
  shack: [
    { model: "cabin", u: 0, v: 2, foot: 5 },
    { model: "rural-trailer", u: 16, v: 6, foot: 5, chance: 0.5 },
  ],
  mobile: [
    { model: "rural-mobile-home", u: 0, v: 0, foot: 6 },
    { model: "shed", u: 12, v: 8, foot: 4, chance: 0.6 },
  ],
  cabin: [
    { model: "cabin", u: 0, v: 0, foot: 5 },
    { model: "shed", u: 11, v: 9, foot: 4 },
  ],
  // Abandoned compound: a ruin behind a broken barbed fence (rare, worth a detour).
  compound: [
    { model: "rural-wood-4", u: 0, v: 20, foot: 14 },
    { model: "garage", u: 22, v: 6, foot: 4 },
    { model: "rural-trailer", u: -22, v: 6, foot: 5 },
    { model: "barbed-barrier", u: -9, v: 0, foot: 3 },
    { model: "barbed-barrier", u: 9, v: 0, foot: 3, chance: 0.7 },
    { model: "barbed-barrier", u: -9, v: 36, foot: 3, chance: 0.7 },
    { model: "barbed-barrier", u: 9, v: 36, foot: 3 },
  ],
};

/** How far from each POI the countryside stays (m). */
function poiReach(poi: Poi) {
  if (poi.id === "redstone-quarry") return 950;
  return poi.padRadius ? poi.padRadius + 120 : 380;
}

/**
 * Farms, houses, cabins and abandoned compounds along the map's roads between POIs, so rotations
 * have cover and something to check (RESEARCH.md §3: covered traversal). Deterministic: one
 * candidate every 260–560 m along each road, on a hashed side; the land cover picks the kind
 * (fields: farms; grassland: houses, now and then a compound; forest: cabins).
 */
function countryside(out: Placement[], ctx: Context) {
  const { meta } = ctx;
  const sites: Array<[number, number]> = [];
  let salt = 700;
  for (const road of meta.roads) {
    let next = 120 + hash(salt++, 1) * 300;
    let walked = 0;
    for (let k = 0; k + 1 < road.points.length; k++) {
      const [ax, az] = road.points[k]!,
        [bx, bz] = road.points[k + 1]!;
      const len = Math.hypot(bx - ax, bz - az);
      while (len > 0 && walked + len >= next) {
        const t = (next - walked) / len;
        next += 260 + hash(salt++, 2) * 300;
        const dx = (bx - ax) / len,
          dz = (bz - az) / len;
        const first = hash(salt, 3) < 0.5 ? 1 : -1;
        const tx = ax + (bx - ax) * t,
          tz = az + (bz - az) * t;
        salt++;
        // Try both sides of the road at three set-backs; the first that fits is built.
        for (const [side, off] of [
          [first, 34],
          [-first, 34],
          [first, 52],
          [-first, 52],
          [first, 72],
          [-first, 72],
        ] as const) {
          const nx = -dz * side,
            nz = dx * side;
          const cx = tx + nx * off,
            cz = tz + nz * off;
          if (trySite(cx, cz, dx, dz, nx, nz)) break;
        }
      }
      walked += len;
    }
  }

  function trySite(cx: number, cz: number, dx: number, dz: number, nx: number, nz: number) {
    {
      if (Math.abs(cx) > 4800 || Math.abs(cz) > 4800) return false;
      if (meta.pois.some((p) => Math.hypot(p.x - cx, p.z - cz) < poiReach(p))) return false;
      if (inTown(meta, cx, cz, 120)) return false;
      if (sites.some(([x, z]) => Math.hypot(x - cx, z - cz) < 220)) return false;
      const cls = ctx.coverAt(cx, cz);
      const r = hash(salt, 5);
      const kind =
        cls === 3
          ? "farm"
          : cls === 4
            ? "cabin"
            : cls === 2
              ? r < 0.1
                ? "compound"
                : r < 0.45
                  ? "house"
                  : r < 0.7
                    ? "shack"
                    : r < 0.85
                      ? "mobile"
                      : "farm"
              : null;
      if (!kind) return false;
      // Face the road: the quarter turn nearest the road's heading.
      const turn = (((Math.round(Math.atan2(dx, dz) / (Math.PI / 2)) % 4) + 4) %
        4) as Placement["turn"];
      const parts: Placement[] = [];
      let ok = true;
      SITES[kind]!.forEach((part, i) => {
        if (!ok || (part.chance !== undefined && hash(salt + i, 6) > part.chance)) return;
        const x = cx + dx * part.u + nx * part.v,
          z = cz + dz * part.u + nz * part.v;
        const y = buildable(ctx, x, z, part.foot, 1.6);
        if (y === null) {
          if (i === 0) ok = false; // no main building, no site
          return;
        }
        parts.push({
          model: part.model,
          x: +x.toFixed(2),
          y: +y.toFixed(2),
          z: +z.toFixed(2),
          turn,
          poi: "countryside",
        });
      });
      if (!ok || !parts.length) return false;
      sites.push([cx, cz]);
      out.push(...parts);
      if (kind === "farm") paddock(out, ctx, cx + nx * 72, cz + nz * 72, nx, nz);
      return true;
    }
  }
}

/** Length of one fence-rail section (m, along its local x). */
const FENCE = 2.17;

/**
 * A rail-fence paddock behind a farm: an axis-aligned 44 × 32 m rectangle of fence sections
 * (quarter turns only), with a 6 m gate in the side facing the farm (direction -nx, -nz).
 * Sections over water, on a road or against a building are left out.
 */
function paddock(out: Placement[], ctx: Context, cx: number, cz: number, nx: number, nz: number) {
  const hw = 22,
    hd = 16;
  // The gate is on the side whose outward normal points back at the farm.
  const gateSide =
    Math.abs(nx) > Math.abs(nz) ? (nx > 0 ? "west" : "east") : nz > 0 ? "north" : "south";
  const sides: Array<[string, number, number, number, number, Placement["turn"]]> = [
    ["north", -hw, -hd, hw, -hd, 0],
    ["south", -hw, hd, hw, hd, 0],
    ["west", -hw, -hd, -hw, hd, 1],
    ["east", hw, -hd, hw, hd, 1],
  ];
  const near = out.slice(-12); // the farm's own buildings were pushed just before
  for (const [name, x0, z0, x1, z1, turn] of sides) {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const n = Math.round(len / FENCE);
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n;
      const x = cx + x0 + (x1 - x0) * t,
        z = cz + z0 + (z1 - z0) * t;
      if (name === gateSide && Math.abs(t - 0.5) * len < 3) continue;
      // The lower end of the section (a fence on a slope never floats).
      const half = FENCE / 2;
      const y =
        turn === 0
          ? Math.min(ctx.heightAt(x - half, z), ctx.heightAt(x + half, z))
          : Math.min(ctx.heightAt(x, z - half), ctx.heightAt(x, z + half));
      if (underwater(ctx.meta, x, z, y) || roadDistance(ctx.meta, x, z, 8) < 6) continue;
      if (onRunway(ctx.meta, x, z, 25)) continue;
      if (near.some((p) => Math.hypot(p.x - x, p.z - z) < 12)) continue;
      out.push({
        model: "fence-rail",
        x: +x.toFixed(2),
        y: +y.toFixed(2),
        z: +z.toFixed(2),
        turn,
        poi: "countryside",
      });
    }
  }
}

/** Spacing of power-line poles (m) and their set-back from the road centreline. */
export const POWER_LINE = { spacing: 55, offset: 7.5, maxSpan: 70 } as const;

/**
 * Power lines along every road longer than 300 m (spec §4 "power poles"): a pole every 55 m on one
 * side, cross-arm across the road. Poles are pushed in order along each line, so consecutive
 * "power-pole" placements less than POWER_LINE.maxSpan apart are wired (structures-renderer).
 * Gaps where a pole would stand on a pad, a building, a bridge or in water.
 */
function powerLines(out: Placement[], ctx: Context) {
  const { meta } = ctx;
  const buildings = out.filter((p) => p.poi !== "nature");
  let salt = 5000;
  for (const road of meta.roads) {
    let length = 0;
    for (let k = 0; k + 1 < road.points.length; k++)
      length += Math.hypot(
        road.points[k + 1]![0] - road.points[k]![0],
        road.points[k + 1]![1] - road.points[k]![1],
      );
    salt++;
    if (length < 300) continue;
    const side = hash(salt, 1) < 0.5 ? 1 : -1;
    let next = POWER_LINE.spacing / 2,
      walked = 0;
    for (let k = 0; k + 1 < road.points.length; k++) {
      const [ax, az] = road.points[k]!,
        [bx, bz] = road.points[k + 1]!;
      const len = Math.hypot(bx - ax, bz - az);
      while (len > 0 && walked + len >= next) {
        const t = (next - walked) / len;
        next += POWER_LINE.spacing;
        const dx = (bx - ax) / len,
          dz = (bz - az) / len;
        const x = ax + (bx - ax) * t - dz * side * POWER_LINE.offset,
          z = az + (bz - az) * t + dx * side * POWER_LINE.offset;
        // The lowest ground under the footprint (the shaft is off-centre; never floating).
        const y = Math.min(
          ...[-1, 1].flatMap((ox) => [-1, 1].map((oz) => ctx.heightAt(x + ox, z + oz))),
        );
        if (underwater(meta, x, z, y) || bridgeDistance(meta, x, z) < 20) continue;
        if (onRunway(meta, x, z, 30)) continue;
        if (roadDistance(meta, x, z, 8) < 5) continue; // where another road crosses
        if (meta.pois.some((p) => p.padRadius && Math.hypot(p.x - x, p.z - z) < p.padRadius + 5))
          continue;
        if (buildings.some((p) => Math.abs(p.x - x) < 14 && Math.abs(p.z - z) < 14)) continue;
        // Cross-arm (local x) across the road.
        const turn = (((Math.round(Math.atan2(dx, dz) / (Math.PI / 2)) % 4) + 4) %
          4) as Placement["turn"];
        out.push({
          model: "power-pole",
          x: +x.toFixed(2),
          y: +y.toFixed(2),
          z: +z.toFixed(2),
          turn,
          poi: "power",
        });
      }
      walked += len;
    }
  }
}

/** Rock clusters and bush clumps per land-cover class: chance per 60 m cell. */
const NATURE: Record<number, { rocks: number; bushes: number; big: number }> = {
  1: { rocks: 0.03, bushes: 0, big: 0.4 }, // sand: a few coastal boulders
  2: { rocks: 0.1, bushes: 0.22, big: 0.15 }, // grass: cover between POIs
  3: { rocks: 0.05, bushes: 0.12, big: 0.05 }, // fields: field-edge stones and thickets
  4: { rocks: 0.05, bushes: 0.18, big: 0.15 }, // forest: boulders and undergrowth
  5: { rocks: 0.25, bushes: 0.03, big: 0.6 }, // rock: mountains, cliffs, quarry walls
};
const NATURE_CELL = 60;

/**
 * Natural cover over all land (spec §2 "natural cover", RESEARCH.md §3 covered traversal):
 * deterministic per 60 m cell, by land cover. Rocks block movement and bullets; bushes only
 * conceal (no collision). Kept off pads, roads, runways, bridges, water and buildings.
 */
function nature(out: Placement[], ctx: Context) {
  const { meta } = ctx;
  // Existing placements, bucketed, to keep cover 15 m clear of buildings.
  const taken = new Map<number, Array<[number, number]>>();
  const key = (x: number, z: number) =>
    Math.floor(z / NATURE_CELL) * 1000 + Math.floor(x / NATURE_CELL);
  for (const p of out) {
    const k = key(p.x, p.z);
    (taken.get(k) ?? taken.set(k, []).get(k)!).push([p.x, p.z]);
  }
  const nearBuilding = (x: number, z: number) => {
    for (let dz = -1; dz <= 1; dz++)
      for (let dx = -1; dx <= 1; dx++)
        for (const [px, pz] of taken.get(key(x + dx * NATURE_CELL, z + dz * NATURE_CELL)) ?? [])
          if (Math.hypot(px - x, pz - z) < 15) return true;
    return false;
  };
  const blocked = (x: number, z: number) =>
    meta.pois.some((p) => p.padRadius && Math.hypot(p.x - x, p.z - z) < p.padRadius + 10) ||
    inTown(meta, x, z, 10) ||
    onRunway(meta, x, z, 30) ||
    roadDistance(meta, x, z, 10) < 9 ||
    bridgeDistance(meta, x, z) < 25 ||
    nearBuilding(x, z);
  // Half-size and the most ground relief under it each kind tolerates (a rock on a slope
  // steeper than that would be buried on its uphill side).
  const FIT: Record<string, [number, number]> = {
    "rock-big-1": [3.5, 3],
    "rock-big-2": [4.5, 3.5],
    "rock-mid-1": [1.75, 1.6],
    "rock-mid-2": [1.5, 1.4],
    "rock-small": [0.8, 0.7],
    "bush-tall": [1, 1.2],
    "bush-medium": [0.8, 1.2],
    "bush-small": [0.5, 1],
  };
  const place = (model: string, x: number, z: number, sink: number, salt: number) => {
    const [foot, relief] = FIT[model]!;
    const hs = [-foot, foot].flatMap((ox) =>
      [-foot, foot].map((oz) => ctx.heightAt(x + ox, z + oz)),
    );
    const low = Math.min(...hs);
    if (Math.max(...hs) - low > relief || underwater(meta, x, z, low)) return;
    out.push({
      model,
      x: +x.toFixed(2),
      y: +(low - sink).toFixed(2),
      z: +z.toFixed(2),
      turn: (Math.floor(hash(salt, 9) * 4) % 4) as Placement["turn"],
      poi: "nature",
    });
  };
  const n = Math.floor(4800 / NATURE_CELL);
  for (let gz = -n; gz < n; gz++)
    for (let gx = -n; gx < n; gx++) {
      const salt = 900_000 + (gz + n) * 1000 + (gx + n);
      const cx = (gx + hash(salt, 1)) * NATURE_CELL,
        cz = (gz + hash(salt, 2)) * NATURE_CELL;
      const rule = NATURE[ctx.coverAt(cx, cz)];
      if (!rule) continue;
      const roll = hash(salt, 3);
      if (roll < rule.rocks) {
        if (blocked(cx, cz)) continue;
        const big = hash(salt, 4) < rule.big;
        const main = big
          ? hash(salt, 5) < 0.75
            ? "rock-big-1"
            : "rock-big-2"
          : hash(salt, 5) < 0.5
            ? "rock-mid-1"
            : "rock-mid-2";
        // Rocks sit a little into the ground (never floating on a slope).
        place(main, cx, cz, big ? 0.6 : 0.3, salt);
        const smalls = Math.floor(hash(salt, 6) * 3);
        for (let k = 0; k < smalls; k++) {
          const a = hash(salt + k, 7) * Math.PI * 2,
            d = (big ? 7 : 4) + hash(salt + k, 8) * 4;
          const x = cx + Math.cos(a) * d,
            z = cz + Math.sin(a) * d;
          if (!blocked(x, z)) place("rock-small", x, z, 0.15, salt + k * 31);
        }
      } else if (roll < rule.rocks + rule.bushes) {
        // A thicket: 3–5 young conifers within 2.5 m, wide enough to hide a player, plus a tuft.
        const count = 3 + Math.floor(hash(salt, 6) * 3);
        for (let k = 0; k < count; k++) {
          const a = hash(salt + k, 7) * Math.PI * 2,
            d = k === 0 ? 0 : 1.2 + hash(salt + k, 8) * 1.3;
          const x = cx + Math.cos(a) * d,
            z = cz + Math.sin(a) * d;
          if (blocked(x, z)) continue;
          const r = hash(salt + k, 10);
          place(
            k === count - 1 ? "bush-small" : r < 0.55 ? "bush-tall" : "bush-medium",
            x,
            z,
            0.05,
            salt + k * 17,
          );
        }
      }
    }
}

/**
 * Every placement on the island, in a stable order: the POIs, then the countryside between them.
 * `heightAt` is the shared heightfield's ground height and `coverAt` the shared land-cover class.
 */
export function islandLayout(
  meta: WorldMeta,
  heightAt: (x: number, z: number) => number,
  coverAt: (x: number, z: number) => number,
): Placement[] {
  const out: Placement[] = [];
  const ctx: Context = { meta, heightAt, coverAt };
  for (const poi of meta.pois) LAYOUTS[poi.id]?.(poi, out, ctx);
  countryside(out, ctx);
  powerLines(out, ctx);
  nature(out, ctx);
  return out;
}
