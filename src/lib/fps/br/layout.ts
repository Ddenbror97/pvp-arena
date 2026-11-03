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
  const houses = ["house", "house-shabby", "house", "abandoned-building", "house-shabby", "house"];
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

const LAYOUTS: Record<string, (poi: Poi, out: Placement[]) => void> = {
  "southern-military-base": militaryBase,
  "island-superstore": superstore,
  "island-village": islandVillage,
  "west-point": westPoint,
  "island-airfield": airfield,
};

/** Every placement on the island, in a stable order. */
export function islandLayout(meta: WorldMeta): Placement[] {
  const out: Placement[] = [];
  for (const poi of meta.pois) LAYOUTS[poi.id]?.(poi, out);
  return out;
}
