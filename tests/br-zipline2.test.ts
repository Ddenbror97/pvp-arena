import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { stepDrop, type DropBody } from "@/lib/fps/br/drop";
import { decodeHeightfield, type Heightfield } from "@/lib/fps/br/heightfield";
import { buildIsland, type Island } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import {
  climbPoint,
  ladderHeight,
  ladderReachable,
  ladders,
  startClimb,
  stepLadder,
} from "@/lib/fps/br/ladders";
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
  MAST_PLATFORM_Y,
  ZIPLINE,
  ZIPLINES,
  zipLineAt,
  zipRiderAt,
  zipStationBoxes,
} from "@/lib/fps/br/zipline";
import { TICK_MS } from "@/lib/fps/simulation";

/**
 * The second zip-line (owner, 2026-11-12): from the broadcast tower behind the Iron Peaks
 * watchtower's summit down to the watchtower, through the first line's own code (zipline.ts's
 * configured lines). The route on the real island, the tower's ladder and platform, the ride,
 * the landing and the walk on to the first line, both lines at once, death and replication.
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
}, 120_000);
const groundAt = (x: number, z: number) => hf.heightAt(x, z);
const L = ZIPLINES[1]!,
  L0 = ZIPLINES[0]!;
const input = (seq: number, extra: Partial<BrInput> = {}): BrInput => ({
  seq,
  forward: 0,
  strafe: 0,
  yaw: 0,
  ...extra,
});
function liveMatch() {
  const state = createBrMatch(meta, 11, groundAt);
  seatHuman(state, "rider", "Rider");
  seatHuman(state, "other", "Other");
  state.phase = "active";
  state.planeAt = -600_000;
  for (const s of state.seats) {
    if (s.seat > 1) s.dead = true;
    Object.assign(s.body, { phase: "ground", grounded: true, velocityY: 0, vx: 0, vz: 0 });
  }
  Object.assign(state.seats[0]!.body, { x: L.stand.x, y: L.stand.y, z: L.stand.z });
  Object.assign(state.seats[1]!.body, { x: L0.stand.x, y: L0.stand.y, z: L0.stand.z });
  return state;
}
function tick(
  state: BrMatchState,
  now: number,
  acts: Map<number, Array<{ act: "zip" }>> = new Map(),
  inputs = new Map<number, BrInput>(),
) {
  stepBrMatch(state, island.solid, meta, inputs, now, TICK_MS, acts as never);
}
/** Walk a body through points with the real movement (false if it gets stuck). */
function walk(b: BrBody, points: Array<[number, number]>) {
  for (const [x, z] of points) {
    let t = 0;
    for (; t < 400 && Math.hypot(b.x - x, b.z - z) > 0.2; t++)
      stepBody(
        island.solid,
        b,
        { forward: 1, strafe: 0, yaw: Math.atan2(b.x - x, b.z - z) },
        TICK_MS,
      );
    if (Math.hypot(b.x - x, b.z - z) > 0.25) return false;
  }
  return true;
}

