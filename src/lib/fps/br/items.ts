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
  | "tablet"
  | "data";

export type WeaponId =
  | "ak47"
  | "m4"
  | "awp"
  | "m60"
  | "svd"
  | "scar"
  | "pump"
  | "hunting"
  | "mp5"
  | "pistol"
  | "revolver";
export type AmmoId = "ammo-rifle" | "ammo-sniper" | "ammo-pistol" | "ammo-shotgun";
/** The owner's weapon pack (public/fps/br/models/pack-guns.glb; art/blender/br/build_pack_guns.mjs). */
export type PackGun = "m60" | "svd" | "scar" | "pump" | "hunting" | "mp5" | "pistol" | "revolver";
export const PACK_GUNS: readonly PackGun[] = [
  "m60",
  "svd",
  "scar",
  "pump",
  "hunting",
  "mp5",
  "pistol",
  "revolver",
];

type Base = { name: string; category: Category; rarity: Rarity; short: string };
export type WeaponDef = Base & {
  category: "weapon";
  /**
   * Which model, animations and sounds: the 1v1/5v5 AK-47, M4 and AWP, or one of the owner's
   * pack guns (seated on the same first-person arm rigs; br-viewmodel.ts).
   */
  model: "ak47" | "m4a1s" | "awp" | PackGun;
  /** Semi-automatic: one shot per trigger pull (pistols, the SVD, the pump shotguns). */
  semi?: boolean;
  /** Shotguns: pellets per shot, each with `damage`, spread round the aim (radians). */
  pellets?: { count: number; spread: number };
  /** Damage over distance: full to `from` m, falling linearly to `min` × at `to` m. */
  falloff?: { from: number; to: number; min: number };
  /** Hip-fire spread and recoil, relative to the rifles (1). */
  spread?: number;
  recoil?: number;
  /** Shot sound (the existing recordings; pitch > 1 is lighter and sharper). */
  sound?: { base: "ak47" | "m4a1s" | "awp"; pitch: number };
  /** Handgun: held in front of the face with both hands (viewmodel), no stock. */
  handgun?: boolean;
  /** Attachments it takes (default: every optic and every muzzle device). */
  takes?: { optics: boolean; muzzles: boolean; scopes?: boolean };
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
export type DataDef = Base & { category: "data"; stack: number; pickup: number };
export type ItemDef =
  | WeaponDef
  | AmmoDef
  | ArmorDef
  | HealDef
  | BackpackDef
  | OpticDef
  | MuzzleDef
  | GrenadeDef
  | TabletDef
  | DataDef;

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
    short: "AK-47, M4, SCAR-H and M60",
    category: "ammo",
    rarity: "common",
    stack: 90,
    /** One box: 30 rounds (owner, 2026-11-03). */
    pickup: 30,
  },
  "ammo-sniper": {
    name: "Sniper ammo",
    short: "AWP and SVD",
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
    reduction: 0.4,
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
  "plate-1": {
    name: "Kevlar plate level 1",
    short: "Armour plate",
    category: "plate",
    rarity: "common",
    level: 1,
    reduction: 0.1,
    durability: 50,
  },
  "plate-2": {
    name: "Kevlar plate level 2",
    short: "Armour plate",
    category: "plate",
    rarity: "rare",
    level: 2,
    reduction: 0.15,
    durability: 75,
  },
  "plate-3": {
    name: "Kevlar plate level 3",
    short: "Armour plate",
    category: "plate",
    rarity: "epic",
    level: 3,
    reduction: 0.2,
    durability: 100,
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
  "data-drive": {
    name: "Data Drive",
    short: "Tactical Data for the tablet (+2)",
    category: "data",
    rarity: "uncommon",
    stack: 10,
    pickup: 1,
  },
  // ---- The owner's weapon pack (2026-11-04). Appended: item codes on the wire follow this
  // table's order, so new entries go last. Damage is per bullet (per pellet for shotguns),
  // against 100 HP; the rifles' 34 is the reference (three body hits).
  scar: {
    name: "SCAR-H",
    short: "Battle rifle",
    category: "weapon",
    rarity: "rare",
    model: "scar",
    ammo: "ammo-rifle",
    magazine: 20,
    reloadMs: 2600,
    intervalMs: 115,
    damage: { head: 41, chest: 41, stomach: 36, legs: 25 },
    armorPierce: 0.15,
    rangeM: 400,
    hearM: 150,
    recoil: 1.3,
    sound: { base: "ak47", pitch: 0.92 },
  },
  m60: {
    name: "M60",
    short: "Machine gun",
    category: "weapon",
    rarity: "epic",
    model: "m60",
    ammo: "ammo-rifle",
    magazine: 100,
    reloadMs: 5600,
    intervalMs: 109,
    damage: { head: 36, chest: 36, stomach: 32, legs: 22 },
    armorPierce: 0.1,
    rangeM: 400,
    hearM: 180,
    spread: 1.35,
    recoil: 1.15,
    sound: { base: "ak47", pitch: 0.85 },
  },
  svd: {
    name: "SVD",
    short: "Marksman rifle",
    category: "weapon",
    rarity: "epic",
    model: "svd",
    ammo: "ammo-sniper",
    magazine: 10,
    reloadMs: 3000,
    intervalMs: 320,
    semi: true,
    damage: { head: 110, chest: 62, stomach: 56, legs: 40 },
    armorPierce: 0.35,
    rangeM: 800,
    hearM: 260,
    spread: 0.6,
    recoil: 2.4,
    sound: { base: "awp", pitch: 1.12 },
  },
  mp5: {
    name: "MP5",
    short: "Submachine gun",
    category: "weapon",
    rarity: "common",
    model: "mp5",
    ammo: "ammo-pistol",
    magazine: 30,
    reloadMs: 2300,
    intervalMs: 75,
    damage: { head: 27, chest: 26, stomach: 23, legs: 16 },
    armorPierce: 0,
    rangeM: 220,
    hearM: 110,
    falloff: { from: 25, to: 70, min: 0.7 },
    spread: 0.85,
    recoil: 0.7,
    sound: { base: "m4a1s", pitch: 1.25 },
  },
  pistol: {
    name: "M1911",
    short: "Pistol",
    category: "weapon",
    rarity: "common",
    model: "pistol",
    ammo: "ammo-pistol",
    magazine: 8,
    reloadMs: 1800,
    intervalMs: 150,
    semi: true,
    damage: { head: 56, chest: 30, stomach: 26, legs: 18 },
    armorPierce: 0,
    rangeM: 160,
    hearM: 100,
    falloff: { from: 20, to: 60, min: 0.7 },
    spread: 0.9,
    recoil: 1.0,
    sound: { base: "m4a1s", pitch: 1.35 },
    handgun: true,
    takes: { optics: true, muzzles: true, scopes: false },
  },
  revolver: {
    name: "Revolver",
    short: "Heavy pistol",
    category: "weapon",
    rarity: "rare",
    model: "revolver",
    ammo: "ammo-pistol",
    magazine: 6,
    reloadMs: 3200,
    intervalMs: 480,
    semi: true,
    damage: { head: 92, chest: 56, stomach: 48, legs: 32 },
    armorPierce: 0.2,
    rangeM: 180,
    hearM: 140,
    falloff: { from: 30, to: 90, min: 0.75 },
    spread: 0.8,
    recoil: 2.2,
    sound: { base: "ak47", pitch: 1.15 },
    handgun: true,
    takes: { optics: false, muzzles: false },
  },
  pump: {
    name: "Pump shotgun",
    short: "Shotgun",
    category: "weapon",
    rarity: "uncommon",
    model: "pump",
    ammo: "ammo-shotgun",
    magazine: 6,
    reloadMs: 3600,
    intervalMs: 850,
    semi: true,
    pellets: { count: 8, spread: 0.062 },
    damage: { head: 17, chest: 14, stomach: 13, legs: 9 },
    armorPierce: 0,
    rangeM: 60,
    hearM: 170,
    falloff: { from: 8, to: 30, min: 0.25 },
    recoil: 2.6,
    sound: { base: "awp", pitch: 0.82 },
    takes: { optics: true, muzzles: false, scopes: false },
  },
  hunting: {
    name: "Hunting shotgun",
    short: "Shotgun",
    category: "weapon",
    rarity: "uncommon",
    model: "hunting",
    ammo: "ammo-shotgun",
    magazine: 5,
    reloadMs: 3400,
    intervalMs: 950,
    semi: true,
    pellets: { count: 8, spread: 0.042 },
    damage: { head: 16, chest: 13, stomach: 12, legs: 8 },
    armorPierce: 0,
    rangeM: 75,
    hearM: 170,
    falloff: { from: 12, to: 42, min: 0.3 },
    recoil: 2.4,
    sound: { base: "awp", pitch: 0.88 },
    takes: { optics: true, muzzles: false, scopes: false },
  },
  "ammo-pistol": {
    name: "Pistol ammo",
    short: "MP5, M1911 and Revolver",
    category: "ammo",
    rarity: "common",
    stack: 90,
    pickup: 30,
  },
  "ammo-shotgun": {
    name: "Shotgun shells",
    short: "Pump and Hunting shotguns",
    category: "ammo",
    rarity: "common",
    stack: 40,
    pickup: 12,
  },
} as const satisfies Record<string, ItemDef>;

export type ItemId = keyof typeof ITEMS;

/**
 * Whether a gun takes an attachment (items' `takes`; by default every optic and muzzle device
 * fits every gun). Magnified scopes (3× and up) need `scopes` not to be false.
 */
export function gunTakes(gun: string, attachment: string): boolean {
  const g = ITEMS[gun as ItemId] as WeaponDef | undefined,
    a = ITEMS[attachment as ItemId] as ItemDef | undefined;
  if (!g || g.category !== "weapon" || !a) return false;
  const t = g.takes ?? { optics: true, muzzles: true };
  if (a.category === "muzzle") return t.muzzles;
  if (a.category === "optic") return t.optics && (a.zoom < 3 || t.scopes !== false);
  return false;
}
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
 * Armour rules: total body reduction from vest + plate never exceeds this (so stacking can
 * never make a player close to invulnerable), and only the first intact plate takes a hit.
 */
export const ARMOR_RULES = { bodyCap: 0.5 } as const;
