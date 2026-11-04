import type { Armour, Worn } from "./armor";
import { newTablet, TABLET, type TabletState } from "./perks";
import {
  INVENTORY,
  ITEMS,
  type AmmoId,
  type ItemId,
  type OpticDef,
  type WeaponDef,
  type WeaponId,
} from "./items";

/**
 * Battle royale equipment and inventory (LOOT-SPEC §6, §9, §11–13), server-authoritative and
 * pure: every operation mutates one Loadout and returns what falls to the ground, so nothing is
 * ever silently deleted (spec §6.2, §13.1). The client sends intents; the room applies them
 * here and sends the result back.
 */
export type Gun = {
  item: WeaponId;
  mag: number;
  optic: ItemId | null;
  muzzle: ItemId | null;
};
/** One inventory slot: a stack (ammo, healing), or one spare armour item with its durability. */
export type Stack = { item: ItemId; qty: number; durability?: number; tablet?: TabletState };
export type Loadout = {
  hp: number;
  guns: [Gun | null, Gun | null];
  /** Active weapon slot; -1 when unarmed. */
  active: -1 | 0 | 1;
  armour: Armour;
  backpack: ItemId | null;
  bag: Stack[];
};
/** An item lying in the world, or about to (a drop). */
export type Loose = {
  item: ItemId;
  qty: number;
  durability?: number;
  mag?: number;
  optic?: ItemId | null;
  muzzle?: ItemId | null;
  /** A tablet carries its own progress (perks.ts). */
  tablet?: TabletState;
  /** Dropped by a player (not rolled loot): the Scavenger bonus does not apply again. */
  dropped?: boolean;
};
export type Outcome = { ok: boolean; reason?: string; drops: Loose[]; left?: number };

export const newLoadout = (): Loadout => ({
  hp: INVENTORY.maxHealth,
  guns: [null, null],
  active: -1,
  armour: { helmet: null, vest: null, plates: [null, null, null] },
  backpack: null,
  bag: [],
});

const def = (id: ItemId) => ITEMS[id];
const stackSize = (id: ItemId) => {
  const d = def(id) as { stack?: number };
  return d.stack ?? 1;
};
export const capacity = (l: Loadout) =>
  l.backpack ? (def(l.backpack) as { slots: number }).slots : INVENTORY.baseSlots;
export const freeSlots = (l: Loadout) => capacity(l) - l.bag.length;
const fail = (reason: string): Outcome => ({ ok: false, reason, drops: [] });
const done = (drops: Loose[] = [], left?: number): Outcome => ({
  ok: true,
  drops,
  ...(left ? { left } : {}),
});
const fullDurability = (id: ItemId) => (def(id) as { durability?: number }).durability ?? 0;
const levelOf = (id: ItemId) => (def(id) as { level?: number }).level ?? 0;
const looseFromWorn = (w: Worn): Loose => ({ item: w.item, qty: 1, durability: w.durability });
const looseFromGun = (g: Gun): Loose => ({
  item: g.item,
  qty: 1,
  mag: g.mag,
  optic: g.optic,
  muzzle: g.muzzle,
});

/** The carried tablet's state (perks work only while it is carried). */
export const tabletOf = (l: Loadout): TabletState | null =>
  l.bag.find((s) => s.item === "tablet")?.tablet ?? null;

/** Count of one stackable item across the bag. */
export const countOf = (l: Loadout, id: ItemId) =>
  l.bag.reduce((n, s) => n + (s.item === id ? s.qty : 0), 0);

/** Add a stackable item: fill existing stacks, then new slots. Returns what did not fit. */
function addStack(l: Loadout, id: ItemId, qty: number): number {
  const size = stackSize(id);
  for (const s of l.bag) {
    if (qty <= 0) break;
    if (s.item !== id || s.qty >= size) continue;
    const n = Math.min(size - s.qty, qty);
    s.qty += n;
    qty -= n;
  }
  while (qty > 0 && freeSlots(l) > 0) {
    const n = Math.min(size, qty);
    l.bag.push({ item: id, qty: n });
    qty -= n;
  }
  return qty;
}

