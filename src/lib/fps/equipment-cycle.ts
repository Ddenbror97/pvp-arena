import { GRENADE_TYPES, type GrenadeInventory, type GrenadeType } from "./grenades/rules";
import type { Weapon } from "./protocol";

/** One shared wheel order, skipping grenades already consumed this round. */
export function cycleEquipment(
  weapon: Weapon,
  nade: GrenadeType | undefined,
  inventory: GrenadeInventory | undefined,
  direction: number,
) {
  const slots = [
    "rifle",
    "knife",
    ...GRENADE_TYPES.filter((type) => (inventory?.[type] ?? 0) > 0),
  ] as const;
  const current = weapon === "grenade" ? nade : weapon;
  const index = slots.indexOf(current as (typeof slots)[number]);
  const next =
    slots[(Math.max(0, index) + (direction < 0 ? -1 : 1) + slots.length) % slots.length]!;
  return next === "rifle" || next === "knife"
    ? { weapon: next }
    : { weapon: "grenade" as const, nade: next };
}
