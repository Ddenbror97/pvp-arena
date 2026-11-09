import { describe, expect, it } from "vitest";
import {
  advanceCombatRecoil,
  recoverCombatRecoil,
  recoveryProfile,
  sprayOffset,
} from "@/lib/fps/combat";
import { BrProjectiles, PoseHistory, fire, newHands, type Fighter } from "@/lib/fps/br/combat";
import { newDropBody } from "@/lib/fps/br/drop";
import {
  dropEquipped,
  equipFromBag,
  newLoadout,
  pickUp,
  selectGun,
  type Loadout,
} from "@/lib/fps/br/inventory";
import { fitsGun, ITEMS, type WeaponDef } from "@/lib/fps/br/items";
import { Heightfield } from "@/lib/fps/br/heightfield";
import { StaticWorld } from "@/lib/fps/br/static-world";
import { validateBrAct } from "@/lib/fps/br/actions";
import type { Player } from "@/lib/fps/protocol";

const W = (id: "ak47" | "m4" | "mp5" | "deagle") => ITEMS[id] as WeaponDef;
const gun = (item: "ak47" | "m4" | "awp" | "mp5" | "deagle", extra = {}) => ({
  item,
  qty: 1,
  mag: (ITEMS[item] as WeaponDef).magazine,
  ...extra,
});

describe("MP5 and Desert Eagle: balance", () => {
  it("scales damage from the rifle by the CS:GO and PUBG ratios", () => {
    const rifle = W("ak47").damage.chest;
    // CS:GO MP5-SD 28 / AK 36 ≈ 0.78; PUBG MP5K 33 / AKM 47 ≈ 0.70 and / M416 40 ≈ 0.83.
    expect(W("mp5").damage.chest / rifle).toBeGreaterThan(0.7);
    expect(W("mp5").damage.chest / rifle).toBeLessThan(0.83);
    // CS:GO Deagle 53 / AK 36 ≈ 1.47; PUBG Deagle 62 / AKM 47 ≈ 1.32 and / M416 1.55.
    expect(W("deagle").damage.chest / rifle).toBeGreaterThan(1.3);
    expect(W("deagle").damage.chest / rifle).toBeLessThan(1.55);
  });
  it("kills in four MP5 hits (rifles three) a little slower, the Deagle in two", () => {
    const toKill = (id: "ak47" | "mp5" | "deagle") => Math.ceil(100 / W(id).damage.chest);
    expect(toKill("ak47")).toBe(3);
    expect(toKill("mp5")).toBe(4);
    expect(toKill("deagle")).toBe(2);
    const ttk = (id: "ak47" | "mp5" | "deagle") => (toKill(id) - 1) * W(id).intervalMs;
    // MP5 750 rpm (CS:GO): 240 ms against the rifle's 200 ms; Deagle 267 rpm: 225 ms.
    expect(ttk("mp5")).toBe(240);
    expect(ttk("ak47")).toBe(200);
    expect(ttk("deagle")).toBe(225);
    // The MP5's edge is its hip fire; the Deagle has the heavier armour penetration.
    expect(W("mp5").hipSpreadDeg).toBeLessThan(W("ak47").hipSpreadDeg);
    expect(W("deagle").armorPierce).toBeGreaterThan(0);
    expect(W("deagle").semiAuto).toBe(true);
    expect(W("mp5").semiAuto).toBe(false);
    expect([W("mp5").magazine, W("deagle").magazine]).toEqual([30, 7]);
  });
});

describe("MP5 and Desert Eagle: spray patterns (CS:GO recoil magnitude AK 30, MP5-SD 16, Deagle 48.2)", () => {
  it("climbs the MP5 at 16/30 of the rifle and kicks the Deagle hardest per shot", () => {
    const rifle = sprayOffset("rifle", 10).pitch,
      mp5 = sprayOffset("mp5", 10).pitch;
    expect(mp5 / rifle).toBeCloseTo(16 / 30, 6);
    const kick = (p: "rifle" | "mp5" | "deagle") =>
      sprayOffset(p, 2).pitch - sprayOffset(p, 1).pitch;
    expect(kick("deagle")).toBeGreaterThan(kick("rifle") * 1.4);
    expect(kick("mp5")).toBeLessThan(kick("rifle"));
  });
  it("recovers the Deagle about twice as slowly, so fast taps stack", () => {
    expect(recoveryProfile(1, "deagle").rate).toBeLessThan(recoveryProfile(1, "rifle").rate * 0.5);
    expect(recoveryProfile(1, "deagle").resetMs).toBeGreaterThan(recoveryProfile(1).resetMs * 2);
    const climb = (pattern: "rifle" | "deagle", gapMs: number) => {
      const p = { weapon: "rifle", recoilPattern: pattern, lastShotAt: -1e9 } as Player & {
        recoilPattern: "rifle" | "deagle";
      };
      for (let i = 0; i < 3; i++) {
        recoverCombatRecoil(p, i * gapMs);
        advanceCombatRecoil(p);
        p.lastShotAt = i * gapMs;
      }
      recoverCombatRecoil(p, 3 * gapMs);
      return p.recoilPitch!;
    };
    // Three taps 225 ms apart (its cycle): the Deagle has climbed, a rifle tapped as slowly
    // would have settled.
    expect(climb("deagle", 225)).toBeGreaterThan(0.01);
    expect(climb("rifle", 300)).toBe(0);
  });
});