/** Take up to `qty` of a stackable item from the bag (smallest stacks first); returns taken. */
export function takeStack(l: Loadout, id: ItemId, qty: number): number {
  let taken = 0;
  const order = l.bag
    .map((s, i) => ({ s, i }))
    .filter((e) => e.s.item === id)
    .sort((a, b) => a.s.qty - b.s.qty);
  for (const { s } of order) {
    if (taken >= qty) break;
    const n = Math.min(s.qty, qty - taken);
    s.qty -= n;
    taken += n;
  }
  l.bag = l.bag.filter((s) => s.qty > 0);
  return taken;
}

const better = (a: Worn | Loose, b: Worn | null) =>
  !b ||
  levelOf(a.item) > levelOf(b.item) ||
  (levelOf(a.item) === levelOf(b.item) && (a.durability ?? 0) > b.durability + 1e-6);

/**
 * E on a world item (LOOT-SPEC §3): one item per press. Weapons go to an empty slot or replace
 * the active one (the old gun drops with its magazine and attachments); stacks fill what fits
 * and leave the rest on the ground; better armour is worn (the old piece drops), anything else
 * is carried as a spare if there is room.
 */
export function pickUp(l: Loadout, w: Loose): Outcome {
  if (l.hp <= 0) return fail("You are down");
  const d = def(w.item);
  switch (d.category) {
    case "weapon": {
      const gun: Gun = {
        item: w.item as WeaponId,
        mag: Math.min(w.mag ?? 0, (d as WeaponDef).magazine),
        optic: w.optic ?? null,
        muzzle: w.muzzle ?? null,
      };
      const empty = l.guns.findIndex((g) => !g);
      if (empty >= 0) {
        l.guns[empty] = gun;
        if (l.active < 0) l.active = empty as 0 | 1;
        return done();
      }
      const slot: 0 | 1 = l.active === 1 ? 1 : 0;
      const old = l.guns[slot]!;
      l.guns[slot] = gun;
      return done([looseFromGun(old)]);
    }
    case "tablet": {
      if (tabletOf(l)) return fail("Tablet already carried");
      if (freeSlots(l) <= 0) return fail("Inventory full");
      const t = w.tablet ? structuredClone(w.tablet) : newTablet();
      l.bag.push({ item: w.item, qty: 1, tablet: t });
      // Data Drives already carried go into it.
      const drives = takeStack(l, "data-drive", 999);
      t.data = Math.min(TABLET.maxData, t.data + drives * TABLET.perDrive);
      return done();
    }
    case "data": {
      const t = tabletOf(l);
      if (t) {
        t.data = Math.min(TABLET.maxData, t.data + w.qty * TABLET.perDrive);
        return done();
      }
      const left = addStack(l, w.item, w.qty);
      if (left === w.qty) return fail("Inventory full");
      return done([], left);
    }
    case "ammo":
    case "heal":
    case "grenade": {
      const left = addStack(l, w.item, w.qty);
      if (left === w.qty) return fail("Inventory full");
      return done([], left);
    }
    case "helmet":
    case "vest": {
      const slot = d.category;
      const worn = l.armour[slot];
      const piece = { item: w.item, durability: w.durability ?? fullDurability(w.item) };
      if (better(piece, worn)) {
        l.armour[slot] = piece;
        return done(worn ? [looseFromWorn(worn)] : []);
      }
      if (freeSlots(l) <= 0)
        return fail(`Your ${slot === "vest" ? "kevlar" : "helmet"} is better · inventory full`);
      l.bag.push({ item: w.item, qty: 1, durability: piece.durability });
      return done();
    }
    case "plate": {
      const plate = { item: w.item, durability: w.durability ?? fullDurability(w.item) };
      // Plates fit into a worn vest; without one they go into the bag.
      const empty = l.armour.vest ? l.armour.plates.findIndex((p) => !p) : -1;
      if (empty >= 0) {
        l.armour.plates[empty] = plate;
        return done();
      }
      if (freeSlots(l) <= 0)
        return fail(
          l.armour.vest
            ? "Plate slots full · inventory full"
            : "No vest for plates · inventory full",
        );
      l.bag.push({ item: w.item, qty: 1, durability: plate.durability });
      return done();
    }
    case "backpack": {
      if (l.backpack && levelOf(l.backpack) >= levelOf(w.item))
        return fail(`Backpack level ${levelOf(l.backpack)} equipped`);
      const old = l.backpack;
      l.backpack = w.item;
      return done(old ? [{ item: old, qty: 1 }] : []);
    }
    case "optic":
    case "muzzle": {
      const key = d.category;
      const order = l.active >= 0 ? [l.active, 1 - l.active] : [0, 1];
      for (const i of order) {
        const g = l.guns[i];
        if (g && !g[key]) {
          g[key] = w.item;
          return done();
        }
      }
      if (freeSlots(l) <= 0) return fail("Inventory full");
      l.bag.push({ item: w.item, qty: 1 });
      return done();
    }
  }
}

