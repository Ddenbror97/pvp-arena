import type { Placement } from "./layout";

/**
 * The island's parked vehicles from Comrade1280's passenger and civil-service packs
 * (vehicles-v1, 2026-11-23). The sedan, pickup and cop cruiser, the taxi, the ambulance, the tow
 * truck and the box truck had been reduced to 13–17 % of their triangles and drew with hanging
 * bumpers and sunken, leaning wheels; and two models made up most of every street (owner,
 * 2026-11-23: "audit all veicels. some are broken like this taxi … spread them around the map,
 * replace broken cars. make the world poolished").
 *
 * Every placement of a replaced model takes one of the new ones, chosen from where it stands, so
 * the render and the server's world agree and a street holds a mix. Like the cars they replace,
 * they lie along x with the nose at +x, so a placement keeps its turn.
 */

/** Footprints, length × width (m), for layout's clearances. */
export const PARKED_FOOT: Record<string, [number, number]> = {
  "pc-sedan-silver": [4.5, 2.0],
  "pc-sedan-white": [4.5, 2.0],
  "pc-sedan-navy": [4.5, 2.0],
  "pc-sedan-maroon": [4.5, 2.0],
  "pc-wagon": [4.5, 2.0],
  "pc-wagon-silver": [4.5, 2.0],
  "pc-hatchback-red": [4.1, 1.8],
  "pc-hatchback-white": [4.1, 1.8],
  "pc-hatchback-grey": [4.1, 1.8],
  "pc-compact-beige": [3.4, 1.7],
  "pc-compact-red": [3.4, 1.7],
  "pc-compact-silver": [3.4, 1.7],
  "pc-coupe": [4.3, 2.0],
  "pc-coupe-black": [4.3, 2.0],
  "pc-minivan": [4.7, 2.0],
  "pc-minivan-white": [4.7, 2.0],
  "pc-sport": [4.0, 1.9],
  "pc-pickup": [5.3, 2.2],
  "pc-pickup-white": [5.3, 2.2],
  "pc-pickup-grey": [5.3, 2.2],
  "pc-suv": [4.7, 2.2],
  "pc-offroad": [4.0, 2.1],
  "pc-offroad-beige": [4.0, 2.1],
  "civ-taxi": [5.2, 2.1],
  "civ-police": [5.3, 2.1],
  "civ-ambulance": [7.0, 2.7],
  "civ-tow": [7.0, 2.5],
  "civ-postvan": [5.4, 2.3],
  "civ-service": [5.4, 2.3],
  "civ-garbage": [7.8, 2.7],
  "civ-citybus": [10.0, 2.6],
  "civ-schoolbus": [8.0, 2.6],
  "civ-firetruck": [7.4, 2.4],
};

type Pool = Array<[string, number]>;
const each = (ids: string[], w: number): Pool => ids.map((id) => [id, w]);
const SEDANS = ["pc-sedan-silver", "pc-sedan-white", "pc-sedan-navy", "pc-sedan-maroon"];
const HATCHES = ["pc-hatchback-red", "pc-hatchback-white", "pc-hatchback-grey"];
const COMPACTS = ["pc-compact-beige", "pc-compact-red", "pc-compact-silver"];
const PICKUPS = ["pc-pickup", "pc-pickup-white", "pc-pickup-grey"];

/** Town cars: mostly saloons, hatchbacks and small cars, some estates, MPVs and pickups. */
const TOWN: Pool = [
  ...each(SEDANS, 2),
  ...each(HATCHES, 2),
  ...each(COMPACTS, 1.8),
  ...each(["pc-wagon", "pc-wagon-silver"], 1.4),
  ...each(["pc-coupe", "pc-coupe-black"], 1),
  ...each(["pc-minivan", "pc-minivan-white"], 1.4),
  ["pc-sport", 0.4],
  ...each(PICKUPS, 1),
  ["pc-suv", 1.2],
  ...each(["pc-offroad", "pc-offroad-beige"], 0.6),
  ["civ-postvan", 0.4],
];
/** Where a pickup stood, and out in the country: bigger vehicles first. */
const TRUCKS: Pool = [
  ...each(PICKUPS, 2.5),
  ["pc-suv", 3],
  ...each(["pc-offroad", "pc-offroad-beige"], 2),
  ...each(["pc-minivan", "pc-minivan-white"], 1.2),
  ...each(["pc-wagon", "pc-wagon-silver"], 1),
  ...each(SEDANS, 0.8),
  ["civ-service", 0.6],
];
const COUNTRY: Pool = [
  ...each(PICKUPS, 2.5),
  ...each(["pc-offroad", "pc-offroad-beige"], 2),
  ["pc-suv", 1.5],
  ...each(["pc-wagon", "pc-wagon-silver"], 1.2),
  ...each(SEDANS, 1),
  ...each(HATCHES, 0.8),
  ...each(COMPACTS, 0.6),
  ["pc-minivan", 0.8],
];
/** The estates, Skyline and the gateway: the better cars. */
const SMART: Pool = [
  ["pc-sport", 2],
  ...each(["pc-coupe", "pc-coupe-black"], 2),
  ["pc-suv", 2],
  ...each(["pc-sedan-silver", "pc-sedan-white", "pc-sedan-navy"], 1.5),
  ["pc-wagon-silver", 1],
  ["pc-minivan-white", 1],
];
const VANS: Pool = [
  ["civ-postvan", 1],
  ["civ-service", 1],
];
const WORKS: Pool = [
  ["civ-service", 1],
  ["civ-garbage", 1],
  ["civ-postvan", 0.6],
];

