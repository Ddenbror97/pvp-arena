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
  LADDER,
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
import type { CollisionData } from "@/lib/fps/br/static-world";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";
import { ZIP_STAND, ZIPLINE, zipReachable, zipStations } from "@/lib/fps/br/zipline";
import { TICK_MS } from "@/lib/fps/simulation";

/**
 * The Iron Peaks watchtower's ladder (owner, 2026-11-11): up its east face onto the deck by the
 * zip-line, climbed with the Mixamo clip. The route clear, the server's validation and authority
 * (up, onto the deck, down, letting go, eliminated on it) and replication from the row alone.
 */
const buffer = (path: string) => {
  const b = readFileSync(path);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
};
const meta = JSON.parse(readFileSync(`public${WORLD_ASSETS.meta}`, "utf8")) as WorldMeta;
const collision = JSON.parse(
  readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"),
) as CollisionData;
let hf: Heightfield, island: Island, ladder: Ladder;
beforeAll(async () => {
  hf = await decodeHeightfield(buffer(`public${WORLD_ASSETS.height}`));
  const cover = await decodeLandCover(buffer(`public${WORLD_ASSETS.landcover}`));
  island = buildIsland(hf, cover, meta, collision);
  ladder = ladders(hf)[0]!;
});
const groundAt = (x: number, z: number) => hf.heightAt(x, z);
const input = (seq: number, extra: Partial<BrInput> = {}): BrInput => ({
  seq,
  forward: 0,
  strafe: 0,
  yaw: 0,
  ...extra,
});

/** A live match: seat 0 at the foot of the ladder, seat 1 watching from 20 m away. */
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
  const foot = climbPoint(ladder, 0);
  Object.assign(state.seats[0]!.body, { x: foot.x + 0.5, y: foot.y, z: foot.z });
  const wx = foot.x + 20;
  Object.assign(state.seats[1]!.body, { x: wx, y: groundAt(wx, foot.z), z: foot.z });
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

