import { WORLD_ASSETS } from "@/lib/fps/br/world";
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { validateBrAct } from "@/lib/fps/br/actions";
import { applyBrDamage } from "@/lib/fps/br/armor";
import { decodeHeightfield, type Heightfield } from "@/lib/fps/br/heightfield";
import { dropFromBag, newLoadout, perksOf, pickUp, tabletOf } from "@/lib/fps/br/inventory";
import { ITEMS } from "@/lib/fps/br/items";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import {
  brViewFor,
  BrSeatSync,
  BrSight,
  checkpointBrMatch,
  createBrMatch,
  perkInput,
  releaseSeat,
  restoreBrMatch,
  seatHuman,
  stepBrMatch,
  trackerPrints,
  validateBrInput,
  type BrInput,
} from "@/lib/fps/br/match";
import { stepBody, type BrBody } from "@/lib/fps/br/movement";
import { brThrowStart } from "@/lib/fps/br/grenades";
import { reloadLengthMs } from "@/lib/fps/br/reload-progress";
import {
  PERK_EFFECT,
  PERK_IDS,
  PERKS,
  perkOn,
  perkOperation,
  newTablet,
  TABLET,
  type PerkId,
  type TabletState,
} from "@/lib/fps/br/perks";
import type { CollisionData, StaticWorld } from "@/lib/fps/br/static-world";
import type { WorldMeta } from "@/lib/fps/br/world";
import { TICK_MS } from "@/lib/fps/simulation";

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

