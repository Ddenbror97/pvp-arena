import { WORLD_ASSETS } from "@/lib/fps/br/world";
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { validateBrAct, type BrAct } from "@/lib/fps/br/actions";
import { nadePitch } from "@/lib/fps/br/bots";
import { brNadeAdvance, brNadeStart, brThrowStart } from "@/lib/fps/br/grenades";
import { decodeHeightfield, type Heightfield } from "@/lib/fps/br/heightfield";
import { pickUp } from "@/lib/fps/br/inventory";
import { ITEMS } from "@/lib/fps/br/items";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { itemFromCode } from "@/lib/fps/br/loot-world";
import {
  BrSeatSync,
  BrSight,
  brViewFor,
  createBrMatch,
  checkpointBrMatch,
  restoreBrMatch,
  seatHuman,
  stepBrMatch,
  validateBrInput,
  type BrInput,
  type BrMatchState,
} from "@/lib/fps/br/match";
import type { CollisionData, StaticWorld } from "@/lib/fps/br/static-world";
import type { WorldMeta } from "@/lib/fps/br/world";
import { TICK_MS } from "@/lib/fps/simulation";
import { BrProjectiles, PoseHistory, fire } from "@/lib/fps/br/combat";

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

/** Two players standing on the main runway, 20 m apart; seat 0 is the human. */
function duel() {
  const state = createBrMatch(meta, 7, (x, z) => hf.heightAt(x, z));
  seatHuman(state, "u1", "One");
  seatHuman(state, "u2", "Two"); // seat 1: a human with no input stands still
  state.phase = "active";
  const [ax, az] = meta.runways[0]!.a,
    [bx, bz] = meta.runways[0]!.b;
  const len = Math.hypot(bx - ax, bz - az);
  const ux = (bx - ax) / len,
    uz = (bz - az) / len;
  const put = (seat: number, t: number, side = 0) => {
    const b = state.seats[seat]!.body;
    b.x = ax + ux * t - uz * side;
    b.z = az + uz * t + ux * side;
    b.y = world.supportAt(b.x, b.z, 0.35, 1e4);
    b.phase = "ground";
    b.grounded = true;
    b.velocityY = 0;
  };
  // Everyone else well off the line of fire.
  for (const s of state.seats) put(s.seat, 300 + s.seat * 6, 25);
  put(0, 400);
  put(1, 420);
  // Facing seat 1: direction (−sin yaw, −cos yaw).
  const yaw = Math.atan2(-ux, -uz);
  const pitch = Math.atan2(1.17 - 1.6, 20);
  return { state, yaw, pitch };
}

let t = 0;
function tick(
  state: BrMatchState,
  inp: Partial<BrInput> | null,
  acts: BrAct[] = [],
  seq = { n: 0 },
) {
  t += TICK_MS;
  const inputs = new Map<number, BrInput>();
  if (inp) inputs.set(0, { seq: seq.n++, forward: 0, strafe: 0, yaw: 0, ...inp });
  stepBrMatch(state, world, meta, inputs, t, TICK_MS, new Map([[0, acts]]));
  return state.combat;
}

