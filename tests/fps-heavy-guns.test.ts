import { describe, expect, it } from "vitest";
import { buyPrimary, createMatch, startMatch, stepMatch, TICK_MS } from "../src/lib/fps/simulation";
import type { Input, MatchState, Seat } from "../src/lib/fps/protocol";
import {
  AWP,
  HUNTING,
  MP5,
  SPAS12,
  spas12PelletDamage,
  vestDamage,
  weaponMoveScale,
} from "../src/lib/fps/primary";
import { HIT_DAMAGE, recoilPatternOf } from "../src/lib/fps/combat";
import { validateBuy } from "../src/lib/fps/buy";
import {
  buyBombPrimary,
  createBombMatch,
  startBombMatch,
  stepBombMatch,
} from "../src/lib/fps/bomb/match";
import { spectatorPov } from "../src/lib/fps/bomb/spectator";

/**
 * The SPAS-12 and the Hunting Rifle in 1v1 / 5v5 (2026-11-13: "add the shotgun and hunt rifle
 * to 1v1/5v5 … balanced"): CS2's XM1014 and SSG 08, beside this game's rifle (34 a hit), MP5,
 * AWP and Desert Eagle. Server rules only.
 */
const input = (seq: number, over: Partial<Input> = {}): Input => ({
  v: 1,
  type: "input",
  combatVersion: 2,
  seq,
  forward: 0,
  strafe: 0,
  yaw: 0,
  pitch: 0,
  fire: false,
  reload: false,
  weapon: "rifle",
  jump: false,
  sprint: false,
  ...over,
});
const body = (armor: number) => ({ armor, hp: 100 }) as never;

/** A live 1v1 on the first map's open lane, `apart` metres between the two. */
function duel(item: "spas12" | "hunting", apart = 6, armor = 0) {
  const s = createMatch({ A: "a", B: "b" }, 5, 0);
  startMatch(s, 0);
  stepMatch(s, {}, 3000, TICK_MS);
  expect(s.phase).toBe("live");
  expect(buyPrimary(s, "A", item, 3010)).toBe(true);
  Object.assign(s.players.A, { x: 0, z: -2.4, y: 0 });
  Object.assign(s.players.B, { x: 0, z: -2.4 - apart, y: 0, armor });
  s.server!.spreadSeed = 4242;
  return { s, t: 3034 };
}
const aim = (s: MatchState, shooter: Seat, height: number) => {
  const target = s.players[shooter === "A" ? "B" : "A"];
  const dz = target.z - s.players[shooter].z;
  return { yaw: Math.atan2(0, -dz), pitch: Math.atan2(height - 1.6, Math.abs(dz)) };
};

describe("damage (CS2 tables) against the game's other guns", () => {
  it("Hunting Rifle = SSG 08: 352 / 88 / 110 / 66; 74 and 93 through a vest", () => {
    expect(HUNTING.damage).toEqual({ head: 352, chest: 88, stomach: 110, legs: 66 });
    expect(vestDamage(body(100), "chest", HUNTING)).toBe(74);
    expect(vestDamage(body(100), "stomach", HUNTING)).toBe(93);
    expect(vestDamage(body(100), "head", HUNTING)).toBe(352);
    expect([HUNTING.cycleMs, HUNTING.magazine, HUNTING.reserve]).toEqual([1250, 10, 90]);
  });
  it("shots to kill: the Hunting Rifle sits between the rifle and the AWP", () => {
    const toKill = (hit: number) => Math.ceil(100 / hit);
    // Chest, no vest: rifle 3, Hunting Rifle 2, AWP 1. Head: rifle 3, both snipers 1.
    expect(toKill(HIT_DAMAGE.rifle.chest)).toBe(3);
    expect(toKill(HUNTING.damage.chest)).toBe(2);
    expect(toKill(AWP.damage.chest)).toBe(1);
    expect(toKill(HUNTING.damage.head)).toBe(1);
    // It cycles faster than the AWP and keeps full speed scoped (the AWP drops to half).
    expect(HUNTING.cycleMs).toBeLessThan(AWP.cycleMs);
    expect(weaponMoveScale({ weapon: "rifle", primary: "hunting", scoped: true })).toBe(1);
    expect(weaponMoveScale({ weapon: "rifle", primary: "awp", scoped: true })).toBeLessThan(0.5);
  });
  it("SPAS-12 = XM1014: six pellets of 20 (80 head), 16 through a vest, CS's range falloff", () => {
    expect(SPAS12.pellets.count).toBe(6);
    expect(SPAS12.damage).toEqual({ head: 80, chest: 20, stomach: 25, legs: 15 });
    expect(spas12PelletDamage(body(0), "chest", 0)).toBe(20);
    expect(spas12PelletDamage(body(100), "chest", 0)).toBe(16);
    expect(spas12PelletDamage(body(100), "head", 0)).toBe(80);
    // × 0.7 every 12.7 m: 15 at 10 m, 9 at 25 m.
    expect(spas12PelletDamage(body(0), "chest", 10)).toBe(15);
    expect(spas12PelletDamage(body(0), "chest", 25)).toBe(9);
    // A whole shell at point blank: 120 (a kill) against the rifle's 34 a round; the rifle
    // out-damages it per second from about 8 m (six pellets on target at best).
    const perSecond = (hit: number, cycle: number) => (hit * 1000) / cycle;
    expect(perSecond(6 * 20, SPAS12.cycleMs)).toBeCloseTo(
      perSecond(HIT_DAMAGE.rifle.chest, 100),
      -1,
    );
    expect(perSecond(6 * spas12PelletDamage(body(0), "chest", 8), SPAS12.cycleMs)).toBeLessThan(
      perSecond(HIT_DAMAGE.rifle.chest, 100),
    );
    expect(SPAS12.cycleMs).toBeGreaterThan(MP5.cycleMs);
  });
  it("buy messages, recoil patterns", () => {
    for (const item of ["hunting", "spas12"])
      expect(validateBuy({ v: 1, type: "buy", item })).toEqual({ v: 1, type: "buy", item });
    expect(recoilPatternOf({ weapon: "rifle", primary: "spas12" })).toBe("spas12");
    expect(recoilPatternOf({ weapon: "sidearm", primary: "spas12" })).toBe("deagle");
  });
});

