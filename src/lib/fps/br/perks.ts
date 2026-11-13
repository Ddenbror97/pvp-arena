/**
 * The Tactical Tablet and its 16 perks (owner, 2026-11-13: "Upgrade the Battle Royale Tactical
 * iPad and Perk System"; the first ten: PERKS-SPEC.md, 2026-11-04). Solo battle royale only: no
 * perk depends on teammates, revives or a downed state.
 *
 * One central table: names, descriptions, rarity, unlock cost (rare 3, epic 6) and the effect
 * values the server applies (combat.ts, armor.ts, actions.ts, match.ts, movement.ts,
 * grenades). At most 3 perks are active at once; perks work only while the player carries the
 * tablet, and the tablet carries its own progress (Tactical Data, unlocks, active slots): drop
 * it and the perks stop at once, pick it up again and everything on it is back, nothing paid
 * twice. Tactical Data is match-only (no persistent currency): a new match rolls new tablets.
 */
export type PerkId =
  | "quick-hands"
  | "combat-ready"
  | "scavenger"
  | "field-medic"
  | "lightweight"
  | "iron-plates"
  | "steady-aim"
  | "silent-steps"
  | "fast-recovery"
  | "quick-vault"
  | "deadly-precision"
  | "ghost-protocol"
  | "battle-hardened"
  | "tracker"
  | "last-stand"
  | "explosive-expert";

type Perk = {
  n: string;
  name: string;
  description: string;
  rarity: "rare" | "epic";
  cost: number;
  /** Set when the effect needs a system the battle royale does not have (then it cannot be unlocked or activated). */
  needs?: string;
};

const RARE = 3,
  EPIC = 6;
export const PERKS: Record<PerkId, Perk> = {
  "quick-hands": {
    n: "01",
    name: "Quick Hands",
    description: "Reload weapons 15% faster.",
    rarity: "rare",
    cost: RARE,
  },
  "combat-ready": {
    n: "02",
    name: "Combat Ready",
    description: "Switch weapons 25% faster.",
    rarity: "rare",
    cost: RARE,
  },
  scavenger: {
    n: "03",
    name: "Scavenger",
    description: "Collect 25% more ammunition from loot.",
    rarity: "rare",
    cost: RARE,
  },
  "field-medic": {
    n: "04",
    name: "Field Medic",
    description: "Use bandages and medkits 20% faster.",
    rarity: "rare",
    cost: RARE,
  },
  lightweight: {
    n: "05",
    name: "Lightweight",
    description: "Sprint 8% faster.",
    rarity: "rare",
    cost: RARE,
  },
  "iron-plates": {
    n: "06",
    name: "Iron Plates",
    description: "Armor durability increased by 15%.",
    rarity: "rare",
    cost: RARE,
  },
  "steady-aim": {
    n: "07",
    name: "Steady Aim",
    description: "Reduce weapon sway while aiming by 20%.",
    rarity: "rare",
    cost: RARE,
  },
  "silent-steps": {
    n: "08",
    name: "Silent Steps",
    // Walking and crouching are already silent on the island (footsteps.ts): the perk shortens
    // how far a run carries; a sprint is as loud as ever.
    description: "Running footsteps carry 25% less far. Sprinting stays loud.",
    rarity: "rare",
    cost: RARE,
  },
  "fast-recovery": {
    n: "09",
    name: "Fast Recovery",
    // The battle royale has no natural regeneration: the replacement uses the healing items.
    description: "Bandages restore 20% more health and heal up to 85.",
    rarity: "rare",
    cost: RARE,
  },
  "quick-vault": {
    n: "10",
    name: "Quick Vault",
    // There is no vault on the island; its climbs are the ladders and the climbing rope.
    description: "Climb ladders and ropes 20% faster.",
    rarity: "rare",
    cost: RARE,
  },
  "deadly-precision": {
    n: "11",
    name: "Deadly Precision",
    description: "Deal 8% more damage with non-headshot bullets (not the AWP).",
    rarity: "epic",
    cost: EPIC,
  },
  "ghost-protocol": {
    n: "12",
    name: "Ghost Protocol",
    description: "Your footprints fade from enemy Trackers in half the time.",
    rarity: "epic",
    cost: EPIC,
  },
  "battle-hardened": {
    n: "13",
    name: "Battle Hardened",
    description: "Reduce flash and concussion effects by 35%.",
    rarity: "epic",
    cost: EPIC,
    needs: "The battle royale has no flash or concussion grenades",
  },
  tracker: {
    n: "14",
    name: "Tracker",
    description: "See recent enemy footprints within 20 m for 8 seconds.",
    rarity: "epic",
    cost: EPIC,
  },
  "last-stand": {
    n: "15",
    name: "Last Stand",
    description: "After an elimination, 3 s out of combat starts a small heal. Once every 90 s.",
    rarity: "epic",
    cost: EPIC,
  },
  "explosive-expert": {
    n: "16",
    name: "Explosive Expert",
    description: "Throw grenades 15% farther. Take 20% less damage from your own.",
    rarity: "epic",
    cost: EPIC,
  },
};
export const PERK_IDS = Object.keys(PERKS) as PerkId[];
export const isPerkId = (v: unknown): v is PerkId =>
  typeof v === "string" && Object.prototype.hasOwnProperty.call(PERKS, v);

