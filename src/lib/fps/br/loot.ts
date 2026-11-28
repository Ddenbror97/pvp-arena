import { waterSurface } from "./drop";
import type { Loose } from "./inventory";
import { ITEMS, RARITY, type Category, type ItemId, type Rarity, type WeaponDef } from "./items";
import type { Placement } from "./layout";
import { modelSpots, turnPoint, indoorLootPoint, walledLootPoint } from "./loot-spots";
import type { CollisionData, StaticWorld } from "./static-world";
import type { WorldMeta } from "./world";

/**
 * Per-match loot (LOOT-SPEC §2, §4, §5): the server rolls it from the match seed at match
 * creation; clients only ever receive what the server placed. All tuning is in LOOT below:
 * which models hold loot and how (location class), how dense each class is, what categories
 * and rarities it favours, quantities and the per-match caps on the strongest items. Nothing
 * is per building: a building's class and its walkable floors (loot-spots.ts) decide.
 */
export type LootClass = "residential" | "city" | "warehouse" | "military" | "vehicle";

type LootMode = "indoor" | "walled" | "open" | "tops" | "beside";
const MODEL_CLASS: Record<string, { cls: LootClass; mode: LootMode; max: number }> = {};
const put = (cls: LootClass, mode: LootMode, max: number, ids: string[]) => {
  for (const id of ids) MODEL_CLASS[id] = { cls, mode, max };
};
put("residential", "indoor", 6, [
  "house",
  "rural-house",
  "cabin",
  "rural-wood-1",
  "rural-wood-4",
  "rural-mobile-home",
  "rural-trailer",
  "barn",
]);
put("residential", "indoor", 3, ["shed", "garage"]);
// The procedural interiors (owner, 2026-11-04: houses "the user can enter them and find loot"):
// flats on every floor, the townhouse shop and flat, the bungalow's rooms.
put("residential", "indoor", 16, ["apartment"]);
// The Bauhaus block (procedural since 2026-11-15: four storeys of real rooms, where the old shell
// had a few): 94 of them, so fewer items each (the room checkpoint stays under its 1.5 MB).
put("residential", "indoor", 11, ["bauhaus-block"]);
put("residential", "indoor", 6, ["bungalow", "old-barn"]);
put("city", "indoor", 6, ["church"]);
put("city", "indoor", 8, ["townhouse"]);
put("city", "indoor", 12, ["strip-mall"]);
// The police station: lobby, cells, armoury and offices (weapons-heavy, like the military).
put("military", "indoor", 10, ["police-station"]);
// The mast's platform: a rifle and scope worth the climb.
put("military", "indoor", 2, ["sniper-mast"]);
put("city", "indoor", 8, [
  "brick-shop",
  "rural-store-1",
  "rural-store-3",
  "rural-store-5",
  "rural-diner",
  "abandoned-building",
  "fire-station",
]);
put("city", "indoor", 40, ["superstore"]);
// The Superstore's fit-out (sales floor, stockroom, mezzanine) and the island airfield's terminal.
put("city", "indoor", 60, ["superstore-interior"]);
// (The procedural terminal, both of them, since 2026-11-22; the old download is no longer placed.)
put("city", "indoor", 14, ["terminal", "air-terminal"]);
put("warehouse", "indoor", 12, [
  "warehouse",
  "ind-warehouse-1",
  "ind-warehouse-3",
  "ind-building-1",
  "ind-building-10",
  "ind-factory",
  "ind-generic-2",
  "ind-hangar",
  "ind-terminal",
  "rural-quonset",
  "hangar",
  // The procedural hangars (in place of "hangar" since 2026-11-22, and the flight lines').
  "air-hangar",
  "mil-hangar",
]);
put("warehouse", "indoor", 3, ["container-40", "container-20", "ind-office-trailer"]);
// The open country (wildlands, 2026-11-08): the hunters' ruined cabins are worth the detour.
put("residential", "indoor", 4, ["ruined-cabin", "log-cabin", "old-hut"]);
// The 2026-11-08 landmarks: the hospital's two floors, the school's classrooms and gym, the rail
// depot, the power station's switch house and the chapel.
// (The hospital rebuilt 2026-11-09: three floors, eight wards, five emergency bays and the roof.)
put("city", "indoor", 30, ["hospital"]);
// The mega hospital (2026-11-13): the main block, the wings and the emergency department, three
// and two floors of rooms each (the old block above is no longer placed).
// Raised 2026-11-13 (owner: "bigger nighberhoods = more loot like hospital, military base,
// superstore"): the four blocks drew 127 items a match between them, fewer than a village.
put("city", "indoor", 90, ["hosp-main"]);
put("city", "indoor", 64, ["hosp-west", "hosp-east"]);
put("city", "indoor", 50, ["hosp-er"]);
// Skyline Residences (2026-11-13): every residential storey of the two towers (two apartments
// and the sky lounge), the lobbies, the roofs, the clubhouse. Luxury flats: city loot, a
// little on every floor so the climb pays.
// (Five a floor since Downtown's 2026-11-14 expansion: 16 towers there, ~200 floors; at nine a
// floor the ground loot outgrew the room's checkpoint.)
put("city", "indoor", 5, ["condo-floor", "office-floor", "brick-floor"]);
// The Arena District (2026-11-14): the arena's two concourses and rooms, the station.
put("city", "indoor", 110, ["arena"]);
put("city", "indoor", 16, ["rail-station"]);
put("city", "indoor", 8, ["condo-lobby", "condo-club", "office-lobby", "brick-lobby"]);
put("military", "indoor", 4, [
  "condo-roof-a",
  "condo-roof-b",
  "office-roof-a",
  "office-roof-b",
  "brick-roof-a",
  "brick-roof-b",
]);
// Millhaven's works halls (2026-11-09).
put("warehouse", "indoor", 5, ["factory-hall", "ind-warehouse-4", "ind-warehouse-5", "ind-smith"]);
put("city", "indoor", 16, ["school"]);
put("warehouse", "indoor", 6, ["rail-depot"]);
put("warehouse", "indoor", 3, ["brick-substation"]);
put("city", "indoor", 3, ["chapel"]);
put("military", "indoor", 22, ["military-hq", "hangar-j"]);
put("military", "indoor", 14, ["barracks"]);
put("military", "indoor", 3, ["guard-tower", "watchtower", "tent", "tent-large", "checkpoint"]);
// Blackwater Prison's cell houses (2026-11-09): the open cells on three tiers, the guard hall
// and the control floor (weapons-heavy, like the police station's armoury).
put("military", "indoor", 24, ["prison-block"]);
// Blackwater Prison's keep and watchtower (the flagship, 2026-11-14): four floors of cells,
// halls, the armoury and the control room round the courtyard; the tower's seven floors and
// its cab. The island's best single raid (military loot, like the cell houses).
put("military", "indoor", 150, ["bw-keep"]);
put("military", "indoor", 24, ["bw-tower"]);
// Southern Military Base's posts and Murder Cabins' camp cabins (2026-11-09).
put("military", "indoor", 16, ["command-post"]);
put("military", "indoor", 8, ["control-post"]);
put("residential", "indoor", 3, ["camp-cabin"]);
// The 2026-11-11 estates and the super yacht (art/br/fitout/estates.py): villas and modern
// houses on two floors; the yacht's salon and cabins hold a raid's worth (owner: "a super big
// yacht that the user can enter and find loot").
put("residential", "indoor", 10, ["pool-villa"]);
put("residential", "indoor", 8, ["modern-house"]);
put("military", "indoor", 12, ["lux-yacht"]);
// The coastal towns' houses (art/blender/br/build_coast.mjs, 2026-11-17): Fisher's Cove's
// harbour houses and chandlery, Bayview's villas, town houses, flats and beach club.
put("residential", "indoor", 6, [
  "cove-house-red",
  "cove-house-blue",
  "cove-house-white",
  "cove-house-orange",
  "bay-villa-white",
  "bay-villa-cream",
]);
put("residential", "indoor", 8, [
  "cove-house-yellow",
  "cove-house-salmon",
  "bay-townhouse-pink",
  "bay-townhouse-yellow",
]);
put("city", "indoor", 6, ["cove-house-green", "bay-beach-club"]);
put("residential", "indoor", 14, ["bay-apartments"]);
// The 2026-11-15 to 2026-11-18 locations had no loot (owner, 2026-11-22: "add loot to new
// locations, like fort, forgotten ruins, all new locations dont have any loot in them").
// The Old Fortress: the keep, the hall, the barracks and the casemates and cellars under the
// courtyard (fort-base) hold the most; the chapel and stables a little. The towers, the
// gatehouse and the walls are reached along the wall walks (the tops mode, 2026-11-23).
put("military", "indoor", 40, ["fort-base"]);
put("military", "indoor", 26, ["fort-keep"]);
put("military", "indoor", 20, ["fort-hall", "fort-barracks"]);
put("city", "indoor", 10, ["fort-chapel"]);
put("military", "indoor", 6, ["fort-stables"]);
put("military", "indoor", 4, ["fort-tower-sally"]);
put("military", "indoor", 2, ["fort-cellar-stair"]);
put("military", "tops", 8, ["fort-gatehouse"]);
put("military", "tops", 3, ["fort-tower-round", "fort-tower-square"]);
put("military", "tops", 1, [
  "fort-wall-24",
  "fort-wall-28",
  "fort-wall-28s",
  "fort-wall-32",
  "fort-wall-32g",
  "fort-wall-42",
  "fort-wall-62",
  "fort-wall-62s",
]);
// The Forgotten Ruins: roofless, so the open mode (rooms, terraces, stair heads, the tops):
// the great temple, the pyramid and the palace are the climbs worth the most.
put("military", "open", 20, ["ruin-great-temple"]);
put("military", "open", 14, ["ruin-pyramid", "ruin-palace"]);
put("military", "open", 10, ["ruin-acropolis"]);
put("military", "open", 6, ["ruin-tower"]);
put("city", "open", 6, ["ruin-temple-a", "ruin-temple-b"]);
put("city", "open", 4, ["ruin-arcade-a", "ruin-arcade-b", "ruin-arcade-c"]);
put("residential", "open", 3, ["ruin-house-a", "ruin-house-b"]);
put("residential", "open", 2, ["ruin-shrine"]);
// East Works: the halls and the boiler towers' floors; the chimney's storeys.
put("warehouse", "indoor", 24, ["ew-turbine-hall"]);
put("warehouse", "indoor", 12, ["ew-boiler-tower", "ew-control-house"]);
put("warehouse", "indoor", 10, ["ew-workshop"]);
put("military", "indoor", 6, ["ew-chimney"]);
// The island village and West Point (2026-11-15): cottages, the inn, shops, school, chapel.
put("residential", "indoor", 4, ["cottage-stone", "cottage-white", "cottage-wood"]);
put("residential", "indoor", 10, ["village-inn"]);
put("city", "indoor", 8, ["village-store", "schoolhouse"]);
put("city", "indoor", 6, ["bakery", "village-chapel"]);
put("military", "indoor", 8, ["coastguard-station"]);
// The airfield's passenger side and the base's new blocks (2026-11-15).
put("military", "indoor", 6, ["control-tower"]);
put("warehouse", "indoor", 10, ["crash-station"]);
put("military", "indoor", 14, ["barracks-2s", "mess-hall"]);
// Southern Military Base's new buildings (2026-11-23, build_garrison.mjs).
put("military", "indoor", 18, ["mb-armory"]);
put("military", "indoor", 16, ["mb-command-bunker", "mb-barracks-3s"]);
put("military", "indoor", 12, ["mb-ops-tower"]);
put("military", "indoor", 3, ["mb-pillbox"]);
// The rebuilt first towns' houses (2026-11-27, art/blender/br/towns: two to four storeys, a
// stair to every floor and a roof top on each): a little on every floor; the shops and the
// taverns city loot. Their towns' poiDensity below keeps the match's loot to its budget.
put("city", "indoor", 12, ["ns-main-street"]);
put("city", "indoor", 11, ["cr-motor-court", "mh-sawtooth-works"]);
put("city", "indoor", 10, ["mh-corner-tavern", "ns-corner-store"]);
put("city", "indoor", 9, ["cr-trading-post", "mh-garage-flats", "rw-boathouse", "rw-mercantile"]);
put("city", "indoor", 8, ["cr-feed-store"]);
put("residential", "indoor", 14, ["mh-block-flats"]);
put("residential", "indoor", 12, ["mh-mill-lofts"]);
put("residential", "indoor", 11, ["ns-garden-apartments", "rw-river-flats"]);
put("residential", "indoor", 10, ["ns-brick-walkup", "ns-mansard-flats"]);
put("residential", "indoor", 9, [
  "mh-container-flats",
  "mh-tenement",
  "ns-triple-decker",
  "rw-chalet",
  "rw-timber-lodge",
]);
put("residential", "indoor", 8, [
  "cr-adobe-courtyard",
  "cr-barn-lofts",
  "cr-hacienda",
  "cr-pueblo-terraces",
  "mh-dutch-duplex",
  "ns-fourplex",
  "ns-rowhouses",
  "ns-victorian",
  "rw-split-modern",
]);
put("residential", "indoor", 7, [
  "cr-desert-modern",
  "cr-foursquare",
  "cr-mission-house",
  "cr-ranch-two",
  "cr-stucco-duplex",
  "mh-foreman-house",
  "mh-gambrel-house",
  "ns-colonial",
  "ns-cottage-tower",
  "ns-saltbox",
  "rw-craftsman",
  "rw-log-house",
  "rw-lookout-house",
  "rw-stone-cottage",
]);
put("residential", "indoor", 6, [
  "mh-company-house",
  "mh-worker-row",
  "rw-cabin-duplex",
  "rw-mill-row",
]);
// The Quay and the harbours (2026-11-15).
put("city", "indoor", 8, ["customs-house", "harbour-office"]);
put("warehouse", "indoor", 10, ["fish-market"]);
put("warehouse", "indoor", 16, ["port-warehouse"]);
// The older roadside and town buildings that held none (2026-11-28, owner: "some buildings
// currently contain no loot"; the match checkpoint stores its loot in chunks since 2026-11-24,
// so its old 1.5 MB no longer keeps them empty): the motels' rooms, the diner, the showroom,
// the gas station's shop, the car wash's bays and the conservatory; the parking deck's levels
// (open: no ceiling on its top deck).
put("residential", "indoor", 8, ["roadside-motel"]);
put("residential", "indoor", 5, ["modular-motel"]);
put("residential", "indoor", 4, ["conservatory"]);
put("city", "indoor", 6, ["burger-joint", "car-showroom"]);
put("city", "indoor", 4, ["roadside-gas"]);
put("warehouse", "indoor", 6, ["car-wash"]);
put("city", "open", 8, ["parking-deck"]);
put("military", "walled", 4, ["lighthouse"]);
put("military", "indoor", 2, ["bridge-guardtower"]);
// Initial ground loot belongs inside buildings. Vehicles and outdoor props must not
// create roadside piles that look like misplaced house loot. Player drops/airdrops remain.

