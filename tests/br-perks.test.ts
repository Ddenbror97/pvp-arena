import { WORLD_ASSETS } from "@/lib/fps/br/world";
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { validateBrAct } from "@/lib/fps/br/actions";
import { applyBrDamage } from "@/lib/fps/br/armor";
import { decodeHeightfield, type Heightfield } from "@/lib/fps/br/heightfield";
import { dropFromBag, newLoadout, pickUp, tabletOf } from "@/lib/fps/br/inventory";
import { ITEMS } from "@/lib/fps/br/items";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import {
  brViewFor,
  BrSight,
  createBrMatch,
  seatHuman,
  stepBrMatch,
  type BrInput,
} from "@/lib/fps/br/match";
import { PERK_EFFECT, PERKS, perkOperation, newTablet, TABLET } from "@/lib/fps/br/perks";
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

describe("tactical tablet", () => {
  it("is rare loot that carries its own progress, one per player", () => {
    const l = newLoadout();
    expect(pickUp(l, { item: "tablet", qty: 1 }).ok).toBe(true);
    expect(tabletOf(l)!.data).toBe(TABLET.startData);
    expect(pickUp(l, { item: "tablet", qty: 1 }).reason).toBe("Tablet already carried");
    tabletOf(l)!.unlocked.push("faster-reload");
    const drop = dropFromBag(
      l,
      l.bag.findIndex((b) => b.item === "tablet"),
    );
    const other = newLoadout();
    pickUp(other, drop.drops[0]!);
    expect(tabletOf(other)!.unlocked).toEqual(["faster-reload"]);
    expect(ITEMS.tablet.rarity).toBe("epic");
  });

  it("unlocks with Tactical Data, never more than 3 active, and refuses perks it cannot run", () => {
    const tb = { ...newTablet(), data: 15 };
    expect(perkOperation(tb, { op: "unlock", perk: "deadly-bullets" })).toBeNull();
    expect(tb.data).toBe(15 - PERKS["deadly-bullets"].cost);
    expect(perkOperation(tb, { op: "unlock", perk: "recon-chip" })).toBeNull();
    expect(perkOperation(tb, { op: "unlock", perk: "survival-chip" })).toBe("Insufficient data");
    expect(perkOperation(tb, { op: "activate", perk: "faster-reload", slot: 0 })).toBe("Locked");
    expect(perkOperation(tb, { op: "activate", perk: "deadly-bullets", slot: 0 })).toBeNull();
    expect(perkOperation(tb, { op: "activate", perk: "deadly-bullets", slot: 1 })).toBe(
      "Already active",
    );
    expect(perkOperation(tb, { op: "activate", perk: "recon-chip", slot: 0 })).toBeNull(); // replaces slot 0
    expect(tb.active.filter(Boolean)).toEqual(["recon-chip"]);
    expect(perkOperation(tb, { op: "activate", perk: "recon-chip", slot: 3 })).toBe("No such slot");
    tb.data = 10;
    perkOperation(tb, { op: "unlock", perk: "fast-revive" });
    expect(perkOperation(tb, { op: "activate", perk: "fast-revive", slot: 1 })).toMatch(/Squads/);
    expect(tb.active.length).toBe(3);
    expect(
      validateBrAct({
        v: 1,
        type: "br-act",
        act: "perk",
        op: "activate",
        perk: "recon-chip",
        slot: 4,
      }),
    ).toBeNull();
    expect(
      validateBrAct({ v: 1, type: "br-act", act: "perk", op: "unlock", perk: "nope" }),
    ).toBeNull();
  });

  it("Deadly Bullets and Armor Specialist change the real damage and wear", () => {
    const plain = applyBrDamage(
      { helmet: null, vest: null, plates: [null, null, null] },
      ITEMS.ak47,
      "chest",
      {
        damage: PERK_EFFECT.damage,
      },
    );
    expect(plain.damage).toBe(Math.round(34 * 1.15));
    const a = {
      helmet: null,
      vest: { item: "vest-2" as const, durability: 150 },
      plates: [null, null, null] as never,
    };
    const b = {
      helmet: null,
      vest: { item: "vest-2" as const, durability: 150 },
      plates: [null, null, null] as never,
    };
    applyBrDamage(a, ITEMS.ak47, "chest");
    applyBrDamage(b, ITEMS.ak47, "chest", { wear: PERK_EFFECT.armorWear });
    expect(150 - b.vest.durability).toBeCloseTo((150 - a.vest.durability) / 1.15, 5);
  });

  it("active perks work through the match: faster reload and healing, Data for eliminations, recon bearings", () => {
    const { state, yaw, pitch } = duel();
    const me = state.seats[0]!,
      them = state.seats[1]!;
    pickUp(me.kit, {
      item: "tablet",
      qty: 1,
      tablet: { data: 30, unlocked: [], active: [null, null, null] },
    });
    for (const perk of ["faster-reload", "survival-chip", "recon-chip"] as const) {
      tick(state, { yaw }, [{ act: "perk", op: "unlock", perk }]);
    }
    tick(state, { yaw }, [
      { act: "perk", op: "activate", perk: "faster-reload", slot: 0 },
      { act: "perk", op: "activate", perk: "survival-chip", slot: 1 },
      { act: "perk", op: "activate", perk: "recon-chip", slot: 2 },
    ]);
    expect(tabletOf(me.kit)!.active).toEqual(["faster-reload", "survival-chip", "recon-chip"]);
    // Reload: 1.8 s × 0.8.
    pickUp(me.kit, { item: "ak47", qty: 1, mag: 1 });
    pickUp(me.kit, { item: "ammo-rifle", qty: 30 });
    tick(state, { yaw, reload: true });
    expect(me.hands.reloadUntil - t).toBeCloseTo(ITEMS.ak47.reloadMs * 0.8, 0);
    for (let i = 0; i < 50; i++) tick(state, { yaw });
    // Healing: bandage 3 s × 0.8.
    me.kit.hp = 50;
    pickUp(me.kit, { item: "bandage", qty: 1 });
    tick(state, { yaw }, [{ act: "heal", item: "bandage" }]);
    expect(me.hands.heal!.until - t).toBeCloseTo(ITEMS.bandage.useMs * 0.8, 0);
    for (let i = 0; i < 80; i++) tick(state, { yaw });
    // Seat 1 fires near me: a bearing arrives, never a position.
    pickUp(them.kit, { item: "m4", qty: 1, mag: 30, muzzle: "silencer" });
    them.yaw = 0;
    t += TICK_MS;
    stepBrMatch(
      state,
      world,
      meta,
      new Map([[1, { seq: 1, forward: 0, strafe: 0, yaw: 3, pitch: 0.5, fire: true }]]),
      t,
      TICK_MS,
    );
    const view = brViewFor(state, world, new BrSight(), 0, t);
    const recon = view.combat.find((e) => e.type === "recon");
    expect(recon).toBeDefined();
    expect(Object.keys(recon!).sort()).toEqual(["bearing", "seat", "type"]);
    // Eliminating someone adds Tactical Data.
    const before = tabletOf(me.kit)!.data;
    them.kit.hp = 1;
    for (let i = 0; i < 20 && !them.dead; i++) tick(state, { yaw, pitch, fire: i % 10 === 0 });
    expect(them.dead).toBe(true);
    expect(tabletOf(me.kit)!.data).toBe(before + TABLET.perElimination);
  });
});