function duel() {
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
  put(1, 420);
  return { state, yaw: Math.atan2(-ux, -uz), pitch: Math.atan2(1.17 - 1.6, 20) };
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

/** A tablet with these perks in its slots (up to three). */
const tabletWith = (...perks: PerkId[]): TabletState => ({
  ...newTablet(),
  active: [perks[0] ?? null, perks[1] ?? null, perks[2] ?? null],
});
const give = (state: ReturnType<typeof duel>["state"], seat: number, ...perks: PerkId[]) =>
  pickUp(state.seats[seat]!.kit, { item: "tablet", qty: 1, tablet: tabletWith(...perks) });

describe("tactical tablet", () => {
  it("has 16 perks, ten rare and six epic, none for squads, three slots, no currency", () => {
    expect(PERK_IDS.length).toBe(16);
    expect(PERK_IDS.filter((id) => PERKS[id].rarity === "rare").length).toBe(10);
    expect(PERK_IDS.filter((id) => PERKS[id].rarity === "epic").length).toBe(6);
    for (const id of PERK_IDS) {
      expect(PERKS[id].description, id).not.toMatch(/teammate|revive|squad|downed/i);
      expect(PERKS[id], id).not.toHaveProperty("cost");
    }
    expect(TABLET).toEqual({ activeSlots: 3 });
    expect(newTablet()).toEqual({ active: [null, null, null] });
  });

  it("is rare loot that carries its own slots, one per player", () => {
    const l = newLoadout();
    expect(pickUp(l, { item: "tablet", qty: 1 }).ok).toBe(true);
    expect(tabletOf(l)!.active).toEqual([null, null, null]);
    expect(pickUp(l, { item: "tablet", qty: 1 }).reason).toBe("Tablet already carried");
    tabletOf(l)!.active[0] = "quick-hands";
    const drop = dropFromBag(
      l,
      l.bag.findIndex((b) => b.item === "tablet"),
    );
    // Dropped: nothing carried, no perk works.
    expect(tabletOf(l)).toBeNull();
    expect(perkOn(tabletOf(l), "quick-hands")).toBe(false);
    // Picked up again (by anyone): its slots as they were, once.
    const other = newLoadout();
    pickUp(other, drop.drops[0]!);
    expect(tabletOf(other)!.active).toEqual(["quick-hands", null, null]);
    expect(perkOn(tabletOf(other), "quick-hands")).toBe(true);
    expect(ITEMS.tablet.rarity).toBe("epic");
  });

  it("equips any perk freely, never more than 3, one slot a perk, and refuses what it cannot run", () => {
    const tb = newTablet();
    expect(perkOperation(tb, { op: "activate", perk: "deadly-precision", slot: 0 })).toBeNull();
    // The same slot again changes nothing; another slot moves it (a perk holds one slot).
    expect(perkOperation(tb, { op: "activate", perk: "deadly-precision", slot: 0 })).toBeNull();
    expect(perkOperation(tb, { op: "activate", perk: "deadly-precision", slot: 1 })).toBeNull();
    expect(tb.active).toEqual([null, "deadly-precision", null]);
    expect(perkOperation(tb, { op: "activate", perk: "tracker", slot: 1 })).toBeNull(); // replaces
    expect(tb.active.filter(Boolean)).toEqual(["tracker"]);
    expect(perkOperation(tb, { op: "activate", perk: "tracker", slot: 3 })).toBe("No such slot");
    expect(perkOperation(tb, { op: "activate", perk: "quick-hands", slot: 0 })).toBeNull();
    expect(perkOperation(tb, { op: "activate", perk: "lightweight", slot: 2 })).toBeNull();
    // Three in: a fourth takes a slot over, it never adds one.
    expect(perkOperation(tb, { op: "activate", perk: "scavenger", slot: 0 })).toBeNull();
    expect(tb.active).toEqual(["scavenger", "tracker", "lightweight"]);
    expect(tb.active.length).toBe(3);
    expect(perkOperation(tb, { op: "deactivate", slot: 1 })).toBeNull();
    expect(tb.active).toEqual(["scavenger", null, "lightweight"]);
    // Every perk can be equipped and works (Battle Hardened: enemy grenades and fire).
    expect(perkOperation(tb, { op: "activate", perk: "battle-hardened", slot: 1 })).toBeNull();
    expect(perkOn(tb, "battle-hardened")).toBe(true);
    expect(perkOperation(tb, { op: "deactivate", slot: 1 })).toBeNull();
    // The old "unlock" request (Tactical Data, removed) is no longer part of the protocol.
    expect(
      validateBrAct({ v: 1, type: "br-act", act: "perk", op: "unlock", perk: "tracker" }),
    ).toBeNull();
    expect(
      validateBrAct({
        v: 1,
        type: "br-act",
        act: "perk",
        op: "activate",
        perk: "tracker",
        slot: 4,
      }),
    ).toBeNull();
    expect(
      validateBrAct({ v: 1, type: "br-act", act: "perk", op: "unlock", perk: "nope" }),
    ).toBeNull();
    expect(
      validateBrAct({
        v: 1,
        type: "br-act",
        act: "perk",
        op: "activate",
        perk: "deadly-bullets",
        slot: 0,
      }),
    ).toBeNull();
  });

  it("only the server's tablet counts: no tablet, no perk; repeated requests change nothing", () => {
    const { state, yaw } = duel();
    const me = state.seats[0]!;
    const ask = { act: "perk", op: "activate", perk: "quick-hands", slot: 0 };
    // No tablet: refused by the server whatever the client says.
    let events = tick(state, { yaw }, [ask]);
    expect(events.find((e) => e.type === "act")).toMatchObject({ ok: false, reason: "No tablet" });
    pickUp(me.kit, { item: "tablet", qty: 1 });
    // A burst in one tick (a double click, two packets, a fourth perk): three slots at most.
    events = tick(state, { yaw }, [
      ask,
      ask,
      { act: "perk", op: "activate", perk: "scavenger", slot: 1 },
      { act: "perk", op: "activate", perk: "tracker", slot: 2 },
    ]);
    // The third perk used the tablet up: the perks stay, a fourth request has no tablet.
    expect(tabletOf(me.kit)).toBeNull();
    expect(perksOf(me.kit)!.active).toEqual(["quick-hands", "scavenger", "tracker"]);
    events = tick(state, { yaw }, [{ act: "perk", op: "activate", perk: "lightweight", slot: 2 }]);
    expect(events.find((e) => e.type === "act")).toMatchObject({ ok: false, reason: "No tablet" });
    expect(perksOf(me.kit)!.active).toEqual(["quick-hands", "scavenger", "tracker"]);
    // The kit view (what the client shows): no tablet, the locked perks.
    const sync = new BrSeatSync();
    const seen = brViewFor(state, world, new BrSight(), 0, t, sync).kit!;
    expect(seen.tablet).toBeNull();
    expect(seen.perks).toEqual(perksOf(me.kit));
    // A new tablet opens on the locked perks (a dropped tablet's own slots are not taken).
    pickUp(me.kit, { item: "tablet", qty: 1, tablet: tabletWith("ghost-protocol") });
    expect(tabletOf(me.kit)!.active).toEqual(["quick-hands", "scavenger", "tracker"]);
    // Swapping a perk in and out restores nothing: health, rounds and armour stay as they are.
    me.kit.hp = 37;
    const kit = JSON.stringify({ hp: me.kit.hp, guns: me.kit.guns, armour: me.kit.armour });
    tick(state, { yaw }, [
      { act: "perk", op: "deactivate", slot: 0 },
      { act: "perk", op: "activate", perk: "iron-plates", slot: 0 },
      { act: "perk", op: "activate", perk: "fast-recovery", slot: 1 },
    ]);
    expect(JSON.stringify({ hp: me.kit.hp, guns: me.kit.guns, armour: me.kit.armour })).toBe(kit);
  });

  it("the third perk uses the tablet up; the perks stay; a new tablet changes them once", () => {
    const { state, yaw } = duel();
    const me = state.seats[0]!;
    pickUp(me.kit, { item: "tablet", qty: 1 });
    const free = () => me.kit.bag.length;
    const bag = free();
    let events = tick(state, { yaw }, [
      { act: "perk", op: "activate", perk: "quick-hands", slot: 0 },
      { act: "perk", op: "activate", perk: "lightweight", slot: 1 },
    ]);
    // Two perks: still a tablet, the choice still open (and dropped, the perks stop).
    expect(tabletOf(me.kit)!.active).toEqual(["quick-hands", "lightweight", null]);
    expect(events.filter((e) => e.type === "act").every((e) => !("used" in e))).toBe(true);
    events = tick(state, { yaw }, [{ act: "perk", op: "activate", perk: "tracker", slot: 2 }]);
    expect(events.find((e) => e.type === "act")).toMatchObject({ ok: true, used: true });
    expect(tabletOf(me.kit)).toBeNull();
    expect(free()).toBe(bag - 1);
    expect(me.kit.perks!.active).toEqual(["quick-hands", "lightweight", "tracker"]);
    // The perks keep working without a tablet.
    expect(perkOn(perksOf(me.kit), "lightweight")).toBe(true);
    // A new tablet: opens on them; a move or the same perk again uses nothing up.
    pickUp(me.kit, { item: "tablet", qty: 1 });
    events = tick(state, { yaw }, [
      { act: "perk", op: "activate", perk: "tracker", slot: 2 },
      { act: "perk", op: "deactivate", slot: 1 },
    ]);
    expect(tabletOf(me.kit)!.active).toEqual(["quick-hands", null, "tracker"]);
    // Dropped half-changed: the locked perks are back, all three.
    const at = me.kit.bag.findIndex((b) => b.item === "tablet");
    const dropped = dropFromBag(me.kit, at, 1);
    expect(perksOf(me.kit)!.active).toEqual(["quick-hands", "lightweight", "tracker"]);
    pickUp(me.kit, dropped.drops[0]!);
    // The swap: a new third perk uses this tablet up too.
    events = tick(state, { yaw }, [{ act: "perk", op: "activate", perk: "scavenger", slot: 1 }]);
    expect(events.find((e) => e.type === "act")).toMatchObject({ ok: true, used: true });
    expect(tabletOf(me.kit)).toBeNull();
    expect(me.kit.perks!.active).toEqual(["quick-hands", "scavenger", "tracker"]);
    // A checkpoint keeps the locked perks.
    const restored = restoreBrMatch(
      meta,
      (x, z) => hf.heightAt(x, z),
      JSON.parse(JSON.stringify(checkpointBrMatch(state))),
    );
    expect(perksOf(restored.seats[0]!.kit)).toEqual(me.kit.perks);
  });

  it("Deadly Precision and Iron Plates change the real damage and wear, never the head's", () => {
    const { state, yaw, pitch } = duel();
    const me = state.seats[0]!,
      them = state.seats[1]!;
    pickUp(me.kit, { item: "ak47", qty: 1, mag: 30 });
    // Single shots, each hit judged by the zone the server gave it.
    const shoot = (scale: number) => {
      const zones = new Set<string>();
      for (let n = 0; n < 6; n++) {
        them.kit.hp = 100;
        for (let i = 0; i < 20; i++)
          for (const e of tick(state, { yaw, pitch, fire: i === 0 }))
            if (e.type === "hit" && e.victim === 1) {
              zones.add(e.zone);
              const base = ITEMS.ak47.damage[e.zone];
              expect(e.damage, e.zone).toBe(e.zone === "head" ? base : Math.round(base * scale));
            }
      }
      return zones;
    };
    expect(shoot(1).size).toBeGreaterThan(0);
    give(state, 0, "deadly-precision");
    const zones = shoot(PERK_EFFECT.bodyDamage);
    expect([...zones].some((z) => z !== "head")).toBe(true);
    // The AWP keeps its own damage (its body shot must not become a one-shot through armour).
    me.kit.guns[0] = { item: "awp", mag: 5, optic: null, muzzle: null } as never;
    me.hands.drawUntil = 0;
    let awpHits = 0;
    for (let n = 0; n < 3; n++) {
      them.kit.hp = 1000;
      for (let i = 0; i < 60; i++)
        for (const e of tick(state, { yaw, pitch, fire: i === 0 }))
          if (e.type === "hit" && e.victim === 1) {
            awpHits++;
            expect(e.damage).toBe(ITEMS.awp.damage[e.zone]);
          }
    }
    expect(awpHits).toBeGreaterThan(0);
    // The scale itself: 8 %, off the head only (armor.ts takes it as the body's scale).
    expect(PERK_EFFECT.bodyDamage).toBeCloseTo(1.08, 5);
    const bare = { helmet: null, vest: null, plates: [null, null, null] as never };
    expect(applyBrDamage(bare, ITEMS.ak47, "head").damage).toBe(ITEMS.ak47.damage.head);
    // Time to kill on the chest without armour: 3 AK rounds either way (no faster kill).
    const shots = (d: number) => Math.ceil(100 / d);
    expect(shots(Math.round(34 * 1.08))).toBe(shots(34));
    const a = {
      helmet: null,
      vest: { item: "vest-2" as const, durability: 150 },
      plates: [null, null, null] as never,
    };
    const b = structuredClone(a);
    applyBrDamage(a, ITEMS.ak47, "chest");
    const worn = applyBrDamage(b, ITEMS.ak47, "chest", { wear: PERK_EFFECT.armorWear });
    expect(150 - b.vest.durability).toBeCloseTo((150 - a.vest.durability) / 1.15, 5);
    // Equipping Iron Plates gives no armour, and the hit hurts as much: only the wear changes.
    expect(worn.damage).toBe(applyBrDamage(structuredClone(a), ITEMS.ak47, "chest").damage);
    const none = newLoadout();
    pickUp(none, { item: "tablet", qty: 1, tablet: tabletWith("iron-plates") });
    expect(none.armour).toEqual(newLoadout().armour);
  });

  it("Quick Hands, Combat Ready, Field Medic and Scavenger change the server's own timings", () => {
    const { state, yaw } = duel();
    const me = state.seats[0]!;
    give(state, 0, "quick-hands", "combat-ready", "field-medic");
    pickUp(me.kit, { item: "ak47", qty: 1, mag: 1 });
    pickUp(me.kit, { item: "ammo-rifle", qty: 30 });
    tick(state, { yaw, reload: true });
    expect(me.hands.reloadUntil - t).toBeCloseTo(ITEMS.ak47.reloadMs * 0.85, 0);
    // The client's reload clip runs against the same length.
    expect(reloadLengthMs(ITEMS.ak47.reloadMs, tabletOf(me.kit))).toBeCloseTo(
      ITEMS.ak47.reloadMs * 0.85,
      5,
    );
    for (let i = 0; i < 60; i++) tick(state, { yaw });
    expect(me.kit.guns[0]!.mag).toBe(ITEMS.ak47.magazine);
    // Switching to the knife and back: the draw is 25 % shorter, and nothing fires during it.
    tick(state, { yaw, slot: 2 });
    const knifeDraw = me.hands.drawUntil - t;
    tick(state, { yaw, slot: 0 });
    const gunDraw = me.hands.drawUntil - t;
    const mag = me.kit.guns[0]!.mag;
    tick(state, { yaw, fire: true });
    expect(me.kit.guns[0]!.mag).toBe(mag);
    tabletOf(me.kit)!.active = [null, null, null];
    tick(state, { yaw, slot: 2 });
    expect(knifeDraw).toBeCloseTo((me.hands.drawUntil - t) * 0.75, 0);
    tick(state, { yaw, slot: 0 });
    expect(gunDraw).toBeCloseTo((me.hands.drawUntil - t) * 0.75, 0);
    tabletOf(me.kit)!.active = ["quick-hands", "combat-ready", "field-medic"];
    for (let i = 0; i < 40; i++) tick(state, { yaw });
    // Healing: bandage 3 s × 0.8; damage still interrupts it.
    me.kit.hp = 50;
    pickUp(me.kit, { item: "bandage", qty: 2 });
    tick(state, { yaw }, [{ act: "heal", item: "bandage" }]);
    expect(me.hands.heal!.until - t).toBeCloseTo(ITEMS.bandage.useMs * 0.8, 0);
    tick(state, { yaw }, [{ act: "cancel" }]);
    expect(me.hands.heal).toBeNull();
    expect(me.kit.hp).toBe(50);
    // Scavenger: a quarter more ammunition from loot, into the same capped bag.
    tabletOf(me.kit)!.active[0] = "scavenger";
    const had = me.kit.bag.find((b) => b.item === "ammo-rifle")!.qty;
    const { id } = state.loot.add({ item: "ammo-rifle", qty: 20 }, me.body.x, me.body.y, me.body.z);
    tick(state, { yaw }, [{ act: "pickup", id }]);
    expect(me.kit.bag.find((b) => b.item === "ammo-rifle")!.qty).toBe(had + 25);
  });

  it("Fast Recovery makes a bandage give a fifth more, up to 85, never a medkit's worth", () => {
    const plain = newLoadout(),
      perk = newLoadout();
    pickUp(perk, { item: "tablet", qty: 1, tablet: tabletWith("fast-recovery") });
    for (const l of [plain, perk]) {
      l.hp = 40;
      pickUp(l, { item: "bandage", qty: 5 });
    }
    const { state, yaw } = duel();
    const a = state.seats[0]!;
    a.kit = perk;
    tick(state, { yaw }, [{ act: "heal", item: "bandage" }]);
    for (let i = 0; i < 100; i++) tick(state, { yaw });
    expect(a.kit.hp).toBe(40 + ITEMS.bandage.heal * PERK_EFFECT.bandageHeal);
    a.kit.hp = 80;
    tick(state, { yaw }, [{ act: "heal", item: "bandage" }]);
    for (let i = 0; i < 100; i++) tick(state, { yaw });
    expect(a.kit.hp).toBe(PERK_EFFECT.bandageUpTo);
    expect(PERK_EFFECT.bandageUpTo).toBeLessThan(100);
  });

  it("Lightweight sprints 8 % faster on the ground only; the scale is the server's, never the wire's", () => {
    const run = (input: Parameters<typeof stepBody>[2], ticks = 60) => {
      const b: BrBody = {
        x: meta.runways[0]!.a[0],
        z: meta.runways[0]!.a[1],
        y: 0,
        velocityY: 0,
        grounded: true,
        crouched: false,
      };
      b.y = world.supportAt(b.x, b.z, 0.35, 1e4);
      const [bx, bz] = meta.runways[0]!.b;
      const yaw = Math.atan2(b.x - bx, b.z - bz);
      const from = { x: b.x, z: b.z };
      for (let i = 0; i < ticks; i++) stepBody(world, b, { ...input!, yaw }, TICK_MS);
      return Math.hypot(b.x - from.x, b.z - from.z);
    };
    const base = { forward: 1, strafe: 0, yaw: 0 };
    const sprint = run({ ...base, sprint: true }),
      light = run({ ...base, sprint: true, sprintScale: PERK_EFFECT.sprint }),
      jog = run(base),
      lightJog = run({ ...base, sprintScale: PERK_EFFECT.sprint });
    expect(light / sprint).toBeCloseTo(1.08, 2);
    expect(lightJog).toBeCloseTo(jog, 5);
    // The one bonus there is: no stacking past it.
    expect(PERK_EFFECT.sprint).toBeLessThanOrEqual(1.1);
    // The input schema has no field for it (a client cannot ask for speed).
    expect(
      validateBrInput({
        v: 1,
        type: "br-input",
        seq: 1,
        forward: 1,
        strafe: 0,
        yaw: 0,
        sprintScale: 3,
      }),
    ).toBeNull();
    // perkInput: only from a carried tablet with the perk in a slot.
    expect(perkInput(base, null)).toBe(base);
    expect(perkInput(base, tabletWith("lightweight", "quick-vault"))).toMatchObject({
      sprintScale: PERK_EFFECT.sprint,
      climbScale: PERK_EFFECT.climb,
    });
    // Through the match, the server and the prediction step the same body the same way.
    const { state, yaw } = duel();
    give(state, 0, "lightweight");
    const me = state.seats[0]!;
    const start = { x: me.body.x, z: me.body.z };
    const predicted: BrBody = { ...me.body };
    for (let i = 0; i < 30; i++) {
      const input = { forward: 1, strafe: 0, yaw, sprint: true };
      stepBody(world, predicted, perkInput(input, tabletOf(me.kit)), TICK_MS);
      tick(state, input);
    }
    expect(Math.hypot(me.body.x - predicted.x, me.body.z - predicted.z)).toBeLessThan(1e-6);
    const far = Math.hypot(me.body.x - start.x, me.body.z - start.z);
    // Dropped: the bonus is gone on the next step.
    dropFromBag(
      me.kit,
      me.kit.bag.findIndex((b) => b.item === "tablet"),
    );
    const mid = { x: me.body.x, z: me.body.z };
    for (let i = 0; i < 30; i++) tick(state, { forward: 1, strafe: 0, yaw, sprint: true });
    expect(far / Math.hypot(me.body.x - mid.x, me.body.z - mid.z)).toBeCloseTo(1.08, 2);
  });

  it("Explosive Expert throws 15 % farther and takes a fifth less from its own grenades only", () => {
    const eye = { x: meta.runways[0]!.a[0], y: 200, z: meta.runways[0]!.a[1] };
    const a = brThrowStart(eye, 0, 0.3, "over", world),
      b = brThrowStart(eye, 0, 0.3, "over", world, PERK_EFFECT.throwRange);
    const speed = (v: { x: number; y: number; z: number }) => Math.hypot(v.x, v.y, v.z);
    // Range goes with the square of the speed.
    expect((speed(b.velocity) / speed(a.velocity)) ** 2).toBeCloseTo(1.15, 2);
    expect(b.origin).toEqual(a.origin);
    const blast = (perk: boolean, victim: 0 | 1) => {
      const { state, yaw } = duel();
      if (perk) give(state, 0, "explosive-expert");
      const me = state.seats[0]!,
        them = state.seats[1]!;
      // Seat 1 stands beside the thrower: the grenade dropped at their feet hurts both.
      them.body.x = me.body.x + 1;
      them.body.z = me.body.z;
      them.body.y = me.body.y;
      pickUp(me.kit, { item: "grenade-he", qty: 1 });
      tick(state, { yaw, pitch: -1.5 }, [{ act: "throw", nade: "he", kind: "under" }]);
      let hurt = 0;
      for (let i = 0; i < 90; i++)
        for (const e of tick(state, { yaw }))
          if (e.type === "hurt" && e.victim === victim) hurt += e.damage;
      return hurt;
    };
    const own = blast(false, 0),
      ownPerk = blast(true, 0);
    expect(own).toBeGreaterThan(10);
    expect(ownPerk / own).toBeCloseTo(PERK_EFFECT.selfBlast, 1);
    // Never more (or less) to anyone else.
    expect(blast(true, 1)).toBeCloseTo(blast(false, 1), 5);
  });

  it("Battle Hardened: a quarter less from another player's grenade, never from your own", () => {
    const blast = (perkOn: 0 | 1 | null, victim: 0 | 1) => {
      const { state, yaw } = duel();
      if (perkOn !== null) give(state, perkOn, "battle-hardened");
      const me = state.seats[0]!,
        them = state.seats[1]!;
      them.body.x = me.body.x + 1;
      them.body.z = me.body.z;
      them.body.y = me.body.y;
      pickUp(me.kit, { item: "grenade-he", qty: 1 });
      tick(state, { yaw, pitch: -1.5 }, [{ act: "throw", nade: "he", kind: "under" }]);
      let hurt = 0;
      for (let i = 0; i < 90; i++)
        for (const e of tick(state, { yaw }))
          if (e.type === "hurt" && e.victim === victim) hurt += e.damage;
      return hurt;
    };
    const theirs = blast(null, 1),
      hardened = blast(1, 1);
    expect(theirs).toBeGreaterThan(10);
    expect(hardened / theirs).toBeCloseTo(PERK_EFFECT.enemyBlast, 1);
    // The thrower's own blast is Explosive Expert's business, not this perk's.
    expect(blast(0, 0)).toBeCloseTo(blast(null, 0), 5);
  });

  it("Last Stand: a small heal 3 s after an elimination, in pulses, cancelled by damage, once every 90 s", () => {
    const L = PERK_EFFECT.lastStand;
    const setup = () => {
      const { state, yaw, pitch } = duel();
      give(state, 0, "last-stand");
      const me = state.seats[0]!,
        them = state.seats[1]!;
      pickUp(me.kit, { item: "ak47", qty: 1, mag: 30 });
      me.kit.hp = 40;
      them.kit.hp = 1;
      for (let i = 0; i < 20 && !them.dead; i++) tick(state, { yaw, pitch, fire: i % 10 === 0 });
      expect(them.dead).toBe(true);
      return { state, yaw, pitch, me, at: t };
    };
    {
      const { state, yaw, pitch: pitch0, me, at } = setup();
      // Nothing at once, nothing before the three seconds are up.
      while (t - at < L.delayMs) {
        expect(me.kit.hp).toBe(40);
        tick(state, { yaw });
      }
      let peak = 40;
      for (let i = 0; i < 400; i++) {
        tick(state, { yaw });
        expect(me.kit.hp - peak).toBeLessThanOrEqual(L.heal / (L.overMs / L.pulseMs) + 1e-6);
        peak = Math.max(peak, me.kit.hp);
      }
      expect(me.kit.hp).toBeCloseTo(40 + L.heal, 5);
      // A second elimination inside the cooldown arms nothing.
      expect(me.stand!.readyAt - at).toBeGreaterThan(L.cooldownMs - 1000);
      const third = state.seats[2]!;
      Object.assign(third.body, { ...state.seats[1]!.body });
      state.seats[1]!.body.x += 500;
      third.kit.hp = 1;
      me.kit.hp = 40;
      for (let i = 0; i < 40 && !third.dead; i++)
        tick(state, { yaw, pitch: pitch0, fire: i % 10 === 0 });
      expect(third.dead).toBe(true);
      for (let i = 0; i < 300; i++) tick(state, { yaw });
      expect(me.kit.hp).toBe(40);
    }
    {
      // Damage during the heal ends it; near full health it stops at the maximum.
      const { state, yaw, me, at } = setup();
      while (t - at < L.delayMs + 1200) tick(state, { yaw });
      const some = me.kit.hp;
      expect(some).toBeGreaterThan(40);
      expect(some).toBeLessThan(40 + L.heal);
      // Hit (what any damage event sets): the heal stops where it was.
      me.hurtAt = t;
      for (let i = 0; i < 300; i++) tick(state, { yaw });
      expect(me.kit.hp).toBe(some);
    }
    {
      const { state, yaw, me } = setup();
      me.kit.hp = 95;
      for (let i = 0; i < 400; i++) tick(state, { yaw });
      expect(me.kit.hp).toBe(100);
    }
    {
      // The tablet dropped before the heal starts: no heal.
      const { state, yaw, me } = setup();
      dropFromBag(
        me.kit,
        me.kit.bag.findIndex((b) => b.item === "tablet"),
      );
      for (let i = 0; i < 400; i++) tick(state, { yaw });
      expect(me.kit.hp).toBe(40);
    }
  });

  it("Tracker: nearby enemy footprints only, a second old at least, eight at most; Ghost Protocol halves them", () => {
    const T = PERK_EFFECT.tracker;
    const { state, yaw } = duel();
    give(state, 0, "tracker");
    const me = state.seats[0]!,
      them = state.seats[1]!;
    // Seat 1 walks past, 10 m to 20 m from me.
    const walk = (ticks: number) => {
      for (let i = 0; i < ticks; i++) {
        t += TICK_MS;
        stepBrMatch(
          state,
          world,
          meta,
          new Map([
            [0, { seq: 0, forward: 0, strafe: 0, yaw }],
            [1, { seq: 0, forward: 1, strafe: 0, yaw: yaw + Math.PI / 2 }],
          ]),
          t,
          TICK_MS,
        );
      }
    };
    walk(90);
    const sync = new BrSeatSync();
    const view = brViewFor(state, world, new BrSight(), 0, t, sync);
    const prints = view.tracks!;
    expect(prints.length).toBeGreaterThan(0);
    expect(prints.length % 5).toBe(0);
    expect(prints.length / 5).toBeLessThanOrEqual(T.max);
    for (let i = 0; i < prints.length; i += 5) {
      const d = Math.hypot(prints[i]! - me.body.x, prints[i + 2]! - me.body.z);
      expect(d).toBeLessThanOrEqual(T.radiusM);
      // Never where they stand now: every print is at least a second behind them.
      expect(prints[i + 4]! * 100).toBeGreaterThanOrEqual(T.minAgeMs - 50);
      expect(prints[i + 4]! * 100).toBeLessThanOrEqual(T.lifeMs + 50);
      expect(Math.hypot(prints[i]! - them.body.x, prints[i + 2]! - them.body.z)).toBeGreaterThan(1);
    }
    // Not every tick: the next views carry none until the interval is up.
    t += TICK_MS;
    expect(brViewFor(state, world, new BrSight(), 0, t, sync).tracks).toBeUndefined();
    // Nobody else gets them: no perk, no prints (seat 1 has no tablet).
    expect(brViewFor(state, world, new BrSight(), 1, t, new BrSeatSync()).tracks).toBeUndefined();
    expect(trackerPrints(state, me, t).length).toBe(prints.length);
    // Ghost Protocol on the walker: only the younger half of the trail shows.
    const all = trackerPrints(state, me, t);
    give(state, 1, "ghost-protocol");
    const ghost = trackerPrints(state, me, t);
    expect(ghost.length).toBeLessThanOrEqual(all.length);
    for (let i = 0; i < ghost.length; i += 5)
      expect(ghost[i + 4]! * 100).toBeLessThanOrEqual(T.lifeMs * PERK_EFFECT.ghostTrack + 50);
    // They stop: the prints age out, and one empty list clears the client's marks.
    for (let i = 0; i < 300; i++) tick(state, { yaw });
    expect(trackerPrints(state, me, t)).toEqual([]);
    const cleared = brViewFor(state, world, new BrSight(), 0, t, sync);
    expect(cleared.tracks).toEqual([]);
    for (let i = 0; i < 12; i++) tick(state, { yaw });
    expect(brViewFor(state, world, new BrSight(), 0, t, sync).tracks).toBeUndefined();
    // Far away: nothing, however fresh.
    them.body.x += 200;
    walk(60);
    expect(trackerPrints(state, me, t)).toEqual([]);
    // Bounded memory: a long walk keeps a few prints a seat.
    expect(state.trails!.get(1)!.length).toBeLessThanOrEqual(T.keep * 5);
  });

  it("Silent Steps marks a run for other players' clients, never a sprint", () => {
    const { state, yaw } = duel();
    give(state, 1, "silent-steps");
    const row = (input: Partial<BrInput>) => {
      t += TICK_MS;
      stepBrMatch(
        state,
        world,
        meta,
        new Map([[1, { seq: 0, forward: 1, strafe: 0, yaw, ...input }]]),
        t,
        TICK_MS,
      );
      return brViewFor(state, world, new BrSight(), 0, t).players.find((r) => r[0] === 1)!;
    };
    expect(row({})[7]).toBe(2);
    expect(row({ sprint: true })[7]).toBe(0);
    expect(row({ crouch: true })[7]! & 1).toBe(1);
    dropFromBag(
      state.seats[1]!.kit,
      state.seats[1]!.kit.bag.findIndex((b) => b.item === "tablet"),
    );
    expect(row({})[7]).toBe(0);
    expect(PERK_EFFECT.stepRadius).toBeCloseTo(0.75, 5);
  });

  it("death drops the tablet with its slots; a checkpoint keeps it; a new match starts clean", () => {
    const { state, yaw, pitch } = duel();
    const me = state.seats[0]!,
      them = state.seats[1]!;
    give(state, 0, "quick-hands", "tracker");
    give(state, 1, "field-medic");
    pickUp(me.kit, { item: "ak47", qty: 1, mag: 30 });
    them.kit.hp = 1;
    for (let i = 0; i < 20 && !them.dead; i++) tick(state, { yaw, pitch, fire: i % 10 === 0 });
    expect(them.dead).toBe(true);
    // The victim carries nothing now; their tablet lies in the world as they left it.
    expect(tabletOf(them.kit)).toBeNull();
    const lying = [...state.loot.items.values()].find((i) => i.item === "tablet")!;
    expect(lying.tablet).toEqual({ active: ["field-medic", null, null] });
    // One tablet a player: the second stays on the ground (no stacking of perks).
    tick(state, { yaw }, [{ act: "pickup", id: lying.id }]);
    expect(me.kit.bag.filter((b) => b.item === "tablet").length).toBe(1);
    // A restarted room: the same tablet, the same slots (a reconnecting player's kit view).
    const restored = restoreBrMatch(
      meta,
      (x, z) => hf.heightAt(x, z),
      JSON.parse(JSON.stringify(checkpointBrMatch(state))),
    );
    expect(tabletOf(restored.seats[0]!.kit)).toEqual(tabletOf(me.kit));
    const view = brViewFor(restored, world, new BrSight(), 0, t, new BrSeatSync());
    expect(view.kit!.tablet!.active).toEqual(["quick-hands", "tracker", null]);
    // The seat given up (a disconnect past its grace): a bot plays on with what the seat
    // carries, the one tablet included (nothing is copied or paid back).
    releaseSeat(state, 0);
    expect(state.seats[0]!.kit.bag.filter((b) => b.item === "tablet").length).toBe(1);
    // A new match starts clean: nobody carries a tablet.
    const fresh = createBrMatch(meta, 10, (x, z) => hf.heightAt(x, z));
    expect(fresh.seats.every((s) => !tabletOf(s.kit) && !s.stand)).toBe(true);
  });
});
