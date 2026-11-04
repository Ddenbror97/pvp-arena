import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { decodeHeightfield, type Heightfield } from "@/lib/fps/br/heightfield";
import { buildIsland, type Island } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { rollLoot } from "@/lib/fps/br/loot";
import { brResult, createBrMatch, seatHuman, stepBrMatch, type BrInput } from "@/lib/fps/br/match";
import type { CollisionData } from "@/lib/fps/br/static-world";
import type { WorldMeta } from "@/lib/fps/br/world";
import {
  gasDps,
  GAS_EXPOSURE,
  outside,
  planZone,
  ZONE_PHASES,
  ZONE_PRESETS,
  ZONE_REF_RADIUS,
  ZONE_SHIFT,
  zoneAt,
  zonePresetFor,
} from "@/lib/fps/br/zone";
import { MOVE_SPEED } from "@/lib/fps/simulation";
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
  const plan = (seed: number, phases = ZONE_PHASES) =>
    planZone(meta, seed, (x, y) => hf.heightAt(x, y), { phases });

  it("nests every circle inside the last, on land, with the preset's timings", () => {
    for (const [name, phases] of Object.entries(ZONE_PRESETS))
      for (const seed of [1, 2, 3, 99, 2026]) {
        const z = plan(seed, phases);
        expect(z.circles.length, name).toBe(phases.length + 1);
        for (let i = 1; i < z.circles.length; i++) {
          const a = z.circles[i - 1]!,
            b = z.circles[i]!;
          expect(Math.hypot(a.x - b.x, a.z - b.z) + b.r).toBeLessThanOrEqual(a.r + 1);
          expect(b.r).toBe(Math.round(phases[i - 1]!.radius * ZONE_REF_RADIUS));
          if (i > 1) expect(hf.heightAt(b.x, b.z)).toBeGreaterThan(1);
        }
        const total = z.times[z.times.length - 1]![1] / 60000;
        expect(total).toBeCloseTo(phases.reduce((s, p) => s + p.wait + p.shrink, 0) / 60, 5);
        // The final circle closes to nothing.
        expect(z.circles.at(-1)!.r).toBe(0);
      }
    // Match lengths (from the plane's take-off): full ≈ 22 min, medium ≈ 17, small ≈ 13.
    const minutes = (p: readonly { wait: number; shrink: number }[]) =>
      p.reduce((s, q) => s + q.wait + q.shrink, 0) / 60;
    expect(minutes(ZONE_PRESETS.full)).toBeGreaterThan(19);
    expect(minutes(ZONE_PRESETS.full)).toBeLessThan(24);
    expect(minutes(ZONE_PRESETS.small)).toBeLessThan(minutes(ZONE_PRESETS.medium));
    expect(zonePresetFor(100)).toBe("full");
    expect(zonePresetFor(40)).toBe("medium");
    expect(zonePresetFor(12)).toBe("small");
  });

  it("gives every rotation enough time at a sprint (never an impossible shift)", () => {
    const sprint = MOVE_SPEED * 1.5;
    for (const phases of Object.values(ZONE_PRESETS))
      for (let i = 1; i < phases.length; i++) {
        const R = phases[i - 1]!.radius * ZONE_REF_RADIUS,
          r = phases[i]!.radius * ZONE_REF_RADIUS;
        // The farthest point of the old circle from the new edge, at the largest allowed shift.
        const worst = (1 + ZONE_SHIFT) * (R - r);
        const time = phases[i]!.wait + phases[i]!.shrink;
        expect(worst / time, `phase ${i + 1}`).toBeLessThan(sprint);
      }
    // And the plans keep to that shift.
    for (let seed = 1; seed <= 200; seed++) {
      const z = plan(seed);
      for (let i = 2; i < z.circles.length; i++) {
        const a = z.circles[i - 1]!,
          b = z.circles[i]!;
        expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeLessThanOrEqual(ZONE_SHIFT * (a.r - b.r) + 1);
      }
    }
  });

  it("over 1,000 seeds: endings spread over the map, on dry walkable ground, never trapped behind a river", () => {
    const cells = new Map<string, number>();
    let island = 0,
      wet = 0,
      steep = 0,
      trapped = 0,
      maxStep = 0;
    const crossing = (ax: number, az: number, bx: number, bz: number) =>
      meta.rivers.some((r) =>
        r.points.some((p, k) => {
          const q = r.points[k + 1];
          if (!q) return false;
          const d = (p1: number[], p2: number[], p3: number[]) =>
            (p2[0]! - p1[0]!) * (p3[1]! - p1[1]!) - (p2[1]! - p1[1]!) * (p3[0]! - p1[0]!);
          const A = [ax, az],
            B = [bx, bz];
          if (!(d(p, q, A) * d(p, q, B) < 0 && d(A, B, p) * d(A, B, q) < 0)) return false;
          const mx = (p[0] + q[0]) / 2,
            mz = (p[1] + q[1]) / 2;
          return !meta.bridges.some(
            (b) => Math.hypot((b.a[0] + b.b[0]) / 2 - mx, (b.a[1] + b.b[1]) / 2 - mz) < 2000,
          );
        }),
      );
    for (let seed = 1; seed <= 1000; seed++) {
      const z = plan(seed);
      const f = z.circles.at(-1)!;
      if (hf.heightAt(f.x, f.z) <= 1) wet++;
      const s = Math.hypot(
        hf.heightAt(f.x + 4, f.z) - hf.heightAt(f.x - 4, f.z),
        hf.heightAt(f.x, f.z + 4) - hf.heightAt(f.x, f.z - 4),
      );
      if (s / 8 > 0.6) steep++;
      if (f.z > 2650) island++;
      const key = `${Math.floor((f.x + 5000) / 1000)},${Math.floor((f.z + 5000) / 1000)}`;
      cells.set(key, (cells.get(key) ?? 0) + 1);
      for (let i = 3; i < z.circles.length; i++) {
        const a = z.circles[i - 1]!,
          b = z.circles[i]!;
        maxStep = Math.max(maxStep, Math.hypot(a.x - b.x, a.z - b.z));
        if (b.r <= 1500 && crossing(a.x, a.z, b.x, b.z)) trapped++;
      }
    }
    expect(wet).toBe(0);
    expect(steep).toBeLessThan(10);
    expect(trapped).toBe(0);
    // About the island's share of the land, and no square hosting more than 4 % of endings.
    expect(island).toBeGreaterThan(40);
    expect(cells.size).toBeGreaterThan(50);
    expect(Math.max(...cells.values())).toBeLessThan(40);
    expect(maxStep).toBeLessThan(ZONE_SHIFT * ZONE_REF_RADIUS * 0.3);
  }, 240_000);

  it("shrinks linearly on the server clock and deals the phase's damage outside", () => {
    const z = plan(5);
    const [w1, s1] = z.times[0]!;
    expect(zoneAt(z, w1 - 1)).toMatchObject({ phase: 1, shrinking: false, dps: 0 });
    const mid = zoneAt(z, (w1 + s1) / 2);
    expect(mid.shrinking).toBe(true);
    expect(mid.now.r).toBeCloseTo((z.circles[0]!.r + z.circles[1]!.r) / 2, 3);
    expect(mid.dps).toBe(ZONE_PHASES[0]!.dps);
    expect(zoneAt(z, s1 + 1)).toMatchObject({ phase: 2, shrinking: false, dps: 1 });
    // The boundary counts as inside; after the last close, everywhere is gas.
    const c = z.circles[1]!;
    expect(outside(c, c.x + c.r, c.z)).toBe(false);
    expect(outside(c, c.x + c.r + 0.01, c.z)).toBe(true);
    const end = zoneAt(z, z.times.at(-1)![1] + 1);
    expect(end.now.r).toBe(0);
    expect(outside(end.now, end.now.x, end.now.z)).toBe(true);
    expect(end.dps).toBe(ZONE_PHASES.at(-1)!.dps);
  });

  it("raises the gas with exposure (capped) so healing cannot outlast the late zones", () => {
    expect(gasDps(10, 0)).toBe(10);
    expect(gasDps(10, GAS_EXPOSURE.rampMs / 2)).toBeCloseTo(12.5, 6);
    expect(gasDps(10, 10 * GAS_EXPOSURE.rampMs)).toBeCloseTo(15, 6);
    // The best heal (a medkit: 100 HP over 7 s ≈ 14.3 HP/s) loses from phase 6 on.
    for (const p of ZONE_PHASES.slice(5))
      expect(gasDps(p.dps, GAS_EXPOSURE.rampMs)).toBeGreaterThan(100 / 7);
  });
});