export const LOOT = {
  /** Chance that one loot spot holds an item. */
  density: { residential: 0.8, city: 0.8, warehouse: 0.75, military: 0.8, vehicle: 0.45 },
  /** At least this many pickups when a building has enough valid indoor positions. */
  minimumPerBuilding: 2,
  /**
   * More spots for each storey over a building's first (loot-spots.ts `upper`; owner 2026-11-28:
   * "add loot to accessible second floors and upper floors"): a model's `max` was for the whole
   * building, so a five-storey block's floors shared what a house's two did.
   */
  upperPerStorey: 1,
  /**
   * Roof tops a player walks up to (loot-spots.ts "roof"; owner 2026-11-28: "add loot to
   * accessible rooftops"): this many spots per building, one more for every `roofPer` of its
   * `max`, each holding loot `roofDensity` as often as a room's spot does (a roof is a bonus
   * worth the climb, not a second floor).
   */
  roofSpots: 1,
  roofPer: 16,
  roofDensity: 0.5,
  /**
   * Per-location scaling of the spot density (LOOT-SPEC §2.1). The grid towns hold hundreds of
   * buildings each (concept-map density), so each of their spots holds loot less often: the
   * towns still carry the most loot in total. The indoor minimum avoids empty small homes.
   */
  poiDensity: {
    // Raised 2026-11-11 (owner: "more loot in bigger houses/cities/neighbourhoods").
    // (Each 0.1 lower since 2026-11-22, Downtown 0.05 and the Arena District 0.05 too: the new
    // locations' loot took the match checkpoint over its 1.5 MB; the grid towns still hold the
    // most.)
    "northstar-town": 0.55,
    millhaven: 0.55,
    "island-superstore": 1.15,
    crossroads: 0.55,
    riverwood: 0.6,
    // Bayview and Fisher's Cove rebuilt (2026-11-17) with more enterable houses (Bayview's grid,
    // its seafront on the bluff, the cove's quay terrace and village): each spot holds loot less
    // often, so the two hold a little more than before in all and the match checkpoint stays
    // under its 1.5 MB (it went 0.5 % over at 0.8 and 1).
    bayview: 0.6,
    "bayview-seafront": 0.6,
    "fishers-cove": 0.6,
    northfield: 0.8,
    "southern-military-base": 1.25,
    // The island village and the airfield's cargo district grew by hundreds of buildings
    // (2026-11-08); the match checkpoint keeps every item (Durable Object values ≤ 2 MB).
    "island-village": 0.5,
    "island-airfield": 0.45,
    // Eastport, the east-coast harbour town (2026-11-11).
    eastport: 0.7,
    // The 2026-11-13 loot audit (owner: "bigger nighberhoods = more loot like hospital,
    // military base, superstore"): the big single sites above the towns' rate, so a raid
    // there pays more per building than a street of houses.
    "central-hospital": 1.2,
    skyline: 1.15,
    // Downtown (2026-11-13): a city core, its towers and blocks. 9 × 9 blocks and sixteen towers
    // since 2026-11-14: at the grid towns' rate (it still holds the most loot on the island; at
    // 1.05 it rolled 5,200 items, a quarter of the island's, past the checkpoint's budget).
    downtown: 0.4,
    // The Arena District (2026-11-14): the arena and its city blocks.
    stadium: 0.55,
    // The flagship (2026-11-14): "the place everyone wants to go".
    "blackwater-prison": 1.25,
    "east-works": 1.1,
    // The 2026-11-17 locations (loot since 2026-11-22): above the towns' rate, as the big sites.
    "old-fortress": 1.1,
    "forgotten-ruins": 1,
    "redstone-quarry": 1.05,
  } as Record<string, number>,
  /** Category weights per location class (LOOT-SPEC §5). */
  categories: {
    residential: {
      weapon: 14,
      ammo: 18,
      helmet: 9,
      vest: 9,
      plate: 13,
      heal: 22,
      backpack: 9,
      optic: 8,
      muzzle: 5,
      magazine: 5,
      grenade: 10,
      tablet: 0,
    },
    city: {
      weapon: 18,
      ammo: 18,
      helmet: 10,
      vest: 10,
      plate: 14,
      heal: 15,
      backpack: 9,
      optic: 10,
      muzzle: 6,
      magazine: 6,
      grenade: 11,
      tablet: 0.02,
    },
    warehouse: {
      weapon: 22,
      ammo: 30,
      helmet: 6,
      vest: 10,
      plate: 8,
      heal: 7,
      backpack: 9,
      optic: 8,
      muzzle: 5,
      magazine: 5,
      grenade: 10,
      tablet: 0.05,
    },
    military: {
      weapon: 24,
      ammo: 16,
      helmet: 12,
      vest: 12,
      plate: 20,
      heal: 7,
      backpack: 5,
      optic: 9,
      muzzle: 6,
      magazine: 6,
      grenade: 14,
      tablet: 0.25,
    },
    vehicle: {
      weapon: 10,
      ammo: 28,
      helmet: 4,
      vest: 4,
      plate: 14,
      heal: 26,
      backpack: 10,
      optic: 3,
      muzzle: 1,
      magazine: 1,
      grenade: 6,
      tablet: 0,
    },
  } satisfies Record<LootClass, Record<Category, number>>,
  /** Rarity weights per location class: higher tiers are rarer, military the best. */
  rarity: {
    residential: { common: 70, uncommon: 22, rare: 7, epic: 1 },
    city: { common: 60, uncommon: 27, rare: 10, epic: 3 },
    warehouse: { common: 60, uncommon: 27, rare: 10, epic: 3 },
    military: { common: 34, uncommon: 31, rare: 25, epic: 10 },
    vehicle: { common: 72, uncommon: 22, rare: 5, epic: 1 },
  } satisfies Record<LootClass, Record<Rarity, number>>,
  /** POI-wide category multipliers (the hospital is the medical location). */
  poiCategory: { "central-hospital": { heal: 3 } } as Record<
    string,
    Partial<Record<Category, number>>
  >,
  /**
   * Item weights within a category, on top of rarity (owner, 2026-11-04: more grenades, so the
   * fight grenades are found as often as smoke): ≈ 40 % HE, 33 % fire, 27 % smoke.
   */
  itemWeight: {
    "grenade-he": 1.2,
    "grenade-smoke": 0.8,
    // The MP5 (common) and Desert Eagle (2026-11-09): a share of the guns like a rifle's, not
    // the common tier's whole weight; their rounds less often than rifle rounds.
    mp5: 0.45,
    deagle: 0.8,
    "ammo-9mm": 0.7,
    "ammo-50ae": 0.5,
    // The SPAS-12 (2026-11-13): a share of the guns like the Deagle's; its shells like 9 mm.
    spas12: 0.8,
    "ammo-12g": 0.6,
    // Silencers, scopes and AWPs (owner, 2026-11-11: "can't find many of them"): within their
    // categories, ahead of the common red dot and flash hider.
    silencer: 1.0,
    "scope-4x": 1.8,
    "scope-6x": 1.6,
    "sight-red": 0.7,
    "flash-hider": 0.7,
    // Raised again 2026-11-13 (owner: "add more awp … spawns cross the map to be found");
    // 0.82 since the 2026-11-28 +12 % loot, so the match keeps about the same ≈ 71 AWPs.
    awp: 0.82,
    // The Hunting Rifle (2026-11-13: "a less rare sniper"): a rare-tier gun at 0.6, still about
    // one and a half times as often as the AWP after the AWP's raise above.
    hunting: 0.6,
  } as Partial<Record<ItemId, number>>,
  /**
   * Item weights per location class, on top of the above (owner, 2026-11-11: "i cant find any
   * awps in any normal house, increase that a bit"): houses' one-in-a-hundred epic tier made an
   * AWP in a house a rare find (about ten a match on the whole island); three times that.
   */
  classItem: { residential: { awp: 3, hunting: 1.4 } } as Partial<
    Record<LootClass, Partial<Record<ItemId, number>>>
  >,
  /**
   * Big buildings (this many loot spots or more: the superstore, the hospital, the school, the
   * big town houses and flats) roll guns, optics and muzzle devices more often, so a large
   * building is worth the search.
   */
  big: { spots: 10, categories: { weapon: 1.3, optic: 1.6, muzzle: 1.6, magazine: 1.6 } } as {
    spots: number;
    categories: Partial<Record<Category, number>>;
  },
  /** Most of these per match (LOOT-SPEC §4.2: no flood of top-tier gear). */
  caps: {
    // Raised 2026-11-11 with the weights above; still a ceiling, not the usual count.
    awp: 85,
    hunting: 120,
    "helmet-3": 12,
    "vest-3": 12,
    "backpack-3": 12,
    "scope-6x": 45,
    // Rare in the open world (owner, 2026-11-04); every airdrop carries one besides.
    tablet: 2,
    silencer: 90,
  } as Partial<Record<ItemId, number>>,
  /** AWPs at Iron Peaks' summit perches each match, besides the capped ones (perchCaches). */
  perchAwps: 4,
  /** Ammunition laid next to each weapon (LOOT-SPEC §15.1). */
  companionAmmo: {
    "ammo-rifle": 30,
    "ammo-sniper": 30,
    "ammo-9mm": 30,
    "ammo-50ae": 14,
    "ammo-12g": 16,
  } as Record<string, number>,
  spacing: 2.5,
} as const;

