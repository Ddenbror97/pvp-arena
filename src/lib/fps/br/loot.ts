import { waterSurface } from "./drop";
import type { Loose } from "./inventory";
import { ITEMS, RARITY, type Category, type ItemId, type Rarity, type WeaponDef } from "./items";
import type { Placement } from "./layout";
import { modelSpots, turnPoint } from "./loot-spots";
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
put("residential", "indoor", 16, ["apartment"]);
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
put("warehouse", "beside", 1, ["container-40", "container-20", "ind-office-trailer"]);
put("military", "indoor", 12, ["military-hq", "barracks", "hangar-j"]);
put("military", "indoor", 3, ["guard-tower", "watchtower", "tent", "tent-large", "checkpoint"]);
put("military", "beside", 1, ["military-crate", "radar-truck", "helipad"]);
put("vehicle", "beside", 1, ["car-cruiser", "car-sedan", "car-pickup"]);

export const LOOT = {
  /** Chance that one loot spot holds an item. */
  density: { residential: 0.7, city: 0.72, warehouse: 0.7, military: 0.8, vehicle: 0.45 },
  /**
   * Per-location scaling of the spot density (LOOT-SPEC §2.1). The grid towns hold hundreds of
   * buildings each (concept-map density), so each of their spots holds loot less often: the
   * towns still carry the most loot in total (≈ 6,000 items on the island).
   */
  poiDensity: {
    "northstar-town": 0.35,
    millhaven: 0.33,
    "island-superstore": 1.15,
    crossroads: 0.33,
    riverwood: 0.4,
    bayview: 0.5,
    northfield: 0.5,
    "southern-military-base": 1.15,
  } as Record<string, number>,
  /** Category weights per location class (LOOT-SPEC §5). */
  categories: {
    residential: {
      weapon: 14,
      ammo: 18,
      helmet: 9,
      vest: 9,
      plate: 10,
      heal: 22,
      backpack: 9,
      optic: 6,
      muzzle: 3,
      grenade: 6,
      tablet: 0.05,
      data: 0.8,
    },
    city: {
      weapon: 18,
      ammo: 18,
      helmet: 10,
      vest: 10,
      plate: 10,
      heal: 15,
      backpack: 9,
      optic: 7,
      muzzle: 3,
      grenade: 7,
      tablet: 0.15,
      data: 1.2,
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
      grenade: 6,
      tablet: 0.3,
      data: 1.2,
    },
    military: {
      weapon: 24,
      ammo: 16,
      helmet: 12,
      vest: 12,
      plate: 15,
      heal: 7,
      backpack: 5,
      optic: 6,
      muzzle: 3,
      grenade: 9,
      tablet: 1.5,
      data: 3.5,
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
      grenade: 4,
      tablet: 0,
      data: 0.5,
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
  /** Most of these per match (LOOT-SPEC §4.2: no flood of top-tier gear). */
  caps: {
    awp: 8,
    "helmet-3": 12,
    "vest-3": 12,
    "plate-3": 40,
    "backpack-3": 12,
    "scope-6x": 10,
    tablet: 6,
    silencer: 24,
  } as Partial<Record<ItemId, number>>,
  /** Ammunition laid next to each weapon (LOOT-SPEC §15.1). */
  companionAmmo: { "ammo-rifle": 30, "ammo-sniper": 30 } as Record<string, number>,
  spacing: 2.5,
} as const;

/**
 * A model's loot spots: indoor floors first; a building whose doors are closed in its collision
 * (or that has few rooms) also gets ground spots against its outer walls, up to half its share.
 */
function spotsFor(
  collision: CollisionData,
  model: string,
  info: { mode: "indoor" | "beside"; max: number },
) {
  const own = modelSpots(collision, model, info.mode, LOOT.spacing, info.max);
  const half = Math.ceil(info.max / 2);
  if (info.mode === "beside" || own.length >= half) return own;
  return [...own, ...modelSpots(collision, model, "beside", LOOT.spacing, half - own.length)];
}

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
    const spots = spotsFor(collision, p.model, info);
    const density = Math.min(0.95, LOOT.density[info.cls] * (LOOT.poiDensity[p.poi] ?? 1));
    const catMult = LOOT.poiCategory[p.poi];
    for (const s of spots) {
      if (random() >= density) continue;
      const [dx, dz] = turnPoint(s.x, s.z, p.turn);
      const x = +(p.x + dx).toFixed(2),
        z = +(p.z + dz).toFixed(2);
      const y = settle(world, meta, x, p.y + s.y, z);
      if (y === null) continue;
      const cats = { ...LOOT.categories[info.cls] } as Record<Category, number>;
      if (catMult) for (const [c, m] of Object.entries(catMult)) cats[c as Category] *= m!;
      const category = pick(cats, random());
      const rarity = LOOT.rarity[info.cls];
      const choices = (BY_CATEGORY.get(category) ?? []).filter(
        (id) => (counts.get(id) ?? 0) < (LOOT.caps[id] ?? Infinity),
      );
      if (!choices.length) continue;
      const weights: Partial<Record<ItemId, number>> = {};
      for (const id of choices) weights[id] = rarity[ITEMS[id].rarity];
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
        if (ay !== null && Math.abs(ay - y) < 0.3)
          add({ item: w.ammo, qty: LOOT.companionAmmo[w.ammo] ?? 30 }, ax, ay, az);
      } else if ("durability" in d) add({ item, qty: 1, durability: d.durability }, x, y, z);
      else add({ item, qty }, x, y, z);
    }
  }
  return out;
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
