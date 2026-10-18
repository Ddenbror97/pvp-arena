/** Post-October 2025 CS2 trade-up math used by the on-page calculator. */

export type Wear = "FN" | "MW" | "FT" | "WW" | "BS";
export type Rarity = "consumer" | "industrial" | "milspec" | "restricted" | "classified" | "covert";

export type CatalogSkin = {
  name: string;
  min: number;
  max: number;
};

export type CatalogCollection = {
  id: string;
  name: string;
  skins: Record<Rarity, CatalogSkin[]>;
};

export const RARITY_LABEL: Record<Rarity, string> = {
  consumer: "Consumer Grade",
  industrial: "Industrial Grade",
  milspec: "Mil-Spec",
  restricted: "Restricted",
  classified: "Classified",
  covert: "Covert",
};

export const NEXT_RARITY: Record<Rarity, Rarity | "extraordinary"> = {
  consumer: "industrial",
  industrial: "milspec",
  milspec: "restricted",
  restricted: "classified",
  classified: "covert",
  covert: "extraordinary",
};

export const WEAR_RANGE: { wear: Wear; label: string; min: number; max: number }[] = [
  { wear: "FN", label: "Factory New", min: 0, max: 0.07 },
  { wear: "MW", label: "Minimal Wear", min: 0.07, max: 0.15 },
  { wear: "FT", label: "Field-Tested", min: 0.15, max: 0.38 },
  { wear: "WW", label: "Well-Worn", min: 0.38, max: 0.45 },
  { wear: "BS", label: "Battle-Scarred", min: 0.45, max: 1 },
];