export type WorldItem = Loose & { id: number; x: number; y: number; z: number };

/** mulberry32: small, fast, seedable. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T extends string>(weights: Partial<Record<T, number>>, r: number): T {
  let total = 0;
  for (const w of Object.values(weights) as number[]) total += Math.max(0, w);
  let x = r * total;
  for (const [k, w] of Object.entries(weights) as Array<[T, number]>) {
    x -= Math.max(0, w);
    if (x < 0) return k;
  }
  return Object.keys(weights)[0] as T;
}

const BY_CATEGORY = new Map<Category, ItemId[]>();
for (const id of Object.keys(ITEMS) as ItemId[]) {
  const c = ITEMS[id].category;
  BY_CATEGORY.set(c, [...(BY_CATEGORY.get(c) ?? []), id]);
}

/** A placed spot after the world check: the support under it and room for the item. */
function settle(world: StaticWorld, meta: WorldMeta, x: number, y: number, z: number) {
  const ground = world.hf.heightAt(x, z);
  const top = world.supportAt(x, z, 0.15, Math.max(y, ground) + 0.4);
  if (top < y - 0.6) return null; // nothing under it (an edge): skip
  // The item's own middle on that floor, not just the edge of its disc (2026-11-28 loot audit:
  // ≈ 120 items a match hung over a stair's edge, a sill or a gap between two boxes).
  if (top - world.supportAt(x, z, 0.05, top + 0.05) > 0.08) return null;
  if (world.blocked(x, top + 0.05, z, 0.4, 0.15)) return null;
  const water = waterSurface(meta, ground, x, z);
  if (water !== null && top < water + 0.05) return null;
  return top;
}

