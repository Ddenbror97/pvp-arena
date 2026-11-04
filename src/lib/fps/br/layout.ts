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
  // Aircraft hangars on the western service road (north and south of the barracks), a motor
  // pool and a second container stack: big covered loot halls the concept map draws there.
  at("ind-hangar", -90, -125, 0);
  at("hangar", -95, 75, 0);
  for (let i = 0; i < 3; i++) at("radar-truck", -20 + i * 14, -140, 1);
  for (let i = 0; i < 4; i++) at("container-40", 60, 130 + i * 5, 0);
  at("barracks", 130, -10, 0);
  at("barracks", 130, 15, 0);
}

/**
 * Island Superstore (F9), following the concept map (owner, 2026-11-04: "an important part of
 * the map that should be fun to play at … should look like the map"): the concept's complex
 * compressed around our 150 m store inside a ring road (build_world.py SUPERSTORE_RING,
 * x −560…600, z −300…262 m) with a street grid. The store stands in the middle, its service
 * yard behind it and a fire lane in front; painted car parks north and south with abandoned
 * cars, trolleys and lot lights; shop rows (strip malls, a diner, townhouses) facing the lots
 * across the north and south streets; west and east the concept's block columns: large halls
 * and apartment blocks on the inner streets, small shops and houses on the ring road, yards and
 * depots between them with water towers and lookouts as high ground.
 */
function superstore(poi: Poi, out: Placement[]) {
  const { at, scatter } = builder(poi, out);
  at("superstore", 0, 0, 0);
  /** Stack the last placement on what is below it (containers two high). */
  const lift = (dy: number) => (out[out.length - 1]!.y += dy);
  // Shop and house rows: `front` is where the facades stand (a street 6 m away).
  const col = (front: number, turn: 1 | 3, items: Array<[string, number]>) => {
    for (const [m, z] of items) {
      const dx = footAt(m, turn)[0] / 2;
      at(m, turn === 1 ? front - dx : front + dx, z, turn);
    }
  };
  const row = (front: number, turn: 0 | 2, items: Array<[string, number]>) => {
    for (const [m, x] of items) {
      const dz = footAt(m, turn)[1] / 2;
      at(m, x, turn === 0 ? front - dz : front + dz, turn);
    }
  };
  // Car parks: painted double rows of bays (36.4 × 10.6 m modules), abandoned cars parked in
  // about one bay in `fill`, a lot light between every other pair of modules.
  let lights = 0;
  const lot = (xs: number[], zs: number[], fill: number, salt: number) => {
    for (const z of zs)
      xs.forEach((x, i) => {
        at("lot-lines", x, z, 0);
        if (i % 2 === 1 && i < xs.length - 1 && Math.abs(x + 20) > 10) {
          at("lot-light", x + 20, z, 0);
          lights++;
        }
        for (let b = 0; b < 13; b++)
          for (const side of [-1, 1]) {
            const h = hash(salt + Math.round(z), Math.round(x) * 31 + b * 2 + side);
            if (h > fill) continue;
            const pick = hash(salt + 7, Math.round(x) * 13 + b + side * 5 + Math.round(z));
            at(
              pick < 0.4 ? "car-sedan" : pick < 0.75 ? "car-pickup" : "car-cruiser",
              x - 18.2 + (b + 0.5) * 2.8,
              z + side * 2.7,
              side > 0 ? 1 : 3,
            );
          }
      });
  };
  const lotXs = [-224, -184, -144, -104, -64, -24, 24, 64, 104, 144, 184, 224];
  lot(lotXs, [-125, -150, -175, -200, -225], 0.12, 411);
  lot(lotXs, [80, 102, 124, 146], 0.16, 412);
  scatter("trolley", 26, 0, 53, 170, 12, 403);
  scatter("trolley", 10, 0, -240, 400, 14, 406);
  // Service yard behind the store (inside the loop road): trailers at the docks, two of them
  // stacked, dumpsters, pallets, the forklift.
  for (let i = 0; i < 6; i++) {
    at("container-40", -62 + i * 9, -55, 1);
    if (i === 1 || i === 4) {
      at("container-40", -62 + i * 9, -55, 1);
      lift(4.2);
    }
  }
  for (let i = 0; i < 3; i++) at("dumpsters", 30 + i * 7, -50, 0);
  scatter("pallets", 10, 55, -75, 40, 22, 404);
  scatter("boxes", 6, -40, -80, 50, 14, 405);
  at("forklift", 40, -62, 0);
  at("pallet-truck", 48, -66, 1);
  // The stock room: shelving inside the store (aisles run north–south).
  for (let i = 0; i < 8; i++) at("store-shelves", -45 + i * 9, 0, 0);
  for (let i = 0; i < 6; i++) at("warehouse-rack", 40 + i * 3, -25, 0);

  // North shop row (backs to the ring road, fronts to the north car park).
  row(-276, 0, [
    ["strip-mall", -200],
    ["strip-mall", -140],
    ["rural-diner", -75],
    ["townhouse", 60],
    ["townhouse", 78],
    ["strip-mall", 140],
    ["strip-mall", 200],
  ]);
  // South shop row (across the south street from the south car park).
  row(166, 2, [
    ["strip-mall", -200],
    ["strip-mall", -140],
    ["rural-diner", -75],
    ["townhouse", -40],
    ["strip-mall", 60],
    ["strip-mall", 120],
    ["apartment", 175],
    ["apartment", 205],
    ["townhouse", 232],
  ]);
  // West blocks: small shops and houses on the ring road, halls and flats on the inner street.
  col(-554, 3, [
    ["townhouse", -270],
    ["bungalow", -245],
    ["townhouse", -220],
    ["police-station", -190],
    ["townhouse", -155],
    ["bungalow", -130],
    ["townhouse", -100],
    ["bauhaus-block", -68],
    ["townhouse", -30],
    ["bungalow", 25],
    ["townhouse", 50],
    ["bungalow", 80],
    ["townhouse", 110],
    ["bungalow", 138],
  ]);
  col(-256, 1, [
    ["ind-warehouse-3", -265],
    ["fire-station", -222],
    ["apartment", -185],
    ["apartment", -158],
    ["strip-mall", -115],
    ["strip-mall", -62],
    ["ind-building-1", -10],
    ["strip-mall", 35],
    ["ind-warehouse-1", 82],
    ["apartment", 115],
    ["townhouse", 140],
  ]);
  // East blocks, the same pattern (warehouses at the north end of the ring road).
  col(256, 3, [
    ["ind-warehouse-3", -265],
    ["police-station", -228],
    ["strip-mall", -185],
    ["strip-mall", -132],
    ["apartment", -92],
    ["apartment", -65],
    ["fire-station", -20],
    ["ind-building-1", 22],
    ["strip-mall", 70],
    ["ind-warehouse-3", 112],
    ["townhouse", 140],
  ]);
  at("warehouse", 586, -262, 0);
  at("warehouse", 586, -205, 0);
  col(594, 1, [
    ["townhouse", -165],
    ["bungalow", -140],
    ["townhouse", -115],
    ["bauhaus-block", -85],
    ["townhouse", -55],
    ["bungalow", -30],
    ["townhouse", -5],
    ["bungalow", 20],
    ["townhouse", 45],
    ["bungalow", 70],
    ["townhouse", 95],
    ["bungalow", 120],
    ["townhouse", 145],
  ]);
  // South-west and south-east corner blocks on the south street.
  row(166, 2, [
    ["brick-shop", -530],
    ["brick-shop", -500],
    ["apartment", -460],
    ["bauhaus-block", -420],
    ["strip-mall", -350],
    ["townhouse", -300],
    ["townhouse", -285],
    ["strip-mall", 300],
    ["strip-mall", 350],
    ["apartment", 410],
    ["apartment", 440],
    ["bauhaus-block", 480],
    ["fire-station", 540],
  ]);
  at("ind-warehouse-3", 320, 232, 0);
  at("ind-warehouse-3", -330, 232, 0);
  // Yards between the block columns: small car parks, depots, high ground.
  lot([-470, -430, -390, -350], [-230, -175, -120], 0.12, 413);
  lot([-410, -370], [40, 100], 0.2, 417);
  lot([350, 390, 430, 470, 510], [-230, -175], 0.12, 414);
  lot([430], [40], 0.2, 418);
  at("ind-warehouse-1", -430, -60, 0);
  at("ind-warehouse-1", 450, -120, 0);
  lot([-150, 100], [225], 0.2, 415);
  lot([430], [225], 0.2, 416);
  at("water-tower", -470, -150, 0);
  at("water-tower", 470, 95, 0);
  at("lookout", -365, 75, 0);
  // The climbable mast over the west yard: a sniper's view over the lots and the store roof.
  at("sniper-mast", -372, -40, 0);
  at("lookout", 365, -40, 0);
  for (let i = 0; i < 4; i++) {
    at("container-40", -480, -20 + i * 5, 0);
    at("container-40", 380, 130 + i * 5, 0);
    if (i % 2) {
      at("container-40", 380, 130 + i * 5, 0);
      lift(4.2);
    }
  }
  for (let i = 0; i < 4; i++) at("rural-trailer", 470 + i * 5, -95, 0);
  at("fuel-tank", 520, 30, 0);
  at("fuel-tank", 520, 45, 0);
  for (const [x, z] of [
    [-380, -60],
    [-380, 150],
    [380, -260],
    [380, 150],
    [-60, 240],
    [200, 240],
  ])
    at("dumpsters", x!, z!, 0);
  scatter("pallets", 8, -480, 60, 40, 30, 407);
  scatter("boxes", 6, 380, 80, 40, 30, 408);
  // Street furniture: lamps along the inside of the ring road, bus stops at its entrances,
  // bins and picnic tables by the shop rows.
  for (let x = -520; x <= 560; x += 45) {
    if (Math.abs(x - 88) < 12 || Math.abs(x) < 8 || Math.abs(Math.abs(x) - 250) < 8) continue;
    at("street-lamp", x, -300 + 5.5 - 1.5, 1);
    if (Math.abs(x + 103) > 12 && Math.abs(x - 141) > 12) at("street-lamp", x, 262 - 5.5 + 1.5, 3);
  }
  at("bus-stop", -545, 14, 0);
  at("bus-stop", 100, -294, 1);
  at("bus-stop", -120, 256, 1);
  for (const x of [-200, -140, 140, 200, 60, 120]) {
    at("trash-can", x - 25, -265, 0);
    at("trash-can", x - 25, 158 - 1.5 + 13, 0);
  }
  for (const [x, z] of [
    [-62, -262],
    [-56, -262],
    [-88, 178],
    [-62, 182],
  ])
    at("picnic-table", x!, z!, 0);
  void lights;
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
  "container-40": [12.2, 3.8],
  "container-20": [6, 3.2],
  "ind-silo": [3.2, 3.4],
  "fuel-tank": [8, 9.2],
  "rural-trailer": [3, 10.1],
  dumpsters: [5.1, 2.2],
  "hay-bales": [3.7, 2.6],
  "car-cruiser": [5.3, 2],
  "car-pickup": [5.1, 2.2],
  sandbags: [9.3, 10.4],
  "barbed-barrier": [5.4, 1.8],
  forklift: [1.2, 3.4],
  pallets: [2.6, 3.9],
  jersey: [1, 2.2],
  "bauhaus-block": [18.2, 10.9],
  // 20 × 12 m walls; the balcony band adds 1.4 m on its front (kept symmetric here).
  apartment: [20.4, 15.2],
  townhouse: [10.2, 10.2],
  bungalow: [11.4, 8.2],
  "police-station": [18.2, 12.2],
  // The canopy and the roof stair stick out: front +9.8 m, east +23.3 m (kept symmetric).
  "strip-mall": [46.6, 19.6],
  // The owner's 2026-11-04 downloads (art/br/assets/kit.json).
  church: [8.6, 10.4],
  playground: [9, 6.8],
  gazebo: [3.6, 4.3],
  "picnic-table": [1.9, 1.9],
  trampoline: [3.4, 3.4],
  "dog-house": [1.2, 1.4],
  "trash-can": [1.1, 0.9],
  "phone-booth": [1, 1],
  "bus-stop": [2.2, 4.4],
  "gas-pump": [0.7, 0.4],
  "grain-silo": [6.7, 6.7],
  "silo-cluster": [24.7, 34.7],
  "old-barn": [16, 12.1],
  "orchard-tree": [3.2, 4],
  "chicken-coop": [3.5, 3.1],
  "sniper-mast": [7, 7],
  lighthouse: [28.6, 20.6],
  "tower-crane": [7.7, 7.7],
  "dump-truck": [2.5, 6.5],
};
/** A footprint turned by quarter turns: [x extent, z extent]. */
const footAt = (model: string, turn: Placement["turn"]): [number, number] => {
  const [w, d] = FOOT[model] ?? [10, 10];
  return turn % 2 ? [d, w] : [w, d];
};