describe("1v1: the SPAS-12", () => {
  it("one shell at 6 m into the chest kills an unarmoured player; one hit event for it", () => {
    const { s, t } = duel("spas12", 4);
    expect(s.players.A).toMatchObject({ primary: "spas12", ammo: 7, reserve: 32 });
    const chest = aim(s, "A", 1.3);
    stepMatch(s, { A: input(1, { ...chest, fire: true }) }, t, TICK_MS);
    expect(s.players.A.ammo).toBe(6);
    const hits = s.events.filter((e) => e.type === "hit" || e.type === "headshot");
    expect(hits).toHaveLength(1);
    expect(hits[0]!.hit!.damage).toBeGreaterThanOrEqual(100);
    expect(s.players.B.hp).toBe(0);
  });
  it("reaches 9 m (this lane's length) as one hit", () => {
    const { s, t } = duel("spas12", 9);
    s.players.B.hp = 1000;
    stepMatch(s, { A: input(1, { ...aim(s, "A", 1.3), fire: true }) }, t, TICK_MS);
    expect(1000 - s.players.B.hp).toBeGreaterThan(0);
    expect(s.events.filter((e) => e.type === "hit" || e.type === "headshot")).toHaveLength(1);
  });
  it("the trigger held fires a shell every 350 ms", () => {
    const { s, t } = duel("spas12", 4);
    Object.assign(s.players.B, { x: 40, z: 40 });
    let now = t,
      seq = 1;
    for (let k = 0; k < 23; k++)
      stepMatch(s, { A: input(seq++, { fire: true }) }, (now += TICK_MS), TICK_MS);
    // 23 ticks = 767 ms: shots at 0, 350 and 700 ms (on schedule, not every 11th tick).
    expect(7 - s.players.A.ammo).toBe(3);
  });
  it("reloads a shell at a time from the reserve; a shot with shells in breaks it off", () => {
    const { s, t } = duel("spas12", 4);
    Object.assign(s.players.B, { x: 40, z: 40 });
    const A = s.players.A;
    A.ammo = 4;
    let now = t,
      seq = 1;
    stepMatch(s, { A: input(seq++, { reload: true }) }, (now += TICK_MS), TICK_MS);
    expect(A.shellStage).toBe(0);
    expect(A.reloadUntil - now).toBe(SPAS12.shells.startMs);
    const seen: number[] = [];
    while (A.reloadUntil) {
      stepMatch(s, { A: input(seq++) }, (now += TICK_MS), TICK_MS);
      if (seen.at(-1) !== A.ammo) seen.push(A.ammo);
    }
    expect(seen).toEqual([4, 5, 6, 7]);
    expect(A.reserve).toBe(29);
    expect(A.shellStage).toBeUndefined();
    // Again from 3, then the trigger after the first shell is in: it stops there and fires.
    A.ammo = 3;
    stepMatch(s, { A: input(seq++, { reload: true }) }, (now += TICK_MS), TICK_MS);
    while (A.ammo < 4) stepMatch(s, { A: input(seq++) }, (now += TICK_MS), TICK_MS);
    expect(A.reloadUntil).toBeGreaterThan(0);
    stepMatch(s, { A: input(seq++, { fire: true }) }, (now += TICK_MS), TICK_MS);
    expect(A.reloadUntil).toBe(0);
    expect(A.shellStage).toBeUndefined();
    expect(A.ammo).toBe(3); // 4 loaded, one fired
    expect(A.reserve).toBe(28);
  });
  it("an empty tube reloads by itself", () => {
    const { s, t } = duel("spas12", 4);
    Object.assign(s.players.B, { x: 40, z: 40 });
    s.players.A.ammo = 1;
    let now = t,
      seq = 1;
    stepMatch(s, { A: input(seq++, { fire: true }) }, (now += TICK_MS), TICK_MS);
    expect(s.players.A.ammo).toBe(0);
    expect(s.players.A.shellStage).toBe(0);
  });
});

