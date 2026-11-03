import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { applyBrDamage, type Armour } from "@/lib/fps/br/armor";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import {
  capacity,
  countOf,
  dropAll,
  dropEquipped,
  equipFromBag,
  finishHeal,
  finishReload,
  newLoadout,
  pickUp,
  canHeal,
} from "@/lib/fps/br/inventory";
import { ITEMS, ITEM_IDS } from "@/lib/fps/br/items";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import type { Placement } from "@/lib/fps/br/layout";
import { LOOT, lootClassOf, lootSummary, rollLoot, type WorldItem } from "@/lib/fps/br/loot";
import { modelSpots } from "@/lib/fps/br/loot-spots";
import type { CollisionData, StaticWorld } from "@/lib/fps/br/static-world";
import type { WorldMeta } from "@/lib/fps/br/world";

const buffer = (path: string) => {
  const f = readFileSync(path);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const meta = JSON.parse(readFileSync("public/fps/br/world.v1.json", "utf8")) as WorldMeta;
const collision = JSON.parse(
  readFileSync("public/fps/br/models/collision.json", "utf8"),
) as CollisionData;
let world: StaticWorld, layout: Placement[], a: WorldItem[], rollMs: number;
beforeAll(async () => {
  const hf = await decodeHeightfield(buffer("public/fps/br/height.v1.hf"));
  const cover = await decodeLandCover(buffer("public/fps/br/landcover.v1.lc"));
  ({ layout, solid: world } = buildIsland(hf, cover, meta, collision));
  const t = performance.now();
  a = rollLoot(1234, layout, collision, world, meta);
  rollMs = performance.now() - t;
}, 60_000);

describe("loot placement", () => {
  it("fills the map with real items and stays within the caps", () => {
    const s = lootSummary(a);
    console.log("loot", JSON.stringify(s), "roll ms", rollMs.toFixed(0));
    expect(s.total).toBeGreaterThan(2500);
    for (const [id, cap] of Object.entries(LOOT.caps))
      expect(s.byItem[id as keyof typeof s.byItem] ?? 0).toBeLessThanOrEqual(cap);
    // Rarer tiers are rarer.
    expect(s.byRarity.common).toBeGreaterThan(s.byRarity.rare);
    expect(s.byRarity.rare).toBeGreaterThan(s.byRarity.epic);
    for (const id of ITEM_IDS) expect(s.byItem[id] ?? 0, id).toBeGreaterThan(0);
  });

  it("changes every match but is the same for the same seed", () => {
    const again = rollLoot(1234, layout, collision, world, meta);
    expect(again).toEqual(a);
    const other = rollLoot(99, layout, collision, world, meta);
    const key = (i: WorldItem) => `${i.x},${i.z}:${i.item}`;
    const set = new Set(a.map(key));
    const same = other.filter((i) => set.has(key(i))).length;
    expect(same / other.length).toBeLessThan(0.25);
  });

  it("lies on a floor, never inside walls or under the terrain", () => {
    for (const i of a) {
      expect(i.y).toBeGreaterThanOrEqual(world.hf.heightAt(i.x, i.z) - 0.05);
      expect(world.blocked(i.x, i.y + 0.05, i.z, 0.4, 0.15)).toBe(false);
      expect(world.supportAt(i.x, i.z, 0.15, i.y + 0.01)).toBeCloseTo(i.y, 1);
    }
  });

  it("puts more loot in towns than in a single house, and better loot at the military base", () => {
    const near = (poi: string) => {
      const ps = layout.filter((p) => p.poi === poi && lootClassOf(p.model));
      return a.filter((i) => ps.some((p) => Math.hypot(p.x - i.x, p.z - i.z) < 40));
    };
    const base = near("southern-military-base"),
      town = near("northstar-town");
    expect(town.length).toBeGreaterThan(40);
    const epic = (xs: WorldItem[]) =>
      xs.filter((i) => ITEMS[i.item].rarity === "epic").length / xs.length;
    expect(epic(base)).toBeGreaterThan(epic(town));
  });

  it("finds indoor floors in houses and the superstore", () => {
    expect(modelSpots(collision, "house", "indoor", LOOT.spacing, 4).length).toBeGreaterThan(0);
    expect(modelSpots(collision, "superstore", "indoor", LOOT.spacing, 26).length).toBeGreaterThan(
      10,
    );
  });
});

describe("armour", () => {
  const ak = ITEMS.ak47,
    awp = ITEMS.awp;
  const naked = (): Armour => ({ helmet: null, vest: null, plates: [null, null, null] });
  it("does nothing when nothing is worn and never covers the legs", () => {
    expect(applyBrDamage(naked(), ak, "chest").damage).toBe(34);
    const full: Armour = {
      helmet: { item: "helmet-3", durability: 230 },
      vest: { item: "vest-3", durability: 200 },
      plates: [{ item: "plate-3", durability: 100 }, null, null],
    };
    expect(applyBrDamage(full, ak, "legs").damage).toBe(20);
  });
  it("caps vest + plate and wears the first intact plate only", () => {
    const arm: Armour = {
      helmet: null,
      vest: { item: "vest-3", durability: 200 },
      plates: [
        { item: "plate-3", durability: 100 },
        { item: "plate-3", durability: 100 },
        { item: "plate-3", durability: 100 },
      ],
    };
    const r = applyBrDamage(arm, ak, "chest");
    expect(r.damage).toBe(17); // 50 % cap, not 35 + 3 × 20 %
    expect(arm.plates[1]!.durability).toBe(100);
    expect(arm.plates[2]!.durability).toBe(100);
    expect(arm.plates[0]!.durability).toBeLessThan(100);
  });
  it("breaks pieces at zero and stops protecting", () => {
    const arm: Armour = {
      helmet: { item: "helmet-1", durability: 5 },
      vest: null,
      plates: [null, null, null],
    };
    const r = applyBrDamage(arm, ak, "head");
    expect(r.broke).toEqual(["helmet"]);
    expect(arm.helmet).toBeNull();
    expect(r.damage).toBe(34 - 5);
    expect(applyBrDamage(arm, ak, "head").damage).toBe(34);
  });
  it("lets the AWP through half the armour", () => {
    const arm: Armour = {
      helmet: null,
      vest: { item: "vest-3", durability: 200 },
      plates: [null, null, null],
    };
    expect(applyBrDamage(arm, awp, "chest").damage).toBe(Math.round(115 - 115 * 0.35 * 0.5));
  });
});

describe("inventory", () => {
  it("picks up weapons into empty slots, then swaps the active one and drops it", () => {
    const l = newLoadout();
    expect(pickUp(l, { item: "ak47", qty: 1, mag: 30 }).ok).toBe(true);
    expect(pickUp(l, { item: "m4", qty: 1, mag: 30 }).ok).toBe(true);
    expect(l.active).toBe(0);
    const r = pickUp(l, { item: "awp", qty: 1, mag: 5 });
    expect(r.drops).toEqual([{ item: "ak47", qty: 1, mag: 30, optic: null, muzzle: null }]);
    expect(l.guns[0]!.item).toBe("awp");
  });
  it("stacks to the backpack's capacity and leaves the rest on the ground", () => {
    const l = newLoadout();
    expect(capacity(l)).toBe(6);
    for (let i = 0; i < 6; i++) pickUp(l, { item: "ammo-rifle", qty: 90 });
    const r = pickUp(l, { item: "ammo-rifle", qty: 30 });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("Inventory full");
    pickUp(l, { item: "backpack-2", qty: 1 });
    expect(capacity(l)).toBe(14);
    expect(pickUp(l, { item: "bandage", qty: 5 }).ok).toBe(true);
    // A smaller backpack is refused; dropping it with a full bag is refused (nothing lost).
    expect(pickUp(l, { item: "backpack-1", qty: 1 }).ok).toBe(false);
    expect(dropEquipped(l, "backpack").ok).toBe(false);
  });
  it("wears better armour and drops the old piece; spares go to the bag", () => {
    const l = newLoadout();
    pickUp(l, { item: "helmet-1", qty: 1, durability: 80 });
    const r = pickUp(l, { item: "helmet-3", qty: 1, durability: 230 });
    expect(r.drops[0]!.item).toBe("helmet-1");
    pickUp(l, { item: "helmet-2", qty: 1, durability: 150 });
    expect(l.bag[0]!.item).toBe("helmet-2");
  });
  it("holds exactly three plates and replaces one from the bag", () => {
    const l = newLoadout();
    for (const lv of [1, 2, 1] as const) pickUp(l, { item: `plate-${lv}`, qty: 1, durability: 20 });
    pickUp(l, { item: "plate-3", qty: 1, durability: 100 });
    expect(l.armour.plates.filter(Boolean).length).toBe(3);
    expect(l.bag[0]!.item).toBe("plate-3");
    expect(equipFromBag(l, 0, 0).ok).toBe(true);
    expect(l.armour.plates[0]!.item).toBe("plate-3");
    expect(l.bag[0]).toEqual({ item: "plate-1", qty: 1, durability: 20 });
  });
  it("fits every optic and muzzle on every gun", () => {
    for (const gun of ["ak47", "m4", "awp"] as const)
      for (const att of ITEM_IDS.filter((id) => ["optic", "muzzle"].includes(ITEMS[id].category))) {
        const l = newLoadout();
        pickUp(l, { item: gun, qty: 1, mag: 1 });
        expect(pickUp(l, { item: att, qty: 1 }).ok).toBe(true);
        const g = l.guns[0]!;
        expect(g.optic === att || g.muzzle === att).toBe(true);
      }
  });
  it("reloads from the bag and heals within the limits", () => {
    const l = newLoadout();
    pickUp(l, { item: "ak47", qty: 1, mag: 0 });
    pickUp(l, { item: "ammo-rifle", qty: 12 });
    expect(finishReload(l, l.guns[0]!)).toBe(12);
    expect(countOf(l, "ammo-rifle")).toBe(0);
    pickUp(l, { item: "bandage", qty: 5 });
    expect(canHeal(l, "bandage")).toMatch(/up to 75/);
    l.hp = 70;
    expect(finishHeal(l, "bandage")).toBe(true);
    expect(l.hp).toBe(75);
    expect(countOf(l, "bandage")).toBe(4);
  });
  it("drops everything on elimination, attachments still on the guns", () => {
    const l = newLoadout();
    pickUp(l, { item: "m4", qty: 1, mag: 30 });
    pickUp(l, { item: "scope-4x", qty: 1 });
    pickUp(l, { item: "vest-2", qty: 1, durability: 99 });
    pickUp(l, { item: "medkit", qty: 1 });
    const drops = dropAll(l);
    expect(drops).toEqual([
      { item: "m4", qty: 1, mag: 30, optic: "scope-4x", muzzle: null },
      { item: "vest-2", qty: 1, durability: 99 },
      { item: "medkit", qty: 1 },
    ]);
  });
});
