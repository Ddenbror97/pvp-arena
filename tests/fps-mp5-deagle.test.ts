import { describe, expect, it } from "vitest";
import {
  buyPrimary,
  createMatch,
  drawnGun,
  startMatch,
  stepMatch,
  TICK_MS,
} from "../src/lib/fps/simulation";
import { validateInput, type Input, type MatchState, type Seat } from "../src/lib/fps/protocol";
import { MP5, vestDamage } from "../src/lib/fps/primary";
import { DEAGLE } from "../src/lib/fps/sidearm";
import { validateBuy } from "../src/lib/fps/buy";
import { recoilPatternOf, recoveryProfile, sprayOffset } from "../src/lib/fps/combat";
import { cycleEquipment } from "../src/lib/fps/equipment-cycle";
import {
  buyBombPrimary,
  createBombMatch,
  startBombMatch,
  stepBombMatch,
} from "../src/lib/fps/bomb/match";
import { spectatorPov } from "../src/lib/fps/bomb/spectator";

/**
 * The 1v1 / 5v5 MP5 and Desert Eagle (2026-11-09): CS:GO / CS2 damage, fire rate, recoil size;
 * the Deagle as the 1v1 sidearm (2) and a 5v5 buy, the MP5 a buyable primary in both. Server
 * rules only.
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

/** A live 1v1 on Dustfront's open lane, 6 m apart. */
function duel(armor = 0) {
  const s = createMatch({ A: "a", B: "b" }, 5, 0);
  startMatch(s, 0);
  stepMatch(s, {}, 3000, TICK_MS);
  expect(s.phase).toBe("live");
  Object.assign(s.players.A, { x: 0, z: -2.4, y: 0 });
  Object.assign(s.players.B, { x: 0, z: -8.4, y: 0, armor });
  s.server!.spreadSeed = 4242;
  return { s, t: 3034 };
}
const aim = (s: MatchState, shooter: Seat, height: number) => {
  const target = s.players[shooter === "A" ? "B" : "A"];
  const dz = target.z - s.players[shooter].z;
  return { yaw: Math.atan2(0, -dz), pitch: Math.atan2(height - 1.6, Math.abs(dz)) };
};

describe("damage (CS2 tables)", () => {
  const body = (armor: number) => ({ armor, hp: 100 }) as never;
  it("Desert Eagle: 206 head, 53 chest, 66 stomach, 39 legs; 49 / 61 through a vest", () => {
    expect(DEAGLE.damage).toEqual({ head: 206, chest: 53, stomach: 66, legs: 39 });
    expect(vestDamage(body(100), "chest", DEAGLE)).toBe(49);
    expect(vestDamage(body(100), "stomach", DEAGLE)).toBe(61);
    expect(vestDamage(body(100), "head", DEAGLE)).toBe(206);
    expect(vestDamage(body(100), "legs", DEAGLE)).toBe(39);
    expect(vestDamage(body(0), "chest", DEAGLE)).toBe(53);
    expect([DEAGLE.cycleMs, DEAGLE.magazine, DEAGLE.reserve]).toEqual([225, 7, 35]);
  });
  it("MP5: 112 head, 28 chest, 35 stomach, 21 legs; 17 / 21 through a vest; 750 rpm", () => {
    expect(MP5.damage).toEqual({ head: 112, chest: 28, stomach: 35, legs: 21 });
    expect(vestDamage(body(100), "chest", MP5)).toBe(17);
    expect(vestDamage(body(100), "stomach", MP5)).toBe(21);
    expect([MP5.cycleMs, MP5.magazine, MP5.reserve]).toEqual([80, 30, 120]);
  });
  it("recoil: MP5 at 16/30 of the rifle's climb, the Deagle the biggest per-shot kick", () => {
    expect(sprayOffset("mp5", 10).pitch / sprayOffset("rifle", 10).pitch).toBeCloseTo(16 / 30, 6);
    expect(sprayOffset("deagle", 1).pitch).toBeGreaterThan(sprayOffset("rifle", 1).pitch * 1.4);
    expect(recoilPatternOf({ weapon: "sidearm", primary: "mp5" })).toBe("deagle");
    expect(recoilPatternOf({ weapon: "rifle", primary: "mp5" })).toBe("mp5");
    expect(recoilPatternOf({ weapon: "rifle", primary: "awp" })).toBe("rifle");
    expect(recoveryProfile(1, "deagle").rate).toBeLessThan(recoveryProfile(1).rate);
  });
});