describe("1v1: the Hunting Rifle", () => {
  it("a chest shot does 88; a headshot kills; one shot per press; 1.25 s bolt", () => {
    const { s, t } = duel("hunting", 8);
    s.players.B.hp = 1000;
    let now = t,
      seq = 1;
    const chest = aim(s, "A", 1.3);
    // Scoped and settled, standing.
    for (let k = 0; k < 8; k++)
      stepMatch(s, { A: input(seq++, { ...chest, scope: true }) }, (now += TICK_MS), TICK_MS);
    expect(s.players.A.scoped).toBe(true);
    for (let k = 0; k < 10; k++)
      stepMatch(
        s,
        { A: input(seq++, { ...chest, scope: true, fire: true }) },
        (now += TICK_MS),
        TICK_MS,
      );
    expect(1000 - s.players.B.hp).toBe(88);
    expect(s.players.A.ammo).toBe(9);
    expect(s.players.A.scoped).toBeUndefined(); // the shot drops the zoom
    // A new press inside the bolt cycle does nothing; after it, it fires.
    stepMatch(s, { A: input(seq++, chest) }, (now += TICK_MS), TICK_MS);
    stepMatch(s, { A: input(seq++, { ...chest, fire: true }) }, (now += TICK_MS), TICK_MS);
    expect(s.players.A.ammo).toBe(9);
    now += HUNTING.cycleMs;
    stepMatch(s, { A: input(seq++, chest) }, (now += TICK_MS), TICK_MS);
    for (let k = 0; k < 8; k++)
      stepMatch(s, { A: input(seq++, { ...chest, scope: true }) }, (now += TICK_MS), TICK_MS);
    stepMatch(
      s,
      { A: input(seq++, { ...aim(s, "A", 1.62), scope: true, fire: true }) },
      (now += TICK_MS),
      TICK_MS,
    );
    expect(s.players.A.ammo).toBe(8);
    expect(1000 - s.players.B.hp).toBe(88 + 352);
  });
});

describe("5v5", () => {
  it("both are bought at B; the SPAS-12's pellets land as one hit; the stage is in the spectator view", () => {
    const slots = Array.from({ length: 10 }, (_, i) => ({ id: `p${i}`, name: `P${i}`, bot: true }));
    const s = createBombMatch(slots, 0, 9);
    startBombMatch(s, 0);
    expect(buyBombPrimary(s, 0, "hunting", 10)).toBe(true);
    expect(s.players[0]).toMatchObject({ primary: "hunting", ammo: 10, reserve: 90 });
    expect(buyBombPrimary(s, 0, "spas12", 10)).toBe(true);
    expect(s.players[0]).toMatchObject({ primary: "spas12", ammo: 7, reserve: 32 });
    let t = 0;
    while (s.phase !== "live") stepBombMatch(s, {}, (t += TICK_MS));
    Object.assign(s.players[0]!, { x: 0, z: -9, y: 0 });
    Object.assign(s.players[5]!, { x: 0, z: -4, y: 0, armor: 100 });
    for (const q of s.players)
      if (q.slot !== 0 && q.slot !== 5) Object.assign(q, { x: 36, z: 36 - q.slot });
    const yaw = Math.PI,
      pitch = Math.atan2(1.3 - 1.6, 5);
    stepBombMatch(s, { 0: input(1, { yaw, pitch, fire: true }) }, (t += TICK_MS));
    const hits = s.events.filter(
      (e) => (e.type === "hit" || e.type === "headshot") && e.victim === 5,
    );
    expect(hits).toHaveLength(1);
    // At 5 m (× 0.76): 12 a pellet through the vest on the body, 60 on the head (no helmets).
    expect(hits[0]!.damage).toBeGreaterThan(40);
    expect(hits[0]!.damage).toBeLessThanOrEqual(6 * 60);
    s.players[0]!.ammo = 2;
    stepBombMatch(s, { 0: input(2, { yaw, pitch, reload: true }) }, (t += TICK_MS));
    expect(spectatorPov(s.players[0]!)).toMatchObject({ shellStage: 0 });
  });
});
