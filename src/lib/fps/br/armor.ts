import type { HitZone } from "../combat";
import { ARMOR_RULES, ITEMS, type ItemId, type WeaponDef } from "./items";

/**
 * Battle royale damage after armour (LOOT-SPEC §7–9). It extends the existing CS-style vest
 * rule (combat.ts `applyVestDamage`: the vest takes a share of body hits, head and legs are
 * not covered by it, armour wears down with what it stops) to three wearable layers:
 *
 *   head   → helmet only
 *   chest, stomach → vest + the first intact plate (slot order), together capped at
 *            ARMOR_RULES.bodyCap so no combination comes close to invulnerability
 *   legs   → nothing (as in 1v1/5v5)
 *
 * Each layer absorbs at most its remaining durability, loses exactly what it absorbed and is
 * removed at zero, so a destroyed or empty slot never protects. A gun's `armorPierce` scales
 * the reduction down (the AWP ignores half of it, as its CS penetration is far higher).
 */
export type Worn = { item: ItemId; durability: number };
export type Armour = {
  helmet: Worn | null;
  vest: Worn | null;
  plates: [Worn | null, Worn | null, Worn | null];
};

export type DamageResult = {
  damage: number;
  /** Durability lost per layer, for the hit feedback and the HUD. */
  absorbed: { helmet: number; vest: number; plate: number };
  broke: Array<"helmet" | "vest" | `plate${1 | 2 | 3}`>;
};

const reduction = (w: Worn | null) =>
  w && w.durability > 0 ? (ITEMS[w.item] as { reduction: number }).reduction : 0;

export function applyBrDamage(
  armour: Armour,
  weapon: WeaponDef,
  zone: HitZone,
  /** Perks (perks.ts): the shooter's damage scale, the target's armour wear scale. */
  mods: { damage?: number; wear?: number } = {},
): DamageResult {
  const base = weapon.damage[zone] * (mods.damage ?? 1);
  const wear = mods.wear ?? 1;
  const result: DamageResult = {
    damage: Math.round(base),
    absorbed: { helmet: 0, vest: 0, plate: 0 },
    broke: [],
  };
  const keep = 1 - weapon.armorPierce;
  if (zone === "legs") return result;
  if (zone === "head") {
    const h = armour.helmet;
    if (!h || h.durability <= 0) return result;
    const take = Math.min(base * reduction(h) * keep, h.durability);
    h.durability -= take * wear;
    result.absorbed.helmet = take;
    result.damage = base - take;
    if (h.durability <= 1e-6) {
      armour.helmet = null;
      result.broke.push("helmet");
    }
    result.damage = Math.round(result.damage);
    return result;
  }
  const v = armour.vest && armour.vest.durability > 0 ? armour.vest : null;
  const plateIndex = armour.plates.findIndex((p) => !!p && p.durability > 0);
  const p = plateIndex >= 0 ? armour.plates[plateIndex]! : null;
  const rv = reduction(v),
    rp = reduction(p);
  const total = Math.min(rv + rp, ARMOR_RULES.bodyCap) * keep;
  if (total <= 0) return result;
  // The cap scales both layers' shares alike; each stops at its remaining durability.
  const scale = rv + rp > 0 ? total / (rv + rp) : 0;
  const takeV = v ? Math.min(base * rv * scale, v.durability) : 0,
    takeP = p ? Math.min(base * rp * scale, p.durability) : 0;
  if (v) {
    v.durability -= takeV * wear;
    if (v.durability <= 1e-6) {
      armour.vest = null;
      result.broke.push("vest");
    }
  }
  if (p) {
    p.durability -= takeP * wear;
    if (p.durability <= 1e-6) {
      armour.plates[plateIndex] = null;
      result.broke.push(`plate${(plateIndex + 1) as 1 | 2 | 3}`);
    }
  }
  result.absorbed.vest = takeV;
  result.absorbed.plate = takeP;
  result.damage = Math.round(base - takeV - takeP);
  return result;
}
