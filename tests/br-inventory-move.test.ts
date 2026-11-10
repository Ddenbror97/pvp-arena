import { describe, expect, it } from "vitest";
import { moveEquipped, newLoadout, pickUp, type Loadout } from "@/lib/fps/br/inventory";
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
