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
import { MAX_SLOPE } from "@/lib/fps/br/movement";
import { onRopeRoute, ROPE, ROPES, ropeAt, ropeTangent } from "@/lib/fps/br/rope";
import { ropeLine } from "@/lib/fps/br/rope-renderer";
import type { CollisionData } from "@/lib/fps/br/static-world";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";
import { ZIP_STAND, ZIPLINE } from "@/lib/fps/br/zipline";
import { TICK_MS } from "@/lib/fps/simulation";
import { walkable } from "../scripts/br/walkable";

/**
 * The Iron Peaks climbing ropes (owner, 2026-11-12: "the 4 climbing ropes on that mountain, 2
 * infront 2 in back … going all the way to the buttom … player should be able to climb up from
 * the buttom"), climbed with the ladder mechanics. The routes on the real terrain (from ground
 * a player can walk to, up to the plateau nobody can walk to), the server's validation and
 * authority (up and over the edge onto the plateau, down and off at the foot, holding still, E
 * or jump letting go, E near an end stepping off, eliminated on it) and replication from the
 * row alone.
 */
const buffer = (path: string) => {
  const b = readFileSync(path);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
};
const meta = JSON.parse(readFileSync(`public${WORLD_ASSETS.meta}`, "utf8")) as WorldMeta;
const collision = JSON.parse(
  readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"),
) as CollisionData;
let hf: Heightfield, island: Island, ropes: Ladder[], rope: Ladder;
beforeAll(async () => {
  hf = await decodeHeightfield(buffer(`public${WORLD_ASSETS.height}`));
  const cover = await decodeLandCover(buffer(`public${WORLD_ASSETS.landcover}`));
  island = buildIsland(hf, cover, meta, collision);
  ropes = ladders(hf).filter((l) => l.rope);
  rope = ropes[0]!;
}, 120_000);
const groundAt = (x: number, z: number) => hf.heightAt(x, z);
const input = (seq: number, extra: Partial<BrInput> = {}): BrInput => ({
  seq,
  forward: 0,
  strafe: 0,
  yaw: 0,
  ...extra,
});

/** A live match: seat 0 at a rope's foot (the first rope's unless given), seat 1 watching from
 * 20 m away. */
