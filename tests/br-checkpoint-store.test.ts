import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import {
  joinCheckpoint,
  lootKeys,
  LOOT_CHUNK,
  splitCheckpoint,
} from "../workers/fps/br-checkpoint";
import { checkpointBrMatch, createBrMatch, type BrCheckpoint } from "../src/lib/fps/br/match";
import type { WorldMeta } from "../src/lib/fps/br/world";
import { LootWorld } from "../src/lib/fps/br/loot-world";

type Rows = NonNullable<BrCheckpoint["lootRows"]>;
const rows = (n: number): Rows =>
  Array.from({ length: n }, (_, i) => [i, i * 0.5, 12.345, -i, { item: "ammo-rifle", qty: 30 }]);

describe("battle royale checkpoint storage", () => {
  it("does not traverse unchanged ground loot and rejoins the existing stored chunks exactly", () => {
    const meta = JSON.parse(readFileSync("public/fps/br/world.v1.json", "utf8")) as WorldMeta;
    const state = createBrMatch(meta, 7, () => 1);
    state.loot.add({ item: "ammo-rifle", qty: 30 }, 1, 2, 3);
    const full = checkpointBrMatch(state);
    const { chunks } = splitCheckpoint(full);
    const values = vi.spyOn(state.loot.items, "values");
    try {
      const lean = splitCheckpoint(checkpointBrMatch(state, false));
      expect(values).not.toHaveBeenCalled();
      expect(lean.chunks).toEqual([]);
      const keys = lootKeys(chunks.length);
      const stored = new Map(keys.map((key, i) => [key, chunks[i]!]));
      expect(joinCheckpoint(lean.data, keys, stored)).toEqual(full);
    } finally {
      values.mockRestore();
    }
  });

  it("stores the loot beside the checkpoint in chunks under the 2 MB value limit", () => {
    // A full island: about 15,000 items on the ground.
    const checkpoint = {
      seed: 7,
      phase: "active",
      lootRows: rows(15_001),
    } as unknown as BrCheckpoint & { lootRows: Rows };
    const { data, chunks } = splitCheckpoint(checkpoint);
    expect("lootRows" in data).toBe(false);
    expect(chunks.length).toBe(Math.ceil(15_001 / LOOT_CHUNK));
    for (const chunk of chunks) expect(JSON.stringify(chunk).length).toBeLessThan(1_000_000);
    const keys = lootKeys(chunks.length);
    const stored = new Map(keys.map((key, i) => [key, chunks[i]!]));
    const back = joinCheckpoint(data, keys, stored);
    expect(back.lootRows).toEqual(checkpoint.lootRows);
    expect((back as unknown as { seed: number }).seed).toBe(7);
  });

  it("an empty island has no chunks, and a missing chunk reads as empty", () => {
    const empty = { lootRows: [] } as unknown as BrCheckpoint & { lootRows: Rows };
    expect(splitCheckpoint(empty).chunks.length).toBe(0);
    expect(lootKeys(0)).toEqual([]);
    expect(joinCheckpoint({} as BrCheckpoint, lootKeys(2), new Map()).lootRows).toEqual([]);
  });

  it("the loot's revision moves with every change (the room rewrites loot only then)", () => {
    const loot = new LootWorld();
    const start = loot.revision;
    const item = loot.add({ item: "ammo-rifle", qty: 30 }, 1, 2, 3);
    expect(loot.revision).toBe(start + 1);
    loot.setQty(item.id, 10);
    expect(loot.revision).toBe(start + 2);
    loot.remove(item.id);
    expect(loot.revision).toBe(start + 3);
    loot.remove(item.id);
    expect(loot.revision).toBe(start + 3);
  });
});