describe("wire", () => {
  it("reads the sidearm as its own weapon and a cached client's 'pistol' as the knife", () => {
    expect(validateInput(input(1, { weapon: "sidearm" }))?.weapon).toBe("sidearm");
    expect(validateInput({ ...input(1), weapon: "pistol" })?.weapon).toBe("knife");
    for (const item of ["rifle", "awp", "mp5", "deagle"])
      expect(validateBuy({ v: 1, type: "buy", item })).toEqual({ v: 1, type: "buy", item });
    expect(validateBuy({ v: 1, type: "buy", item: "glock" })).toBeNull();
  });
  it("scrolls primary → sidearm → knife when the Deagle is carried", () => {
    const stock = { he: 1, smoke: 0, fire: 0 };
    expect(cycleEquipment("rifle", undefined, stock, 1, true)).toEqual({ weapon: "sidearm" });
    expect(cycleEquipment("sidearm", undefined, stock, 1, true)).toEqual({ weapon: "knife" });
    expect(cycleEquipment("rifle", undefined, stock, 1)).toEqual({ weapon: "knife" });
  });
});

describe("1v1: the Desert Eagle is the sidearm", () => {
  it("every spawn carries a Deagle (7 / 35) beside the primary", () => {
    const { s } = duel();
    for (const seat of ["A", "B"] as const)
      expect(s.players[seat]).toMatchObject({
        sidearm: "deagle",
        sidearmAmmo: 7,
        sidearmReserve: 35,
        ammo: 30,
        reserve: 90,
      });
  });
  it("2 draws it; a held trigger fires once; a headshot kills; its own magazine empties", () => {
    const { s, t } = duel(100);
    const head = aim(s, "A", 1.62);
    let now = t,
      seq = 1;
    stepMatch(s, { A: input(seq++, { ...head, weapon: "sidearm" }) }, now, TICK_MS);
    expect(s.players.A.weapon).toBe("sidearm");
    s.players.B.hp = 1000; // count every hit
    for (let k = 0; k < 20; k++)
      stepMatch(
        s,
        { A: input(seq++, { ...head, weapon: "sidearm", fire: true }) },
        (now += TICK_MS),
        TICK_MS,
      );
    expect(s.players.A.sidearmAmmo).toBe(6);
    expect(s.players.A.ammo).toBe(30); // the rifle's magazine is untouched
    expect(1000 - s.players.B.hp).toBe(206); // one headshot (no helmets)
    // A fresh pull past the 225 ms cycle fires again.
    stepMatch(s, { A: input(seq++, { ...head, weapon: "sidearm" }) }, (now += TICK_MS), TICK_MS);
    stepMatch(
      s,
      { A: input(seq++, { ...head, weapon: "sidearm", fire: true }) },
      (now += TICK_MS),
      TICK_MS,
    );
    expect(s.players.A.sidearmAmmo).toBe(5);
  });
  it("reloads the Deagle from its own reserve in 1.9 s", () => {
    const { s, t } = duel();
    s.players.A.sidearmAmmo = 2;
    let now = t,
      seq = 1;
    stepMatch(s, { A: input(seq++, { weapon: "sidearm" }) }, now, TICK_MS);
    stepMatch(
      s,
      { A: input(seq++, { weapon: "sidearm", reload: true }) },
      (now += TICK_MS),
      TICK_MS,
    );
    expect(s.players.A.reloadUntil).toBe(now + DEAGLE.reloadMs);
    expect(drawnGun(s.players.A)).toMatchObject({ magazine: 7, reloadMs: 1900 });
    const done = s.players.A.reloadUntil;
    while (now < done)
      stepMatch(s, { A: input(seq++, { weapon: "sidearm" }) }, (now += TICK_MS), TICK_MS);
    expect(s.players.A).toMatchObject({
      sidearmAmmo: 7,
      sidearmReserve: 30,
      ammo: 30,
      reserve: 90,
    });
  });
});