const COUNTRY_POIS = /^(countryside|farm|northfield|redstone|pine|wild|rail)/;
const SMART_POIS = /^(estate|skyline|downtown-gateway|pool|villa)/;
const WORKS_POIS = /^(east-works|east-yards|redstone)/;

/** Deterministic 0..1 from a position and a salt. */
function unit(x: number, z: number, salt: number) {
  let h = Math.imul(Math.round(x * 10) ^ 0x9e3779b1, 0x85ebca6b);
  h ^= Math.imul(Math.round(z * 10) + salt * 0x27d4eb2f, 0xc2b2ae35);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  return (h >>> 0) / 4294967296;
}

function pick(pool: Pool, r: number) {
  const total = pool.reduce((s, [, w]) => s + w, 0);
  let t = r * total;
  for (const [id, w] of pool) if ((t -= w) < 0) return id;
  return pool[pool.length - 1]![0];
}

/** The replacement for a placement of `model`, or null to keep it. */
export function parkedCar(p: Placement, nearPolice: boolean): string | null {
  const r = unit(p.x, p.z, 1),
    r2 = unit(p.x, p.z, 2);
  const country = COUNTRY_POIS.test(p.poi);
  switch (p.model) {
    case "car-sedan":
      return pick(SMART_POIS.test(p.poi) ? SMART : country ? COUNTRY : TOWN, r);
    case "car-pickup":
      return pick(country ? COUNTRY : TRUCKS, r);
    case "car-cruiser":
      // Outside a police station, and one car in five in a car park: a patrol car.
      return nearPolice || r2 < 0.2 ? "civ-police" : pick(TOWN, r);
    case "taxi":
      return "civ-taxi";
    case "ambulance":
      return "civ-ambulance";
    case "tow-truck":
      return "civ-tow";
    case "box-truck":
      return pick(WORKS_POIS.test(p.poi) ? WORKS : VANS, r);
    case "town-bus":
      return "civ-citybus";
    case "school-bus":
      // The rusty one stays for the abandoned stops; half the town buses are kept ones.
      return country || r2 < 0.5 ? null : "civ-schoolbus";
    case "fire-truck":
      return p.poi === "central-hospital" ? "civ-firetruck" : null;
    default:
      return null;
  }
}

/** Swaps every replaced vehicle in the layout for its new model, in place. */
export function swapParkedCars(out: Placement[]) {
  const stations = out.filter((p) => p.model === "police-station");
  const ambulances: Placement[] = [];
  for (const p of out) {
    if (!REPLACED.has(p.model)) continue;
    const nearPolice = stations.some((s) => Math.hypot(s.x - p.x, s.z - p.z) < 45);
    let to = parkedCar(p, nearPolice);
    // The new ambulance is 7 m long where the old one was 5: of a pair parked nose to tail
    // (the hospital's bay, 6.4 m apart), the second is the paramedics' service truck.
    if (to === "civ-ambulance") {
      if (ambulances.some((a) => Math.hypot(a.x - p.x, a.z - p.z) < 7.2)) to = "civ-service";
      else ambulances.push(p);
    }
    if (to) p.model = to;
  }
  // A pair the old, shorter-nosed cars fitted (the hospital lots' facing pairs, 4 m apart)
  // can meet: both become small cars.
  const cell = new Map<string, Placement[]>();
  const key = (x: number, z: number) => `${Math.floor(x / 10)}:${Math.floor(z / 10)}`;
  const rect = (p: Placement) => {
    const [l, w] = PARKED_FOOT[p.model]!;
    const [hx, hz] = p.turn % 2 ? [w / 2, l / 2] : [l / 2, w / 2];
    return [p.x - hx, p.z - hz, p.x + hx, p.z + hz];
  };
  for (const p of out) {
    if (!(p.model in PARKED_FOOT)) continue;
    const near: Placement[] = [];
    for (let i = -1; i <= 1; i++)
      for (let j = -1; j <= 1; j++) near.push(...(cell.get(key(p.x + i * 10, p.z + j * 10)) ?? []));
    for (const q of near) {
      const a = rect(p),
        b = rect(q);
      if (
        a[0]! < b[2]! - 0.15 &&
        a[2]! > b[0]! + 0.15 &&
        a[1]! < b[3]! - 0.15 &&
        a[3]! > b[1]! + 0.15
      ) {
        p.model = COMPACTS[Math.floor(unit(p.x, p.z, 3) * 3)]!;
        q.model = COMPACTS[Math.floor(unit(q.x, q.z, 3) * 3)]!;
      }
    }
    const k = key(p.x, p.z);
    cell.set(k, [...(cell.get(k) ?? []), p]);
  }
}

export const REPLACED = new Set([
  "car-sedan",
  "car-pickup",
  "car-cruiser",
  "taxi",
  "ambulance",
  "tow-truck",
  "box-truck",
  "town-bus",
  "school-bus",
  "fire-truck",
]);