/** Where an equipped item sits, for unequip/drop/replace intents from the inventory screen. */
export type EquipSlot =
  | "gun0"
  | "gun1"
  | "helmet"
  | "vest"
  | "plate0"
  | "plate1"
  | "plate2"
  | "backpack"
  | "optic0"
  | "optic1"
  | "muzzle0"
  | "muzzle1";
export const EQUIP_SLOTS: readonly EquipSlot[] = [
  "gun0",
  "gun1",
  "helmet",
  "vest",
  "plate0",
  "plate1",
  "plate2",
  "backpack",
  "optic0",
  "optic1",
  "muzzle0",
  "muzzle1",
];

/** Take an equipped item off the player (for dropping or moving to the bag). */
function detach(l: Loadout, slot: EquipSlot): Loose | null {
  switch (slot) {
    case "gun0":
    case "gun1": {
      const i = slot === "gun0" ? 0 : 1;
      const g = l.guns[i];
      if (!g) return null;
      l.guns[i] = null;
      if (l.active === i) l.active = l.guns[1 - i] ? ((1 - i) as 0 | 1) : -1;
      return looseFromGun(g);
    }
    case "helmet":
    case "vest": {
      const w = l.armour[slot];
      if (!w) return null;
      l.armour[slot] = null;
      return looseFromWorn(w);
    }
    case "plate0":
    case "plate1":
    case "plate2": {
      const i = +slot.slice(5);
      const w = l.armour.plates[i];
      if (!w) return null;
      l.armour.plates[i] = null;
      return looseFromWorn(w);
    }
    case "backpack": {
      if (!l.backpack) return null;
      const id = l.backpack;
      l.backpack = null;
      return { item: id, qty: 1 };
    }
    default: {
      const key = slot.startsWith("optic") ? "optic" : "muzzle";
      const g = l.guns[+slot.slice(-1)];
      if (!g || !g[key]) return null;
      const id = g[key]!;
      g[key] = null;
      return { item: id, qty: 1 };
    }
  }
}

/** Drop an equipped item to the ground. A backpack only drops if the bag fits without it. */
export function dropEquipped(l: Loadout, slot: EquipSlot): Outcome {
  if (slot === "backpack" && l.backpack && l.bag.length > INVENTORY.baseSlots)
    return fail("Make room first: the items would not fit without the backpack");
  const item = detach(l, slot);
  return item ? done([item]) : fail("Nothing equipped there");
}

/** Move an equipped armour piece or attachment into the bag. */
export function unequip(l: Loadout, slot: EquipSlot): Outcome {
  if (slot.startsWith("gun") || slot === "backpack") return fail("Drop it instead");
  if (freeSlots(l) <= 0) return fail("Inventory full");
  const item = detach(l, slot);
  if (!item) return fail("Nothing equipped there");
  l.bag.push({
    item: item.item,
    qty: 1,
    ...(item.durability !== undefined ? { durability: item.durability } : {}),
  });
  return done();
}

/** Drop (part of) a bag slot. */
export function dropFromBag(l: Loadout, index: number, qty?: number): Outcome {
  const s = l.bag[index];
  if (!s) return fail("Nothing there");
  const n = Math.max(1, Math.min(s.qty, Math.floor(qty ?? s.qty)));
  s.qty -= n;
  const loose: Loose = {
    item: s.item,
    qty: n,
    ...(s.durability !== undefined ? { durability: s.durability } : {}),
    ...(s.tablet ? { tablet: s.tablet } : {}),
  };
  if (s.qty <= 0) l.bag.splice(index, 1);
  return done([loose]);
}

