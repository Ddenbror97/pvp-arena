import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { stepDrop, type DropBody } from "@/lib/fps/br/drop";
import { decodeHeightfield, type Heightfield } from "@/lib/fps/br/heightfield";
import { buildIsland, type Island } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import {
  BrSeatSync,
  BrSight,
  brViewFor,
  createBrMatch,
  seatHuman,
  stepBrMatch,
  type BrInput,
  type BrMatchState,
} from "@/lib/fps/br/match";
import { stepBody, type BrBody } from "@/lib/fps/br/movement";
import type { CollisionData } from "@/lib/fps/br/static-world";
import { forEachTrunkNear } from "@/lib/fps/br/vegetation";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";
import {
  cableAt,
  rideDistance,
  rideSpeed,
  ZIP_CRUISE,
  ZIP_LENGTH,
  ZIP_SPAN,
  ZIP_STAND,
  ZIP_START,
  ZIP_T,
  ZIPLINE,
  zipLanding,
  zipMsAt,
  zipPose,
} from "@/lib/fps/br/zipline";
import { TICK_MS } from "@/lib/fps/simulation";

/**
 * The Iron Peaks → Pine Ridge zip-line (owner's zip-line spec, 2026-11-11): the route on the real
 * island (terrain, buildings and trees clear of the rider), the ride's timing, the server's
 * validation and authority, death and replication.
 */
const buffer = (path: string) => {
  const b = readFileSync(path);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
};
const meta = JSON.parse(readFileSync(`public${WORLD_ASSETS.meta}`, "utf8")) as WorldMeta;
const collision = JSON.parse(
  readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"),
) as CollisionData;
let hf: Heightfield, island: Island;
beforeAll(async () => {
  hf = await decodeHeightfield(buffer(`public${WORLD_ASSETS.height}`));
  const cover = await decodeLandCover(buffer(`public${WORLD_ASSETS.landcover}`));
  island = buildIsland(hf, cover, meta, collision);
});
const groundAt = (x: number, z: number) => hf.heightAt(x, z);
const input = (seq: number, extra: Partial<BrInput> = {}): BrInput => ({
  seq,
  forward: 0,
  strafe: 0,
  yaw: 0,
  ...extra,
});

/** A live match with two humans (0: the rider, 1: a watcher at Pine Ridge) and one bot. */
function liveMatch() {
  const state = createBrMatch(meta, 11, groundAt);
  seatHuman(state, "rider", "Rider");
  seatHuman(state, "watcher", "Watcher");
  state.phase = "active";
  state.planeAt = -600_000;
  for (const s of state.seats) {
    if (s.seat > 2) s.dead = true;
    Object.assign(s.body, { phase: "ground", grounded: true, velocityY: 0, vx: 0, vz: 0 });
  }
  // The zone far from both stations' damage (centred on the line, wide).
  const rider = state.seats[0]!;
  Object.assign(rider.body, { x: ZIP_STAND.x, y: ZIP_STAND.y, z: ZIP_STAND.z });
  const end = zipLanding(groundAt);
  Object.assign(state.seats[1]!.body, { x: end.x + 12, y: groundAt(end.x + 12, end.z), z: end.z });
  Object.assign(state.seats[2]!.body, { x: 0, y: groundAt(0, 0), z: 0 });
  return state;
}
function tick(
  state: BrMatchState,
  now: number,
  acts: Map<
    number,
    Array<{ act: "zip" } | { act: "door"; id: number } | { act: "exit" }>
  > = new Map(),
  inputs = new Map<number, BrInput>(),
) {
  stepBrMatch(state, island.solid, meta, inputs, now, TICK_MS, acts as never);
}

