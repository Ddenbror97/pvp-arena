import type { Loose } from "./inventory";
import type { ItemId } from "./items";
import type { StaticWorld } from "./static-world";
import type { WorldMeta } from "./world";
import type { ZonePlan } from "./zone";

/**
 * Airdrops (PLAN §6.7): a supply crate under a parachute, falling inside the coming circle, with
 * high-tier loot laid out around it when it lands. Three a match (owner, 2026-11-13: "the 1st
 * airdrop drops directly when first circle have been revealed … 3 air drops per game"): the
 * first as the first circle is revealed (the plane's route flown), then at the start of zone
 * phases 3 and 5. Everyone is warned `warnMs` before a crate appears; a landed crate smokes green
 * until someone takes something from it. Nothing to open (LOOT-SPEC §3: no loot boxes): the crate marks the spot and the items
 * lie on the ground to pick up with E. Rare items (AWP, level-3 armour, 6× scope, the Tactical
 * Tablet) are what makes a drop worth the risk (PERKS-RESEARCH: rewards follow risk).
 * Shared deterministic module.
 */
export const AIRDROP = {
  /**
   * When the drops come: 0 is the first circle's reveal; otherwise the zone phase (1-based)
   * whose start brings one. Each falls inside the circle that phase closes to.
   */
  phases: [0, 3, 5] as const,
  /** The on-screen warning before a crate appears at the top of its fall. */
  warnMs: 20_000,
  fallHeight: 360,
  /** Metres per second under the canopy. */
  fallSpeed: 6,
} as const;

export type Airdrop = {
  id: number;
  x: number;
  z: number;
  ground: number;
  /** Server time it appears (top of the fall) and lands. */
  at: number;
  landAt: number;
  landed: boolean;
  /** The loot laid out when it landed (LootWorld ids); taking any of it ends the smoke. */
  items?: number[];
  looted?: boolean;
};

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Where and when each drop comes down (inside the phase's coming circle, on open land). */
export function planAirdrops(
  zone: ZonePlan,
  world: StaticWorld,
  meta: WorldMeta,
  seed: number,
  zoneStart: number,
  /** When the first circle is revealed (ms after the zone start: the plane's route flown). */
  revealMs = 0,
): Airdrop[] {
  const random = rng(seed ^ 0x41d70c1e);
  const out: Airdrop[] = [];
  for (const phase of AIRDROP.phases as readonly number[]) {
    // The reveal's drop falls in the first circle; a phase's in the circle it closes to.
    const circle = zone.circles[Math.max(1, phase)];
    if (!circle) continue;
    // The phase begins when the previous one finished shrinking.
    const begin = phase === 0 ? revealMs : phase <= 1 ? 0 : zone.times[phase - 2]![1];
    for (let tries = 0; tries < 80; tries++) {
      const a = random() * Math.PI * 2,
        d = Math.sqrt(random()) * circle.r * 0.8;
      const x = circle.x + Math.cos(a) * d,
        z = circle.z + Math.sin(a) * d;
      const ground = world.supportAt(x, z, 1.2, 1e4);
      // Open ground only (not a roof): the crate's loot must be reachable on foot.
      if (ground < 1.5 || Math.abs(ground - world.hf.heightAt(x, z)) > 0.4) continue;
      if (world.blocked(x, ground + 0.1, z, 2, 1.2)) continue;
      if (
        meta.waterBodies.some(
          (w) =>
            x >= w.bounds[0] &&
            x <= w.bounds[2] &&
            z >= w.bounds[1] &&
            z <= w.bounds[3] &&
            ground < w.level + 0.3,
        )
      )
        continue;
      const at = zoneStart + begin;
      out.push({
        id: out.length,
        x: Math.round(x * 10) / 10,
        z: Math.round(z * 10) / 10,
        ground,
        at,
        landAt: at + (AIRDROP.fallHeight / AIRDROP.fallSpeed) * 1000,
        landed: false,
      });
      break;
    }
  }
  return out;
}

/**
 * What a crate holds (seeded per drop). Every crate (owner, 2026-11-13): a sniper rifle (the
 * AWP), plates, a 6× scope and a silencer; then level-3 armour, a medkit and a Tactical Tablet.
 */
export function airdropContents(seed: number, id: number): Loose[] {
  const random = rng(seed * 31 + id * 7919);
  const out: Loose[] = [];
  out.push({ item: "awp", qty: 1, mag: 5, optic: null, muzzle: null });
  out.push({ item: "ammo-sniper", qty: 30 });
  out.push({ item: "scope-6x", qty: 1 }, { item: "silencer", qty: 1 });
  const armour: ItemId = random() < 0.5 ? "helmet-3" : "vest-3";
  out.push({ item: armour, qty: 1, durability: armour === "helmet-3" ? 230 : 200 });
  out.push(
    { item: "plate", qty: 1, durability: 25 },
    { item: "plate", qty: 1, durability: 25 },
    { item: "plate", qty: 1, durability: 25 },
  );
  out.push({ item: "medkit", qty: 1 });
  // Every drop carries a Tactical Tablet (owner, 2026-11-04).
  out.push({ item: "tablet", qty: 1 });
  return out;
}
