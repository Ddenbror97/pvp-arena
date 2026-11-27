import type { BrAct } from "./actions";
import { EQUIP_SLOTS, type EquipSlot } from "./inventory";
import { fitsGun, ITEMS, type ItemId } from "./items";
import type { BrKitView } from "./match";

/**
 * What a drag-and-drop on the inventory screen (B) asks the server for. Pure, so the rules are
 * tested without a browser; the server still checks every act (actions.ts).
 */
export type InvDrag =
  | { kind: "bag"; index: number }
  | { kind: "equip"; slot: EquipSlot }
  | { kind: "near"; id: number };
export type InvDropTarget = "bag" | "near" | EquipSlot;

const SLOTS = new Set<string>(EQUIP_SLOTS);
const category = (item: string) => (item in ITEMS ? ITEMS[item as ItemId].category : null);

export const isAttachment = (item: string) => {
  const c = category(item);
  return c === "optic" || c === "muzzle" || c === "magazine";
};

/** The gun a weapon card or any of its attachment tiles stands for (null: not a gun's). */
export const gunOfSlot = (target: InvDropTarget) =>
  /^(gun|optic|muzzle|mag)\d$/.test(target) ? (+target.slice(-1) as 0 | 1 | 2) : null;

/** Where a bag item goes when equipped (null: it cannot be equipped there). */
export function equipTarget(kit: BrKitView, item: string, slot?: EquipSlot): number | null {
  const c = category(item);
  if (c === "helmet" || c === "vest") return slot === undefined || slot === c ? 0 : null;
  if (c === "plate") {
    if (slot?.startsWith("plate")) return +slot.slice(5);
    const free = kit.plates.findIndex((p) => !p);
    return slot === undefined ? Math.max(0, free) : null;
  }
  if (c === "optic" || c === "muzzle" || c === "magazine") {
    // Only onto a gun it fits (the Desert Eagle takes a red dot, the magazine, nothing else).
    const onto = (i: number) => {
      const g = kit.guns[i as 0 | 1 | 2];
      return g && fitsGun(g.item, item as ItemId) ? i : null;
    };
    // Anywhere on a weapon card, its own tiles included (owner, 2026-11-27): the card's gun.
    const gun = slot === undefined ? null : gunOfSlot(slot);
    if (gun !== null) return onto(gun);
    if (slot !== undefined) return null;
    for (const i of [kit.active, 0, 1, 2]) if (i >= 0 && onto(i) !== null) return i;
    return null;
  }
  return null;
}

export function dropAction(
  kit: BrKitView,
  nearby: ReadonlyArray<{ id: number; item: string }>,
  d: InvDrag,
  target: InvDropTarget,
): BrAct | null {
  const gun = gunOfSlot(target);
  if (d.kind === "near") {
    if (target === "near") return null;
    // Owner, 2026-11-27: loot dropped anywhere on a weapon card fits that gun's matching slot
    // (a suppressor on the AK-47's card lands in its muzzle slot). Other loot: a pickup.
    const item = nearby.find((n) => n.id === d.id)?.item ?? "";
    return isAttachment(item) && gun !== null && kit.guns[gun]
      ? { act: "pickup", id: d.id, gun }
      : { act: "pickup", id: d.id };
  }
  if (d.kind === "bag") {
    if (target === "near") return { act: "dropBag", index: d.index };
    if (target === "bag") return null;
    const t = equipTarget(kit, kit.bag[d.index]?.item ?? "", target);
    return t === null ? null : { act: "equip", index: d.index, target: t };
  }
  if (target === "near") return { act: "dropEquip", slot: d.slot };
  if (target === "bag")
    return !d.slot.startsWith("gun") && d.slot !== "backpack"
      ? { act: "unequip", slot: d.slot }
      : null;
  if (target === d.slot) return null;
  // Between equipment slots: swap the main guns, move an attachment or plate. An attachment
  // dropped on another gun's card, or on any of its tiles, goes to that gun's matching slot; a
  // gun dropped on another gun's attachment tile means that gun.
  const to =
    d.slot.startsWith("gun") && gun !== null
      ? `gun${gun}`
      : /^(optic|muzzle|mag)\d$/.test(d.slot) && gun !== null
        ? `${d.slot.slice(0, -1)}${gun}`
        : target;
  // Only between slots of one kind (gun, plate, optic, muzzle, magazine); the server decides the rest.
  const kind = (s: string) => s.replace(/\d$/, "");
  return to !== d.slot && SLOTS.has(to) && kind(to) === kind(d.slot)
    ? { act: "move", slot: d.slot, to: to as EquipSlot }
    : null;
}