export function wearOf(float: number): Wear {
  if (float < 0.07) return "FN";
  if (float < 0.15) return "MW";
  if (float < 0.38) return "FT";
  if (float < 0.45) return "WW";
  return "BS";
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Normalize a float into 0–1 using that skin's own min/max clip. */
export function normalizeFloat(float: number, min: number, max: number): number {
  const span = max - min;
  if (span <= 0) return 0;
  return clamp((float - min) / span, 0, 1);
}

export function outputFloat(avgNorm: number, min: number, max: number): number {
  return min + avgNorm * (max - min);
}

export type TradeInput = {
  collectionId: string;
  float: number;
  min: number;
  max: number;
  cost?: number;
};

export type TradeOutcome = {
  collectionId: string;
  collectionName: string;
  name: string;
  probability: number;
  float: number;
  wear: Wear;
  min: number;
  max: number;
};

/**
 * 10-skin weapon trade-up, or 5-skin Covert → knife/gloves when `slots` is 5.
 * Odds: each input weighs 1/n toward its collection, then uniform among that
 * collection's next-tier skins. Collections with no next-tier skins contribute
 * no outcomes (those inputs are wasted weight).
 */
export function calculateTradeUp(
  collections: CatalogCollection[],
  inputs: TradeInput[],
  inputRarity: Rarity,
  extraOutcomes: CatalogSkin[] = [],
): { outcomes: TradeOutcome[]; avgNorm: number; slots: number; wasted: number } {
  const slots = inputs.length;
  const next = NEXT_RARITY[inputRarity];
  const byId = new Map(collections.map((c) => [c.id, c]));
  const avgNorm = inputs.reduce((s, i) => s + normalizeFloat(i.float, i.min, i.max), 0) / slots;

  const weight = new Map<string, number>();
  for (const input of inputs)
    weight.set(input.collectionId, (weight.get(input.collectionId) ?? 0) + 1);

  const outcomes: TradeOutcome[] = [];
  let wasted = 0;
  for (const [collectionId, count] of weight) {
    const col = byId.get(collectionId);
    if (!col) continue;
    const pool =
      next === "extraordinary"
        ? extraOutcomes.length
          ? extraOutcomes
          : [{ name: `Knife or gloves from ${col.name}`, min: 0.06, max: 0.8 }]
        : col.skins[next];
    if (!pool.length) {
      wasted += count / slots;
      continue;
    }
    const share = count / slots / pool.length;
    for (const skin of pool) {
      const f = outputFloat(avgNorm, skin.min, skin.max);
      outcomes.push({
        collectionId,
        collectionName: col.name,
        name: skin.name,
        probability: share,
        float: f,
        wear: wearOf(f),
        min: skin.min,
        max: skin.max,
      });
    }
  }

  outcomes.sort((a, b) => b.probability - a.probability || a.name.localeCompare(b.name));
  return { outcomes, avgNorm, slots, wasted };
}

export function expectedValue(
  outcomes: TradeOutcome[],
  prices: Record<string, number>,
  inputCost: number,
): number {
  const gross = outcomes.reduce(
    (s, o) => s + o.probability * (prices[`${o.collectionId}:${o.name}`] ?? 0),
    0,
  );
  return gross - inputCost;
}

/** Teaching catalog: real public collections with documented next-tier counts. */
export const TRADEUP_CATALOG: CatalogCollection[] = [
  {
    id: "dust2",
    name: "The Dust 2 Collection",
    skins: {
      consumer: [
        { name: "G3SG1 | Desert Storm", min: 0.06, max: 0.8 },
        { name: "Nova | Predator", min: 0.06, max: 0.8 },
        { name: "MP9 | Sand Dashed", min: 0.06, max: 0.8 },
        { name: "P250 | Sand Dune", min: 0.06, max: 0.8 },
        { name: "SCAR-20 | Sand Mesh", min: 0.06, max: 0.8 },
        { name: "P90 | Sand Spray", min: 0.06, max: 0.8 },
      ],
      industrial: [
        { name: "Five-SeveN | Orange Peel", min: 0.06, max: 0.8 },
        { name: "MAC-10 | Palm", min: 0.06, max: 0.8 },
        { name: "AK-47 | Safari Mesh", min: 0.06, max: 0.8 },
        { name: "Sawed-Off | Snake Camo", min: 0.06, max: 0.8 },
        { name: "Tec-9 | VariCamo", min: 0, max: 0.6 },
      ],
      milspec: [
        { name: "PP-Bizon | Brass", min: 0, max: 1 },
        { name: "SG 553 | Damascus Steel", min: 0, max: 0.8 },
        { name: "M4A1-S | VariCamo", min: 0, max: 0.6 },
      ],
      restricted: [{ name: "P2000 | Amber Fade", min: 0, max: 0.4 }],
      classified: [{ name: "R8 Revolver | Amber Fade", min: 0, max: 0.4 }],
      covert: [],
    },
  },
  {
    id: "inferno",
    name: "The Inferno Collection",
    skins: {
      consumer: [
        { name: "MAG-7 | Sand Dune", min: 0.06, max: 0.8 },
        { name: "UMP-45 | Gunsmoke", min: 0.06, max: 0.8 },
      ],
      industrial: [
        { name: "P250 | Franklin", min: 0, max: 0.4 },
        { name: "Dual Berettas | Contractor", min: 0.06, max: 0.8 },
      ],
      milspec: [
        { name: "Tec-9 | Brass", min: 0, max: 1 },
        { name: "Dual Berettas | Anodized Navy", min: 0, max: 0.08 },
      ],
      restricted: [{ name: "M4A4 | Tornado", min: 0.06, max: 0.8 }],
      classified: [{ name: "AK-47 | Emerald Pinstripe", min: 0, max: 1 }],
      covert: [],
    },
  },
  {
    id: "mirage",
    name: "The Mirage Collection",
    skins: {
      consumer: [
        { name: "G3SG1 | Safari Mesh", min: 0.06, max: 0.8 },
        { name: "P90 | Sand Spray", min: 0.06, max: 0.8 },
      ],
      industrial: [
        { name: "MP9 | Hot Rod", min: 0, max: 0.08 },
        { name: "UMP-45 | Blaze", min: 0, max: 0.08 },
      ],
      milspec: [
        { name: "MAC-10 | Amber Fade", min: 0, max: 0.4 },
        { name: "Glock-18 | Candy Apple", min: 0, max: 0.3 },
      ],
      restricted: [{ name: "MAG-7 | Bulldozer", min: 0, max: 0.43 }],
      classified: [{ name: "MP9 | Bulldozer", min: 0, max: 0.43 }],
      covert: [],
    },
  },
  {
    id: "dreams",
    name: "Dreams & Nightmares",
    skins: {
      consumer: [],
      industrial: [],
      milspec: [
        { name: "Five-SeveN | Scrawl", min: 0, max: 1 },
        { name: "MAC-10 | Ensnared", min: 0, max: 1 },
        { name: "MAG-7 | Foresight", min: 0, max: 0.7 },
        { name: "MP5-SD | Necro Jr.", min: 0, max: 1 },
        { name: "P2000 | Lifted Shadows", min: 0, max: 1 },
        { name: "SCAR-20 | Poultrygeist", min: 0, max: 1 },
        { name: "Sawed-Off | Spirit Board", min: 0, max: 1 },
      ],
      restricted: [
        { name: "FAMAS | Rapid Eye Movement", min: 0, max: 1 },
        { name: "Dual Berettas | Melondrama", min: 0, max: 1 },
        { name: "MP7 | Abyssal Apparition", min: 0, max: 1 },
        { name: "XM1014 | Zombie Offensive", min: 0, max: 0.5 },
        { name: "G3SG1 | Dream Glade", min: 0, max: 1 },
      ],
      classified: [
        { name: "M4A1-S | Night Terror", min: 0, max: 1 },
        { name: "USP-S | Ticket to Hell", min: 0, max: 0.76 },
        { name: "Dual Berettas | Flora Carnivora", min: 0, max: 1 },
      ],
      covert: [
        { name: "AK-47 | Nightwish", min: 0, max: 1 },
        { name: "MP9 | Starlight Protector", min: 0, max: 0.8 },
      ],
    },
  },
  {
    id: "revolution",
    name: "Revolution",
    skins: {
      consumer: [],
      industrial: [],
      milspec: [
        { name: "MAG-7 | Insomnia", min: 0, max: 1 },
        { name: "MP9 | Featherweight", min: 0, max: 1 },
        { name: "SCAR-20 | Fragments", min: 0, max: 0.78 },
        { name: "P250 | Re.built", min: 0, max: 0.9 },
        { name: "MP5-SD | Liquidation", min: 0, max: 1 },
        { name: "SG 553 | Cyberforce", min: 0, max: 0.9 },
        { name: "Tec-9 | Rebel", min: 0, max: 1 },
      ],
      restricted: [
        { name: "M4A4 | Temukau", min: 0, max: 0.8 },
        { name: "P90 | Neoqueen", min: 0, max: 0.6 },
        { name: "Glock-18 | Umbral Rabbit", min: 0, max: 0.75 },
        { name: "MAC-10 | Sakkaku", min: 0.21, max: 0.79 },
        { name: "R8 Revolver | Banana Cannon", min: 0, max: 1 },
      ],
      classified: [
        { name: "AK-47 | Head Shot", min: 0, max: 1 },
        { name: "AWP | Duality", min: 0, max: 0.7 },
        { name: "UMP-45 | Wild Child", min: 0, max: 1 },
      ],
      covert: [
        { name: "M4A1-S | Emphorosaur-S", min: 0, max: 0.8 },
        { name: "P2000 | Wicked Sick", min: 0, max: 1 },
      ],
    },
  },
];