describe("the MP5 (buy menu, both modes)", () => {
  it("1v1: bought at spawn with 30 / 120, fires every 80 ms, kept next round", () => {
    const s = createMatch({ A: "a", B: "b" }, 5, 0);
    startMatch(s, 0);
    stepMatch(s, {}, 3000, TICK_MS);
    expect(buyPrimary(s, "A", "mp5", 3010)).toBe(true);
    expect(s.players.A).toMatchObject({ primary: "mp5", ammo: 30, reserve: 120, weapon: "rifle" });
    Object.assign(s.players.A, { x: 0, z: -2.4, y: 0 });
    Object.assign(s.players.B, { x: 40, z: 40, y: 0 });
    let now = 3034,
      seq = 1;
    for (let k = 0; k < 12; k++)
      stepMatch(s, { A: input(seq++, { fire: true }) }, (now += TICK_MS), TICK_MS);
    // 12 ticks (400 ms) of a held trigger: shots due at 0, 80 … 320 ms, each on the first tick
    // at or after it (a tick-rounded cycle would give 4: one per 100 ms).
    expect(30 - s.players.A.ammo).toBe(5);
    s.players.B.hp = 0;
    stepMatch(s, { A: input(seq++) }, (now += TICK_MS), TICK_MS);
    stepMatch(s, {}, s.phaseEndsAt + 1, TICK_MS);
    expect(s.players.A).toMatchObject({
      primary: "mp5",
      ammo: 30,
      reserve: 120,
      sidearm: "deagle",
    });
  });
  it("5v5: the MP5 and the Deagle are bought at B; the Deagle is kept through rounds", () => {
    const slots = Array.from({ length: 10 }, (_, i) => ({ id: `p${i}`, name: `P${i}`, bot: true }));
    const s = createBombMatch(slots, 0, 9);
    startBombMatch(s, 0);
    const p = s.players[0]!;
    expect(p.sidearm).toBeUndefined(); // not carried until bought
    expect(buyBombPrimary(s, 0, "mp5", 10)).toBe(true);
    expect(buyBombPrimary(s, 0, "deagle", 10)).toBe(true);
    expect(p).toMatchObject({
      primary: "mp5",
      sidearm: "deagle",
      sidearmAmmo: 7,
      sidearmReserve: 35,
      weapon: "sidearm",
    });
    expect(spectatorPov(p)).toMatchObject({ sidearm: "deagle", sidearmAmmo: 7 });
    // Fire it once in the live round: semi-automatic, own magazine.
    let t = 0;
    while (s.phase !== "live") stepBombMatch(s, {}, (t += TICK_MS));
    Object.assign(s.players[0]!, { x: 0, z: -12, y: 0 });
    Object.assign(s.players[5]!, { x: 0, z: -4, y: 0, armor: 100 });
    for (const q of s.players)
      if (q.slot !== 0 && q.slot !== 5) Object.assign(q, { x: 36, z: 36 - q.slot });
    const yaw = Math.PI,
      pitch = Math.atan2(1.2 - 1.6, 8);
    for (let k = 0; k < 10; k++)
      stepBombMatch(
        s,
        { 0: input(k + 1, { yaw, pitch, weapon: "sidearm", fire: true }) },
        (t += TICK_MS),
      );
    expect(s.players[0]!.sidearmAmmo).toBe(6);
    expect(s.players[0]!.ammo).toBe(30);
    expect(100 - s.players[5]!.hp).toBe(49); // chest through the vest
  });
});