describe("MP5 and Desert Eagle: the pistol slot", () => {
  it("puts a pistol in its own slot and main guns in slots 1–2", () => {
    const l = newLoadout();
    expect(l.guns).toEqual([null, null, null]);
    expect(pickUp(l, gun("deagle")).ok).toBe(true);
    expect(l.guns[2]?.item).toBe("deagle");
    expect(l.active).toBe(2); // drawn: it was the only gun
    pickUp(l, gun("mp5"));
    pickUp(l, gun("ak47"));
    expect(l.guns.map((g) => g?.item ?? null)).toEqual(["mp5", "ak47", "deagle"]);
    // A third main gun replaces the drawn one; with the pistol drawn, the first main gun.
    const drop = pickUp(l, gun("m4"));
    expect(drop.drops.map((d) => d.item)).toEqual(["mp5"]);
    expect(l.guns.map((g) => g?.item ?? null)).toEqual(["m4", "ak47", "deagle"]);
    // A second pistol swaps for the carried one, which drops with its magazine.
    l.guns[2]!.mag = 3;
    const swap = pickUp(l, gun("deagle"));
    expect(swap.drops).toMatchObject([{ item: "deagle", mag: 3 }]);
    expect(l.guns[2]!.mag).toBe(7);
    expect(selectGun(l, 0)).toBe(true);
    expect(selectGun(l, 2)).toBe(true);
    expect(l.active).toBe(2);
    // Dropping the drawn pistol draws a main gun.
    expect(dropEquipped(l, "gun2").drops).toMatchObject([{ item: "deagle" }]);
    expect(l.active).toBe(0);
    expect(validateBrAct({ v: 1, type: "br-act", act: "dropEquip", slot: "gun2" })).toEqual({
      act: "dropEquip",
      slot: "gun2",
    });
    expect(validateBrAct({ v: 1, type: "br-act", act: "equip", index: 0, target: 2 })).toEqual({
      act: "equip",
      index: 0,
      target: 2,
    });
  });
});

describe("MP5 and Desert Eagle: attachments", () => {
  it("fits every optic and muzzle device on the MP5, only the red dot on the Deagle", () => {
    for (const a of ["sight-red", "sight-holo", "sight-reflex", "scope-4x", "silencer"] as const)
      expect(fitsGun("mp5", a)).toBe(true);
    expect(fitsGun("deagle", "sight-red")).toBe(true);
    for (const a of ["sight-holo", "sight-reflex", "scope-4x", "scope-6x"] as const)
      expect(fitsGun("deagle", a)).toBe(false);
    for (const a of ["silencer", "compensator", "flash-hider"] as const)
      expect(fitsGun("deagle", a)).toBe(false);
  });
  it("routes a picked-up attachment to a gun it fits, else the bag", () => {
    const l: Loadout = newLoadout();
    pickUp(l, gun("deagle"));
    // A silencer never goes on the Deagle: into the bag.
    pickUp(l, { item: "silencer", qty: 1 });
    expect(l.guns[2]!.muzzle).toBeNull();
    expect(l.bag.map((s) => s.item)).toEqual(["silencer"]);
    // A holographic sight neither.
    pickUp(l, { item: "sight-holo", qty: 1 });
    expect(l.guns[2]!.optic).toBeNull();
    // The red dot does.
    pickUp(l, { item: "sight-red", qty: 1 });
    expect(l.guns[2]!.optic).toBe("sight-red");
    // An MP5 picked up later takes the silencer and the holo from the bag.
    pickUp(l, gun("mp5"));
    expect(equipFromBag(l, 0, 0).ok).toBe(true);
    expect(l.guns[0]!.muzzle).toBe("silencer");
    expect(equipFromBag(l, 0, 2)).toMatchObject({ ok: false });
    expect(equipFromBag(l, 0, 0).ok).toBe(true);
    expect(l.guns[0]!.optic).toBe("sight-holo");
    // A Deagle lying with a silencer on it (never possible, but from a hand-edited drop) is
    // stripped of it when picked up.
    const m = newLoadout();
    pickUp(m, gun("deagle", { muzzle: "silencer", optic: "scope-4x" }));
    expect(m.guns[2]).toMatchObject({ optic: null, muzzle: null });
  });
});

describe("MP5 and Desert Eagle: firing", () => {
  const world = () =>
    new StaticWorld(
      new Heightfield(2, 2, 10000, new Float32Array(4)),
      [],
      { voxel: 1, models: {} },
      null,
      [],
    );
  function shooter(item: "mp5" | "deagle"): Fighter {
    const f: Fighter = {
      seat: 0,
      body: { ...newDropBody(), x: 0, y: 10, z: 0, grounded: true, phase: "ground" },
      kit: newLoadout(),
      hands: newHands(),
      dead: false,
      kills: 0,
      damage: 0,
      kitVersion: 0,
    };
    pickUp(f.kit, gun(item));
    return f;
  }
  it("fires the MP5 every 80 ms with its own sound key, recoil and slow, draggy round", () => {
    const f = shooter("mp5"),
      pool = new BrProjectiles(),
      history = new PoseHistory();
    let shots = 0;
    for (let now = 1000; now < 1400; now += 20) {
      const e = fire(
        f,
        { yaw: 0, pitch: 0, forward: 0, strafe: 0 },
        [f],
        world(),
        history,
        now,
        now,
        () => {},
        undefined,
        pool,
      );
      if (e.length) {
        shots++;
        expect(e[0]).toMatchObject({ type: "shot", gun: "mp5", hearM: 110 });
      }
    }
    expect(shots).toBe(5); // 1000, 1080, … 1320
    expect(f.hands.recoilPattern).toBe("mp5");
    expect(f.hands.recoilPitch).toBeGreaterThan(0);
  });
});