/** Effect values (one place to tune after playtests). */
export const PERK_EFFECT = {
  /** Quick Hands: reload time scale. */
  reload: 0.85,
  /** Combat Ready: draw time scale. */
  switch: 0.75,
  /** Scavenger: ammunition picked up from loot (not from what players dropped). */
  scavengerAmmo: 1.25,
  /** Field Medic: bandage and medkit use time scale. */
  heal: 0.8,
  /** Lightweight: sprint speed scale, on the ground only (never in the air, a vehicle, water). */
  sprint: 1.08,
  /** Iron Plates: helmet, vest and plate wear scale (15% more durability). */
  armorWear: 1 / 1.15,
  /** Steady Aim: first-person sway scale while aiming (the view only; bullets are the server's). */
  aimSway: 0.8,
  /** Silent Steps: how far a run is heard, of the usual distance. */
  stepRadius: 0.75,
  /** Fast Recovery: a bandage's heal scale and the health it heals up to. */
  bandageHeal: 1.2,
  bandageUpTo: 85,
  /** Quick Vault: ladder and rope climbing speed scale. */
  climb: 1.2,
  /** Deadly Precision: bullet damage scale off the head (never knives, blasts, fire, vehicles). */
  bodyDamage: 1.08,
  /** Ghost Protocol: how long the holder's footprints show, of the usual time. */
  ghostTrack: 0.5,
  /** Battle Hardened (not available: nothing to reduce). */
  flash: 0.65,
  /** Tracker: enemy footprints within `radiusM`, up to `lifeMs` old, at most `max` sent. */
  tracker: {
    radiusM: 20,
    lifeMs: 8000,
    /** Never a print younger than this: the trail shows where someone went, not where they are. */
    minAgeMs: 1000,
    max: 24,
    strideM: 1.5,
    keep: 14,
    everyTicks: 8,
  },
  /** Last Stand: a heal over time some seconds after an elimination, out of combat. */
  lastStand: {
    delayMs: 3000,
    cooldownMs: 90_000,
    heal: 15,
    overMs: 5000,
    pulseMs: 500,
    /** An elimination's heal that combat keeps putting off is dropped after this long. */
    expireMs: 20_000,
  },
  /** Explosive Expert: throw speed scale (15% farther is about 7% faster), own blast scale. */
  throwRange: 1.15,
  selfBlast: 0.8,
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

/** The tablet's own state (travels with the item). `v` 2: the 16-perk table. */
export type TabletState = {
  data: number;
  unlocked: PerkId[];
  active: Array<PerkId | null>;
  v?: 2;
};
export const newTablet = (): TabletState => ({
  data: TABLET.startData,
  unlocked: [],
  active: [null, null, null],
  v: 2,
});

/**
 * The first table's perks (a tablet from a match checkpointed before 2026-11-13) on the new one:
 * the same effect under its new name, or its Data back (the removed ones, and the difference
 * where a perk became cheaper).
 */
const LEGACY: Record<string, { to?: PerkId; paid: number }> = {
  "deadly-bullets": { to: "deadly-precision", paid: 6 },
  "faster-reload": { to: "quick-hands", paid: 3 },
  "ammo-efficiency": { paid: 3 },
  "armor-specialist": { to: "iron-plates", paid: 4 },
  "fast-revive": { paid: 3 },
  adrenaline: { paid: 4 },
  "combat-chip": { to: "combat-ready", paid: 3 },
  "recon-chip": { paid: 6 },
  "survival-chip": { to: "field-medic", paid: 4 },
  "scavenger-chip": { to: "scavenger", paid: 3 },
};
/** Bring a tablet to the current table, in place (idempotent). */
export function migrateTablet(t: TabletState): TabletState {
  if (t.v === 2) return t;
  const unlocked: PerkId[] = [];
  let refund = 0;
  const rename = (id: string | null): PerkId | null => {
    if (!id) return null;
    if (isPerkId(id)) return id;
    return LEGACY[id]?.to ?? null;
  };
  for (const id of t.unlocked as string[]) {
    const old = LEGACY[id];
    const now = rename(id);
    if (old) refund += old.paid - (now ? PERKS[now].cost : 0);
    if (now && !unlocked.includes(now)) unlocked.push(now);
  }
  const active: Array<PerkId | null> = [null, null, null];
  (t.active as Array<string | null>).slice(0, TABLET.activeSlots).forEach((id, i) => {
    const now = rename(id);
    if (now && unlocked.includes(now) && !active.includes(now) && !PERKS[now].needs)
      active[i] = now;
  });
  t.unlocked = unlocked;
  t.active = active;
  t.data = Math.max(0, Math.min(TABLET.maxData, Math.round(t.data) + Math.max(0, refund)));
  t.v = 2;
  return t;
}

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
      if (p.needs) return p.needs;
      if (t.data < p.cost) return "Insufficient data";
      t.data -= p.cost;
      t.unlocked.push(o.perk);
      return null;
    }
    case "activate": {
      if (!(o.slot >= 0 && o.slot < TABLET.activeSlots)) return "No such slot";
      if (!t.unlocked.includes(o.perk)) return "Locked";
      if (PERKS[o.perk].needs) return PERKS[o.perk].needs!;
      // Already in a slot: it moves (a perk holds one slot only); the same slot again is a
      // no-op, so a repeated request changes nothing.
      const at = t.active.indexOf(o.perk);
      if (at === o.slot) return null;
      if (at >= 0) t.active[at] = null;
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
