import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { decodeHeightfield, type Heightfield } from "@/lib/fps/br/heightfield";
import { buildIsland, type Island } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { rollLoot } from "@/lib/fps/br/loot";
import { brResult, createBrMatch, seatHuman, stepBrMatch, type BrInput } from "@/lib/fps/br/match";
import type { CollisionData } from "@/lib/fps/br/static-world";
import type { WorldMeta } from "@/lib/fps/br/world";
import { planZone, ZONE_PHASES, zoneAt } from "@/lib/fps/br/zone";
import { TICK_MS } from "@/lib/fps/simulation";

const buffer = (path: string) => {
  const f = readFileSync(path);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const meta = JSON.parse(readFileSync("public/fps/br/world.v1.json", "utf8")) as WorldMeta;
const collision = JSON.parse(
  readFileSync("public/fps/br/models/collision.json", "utf8"),
) as CollisionData;
let hf: Heightfield, island: Island;
beforeAll(async () => {
  hf = await decodeHeightfield(buffer("public/fps/br/height.v1.hf"));
  const cover = await decodeLandCover(buffer("public/fps/br/landcover.v1.lc"));
  island = buildIsland(hf, cover, meta, collision);
}, 60_000);

describe("zone", () => {
  it("nests every circle inside the last, on land, with the research table's timings", () => {
    for (const seed of [1, 2, 3, 99, 2026]) {
      const z = planZone(meta, seed, (x, y) => hf.heightAt(x, y));
      for (let i = 1; i < z.circles.length; i++) {
        const a = z.circles[i - 1]!,
          b = z.circles[i]!;
        expect(Math.hypot(a.x - b.x, a.z - b.z) + b.r).toBeLessThanOrEqual(a.r + 1);
        if (i > 1) expect(hf.heightAt(b.x, b.z)).toBeGreaterThan(1);
      }
      const total = z.times[z.times.length - 1]![1] / 60000;
      expect(total).toBeCloseTo(ZONE_PHASES.reduce((s, p) => s + p.wait + p.shrink, 0) / 60, 5);
    }
    // Different matches, different final circles.
    const a = planZone(meta, 1, (x, y) => hf.heightAt(x, y)).circles.at(-1)!,
      b = planZone(meta, 2, (x, y) => hf.heightAt(x, y)).circles.at(-1)!;
    expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(50);
  });

  it("shrinks linearly and deals the phase's damage outside", () => {
    const z = planZone(meta, 5, (x, y) => hf.heightAt(x, y));
    const [w1, s1] = z.times[0]!;
    expect(zoneAt(z, w1 - 1)).toMatchObject({ phase: 1, shrinking: false, dps: 0 });
    const mid = zoneAt(z, (w1 + s1) / 2);
    expect(mid.shrinking).toBe(true);
    expect(mid.now.r).toBeCloseTo((z.circles[0]!.r + z.circles[1]!.r) / 2, 3);
    expect(mid.dps).toBe(0.4);
    expect(zoneAt(z, s1 + 1)).toMatchObject({ phase: 2, shrinking: false, dps: 0.4 });
  });
});

describe("a full match", () => {
  it("bots loot, fight and follow the zone until one player is left; the result is complete", () => {
    const world = island.solid;
    const loot = rollLoot(77, island.layout, collision, world, meta);
    const state = createBrMatch(meta, 77, (x, z) => hf.heightAt(x, z), loot, {
      zoneTimeScale: 0.3,
    });
    seatHuman(state, "h1", "Human");
    let now = 0,
      shots = 0,
      pickups = 0,
      kills = 0,
      gas = 0;
    const inputs = new Map<number, BrInput>();
    const t0 = performance.now();
    for (let i = 0; i < 30_000 && state.phase !== "completed"; i++) {
      now += TICK_MS;
      stepBrMatch(state, world, meta, inputs, now, TICK_MS);
      for (const e of state.combat) {
        if (e.type === "shot") shots++;
        if (e.type === "act" && e.act === "pickup" && e.ok) pickups++;
        if (e.type === "elim") {
          if (e.gun === "gas") gas++;
          else kills++;
        }
      }
    }
    const ms = performance.now() - t0;
    console.log(
      `match: ${state.tick} ticks in ${ms.toFixed(0)} ms (${(ms / state.tick).toFixed(2)} ms/tick); pickups ${pickups}, shots ${shots}, kills ${kills}, gas ${gas}, winner ${state.winner}`,
    );
    expect(state.phase).toBe("completed");
    // Supply drops: planned inside their circles, on open ground; most came down.
    expect(state.drops.length).toBe(3);
    for (const d of state.drops) expect(hf.heightAt(d.x, d.z)).toBeGreaterThan(1);
    expect(state.drops.filter((d) => d.landed).length).toBeGreaterThanOrEqual(2);
    expect(pickups).toBeGreaterThan(20);
    expect(shots).toBeGreaterThan(50);
    expect(kills).toBeGreaterThan(3);
    const r = brResult(state);
    const places = r.players.map((p) => p.place);
    expect(places.filter((p) => p === 1).length).toBeLessThanOrEqual(1);
    expect(Math.max(...places)).toBeLessThanOrEqual(100);
    if (state.winner >= 0) expect(r.players[state.winner]!.place).toBe(1);
    expect(r.players.reduce((n, p) => n + p.kills, 0)).toBe(kills);
  }, 300_000);
});
