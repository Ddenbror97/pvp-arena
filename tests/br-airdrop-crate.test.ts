import { WORLD_ASSETS } from "@/lib/fps/br/world";
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { airdropContents } from "@/lib/fps/br/airdrops";
import { decodeHeightfield, type Heightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import {
  brViewFor,
  BrSeatSync,
  BrSight,
  createBrMatch,
  seatHuman,
  stepBrMatch,
  type BrInput,
} from "@/lib/fps/br/match";
import type { CollisionData, StaticWorld } from "@/lib/fps/br/static-world";
import type { WorldMeta } from "@/lib/fps/br/world";
import { TICK_MS } from "@/lib/fps/simulation";

/**
 * Supply crates hold their loot (owner, 2026-11-14: "the airdrop comes with the loot outside the
 * box it should be opened and player can take the items they want").
 */
const buffer = (path: string) => {
  const f = readFileSync(path);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const meta = JSON.parse(readFileSync("public/fps/br/world.v4.json", "utf8")) as WorldMeta;
const collision = JSON.parse(
  readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"),
) as CollisionData;
let hf: Heightfield, world: StaticWorld;
beforeAll(async () => {
  hf = await decodeHeightfield(buffer("public/fps/br/height.v5.hf"));
  const cover = await decodeLandCover(buffer("public/fps/br/landcover.v4.lc"));
  world = buildIsland(hf, cover, meta, collision).solid;
}, 60_000);

describe("supply crate", () => {
  it("lands with its loot inside, lists what is left, and lets a player take what they want", () => {
    const state = createBrMatch(meta, 9, (x, z) => hf.heightAt(x, z));
    seatHuman(state, "u1", "One");
    state.phase = "active";
    const [ax, az] = meta.runways[0]!.a,
      [bx, bz] = meta.runways[0]!.b;
    const len = Math.hypot(bx - ax, bz - az);
    const x = ax + ((bx - ax) / len) * 400,
      z = az + ((bz - az) / len) * 400;
    for (const s of state.seats) {
      const b = s.body;
      b.x = x + 60 + s.seat * 4;
      b.z = z + 60;
      b.y = world.supportAt(b.x, b.z, 0.35, 1e4);
      Object.assign(b, { phase: "ground", grounded: true });
    }
    const me = state.seats[0]!.body;
    me.x = x + 1.3;
    me.z = z;
    me.y = world.supportAt(me.x, me.z, 0.35, 1e4);
    const ground = world.supportAt(x, z, 0.15, 1e4);
    let t = 1000;
    state.drops = [{ id: 0, x, z, ground, at: t, landAt: t + TICK_MS, landed: false }];
    const step = (acts: unknown[] = []) => {
      t += TICK_MS;
      const inputs = new Map<number, BrInput>([[0, { seq: 0, forward: 0, strafe: 0, yaw: 0 }]]);
      stepBrMatch(state, world, meta, inputs, t, TICK_MS, new Map([[0, acts as never]]));
    };
    step();
    step();
    const d = state.drops[0]!;
    expect(d.landed).toBe(true);
    const contents = airdropContents(state.seed, 0);
    expect(d.items).toHaveLength(contents.length);
    // Inside the crate: at its middle, none laid out around it.
    for (const id of d.items!) {
      const it = state.loot.items.get(id)!;
      expect(Math.hypot(it.x - x, it.z - z)).toBeLessThan(0.01);
    }
    const row = () => brViewFor(state, world, new BrSight(), 0, t, new BrSeatSync()).drops![0]!;
    expect(row().slice(7)).toEqual(d.items);
    // Taking the AWP out of it: the rest stays inside, and the smoke stops.
    const awp = d.items!.find((id) => state.loot.items.get(id)!.item === "awp")!;
    step([{ act: "pickup", id: awp }]);
    expect(state.seats[0]!.kit.guns.some((g) => g?.item === "awp")).toBe(true);
    expect(row().slice(7)).toEqual(d.items!.filter((id) => id !== awp));
    expect(d.looted).toBe(true);
  });
});
