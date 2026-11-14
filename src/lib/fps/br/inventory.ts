import type { Armour, Worn } from "./armor";
import { newTablet, PERK_EFFECT, perkOn, type TabletState } from "./perks";
import {
  fitsGun,
  INVENTORY,
  ITEMS,
  magSize,
  type AmmoId,
  type ItemId,
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
  /** The Extended Magazine, when fitted (magSize). */
  extMag?: ItemId | null;
};
/** One inventory slot: a stack (ammo, healing), or one spare armour item with its durability. */
export type Stack = { item: ItemId; qty: number; durability?: number; tablet?: TabletState };
export type Loadout = {
  hp: number;
  /** Two main guns, then the pistol (its own slot: only a pistol goes there). */
  guns: [Gun | null, Gun | null, Gun | null];
  /** Active weapon slot (2: the pistol); -1 when unarmed. */
  active: -1 | 0 | 1 | 2;
  armour: Armour;
  backpack: ItemId | null;
  bag: Stack[];
  /**
   * The perks a used-up tablet locked in (perks.ts): they stay for the rest of the life, with or
   * without a tablet, and a new tablet starts from them.
   */
  perks?: TabletState;
};
/** An item lying in the world, or about to (a drop). */
export type Loose = {
  item: ItemId;
  qty: number;
  durability?: number;
  mag?: number;
  optic?: ItemId | null;
  muzzle?: ItemId | null;
  extMag?: ItemId | null;
  /** A tablet carries its own progress (perks.ts). */
  tablet?: TabletState;
  /** Dropped by a player (not rolled loot): the Scavenger bonus does not apply again. */
  dropped?: boolean;
};
export type Outcome = { ok: boolean; reason?: string; drops: Loose[]; left?: number };