function liveMatch(at: Ladder = rope) {
  const state = createBrMatch(meta, 11, groundAt);
  seatHuman(state, "climber", "Climber");
  seatHuman(state, "watcher", "Watcher");
  state.phase = "active";
  state.planeAt = -600_000;
  for (const s of state.seats) {
    if (s.seat > 1) s.dead = true;
    Object.assign(s.body, { phase: "ground", grounded: true, velocityY: 0, vx: 0, vz: 0 });
  }
  const [fx, fy, fz] = at.rope!.foot;
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

const deg = (rad: number) => (rad * 180) / Math.PI;

describe("Iron Peaks climbing ropes", () => {
  it("are four: two down the front of the summit, two down the back", () => {
    expect(ROPES).toHaveLength(4);
    expect(ropes.map((l) => l.id)).toEqual([1, 2, 3, 4]);
    // The front faces south (Pine Ridge, +z), the back north (the broadcast tower).
    const side = ropes.map((l) => Math.sign(l.rope!.foot[2] - ZIPLINE.tower.z));
    expect(side).toEqual([-1, -1, 1, 1]);
    // Apart at the top (no two step off onto the same spot) and well apart at the foot.
    for (const a of ropes)
      for (const b of ropes) {
        if (a.id >= b.id) continue;
        expect(Math.hypot(a.exit.x - b.exit.x, a.exit.z - b.exit.z)).toBeGreaterThan(4);
        const [ax, , az] = a.rope!.foot,
          [bx, , bz] = b.rope!.foot;
        expect(Math.hypot(ax - bx, az - bz)).toBeGreaterThan(40);
      }
  });

  it("start on ground you can walk to; nobody walks up to the plateau", () => {
    // movement.ts's rule with a tenth to spare, flooded from the lowlands round the massif.
    const reached = walkable(hf, ZIPLINE.tower, MAX_SLOPE * 0.9, { cell: 1 });
    // The summit's cap is a cliff all the way round: the plateau, the first rope's old foot
    // (33 m out on the north-north-east face) and every rope's upper part are out of reach.
    expect(reached(ZIPLINE.tower.x + 5, ZIPLINE.tower.z + 5)).toBe(false);
    const b = (150 * Math.PI) / 180;
    expect(
      reached(ZIPLINE.tower.x + Math.sin(b) * 34.2, ZIPLINE.tower.z + Math.cos(b) * 34.2),
    ).toBe(false);
    for (const l of ropes) {
      const p = l.rope!;
      expect(reached(p.exit[0], p.exit[2]), `rope ${l.id} exit`).toBe(false);
      ropeAt(p, p.length - 15, o);
      expect(reached(o.x, o.z), `rope ${l.id} under the edge`).toBe(false);
      // The foot: walked to, and ground to stand on (40° or less where you take hold).
      const [fx, , fz] = p.foot;
      expect(reached(fx, fz), `rope ${l.id} foot`).toBe(true);
      expect(deg(Math.atan(hf.slopeAt(fx, fz))), `rope ${l.id} foot`).toBeLessThan(40);
    }
  });

  it("run up their faces from the foot to the plateau by the tower, clear all the way", () => {
    const drops = ropes.map((l) => l.rope!.exit[1] - l.rope!.foot[1]);
    // The back falls to the saddle between the summits, the front to the shoulders under it.
    expect(drops[0]).toBeGreaterThan(165);
    expect(drops[1]).toBeGreaterThan(115);
    expect(drops[2]).toBeGreaterThan(40);
    expect(drops[3]).toBeGreaterThan(55);
    for (const l of ropes) {
      const p = l.rope!;
      const drop = p.exit[1] - p.foot[1];
      expect(p.length, `rope ${l.id}`).toBeGreaterThan(drop);
      expect(p.length, `rope ${l.id}`).toBeLessThan(drop * 1.3);
      // Up all the way (never level, never back down); the cliff band under the edge is a face
      // (50°–80° over its top 25 m), not a slope to walk.
      for (let s = 0; s < p.length - 4; s += 1) {
        ropeTangent(p, s, t);
        const angle = deg(Math.atan2(t.y, Math.hypot(t.x, t.z)));
        expect(angle, `rope ${l.id}, ${s} m`).toBeGreaterThan(s > p.length - 29 ? 50 : 15);
        expect(angle, `rope ${l.id}, ${s} m`).toBeLessThan(80);
      }
      // Held off the rock all the way: never in the ground, and the body's column (from the
      // rope line out) clear of every rock, tree trunk and structure.
      for (let s = 0; s <= p.length; s += 0.5) {
        ropeAt(p, s, o);
        expect(o.y - groundAt(o.x, o.z), `rope ${l.id}, ${s} m`).toBeGreaterThan(
          ROPE.offFace - 0.15,
        );
        expect(island.solid.blocked(o.x, o.y + 0.3, o.z, 1.2, 0.3), `rope ${l.id}, ${s} m`).toBe(
          false,
        );
      }
      // The foot: on the ground, free to stand at; the exit on the plateau, free to stand on,
      // a few metres from the watchtower (its ladder and stair lead up to the zip-line).
      const [fx, fy, fz] = p.foot;
      expect(Math.abs(fy - groundAt(fx, fz))).toBeLessThan(1e-6);
      expect(island.solid.blocked(fx, fy + 0.05, fz, 1.75, 0.35), `rope ${l.id} foot`).toBe(false);
      const [ex, ey, ez] = p.exit;
      expect(island.solid.supportAt(ex, ez, 0.35, ey + 0.3)).toBeCloseTo(ey, 2);
      expect(island.solid.blocked(ex, ey + 0.05, ez, 1.75, 0.35), `rope ${l.id} exit`).toBe(false);
      expect(Math.hypot(ex - ZIPLINE.tower.x, ez - ZIPLINE.tower.z)).toBeLessThan(14);
      expect(Math.abs(ey - ZIPLINE.tower.y)).toBeLessThan(0.8);
      expect(Math.hypot(ex - ZIP_STAND.x, ez - ZIP_STAND.z)).toBeLessThan(16);
      // E reaches it at the foot and at the exit.
      expect(ladderReachable(hf, fx, fy, fz)).toMatchObject({
        ladder: { id: l.id },
        end: "bottom",
      });
      expect(ladderReachable(hf, ex, ey, ez)).toMatchObject({ ladder: { id: l.id }, end: "top" });
    }
    // The layout keeps its rocks off the routes and the spots where climbers step off.
    for (const placed of island.layout)
      if (placed.model.startsWith("rock-"))
        expect(onRopeRoute(placed.x, placed.z, 3), `${placed.model} ${placed.x} ${placed.z}`).toBe(
          false,
        );
  });

  it("take from half a minute (the front) to a minute and three quarters (the back)", () => {
    // Taking hold, the climb, over the edge.
    const secs = ropes.map((l) => 0.7 + ladderHeight(l) / ROPE.speed + 1.1);
    expect(secs[0]).toBeGreaterThan(95);
    expect(secs[0]).toBeLessThan(110);
    expect(secs[1]).toBeLessThan(80);
    expect(secs[2]).toBeLessThan(35);
    expect(secs[3]).toBeLessThan(40);
  });

  it("climb on E and W from the foot, over the edge onto the plateau (each rope)", () => {
    for (const l of ropes) {
      const state = liveMatch(l);
      const c = state.seats[0]!;
      let now = 0;
      tick(state, now, [{ act: "ladder" }]);
      expect(c.body.phase, `rope ${l.id}`).toBe("ladder");
      expect(c.body.ladder?.id).toBe(l.id);
      const start = now;
      let topAt = -1,
        maxStep = 0,
        last = { ...c.body };
      while (now < start + 120_000 && topAt < 0) {
        now += TICK_MS;
        // (This fixture's spot is in the gas, and the long ropes take minutes.)
        for (const seat of state.seats) seat.kit.hp = 100;
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
      expect(Math.abs(secs - (0.7 + ladderHeight(l) / ROPE.speed + 1.1))).toBeLessThan(0.2);
      // Smooth: frame-rate independent fixed steps of a few cm (the step up onto the rope and
      // over the edge included).
      expect(maxStep).toBeLessThan(0.2);
      expect(c.body.y).toBeCloseTo(l.top, 3);
      // Standing on the plateau a second later (not falling).
      for (let i = 0; i < 30; i++) tick(state, (now += TICK_MS));
      expect(c.body.phase).toBe("ground");
      expect(Math.abs(c.body.y - l.top)).toBeLessThan(0.05);
    }
  });

  it("go down from the top: E at the exit, S down, off onto the ground at the foot", () => {
    for (const l of ropes) {
      const state = liveMatch(l);
      const c = state.seats[0]!;
      const [ex, ey, ez] = l.rope!.exit;
      Object.assign(c.body, { x: ex, y: ey, z: ez });
      let now = 0;
      tick(state, now, [{ act: "ladder" }]);
      expect(c.body.phase).toBe("ladder");
      expect(c.body.ladder?.id).toBe(l.id);
      while (now < 120_000 && c.body.phase === "ladder") {
        for (const seat of state.seats) seat.kit.hp = 100;
        tick(state, (now += TICK_MS), [], -1);
      }
      expect(c.dead).toBe(false);
      expect(c.body.phase, `rope ${l.id}`).toBe("ground");
      const [fx, fy, fz] = l.rope!.foot;
      expect(Math.hypot(c.body.x - fx, c.body.z - fz)).toBeLessThan(1e-6);
      expect(c.body.y).toBeCloseTo(fy, 3);
      // Standing there a second later.
      for (let i = 0; i < 30; i++) tick(state, (now += TICK_MS));
      expect(c.body.phase).toBe("ground");
      expect(Math.abs(c.body.y - fy)).toBeLessThan(0.3);
    }
  });

  it("holds still with no key; E midway lets go (a fall); E near the top steps off over it", () => {
    const state = liveMatch();
    const c = state.seats[0]!;
    let now = 0;
    tick(state, now, [{ act: "ladder" }]);
    // (30 s up the first rope: on the face above the saddle.)
    while (now < 30_000) tick(state, (now += TICK_MS), [], 1);
    for (const seat of state.seats) seat.kit.hp = 100;
    const held = { ...c.body };
    for (let i = 0; i < 30; i++) tick(state, (now += TICK_MS));
    expect(c.body.y).toBe(held.y);
    expect(c.body.phase).toBe("ladder");
    // E with the rope's E again only once: a repeated E while stepping on/off does nothing.
    tick(state, (now += TICK_MS), [{ act: "ladder" }]);
    expect(c.body.phase).toBe("ground");
    for (let i = 0; i < 150; i++) tick(state, (now += TICK_MS));
    expect(c.body.grounded).toBe(true);
    // (The rope hangs 0.5 m off a 53° face here: the rock is 0.8 m under the climber.)
    expect(c.body.y).toBeLessThan(held.y - 0.7);
    // Near the top (of the shortest rope): E steps off over the edge instead.
    const short = ropes[2]!;
    const s2 = liveMatch(short);
    const c2 = s2.seats[0]!;
    let n2 = 0;
    tick(s2, n2, [{ act: "ladder" }]);
    while (c2.body.ladder && c2.body.ladder.s < short.rope!.length - 0.8)
      tick(s2, (n2 += TICK_MS), [], 1);
    tick(s2, (n2 += TICK_MS), [{ act: "ladder" }]);
    for (let i = 0; i < 40; i++) tick(s2, (n2 += TICK_MS));
    expect(c2.body.phase).toBe("ground");
    expect(c2.body.y).toBeCloseTo(short.top, 2);
  });

  it("takes hold anywhere along it: beside it on the face, or falling past it", () => {
    // Owner, 2026-11-12: "make so player can connect them self at any section at the rope, not
    // only at the end of the rope".
    for (const l of ropes) {
      const r = l.rope!;
      for (const k of [0.25, 0.5, 0.8]) {
        const s = r.length * k;
        const p = ropeAt(r, s, { x: 0, y: 0, z: 0 });
        // On the rock under the rope (half a metre in from its line), and in the air beside it.
        const rx = p.x - r.dir[0] * 0.5,
          rz = p.z - r.dir[1] * 0.5;
        for (const [x, y, z] of [
          [rx, hf.heightAt(rx, rz), rz],
          [p.x + 0.8, p.y - 0.4, p.z],
        ] as const) {
          const at = ladderReachable(hf, x, y, z);
          expect(at?.ladder.id, `${l.id} at ${k}`).toBe(l.id);
          expect(at!.end).toBe("mid");
          expect(Math.abs(at!.s! - s), `${l.id} at ${k}`).toBeLessThan(2.2);
        }
        // Out of reach: nothing.
        expect(ladderReachable(hf, p.x + 4, p.y, p.z)?.end).not.toBe("mid");
      }
    }
    // In a match: E beside the rope midway takes hold there, and the climb goes on up.
    const state = liveMatch();
    const c = state.seats[0]!;
    const r = rope.rope!;
    const p = ropeAt(r, r.length / 2, { x: 0, y: 0, z: 0 });
    Object.assign(c.body, { x: p.x + 0.7, y: p.y - 0.3, z: p.z, grounded: false });
    let now = 0;
    tick(state, now, [{ act: "ladder" }]);
    expect(c.body.phase).toBe("ladder");
    for (let i = 0; i < 30; i++) tick(state, (now += TICK_MS));
    const s0 = c.body.ladder!.s;
    expect(Math.abs(s0 - r.length / 2)).toBeLessThan(2.2);
    const on = climbPoint(rope, s0);
    expect(Math.hypot(c.body.x - on.x, c.body.y - on.y, c.body.z - on.z)).toBeLessThan(0.01);
    for (let i = 0; i < 60; i++) tick(state, (now += TICK_MS), [], 1);
    expect(c.body.ladder!.s).toBeGreaterThan(s0 + 3);
  });

  it("is drawn lying on the mountain as the terrain draws it: never off the snow, never in it", () => {
    // Owner, 2026-11-12: "just a clean rope should hang from the top to the buttom … ensure the
    // rope lays good to the mountain".
    for (const l of ropes) {
      const { pts, pull, cs } = ropeLine(hf, l.rope!);
      expect(pull.length).toBe(pts.length);
      expect(cs.filter((s) => s >= 0).length).toBeGreaterThan(l.rope!.length * 2);
      for (let k = 0; k + 1 < pts.length; k++)
        for (let t = 0; t < 1; t += 0.1) {
          const q = pts[k]!.clone().lerp(pts[k + 1]!, t);
          const m = hf.meshAt(q.x, q.z);
          // The tube's underside (radius 19 mm) off the drawn surface, square to it.
          const gap = (q.y - m.y) * m.ny - 0.019;
          expect(gap, `${l.id} ring ${k}`).toBeGreaterThan(-0.01);
          expect(gap, `${l.id} ring ${k}`).toBeLessThan(0.1);
        }
      // Pulled out by a climber, each point of the climb comes to the climb's line.
      for (let k = 0; k < pts.length; k++)
        if (cs[k]! >= 0) {
          const on = ropeAt(l.rope!, cs[k]!, { x: 0, y: 0, z: 0 });
          const q = pts[k]!.clone().add(pull[k]!);
          expect(Math.hypot(q.x - on.x, q.y - on.y, q.z - on.z)).toBeLessThan(1e-3);
        }
    }
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
