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

/** Shared context for layouts that need the world beyond their own POI (roads, ground). */
type Context = { meta: WorldMeta; heightAt: (x: number, z: number) => number };

/** Distance from a world point to the nearest road centreline. */
function roadDistance(meta: WorldMeta, x: number, z: number) {
  let best = Infinity;
  for (const r of meta.roads)
    for (let k = 0; k + 1 < r.points.length; k++) {
      const [ax, az] = r.points[k]!,
        [bx, bz] = r.points[k + 1]!;
      if (Math.min(ax, bx) - best > x || Math.max(ax, bx) + best < x) continue;
      if (Math.min(az, bz) - best > z || Math.max(az, bz) + best < z) continue;
      const vx = bx - ax,
        vz = bz - az,
        len2 = vx * vx + vz * vz || 1;
      const u = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / len2));
      best = Math.min(best, Math.hypot(x - ax - vx * u, z - az - vz * u));
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

/** Whether ground at height `h` is under a lake or the sea there. */
function underwater(meta: WorldMeta, x: number, z: number, h: number) {
  if (h < 2) return true;
  for (const w of meta.waterBodies) {
    const [x0, z0, x1, z1] = w.bounds;
    if (x >= x0 && x <= x1 && z >= z0 && z <= z1 && h < w.level + 0.5) return true;
  }
  return false;
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
    const hs = [-foot, 0, foot].flatMap((ox) =>
      [-foot, 0, foot].map((oz) => ctx.heightAt(x + ox, z + oz)),
    );
    const low = Math.min(...hs);
    if (Math.max(...hs) - low > flat || underwater(ctx.meta, x, z, low)) continue;
    if (roadDistance(ctx.meta, x, z) < foot + 7) continue;
    if (bridgeDistance(ctx.meta, x, z) < foot + 14) continue;
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

/** Northstar Town (B2): the map's large street grid. */
function northstar(poi: Poi, out: Placement[], ctx: Context) {
  town(poi, out, ctx, {
    salt: 601,
    palette: [
      "house",
      "house-shabby",
      "rural-house",
      "rural-wood-1",
      "rural-store-1",
      "rural-store-3",
      "rural-store-5",
      "brick-shop",
      "abandoned-building",
      "garage",
    ],
    landmarks: [
      ["fire-station", 0, 0, 0, 22],
      ["rural-diner", 96, -64, 0, 14],
    ],
    cars: 14,
  });
}

/** Millhaven (C4): industrial town with the water tower. */
function millhaven(poi: Poi, out: Placement[], ctx: Context) {
  town(poi, out, ctx, {
    salt: 602,
    palette: [
      "house",
      "rural-house",
      "rural-store-1",
      "rural-store-5",
      "ind-office-trailer",
      "garage",
      "brick-shop",
    ],
    landmarks: [
      ["ind-watertower", 32, -64, 0, 10],
      ["ind-factory", -96, 32, 0, 55],
      ["ind-warehouse-3", 96, 64, 0, 20],
      ["ind-warehouse-1", -96, -96, 0, 20],
    ],
    cars: 10,
  });
}

/** Crossroads (F4): commercial strip at the junction. */
function crossroads(poi: Poi, out: Placement[], ctx: Context) {
  town(poi, out, ctx, {
    salt: 603,
    lot: 30,
    palette: [
      "rural-store-1",
      "rural-store-3",
      "rural-store-5",
      "brick-shop",
      "rural-diner",
      "garage",
    ],
    landmarks: [["warehouse", -60, 60, 0, 25]],
    cars: 10,
  });
}

/** Central Hospital (H4): tall white blocks around a car park. */
function hospital(poi: Poi, out: Placement[], ctx: Context) {
  const { at, scatter } = builder(poi, out);
  at("ind-building-10", -40, -20, 0);
  at("ind-building-10", 40, -20, 0);
  at("ind-building-1", 0, 60, 1);
  at("ind-terminal", 0, -95, 0);
  at("ind-generic-2", 110, 40, 0);
  scatter("car-sedan", 10, 0, 120, 120, 40, 604);
  scatter("car-cruiser", 6, -110, 60, 40, 80, 605);
  scatter("car-pickup", 6, 110, -60, 40, 60, 606);
  void ctx;
}

/** Riverwood (I6): a small town by the river. */
function riverwood(poi: Poi, out: Placement[], ctx: Context) {
  town(poi, out, ctx, {
    salt: 607,
    palette: [
      "house",
      "house-shabby",
      "rural-house",
      "rural-wood-4",
      "rural-store-3",
      "garage",
      "rural-mobile-home",
    ],
    cars: 8,
  });
}

/** Blackwater Prison (E6): walled compound with towers and cell blocks. */
function prison(poi: Poi, out: Placement[], ctx: Context) {
  const { at, row } = builder(poi, out);
  const h = 75;
  // Perimeter: 2 m barbed fence (blocks movement, not sight), a gate in the north wall.
  row("barbed-barrier", -h, -h, h, -h, 5, 0, [[0, -h]]);
  row("barbed-barrier", -h, h, h, h, 5, 0);
  row("barbed-barrier", -h, -h + 4, -h, h - 4, 5, 1);
  row("barbed-barrier", h, -h + 4, h, h - 4, 5, 1);
  for (const [x, z] of [
    [-h + 5, -h + 5],
    [h - 5, -h + 5],
    [-h + 5, h - 5],
    [h - 5, h - 5],
  ])
    at("watchtower", x!, z!, 0);
  at("ind-building-1", -30, 10, 0);
  at("ind-building-1", 30, 10, 0);
  at("ind-warehouse-1", 0, -45, 0);
  at("checkpoint", 10, -h - 10, 0);
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
  "old-dam": oldDam,
  "southern-military-base": militaryBase,
  "island-superstore": superstore,
  "island-village": islandVillage,
  "west-point": westPoint,
  "island-airfield": airfield,
};

/**
 * Every placement on the island, in a stable order. `heightAt` is the shared heightfield's
 * ground height (towns without a pad sit on the terrain).
 */
export function islandLayout(
  meta: WorldMeta,
  heightAt: (x: number, z: number) => number,
): Placement[] {
  const out: Placement[] = [];
  const ctx: Context = { meta, heightAt };
  for (const poi of meta.pois) LAYOUTS[poi.id]?.(poi, out, ctx);
  return out;
}
