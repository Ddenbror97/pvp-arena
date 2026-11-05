import type { Loose } from "./inventory";
import type { ItemId } from "./items";
import type { StaticWorld } from "./static-world";
import type { WorldMeta } from "./world";
import type { ZonePlan } from "./zone";

/**
 * Airdrops (PLAN §6.7): a supply crate under a parachute, announced to everyone when a zone
 * phase begins, falling inside the coming circle, with high-tier loot laid out around it when it
 * lands. Nothing to open (LOOT-SPEC §3: no loot boxes): the crate marks the spot and the items
 * lie on the ground to pick up with E. Rare items (AWP, level-3 armour, 6× scope, the Tactical
 * Tablet) are what makes a drop worth the risk (PERKS-RESEARCH: rewards follow risk).
 * Shared deterministic module.
 */
export const AIRDROP = {
  /** Zone phases (1-based) whose start announces a drop. */
  phases: [2, 4, 6] as const,
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
): Airdrop[] {
  const random = rng(seed ^ 0x41d70c1e);
  const out: Airdrop[] = [];
  for (const phase of AIRDROP.phases as readonly number[]) {
    const circle = zone.circles[phase]!;
    // The phase begins when the previous one finished shrinking.
    const begin = phase <= 1 ? 0 : zone.times[phase - 2]![1];
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

/** The crate's height at a time (the client draws the same fall). */
export const dropHeight = (d: Airdrop, now: number) =>
  d.ground + Math.max(0, ((d.landAt - now) / 1000) * AIRDROP.fallSpeed);

/** What a crate holds (seeded per drop). */
export function airdropContents(seed: number, id: number): Loose[] {
  const random = rng(seed * 31 + id * 7919);
  const out: Loose[] = [];
  if (random() < 0.5) {
    out.push({ item: "awp", qty: 1, mag: 5, optic: "scope-6x", muzzle: null });
    out.push({ item: "ammo-sniper", qty: 30 });
  } else {
    out.push({
      item: random() < 0.5 ? "m4" : "ak47",
      qty: 1,
      mag: 30,
      optic: "scope-4x",
      muzzle: "compensator",
    });
    out.push({ item: "ammo-rifle", qty: 30 });
  }
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