describe("battle royale combat", () => {
  it("clears pending projectiles at take-off, match end and checkpoint restore", () => {
    for (const phase of ["starting", "ending", "completed"] as const) {
      const { state, yaw, pitch } = duel();
      pickUp(state.seats[0]!.kit, { item: "ak47", qty: 1, mag: 30 });
      tick(state, { yaw, pitch, fire: true });
      expect(state.projectiles.size).toBe(1);
      const c = checkpointBrMatch(state);
      const restored = restoreBrMatch(meta, (x, z) => hf.heightAt(x, z), c);
      expect(restored.projectiles.size).toBe(0);
      state.phase = phase;
      state.phaseAt = t;
      tick(state, null);
      expect(state.projectiles.size).toBe(0);
    }
  });
  it("emits the first shot immediately and resolves its damage on the following server tick", () => {
    const { state, yaw, pitch } = duel();
    pickUp(state.seats[0]!.kit, { item: "ak47", qty: 1, mag: 30 });
    const events = tick(state, { yaw, pitch, fire: true });
    expect(events.some((e) => e.type === "shot")).toBe(true);
    expect(events.some((e) => e.type === "hit")).toBe(false);
    expect(state.projectiles.size).toBe(1);
    const later = tick(state, { yaw, pitch });
    expect(later.some((e) => e.type === "hit")).toBe(true);
  });

  it("keeps the projectile hot path below 12 ms p99 with 100 sustained rifle shooters (serial)", () => {
    const { state } = duel();
    const fighters = state.seats;
    const pool = new BrProjectiles(),
      history = new PoseHistory();
    fighters.forEach((s, i) => {
      s.body.x = -3500 + i * 30;
      s.body.y = 1500;
      s.body.z = 0;
      pickUp(s.kit, { item: "ak47", qty: 1, mag: 30 });
    });
    const costs: number[] = [];
    let peak = 0;
    for (let frame = 0; frame < 240; frame++) {
      const now = 1000 + frame * (1000 / 30);
      for (const f of fighters) {
        f.kit.guns[0]!.mag = 30;
        f.hands.recoilPitch = 0;
        f.hands.recoilYaw = 0;
      }
      const start = performance.now();
      history.record(now, fighters);
      for (const f of fighters)
        fire(
          f,
          { yaw: 0, pitch: 0.02, forward: 0, strafe: 0 },
          fighters,
          world,
          history,
          now,
          frame,
          () => {},
          undefined,
          pool,
        );
      pool.advance(fighters, world, history, now, () => {});
      peak = Math.max(peak, pool.size);
      if (frame >= 60) costs.push(performance.now() - start);
    }
    costs.sort((a, b) => a - b);
    const p99 = costs[Math.floor(costs.length * 0.99)]!;
    console.info(`BR projectile 100-shooter serial: p99=${p99.toFixed(2)}ms, peak=${peak}`);
    expect(peak).toBeGreaterThanOrEqual(400);
    expect(p99).toBeLessThan(12);
  });

  it("validates the new input fields and actions strictly", () => {
    const ok = { v: 1, type: "br-input", seq: 1, forward: 0, strafe: 0, yaw: 0 };
    expect(validateBrInput({ ...ok, fire: true, pitch: 0.2, slot: 1 })).toMatchObject({
      fire: true,
      slot: 1,
    });
    expect(validateBrInput({ ...ok, slot: 2 })).toBeNull();
    expect(validateBrInput({ ...ok, pitch: 3 })).toBeNull();
    expect(validateBrAct({ v: 1, type: "br-act", act: "pickup", id: 4 })).toEqual({
      act: "pickup",
      id: 4,
    });
    expect(validateBrAct({ v: 1, type: "br-act", act: "pickup", id: 4, extra: 1 })).toBeNull();
    expect(validateBrAct({ v: 1, type: "br-act", act: "unequip", slot: "hat" })).toBeNull();
    expect(validateBrAct({ v: 1, type: "br-act", act: "heal", item: "medkit" })).toEqual({
      act: "heal",
      item: "medkit",
    });
  });

  it("shoots with the AK-47's own rules, through armour, to an elimination that drops the gear", () => {
    const { state, yaw, pitch } = duel();
    const me = state.seats[0]!,
      them = state.seats[1]!;
    pickUp(me.kit, { item: "ak47", qty: 1, mag: 30 });
    pickUp(them.kit, { item: "vest-1", qty: 1, durability: 100 });
    pickUp(them.kit, { item: "bandage", qty: 5 });
    const hits: number[] = [];
    // This verifies armour, not hipfire randomness: settle the iron sights first.
    for (let i = 0; i < 8; i++) tick(state, { yaw, pitch, aim: true });
    let shots = 0,
      elim = false;
    for (let i = 0; i < 400 && !elim; i++) {
      const tap = i % 12 === 0;
      for (const e of tick(state, { yaw, pitch, aim: true, fire: tap })) {
        if (e.type === "shot") shots++;
        if (e.type === "hit") hits.push(e.damage);
        if (e.type === "elim") elim = true;
      }
    }
    expect(elim).toBe(true);
    // Chest 34 less the level-1 vest's 20 % = 27 per hit: 4 hits for 100 health.
    expect(hits[0]).toBe(27);
    expect(hits.length).toBe(4);
    expect(shots).toBe(4);
    expect(me.kit.guns[0]!.mag).toBe(26);
    expect(me.kills).toBe(1);
    expect(them.dead).toBe(true);
    const dropped = [...state.loot.items.values()].filter(
      (i) => Math.hypot(i.x - them.body.x, i.z - them.body.z) < 2,
    );
    expect(dropped.map((i) => i.item).sort()).toEqual(["bandage", "vest-1"]);
    // Dead players no longer collect shots.
    const before = state.combat.length;
    tick(state, { yaw, pitch, fire: true });
    expect(state.combat.filter((e) => e.type === "hit").length).toBe(0);
    expect(before).toBeGreaterThanOrEqual(0);
  });

  it("picks up within reach and sight only, one item per press", () => {
    const { state, yaw } = duel();
    const me = state.seats[0]!;
    const near = state.loot.add({ item: "medkit", qty: 1 }, me.body.x + 1, me.body.y, me.body.z);
    const far = state.loot.add(
      { item: "helmet-2", qty: 1, durability: 150 },
      me.body.x + 6,
      me.body.y,
      me.body.z,
    );
    let r = tick(state, { yaw }, [{ act: "pickup", id: far.id }]);
    expect(r[0]).toMatchObject({ type: "act", ok: false, reason: "Too far" });
    r = tick(state, { yaw }, [{ act: "pickup", id: near.id }]);
    expect(r[0]).toMatchObject({ type: "act", ok: true, item: "medkit", qty: 1 });
    expect(state.loot.items.has(near.id)).toBe(false);
    r = tick(state, { yaw }, [{ act: "pickup", id: near.id }]);
    expect(r[0]).toMatchObject({ ok: false, reason: "Gone" });
  });

  it("heals over the item's use time, walking, and firing cancels without using it up", () => {
    const { state, yaw } = duel();
    const me = state.seats[0]!;
    pickUp(me.kit, { item: "bandage", qty: 2 });
    pickUp(me.kit, { item: "ak47", qty: 1, mag: 30 });
    me.kit.hp = 40;
    tick(state, { yaw }, [{ act: "heal", item: "bandage" }]);
    expect(me.hands.heal?.item).toBe("bandage");
    const ticks = Math.ceil(ITEMS.bandage.useMs / TICK_MS);
    for (let i = 0; i < ticks - 2; i++) tick(state, { yaw });
    expect(me.kit.hp).toBe(40);
    for (let i = 0; i < 4; i++) tick(state, { yaw });
    expect(me.kit.hp).toBe(55);
    tick(state, { yaw }, [{ act: "heal", item: "bandage" }]);
    tick(state, { yaw, fire: true, pitch: 0.5 });
    expect(me.hands.heal).toBeNull();
    expect(me.kit.bag.find((b) => b.item === "bandage")?.qty).toBe(1);
  });

  it("reloads from the bag after the reload time", () => {
    const { state, yaw } = duel();
    const me = state.seats[0]!;
    pickUp(me.kit, { item: "m4", qty: 1, mag: 2 });
    pickUp(me.kit, { item: "ammo-rifle", qty: 30 });
    tick(state, { yaw, reload: true });
    for (let i = 0; i < Math.ceil(ITEMS.m4.reloadMs / TICK_MS) + 1; i++) tick(state, { yaw });
    expect(me.kit.guns[0]!.mag).toBe(30);
    expect(me.kit.bag.find((b) => b.item === "ammo-rifle")?.qty).toBe(2);
  });

  it("sends nearby loot once, removals when taken, and the loadout only when it changes", () => {
    const { state, yaw } = duel();
    const me = state.seats[0]!;
    me.kit.armour.vest = { item: "vest-1", durability: 100 }; // plates fit into a vest
    const item = state.loot.add(
      { item: "plate", qty: 1, durability: 25 },
      me.body.x + 1,
      me.body.y,
      me.body.z,
    );
    state.loot.add(
      { item: "plate", qty: 1, durability: 20 },
      me.body.x + 500,
      me.body.y,
      me.body.z,
    );
    const sync = new BrSeatSync(),
      sight = new BrSight();
    const v1 = brViewFor(state, world, sight, 0, t, sync);
    expect(v1.loot!.add.map((r) => itemFromCode((r as number[])[1]!))).toEqual(["plate"]);
    expect(v1.kit).toBeDefined();
    const v2 = brViewFor(state, world, sight, 0, t, sync);
    expect(v2.loot).toBeUndefined();
    expect(v2.kit).toBeUndefined();
    tick(state, { yaw }, [{ act: "pickup", id: item.id }]);
    const v3 = brViewFor(state, world, sight, 0, t, sync);
    expect(v3.loot!.del).toEqual([item.id]);
    expect(v3.kit!.plates[0]).toEqual({ item: "plate", durability: 25 });
    expect(v3.combat.some((e) => e.type === "act" && e.ok)).toBe(true);
  });

  it("shows other players' gun and attachments in their row", () => {
    const { state } = duel();
    const them = state.seats[1]!;
    pickUp(them.kit, { item: "ak47", qty: 1, mag: 30, optic: "scope-4x", muzzle: "silencer" });
    const row = brViewFor(state, world, new BrSight(), 0, t).players.find((r) => r[0] === 1)!;
    expect([6, 9, 10].map((i) => itemFromCode(row[i]!))).toEqual(["ak47", "scope-4x", "silencer"]);
    pickUp(them.kit, { item: "awp", qty: 1, mag: 5, optic: null, muzzle: null });
    them.kit.active = 1;
    const bare = brViewFor(state, world, new BrSight(), 0, t).players.find((r) => r[0] === 1)!;
    expect(itemFromCode(bare[6]!)).toBe("awp");
    expect([bare[9], bare[10]]).toEqual([-1, -1]);
  });
});

