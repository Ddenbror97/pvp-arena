import { describe, expect, it } from "vitest";
import {
  dropAll,
  dropEquipped,
  EQUIP_SLOTS,
  equipFromBag,
  finishReload,
  newLoadout,
  pickUp,
  unequip,
  type Loadout,
} from "@/lib/fps/br/inventory";
import { fitsGun, ITEMS, magSize, type WeaponDef, type WeaponId } from "@/lib/fps/br/items";
import { validateBrAct } from "@/lib/fps/br/actions";
import { lootRow } from "@/lib/fps/br/loot-world";
import { LOOT } from "@/lib/fps/br/loot";

/** The Extended Magazine (owner, 2026-11-09): one item for every gun, a few more rounds each. */
const W = (id: WeaponId) => ITEMS[id] as WeaponDef;
const gun = (item: WeaponId, extra = {}) => ({ item, qty: 1, mag: W(item).magazine, ...extra });
const armed = (item: WeaponId, rounds: number): Loadout => {
  const l = newLoadout();
  pickUp(l, gun(item));
  pickUp(l, { item: W(item).ammo, qty: rounds });
  return l;
};

describe("Extended Magazine", () => {
  it("adds 10 rounds to the AK, M4 and MP5, 5 to the AWP and the Desert Eagle", () => {
    expect(
      (["ak47", "m4", "mp5", "awp", "deagle"] as const).map((id) => [
        id,
        W(id).magazine,
        magSize({ item: id, extMag: "mag-ext" }),
      ]),
    ).toEqual([
      ["ak47", 30, 40],
      ["m4", 30, 40],
      ["mp5", 30, 40],
      ["awp", 5, 10],
      ["deagle", 7, 12],
    ]);
    for (const id of ["ak47", "m4", "awp", "mp5", "deagle"] as const)
      expect(fitsGun(id, "mag-ext")).toBe(true);
  });

  it("goes onto the drawn gun when picked up, and the next reload fills it", () => {
    const l = armed("ak47", 60);
    expect(pickUp(l, { item: "mag-ext", qty: 1 }).ok).toBe(true);
    const g = l.guns[0]!;
    expect(g.extMag).toBe("mag-ext");
    expect(finishReload(l, g)).toBe(10);
    expect(g.mag).toBe(40);
  });

  it("each gun card has a magazine slot, the pistol's too", () => {
    expect(EQUIP_SLOTS).toEqual(expect.arrayContaining(["mag0", "mag1", "mag2"]));
    for (const slot of ["mag0", "mag1", "mag2"])
      expect(validateBrAct({ v: 1, type: "br-act", act: "unequip", slot })).toBeTruthy();
    const l = newLoadout();
    pickUp(l, gun("deagle"));
    pickUp(l, { item: "ammo-50ae", qty: 14 });
    l.bag.push({ item: "mag-ext", qty: 1 });
    expect(equipFromBag(l, l.bag.length - 1, 2).ok).toBe(true);
    expect(l.guns[2]!.extMag).toBe("mag-ext");
    finishReload(l, l.guns[2]!);
    expect(l.guns[2]!.mag).toBe(12);
  });

  it("taking it off returns the extra rounds to the bag, never deletes them", () => {
    const l = armed("mp5", 30);
    pickUp(l, { item: "mag-ext", qty: 1 });
    finishReload(l, l.guns[0]!);
    expect(l.guns[0]!.mag).toBe(40);
    const before = l.bag.find((s) => s.item === "ammo-9mm")?.qty ?? 0;
    expect(unequip(l, "mag0").ok).toBe(true);
    expect(l.guns[0]!.mag).toBe(30);
    expect(l.guns[0]!.extMag ?? null).toBeNull();
    expect(l.bag.find((s) => s.item === "ammo-9mm")!.qty).toBe(before + 10);
    expect(l.bag.some((s) => s.item === "mag-ext")).toBe(true);
    // Dropped instead: the magazine and (with a full bag) the spare rounds go to the ground.
    const m = armed("ak47", 30);
    pickUp(m, { item: "mag-ext", qty: 1 });
    finishReload(m, m.guns[0]!);
    while (m.bag.length < 6) m.bag.push({ item: "bandage", qty: 1 });
    m.bag = m.bag.filter((s) => s.item !== "ammo-rifle");
    while (m.bag.length < 6) m.bag.push({ item: "bandage", qty: 1 });
    const out = dropEquipped(m, "mag0");
    expect(out.ok).toBe(true);
    expect(out.drops).toEqual([
      { item: "mag-ext", qty: 1 },
      { item: "ammo-rifle", qty: 10 },
    ]);
    expect(m.guns[0]!.mag).toBe(30);
  });

  it("stays on a dropped gun, which keeps its loaded rounds", () => {
    const l = armed("ak47", 60);
    pickUp(l, { item: "mag-ext", qty: 1 });
    finishReload(l, l.guns[0]!);
    const gunDrop = dropAll(l).find((d) => d.item === "ak47")!;
    expect(gunDrop).toMatchObject({ mag: 40, extMag: "mag-ext" });
    expect(lootRow({ ...gunDrop, id: 1, x: 0, y: 0, z: 0 })[10]).toBeGreaterThanOrEqual(0);
    // Picked up again, it holds all 40.
    const other = newLoadout();
    pickUp(other, gunDrop);
    expect(other.guns[0]).toMatchObject({ mag: 40, extMag: "mag-ext" });
    // A gun found without it keeps at most its own magazine.
    const plain = newLoadout();
    pickUp(plain, { ...gunDrop, extMag: null });
    expect(plain.guns[0]!.mag).toBe(30);
  });

  it("is found on the island like a muzzle attachment", () => {
    for (const cls of Object.values(LOOT.categories)) expect(cls.magazine).toBe(cls.muzzle);
  });
});