/**
 * Roll one match's loot. Same seed, same island → same loot (tests, replays); a new match
 * seed → a different arrangement over the same valid spots.
 */
/** Loot spots per placement of the island (the placements live as long as the island). */
type LootSpot = { x: number; y: number; z: number; roof?: true };
const spotsOf = new WeakMap<Placement, LootSpot[]>();

/** The spot still lies in its room in the world (indoor: walls and a ceiling; walled: walls). */
function roomPoint(
  mode: LootMode,
  collision: CollisionData,
  model: string,
  x: number,
  y: number,
  z: number,
) {
  if (mode === "indoor") return indoorLootPoint(collision, model, x, y, z);
  if (mode === "walled") return walledLootPoint(collision, model, x, y, z);
  return true;
}

function placementSpots(
  p: Placement,
  info: (typeof MODEL_CLASS)[string],
  collision: CollisionData,
  world: StaticWorld,
  meta: WorldMeta,
) {
  let found = spotsOf.get(p);
  if (!found) {
    found = [];
    const rooms = modelSpots(
      collision,
      p.model,
      info.mode,
      LOOT.spacing,
      info.max,
      LOOT.upperPerStorey,
    );
    const roofs =
      info.mode === "indoor"
        ? modelSpots(
            collision,
            p.model,
            "roof",
            LOOT.spacing,
            LOOT.roofSpots + Math.floor(info.max / LOOT.roofPer),
          )
        : [];
    for (const [list, roof] of [
      [rooms, false],
      [roofs, true],
    ] as const)
      for (const s of list) {
        const [dx, dz] = turnPoint(s.x, s.z, p.turn);
        const x = +(p.x + dx).toFixed(2),
          z = +(p.z + dz).toFixed(2);
        const y = settle(world, meta, x, p.y + s.y, z);
        if (y === null) continue;
        if (roof) {
          // Open sky over it in the world too (no neighbour's floor or a tower over it).
          if (world.raycast(x, y + 0.3, z, 0, 1, 0, 30)) continue;
          found.push({ x, y, z, roof: true });
          continue;
        }
        if (!roomPoint(info.mode, collision, p.model, s.x, y - p.y, s.z)) continue;
        found.push({ x, y, z });
      }
    spotsOf.set(p, found);
  }
  return found;
}

