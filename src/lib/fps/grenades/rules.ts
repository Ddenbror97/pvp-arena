/**
 * Grenades (HE · smoke · incendiary): the shared rules. Plain data used by both match servers
 * (1v1 duels and Bomb Defusal), the client's prediction and the presentation; tune here.
 *
 * Inspired by Counter-Strike's grenades: left mouse is a full overhand throw, right mouse a short
 * underhand toss, both buttons a medium throw. Holding the button pulls the pin and readies the
 * throw; letting go throws. The fuse only starts when the grenade leaves the hand.
 *
 * Units: metres, seconds for physics, milliseconds for match clocks (server time).
 */
export type GrenadeType = "he" | "smoke" | "fire";
export const GRENADE_TYPES: readonly GrenadeType[] = ["he", "smoke", "fire"];
export type ThrowKind = "over" | "medium" | "under";
export type GrenadeInventory = Record<GrenadeType, number>;

export const GRENADE_NAMES: Record<GrenadeType, string> = {
  he: "HE Grenade",
  smoke: "Smoke Grenade",
  fire: "Incendiary Grenade",
};

export const GRENADES = {
  /** Handed out at every spawn (each round, each life). Maximum carried per type. */
  inventory: { he: 1, smoke: 1, fire: 1 } as GrenadeInventory,
  /** Draw time before the pin can be pulled (the first-person equip clip). */
  equipMs: 450,
  /**
   * From pressing the throw button until a throw can leave: the pin pull and the wind-up. A
   * release before this queues the throw for the moment the grenade is ready.
   */
  primeMs: 620,
  /** From the release to the grenade leaving the hand (each throw clip's release frame). */
  releaseMs: { over: 120, medium: 110, under: 140 } as Record<ThrowKind, number>,
  /** From the release until the previous weapon is drawn again (follow-through + recovery). */
  recoverMs: 520,
  /** Counter-Strike's throw strength per kind (0 underhand · 0.5 both buttons · 1 overhand). */
  strength: { over: 1, medium: 0.5, under: 0 } as Record<ThrowKind, number>,
  physics: {
    /** Fastest throw (m/s): CS's 750 units/s, in this game's scale. */
    maxSpeed: 17,
    /** Grenade gravity (m/s²). Lighter than the players' 14 so throws carry like CS's. */
    gravity: 8.6,
    /** Collision sphere (m). */
    radius: 0.045,
    /** Velocity kept after each bounce (CS: 0.45). */
    restitution: 0.45,
    /** Below this speed (m/s) on a floor the grenade stops. */
    restSpeed: 0.55,
    /** Share of the thrower's velocity the grenade inherits (CS: 1.25). */
    inherit: 1.25,
    /** Fixed simulation step (s): identical on the server and every client, at any frame rate. */
    step: 1 / 128,
    /** Distance ahead of the eye (m) the grenade leaves from. */
    spawnAhead: 0.3,
  },
  he: {
    fuseMs: 1500,
    /** Damage at the centre to an unarmoured player, and the reach of the blast (m). */
    damage: 98,
    radius: 5,
    /** Falloff: damage × (1 − d / radius) ^ falloff. */
    falloff: 1.35,
    /** Share of the damage a vest absorbs, and how much vest that costs per point absorbed. */
    vestAbsorb: 0.5,
    vestCost: 0.5,
  },
  smoke: {
    /** Pops once the grenade is at rest, but no earlier than this after the throw, and at the
     * latest after maxMs (still rolling). */
    minMs: 900,
    maxMs: 4000,
    durationMs: 18_000,
    /** The cloud grows to full size over expandMs and thins out over the last fadeMs. */
    expandMs: 1600,
    fadeMs: 3000,
    /** Sight is blocked until this far into the fade. */
    blockFade: 0.6,
    /** Cloud extent (m): horizontal radius and height above the ground. */
    radius: 3.4,
    height: 2.6,
    /** Puff grid spacing and puff radius (m). */
    spacing: 0.8,
    puff: 0.78,
    /** Sight is blocked once a line crosses this much puff (summed chord lengths, m): about
     * 0.9 m into the cloud's dense body. */
    blockDepth: 3,
    maxPuffs: 220,
  },
  fire: {
    /** A grenade that never touches a floor bursts in the air (no fire) after maxAirMs. */
    maxAirMs: 2000,
    durationMs: 7000,
    /** Flames spread outward at spreadSpeed (m/s) up to radius, over the floor only. */
    radius: 3.1,
    spreadSpeed: 5,
    cell: 0.5,
    maxCells: 44,
    /** Highest step between neighbouring cells (m): stairs yes, walls and ledges no. */
    stepUp: 0.38,
    /** Damage per second while standing in flames: starts at dps, rises by ramp per second of
     * continued exposure up to maxDps; resets once the player has been out for resetMs. */
    dps: 8,
    ramp: 10,
    maxDps: 34,
    resetMs: 600,
    /** Damage is applied every tickMs (server). */
    tickMs: 250,
    /** A player stands in a cell within this horizontal distance of its centre (m). */
    reach: 0.45,
  },
  /** Throws in flight per player at once (spam guard; the inventory is the real limit). */
  maxProjectilesPerPlayer: 3,
} as const;

export const fullInventory = (): GrenadeInventory => ({ ...GRENADES.inventory });

/** Which throw the buttons held during the hold make (bit 1 left, bit 2 right). */
export function throwKindOf(mask: number): ThrowKind {
  return (mask & 3) === 3 ? "medium" : (mask & 2) === 2 ? "under" : "over";
}

/** The next type to select with repeated `4` presses: the first carried type after `current`. */
export function nextGrenadeType(
  inventory: GrenadeInventory | undefined,
  current: GrenadeType | undefined,
): GrenadeType | null {
  if (!inventory) return null;
  const start = current ? GRENADE_TYPES.indexOf(current) + 1 : 0;
  for (let i = 0; i < GRENADE_TYPES.length; i++) {
    const type = GRENADE_TYPES[(start + i) % GRENADE_TYPES.length]!;
    if (inventory[type] > 0) return type;
  }
  return null;
}

export const isGrenadeType = (x: unknown): x is GrenadeType =>
  x === "he" || x === "smoke" || x === "fire";