/** A street block's buildable area (inside the pavements), world coordinates. */
type Block = { x0: number; z0: number; x1: number; z1: number; cx: number; cz: number };
/** Put a model at (x, z) with a quarter turn unless it would overlap; true when placed. */
type Put = (
  model: string,
  x: number,
  z: number,
  turn: Placement["turn"],
  margin?: number,
  /** Stack on what is below (m above the pad), skipping the overlap test. */
  lift?: number,
) => boolean;
/**
 * A town's own character (owner, 2026-11-04: "should not be generic towns"): a block near
 * `near` (m from the POI) is given over to `build` instead of the usual frontage.
 */
type Feature = { near: [number, number]; build: (b: Block, put: Put) => void };

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
  features: Feature[] = [],
) {
  const t = poi.town;
  if (!t) return;
  const y = poi.padHeight ?? 0;
  const taken: Array<[number, number, number, number]> = [];
  const free = (x0: number, z0: number, x1: number, z1: number) =>
    !taken.some(([a, b, c, d]) => x0 < c && x1 > a && z0 < d && z1 > b);
  const put: Put = (model, x, z, turn, margin = 1.5, lift = 0) => {
    if (lift > 0) {
      out.push({ model, x: +x.toFixed(2), y: y + lift, z: +z.toFixed(2), turn, poi: poi.id });
      return true;
    }
    const [w, d] = footAt(model, turn);
    // Only on the flat pad (a lot at a block's edge can run onto the pad's blend).
    for (const [cx, cz] of [
      [x - w / 2, z - d / 2],
      [x + w / 2, z - d / 2],
      [x - w / 2, z + d / 2],
      [x + w / 2, z + d / 2],
    ] as const)
      if (Math.abs(ctx.heightAt(cx, cz) - y) > 1.2) return false;
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
  const blockOf = (i: number, j: number): Block => {
    const x0 = t.xs[i]! + half,
      x1 = t.xs[i + 1]! - half,
      z0 = t.zs[j]! + half,
      z1 = t.zs[j + 1]! - half;
    return { x0, z0, x1, z1, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2 };
  };
  // Feature blocks first: the built block nearest each feature's point.
  const used = new Set<string>();
  for (const f of features) {
    let best: [number, number] | null = null,
      bestD = Infinity;
    for (const [i, j, dens] of t.blocks) {
      const b = blockOf(i, j);
      if (dens < 0.08 || used.has(`${i},${j}`) || b.x1 - b.x0 < 40 || b.z1 - b.z0 < 40) continue;
      const d = Math.hypot(b.cx - poi.x - f.near[0], b.cz - poi.z - f.near[1]);
      if (d < bestD) [best, bestD] = [[i, j], d];
    }
    if (!best) continue;
    used.add(`${best[0]},${best[1]}`);
    f.build(blockOf(best[0], best[1]), put);
  }
  let n = 0;
  for (const [i, j, dens] of t.blocks) {
    if (dens < 0.08 || used.has(`${i},${j}`)) continue;
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
    // Gardens in the housing blocks: a trampoline, a dog house, a picnic table now and then.
    if (palette === pal.homes)
      for (const [k, model] of (["trampoline", "dog-house", "picnic-table"] as const).entries()) {
        if (hash(salt + 59 + k, i * 37 + j) > 0.45) continue;
        const ox = (hash(salt + 61 + k, n) - 0.5) * (bx1 - bx0) * 0.5,
          oz = (hash(salt + 67 + k, n) - 0.5) * (bz1 - bz0) * 0.5;
        put(model, cx + ox, cz + oz, 0, 0.5);
        n++;
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
  streetFurniture(poi, out, ctx, t, put, salt);
}

/**
 * Street furniture along a town's streets (owner, 2026-11-04 downloads): lamps every ~42 m on
 * alternating pavements (the arm over the road), bins and phone booths at some corners, bus
 * stops on the long streets. Placed through the town's `put`, so never into a building.
 */
function streetFurniture(
  poi: Poi,
  out: Placement[],
  ctx: Context,
  t: NonNullable<Poi["town"]>,
  put: Put,
  salt: number,
) {
  const off = t.street / 2 + 1.4;
  const nearCross = (v: number, lines: number[]) => lines.some((c) => Math.abs(c - v) < 9);
  // The lamp's pole is 1.9 m from its centre, its arm pointing along local +x.
  for (const [j, z] of t.zs.entries())
    for (let x = t.xs[0]! + 21, k = 0; x < t.xs[t.xs.length - 1]! - 10; x += 42, k++) {
      if (nearCross(x, t.xs) || hash(salt + 71, j * 211 + k) < 0.15) continue;
      const side = k % 2 ? 1 : -1; // +1: south pavement, arm to −z
      put("street-lamp", x, z + side * (off - 1.9), side > 0 ? 1 : 3, 0.2);
    }
  for (const [i, x] of t.xs.entries())
    for (let z = t.zs[0]! + 21, k = 0; z < t.zs[t.zs.length - 1]! - 10; z += 42, k++) {
      if (nearCross(z, t.zs) || hash(salt + 73, i * 211 + k) < 0.15) continue;
      const side = k % 2 ? 1 : -1; // +1: east pavement, arm to −x
      put("street-lamp", x + side * (off - 1.9), z, side > 0 ? 2 : 0, 0.2);
    }
  // Corners: a bin on one in three, a phone booth on one in eight.
  for (const [i, x] of t.xs.entries())
    for (const [j, z] of t.zs.entries()) {
      const r = hash(salt + 79, i * 53 + j);
      const cx = x + off + 1.5,
        cz = z + off + 1.5;
      if (r < 0.33) put("trash-can", cx, cz, 0, 0.2);
      else if (r < 0.45) put("phone-booth", cx, cz, 0, 0.2);
    }
  // Bus stops on the two longest east–west streets (the middle ones), every ~260 m.
  const mid = Math.floor(t.zs.length / 2);
  for (const j of [mid - 1, mid]) {
    const z = t.zs[j];
    if (z === undefined) continue;
    for (let x = t.xs[0]! + 60, k = 0; x < t.xs[t.xs.length - 1]! - 30; x += 260, k++)
      if (!nearCross(x, t.xs)) put("bus-stop", x, z + (k % 2 ? 1 : -1) * (off + 1.2), 1, 0.3);
  }
  void out;
  void ctx;
  void poi;
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
  // The factory is 47 × 95 m: sampled at its own half length, or a bench edge ends under it.
  hamlet(poi, out, ctx, {
    at: [560, -40],
    radius: 260,
    foot: 48,
    flat: 2.5,
    count: 1,
    salt: 616,
    palette: ["ind-factory"],
  });
  hamlet(poi, out, ctx, {
    at: [560, -40],
    radius: 260,
    foot: 17,
    flat: 2.5,
    count: 1,
    salt: 617,
    palette: ["ind-warehouse-1"],
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

/**
 * Town features (owner, 2026-11-04: "should not be generic towns"). Block edges: z0 is the north
 * street; turn 0 faces +z (south), 1 faces +x (east), 2 faces −z, 3 faces −x.
 */
/** Northstar's town square: fire station, shops and diner round a plaza the police held
 * (cruisers, jersey-barrier lines, sandbags, wire). */
const townSquare: Feature["build"] = (b, put) => {
  put("fire-station", b.cx, b.z0 + 13, 0, 1);
  for (let x = b.x0 + 14; x + 12 < b.x1; x += 27) put("brick-shop", x, b.z1 - 5, 2, 1);
  put("police-station", b.x0 + 6.5, b.cz + 6, 1, 1);
  put("rural-store-5", b.x1 - 7, b.cz + 6, 3, 1);
  for (const [dx, dz, turn] of [
    [-14, 0, 1],
    [14, 8, 1],
    [-4, 18, 0],
    [8, -6, 0],
    [22, -4, 1],
    [-22, 14, 1],
  ] as const)
    put("car-cruiser", b.cx + dx, b.cz + 10 + dz, turn, 0.6);
  for (let k = -4; k <= 4; k++) put("jersey", b.cx + k * 2.3, b.cz + 36, 1, 0.1);
  for (let k = -3; k <= 3; k++) put("jersey", b.cx - 30, b.cz + 10 + k * 2.3, 0, 0.1);
  put("sandbags", b.cx + 32, b.cz + 4, 0, 0.5);
  put("barbed-barrier", b.cx, b.cz + 42, 0, 0.3);
};
/**
 * Apartment blocks along both long fronts of a block, balconies to the street, a car park
 * between the rows: our enterable 4-storey block (art/blender/br/build_apartment.mjs: stairwell,
 * corridor, three flats a floor), every third one the Bauhaus shell (solid) for variety.
 */
const apartments: Feature["build"] = (b, put) => {
  let k = 0;
  for (let x = b.x0 + 12; x + 10 < b.x1; x += 27) {
    const model = () => (k % 3 === 2 ? "bauhaus-block" : "apartment");
    put(model(), x, b.z0 + 8.5, 2, 1.5);
    k++;
    if (b.z1 - b.z0 > 70) {
      put(model(), x, b.z1 - 8.5, 0, 1.5);
      k++;
    }
    if (hash(721, k) < 0.6) put("car-sedan", x + 3, b.cz, 1, 0.6);
    if (hash(722, k) < 0.4) put("car-pickup", x - 5, b.cz + 6, 1, 0.6);
  }
};
/** A town's police station (our enterable two-storey station) facing the street, cruisers
 * parked in front, a jersey-barrier line and a car park behind. */
const policeBlock: Feature["build"] = (b, put) => {
  put("police-station", b.cx, b.z0 + 7.5, 2, 1.5);
  for (let i = 0; i < 4; i++) put("car-cruiser", b.cx - 9 + i * 6, b.z0 + 17, 1, 0.6);
  for (let i = -4; i <= 4; i++) put("jersey", b.cx + i * 2.3, b.z0 + 21, 1, 0.1);
  put("car-sedan", b.cx + 14, b.cz + 4, 1, 0.6);
};
/** Millhaven's rail yard: rows of containers, some stacked two high, forklifts and pallets. */
const containerYard: Feature["build"] = (b, put) => {
  // At most 130 × 90 m in the block's middle (a yard, not a city of containers).
  const x0 = Math.max(b.x0 + 10, b.cx - 65),
    x1 = Math.min(b.x1 - 10, b.cx + 65),
    z0 = Math.max(b.z0 + 8, b.cz - 45),
    z1 = Math.min(b.z1 - 8, b.cz + 45);
  let k = 0;
  for (let z = z0; z < z1; z += 11)
    for (let x = x0; x < x1; x += 15) {
      k++;
      if (hash(701, k) < 0.2) continue;
      const big = hash(702, k) < 0.7;
      if (!put(big ? "container-40" : "container-20", x, z, 0, 0.8)) continue;
      if (big && hash(703, k) < 0.35) put("container-40", x, z, 0, 0, 4.2);
      if (hash(704, k) < 0.15) put("forklift", x, z + 5, 1, 0.3);
      else if (hash(705, k) < 0.2) put("pallets", x + 4, z + 5, 1, 0.3);
    }
};
/** Millhaven's grain elevator: silo rows, two tanks, huts and a loading yard. */
const grainElevator: Feature["build"] = (b, put) => {
  for (let r = 0; r < 2; r++)
    for (let c = 0; c < 6; c++) put("ind-silo", b.cx - 12 + c * 4.6, b.cz - 20 + r * 5, 0, 0.6);
  put("ind-tank", b.cx - 28, b.cz + 16, 0, 1);
  put("ind-tank", b.cx + 4, b.cz + 16, 0, 1);
  put("rural-quonset", b.cx + 30, b.cz - 18, 0, 1);
  put("rural-quonset", b.cx + 30, b.cz + 4, 0, 1);
  put("ind-office-trailer", b.cx - 30, b.cz - 20, 0, 1);
  for (let k = 0; k < 4; k++) put("pallets", b.cx - 10 + k * 4, b.cz + 34, 0, 0.3);
  put("forklift", b.cx + 10, b.cz + 34, 1, 0.3);
  put("grain-silo", b.cx - 40, b.cz - 20, 0, 1);
  put("grain-silo", b.cx - 40, b.cz - 10, 0, 1);
};
/** Crossroads' truck stop at the junction: the diner, fuel tanks, parked rigs and pickups. */
const truckStop: Feature["build"] = (b, put) => {
  put("rural-diner", b.cx - 10, b.z0 + 6, 2, 1);
  put("dumpsters", b.cx - 10, b.z0 + 16, 0, 0.5);
  put("fuel-tank", b.cx + 18, b.cz - 6, 0, 1);
  put("fuel-tank", b.cx + 30, b.cz - 6, 0, 1);
  for (let k = 0; k < 4; k++) put("rural-trailer", b.cx - 24 + k * 7, b.cz + 18, 0, 0.8);
  for (let k = 0; k < 4; k++) put("car-pickup", b.cx + 12 + k * 7, b.cz + 20, 0, 0.6);
  put("rural-store-1", b.x1 - 8, b.cz, 3, 1);
  for (let k = 0; k < 3; k++)
    for (const dz of [0, 5]) put("gas-pump", b.cx + 6 + k * 4, b.z0 + 14 + dz, 0, 0.3);
};
/** Crossroads' farm market: two barns, hay stacks, a hut and pickups. */
const farmMarket: Feature["build"] = (b, put) => {
  put("barn", b.cx - 16, b.cz - 12, 0, 1);
  put("barn", b.cx + 16, b.cz - 12, 0, 1);
  put("rural-quonset", b.cx, b.cz + 22, 0, 1);
  for (let k = 0; k < 8; k++)
    put("hay-bales", b.cx - 30 + (k % 4) * 6, b.cz + 10 + Math.floor(k / 4) * 5, 0, 0.3);
  put("car-pickup", b.cx + 22, b.cz + 14, 1, 0.6);
  put("car-pickup", b.cx + 28, b.cz + 14, 1, 0.6);
  // The concrete silo cluster: Crossroads' landmark over the fields.
  if (!put("silo-cluster", b.x1 - 16, b.z1 - 20, 0, 1))
    put("silo-cluster", b.x0 + 16, b.z1 - 20, 0, 1);
};
/**
 * A town park (owner, 2026-11-04 downloads): the church on the street with its steeple as a
 * landmark, a playground, a gazebo, picnic tables, apple trees and bins.
 */
const park: Feature["build"] = (b, put) => {
  put("church", b.cx - 18, b.z0 + 7, 2, 1.5);
  put("playground", b.cx + 14, b.cz - 4, 0, 1);
  put("gazebo", b.cx - 14, b.cz + 14, 0, 1);
  for (const [dx, dz] of [
    [6, 16],
    [12, 20],
    [-4, 24],
    [22, 12],
  ] as const)
    put("picnic-table", b.cx + dx, b.cz + dz, 0, 0.6);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    put("orchard-tree", b.cx + Math.cos(a) * 30, b.cz + Math.sin(a) * 24, 0, 0.5);
  }
  put("trash-can", b.cx + 2, b.cz + 10, 0, 0.3);
  put("trash-can", b.cx - 24, b.cz + 6, 0, 0.3);
};
/**
 * Northfield's building site: a tower crane over a half-built block (foundations and the
 * container site office), dump trucks, pallets and a jersey-barrier fence.
 */
const constructionSite: Feature["build"] = (b, put) => {
  put("tower-crane", b.cx - 10, b.cz, 1, 1);
  put("soil-patch", b.cx + 14, b.cz - 12, 0, 0.2);
  put("soil-patch", b.cx + 14, b.cz + 2, 0, 0.2);
  put("container-20", b.cx + 32, b.cz - 20, 0, 0.6);
  put("container-20", b.cx + 32, b.cz - 15, 0, 0.6);
  put("dump-truck", b.cx + 30, b.cz + 10, 0, 0.6);
  put("dump-truck", b.cx - 30, b.cz + 22, 1, 0.6);
  put("forklift", b.cx + 4, b.cz + 22, 1, 0.3);
  for (let k = 0; k < 4; k++) put("pallets", b.cx - 4 + k * 4, b.cz + 28, 0, 0.3);
  for (let k = -6; k <= 6; k++) put("jersey", b.cx + k * 2.3, b.z0 + 4, 1, 0.1);
};
/** Riverwood's trailer park: mobile homes in rows with sheds and pickups between. */
const trailerPark: Feature["build"] = (b, put) => {
  const x0 = Math.max(b.x0 + 6, b.cx - 70),
    x1 = Math.min(b.x1 - 6, b.cx + 70),
    z0 = Math.max(b.z0 + 9, b.cz - 45),
    z1 = Math.min(b.z1 - 9, b.cz + 45);
  let k = 0;
  for (let z = z0; z < z1; z += 17)
    for (let x = x0; x < x1; x += 12) {
      k++;
      const r = hash(711, k);
      if (r < 0.62) put("rural-mobile-home", x, z, hash(712, k) < 0.5 ? 0 : 2, 0.8);
      else if (r < 0.74) put("shed", x, z, 0, 0.8);
      else if (r < 0.86) put("car-pickup", x, z, 1, 0.6);
      else if (r < 0.92) put("rural-trailer", x, z, 0, 0.8);
    }
};

/** Northstar Town (B1–C2): the map's largest street grid; the town square (fire station and a
 * police checkpoint) in the middle, shops and apartments around it, houses, farmhouses on the
 * fringes. Apartment blocks cannot be entered, so they are a minority (one in the core palette). */
function northstar(poi: Poi, out: Placement[], ctx: Context) {
  gridTown(
    poi,
    out,
    ctx,
    {
      core: [
        "brick-shop",
        "townhouse",
        "rural-store-1",
        "rural-store-5",
        "rural-diner",
        "rural-store-3",
        "rural-wood-1",
        "house",
        "townhouse",
        "townhouse",
      ],
      homes: [
        "house",
        "rural-house",
        "house",
        "rural-wood-1",
        "rural-store-3",
        "garage",
        "bungalow",
        "bungalow",
      ],
      edge: ["rural-house", "barn", "shed", "rural-wood-4", "rural-mobile-home"],
    },
    601,
    [],
    [
      { near: [0, 0], build: townSquare },
      { near: [-250, 150], build: apartments },
      { near: [250, -150], build: apartments },
      { near: [-120, -60], build: park },
    ],
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
        "townhouse",
        "rural-wood-1",
        "house",
        "townhouse",
        "townhouse",
      ],
      homes: [
        "house",
        "rural-house",
        "rural-store-3",
        "house",
        "garage",
        "rural-wood-4",
        "bungalow",
        "bungalow",
      ],
      edge: ["rural-house", "shed", "rural-quonset", "rural-mobile-home"],
      industryFrom: 6,
      industry: [
        "ind-warehouse-1",
        "ind-warehouse-3",
        "ind-warehouse-3",
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
    [
      { near: [560, -250], build: containerYard },
      { near: [-450, 150], build: grainElevator },
      { near: [-150, -150], build: apartments },
      { near: [150, 100], build: policeBlock },
      { near: [-60, 200], build: park },
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
        "townhouse",
        "townhouse",
      ],
      homes: ["house", "rural-house", "garage", "rural-wood-1", "house", "bungalow", "bungalow"],
      edge: ["barn", "rural-house", "shed", "rural-quonset"],
    },
    603,
    [],
    [
      { near: [0, 0], build: truckStop },
      { near: [350, 250], build: farmMarket },
      { near: [-200, -100], build: policeBlock },
      { near: [120, -120], build: park },
    ],
  );
}

/**
 * Central Hospital (H4): a campus of large blocks (concept map: many blocks inside a ring road):
 * two main wings around a courtyard, the north wing, the entrance hall, east and west blocks, the
 * outer ring of staff blocks, ambulance station and pharmacy; two helipads, car parks all round.
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
  // Campus outer ring: the ambulance station on the west, staff and clinic blocks to the south,
  // a pharmacy by the main entrance and a second helipad.
  at("fire-station", -110, 62, 0);
  at("ind-building-1", -80, -112, 1);
  at("ind-building-1", 50, -152, 1);
  at("brick-shop", -40, -142, 0);
  at("helipad", 160, 50, 0);
  scatter("car-sedan", 8, -35, -175, 50, 20, 607);
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
      core: [
        "rural-store-5",
        "brick-shop",
        "house",
        "rural-store-1",
        "rural-wood-1",
        "townhouse",
        "townhouse",
      ],
      homes: [
        "house",
        "rural-house",
        "house",
        "rural-mobile-home",
        "garage",
        "rural-wood-4",
        "bungalow",
        "bungalow",
      ],
      edge: ["rural-house", "barn", "shed", "rural-mobile-home"],
    },
    607,
    [],
    [
      { near: [-350, 150], build: trailerPark },
      { near: [100, -50], build: policeBlock },
      { near: [-100, 120], build: park },
    ],
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
  // Two more cell blocks on each side of the yard, the workshop by the gate.
  for (const x of [-80, 80]) {
    at("barracks", x, -25, 0);
    at("barracks", x, 10, 0);
  }
  at("brick-shop", 50, -60, 0);
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
  // The south gate: a checkpoint and barriers outside it too.
  at("checkpoint", -10, PRISON_WALL.side + 14, 2);
  at("jersey", -8, PRISON_WALL.side + 22, 1);
  at("jersey", 8, PRISON_WALL.side + 22, 1);
  at("jersey", -8, -PRISON_WALL.side - 22, 1);
  at("jersey", 8, -PRISON_WALL.side - 22, 1);
  void ctx;
}

/** East Works (J7): tank farm, silos, cranes, the hangar, pump house, office block and terminal. */
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
  // Pump house, the works office block and the loading terminal.
  at("ind-warehouse-1", -70, 0, 0);
  at("ind-building-1", 110, -80, 0);
  at("ind-terminal", 90, 90, 0);
  void ctx;
}

/** Put one model on the terrain where it is buildable (the low point of its footprint). */
function onGround(
  out: Placement[],
  ctx: Context,
  poi: string,
  model: string,
  x: number,
  z: number,
  turn: Placement["turn"],
  flat = 1.4,
) {
  const [w, d] = footAt(model, turn);
  if (out.some((p) => Math.abs(p.x - x) < w / 2 + 6 && Math.abs(p.z - z) < d / 2 + 6)) return false;
  const low = buildable(ctx, x, z, Math.max(w, d) / 2, flat);
  if (low === null) return false;
  out.push({ model, x: +x.toFixed(2), y: +low.toFixed(2), z: +z.toFixed(2), turn, poi });
  return true;
}

/**
 * Murder Cabins (C7), as the concept map draws it (owner, 2026-11-04: "upgrade it like the
 * map"): a holiday camp gone wrong in the woods. The camp in the middle (the lodge, the chapel,
 * the barn, a fire pit and abandoned cars), cabins scattered down the slope round it, more
 * along the forest tracks south, a lookout over the trees.
 */
function murderCabins(poi: Poi, out: Placement[], ctx: Context) {
  const camp: Array<[string, number, number, Placement["turn"]]> = [
    ["rural-wood-4", -200, 380, 0],
    ["church", -60, 270, 2],
    ["rural-wood-1", -150, 460, 1],
    ["barn", 40, 420, 0],
    ["campsite", -110, 360, 0],
    ["lookout", 60, 300, 0],
    ["wreck-car", -60, 410, 1],
    ["wreck-car", -30, 340, 3],
    ["picnic-table", -90, 330, 0],
    ["picnic-table", -80, 336, 1],
  ];
  for (const [m, dx, dz, t] of camp) onGround(out, ctx, poi.id, m, poi.x + dx, poi.z + dz, t, 2);
  hamlet(poi, out, ctx, {
    radius: 420,
    at: [-60, 420],
    palette: ["cabin", "shed", "cabin", "rural-mobile-home", "cabin", "bungalow", "rural-house"],
    count: 34,
    salt: 609,
  });
  hamlet(poi, out, ctx, {
    radius: 260,
    at: [-150, 900],
    palette: ["cabin", "shed", "rural-trailer", "cabin"],
    count: 10,
    salt: 613,
  });
}

/** Sea piers: from a point offshore, head towards land; the pier where the water ends. */
function seaPier(
  out: Placement[],
  ctx: Context,
  poi: string,
  sx: number,
  sz: number,
  wx: number,
  wz: number,
  turn: Placement["turn"],
) {
  for (let t = 0; t < 400; t += 2) {
    const x = sx + wx * t,
      z = sz + wz * t;
    if (ctx.heightAt(x, z) < 0.3) continue;
    // Shore found: 3 m of deck on land, the rest over the sea (deep enough at the far end).
    const px = x - wx * 9,
      pz = z - wz * 9;
    if (ctx.heightAt(x + wx * 3, z + wz * 3) > 2.2) return null;
    if (ctx.heightAt(x - wx * 18, z - wz * 18) > -0.8) return null;
    out.push({
      model: "pier",
      x: +px.toFixed(2),
      y: +(0.7 - PIER_DECK).toFixed(2),
      z: +pz.toFixed(2),
      turn,
      poi: "shore",
    });
    const bx = px - wz * 5,
      bz = pz + wx * 5;
    if (ctx.heightAt(bx, bz) < -0.4)
      out.push({
        model: "rowboat",
        x: +bx.toFixed(2),
        y: -0.25,
        z: +bz.toFixed(2),
        turn,
        poi: "shore",
      });
    return [x, z] as [number, number];
  }
  return null;
}

/**
 * Fisher's Cove (B8/C8, owner 2026-11-04: "at the coast"): the concept's fishing hamlet on the
 * bay south-west of Murder Cabins: houses on the slope above the water, the fish market and
 * net sheds by the shore, piers with boats out into the bay, boats pulled up on the beach.
 */
function fishersCove(poi: Poi, out: Placement[], ctx: Context) {
  // Piers along the bay's north shore (heading north from offshore), one on the west coast;
  // by each, on the first flat ground inland, a fish shack, a net shed or the market.
  const shacks: Array<[string, Placement["turn"]]> = [
    ["rural-diner", 0],
    ["shed", 1],
    ["rural-store-1", 0],
    ["shed", 0],
  ];
  const piers: Array<[number, number, number, number, Placement["turn"]]> = [
    [-120, 420, 0, -1, 0],
    [-30, 420, 0, -1, 0],
    [70, 420, 0, -1, 0],
    [-500, -60, 1, 0, 1],
  ];
  piers.forEach(([dx, dz, wx, wz, turn], i) => {
    const shore = seaPier(out, ctx, poi.id, poi.x + dx, poi.z + dz, wx, wz, turn);
    if (!shore) return;
    const [model, t] = shacks[i]!;
    for (let d = 16; d < 80; d += 6)
      for (const side of [-1, 1])
        if (
          onGround(
            out,
            ctx,
            poi.id,
            model,
            shore[0] + wx * d - wz * side * 12,
            shore[1] + wz * d + wx * side * 12,
            t,
            1.8,
          )
        ) {
          const k = out[out.length - 1]!;
          onGround(
            out,
            ctx,
            poi.id,
            "rowboat",
            k.x + wz * side * 9,
            k.z - wx * side * 9,
            turn,
            1.2,
          );
          onGround(
            out,
            ctx,
            poi.id,
            "picnic-table",
            k.x - wz * side * 8,
            k.z + wx * side * 8,
            0,
            1,
          );
          d = 99;
          break;
        }
  });
  onGround(out, ctx, poi.id, "water-tower", poi.x + 120, poi.z + 160, 0, 1.8);
  // The lighthouse on its rock at the cove's western point, its foot in the surf.
  for (let z = poi.z - 100; z < poi.z + 300; z += 20) {
    let x = poi.x - 200;
    while (x > poi.x - 700 && ctx.heightAt(x, z) > 0) x -= 4;
    if (x <= poi.x - 700 || ctx.heightAt(x - 25, z) > -2) continue;
    if (out.some((p) => Math.abs(p.x - x) < 30 && Math.abs(p.z - z) < 30)) continue;
    out.push({
      model: "lighthouse",
      x: +x.toFixed(2),
      y: -0.4,
      z: +z.toFixed(2),
      turn: 1,
      poi: "shore",
    });
    break;
  }
  // The quay (build_world.py HARBORS, z 3245–3325): the fish market, net sheds, containers,
  // boats up on the stones, tables.
  const quay: Array<[string, number, Placement["turn"]]> = [
    ["rural-diner", -100, 0],
    ["shed", -60, 0],
    ["container-20", -40, 1],
    ["rural-store-1", 0, 0],
    ["shed", 40, 0],
    ["container-40", 70, 0],
    ["rural-diner", 110, 0],
  ];
  for (const [m, dx, t] of quay) onGround(out, ctx, poi.id, m, -3700 + dx, 3262, t, 1.2);
  for (const dx of [-80, -20, 25, 90]) {
    onGround(out, ctx, poi.id, "rowboat", -3700 + dx, 3300, 1, 0.8);
    onGround(out, ctx, poi.id, "picnic-table", -3700 + dx + 6, 3285, 0, 0.8);
  }
  for (const dx of [-140, -70, 0, 70, 140])
    onGround(out, ctx, poi.id, "street-lamp", -3700 + dx, 3280, 1, 1);
  hamlet(poi, out, ctx, {
    radius: 230,
    at: [0, 40],
    palette: ["rural-house", "house", "bungalow", "shed", "cabin", "house", "garage", "bungalow"],
    count: 22,
    salt: 614,
    flat: 1.6,
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

/** Bayview (B4, final audit 2026-11-04): a seaside suburb on the flat west coast: bungalows and
 * houses with gardens, a strip mall and townhouses in the middle, flats, a park with the church,
 * the police station and a climbable mast over the bay. */
function bayview(poi: Poi, out: Placement[], ctx: Context) {
  gridTown(
    poi,
    out,
    ctx,
    {
      core: ["strip-mall", "townhouse", "townhouse", "brick-shop", "rural-diner", "apartment"],
      homes: ["bungalow", "house", "bungalow", "rural-house", "garage", "bungalow", "house"],
      edge: ["bungalow", "rural-house", "shed", "rural-mobile-home"],
    },
    611,
    [["sniper-mast", -215, -170, 0]],
    [
      { near: [0, 0], build: park },
      { near: [120, -80], build: apartments },
      { near: [-90, 60], build: policeBlock },
    ],
  );
}

/** Northfield (G3, final audit 2026-11-04): a commuter estate in the fields between the hospital
 * and the quarry: townhouse rows and flats in the middle, houses round them, a park. */
function northfield(poi: Poi, out: Placement[], ctx: Context) {
  gridTown(
    poi,
    out,
    ctx,
    {
      core: ["townhouse", "townhouse", "apartment", "strip-mall", "townhouse", "bauhaus-block"],
      homes: ["house", "bungalow", "bungalow", "rural-house", "garage", "house", "rural-wood-1"],
      edge: ["bungalow", "barn", "rural-house", "shed"],
    },
    612,
    [],
    [
      { near: [0, -40], build: apartments },
      { near: [-120, 60], build: park },
      { near: [130, 60], build: policeBlock },
      { near: [150, -100], build: constructionSite },
    ],
  );
}

const LAYOUTS: Record<string, (poi: Poi, out: Placement[], ctx: Context) => void> = {
  "fishers-cove": fishersCove,
  bayview,
  northfield,
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

/**
 * Life in the empty land (owner, 2026-11-04: "fill out dead spaces like fields etc to live up
 * the map"; CC BY downloads): per 150 m cell, by land cover, a windmill, an abandoned tractor or
 * rusty wreck, a wooden water tower or lookout in the fields and grass, fallen logs and the odd
 * campsite in the forests; billboards and road signs along the roads; farm tools by barns.
 * Deterministic; kept off towns, building pads, roads, bridges, runways and other placements.
 */
function fieldDressing(out: Placement[], ctx: Context) {
  const { meta } = ctx;
  const CELL = 150;
  const near: Array<[number, number]> = out.map((p) => [p.x, p.z]);
  const clear = (x: number, z: number, r: number) =>
    !near.some(([px, pz]) => Math.abs(px - x) < r && Math.abs(pz - z) < r);
  const patch = new Set(["wheat-patch", "soil-patch"]);
  const clearOf = (x: number, z: number, r: number) =>
    !out.some(
      (p) =>
        !patch.has(p.model) &&
        Math.abs(p.x - x) < r + footAt(p.model, p.turn)[0] / 2 &&
        Math.abs(p.z - z) < r + footAt(p.model, p.turn)[1] / 2,
    );
  const free = (x: number, z: number) =>
    !inTown(meta, x, z, 60) &&
    !meta.pois.some((p) => Math.hypot(p.x - x, p.z - z) < (p.padRadius ?? p.radius) + 30);
  const put = (
    model: string,
    x: number,
    z: number,
    foot: number,
    flat: number,
    salt: number,
    gap = 12,
  ) => {
    // Close packing (crop patchworks) only next to other patches; 12 m from everything else.
    if (!free(x, z) || !clear(x, z, foot + gap) || (gap < 12 && !clearOf(x, z, foot + 12)))
      return false;
    const low = buildable(ctx, x, z, foot, flat);
    if (low === null) return false;
    out.push({
      model,
      x: +x.toFixed(2),
      y: +low.toFixed(2),
      z: +z.toFixed(2),
      turn: (Math.floor(hash(salt, 77) * 4) % 4) as Placement["turn"],
      poi: "countryside",
    });
    near.push([x, z]);
    return true;
  };
  const n = Math.floor(4800 / CELL);
  for (let gz = -n; gz < n; gz++)
    for (let gx = -n; gx < n; gx++) {
      const salt = 950_000 + (gz + n) * 1000 + (gx + n);
      const x = (gx + 0.2 + hash(salt, 1) * 0.6) * CELL,
        z = (gz + 0.2 + hash(salt, 2) * 0.6) * CELL;
      const cls = ctx.coverAt(x, z),
        r = hash(salt, 3);
      if (cls === 3) {
        if (r < 0.05) put("windmill", x, z, 6, 1.5, salt);
        else if (r < 0.15) put("field-tractor", x, z, 3, 1.0, salt);
        else if (r < 0.22) put("wreck-car", x, z, 3, 1.0, salt);
        else if (r < 0.28) put("water-tower", x, z, 3.5, 1.2, salt);
        else if (r < 0.32) put("lookout", x, z, 4.5, 1.5, salt);
        else if (r < 0.56)
          // A crop patchwork (wheat and ploughed soil, 9 m squares) breaks up the flat field.
          for (let k = 0; k < 4; k++)
            put(
              hash(salt, 10 + k) < 0.6 ? "wheat-patch" : "soil-patch",
              x + (k % 2) * 10,
              z + Math.floor(k / 2) * 10,
              4.5,
              0.5,
              salt + k,
              1,
            );
        else if (r < 0.6) put("scarecrow", x, z, 1, 0.8, salt);
      } else if (cls === 2) {
        if (r < 0.03) put("lookout", x, z, 4.5, 1.5, salt);
        else if (r < 0.09) put("wreck-car", x, z, 3, 1.0, salt);
        else if (r < 0.12) put("water-tower", x, z, 3.5, 1.2, salt);
        else if (r < 0.17)
          for (let k = 0; k < 2; k++) put("log", x + k * 5, z + k * 3, 2.5, 0.8, salt + k);
      } else if (cls === 4) {
        if (r < 0.03) put("campsite", x, z, 6.5, 1.8, salt);
        else if (r < 0.13) put("log", x, z, 2.5, 0.8, salt);
      }
    }
  // Along the roads: a billboard every ~700 m (set back, facing the road), a sign every ~450 m.
  let salt = 960_000;
  for (const road of meta.roads) {
    let walked = 0,
      nextBoard = 300 + hash(salt++, 1) * 400,
      nextSign = 150 + hash(salt++, 2) * 300;
    for (let k = 0; k + 1 < road.points.length; k++) {
      const [ax, az] = road.points[k]!,
        [bx, bz] = road.points[k + 1]!;
      const len = Math.hypot(bx - ax, bz - az);
      if (!(len > 0)) continue;
      const dx = (bx - ax) / len,
        dz = (bz - az) / len;
      const turn = (((Math.round(Math.atan2(-dz, dx) / (Math.PI / 2)) % 4) + 4) %
        4) as Placement["turn"];
      while (walked + len >= Math.min(nextBoard, nextSign)) {
        const board = nextBoard <= nextSign;
        const at = board ? nextBoard : nextSign;
        const t = (at - walked) / len;
        const side = hash(salt++, 3) < 0.5 ? 1 : -1;
        const off = board ? 16 : 7.5;
        const x = ax + (bx - ax) * t - dz * side * off,
          z = az + (bz - az) * t + dx * side * off;
        if (free(x, z) && clear(x, z, board ? 10 : 4) && roadDistance(meta, x, z) > off - 1.5) {
          const low = buildable(ctx, x, z, board ? 1 : 0.3, board ? 1.5 : 1.0);
          if (low !== null || !board) {
            out.push({
              model: board ? "billboard" : "road-sign",
              x: +x.toFixed(2),
              y: +(low ?? ctx.heightAt(x, z)).toFixed(2),
              z: +z.toFixed(2),
              turn,
              poi: "countryside",
            });
            near.push([x, z]);
          }
        }
        if (board) nextBoard += 600 + hash(salt++, 4) * 300;
        else nextSign += 380 + hash(salt++, 5) * 200;
      }
      walked += len;
    }
  }
  // Farm tools leaning by barns.
  for (const b of out.filter((p) => p.model === "barn")) {
    const x = b.x + (hash(Math.round(b.x), 1) < 0.5 ? 11 : -11),
      z = b.z + 3;
    if (Math.abs(ctx.heightAt(x, z) - b.y) < 0.6 && clear(x, z, 2))
      out.push({
        model: "farm-tools",
        x: +x.toFixed(2),
        y: b.y,
        z: +z.toFixed(2),
        turn: 0,
        poi: b.poi,
      });
  }
}

/**
 * Farms come alive (owner, 2026-11-04 downloads): every countryside farm gets one or two grain
 * silos by its barn, a chicken coop, a scarecrow and crop patches (wheat, ploughed soil, a block
 * of corn that hides a prone player) on its side of the yard, an apple orchard in rows behind it
 * now and then, and a dry stone wall along one field edge (cover); every second barn is the old
 * timber barn. Each piece only where the ground is flat and nothing else stands.
 */
function farmLife(out: Placement[], ctx: Context) {
  const near: Array<[number, number, number]> = out.map((p) => {
    const [w, d] = footAt(p.model, p.turn);
    return [p.x, p.z, Math.max(w, d) / 2];
  });
  const clear = (x: number, z: number, r: number) =>
    !near.some(([px, pz, pr]) => Math.abs(px - x) < r + pr && Math.abs(pz - z) < r + pr);
  const put = (model: string, x: number, z: number, turn: Placement["turn"], flat = 0.8) => {
    const [w, d] = footAt(model, turn);
    const r = Math.max(w, d) / 2;
    if (!clear(x, z, r + 1)) return false;
    const low = buildable(ctx, x, z, Math.max(1, r), flat);
    if (low === null) return false;
    out.push({
      model,
      x: +x.toFixed(2),
      y: +low.toFixed(2),
      z: +z.toFixed(2),
      turn,
      poi: "countryside",
    });
    near.push([x, z, r]);
    return true;
  };
  const barns = out.filter((p) => p.model === "barn" && p.poi === "countryside");
  barns.forEach((b, k) => {
    const h = (n: number) => hash(Math.round(b.x * 3 + b.z), n);
    if (k % 2 === 1) b.model = "old-barn";
    // The yard's axes: u along the barn's front, v away from it.
    const [fu, fv] = (
      [
        [1, 0],
        [0, -1],
        [-1, 0],
        [0, 1],
      ] as Array<[number, number]>
    )[b.turn]!;
    const at = (u: number, v: number): [number, number] => [
      b.x + fu * u - fv * v,
      b.z + fv * u + fu * v,
    ];
    if (h(1) < 0.75) {
      put("grain-silo", ...at(17, 0), 0, 1.2);
      if (h(2) < 0.5) put("grain-silo", ...at(17, 8), 0, 1.2);
    }
    if (h(3) < 0.6) put("chicken-coop", ...at(-16, -10), b.turn);
    // Crops: a 2 × 3 patchwork beside the yard, one patch of corn rows among them.
    const side = h(4) < 0.5 ? 1 : -1;
    const corn = Math.floor(h(5) * 6);
    for (let i = 0; i < 6; i++) {
      const [x, z] = at(side * (34 + (i % 2) * 10), -14 + Math.floor(i / 2) * 10);
      if (i === corn) {
        if (!clear(x, z, 5.5) || buildable(ctx, x, z, 4.5, 0.6) === null) continue;
        for (let r = 0; r < 4; r++)
          for (let c = 0; c < 5; c++) {
            const cx = x - 4 + c * 2,
              cz = z - 3.6 + r * 2.4;
            out.push({
              model: "corn",
              x: +cx.toFixed(2),
              y: +ctx.heightAt(cx, cz).toFixed(2),
              z: +cz.toFixed(2),
              turn: ((r + c) % 4) as Placement["turn"],
              poi: "countryside",
            });
          }
        near.push([x, z, 5]);
      } else
        put(h(6 + i) < 0.6 ? "wheat-patch" : "soil-patch", x, z, (i % 2) as Placement["turn"], 0.5);
    }
    if (h(12) < 0.7) put("scarecrow", ...at(side * 39, 22), b.turn, 0.6);
    // An orchard: 4 × 3 apple trees, 7 m apart, behind the barn.
    if (h(13) < 0.45)
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 4; c++)
          put("orchard-tree", ...at(-side * 30 + c * 7, 30 + r * 7), 0, 1.2);
    // A dry stone wall: 14 sections (32 m) along the field edge, the far side of the crops.
    if (h(14) < 0.5) {
      const wallTurn = ((b.turn + 1) % 4) as Placement["turn"];
      for (let c = 0; c < 14; c++) {
        const [x, z] = at(side * 58, -22 + c * 2.3);
        if (!clear(x, z, 1.4)) continue;
        const y = Math.min(ctx.heightAt(x - 1, z - 1), ctx.heightAt(x + 1, z + 1));
        if (underwater(ctx.meta, x, z, y) || roadDistance(ctx.meta, x, z, 8) < 5) continue;
        out.push({
          model: "stone-wall",
          x: +x.toFixed(2),
          y: +y.toFixed(2),
          z: +z.toFixed(2),
          turn: wallTurn,
          poi: "countryside",
        });
      }
    }
  });
}

/** Height of the pier's deck above its pivot (collision: the deck boxes top out at 2.7–3.0 m). */
const PIER_DECK = 2.95;

/**
 * Lakes get a pier (owner, 2026-11-04 downloads): on the shore nearest a road, straight out
 * into the water (its shelter at the far end), the deck 0.7 m above the water; a rowboat moored
 * beside it, a picnic table on the bank. Beaches get the odd boat pulled up on the sand.
 */
function shoreLife(out: Placement[], ctx: Context) {
  const { meta } = ctx;
  const dirs: Array<[number, number, Placement["turn"]]> = [
    // Water direction, and the turn that points the model's +z (its land end) back to shore.
    [1, 0, 3],
    [-1, 0, 1],
    [0, 1, 2],
    [0, -1, 0],
  ];
  for (const lake of meta.waterBodies) {
    const [x0, z0, x1, z1] = lake.bounds;
    const cx = (x0 + x1) / 2,
      cz = (z0 + z1) / 2;
    const level = lake.level;
    let best: {
      x: number;
      z: number;
      turn: Placement["turn"];
      d: number;
      wx: number;
      wz: number;
    } | null = null;
    for (const [wx, wz, turn] of dirs)
      for (const lateral of [-0.25, 0, 0.25]) {
        // March outwards from inside the lake to the first dry ground.
        const span = Math.max(x1 - x0, z1 - z0);
        const sx = cx - wz * lateral * (x1 - x0),
          sz = cz + wx * lateral * (z1 - z0);
        if (ctx.heightAt(sx, sz) > level - 0.5) continue;
        let shore: [number, number] | null = null;
        for (let t = 0; t < span; t += 2) {
          const x = sx + wx * t,
            z = sz + wz * t;
          if (ctx.heightAt(x, z) > level + 0.2) {
            shore = [x, z];
            break;
          }
        }
        if (!shore) continue;
        // The pier: 3 m on land, 21 m over water (deep enough under the far half).
        const px = shore[0] - wx * 9,
          pz = shore[1] - wz * 9;
        const land = ctx.heightAt(shore[0] + wx * 3, shore[1] + wz * 3);
        if (land > level + 1.2) continue;
        if (ctx.heightAt(shore[0] - wx * 18, shore[1] - wz * 18) > level - 0.8) continue;
        const d = roadDistance(meta, shore[0], shore[1], 400);
        if (!best || d < best.d) best = { x: px, z: pz, turn, d, wx, wz };
      }
    if (!best) continue;
    out.push({
      model: "pier",
      x: +best.x.toFixed(2),
      y: +(level + 0.7 - PIER_DECK).toFixed(2),
      z: +best.z.toFixed(2),
      turn: best.turn,
      poi: "shore",
    });
    // A rowboat alongside (afloat), a picnic table on the bank.
    const sx = -best.wz,
      sz = best.wx;
    const bx = best.x + sx * 5,
      bz = best.z + sz * 5;
    if (ctx.heightAt(bx, bz) < level - 0.4)
      out.push({
        model: "rowboat",
        x: +bx.toFixed(2),
        y: +(level - 0.25).toFixed(2),
        z: +bz.toFixed(2),
        turn: best.turn,
        poi: "shore",
      });
    const tx = best.x + best.wx * -16 + sx * 6,
      tz = best.z + best.wz * -16 + sz * 6;
    const ty = buildable(ctx, tx, tz, 1.2, 0.6);
    if (ty !== null && !underwater(meta, tx, tz, ty))
      out.push({
        model: "picnic-table",
        x: +tx.toFixed(2),
        y: +ty.toFixed(2),
        z: +tz.toFixed(2),
        turn: 0,
        poi: "countryside",
      });
  }
  // Boats pulled up on the beaches: one in ~1 of 12 sandy 150 m cells.
  const CELL = 150,
    n = Math.floor(4800 / CELL);
  for (let gz = -n; gz < n; gz++)
    for (let gx = -n; gx < n; gx++) {
      const salt = 970_000 + (gz + n) * 1000 + (gx + n);
      if (hash(salt, 1) > 0.08) continue;
      const x = (gx + 0.5) * CELL,
        z = (gz + 0.5) * CELL;
      if (ctx.coverAt(x, z) !== 1) continue;
      const y = buildable(ctx, x, z, 2.2, 0.8);
      if (y === null || y < 0.4) continue;
      if (out.some((p) => Math.abs(p.x - x) < 15 && Math.abs(p.z - z) < 15)) continue;
      out.push({
        model: "rowboat",
        x,
        y: +y.toFixed(2),
        z,
        turn: (Math.floor(hash(salt, 2) * 4) % 4) as Placement["turn"],
        poi: "countryside",
      });
    }
}

/**
 * Radio masts on high ground (owner, 2026-11-04 downloads): landmarks you can navigate by. The
 * five highest open hilltops outside the mountains and the POIs, at least 1.2 km apart.
 */
function hillMasts(out: Placement[], ctx: Context) {
  const { meta } = ctx;
  const tops: Array<[number, number, number]> = [];
  for (let z = -4600; z <= 4600; z += 100)
    for (let x = -4600; x <= 4600; x += 100) {
      const h = ctx.heightAt(x, z);
      if (h < 40 || h > 170) continue; // not the Iron Peaks massif
      let peak = true;
      for (const [dx, dz] of [
        [100, 0],
        [-100, 0],
        [0, 100],
        [0, -100],
        [70, 70],
        [-70, -70],
        [70, -70],
        [-70, 70],
      ] as Array<[number, number]>)
        if (ctx.heightAt(x + dx, z + dz) > h) peak = false;
      if (peak) tops.push([x, z, h]);
    }
  tops.sort((a, b) => b[2] - a[2]);
  const masts: Array<[number, number]> = [];
  for (const [x, z] of tops) {
    if (masts.length === 6) break;
    if (masts.some(([mx, mz]) => Math.hypot(mx - x, mz - z) < 1200)) continue;
    if (
      meta.pois.some((p) => Math.hypot(p.x - x, p.z - z) < poiReach(p)) ||
      inTown(meta, x, z, 100)
    )
      continue;
    // The flattest spot within 30 m of the summit.
    let site: [number, number, number] | null = null;
    for (const [dx, dz] of [
      [0, 0],
      [15, 0],
      [-15, 0],
      [0, 15],
      [0, -15],
      [25, 25],
      [-25, -25],
    ] as Array<[number, number]>) {
      const y = buildable(ctx, x + dx, z + dz, 3, 2.5);
      if (
        y !== null &&
        !out.some((p) => Math.abs(p.x - x - dx) < 10 && Math.abs(p.z - z - dz) < 10)
      ) {
        site = [x + dx, z + dz, y];
        break;
      }
    }
    if (!site) continue;
    masts.push([site[0], site[1]]);
    // The three highest are climbable (a stair to a sniper platform), the rest are landmarks.
    out.push({
      model: masts.length <= 3 ? "sniper-mast" : "radio-tower",
      x: site[0],
      y: +site[2].toFixed(2),
      z: site[1],
      turn: 0,
      poi: "countryside",
    });
  }
}

/** Rock clusters and bush clumps per land-cover class: chance per 60 m cell. */
const NATURE: Record<number, { rocks: number; bushes: number; big: number }> = {
  1: { rocks: 0.03, bushes: 0, big: 0.4 }, // sand: a few coastal boulders
  2: { rocks: 0.1, bushes: 0.22, big: 0.15 }, // grass: cover between POIs
  3: { rocks: 0.05, bushes: 0.12, big: 0.05 }, // fields: field-edge stones and thickets
  4: { rocks: 0.05, bushes: 0.18, big: 0.15 }, // forest: boulders and undergrowth
  5: { rocks: 0.45, bushes: 0.03, big: 0.65 }, // rock: mountains, cliffs, quarry walls
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
  // Town gardens (grass inside the blocks) take hedges and bushes, never boulders.
  const garden = (x: number, z: number) => inTown(meta, x, z, 10) && ctx.coverAt(x, z) === 2;
  const blocked = (x: number, z: number, bush = false) =>
    (meta.pois.some((p) => p.padRadius && Math.hypot(p.x - x, p.z - z) < p.padRadius + 10) &&
      !(bush && garden(x, z))) ||
    (inTown(meta, x, z, 10) && !(bush && garden(x, z))) ||
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
          if (blocked(x, z, true)) continue;
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
  farmLife(out, ctx);
  fieldDressing(out, ctx);
  shoreLife(out, ctx);
  hillMasts(out, ctx);
  powerLines(out, ctx);
  bridgeCover(out, ctx);
  nature(out, ctx);
  return out;
}

/**
 * Cover on the long bridges (audit P1: crossing 100+ m of open deck was a shooting gallery): an
 * abandoned car and short jersey-barrier rows on alternating sides, the middle lane kept clear.
 * On the deck's arch (bridges.ts: the same height formula); only on bridges close to an axis, as
 * placements turn by quarter turns and a diagonal car would poke through the rail.
 */
function bridgeCover(out: Placement[], ctx: Context) {
  for (const b of ctx.meta.bridges) {
    const [ax, az] = b.a,
      [bx, bz] = b.b;
    const length = Math.hypot(bx - ax, bz - az);
    if (length < 50) continue;
    const dir = [(bx - ax) / length, (bz - az) / length] as const;
    const side = [-dir[1], dir[0]] as const;
    const alongX = Math.abs(dir[0]) > 0.94,
      alongZ = Math.abs(dir[1]) > 0.94;
    const ha = ctx.heightAt(ax, az),
      hb = ctx.heightAt(bx, bz);
    const lift = Math.max(0, b.deck - (ha + hb) / 2);
    const deckAt = (t: number) => ha + (hb - ha) * t + lift * Math.sin(Math.PI * t);
    const put = (model: string, t: number, off: number, turn: Placement["turn"]) =>
      out.push({
        model,
        x: +(ax + (bx - ax) * t + side[0] * off).toFixed(2),
        y: +deckAt(t).toFixed(2),
        z: +(az + (bz - az) * t + side[1] * off).toFixed(2),
        turn,
        poi: "bridges",
      });
    const half = b.width / 2;
    const cars = Math.max(1, Math.floor(length / 70));
    for (let k = 0; k < cars; k++) {
      const t = (k + 0.5) / cars;
      const s = k % 2 ? 1 : -1;
      if (alongX || alongZ)
        put(
          hash(k, Math.round(ax)) < 0.5 ? "car-sedan" : "car-pickup",
          t,
          s * (half - 1.7),
          alongX ? 1 : 0,
        );
      // Jersey rows (each block 2 m long, quarter-turned along the nearer axis).
      const turn: Placement["turn"] = Math.abs(dir[0]) > Math.abs(dir[1]) ? 1 : 0;
      for (let j = 0; j < 3; j++)
        put("jersey", t + (12 + j * 2.1) / length, -s * (half - 1.1), turn);
    }
  }
}
