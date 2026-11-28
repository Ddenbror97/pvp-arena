import { describe, expect, it } from "vitest";
import { dropAction } from "@/lib/fps/br/inventory-drop";
import type { BrKitView } from "@/lib/fps/br/match";

/**
 * Owner, 2026-11-27: "make that the player can drag their loot eq silencer to the AK47 and it
 * lands in the silencer spot, now player have to drag and place each item at correct spot".
 */
const kit = {
  active: 1,
  guns: [
    { item: "ak47", mag: 30, optic: null, muzzle: null },
    { item: "awp", mag: 5, optic: null, muzzle: null },
    { item: "deagle", mag: 7, optic: null, muzzle: null },
  ],
  bag: [
    { item: "silencer", qty: 1 },
    { item: "sight-red", qty: 1 },
    { item: "bandage", qty: 5 },
    { item: "mag-ext", qty: 1 },
  ],
  plates: [null, null, null],
} as unknown as BrKitView;
const nearby = [
  { id: 11, item: "silencer" },
  { id: 12, item: "bandage" },
  { id: 13, item: "scope-4x" },
];

describe("inventory drag and drop", () => {
  it("fits ground loot onto the gun whose card it lands on, whichever tile", () => {
    for (const target of ["gun0", "optic0", "muzzle0", "mag0"] as const)
      expect(dropAction(kit, nearby, { kind: "near", id: 11 }, target)).toEqual({
        act: "pickup",
        id: 11,
        gun: 0,
      });
    expect(dropAction(kit, nearby, { kind: "near", id: 13 }, "muzzle1")).toEqual({
      act: "pickup",
      id: 13,
      gun: 1,
    });
  });
  it("picks up anything else, and attachments dropped outside a card, as before", () => {
    expect(dropAction(kit, nearby, { kind: "near", id: 12 }, "gun0")).toEqual({
      act: "pickup",
      id: 12,
    });
    expect(dropAction(kit, nearby, { kind: "near", id: 11 }, "bag")).toEqual({
      act: "pickup",
      id: 11,
    });
    expect(dropAction(kit, nearby, { kind: "near", id: 11 }, "near")).toBeNull();
  });
  it("equips a bag attachment onto the card's gun from any of its tiles", () => {
    // The suppressor dropped on the AK-47's optic tile still goes to its muzzle.
    expect(dropAction(kit, nearby, { kind: "bag", index: 0 }, "optic0")).toEqual({
      act: "equip",
      index: 0,
      target: 0,
    });
    expect(dropAction(kit, nearby, { kind: "bag", index: 1 }, "mag2")).toEqual({
      act: "equip",
      index: 1,
      target: 2,
    });
    expect(dropAction(kit, nearby, { kind: "bag", index: 3 }, "gun1")).toEqual({
      act: "equip",
      index: 3,
      target: 1,
    });
    // The pistol takes no suppressor.
    expect(dropAction(kit, nearby, { kind: "bag", index: 0 }, "gun2")).toBeNull();
    expect(dropAction(kit, nearby, { kind: "bag", index: 2 }, "gun0")).toBeNull();
  });
  it("moves a fitted attachment to the matching slot of the gun it lands on", () => {
    expect(dropAction(kit, nearby, { kind: "equip", slot: "muzzle0" }, "optic1")).toEqual({
      act: "move",
      slot: "muzzle0",
      to: "muzzle1",
    });
    expect(dropAction(kit, nearby, { kind: "equip", slot: "optic1" }, "gun0")).toEqual({
      act: "move",
      slot: "optic1",
      to: "optic0",
    });
    // A plate never turns into a weapon move.
    expect(dropAction(kit, nearby, { kind: "equip", slot: "plate1" }, "gun0")).toBeNull();
    expect(dropAction(kit, nearby, { kind: "equip", slot: "gun0" }, "muzzle1")).toEqual({
      act: "move",
      slot: "gun0",
      to: "gun1",
    });
  });
  it("keeps the other drags: drop, unequip, plates", () => {
    expect(dropAction(kit, nearby, { kind: "bag", index: 2 }, "near")).toEqual({
      act: "dropBag",
      index: 2,
    });
    expect(dropAction(kit, nearby, { kind: "equip", slot: "muzzle0" }, "bag")).toEqual({
      act: "unequip",
      slot: "muzzle0",
    });
    expect(dropAction(kit, nearby, { kind: "equip", slot: "gun0" }, "bag")).toBeNull();
    expect(dropAction(kit, nearby, { kind: "equip", slot: "plate0" }, "plate2")).toEqual({
      act: "move",
      slot: "plate0",
      to: "plate2",
    });
  });
});
