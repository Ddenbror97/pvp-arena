import type { HitZone } from "../combat";
import { ARMOR_RULES, ITEMS, type ItemId, type WeaponDef } from "./items";

/**
 * Battle royale damage after armour (LOOT-SPEC §7–9). It extends the existing CS-style vest
 * rule (combat.ts `applyVestDamage`: the vest takes a share of body hits, head and legs are
 * not covered by it, armour wears down with what it stops) to three wearable layers:
 *
 *   head   → helmet only
 *   chest, stomach → vest + every intact plate (up to three), together capped at
 *            ARMOR_RULES.bodyCap so no combination comes close to invulnerability.
 *            Plates sit in the vest: without an intact vest they do not protect.
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
  // Plates only work inside a vest; all intact plates stack.
  const plates = v
    ? armour.plates.flatMap((p, i) => (p && p.durability > 0 ? [{ p, i }] : []))
    : [];
  const rv = reduction(v),
    rps = plates.map(({ p }) => reduction(p)),
    rp = rps.reduce((a, b) => a + b, 0);
  const total = Math.min(rv + rp, ARMOR_RULES.bodyCap) * keep;
  if (total <= 0) return result;
  // The cap scales every layer's share alike; each stops at its remaining durability.
  const scale = rv + rp > 0 ? total / (rv + rp) : 0;
  const takeV = v ? Math.min(base * rv * scale, v.durability) : 0;
  let takeP = 0;
  plates.forEach(({ p, i }, k) => {
    const take = Math.min(base * rps[k]! * scale, p.durability);
    takeP += take;
    p.durability -= take * wear;
    if (p.durability <= 1e-6) {
      armour.plates[i] = null;
      result.broke.push(`plate${(i + 1) as 1 | 2 | 3}`);
    }
  });
  if (v) {
    v.durability -= takeV * wear;
    if (v.durability <= 1e-6) {
      armour.vest = null;
      result.broke.push("vest");
    }
  }
  result.absorbed.vest = takeV;
  result.absorbed.plate = takeP;
  result.damage = Math.round(base - takeV - takeP);
  return result;
}
