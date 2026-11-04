import { HIT_DAMAGE } from "../combat";
import { GRENADE_NAMES, type GrenadeType } from "../grenades/rules";
import { AWP } from "../primary";
import { WEAPONS } from "../simulation";

/**
 * Battle royale items: the one central configuration (LOOT-SPEC §5, §36–37). Every gameplay
 * value the server applies and every number the inventory shows comes from here; the client UI
 * reads the same table, so nothing is restated elsewhere.
 *
 * Weapons reuse the 1v1/5v5 guns and their tuning (simulation.ts WEAPONS.rifle for the AK-47
 * and M4, primary.ts AWP); armour extends the existing CS-style vest rule (combat.ts) with
 * helmet, vest and plate layers, see armor.ts. Shared deterministic module: no three.js.
 */
export type Rarity = "common" | "uncommon" | "rare" | "epic";
export const RARITY: Record<Rarity, { label: string; color: string; rank: number }> = {
  common: { label: "Common", color: "#c9cdc4", rank: 0 },
  uncommon: { label: "Uncommon", color: "#6fbf5a", rank: 1 },
  rare: { label: "Rare", color: "#4f9de0", rank: 2 },
  epic: { label: "Epic", color: "#b06be0", rank: 3 },
};

export type Category =
  | "weapon"
  | "ammo"
  | "helmet"
  | "vest"
  | "plate"
  | "heal"
  | "backpack"
  | "optic"
  | "muzzle"
  | "grenade"
  | "tablet";

export type WeaponId = "ak47" | "m4" | "awp";
export type AmmoId = "ammo-rifle" | "ammo-sniper";

type Base = { name: string; category: Category; rarity: Rarity; short: string };
export type WeaponDef = Base & {
  category: "weapon";
  /** Which existing weapon this is (model, animations, sounds, recoil). */
  model: "ak47" | "m4a1s" | "awp";
  ammo: AmmoId;
  magazine: number;
  reloadMs: number;
  /** Minimum time between shots. */
  intervalMs: number;
  damage: { head: number; chest: number; stomach: number; legs: number };
  /** Share of the armour's reduction this gun ignores (0 = full effect). */
  armorPierce: number;
  /** Hitscan reach on the island (the arenas trace 100 m; the island is open). */
  rangeM: number;
  /** Shot heard within this range (direction cue; PLAN §6.4). */
  hearM: number;
};
export type AmmoDef = Base & { category: "ammo"; stack: number; pickup: number };
export type ArmorDef = Base & {
  category: "helmet" | "vest" | "plate";
  level: 1 | 2 | 3;
  /** Share of eligible damage absorbed while durability lasts. */
  reduction: number;
  durability: number;
};
export type HealDef = Base & {
  category: "heal";
  heal: number;
  /** Heals up to this health (bandages stop short of full). */
  upTo: number;
  useMs: number;
  stack: number;
  pickup: number;
};
export type BackpackDef = Base & { category: "backpack"; level: 1 | 2 | 3; slots: number };
export type OpticDef = Base & {
  category: "optic";
  /** Aim-down-sights magnification. */
  zoom: number;
  /** Sight mesh in the accessories pack and its reticle. */
  mesh: string;
  reticle: "dot" | "holo" | "chevron" | "duplex" | "mil-dot";
};
export type MuzzleDef = Base & {
  category: "muzzle";
  mesh: string;
  /** Multiplier on the shot's hearing range. */
  hearScale: number;
  /** Multiplier on recoil kick. */
  recoilScale: number;
  hideFlash: boolean;
};
export type GrenadeDef = Base & {
  category: "grenade";
  /** The existing grenade (grenades/rules.ts): throw, fuse and effect rules come from there. */
  type: GrenadeType;
  stack: number;
  pickup: number;
};
export type TabletDef = Base & { category: "tablet" };
export type ItemDef =
  | WeaponDef
  | AmmoDef
  | ArmorDef
  | HealDef
  | BackpackDef
  | OpticDef
  | MuzzleDef
  | GrenadeDef
  | TabletDef;

const rifle = WEAPONS.rifle;
/** The modern 1v1/5v5 rifle table (head = chest: three hits to the head at full health). */
const RIFLE_DAMAGE = { ...HIT_DAMAGE.rifle };