export const newLoadout = (): Loadout => ({
  hp: INVENTORY.maxHealth,
  guns: [null, null, null],
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
export type GunSlot = 0 | 1 | 2;
const isPistol = (id: ItemId) => (def(id) as WeaponDef).slot === "pistol";
const looseFromGun = (g: Gun): Loose => ({
  item: g.item,
  qty: 1,
  mag: g.mag,
  optic: g.optic,
  muzzle: g.muzzle,
  ...(g.extMag ? { extMag: g.extMag } : {}),
});

/** The carried tablet's state (its slots, while the perks are being chosen). */
export const tabletOf = (l: Loadout): TabletState | null => {
  return l.bag.find((s) => s.item === "tablet")?.tablet ?? null;
};

/**
 * The perks working for this player: a carried tablet's slots, else what a used-up tablet locked
 * in (perks.ts). Never both: a carried tablet starts from the locked perks.
 */
export const perksOf = (l: Loadout): TabletState | null => tabletOf(l) ?? l.perks ?? null;

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
 * E on a world item (LOOT-SPEC §3): one item per press. Main guns go to an empty main slot or
 * replace the active one (the first when the pistol is drawn); a pistol goes to the pistol slot,
 * replacing the one carried (the old gun drops with its magazine and attachments, and keeps
 * only attachments that fit the new gun on the old one); stacks fill what fits
 * and leave the rest on the ground; better armour is worn (the old piece drops), anything else
 * is carried as a spare if there is room.
 */
export function pickUp(l: Loadout, w: Loose): Outcome {
  if (l.hp <= 0) return fail("You are down");
  const d = def(w.item);
  switch (d.category) {
    case "weapon": {
      const id = w.item as WeaponId;
      const gun: Gun = {
        item: id,
        mag: 0,
        optic: w.optic && fitsGun(id, w.optic) ? w.optic : null,
        muzzle: w.muzzle && fitsGun(id, w.muzzle) ? w.muzzle : null,
        ...(w.extMag && fitsGun(id, w.extMag) ? { extMag: w.extMag } : {}),
      };
      gun.mag = Math.min(w.mag ?? 0, magSize(gun));
      if (isPistol(id)) {
        const old = l.guns[2];
        l.guns[2] = gun;
        if (l.active < 0) l.active = 2;
        return done(old ? [looseFromGun(old)] : []);
      }
      const empty = !l.guns[0] ? 0 : !l.guns[1] ? 1 : null;
      if (empty !== null) {
        l.guns[empty] = gun;
        if (l.active < 0) l.active = empty;
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
      // With perks locked in by a used-up tablet, a new one opens on them (to change one, the
      // third perk then uses this one up too); a dropped tablet's own slots are someone else's.
      const t = l.perks
        ? structuredClone(l.perks)
        : w.tablet
          ? structuredClone(w.tablet)
          : newTablet();
      l.bag.push({ item: w.item, qty: 1, tablet: t });
      return done();
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
    case "muzzle":
    case "magazine": {
      const key = attachmentKey(d.category);
      // The drawn gun first, then the main guns, then the pistol; only where it fits.
      const order = [...new Set([l.active, 0, 1, 2].filter((i) => i >= 0))];
      for (const i of order) {
        const g = l.guns[i];
        if (g && !g[key] && fitsGun(g.item, w.item)) {
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
  | "gun2"
  | "helmet"
  | "vest"
  | "plate0"
  | "plate1"
  | "plate2"
  | "backpack"
  | "optic0"
  | "optic1"
  | "optic2"
  | "muzzle0"
  | "muzzle1"
  | "mag0"
  | "mag1"
  | "mag2";
export const EQUIP_SLOTS: readonly EquipSlot[] = [
  "gun0",
  "gun1",
  "gun2",
  "helmet",
  "vest",
  "plate0",
  "plate1",
  "plate2",
  "backpack",
  "optic0",
  "optic1",
  "optic2",
  "muzzle0",
  "muzzle1",
  "mag0",
  "mag1",
  "mag2",
];
/** The gun field an attachment category sits in. */
const attachmentKey = (c: "optic" | "muzzle" | "magazine") =>
  c === "magazine" ? ("extMag" as const) : c;
/** An attachment slot's gun field ("optic1" → optic, "mag2" → extMag). */
const slotKey = (slot: EquipSlot) =>
  slot.startsWith("optic")
    ? ("optic" as const)
    : slot.startsWith("mag")
      ? ("extMag" as const)
      : ("muzzle" as const);
/**
 * Taking the Extended Magazine off: rounds beyond the gun's own magazine go back into the bag
 * (what does not fit there drops beside the player). Returns the ammunition that drops.
 */
function unloadExcess(l: Loadout, g: Gun): Loose[] {
  const size = (def(g.item) as WeaponDef).magazine;
  const extra = g.mag - size;
  if (extra <= 0) return [];
  g.mag = size;
  const ammo = (def(g.item) as WeaponDef).ammo;
  const left = addStack(l, ammo, extra);
  return left > 0 ? [{ item: ammo, qty: left }] : [];
}

/**
 * Take an equipped item off the player (for dropping or moving to the bag). Rounds an Extended
 * Magazine held beyond the gun's own size go to the bag, or into `spill` when it is full.
 */
function detach(l: Loadout, slot: EquipSlot, spill: Loose[] = [], unload = true): Loose | null {
  switch (slot) {
    case "gun0":
    case "gun1":
    case "gun2": {
      const i = +slot.slice(3) as GunSlot;
      const g = l.guns[i];
      if (!g) return null;
      l.guns[i] = null;
      if (l.active === i) {
        const next = ([0, 1, 2] as const).find((j) => l.guns[j]);
        l.active = next ?? -1;
      }
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
      const key = slotKey(slot);
      const g = l.guns[+slot.slice(-1) as GunSlot];
      if (!g || !g[key]) return null;
      const id = g[key]!;
      g[key] = null;
      if (key === "extMag" && unload) spill.push(...unloadExcess(l, g));
      return { item: id, qty: 1 };
    }
  }
}

/** Drop an equipped item to the ground. A backpack only drops if the bag fits without it. */
export function dropEquipped(l: Loadout, slot: EquipSlot): Outcome {
  if (slot === "backpack" && l.backpack && l.bag.length > INVENTORY.baseSlots)
    return fail("Make room first: the items would not fit without the backpack");
  const spill: Loose[] = [];
  const item = detach(l, slot, spill);
  return item ? done([item, ...spill]) : fail("Nothing equipped there");
}

/** Move an equipped armour piece or attachment into the bag. */
export function unequip(l: Loadout, slot: EquipSlot): Outcome {
  if (slot.startsWith("gun") || slot === "backpack") return fail("Drop it instead");
  if (freeSlots(l) <= 0) return fail("Inventory full");
  // The attachment takes its bag slot before an Extended Magazine's spare rounds look for room.
  const item = detach(l, slot, [], false);
  if (!item) return fail("Nothing equipped there");
  l.bag.push({
    item: item.item,
    qty: 1,
    ...(item.durability !== undefined ? { durability: item.durability } : {}),
  });
  const g = slot.startsWith("mag") ? l.guns[+slot.slice(-1) as GunSlot] : null;
  return done(g ? unloadExcess(l, g) : []);
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
 * muzzle items go onto gun `target` 0–2 where they fit (the old one takes the bag slot).
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
    case "muzzle":
    case "magazine": {
      const g = l.guns[target === 1 || target === 2 ? target : 0];
      if (!g) return fail("No gun in that slot");
      if (!fitsGun(g.item, s.item)) return fail(`${d.name} does not fit the ${ITEMS[g.item].name}`);
      const key = attachmentKey(d.category);
      const old = g[key] ?? null;
      g[key] = s.item;
      if (old) l.bag[index] = { item: old, qty: 1 };
      else l.bag.splice(index, 1);
      return done();
    }
    default:
      return fail("Cannot equip that");
  }
}

/**
 * Move between two equipment slots (owner, 2026-11-09: drag weapons and equipment around in
 * the inventory). Swaps the two main guns (the drawn one stays drawn); moves an attachment to
 * the same kind of slot on another gun, swapping with what is there when each fits the other's
 * gun; swaps two plates. Nothing else moves between slots.
 */
export function moveEquipped(l: Loadout, from: EquipSlot, to: EquipSlot): Outcome {
  if (from === to) return fail("Same slot");
  if ((from === "gun0" && to === "gun1") || (from === "gun1" && to === "gun0")) {
    if (!l.guns[0] && !l.guns[1]) return fail("Nothing equipped there");
    [l.guns[0], l.guns[1]] = [l.guns[1], l.guns[0]];
    if (l.active === 0 || l.active === 1) l.active = l.active === 0 ? 1 : 0;
    return done();
  }
  if (from.startsWith("plate") && to.startsWith("plate")) {
    const a = +from.slice(5),
      b = +to.slice(5);
    const p = l.armour.plates;
    if (!p[a]) return fail("Nothing equipped there");
    [p[a], p[b]] = [p[b]!, p[a]!];
    return done();
  }
  const kind = (s: EquipSlot) =>
    s.startsWith("optic")
      ? "optic"
      : s.startsWith("muzzle")
        ? "muzzle"
        : s.startsWith("mag")
          ? "mag"
          : null;
  const k = kind(from);
  if (!k || kind(to) !== k) return fail("Cannot go there");
  const key = slotKey(from);
  const src = l.guns[+from.slice(-1) as GunSlot],
    dst = l.guns[+to.slice(-1) as GunSlot];
  if (!src || !src[key]) return fail("Nothing equipped there");
  if (!dst) return fail("No gun in that slot");
  const moving = src[key]!,
    back = dst[key] ?? null;
  if (!fitsGun(dst.item, moving))
    return fail(`${ITEMS[moving].name} does not fit the ${ITEMS[dst.item].name}`);
  if (back && !fitsGun(src.item, back))
    return fail(`${ITEMS[back].name} does not fit the ${ITEMS[src.item].name}`);
  dst[key] = moving;
  src[key] = back;
  // An Extended Magazine leaving a gun takes its extra rounds with it into the bag.
  const drops = key === "extMag" && !back ? unloadExcess(l, src) : [];
  return done(drops);
}

/** Switch the active weapon slot (keys 1/2 the main guns, 3 the pistol). */
export function selectGun(l: Loadout, slot: GunSlot): boolean {
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
  const n = takeStack(l, d.ammo, magSize(gun) - gun.mag);
  gun.mag += n;
  return n;
}

/** One shell from the bag into a tube magazine (a shell-by-shell reload): how many went in. */
export function loadShell(l: Loadout, gun: Gun): number {
  if (gun.mag >= magSize(gun)) return 0;
  const n = takeStack(l, (def(gun.item) as WeaponDef).ammo, 1);
  gun.mag += n;
  return n;
}

/** Can this healing item be used now (one in the bag, health below what it heals to)? */
export function canHeal(l: Loadout, id: ItemId): string | null {
  const d = def(id);
  if (d.category !== "heal") return "Not a healing item";
  if (l.hp <= 0) return "You are down";
  if (countOf(l, id) <= 0) return `No ${d.name.toLowerCase()}`;
  const upTo = healUpTo(l, id);
  if (l.hp >= upTo)
    return upTo < INVENTORY.maxHealth ? `Bandages heal up to ${upTo}` : "Health full";
  return null;
}

/** The health an item heals up to (Fast Recovery lets a bandage reach a little higher). */
function healUpTo(l: Loadout, id: ItemId) {
  const d = def(id) as { upTo: number };
  return id === "bandage" && perkOn(perksOf(l), "fast-recovery")
    ? Math.max(d.upTo, PERK_EFFECT.bandageUpTo)
    : d.upTo;
}

/** Complete a heal: consume one item, restore health (never beyond its limit or the max). */
export function finishHeal(l: Loadout, id: ItemId): boolean {
  if (canHeal(l, id)) return false;
  const d = def(id) as { heal: number; upTo: number };
  if (takeStack(l, id, 1) !== 1) return false;
  // Fast Recovery: a bandage gives a fifth more and reaches a little higher (never a medkit's
  // full heal, never over the maximum).
  const more = id === "bandage" && perkOn(perksOf(l), "fast-recovery");
  const heal = more ? d.heal * PERK_EFFECT.bandageHeal : d.heal;
  l.hp = Math.max(l.hp, Math.min(INVENTORY.maxHealth, healUpTo(l, id), l.hp + heal));
  return true;
}

/** Everything a player carries and wears, for the drop on elimination (LOOT-SPEC §18). */
export function dropAll(l: Loadout): Loose[] {
  const out: Loose[] = [];
  for (const slot of EQUIP_SLOTS) {
    // Attachments stay on the gun.
    if (slot.startsWith("optic") || slot.startsWith("muzzle") || slot.startsWith("mag")) continue;
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