describe("Iron Peaks watchtower ladder", () => {
  it("runs from the ground up the tower's east face to the open corner of its deck", () => {
    expect(ladder.top).toBeCloseTo(ZIPLINE.tower.y + ZIPLINE.deckY, 3);
    const base = climbPoint(ladder, 0);
    // Foot on the ground, free to stand at; the exit on the deck's floor, free to stand on.
    expect(island.solid.supportAt(base.x, base.z, 0.35, base.y + 0.3)).toBeCloseTo(
      ladder.bottom,
      1,
    );
    expect(island.solid.blocked(base.x, ladder.bottom + 0.05, base.z, 1.75, 0.3)).toBe(false);
    expect(
      island.solid.supportAt(ladder.exit.x, ladder.exit.z, 0.35, ladder.top + 0.3),
    ).toBeCloseTo(ladder.top, 2);
    expect(island.solid.blocked(ladder.exit.x, ladder.top + 0.05, ladder.exit.z, 1.75, 0.35)).toBe(
      false,
    );
    expect(ladderHeight(ladder)).toBeGreaterThan(6);
    // The climber's column (body and head) is clear of the tower, the zip-line's stays and posts.
    for (let s = 0; s <= ladderHeight(ladder); s += 0.2) {
      const p = climbPoint(ladder, s);
      expect(island.solid.blocked(p.x, p.y + 0.05, p.z, 1.75, 0.3), `${s.toFixed(1)} m`).toBe(
        false,
      );
    }
    // No stay runs through the climber's column or the step onto the deck (≥ 0.6 m off it
    // below head height at the top).
    const { stays } = zipStations(groundAt);
    const foot = climbPoint(ladder, 0);
    const offPath = (x: number, z: number) => {
      const dx = ladder.exit.x - foot.x,
        dz = ladder.exit.z - foot.z;
      const t = Math.max(
        0,
        Math.min(1, ((x - foot.x) * dx + (z - foot.z) * dz) / (dx * dx + dz * dz)),
      );
      return Math.hypot(x - foot.x - dx * t, z - foot.z - dz * t);
    };
    for (const st of stays)
      for (let t = 0; t <= 1; t += 0.002) {
        const x = st.from[0] + (st.to[0] - st.from[0]) * t,
          y = st.from[1] + (st.to[1] - st.from[1]) * t,
          z = st.from[2] + (st.to[2] - st.from[2]) * t;
        if (y < ladder.top + 2.1)
          expect(offPath(x, z), `stay at ${t.toFixed(3)}`).toBeGreaterThan(0.6);
      }
  });

  it("climbs up on E and W, steps onto the deck, and can take the zip-line from there", () => {
    const state = liveMatch();
    const c = state.seats[0]!;
    // Too far: refused.
    c.body.x += 3;
    tick(state, 0, [{ act: "ladder" }]);
    expect(c.body.phase).toBe("ground");
    expect(state.combat.some((e) => e.type === "act" && e.act === "ladder" && !e.ok)).toBe(true);
    c.body.x -= 3;
    let now = TICK_MS;
    tick(state, now, [{ act: "ladder" }]);
    expect(c.body.phase).toBe("ladder");
    expect(state.events).toContainEqual({ seat: 0, phase: "ladder" });
    const start = now;
    let topAt = -1;
    let maxStep = 0,
      last = { ...c.body };
    while (now < start + 15_000 && topAt < 0) {
      now += TICK_MS;
      tick(state, now, [{ act: "ladder" }, { act: "exit" }], 1);
      maxStep = Math.max(
        maxStep,
        Math.hypot(c.body.x - last.x, c.body.y - last.y, c.body.z - last.z),
      );
      last = { ...c.body };
      expect(state.combat.some((e) => e.type === "shot" && e.seat === 0)).toBe(false);
      if (c.body.phase === "ground") topAt = now;
    }
    const secs = (topAt - start) / 1000;
    const expected = (LADDER.onMs + LADDER.offMs) / 1000 + ladderHeight(ladder) / LADDER.speed;
    expect(Math.abs(secs - expected)).toBeLessThan(0.15);
    expect(maxStep).toBeLessThan(0.12); // smooth: no jump of more than a few cm per tick
    expect(c.body.y).toBeCloseTo(ladder.top, 3);
    expect(Math.hypot(c.body.x - ladder.exit.x, c.body.z - ladder.exit.z)).toBeLessThan(1e-6);
    expect(c.body.ladder).toBeUndefined();
    // Standing on the deck (not falling) a second later.
    for (let i = 0; i < 30; i++) tick(state, (now += TICK_MS));
    expect(c.body.y).toBeCloseTo(ladder.top, 3);
    // The zip-line's handle is a step away.
    Object.assign(c.body, { x: ZIP_STAND.x, z: ZIP_STAND.z });
    expect(zipReachable(c.body.x, c.body.y, c.body.z)).toBe(true);
  });

  it("goes down from the deck: E at the top, S down, off at the foot", () => {
    const state = liveMatch();
    const c = state.seats[0]!;
    Object.assign(c.body, { x: ladder.exit.x - 0.3, y: ladder.top, z: ladder.exit.z });
    expect(ladderReachable(hf, c.body.x, c.body.y, c.body.z)?.end).toBe("top");
    let now = 0;
    tick(state, now, [{ act: "ladder" }]);
    expect(c.body.phase).toBe("ladder");
    while (now < 15_000 && c.body.phase === "ladder") tick(state, (now += TICK_MS), [], -1);
    expect(c.body.phase).toBe("ground");
    const foot = climbPoint(ladder, 0);
    expect(Math.hypot(c.body.x - foot.x, c.body.z - foot.z)).toBeLessThan(1e-6);
    expect(c.body.y).toBeCloseTo(ladder.bottom, 3);
    expect(now / 1000).toBeLessThan(
      ladderHeight(ladder) / LADDER.speed + LADDER.offMs / 1000 + 0.1,
    );
  });

  it("lets go on jump (falling to the ground) and holds still with no key", () => {
    const state = liveMatch();
    const c = state.seats[0]!;
    let now = 0;
    tick(state, now, [{ act: "ladder" }]);
    while (now < 3000) tick(state, (now += TICK_MS), [], 1);
    const held = c.body.y;
    for (let i = 0; i < 20; i++) tick(state, (now += TICK_MS));
    expect(c.body.y).toBe(held);
    expect(c.body.phase).toBe("ladder");
    tick(state, (now += TICK_MS), [], 0, true);
    expect(c.body.phase).toBe("ground");
    for (let i = 0; i < 60; i++) tick(state, (now += TICK_MS));
    expect(c.body.grounded).toBe(true);
    expect(c.body.y).toBeLessThan(held - 1);
    expect(Math.abs(c.body.y - groundAt(c.body.x, c.body.z))).toBeLessThan(0.3);
  });

  it("drops an eliminated climber and their gear at the foot", () => {
    const state = liveMatch();
    const c = state.seats[0]!;
    let now = 0;
    tick(state, now, [{ act: "ladder" }]);
    while (now < 3500) tick(state, (now += TICK_MS), [], 1);
    expect(c.body.phase).toBe("ladder");
    c.kit.hp = 0.01;
    c.kit.bag.push({ item: "bandage", qty: 2 });
    state.planeAt = now - 100_000_000; // past the final close: the gas everywhere
    for (let i = 0; i < 90 && !c.dead; i++) tick(state, (now += TICK_MS), [], 1);
    expect(c.dead).toBe(true);
    expect(c.body.phase).toBe("ground");
    expect(c.body.ladder).toBeUndefined();
    expect(Math.abs(c.body.y - ladder.bottom)).toBeLessThan(0.5);
    const items = [...state.loot.items.values()].filter(
      (i) => Math.hypot(i.x - c.body.x, i.z - c.body.z) < 4,
    );
    expect(items.length).toBeGreaterThan(0);
    for (const i of items) expect(i.y).toBeLessThan(ladder.bottom + 1);
  });

  it("replicates the climb from the row alone; the client's prediction matches", () => {
    const state = liveMatch();
    const c = state.seats[0]!;
    let now = 0;
    tick(state, now, [{ act: "ladder" }]);
    while (now < 2500) tick(state, (now += TICK_MS), [], 1);
    const watcher = brViewFor(state, island.solid, new BrSight(), 1, now, new BrSeatSync());
    const row = watcher.players.find((r) => r[0] === 0)!;
    expect(row[4]).toBe(7);
    const seen = climbAt(hf, row[1]!, row[2]!, row[3]!);
    expect(seen?.ladder.id).toBe(0);
    expect(Math.abs(seen!.s - c.body.ladder!.s)).toBeLessThan(0.02);
    const own = brViewFor(state, island.solid, new BrSight(), 0, now, new BrSeatSync());
    expect(own.you.phase).toBe("ladder");
    expect(own.you.ladder).toEqual(c.body.ladder);
    const copy: DropBody = { ...c.body, ladder: { ...c.body.ladder! } };
    for (let i = 0; i < 40; i++) {
      stepDrop(island.solid, meta, state.route, copy, input(i, { forward: 1 }), 0, TICK_MS);
      tick(state, (now += TICK_MS), [], 1);
    }
    expect(Math.hypot(copy.x - c.body.x, copy.y - c.body.y, copy.z - c.body.z)).toBeLessThan(1e-9);
  });
});
