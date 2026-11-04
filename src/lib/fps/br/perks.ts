/**
 * The Tactical Tablet and its 10 perks (owner spec PERKS-SPEC.md; research PERKS-RESEARCH.md).
 * One central table: names, descriptions, categories, rarity, unlock cost and the effect values
 * the server applies (combat.ts, armor.ts, inventory/actions, match.ts). At most 3 perks are
 * active at once; perks work only while the player carries the tablet, and the tablet carries
 * its own progress (Tactical Data, unlocks, active slots), so a looted tablet changes hands with
 * everything on it. Tactical Data is match-only (no persistent currency).
 */
export type PerkId =
  | "deadly-bullets"
  | "faster-reload"
  | "ammo-efficiency"
  | "armor-specialist"
  | "fast-revive"
  | "adrenaline"
  | "combat-chip"
  | "recon-chip"
  | "survival-chip"
  | "scavenger-chip";

type Perk = {
  n: string;
  name: string;
  category:
    | "COMBAT"
    | "WEAPON HANDLING"
    | "SUPPLY"
    | "DEFENSE"
    | "SUPPORT"
    | "MOBILITY"
    | "RECON"
    | "SURVIVAL";
  description: string;
  rarity: "rare" | "epic";
  cost: number;
  /** Set when the effect needs a system the battle royale does not have yet (then it cannot be activated). */
  needs?: string;
};

export const PERKS: Record<PerkId, Perk> = {
  "deadly-bullets": {
    n: "01",
    name: "Deadly Bullets",
    category: "COMBAT",
    description: "Deal 15% more weapon damage.",
    rarity: "epic",
    cost: 6,
  },
  "faster-reload": {
    n: "02",
    name: "Faster Reload",
    category: "WEAPON HANDLING",
    description: "Reload 20% faster.",
    rarity: "rare",
    cost: 3,
  },
  "ammo-efficiency": {
    n: "03",
    name: "Ammo Efficiency",
    category: "SUPPLY",
    description: "10% chance that a shot does not use a round.",
    rarity: "rare",
    cost: 3,
  },
  "armor-specialist": {
    n: "04",
    name: "Armor Specialist",
    category: "DEFENSE",
    description: "Helmet, kevlar and plates wear 15% slower.",
    rarity: "rare",
    cost: 4,
  },
  "fast-revive": {
    n: "05",
    name: "Fast Revive",
    category: "SUPPORT",
    description: "Revive teammates 30% faster.",
    rarity: "rare",
    cost: 3,
    needs: "Squads (teammates and revives) are not in the battle royale yet",
  },
  adrenaline: {
    n: "06",
    name: "Adrenaline Chip",
    category: "MOBILITY",
    description: "Recover from sprinting 25% faster.",
    rarity: "rare",
    cost: 4,
    needs: "Sprint stamina is not in the battle royale yet (sprint is unlimited)",
  },
  "combat-chip": {
    n: "07",
    name: "Combat Chip",
    category: "WEAPON HANDLING",
    description: "Switch weapons 20% faster.",
    rarity: "rare",
    cost: 3,
  },
  "recon-chip": {
    n: "08",
    name: "Recon Chip",
    category: "RECON",
    description: "Sense the direction of gunfire within 150 m, even silenced.",
    rarity: "epic",
    cost: 6,
  },
  "survival-chip": {
    n: "09",
    name: "Survival Chip",
    category: "SURVIVAL",
    description: "Use bandages and medkits 20% faster.",
    rarity: "rare",
    cost: 4,
  },
  "scavenger-chip": {
    n: "10",
    name: "Scavenger Chip",
    category: "SUPPLY",
    description: "Get 20% more ammunition from loot.",
    rarity: "rare",
    cost: 3,
  },
};
export const PERK_IDS = Object.keys(PERKS) as PerkId[];
export const isPerkId = (v: unknown): v is PerkId =>
  typeof v === "string" && Object.prototype.hasOwnProperty.call(PERKS, v);

/** Effect values (one place to tune after playtests). */
export const PERK_EFFECT = {
  damage: 1.15,
  reload: 0.8,
  freeShotChance: 0.1,
  armorWear: 1 / 1.15,
  revive: 0.7,
  sprintRecovery: 0.75,
  switch: 0.8,
  reconRadiusM: 150,
  heal: 0.8,
  scavengerAmmo: 1.2,
} as const;

export const TABLET = {
  activeSlots: 3,
  /** Data on a freshly found tablet. */
  startData: 3,
  /** Data per elimination while carrying the tablet (the only source after the start; no Data
   * Drives, owner 2026-11-04). */
  perElimination: 2,
  maxData: 60,
} as const;

/** The tablet's own state (travels with the item). */
export type TabletState = { data: number; unlocked: PerkId[]; active: Array<PerkId | null> };
export const newTablet = (): TabletState => ({
  data: TABLET.startData,
  unlocked: [],
  active: [null, null, null],
});

/** Is this perk working for a player with this tablet? */
export const perkOn = (t: TabletState | null | undefined, id: PerkId) =>
  !!t && t.active.includes(id) && !PERKS[id].needs;

export type PerkOp =
  | { op: "unlock"; perk: PerkId }
  | { op: "activate"; perk: PerkId; slot: number }
  | { op: "deactivate"; slot: number };

/** Apply a tablet operation (server). Returns why it was refused, or null. */
export function perkOperation(t: TabletState, o: PerkOp): string | null {
  switch (o.op) {
    case "unlock": {
      const p = PERKS[o.perk];
      if (t.unlocked.includes(o.perk)) return "Already unlocked";
      if (t.data < p.cost) return "Insufficient data";
      t.data -= p.cost;
      t.unlocked.push(o.perk);
      return null;
    }
    case "activate": {
      if (!(o.slot >= 0 && o.slot < TABLET.activeSlots)) return "No such slot";
      if (!t.unlocked.includes(o.perk)) return "Locked";
      if (PERKS[o.perk].needs) return PERKS[o.perk].needs!;
      if (t.active.includes(o.perk)) return "Already active";
      t.active[o.slot] = o.perk; // replaces what was in the slot (never a fourth)
      return null;
    }
    case "deactivate": {
      if (!(o.slot >= 0 && o.slot < TABLET.activeSlots)) return "No such slot";
      t.active[o.slot] = null;
      return null;
    }
  }
}