export const ITEMS = {
  ak47: {
    name: "AK-47",
    short: "Assault rifle",
    category: "weapon",
    rarity: "uncommon",
    model: "ak47",
    ammo: "ammo-rifle",
    magazine: rifle.magazine,
    reloadMs: rifle.reloadMs,
    intervalMs: 100,
    damage: RIFLE_DAMAGE,
    armorPierce: 0,
    rangeM: 350,
    hearM: 140,
  },
  m4: {
    name: "M4",
    short: "Assault rifle",
    category: "weapon",
    rarity: "uncommon",
    model: "m4a1s",
    ammo: "ammo-rifle",
    magazine: rifle.magazine,
    reloadMs: rifle.reloadMs,
    intervalMs: 100,
    damage: RIFLE_DAMAGE,
    armorPierce: 0,
    rangeM: 350,
    // In the battle royale the M4 is unsuppressed by default (owner, 2026-11-03): the
    // suppressor is the Silencer attachment, as for every gun.
    hearM: 140,
  },
  awp: {
    name: "AWP",
    short: "Sniper rifle",
    category: "weapon",
    rarity: "epic",
    model: "awp",
    ammo: "ammo-sniper",
    magazine: AWP.magazine,
    reloadMs: AWP.reloadMs,
    intervalMs: AWP.cycleMs,
    damage: { ...AWP.damage },
    armorPierce: 0.5,
    rangeM: 1000,
    hearM: 300,
  },
  "ammo-rifle": {
    name: "Rifle ammo",
    short: "AK-47 and M4",
    category: "ammo",
    rarity: "common",
    stack: 90,
    /** One box: 30 rounds (owner, 2026-11-03). */
    pickup: 30,
  },
  "ammo-sniper": {
    name: "Sniper ammo",
    short: "AWP",
    category: "ammo",
    rarity: "uncommon",
    stack: 60,
    pickup: 30,
  },
  "helmet-1": {
    name: "Helmet level 1",
    short: "Head protection",
    category: "helmet",
    rarity: "common",
    level: 1,
    reduction: 0.3,
    durability: 80,
  },
  "helmet-2": {
    name: "Helmet level 2",
    short: "Head protection",
    category: "helmet",
    rarity: "rare",
    level: 2,
    reduction: 0.45,
    durability: 150,
  },
  "helmet-3": {
    name: "Helmet level 3",
    short: "Head protection",
    category: "helmet",
    rarity: "epic",
    level: 3,
    reduction: 0.55,
    durability: 230,
  },
  "vest-1": {
    name: "Kevlar level 1",
    short: "Body armour",
    category: "vest",
    rarity: "common",
    level: 1,
    reduction: 0.2,
    durability: 100,
  },
  "vest-2": {
    name: "Kevlar level 2",
    short: "Body armour",
    category: "vest",
    rarity: "rare",
    level: 2,
    reduction: 0.28,
    durability: 150,
  },
  "vest-3": {
    name: "Kevlar level 3",
    short: "Body armour",
    category: "vest",
    rarity: "epic",
    level: 3,
    reduction: 0.35,
    durability: 200,
  },
  // One plate type (owner, 2026-11-04): up to three fit into a worn vest, spares ride in the bag.
  plate: {
    name: "Armour plate",
    short: "Armour plate",
    category: "plate",
    rarity: "uncommon",
    level: 1,
    reduction: 0.05,
    durability: 25,
  },
  bandage: {
    name: "Bandages",
    short: "Heals 15 (up to 75)",
    category: "heal",
    rarity: "common",
    heal: 15,
    upTo: 75,
    useMs: 3000,
    stack: 10,
    pickup: 5,
  },
  medkit: {
    name: "Medical kit",
    short: "Heals to full",
    category: "heal",
    rarity: "uncommon",
    heal: 100,
    upTo: 100,
    useMs: 7000,
    stack: 3,
    pickup: 1,
  },
  "backpack-1": {
    name: "Backpack level 1",
    short: "Inventory space",
    category: "backpack",
    rarity: "common",
    level: 1,
    slots: 10,
  },
  "backpack-2": {
    name: "Backpack level 2",
    short: "Inventory space",
    category: "backpack",
    rarity: "rare",
    level: 2,
    slots: 14,
  },
  "backpack-3": {
    name: "Backpack level 3",
    short: "Inventory space",
    category: "backpack",
    rarity: "epic",
    level: 3,
    slots: 18,
  },
  "sight-red": {
    name: "Red dot sight",
    short: "Optic 1.25×",
    category: "optic",
    rarity: "common",
    zoom: 1.25,
    mesh: "Sight 1",
    reticle: "dot",
  },
  "sight-holo": {
    name: "Holographic sight",
    short: "Optic 1.25×",
    category: "optic",
    rarity: "uncommon",
    zoom: 1.25,
    mesh: "Sight 2",
    reticle: "holo",
  },
  "sight-reflex": {
    name: "Reflex sight",
    short: "Optic 1.5×",
    category: "optic",
    rarity: "uncommon",
    zoom: 1.5,
    mesh: "Sight 3",
    reticle: "chevron",
  },
  "scope-4x": {
    name: "4× scope",
    short: "Optic 4×",
    category: "optic",
    rarity: "rare",
    zoom: 4,
    mesh: "Scope 1",
    reticle: "duplex",
  },
  "scope-6x": {
    name: "6× scope",
    short: "Optic 6×",
    category: "optic",
    rarity: "epic",
    zoom: 6,
    mesh: "Scope 3.001",
    reticle: "mil-dot",
  },
  silencer: {
    name: "Silencer",
    short: "Quieter shots",
    category: "muzzle",
    rarity: "rare",
    mesh: "Silencer 1",
    hearScale: 0.45,
    recoilScale: 1,
    hideFlash: true,
  },
  compensator: {
    name: "Compensator",
    short: "Less recoil",
    category: "muzzle",
    rarity: "uncommon",
    mesh: "Compensator 3",
    hearScale: 1.1,
    recoilScale: 0.85,
    hideFlash: false,
  },
  "flash-hider": {
    name: "Flash hider",
    short: "No muzzle flash",
    category: "muzzle",
    rarity: "common",
    mesh: "Flashhider",
    hearScale: 1,
    recoilScale: 0.95,
    hideFlash: true,
  },
  "grenade-he": {
    name: GRENADE_NAMES.he,
    short: "Explodes after 1.5 s",
    category: "grenade",
    rarity: "uncommon",
    type: "he",
    stack: 2,
    pickup: 1,
  },
  "grenade-smoke": {
    name: GRENADE_NAMES.smoke,
    short: "Smoke screen, blocks sight",
    category: "grenade",
    rarity: "common",
    type: "smoke",
    stack: 2,
    pickup: 1,
  },
  "grenade-fire": {
    name: GRENADE_NAMES.fire,
    short: "Fire on the floor",
    category: "grenade",
    rarity: "uncommon",
    type: "fire",
    stack: 2,
    pickup: 1,
  },
  tablet: {
    name: "Tactical Tablet",
    short: "Rare military technology: field upgrade terminal (T)",
    category: "tablet",
    rarity: "epic",
  },
} as const satisfies Record<string, ItemDef>;

