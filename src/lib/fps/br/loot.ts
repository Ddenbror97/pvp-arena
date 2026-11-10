import { waterSurface } from "./drop";
import type { Loose } from "./inventory";
import { ITEMS, RARITY, type Category, type ItemId, type Rarity, type WeaponDef } from "./items";
import type { Placement } from "./layout";
import { modelSpots, turnPoint, indoorLootPoint } from "./loot-spots";
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

const MODEL_CLASS: Record<string, { cls: LootClass; mode: "indoor" | "beside"; max: number }> = {};
const put = (cls: LootClass, mode: "indoor" | "beside", max: number, ids: string[]) => {
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
put("residential", "indoor", 16, ["apartment", "bauhaus-block"]);
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
put("city", "indoor", 14, ["terminal"]);
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
]);
put("warehouse", "indoor", 3, ["container-40", "container-20", "ind-office-trailer"]);
// The open country (wildlands, 2026-11-08): the hunters' ruined cabins are worth the detour.
put("residential", "indoor", 4, ["ruined-cabin", "log-cabin", "old-hut"]);
// The 2026-11-08 landmarks: the hospital's two floors, the school's classrooms and gym, the rail
// depot, the power station's switch house and the chapel.
// (The hospital rebuilt 2026-11-09: three floors, eight wards, five emergency bays and the roof.)
put("city", "indoor", 30, ["hospital"]);
// Millhaven's works halls (2026-11-09).
put("warehouse", "indoor", 5, ["factory-hall", "ind-warehouse-4", "ind-warehouse-5", "ind-smith"]);
put("city", "indoor", 16, ["school"]);
put("warehouse", "indoor", 6, ["rail-depot"]);
put("warehouse", "indoor", 3, ["brick-substation"]);
put("city", "indoor", 3, ["chapel"]);
put("military", "indoor", 12, ["military-hq", "barracks", "hangar-j"]);
put("military", "indoor", 3, ["guard-tower", "watchtower", "tent", "tent-large", "checkpoint"]);
// Blackwater Prison's cell houses (2026-11-09): the open cells on three tiers, the guard hall
// and the control floor (weapons-heavy, like the police station's armoury).
put("military", "indoor", 24, ["prison-block"]);
// Southern Military Base's posts and Murder Cabins' camp cabins (2026-11-09).
put("military", "indoor", 10, ["command-post"]);
put("military", "indoor", 5, ["control-post"]);
put("residential", "indoor", 3, ["camp-cabin"]);
// Initial ground loot belongs inside buildings. Vehicles and outdoor props must not
// create roadside piles that look like misplaced house loot. Player drops/airdrops remain.

export const LOOT = {
  /** Chance that one loot spot holds an item. */
  density: { residential: 0.8, city: 0.8, warehouse: 0.75, military: 0.8, vehicle: 0.45 },
  /** At least this many pickups when a building has enough valid indoor positions. */
  minimumPerBuilding: 2,
  /**
   * Per-location scaling of the spot density (LOOT-SPEC §2.1). The grid towns hold hundreds of
   * buildings each (concept-map density), so each of their spots holds loot less often: the
   * towns still carry the most loot in total. The indoor minimum avoids empty small homes.
   */
  poiDensity: {
    "northstar-town": 0.55,
    millhaven: 0.55,
    "island-superstore": 1.15,
    crossroads: 0.55,
    riverwood: 0.6,
    bayview: 0.7,
    northfield: 0.7,
    "southern-military-base": 1.15,
    // The island village and the airfield's cargo district grew by hundreds of buildings
    // (2026-11-08); the match checkpoint keeps every item (Durable Object values ≤ 2 MB).
    "island-village": 0.45,
    "island-airfield": 0.4,
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
      optic: 6,
      muzzle: 3,
      magazine: 3,
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
      optic: 7,
      muzzle: 3,
      magazine: 3,
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
      optic: 5,
      muzzle: 3,
      magazine: 3,
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
      optic: 6,
      muzzle: 3,
      magazine: 3,
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
  } as Partial<Record<ItemId, number>>,
  /** Most of these per match (LOOT-SPEC §4.2: no flood of top-tier gear). */
  caps: {
    awp: 14,
    "helmet-3": 12,
    "vest-3": 12,
    "backpack-3": 12,
    "scope-6x": 10,
    // Rare in the open world (owner, 2026-11-04); every airdrop carries one besides.
    tablet: 2,
    silencer: 24,
  } as Partial<Record<ItemId, number>>,
  /** AWPs at Iron Peaks' summit perches each match, besides the capped ones (perchCaches). */
  perchAwps: 3,
  /** Ammunition laid next to each weapon (LOOT-SPEC §15.1). */
  companionAmmo: {
    "ammo-rifle": 30,
    "ammo-sniper": 30,
    "ammo-9mm": 30,
    "ammo-50ae": 14,
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
const spotsOf = new WeakMap<Placement, Array<{ x: number; y: number; z: number }>>();

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
    let found = spotsOf.get(p);
    if (!found) {
      found = [];
      for (const s of modelSpots(collision, p.model, info.mode, LOOT.spacing, info.max)) {
        const [dx, dz] = turnPoint(s.x, s.z, p.turn);
        const x = +(p.x + dx).toFixed(2),
          z = +(p.z + dz).toFixed(2);
        const y = settle(world, meta, x, p.y + s.y, z);
        if (y === null) continue;
        if (info.mode === "indoor" && !indoorLootPoint(collision, p.model, s.x, y - p.y, s.z))
          continue;
        found.push({ x, y, z });
      }
      spotsOf.set(p, found);
    }
    const candidates = found.slice();
    // Seeded shuffle spreads the guaranteed pickups across rooms and floors each match.
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j]!, candidates[i]!];
    }
    const minimum = Math.min(LOOT.minimumPerBuilding, candidates.length);
    for (let index = 0; index < candidates.length; index++) {
      if (index >= minimum && random() >= density) continue;
      const { x, y, z } = candidates[index]!;
      const cats = { ...LOOT.categories[info.cls] } as Record<Category, number>;
      if (catMult) for (const [c, m] of Object.entries(catMult)) cats[c as Category] *= m!;
      const category = pick(cats, random());
      const rarity = LOOT.rarity[info.cls];
      const choices = (BY_CATEGORY.get(category) ?? []).filter(
        (id) => (counts.get(id) ?? 0) < (LOOT.caps[id] ?? Infinity),
      );
      if (!choices.length) {
        if (index < minimum) add({ item: "ammo-rifle", qty: 30 }, x, y, z);
        continue;
      }
      const weights: Partial<Record<ItemId, number>> = {};
      for (const id of choices) weights[id] = rarity[ITEMS[id].rarity] * (LOOT.itemWeight[id] ?? 1);
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
          (info.mode !== "indoor" || indoorLootPoint(collision, p.model, lx, ay - p.y, lz))
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
    const a = random() * Math.PI * 2;
    const x = +(p.x + Math.cos(a) * 6.5).toFixed(2),
      z = +(p.z + Math.sin(a) * 6.5).toFixed(2);
    const y = settle(world, meta, x, p.y + 0.5, z);
    return y === null ? [] : [{ x, y, z }];
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