describe("grenades on the island", () => {
  it("throws from the bag, flies the same path every time, and the HE hurts through armour", () => {
    const { state, yaw } = duel();
    const me = state.seats[0]!,
      them = state.seats[1]!;
    pickUp(me.kit, { item: "grenade-he", qty: 1 });
    pickUp(them.kit, { item: "vest-3", qty: 1, durability: 200 });
    // Lob it toward seat 1 (20 m away): look up a little.
    let events = tick(state, { yaw, pitch: 0.35 }, [{ act: "throw", nade: "he", kind: "over" }]);
    expect(events.find((e) => e.type === "act")).toMatchObject({ ok: true });
    expect(me.kit.bag.length).toBe(0);
    const nade = events.find((e) => e.type === "nade");
    expect(nade).toBeDefined();
    // A second throw without a grenade is refused.
    events = tick(state, { yaw }, [{ act: "throw", nade: "he", kind: "over" }]);
    expect(events.find((e) => e.type === "act")).toMatchObject({ ok: false });
    const boom = (() => {
      for (let i = 0; i < 80; i++) {
        const b = tick(state, { yaw }).find((e) => e.type === "boom");
        if (b) return b;
      }
      return null;
    })();
    expect(boom).not.toBeNull();
    // Replaying the same start lands on the same spot (the client draws exactly this flight).
    if (nade?.type !== "nade" || boom?.type !== "boom") throw new Error("events");
    const sim = brNadeStart(
      { x: nade.o[0], y: nade.o[1], z: nade.o[2] },
      { x: nade.v[0], y: nade.v[1], z: nade.v[2] },
    );
    brNadeAdvance(sim, world, Math.floor(1.5 / (1 / 128) + 1e-9) + 8);
    expect(Math.hypot(sim.x - boom.x, sim.z - boom.z)).toBeLessThan(0.6);
  });

  it("bots aim their throws where they mean: HE bursts and fire rests near the target", () => {
    const [ax, az] = meta.runways[0]!.a,
      [bx, bz] = meta.runways[0]!.b;
    const len = Math.hypot(bx - ax, bz - az);
    const ux = (bx - ax) / len,
      uz = (bz - az) / len;
    const yaw = Math.atan2(-ux, -uz);
    const x0 = ax + ux * 400,
      z0 = az + uz * 400;
    const eye = { x: x0, y: world.supportAt(x0, z0, 0.35, 1e4) + 1.6, z: z0 };
    for (const [d, lands] of [
      [10, false],
      [18, false],
      [10, true],
      [20, true],
      [28, true],
    ] as const) {
      const start = brThrowStart(eye, yaw, nadePitch(d, -1.6, lands), "over", world);
      const sim = brNadeStart(start.origin, start.velocity);
      brNadeAdvance(sim, world, lands ? 128 * 6 : Math.floor(1.5 * 128 + 1e-9));
      const got = Math.hypot(sim.x - eye.x, sim.z - eye.z);
      expect(Math.abs(got - d)).toBeLessThan(2.5);
    }
  });

  it("burns whoever stands in the flames, ramping up, and smoke makes a lasting cloud", () => {
    const { state, yaw } = duel();
    const me = state.seats[0]!;
    pickUp(me.kit, { item: "grenade-fire", qty: 1 });
    pickUp(me.kit, { item: "grenade-smoke", qty: 1 });
    // Straight down at the feet.
    tick(state, { yaw, pitch: -1.5 }, [{ act: "throw", nade: "fire", kind: "under" }]);
    let hurt = 0;
    for (let i = 0; i < 60; i++)
      for (const e of tick(state, { yaw, pitch: -1.5 })) if (e.type === "hurt") hurt += e.damage;
    expect(hurt).toBeGreaterThan(10);
    expect(me.kit.hp).toBeLessThan(100);
    // Smoke: after the recovery time.
    for (let i = 0; i < 40; i++) tick(state, { yaw, pitch: -1.5 });
    tick(state, { yaw, pitch: -1.5 }, [{ act: "throw", nade: "smoke", kind: "under" }]);
    let area = null;
    for (let i = 0; i < 160 && !area; i++)
      area = tick(state, { yaw }).find((e) => e.type === "area" && e.nade === "smoke") ?? null;
    expect(area).not.toBeNull();
  });
});