describe("Iron Peaks → Pine Ridge zip-line", () => {
  it("starts at the Iron Peaks watchtower and ends inside Pine Ridge", () => {
    const tower = island.layout.find(
      (p) =>
        p.model === "watchtower" && Math.hypot(p.x - ZIPLINE.tower.x, p.z - ZIPLINE.tower.z) < 0.5,
    );
    expect(tower?.poi).toBe("iron-peaks");
    expect(tower!.y).toBeCloseTo(ZIPLINE.tower.y, 1);
    // The stand is on the tower's top deck.
    expect(island.solid.supportAt(ZIP_STAND.x, ZIP_STAND.z, 0.35, ZIP_STAND.y + 0.5)).toBeCloseTo(
      ZIP_STAND.y,
      2,
    );
    const ridge = meta.pois.find((p) => p.id === "pine-ridge")!;
    const end = ZIPLINE.end;
    expect(Math.hypot(end.x - ridge.x, end.z - ridge.z)).toBeLessThan(ridge.radius * 0.6);
    // The handle is within reach above the deck (hands at most 2.2 m above the feet).
    expect(ZIP_START.y - ZIPLINE.handleDrop - ZIP_STAND.y).toBeLessThan(2.2);
    // Length, drop and the cruise speed that follows from a 28 s glide.
    expect(ZIP_LENGTH).toBeGreaterThan(1000);
    expect(ZIP_SPAN).toBeGreaterThan(950);
    expect(ZIP_SPAN).toBeLessThan(1100);
    expect(ZIP_START.y - end.y).toBeGreaterThan(380);
    expect(ZIP_CRUISE).toBeGreaterThan(40);
    expect(ZIP_CRUISE).toBeLessThan(55);
  });

  it("keeps the hanging rider clear of terrain, buildings and trees all the way", () => {
    let minAgl = Infinity;
    const at = { x: 0, y: 0, z: 0 };
    for (let s = 0; s <= ZIP_LENGTH; s += 0.5) {
      // The rider at this point of the glide: hands on the handle, feet armSpan below.
      const u = Math.max(0, Math.min(1, s / ZIP_LENGTH));
      cableAt(u, at);
      const feet = at.y - ZIPLINE.handleDrop - ZIPLINE.armSpan;
      if (u > 0.003 && u < 0.996) {
        expect(
          island.solid.blocked(at.x, feet + 0.05, at.z, at.y - feet, 0.45),
          `rider blocked at ${s.toFixed(1)} m`,
        ).toBe(false);
        minAgl = Math.min(minAgl, feet - groundAt(at.x, at.z));
      }
      // No tree crown (generously twice the trunk height) reaches the rider or the cable.
      forEachTrunkNear(island.vegetation, at.x, at.z, 3.5, (_tx, _tz, _r, height, ground) => {
        expect(ground + height * 2, `tree at ${s.toFixed(0)} m`).toBeLessThan(feet - 0.3);
      });
    }
    expect(minAgl).toBeGreaterThan(0.8);
  });

  it("glides for 28 s (29.4 s from taking hold to stepping off), smoothly", () => {
    expect(ZIP_T.drop - ZIP_T.ride).toBe(28_000);
    expect(ZIP_T.done / 1000).toBeGreaterThan(20);
    expect(ZIP_T.done / 1000).toBeLessThan(30);
    expect(rideDistance(ZIPLINE.rideMs)).toBeCloseTo(ZIP_LENGTH, 3);
    // Speed: from rest, never jumping between ticks, slowing for the station.
    const land = zipLanding(groundAt).y;
    let prev = zipPose(0, land),
      prevV = 0,
      maxDv = 0;
    for (let ms = TICK_MS; ms <= ZIP_T.done; ms += TICK_MS) {
      const p = zipPose(ms, land);
      const v = Math.hypot(p.x - prev.x, p.y - prev.y, p.z - prev.z) / (TICK_MS / 1000);
      if (ms > 2 * TICK_MS) maxDv = Math.max(maxDv, Math.abs(v - prevV));
      prevV = v;
      prev = p;
    }
    expect(maxDv).toBeLessThan(2.5); // m/s per 33 ms tick
    expect(rideSpeed(0)).toBe(0);
    expect(rideSpeed(ZIPLINE.rideMs)).toBeCloseTo(ZIPLINE.endSpeed, 3);
    // Another rider's time is recovered from their position alone (within a tick).
    for (const ms of [2000, 9000, 17000, 24000]) {
      const p = zipPose(ZIP_T.ride + ms, land);
      expect(Math.abs(zipMsAt(p.x, p.z)! - (ZIP_T.ride + ms))).toBeLessThan(TICK_MS);
    }
  });

  it("rides one way on E at the deck, server-authoritative, and steps off at Pine Ridge", () => {
    const state = liveMatch();
    const rider = state.seats[0]!;
    // Too far from the handle (on the ground below the tower): refused.
    const below = rider.body.y;
    rider.body.y = ZIPLINE.tower.y;
    tick(state, 0, new Map([[0, [{ act: "zip" }]]]));
    expect(rider.body.phase).toBe("ground");
    expect(state.combat.some((e) => e.type === "act" && e.act === "zip" && !e.ok)).toBe(true);
    rider.body.y = below;
    // At the deck: taken.
    let now = TICK_MS;
    tick(state, now, new Map([[0, [{ act: "zip" }]]]));
    expect(rider.body.phase).toBe("zip");
    expect(state.events).toContainEqual({ seat: 0, phase: "zip" });
    // Movement keys, jumps, a second E, doors or a vehicle exit change nothing during the ride.
    const start = now;
    const land = zipLanding(groundAt);
    let landedAt = -1;
    let landedAtPos = { x: 0, y: 0, z: 0 };
    for (let seq = 1; now < start + 32_000; seq++) {
      now += TICK_MS;
      const acts = new Map([[0, [{ act: "zip" } as const, { act: "exit" } as const]]]);
      tick(
        state,
        now,
        acts,
        new Map([[0, input(seq, { forward: 1, strafe: 1, jump: true, sprint: true, fire: true })]]),
      );
      if (rider.body.phase === "zip") {
        const p = zipPose(rider.body.zip!.ms, land.y);
        expect(Math.hypot(rider.body.x - p.x, rider.body.y - p.y, rider.body.z - p.z)).toBeLessThan(
          1e-6,
        );
      } else if (landedAt < 0) {
        landedAt = now;
        landedAtPos = { x: rider.body.x, y: rider.body.y, z: rider.body.z };
      }
      // No shots while riding.
      expect(state.combat.some((e) => e.type === "shot" && e.seat === 0)).toBe(false);
    }
    // 29.4 s from taking hold, then on foot on the landing platform.
    expect((landedAt - start) / 1000).toBeGreaterThan(29.3);
    expect((landedAt - start) / 1000).toBeLessThan(29.6);
    expect(rider.body.zip).toBeUndefined();
    expect(Math.hypot(landedAtPos.x - land.x, landedAtPos.z - land.z)).toBeLessThan(2);
    expect(landedAtPos.y).toBeCloseTo(land.y, 1);
    // Their input moved them only after the ride (walked off the platform while the test held W).
    expect(rider.body.phase).toBe("ground");
    // Not stuck: they walk off the platform (sprinting away from it, still at Pine Ridge).
    const b = rider.body as BrBody;
    const x0 = b.x,
      z0 = b.z;
    for (let i = 0; i < 90; i++)
      stepBody(island.solid, b, { forward: 1, strafe: 0, yaw: 0.6, sprint: true }, TICK_MS);
    expect(Math.hypot(b.x - x0, b.z - z0)).toBeGreaterThan(8);
  });

  it("is one way: nothing to take at Pine Ridge", () => {
    const state = liveMatch();
    const end = zipLanding(groundAt);
    Object.assign(state.seats[0]!.body, { x: end.x, y: end.y, z: end.z });
    tick(state, 0, new Map([[0, [{ act: "zip" }]]]));
    expect(state.seats[0]!.body.phase).toBe("ground");
  });

  it("lets one rider take hold at a time, then the next once the first has left the deck", () => {
    const state = liveMatch();
    const second = state.seats[1]!;
    Object.assign(second.body, { x: ZIP_STAND.x + 0.4, y: ZIP_STAND.y, z: ZIP_STAND.z });
    tick(state, 0, new Map([[0, [{ act: "zip" }]]]));
    tick(state, TICK_MS, new Map([[1, [{ act: "zip" }]]]));
    expect(second.body.phase).toBe("ground");
    let now = TICK_MS;
    while (now < ZIPLINE.spacingMs + TICK_MS) tick(state, (now += TICK_MS));
    tick(state, (now += TICK_MS), new Map([[1, [{ act: "zip" }]]]));
    expect(second.body.phase).toBe("zip");
  });

  it("drops an eliminated rider and their gear to the ground below", () => {
    const state = liveMatch();
    const rider = state.seats[0]!;
    tick(state, 0, new Map([[0, [{ act: "zip" }]]]));
    let now = 0;
    while (now < 12_000) tick(state, (now += TICK_MS));
    expect(rider.body.phase).toBe("zip");
    // The gas finishes them (the same elimination path as a shot: dropGear). Past the final
    // close the gas is everywhere.
    rider.kit.hp = 0.01;
    rider.kit.bag.push({ item: "bandage", qty: 3 });
    state.planeAt = now - 100_000_000;
    let cableY = rider.body.y;
    for (let i = 0; i < 90 && !rider.dead; i++) {
      cableY = rider.body.y;
      tick(state, (now += TICK_MS));
    }
    const { x, z } = rider.body;
    const ground = groundAt(x, z);
    expect(cableY - ground).toBeGreaterThan(20); // they were high on the cable
    expect(rider.dead).toBe(true);
    expect(rider.body.phase).toBe("ground");
    expect(Math.abs(rider.body.y - ground)).toBeLessThan(1.5); // terrain (or a rock under them)
    expect(rider.body.zip).toBeUndefined();
    // Their gear lies on the ground below the cable, not in the air.
    let near = 0;
    for (const item of state.loot.items.values())
      if (Math.hypot(item.x - x, item.z - z) < 4) {
        near++;
        expect(item.y).toBeLessThan(ground + 2);
      }
    expect(near).toBeGreaterThan(0);
  });

  it("replicates the ride: others see the rider on the cable, the rider gets its clock", () => {
    const state = liveMatch();
    tick(state, 0, new Map([[0, [{ act: "zip" }]]]));
    let now = 0;
    while (now < 10_000) tick(state, (now += TICK_MS));
    const rider = state.seats[0]!;
    const watcher = brViewFor(state, island.solid, new BrSight(), 1, now, new BrSeatSync());
    const row = watcher.players.find((r) => r[0] === 0)!;
    expect(row).toBeDefined(); // ≈ 700 m away, seen against the sky like a flier
    expect(row[4]).toBe(6);
    expect(Math.hypot(row[1]! - rider.body.x, row[3]! - rider.body.z)).toBeLessThan(0.02);
    const own = brViewFor(state, island.solid, new BrSight(), 0, now, new BrSeatSync());
    expect(own.you.phase).toBe("zip");
    expect(own.you.zip).toBe(rider.body.zip!.ms);
    // The client's prediction (the same step) stays on the server's ride.
    const copy: DropBody = { ...rider.body, zip: { ...rider.body.zip! } };
    for (let i = 0; i < 30; i++)
      stepDrop(island.solid, meta, state.route, copy, input(i), 0, TICK_MS);
    for (let i = 0; i < 30; i++) tick(state, (now += TICK_MS));
    expect(
      Math.hypot(copy.x - rider.body.x, copy.y - rider.body.y, copy.z - rider.body.z),
    ).toBeLessThan(1e-6);
  });
});