export type ItemId = keyof typeof ITEMS;
export const ITEM_IDS = Object.keys(ITEMS) as ItemId[];
export const itemDef = (id: ItemId): ItemDef => ITEMS[id];
export const isItemId = (v: unknown): v is ItemId =>
  typeof v === "string" && Object.prototype.hasOwnProperty.call(ITEMS, v);

/** Inventory and equipment limits (LOOT-SPEC §9, §11). */
export const INVENTORY = {
  /** Slots carried without a backpack. */
  baseSlots: 6,
  plateSlots: 3,
  weaponSlots: 2,
  /** Pickup reach from the eye, metres (LOOT-SPEC §3). */
  reachM: 2.6,
  maxHealth: 100,
} as const;

/**
 * Armour rules: total body reduction from the vest and its plates never exceeds this, so full
 * armour at most doubles a rifle's body shots to kill (3 → 6) and nobody is close to
 * invulnerable. Plates need a worn vest, and every intact plate (up to three) adds its share.
 *
 * Rifle (34 chest) body shots to kill: none 3 · vest 1/2/3 → 4/5/5 · vest 3 + two plates
 * → 6, and vest 3 + three plates reaches the cap exactly (still 6). Each intact plate adds 5 %;
 * the first plate takes the wear until it breaks (25 durability: about five rifle hits with
 * three fitted), then the next. Headshots: none 3 · helmet 1/2/3 → 5/6/7. The AWP (armour
 * pierce 0.5) kills on any headshot; a level 2–3 vest, or any vest with plates, lets a
 * full-health player survive one body shot.
 */
export const ARMOR_RULES = { bodyCap: 0.5 } as const;
