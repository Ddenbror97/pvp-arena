import { describe, expect, it } from "vitest";
import {
  moveEquipped,
  newLoadout,
  pickUp,
  pickUpOnto,
  freeSlots,
  type Loadout,
} from "@/lib/fps/br/inventory";
import { ITEMS, type WeaponDef, type WeaponId } from "@/lib/fps/br/items";
import { validateBrAct } from "@/lib/fps/br/actions";

/** Dragging within the equipment panel (owner, 2026-11-09). */
const gun = (item: WeaponId, extra = {}) => ({
  item,
  qty: 1,
  mag: (ITEMS[item] as WeaponDef).magazine,
  ...extra,
});
const two = (): Loadout => {
  const l = newLoadout();
  pickUp(l, gun("ak47", { muzzle: "silencer" }));
  pickUp(l, gun("awp"));
  return l;
};

describe("moveEquipped", () => {
  it("swaps the main guns and keeps the drawn gun drawn", () => {
    const l = two();
    const drawn = l.guns[l.active as 0 | 1]!.item;
    expect(moveEquipped(l, "gun0", "gun1").ok).toBe(true);
    expect(l.guns[0]!.item).toBe("awp");
    expect(l.guns[1]!.item).toBe("ak47");
    expect(l.guns[l.active as 0 | 1]!.item).toBe(drawn);
  });
  it("moves a gun into an empty main slot", () => {
    const l = newLoadout();
    pickUp(l, gun("ak47"));
    expect(moveEquipped(l, "gun0", "gun1").ok).toBe(true);
    expect(l.guns[0]).toBeNull();
    expect(l.guns[1]!.item).toBe("ak47");
    expect(l.active).toBe(1);
  });
  it("never puts a rifle in the pistol slot", () => {
    const l = two();
    expect(moveEquipped(l, "gun0", "gun2").ok).toBe(false);
  });
  it("moves an attachment to another gun where it fits", () => {
    const l = two();
    expect(moveEquipped(l, "muzzle0", "muzzle1").ok).toBe(true);
    expect(l.guns[0]!.muzzle).toBeNull();
    expect(l.guns[1]!.muzzle).toBe("silencer");
  });
  it("refuses an attachment kind change", () => {
    const l = two();
    expect(moveEquipped(l, "muzzle0", "optic1").ok).toBe(false);
  });
  it("validates the action", () => {
    expect(validateBrAct({ v: 1, type: "br-act", act: "move", slot: "gun0", to: "gun1" })).toEqual({
      act: "move",
      slot: "gun0",
      to: "gun1",
    });
    expect(validateBrAct({ v: 1, type: "br-act", act: "move", slot: "gun0", to: "x" })).toBeNull();
  });
});

/** Loot dropped on a weapon card (owner, 2026-11-27: "it lands in the silencer spot"). */
describe("pickUpOnto", () => {
  const ak = () => {
    const l = newLoadout();
    pickUp(l, gun("ak47"));
    pickUp(l, gun("awp"));
    pickUp(l, gun("deagle"));
    l.active = 1; // the AWP drawn: a plain pickup would have chosen it first
    return l;
  };
  it("fits a suppressor from the ground into the AK-47's muzzle slot", () => {
    const l = ak();
    expect(pickUpOnto(l, { item: "silencer", qty: 1 }, 0).ok).toBe(true);
    expect(l.guns[0]!.muzzle).toBe("silencer");
    expect(l.guns[1]!.muzzle).toBeFalsy();
    expect(l.bag).toEqual([]);
  });
  it("fits each kind into its own slot: optic, muzzle, extended magazine", () => {
    const l = ak();
    for (const item of ["sight-red", "compensator", "mag-ext"] as const)
      expect(pickUpOnto(l, { item, qty: 1 }, 0).ok).toBe(true);
    expect(l.guns[0]).toMatchObject({
      optic: "sight-red",
      muzzle: "compensator",
      extMag: "mag-ext",
    });
  });
  it("swaps out what was fitted into the bag, or beside the player when the bag is full", () => {
    const l = ak();
    pickUpOnto(l, { item: "compensator", qty: 1 }, 0);
    expect(pickUpOnto(l, { item: "silencer", qty: 1 }, 0).ok).toBe(true);
    expect(l.guns[0]!.muzzle).toBe("silencer");
    expect(l.bag.map((b) => b.item)).toEqual(["compensator"]);
    const full = ak();
    pickUpOnto(full, { item: "compensator", qty: 1 }, 0);
    while (freeSlots(full) > 0) full.bag.push({ item: "scope-4x", qty: 1 });
    const out = pickUpOnto(full, { item: "flash-hider", qty: 1 }, 0);
    expect(out.ok).toBe(true);
    expect(full.guns[0]!.muzzle).toBe("flash-hider");
    expect(out.drops).toEqual([{ item: "compensator", qty: 1 }]);
  });
  it("refuses what does not fit that gun, and an empty slot", () => {
    const l = ak();
    expect(pickUpOnto(l, { item: "silencer", qty: 1 }, 2).ok).toBe(false); // no muzzle on the pistol
    expect(l.guns[2]!.muzzle).toBeFalsy();
    const none = newLoadout();
    expect(pickUpOnto(none, { item: "silencer", qty: 1 }, 0).reason).toBe("No gun in that slot");
  });
  it("is an ordinary pickup for anything that is not an attachment", () => {
    const l = ak();
    expect(pickUpOnto(l, { item: "bandage", qty: 5 }, 0).ok).toBe(true);
    expect(l.bag.find((b) => b.item === "bandage")?.qty).toBe(5);
  });
  it("accepts the card's gun on the pickup action, 0 to 2 only", () => {
    expect(validateBrAct({ v: 1, type: "br-act", act: "pickup", id: 4, gun: 0 })).toEqual({
      act: "pickup",
      id: 4,
      gun: 0,
    });
    expect(validateBrAct({ v: 1, type: "br-act", act: "pickup", id: 4 })).toEqual({
      act: "pickup",
      id: 4,
    });
    expect(validateBrAct({ v: 1, type: "br-act", act: "pickup", id: 4, gun: 3 })).toBeNull();
    expect(validateBrAct({ v: 1, type: "br-act", act: "pickup", id: 4, gun: "0" })).toBeNull();
  });
});
