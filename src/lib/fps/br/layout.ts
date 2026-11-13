import { STRAIT, STRAIT_BRIDGES, deckHeight } from "./bridges";
import { onRopeRoute } from "./rope";
import { PRISON_WALL } from "./walls";
import entranceSites from "./entrance-sites.json";
import hospitalPlan from "./hospital-plan.json";
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

// Authored fixes for hillside approaches: face the entrance toward reachable ground and
// keep the two sides of its threshold clear. Applied once, identically in render and physics.
const entranceSiteIndex = new Map(
  entranceSites.map((s) => [`${s.model}:${s.from[0]}:${s.from[1]}`, s]),
);

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
  // The 2026-11-09 audit: the compound was a concrete plain of parked armour round the HQ.
  // The command post (enterable, two floors) beside the HQ; control posts at the north and
  // east gates; the motor pool in the south-east (open vehicle sheds, trucks, jeeps, armoured
  // cars and Humvees on the line); the ammunition dump in the north-east (air-raid bunkers,
  // ammo stacks behind sandbags); Humvees at the gates.
  at("command-post", -35, 40, 0);
  at("control-post", 35, 130, 0);
  at("control-post", 140, -38, 1);
  for (const x of [45, 75]) {
    at("field-hangar", x, -128, 0);
    at("mil-truck", x - 6, -128, 0);
    at("mil-truck", x, -128, 0);
    at(x === 45 ? "mil-armoured-car" : "mil-truck", x + 6, -128, 0);
  }
  for (let i = 0; i < 9; i++)
    at(["humvee", "mil-jeep", "mil-armoured-car"][i % 3]!, 30 + i * 7, -104, 0);
  at("fuel-truck", 98, -110, 0);
  for (const x of [112, 128, 144]) at("air-raid-bunker", x, 122, 0);
  for (const x of [104, 120, 136, 152]) at("ammo-stack", x, 100, 0);
  at("sandbags", 128, 88, 0);
  at("sandbags", 104, 88, 0);
  at("humvee", -12, h - 14, 1);
  at("humvee", h - 16, -14, 0);
  at("mil-jeep", 14, -h + 16, 1);
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
/** Vehicles parked in the Superstore's bays, by cumulative share. */
const BAY_CARS: Array<[string, number]> = [
  ["car-sedan", 0.3],
  ["car-pickup", 0.52],
  ["car-cruiser", 0.68],
  ["cadillac", 0.8],
  ["burned-car-b", 1],
];
/** Vehicle models authored lengthwise along z (the car-* ones run along x). */
const LONG_Z = new Set([
  "rusty-truck",
  "cadillac",
  "cargo-van",
  "crashed-car",
  "burned-car-b",
  "burned-police-a",
  "burned-police-b",
  "semi-cab",
  "reefer-trailer",
]);

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
  // Car parks: painted double rows of bays (36.4 × 10.6 m modules), abandoned vehicles parked in
  // about one bay in `fill` (mostly the three car types, some old, burned out or wrecked), a
  // lot light between every other pair of modules, and a trolley corral in about a quarter of the
  // modules (owner, 2026-11-08: "around the superstore and the parking lot need to be improved").
  let lights = 0;
  const lot = (xs: number[], zs: number[], fill: number, salt: number) => {
    for (const z of zs)
      xs.forEach((x, i) => {
        at("lot-lines", x, z, 0);
        if (i % 2 === 1 && i < xs.length - 1 && Math.abs(x + 20) > 10) {
          at("lot-light", x + 20, z, 0);
          lights++;
        }
        const corral =
          hash(salt + 3, Math.round(x) * 7 + Math.round(z)) < 0.25
            ? 1 + Math.floor(hash(salt + 5, Math.round(x) + Math.round(z) * 3) * 11)
            : -1;
        for (let b = 0; b < 13; b++)
          for (const side of [-1, 1]) {
            const bx = x - 18.2 + (b + 0.5) * 2.8;
            if (b === corral && side < 0) {
              // Five nested trolleys down the bay.
              for (let k = 0; k < 5; k++) at("shop-cart", bx, z - 0.8 - k * 0.72, 0);
              continue;
            }
            const h = hash(salt + Math.round(z), Math.round(x) * 31 + b * 2 + side);
            if (h > fill) continue;
            const pick = hash(salt + 7, Math.round(x) * 13 + b + side * 5 + Math.round(z));
            const model = BAY_CARS.find(([, p]) => pick < p)![0];
            // The long ones (vans, the old Cadillac) overhang the bay's end line a little.
            if (LONG_Z.has(model)) at(model, bx, z + side * 3, side > 0 ? 0 : 2);
            else at(model, bx, z + side * 2.7, side > 0 ? 1 : 3);
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
  // The fit-out inside the shell (build_superstore_interior.mjs): aisles, tills, wings,
  // stockroom and office mezzanine; the stairs up onto the wing roofs.
  at("superstore-interior", 0, 0, 0);
  at("superstore-stairs", 0, 0, 0);
  superstoreFitout(at, lift);

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
  superstoreDressing(at, scatter, lot);
  void lights;
}

type Builder = ReturnType<typeof builder>;

/**
 * The Superstore's furniture (owner, 2026-11-11: "audit inside superstore … see if there are any
 * 3D objects I can download to make the super store complete"; the owner's downloads, kit ids
 * `ss-*`). Store frame, as build_superstore_interior.mjs, which keeps the gondola maze, the
 * fitting rooms, the counters and the mezzanine and leaves these places free: tills behind the
 * entrances, fridges and produce in the grocery wing, wall shelving, clothing, pallet racking in
 * the wing stockrooms, the offices' furniture. Fronts: a turn faces a model's front (+z) to
 * +z (0), +x (1), −z (2), −x (3); the drinks cooler's front is +x.
 */
function superstoreFitout(
  at: (model: string, dx: number, dz: number, turn?: Placement["turn"]) => void,
  lift: (dy: number) => void,
) {
  const MEZZ_Y = 4.6;
  const ENTRANCES: Array<[number, number]> = [
    [-9.9, -6.6],
    [-2.75, 0.5],
    [11.0, 14.3],
    [18.15, 21.4],
  ];
  // Checkout lanes: L-shaped counters along z every 4.4 m, clear of the entrances; self-checkout
  // kiosks either side of the lanes; coolers and basket stacks along the front wall.
  for (let x = -30; x <= 32; x += 4.4)
    if (!ENTRANCES.some(([a, b]) => x > a - 1.2 && x < b + 1.2)) at("ss-checkout", x, 25.5, 1);
  for (const z of [23, 25, 27]) {
    at("ss-kiosk", 35, z, 3);
    at("ss-kiosk", -34.5, z, 1);
  }
  for (let i = 0; i < 6; i++) {
    at("ss-cooler", -34.6 + i * 1.65, 33.6, 1);
    at("ss-cooler", 24.4 + i * 1.65, 33.6, 1);
  }
  for (const [a, b] of ENTRANCES)
    for (const x of [a - 0.7, b + 0.7]) {
      at("ss-basket", x, 32.9, 0);
      for (let k = 1; k < 4; k++) {
        at("ss-basket", x, 32.9, 0);
        lift(k * 0.1);
      }
    }
  // Promotion tables with groceries at the hall's sides, dump bins at the aisles' ends.
  for (const [x, z] of [
    [-30.5, 15],
    [-33.5, -6],
    [33.5, 10],
    [33.5, -4],
  ] as const) {
    at("ss-promo-table", x, z, 1);
    at("ss-groceries", x, z, 1);
    lift(1.07);
  }
  for (const [x, z] of [
    [-29, 0],
    [29, 0],
    [-29.5, 21.5],
    [29.5, 21.5],
  ] as const)
    at("ss-wire-bin", x, z, 0);

  // Grocery wing: glass-door fridges against the stockroom partition (gaps at its doorways)
  // and along the west wall; produce displays and freezer islands on the old grid.
  for (const x of [
    -72.3, -70.2, -68.1, -66, -63.9, -61.8, -59.7, -57.6, -55.5, -49.4, -47.3, -45.2, -43.1,
  ])
    at("ss-fridge", x, -23.2, 0);
  for (let z = -19.8; z <= -2.9; z += 2.1) at("ss-fridge", -72.8, z, 1);
  for (const [r, z] of [-19, -14.7, -10.4, -6.1].entries())
    for (let x = -68; x <= -42; x += 4.6)
      at(r < 2 ? "ss-produce" : "ss-freezer-island", x, z, (r % 2 ? 2 : 0) as Placement["turn"]);
  // Pharmacy strip: shelving down the west wall (the strip's gondola run stays).
  for (let i = 0; i < 14; i++) at("ss-shelf", -72.8, 3 + i * 1.8, 1);

  // Clothing (east wing): rack gondolas on a grid, mannequins at the aisle heads and by the
  // fitting rooms; shelving down the east wall between its doors and the fitting rooms.
  for (let r = 0; r < 8; r++)
    for (let x = 42.5; x <= 56.2; x += 3.4) at("ss-clothes-rack", x, 1.5 + r * 3, r % 2 ? 2 : 0);
  for (const [x, z, t] of [
    [40.4, 4, 1],
    [40.4, 10, 1],
    [40.4, 16, 1],
    [40.4, 22, 1],
    [61, 4.2, 3],
    [61, 11.8, 3],
  ] as const)
    at("ss-mannequin", x, z, t);
  for (const z of [
    -21.6, -19.8, -18, -16.2, -14.4, -12.6, -7.7, -5.9, -4.1, -2.3, -0.5, 15.9, 17.7, 22.3,
  ])
    at("ss-shelf", 74.1, z, 3);

  // Wing stockrooms: two rows of 4 m pallet racking (the fit-out puts pallets on their beams),
  // wire shelving on the end walls, a ramp up onto a 2 m racking deck in each, chest freezers;
  // roll cages by the docks.
  for (const z of [-35.5, -30.6])
    for (const [x0, n] of [
      [-71.2, 2],
      [-58.6, 3],
      [33.4, 3],
      [50, 3],
      [64.2, 2],
    ] as const)
      for (let i = 0; i < n; i++) at("ss-pallet-rack", x0 + 2.1 + i * 4.2, z, 0);
  for (const z of [-25.4, -27.7, -33, -35.6]) {
    at("ss-wire-shelf", -72.8, z, 1);
    at("ss-wire-shelf", 74.1, z, 3);
  }
  at("ss-rack-ramp", -64, -26.6, 0);
  at("ss-rack-ramp", 58, -26.6, 2);
  for (const x of [-58.4, -57]) at("ss-chest-freezer", x, -25.1, 0);
  for (const [x, z] of [
    [-13, -26.8],
    [-11.7, -26.8],
    [12.6, -26.8],
    [13.9, -26.8],
    [-12.5, -35.9],
    [15.5, -35.9],
  ] as const)
    at("ss-roll-cage", x, z, 0);

  // Mezzanine offices: a desk and a chair, a filing cabinet; a vending machine and a water
  // cooler on the walkway.
  for (const o0 of [-30, -15, 0, 15]) {
    at("ss-desk", o0 + 4.5, -34.2, 1);
    lift(MEZZ_Y);
    at("ss-office-chair", o0 + 4.5, -33.1, 1);
    lift(MEZZ_Y);
    at("ss-filing", o0 + 13.9, -36.7, 0);
    lift(MEZZ_Y);
  }
  at("ss-vending", -27.5, -29.8, 0);
  lift(MEZZ_Y);
  at("ss-water-cooler", 28.5, -30, 0);
  lift(MEZZ_Y);
  at("ss-vending", 36.5, 32.6, 2);
}

/**
 * The Superstore's grounds (owner, 2026-11-08: "it looks too flat with dead space; around the
 * superstore and the parking lot need to be improved"). Store-relative metres: the store is
 * 150 × 83 m at the centre, the loop road runs at x ±96 and z −96 / +64, the front car parks
 * south of it, the service yard behind it (north), open pads east and west of it.
 */
function superstoreDressing(
  at: Builder["at"],
  scatter: Builder["scatter"],
  lot: (xs: number[], zs: number[], fill: number, salt: number) => void,
) {
  /** Chain-link fence from (x0,z0) to (x1,z1), 2.93 m sections, 6 m gates `gates` metres along. */
  const fence = (x0: number, z0: number, x1: number, z1: number, gates: number[] = []) => {
    const length = Math.hypot(x1 - x0, z1 - z0),
      n = Math.round(length / 2.93);
    const turn = Math.abs(x1 - x0) > Math.abs(z1 - z0) ? 1 : 0;
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n;
      if (gates.some((g) => Math.abs(t * length - g) < 3.2)) continue;
      at("chainlink", x0 + (x1 - x0) * t, z0 + (z1 - z0) * t, turn);
    }
  };
  /** Jersey barriers staggered across a road, a car's width left open at one end. */
  const roadblock = (x: number, z: number, turn: 0 | 1) => {
    for (const [a, b] of [
      [-3.3, 0],
      [-1.2, 0],
      [1.6, 1.4],
    ])
      at("jersey", turn ? x + a! : x + b!, turn ? z + b! : z + a!, turn);
  };
  const each = (model: string, turn: Placement["turn"], points: number[][]) => {
    for (const [x, z] of points) at(model, x!, z!, turn);
  };

  // Store front: propane cages, ice chests, cash machines and paper boxes along the facade, a
  // checkpoint of T-walls across the fire lane either side of the doors, a burned police car.
  each("propane-cage", 0, [
    [-62, 44],
    [62, 44],
  ]);
  each("ice-machine", 0, [
    [-55, 44],
    [55, 44],
  ]);
  each("atm", 0, [
    [-46, 43.6],
    [46, 43.6],
  ]);
  each("news-box", 0, [
    [-43.6, 43.6],
    [-42.9, 43.6],
    [43.6, 43.6],
  ]);
  for (let k = 0; k < 11; k++) {
    at("wall-barrier", -20 + k * 1.05, 61, 0);
    at("wall-barrier", 9.5 + k * 1.05, 61, 0);
  }
  each("road-barrier", 1, [
    [-30, 61],
    [30, 61],
  ]);
  each("cone", 0, [
    [-7, 62],
    [-5.5, 62.4],
    [5.5, 62.4],
    [7, 62],
  ]);
  at("burned-police-a", 36, 61.6, 1);
  each("traffic-drum", 0, [
    [41, 60.5],
    [31.5, 62.5],
  ]);

  // Car parks: wrecks across the aisles (cover on the long open runs), roadblocks on the axis
  // road, trolleys left in the aisles.
  at("burned-police-b", -118, 113, 1);
  at("crashed-car", -111, 113, 1);
  each("road-barrier", 1, [
    [-126, 109.5],
    [-102, 116.5],
  ]);
  at("road-barrier", -122, 117.5, 0);
  each("cone", 0, [
    [-108, 109],
    [-106, 110],
    [-104, 111],
    [-127, 116],
  ]);
  at("cargo-van", 150, 135, 1);
  roadblock(0, 120, 1);
  roadblock(0, -140, 1);
  at("wreck-bus", -60, -187.5, 0);
  at("ambulance", 88, -162.5, 0);
  at("burned-car-b", 95.5, -162.5, 1);
  each("traffic-drum", 0, [
    [82, -159],
    [83.5, -166],
    [100, -159.5],
  ]);
  at("tow-truck", -150, -212.5, 0);
  at("burned-car-b", -143.5, -212.5, 1);
  each("cone", 0, [
    [-156, -209],
    [-156, -216],
  ]);

  // West pad: a filling station on the inner street (pumps under the canopy, propane and ice at
  // its edge, a van and a wreck at the pumps, the tow truck's tyre pile) and a fenced works yard.
  at("gas-forecourt", -200, -20, 0);
  // The station's shop, its door facing the pumps.
  at("rural-store-1", -200, 4, 2);
  at("cargo-van", -200, -21, 0);
  at("crashed-car", -189.7, -24, 2);
  at("propane-cage", -186, -4.5, 0);
  at("ice-machine", -192, -4.5, 0);
  at("news-box", -196.5, -4.5, 0);
  at("propane-tank", -222, -36, 0);
  each("road-barrier", 1, [
    [-222, -39],
    [-222, -33],
  ]);
  at("tow-truck", -178, -42, 0);
  each("tires", 0, [
    [-178, -36],
    [-176.6, -36],
    [-177.3, -34.6],
  ]);
  at("oil-drums", -183, -37, 0);
  // The works yard, gates north (toward the filling station), south and east.
  fence(-236, 14, -150, 14, [41]);
  fence(-236, 56, -150, 56, [20]);
  fence(-236, 14, -236, 56);
  fence(-150, 14, -150, 56, [21]);
  at("awning", -222, 22, 0);
  each("cement-pallet", 0, [
    [-226, 21.5],
    [-224.5, 21.5],
    [-225.2, 23.2],
  ]);
  at("plank-stack", -219.5, 22.5, 1);
  each("con-pipe-long", 0, [
    [-208, 26],
    [-205.5, 26],
    [-203, 26],
  ]);
  each("con-pipe", 0, [
    [-190, 24],
    [-187.4, 24],
    [-188.7, 26.6],
  ]);
  each("cable-reel", 0, [
    [-175, 22],
    [-172.5, 22],
    [-175, 24.6],
    [-169, 31],
  ]);
  each("pipe-stack", 0, [
    [-180, 44],
    [-176.6, 44],
  ]);
  each("plank-stack", 1, [
    [-202, 46],
    [-202, 48.2],
  ]);
  each("porta-potty", 2, [
    [-232, 50],
    [-230.9, 50],
    [-229.8, 50],
  ]);
  at("box-truck", -163, 47, 0);
  each("traffic-drum", 0, [
    [-212, 40],
    [-210.5, 40],
    [-209, 40],
  ]);
  each("cone", 0, [
    [-198.5, 11.5],
    [-191.5, 11.5],
    [-216, 58.5],
  ]);
  at("road-barrier", -188, 11.5, 1);
  at("oil-drums", -160, 19, 0);
  // Stock rows down the middle of the yard.
  for (let k = 0; k < 4; k++) {
    at("cement-pallet", -228 + k * 1.5, 34, 0);
    at("cement-pallet", -228 + k * 1.5, 35.8, 0);
    at("con-pipe-long", -214 + k * 2.6, 36, 0);
    at("cable-reel", -190 + k * 2.4, 37, 0);
  }
  each("pipe-stack", 0, [
    [-172, 44],
    [-168.6, 44],
  ]);
  each("con-pipe", 0, [
    [-182, 32],
    [-179.4, 32],
  ]);
  each("plank-stack", 0, [
    [-230, 42],
    [-228, 42],
  ]);
  for (let k = 0; k < 5; k++) at("jersey", -158, 22 + k * 2.1, 0);
  each("road-barrier", 0, [
    [-147, 30],
    [-147, 40],
  ]);
  // A wrecked bus and burned cars on the west pad's open south-west corner.
  at("wreck-bus", -160, -70, 0);
  at("burned-car-b", -149, -66, 2);
  at("burned-police-a", -170, -76, 1);
  each("cone", 0, [
    [-153, -74],
    [-151, -75],
    [-149, -76],
  ]);
  // Overflow parking down the west pad, beside the loop road.
  lot([-123], [-75, -53, -31, -9, 13, 35, 57], 0.22, 426);

  // East pad: a truck stop (trailers and tractors in a row, box trucks), a crash scene, two
  // more car park modules and a market of awnings by the inner street.
  for (let i = 0; i < 6; i++) {
    at("reefer-trailer", 116 + i * 5.2, -50, 0);
    if (i % 2 === 0) at("semi-cab", 116 + i * 5.2, -50 - 6.75 - 3.71 - 0.4, 0);
  }
  each("box-truck", 1, [
    [165, -50],
    [172, -50],
  ]);
  at("ambulance", 190, -50, 0);
  at("burned-police-b", 197, -45.5, 1);
  each("road-barrier", 1, [
    [184, -45],
    [203, -54],
  ]);
  each("cone", 0, [
    [186, -55],
    [188, -56],
    [194, -56],
  ]);
  lot([140, 196], [-2, 20, 42], 0.22, 419);
  // Dropped trailers waiting behind the truck stop.
  for (let i = 0; i < 6; i++) if (i !== 2) at("reefer-trailer", 116 + i * 5.2, -80, 2);
  for (let i = 0; i < 3; i++) at("awning", 226, -20 + i * 11, 1);
  each("pallets", 0, [
    [222, -8],
    [222, 3],
  ]);
  each("cement-pallet", 0, [
    [228, -20],
    [228, -18.5],
  ]);
  each("oil-drums", 0, [
    [228, 2],
    [229, 13],
  ]);

  // Service yard behind the store: reefer trailers backed onto the docks (one with its tractor),
  // a box truck, bin bags round the dumpsters, drums and tyres, gas, toilets, a shelter, and a
  // chain-link fence along the loop road with gates at the axis road and either side.
  at("reefer-trailer", -4, -49.5, 0);
  at("reefer-trailer", 3.5, -49.5, 0);
  at("semi-cab", 3.5, -49.5 - 6.75 - 3.71 - 0.4, 0);
  at("box-truck", 14, -48, 1);
  each("trash-bags", 0, [
    [27, -47.5],
    [47.5, -48.5],
  ]);
  at("trash-bags", 33.5, -47.4, 1);
  each("oil-drums", 0, [
    [62, -48],
    [65, -48],
  ]);
  each("tires", 0, [
    [70, -48],
    [71.4, -49.4],
  ]);
  at("propane-tank", 86, -52, 1);
  each("porta-potty", 2, [
    [88, -86],
    [89.1, -86],
  ]);
  fence(-92, -90, 92, -90, [32, 92, 152]);
  at("awning", -80, -78, 0);
  each("cement-pallet", 0, [
    [-83, -78],
    [-81.5, -78],
  ]);
  each("cable-reel", 0, [
    [-77, -77.5],
    [-88, -70],
  ]);
  each("cone", 0, [
    [-10, -43],
    [10, -43],
  ]);

  // Store sides: drums, tyres and a tow truck in the strips beside the walls.
  each("oil-drums", 0, [
    [-85, -20],
    [-85, 12],
  ]);
  at("tires", -85, -8, 0);
  at("tow-truck", 86, 10, 1);
  at("propane-tank", 85, -22, 1);

  // Trolleys left in the aisles.
  scatter("shop-cart", 10, 0, 91, 440, 8, 421);
  scatter("shop-cart", 10, 0, 113, 440, 8, 422);
  scatter("shop-cart", 10, 0, 135, 440, 8, 423);
  scatter("shop-cart", 10, 0, -137.5, 440, 8, 424);
  scatter("shop-cart", 10, 0, -187.5, 440, 8, 425);
}

/** Island Village (D9): the small grid of houses west of the Superstore. */
function islandVillage(poi: Poi, out: Placement[], ctx: Context) {
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
  // Owner, 2026-11-08 ("polish the entire island"): the village was eight houses in the middle
  // of an empty concrete plaza. A village square (church, gazebo, playground, phone box) in the
  // middle, and houses, shops, a diner and garages along every road through it, cars at the kerb.
  const put = groundPlacer(ctx, out, poi.id, poi.x, poi.z, 260);
  const sq = (model: string, dx: number, dz: number, turn: Placement["turn"]) =>
    put(model, poi.x + dx, poi.z + dz, turn, { margin: 0.6, flat: 1.2 });
  sq("church", 0, -14, 0);
  sq("gazebo", -14, 12, 0);
  sq("playground", 14, 13, 2);
  sq("phone-booth", 6, -4, 0);
  for (const [dx, dz] of [
    [-8, 6],
    [8, 6],
    [-20, 2],
  ])
    sq("picnic-table", dx!, dz!, 0);
  sq("bus-stop", -4, 22, 1);
  sq("carousel", 26, 12, 0);
  sq("swings", 26, -4, 1);
  sq("payphone", 9, -4, 0);
  for (const [dx, dz, turn] of [
    [-6, -2, 0],
    [4, 26, 2],
    [-24, 14, 1],
    [20, 24, 2],
  ] as Array<[number, number, Placement["turn"]]>)
    sq("bench", dx, dz, turn);
  const core = [
    "townhouse",
    "rural-store-1",
    "rural-store-3",
    "townhouse",
    "rural-store-5",
    "rural-diner",
  ];
  const homes = [
    "house",
    "rural-house",
    "bungalow",
    "house",
    "rural-store-3",
    "rural-house",
    "bungalow",
  ];
  roadFrontage(ctx, put, poi.x, poi.z, 230, 520, (n, d) =>
    d < 90 ? core[n % core.length]! : homes[n % homes.length]!,
  );
}

/**
 * Model-space points just outside each authored entrance (building-access-routes.json, the
 * building-access-v3 test routes, the terminal's porch steps): kept clear of anything placed
 * later, and level with the building, so a placement never blocks or buries a door.
 */
const ENTRANCE_APRONS: Record<string, Array<[number, number]>> = {
  // The mega hospital's ground-floor doors (build_hospital.mjs, 2026-11-13).
  ...(Object.fromEntries(
    Object.entries(hospitalPlan.blocks).map(([id, b]) => [id, b.aprons]),
  ) as Record<string, Array<[number, number]>>),
  apartment: [[-11, -4.8]],
  barn: [[8.4, 6.25]],
  barracks: [[0, 12]],
  "bauhaus-block": [[0, 6.5]],
  "brick-shop": [[11.5, 0]],
  cabin: [[1.35, 5.8]],
  church: [[0, 6.2]],
  "fire-station": [
    [-9.8, 12],
    [-14.4, -2.6],
  ],
  garage: [
    [3.6, -1.93],
    [-3.6, 1.935],
  ],
  house: [[-1.4, 5]],
  "ind-generic-2": [[-1.45, 3.7]],
  "ind-office-trailer": [[-1.5, 5]],
  "ind-warehouse-1": [[18, -4.38]],
  "ind-warehouse-3": [[6.081, 13.3]],
  "military-hq": [[9.095, 4.6]],
  "rural-diner": [[5.4, 3.7]],
  "rural-house": [[0.05, 5.6]],
  "rural-mobile-home": [[2.4, 2.3]],
  "rural-quonset": [[0, 7.5]],
  "rural-store-1": [[-2.6, 5.7]],
  "rural-store-3": [[0, 6.4]],
  "rural-store-5": [[-5.2, -3.75]],
  "rural-trailer": [[-2.8, -0.385]],
  "rural-wood-1": [[10.8, 7.15]],
  "rural-wood-4": [[0, 7.5]],
  shed: [[-2.1, 3]],
  "strip-mall": [[22.65, 8.5]],
  // The hospital's four ground-floor doors (locations.py, 2026-11-09).
  hospital: [
    [1, 13.6],
    [8, -13.6],
    [-21.2, 6],
    [21.2, 6],
  ],
  // Southern Military Base's posts and Murder Cabins' camp cabin (military.py, 2026-11-09).
  "control-post": [
    [0.8, 7.2],
    [0.8, -7.4],
  ],
  "command-post": [
    [-10, 9.9],
    [14.9, 0],
  ],
  "camp-cabin": [[-0.75, 5.3]],
  // Blackwater Prison's cell house (prison.py): main, back and the wings' end doors.
  "prison-block": [
    [0, 3.4],
    [0, -7.4],
    [-27.4, 0],
    [27.4, 0],
  ],
  // The Millhaven works halls' steel doors (locations.py shells), in their long sides.
  "factory-hall": [
    [8.3, 0],
    [-8.3, 0],
  ],
  "ind-warehouse-4": [
    [0, 7.8],
    [0, -7.8],
  ],
  "ind-warehouse-5": [
    [17.5, 0],
    [-17.5, 0],
  ],
  "ind-smith": [
    [0, 6.9],
    [0, -6.9],
  ],
  terminal: [
    [-1.4, -11.6],
    [-5.45, 11.6],
    [10.45, 9.3],
  ],
  townhouse: [[0, 6]],
  warehouse: [
    [0, 24.5],
    [0, -24.5],
  ],
};

/**
 * Places a model on the ground with an overlap test against everything already placed nearby:
 * the low point under its footprint, refused on slopes (`flat`), under water, on a road, a
 * runway or a bridge. Returns whether it was placed.
 */
type GroundPut = (
  model: string,
  x: number,
  z: number,
  turn: Placement["turn"],
  opts?: { margin?: number; flat?: number; onRoad?: boolean },
) => boolean;
function groundPlacer(
  ctx: Context,
  out: Placement[],
  poiId: string,
  cx: number,
  cz: number,
  radius: number,
): GroundPut {
  const taken: Array<[number, number, number, number]> = [];
  /** World points just outside a placement's entrances. */
  const apronsOf = (model: string, x: number, z: number, turn: number) =>
    (ENTRANCE_APRONS[model] ?? []).map(([ax, az]) => {
      const [dx, dz] = turnXZ(ax, az, turn);
      return [x + dx, z + dz] as [number, number];
    });
  const keepClear = ([ax, az]: [number, number]) =>
    taken.push([ax - 1.2, az - 1.2, ax + 1.2, az + 1.2]);
  for (const p of out)
    if (Math.abs(p.x - cx) < radius + 120 && Math.abs(p.z - cz) < radius + 120) {
      const [w, d] = footAt(p.model, p.turn);
      taken.push([p.x - w / 2, p.z - d / 2, p.x + w / 2, p.z + d / 2]);
      apronsOf(p.model, p.x, p.z, p.turn).forEach(keepClear);
    }
  return (model, x, z, turn, { margin = 1.5, flat = 1.0, onRoad = false } = {}) => {
    const [w, d] = footAt(model, turn);
    const box: [number, number, number, number] = [
      x - w / 2 - margin,
      z - d / 2 - margin,
      x + w / 2 + margin,
      z + d / 2 + margin,
    ];
    if (taken.some(([a, b, c, e]) => box[0] < c && box[2] > a && box[1] < e && box[3] > b))
      return false;
    // The centre and the outline every ~4 m (a road can cross a long wall between its corners).
    const pts: Array<[number, number]> = [[x, z]];
    const nx = Math.max(1, Math.ceil(w / 4)),
      nz = Math.max(1, Math.ceil(d / 4));
    for (let i = 0; i <= nx; i++)
      for (const sz of [-1, 1]) pts.push([x - w / 2 + (w * i) / nx, z + (sz * d) / 2]);
    for (let i = 1; i < nz; i++)
      for (const sx of [-1, 1]) pts.push([x + (sx * w) / 2, z - d / 2 + (d * i) / nz]);
    const hs = pts.map(([px, pz]) => ctx.heightAt(px, pz));
    const low = Math.min(...hs);
    if (Math.max(...hs) - low > flat || underwater(ctx.meta, x, z, low)) return false;
    if (onRunway(ctx.meta, x, z, Math.max(w, d) / 2 + 12)) return false;
    if (bridgeDistance(ctx.meta, x, z) < Math.max(w, d) / 2 + 14) return false;
    if (!onRoad && pts.some(([px, pz]) => roadDistance(ctx.meta, px, pz) < 4.6)) return false;
    // Level with the POI's pad: one of its buildings; beyond it, on the terrain like the
    // countryside sites (static-world tests hold POI placements to the pad height).
    const poi = ctx.meta.pois.find((p) => p.id === poiId);
    const onPad =
      poi?.padHeight !== undefined &&
      pts.every(([px, pz]) => Math.abs(ctx.heightAt(px, pz) - poi.padHeight!) < 1.5);
    const y = onPad ? poi!.padHeight! : low;
    // Its doors: outside them, clear of everything and level with the building (never dug in).
    const doors = apronsOf(model, x, z, turn);
    for (const [ax, az] of doors) {
      if (
        taken.some(([a, b, c, e]) => ax > a - 0.6 && ax < c + 0.6 && az > b - 0.6 && az < e + 0.6)
      )
        return false;
      // A step up of at most ~0.33 m onto the floor (some sit 0.12 m proud), never a ledge.
      const rise = y - ctx.heightAt(ax, az);
      if (rise > 0.2 || rise < -0.3) return false;
    }
    out.push({
      model,
      x: +x.toFixed(2),
      y: +y.toFixed(2),
      z: +z.toFixed(2),
      turn,
      poi: onPad ? poiId : "countryside",
    });
    taken.push(box);
    doors.forEach(keepClear);
    return true;
  };
}

/**
 * Buildings along every road within `radius` of (cx, cz), both sides, set back from the kerb
 * and facing the road (quarter turns: the nearest), `pick(n, distance from the centre)` for the
 * model; a car at the kerb now and then. Deterministic (`salt`).
 */
function roadFrontage(
  ctx: Context,
  put: GroundPut,
  cx: number,
  cz: number,
  radius: number,
  salt: number,
  pick: (n: number, d: number) => string,
  density = 0.8,
) {
  let n = 0;
  for (const road of ctx.meta.roads) {
    const half = road.width / 2;
    for (let k = 0; k + 1 < road.points.length; k++) {
      const [ax, az] = road.points[k]!,
        [bx, bz] = road.points[k + 1]!;
      const len = Math.hypot(bx - ax, bz - az);
      if (!(len > 1)) continue;
      const dx = (bx - ax) / len,
        dz = (bz - az) / len;
      for (const side of [-1, 1] as const) {
        const nx = -dz * side,
          nz = dx * side;
        // Face the road: the model's front (+z at turn 0) points back along −n.
        const fx = -nx,
          fz = -nz;
        const turn = (
          Math.abs(fx) > Math.abs(fz) ? (fx > 0 ? 1 : 3) : fz > 0 ? 0 : 2
        ) as Placement["turn"];
        for (let t = 2; t < len - 2;) {
          const px = ax + dx * t,
            pz = az + dz * t;
          const dist = Math.hypot(px - cx, pz - cz);
          if (dist > radius) {
            t += 6;
            continue;
          }
          const h = hash(salt + k * 7 + (side > 0 ? 1 : 0), Math.round(px) * 31 + Math.round(pz));
          const model = pick(n++, dist);
          const [w, d] = footAt(model, turn);
          const front = Math.abs(nx) > Math.abs(nz) ? d : w,
            depth = Math.abs(nx) > Math.abs(nz) ? w : d;
          const setback = half + 2.5 + hash(salt + 3, n) * 3;
          if (
            h < density &&
            put(model, px + nx * (setback + depth / 2), pz + nz * (setback + depth / 2), turn)
          ) {
            if (hash(salt + 5, n) < 0.25) {
              const car = hash(salt + 6, n) < 0.5 ? "car-sedan" : "car-pickup";
              const along = Math.abs(dx) > Math.abs(dz);
              put(
                car,
                px + nx * (half - 1.3),
                pz + nz * (half - 1.3),
                (along ? (dx > 0 ? 0 : 2) : dz > 0 ? 1 : 3) as Placement["turn"],
                { margin: 0.5, flat: 1.5, onRoad: true },
              );
            }
            t += front + 3 + hash(salt + 7, n) * 6;
          } else t += 4;
        }
      }
    }
  }
}

/** West Point (C9/D9): the red-roofed compound at the island's western end. */
function westPoint(poi: Poi, out: Placement[], ctx: Context) {
  const { at } = builder(poi, out);
  at("fire-station", 0, 0, 0);
  at("garage", 24, -8, 1);
  at("container-20", -22, 10, 1);
  at("car-pickup", 18, 12, 0);
  // Owner, 2026-11-08: one fire station on a bare pad. The compound gets its yard (a water tower,
  // fuel, a radio mast, sheds and stores) and a hamlet along the roads up the hill.
  const put = groundPlacer(ctx, out, poi.id, poi.x, poi.z, 200);
  const yard: Array<[string, number, number, Placement["turn"]]> = [
    ["water-tower", -24, -18, 0],
    ["fuel-tank", 26, 18, 1],
    ["radio-tower", -34, 22, 0],
    ["shed", 32, -22, 1],
    ["rural-quonset", -40, -4, 1],
    ["container-40", -10, 26, 0],
    ["container-20", 4, 26, 0],
    ["hay-bales", 12, -26, 0],
    ["wreck-car", 40, 4, 1],
    ["dumpsters", -18, 18, 0],
  ];
  for (const [m, dx, dz, turn] of yard)
    put(m, poi.x + dx, poi.z + dz, turn, { margin: 0.8, flat: 1.6 });
  const homes = ["rural-house", "house", "barn", "rural-house", "cabin", "bungalow"];
  roadFrontage(ctx, put, poi.x, poi.z, 190, 530, (n) => homes[n % homes.length]!, 0.7);
}

/**
 * Island Airfield (I9): a small civilian airstrip on the Superstore island, as on the concept
 * map (a Verdansk-style Superstore island, not a military island; the military base is on the
 * mainland at G7): a row of hangars along the north side, the control tower and a few
 * buildings in the middle, fuel and freight. The runway passes ~85 m south-west of the centre.
 */
function airfield(poi: Poi, out: Placement[], ctx: Context) {
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
  airfieldPolish(poi, out, ctx);
}

/**
 * The airfield beyond its hangar row (owner, 2026-11-08: "audit the rest of the island, the
 * airstrip …, polish the entire island"): the apron and the concrete round it were empty. A cargo
 * plane and a helicopter on the apron (big cover), ground vehicles and freight by the hangars, a
 * logistics terminal with its car park on the west side, a fuel farm, and a cargo district of
 * warehouses, container stacks and parked rigs along the roads west of the field. Everything is
 * kept off the runway and the roads.
 */
function airfieldPolish(poi: Poi, out: Placement[], ctx: Context) {
  const put = groundPlacer(ctx, out, poi.id, poi.x, poi.z, 700);
  const at = (model: string, dx: number, dz: number, turn: Placement["turn"] = 0, flat = 1.2) =>
    put(model, poi.x + dx, poi.z + dz, turn, { margin: 1, flat });
  // The apron (between the buildings and the runway; it widens to the west).
  at("cargo-plane", -100, 45, 0, 2);
  at("helipad", -235, 15, 0, 1.5);
  at("chinook", -232, 60, 1, 2);
  for (const [m, dx, dz, turn] of [
    ["box-truck", 40, -22, 0],
    ["cargo-van", 62, -24, 0],
    ["tow-truck", -58, -22, 0],
    ["container-20", -20, -30, 0],
    ["container-20", -12, -30, 0],
    ["box-truck", -150, 10, 1],
    ["burned-car-b", -60, 20, 1],
    ["ambulance", -2, -6, 0],
    ["semi-cab", 120, -20, 1],
    ["reefer-trailer", 132, -20, 1],
  ] as Array<[string, number, number, Placement["turn"]]>)
    at(m, dx, dz, turn);
  for (let i = 0; i < 6; i++) at("pallets", -120 + i * 4, -40, 0);
  for (let i = 0; i < 4; i++) at("boxes", 70 + i * 3, -35, 1);
  /** The first of the candidate spots that takes the model. */
  const first = (model: string, turn: Placement["turn"], spots: number[][], flat = 1.5) =>
    spots.some(([dx, dz]) => at(model, dx!, dz!, turn, flat));
  // The passenger terminal, airliner and light aircraft (owner's 2026-11-08 downloads).
  first("terminal", 0, [
    [-330, -40],
    [-300, -20],
    [-360, -70],
  ]);
  first(
    "airliner",
    0,
    [
      [-190, 70],
      [-260, 90],
      [-300, 60],
    ],
    2,
  );
  first(
    "bizjet",
    0,
    [
      [-30, 30],
      [10, 20],
      [-40, 50],
      // (The joined-up road network, 2026-11-05, brings the access road across the first
      // three spots.)
      [0, 40],
      [10, 30],
      [-10, 40],
    ],
    2,
  );
  first("plane-shelter", 0, [
    [60, 10],
    [90, 0],
  ]);
  first(
    "cessna-172",
    0,
    [
      [35, 12],
      [110, -2],
    ],
    2,
  );
  first(
    "cessna-172",
    1,
    [
      [-180, -20],
      [-200, 0],
    ],
    2,
  );
  first(
    "cessna-402",
    0,
    [
      [170, -25],
      [-140, 35],
    ],
    2,
  );
  first("fuel-truck", 1, [
    [-150, 55],
    [-130, 60],
  ]);
  first("fuel-truck", 0, [
    [-190, -60],
    [-175, -55],
  ]);
  first("oil-tanker", 0, [
    [-240, -170],
    [-250, -140],
  ]);
  for (let i = 0; i < 6; i++)
    first("bag-cart", 0, [
      [-300 + i * 3, 0],
      [-300 + i * 3, 10],
    ]);
  first("windsock", 0, [
    [150, 40],
    [130, 50],
    [-380, 200],
  ]);
  first(
    "plane-wreck",
    1,
    [
      [-380, 260],
      [-420, 230],
      [-330, 300],
    ],
    2,
  );
  // Logistics terminal with its car park, on the west side of the field.
  at("ind-terminal", -270, -110, 0, 1.5);
  for (const dz of [-74, -52]) {
    if (!at("lot-lines", -270, dz, 0, 1.5)) continue;
    for (let b = 0; b < 13; b++)
      for (const side of [-1, 1]) {
        const h = hash(540 + dz, b * 2 + side);
        if (h > 0.3) continue;
        const model = BAY_CARS.find(([, p]) => hash(541 + dz, b + side * 3) < p)![0];
        const bx = -270 - 18.2 + (b + 0.5) * 2.8;
        if (LONG_Z.has(model)) at(model, bx, dz + side * 3, side > 0 ? 0 : 2, 2);
        else at(model, bx, dz + side * 2.7, side > 0 ? 1 : 3, 2);
      }
  }
  // Fuel farm behind the fuel tanks, fenced.
  at("ind-tank", -215, -150, 0, 1.5);
  at("ind-tank", -215, -120, 0, 1.5);
  // The cargo district west of the field: warehouses, a hangar, site offices and container
  // stacks along the roads; rigs parked between them.
  const industry = [
    "ind-warehouse-1",
    "warehouse",
    "ind-warehouse-3",
    "container-40",
    "ind-warehouse-1",
    "container-40",
    "ind-office-trailer",
    "warehouse",
    "ind-hangar",
    "ind-warehouse-3",
    "container-40",
  ];
  roadFrontage(
    ctx,
    put,
    poi.x - 470,
    poi.z - 80,
    360,
    550,
    (n) => industry[n % industry.length]!,
    0.4,
  );
  // Mixed buildings along the roads north and east of the field (it was all bare concrete).
  const mixed = [
    "ind-warehouse-3",
    "rural-store-5",
    "rural-quonset",
    "brick-shop",
    "rural-store-1",
  ];
  roadFrontage(ctx, put, poi.x + 120, poi.z - 260, 260, 560, (n) => mixed[n % mixed.length]!, 0.45);
  for (let i = 0; i < 10; i++) {
    const x = poi.x - 560 + hash(570, i) * 260,
      z = poi.z - 260 + hash(571, i) * 300;
    if (put("reefer-trailer", x, z, 0)) put("semi-cab", x, z - 6.75 - 3.71 - 0.6, 0);
  }
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

/** Length (m) of segment a→b inside the rectangle [x0, x1] × [z0, z1] (Liang–Barsky). */
function clippedLength(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  x0: number,
  z0: number,
  x1: number,
  z1: number,
) {
  let t0 = 0,
    t1 = 1;
  const dx = bx - ax,
    dz = bz - az;
  for (const [p, q] of [
    [-dx, ax - x0],
    [dx, x1 - ax],
    [-dz, az - z0],
    [dz, z1 - az],
  ] as const) {
    if (p === 0) {
      if (q < 0) return 0;
      continue;
    }
    const r = q / p;
    if (p < 0) t0 = Math.max(t0, r);
    else t1 = Math.min(t1, r);
  }
  return t1 > t0 ? (t1 - t0) * Math.hypot(dx, dz) : 0;
}

/**
 * Whether a road's centreline crosses the rectangle (road audit 2026-11-11: the samples a
 * footprint was checked at lay 11-21 m apart on a big building, and a 7 m street ran between
 * them, through the building).
 */
function roadInRect(meta: WorldMeta, x0: number, z0: number, x1: number, z1: number) {
  const index = roadSegments(meta);
  for (let cz = Math.floor(z0 / ROAD_CELL); cz <= Math.floor(z1 / ROAD_CELL); cz++)
    for (let cx = Math.floor(x0 / ROAD_CELL); cx <= Math.floor(x1 / ROAD_CELL); cx++) {
      const list = index.get(cz * 4096 + cx);
      if (!list) continue;
      for (let k = 0; k < list.length; k += 4)
        if (clippedLength(list[k]!, list[k + 1]!, list[k + 2]!, list[k + 3]!, x0, z0, x1, z1) > 0)
          return true;
    }
  return false;
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

/** Footprints (x, z extent in m at turn 0, models.json sizes rounded up) of town buildings. */
const FOOT: Record<string, [number, number]> = {
  // Big models the placers did not know the size of (a hospital landed against a 43 × 83 m
  // clinic block, 2026-11-08): their real footprints.
  "ind-building-10": [43.5, 83.3],
  // (2026-11-11 location upgrades: small kit set in rows and nests.)
  "rock-big-1": [7, 5],
  "rock-big-2": [8.9, 9],
  "pipe-stack": [1.6, 2.3],
  "cement-pallet": [1, 1.3],
  checkpoint: [4.5, 4.1],
  // (2026-11-11 strait: bridgeheads and shores.)
  "bridge-booth": [5.7, 5.8],
  "bridge-lookout": [2.2, 2.2],
  "bridge-guardtower": [6.2, 6.1],
  "roadside-motel": [37.1, 17.1],
  "motel-sign": [2.1, 6.3],
  "rest-shelter": [10.4, 8.6],
  "payphone-booth": [1.2, 1.2],
  "modular-motel": [24.5, 11],
  "roadside-gas": [12.9, 17.5],
  "fuel-dispenser": [0.6, 1.3],
  "road-pole": [0.5, 0.5],
  "bridge-watchtower": [5.9, 5.3],
  tetrapod: [2.4, 2.6],
  "shore-breakwater": [92, 17.2],
  "shore-slab": [11.8, 8.7],
  "shore-ridge": [5.9, 14],
  "shore-cliff-a": [11, 17.3],
  "shore-cliff-b": [9.6, 8.5],
  "shore-ledge": [9.3, 18.4],
  driftwood: [6.5, 7],
  "beach-wreck": [6.1, 13],
  watchtower: [4.4, 4.4],
  "guard-tower": [5, 4.6],
  "road-barrier": [1.7, 2.3],
  "military-crate": [0.9, 1.6],
  hesco: [1.3, 1.3],
  "radar-truck": [5.8, 10],
  // (2026-11-11 location models.)
  "stone-crusher": [9, 8.4],
  "mine-cart": [1.1, 2.2],
  "chemical-tank": [2.9, 6.5],
  "security-booth": [2.9, 3],
  wharf: [30, 29.9],
  "old-pier": [18.2, 40],
  "treatment-plant": [25.1, 60],
  "coastal-bunker": [15.3, 22],
  "transformer-booth": [8, 4.4],
  "military-hq": [40.2, 33.7],
  barracks: [11.8, 19.6],
  tent: [11.2, 10.6],
  "ind-portal-crane": [9.4, 20.9],
  "radio-mast": [11.7, 11.8],
  pier: [8.2, 24],
  awning: [10.3, 4.8],
  yc130: [40.4, 29.4],
  // Landmarks (2026-11-08): railways, port, power station, hospital, schools, salvage, graves.
  "fire-hydrant": [0.5, 0.5],
  "ac-units": [3.4, 2.8],
  "gravel-mound": [6.8, 11],
  // Location polish (2026-11-09): the quarry pit, Iron Peaks, Pine Ridge, Northstar's yards.
  conveyor: [42, 5.9],
  "cable-reel": [2, 2],
  "con-pipe-long": [2.3, 4],
  "quarry-face": [14, 11.2],
  // The owner's 2026-11-11 downloads (eastport-v1): Eastport's hut and boats, mountain rock.
  "fishing-hut": [4.3, 7],
  // (2026-11-11 estates: art/br/fitout/estates.py.)
  "pool-villa": [34.7, 35],
  "modern-house": [36, 15.2],
  "lux-yacht": [8.5, 39.7],
  "swimming-pool": [16.4, 12],
  "lifeguard-tower": [4.4, 6.3],
  parasol: [2.8, 3.3],
  surfboards: [3, 1],
  fountain: [1.2, 1],
  "small-motorboat": [5.2, 1.7],
  "oselvar-boat": [1.6, 6],
  "sea-cliff": [30, 19.6],
  "big-boulder": [5.7, 6],
  "rock-scan-15": [3, 1],
  "mine-entrance": [36, 13.9],
  "old-hut": [6.2, 7.8],
  "log-cabin": [6.3, 4.4],
  "picket-fence": [2.3, 0.22],
  "privacy-fence": [2.72, 0.08],
  "privacy-fence-broken": [2.72, 0.08],
  ifv: [3.4, 7],
  "rail-track": [4, 2.9],
  "diesel-loco": [3.6, 16],
  boxcar: [4.8, 13],
  "old-wagon": [2.3, 12],
  "rail-depot": [16.4, 27.2],
  "rail-crossing": [2.8, 0.7],
  "port-crane": [42.7, 19.6],
  "cargo-ship": [13.2, 70],
  "container-ship": [22.1, 150],
  "brick-substation": [7.1, 10.5],
  "transformer-kiosk": [3.2, 4.2],
  transformer: [1.6, 0.7],
  "smoke-stacks": [13.3, 3],
  hospital: [40, 24.8],
  // The mega hospital's blocks and sky bridges (2026-11-13, build_hospital.mjs).
  "hosp-main": [98, 20],
  "hosp-west": [20, 70],
  "hosp-east": [20, 70],
  "hosp-er": [91, 20],
  "hosp-bridge-14": [14, 3.7],
  "hosp-bridge-60": [60, 3.7],
  school: [62, 52.7],
  "basketball-hoop": [2.7, 1.8],
  bleacher: [6, 7],
  "junk-pile": [8, 8],
  "scrap-pile": [3, 2],
  "rust-sedan": [2.9, 4.8],
  "school-bus": [4.4, 11],
  btr: [7.7, 2.9],
  "church-ruins": [18.3, 8.7],
  "crashed-truck": [4.7, 6.5],
  "grave-row": [3.2, 2.5],
  "range-target": [2.4, 0.3],
  "range-booth": [1.1, 0.7],
  chapel: [12, 6.8],
  "sat-dish": [5.5, 6.1],
  tank: [3.6, 9.5],
  "traffic-signal": [7.3, 0.7],
  tires: [1.3, 1.3],
  "oil-drums": [1.9, 1.8],
  // The open country (wildlands): relief, ruins and story spots.
  crag: [43.3, 68],
  "boulder-field": [110, 93.1],
  "abbey-ruins": [44, 16.5],
  "arch-ruins": [17.5, 4.1],
  "fire-lookout": [9.4, 9],
  pylon: [14.4, 7.1],
  "wind-pump": [4.2, 5.1],
  "rail-tank": [2.7, 12],
  excavator: [3.9, 9.9],
  "wreck-sedan": [5.2, 2.7],
  "rust-container": [12.2, 6.4],
  outhouse: [1.3, 1.6],
  "log-pile-s": [3.2, 1.2],
  "log-stack": [4.9, 8],
  "ruined-cabin": [5.4, 6],
  "rock-tall": [5.6, 6],
  "rock-grey": [4.5, 3.7],
  "river-rock-a": [2.6, 3],
  "rock-cluster": [3.8, 5],
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
  boxes: [1.7, 1.3],
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
  // Island polish (2026-11-08).
  "ind-terminal": [53.6, 16],
  helipad: [24, 22.1],
  chinook: [20.5, 30],
  "cargo-plane": [40.5, 29.5],
  airliner: [32.4, 34],
  "cessna-172": [11, 8.2],
  "cessna-402": [12.8, 10.5],
  bizjet: [19.4, 22],
  terminal: [40, 19.4],
  carousel: [4.4, 4.5],
  swings: [6.4, 5.9],
  bench: [2, 0.5],
  payphone: [0.9, 0.9],
  "old-bridge": [2.7, 19],
  "rusty-truck": [2.6, 5.5],
  "boat-wreck": [5.4, 2],
  "tent-dome": [2.4, 2.4],
  "plane-shelter": [21.1, 12],
  "plane-wreck": [4, 13.5],
  "bag-cart": [1.5, 3],
  "fuel-truck": [2.5, 8.5],
  "oil-tanker": [19, 2.9],
  "hunting-stand": [2.6, 4],
  "mossy-log": [4.2, 1.4],
  stump: [1.6, 1.6],
  "tent-canvas": [4.2, 2.9],
  campfire: [3, 2.3],
  hangar: [62.4, 62.4],
  "hangar-j": [62, 90],
  "atc-tower": [8.2, 8.2],
  "semi-cab": [3.6, 7.5],
  "reefer-trailer": [2.7, 13.6],
  "box-truck": [6.1, 2.7],
  "cargo-van": [2.5, 5.8],
  "tow-truck": [5.7, 2.1],
  ambulance: [5.1, 2.4],
  "wreck-bus": [11.1, 3],
  "burned-car-b": [2, 4.6],
  "crashed-car": [3.3, 4.9],
  cadillac: [1.9, 5.7],
  lookout: [6.1, 7.4],
  campsite: [12, 12],
  log: [4.6, 1.8],
  "wreck-car": [2.3, 4.9],
  "street-lamp": [4.2, 1.2],
  "car-sedan": [4.8, 1.8],
  "lot-lines": [36.4, 10.4],
  // The 2026-11-09 location audit's downloads.
  "gantry-crane": [25, 14.8],
  stretcher: [0.7, 2.2],
  wheelchair: [0.8, 1.1],
  "oxygen-tank": [0.4, 0.4],
  buoy: [0.7, 0.7],
  "army-tent": [7.5, 7.5],
  "medical-tent": [4.5, 6],
  "factory-hall": [14.6, 26],
  "ind-warehouse-4": [42.1, 13.6],
  "ind-warehouse-5": [33, 55],
  "ind-smith": [18.3, 11.8],
  "ind-loadbay": [14.9, 27.8],
  "ind-tank-2": [19.8, 19.8],
  "ind-substation": [11.8, 4.4],
  "water-tower": [5.1, 4.8],
  "radio-tower": [5.1, 5.1],
  "gas-forecourt": [21.7, 16.8],
  windmill: [11.9, 5.5],
  // Blackwater Prison and Riverwood (2026-11-09 audit downloads).
  "prison-block": [52, 13.1],
  "prison-tower": [6, 6],
  floodlight: [2.3, 4.7],
  "yard-shelter": [5.7, 8.5],
  "cell-bars": [3.5, 0.2],
  "prison-bed": [0.8, 2],
  sawmill: [10.6, 11.4],
  "river-shack": [4.5, 5],
  motorboat: [2.3, 4.4],
  "plank-stack": [1.7, 3],
  "lot-light": [4.5, 0.8],
  // Southern Military Base and Murder Cabins (2026-11-09 audit downloads).
  humvee: [2.7, 4.9],
  "mil-truck": [2.2, 7.4],
  "mil-jeep": [2.2, 4],
  "mil-armoured-car": [2.9, 5.7],
  "air-raid-bunker": [6, 14.2],
  "ammo-stack": [4.9, 4.9],
  "control-post": [19.9, 12.9],
  "command-post": [28.5, 18.5],
  "field-hangar": [21.1, 11.9],
  "camp-cabin": [10.5, 9.2],
  "swamp-shack": [8, 4.1],
  "camp-gear": [4, 4],
  canoe: [0.9, 4.6],
  "archery-target": [0.9, 0.4],
  "camper-van": [1.8, 4.5],
  "camp-dock": [8.4, 14],
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
  // Traffic signals at about half the inner junctions, on the south-east corner's pavement, the
  // mast arm over the street (real-world street detail, 2026-11-08).
  for (let i = 1; i + 1 < t.xs.length; i++)
    for (let j = 1; j + 1 < t.zs.length; j++) {
      if (hash(salt + 23, i * 31 + j) > 0.5) continue;
      const x = t.xs[i]! + t.street / 2 + 1.2,
        z = t.zs[j]! + t.street / 2 + 1.2;
      put("traffic-signal", x - 3.65, z, 2, 0.2);
    }
  // Fire hydrants on the north-west corners of about two junctions in three.
  for (let i = 1; i + 1 < t.xs.length; i++)
    for (let j = 1; j + 1 < t.zs.length; j++)
      if (hash(salt + 29, i * 37 + j) < 0.65)
        put("fire-hydrant", t.xs[i]! - t.street / 2 - 1, t.zs[j]! - t.street / 2 - 1, 0, 0.1);
  let n = 0;
  /** Houses on the ordinary (housing) blocks, for their fenced lots after every block is built. */
  const homes: YardHome[] = [];
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
        const placed = hash(salt + 17, n) <= fill && put(model, cx, cz, side.turn);
        // A fenced yard round it (neighbourhoods, 2026-11-05), dressed after every block is
        // built. (Northstar's yards, 2026-11-09, are these too: one fence system, not two.)
        if (placed && YARD_HOUSES.has(model))
          homes.push({
            model,
            cx,
            cz,
            turn: side.turn,
            along: side.along,
            inward: side.inward,
            at: side.at,
            front,
            depth,
          });
        if (placed && MAILBOX.has(model)) {
          // Its mailbox at the kerb, by the drive (real-world street detail, 2026-11-08).
          const along = pos + front * 0.3,
            kerb = side.at + side.inward * 0.6;
          out.push({
            model: "mailbox",
            x: +(side.along === "x" ? along : kerb).toFixed(2),
            y,
            z: +(side.along === "x" ? kerb : along).toFixed(2),
            turn: side.turn,
            poi: poi.id,
          });
        }
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
  yards(homes, out, ctx, poi, y, taken, free, put, salt);
  // Parked cars along the streets (cover between blocks), on the kerb side.
  for (let j = 0; j < t.zs.length; j++)
    for (let x = t.xs[0]! + 20; x < t.xs[t.xs.length - 1]! - 20; x += 23) {
      if (hash(salt + 43, j * 1009 + Math.round(x)) > 0.22) continue;
      const side = hash(salt + 47, j * 13 + Math.round(x)) < 0.5 ? -1 : 1;
      const z = t.zs[j]! + side * (t.street / 2 - 1.3);
      if (!free(x - 3, z - 1.5, x + 3, z + 1.5)) continue;
      // Only on the town's level ground (a street running off the pad into a river valley has
      // no kerb at pad height).
      if ([-3, 3].some((dx) => Math.abs(ctx.heightAt(x + dx, z) - y) > 1)) continue;
      const model = hash(salt + 53, Math.round(x) + j) < 0.6 ? "car-sedan" : "car-pickup";
      out.push({ model, x: +x.toFixed(2), y, z: +z.toFixed(2), turn: 1, poi: poi.id });
    }
  streetFurniture(poi, out, ctx, t, put, salt);
}

type YardHome = {
  model: string;
  cx: number;
  cz: number;
  turn: Placement["turn"];
  along: "x" | "z";
  /** +1/−1: the direction from the street into the block. */
  inward: 1 | -1;
  /** The street front's line (the block edge) across `along`. */
  at: number;
  front: number;
  depth: number;
};

/** Houses that get a fenced lot (not shops, garages or barns). */
const YARD_HOUSES = new Set([
  "house",
  "rural-house",
  "bungalow",
  "rural-wood-1",
  "rural-mobile-home",
  "cabin",
]);

/** Yard fence section length (m), build_yard_fence.mjs. */
const YARD_FENCE = 2.4;

/**
 * Fenced house lots (owner, 2026-11-05: neighbourhoods like H1Z1's): after a town's blocks are
 * built, about half the houses on the housing blocks get their lot fenced — from the pavement
 * to a back yard 9–15 m behind the house, a gate in front of the door — and the yard dressed:
 * a parked car, a shed, bins, a picnic table, a dog house or a trampoline, pallets, bushes along
 * the fence. A lot is only made where it is free (never through a neighbour or a street); the
 * houses themselves, and so the loot, are unchanged. The fences are see-through and have no
 * collision (build_yard_fence.mjs); the yard props are the towns' usual ones.
 */
function yards(
  homes: YardHome[],
  out: Placement[],
  ctx: Context,
  poi: Poi,
  y: number,
  taken: Array<[number, number, number, number]>,
  free: (x0: number, z0: number, x1: number, z1: number) => boolean,
  put: Put,
  salt: number,
) {
  let n = 0;
  for (const h of homes) {
    n++;
    if (hash(salt + 101, n) > 0.75) continue;
    // Lot in (a, c): a along the street, c from the street into the block.
    const back = 9 + hash(salt + 103, n) * 6;
    const front = h.at + h.inward * 0.6; // just inside the pavement
    const houseC = h.along === "x" ? h.cz : h.cx;
    const houseA = h.along === "x" ? h.cx : h.cz;
    const rear = houseC + h.inward * (h.depth / 2 + back);
    const a0 = houseA - h.front / 2 - 3,
      a1 = houseA + h.front / 2 + 3;
    const c0 = Math.min(front, rear),
      c1 = Math.max(front, rear);
    const rect = (p0: number, p1: number, q0: number, q1: number) =>
      h.along === "x"
        ? ([p0, q0, p1, q1] as [number, number, number, number])
        : ([q0, p0, q1, p1] as [number, number, number, number]);
    const [x0, z0, x1, z1] = rect(a0, a1, c0, c1);
    // Free of everything but the house itself (its own footprint is in `taken`).
    const own = taken.findIndex(([p, q, r, s]) => h.cx > p && h.cx < r && h.cz > q && h.cz < s);
    const ownBox = own >= 0 ? taken.splice(own, 1)[0]! : null;
    const clear = free(x0, z0, x1, z1);
    if (ownBox) taken.push(ownBox);
    if (!clear) continue;
    // On the flat pad all round (corners and mid-sides).
    if (
      [
        [x0, z0],
        [x1, z0],
        [x0, z1],
        [x1, z1],
        [(x0 + x1) / 2, z0],
        [(x0 + x1) / 2, z1],
      ].some(([px, pz]) => Math.abs(ctx.heightAt(px!, pz!) - y) > 1.2)
    )
      continue;
    // Yard dressing, behind the house (back yard) and beside it (the driveway side).
    const at = (pa: number, pc: number): [number, number] =>
      h.along === "x" ? [pa, pc] : [pc, pa];
    const backMid = houseC + h.inward * (h.depth / 2 + back / 2);
    const turnAlong = (h.along === "x" ? 0 : 1) as Placement["turn"];
    const turnAcross = (h.along === "x" ? 1 : 0) as Placement["turn"];
    const r = (k: number) => hash(salt + 107 + k, n);
    if (r(0) < 0.35) {
      const car = r(1) < 0.45 ? "car-pickup" : r(1) < 0.8 ? "car-sedan" : "wreck-car";
      // Wrecks are modelled lengthwise along z, the cars along x.
      const t = car === "wreck-car" ? turnAlong : turnAcross;
      put(car, ...at(houseA + (r(2) < 0.5 ? -1 : 1) * (h.front / 2 - 2.5), backMid), t, 0.6);
    }
    if (r(3) < 0.4)
      put("shed", ...at(r(4) < 0.5 ? a0 + 4 : a1 - 4, rear - h.inward * 3), turnAlong, 0.4);
    // Budget (hundreds of lots per town): one bin on half the lots, small bushes only.
    if (r(5) < 0.5)
      put(
        "trash-can",
        ...at(houseA + (r(22) < 0.5 ? -1 : 1) * (h.front / 2 + 2.2), houseC),
        0,
        0.1,
      );
    const extra = ["picnic-table", "dog-house", "trampoline", "pallets", "boxes"][
      Math.floor(r(6) * 5)
    ]!;
    if (r(7) < 0.7) put(extra, ...at(houseA + (r(8) - 0.5) * h.front * 0.6, backMid), 0, 0.4);
    // Yard trees (planted: island.ts hands them to the vegetation, so they draw and collide
    // like any tree): one to three in the back corners and along the back fence, clear of the
    // house by a crown's width.
    for (let k = 0; k < 3; k++) {
      if (k > 0 && r(23 + k) < 0.5) continue;
      const pa =
        k === 0 ? (r(26) < 0.5 ? a0 + 2.5 : a1 - 2.5) : a0 + 2.5 + r(27 + k) * (a1 - a0 - 5);
      const pc = rear - h.inward * (2.5 + r(30 + k) * 2);
      const [tx, tz] = at(pa, pc);
      if (!free(tx - 2.5, tz - 2.5, tx + 2.5, tz + 2.5)) continue;
      taken.push([tx - 0.8, tz - 0.8, tx + 0.8, tz + 0.8]);
      const s = r(33 + k);
      out.push({
        model: s < 0.55 ? "tree-oak" : s < 0.85 ? "tree-birch" : "tree-pine",
        x: +tx.toFixed(2),
        y,
        z: +tz.toFixed(2),
        turn: 0,
        poi: poi.id,
      });
    }
    // Bushes along the inside of the back fence and in the front corners.
    for (let k = 0; k < 4; k++) {
      if (r(9 + k) < 0.35) continue;
      const pa = a0 + 1 + r(13 + k) * (a1 - a0 - 2);
      const pc = k < 3 ? rear - h.inward * 1.1 : front + h.inward * 1.1;
      put("bush-small", ...at(pa, pc), 0, 0);
    }
    taken.push([x0, z0, x1, z1]);
    // The fence: three sides and the front, with a gate in front of the door. Picket fences in
    // front of the nicer houses now and then, board fences otherwise.
    const model = r(21) < 0.3 ? "yard-picket" : "yard-fence";
    const gate0 = houseA - 1.8,
      gate1 = houseA + 1.8;
    const run = (p0: number, p1: number, fixed: number, alongA: boolean, gate: boolean) => {
      const len = Math.abs(p1 - p0);
      const count = Math.max(1, Math.round(len / YARD_FENCE));
      for (let k = 0; k < count; k++) {
        const p = p0 + ((p1 - p0) * (k + 0.5)) / count;
        if (gate && p > gate0 && p < gate1) continue;
        const [x, z] = alongA ? at(p, fixed) : at(fixed, p);
        // A section along world x is turn 0, along world z turn 1.
        const alongWorldX = (h.along === "x") === alongA;
        out.push({
          model,
          x: +x.toFixed(2),
          y,
          z: +z.toFixed(2),
          turn: alongWorldX ? 0 : 1,
          poi: poi.id,
        });
      }
    };
    run(a0, a1, front, true, true);
    run(a0, a1, rear, true, false);
    run(c0, c1, a0, false, false);
    run(c0, c1, a1, false, false);
  }
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
function underwater(meta: WorldMeta, x: number, z: number, h: number, margin = 0.5) {
  if (h < 2) return true;
  for (const w of meta.waterBodies) {
    const [x0, z0, x1, z1] = w.bounds;
    if (x >= x0 && x <= x1 && z >= z0 && z <= z1 && h < w.level + margin) return true;
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
  const grid = placementGrid(out, 60);
  for (let tries = 0; placed.length < o.count && tries < o.count * 60; tries++) {
    const a = hash(o.salt, tries) * Math.PI * 2,
      d = Math.sqrt(hash(o.salt + 1, tries)) * o.radius;
    const x = cx + Math.cos(a) * d,
      z = cz + Math.sin(a) * d;
    if (placed.some(([px, pz]) => Math.hypot(px - x, pz - z) < Math.max(28, foot * 2 + 8)))
      continue;
    const low = buildable(ctx, x, z, foot, flat);
    if (low === null) continue;
    const model = o.palette[(placed.length + 1) % o.palette.length]!;
    // An enterable building wants level ground: the floor must not be under the terrain
    // (a house on a 0.9 m rise at Fisher's Cove could not be walked into).
    if (ENTRANCE_APRONS[model] && buildable(ctx, x, z, foot, 0.6) === null) continue;
    // Its doors a step at most above the ground outside (the first quarter turn that allows
    // it): a warehouse on a sloping bank by the Old Dam had its door 0.4 m over the ground.
    const first = Math.floor(hash(o.salt + 2, tries) * 4) % 4;
    const turn = [0, 1, 2, 3]
      .map((k) => ((first + k) % 4) as Placement["turn"])
      .find((t) =>
        (ENTRANCE_APRONS[model] ?? []).every(([ax, az]) => {
          const [dx, dz] = turnXZ(ax, az, t);
          const rise = low - ctx.heightAt(x + dx, z + dz);
          return rise <= 0.2 && rise >= -0.3;
        }),
      );
    if (turn === undefined) continue;
    // Clear of what the POI already placed (Fisher's Cove's quay diner had a bungalow on it).
    const [fw, fd] = footAt(model, turn);
    if (
      grid.some(x - fw / 2, z - fd / 2, x + fw / 2, z + fd / 2, (p) => {
        const [pw, pd] = footAt(p.model, p.turn);
        return Math.abs(p.x - x) < (fw + pw) / 2 + 2 && Math.abs(p.z - z) < (fd + pd) / 2 + 2;
      })
    )
      continue;
    placed.push([x, z]);
    out.push({
      model,
      x: +x.toFixed(2),
      y: +low.toFixed(2),
      z: +z.toFixed(2),
      turn,
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
  const { meta } = ctx;
  const perches = meta.perches ?? [];
  perches.forEach(({ x, z, y }, i) => {
    const model = i === 0 ? "radio-mast" : i % 2 ? "watchtower" : "sandbags";
    out.push({ model, x, y, z, turn: 0, poi: poi.id });
    if (model === "sandbags")
      out.push({ model: "military-crate", x: x + 5, y, z, turn: 1, poi: poi.id });
    // The rim (map audit, 2026-11-04: a bare table top): rocks to peek around at its edge.
    for (let k = 0; k < 5; k++) {
      const a = ((k + hash(1400 + i, k)) / 5) * Math.PI * 2,
        d = 11.5 + hash(1410 + i, k) * 2;
      crag(
        k % 2 ? "rock-mid-1" : "rock-mid-2",
        x + Math.cos(a) * d,
        z + Math.sin(a) * d,
        1420 + i * 10 + k,
      );
    }
  });
  // Outcrops on the upper faces: cover on the climb and a broken, rocky read. They sit into the
  // slope (buried uphill, standing out downhill, toward a climber), on steeper ground than the
  // countryside's boulders tolerate.
  function crag(model: string, x: number, z: number, salt: number) {
    const [foot, relief] = CRAG_FIT[model]!;
    // Not on a climbing rope's line or where its climber steps off (rope.ts).
    if (onRopeRoute(x, z, foot + 3)) return;
    const hs = [-foot, foot].flatMap((ox) =>
      [-foot, foot].map((oz) => ctx.heightAt(x + ox, z + oz)),
    );
    const low = Math.min(...hs);
    if (Math.max(...hs) - low > relief) return;
    out.push({
      model,
      x: +x.toFixed(2),
      y: +(low - 0.3).toFixed(2),
      z: +z.toFixed(2),
      turn: (Math.floor(hash(salt, 9) * 4) % 4) as Placement["turn"],
      poi: poi.id,
    });
  }
  const CELL = 28;
  const n = Math.ceil(poi.radius / CELL);
  for (let gz = -n; gz <= n; gz++)
    for (let gx = -n; gx <= n; gx++) {
      const salt = 1500_000 + (gz + n) * 100 + (gx + n);
      if (hash(salt, 1) > 0.5) continue;
      const x = poi.x + (gx + hash(salt, 2)) * CELL,
        z = poi.z + (gz + hash(salt, 3)) * CELL;
      if (Math.hypot(x - poi.x, z - poi.z) > poi.radius) continue;
      if (ctx.heightAt(x, z) < 180) continue; // the forest below has its own cover
      if (perches.some((p) => Math.hypot(p.x - x, p.z - z) < 22)) continue;
      if (roadDistance(meta, x, z, 10) < 9) continue;
      const r = hash(salt, 4);
      crag(
        r < 0.3 ? "rock-big-1" : r < 0.5 ? "rock-big-2" : r < 0.75 ? "rock-mid-1" : "rock-mid-2",
        x,
        z,
        salt,
      );
      if (hash(salt, 5) < 0.5) {
        const a = hash(salt, 6) * Math.PI * 2;
        crag("rock-mid-2", x + Math.cos(a) * 7, z + Math.sin(a) * 7, salt + 7);
      }
    }
}
/** Half-size and the most ground relief under it for an outcrop set into a slope. */
const CRAG_FIT: Record<string, [number, number]> = {
  "rock-big-1": [3.5, 3.6],
  "rock-big-2": [4.5, 3.6],
  "rock-mid-1": [1.75, 2.2],
  "rock-mid-2": [1.5, 1.9],
};

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
/** Homes that get a mailbox at the kerb. */
const MAILBOX = new Set(["house", "rural-house", "bungalow", "rural-wood-1", "rural-mobile-home"]);

/** A school (Erangel's school): the building on the block's north half, a basketball court
 * with bleachers to the south, school buses at the kerb (2026-11-08 audit). */
const schoolBlock: Feature["build"] = (b, put) => {
  if (put("school", b.cx, b.z0 + 30, 0, 2))
    for (const dx of [-20, 0, 20]) put("ac-units", b.cx + dx, b.z0 + 30 + 21, 0, 0, 10.55);
  put("basketball-hoop", b.cx - 14, b.z1 - 22, 1, 0.3);
  put("basketball-hoop", b.cx + 14, b.z1 - 22, 3, 0.3);
  put("bleacher", b.cx - 4, b.z1 - 9, 2, 0.5);
  put("bleacher", b.cx + 4, b.z1 - 9, 2, 0.5);
  put("school-bus", b.x0 + 8, b.z1 - 14, 0, 0.5);
  put("school-bus", b.x1 - 8, b.z1 - 14, 0, 0.5);
  for (let k = 0; k < 4; k++) put("car-sedan", b.x1 - 10, b.z0 + 70 + k * 7, 1, 0.5);
};

/** A gas station on a town corner: the forecourt, its shop behind, cars at the pumps. */
const gasStation: Feature["build"] = (b, put) => {
  put("gas-forecourt", b.x0 + 16, b.z0 + 14, 0, 1);
  put("rural-store-1", b.x0 + 16, b.z0 + 36, 2, 1);
  put("car-pickup", b.x0 + 10, b.z0 + 12, 1, 0.3);
  put("car-sedan", b.x0 + 22, b.z0 + 16, 1, 0.3);
  put("transformer-kiosk", b.x0 + 34, b.z0 + 40, 0, 0.5);
};

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
  // Rigs parked overnight along the back of the lot (big cover by the junction).
  for (let k = 0; k < 3; k++) {
    put("semi-cab", b.x0 + 8 + k * 9, b.z1 - 30, 0, 0.6);
    put("reefer-trailer", b.x0 + 8 + k * 9, b.z1 - 19, 0, 0.6);
  }
};
/** Millhaven's works (location audit 2026-11-09): a factory hall, the foundry, a loading shed
 * on the old spur, the gas holder and the works' substation, with yard clutter to fight
 * through. */
const worksYard: Feature["build"] = (b, put) => {
  put("factory-hall", b.x0 + 12, b.cz, 0, 1);
  put("ind-smith", b.cx + 6, b.z0 + 12, 0, 1);
  put("ind-loadbay", b.x1 - 12, b.cz + 4, 0, 1);
  if (!put("ind-tank-2", b.cx + 8, b.z1 - 16, 0, 1)) put("ind-tank-2", b.cx - 6, b.z1 - 16, 0, 1);
  put("ind-substation", b.cx - 2, b.cz + 4, 0, 0.6);
  for (const [dx, dz, m, t] of [
    [-6, -8, "container-20", 0],
    [-6, -4.5, "container-20", 0],
    [10, 10, "forklift", 1],
    [14, 6, "pallets", 0],
    [2, 14, "oil-drums", 0],
    [-10, 16, "pallets", 1],
    [18, -6, "dumpsters", 0],
  ] as const)
    put(m, b.cx + dx, b.cz + dz, t as Placement["turn"], 0.5);
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
      { near: [200, 200], build: schoolBlock },
      { near: [-350, -250], build: gasStation },
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
      // (Location audit 2026-11-09: two warehouse models were all of Millhaven's industry.)
      industry: [
        "ind-warehouse-1",
        "factory-hall",
        "ind-warehouse-3",
        "ind-smith",
        "ind-warehouse-4",
        "rural-quonset",
        "ind-warehouse-1",
        "factory-hall",
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
      { near: [250, -150], build: schoolBlock },
      { near: [-300, 250], build: gasStation },
      { near: [620, 60], build: worksYard },
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
      // (Location audit 2026-11-09: the junction town had no school; its children went to
      // Millhaven's.)
      { near: [-260, 160], build: schoolBlock },
    ],
  );
}

/**
 * Central Hospital (H4): the mega hospital (2026-11-13, hospitalCampus): the main block, the two
 * wings and the emergency department round the courtyard, joined by sky bridges; round it the
 * outer ring of staff blocks, the ambulance station and the pharmacy, two helipads, car parks.
 */
function hospital(poi: Poi, out: Placement[], ctx: Context) {
  const { at, scatter } = builder(poi, out);
  // The mega hospital (2026-11-13): four blocks round the courtyard and their sky bridges, in
  // place of the two industrial wings, the north block and the terminal.
  hospitalCampus(poi, out);
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
  // The courtyard between the two wings (location audit 2026-11-09: 36 m of bare paving): a
  // decontamination line of tents, ambulances backed up to it, barriers and planting as cover.
  at("army-tent", 0, -46, 0);
  at("medical-tent", -8, -22, 1);
  at("medical-tent", 8, -22, 3);
  at("ambulance", -11, -4, 0);
  at("ambulance", 11, -4, 0);
  for (const [dx, dz, m, t] of [
    [0, -6, "jersey", 0],
    [-9, -33, "jersey", 1],
    [9, -33, "jersey", 1],
    [-12, -55, "bush-tall", 0],
    [12, -55, "bush-tall", 0],
    [0, -30, "stretcher", 0],
    [3, -30, "stretcher", 0],
    [-3, -12, "picnic-table", 0],
    [5, -12, "oxygen-tank", 0],
  ] as const)
    at(m, dx, dz, t as Placement["turn"]);
  void ctx;
}

/** The mega hospital's blocks (centre, POI-relative) and sky bridges (centre, floor height,
 * along z or x): build_hospital.mjs builds each block at turn 0 for these places. */
export const HOSPITAL_CAMPUS = {
  blocks: {
    "hosp-west": [-40, -15],
    "hosp-east": [40, -15],
    "hosp-main": [0, -74],
    "hosp-er": [0, 44],
  } as Record<string, [number, number]>,
  bridges: [
    // West wing's north end to the main block (first floor), east wing's (second floor).
    ["hosp-bridge-14", -40, -57, 4, 1],
    ["hosp-bridge-14", 40, -57, 8, 1],
    // The wings' south ends to the emergency department: first floor west, its roof east.
    ["hosp-bridge-14", -40, 27, 4, 1],
    ["hosp-bridge-14", 40, 27, 8, 1],
    // Over the courtyard between the wings (second floor).
    ["hosp-bridge-60", 0, -11.5, 8, 0],
  ] as Array<[string, number, number, number, Placement["turn"]]>,
};

type PlanRoom = {
  floor: number;
  side: number;
  bay: number;
  u: number[];
  v: number[];
  hall: boolean;
  kind: string;
};
type PlanBlock = {
  long: string;
  L: number;
  D: number;
  floors: number;
  corridor: number;
  rooms: PlanRoom[];
};

/**
 * The mega hospital (owner, 2026-11-13: "re design the hospital … make each have 2-3 floors and a
 * bridge over to other buildings, so its a mega hospital"; "full interior so its fun to be in
 * this area"): the four blocks and the five sky bridges, then every room furnished by its kind
 * with the owner's downloads (CC BY): ward beds with drips and monitors, examination rooms and
 * imaging, labs, operating theatres and scrub rooms, intensive care bays behind curtains, the
 * emergency department's trauma and treatment bays and its waiting hall, the morgue's cold
 * chambers and dissection table, offices and stores; signs, extinguishers, defibrillators and
 * the odd abandoned stretcher in the corridors (the outbreak's aftermath, our touch).
 */
function hospitalCampus(poi: Poi, out: Placement[]) {
  const y0 = poi.padHeight ?? 0;
  const push = (model: string, x: number, y: number, z: number, turn: Placement["turn"]) =>
    out.push({
      model,
      x: +x.toFixed(2),
      y: +y.toFixed(2),
      z: +z.toFixed(2),
      turn: (((turn % 4) + 4) % 4) as Placement["turn"],
      poi: poi.id,
    });
  for (const [id, [dx, dz]] of Object.entries(HOSPITAL_CAMPUS.blocks))
    push(id, poi.x + dx, y0, poi.z + dz, 0);
  for (const [id, dx, dz, h, turn] of HOSPITAL_CAMPUS.bridges)
    push(id, poi.x + dx, y0 + h, poi.z + dz, turn);
  const blocks = hospitalPlan.blocks as unknown as Record<string, PlanBlock>;
  /** The quarter turn that points a model's +z (its front) along world (fx, fz). */
  const facing = (fx: number, fz: number): Placement["turn"] =>
    Math.abs(fx) > Math.abs(fz) ? (fx > 0 ? 1 : 3) : fz > 0 ? 0 : 2;
  for (const [id, b] of Object.entries(blocks)) {
    const [bx, bz] = HOSPITAL_CAMPUS.blocks[id]!;
    const cx = poi.x + bx,
      cz = poi.z + bz;
    // Block-local (u along it, v across) to world, and its axes in the world.
    const along = b.long === "x" ? [1, 0] : [0, 1];
    const across = b.long === "x" ? [0, 1] : [1, 0];
    const world = (u: number, v: number) =>
      [cx + along[0]! * u + across[0]! * v, cz + along[1]! * u + across[1]! * v] as const;
    let salt = 0;
    for (const r of b.rooms) {
      const s = r.side;
      const [u0, u1] = r.u as [number, number];
      const vIn = Math.abs(r.v[0]!),
        vOut = Math.abs(r.v[1]!);
      const len = u1 - u0,
        depth = vOut - vIn;
      const fy = y0 + r.floor * 4;
      // In the room: `a` m along it from its start, `d` m in from the corridor wall, `h` up;
      // `face`: where the model's front looks ("in" to the corridor, "out" to the windows,
      // "along" down the room); `rot` adds quarter turns.
      const put = (model: string, a: number, d: number, face: string, h = 0, rot = 0) => {
        const [x, z] = world(u0 + a, s * (vIn + d));
        const f =
          face === "in"
            ? [-s * across[0]!, -s * across[1]!]
            : face === "out"
              ? [s * across[0]!, s * across[1]!]
              : [along[0]!, along[1]!];
        push(model, x, fy + h, z, (facing(f[0]!, f[1]!) + rot) as Placement["turn"]);
      };
      const pick = (k: number) => hash(9_870 + salt * 13 + k, r.bay + r.floor * 31 + s);
      salt++;
      // Beds and tables whose length runs along their model's x (hosp-bed, hosp-stretcher):
      // `rot` 1 lays it along the room's depth.
      switch (r.kind) {
        case "ward":
          // Four beds, two along each side wall (heads to the wall), drips, monitors, a
          // screen between; papers on the floor.
          for (const [k, [ba, bd]] of [
            [1.15, 2.0],
            [len - 1.15, 2.0],
            [1.15, depth - 1.5],
            [len - 1.15, depth - 1.5],
          ].entries()) {
            if (pick(10 + k) < 0.55) put("hosp-bed", ba!, bd!, "in");
            else put("hosp-bed-old", ba!, bd!, "along");
            if (k % 2 === 0) put("iv-drip", ba! + 1.5, bd! + 0.9, "in");
            else put("vitals-monitor", ba! - 1.5, bd! + 0.9, "in");
          }
          put("curtain-screen", len / 2, depth / 2, "along");
          put("med-cupboard", len / 2, depth - 0.15, "in", 1.4);
          if (pick(2) < 0.6) put("paper-debris", len / 2 + 0.6, 1.2, "along");
          break;
        case "icu":
          // Two beds behind their curtains, heads to the windows' wall, monitors and drips.
          for (const a of [1.9, len - 1.9]) {
            put("hosp-bed", a, depth - 1.6, "in", 0, 1);
            put("bed-curtain", a, depth - 1.7, "in");
            put("vitals-monitor", a - 1.3, depth - 0.6, "in");
            put("iv-drip", a + 1.2, depth - 0.6, "in");
          }
          put("med-cart", len / 2, 1.4, "along");
          if (pick(2) < 0.5) put("blood-bag", len / 2, 1.4, "along", 0.95);
          break;
        case "exam":
          put("hosp-bed-old", len / 2, depth - 2.0, "in");
          put("curtain-screen", len / 2 - 1.6, depth - 3.6, "in");
          put("med-cabinet", 0.7, depth - 0.6, "in");
          put("med-cupboard", len - 0.35, 1.0, "along", 1.4, 2);
          put("vitals-monitor", len - 1.0, depth - 0.6, "in");
          break;
        case "imaging":
          put("hosp-stretcher", len / 2, depth / 2, "in", 0, 1);
          put("xray-viewer", 0.12, 2.0, "along", 1.3);
          put("med-partition", len - 1.0, depth - 2.5, "along");
          put("lab-cabinet", len - 1.0, depth - 0.6, "in");
          break;
        case "lab":
          for (const a of [1.0, 2.6, len - 2.6, len - 1.0])
            put("lab-cabinet", a, depth - 0.6, "in");
          for (const a of [1.6, len - 1.6]) {
            put("med-cart", a, depth / 2, "along");
            put("microscope", a, depth / 2, "in", 0.95);
          }
          put("rusty-cart", len - 1.1, 1.6, "along");
          put("first-aid-box", len / 2, depth / 2 + 1.0, "along");
          break;
        case "surgery":
          put("or-table", len / 2, depth / 2 + 0.5, "in");
          put("med-cart", len / 2 + 2.0, depth / 2 + 1.2, "along", 0, 1);
          put("iv-drip", len / 2 - 1.6, depth / 2 + 1.5, "in");
          put("vitals-monitor", len / 2 - 1.4, depth / 2 - 0.6, "in");
          put("med-cabinet", 0.7, depth - 0.6, "in");
          if (pick(3) < 0.5) put("blood-bag", len / 2 + 2.0, depth / 2 + 1.2, "along", 0.95);
          break;
        case "scrub":
          put("med-partition", len / 2, depth / 2, "along");
          put("lab-cabinet", 1.0, depth - 0.6, "in");
          put("curtain-screen", len - 1.2, depth - 1.5, "in");
          break;
        case "nurse":
          put("med-cabinet", 0.7, depth - 0.6, "in");
          put("med-cabinet", 1.8, depth - 0.6, "in");
          put("med-cart", len - 1.2, depth - 1.2, "along");
          put("waiting-chairs", len - 0.6, depth / 2 - 1.0, "along", 0, 3);
          put("first-aid-box", 1.4, 2.0, "along");
          break;
        case "morgue":
          // The cold chambers along the outside wall, the table, a covered body on a stretcher.
          put("morgue-fridge", len / 2, depth - 1.2, "in", 0, 1);
          put("autopsy-table", len / 2, depth / 2 - 0.8, "along", 0, 1);
          put("hosp-stretcher", 1.5, 2.2, "in", 0, 1);
          put("rusty-cart", len - 1.0, 1.4, "along");
          break;
        case "office":
          put("med-cabinet", 0.7, depth - 0.6, "in");
          put("lab-cabinet", 2.2, depth - 0.6, "in");
          put("lab-cabinet", len - 1.0, depth - 0.6, "in");
          put("waiting-chairs", 0.4, depth / 2 - 0.5, "along");
          put("rusty-cart", len - 1.0, 2.0, "along");
          put("paper-debris", len / 2, depth / 2, "along");
          if (pick(4) < 0.6) put("paper-debris", len / 2 + 1, depth / 2 - 1.5, "in");
          if (pick(6) < 0.4) put("first-aid-box", len / 2 - 1.2, depth / 2 + 1.0, "along");
          break;
        case "storage":
          put("lab-cabinet", 1.0, depth - 0.6, "in");
          put("lab-cabinet", 2.6, depth - 0.6, "in");
          put("med-cabinet", len - 0.8, depth - 0.6, "in");
          put("rusty-cart", len - 1.0, 1.6, "along");
          put("first-aid-box", 1.5, 2.0, "along");
          break;
        case "trauma":
          put("hosp-stretcher", len / 2, depth - 2.2, "in", 0, 1);
          put("bed-curtain", len / 2, depth - 2.3, "in");
          put("vitals-monitor", len / 2 - 1.6, depth - 0.7, "in");
          put("med-cart", len - 1.0, 1.6, "along");
          if (pick(5) < 0.6) put("blood-bag", len / 2, depth - 2.2, "in", 0.9);
          break;
        case "treatment":
          for (const [k, a] of [1.8, len - 1.8].entries()) {
            put("hosp-bed-old", a, depth - 1.8, "in");
            put("curtain-screen", a + (k ? -1.3 : 1.3), depth - 3.4, "in");
            put("iv-drip", a + (k ? -1.0 : 1.0), depth - 0.6, "in");
          }
          put("aed-box", 0.12, 1.2, "along", 1.2);
          put("med-cart", len / 2, 1.3, "along");
          break;
        case "entry":
          // A way in (an outside door or a bridge opens into it): chairs along the side walls,
          // a sign, the way through kept clear.
          put("waiting-chairs", 0.4, depth / 2, "along");
          put("waiting-chairs", len - 0.4, depth / 2, "along", 0, 2);
          put("hosp-dir-sign", 0.08, 2.0, "along", 1.5);
          break;
        case "lobby":
        case "waiting":
          // A hall of merged rooms: the reception counter in its first room, chair rows after.
          if (
            r.bay ===
            Math.min(
              ...b.rooms
                .filter((q) => q.hall && q.floor === r.floor && q.side === s)
                .map((q) => q.bay),
            )
          )
            put("reception-desk", len, depth / 2 + 0.6, "in");
          else {
            // Rows of chairs facing the counter, a sign over the way through.
            for (const a of [1.2, 2.6, len - 2.6, len - 1.2])
              for (const d of [depth / 2 - 1.2, depth / 2 + 1.6])
                put("waiting-chairs", a, d, "along", 0, 1);
            put("hosp-sign", len / 2, 1.0, "along", 2.9, 1);
          }
          break;
      }
    }
    // Corridors: hanging signs, an exit sign over each end, extinguishers and defibrillators by
    // the cores, the odd abandoned stretcher and wheelchair, papers.
    const L = b.L;
    for (let f = 0; f < b.floors; f++) {
      const fy = y0 + f * 4;
      const corr = (u: number, v: number) => world(u, v);
      const along0 = facing(along[0]!, along[1]!);
      for (let u = -L / 2 + 10; u < L / 2 - 6; u += 14) {
        const [x, z] = corr(u, 0);
        push("hosp-sign", x, fy + 2.85, z, (along0 + 1) as Placement["turn"]);
      }
      for (const e of [-1, 1]) {
        const [x, z] = corr(e * (L / 2 - 0.45), 0);
        push("exit-sign", x, fy + 2.75, z, facing(-e * along[0]!, -e * along[1]!));
      }
      for (const [k, u] of [-L / 2 + 5, L / 2 - 9].entries()) {
        const side = k ? -1 : 1;
        const [x, z] = corr(u, side * (b.corridor - 0.12));
        push("fire-ext", x, fy, z, facing(-side * across[0]!, -side * across[1]!));
        const [ax, az] = corr(u + 1.2, side * (b.corridor - 0.12));
        push("aed-box", ax, fy + 1.2, az, facing(-side * across[0]!, -side * across[1]!));
      }
      const r = hash(9_990 + f, L);
      const [sx, sz] = corr(-L / 4 + r * 6, -0.8);
      push(r < 0.5 ? "hosp-stretcher" : "wheelchair", sx, fy, sz, along0);
      const [px, pz] = corr(L / 5, 0.6);
      push("paper-debris", px, fy, pz, along0);
    }
  }
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
      { near: [300, 200], build: gasStation },
    ],
  );
}

/**
 * Blackwater Prison (E6) on its rocky knoll (build_world.py PRISON_KNOLL): the bastioned wall is
 * world data (walls.ts). Inside (location audit, 2026-11-09: it held 20 objects, three plain
 * industrial blocks), a real prison: three brick cell houses round the exercise yard (enterable,
 * three tiers of cells: prison.py), the yard's courts, bleachers and shelters inside a fence,
 * a dead zone of chain-link 9 m inside the wall lit by floodlight masts, guard towers in the
 * bastions and at the gates, the intake block (the police station: cells, armoury) and the
 * sally port with the transport buses at the south gate, the dormitory barracks, the laundry
 * and the commissary. Outside the south gate, the visitors' car park beside the road up.
 */
function prison(poi: Poi, out: Placement[], ctx: Context) {
  const { at, row } = builder(poi, out);
  // The cell houses: north (front to the yard, +z), west (front east) and east (front west).
  at("prison-block", 0, -62, 0);
  at("prison-block", -62, 0, 1);
  at("prison-block", 62, 0, 3);
  // The exercise yard: two courts, bleachers, shelters with tables, a fence round it (gaps
  // to the cell houses' doors and the south).
  for (const x of [-18, 18]) {
    at("basketball-hoop", x, -30, 0);
    at("basketball-hoop", x, -6, 2);
  }
  at("bleacher", -38, -18, 1);
  at("bleacher", 38, -18, 3);
  at("yard-shelter", -30, 24, 1);
  at("yard-shelter", 30, 24, 1);
  for (const [x, z] of [
    [-34, 30],
    [-26, 30],
    [26, 30],
    [34, 30],
  ])
    at("picnic-table", x!, z!, 0);
  const yard = 46;
  row("chainlink", -yard, -yard, -6, -yard, 2.9, 1);
  row("chainlink", 6, -yard, yard, -yard, 2.9, 1);
  row("chainlink", -yard, yard, -8, yard, 2.9, 1);
  row("chainlink", 8, yard, yard, yard, 2.9, 1);
  row("chainlink", -yard, -yard, -yard, -6, 2.9, 0);
  row("chainlink", -yard, 6, -yard, yard, 2.9, 0);
  row("chainlink", yard, -yard, yard, -6, 2.9, 0);
  row("chainlink", yard, 6, yard, yard, 2.9, 0);
  for (const x of [-42, 42]) for (const z of [-42, 42]) at("floodlight", x, z, 0);
  // Intake (the police station: cells and armoury) and the sally port at the south gate: the
  // transport buses, barriers; the laundry and the commissary; the dormitory barracks.
  at("police-station", -40, 76, 2);
  at("school-bus", -27, 68, 0);
  at("school-bus", 27, 68, 0);
  at("jersey", -7, 96, 1);
  at("jersey", 7, 96, 1);
  at("ind-warehouse-1", 54, 72, 0);
  at("brick-shop", 50, -62, 0);
  at("ind-office-trailer", -40, -64, 0);
  for (const x of [-82, 82]) {
    at("barracks", x, -32, 0);
    at("barracks", x, 30, 0);
  }
  // Towers: one in each bastion, a pair inside each gate.
  for (const [x, z] of [
    [-86, -86],
    [86, -86],
    [-86, 86],
    [86, 86],
    [-19, -85],
    [19, -85],
    [-19, 87],
    [19, 87],
  ])
    at("prison-tower", x!, z!, 0);
  // The dead zone: chain-link 9 m inside the wall all round (not across the gates), lit by
  // floodlights at its corners. The wall's points every 45° from north, alternating the gate
  // sides and the bastion tips (walls.ts), offset inwards edge by edge.
  const { tip, side } = PRISON_WALL;
  const pts = Array.from({ length: 8 }, (_, k) => {
    const a = -Math.PI / 2 + (k * Math.PI) / 4,
      r = k % 2 === 0 ? side : tip;
    return [Math.cos(a) * r, Math.sin(a) * r] as [number, number];
  });
  const inset = pts.map((_, k) => {
    // The intersection of the two edges at point k, each moved 9 m towards the centre.
    const shift = (p: [number, number], q: [number, number]) => {
      const dx = q[0] - p[0],
        dz = q[1] - p[1],
        len = Math.hypot(dx, dz);
      let nx = -dz / len,
        nz = dx / len;
      if (nx * (p[0] + q[0]) + nz * (p[1] + q[1]) > 0) [nx, nz] = [-nx, -nz];
      return [p[0] + nx * 9, p[1] + nz * 9, dx, dz] as const;
    };
    const [ax, az, adx, adz] = shift(pts[(k + 7) % 8]!, pts[k]!);
    const [bx, bz, bdx, bdz] = shift(pts[k]!, pts[(k + 1) % 8]!);
    const t = ((bx - ax) * bdz - (bz - az) * bdx) / (adx * bdz - adz * bdx);
    return [ax + adx * t, az + adz * t] as [number, number];
  });
  for (let k = 0; k < 8; k++) {
    const [x0, z0] = inset[k]!,
      [x1, z1] = inset[(k + 1) % 8]!;
    const len = Math.hypot(x1 - x0, z1 - z0),
      n = Math.floor(len / 2.9);
    const turn = Math.abs(x1 - x0) > Math.abs(z1 - z0) ? 1 : 0;
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n,
        z = z0 + ((z1 - z0) * i) / n;
      if (Math.abs(x) < 13 && Math.abs(z) > 80) continue; // the gates
      at("chainlink", x, z, turn as Placement["turn"]);
    }
    if (k % 2 === 1) at("floodlight", x0 * 0.94, z0 * 0.94, 0);
  }
  // The gates outside: checkpoints and barriers; the visitors' car park beside the road up.
  at("checkpoint", 10, -side - 14, 0);
  at("checkpoint", -10, side + 14, 2);
  at("jersey", -8, side + 22, 1);
  at("jersey", 8, side + 22, 1);
  at("jersey", -8, -side - 22, 1);
  at("jersey", 8, -side - 22, 1);
  at("sandbags", -26, -side - 20, 0);
  for (const sx of [-1, 1]) {
    at("lot-lines", sx * 34, 150, 0);
    for (let k = 0; k < 6; k++)
      if (hash(7_700 + k, sx + 3) < 0.55)
        at(
          hash(7_710 + k, sx + 3) < 0.6 ? "car-sedan" : "car-pickup",
          sx * 34 - 15 + k * 6,
          150 + (k % 2 ? 2.6 : -2.6),
          0,
        );
    at("street-lamp", sx * 12, 140, 0);
  }
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
    const shore = seaPier(out, ctx, poi.x + dx, poi.z + dz, wx, wz, turn);
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
      // Its floor just above the sea (it stood 0.4 m below it: the keeper's house was flooded,
      // anyone inside was swimming, and the audit found it could not be entered).
      y: 0.1,
      z: +z.toFixed(2),
      // The keeper's house and its stair (art/br/fitout/halls.py) on the model's +x side: to
      // the land, east (turned the other way, the stair came down into 6 m of sea).
      turn: 0,
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

/**
 * Eastport (J4, owner 2026-11-11: "a city to the right side of the hospital at the sea that needs
 * an upgrade"): the concept's harbour town north of the river mouth on the east coast. Shops,
 * townhouses and flats on its streets, houses inland; on the waterfront (build_world.py HARBORS:
 * a quay at x 4772-4868, z -1700 to -1410) the fish market, net sheds and containers, piers out
 * into the sea with boats, the old pier and the wharf, and a lighthouse on the north point.
 */
function eastport(poi: Poi, out: Placement[], ctx: Context) {
  gridTown(
    poi,
    out,
    ctx,
    {
      core: ["brick-shop", "townhouse", "rural-diner", "townhouse", "rural-store-5", "apartment"],
      homes: ["house", "bungalow", "townhouse", "rural-house", "garage", "house", "bungalow"],
      edge: ["bungalow", "rural-house", "shed", "rural-store-1"],
    },
    613,
    [],
    [
      { near: [-110, 40], build: park },
      { near: [-60, -120], build: policeBlock },
    ],
  );
  const Q = { x0: 4772, x1: 4868, z0: -1700, z1: -1410 };
  // Piers out from the quay (sought from the sea, heading west to the shore).
  for (const z of [-1672, -1610, -1548, -1486, -1452]) seaPier(out, ctx, 4995, z, -1, 0, 1);
  // The old pier and the wharf at the south end of the quay, decks level with it.
  for (const [model, z, deck] of [
    ["old-pier", -1385, 6.6],
    ["wharf", -1720, 3.0],
  ] as const) {
    let x = 4990;
    while (x > 4700 && ctx.heightAt(x, z) < 0.3) x -= 3;
    if (x <= 4700) continue;
    const reach = model === "old-pier" ? 17 : 13;
    const land = ctx.heightAt(x - 2, z);
    out.push({
      model,
      x: +(x + reach).toFixed(2),
      y: +(Math.max(0.9, Math.min(2.6, land)) - deck).toFixed(2),
      z,
      turn: 1,
      poi: "shore",
    });
  }
  // Moored boats off the quay.
  for (const [model, x, z] of [
    ["motorboat", 4925, -1640],
    ["motorboat", 4930, -1580],
    ["rowboat", 4915, -1517],
    ["motorboat", 4935, -1455],
    ["boat-wreck", 4960, -1700],
  ] as const)
    if (ctx.heightAt(x, z) < -0.6)
      out.push({ model, x, y: model === "boat-wreck" ? -0.6 : -0.2, z, turn: 1, poi: "shore" });
  // Boats pulled up and moored (the owner's 2026-11-11 downloads).
  for (const [model, x, z, t, y] of [
    ["small-motorboat", 4940, -1612, 0, -0.25],
    ["small-motorboat", 4945, -1485, 0, -0.25],
    ["oselvar-boat", 4918, -1545, 1, -0.3],
    ["oselvar-boat", 4912, -1660, 1, -0.3],
  ] as const)
    if (ctx.heightAt(x, z) < -0.6) out.push({ model, x, y, z, turn: t, poi: "shore" });
  for (const [x, z] of [
    [4990, -1600],
    [4995, -1500],
    [4985, -1420],
  ] as const)
    if (ctx.heightAt(x, z) < -1.5)
      out.push({ model: "buoy", x, y: -0.3, z, turn: 0, poi: "shore" });
  // On the quay: the fish market, net sheds, containers, crates, lamps, benches.
  const quay: Array<[string, number, number, Placement["turn"]]> = [
    ["rural-diner", 4800, -1660, 1],
    ["river-shack", 4815, -1622, 1],
    ["shed", 4800, -1598, 1],
    ["container-20", 4826, -1575, 0],
    ["container-40", 4808, -1548, 0],
    ["rural-store-3", 4800, -1515, 1],
    ["river-shack", 4818, -1488, 1],
    ["container-20", 4830, -1462, 1],
    ["rural-diner", 4800, -1440, 1],
    ["fishing-hut", 4838, -1640, 0],
    ["fishing-hut", 4836, -1500, 0],
    ["military-crate", 4840, -1606, 0],
    ["military-crate", 4842, -1528, 1],
  ];
  // (On the quay itself: the town's street and its lamps run along it, so not onGround's
  // distance from roads; only clear of what already stands there, dry and level enough.)
  const quayPut = (model: string, x: number, z: number, t: Placement["turn"], flat = 1.6) => {
    const [w, d] = footAt(model, t);
    const busy = out.some((p) => {
      const [pw, pd] = footAt(p.model, p.turn);
      return Math.abs(p.x - x) < (w + pw) / 2 + 1.5 && Math.abs(p.z - z) < (d + pd) / 2 + 1.5;
    });
    if (busy) return false;
    const hs = [-w / 2, 0, w / 2].flatMap((ox) =>
      [-d / 2, 0, d / 2].map((oz) => ctx.heightAt(x + ox, z + oz)),
    );
    const low = Math.min(...hs);
    if (low < 0.4 || Math.max(...hs) - low > flat) return false;
    // (poi "quay": on the terrain below the town's pad, not level with it.)
    out.push({
      model,
      x: +x.toFixed(2),
      y: +low.toFixed(2),
      z: +z.toFixed(2),
      turn: t,
      poi: "quay",
    });
    return true;
  };
  for (const [m, x, z, t] of quay) {
    if (z < Q.z0 || z > Q.z1 || x < Q.x0 || x > Q.x1) continue;
    for (const dx of [0, -6, 6, -12, 12]) if (quayPut(m, x + dx, z, t)) break;
  }
  for (let z = Q.z0 + 30; z < Q.z1; z += 58) {
    quayPut("street-lamp", 4826, z, 1, 1);
    quayPut("bench", 4828, z + 12, 1, 1);
  }
  // The lighthouse on the town's north point, its foot in the surf.
  for (let z = Q.z0 - 60; z > Q.z0 - 420; z -= 20) {
    let x = 4700;
    while (x < 4995 && ctx.heightAt(x, z) > 0) x += 4;
    if (x >= 4995 || ctx.heightAt(x + 25, z) > -2) continue;
    if (out.some((p) => Math.abs(p.x - x) < 30 && Math.abs(p.z - z) < 30)) continue;
    // (Its keeper's house and stair on the model's +x side; turned half round, they face the
    // land, west.)
    out.push({
      model: "lighthouse",
      x: +x.toFixed(2),
      y: 0.1,
      z: +z.toFixed(2),
      turn: 2,
      poi: "shore",
    });
    break;
  }
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
  eastport,
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
  camp: [
    { model: "campsite", u: 0, v: 4, foot: 6 }, // its 12 m footprint: seated on its lowest corner
    { model: "wreck-car", u: -9, v: -2, foot: 3, chance: 0.5 },
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
/**
 * A grid index over a placement list that only grows (pushes anywhere are picked up at the next
 * query): `some(x0, z0, x1, z1, test)` runs `test` on the placements whose centres lie within
 * the box grown by `reach` (m; the largest half-footprint the test can care about). Linear scans
 * of the whole list cost seconds once the towns' yards had added ~20,000 fence sections.
 */
function placementGrid(list: Placement[], reach = 90, cell = 128) {
  const cells = new Map<number, Placement[]>();
  let indexed = 0;
  const key = (i: number, j: number) => i * 4096 + j;
  const sync = () => {
    for (; indexed < list.length; indexed++) {
      const p = list[indexed]!;
      const k = key(Math.floor(p.x / cell), Math.floor(p.z / cell));
      const bucket = cells.get(k);
      if (bucket) bucket.push(p);
      else cells.set(k, [p]);
    }
  };
  return {
    some(x0: number, z0: number, x1: number, z1: number, test: (p: Placement) => boolean) {
      sync();
      for (let i = Math.floor((x0 - reach) / cell); i <= Math.floor((x1 + reach) / cell); i++)
        for (let j = Math.floor((z0 - reach) / cell); j <= Math.floor((z1 + reach) / cell); j++)
          if (cells.get(key(i, j))?.some(test)) return true;
      return false;
    },
  };
}

function countryside(out: Placement[], ctx: Context) {
  const { meta } = ctx;
  const sites: Array<[number, number]> = [];
  const placed = placementGrid(out);
  // A country road that runs out in the open leads to a farm or a cabin (owner, 2026-11-08:
  // "some roads end in a weird place"): first, a site just past each dead end, across the road's
  // heading, so the road arrives at its yard.
  let salt = 50_000;
  for (const [ex, ez, ux, uz] of meta.roadEnds ?? []) {
    salt += 7;
    // Straight ahead first, then off to either side and further on; on rock or sand, a shack;
    // where no yard fits (a hillside, a lakeshore), a campsite at the end of the track.
    let done = false;
    for (const off of [30, 42, 56, 72])
      for (const side of [0, 14, -14, 28, -28]) {
        if (done) break;
        done = trySite(
          ex + ux * off - uz * side,
          ez + uz * off + ux * side,
          -uz,
          ux,
          ux,
          uz,
          "end",
        );
      }
    for (const off of [12, 20, 30])
      for (const side of [0, 8, -8]) {
        if (done) break;
        done = trySite(
          ex + ux * off - uz * side,
          ez + uz * off + ux * side,
          -uz,
          ux,
          ux,
          uz,
          "camp",
        );
      }
  }
  salt = 700;
  for (const road of meta.roads) {
    // Each road's own sequence, from where it starts: trimming or adding a road elsewhere
    // (the quarry's rim, 2026-11-09) no longer reshuffles every site after it in the list.
    const [r0x, r0z] = road.points[0]!;
    salt = 700 + ((Math.round(r0x * 7.31 + r0z * 13.7) >>> 0) % 100_000) * 128;
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

  function trySite(
    cx: number,
    cz: number,
    dx: number,
    dz: number,
    nx: number,
    nz: number,
    /** "end": a road's dead end (any dry ground); "camp": a campsite where nothing else fits. */
    mode: "road" | "end" | "camp" = "road",
  ) {
    {
      if (Math.abs(cx) > 4800 || Math.abs(cz) > 4800) return false;
      if (meta.pois.some((p) => Math.hypot(p.x - cx, p.z - cz) < poiReach(p))) return false;
      if (inTown(meta, cx, cz, 120)) return false;
      if (sites.some(([x, z]) => Math.hypot(x - cx, z - cz) < (mode === "camp" ? 120 : 220)))
        return false;
      // A site and its paddock reach ~110 m from its centre: never onto a runway.
      if (onRunway(meta, cx, cz, 120)) return false;
      // Not in a POI's built-up outskirts (the island airfield's cargo district runs past its
      // pad): no building of anyone else's within 70 m of the site.
      if (
        placed.some(
          cx - 70,
          cz - 70,
          cx + 70,
          cz + 70,
          (p) =>
            Math.abs(p.x - cx) < 70 + footAt(p.model, p.turn)[0] / 2 &&
            Math.abs(p.z - cz) < 70 + footAt(p.model, p.turn)[1] / 2,
        )
      )
        return false;
      const cls = ctx.coverAt(cx, cz);
      const r = hash(salt, 5);
      const kind =
        mode === "camp"
          ? cls !== 0 && cls !== 7
            ? "camp"
            : null
          : cls === 3
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
                : mode === "end" && cls !== 0 && cls !== 7
                  ? "shack"
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
        // A campsite takes a gentler hillside than a building does.
        let y = buildable(ctx, x, z, part.foot, mode === "camp" ? 3 : 1.6);
        // Its doors at ground level: on a slope the low-point pad would bury the uphill doorway.
        if (
          y !== null &&
          (ENTRANCE_APRONS[part.model] ?? []).some(([ax, az]) => {
            const [ox, oz] = turnXZ(ax, az, turn);
            const rise = y! - ctx.heightAt(x + ox, z + oz);
            return rise > 0.2 || rise < -0.3;
          })
        )
          y = null;
        // Not against a cutting or a rock face: the pad check samples a square of the part's
        // nominal size, and a wreck's real footprint reached a road cutting's 24 m wall.
        if (y !== null) {
          const [fw, fd] = footAt(part.model, turn);
          if (
            [-1, 1].some((sx) =>
              [-1, 1].some((sz) => ctx.heightAt(x + (sx * fw) / 2, z + (sz * fd) / 2) - y! > 3.5),
            )
          )
            y = null;
        }
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

/**
 * A country road sign (2026-11-09 downloads: speed limit, curve, deer crossing, campground, and
 * the original sign). The new signs' plates face along the road, at the traffic.
 */
function signModel(cover: number, r: number) {
  if (cover === 4 && r < 0.3) return r < 0.12 ? "sign-camping" : "sign-deer";
  if (r < 0.3) return "road-sign";
  if (r < 0.55) return "sign-speed";
  if (r < 0.8) return "sign-curve";
  return "sign-deer";
}

/** Spacing of power-line poles (m) and their set-back from the road centreline (beyond the
 * roadside ditch: shoulder to 5.5 m, ditch to 12.5 m). */
export const POWER_LINE = { spacing: 55, offset: 13.5, maxSpan: 70 } as const;

/**
 * Cover along the country roads (owner, 2026-11-09: "goal is to reduce the flatness and
 * increase the fun of the gameplay, image a fight at a road thats flat"). Besides the ditches
 * (build_world.py) and the power lines, every 550-950 m along each road outside the POIs, one of:
 *  - a dry stone wall, 9-15 sections (21-35 m), beyond the ditch on one side;
 *  - one or two wrecks on the verge (the island's roads have their own, islandWilds);
 *  - an abandoned roadblock: jersey barriers across one lane and a wreck slewed across the other;
 *  - hay bales by a field.
 * Walls and roadblocks only where the road runs within 20° of north-south or east-west (the
 * models turn in quarter turns). Deterministic; off pads, bridges, runways and other placements.
 */
function roadsideCover(out: Placement[], ctx: Context) {
  const { meta } = ctx;
  const placed = placementGrid(out, 30);
  const clear = (x: number, z: number, hw: number, hd: number) =>
    !placed.some(x - hw, z - hd, x + hw, z + hd, (p) => {
      const [w, d] =
        p.model === "stone-wall"
          ? p.turn % 2
            ? [0.3, 2.31]
            : [2.31, 0.3]
          : footAt(p.model, p.turn);
      return Math.abs(p.x - x) < hw + w / 2 && Math.abs(p.z - z) < hd + d / 2;
    });
  const offPois = (x: number, z: number) =>
    !meta.pois.some((p) => Math.hypot(p.x - x, p.z - z) < (p.padRadius ?? p.radius) + 60);
  const onIsland = (x: number, z: number) => z > 3350 && x > -2600 && x < 4300;
  const ok = (x: number, z: number, y: number, margin: number) =>
    !underwater(meta, x, z, y) && bridgeDistance(meta, x, z) > 40 && !onRunway(meta, x, z, margin);
  const push = (model: string, x: number, y: number, z: number, turn: Placement["turn"]) =>
    out.push({
      model,
      x: +x.toFixed(2),
      y: +y.toFixed(2),
      z: +z.toFixed(2),
      turn,
      poi: "countryside",
    });
  /** The lowest ground under a footprint's corners and centre (a wreck half over the ditch's
   * edge sits on its low side, never floating). */
  const lowAt = (model: string, x: number, z: number, turn: Placement["turn"]) => {
    const r = Math.max(...footAt(model, turn)) / 2;
    return Math.min(
      ctx.heightAt(x, z),
      ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => ctx.heightAt(x + sx * r, z + sz * r))),
    );
  };
  const WRECKS = [
    "wreck-car",
    "burned-car-b",
    "crashed-car",
    "rusty-truck",
    "rust-sedan",
    "wreck-sedan",
  ];
  const wreckTurn = (model: string, alongX: boolean, slew = false): Placement["turn"] => {
    const [w, d] = FOOT[model] ?? [2, 4.5];
    const longZ = d > w;
    return ((alongX === longZ) !== slew ? 1 : 0) as Placement["turn"];
  };
  // One walk over all the roads in turn (most roads are pieces between two junctions, shorter
  // than the spacing): a feature every 550-950 m of road.
  let salt = 997_000;
  let walked = 0,
    next = 250 + hash(salt++, 1) * 400;
  for (const road of meta.roads) {
    for (let k = 0; k + 1 < road.points.length; k++) {
      const [ax, az] = road.points[k]!,
        [bx, bz] = road.points[k + 1]!;
      const len = Math.hypot(bx - ax, bz - az);
      if (!(len > 0)) continue;
      while (walked + len > next) {
        const t = (next - walked) / len;
        const px = ax + (bx - ax) * t,
          pz = az + (bz - az) * t;
        next += 550 + hash(salt++, 2) * 400;
        if (!offPois(px, pz) || !ok(px, pz, ctx.heightAt(px, pz), 40)) continue;
        const dx = (bx - ax) / len,
          dz = (bz - az) / len;
        const alongX = Math.abs(dx) > Math.abs(dz);
        const square = Math.max(Math.abs(dx), Math.abs(dz)) > Math.cos((20 * Math.PI) / 180);
        // The road's own axis (the nearest of x or z) and its normal.
        const [ux, uz] = alongX ? [Math.sign(dx), 0] : [0, Math.sign(dz)];
        const [nx, nz] = [-uz, ux];
        const side = hash(salt, 3) < 0.5 ? -1 : 1;
        const r = hash(salt, 4);
        const cls = ctx.coverAt(px, pz);
        if (square && r < 0.4) {
          // A dry stone wall beyond the ditch, following the road.
          const n = 9 + Math.floor(hash(salt, 5) * 7);
          const wallTurn = (alongX ? 0 : 1) as Placement["turn"];
          for (let c = 0; c < n; c++) {
            const along = (c - n / 2) * 2.3;
            const x = px + dx * along + nx * side * 14.5,
              z = pz + dz * along + nz * side * 14.5;
            const ex = alongX ? 1.15 : 0,
              ez = alongX ? 0 : 1.15;
            const h0 = ctx.heightAt(x - ex, z - ez),
              h1 = ctx.heightAt(x + ex, z + ez);
            const y = Math.min(h0, h1);
            if (Math.abs(h0 - h1) > 0.9 || !ok(x, z, y, 25) || roadDistance(meta, x, z, 16) < 13)
              continue;
            if (!clear(x, z, alongX ? 1.15 : 0.2, alongX ? 0.2 : 1.15)) continue;
            push("stone-wall", x, y, z, wallTurn);
          }
        } else if (r < 0.7 && !onIsland(px, pz)) {
          // Wrecks on the verge (one, now and then two nose to tail).
          const count = hash(salt, 6) < 0.35 ? 2 : 1;
          for (let c = 0; c < count; c++) {
            const model = WRECKS[Math.floor(hash(salt, 7 + c) * WRECKS.length)]!;
            const x = px + dx * c * 7 + nx * side * (road.width / 2 + 1.2),
              z = pz + dz * c * 7 + nz * side * (road.width / 2 + 1.2);
            const turn = wreckTurn(model, alongX);
            const y = lowAt(model, x, z, turn);
            if (!ok(x, z, y, 20) || !clear(x, z, 2.6, 2.6)) continue;
            // Not in a cutting's wall: the verge of a road cut into a hillside is its rock
            // face, and a wreck seated at its lowest corner there stood 13 m inside it.
            const [fw, fd] = footAt(model, turn);
            if (
              [-1, 0, 1].some((sx) =>
                [-1, 0, 1].some(
                  (sz) => ctx.heightAt(x + (sx * fw) / 2, z + (sz * fd) / 2) - y > 1.5,
                ),
              )
            )
              continue;
            push(model, x, y, z, turn);
          }
        } else if (square && r < 0.85) {
          // An abandoned roadblock: jerseys end to end across one lane (and a third staggered
          // behind), a wreck slewed across the other lane 9 m on.
          if (!clear(px, pz, 8, 8)) continue;
          const jTurn = (alongX ? 0 : 1) as Placement["turn"];
          for (const [u, v] of [
            [0, 1.1],
            [0, 3.3],
          ] as const) {
            const x = px + ux * u + nx * side * v,
              z = pz + uz * u + nz * side * v;
            push("jersey", x, ctx.heightAt(x, z), z, jTurn);
          }
          // A wooden barricade behind the jerseys, roadwork posts leading up to them.
          {
            const x = px - ux * 4 + nx * side * 2.2,
              z = pz - uz * 4 + nz * side * 2.2;
            push("wood-barricade", x, ctx.heightAt(x, z), z, (alongX ? 1 : 0) as Placement["turn"]);
          }
          for (const u of [-14, -10, -6]) {
            const x = px + ux * u + nx * side * (0.4 - u * 0.25),
              z = pz + uz * u + nz * side * (0.4 - u * 0.25);
            push("delineator", x, ctx.heightAt(x, z), z, 0);
          }
          const model = WRECKS[Math.floor(hash(salt, 9) * WRECKS.length)]!;
          const x = px + ux * 9 - nx * side * 1.8,
            z = pz + uz * 9 - nz * side * 1.8;
          const wt = wreckTurn(model, alongX, true);
          push(model, x, lowAt(model, x, z, wt), z, wt);
        } else if (cls === 3 || cls === 2) {
          // Hay bales at a field's edge, beyond the ditch.
          const x = px + nx * side * 16,
            z = pz + nz * side * 16;
          const low = buildable(ctx, x, z, 2.2, 0.8);
          if (low === null || !clear(x, z, 2.5, 2.5)) continue;
          push("hay-bales", x, low, z, (alongX ? 0 : 1) as Placement["turn"]);
        }
      }
      walked += len;
    }
  }
  // Guardrails where a road runs on an embankment (the ground 13 m out 1.8 m or more below
  // the road) on stretches within 10° of north-south or east-west: 10.8 m sections end to end
  // on the shoulder, a run of three or more. Half-height cover along the road's edge.
  const towns = meta.pois.filter((p) => p.town);
  const inTown = (x: number, z: number) =>
    towns.some((p) => {
      const t = p.town!;
      return (
        x > t.xs[0]! - 40 &&
        x < t.xs[t.xs.length - 1]! + 40 &&
        z > t.zs[0]! - 40 &&
        z < t.zs[t.zs.length - 1]! + 40
      );
    });
  const RAIL = 10.8;
  for (const road of meta.roads) {
    let run: Array<[number, number, number, Placement["turn"]]> = [];
    const flush = () => {
      if (run.length >= 3) for (const [x, y, z, turn] of run) push("guardrail", x, y, z, turn);
      run = [];
    };
    let carry = 0;
    for (let k = 0; k + 1 < road.points.length; k++) {
      const [ax, az] = road.points[k]!,
        [bx, bz] = road.points[k + 1]!;
      const len = Math.hypot(bx - ax, bz - az);
      if (!(len > 0)) continue;
      const dx = (bx - ax) / len,
        dz = (bz - az) / len;
      const alongX = Math.abs(dx) > Math.abs(dz);
      const square = Math.max(Math.abs(dx), Math.abs(dz)) > Math.cos((10 * Math.PI) / 180);
      const [ux, uz] = alongX ? [Math.sign(dx), 0] : [0, Math.sign(dz)];
      const [nx, nz] = [-uz, ux];
      for (let d = carry; d < len; d += RAIL) {
        const px = ax + dx * d,
          pz = az + dz * d;
        const ry = ctx.heightAt(px, pz);
        let placed = false;
        if (square && offPois(px, pz) && !inTown(px, pz) && bridgeDistance(meta, px, pz) > 12)
          for (const side of [-1, 1]) {
            const below = ry - ctx.heightAt(px + nx * side * 13, pz + nz * side * 13);
            if (below < 1.8) continue;
            const x = px + nx * side * 4.9,
              z = pz + nz * side * 4.9;
            // The lower end of the section (on a grade one end is 0.7 m below the other).
            const ends = [
              ctx.heightAt(x, z),
              ctx.heightAt(x + ux * 5.4, z + uz * 5.4),
              ctx.heightAt(x - ux * 5.4, z - uz * 5.4),
            ];
            const y = Math.min(...ends);
            // (Not where the road climbs out of a cutting: one end was buried 6-15 m in the
            // bank by the higher hills and Eastport's pad, 2026-11-11.)
            if (Math.max(...ends) - y > 2.5) continue;
            if (underwater(meta, x, z, y) || !clear(x, z, alongX ? 5.4 : 0.2, alongX ? 0.2 : 5.4))
              continue;
            run.push([x, y, z, (alongX ? 1 : 0) as Placement["turn"]]);
            placed = true;
            break;
          }
        if (!placed) flush();
      }
      carry = (((carry - len) % RAIL) + RAIL) % RAIL;
    }
    flush();
  }
  /** A lamp's base: the lowest ground under its arms' reach (5.2 m), on ground level to 1.2 m. */
  const lampBase = (x: number, z: number) => {
    const o = [-5.2, -3, 0, 3, 5.2];
    const hs = o.flatMap((ox) => o.map((oz) => ctx.heightAt(x + ox, z + oz)));
    const low = Math.min(...hs);
    return Math.max(...hs) - low > 1.2 ? null : low;
  };
  // Lamps (2026-11-09 downloads): a double-arm lamp at each country junction (a road ending on
  // another, outside the towns and sites), arms along the side road; on the roads into the towns,
  // a lamp every 45 m from 60 to 420 m out, at the shoulder, arms across the road.
  const segs = meta.roads.map((r) => r.points);
  for (const pts of segs)
    for (const end of [0, pts.length - 1]) {
      const [ex, ez] = pts[end]!;
      const [qx, qz] = pts[end === 0 ? 1 : end - 1]!;
      if (!offPois(ex, ez) || inTown(ex, ez) || bridgeDistance(meta, ex, ez) < 30) continue;
      const l = Math.hypot(qx - ex, qz - ez) || 1;
      const dx = (qx - ex) / l,
        dz = (qz - ez) / l;
      // A T or a crossing: the road it ends on runs on through the end, on both sides of it.
      const meets = [-1, 1].every(
        (s_) => roadDistance(meta, ex - dz * s_ * 2.5, ez + dx * s_ * 2.5, 6) < 1.2,
      );
      if (!meets) continue;
      // 14 m back along the side road and 13 m to one side of it: past both roads' ditches.
      const x = ex + dx * 14 - dz * 13,
        z = ez + dz * 14 + dx * 13;
      const y = lampBase(x, z);
      if (
        y === null ||
        !ok(x, z, y, 20) ||
        roadDistance(meta, x, z, 10) < 4.5 ||
        !clear(x, z, 1, 1)
      )
        continue;
      push("highway-lamp", x, y, z, (Math.abs(dx) > Math.abs(dz) ? 1 : 0) as Placement["turn"]);
    }
  for (const road of meta.roads) {
    let walked = 0;
    for (let k = 0; k + 1 < road.points.length; k++) {
      const [ax, az] = road.points[k]!,
        [bx, bz] = road.points[k + 1]!;
      const len = Math.hypot(bx - ax, bz - az);
      if (!(len > 0)) continue;
      const dx = (bx - ax) / len,
        dz = (bz - az) / len;
      for (let d = (45 - (walked % 45)) % 45; d < len; d += 45) {
        const px = ax + dx * d,
          pz = az + dz * d;
        const town = towns.find((p) => {
          const t = p.town!;
          const ox = Math.max(t.xs[0]! - px, 0, px - t.xs[t.xs.length - 1]!),
            oz = Math.max(t.zs[0]! - pz, 0, pz - t.zs[t.zs.length - 1]!);
          const out_ = Math.hypot(ox, oz);
          return out_ > 60 && out_ < 420;
        });
        if (!town) continue;
        const side =
          hash(Math.round(road.points[0]![0]), Math.round(road.points[0]![1])) < 0.5 ? -1 : 1;
        const x = px - dz * side * 5.6,
          z = pz + dx * side * 5.6;
        const y = lampBase(x, z);
        if (
          y === null ||
          !ok(x, z, y, 20) ||
          roadDistance(meta, x, z, 10) < 5 ||
          !clear(x, z, 0.8, 0.8)
        )
          continue;
        push("road-lamp", x, y, z, (Math.abs(dx) > Math.abs(dz) ? 0 : 1) as Placement["turn"]);
      }
      walked += len;
    }
  }
}

/**
 * Power lines along every road longer than 300 m (spec §4 "power poles"): a pole every 55 m on one
 * side, cross-arm across the road. Poles are pushed in order along each line, so consecutive
 * "power-pole" placements less than POWER_LINE.maxSpan apart are wired (structures-renderer).
 * Gaps where a pole would stand on a pad, a building, a bridge or in water.
 */
/**
 * Points in a 64 m grid, for "is anything within r of here" (a square: |dx| < r and |dz| < r).
 * The same answers as scanning every point, without the scan: with 57,000 placements those
 * scans were a second of the island's build (foundation audit 2026-11-10).
 */
function pointGrid() {
  const SIZE = 64;
  const cells = new Map<number, number[]>();
  const key = (i: number, k: number) => (i + 4096) * 8192 + (k + 4096);
  return {
    add(x: number, z: number) {
      const id = key(Math.floor(x / SIZE), Math.floor(z / SIZE));
      const cell = cells.get(id);
      if (cell) cell.push(x, z);
      else cells.set(id, [x, z]);
    },
    near(x: number, z: number, r: number) {
      const i1 = Math.floor((x + r) / SIZE),
        k1 = Math.floor((z + r) / SIZE);
      for (let i = Math.floor((x - r) / SIZE); i <= i1; i++)
        for (let k = Math.floor((z - r) / SIZE); k <= k1; k++) {
          const cell = cells.get(key(i, k));
          if (!cell) continue;
          for (let n = 0; n < cell.length; n += 2)
            if (Math.abs(cell[n]! - x) < r && Math.abs(cell[n + 1]! - z) < r) return true;
        }
      return false;
    },
  };
}

function powerLines(out: Placement[], ctx: Context) {
  const { meta } = ctx;
  const buildings = pointGrid();
  for (const p of out) if (p.poi !== "nature") buildings.add(p.x, p.z);
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
        const hs = [-2, 2].flatMap((ox) => [-2, 2].map((oz) => ctx.heightAt(x + ox, z + oz)));
        const y = Math.min(...hs);
        // Not on a cutting's steep bank (the road's cut can rise past the pole's set-back).
        if (Math.max(...hs) - y > 3) continue;
        if (underwater(meta, x, z, y) || bridgeDistance(meta, x, z) < 20) continue;
        if (onRunway(meta, x, z, 30)) continue;
        if (roadDistance(meta, x, z, 8) < 5) continue; // where another road crosses
        if (meta.pois.some((p) => p.padRadius && Math.hypot(p.x - x, p.z - z) < p.padRadius + 5))
          continue;
        if (buildings.near(x, z, 14)) continue;
        // Cross-arm (local x) across the road.
        const turn = (((Math.round(Math.atan2(dx, dz) / (Math.PI / 2)) % 4) + 4) %
          4) as Placement["turn"];
        out.push({
          // Now and then a pole carrying a transformer (2026-11-09 download), wired the same.
          model: hash(salt, Math.round(next)) < 0.14 ? "pole-transformer" : "power-pole",
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
  const near = pointGrid();
  for (const p of out) near.add(p.x, p.z);
  const clear = (x: number, z: number, r: number) => !near.near(x, z, r);
  const patch = new Set(["wheat-patch", "soil-patch"]);
  const placed = placementGrid(out);
  const clearOf = (x: number, z: number, r: number) =>
    !placed.some(
      x - r,
      z - r,
      x + r,
      z + r,
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
    near.add(x, z);
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
        // (Signs stand beyond the roadside ditch: shoulder to 5.5 m, ditch to 12.5 m.)
        const off = board ? 16 : 13.5;
        const x = ax + (bx - ax) * t - dz * side * off,
          z = az + (bz - az) * t + dx * side * off;
        if (
          free(x, z) &&
          clear(x, z, board ? 10 : 4) &&
          roadDistance(meta, x, z) > off - 1.5 &&
          !onRunway(meta, x, z, board ? 12 : 7)
        ) {
          const low = buildable(ctx, x, z, board ? 3 : 0.3, board ? 1.5 : 1.0);
          // (Signs too: by a graded road the verge can be a cutting's bank.)
          if (low !== null) {
            out.push({
              model: board ? "billboard" : signModel(ctx.coverAt(x, z), hash(salt, 6)),
              x: +x.toFixed(2),
              y: +low.toFixed(2),
              z: +z.toFixed(2),
              turn,
              poi: "countryside",
            });
            near.add(x, z);
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
    // On the Superstore island's ponds, half are the old timber jetty (owner's 2026-11-08
    // download): 19 m, deck at 3.3 m, 3 m on land like the pier.
    const jetty = z0 > 3300 && hash(611, Math.round(cx)) < 0.5;
    out.push({
      model: jetty ? "old-bridge" : "pier",
      x: +(jetty ? best.x + best.wx * 2.5 : best.x).toFixed(2),
      y: +(level + 0.7 - (jetty ? 3.3 : PIER_DECK)).toFixed(2),
      z: +(jetty ? best.z + best.wz * 2.5 : best.z).toFixed(2),
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
      // (Sampled at the footprint's own corners, 3.5 m: at 3 m a mast on a steep summit
      // could hang 0.7 m over the ground at a corner, 2026-11-11.)
      const y = buildable(ctx, x + dx, z + dz, 3.5, 2.5);
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
  // Footprints too big for the 15 m rule (the wildlands' crags, cliffs and ruins).
  const large = out
    .filter((p) => Math.max(...footAt(p.model, p.turn)) > 24)
    .map((p) => {
      const [w, d] = footAt(p.model, p.turn);
      return [p.x - w / 2 - 6, p.z - d / 2 - 6, p.x + w / 2 + 6, p.z + d / 2 + 6] as const;
    });
  const nearBuilding = (x: number, z: number) => {
    for (const [x0, z0, x1, z1] of large) if (x > x0 && x < x1 && z > z0 && z < z1) return true;
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
    // (3.2 m, 2026-11-11: on the higher Iron Peaks a 3.5 m step plus the sink buried a corner
    // 4 m deep.)
    "rock-big-2": [4.5, 3.2],
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
 * Built as steps (foundation audit 2026-11-10), pausing between its phases so a server room can
 * let other rooms in its isolate run while a cold island is built (1.3 s in one piece otherwise).
 * The result is the generator's return value.
 */
export function* islandLayoutSteps(
  meta: WorldMeta,
  heightAt: (x: number, z: number) => number,
  coverAt: (x: number, z: number) => number,
): Generator<void, Placement[], void> {
  const out: Placement[] = [];
  const ctx: Context = { meta, heightAt, coverAt };
  for (const poi of meta.pois) {
    LAYOUTS[poi.id]?.(poi, out, ctx);
    yield;
  }
  for (const phase of [
    railways,
    landmarks,
    quarryUpgrade,
    damUpgrade,
    eastWorksUpgrade,
    locationPolish,
    locationsAudit,
    estates,
    countryside,
    farmLife,
    fieldDressing,
    islandWilds,
    shoreLife,
    hillMasts,
    powerLines,
    roadsideCover,
    bridgeCover,
    straitShores,
    straitRoadside,
    straitRoadPoles,
    highwayStops,
    wildlands,
    nature,
    roadsThroughBuildings,
  ]) {
    phase(out, ctx);
    yield;
  }
  for (const p of out) {
    const site = entranceSiteIndex.get(`${p.model}:${p.x}:${p.z}`);
    if (site) {
      [p.x, p.y, p.z] = site.to as [number, number, number];
      p.turn = site.turn as Placement["turn"];
    }
    // A building stands at the lowest ground under it, so on a slope its uphill side is dug
    // in: a shed whose porch steps face uphill had its door buried (owner, 2026-11-08: "a small
    // house on a farm can't be entered"). Turned half round (the same footprint), the steps
    // face downhill instead.
    const steps = PORCH_STEPS[p.model];
    if (steps) {
      const dug = (turn: number) => {
        const [dx, dz] = turnXZ(steps[0], steps[1], turn);
        return ctx.heightAt(p.x + dx, p.z + dz) - p.y;
      };
      const flipped = ((p.turn + 2) & 3) as Placement["turn"];
      if (dug(p.turn) > 0.25 && dug(flipped) < dug(p.turn)) p.turn = flipped;
      // The ground inside must stay under the floor (0.37 m): where it rose through it, a player
      // standing on it had 1.81 m under the 2.22 m lintel, 1 cm short of the 1.8 m hull, and
      // five sheds could not be entered (map audit 2026-11-10). The shed comes up instead, as
      // far as its lowest corner allows (it never floats more than half a metre).
      let inside = -Infinity,
        corner = Infinity;
      for (const [lx, lz] of SHED_FLOOR_SAMPLES) {
        const [dx, dz] = turnXZ(lx, lz, p.turn);
        inside = Math.max(inside, ctx.heightAt(p.x + dx, p.z + dz) - p.y);
      }
      for (const [lx, lz] of [
        [-3, -2],
        [3, -2],
        [-3, 2.2],
        [3, 2.2],
      ] as const) {
        const [dx, dz] = turnXZ(lx, lz, p.turn);
        corner = Math.min(corner, ctx.heightAt(p.x + dx, p.z + dz) - p.y);
      }
      const lift = Math.min(inside - 0.33, corner + 0.5, 0.6);
      if (lift > 0) p.y = +(p.y + lift).toFixed(2);
    }
    // A bungalow's floor is its door sill. Placed at a pad's level where the ground is not
    // (the edges of Island Village's pad, Murder Cabins' slopes), it stood 0.5–0.9 m into the
    // ground or above it and none of its four doors could be used: it sits on its own ground.
    if (p.model === "bungalow") {
      const [fw, fd] = footAt(p.model, p.turn);
      const hs = [-1, 0, 1].flatMap((sx) =>
        [-1, 0, 1].map((sz) => ctx.heightAt(p.x + (sx * fw) / 2, p.z + (sz * fd) / 2)),
      );
      const lo = Math.min(...hs),
        hi = Math.max(...hs);
      if ((lo - p.y > 0.3 || hi - p.y > 0.6 || p.y - hi > 0.3) && hi - lo < 1.2)
        p.y = +(lo + Math.min(0.3, (hi - lo) / 2)).toFixed(2);
    }
  }
  return out;
}

/**
 * The Superstore island's woods and back roads (owner, 2026-11-08: "audit the rest of the island,
 * … forest, polish the entire island"): the forests were trees and bushes only. Per 110 m forest
 * cell: a hunting lookout, fallen logs, a camp, a cabin with its shed or a wreck on a track; along
 * the island's roads outside the POIs, an abandoned or burned-out car on the verge every few
 * hundred metres. Deterministic; off pads, roads, runways and other placements.
 */
function islandWilds(out: Placement[], ctx: Context) {
  const { meta } = ctx;
  const onIsland = (x: number, z: number) => z > 3350 && x > -2600 && x < 4300;
  // Everything already on the island, as footprints (a warehouse is 46 m long: its centre
  // alone says nothing about its ends).
  const near: Array<[number, number, number, number]> = out
    .filter((p) => onIsland(p.x, p.z))
    .map((p) => {
      const [w, d] = footAt(p.model, p.turn);
      return [p.x, p.z, w / 2, d / 2];
    });
  const clear = (x: number, z: number, r: number) =>
    !near.some(([px, pz, hw, hd]) => Math.abs(px - x) < r + hw && Math.abs(pz - z) < r + hd);
  const offPois = (x: number, z: number) =>
    !meta.pois.some((p) => Math.hypot(p.x - x, p.z - z) < (p.padRadius ?? p.radius) + 40);
  const put = (
    model: string,
    x: number,
    z: number,
    foot: number,
    flat: number,
    salt: number,
    gap = 8,
  ) => {
    if (!onIsland(x, z) || !offPois(x, z) || !clear(x, z, foot + gap)) return false;
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
    const [w, d] = footAt(model, 0);
    near.push([x, z, Math.max(w, d) / 2, Math.max(w, d) / 2]);
    return true;
  };
  const CELL = 110;
  for (let gz = Math.floor(3350 / CELL); gz < Math.ceil(5000 / CELL); gz++)
    for (let gx = Math.floor(-2600 / CELL); gx < Math.ceil(4300 / CELL); gx++) {
      const salt = 980_000 + gz * 1000 + gx;
      const x = (gx + 0.2 + hash(salt, 1) * 0.6) * CELL,
        z = (gz + 0.2 + hash(salt, 2) * 0.6) * CELL;
      if (ctx.coverAt(x, z) !== 4) continue;
      const r = hash(salt, 3);
      if (r < 0.04) put("lookout", x, z, 4.5, 1.5, salt);
      else if (r < 0.09) put("hunting-stand", x, z, 2.5, 1.2, salt);
      else if (r < 0.22) {
        put(hash(salt, 5) < 0.5 ? "mossy-log" : "log", x, z, 2.5, 0.9, salt);
        put("stump", x + 4 + hash(salt, 4) * 3, z + 3, 1.2, 0.8, salt + 1, 0);
      } else if (r < 0.25) {
        if (put("campsite", x, z, 6.5, 1.8, salt)) put("log", x + 9, z + 2, 2.5, 0.9, salt + 2, 0);
      } else if (r < 0.29) {
        // A hunters' camp: two canvas tents round a fire.
        if (put("campfire", x, z, 1.8, 0.8, salt)) {
          put("tent-canvas", x - 6, z + 2, 2.3, 1.0, salt + 4, 0);
          put(
            hash(salt, 9) < 0.5 ? "tent-dome" : "tent-canvas",
            x + 5,
            z - 4,
            2.3,
            1.0,
            salt + 5,
            0,
          );
          put("mossy-log", x + 1, z + 5, 2.2, 0.8, salt + 6, 0);
        }
      } else if (r < 0.31) {
        if (hash(salt, 8) < 0.5) put("shed", x, z, 3.6, 1.2, salt);
        else if (put("cabin", x, z, 5.5, 1.6, salt))
          put("shed", x + 10, z - 4, 3.5, 1.2, salt + 3, 0);
      } else if (r < 0.35)
        put(hash(salt, 6) < 0.5 ? "rusty-truck" : "wreck-car", x, z, 3, 1.0, salt);
    }
  // Wrecked motorboats on the island's beaches (sand), one in ~1 of 8 sandy 110 m cells.
  for (let gz = Math.floor(3350 / CELL); gz < Math.ceil(5000 / CELL); gz++)
    for (let gx = Math.floor(-2600 / CELL); gx < Math.ceil(4300 / CELL); gx++) {
      const salt = 985_000 + gz * 1000 + gx;
      const x = (gx + 0.5) * CELL,
        z = (gz + 0.5) * CELL;
      if (ctx.coverAt(x, z) === 1 && hash(salt, 1) < 0.12) put("boat-wreck", x, z, 2.7, 1.2, salt);
    }
  // Wrecks on the verges of the island's roads.
  let salt = 990_000;
  const WRECKS = ["wreck-car", "burned-car-b", "crashed-car", "rusty-truck", "cadillac"];
  for (const road of meta.roads) {
    let walked = 0,
      next = 200 + hash(salt++, 1) * 300;
    for (let k = 0; k + 1 < road.points.length; k++) {
      const [ax, az] = road.points[k]!,
        [bx, bz] = road.points[k + 1]!;
      const len = Math.hypot(bx - ax, bz - az);
      if (!(len > 0)) continue;
      while (walked + len > next) {
        const t = (next - walked) / len;
        const px = ax + (bx - ax) * t,
          pz = az + (bz - az) * t;
        next += 380 + hash(salt++, 2) * 320;
        if (!onIsland(px, pz) || !offPois(px, pz) || !clear(px, pz, 10)) continue;
        const dx = (bx - ax) / len,
          dz = (bz - az) / len,
          side = hash(salt, 3) < 0.5 ? -1 : 1;
        const x = px - dz * side * (road.width / 2 + 0.8),
          z = pz + dx * side * (road.width / 2 + 0.8);
        const model = WRECKS[Math.floor(hash(salt, 4) * WRECKS.length)]!;
        const along = Math.abs(dx) > Math.abs(dz);
        const longZ = LONG_Z.has(model) || model === "wreck-car";
        const turn = (along === longZ ? 1 : 0) as Placement["turn"];
        // On its lowest corner: by a roadside ditch the verge falls away under one side.
        // (Its longer side either way: the footprint tables and the models disagree on axes.)
        const r = Math.max(...footAt(model, turn)) / 2;
        const y = Math.min(
          ctx.heightAt(x, z),
          ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => ctx.heightAt(x + sx * r, z + sz * r))),
        );
        if (underwater(meta, x, z, y) || bridgeDistance(meta, x, z) < 30) continue;
        out.push({
          model,
          x: +x.toFixed(2),
          y: +y.toFixed(2),
          z: +z.toFixed(2),
          turn,
          poi: "countryside",
        });
        near.push([x, z, 2.5, 2.5]);
      }
      walked += len;
    }
  }
}

/** Side of the open-country grid (m): at most one story spot per cell. */
const WILD_CELL = 300;
/** Rocks that ring an outcrop or a crag (the new scans and the older boulders). */
const WILD_ROCKS = [
  "rock-tall",
  "rock-grey",
  "rock-cluster",
  "river-rock-a",
  "rock-big-1",
  "rock-mid-1",
];

/**
 * The open country between the POIs (owner, 2026-11-08: "upgrade the dead space areas, like
 * fields, to be more realistic, like mountains, rocks… H1Z1's first map is the goal"). H1Z1's
 * King of the Kill map filled its barren regions with landmarks and small story spots worth a
 * detour (research, 2026-11-08); here, one per 300 m cell where it fits, picked by the ground:
 *
 *  - (no longer: a 68 m crag and a 110 m cliff and boulder field on open grass. Both scans
 *    are shells, a face and the rock's top with nothing under it, and on the island's gentle
 *    ground they hung 10–22 m over the grass behind the face: owner, 2026-11-12, "fix this
 *    broken mountain". Those cells have a boulder outcrop instead; rock-ground.ts sets every
 *    other rock down on the ground);
 *  - rock outcrops: four to eight boulders round a point (cover across the open);
 *  - ruins: an abbey's walls and a broken arcade on a rise;
 *  - a fire lookout on the highest ground of the cell, with its outhouse and log pile;
 *  - in the woods, a hunters' ruined cabin (enterable, door fitted) or a logging camp
 *    (log stacks, an excavator, a container);
 *  - in the fields, an abandoned container cache, stranded tank wagons or a wind pump.
 *
 * Plus three lines of high-voltage pylons across the country (wired by structures-renderer),
 * and wrecked sedans on the verges of the mainland roads. Nothing within reach of a POI, a
 * town, a road, a bridge or a runway; nothing on water; nothing over anything already placed.
 * Deterministic.
 */
function wildlands(out: Placement[], ctx: Context) {
  const { meta } = ctx;
  // Everything already placed, as footprints in a 64 m grid.
  const G = 64;
  const grid = new Map<number, Array<[number, number, number, number]>>();
  const cells = (x0: number, z0: number, x1: number, z1: number, f: (k: number) => void) => {
    for (let cz = Math.floor(z0 / G); cz <= Math.floor(z1 / G); cz++)
      for (let cx = Math.floor(x0 / G); cx <= Math.floor(x1 / G); cx++) f(cz * 4096 + cx);
  };
  const add = (x0: number, z0: number, x1: number, z1: number) =>
    cells(x0, z0, x1, z1, (k) => {
      const list = grid.get(k);
      if (list) list.push([x0, z0, x1, z1]);
      else grid.set(k, [[x0, z0, x1, z1]]);
    });
  const free = (x0: number, z0: number, x1: number, z1: number) => {
    let ok = true;
    cells(x0, z0, x1, z1, (k) => {
      if (ok)
        for (const [a, b, c, d] of grid.get(k) ?? [])
          if (x0 < c && x1 > a && z0 < d && z1 > b) ok = false;
    });
    return ok;
  };
  for (const p of out) {
    const [w, d] = footAt(p.model, p.turn);
    add(p.x - w / 2, p.z - d / 2, p.x + w / 2, p.z + d / 2);
  }
  const away = (x: number, z: number, r: number) =>
    Math.abs(x) + r < 4700 &&
    Math.abs(z) + r < 4700 &&
    !meta.pois.some((p) => Math.hypot(p.x - x, p.z - z) < poiReach(p) + r) &&
    !inTown(meta, x, z, 120 + r) &&
    roadDistance(meta, x, z, r + 14) >= r + 12 &&
    bridgeDistance(meta, x, z) > r + 30 &&
    !onRunway(meta, x, z, r + 30);
  /**
   * Stand a model on the ground at (x, z): at the lowest of nine points under its footprint
   * (`top`: the highest), `sink` metres into it. Refused when the ground under it varies by more than `rough`, is
   * wet, or the footprint (plus `gap`) meets anything placed.
   */
  const put = (
    model: string,
    x: number,
    z: number,
    turn: Placement["turn"],
    { sink = 0, rough = 1.5, gap = 2, poi = "countryside", top = false } = {},
  ) => {
    const [w, d] = footAt(model, turn);
    if (!away(x, z, Math.max(w, d) / 2)) return false;
    const x0 = x - w / 2,
      z0 = z - d / 2,
      x1 = x + w / 2,
      z1 = z + d / 2;
    if (!free(x0 - gap, z0 - gap, x1 + gap, z1 + gap)) return false;
    let low = Infinity,
      high = -Infinity;
    for (let i = 0; i <= 2; i++)
      for (let j = 0; j <= 2; j++) {
        const px = x0 + (w * i) / 2,
          pz = z0 + (d * j) / 2;
        const h = ctx.heightAt(px, pz);
        if (underwater(meta, px, pz, h)) return false;
        low = Math.min(low, h);
        high = Math.max(high, h);
      }
    if (high - low > rough) return false;
    out.push({
      model,
      x: +x.toFixed(2),
      y: +((top ? high : low) - sink).toFixed(2),
      z: +z.toFixed(2),
      turn,
      poi,
    });
    add(x0, z0, x1, z1);
    return true;
  };
  const turnOf = (salt: number) => (Math.floor(hash(salt, 41) * 4) % 4) as Placement["turn"];
  /** `n` boulders round (cx, cz) between `r0` and `r1` metres out. */
  const ring = (cx: number, cz: number, n: number, r0: number, r1: number, salt: number) => {
    let placed = 0;
    for (let k = 0; k < n * 2 && placed < n; k++) {
      const a = hash(salt + k, 51) * Math.PI * 2,
        r = r0 + hash(salt + k, 52) * (r1 - r0);
      const model = WILD_ROCKS[Math.floor(hash(salt + k, 53) * WILD_ROCKS.length)]!;
      if (
        put(model, cx + Math.cos(a) * r, cz + Math.sin(a) * r, turnOf(salt + k), {
          sink: 0.3,
          rough: 2,
          gap: 1,
          poi: "nature",
        })
      )
        placed++;
    }
    return placed;
  };
  /** The highest of 16 hashed points of a cell that is away from everything (or null). */
  const summit = (gx: number, gz: number, r: number, salt: number) => {
    let best: [number, number, number] | null = null;
    for (let k = 0; k < 16; k++) {
      const x = (gx + 0.15 + hash(salt + k, 61) * 0.7) * WILD_CELL,
        z = (gz + 0.15 + hash(salt + k, 62) * 0.7) * WILD_CELL;
      if (!away(x, z, r)) continue;
      const h = ctx.heightAt(x, z);
      if (!best || h > best[2]) best = [x, z, h];
    }
    return best;
  };

  const n = Math.ceil(4800 / WILD_CELL);
  for (let gz = -n; gz < n; gz++)
    for (let gx = -n; gx < n; gx++) {
      const salt = 1_200_000 + (gz + n) * 1000 + (gx + n) * 7;
      const x = (gx + 0.2 + hash(salt, 1) * 0.6) * WILD_CELL,
        z = (gz + 0.2 + hash(salt, 2) * 0.6) * WILD_CELL;
      const cover = ctx.coverAt(x, z);
      if (cover < 2 || cover > 5) continue; // water, sand, urban, roads
      const open = cover === 2 || cover === 3;
      const woods = cover === 4;
      const r = hash(salt, 3);
      const t = turnOf(salt);
      if (r < 0.34) {
        // A boulder outcrop (any ground): cover in the open, a landmark in the woods.
        if (put("rock-tall", x, z, t, { sink: 0.5, rough: 2.5, gap: 1, poi: "nature" }))
          ring(x, z, 4 + Math.floor(hash(salt, 4) * 5), 5, 16, salt);
      } else if (r < 0.42 && !woods) {
        const top = summit(gx, gz, 26, salt);
        if (top && put("abbey-ruins", top[0], top[1], t, { sink: 0.3, rough: 3 })) {
          const a = hash(salt, 5) * Math.PI * 2;
          put("arch-ruins", top[0] + Math.cos(a) * 30, top[1] + Math.sin(a) * 30, t, {
            sink: 0.2,
            rough: 2,
          });
          ring(top[0], top[1], 4, 28, 40, salt);
        }
      } else if (r < 0.47) {
        const top = summit(gx, gz, 8, salt);
        if (top && put("fire-lookout", top[0], top[1], t, { rough: 1.6 })) {
          put("outhouse", top[0] + 9, top[1] + 4, t, { rough: 1, gap: 1 });
          put("log-pile-s", top[0] - 8, top[1] + 6, t, { rough: 1, gap: 1 });
        }
      } else if (r < 0.58 && woods) {
        // A hunters' cabin, fallen in: the way in is its open front and its fitted door.
        // Its floor (0.31 m up its foundation logs) at the highest ground under it, so the
        // terrain never shows through; its yard keeps clear of the two ways in (the side door,
        // +x, and the open end, +z).
        // Its floor is level with the highest ground: from the lowest, at most one step up. On
        // a slope it looks for a level spot a little way off (up to 40 m).
        const spot = [
          [0, 0],
          [25, 0],
          [-25, 0],
          [0, 25],
          [0, -25],
          [40, 40],
          [-40, -40],
        ].find(([ox, oz]) =>
          put("ruined-cabin", x + ox!, z + oz!, t, { sink: 0.31, rough: 0.34, gap: 3, top: true }),
        );
        if (spot) {
          const cx = x + spot[0]!,
            cz = z + spot[1]!;
          const at = (u: number, v: number) => {
            const [dx, dz] = turnXZ(u, v, t);
            return [cx + dx, cz + dz] as const;
          };
          put("outhouse", ...at(-7, 3), t, { rough: 1, gap: 1 });
          put("log-pile-s", ...at(-6, -6), t, { rough: 1, gap: 1 });
          put("campfire", ...at(5, 7), t, { rough: 0.8, gap: 1 });
        }
      } else if (r < 0.63 && (woods || cover === 2)) {
        // A logging camp: stacks to hide behind, the digger, the crew's container.
        if (put("log-stack", x, z, t, { rough: 1.5, gap: 2 })) {
          put("log-stack", x + 12, z + 3, turnOf(salt + 1), { rough: 1.5, gap: 2 });
          put("excavator", x - 10, z + 10, turnOf(salt + 2), { rough: 1.2 });
          put("rust-container", x + 4, z - 16, (t & 1) as Placement["turn"], { rough: 1.2 });
          put("log-pile-s", x - 12, z - 6, t, { rough: 1, gap: 1 });
          put("stump", x + 18, z - 8, t, { rough: 1, gap: 1 });
        }
      } else if (r < 0.67 && open) {
        // A container cache dropped in a field: a walk-in box of loot with a wreck beside it.
        if (put("rust-container", x, z, t, { rough: 1.2, gap: 3 })) {
          put("wreck-sedan", x + 3, z + 10, turnOf(salt + 3), { rough: 1, gap: 1 });
          put("oil-drums", x - 9, z + 2, t, { rough: 1, gap: 1 });
        }
      } else if (r < 0.7 && cover === 3) {
        // Two tank wagons left in a field (a siding long since lifted).
        if (put("rail-tank", x, z, (t & 1) as Placement["turn"], { rough: 1, gap: 2 })) {
          const [dx, dz] = t & 1 ? [13, 0] : [0, 13];
          put("rail-tank", x + dx, z + dz, (t & 1) as Placement["turn"], { rough: 1, gap: 0.3 });
          ring(x, z, 3, 12, 20, salt);
        }
      } else if (r < 0.76 && open) {
        if (put("wind-pump", x, z, t, { rough: 1, gap: 2 })) {
          put("hay-bales", x + 8, z + 5, t, { rough: 1, gap: 1 });
          put("log-pile-s", x - 6, z - 6, t, { rough: 1, gap: 1 });
        }
      }
    }

  // High-voltage lines across the country, from the Old Dam's power house.
  const LINES: Array<Array<[number, number]>> = [
    [
      [-2990, -380],
      [-1600, -800],
      [-200, -1150],
    ],
    [
      [-200, -1450],
      [1000, -1700],
      [1900, -1700],
    ],
    [
      [-2800, 0],
      [-2300, 1150],
      [-800, 1350],
      [700, 1450],
    ],
  ];
  for (const line of LINES)
    for (let k = 0; k + 1 < line.length; k++) {
      const [ax, az] = line[k]!,
        [bx, bz] = line[k + 1]!;
      const len = Math.hypot(bx - ax, bz - az);
      // The arms across the line: the model's arms run along its x.
      const turn = (Math.abs(bx - ax) > Math.abs(bz - az) ? 1 : 0) as Placement["turn"];
      for (let d = k === 0 ? 0 : 300; d <= len; d += 300) {
        // A pylon that cannot stand here (a road, a river, a farm) moves along up to 60 m,
        // then up to 24 m off the line (a span stays within the 420 m the wires are strung over).
        const nx = -(bz - az) / len,
          nz = (bx - ax) / len;
        let placed = false;
        for (const off of [0, 24, -24])
          for (const shift of [0, 20, -20, 40, -40, 60, -60]) {
            const g = (d + shift) / len;
            if (placed || g < 0 || g > 1) continue;
            placed = put(
              "pylon",
              ax + (bx - ax) * g + nx * off,
              az + (bz - az) * g + nz * off,
              turn,
              { rough: 2.5, gap: 2, poi: "power" },
            );
          }
      }
    }

  // Wrecked sedans on the verges of the mainland roads (the island has its own).
  let salt = 1_300_000;
  for (const road of meta.roads) {
    let walked = 0,
      next = 300 + hash(salt++, 1) * 500;
    for (let k = 0; k + 1 < road.points.length; k++) {
      const [ax, az] = road.points[k]!,
        [bx, bz] = road.points[k + 1]!;
      const len = Math.hypot(bx - ax, bz - az);
      if (!(len > 0)) continue;
      while (walked + len > next) {
        const t = (next - walked) / len;
        next += 700 + hash(salt++, 2) * 600;
        const px = ax + (bx - ax) * t,
          pz = az + (bz - az) * t;
        if (pz > 3350) continue;
        const dx = (bx - ax) / len,
          dz = (bz - az) / len,
          side = hash(salt, 3) < 0.5 ? -1 : 1;
        // On the shoulder (graded level 2 m past the edge; the bank starts beyond it).
        const x = px - dz * side * (road.width / 2 + 1.6),
          z = pz + dx * side * (road.width / 2 + 1.6);
        if (meta.pois.some((p) => Math.hypot(p.x - x, p.z - z) < poiReach(p))) continue;
        if (inTown(meta, x, z, 60) || bridgeDistance(meta, x, z) < 30) continue;
        const turn = (Math.abs(dx) > Math.abs(dz) ? 0 : 1) as Placement["turn"];
        const [w, d] = footAt("wreck-sedan", turn);
        if (!free(x - w / 2 - 1, z - d / 2 - 1, x + w / 2 + 1, z + d / 2 + 1)) continue;
        // Seated on the lowest corner: a wheel never hangs in the air on a sloping verge.
        let y = ctx.heightAt(x, z);
        for (const [cx, cz] of [
          [-w / 2, -d / 2],
          [w / 2, -d / 2],
          [-w / 2, d / 2],
          [w / 2, d / 2],
        ] as const)
          y = Math.min(y, ctx.heightAt(x + cx, z + cz));
        if (underwater(meta, x, z, y)) continue;
        out.push({
          model: "wreck-sedan",
          x: +x.toFixed(2),
          y: +y.toFixed(2),
          z: +z.toFixed(2),
          turn,
          poi: "countryside",
        });
        add(x - w / 2, z - d / 2, x + w / 2, z + d / 2);
      }
      walked += len;
    }
  }
}

/**
 * Free-ground placement for the landmarks: everything already in `out` as footprints in a 64 m
 * grid; `put` stands a model on the ground (lowest of nine points under it, `sink` into it, or
 * `y` when given) when the ground is dry, varies by no more than `rough` and nothing is within
 * `gap`; `clearOfRoads` keeps it off the road surfaces.
 */
function siteKit(ctx: Context, out: Placement[]) {
  const { meta } = ctx;
  const G = 64;
  const grid = new Map<number, Array<[number, number, number, number]>>();
  const cells = (x0: number, z0: number, x1: number, z1: number, f: (k: number) => void) => {
    for (let cz = Math.floor(z0 / G); cz <= Math.floor(z1 / G); cz++)
      for (let cx = Math.floor(x0 / G); cx <= Math.floor(x1 / G); cx++) f(cz * 4096 + cx);
  };
  const add = (x0: number, z0: number, x1: number, z1: number) =>
    cells(x0, z0, x1, z1, (k) => {
      const list = grid.get(k);
      if (list) list.push([x0, z0, x1, z1]);
      else grid.set(k, [[x0, z0, x1, z1]]);
    });
  const free = (x0: number, z0: number, x1: number, z1: number) => {
    let ok = true;
    cells(x0, z0, x1, z1, (k) => {
      if (ok)
        for (const [a, b, c, d] of grid.get(k) ?? [])
          if (x0 < c && x1 > a && z0 < d && z1 > b) ok = false;
    });
    return ok;
  };
  const mark = (p: Placement) => {
    const [w, d] = footAt(p.model, p.turn);
    add(p.x - w / 2, p.z - d / 2, p.x + w / 2, p.z + d / 2);
  };
  for (const p of out) mark(p);
  const put = (
    model: string,
    x: number,
    z: number,
    turn: Placement["turn"],
    {
      sink = 0,
      rough = 1.5,
      gap = 1.5,
      poi = "countryside",
      y = undefined as number | undefined,
      roads = true,
      // `top`: stand on the highest sampled ground, not the lowest. `apron`: also sample this
      // far round the footprint (a doorstep that must not stand above the floor).
      top = false,
      apron = 0,
      // `shore`: how far above a lake's level the ground must be (a dam's reservoir bench
      // stands 0.3 m above its water). `bridges`: keep off bridges and dam walls (a dam's
      // powerhouse checks its own distance from the wall).
      shore = 0.5,
      bridges = true,
    } = {},
  ) => {
    const [w, d] = footAt(model, turn);
    const x0 = x - w / 2,
      z0 = z - d / 2;
    if (!free(x0 - gap, z0 - gap, x0 + w + gap, z0 + d + gap)) return false;
    let low = Infinity,
      high = -Infinity;
    const n = apron > 0 ? 4 : 2;
    for (let i = 0; i <= n; i++)
      for (let j = 0; j <= n; j++) {
        const px = x0 - apron + ((w + 2 * apron) * i) / n,
          pz = z0 - apron + ((d + 2 * apron) * j) / n;
        const h = ctx.heightAt(px, pz);
        if (y === undefined && underwater(meta, px, pz, h, shore)) return false;
        if (roads && roadDistance(meta, px, pz, 8) < 5) return false;
        low = Math.min(low, h);
        high = Math.max(high, h);
      }
    if (y === undefined && high - low > rough) return false;
    if (roads && roadInRect(meta, x0 - 2, z0 - 2, x0 + w + 2, z0 + d + 2)) return false;
    if (bridges && bridgeDistance(meta, x, z) < Math.max(w, d) / 2 + 12) return false;
    if (onRunway(meta, x, z, Math.max(w, d) / 2 + 10)) return false;
    const p: Placement = {
      model,
      x: +x.toFixed(2),
      y: +(y ?? (top ? high : low) - sink).toFixed(2),
      z: +z.toFixed(2),
      turn,
      poi,
    };
    out.push(p);
    mark(p);
    return true;
  };
  /** The first of `n` hashed points within `r` of (cx, cz) where `fits` returns true. */
  const search = (
    cx: number,
    cz: number,
    r: number,
    salt: number,
    fits: (x: number, z: number) => boolean,
    n = 60,
  ) => {
    for (let k = 0; k < n; k++) {
      const a = hash(salt + k, 3) * Math.PI * 2,
        d = k === 0 ? 0 : r * Math.sqrt(hash(salt + k, 4));
      const x = cx + Math.cos(a) * d,
        z = cz + Math.sin(a) * d;
      if (fits(x, z)) return [x, z] as const;
    }
    return null;
  };
  return { put, free, mark, search, reserve: add };
}

/** Clear `w` × `d` metres of level (within `rough`), dry, road-free ground round (x, z)? */
function openPlot(
  ctx: Context,
  kit: ReturnType<typeof siteKit>,
  x: number,
  z: number,
  w: number,
  d: number,
  rough: number,
) {
  if (!kit.free(x - w / 2, z - d / 2, x + w / 2, z + d / 2)) return false;
  let low = Infinity,
    high = -Infinity;
  for (let i = 0; i <= 4; i++)
    for (let j = 0; j <= 4; j++) {
      const px = x - w / 2 + (w * i) / 4,
        pz = z - d / 2 + (d * j) / 4;
      const h = ctx.heightAt(px, pz);
      if (underwater(ctx.meta, px, pz, h) || roadDistance(ctx.meta, px, pz, 10) < 7) return false;
      low = Math.min(low, h);
      high = Math.max(high, h);
    }
  return high - low <= rough && bridgeDistance(ctx.meta, x, z) > Math.max(w, d) / 2 + 20;
}

/**
 * Railways (owner, 2026-11-08: "audit the map … to look like H1Z1/PUBG/Verdansk": Verdansk's
 * train station, its quarry and lumber-yard lines and stranded carriages; Erangel's lines). Two
 * straight lines over the flattest open runs of the map: every 50 m row and column was scanned
 * for the longest stretch clear of water, rivers, towns, POIs, bridges and buildings
 * (scripts/br/map-audit, 2026-11-08). Line A comes in from the west edge to a freight yard on
 * Crossroads' western outskirts, line B from the military base's south-east out past East Works.
 * Track in 4 m sections on the ground; level-crossing signals where a road crosses; a train
 * stranded on each line; the yard's sidings hold wagons, a locomotive and the depot shed.
 */
const RAILWAYS: Array<{
  z: number;
  from: number;
  to: number;
  yard: "east" | "west";
  stranded: number;
}> = [
  { z: -1350, from: -4598, to: -560, yard: "east", stranded: -2600 },
  { z: 2350, from: 560, to: 4598, yard: "west", stranded: 2900 },
];
/** Height of the rail top above a track section's origin (wheels stand on it). */
const RAIL_TOP = 0.3;
function railways(out: Placement[], ctx: Context) {
  const { meta } = ctx;
  /** Track along z = `z` from x0 to x1; returns the rail-top height per 4 m section start. */
  const lay = (z: number, x0: number, x1: number) => {
    const tops = new Map<number, number>();
    let crossing = false;
    for (let s = x0; s + 4 <= x1; s += 4) {
      const x = s + 2;
      const h = Math.min(ctx.heightAt(s, z), ctx.heightAt(s + 4, z), ctx.heightAt(x, z));
      if (underwater(meta, x, z, h) || bridgeDistance(meta, x, z) < 25) continue;
      const y = h - 0.12;
      out.push({ model: "rail-track", x, y: +y.toFixed(2), z, turn: 0, poi: "rail" });
      tops.set(Math.round(s), y + RAIL_TOP);
      // A road over the line: signals either side, clear of the carriageway.
      const onRoad = roadDistance(meta, x, z, 8) < 4.5;
      if (onRoad && !crossing)
        for (const [dx, dz, turn] of [
          [-7, -4, 2],
          [7, 4, 0],
        ] as const) {
          const px = x + dx,
            pz = z + dz;
          if (roadDistance(meta, px, pz, 8) > 5)
            out.push({
              model: "rail-crossing",
              x: +px.toFixed(2),
              y: +ctx.heightAt(px, pz).toFixed(2),
              z: +pz.toFixed(2),
              turn,
              poi: "rail",
            });
        }
      crossing = onRoad;
    }
    return tops;
  };
  const topAt = (tops: Map<number, number>, x0: number, x: number) =>
    tops.get(x0 + Math.floor((x - x0) / 4) * 4);
  /** Rolling stock on a line: each `model` at x along the track, end to end. */
  const train = (tops: Map<number, number>, x0: number, z: number, x: number, cars: string[]) => {
    const LEN: Record<string, number> = {
      "diesel-loco": 16,
      boxcar: 13,
      "old-wagon": 12,
      "rail-tank": 12,
    };
    for (const model of cars) {
      const len = LEN[model]!;
      const y = Math.max(topAt(tops, x0, x) ?? -99, topAt(tops, x0, x + len - 1) ?? -99);
      if (y > -50)
        out.push({
          model,
          x: +(x + len / 2).toFixed(2),
          y: +y.toFixed(2),
          z,
          turn: 1,
          poi: "rail",
        });
      x += len + 1;
    }
  };
  for (const line of RAILWAYS) {
    const main = lay(line.z, line.from, line.to);
    train(main, line.from, line.z, line.stranded, [
      "diesel-loco",
      "boxcar",
      "boxcar",
      "rail-tank",
      "boxcar",
      "old-wagon",
    ]);
    // The freight yard at the line's end: two sidings beside the main line, wagons and a
    // locomotive on them, the depot shed and the yard's containers and drums.
    const dir = line.yard === "east" ? -1 : 1;
    const end = line.yard === "east" ? line.to : line.from;
    const s0 = line.yard === "east" ? end - 300 : end + 4,
      s1 = line.yard === "east" ? end - 4 : end + 300;
    const sid1 = lay(line.z + 6, s0, s1),
      sid2 = lay(line.z + 12, s0 + 40, s1 - 40);
    train(sid1, s0, line.z + 6, s0 + 30, ["boxcar", "boxcar", "boxcar", "old-wagon", "rail-tank"]);
    train(sid2, s0 + 40, line.z + 12, s0 + 140, ["diesel-loco", "boxcar", "boxcar"]);
    const kit = siteKit(ctx, out);
    const depot = kit.search(
      end + dir * 80,
      line.z + 40,
      120,
      8_000 + line.z,
      (x, z) => kit.put("rail-depot", x, z, 1, { rough: 0.9, gap: 2, poi: "rail" }),
      240,
    );
    const depotX = depot ? depot[0] : end + dir * 60;
    for (let k = 0; k < 4; k++)
      kit.put("container-40", depotX + dir * (40 + k * 4), line.z + 30, 1, {
        rough: 1.2,
        gap: 0.3,
        poi: "rail",
      });
    kit.put("oil-drums", depotX - dir * 16, line.z + 22, 0, { rough: 1, gap: 0.5, poi: "rail" });
    kit.put("pallets", depotX - dir * 20, line.z + 24, 0, { rough: 1, gap: 0.5, poi: "rail" });
    kit.put("ind-office-trailer", depotX + dir * 75, line.z + 30, 0, {
      rough: 1.2,
      gap: 1,
      poi: "rail",
    });
  }
}

/**
 * The map's missing landmarks (2026-11-08 audit against Verdansk, Erangel and H1Z1): a port at
 * Fisher's Cove (dockside cranes, a container yard, a coaster at the quay and a container ship at
 * anchor), the Old Dam's power station (switch house, transformers, smoke stacks: the pylon lines
 * start there), Central Hospital's main block, the military base's motor pool and firing range,
 * a car salvage yard (H1Z1's Coy's Car Salvage) and two graveyards: a chapel's and a ruined
 * church's on a rise (Erangel's Ruins).
 */
/**
 * Location polish (owner, 2026-11-09: "Redstone Quarry … should be like a mountain/sand hole";
 * Iron Peaks, Pine Ridge and Northstar "well designed … a realistic world"):
 *
 * - **Redstone Quarry**: the pit is now sunk 140 m into its own massif (build_world.py), with
 *   two haul roads. Rock faces stand at the toe of the bench walls (cover along each bench), and
 *   the floor gets a working pit's kit as cover: conveyors from the processing hall, excavators,
 *   dump trucks, spoil and gravel mounds, rock piles and containers, so the floor is no longer
 *   an open killing field.
 * - **Iron Peaks**: rock faces on the bare upper slopes (cover on the climb), an old mine
 *   entrance in its outcrop at the tree line, and a mountain hut below the summit ridge.
 * - **Pine Ridge**: a timber village round the cabins: log cabins and old huts, a lumber yard
 *   (log stacks and piles inside a board fence with broken sections), outhouses, a camp.
 */
/**
 * Location audit (owner, 2026-11-09: "audit Millhaven, Crossroads, Central Hospital, Old Dam,
 * ensure nothing is missing, improve so it feels like a complete map"; the hospital "enterable
 * and fun to play inside, like H1Z1/PUBG/Warzone's but our own touch"):
 *  - the hospital's rooms furnished (beds, wheelchairs, oxygen), floor by floor
 *    (art/br/fitout/locations.py builds the floors, stairs and rooms);
 *  - its forecourt a quarantine field hospital: ward and first-aid tents in rows, stretchers and
 *    oxygen between them, inside sandbag and barrier lines with a checkpoint at the gate;
 *  - car parks round the campus (lines, cars, lamps);
 *  - the Old Dam's reservoir a line of buoys upstream of the wall.
 * Millhaven's works and Crossroads' school and truck stop are town features (gridTown).
 */
function locationsAudit(out: Placement[], ctx: Context) {
  const hosp = out.find((p) => p.model === "hosp-er");
  const poi = ctx.meta.pois.find((p) => p.id === "central-hospital");
  if (hosp && poi) {
    // (The rooms are furnished by hospitalCampus since the 2026-11-13 mega hospital.)
    // The quarantine field hospital on the forecourt (in front of the emergency department,
    // beyond its ambulances), then car parks east and west of the campus.
    const put = groundPlacer(ctx, out, poi.id, hosp.x, hosp.z, 260);
    const fx = hosp.x,
      fz = hosp.z + 37;
    for (let row = 0; row < 2; row++)
      for (let k = 0; k < 4; k++) {
        const x = fx - 27 + k * 18,
          z = fz + row * 20;
        if (put(row === 0 ? "army-tent" : "medical-tent", x, z, row === 0 ? 0 : 2, { margin: 1 })) {
          put("stretcher", x + 5, z + 1, 0, { margin: 0.3 });
          put("oxygen-tank", x + 5, z - 2.2, 0, { margin: 0.2 });
        }
      }
    for (const [dx, dz, m, t] of [
      [-40, 8, "sandbags", 1],
      [40, 8, "sandbags", 1],
      [-40, 34, "sandbags", 1],
      [40, 34, "sandbags", 1],
      [-20, 46, "jersey", 0],
      [20, 46, "jersey", 0],
      [0, 50, "checkpoint", 0],
      [-30, 52, "barbed-barrier", 0],
      [30, 52, "barbed-barrier", 0],
      [-8, -6, "container-20", 1],
      [8, -6, "container-20", 1],
      [-44, 22, "street-lamp", 1],
      [44, 22, "street-lamp", 1],
    ] as const)
      put(m, fx + dx, fz + dz, t as Placement["turn"], { margin: 0.5 });
    for (const side of [-1, 1]) {
      const cx = poi.x + side * 76,
        cz = poi.z + 10;
      for (let r = 0; r < 3; r++) {
        const z = cz - 16 + r * 16;
        if (!put("lot-lines", cx, z, 0, { margin: 0.3, onRoad: true })) continue;
        for (let k = 0; k < 6; k++)
          if (hash(9_300 + r * 11 + k, side + 3) < 0.6)
            put(
              hash(9_400 + r * 7 + k, side + 5) < 0.7 ? "car-sedan" : "car-pickup",
              cx - 15 + k * 6,
              z + (k % 2 ? 2.6 : -2.6),
              0,
              { margin: 0.2, onRoad: true },
            );
        put("street-lamp", cx + 20, z, 1, { margin: 0.2, onRoad: true });
      }
    }
  }
  prisonInterior(out, ctx);
  riverwoodWaterfront(out, ctx);
  baseFlightLine(out, ctx);
  summerCamp(out, ctx);
  // The Old Dam's reservoir: a line of buoys 30 m upstream of the wall (the lake south of it).
  const dam = ctx.meta.bridges.find((b) => b.id === "old-dam");
  const lake =
    dam &&
    ctx.meta.waterBodies.find(
      (w) => w.level > 50 && w.bounds[1] < dam.b[1] + 200 && w.bounds[3] > dam.a[1],
    );
  if (dam && lake) {
    const [ax, az] = dam.a,
      [bx, bz] = dam.b;
    const len = Math.hypot(bx - ax, bz - az);
    const ux = (bx - ax) / len,
      uz = (bz - az) / len;
    // The reservoir's side of the wall (+z here: the upper lake lies south of it).
    const nx = -uz * Math.sign(lake.bounds[1] + lake.bounds[3] - az - bz || 1),
      nz = ux * Math.sign(lake.bounds[1] + lake.bounds[3] - az - bz || 1);
    for (let t = 30; t < len - 30; t += 12) {
      const x = ax + ux * t + nx * 30,
        z = az + uz * t + nz * 30;
      if (ctx.heightAt(x, z) > lake.level - 1) continue;
      out.push({
        model: "buoy",
        x: +x.toFixed(2),
        y: +(lake.level - 0.35).toFixed(2),
        z: +z.toFixed(2),
        turn: 0,
        poi: "shore",
      });
    }
  }
}

/**
 * Blackwater Prison's cell houses (prison.py, building-access-v10): bars on the barred cells
 * (half of them, alternating along each row and tier), a bunk in every cell; and the knoll's
 * rocky rim: boulders and outcrops set into the face all round (cover on the climb, the rock
 * read from the valley), on the face's slope rather than the level top.
 */
function prisonInterior(out: Placement[], ctx: Context) {
  const poi = ctx.meta.pois.find((p) => p.id === "blackwater-prison");
  if (!poi || poi.padHeight === undefined) return;
  const F = [0.06, 4.9, 9.82],
    WX0 = 10.5,
    CELL_W = 14.5 / 4;
  for (const b of out.filter((p) => p.model === "prison-block" && p.poi === poi.id)) {
    const put = (model: string, lx: number, ly: number, lz: number, turn: number) => {
      const [dx, dz] = turnXZ(lx, lz, b.turn);
      out.push({
        model,
        x: +(b.x + dx).toFixed(2),
        y: +(b.y + ly).toFixed(2),
        z: +(b.z + dz).toFixed(2),
        turn: ((turn + b.turn) % 4) as Placement["turn"],
        poi: poi.id,
      });
    };
    for (const s of [-1, 1])
      for (let tier = 0; tier < 3; tier++)
        for (let k = 0; k < 4; k++) {
          const lo = s < 0 ? -(WX0 + (k + 1) * CELL_W) : WX0 + k * CELL_W;
          const cx = lo + CELL_W / 2;
          const barred = (k + (tier > 0 ? 1 : 0)) % 2 === 0;
          for (const [front, bunk] of [
            [-2.825, -4.3],
            [2.825, 4.3],
          ] as const) {
            if (barred) put("cell-bars", cx, F[tier]!, front, 0);
            put("prison-bed", lo + 0.65, F[tier]!, bunk, 0);
          }
        }
  }
  // The rim: walk out from the yard on bearings every 4° to where the top ends, then set
  // rocks into the face below it (not across the road up to the south gate).
  for (let k = 0; k < 90; k++) {
    const a = (k / 90) * Math.PI * 2;
    if (Math.abs(a - Math.PI / 2) < 0.16) continue;
    const ux = Math.cos(a),
      uz = Math.sin(a);
    let r = 150;
    while (r < 240 && ctx.heightAt(poi.x + ux * r, poi.z + uz * r) > poi.padHeight - 0.5) r += 1;
    if (r >= 240) continue;
    const salt = 7_900 + k;
    const h = hash(salt, 1);
    const model =
      h < 0.3 ? "rock-big-2" : h < 0.55 ? "rock-tall" : h < 0.8 ? "rock-big-1" : "rock-cluster";
    const d = r + 3 + hash(salt, 2) * 9;
    const x = poi.x + ux * d,
      z = poi.z + uz * d;
    const [w, dd] = footAt(model, 0);
    const hs = [-w / 2, w / 2].flatMap((ox) =>
      [-dd / 2, dd / 2].map((oz) => ctx.heightAt(x + ox, z + oz)),
    );
    const low = Math.min(...hs);
    if (Math.max(...hs) - low > 3.4) continue;
    out.push({
      model,
      x: +x.toFixed(2),
      y: +(low - 0.3).toFixed(2),
      z: +z.toFixed(2),
      turn: (Math.floor(hash(salt, 3) * 4) % 4) as Placement["turn"],
      poi: "nature",
    });
  }
}

/**
 * Riverwood's waterfront (location audit, 2026-11-09: the river town had nothing on its river):
 * the lumber mill on the north bank between the town and the main river (sawmill sheds, the
 * mill warehouse, log stacks and planks, the log loader, forklifts and trucks), and jetties
 * along the bank below it with motorboats and rowboats, scrap-wood shacks behind them.
 */
function riverwoodWaterfront(out: Placement[], ctx: Context) {
  const poi = ctx.meta.pois.find((p) => p.id === "riverwood");
  if (!poi) return;
  const mx = poi.x - 300,
    mz = poi.z - 335;
  const put = groundPlacer(ctx, out, poi.id, mx, mz, 320);
  const mill: Array<[string, number, number, Placement["turn"]]> = [
    ["sawmill", -40, -10, 0],
    ["sawmill", -22, -10, 0],
    ["rural-quonset", 60, 5, 1],
    ["ind-office-trailer", -70, 30, 0],
    ["excavator", 0, 20, 1],
    ["semi-cab", 20, 40, 1],
    ["box-truck", 40, 40, 0],
    ["forklift", -8, -14, 0],
    ["forklift", 12, -4, 1],
    ["lot-light", -55, -40, 0],
    ["lot-light", 50, 30, 0],
  ];
  for (const [m, dx, dz, t] of mill) put(m, mx + dx, mz + dz, t, { margin: 1, flat: 1.4 });
  // The mill's warehouse: the first clear spot east of the sheds.
  for (const [dx, dz] of [
    [30, -30],
    [45, -45],
    [80, -20],
    [-60, -55],
    [110, 10],
  ])
    if (put("ind-warehouse-1", mx + dx!, mz + dz!, 0, { margin: 1, flat: 1.4 })) break;
  // The log yard: stacks in rows west of the sheds, planks by them.
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 3; j++)
      put("log-stack", mx - 95 + i * 9, mz - 30 + j * 14, 0, { margin: 0.6, flat: 1.2 });
  for (let k = 0; k < 6; k++)
    put("plank-stack", mx - 4 + (k % 3) * 4, mz + 8 + Math.floor(k / 3) * 5, 0, { margin: 0.4 });
  for (let k = 0; k < 5; k++) put("log", mx - 50 + k * 7, mz + 45, 1, { margin: 0.4 });
  // Jetties on the main river below the mill (marching south from mid-river to the bank).
  for (const [dx, salt] of [
    [-330, 1],
    [-240, 2],
    [-160, 3],
    [-90, 4],
  ] as const) {
    const end = seaPier(out, ctx, poi.x + dx, poi.z - 560, 0, 1, 0);
    if (!end) continue;
    const [ex, ez] = end;
    if (ctx.heightAt(ex + 6, ez - 14) < -0.4)
      out.push({
        model: "motorboat",
        x: +(ex + 6).toFixed(2),
        y: -0.2,
        z: +(ez - 14).toFixed(2),
        turn: (salt % 2 ? 0 : 2) as Placement["turn"],
        poi: "shore",
      });
    // (The bank is low: up the slope behind the jetty, where it is dry.)
    for (const back of [32, 40, 50])
      if (put("river-shack", ex - 9, ez + back, 0, { margin: 1, flat: 1.6 })) break;
  }
}

/**
 * Southern Military Base's flight line (2026-11-09 audit): between the compound's south gate and
 * the runway, open field hangars over parked trucks, a fuel truck and crates.
 */
function baseFlightLine(out: Placement[], ctx: Context) {
  const poi = ctx.meta.pois.find((p) => p.id === "southern-military-base");
  if (!poi) return;
  const put = groundPlacer(ctx, out, poi.id, poi.x, poi.z + 300, 160);
  for (const [dx, dz] of [
    [-70, 300],
    [-40, 300],
    [-100, 300],
    [30, 300],
    [60, 300],
  ]) {
    const x = poi.x + dx!,
      z = poi.z + dz!;
    if (!put("field-hangar", x, z, 0, { margin: 2, flat: 1.4 })) continue;
    // Parked under it (on its floor: the shed's own footprint is taken).
    const shed = out[out.length - 1]!;
    for (const [m, ox] of [
      ["mil-truck", -5],
      ["humvee", 4],
    ] as const)
      out.push({
        model: m,
        x: +(x + ox).toFixed(2),
        y: shed.y,
        z: +z.toFixed(2),
        turn: 0,
        poi: shed.poi,
      });
  }
  put("fuel-truck", poi.x - 10, poi.z + 290, 1, { margin: 1, flat: 1.4 });
  for (let k = 0; k < 4; k++)
    put("military-crate", poi.x - 20 + k * 3, poi.z + 315, 0, { margin: 0.3, flat: 1.2 });
}

/**
 * Murder Cabins' summer camp (2026-11-09 audit: sixty cabins scattered with no heart): on the
 * south shore of the lake north of the cabins, an abandoned camp round its campfire: a ring of
 * enterable cabins, the counsellors' cabin, tents, the archery range, the dock with canoes and the
 * boathouse shack; the camper van and a burned-out police car on the camp track (the night it
 * all went wrong).
 */
function summerCamp(out: Placement[], ctx: Context) {
  const poi = ctx.meta.pois.find((p) => p.id === "murder-cabins");
  const lake = ctx.meta.waterBodies.find((w) => w.id === "lake-6");
  if (!poi || !lake) return;
  // The shore: north from the cabins until the lake.
  const sx = poi.x - 8;
  let sz = poi.z;
  while (sz > poi.z - 600 && ctx.coverAt(sx, sz) !== 0) sz -= 2;
  if (sz <= poi.z - 600) return;
  const cx = sx,
    cz = sz + 110;
  const put = groundPlacer(ctx, out, poi.id, cx, cz, 200);
  const at = (m: string, dx: number, dz: number, t: Placement["turn"], flat = 1.4, margin = 1) =>
    put(m, cx + dx, cz + dz, t, { margin, flat });
  // The campfire ring and the cabins round it (doors to the fire).
  at("campfire", 0, 0, 0, 1.2, 0.5);
  for (let k = 0; k < 6; k++)
    at(
      "log",
      Math.cos((k / 6) * Math.PI * 2) * 4.5,
      Math.sin((k / 6) * Math.PI * 2) * 4.5,
      (k % 2) as Placement["turn"],
      1.2,
      0.2,
    );
  for (let k = 0; k < 7; k++) {
    const a = -1.2 + (k / 6) * 2.4; // round the south side of the fire
    const r = 30;
    const x = Math.sin(a) * r,
      z = Math.cos(a) * r;
    const turn: Placement["turn"] = Math.abs(a) < 0.6 ? 2 : a > 0 ? 3 : 1;
    if (!at("camp-cabin", x, z, turn, 1.6, 1.5))
      at("camp-cabin", x * 1.25, z * 1.25, turn, 1.6, 1.5);
  }
  // The counsellors' cabin, tents and the latrines on the camp's west side.
  at("camp-cabin", -48, -12, 1, 1.6, 1.5);
  for (let k = 0; k < 4; k++)
    at("camp-gear", -44 + (k % 2) * 8, 20 + Math.floor(k / 2) * 9, 0, 1.2, 0.8);
  at("outhouse", -60, 35, 1, 1.2, 0.5);
  at("outhouse", -60, 39, 1, 1.2, 0.5);
  for (let k = 0; k < 4; k++)
    at("picnic-table", 12 + (k % 2) * 5, -14 - Math.floor(k / 2) * 5, 0, 1.2, 0.5);
  // The archery range east of the fire: targets in a row, hay bales behind them.
  for (let k = 0; k < 5; k++) {
    at("archery-target", 75, -20 + k * 6, 1, 1.2, 0.3);
    at("hay-bales", 80, -20 + k * 6, 1, 1.2, 0.3);
  }
  // The camp track: the camper van left with its doors open, a burned-out police car.
  at("camper-van", -20, 70, 1, 1.4, 1);
  at("burned-police-a", -8, 78, 0, 1.4, 1);
  at("wreck-car", 10, 72, 1, 1.4, 1);
  // The dock out into the lake (deck ~0.8 m over the water), canoes at it and on the beach,
  // the boathouse shack on the shore.
  out.push({
    model: "camp-dock",
    x: +sx.toFixed(2),
    y: +(lake.level + 0.8 - 4.28).toFixed(2),
    z: +(sz - 9).toFixed(2),
    turn: 0,
    poi: "shore",
  });
  for (const [dx, dz] of [
    [-7, -8],
    [7, -12],
    [9, -5],
  ] as const)
    if (ctx.coverAt(sx + dx, sz + dz) === 0)
      out.push({
        model: "canoe",
        x: +(sx + dx).toFixed(2),
        y: +(lake.level - 0.2).toFixed(2),
        z: +(sz + dz).toFixed(2),
        turn: 0,
        poi: "shore",
      });
  for (let k = 0; k < 3; k++)
    put("canoe", sx - 16 + k * 2.2, sz + 14, 0, { margin: 0.2, flat: 1.2 });
  put("swamp-shack", sx + 18, sz + 14, 0, { margin: 1, flat: 1.6 });
}

/**
 * Roads through buildings (owner, 2026-11-11: "audit the roads again … find issues like this and
 * fix across the map"): a street that runs in at one wall and out at the other (Millhaven's
 * factory stood across a 7 m road, the airfield's hangars across its service roads). The
 * building moves to the nearest free spot off the road (up to 60 m, turned a quarter if that
 * fits), or stays. A
 * driveway that ends inside a building (at a hangar door) is not a road through it.
 */
function roadsThroughBuildings(out: Placement[], ctx: Context) {
  const { meta } = ctx;
  // Each road's bounding box: most roads are nowhere near a given building.
  const boxes = meta.roads.map((r) => {
    let x0 = Infinity,
      z0 = Infinity,
      x1 = -Infinity,
      z1 = -Infinity;
    for (const [x, z] of r.points) {
      x0 = Math.min(x0, x);
      z0 = Math.min(z0, z);
      x1 = Math.max(x1, x);
      z1 = Math.max(z1, z);
    }
    return [x0, z0, x1, z1] as const;
  });
  const through = (x: number, z: number, w: number, d: number) => {
    const x0 = x - w / 2 + 0.5,
      x1 = x + w / 2 - 0.5,
      z0 = z - d / 2 + 0.5,
      z1 = z + d / 2 - 0.5;
    for (let i = 0; i < meta.roads.length; i++) {
      const r = meta.roads[i]!,
        [bx0, bz0, bx1, bz1] = boxes[i]!;
      if (bx1 < x0 || bx0 > x1 || bz1 < z0 || bz0 > z1) continue;
      let inside = 0;
      for (let k = 1; k < r.points.length; k++) {
        const [ax, az] = r.points[k - 1]!,
          [bx, bz] = r.points[k]!;
        if (Math.max(ax, bx) < x0 || Math.min(ax, bx) > x1) continue;
        if (Math.max(az, bz) < z0 || Math.min(az, bz) > z1) continue;
        inside += clippedLength(ax, az, bx, bz, x0, z0, x1, z1);
      }
      if (inside < 4) continue;
      const ends = [r.points[0]!, r.points[r.points.length - 1]!].some(
        ([ex, ez]) => ex > x0 - 3 && ex < x1 + 3 && ez > z0 - 3 && ez < z1 + 3,
      );
      if (!ends) return true;
    }
    return false;
  };
  const moved: Placement[] = [];
  for (let i = out.length - 1; i >= 0; i--) {
    const p = out[i]!;
    const foot = FOOT[p.model];
    if (!foot || !(ENTRANCE_APRONS[p.model] || foot[0] * foot[1] >= 150)) continue;
    if (entranceSiteIndex.has(`${p.model}:${p.x}:${p.z}`)) continue;
    const [w, d] = footAt(p.model, p.turn);
    // (The road index first: most buildings have no road near them at all.)
    if (!roadInRect(meta, p.x - w / 2, p.z - d / 2, p.x + w / 2, p.z + d / 2)) continue;
    if (!through(p.x, p.z, w, d)) continue;
    out.splice(i, 1);
    moved.push(p);
  }
  if (!moved.length) return;
  const kit = siteKit(ctx, out);
  for (const p of moved) {
    let done = false;
    // Nearest first, out to 60 m, either way round, with 5 m clear round it for the paths to
    // its doors; else it stays where it was (a landmark with a road along its wall is better
    // than none).
    for (let ring = 1; ring <= 30 && !done; ring++)
      for (let k = 0; k < ring * 8 && !done; k++)
        for (const turn of [p.turn, ((p.turn + 1) & 3) as Placement["turn"]]) {
          const [w, d] = footAt(p.model, turn);
          const a = (k / (ring * 8)) * Math.PI * 2;
          const x = p.x + Math.cos(a) * ring * 2,
            z = p.z + Math.sin(a) * ring * 2;
          if (through(x, z, w, d)) continue;
          done = kit.put(p.model, x, z, turn, { poi: p.poi, rough: 0.8, apron: 2, gap: 5 });
          if (done) break;
        }
    if (!done) out.push(p);
  }
}

/**
 * Location upgrades (owner, 2026-11-11: "upgrade the Quarry area, its a big spot with potential,
 * the deadspace needs to be fixed and so the players can somehow leave the hole from more ways.
 * Upgrade the dam area … alot of deadspace. The separate island (East Works) needs to be
 * upgraded as well"). Built from the island's existing, enterable models; the world builder
 * (build_world.py) adds the terrain they stand on: the quarry's access ramps, scree and spoil
 * heaps, the dam's powerhouse yard, East Works' larger pad.
 */
/**
 * Keep the ground in front of a just-placed building's doors clear (a pallet or a parked
 * lorry dropped there blocked the way in): 6 m out from each doorway, 5 m wide.
 */
function reserveDoors(kit: ReturnType<typeof siteKit>, p: Placement | undefined) {
  if (!p) return;
  for (const [lx, lz] of ENTRANCE_APRONS[p.model] ?? []) {
    const [dx, dz] = turnXZ(lx, lz, p.turn);
    const len = Math.hypot(dx, dz) || 1;
    const ox = p.x + dx + (dx / len) * 3,
      oz = p.z + dz + (dz / len) * 3;
    kit.reserve(ox - 3, oz - 3, ox + 3, oz + 3);
  }
}

/** Redstone Quarry's pit (build_world.py): radius, wall share, benches. */
const QUARRY_PIT = { R: 850, WALL: 0.55, BENCHES: 6 } as const;
const quarryWobble = (a: number) =>
  1 + 0.1 * Math.sin(2 * a + 1.1) + 0.06 * Math.sin(3 * a + 2.3) + 0.035 * Math.sin(5 * a + 0.4);
/** The six access ramps' angles (build_world.py: between the haul roads' entries). */
const QUARRY_RAMPS = Array.from(
  { length: 6 },
  (_, k) => Math.atan2(-0.6, 0.8) + ((k + 0.5) * Math.PI) / 3,
);
/** Distance (m) across the nearest access ramp's centre line from (x, z), the quarry at (qx, qz). */
function quarryRampDistance(qx: number, qz: number, x: number, z: number) {
  const a = Math.atan2(z - qz, x - qx),
    r = Math.hypot(x - qx, z - qz);
  let best = Infinity;
  for (const a0 of QUARRY_RAMPS)
    if (Math.cos(a - a0) > 0) best = Math.min(best, Math.abs(Math.sin(a - a0)) * r);
  return best;
}
/** Offsets (m) tried round a wanted spot, nearest first: rings 12 m apart out to 72 m. */
const NEARBY: Array<[number, number]> = [[0, 0]];
for (let ring = 1; ring <= 6; ring++)
  for (let k = 0; k < ring * 6; k++) {
    const a = (k / (ring * 6)) * Math.PI * 2 + ring * 0.4;
    NEARBY.push([Math.cos(a) * ring * 12, Math.sin(a) * ring * 12]);
  }
const turnOfSalt = (salt: number) => (Math.floor(hash(salt, 7) * 4) % 4) as Placement["turn"];
type KitOpts = Parameters<ReturnType<typeof siteKit>["put"]>[4];

function quarryUpgrade(out: Placement[], ctx: Context) {
  const q = ctx.meta.pois.find((p) => p.id === "redstone-quarry");
  if (!q) return;
  const kit = siteKit(ctx, out);
  const { R, WALL, BENCHES } = QUARRY_PIT;
  const floorR = R * (1 - WALL);
  const at = (a: number, r: number) =>
    [q.x + Math.cos(a) * r * quarryWobble(a), q.z + Math.sin(a) * r * quarryWobble(a)] as const;
  /** Off the access ramps (12 m wide) and their shoulders: they are the ways out. */
  const clearOfRamps = (x: number, z: number, half: number) =>
    quarryRampDistance(q.x, q.z, x, z) > half + 12;
  const putXZ = (model: string, x: number, z: number, turn: Placement["turn"], o: KitOpts = {}) => {
    const [w, d] = footAt(model, turn);
    if (!clearOfRamps(x, z, Math.hypot(w, d) / 2)) return false;
    return kit.put(model, x, z, turn, { poi: q.id, rough: 2.5, gap: 2, ...o });
  };
  const put = (model: string, a: number, r: number, turn: Placement["turn"], o: KitOpts = {}) => {
    const [x, z] = at(a, r);
    return putXZ(model, x, z, turn, o);
  };
  /** An enterable building near (a, r): level, its doorsteps at the ground; the nearest fit. */
  const building = (
    model: string,
    a: number,
    r: number,
    turn: Placement["turn"],
    reach = NEARBY.length,
  ) => {
    const [x, z] = at(a, r);
    for (const [dx, dz] of NEARBY.slice(0, reach))
      if (putXZ(model, x + dx, z + dz, turn, { rough: 0.8, apron: 2, gap: 4 })) {
        reserveDoors(kit, out[out.length - 1]);
        return true;
      }
    return false;
  };
  const near = (
    model: string,
    a: number,
    r: number,
    turn: Placement["turn"],
    o: KitOpts = {},
    reach = 19,
  ) => {
    const [x, z] = at(a, r);
    for (const [dx, dz] of NEARBY.slice(0, reach))
      if (putXZ(model, x + dx, z + dz, turn, o)) return true;
    return false;
  };

  // The floor's districts, between the spoil heaps (build_world.py) round the processing hall
  // in the middle (quarry()).
  // The crushing line: screening halls by the hall, conveyors out to the stockpiles.
  building("factory-hall", 0.55, 120, 1);
  building("factory-hall", 2.6, 115, 0);
  for (let i = 0; i < 4; i++) {
    const a = 0.45 + i * 1.57;
    for (let k = 0; k < 3; k++)
      near("conveyor", a, 140 + k * 44, (i % 2) as Placement["turn"], { rough: 4, gap: 0.5 }, 7);
    for (let k = 0; k < 4; k++)
      near(
        "gravel-mound",
        a + (k - 1.5) * 0.07,
        285 + hash(9_900 + i, k) * 25,
        turnOfSalt(9_910 + i * 4 + k),
        {
          sink: 0.2,
          rough: 4,
        },
      );
  }
  // The site office compound (enterable): portable offices, garages, a quonset, a jersey fence.
  for (const [model, a, r, t] of [
    ["ind-office-trailer", 4.35, 200, 1],
    ["ind-office-trailer", 4.45, 200, 1],
    ["ind-office-trailer", 4.4, 225, 0],
    ["garage", 4.25, 240, 0],
    ["garage", 4.3, 240, 0],
    ["rural-quonset", 4.55, 235, 1],
    ["ind-generic-2", 4.5, 260, 0],
  ] as const)
    building(model, a, r, t as Placement["turn"]);
  for (let k = 0; k < 8; k++) near("jersey", 4.25 + k * 0.035, 180, 1, { gap: 0.3 }, 3);
  near("floodlight", 4.2, 190, 0);
  near("floodlight", 4.6, 215, 0);
  near("security-booth", 4.22, 178, 1, { gap: 1 }, 7);
  near("transformer-booth", 4.6, 250, 0, { rough: 1, gap: 2 });
  // The crushers at the conveyors' heads, ore carts by the sheds and the stockpiles.
  for (let i = 0; i < 4; i++)
    near("stone-crusher", 0.45 + i * 1.57 + 0.12, 112, (i % 2) as Placement["turn"], {
      rough: 1.5,
      gap: 3,
    });
  for (let k = 0; k < 12; k++)
    near(
      "mine-cart",
      hash(9_990 + k, 1) * Math.PI * 2,
      130 + hash(9_990 + k, 2) * 200,
      (k % 2) as Placement["turn"],
      { gap: 1.5, rough: 1 },
      7,
    );
  // The workshop and stores (enterable).
  building("ind-smith", 1.75, 230, 0);
  building("ind-warehouse-4", 1.95, 300, 1);
  building("ind-warehouse-3", 5.5, 180, 0);
  building("shed", 1.7, 260, 1);
  building("shed", 5.6, 215, 0);
  // Fuel depot: tanks inside a jersey ring, the bowser, drums.
  for (let k = 0; k < 3; k++) near("fuel-tank", 5.25 + k * 0.06, 300, 0, { gap: 1 });
  near("fuel-truck", 5.35, 330, 1);
  for (let k = 0; k < 5; k++)
    near("oil-drums", 5.2 + k * 0.045, 330 + (k % 2) * 6, turnOfSalt(9_930 + k));
  for (let k = 0; k < 10; k++) near("jersey", 5.15 + k * 0.035, 285, 0, { gap: 0.3 }, 3);
  // The truck park: haul trucks and excavators in rows (cover between them).
  for (let row = 0; row < 3; row++)
    for (let k = 0; k < 5; k++)
      near(
        row === 1 ? "excavator" : "dump-truck",
        0.65 + k * 0.06,
        300 + row * 20,
        row === 1 ? 1 : 0,
        { gap: 1.5 },
        4,
      );
  // Container yard: rows with gaps to run through, some stacked two high.
  for (let row = 0; row < 4; row++)
    for (let k = 0; k < 7; k++) {
      if (hash(9_950 + row, k) < 0.2) continue;
      const model =
        hash(9_960 + row, k) < 0.35 ? "rust-container" : k % 3 ? "container-40" : "container-20";
      const before = out.length;
      if (
        near(model, 3.3 + k * 0.045, 250 + row * 15, 0, { gap: 1.5 }, 2) &&
        hash(9_970 + row, k) < 0.3
      ) {
        const base = out[before]!;
        // (Two high: a 40 ft box on a 40 ft box, 4.2 m as modelled.)
        if (base.model === "container-40") out.push({ ...base, y: +(base.y + 4.2).toFixed(2) });
      }
    }
  // Floodlight masts round the floor's edge; machines and cover scattered over it.
  for (let k = 0; k < 18; k++)
    near("floodlight", (k / 18) * Math.PI * 2 + 0.1, floorR - 25, turnOfSalt(9_980 + k));
  const cover: Array<[string, number]> = [
    ["rock-cluster", 40],
    ["rock-big-1", 14],
    ["rock-big-2", 14],
    ["cable-reel", 10],
    ["con-pipe-long", 12],
    ["pipe-stack", 8],
    ["cement-pallet", 10],
    ["tires", 8],
    ["scrap-pile", 8],
    ["excavator", 3],
    ["dump-truck", 4],
  ];
  let salt = 10_000;
  for (const [model, count] of cover)
    for (let placed = 0, tries = 0; placed < count && tries < count * 15; tries++) {
      salt++;
      const a = hash(salt, 1) * Math.PI * 2,
        r = 90 + Math.sqrt(hash(salt, 2)) * (floorR - 120);
      if (put(model, a, r, turnOfSalt(salt), { gap: 3, rough: 3 })) placed++;
    }

  // The rest of the floor in lots ~55 m apart, each a cluster to fight from: machines at
  // work, container stacks, stockpiles, pipe lay-downs, boulders, a hut with its drums.
  for (let gx = -floorR; gx <= floorR; gx += 55)
    for (let gz = -floorR; gz <= floorR; gz += 55) {
      salt++;
      const jx = gx + (hash(salt, 1) - 0.5) * 24,
        jz = gz + (hash(salt, 2) - 0.5) * 24;
      const rr = Math.hypot(jx, jz);
      if (rr < 110 || rr > floorR - 40) continue;
      const x = q.x + jx,
        z = q.z + jz;
      const t = turnOfSalt(salt),
        o = { gap: 2.5, rough: 3 };
      const kind = Math.floor(hash(salt, 3) * 6);
      if (kind === 0) {
        putXZ("excavator", x, z, t, o);
        putXZ("dump-truck", x + 9, z + 4, t, o);
        putXZ("rock-cluster", x - 7, z + 6, turnOfSalt(salt + 1), o);
      } else if (kind === 1) {
        for (let k = 0; k < 3; k++) {
          const before = out.length;
          const m = hash(salt, 10 + k) < 0.4 ? "rust-container" : "container-40";
          if (
            putXZ(m, x, z + k * 7.5, 0, { ...o, gap: 1.5 }) &&
            m === "container-40" &&
            k === 1 &&
            hash(salt, 9) < 0.5
          )
            out.push({ ...out[before]!, y: +(out[before]!.y + 4.2).toFixed(2) });
        }
      } else if (kind === 2) {
        putXZ("gravel-mound", x, z, t, { ...o, sink: 0.2, rough: 4 });
        putXZ("gravel-mound", x + 10, z - 5, turnOfSalt(salt + 2), { ...o, sink: 0.2, rough: 4 });
        putXZ("cable-reel", x - 8, z + 6, t, o);
      } else if (kind === 3) {
        for (let k = 0; k < 3; k++) putXZ("con-pipe-long", x + k * 3, z, 0, { ...o, gap: 0.5 });
        putXZ("pipe-stack", x + 2, z + 8, 1, o);
        putXZ("cement-pallet", x - 5, z + 6, 0, o);
      } else if (kind === 4) {
        putXZ("rock-big-2", x, z, t, { ...o, rough: 4 });
        putXZ("rock-cluster", x + 9, z + 3, turnOfSalt(salt + 3), o);
        putXZ("rock-big-1", x - 6, z - 8, turnOfSalt(salt + 4), { ...o, rough: 4 });
      } else {
        if (putXZ("shed", x, z, t, { rough: 0.8, apron: 2, gap: 4 })) {
          reserveDoors(kit, out[out.length - 1]);
          putXZ("oil-drums", x + 6, z + 2, t, o);
          putXZ("floodlight", x - 6, z - 4, t, o);
        } else putXZ("scrap-pile", x, z, t, o);
      }
    }

  // The benches: something to fight from every ~60 m round each one (rock outcrops, abandoned
  // machines, a container, sandbag nests at the edge), and a hut now and then.
  for (let k = 0; k < BENCHES; k++) {
    const r = R * (1 - (WALL * (k + 0.62)) / BENCHES); // the middle of bench k's tread
    const n = Math.round((2 * Math.PI * r) / 60);
    for (let i = 0; i < n; i++) {
      salt++;
      const a = ((i + hash(salt, 1) * 0.5) / n) * Math.PI * 2;
      const roll = hash(salt, 2);
      const model =
        roll < 0.3
          ? "rock-cluster"
          : roll < 0.42
            ? "rock-big-1"
            : roll < 0.52
              ? "rock-big-2"
              : roll < 0.64
                ? "sandbags"
                : roll < 0.72
                  ? "excavator"
                  : roll < 0.8
                    ? "dump-truck"
                    : roll < 0.87
                      ? "rust-container"
                      : roll < 0.93
                        ? "shed"
                        : "cable-reel";
      if (model === "shed") building("shed", a, r, turnOfSalt(salt), 7);
      else
        near(model, a, r + (hash(salt, 3) - 0.5) * 16, turnOfSalt(salt), { gap: 3, rough: 3 }, 7);
    }
  }
  // The access ramps: a checkpoint where each leaves the rim (a booth, barriers, a floodlight)
  // and a watchtower over the pit beside it.
  QUARRY_RAMPS.forEach((a0, k) => {
    const [x, z] = at(a0, R + 24);
    const [nx, nz] = [-Math.sin(a0), Math.cos(a0)];
    const o = { poi: q.id, rough: 2.5, gap: 1 };
    for (const s of [1, -1]) {
      for (let j = 0; j < NEARBY.length && j < 7; j++)
        if (
          kit.put(
            s > 0 ? "checkpoint" : k % 2 ? "watchtower" : "guard-tower",
            x + nx * s * 18 + NEARBY[j]![0] / 3,
            z + nz * s * 18 + NEARBY[j]![1] / 3,
            turnOfSalt(10_500 + k),
            o,
          )
        )
          break;
      for (let j = 0; j < 3; j++)
        kit.put("jersey", x + nx * s * (11 + j * 2.4), z + nz * s * (11 + j * 2.4), 0, {
          ...o,
          gap: 0.2,
        });
      kit.put(
        "floodlight",
        x + nx * s * 26 + Math.cos(a0) * 8,
        z + nz * s * 26 + Math.sin(a0) * 8,
        0,
        { ...o, rough: 3 },
      );
    }
  });
}

/** The Old Dam: the powerhouse below its wall, the switchyard and keepers' houses on the bench above. */
function damUpgrade(out: Placement[], ctx: Context) {
  const { meta } = ctx;
  const dam = meta.bridges.find((b) => b.id === "old-dam");
  if (!dam) return;
  const kit = siteKit(ctx, out);
  const [ax, az] = dam.a,
    [bx, bz] = dam.b;
  const len = Math.hypot(bx - ax, bz - az);
  const ux = (bx - ax) / len,
    uz = (bz - az) / len;
  const mx = (ax + bx) / 2,
    mz = (az + bz) / 2;
  // The reservoir: the highest lake by the wall (as build_world.py). `d` > 0 is downstream.
  const res = meta.waterBodies
    .filter(
      (w) =>
        w.bounds[0] - 400 < mx &&
        mx < w.bounds[2] + 400 &&
        w.bounds[1] - 400 < mz &&
        mz < w.bounds[3] + 400,
    )
    .sort((p, r) => r.level - p.level)[0];
  if (!res) return;
  let nx = -uz,
    nz = ux;
  const rcx = (res.bounds[0] + res.bounds[2]) / 2 - ax,
    rcz = (res.bounds[1] + res.bounds[3]) / 2 - az;
  if (rcx * nx + rcz * nz > 0) [nx, nz] = [-nx, -nz];
  const P = (t: number, d: number) => [ax + ux * t + nx * d, az + uz * t + nz * d] as const;
  const turnAlong = (Math.abs(ux) > Math.abs(uz) ? 1 : 0) as Placement["turn"];
  const turnAcross = (turnAlong ? 0 : 1) as Placement["turn"];
  // (The reservoir's bench stands 0.3 m above its water: build_world.py.)
  const base = { poi: "countryside", rough: 1.2, gap: 2, shore: 0.2 };
  /** The first fit near (t, d); `wall`: keep the footprint this far below the wall's axis. */
  const near = (
    model: string,
    t: number,
    d: number,
    turn: Placement["turn"],
    o: KitOpts = {},
    reach = 19,
    wall = 0,
  ) => {
    const [x0, z0] = P(t, d);
    const [w, dd] = footAt(model, turn);
    for (const [dx, dz] of NEARBY.slice(0, reach)) {
      const x = x0 + dx,
        z = z0 + dz;
      const across = (x - ax) * nx + (z - az) * nz;
      if (wall && across - Math.abs(turn === turnAlong ? dd : w) / 2 < wall) continue;
      if (kit.put(model, x, z, turn, { ...base, ...(wall ? { bridges: false } : {}), ...o }))
        return true;
    }
    return false;
  };
  const building = (model: string, t: number, d: number, turn: Placement["turn"], wall = 0) => {
    const ok = near(model, t, d, turn, { rough: 0.8, apron: 2, gap: 4 }, NEARBY.length, wall);
    if (ok) reserveDoors(kit, out[out.length - 1]);
    return ok;
  };
  const mid = len / 2;
  // Below the wall (build_world.py: a level yard 12-50 m out, between the wall and the lower
  // lake): the powerhouse along its foot, the turbine hall and transformer house beside it.
  // (The wall is 16 m thick: the yard begins 4 m clear of its face.)
  // (The yard is ~35 m deep: the long halls lie along the wall.)
  building("warehouse", mid, 22, turnAlong, 12);
  building("factory-hall", mid + 75, 22, turnAlong, 12);
  building("factory-hall", mid - 70, 22, turnAlong, 12);
  building("ind-substation", mid - 115, 22, turnAlong, 12);
  building("ind-office-trailer", mid + 120, 24, turnAlong, 12);
  // Penstocks: pipes from the wall's face to the powerhouse.
  for (const dt of [-18, 0, 18])
    near("con-pipe-long", mid + dt, 13, turnAcross, { gap: 0, rough: 3 }, 1, 9);
  for (const dt of [-120, -45, 45, 120]) near("floodlight", mid + dt, 16, turnAlong, {}, 7, 12);
  for (const [m, dt] of [
    ["box-truck", 55],
    ["car-pickup", 125],
    ["cable-reel", -55],
    ["oil-drums", -90],
    ["pipe-stack", 110],
  ] as const)
    near(m, mid + dt, 40, turnAcross, { gap: 1.5, rough: 2 }, 7, 12);
  // Above it, on the reservoir's bench: the switchyard (transformers in rows, kiosks, pylons
  // carrying the lines away), the keepers' houses, the boathouse, gatehouses at both ends.
  // (Clear of the lakeside road, which crosses the bench east of the middle.)
  const yard = 230;
  for (let i = 0; i < 5; i++)
    for (let j = 0; j < 3; j++)
      near("transformer", yard + i * 10, -35 - j * 8, turnAlong, { gap: 0.5 }, 1);
  for (let k = 0; k < 3; k++)
    near("transformer-kiosk", yard - 10 + k * 18, -62, turnAlong, { gap: 1 }, 3);
  for (let k = 0; k < 14; k++) near("jersey", yard - 20 + k * 6, -22, turnAlong, { gap: 0.3 }, 1);
  near("pylon", yard - 30, -85, turnAlong, { rough: 3 });
  near("pylon", yard + 100, -90, turnAlong, { rough: 3 });
  near("transformer-booth", yard + 35, -72, turnAlong, { rough: 1, gap: 2 });
  near("transformer-booth", yard - 25, -50, turnAcross, { rough: 1, gap: 2 });
  // The treatment works: settling basins on the bench, by the reservoir it draws on.
  near("treatment-plant", 470, -80, turnAlong, { rough: 1.5, gap: 3 }, NEARBY.length);
  // Chemical tanks by the powerhouse (below the wall).
  near("chemical-tank", mid + 40, 40, turnAlong, { rough: 1.5 }, 7, 12);
  near("chemical-tank", mid + 48, 40, turnAlong, { rough: 1.5 }, 7, 12);
  near("ind-substation", yard + 70, -40, turnAlong, { rough: 0.8, apron: 2, gap: 4 });
  for (const [m, t, d, turn] of [
    ["rural-house", 660, -62, turnAcross],
    ["house", 708, -66, turnAcross],
    ["garage", 684, -44, turnAcross],
    ["shed", 632, -78, turnAlong],
    ["control-post", 165, -40, turnAlong],
    ["control-post", len - 60, -55, turnAlong],
  ] as const)
    building(m, t, d, turn);
  for (const [t, s] of [
    [95, 1],
    [len - 70, -1],
  ] as const) {
    near("checkpoint", t, -16, turnAlong, { rough: 2 }, 7);
    near("security-booth", t - s * 14, -26, turnAlong, { rough: 1.5, gap: 1 }, 7);
    near("road-barrier", t + s * 8, -14, turnAcross, { rough: 2, gap: 0.5 }, 3);
    near("floodlight", t - s * 10, -20, turnAlong, { rough: 3 }, 7);
  }
  for (let k = 0; k < 4; k++)
    near(k % 2 ? "car-pickup" : "car-sedan", mid - 30 + k * 7, -30, turnAcross, { gap: 1 }, 3);
  // The boathouse at the bench's edge, its dock out on the water.
  for (const t of [mid - 20, mid + 60, mid - 200, mid + 250]) {
    let edge = -60;
    for (; edge > -200; edge -= 4) {
      const [x, z] = P(t, edge);
      if (ctx.heightAt(x, z) < res.level) break;
    }
    if (edge <= -200) continue;
    if (!near("river-shack", t, edge + 12, turnAlong, { rough: 0.8, apron: 1, gap: 3 }, 7))
      continue;
    const [x, z] = P(t, edge - 6);
    // (Its deck 0.8 m above the water, as at the summer camp.)
    kit.put("camp-dock", x, z, turnAcross, {
      ...base,
      poi: "shore",
      y: +(res.level + 0.8 - 4.28).toFixed(2),
      roads: false,
      gap: 1,
    });
    break;
  }
  // Cover over the bench.
  let salt = 11_000;
  for (const [model, count] of [
    ["rock-cluster", 12],
    ["cable-reel", 6],
    ["pipe-stack", 6],
    ["oil-drums", 6],
    ["container-20", 4],
    ["sandbags", 6],
  ] as const)
    for (let placed = 0, tries = 0; placed < count && tries < count * 15; tries++) {
      salt++;
      const t = 120 + hash(salt, 1) * (len - 240),
        d = -20 - hash(salt, 2) * 80;
      if (near(model, t, d, turnOfSalt(salt), { gap: 3, rough: 2 }, 1)) placed++;
    }
}

/** East Works and its island east of the Riverwood channel. */
function eastWorksUpgrade(out: Placement[], ctx: Context) {
  const { meta } = ctx;
  const poi = meta.pois.find((p) => p.id === "east-works");
  if (!poi) return;
  const kit = siteKit(ctx, out);
  const opts = { poi: poi.id, rough: 1.2, gap: 3 };
  const near = (
    model: string,
    dx: number,
    dz: number,
    turn: Placement["turn"],
    o: KitOpts = {},
    reach = 19,
  ) => {
    for (const [ox, oz] of NEARBY.slice(0, reach))
      if (kit.put(model, poi.x + dx + ox, poi.z + dz + oz, turn, { ...opts, ...o })) return true;
    return false;
  };
  const building = (model: string, dx: number, dz: number, turn: Placement["turn"]) => {
    // (The approaches level too: a route into the long hall starts 4 m outside its wall.)
    const ok = near(model, dx, dz, turn, { rough: 0.8, apron: 5, gap: 5 }, NEARBY.length);
    if (ok) reserveDoors(kit, out[out.length - 1]);
    return ok;
  };
  // The works' second ring (the pad is 600 m across now, level to 255 m out): the factory and
  // its stacks to the east, a warehouse street to the south, the tank farm to the west, a rail
  // loading yard to the north.
  building("ind-factory", 195, 20, 0);
  near("smoke-stacks", 175, -55, 0, { rough: 2 });
  building("ind-building-10", 140, 130, 1);
  for (const [m, dx, dz, t] of [
    ["ind-warehouse-4", -40, 165, 0],
    ["ind-warehouse-4", 35, 185, 0],
    ["warehouse", -125, 160, 1],
    ["factory-hall", 75, 215, 0],
    ["ind-smith", -15, 220, 0],
    ["ind-warehouse-5", -195, 110, 0],
    ["ind-warehouse-3", -205, -150, 0],
    ["ind-loadbay", -30, -190, 1],
    ["ind-office-trailer", 120, -170, 1],
    ["garage", 135, -175, 0],
  ] as const)
    building(m, dx, dz, t);
  for (const [dx, dz] of [
    [-190, -40],
    [-215, 10],
    [-190, 55],
  ] as const)
    near("ind-tank-2", dx, dz, 0, { rough: 1, gap: 2 });
  for (let k = 0; k < 4; k++) near("fuel-tank", -235 + k * 11, -95, 0, { gap: 1 }, 7);
  building("ind-substation", -150, -125, 0);
  near("transformer-booth", -125, -140, 0, { rough: 1, gap: 2 });
  for (let k = 0; k < 4; k++)
    near("chemical-tank", -160 + k * 5, -90, 0, { gap: 1, rough: 1.5 }, 7);
  near("security-booth", -20, -255, 0, { gap: 1 }, 19);
  for (let k = 0; k < 4; k++) near("mine-cart", -70 + k * 3, -150, 0, { gap: 0.5 }, 7);
  // The loading yard: a gantry over container rows, a tower crane.
  near("gantry-crane", 50, -150, 0, { rough: 2 });
  for (let row = 0; row < 3; row++)
    for (let k = 0; k < 6; k++)
      if (hash(12_000 + row, k) > 0.25)
        near(
          hash(12_010 + row, k) < 0.4 ? "rust-container" : "container-40",
          30 + row * 14,
          -200 + k * 9,
          1,
          { gap: 1 },
          1,
        );
  // The rest of the pad in lots ~65 m apart: a workshop or store (enterable) with its yard,
  // or an open yard (containers, a lorry at the dock, pallets).
  let salt = 12_100;
  const shops = [
    "ind-warehouse-1",
    "ind-warehouse-3",
    "ind-smith",
    "factory-hall",
    "rural-quonset",
    "garage",
    "ind-office-trailer",
    "ind-building-1",
  ] as const;
  for (let gx = -250; gx <= 250; gx += 65)
    for (let gz = -250; gz <= 250; gz += 65) {
      salt++;
      const jx = gx + (hash(salt, 1) - 0.5) * 20,
        jz = gz + (hash(salt, 2) - 0.5) * 20;
      if (Math.hypot(jx, jz) < 90 || Math.hypot(jx, jz) > 245) continue;
      const t = (turnOfSalt(salt) % 2) as Placement["turn"];
      if (hash(salt, 3) < 0.6) {
        const m = shops[Math.floor(hash(salt, 4) * shops.length)]!;
        if (!near(m, jx, jz, t, { rough: 0.8, apron: 2, gap: 5 }, 7)) continue;
        reserveDoors(kit, out[out.length - 1]);
        const [w, d] = footAt(m, t);
        near("pallets", jx + w / 2 + 4, jz, 0, { gap: 1 }, 3);
        near("oil-drums", jx - w / 2 - 4, jz + 3, 0, { gap: 1 }, 3);
        near(
          hash(salt, 5) < 0.5 ? "box-truck" : "car-pickup",
          jx,
          jz + d / 2 + 7,
          ((t + 1) % 2) as Placement["turn"],
          { gap: 1 },
          3,
        );
      } else {
        for (let k = 0; k < 4; k++)
          near(
            hash(salt, 10 + k) < 0.4 ? "rust-container" : "container-40",
            jx,
            jz + k * 7,
            0,
            { gap: 1.5 },
            1,
          );
        near("semi-cab", jx + 16, jz, 1, { gap: 1 }, 3);
        near("reefer-trailer", jx + 16, jz + 12, 0, { gap: 1 }, 3);
        near("forklift", jx - 10, jz + 4, 0, { gap: 1 }, 3);
      }
    }
  // Yard dressing: trucks, forklifts, pallets, floodlights.
  for (const [model, count] of [
    ["semi-cab", 3],
    ["reefer-trailer", 3],
    ["box-truck", 3],
    ["forklift", 6],
    ["pallets", 12],
    ["cable-reel", 6],
    ["floodlight", 10],
    ["oil-drums", 8],
    ["jersey", 14],
    ["pipe-stack", 6],
  ] as const)
    for (let placed = 0, tries = 0; placed < count && tries < count * 20; tries++) {
      salt++;
      const a = hash(salt, 1) * Math.PI * 2,
        d = 40 + Math.sqrt(hash(salt, 2)) * 210;
      if (near(model, Math.cos(a) * d, Math.sin(a) * d, turnOfSalt(salt), { gap: 2 }, 1)) placed++;
    }

  // The island round the works: a coastal battery on the east coast (bunkers, sandbag nests and
  // towers behind hesco walls) and a radar station on its highest ground.
  const land = (x: number, z: number) => ctx.heightAt(x, z) > 3;
  let k = 0;
  for (let z = poi.z - 900; z < poi.z + 900; z += 150) {
    // The coast: east from the works until the sea, then back to the first flat ground.
    let x = poi.x + 300;
    while (x < poi.x + 2000 && land(x, z)) x += 6;
    if (x >= poi.x + 2000 || x < poi.x + 320) continue;
    const kind = k++ % 3;
    const model = kind === 0 ? "coastal-bunker" : kind === 1 ? "sandbags" : "guard-tower";
    for (let back = 40; back < 220; back += 10) {
      const bx = x - back;
      // (The bunker is a scan with its own dune round it: it stands in the slope.)
      if (
        !kit.put(model, bx, z, 1, {
          poi: "countryside",
          rough: model === "coastal-bunker" ? 4 : 2.5,
          gap: 2,
        })
      )
        continue;
      for (let j = -2; j <= 2; j++)
        kit.put("hesco", bx + 6, z + j * 1.4, 0, { poi: "countryside", rough: 3, gap: 0 });
      if (kind === 1)
        kit.put("military-crate", bx - 4, z + 3, 0, { poi: "countryside", rough: 2.5, gap: 0.5 });
      break;
    }
  }
  // A fishing harbour on the island's shore nearest the works: the old pier and the wharf out
  // over the water (decks 1.2 m above the sea), the fish shacks and the diner behind.
  const DECK = { "old-pier": 6.6, wharf: 3.0 } as const;
  harbour: for (const [dx, dz] of [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ] as const)
    for (const off of [0, 120, -120, 240, -240, 360, -360]) {
      const [px, pz] = [-dz, dx];
      let x = poi.x + px * off,
        z = poi.z + pz * off,
        step = 0;
      while (step < 1200 && ctx.heightAt(x, z) > 0.3) {
        x += dx * 4;
        z += dz * 4;
        step += 4;
      }
      if (step < 320 || step >= 1200) continue;
      // Deep water ahead, low land behind, for both decks side by side.
      const ok = (o: number) =>
        ctx.heightAt(x + px * o + dx * 34, z + pz * o + dz * 34) < -2 &&
        ctx.heightAt(x + px * o + dx * 18, z + pz * o + dz * 18) < -1 &&
        ctx.heightAt(x + px * o - dx * 20, z + pz * o - dz * 20) > 0.6 &&
        ctx.heightAt(x + px * o - dx * 20, z + pz * o - dz * 20) < 4;
      if (!ok(0) || !ok(30) || !ok(-25)) continue;
      const turn = (dx !== 0 ? 1 : 0) as Placement["turn"];
      // The deck level with the ground at its landward end (1 m in), so it is walked onto, never
      // climbed (the wharf's shed stood 0.9 m above the beach: no way in), at least 0.9 m up.
      const LONG = { "old-pier": 40, wharf: 30 } as const;
      const at = (model: "old-pier" | "wharf", o: number, ahead: number) => {
        const back = ahead - LONG[model] / 2 + 1;
        const land = ctx.heightAt(x + px * o + dx * back, z + pz * o + dz * back);
        const deck = Math.max(0.9, Math.min(2.5, land));
        return kit.put(model, x + px * o + dx * ahead, z + pz * o + dz * ahead, turn, {
          poi: "shore",
          y: +(deck - DECK[model]).toFixed(2),
          roads: false,
          gap: 1,
        });
      };
      if (!at("old-pier", 0, 17)) continue;
      at("wharf", 32, 10);
      for (const [m, o] of [
        ["river-shack", -14],
        ["river-shack", -6],
        ["shed", 12],
        ["rural-diner", 36],
      ] as const)
        for (let back = 20; back < 70; back += 6)
          if (
            kit.put(
              m,
              x + px * o - dx * back,
              z + pz * o - dz * back,
              ((turn + (dz > 0 || dx > 0 ? 2 : 0)) & 3) as Placement["turn"],
              {
                poi: "countryside",
                rough: 0.8,
                apron: 1.5,
                gap: 2,
              },
            )
          )
            break;
      for (const o of [-8, 8, 24])
        kit.put("motorboat", x + px * o + dx * 30, z + pz * o + dz * 30, turn, {
          poi: "shore",
          y: -0.2,
          roads: false,
          gap: 1,
        });
      break harbour;
    }
  let best: [number, number, number] | null = null;
  for (let x = poi.x - 900; x < poi.x + 1200; x += 25)
    for (let z = poi.z - 900; z < poi.z + 900; z += 25) {
      if (Math.hypot(x - poi.x, z - poi.z) < 400) continue;
      const h = ctx.heightAt(x, z);
      if (!best || h > best[2]) best = [x, z, h];
    }
  if (best) {
    const [x, z] = best;
    const o = { poi: "countryside", rough: 3, gap: 2 };
    const at = (
      model: string,
      dx: number,
      dz: number,
      turn: Placement["turn"],
      more: KitOpts = {},
    ) => {
      for (const [ox, oz] of NEARBY.slice(0, 19))
        if (kit.put(model, x + dx + ox, z + dz + oz, turn, { ...o, ...more })) return true;
      return false;
    };
    at("radio-tower", 0, 0, 0);
    at("radar-truck", 22, 6, 1);
    at("sat-dish", -20, 10, 0);
    at("command-post", 5, -32, 0, { rough: 0.8, apron: 2, gap: 4 });
    for (let j = 0; j < 6; j++) {
      const a = (j / 6) * Math.PI * 2;
      at("sandbags", Math.cos(a) * 45, Math.sin(a) * 45, (j % 2) as Placement["turn"], {
        rough: 2.5,
      });
    }
  }
}

function locationPolish(out: Placement[], ctx: Context) {
  const { meta } = ctx;
  const poi = (id: string) => meta.pois.find((p) => p.id === id);
  const turnOf = (salt: number) => (Math.floor(hash(salt, 7) * 4) % 4) as Placement["turn"];
  const quarry = poi("redstone-quarry");
  if (quarry) {
    const kit = siteKit(ctx, out);
    const R = 850, // the pit's radius (build_world.py q_rad) and its walls' share of it
      WALL = 0.55,
      BENCHES = 6;
    const wobble = (a: number) =>
      1 +
      0.1 * Math.sin(2 * a + 1.1) +
      0.06 * Math.sin(3 * a + 2.3) +
      0.035 * Math.sin(5 * a + 0.4);
    const at = (a: number, r: number) =>
      [quarry.x + Math.cos(a) * r * wobble(a), quarry.z + Math.sin(a) * r * wobble(a)] as const;
    const opts = { poi: quarry.id, roads: false, rough: 3, gap: 2 };
    // Rock faces at the toe of each bench wall, every ~70 m round it, sunk 2 m (on the haul
    // roads there is no wall: the ground above is not 12 m higher, so none stands there).
    for (let k = 1; k < BENCHES; k++) {
      const r = R * (1 - (WALL * (k + 0.2)) / BENCHES);
      const n = Math.round((2 * Math.PI * r) / 70);
      for (let i = 0; i < n; i++) {
        const a = ((i + hash(9_100 + k, i) * 0.4) / n) * Math.PI * 2;
        const [x, z] = at(a, r),
          [ux, uz] = at(a, r + 28);
        // (Not on the scree, about 13 m over those 28 m, nor by the access ramps: those are the
        // ways out of the pit, quarryUpgrade.)
        if (ctx.heightAt(ux, uz) - ctx.heightAt(x, z) < 18) continue;
        if (quarryRampDistance(quarry.x, quarry.z, x, z) < 22) continue;
        // "relief": rock sunk into the slope it stands against (br-static-world allows it).
        kit.put("quarry-face", x, z, turnOf(9_200 + k * 97 + i), {
          ...opts,
          poi: "relief",
          sink: 2,
          rough: 6,
        });
      }
    }
    // The floor: conveyors fanning out from the processing hall, machines and spoil.
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.4;
      kit.put(
        "conveyor",
        quarry.x + Math.cos(a) * 90,
        quarry.z + Math.sin(a) * 90,
        i % 2 ? 1 : 0,
        opts,
      );
    }
    const floorKit: Array<[string, number]> = [
      ["excavator", 6],
      ["dump-truck", 7],
      ["gravel-mound", 10],
      ["rock-cluster", 18],
      ["rock-big-2", 8],
      ["container-40", 4],
      ["con-pipe-long", 4],
      ["cable-reel", 4],
      ["oil-drums", 4],
    ];
    let salt = 9_300;
    for (const [model, count] of floorKit)
      for (let placed = 0, tries = 0; placed < count && tries < count * 12; tries++) {
        salt++;
        const a = hash(salt, 1) * Math.PI * 2,
          r = 60 + hash(salt, 2) * (R * (1 - WALL) - 80);
        const [x, z] = at(a, r);
        if (quarryRampDistance(quarry.x, quarry.z, x, z) < 20) continue;
        if (
          kit.put(model, x, z, turnOf(salt), { ...opts, sink: model === "gravel-mound" ? 0.2 : 0 })
        )
          placed++;
      }
    // Machines on the benches (where the faces are worked) and trucks on the haul roads.
    for (let k = 1; k < BENCHES; k++)
      for (let i = 0; i < 2; i++) {
        salt++;
        const a = hash(salt, 3) * Math.PI * 2;
        const r = R * (1 - (WALL * (k + 0.55)) / BENCHES);
        const [x, z] = at(a, r);
        if (quarryRampDistance(quarry.x, quarry.z, x, z) < 20) continue;
        kit.put(i ? "dump-truck" : "excavator", x, z, turnOf(salt), opts);
      }
  }
  const peaks = poi("iron-peaks");
  if (peaks) {
    const kit = siteKit(ctx, out);
    let placed = 0;
    // (Up to 470 m and 40 faces since the massif grew, 2026-11-11.)
    for (let k = 0; k < 600 && placed < 40; k++) {
      const a = hash(9_500 + k, 1) * Math.PI * 2,
        d = 120 + hash(9_500 + k, 2) * 1300;
      const x = peaks.x + Math.cos(a) * d,
        z = peaks.z + Math.sin(a) * d;
      const h = ctx.heightAt(x, z);
      if (h < 170 || h > 470) continue;
      if (
        kit.put("quarry-face", x, z, turnOf(9_500 + k), {
          poi: "relief",
          sink: 3,
          rough: 9,
          gap: 6,
        })
      )
        placed++;
    }
    // Layered cliffs on the high faces and scree boulders on the slopes below (the owner's
    // 2026-11-11 downloads: a scanned sea cliff, a boulder and a granite rock).
    for (let k = 0, cliffs = 0; k < 900 && cliffs < 16; k++) {
      const a = hash(9_550 + k, 1) * Math.PI * 2,
        d = 150 + hash(9_550 + k, 2) * 1300;
      const x = peaks.x + Math.cos(a) * d,
        z = peaks.z + Math.sin(a) * d;
      const h = ctx.heightAt(x, z);
      if (h < 240 || h > 540) continue;
      if (
        kit.put("sea-cliff", x, z, turnOf(9_550 + k), {
          poi: "relief",
          sink: 4,
          rough: 9,
          gap: 12,
        })
      )
        cliffs++;
    }
    for (let k = 0, rocks = 0; k < 1_200 && rocks < 60; k++) {
      const a = hash(9_600 + k, 1) * Math.PI * 2,
        d = 100 + hash(9_600 + k, 2) * 1400;
      const x = peaks.x + Math.cos(a) * d,
        z = peaks.z + Math.sin(a) * d;
      const h = ctx.heightAt(x, z);
      if (h < 110 || h > 480) continue;
      const model = k % 3 ? "rock-scan-15" : "big-boulder";
      if (kit.put(model, x, z, turnOf(9_600 + k), { poi: "relief", sink: 0.5, rough: 3, gap: 5 }))
        rocks++;
    }
    for (let k = 0, mines = 0; k < 300 && mines < 2; k++) {
      const a = hash(9_700 + k, 1) * Math.PI * 2,
        d = 300 + hash(9_700 + k, 2) * 900;
      const x = peaks.x + Math.cos(a) * d,
        z = peaks.z + Math.sin(a) * d;
      const h = ctx.heightAt(x, z);
      if (h < 120 || h > 200) continue;
      if (
        kit.put("mine-entrance", x, z, turnOf(9_700 + k), {
          poi: "relief",
          sink: 4,
          rough: 10,
          gap: 8,
        })
      )
        mines++;
    }
    for (let k = 0, huts = 0; k < 2_000 && huts < 2; k++) {
      const a = hash(9_800 + k, 1) * Math.PI * 2,
        d = 150 + hash(9_800 + k, 2) * 700;
      const x = peaks.x + Math.cos(a) * d,
        z = peaks.z + Math.sin(a) * d;
      if (ctx.heightAt(x, z) < 110) continue;
      if (
        kit.put("old-hut", x, z, turnOf(9_800 + k), {
          poi: peaks.id,
          rough: 0.6,
          gap: 4,
          top: true,
          sink: 0.06,
          apron: 1.5,
        })
      )
        huts++;
    }
  }
  const ridge = poi("pine-ridge");
  if (ridge) {
    // Pine Ridge's rock band over the creek (build_world.py MORE_RELIEF, 2026-11-11): cliffs
    // and boulders along the ridge's steep south side, as the concept draws grey rock there.
    const rocks = siteKit(ctx, out);
    for (const [bx, bz] of [
      [-1551, -2542],
      [-703, -2542],
      [-1150, -2620],
    ] as const) {
      for (let k = 0, n = 0; k < 400 && n < 6; k++) {
        const a = hash(9_850 + k, Math.round(bx)) * Math.PI * 2,
          d = 60 + hash(9_851 + k, Math.round(bx)) * 380;
        const x = bx + Math.cos(a) * d,
          z = bz + Math.sin(a) * d;
        const s0 = ctx.heightAt(x - 12, z),
          s1 = ctx.heightAt(x + 12, z),
          s2 = ctx.heightAt(x, z - 12),
          s3 = ctx.heightAt(x, z + 12);
        // On the slopes (over 4 m across 24 m), not on the crest or the creek's flats.
        if (Math.max(s0, s1, s2, s3) - Math.min(s0, s1, s2, s3) < 4) continue;
        if (
          rocks.put("sea-cliff", x, z, turnOf(9_850 + k), {
            poi: "relief",
            sink: 4,
            rough: 9,
            gap: 10,
          })
        )
          n++;
      }
      for (let k = 0, n = 0; k < 400 && n < 8; k++) {
        const a = hash(9_870 + k, Math.round(bx)) * Math.PI * 2,
          d = 40 + hash(9_871 + k, Math.round(bx)) * 420;
        const x = bx + Math.cos(a) * d,
          z = bz + Math.sin(a) * d;
        const model = k % 2 ? "big-boulder" : "rock-scan-15";
        if (
          rocks.put(model, x, z, turnOf(9_870 + k), { poi: "relief", sink: 0.5, rough: 3, gap: 5 })
        )
          n++;
      }
    }
    const kit = siteKit(ctx, out);
    const opts = { poi: ridge.id, gap: 2.5 };
    // The lumber yard: a 40 × 30 m level plot, its log stacks and piles inside a board fence
    // with a gate gap and broken boards (ways in), near the hamlet's middle.
    const yard = kit.search(ridge.x, ridge.z, 260, 9_900, (x, z) =>
      openPlot(ctx, kit, x, z, 46, 36, 1.4),
    );
    if (yard) {
      const [cx, cz] = yard;
      const y = Math.min(
        ...[-20, 0, 20].flatMap((dx) => [-15, 0, 15].map((dz) => ctx.heightAt(cx + dx, cz + dz))),
      );
      for (let i = 0; i < 15; i++) {
        const x = cx - 19.04 + i * 2.72;
        for (const [z, side] of [
          [cz - 15, 0],
          [cz + 15, 1],
        ] as const) {
          if (side === 1 && (i === 7 || i === 8)) continue; // the gate
          const model = hash(9_950 + side, i) < 0.15 ? "privacy-fence-broken" : "privacy-fence";
          kit.put(model, x + 1.36, z, 0, { ...opts, gap: 0, y, rough: 9 });
        }
      }
      for (let i = 0; i < 11; i++)
        for (const x of [cx - 20.4, cx + 20.4]) {
          const model =
            hash(9_960, i + (x > cx ? 20 : 0)) < 0.15 ? "privacy-fence-broken" : "privacy-fence";
          kit.put(model, x, cz - 13.64 + i * 2.72, 1, { ...opts, gap: 0, y, rough: 9 });
        }
      for (const [dx, dz, model, turn] of [
        [-12, -7, "log-stack", 1],
        [-12, 6, "log-stack", 1],
        [-2, -7, "log-stack", 1],
        [8, 6, "log-pile-s", 0],
        [12, -6, "log-pile-s", 0],
        [3, 6, "log-pile-s", 1],
        [14, 3, "excavator", 1],
      ] as const)
        kit.put(model, cx + dx, cz + dz, turn as Placement["turn"], {
          ...opts,
          gap: 0.5,
          rough: 1.8,
        });
    }
    // Log cabins and old huts round the hamlet, each with a log pile and an outhouse.
    let homes = 0;
    for (let k = 0; k < 1_200 && homes < 9; k++) {
      const a = hash(10_000 + k, 1) * Math.PI * 2,
        d = 60 + hash(10_000 + k, 2) * 380;
      const x = ridge.x + Math.cos(a) * d,
        z = ridge.z + Math.sin(a) * d;
      const model = homes % 3 === 2 ? "old-hut" : "log-cabin";
      const turn = turnOf(10_000 + k);
      // Set on the highest ground under it, the floor just above it: on lower ground the
      // terrain would come up through the floorboards.
      const floor = model === "log-cabin" ? 0.15 : 0.06;
      if (
        !kit.put(model, x, z, turn, {
          ...opts,
          rough: 0.5,
          gap: 6,
          top: true,
          sink: floor,
          apron: 1.5,
        })
      )
        continue;
      homes++;
      kit.put("log-pile-s", x + 6, z + 2, 1, { ...opts, rough: 1 });
      if (homes % 2) kit.put("outhouse", x - 7, z - 5, turnOf(10_100 + k), { ...opts, rough: 0.8 });
    }
    // A camp at the edge of the trees.
    const camp = kit.search(ridge.x + 200, ridge.z - 120, 160, 10_200, (x, z) =>
      openPlot(ctx, kit, x, z, 18, 18, 1.2),
    );
    if (camp)
      for (const [dx, dz, model, turn] of [
        [0, 0, "campfire", 0],
        [-5, 3, "tent-canvas", 1],
        [5, 4, "tent-canvas", 3],
        [0, -5, "picnic-table", 0],
        [6, -4, "log", 1],
      ] as const)
        kit.put(model, camp[0] + dx, camp[1] + dz, turn as Placement["turn"], {
          ...opts,
          gap: 0.3,
          rough: 1.5,
        });
  }
}

/**
 * The estates and the south-west coast (owner, 2026-11-11: "upgrade the city/beach/some big
 * houses in the zone spread out", the hill mansion and the retail lot east of Central Hospital,
 * the villa in the Old Dam's loop, the compound east of Pine Ridge, and "a super big yacht that
 * the user can enter and find loot"). The concept map draws these; the island had forest and
 * bare sand there. Level sites for the villas come from build_world.py ESTATE_SITES.
 *
 * - Villas (`pool-villa`, enterable on two floors, its own pool on the podium) at Murder
 *   Cabins' two estates, in the Old Dam's loop and on the hill east of the Hospital, each with
 *   a fountain by its steps, cars and parasols by the pool.
 * - Modern houses (`modern-house`, enterable on two floors) round Murder Cabins' estates, on
 *   the slope over Fisher's Cove and behind the west beach, each with a pool and a car.
 * - The west beach: lifeguard towers, parasols, surfboards and a beach bar along the sand.
 * - Fisher's Cove: the super yacht at the end of its own pier in the harbour channel.
 * - East of the Hospital: a retail and logistics park (terminal, warehouses, a strip mall,
 *   car parks). East of Pine Ridge: a lumber lodge (timber halls, a barn, log cabins).
 */
const ESTATE_VILLAS: Array<[number, number, Placement["turn"]]> = [
  [-2230, 1600, 0],
  [-2190, 2210, 2],
  [-2060, -110, 1],
  [3490, -1855, 3],
];
function estates(out: Placement[], ctx: Context) {
  const kit = siteKit(ctx, out);
  const at = (
    model: string,
    bx: number,
    bz: number,
    turn: Placement["turn"],
    dx: number,
    dz: number,
    t: number,
    opts: Parameters<typeof kit.put>[4] = {},
  ) => {
    const [ox, oz] = turnXZ(dx, dz, turn);
    return kit.put(model, bx + ox, bz + oz, ((turn + t) & 3) as Placement["turn"], {
      gap: 0.5,
      rough: 1.5,
      poi: "estate",
      ...opts,
    });
  };
  // ---- Villas.
  ESTATE_VILLAS.forEach(([cx, cz, turn], i) => {
    const site = kit.search(cx, cz, 18, 9_100 + i * 37, (x, z) =>
      kit.put("pool-villa", x, z, turn, { rough: 1.0, gap: 3, poi: "estate" }),
    );
    if (!site) return;
    const v = out[out.length - 1]!;
    // By the west steps (local -20.4..-17.35, z 2.4..3.6): the fountain and the cars.
    at("fountain", v.x, v.z, turn, -23.5, -2.5, 1);
    at(i % 2 ? "cadillac" : "car-cruiser", v.x, v.z, turn, -25.5, 8, 0);
    at("car-sedan", v.x, v.z, turn, -25.5, 13, 0);
    // Parasols on the podium by the pool (lawn 1.57 m up).
    for (const dz of [-5, -1])
      at("parasol", v.x, v.z, turn, -14.5, dz, 0, { y: +(v.y + 1.57).toFixed(2), gap: 0.2 });
  });
  // ---- Modern houses: a pool behind (the glazed south front, +z), a car by the front door.
  const modern = (cx: number, cz: number, r: number, salt: number, n: number) => {
    let placed = 0;
    for (let k = 0; k < n * 4 && placed < n; k++) {
      const turn = (Math.floor(hash(salt + k, 5) * 4) & 3) as Placement["turn"];
      const site = kit.search(cx, cz, r, salt + k * 61, (x, z) =>
        kit.put("modern-house", x, z, turn, { rough: 0.6, gap: 4, poi: "estate" }),
      );
      if (!site) continue;
      placed++;
      const h = out[out.length - 1]!;
      // Clear of the front door's path (x -4.0) and the annex door's (x 16.0).
      at("swimming-pool", h.x, h.z, turn, 4.5, 19.5, 0, { rough: 1.2 });
      at("parasol", h.x, h.z, turn, -9.5, 15, 0);
      at(hash(salt, k) < 0.5 ? "car-pickup" : "car-sedan", h.x, h.z, turn, -11, 12, 1);
    }
  };
  // On their level sites (ESTATE_SITES), then on the slope over Fisher's Cove.
  modern(-2080, 1760, 6, 9_300, 1);
  modern(-2360, 1920, 6, 9_400, 1);
  modern(-2030, 2080, 6, 9_500, 1);
  modern(-2420, 1700, 6, 9_550, 1);
  modern(-3790, 3120, 170, 9_600, 3);
  // ---- The west beach (C6-B8): the sand is a strip at the water's edge; every ~220 m a
  // lifeguard tower, parasols and surfboards; a beach bar midway; beach houses behind.
  let bar = false;
  for (let z = 1000; z <= 2300; z += 55) {
    let x = -5000;
    while (x < -3900 && ctx.heightAt(x, z) < 0.6) x += 2;
    if (x >= -3900) continue;
    const sand = ctx.heightAt(x + 6, z);
    if (sand > 3.5 || roadDistance(ctx.meta, x, z, 20) < 15) continue;
    const k = Math.round((z - 1000) / 55);
    // On the sand at its lowest point under the footprint, where the sand is level enough
    // (it falls steeply into the sea): nothing floats or digs in more than half a metre.
    const level = (model: string, px: number, pz: number, turn: number) => {
      const [w, d] = footAt(model, turn as Placement["turn"]);
      let lo = Infinity,
        hi = -Infinity;
      for (const i of [-0.5, 0, 0.5])
        for (const j of [-0.5, 0, 0.5]) {
          const h = ctx.heightAt(px + i * w, pz + j * d);
          lo = Math.min(lo, h);
          hi = Math.max(hi, h);
        }
      return lo > 0.15 && hi - lo < 0.5 ? lo : null;
    };
    const put = (model: string, px: number, pz: number, turn: Placement["turn"]) => {
      const lo = level(model, px, pz, turn);
      return (
        lo !== null &&
        kit.put(model, px, pz, turn, {
          y: +(lo - 0.05).toFixed(2),
          gap: 0.4,
          poi: "beach",
          roads: false,
        })
      );
    };
    if (k % 4 === 0) put("lifeguard-tower", x + 5, z, 3);
    else if (k % 4 === 2 && !bar) bar = put("rural-diner", x + 14, z, 1);
    for (const [dx, dz] of [
      [3, -9],
      [4.5, -15],
      [3.5, 10],
    ] as const)
      if (hash(k, dx * 10 + dz) < 0.75) put("parasol", x + dx, z + dz, 0);
    if (k % 3 === 1) put("surfboards", x + 6, z + 4, 1);
  }
  modern(-4470, 1680, 6, 9_700, 1);
  modern(-4566, 1658, 6, 9_750, 1);
  // ---- Fisher's Cove: the super yacht stern-to at the end of one of the hamlet's piers (they
  // run south into the bay; the coaster lies in the channel by the quay). Bow to the open sea
  // (+z), keel 2.2 m under the water, the swim platform 0.58 m up at the pier's end (deck
  // 0.7 m); its boarding steps go down into the sea for swimmers.
  const piers = out
    .filter((p) => p.model === "pier" && p.turn === 0 && Math.hypot(p.x + 3700, p.z - 3400) < 350)
    .sort((a, b) => Math.abs(a.x + 3700) - Math.abs(b.x + 3700));
  for (const pier of piers) {
    const x = pier.x,
      c = pier.z + 12 + 16.6;
    let deep = true;
    for (const dx of [-4.3, 0, 4.3])
      for (let dz = -16.5; dz <= 19.5; dz += 3)
        if (ctx.heightAt(x + dx, c + dz) > -2.8) deep = false;
    if (!deep || !kit.free(x - 6, c - 16.4, x + 6, c + 22)) continue;
    out.push({ model: "lux-yacht", x, y: -2.2, z: +c.toFixed(2), turn: 0, poi: "shore" });
    kit.mark(out[out.length - 1]!);
    break;
  }
  // ---- East of the Hospital: a retail and logistics park round its car parks.
  const park: Array<[string, number, number, Placement["turn"], number]> = [
    // Enterable buildings stand on level ground (their doors within a step of it).
    ["ind-terminal", 0, -40, 0, 0.6],
    ["strip-mall", -10, 15, 2, 0.6],
    ["ind-warehouse-1", 55, -30, 1, 0.6],
    ["warehouse", -60, -20, 0, 0.6],
    ["warehouse", 60, 30, 0, 0.6],
    ["lot-lines", -5, -10, 0, 2.0],
    ["lot-lines", -5, -2, 0, 2.0],
    ["lot-lines", 35, -8, 0, 2.0],
  ];
  for (const [m, dx, dz, t, rough] of park)
    kit.search(3195 + dx, -1280 + dz, 24, 9_800 + dx * 7 + dz, (x, z) =>
      kit.put(m, x, z, t, { rough, gap: 1, poi: "estate", apron: rough < 1 ? 3 : 0 }),
    );
  const cars = ["car-sedan", "car-pickup", "cargo-van", "car-cruiser", "car-sedan", "box-truck"];
  for (let k = 0; k < 14; k++) {
    const x = 3195 - 20 + (k % 7) * 6,
      z = -1280 + (k < 7 ? -12 : -1);
    if (hash(k, 9_850) < 0.7)
      kit.put(cars[k % cars.length]!, x, z, 1, { rough: 2, gap: 0.3, poi: "estate" });
  }
  for (const [dx, dz] of [
    [-25, -6],
    [20, -6],
    [45, -10],
  ] as const)
    kit.put("lot-light", 3195 + dx, -1280 + dz, 0, { rough: 2, gap: 0.3, poi: "estate" });
  for (const [m, dx, dz, t] of [
    ["reefer-trailer", 30, -60, 0],
    ["semi-cab", 30, -70, 0],
    ["box-truck", 40, -58, 0],
    ["pallets", -20, -60, 0],
    ["dumpsters", -30, -58, 0],
  ] as const)
    kit.put(m, 3195 + dx, -1280 + dz, t as Placement["turn"], {
      rough: 2.5,
      gap: 0.5,
      poi: "estate",
    });
  // ---- East of Pine Ridge: a lumber lodge on its level site.
  const lodge: Array<[string, number, number, Placement["turn"]]> = [
    ["rural-wood-4", 0, -12, 0],
    ["rural-wood-1", -24, 8, 1],
    ["old-barn", 22, 10, 0],
    ["log-cabin", -10, 24, 2],
    ["log-cabin", 4, 26, 2],
    ["log-cabin", 18, 28, 2],
    ["sawmill", 26, -16, 1],
    ["log-stack", 8, 6, 0],
    ["log-stack", -6, 6, 1],
    ["plank-stack", 34, -2, 0],
    ["car-pickup", -12, 4, 1],
    ["field-tractor", 30, 2, 0],
    ["picnic-table", -2, 14, 0],
  ];
  const enterable = new Set(["rural-wood-4", "rural-wood-1", "old-barn", "log-cabin"]);
  for (const [m, dx, dz, t] of lodge)
    kit.search(695 + dx, -2720 + dz, 10, 9_900 + dx * 3 + dz, (x, z) =>
      kit.put(m, x, z, t, {
        rough: enterable.has(m) ? 0.6 : 1.6,
        apron: enterable.has(m) ? 3 : 0,
        gap: 0.6,
        poi: "estate",
        // A log cabin stands on its stone footing at the highest ground under it (as at Pine
        // Ridge): lower, the terrain comes up through its floor.
        ...(m === "log-cabin" ? { top: true, sink: 0.15, rough: 0.5, apron: 1.5 } : {}),
      }),
    );
}

function landmarks(out: Placement[], ctx: Context) {
  const { meta } = ctx;
  const poi = (id: string) => meta.pois.find((p) => p.id === id);
  // Port: the north shore of Fisher's Cove's bay.
  const cove = poi("fishers-cove");
  if (cove) {
    const kit = siteKit(ctx, out);
    let quay: [number, number] | null = null;
    for (const dx of [0, 60, 140, -100]) {
      for (let t = 0; t < 400; t += 2) {
        const x = cove.x + dx,
          z = cove.z + 420 - t;
        if (ctx.heightAt(x, z) < 0.4) continue;
        if (ctx.heightAt(x, z - 20) > 5 || ctx.heightAt(x, z + 40) > -2) break;
        quay = [x, z];
        break;
      }
      if (
        quay &&
        kit.put("port-crane", quay[0], quay[1] - 14, 0, {
          gap: 2,
          poi: "shore",
          roads: false,
          // On the quay's edge, its legs over the water (the sea margin counts as wet).
          y: Math.max(0.6, ctx.heightAt(quay[0], quay[1] - 14)),
        })
      )
        break;
      quay = null;
    }
    if (quay) {
      const [qx, qz] = quay;
      kit.put("port-crane", qx + 48, qz - 14, 0, {
        gap: 2,
        poi: "shore",
        roads: false,
        y: Math.max(0.6, ctx.heightAt(qx + 48, qz - 14)),
      });
      // The container yard behind the cranes: stacks two high.
      for (let r = 0; r < 3; r++)
        for (let k = 0; k < 5; k++) {
          const x = qx - 10 + k * 14,
            z = qz - 44 - r * 6;
          if (
            kit.put("container-40", x, z, 0, { rough: 1.5, gap: 0.4, poi: "shore" }) &&
            hash(r * 7 + k, 811) < 0.55
          ) {
            const base = out[out.length - 1]!;
            out.push({ ...base, y: +(base.y + 4.2).toFixed(2) });
          }
        }
      // A coaster at the quay (parallel to the shore), a container ship at anchor in the bay.
      for (const [model, off, draft] of [
        ["cargo-ship", 40, 3.5],
        ["container-ship", 380, 7],
      ] as const) {
        const x = qx + (model === "cargo-ship" ? 20 : 120),
          z = qz + off;
        const [w, d] = footAt(model, 1);
        const deep = [-1, 0, 1].every((i) =>
          [-1, 1].every((j) => ctx.heightAt(x + (i * w) / 2, z + (j * d) / 2) < -draft - 0.5),
        );
        if (deep)
          out.push({ model, x: +x.toFixed(2), y: -draft, z: +z.toFixed(2), turn: 1, poi: "shore" });
      }
    }
  }
  // Power station by the Old Dam, where the pylon lines start.
  {
    const kit = siteKit(ctx, out);
    const plot = kit.search(
      -2950,
      -520,
      450,
      8_100,
      (x, z) => openPlot(ctx, kit, x, z, 64, 44, 3),
      400,
    );
    if (plot) {
      const [x, z] = plot;
      // The switch house where the ground is level enough for its door.
      kit.search(x - 24, z, 30, 8_150, (sx, sz) =>
        kit.put("brick-substation", sx, sz, 1, { rough: 0.6, gap: 1, poi: "power" }),
      );
      for (let k = 0; k < 4; k++)
        kit.put("transformer", x - 8 + k * 6, z - 8, 0, { rough: 2.5, gap: 0.5, poi: "power" });
      for (let k = 0; k < 2; k++)
        kit.put("transformer-kiosk", x - 6 + k * 12, z + 9, 0, {
          rough: 2.5,
          gap: 0.5,
          poi: "power",
        });
      kit.put("smoke-stacks", x + 26, z - 2, 1, { rough: 2.5, gap: 1, poi: "power" });
      kit.put("ind-office-trailer", x + 8, z + 18, 0, { rough: 2.5, gap: 1, poi: "power" });
      kit.put("fuel-tank", x + 26, z + 16, 0, { rough: 2.5, gap: 1, poi: "power" });
      // (Location audit 2026-11-09) the station's own gantry crane over its yard, and a
      // second transformer station.
      kit.search(x, z + 34, 30, 8_170, (cx, cz) =>
        kit.put("gantry-crane", cx, cz, 0, { rough: 1.2, gap: 1, poi: "power" }),
      );
      kit.put("ind-substation", x - 8, z - 18, 0, { rough: 1.5, gap: 0.5, poi: "power" });
    }
  }
  // Central Hospital (the mega hospital since 2026-11-13, hospitalCampus): ambulances drawn up
  // under the emergency department's entrance canopy and along its forecourt.
  const hosp = poi("central-hospital");
  if (hosp) {
    const put = groundPlacer(ctx, out, hosp.id, hosp.x, hosp.z, (hosp.padRadius ?? 210) + 40);
    for (const [dx, dz, turn] of [
      [-3.2, 63, 0],
      [3.2, 63, 0],
      [-14, 66, 0],
      [14, 66, 0],
    ] as const)
      put("ambulance", hosp.x + dx, hosp.z + dz, turn, { margin: 0.5 });
  }
  // The military base: a motor pool and a firing range east of the compound, two dishes.
  const base = poi("southern-military-base");
  if (base) {
    const put = groundPlacer(ctx, out, base.id, base.x, base.z, (base.padRadius ?? 280) + 20);
    const rows: Array<[string, number]> = [
      ["tank", 4],
      ["btr", 4],
      ["ifv", 3],
    ];
    let row = 0;
    for (const [model, n] of rows)
      for (let tries = 0; tries < 12; tries++, row++) {
        const dz = -40 + (row % 6) * 14,
          dx = -30 + Math.floor(row / 6) * 60;
        let placed = 0;
        for (let k = 0; k < n; k++)
          if (
            put(
              model,
              base.x + dx + k * (model === "tank" ? 6 : model === "ifv" ? 5.5 : 9.5),
              base.z + dz,
              model === "btr" ? 1 : 0,
              { margin: 0.6 },
            )
          )
            placed++;
        if (placed >= Math.min(3, n)) break;
      }
    for (let k = 0; k < 6; k++)
      put("range-booth", base.x + 200, base.z - 12 + k * 4, 1, { margin: 0.3 });
    for (let k = 0; k < 4; k++)
      put("range-target", base.x + 250 + (k % 2) * 10, base.z - 9 + k * 6, 1, { margin: 0.3 });
    for (const [dx, dz] of [
      [30, 45],
      [-40, 40],
      [60, -60],
    ] as const)
      put("sat-dish", base.x + dx, base.z + dz, 0, { margin: 1 });
  }
  // A car salvage yard between Millhaven and Crossroads: stacked wrecks in rows, scrap, tyres.
  {
    const kit = siteKit(ctx, out);
    const plot = kit.search(-1500, -1560, 260, 8_300, (x, z) =>
      openPlot(ctx, kit, x, z, 84, 60, 2.5),
    );
    if (plot) {
      const [cx, cz] = plot;
      const CARS = [
        "rust-sedan",
        "wreck-sedan",
        "crashed-truck",
        "wreck-car",
        "burned-car-b",
        "rust-sedan",
      ];
      const HIGH: Record<string, number> = {
        "rust-sedan": 1.75,
        "wreck-sedan": 1.6,
        "crashed-truck": 2.3,
        "wreck-car": 1.65,
        "burned-car-b": 1.27,
      };
      for (let r = 0; r < 4; r++)
        for (let k = 0; k < 7; k++) {
          const model = CARS[Math.floor(hash(r * 31 + k, 821) * CARS.length)]!;
          const x = cx - 33 + k * 8,
            z = cz - 22 + r * 14;
          if (!kit.put(model, x, z, 0, { rough: 2.5, gap: 0.3 })) continue;
          // Stacked two or three high.
          let y = out[out.length - 1]!.y + HIGH[model]!;
          for (let level = 1; level < 3 && hash(r * 31 + k, 822 + level) < 0.6; level++) {
            const top = CARS[Math.floor(hash(r * 31 + k, 830 + level) * CARS.length)]!;
            out.push({
              model: top,
              x: +x.toFixed(2),
              y: +y.toFixed(2),
              z: +z.toFixed(2),
              turn: hash(r, 840 + k) < 0.5 ? 0 : 2,
              poi: "countryside",
            });
            y += HIGH[top]!;
          }
        }
      kit.put("school-bus", cx + 36, cz + 18, 0, { rough: 2.5, gap: 0.5 });
      kit.put("ind-office-trailer", cx - 30, cz + 32, 0, { rough: 2.5, gap: 0.5 });
      for (let k = 0; k < 6; k++)
        kit.put(k % 2 ? "scrap-pile" : "tires", cx - 36 + k * 12, cz - 33, 0, {
          rough: 2.5,
          gap: 0.3,
        });
      kit.put("junk-pile", cx + 34, cz - 10, 0, { rough: 2.5, gap: 0.3 });
      kit.put("junk-pile", cx - 40, cz + 4, 0, { rough: 2.5, gap: 0.3 });
    }
  }
  // Gravel and spoil mounds by the quarry plant (Verdansk's quarry yards).
  const quarry = poi("redstone-quarry");
  if (quarry) {
    const kit = siteKit(ctx, out);
    let n = 0;
    for (let k = 0; k < 80 && n < 7; k++) {
      const a = hash(k, 851) * Math.PI * 2,
        d = 40 + hash(k, 852) * 180;
      const x = quarry.x + 380 + Math.cos(a) * d,
        z = quarry.z + 60 + Math.sin(a) * d;
      if (
        kit.put("gravel-mound", x, z, (k % 4) as Placement["turn"], { rough: 2, gap: 3, sink: 0.2 })
      )
        n++;
    }
  }
  // Graveyards: a chapel's near Riverwood, a ruined church's on a rise near Pine Ridge.
  for (const [hub, model, salt] of [
    [[2700, 520], "chapel", 8_500],
    [[-700, -2650], "church-ruins", 8_600],
  ] as const) {
    const kit = siteKit(ctx, out);
    const plot = kit.search(
      hub[0],
      hub[1],
      420,
      salt,
      (x, z) => openPlot(ctx, kit, x, z, 50, 44, model === "chapel" ? 1 : 5),
      160,
    );
    if (!plot) continue;
    const [cx, cz] = plot;
    kit.put(model, cx, cz - 14, 0, { rough: model === "chapel" ? 1 : 5, gap: 1, sink: 0.1 });
    for (let r = 0; r < 4; r++)
      for (let k = 0; k < 6; k++)
        if (hash(salt + r, k) < 0.85)
          kit.put("grave-row", cx - 15 + k * 6, cz + 2 + r * 5, 0, { rough: 2, gap: 0.6 });
  }
}

/** Model-space point just outside a building's entrance steps (building-access-v3.json). */
const PORCH_STEPS: Record<string, [number, number]> = { shed: [-2.1, 2.4] };
/** Points on the shed's floor and its doorway (model space), where the ground must stay below. */
const SHED_FLOOR_SAMPLES: Array<[number, number]> = [
  [-2.1, 0.2],
  [-2.1, 0.9],
  [-2.4, -1.4],
  [0, -1.4],
  [2.4, -1.4],
  [-1, 0.8],
  [1.2, 0.8],
  [2.4, 1.2],
];

/** A model-space point turned like the placement (three.js rotation.y = turn · π/2). */
function turnXZ(x: number, z: number, turn: number): [number, number] {
  switch (turn & 3) {
    case 1:
      return [z, -x];
    case 2:
      return [-x, -z];
    case 3:
      return [-z, x];
    default:
      return [x, z];
  }
}

/**
 * The strait between the mainland and the Superstore island (owner, 2026-11-11: "audit the two
 * bridges and each coast side … proper rocks etc., maybe a house/tower on each side of the
 * bridges … add proper bridges"):
 *
 * - each bridge's two A-pylons (`strait-pylon-w`/`-e`, the downloaded Kyiv pylon narrowed and
 *   turned to the bridge's axis at process time, since placements turn by quarter turns); the
 *   deck runs level between them and their stays land on its edge girders (bridges.ts STRAIT);
 * - at each of the four bridge ends: a guard booth and a lookout beside the approach, tetrapods
 *   at the water line either side of the abutment and a rock revetment along the shore;
 * - along both shores: rocky stretches (shore rocks at the water line, rock bands and cliffs
 *   where the bank rises) between sand beaches with driftwood, and two wrecked boats.
 */
/** The pylon model's deck point (where the deck's centre line meets it), model space. */
const PYLON_DECK: Record<string, [number, number, number]> = {
  // Measured on the processed models (stretch 0.5 across, turned 6.013° / −8.79°): the pylon's
  // axis at the height its stays land, 29.3 m above its foot.
  "strait-pylon-w": [-6.761, 29.3, -64.094],
  "strait-pylon-e": [9.839, 29.3, -63.695],
};
function straitShores(out: Placement[], ctx: Context) {
  const { meta } = ctx;
  const { put } = siteKit(ctx, out);
  const strait = meta.bridges.filter((b) => STRAIT_BRIDGES.has(b.id));
  // Pylons and bridgeheads.
  for (const b of strait) {
    const [ax, az] = b.a,
      [bx, bz] = b.b;
    const length = Math.hypot(bx - ax, bz - az);
    const dir = [(bx - ax) / length, (bz - az) / length] as const;
    const side = [-dir[1], dir[0]] as const;
    const ha = ctx.heightAt(ax, az),
      hb = ctx.heightAt(bx, bz);
    const model = b.id === "west-bridge" ? "strait-pylon-w" : "strait-pylon-e";
    const [dx, dy, dz] = PYLON_DECK[model]!;
    for (const [k, t] of STRAIT.pylons.entries()) {
      const px = ax + (bx - ax) * t,
        pz = az + (bz - az) * t;
      // Turn 0 faces the main span towards b; turn 2 (the second pylon) back towards a.
      const sign = k === 0 ? 1 : -1;
      out.push({
        model,
        x: +(px - sign * dx).toFixed(2),
        y: +(deckHeight(b, ha, hb, t) - dy).toFixed(2),
        z: +(pz - sign * dz).toFixed(2),
        turn: k === 0 ? 0 : 2,
        poi: "strait-bridge",
      });
    }
    // The two ends: `on` points from the end onto the bridge.
    for (const [ex, ez, on] of [
      [ax, az, 1],
      [bx, bz, -1],
    ] as const) {
      const ux = dir[0] * on,
        uz = dir[1] * on;
      // Square to the road: the turn whose +z is nearest to "away from the bridge".
      const away: Placement["turn"] =
        Math.abs(uz) > Math.abs(ux) ? (uz > 0 ? 2 : 0) : ux > 0 ? 3 : 1;
      const salt = Math.round(ex * 7 + ez);
      // (Owner, 2026-11-11: "a house/tower on each side of the bridges": a military guard
      // tower with stairs at the mainland ends, a tall watchtower at the island ends, the
      // wooden lookout beside each.)
      for (const [model, back, off] of [
        ["bridge-booth", 16, 9.5],
        [on > 0 ? "bridge-guardtower" : "bridge-watchtower", 26, -13],
        ["bridge-lookout", 38, 12],
      ] as const)
        // Beside the approach road, a little further back (or across the road) when taken.
        search: for (const flip of [1, -1])
          for (let tries = 0; tries < 8; tries++) {
            const x = ex - ux * (back + tries * 4) + side[0] * off * flip,
              z = ez - uz * (back + tries * 4) + side[1] * off * flip;
            if (put(model, x, z, away, { poi: "strait", gap: 0.5, rough: 2.5, bridges: false }))
              break search;
          }
      // Shore line under the bridge: the first point out along the deck where the ground is
      // under water.
      let shore = 0;
      for (let d = 0; d < 200; d += 2)
        if (ctx.heightAt(ex + ux * d, ez + uz * d) < 0) {
          shore = d;
          break;
        }
      // Tetrapods at the water line either side of the abutment (the beach ends in a drop to
      // the channel floor a few metres out: they pile along its edge).
      for (let i = 0; i < 40; i++) {
        const along = shore - 5 + hash(salt, i) * 8,
          across = (i % 2 ? 1 : -1) * (8 + hash(salt + 1, i) * 24);
        const x = ex + ux * along + side[0] * across,
          z = ez + uz * along + side[1] * across;
        const h = ctx.heightAt(x, z);
        if (h < -2.5 || h > 1.4) continue;
        put("tetrapod", x, z, (i & 3) as Placement["turn"], {
          poi: "strait",
          gap: 0.15,
          y: h - 0.5,
          bridges: false,
          roads: false,
        });
      }
      // A rock revetment along the shore either side (the strait's shores run along x), a
      // little further along when something already stands there.
      for (const s of [1, -1])
        revetment: for (const reach of [62, 100, 140])
          for (let d = -24; d <= 24; d += 1) {
            const cx = ex + ux * (shore - 4) + side[0] * s * reach,
              cz = ez + uz * (shore - 4) + side[1] * s * reach + d * Math.sign(uz || 1);
            const h = ctx.heightAt(cx, cz);
            // Its middle just above the water.
            if (h > 0.4 && h < 1.6) {
              if (
                put("shore-breakwater", cx, cz, 0, {
                  poi: "strait",
                  gap: 0.5,
                  y: h - 0.9,
                  roads: false,
                })
              )
                break revetment;
              break;
            }
          }
    }
  }
  // Both shores, west to east.
  // At the water line (big flat and long rocks, now and then a stack standing in the surf), a
  // little inland (boulders), and on a rising bank (rock faces and cliffs).
  // (Not the shore ledge: a 2 m thick shelf of rock that hung 3–4 m over the water and the
  // sand; rock-ground.ts would take most of them out.)
  const WATERLINE = [
    "shore-slab",
    "shore-ridge",
    "shore-ridge",
    "shore-slab",
    "rock-big-2",
    "big-boulder",
    "shore-cliff-b",
  ] as const;
  const SECOND = ["shore-slab", "big-boulder", "shore-ridge", "rock-tall", "rock-big-2"] as const;
  const INLAND = ["rock-cluster", "rock-mid-1", "rock-big-1", "shore-slab", "rock-grey"] as const;
  const BANK = [
    "shore-cliff-a",
    "shore-cliff-b",
    "sea-cliff",
    "shore-cliff-a",
    "quarry-face",
  ] as const;
  const pick = <T>(list: readonly T[], r: number) => list[Math.floor(r * list.length)]!;
  let wrecks = 0,
    lastWreck = -1e9;
  for (let x = -2800; x <= 4400; x += 36) {
    // The strait's deepest point at this x, then out to each shore.
    let mid = NaN,
      low = 1e9;
    for (let z = 2200; z <= 3400; z += 10) {
      const h = ctx.heightAt(x, z);
      if (h < low) {
        low = h;
        mid = z;
      }
    }
    if (low > -3) continue;
    for (const dz of [-1, 1]) {
      let z = mid;
      while (Math.abs(z - mid) < 900 && ctx.heightAt(x, z) < 0) z += dz * 2;
      if (Math.abs(z - mid) >= 900) continue;
      const salt = Math.round(x) * 3 + dz;
      const jx = x + (hash(salt, 1) - 0.5) * 20;
      const turn = (Math.floor(hash(salt, 4) * 4) & 3) as Placement["turn"];
      // Rocky or sandy: stretches about 250 m long, three in four rocky.
      const rocky = hash(Math.floor((x + 5000) / 250), dz + 9) < 0.75;
      if (rocky) {
        const wz = z + dz * (hash(salt, 3) * 5 - 2);
        put(pick(WATERLINE, hash(salt, 2)), jx, wz, turn, {
          poi: "strait",
          gap: 0.5,
          y: ctx.heightAt(jx, wz) - 0.8,
        });
        // A second rock along the water line, and now and then a crag standing in the surf.
        const sx = jx + (hash(salt, 16) < 0.5 ? -1 : 1) * (11 + hash(salt, 17) * 6);
        let sz = z;
        while (Math.abs(sz - z) < 30 && ctx.heightAt(sx, sz) < 0) sz += dz;
        sz += dz * (hash(salt, 20) * 4 - 1.5);
        put(
          hash(salt, 18) < 0.12 ? "sea-cliff" : pick(SECOND, hash(salt, 19)),
          sx,
          sz,
          ((turn + 1) & 3) as Placement["turn"],
          { poi: "strait", gap: 0.5, y: ctx.heightAt(sx, sz) - 1 },
        );
        const iz = z + dz * (10 + hash(salt, 6) * 12);
        const ix = jx + (hash(salt, 7) - 0.5) * 18;
        put(pick(INLAND, hash(salt, 8)), ix, iz, turn, {
          poi: "strait",
          gap: 0.5,
          y: ctx.heightAt(ix, iz) - 0.4,
        });
        // How high the bank rises behind the shore.
        if (ctx.heightAt(jx, z + dz * 50) > 4.5 && hash(salt, 15) < 0.7) {
          const cz = z + dz * (26 + hash(salt, 9) * 16);
          // Facing the water (its +z away from it).
          put(pick(BANK, hash(salt, 10)), jx, cz, dz > 0 ? 0 : 2, {
            poi: "strait",
            gap: 1,
            y: ctx.heightAt(jx, cz) - 2.5,
          });
        }
      } else if (hash(salt, 11) < 0.35) {
        const wz = z + dz * (6 + hash(salt, 12) * 8);
        put("driftwood", jx, wz, (Math.floor(hash(salt, 13) * 4) & 3) as Placement["turn"], {
          poi: "strait",
          gap: 1,
          y: ctx.heightAt(jx, wz) - 0.15,
          roads: false,
        });
      } else if (wrecks < 2 && x - lastWreck > 2500 && hash(salt, 14) < 0.3) {
        const wz = z + dz * 5;
        if (
          put("beach-wreck", jx, wz, dz > 0 ? 1 : 3, {
            poi: "strait",
            gap: 3,
            y: ctx.heightAt(jx, wz) - 0.5,
          })
        ) {
          wrecks++;
          lastWreck = x;
        }
      }
    }
  }
}

/** The nearest road centreline point within `limit` and the road's direction there. */
function roadNearest(meta: WorldMeta, x: number, z: number, limit = 40) {
  const index = roadSegments(meta);
  let best = { d: limit, px: x, pz: z, ux: 1, uz: 0 };
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
          len = Math.hypot(vx, vz) || 1;
        const u = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (len * len)));
        const px = ax + vx * u,
          pz = az + vz * u,
          d = Math.hypot(x - px, z - pz);
        if (d < best.d) best = { d, px, pz, ux: vx / len, uz: vz / len };
      }
    }
  return best;
}

/** The quarter turn whose model +z (a building's front) points nearest to (dx, dz). */
function facing(dx: number, dz: number): Placement["turn"] {
  return Math.abs(dz) >= Math.abs(dx) ? (dz > 0 ? 0 : 2) : dx > 0 ? 1 : 3;
}

/**
 * Stops along the strait's roads (owner, 2026-11-11: "see what 3D objects we can add around the
 * roads here to make it like a real world", with the downloads): a roadside motel with its pole
 * sign, a payphone and cars in its lot on the coast road between Murder Cabins and the west
 * bridge; a rest stop (picnic shelter, payphone) on the island's north coast road
 * and a picnic shelter with a payphone on the mainland coast road's east stretch, both looking
 * out over the strait. The roads already carry their verges' guardrails, reflector posts, power
 * line and billboards (roadsideCover, powerLines). Each spot is searched for along its road on
 * flat ground clear of the road; the motel (art/br/fitout/roadside.py) stands on the highest
 * ground under it and its doorsteps, so no room's floor is dug in.
 */
/**
 * A car on a paved lot stands on its asphalt (pavedLots): under each wheel the lot's surface
 * there (its cell's corners' heights, lotHeight, interpolated across the cell as it is drawn).
 */
function seatOnLot(ctx: Context, car: Placement, lot: Placement) {
  const cells = pavedLots([lot], ctx.meta);
  const [w, d] = footAt(car.model, car.turn);
  let y = -Infinity;
  for (const [i, j] of [
    [-0.4, -0.4],
    [0.4, -0.4],
    [-0.4, 0.4],
    [0.4, 0.4],
    [0, 0],
  ] as const) {
    const x = car.x + i * w,
      z = car.z + j * d;
    for (const c of cells) {
      // Cells are axis-aligned in the world (quarter turns): interpolate over x and z between
      // the heights at the cell's x and z extremes.
      const x0 = Math.min(c[0]!, c[2]!, c[4]!, c[6]!),
        x1 = Math.max(c[0]!, c[2]!, c[4]!, c[6]!),
        z0 = Math.min(c[1]!, c[3]!, c[5]!, c[7]!),
        z1 = Math.max(c[1]!, c[3]!, c[5]!, c[7]!);
      if (x < x0 || x > x1 || z < z0 || z > z1) continue;
      const u = (x - x0) / (x1 - x0 || 1),
        v = (z - z0) / (z1 - z0 || 1);
      const h = (px: number, pz: number) => lotHeight(ctx.heightAt, px, pz);
      const top = h(x0, z0) * (1 - u) + h(x1, z0) * u,
        bottom = h(x0, z1) * (1 - u) + h(x1, z1) * u;
      y = Math.max(y, top * (1 - v) + bottom * v);
    }
  }
  if (y > -Infinity) car.y = +y.toFixed(2);
}

/**
 * Cars parked on a stop's lot, in front of its building, along its front: each at the first
 * spot (nearest the building, then out along the front from the middle) whose ground is level
 * to 0.35 m under the car (the lot follows the ground, and a car does not tilt: by the road's
 * edge, where the lot rides down the embankment, one stood up to a metre clear of the ground).
 */
const LOT_CARS: Record<string, { cars: string[]; front: number; half: number }> = {
  "roadside-motel": { cars: ["car-sedan", "car-pickup", "car-sedan"], front: 8.55, half: 17 },
  "modular-motel": { cars: ["car-pickup", "car-sedan"], front: 5.47, half: 11 },
  "roadside-gas": { cars: ["car-pickup"], front: 8.7, half: 7 },
};
function parkOnLot(
  ctx: Context,
  put: ReturnType<typeof siteKit>["put"],
  out: Placement[],
  lot: Placement,
) {
  const spec = LOT_CARS[lot.model];
  if (!spec) return;
  const flip = hash(Math.round(lot.x), Math.round(lot.z)) < 0.5;
  for (const model of spec.cars) {
    const car = lot.model === "roadside-gas" && flip ? "car-sedan" : model;
    const [w, d] = footAt(car, lot.turn);
    let parked = false;
    for (let lz = spec.front + 2.6; lz <= spec.front + 9 && !parked; lz += 1.6)
      for (let k = 0; k <= 2 * Math.floor(spec.half / 3) && !parked; k++) {
        const lx = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 3 * (flip ? -1 : 1);
        const [dx, dz] = turnXZ(lx, lz, lot.turn);
        const x = lot.x + dx,
          z = lot.z + dz;
        const hs = [-1, 1].flatMap((sx) =>
          [-1, 1].map((sz) => ctx.heightAt(x + (sx * w) / 2, z + (sz * d) / 2)),
        );
        if (Math.max(...hs) - Math.min(...hs) > 0.35) continue;
        if (!put(car, x, z, lot.turn, { poi: lot.poi, gap: 0.6, rough: 0.35 })) continue;
        seatOnLot(ctx, out[out.length - 1]!, lot);
        parked = true;
      }
  }
}

function straitRoadside(out: Placement[], ctx: Context) {
  const { meta } = ctx;
  const { put } = siteKit(ctx, out);
  const poi = "strait-roadside";
  // Walks a stretch of road by its control points (build_world.py STRAIT_ROADS), offering each
  // spot `off` m off the road on the side whose normal's z has the sign of `side`.
  function* along(points: Array<[number, number]>, step: number, off: number, side: 1 | -1) {
    for (let i = 0; i + 1 < points.length; i++) {
      const [ax, az] = points[i]!,
        [bx, bz] = points[i + 1]!;
      const n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / step));
      for (let k = 0; k < n; k++) {
        const r = roadNearest(meta, ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n, 40);
        if (r.d >= 40) continue;
        let nx = -r.uz,
          nz = r.ux;
        if (Math.sign(nz) !== side) [nx, nz] = [-nx, -nz];
        yield { r, nx, nz, x: r.px + nx * off, z: r.pz + nz * off };
      }
    }
  }
  // The motel, inland (north) of the coast road, its front to the road over a lot. It stands on
  // the lowest ground under it and its doorsteps: on ground within 0.25 m its pad (a kerb, 0.28
  // m) is never dug in and every side steps up onto it.
  const MOTEL_ROAD: Array<[number, number]> = [
    [-2350, 2200],
    [-1900, 2380],
    [-1450, 2420],
    [-1150, 2405],
  ];
  motel: for (const lot of [26, 22, 18.1])
    for (const { r, nx, nz, x, z } of along(MOTEL_ROAD, 15, lot, -1)) {
      const turn = facing(-nx, -nz);
      if (!put("roadside-motel", x, z, turn, { poi, rough: 0.25, apron: 2.5, gap: 2 })) continue;
      const motel = out[out.length - 1]!;
      // Its pole sign at the lot's road edge (its boards square to the road), a payphone by
      // the office, cars parked on the lot.
      const [ax, az] = [r.ux, r.uz];
      const at = (off: number, s: number) =>
        [r.px + nx * off + ax * s, r.pz + nz * off + az * s] as const;
      put("motel-sign", ...at(9.5, 14), facing(nx, nz), { poi, gap: 0.3, rough: 3 });
      put("payphone-booth", ...at(lot - 10.4, 16.2), turn, { poi, gap: 0.2, rough: 2 });
      parkOnLot(ctx, put, out, motel);
      break motel;
    }
  // The motor court (art/br/fitout/motorcourt.py), inland (north) of the mainland coast road's
  // east stretch, across the road from the rest stop: its reception and carport canopy (the pump
  // island under it, two fuel dispensers on the island) and its cabin block face the road over
  // a forecourt. It stands on its lowest ground, which may rise 0.15 m under it: its floors are
  // 0.1 m up and its ceilings 2.04 m, so a 1.8 m player stands upright on any of it.
  const COURT_ROAD: Array<[number, number]> = [
    [1640, 2326],
    [1780, 2328],
    [1950, 2337],
  ];
  court: for (const lot of [18.5, 21, 24])
    for (const { nx, nz, x, z } of along(COURT_ROAD, 10, lot, -1)) {
      const turn = facing(-nx, -nz);
      if (!put("modular-motel", x, z, turn, { poi, rough: 0.15, apron: 1.5, gap: 2 })) continue;
      const court = out[out.length - 1]!;
      for (const lx of [-10.35, -8.85]) {
        const [dx, dz] = turnXZ(lx, 2.1, turn);
        out.push({
          model: "fuel-dispenser",
          x: +(court.x + dx).toFixed(2),
          y: +(court.y + 0.18).toFixed(2),
          z: +(court.z + dz).toFixed(2),
          turn,
          poi,
        });
      }
      // A payphone by the cabin block's end, cars parked on the forecourt.
      const [px, pz] = turnXZ(13.6, 1.2, turn);
      put("payphone-booth", court.x + px, court.z + pz, turn, { poi, gap: 0.2, rough: 2 });
      parkOnLot(ctx, put, out, court);
      break court;
    }
  // Rest stops facing the strait.
  const stops: Array<{ road: Array<[number, number]>; side: 1 | -1 }> = [
    // The island's north coast road (the strait to the north).
    {
      road: [
        [-200, 3228],
        [200, 3200],
        [700, 3220],
        [1200, 3240],
      ],
      side: -1,
    },
    // The mainland coast road's east stretch (the strait to the south).
    {
      road: [
        [1400, 2320],
        [1900, 2330],
        [2200, 2382],
      ],
      side: 1,
    },
  ];
  for (const { road, side } of stops)
    for (const { r, nx, nz, x, z } of along(road, 20, 4.4 + 6, side)) {
      const [ax, az] = [r.ux, r.uz];
      // The shelter's long side (x) along the road.
      const turn = Math.abs(ax) >= Math.abs(az) ? 0 : 1;
      if (!put("rest-shelter", x, z, turn, { poi, rough: 0.8, gap: 1 })) continue;
      put("payphone-booth", x - ax * 8.5 - nx * 2.5, z - az * 8.5 - nz * 2.5, facing(-nx, -nz), {
        poi,
        gap: 0.3,
        rough: 1.5,
      });
      break;
    }
}

/** The strait's roads as drawn (art/br/build_world.py STRAIT_ROADS). */
const STRAIT_LINES: Array<Array<[number, number]>> = [
  [
    [-2950, 1580],
    [-2700, 1900],
    [-2350, 2200],
    [-1900, 2380],
    [-1450, 2420],
    [-1050, 2400],
    [-771.2, 2364.4],
  ],
  [
    [-771.2, 2364.4],
    [-450, 2260],
    [-50, 2140],
    [400, 2170],
    [900, 2280],
    [1400, 2320],
    [1900, 2330],
    [2250, 2390],
    [2474.6, 2474.6],
  ],
  [
    [1000, 2290],
    [1030, 2050],
    [1080, 1840],
  ],
  [
    [2474.6, 2474.6],
    [2560, 2200],
    [2660, 1950],
    [2760, 1760],
    [2840.9, 1644.5],
  ],
  [
    [-686.4, 3169.5],
    [-300, 3230],
    [200, 3200],
    [700, 3220],
    [1200, 3240],
    [1700, 3250],
    [2100, 3300],
    [2347.5, 3296.6],
  ],
  [
    [-686.4, 3169.5],
    [-880, 3450],
    [-1050, 3750],
    [-1120, 4050],
    [-1120, 4300],
    [-1128, 4440],
    [-1150, 4545],
  ],
];

/**
 * Reflector poles along the strait's roads (owner, 2026-11-12, the road safety pole download):
 * on both verges every 50 m, as on a rural highway, and every 16 m on the outside of the
 * tighter bends (radius under about 170 m). 1 m off the 7 m road's edge, square to it; never
 * on a bridge or its approach, in the water, at a junction's mouth (nearer another road than
 * its own) or on anything already placed. No collision: they are markers, not cover.
 */
function straitRoadPoles(out: Placement[], ctx: Context) {
  const { meta } = ctx;
  const placed = placementGrid(out, 30);
  const near = (x: number, z: number, line: Array<[number, number]>) => {
    let best = Infinity;
    for (let i = 0; i + 1 < line.length; i++) {
      const [ax, az] = line[i]!,
        [bx, bz] = line[i + 1]!;
      const dx = bx - ax,
        dz = bz - az;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
      best = Math.min(best, Math.hypot(ax + dx * t - x, az + dz * t - z));
    }
    return best;
  };
  const strait = (x: number, z: number) => STRAIT_LINES.some((l) => near(x, z, l) < 25);
  const OFF = 3.5 + 1;
  for (const road of meta.roads) {
    const P = road.points;
    if (P.length < 2 || ![0, P.length >> 1, P.length - 1].every((i) => strait(...P[i]!))) continue;
    const cum = [0];
    for (let i = 1; i < P.length; i++)
      cum.push(cum[i - 1]! + Math.hypot(P[i]![0] - P[i - 1]![0], P[i]![1] - P[i - 1]![1]));
    const total = cum[cum.length - 1]!;
    const at = (s: number) => {
      let i = 0;
      while (i + 2 < P.length && cum[i + 1]! < s) i++;
      const [ax, az] = P[i]!,
        [bx, bz] = P[i + 1]!;
      const len = cum[i + 1]! - cum[i]! || 1;
      const t = Math.max(0, Math.min(1, (s - cum[i]!) / len));
      return {
        x: ax + (bx - ax) * t,
        z: az + (bz - az) * t,
        ux: (bx - ax) / len,
        uz: (bz - az) / len,
      };
    };
    let lastBend = -Infinity;
    for (let s = 8; s < total - 8; s += 8) {
      const a = at(Math.max(0, s - 15)),
        b = at(Math.min(total, s + 15)),
        c = at(s);
      // Signed turn over 30 m (left positive) and whether this is a regular 50 m post.
      const turnRad = Math.atan2(a.ux * b.uz - a.uz * b.ux, a.ux * b.ux + a.uz * b.uz);
      const bend = Math.abs(turnRad) / 30 > 0.006;
      const regular = Math.floor(s / 50) !== Math.floor((s - 8) / 50);
      if (!regular && !(bend && s - lastBend >= 16)) continue;
      if (bend) lastBend = s;
      // The normal to the left of travel; the outside of a left bend is the right verge.
      const lx = -c.uz,
        lz = c.ux;
      const sides = regular ? [1, -1] : [turnRad > 0 ? -1 : 1];
      for (const side of sides) {
        const x = c.x + lx * side * OFF,
          z = c.z + lz * side * OFF;
        const y = ctx.heightAt(x, z);
        if (underwater(meta, x, z, y) || bridgeDistance(meta, x, z) < 30) continue;
        if (roadDistance(meta, x, z, 8) < OFF - 0.3) continue;
        if (
          placed.some(x - 0.6, z - 0.6, x + 0.6, z + 0.6, (p) => {
            const [w, d] = footAt(p.model, p.turn);
            return Math.abs(p.x - x) < 0.5 + w / 2 && Math.abs(p.z - z) < 0.5 + d / 2;
          })
        )
          continue;
        out.push({
          model: "road-pole",
          x: +x.toFixed(2),
          y: +y.toFixed(2),
          z: +z.toFixed(2),
          turn: facing(c.ux, c.uz),
          poi: "strait-roadside",
        });
      }
    }
  }
}

/**
 * Highway stops along the mainland's and the island's roads (owner, 2026-11-12: "audit the rest
 * of the map if any gas station / motel can be placed out along the road to look more realistic
 * to fill out the map"). The audit (docs: claude/highway-stops-2026-11-12.md) walked every road
 * outside the towns (200 m clear of a town's streets, 250 m beyond a place's core), off the
 * bridges, on stretches within 25° of a compass axis (the buildings turn by quarter turns and
 * face the road square), and kept the spots beside the road flat enough for each building as
 * its fit-out needs it (the motor court 0.15 m, the motel 0.25 m, the filling station 0.3 m),
 * clear of everything placed and of other roads, 1.4 km or more apart and from the strait's
 * stops. Each stop here is the audit's spot (a point on the road and the side the building
 * stands on); the building is searched for along the road within 150 m of it, as the strait's
 * stops are. A filling station (art/br/fitout/highway.py), a motor court with its pumps
 * (motorcourt.py) or a motel with its pole sign (roadside.py), all enterable, some paired; each
 * with its lot paved out to the road (pavedLots), cars on it and a payphone.
 */
const HIGHWAY_STOPS: Array<{
  at: [number, number];
  /** The side of the road the stop stands on (a direction off it, world x, z). */
  side: [number, number];
  kinds: Array<"gas" | "court" | "motel">;
}> = [
  // Prison road east of the river crossing, towards Riverwood.
  { at: [1143.7, 169.5], side: [0, -1], kinds: ["motel", "gas"] },
  // Between Northfield and the Central Hospital.
  { at: [1658.3, -1730.2], side: [1, 0], kinds: ["court"] },
  // The island's north road towards the airfield.
  { at: [2838.2, 3376.5], side: [0, -1], kinds: ["motel"] },
  // Between the hospital's hills and Eastport.
  { at: [3110.6, -1415.3], side: [0, 1], kinds: ["court", "gas"] },
  // Bayview to Millhaven.
  { at: [-3544.3, -1630.1], side: [0, 1], kinds: ["gas"] },
  // The island's west road (the west bridge's island end towards West Point).
  { at: [-1135.3, 4474.0], side: [1, 0], kinds: ["gas"] },
  // Northstar Town to Iron Peaks.
  { at: [-1533.2, -3384.3], side: [0, -1], kinds: ["gas"] },
  // The island's east road past the Superstore.
  { at: [1399.0, 3760.0], side: [0, -1], kinds: ["gas"] },
  // The quarry's north road.
  { at: [3767.9, -4081.2], side: [0, 1], kinds: ["gas"] },
  // West of the Southern Military Base.
  { at: [135.6, 1474.6], side: [1, 0], kinds: ["gas"] },
];

function highwayStops(out: Placement[], ctx: Context) {
  const { meta } = ctx;
  const { put } = siteKit(ctx, out);
  const poi = "highway-stops";
  // Each kind: its model, how far its centre stands off the road (the lot in front), its
  // tolerance for uneven ground and how far round it that is sampled (fit-outs: floors and
  // sills), and the length of road it takes.
  const KIND = {
    gas: { model: "roadside-gas", offs: [20, 22.5, 25], rough: 0.28, apron: 1.5, span: 13 },
    court: { model: "modular-motel", offs: [18.5, 21, 24], rough: 0.15, apron: 1.5, span: 24.5 },
    motel: { model: "roadside-motel", offs: [22, 24, 26], rough: 0.25, apron: 2.5, span: 37 },
  } as const;
  for (const stop of HIGHWAY_STOPS) {
    const start = roadNearest(meta, stop.at[0], stop.at[1], 40);
    if (start.d >= 40) continue;
    let along = 0;
    for (const kind of stop.kinds) {
      const k = KIND[kind];
      let placed: Placement | null = null;
      // Out from the stop's spot along the road both ways (or, for a stop's second building,
      // on from the first), 10 m at a time.
      const tries =
        along === 0
          ? [
              0, 10, -10, 20, -20, 30, -30, 40, -40, 60, -60, 80, -80, 100, -100, 125, -125, 150,
              -150,
            ]
          : [
              along,
              along + 10,
              along + 20,
              along + 30,
              -along,
              -along - 10,
              -along - 20,
              -along - 30,
            ];
      search: for (const s of tries)
        for (const off of k.offs) {
          const r = roadNearest(meta, start.px + start.ux * s, start.pz + start.uz * s, 40);
          if (r.d >= 40) continue;
          let nx = -r.uz,
            nz = r.ux;
          if (nx * stop.side[0] + nz * stop.side[1] < 0) [nx, nz] = [-nx, -nz];
          const x = r.px + nx * off,
            z = r.pz + nz * off;
          const turn = facing(-nx, -nz);
          if (!put(k.model, x, z, turn, { poi, rough: k.rough, apron: k.apron, gap: 2 })) continue;
          placed = out[out.length - 1]!;
          along = Math.abs(s) + k.span / 2 + 18;
          const at = (o: number, t: number) =>
            [r.px + nx * o + r.ux * t, r.pz + nz * o + r.uz * t] as const;
          if (kind === "court") {
            for (const lx of [-10.35, -8.85]) {
              const [dx, dz] = turnXZ(lx, 2.1, turn);
              out.push({
                model: "fuel-dispenser",
                x: +(x + dx).toFixed(2),
                y: +(placed.y + 0.18).toFixed(2),
                z: +(z + dz).toFixed(2),
                turn,
                poi,
              });
            }
            const [px, pz] = turnXZ(13.6, 1.2, turn);
            put("payphone-booth", x + px, z + pz, turn, { poi, gap: 0.2, rough: 2 });
          } else if (kind === "motel") {
            put("motel-sign", ...at(9.5, 14), facing(nx, nz), { poi, gap: 0.3, rough: 3 });
            put("payphone-booth", ...at(off - 10.4, 16.2), turn, { poi, gap: 0.2, rough: 2 });
          } else {
            // A payphone by the shop's west side.
            const [px, pz] = turnXZ(-8.2, -2.5, turn);
            put("payphone-booth", x + px, z + pz, turn, { poi, gap: 0.2, rough: 2 });
          }
          parkOnLot(ctx, put, out, placed);
          break search;
        }
      if (!placed) break;
    }
  }
}

/**
 * A paved lot's surface height at a cell corner (pavedLots; the structures renderer lays the
 * cells): the highest of the ground there and half a metre off diagonally, 10 cm up. A function
 * of the position alone, so neighbouring cells share their corners with no seam; it follows the
 * ground (a ditch by the road dips under it rather than being bridged), and no crest within a
 * 2 m cell pokes through.
 */
export function lotHeight(heightAt: (x: number, z: number) => number, x: number, z: number) {
  return (
    Math.max(
      heightAt(x, z),
      heightAt(x - 0.5, z - 0.5),
      heightAt(x + 0.5, z - 0.5),
      heightAt(x - 0.5, z + 0.5),
      heightAt(x + 0.5, z + 0.5),
    ) + 0.1
  );
}

/**
 * The roadside stops' asphalt (owner, 2026-11-12: "add some asphalt road to the houses/gas
 * station so it's not randomly on grass"): each motel's front paved from its front wall (the
 * motor court's canopy keeps its concrete apron) out to its road, the full width of the
 * building, in 2 m cells laid on the ground by the structures renderer with the roads' asphalt.
 * Each cell as its four corners' (x, z), world metres. Render only: the ground under it is the
 * terrain (it rides 10 cm above it, lotHeight).
 */
export function pavedLots(layout: Placement[], meta: WorldMeta): number[][] {
  const LOTS: Record<string, Array<{ x0: number; x1: number; from: number }>> = {
    // From the front sidewalk pad's edge (z 8.51).
    "roadside-motel": [{ x0: -18.5, x1: 18.5, from: 8.6 }],
    // In front of the cabin block and between it and the reception from the walls' line; in
    // front of the canopy from its edge (its apron is concrete).
    "modular-motel": [
      { x0: -5.3, x1: 12.4, from: 2.1 },
      { x0: -12.4, x1: -5.3, from: 5.5 },
    ],
    // The filling station's forecourt from its sidewalk's edge (z 3.65), under its roof round
    // the pump island and out to the road, a car's width either side of the building.
    "roadside-gas": [{ x0: -9.4, x1: 9.4, from: 3.7 }],
  };
  const CELL = 2;
  const cells: number[][] = [];
  for (const p of layout) {
    const lots = LOTS[p.model];
    if (!lots || (p.poi !== "strait-roadside" && p.poi !== "highway-stops")) continue;
    const w = (lx: number, lz: number) => {
      const [dx, dz] = turnXZ(lx, lz, p.turn);
      return [p.x + dx, p.z + dz] as const;
    };
    for (const { x0, x1, from } of lots) {
      const n = Math.round((x1 - x0) / CELL);
      for (let i = 0; i < n; i++) {
        const a = x0 + ((x1 - x0) * i) / n,
          b = x0 + ((x1 - x0) * (i + 1)) / n;
        // Out from the building until the cell reaches the road (its 7 m carriageway).
        for (let z = from; z < from + 40; z += CELL) {
          const [cx, cz] = w((a + b) / 2, z + CELL / 2);
          const d = roadDistance(meta, cx, cz, 12);
          cells.push([...w(a, z), ...w(b, z), ...w(b, z + CELL), ...w(a, z + CELL)]);
          if (d < 3.5 + CELL) break;
        }
      }
    }
  }
  return cells;
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
    const deckAt = (t: number) => deckHeight(b, ha, hb, t);
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
      const car = hash(k, Math.round(ax)) < 0.5 ? "car-sedan" : "car-pickup";
      // Its corners inside the rail (0.35 m) on a deck up to 20° off the axis: half its width
      // across, and its skewed length's share.
      const [len, wide] = FOOT[car]!;
      const skew = Math.min(Math.abs(dir[0]), Math.abs(dir[1])),
        straight = Math.max(Math.abs(dir[0]), Math.abs(dir[1]));
      const reach = (wide / 2) * straight + (len / 2) * skew;
      if (alongX || alongZ)
        put(
          car,
          t,
          s * Math.min(half - 1.7, half - 0.35 - reach - 0.15),
          // Lengthwise on the deck (a car's length is along x at turn 0: the turn was the other
          // way round, and every bridge's cars stood across a lane with their ends through
          // the rail, owner 2026-11-11: "a car stuck in the bridge at the dam").
          alongX ? 0 : 1,
        );
      // Jersey rows (each block 2 m long, quarter-turned along the nearer axis).
      const turn: Placement["turn"] = Math.abs(dir[0]) > Math.abs(dir[1]) ? 1 : 0;
      for (let j = 0; j < 3; j++)
        put("jersey", t + (12 + j * 2.1) / length, -s * (half - 1.1), turn);
    }
  }
}