describe("broadcast tower → Iron Peaks zip-line", () => {
  it("starts on the broadcast tower behind the summit and ends by the Iron Peaks watchtower", () => {
    const mast = island.layout.find((p) => p.model === "radio-mast" && p.poi === "iron-peaks")!;
    expect(Math.hypot(mast.x - L.stand.x, mast.z - L.stand.z)).toBeLessThan(5);
    expect(L.stand.y).toBeCloseTo(mast.y + MAST_PLATFORM_Y, 2);
    // "Behind" the first line's mountain: north of the watchtower, away from Pine Ridge.
    expect(L.start.z).toBeLessThan(ZIPLINE.tower.z - 300);
    // The stand on the platform, free to stand at; the handle in reach above it.
    expect(island.solid.supportAt(L.stand.x, L.stand.z, 0.35, L.stand.y + 0.5)).toBeCloseTo(
      L.stand.y,
      2,
    );
    expect(island.solid.blocked(L.stand.x, L.stand.y + 0.05, L.stand.z, 1.75, 0.35)).toBe(false);
    expect(L.start.y - ZIPLINE.handleDrop - L.stand.y).toBeLessThan(2.2);
    // Downhill all the way, a believable grade (6–15 %), the cable never rising.
    const drop = L.start.y - L.end.y;
    expect(drop / L.span).toBeGreaterThan(0.06);
    expect(drop / L.span).toBeLessThan(0.15);
    for (let u = 0.01; u <= 1; u += 0.01) expect(L.cableSlope(u)).toBeLessThan(0);
    // Ends by the watchtower: its landing platform 9–11 m from the tower, level with its summit.
    const land = L.landing(groundAt);
    const d = Math.hypot(land.x - ZIPLINE.tower.x, land.z - ZIPLINE.tower.z);
    expect(d).toBeGreaterThan(8);
    expect(d).toBeLessThan(11);
    expect(Math.abs(land.y - ZIPLINE.tower.y)).toBeLessThan(0.5);
  });

  it("keeps the hanging rider clear of terrain, the towers and trees all the way", () => {
    let minAgl = Infinity;
    const at = { x: 0, y: 0, z: 0 };
    for (let s = 0; s <= L.length; s += 0.5) {
      const u = L.uAt(s);
      L.cableAt(u, at);
      const feet = at.y - ZIPLINE.handleDrop - ZIPLINE.armSpan;
      if (s > 1.2 && s < L.length - 1.5) {
        expect(
          island.solid.blocked(at.x, feet + 0.05, at.z, at.y - feet, 0.45),
          `rider blocked at ${s.toFixed(1)} m`,
        ).toBe(false);
        minAgl = Math.min(minAgl, feet - groundAt(at.x, at.z));
      }
      forEachTrunkNear(island.vegetation, at.x, at.z, 3.5, (_tx, _tz, _r, height, ground) => {
        expect(ground + height * 2, `tree at ${s.toFixed(0)} m`).toBeLessThan(feet - 0.3);
      });
    }
    expect(minAgl).toBeGreaterThan(0.6);
  });

  it("glides for 19 s at a long steep line's pace, smoothly", () => {
    expect(L.T.drop - L.T.ride).toBe(19_000);
    expect(L.T.done / 1000).toBeGreaterThan(10);
    expect(L.T.done / 1000).toBeLessThan(21);
    expect(L.cruise).toBeGreaterThan(20);
    expect(L.cruise).toBeLessThan(30);
    expect(L.rideDistance(L.rideMs)).toBeCloseTo(L.length, 3);
    const land = L.landing(groundAt).y;
    let prev = L.pose(0, land),
      prevV = 0,
      maxDv = 0;
    for (let ms = TICK_MS; ms <= L.T.done; ms += TICK_MS) {
      const p = L.pose(ms, land);
      const v = Math.hypot(p.x - prev.x, p.y - prev.y, p.z - prev.z) / (TICK_MS / 1000);
      if (ms > 2 * TICK_MS) maxDv = Math.max(maxDv, Math.abs(v - prevV));
      prevV = v;
      prev = p;
    }
    expect(maxDv).toBeLessThan(2.5);
    // Others' riders: their line and time from their position alone.
    for (const ms of [1500, 7000, 14000]) {
      const p = L.pose(L.T.ride + ms, land);
      const seen = zipRiderAt(p.x, p.z);
      expect(seen.line.id).toBe(1);
      expect(Math.abs(seen.ms! - (L.T.ride + ms))).toBeLessThan(TICK_MS);
      const p0 = L0.pose(L0.T.ride + ms, L0.landing(groundAt).y);
      expect(zipRiderAt(p0.x, p0.z).line.id).toBe(0);
    }
  });

  it("is reached up the tower's ladder: steps onto its base, the ladder, the platform, the stand", () => {
    const mast = island.layout.find((p) => p.model === "radio-mast" && p.poi === "iron-peaks")!;
    const l = ladders(hf).find((q) => Math.hypot(q.x - mast.x, q.z - mast.z) < 3)!;
    expect(l.top).toBeCloseTo(L.stand.y, 2);
    // On foot from the slope south of the tower, up its steps to the ladder's foot.
    const b: BrBody = {
      x: mast.x + 0.15,
      y: groundAt(mast.x + 0.15, mast.z + 9.5),
      z: mast.z + 9.5,
      grounded: true,
      crouched: false,
      velocityY: 0,
    };
    b.y = island.solid.supportAt(b.x, b.z, 0.35, b.y + 0.5);
    expect(
      walk(b, [
        [mast.x + 0.15, mast.z + 4.6],
        [mast.x + 0.15, mast.z - 0.45],
      ]),
    ).toBe(true);
    expect(ladderReachable(hf, b.x, b.y, b.z)?.ladder.id).toBe(l.id);
    // Up the ladder (≈ 24 m at 1.25 m/s) and over the hatch's rail onto the platform.
    const c = { ...b, vx: 0, vz: 0 } as Parameters<typeof stepLadder>[1];
    startClimb(c, l, "bottom");
    let done = null as string | null;
    for (let i = 0; i < 1200 && !done; i++) done = stepLadder(hf, c, 1, false, TICK_MS);
    expect(done).toBe("ground");
    expect(c.y).toBeCloseTo(L.stand.y, 3);
    expect(ladderHeight(l)).toBeGreaterThan(24);
    // Then across the platform, out under the upper lattice to the zip-line's stand.
    const p: BrBody = { x: c.x, y: c.y, z: c.z, grounded: true, crouched: false, velocityY: 0 };
    expect(
      walk(p, [
        [mast.x + 2.15, mast.z + 1.9],
        [mast.x + 0.15, mast.z + 2.6],
        [L.stand.x, L.stand.z],
      ]),
    ).toBe(true);
    expect(p.y).toBeCloseTo(L.stand.y, 2);
    expect(zipLineAt(p.x, p.y, p.z)?.id).toBe(1);
    expect(climbPoint(l, 0).y).toBeCloseTo(mast.y + 1.44, 1);
  });

  it("rides on E at the platform, lands by the watchtower; the first line is a short walk on", () => {
    const state = liveMatch();
    const rider = state.seats[0]!;
    let now = 0;
    tick(state, now, new Map([[0, [{ act: "zip" }]]]));
    expect(rider.body.phase).toBe("zip");
    expect(rider.body.zip?.id).toBe(1);
    const start = now;
    let landedAt = -1;
    for (let seq = 1; now < start + 24_000 && landedAt < 0; seq++) {
      now += TICK_MS;
      tick(
        state,
        now,
        new Map([[0, [{ act: "zip" }]]]),
        new Map([[0, input(seq, { forward: 1, jump: true })]]),
      );
      if (rider.body.phase === "ground") landedAt = now;
    }
    expect((landedAt - start) / 1000).toBeCloseTo(L.T.done / 1000, 1);
    const land = L.landing(groundAt);
    expect(Math.hypot(rider.body.x - land.x, rider.body.z - land.z)).toBeLessThan(0.1);
    expect(rider.body.y).toBeCloseTo(land.y, 2);
    // No automatic chaining: on foot, not on the first line.
    for (let i = 0; i < 30; i++) tick(state, (now += TICK_MS));
    expect(rider.body.phase).toBe("ground");
    // The landing's prompt zone is clear of both handles; the watchtower's ladder (to the first
    // line's deck) is a short walk.
    expect(zipLineAt(land.x, land.y, land.z)).toBeNull();
    const tl = ladders(hf)[0]!;
    const foot = climbPoint(tl, 0);
    const b: BrBody = {
      x: land.x,
      y: land.y,
      z: land.z,
      grounded: true,
      crouched: false,
      velocityY: 0,
    };
    expect(
      walk(b, [
        [ZIPLINE.tower.x + 4.2, ZIPLINE.tower.z - 4.5],
        [foot.x + 0.6, foot.z],
      ]),
    ).toBe(true);
    expect(Math.hypot(foot.x - land.x, foot.z - land.z)).toBeLessThan(14);
    expect(ladderReachable(hf, b.x, b.y, b.z)?.ladder.id).toBe(0);
  });

  it("runs both lines at once, independently, and replicates each rider's line", () => {
    const state = liveMatch();
    let now = 0;
    tick(
      state,
      now,
      new Map([
        [0, [{ act: "zip" }]],
        [1, [{ act: "zip" }]],
      ]),
    );
    const [a, b] = [state.seats[0]!, state.seats[1]!];
    expect(a.body.zip).toEqual({ ms: 0, id: 1 });
    expect(b.body.zip).toEqual({ ms: 0 });
    while (now < 8000) tick(state, (now += TICK_MS));
    const view = brViewFor(state, island.solid, new BrSight(), 1, now, new BrSeatSync());
    const row = view.players.find((r) => r[0] === 0)!;
    expect(row[4]).toBe(6);
    const seen = zipRiderAt(row[1]!, row[3]!);
    expect(seen.line.id).toBe(1);
    expect(Math.abs(seen.ms! - a.body.zip!.ms)).toBeLessThan(2 * TICK_MS);
    const own = brViewFor(state, island.solid, new BrSight(), 0, now, new BrSeatSync());
    expect(own.you.zip).toBe(a.body.zip!.ms);
    expect((own.you as { zipLine?: number }).zipLine).toBe(1);
    const other = brViewFor(state, island.solid, new BrSight(), 1, now, new BrSeatSync());
    expect((other.you as { zipLine?: number }).zipLine).toBeUndefined();
    // The client's prediction stays on the server's ride (its line from you.zipLine).
    const copy: DropBody = { ...a.body, zip: { ...a.body.zip! } };
    for (let i = 0; i < 30; i++)
      stepDrop(island.solid, meta, state.route, copy, input(i), 0, TICK_MS);
    for (let i = 0; i < 30; i++) tick(state, (now += TICK_MS));
    expect(Math.hypot(copy.x - a.body.x, copy.y - a.body.y, copy.z - a.body.z)).toBeLessThan(1e-6);
  });

  it("drops an eliminated rider to the valley floor below the cable", () => {
    const state = liveMatch();
    const rider = state.seats[0]!;
    let now = 0;
    tick(state, now, new Map([[0, [{ act: "zip" }]]]));
    while (now < 9000) tick(state, (now += TICK_MS));
    rider.kit.hp = 0.01;
    state.planeAt = now - 100_000_000;
    let high = rider.body.y;
    for (let i = 0; i < 90 && !rider.dead; i++) {
      high = rider.body.y;
      tick(state, (now += TICK_MS));
    }
    expect(rider.dead).toBe(true);
    expect(high - groundAt(rider.body.x, rider.body.z)).toBeGreaterThan(20);
    expect(Math.abs(rider.body.y - groundAt(rider.body.x, rider.body.z))).toBeLessThan(1.5);
  });

  it("puts the second line's stations in the collision world", () => {
    const boxes = zipStationBoxes(groundAt);
    const near = (x: number, z: number, r: number) =>
      boxes.some((b) => Math.hypot((b[0]! + b[3]!) / 2 - x, (b[2]! + b[5]!) / 2 - z) < r);
    expect(near(L.end.x, L.end.z, 2.5)).toBe(true); // the A-frame's posts
    expect(near(L.start.x, L.start.z - 0.95, 0.3)).toBe(true); // the arm's post on the platform
  });
});
