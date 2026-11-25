import { describe, expect, it } from "vitest";
import { createMatch, startMatch, stepMatch, TICK_MS } from "../src/lib/fps/simulation";
import {
  RIFLES,
  SIDE_RIFLE,
  applyVestDamage,
  type HitZone,
  type SideRifleId,
} from "../src/lib/fps/combat";
import {
  AWP,
  HUNTING,
  MP5,
  SPAS12,
  awpDamage,
  spas12PelletDamage,
  vestDamage,
} from "../src/lib/fps/primary";
import { DEAGLE } from "../src/lib/fps/sidearm";
import type { Input, Player, Seat } from "../src/lib/fps/protocol";

/**
 * 1v1/5v5 weapon balance (2026-11-25, owner: "A tier: AK/M4/AWP - B tier: Shotgun/MP5/Hunt
 * rifle - C tier Desert eagle. balanced damage should be like CS:GO … check with kevlar and no
 * kevlar"). Every gun uses CS:GO's per-bullet damage and armour penetration (no helmets here).
 */
const fire = (seq: number, yaw: number, pitch: number): Input => ({
  v: 1,
  type: "input",
  combatVersion: 2,
  seq,
  forward: 0,
  strafe: 0,
  yaw,
  pitch,
  fire: true,
  reload: false,
  weapon: "rifle",
  jump: false,
  sprint: false,
});

/** One aimed rifle shot from `shooter` at the other seat's `height` on an open lane. */
function shot(shooter: Seat, height: number, armor: number) {
  const s = createMatch({ A: "a", B: "b" }, 5, 0);
  startMatch(s, 0);
  stepMatch(s, {}, 3000, TICK_MS);
  const target: Seat = shooter === "A" ? "B" : "A";
  Object.assign(s.players[shooter], { x: 0, z: -2.4, y: 0 });
  Object.assign(s.players[target], { x: 0, z: -8.4, y: 0, armor });
  s.server!.spreadSeed = 4242;
  const dz = s.players[target].z - s.players[shooter].z;
  stepMatch(
    s,
    { [shooter]: fire(1, Math.atan2(0, -dz), Math.atan2(height - 1.6, Math.abs(dz))) },
    3034,
    TICK_MS,
  );
  return 100 - s.players[target].hp;
}

describe("Police M4A1-S and Terrorist AK-47 (CS:GO tables)", () => {
  it("names the side rifles", () => {
    expect(SIDE_RIFLE).toEqual({ A: "M4A1-S", B: "AK-47" });
  });

  it("fires each side's own CS:GO damage from either seat, with and without a vest", () => {
    for (const [zone, height] of [
      ["head", 1.62],
      ["chest", 1.2],
      ["stomach", 0.78],
      ["legs", 0.3],
    ] as const)
      for (const armor of [0, 100]) {
        // Round 1: seat A is Police (M4A1-S), seat B Terrorist (AK-47).
        const expected = (rifle: SideRifleId) =>
          Math.min(100, applyVestDamage({ armor } as Player, rifle, zone));
        expect(shot("A", height, armor), `${zone} armor ${armor}`).toBe(expected("m4a1s"));
        expect(shot("B", height, armor), `${zone} armor ${armor}`).toBe(expected("ak47"));
      }
  });

  it("the two rifles kill in the same chest hits, with kevlar and without", () => {
    for (const armor of [0, 100]) {
      const toKill = (rifle: SideRifleId) => {
        const t = { armor } as Player;
        let hp = 100,
          n = 0;
        while (hp > 0) {
          hp -= applyVestDamage(t, rifle, "chest");
          n++;
        }
        return n;
      };
      expect(toKill("ak47")).toBe(toKill("m4a1s"));
      expect(toKill("ak47")).toBe(armor ? 4 : 3);
    }
    expect(RIFLES.ak47).toMatchObject({ base: 36, armorPenetration: 0.775 });
    expect(RIFLES.m4a1s).toMatchObject({ base: 38, armorPenetration: 0.7 });
  });
});

/** Hits to kill from full health with one hit zone, the vest wearing as it goes. */
function toKill(hit: (t: Player, z: HitZone) => number, zone: HitZone, armor: number) {
  const t = { armor } as Player;
  let hp = 100,
    n = 0;
  while (hp > 0 && n < 20) {
    hp -= hit(t, zone);
    n++;
  }
  return n;
}
const GUNS = {
  ak47: (t: Player, z: HitZone) => applyVestDamage(t, "ak47", z),
  m4a1s: (t: Player, z: HitZone) => applyVestDamage(t, "m4a1s", z),
  awp: awpDamage,
  hunting: (t: Player, z: HitZone) => vestDamage(t, z, HUNTING),
  mp5: (t: Player, z: HitZone) => vestDamage(t, z, MP5),
  spas12: (t: Player, z: HitZone) => {
    let d = 0;
    for (let i = 0; i < SPAS12.pellets.count; i++) d += spas12PelletDamage(t, z, 2);
    return d;
  },
  deagle: (t: Player, z: HitZone) => vestDamage(t, z, DEAGLE),
};
/** Time to kill on the chest (ms): (hits − 1) × the gun's cycle. */
const CYCLE = {
  ak47: 100,
  m4a1s: 100,
  awp: AWP.cycleMs,
  hunting: HUNTING.cycleMs,
  mp5: MP5.cycleMs,
  spas12: SPAS12.cycleMs,
  deagle: DEAGLE.cycleMs,
};
const ttk = (gun: keyof typeof GUNS, armor: number) =>
  (toKill(GUNS[gun], "chest", armor) - 1) * CYCLE[gun];

describe("tiers: A AK/M4/AWP, B SPAS-12/MP5/Hunting Rifle, C Desert Eagle", () => {
  it("hits to kill, CS:GO, without and with kevlar (no helmets: every headshot kills)", () => {
    const table = Object.fromEntries(
      Object.entries(GUNS).map(([id, hit]) => [
        id,
        (["head", "chest", "stomach", "legs"] as HitZone[]).map(
          (z) => `${toKill(hit, z, 0)}/${toKill(hit, z, 100)}`,
        ),
      ]),
    );
    expect(table).toEqual({
      ak47: ["1/1", "3/4", "3/3", "4/4"],
      m4a1s: ["1/1", "3/4", "3/4", "4/4"],
      awp: ["1/1", "1/1", "1/1", "2/2"],
      hunting: ["1/1", "2/2", "1/2", "2/2"],
      mp5: ["1/1", "4/6", "3/5", "5/5"],
      spas12: ["1/1", "1/2", "1/1", "2/2"],
      deagle: ["1/1", "2/3", "2/2", "3/3"],
    });
  });
  it("through kevlar the A-tier automatics kill faster than the B tier's and the Deagle", () => {
    for (const a of ["ak47", "m4a1s"] as const) {
      expect(ttk(a, 100)).toBeLessThan(ttk("mp5", 100));
      expect(ttk(a, 100)).toBeLessThan(ttk("deagle", 100));
      expect(ttk(a, 100)).toBeLessThan(ttk("hunting", 100));
    }
    // The AWP: one body shot through kevlar; the Hunting Rifle needs two.
    expect(toKill(GUNS.awp, "chest", 100)).toBe(1);
    expect(toKill(GUNS.hunting, "chest", 100)).toBe(2);
  });
});