describe("a full match", () => {
  it("bots loot, fight and follow the zone until one player is left; the result is complete", () => {
    const world = island.solid;
    const loot = rollLoot(77, island.layout, collision, world, meta);
    const state = createBrMatch(meta, 77, (x, z) => hf.heightAt(x, z), loot, {
      zoneTimeScale: 0.5,
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
      `drops ${JSON.stringify(state.drops.map((d) => [d.landed, Math.round(d.landAt / 1000)]))} match: ${state.tick} ticks in ${ms.toFixed(0)} ms (${(ms / state.tick).toFixed(2)} ms/tick); pickups ${pickups}, shots ${shots}, kills ${kills}, gas ${gas}, winner ${state.winner}`,
    );
    expect(state.phase).toBe("completed");
    // Supply drops: planned inside their circles, on open ground; most came down.
    expect(state.drops.length).toBe(3);
    for (const d of state.drops) expect(hf.heightAt(d.x, d.z)).toBeGreaterThan(1);
    expect(state.drops.filter((d) => d.landed).length).toBeGreaterThanOrEqual(2);
    // (Compressed zone, long glides: fewer stops to loot than a real match.)
    expect(pickups).toBeGreaterThan(8);
    expect(shots).toBeGreaterThan(50);
    expect(kills).toBeGreaterThan(3);
    const r = brResult(state);
    const places = r.players.map((p) => p.place);
    expect(places.filter((p) => p === 1).length).toBeLessThanOrEqual(1);
    expect(Math.max(...places)).toBeLessThanOrEqual(100);
    // Always a winner, even when the last players fall in the same tick (closing gas).
    expect(state.winner).toBeGreaterThanOrEqual(0);
    expect(r.players[state.winner]!.place).toBe(1);
    expect(new Set(places).size).toBe(places.length);
    expect(r.players.reduce((n, p) => n + p.kills, 0)).toBe(kills);
  }, 300_000);
});

describe("checkpoints", () => {
  it("a restored match carries on exactly where it was (positions, loadouts, loot, zone)", async () => {
    const { checkpointBrMatch, restoreBrMatch } = await import("@/lib/fps/br/match");
    const world = island.solid;
    const loot = rollLoot(5, island.layout, collision, world, meta);
    const a = createBrMatch(meta, 5, (x, z) => hf.heightAt(x, z), loot, { zoneTimeScale: 0.3 });
    seatHuman(a, "h1", "Human");
    let now = 0;
    // Until everyone has jumped and landed, then a little longer (bots looting).
    for (let i = 0; i < 40_000 && a.phase !== "active"; i++)
      stepBrMatch(a, world, meta, new Map(), (now += TICK_MS), TICK_MS);
    for (let i = 0; i < 600; i++) stepBrMatch(a, world, meta, new Map(), (now += TICK_MS), TICK_MS);
    expect(a.phase).toBe("active");
    // Through JSON, as Durable Object storage keeps it.
    const json = JSON.stringify(checkpointBrMatch(a));
    // SQLite-backed Durable Object storage takes values up to 2 MB (measured ~354 KiB).
    expect(json.length).toBeLessThan(1_500_000);
    const saved = JSON.parse(json);
    const b = restoreBrMatch(meta, (x, z) => hf.heightAt(x, z), saved, { zoneTimeScale: 0.3 });
    expect(b.loot.items.size).toBe(a.loot.items.size);
    expect(b.seats.map((s) => s.kit)).toEqual(a.seats.map((s) => s.kit));
    const t = now + TICK_MS;
    stepBrMatch(a, world, meta, new Map(), t, TICK_MS);
    stepBrMatch(b, world, meta, new Map(), t, TICK_MS);
    expect(b.zoneNow).toEqual(a.zoneNow);
    for (let i = 0; i < a.seats.length; i++) {
      expect(b.seats[i]!.body.x).toBeCloseTo(a.seats[i]!.body.x, 3);
      expect(b.seats[i]!.body.z).toBeCloseTo(a.seats[i]!.body.z, 3);
    }
  }, 300_000);
});