/**
 * Find every building's loot spots ahead of the first match, one placement per step (a server
 * room awaits between steps): the first rollLoot then costs what every later one does.
 */
export function* warmLootSteps(
  layout: readonly Placement[],
  collision: CollisionData,
  world: StaticWorld,
  meta: WorldMeta,
): Generator<void, void, void> {
  for (const p of layout) {
    const info = MODEL_CLASS[p.model];
    if (!info) continue;
    placementSpots(p, info, collision, world, meta);
    yield;
  }
}

/** After warmLootSteps has cached the spots for this immutable layout, only the
 * companion-ammo room check consults model geometry on subsequent rolls. Use a new
 * collision object so build-only WeakMap caches can be collected with the original. */
export function warmedLootCollision(
  layout: readonly Placement[],
  collision: CollisionData,
): CollisionData {
  const models: CollisionData["models"] = {};
  for (const p of layout) {
    const info = MODEL_CLASS[p.model];
    if (!info) continue;
    if (!spotsOf.has(p)) throw new Error("Loot layout was not warmed");
    if (info.mode === "indoor" || info.mode === "walled")
      models[p.model] = collision.models[p.model]!;
  }
  return { voxel: collision.voxel, models };
}

export function rollLoot(
  seed: number,
  layout: readonly Placement[],
  collision: CollisionData,
  world: StaticWorld,
  meta: WorldMeta,
): WorldItem[] {
  const random = rng(seed ^ 0x51ed270b);
  const counts = new Map<ItemId, number>();
  const out: WorldItem[] = [];
  const add = (loose: Loose, x: number, y: number, z: number) =>
    out.push({ id: out.length, ...loose, x, y, z });
  for (const p of layout) {
    const info = MODEL_CLASS[p.model];
    if (!info) continue;
    // Buildings use reachable indoor floors only. A sealed building gets no hidden or
    // outdoor substitute loot. Outdoor vehicles/props have no initial loot class.
    const density = Math.min(0.95, LOOT.density[info.cls] * (LOOT.poiDensity[p.poi] ?? 1));
    const catMult = LOOT.poiCategory[p.poi];
    // Where this building can hold loot does not depend on the seed: found once per island
    // (it was 0.3 s of every match's creation), then copied, since the shuffle below reorders.
    const found = placementSpots(p, info, collision, world, meta);
    const candidates = found.slice();
    // Seeded shuffle spreads the guaranteed pickups across rooms and floors each match.
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j]!, candidates[i]!];
    }
    // The guaranteed pickups are indoors (the rooms' spots: a roof top is a bonus).
    let rooms = 0;
    for (let index = 0; index < candidates.length; index++) {
      const { x, y, z, roof } = candidates[index]!;
      const sure = !roof && rooms++ < LOOT.minimumPerBuilding;
      if (!sure && random() >= (roof ? density * LOOT.roofDensity : density)) continue;
      const cats = { ...LOOT.categories[info.cls] } as Record<Category, number>;
      if (catMult) for (const [c, m] of Object.entries(catMult)) cats[c as Category] *= m!;
      if (found.length >= LOOT.big.spots)
        for (const [c, m] of Object.entries(LOOT.big.categories)) cats[c as Category] *= m!;
      const category = pick(cats, random());
      const rarity = LOOT.rarity[info.cls];
      const choices = (BY_CATEGORY.get(category) ?? []).filter(
        (id) => (counts.get(id) ?? 0) < (LOOT.caps[id] ?? Infinity),
      );
      if (!choices.length) {
        if (sure) add({ item: "ammo-rifle", qty: 30 }, x, y, z);
        continue;
      }
      const weights: Partial<Record<ItemId, number>> = {};
      for (const id of choices)
        weights[id] =
          rarity[ITEMS[id].rarity] *
          (LOOT.itemWeight[id] ?? 1) *
          (LOOT.classItem[info.cls]?.[id] ?? 1);
      const item = pick(weights, random());
      counts.set(item, (counts.get(item) ?? 0) + 1);
      const d = ITEMS[item];
      const qty = "pickup" in d ? d.pickup : 1;
      if (d.category === "weapon") {
        const w = d as WeaponDef;
        add({ item, qty: 1, mag: w.magazine, optic: null, muzzle: null }, x, y, z);
        // Its ammunition beside it, when there is room on the same floor.
        const a = random() * Math.PI * 2;
        const ax = +(x + Math.cos(a) * 0.6).toFixed(2),
          az = +(z + Math.sin(a) * 0.6).toFixed(2);
        const ay = settle(world, meta, ax, y, az);
        const [lx, lz] = turnPoint(ax - p.x, az - p.z, (4 - p.turn) % 4);
        if (
          ay !== null &&
          Math.abs(ay - y) < 0.3 &&
          roomPoint(roof ? "open" : info.mode, collision, p.model, lx, ay - p.y, lz)
        )
          add({ item: w.ammo, qty: LOOT.companionAmmo[w.ammo] ?? 30 }, ax, ay, az);
      } else if ("durability" in d) add({ item, qty: 1, durability: d.durability }, x, y, z);
      else add({ item, qty }, x, y, z);
    }
  }
  perchCaches(seed, world, meta, counts, add);
  return out;
}

