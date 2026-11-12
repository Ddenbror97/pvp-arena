import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import type { BrAct } from "@/lib/fps/br/actions";
import { stepDrop, type DropBody } from "@/lib/fps/br/drop";
import { decodeHeightfield, type Heightfield } from "@/lib/fps/br/heightfield";
import { buildIsland, type Island } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import {
  climbAt,
  climbPoint,
  ladderHeight,
  ladderReachable,
  ladders,
  type Ladder,
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
import { ROPE, ropeAt, ropePath, ropeTangent } from "@/lib/fps/br/rope";
import type { CollisionData } from "@/lib/fps/br/static-world";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";
import { ZIP_STAND, ZIPLINE } from "@/lib/fps/br/zipline";
import { MOVE_SPEED, TICK_MS, WALK_SPEED_SCALE } from "@/lib/fps/simulation";

/**
 * The Iron Peaks climbing rope (owner, 2026-11-12): up the summit's steepest face, climbed with
 * the ladder mechanics. The route on the real terrain, the server's validation and authority (up
 * and over the edge onto the plateau, down and off at the foot, holding still, E or jump letting
 * go, E near an end stepping off, eliminated on it) and replication from the row alone.
 */
const buffer = (path: string) => {
  const b = readFileSync(path);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
};
const meta = JSON.parse(readFileSync(`public${WORLD_ASSETS.meta}`, "utf8")) as WorldMeta;
const collision = JSON.parse(
  readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"),
) as CollisionData;
let hf: Heightfield, island: Island, rope: Ladder;
beforeAll(async () => {
  hf = await decodeHeightfield(buffer(`public${WORLD_ASSETS.height}`));
  const cover = await decodeLandCover(buffer(`public${WORLD_ASSETS.landcover}`));
  island = buildIsland(hf, cover, meta, collision);
  rope = ladders(hf).find((l) => l.rope)!;
}, 120_000);
const groundAt = (x: number, z: number) => hf.heightAt(x, z);
const input = (seq: number, extra: Partial<BrInput> = {}): BrInput => ({
  seq,
  forward: 0,
  strafe: 0,
  yaw: 0,
  ...extra,
});

/** A live match: seat 0 at the rope's foot, seat 1 watching from 20 m away. */
function liveMatch() {
  const state = createBrMatch(meta, 11, groundAt);
  seatHuman(state, "climber", "Climber");
  seatHuman(state, "watcher", "Watcher");
  state.phase = "active";
  state.planeAt = -600_000;
  for (const s of state.seats) {
    if (s.seat > 1) s.dead = true;
    Object.assign(s.body, { phase: "ground", grounded: true, velocityY: 0, vx: 0, vz: 0 });
  }
  const [fx, fy, fz] = rope.rope!.foot;
  Object.assign(state.seats[0]!.body, { x: fx, y: fy, z: fz });
  const wx = fx + 20;
  Object.assign(state.seats[1]!.body, { x: wx, y: groundAt(wx, fz), z: fz });
  return state;
}
function tick(state: BrMatchState, now: number, acts: BrAct[] = [], fwd = 0, jump = false) {
  stepBrMatch(
    state,
    island.solid,
    meta,
    new Map([[0, input(Math.round(now / TICK_MS), { forward: fwd, jump, fire: true })]]),
    now,
    TICK_MS,
    new Map(acts.length ? [[0, acts]] : []),
  );
}
const o = { x: 0, y: 0, z: 0 },
  t = { x: 0, y: 0, z: 0 };

describe("Iron Peaks climbing rope", () => {
  it("runs up the summit's steep face from a stand on the slope to the plateau by the tower", () => {
    const p = ropePath(hf);
    expect(rope.id).toBe(1);
    expect(p.length).toBeGreaterThan(45);
    // Steep: the climb gains over 45 m, at 50°–80° all the way (a face, not a slope to walk).
    expect(p.pts[p.pts.length - 2]! - p.pts[1]!).toBeGreaterThan(45);
    for (let s = 0; s < p.length - 4; s += 1) {
      ropeTangent(p, s, t);
      const angle = (Math.atan2(t.y, Math.hypot(t.x, t.z)) * 180) / Math.PI;
      expect(angle, `${s} m`).toBeGreaterThan(50);
      expect(angle, `${s} m`).toBeLessThan(80);
    }
    // Held off the rock all the way: never in the ground, and the body's column (from the rope
    // line out) clear of every rock, tree trunk and structure.
    for (let s = 0; s <= p.length; s += 0.5) {
      ropeAt(p, s, o);
      expect(o.y - groundAt(o.x, o.z), `${s} m`).toBeGreaterThan(0.8);
      expect(island.solid.blocked(o.x, o.y + 0.3, o.z, 1.2, 0.3), `${s} m`).toBe(false);
    }
    // The foot: on the ground, free to stand at; the exit on the plateau, free to stand on, a
    // few metres from the watchtower; the zip-line's deck reachable from there by its ladder.
    const [fx, fy, fz] = p.foot;
    expect(Math.abs(fy - groundAt(fx, fz))).toBeLessThan(1e-6);
    expect(island.solid.blocked(fx, fy + 0.05, fz, 1.75, 0.35)).toBe(false);
    const [ex, ey, ez] = p.exit;
    expect(island.solid.supportAt(ex, ez, 0.35, ey + 0.3)).toBeCloseTo(ey, 2);
    expect(island.solid.blocked(ex, ey + 0.05, ez, 1.75, 0.35)).toBe(false);
    const fromTower = Math.hypot(ex - ZIPLINE.tower.x, ez - ZIPLINE.tower.z);
    expect(fromTower).toBeLessThan(12);
    expect(ey - ZIPLINE.tower.y).toBeLessThan(0.5);
    // E reaches it at the foot and at the exit, and nowhere in between.
    expect(ladderReachable(hf, fx, fy, fz)).toMatchObject({ ladder: { id: 1 }, end: "bottom" });
    expect(ladderReachable(hf, ex, ey, ez)).toMatchObject({ ladder: { id: 1 }, end: "top" });
  });

  it("is about 20 % faster than the same way up on foot at a walk", () => {
    // On foot (45° at most) the exit is a 99.5 m walk from the foot round the shoulder
    // (rope.ts); the rope: taking hold, the climb, over the edge.
    const walk = 99.5 / (MOVE_SPEED * WALK_SPEED_SCALE);
    const climb = 0.7 + ladderHeight(rope) / ROPE.speed + 1.1;
    expect(walk / climb).toBeGreaterThan(1.15);
    expect(walk / climb).toBeLessThan(1.25);
  });

  it("climbs on E and W, over the edge onto the plateau; the tower's ladder is a short walk", () => {
    const state = liveMatch();
    const c = state.seats[0]!;
    let now = 0;
    tick(state, now, [{ act: "ladder" }]);
    expect(c.body.phase).toBe("ladder");
    const start = now;
    let topAt = -1,
      maxStep = 0,
      last = { ...c.body };
    while (now < start + 60_000 && topAt < 0) {
      now += TICK_MS;
      tick(state, now, [{ act: "exit" }], 1);
      maxStep = Math.max(
        maxStep,
        Math.hypot(c.body.x - last.x, c.body.y - last.y, c.body.z - last.z),
      );
      last = { ...c.body };
      expect(state.combat.some((e) => e.type === "shot" && e.seat === 0)).toBe(false);
      if (c.body.phase === "ground") topAt = now;
    }
    const secs = (topAt - start) / 1000;
    expect(Math.abs(secs - (0.7 + ladderHeight(rope) / ROPE.speed + 1.1))).toBeLessThan(0.2);
    // Smooth: frame-rate independent fixed steps of a few cm (the step up onto the rope and
    // over the edge included).
    expect(maxStep).toBeLessThan(0.2);
    expect(c.body.y).toBeCloseTo(rope.top, 3);
    // Standing on the plateau a second later (not falling).
    for (let i = 0; i < 30; i++) tick(state, (now += TICK_MS));
    expect(c.body.phase).toBe("ground");
    expect(Math.abs(c.body.y - rope.top)).toBeLessThan(0.05);
    expect(Math.hypot(c.body.x - ZIP_STAND.x, c.body.z - ZIP_STAND.z)).toBeLessThan(16);
  });

  it("goes down from the top: E at the exit, S down, off onto the slope at the foot", () => {
    const state = liveMatch();
    const c = state.seats[0]!;
    const [ex, ey, ez] = rope.rope!.exit;
    Object.assign(c.body, { x: ex, y: ey, z: ez });
    let now = 0;
    tick(state, now, [{ act: "ladder" }]);
    expect(c.body.phase).toBe("ladder");
    while (now < 60_000 && c.body.phase === "ladder") tick(state, (now += TICK_MS), [], -1);
    expect(c.body.phase).toBe("ground");
    const [fx, fy, fz] = rope.rope!.foot;
    expect(Math.hypot(c.body.x - fx, c.body.z - fz)).toBeLessThan(1e-6);
    expect(c.body.y).toBeCloseTo(fy, 3);
  });

  it("holds still with no key; E midway lets go (a fall); E near the top steps off over it", () => {
    const state = liveMatch();
    const c = state.seats[0]!;
    let now = 0;
    tick(state, now, [{ act: "ladder" }]);
    while (now < 8000) tick(state, (now += TICK_MS), [], 1);
    const held = { ...c.body };
    for (let i = 0; i < 30; i++) tick(state, (now += TICK_MS));
    expect(c.body.y).toBe(held.y);
    expect(c.body.phase).toBe("ladder");
    // E with the rope's E again only once: a repeated E while stepping on/off does nothing.
    tick(state, (now += TICK_MS), [{ act: "ladder" }]);
    expect(c.body.phase).toBe("ground");
    for (let i = 0; i < 150; i++) tick(state, (now += TICK_MS));
    expect(c.body.grounded).toBe(true);
    expect(c.body.y).toBeLessThan(held.y - 2);
    // Near the top: E steps off over the edge instead.
    const s2 = liveMatch();
    const c2 = s2.seats[0]!;
    let n2 = 0;
    tick(s2, n2, [{ act: "ladder" }]);
    while (c2.body.ladder && c2.body.ladder.s < rope.rope!.length - 0.8)
      tick(s2, (n2 += TICK_MS), [], 1);
    tick(s2, (n2 += TICK_MS), [{ act: "ladder" }]);
    for (let i = 0; i < 40; i++) tick(s2, (n2 += TICK_MS));
    expect(c2.body.phase).toBe("ground");
    expect(c2.body.y).toBeCloseTo(rope.top, 2);
  });

  it("drops an eliminated climber and their gear onto the face below", () => {
    const state = liveMatch();
    const c = state.seats[0]!;
    let now = 0;
    tick(state, now, [{ act: "ladder" }]);
    while (now < 6000) tick(state, (now += TICK_MS), [], 1);
    expect(c.body.phase).toBe("ladder");
    c.kit.hp = 0.01;
    state.planeAt = now - 100_000_000; // past the final close: the gas everywhere
    for (let i = 0; i < 90 && !c.dead; i++) tick(state, (now += TICK_MS), [], 1);
    expect(c.dead).toBe(true);
    expect(c.body.phase).toBe("ground");
    expect(c.body.ladder).toBeUndefined();
    expect(Math.abs(c.body.y - groundAt(c.body.x, c.body.z))).toBeLessThan(0.5);
  });

  it("replicates the climb from the row alone; the client's prediction matches", () => {
    const state = liveMatch();
    const c = state.seats[0]!;
    let now = 0;
    tick(state, now, [{ act: "ladder" }]);
    while (now < 5000) tick(state, (now += TICK_MS), [], 1);
    const watcher = brViewFor(state, island.solid, new BrSight(), 1, now, new BrSeatSync());
    const row = watcher.players.find((r) => r[0] === 0)!;
    expect(row[4]).toBe(7);
    const seen = climbAt(hf, row[1]!, row[2]!, row[3]!);
    expect(seen?.ladder.id).toBe(1);
    expect(Math.abs(seen!.s - c.body.ladder!.s)).toBeLessThan(0.05);
    const own = brViewFor(state, island.solid, new BrSight(), 0, now, new BrSeatSync());
    expect(own.you.ladder).toEqual(c.body.ladder);
    const copy: DropBody = { ...c.body, ladder: { ...c.body.ladder! } };
    for (let i = 0; i < 40; i++) {
      stepDrop(island.solid, meta, state.route, copy, input(i, { forward: 1 }), 0, TICK_MS);
      tick(state, (now += TICK_MS), [], 1);
    }
    expect(Math.hypot(copy.x - c.body.x, copy.y - c.body.y, copy.z - c.body.z)).toBeLessThan(1e-9);
    expect(climbPoint(rope, c.body.ladder!.s).y).toBeCloseTo(c.body.y, 6);
  });
});
