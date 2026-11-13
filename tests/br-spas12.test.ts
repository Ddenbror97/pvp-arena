import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { pelletDirections, pelletFalloff } from "@/lib/fps/br/combat";
import { decodeHeightfield, type Heightfield } from "@/lib/fps/br/heightfield";
import { pickUp, tabletOf } from "@/lib/fps/br/inventory";
import { fitsGun, ITEM_IDS, ITEMS, magSize, type WeaponDef } from "@/lib/fps/br/items";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { LOOT } from "@/lib/fps/br/loot";
import { createBrMatch, kitView, seatHuman, stepBrMatch, type BrInput } from "@/lib/fps/br/match";
import { newTablet, PERK_EFFECT } from "@/lib/fps/br/perks";
import type { CollisionData, StaticWorld } from "@/lib/fps/br/static-world";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";
import { TICK_MS } from "@/lib/fps/simulation";

/**
 * The SPAS-12 (owner, 2026-11-13: "automaticly shotgun, research how much weapon it should do
 * and compare it to our game so its balanced"): eight pellets a shell in a cone, damage that
 * falls with range, held-trigger fire, and a tube loaded one shell at a time on the server.
 */
const buffer = (path: string) => {
  const f = readFileSync(path);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const meta = JSON.parse(readFileSync("public/fps/br/world.v1.json", "utf8")) as WorldMeta;
const collision = JSON.parse(
  readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"),
) as CollisionData;
let hf: Heightfield, world: StaticWorld;
beforeAll(async () => {
  hf = await decodeHeightfield(buffer("public/fps/br/height.v1.hf"));
  const cover = await decodeLandCover(buffer("public/fps/br/landcover.v1.lc"));
  world = buildIsland(hf, cover, meta, collision).solid;
}, 60_000);
const SPAS = ITEMS.spas12 as WeaponDef;
const P = SPAS.pellets!,
  S = SPAS.shells!;

/** Two players on the runway, `apart` metres from each other, seat 0 facing seat 1. */
function duel(apart: number) {
  const state = createBrMatch(meta, 9, (x, z) => hf.heightAt(x, z));
  seatHuman(state, "u1", "One");
  seatHuman(state, "u2", "Two");
  state.phase = "active";
  const [ax, az] = meta.runways[0]!.a,
    [bx, bz] = meta.runways[0]!.b;
  const len = Math.hypot(bx - ax, bz - az),
    ux = (bx - ax) / len,
    uz = (bz - az) / len;
  const put = (seat: number, t: number, side = 0) => {
    const b = state.seats[seat]!.body;
    b.x = ax + ux * t - uz * side;
    b.z = az + uz * t + ux * side;
    b.y = world.supportAt(b.x, b.z, 0.35, 1e4);
    Object.assign(b, { phase: "ground", grounded: true });
  };
  for (const s of state.seats) put(s.seat, 300 + s.seat * 6, 900);
  put(0, 400);
  put(1, 400 + apart);
  // Aim at the chest (1.17 m up) from the eye (1.6 m).
  return { state, yaw: Math.atan2(-ux, -uz), pitch: Math.atan2(1.17 - 1.6, apart) };
}
let t = 0;
const tick = (
  state: ReturnType<typeof duel>["state"],
  inp: Partial<BrInput> | null,
  acts: unknown[] = [],
) => {
  t += TICK_MS;
  const inputs = new Map<number, BrInput>();
  if (inp) inputs.set(0, { seq: 0, forward: 0, strafe: 0, yaw: 0, ...inp });
  stepBrMatch(state, world, meta, inputs, t, TICK_MS, new Map([[0, acts as never]]));
  return state.combat;
};
const arm = (state: ReturnType<typeof duel>["state"], mag = 8, shells = 0) => {
  const me = state.seats[0]!;
  pickUp(me.kit, { item: "spas12", qty: 1, mag });
  if (shells) pickUp(me.kit, { item: "ammo-12g", qty: shells });
  me.hands.drawUntil = 0;
  return me;
};
const shells = (kit: ReturnType<typeof arm>["kit"]) =>
  kit.bag.find((b) => b.item === "ammo-12g")?.qty ?? 0;

describe("SPAS-12", () => {
  it("is a primary gun on new item codes, with its own shells and the sights and silencer it takes", () => {
    expect(SPAS.slot).toBe("primary");
    expect(SPAS.semiAuto).toBe(false);
    expect(SPAS.magazine).toBe(8);
    expect(magSize({ item: "spas12", extMag: "mag-ext" })).toBe(10);
    // Appended: every earlier item keeps its wire code.
    expect(ITEM_IDS.slice(-2)).toEqual(["spas12", "ammo-12g"]);
    expect(ITEM_IDS.indexOf("mag-ext")).toBe(ITEM_IDS.length - 3);
    for (const sight of ["sight-red", "sight-holo", "sight-reflex", "silencer", "mag-ext"] as const)
      expect(fitsGun("spas12", sight), sight).toBe(true);
    for (const scope of ["scope-4x", "scope-6x"] as const)
      expect(fitsGun("spas12", scope), scope).toBe(false);
    expect(LOOT.companionAmmo["ammo-12g"]).toBe(16);
    expect(LOOT.itemWeight.spas12).toBeGreaterThan(0);
  });

  it("is balanced against the rifle: a shell is about three rifle rounds, only up close", () => {
    const shell = P.count * SPAS.damage.chest;
    const rifle = ITEMS.ak47.damage.chest;
    expect(shell).toBeGreaterThanOrEqual(100); // one shell point blank, no armour
    expect(shell / rifle).toBeGreaterThan(2.8);
    expect(shell / rifle).toBeLessThan(3.5);
    // Behind full body armour (the cap halves it) it takes two.
    expect(Math.ceil(100 / (shell * 0.5))).toBe(2);
    // Damage a second on the chest with every pellet on, against the AK's.
    const dps = (d: number, ms: number) => (d * 1000) / ms;
    expect(dps(shell, SPAS.intervalMs)).toBeLessThan(dps(rifle, ITEMS.ak47.intervalMs));
    // Falloff: whole to 10 m, 35 % from 40 m on, a straight line between.
    expect(pelletFalloff(SPAS, 5)).toBe(1);
    expect(pelletFalloff(SPAS, P.fullM)).toBe(1);
    expect(pelletFalloff(SPAS, 25)).toBeCloseTo(1 - 0.5 * (1 - P.min), 5);
    expect(pelletFalloff(SPAS, 40)).toBeCloseTo(P.min, 5);
    expect(pelletFalloff(SPAS, 70)).toBeCloseTo(P.min, 5);
    expect(pelletFalloff(ITEMS.ak47 as WeaponDef, 200)).toBe(1);
  });

  it("throws eight pellets in its cone, evenly and the same for the same shot", () => {
    const dir = { x: 0, y: 0, z: -1 };
    const a = pelletDirections(dir, P, 12345),
      b = pelletDirections(dir, P, 12345),
      c = pelletDirections(dir, P, 54321);
    expect(a.length).toBe(P.count);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
    const cone = (P.spreadDeg * Math.PI) / 180;
    const quadrants = new Set<string>();
    for (const p of a) {
      expect(Math.hypot(p.x, p.y, p.z)).toBeCloseTo(1, 6);
      const off = Math.acos(-p.z);
      expect(off).toBeLessThanOrEqual(cone + 1e-6);
      if (off > cone * 0.3) quadrants.add(`${p.x > 0}${p.y > 0}`);
    }
    // Spread round the middle, not all in one corner.
    expect(quadrants.size).toBe(4);
    // Straight up or down works too (no degenerate axes).
    for (const p of pelletDirections({ x: 0, y: 1, z: 0 }, P, 7))
      expect(Number.isFinite(p.x + p.y + p.z)).toBe(true);
  });

  it("one shell kills at arm's length; the pattern and the falloff take it apart with range", () => {
    const damageAt = (apart: number) => {
      const { state, yaw, pitch } = duel(apart);
      arm(state);
      const them = state.seats[1]!;
      them.kit.hp = 1000;
      let pellets = 0,
        shots = 0;
      for (let i = 0; i < 20; i++)
        for (const e of tick(state, { yaw, pitch, fire: i === 0 })) {
          if (e.type === "shot" && e.seat === 0) shots++;
          if (e.type === "hit" && e.victim === 1) pellets++;
        }
      expect(shots).toBe(1); // one shot event a shell (one sound, one flash)
      return { damage: 1000 - them.kit.hp, pellets };
    };
    const close = damageAt(4);
    expect(close.pellets).toBe(P.count);
    expect(close.damage).toBeGreaterThanOrEqual(90);
    const mid = damageAt(14);
    expect(mid.pellets).toBeLessThan(P.count);
    expect(mid.damage).toBeLessThan(close.damage * 0.75);
    const far = damageAt(35);
    expect(far.damage).toBeLessThan(close.damage * 0.25);
    expect(damageAt(90).damage).toBe(0); // beyond its reach
  });

  it("fires while the trigger is held, a shell every 350 ms, and reloads itself when empty", () => {
    const { state, yaw, pitch } = duel(4);
    const me = arm(state, 3, 5);
    state.seats[1]!.kit.hp = 1e6;
    const shotAt: number[] = [];
    for (let i = 0; i < 40; i++)
      for (const e of tick(state, { yaw, pitch, fire: true }))
        if (e.type === "shot" && e.seat === 0) shotAt.push(t);
    expect(shotAt.length).toBe(3);
    expect(shotAt[1]! - shotAt[0]!).toBeGreaterThanOrEqual(SPAS.intervalMs - 1);
    expect(shotAt[1]! - shotAt[0]!).toBeLessThan(SPAS.intervalMs + 2 * TICK_MS);
    // Empty with shells in the bag: the reload has started by itself.
    expect(me.kit.guns[0]!.mag).toBeLessThanOrEqual(1);
    expect(me.hands.reloadUntil).toBeGreaterThan(0);
    expect(me.hands.shells).toBeDefined();
  });

  it("loads one shell at a time: start, a shell an insert, end; the bag pays a shell each", () => {
    const { state, yaw } = duel(4);
    const me = arm(state, 5, 20);
    const gun = me.kit.guns[0]!;
    tick(state, { yaw, reload: true });
    const began = t;
    expect(me.hands.shells).toEqual({ stage: 0, since: began });
    expect(me.hands.reloadUntil - began).toBeCloseTo(S.startMs, 0);
    expect(kitView(me).shells).toEqual({ stage: 0, since: began });
    const seen: Array<[number, number]> = [];
    let last = gun.mag;
    for (let i = 0; i < 200 && me.hands.reloadUntil; i++) {
      tick(state, { yaw });
      if (gun.mag !== last) {
        expect(gun.mag).toBe(last + 1); // never two at once
        seen.push([t - began, gun.mag]);
        last = gun.mag;
      }
      // Shells in the bag and in the gun always add up: nothing made, nothing lost.
      expect(shells(me.kit) + gun.mag).toBe(25);
    }
    expect(gun.mag).toBe(8);
    expect(seen.map(([, m]) => m)).toEqual([6, 7, 8]);
    // Each shell lands an insert after the one before, the first an insert after the start.
    // (Within a tick of its time, however many shells came before: the stages run from when
    // they were due, so the ticks' rounding does not add up.)
    seen.forEach(([at], i) => {
      const late = at - (S.startMs + (i + 1) * S.insertMs);
      expect(late).toBeGreaterThanOrEqual(0);
      expect(late).toBeLessThanOrEqual(TICK_MS);
    });
    const late = t - began - (S.startMs + 3 * S.insertMs + S.endMs);
    expect(late).toBeGreaterThanOrEqual(0);
    expect(late).toBeLessThanOrEqual(TICK_MS);
    expect(me.hands.shells).toBeUndefined();
    expect(kitView(me).shells).toBeUndefined();
    // Full: R does nothing.
    tick(state, { yaw, reload: true });
    expect(me.hands.reloadUntil).toBe(0);
  });

  it("stops at the shells there are, and Quick Hands shortens every stage", () => {
    const { state, yaw } = duel(4);
    const me = arm(state, 0, 2);
    const gun = me.kit.guns[0]!;
    for (let i = 0; i < 120; i++) tick(state, { yaw });
    expect(gun.mag).toBe(2);
    expect(shells(me.kit)).toBe(0);
    expect(me.hands.reloadUntil).toBe(0);
    // With the perk: the start is 15 % shorter.
    pickUp(me.kit, { item: "ammo-12g", qty: 4 });
    pickUp(me.kit, {
      item: "tablet",
      qty: 1,
      tablet: { ...newTablet(), active: ["quick-hands", null, null] },
    });
    expect(tabletOf(me.kit)).not.toBeNull();
    tick(state, { yaw, reload: true });
    expect(me.hands.reloadUntil - t).toBeCloseTo(S.startMs * PERK_EFFECT.reload, 0);
  });

  it("firing breaks the reload off with what is loaded; a switch or a heal ends it; nothing is duplicated", () => {
    const { state, yaw, pitch } = duel(4);
    const me = arm(state, 1, 20);
    const gun = me.kit.guns[0]!;
    state.seats[1]!.kit.hp = 1e6;
    tick(state, { yaw, reload: true });
    // Two shells in, then the trigger.
    while (gun.mag < 3) tick(state, { yaw });
    expect(me.hands.reloadUntil).toBeGreaterThan(0);
    let events = tick(state, { yaw, pitch, fire: true });
    expect(events.some((e) => e.type === "shot")).toBe(false); // the gun comes up first
    expect(me.hands.reloadUntil).toBe(0);
    expect(gun.mag).toBe(3);
    expect(shells(me.kit)).toBe(18);
    const broke = t;
    let firedAt = 0;
    for (let i = 0; i < 20 && !firedAt; i++) {
      events = tick(state, { yaw, pitch, fire: true });
      if (events.some((e) => e.type === "shot" && e.seat === 0)) firedAt = t;
    }
    expect(firedAt - broke).toBeGreaterThanOrEqual(S.breakMs - 1);
    expect(firedAt - broke).toBeLessThan(S.breakMs + 3 * TICK_MS);
    expect(gun.mag).toBe(2);
    // An empty gun cannot break its own reload: the first shell has to go in.
    for (let i = 0; i < 40 && gun.mag > 0; i++) tick(state, { yaw, pitch, fire: true });
    expect(gun.mag).toBe(0);
    for (let i = 0; i < 12; i++) tick(state, { yaw, pitch, fire: true });
    expect(me.hands.shells).toBeDefined();
    // Switching to the knife mid-reload ends it; the shell in the hand was never taken.
    const had = shells(me.kit) + gun.mag;
    tick(state, { yaw, slot: 2 });
    expect(me.hands.reloadUntil).toBe(0);
    for (let i = 0; i < 60; i++) tick(state, { yaw });
    expect(shells(me.kit) + gun.mag).toBe(had);
    expect(kitView(me).shells).toBeUndefined();
    // Back on the gun, mid-reload, eliminated: the gun drops with exactly what was loaded.
    tick(state, { yaw, slot: 0 });
    for (let i = 0; i < 40; i++) tick(state, { yaw });
    const loaded = gun.mag;
    expect(me.hands.reloadUntil).toBeGreaterThan(0);
    me.kit.hp = 0.01;
    state.zoneNow = undefined as never;
    me.dead = true;
    for (let i = 0; i < 40; i++) tick(state, { yaw });
    expect(gun.mag).toBe(loaded);
  });
});