/**
 * Iron Peaks' sniper caches (owner, 2026-11-04 audit: "fun sniper mountains"): every match, three
 * of the summit perches (LOOT.perchAwps) hold an AWP with its ammunition (on top of the island's capped AWPs:
 * the mountain is where a sniper goes), the others a 4×/6× scope or sniper rounds. Their own
 * random stream: the rest of the roll is unchanged.
 */
function perchCaches(
  seed: number,
  world: StaticWorld,
  meta: WorldMeta,
  counts: Map<ItemId, number>,
  add: (loose: Loose, x: number, y: number, z: number) => void,
) {
  const perches = meta.perches ?? [];
  if (!perches.length) return;
  const random = rng(seed ^ 0x7e3a91c5);
  // Beside each perch's tower or nest, inside its rim of rocks; a perch with no floor there
  // holds nothing, so the AWPs are dealt among the perches that have one.
  const spots = perches.flatMap((p) => {
    const a0 = random() * Math.PI * 2;
    // Round the tower from there until a clear floor (a corner's stay or strut, a step):
    // eighth turns, so a summit is never left without its cache.
    for (let k = 0; k < 8; k++) {
      const a = a0 + (k * Math.PI) / 4;
      const x = +(p.x + Math.cos(a) * 6.5).toFixed(2),
        z = +(p.z + Math.sin(a) * 6.5).toFixed(2);
      const y = settle(world, meta, x, p.y + 0.5, z);
      if (y !== null) return [{ x, y, z }];
    }
    return [];
  });
  const awps = new Set<number>();
  while (awps.size < Math.min(LOOT.perchAwps, spots.length))
    awps.add(Math.floor(random() * spots.length));
  spots.forEach(({ x, y, z }, i) => {
    const ammo = (dx: number) => {
      const ay = settle(world, meta, x + dx, y, z);
      if (ay !== null) add({ item: "ammo-sniper", qty: 30 }, x + dx, ay, z);
    };
    if (awps.has(i)) {
      const w = ITEMS.awp as WeaponDef;
      add({ item: "awp", qty: 1, mag: w.magazine, optic: null, muzzle: null }, x, y, z);
      ammo(0.7);
      return;
    }
    const r = random();
    const scope: ItemId | null =
      r < 0.35
        ? "scope-4x"
        : r < 0.6 && (counts.get("scope-6x") ?? 0) < (LOOT.caps["scope-6x"] ?? Infinity)
          ? "scope-6x"
          : null;
    if (scope) {
      counts.set(scope, (counts.get(scope) ?? 0) + 1);
      add({ item: scope, qty: 1 }, x, y, z);
    } else ammo(0);
  });
}

/** For tests and the plan: how many of each item and rarity a roll produced. */
export function lootSummary(items: readonly WorldItem[]) {
  const byItem: Partial<Record<ItemId, number>> = {},
    byRarity: Record<Rarity, number> = { common: 0, uncommon: 0, rare: 0, epic: 0 };
  for (const i of items) {
    byItem[i.item] = (byItem[i.item] ?? 0) + 1;
    byRarity[ITEMS[i.item].rarity]++;
  }
  return { total: items.length, byItem, byRarity, rarityOrder: Object.keys(RARITY) };
}

export const lootClassOf = (model: string) => MODEL_CLASS[model]?.cls ?? null;
/** A model's loot class, spot mode and spot cap (audits and tests), or null. */
export const lootInfoOf = (model: string) => MODEL_CLASS[model] ?? null;