/**
 * Equip a bag item. Helmet/vest swap with what is worn (the old piece takes the bag slot);
 * a plate goes into `target` plate slot 0–2 (the old plate takes the bag slot); optics and
 * muzzle items fit every gun and go onto gun `target` 0–1 (the old one takes the bag slot).
 */
export function equipFromBag(l: Loadout, index: number, target = 0): Outcome {
  const s = l.bag[index];
  if (!s) return fail("Nothing there");
  const d = def(s.item);
  const piece: Worn = { item: s.item, durability: s.durability ?? fullDurability(s.item) };
  const swapIn = (old: Worn | null) => {
    if (old) l.bag[index] = { item: old.item, qty: 1, durability: old.durability };
    else l.bag.splice(index, 1);
  };
  switch (d.category) {
    case "helmet":
    case "vest": {
      const old = l.armour[d.category];
      l.armour[d.category] = piece;
      swapIn(old);
      return done();
    }
    case "plate": {
      if (!(target >= 0 && target < INVENTORY.plateSlots)) return fail("No such plate slot");
      if (!l.armour.vest) return fail("Equip a vest to fit plates");
      const old = l.armour.plates[target]!;
      l.armour.plates[target] = piece;
      swapIn(old);
      return done();
    }
    case "optic":
    case "muzzle": {
      const g = l.guns[target === 1 ? 1 : 0];
      if (!g) return fail("No gun in that slot");
      const old = g[d.category];
      g[d.category] = s.item;
      if (old) l.bag[index] = { item: old, qty: 1 };
      else l.bag.splice(index, 1);
      return done();
    }
    default:
      return fail("Cannot equip that");
  }
}

/** Switch the active weapon slot (existing 1/2 keys). */
export function selectGun(l: Loadout, slot: 0 | 1): boolean {
  if (!l.guns[slot] || l.active === slot) return false;
  l.active = slot;
  return true;
}

export const activeGun = (l: Loadout) => (l.active === -1 ? null : l.guns[l.active]);
export const ammoFor = (l: Loadout, gun: Gun) =>
  countOf(l, (def(gun.item) as WeaponDef).ammo as AmmoId);

/** Complete a reload: move rounds from the bag into the magazine. Returns rounds loaded. */
export function finishReload(l: Loadout, gun: Gun): number {
  const d = def(gun.item) as WeaponDef;
  const n = takeStack(l, d.ammo, d.magazine - gun.mag);
  gun.mag += n;
  return n;
}

/** Can this healing item be used now (one in the bag, health below what it heals to)? */
export function canHeal(l: Loadout, id: ItemId): string | null {
  const d = def(id);
  if (d.category !== "heal") return "Not a healing item";
  if (l.hp <= 0) return "You are down";
  if (countOf(l, id) <= 0) return `No ${d.name.toLowerCase()}`;
  if (l.hp >= d.upTo)
    return d.upTo < INVENTORY.maxHealth ? `Bandages heal up to ${d.upTo}` : "Health full";
  return null;
}

/** Complete a heal: consume one item, restore health (never beyond its limit or the max). */
export function finishHeal(l: Loadout, id: ItemId): boolean {
  if (canHeal(l, id)) return false;
  const d = def(id) as { heal: number; upTo: number };
  if (takeStack(l, id, 1) !== 1) return false;
  l.hp = Math.min(INVENTORY.maxHealth, d.upTo, l.hp + d.heal);
  return true;
}

/** Everything a player carries and wears, for the drop on elimination (LOOT-SPEC §18). */
export function dropAll(l: Loadout): Loose[] {
  const out: Loose[] = [];
  for (const slot of EQUIP_SLOTS) {
    if (slot.startsWith("optic") || slot.startsWith("muzzle")) continue; // stay on the gun
    const item = detach(l, slot);
    if (item) out.push(item);
  }
  for (const s of l.bag)
    out.push({
      item: s.item,
      qty: s.qty,
      ...(s.durability !== undefined ? { durability: s.durability } : {}),
      ...(s.tablet ? { tablet: s.tablet } : {}),
    });
  l.bag = [];
  return out;
}

/** Zoom while aiming down sights with the active gun (1 = no optic). */
export function aimZoom(l: Loadout) {
  const g = activeGun(l);
  if (!g) return 1;
  if (g.optic) return (def(g.optic) as OpticDef).zoom;
  return g.item === "awp" ? 4 : 1;
}
