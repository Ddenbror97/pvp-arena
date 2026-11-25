import { readFileSync } from "node:fs";
import * as THREE from "three";
import { beforeAll, describe, expect, it } from "vitest";
import type { BrAct } from "@/lib/fps/br/actions";
import { stepDrop, type DropBody } from "@/lib/fps/br/drop";
import { BrFrameView } from "@/lib/fps/br/frame-view";
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
import {
  HOP_MS,
  RAPPEL,
  rappelDrop,
  rappelEnd,
  rappelNormal,
  rappelRelease,
  rappelRow,
  rappelSeen,
  rappelSite,
  readRappelRow,
  startRappel,
  type RappelSite,
} from "@/lib/fps/br/rappel";
import { poseRappelFigure, rappelFigure } from "@/lib/fps/br/rappel-view";
import type { CollisionData } from "@/lib/fps/br/static-world";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";
import { primeRappelClip, rappelClipMs } from "@/lib/fps/rappel-clip";
import { TICK_MS } from "@/lib/fps/simulation";

/**
 * Rappelling down a building (owner, 2026-11-15: "Players should be able to descend from
 * rooftops using a rope … leaning backward from the building, with their boots touching the
 * wall … controlled jumps down the building"; "there does not need to be a rope on every
 * building … close to the wall the interact window pops up"). On the real island: where a rope
 * can be thrown, the descent in hops by itself ("when user clicks on E it happens automatically"),
 * the way back up, letting go only where it is safe, the server's validation and authority, and
 * what other players are sent.
 */
const buffer = (path: string) => {
  const b = readFileSync(path);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
};
const meta = JSON.parse(readFileSync(`public${WORLD_ASSETS.meta}`, "utf8")) as WorldMeta;
const collision = JSON.parse(
  readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"),
) as CollisionData;
type Stand = { x: number; y: number; z: number; yaw: number; site: RappelSite };
let hf: Heightfield, island: Island, stands: Stand[], tall: Stand, low: Stand;

/** Every roof edge within `r` of a place that a rope can be thrown from (edge midpoints). */
function survey(cx: number, cz: number, r: number) {
  const world = island.solid,
    b = world.boxes,
    out: Stand[] = [];
  for (let i = 0; i < b.length / 6; i++) {
    const o = i * 6;
    const [x0, , z0, x1, y1, z1] = [
      b.get(o),
      0,
      b.get(o + 2),
      b.get(o + 3),
      b.get(o + 4),
      b.get(o + 5),
    ];
    const mx = (x0 + x1) / 2,
      mz = (z0 + z1) / 2;
    if (x1 - x0 < 3 || z1 - z0 < 3 || Math.hypot(mx - cx, mz - cz) > r) continue;
    if (y1 - hf.heightAt(mx, mz) < 4.5) continue;
    for (const [nx, nz, yaw] of [
      [1, 0, -Math.PI / 2],
      [-1, 0, Math.PI / 2],
      [0, 1, Math.PI],
      [0, -1, 0],
    ] as const) {
      const x = nx ? (nx > 0 ? x1 : x0) - nx * 0.5 : mx,
        z = nz ? (nz > 0 ? z1 : z0) - nz * 0.5 : mz;
      if (Math.abs(world.supportAt(x, z, 0.3, y1 + 0.05) - y1) > 0.01) continue;
      if (world.blocked(x, y1 + 0.02, z, 1.8, 0.3)) continue;
      const site = rappelSite(world, x, y1, z, yaw);
      if (site) out.push({ x, y: y1, z, yaw, site });
    }
  }
  return out;
}

beforeAll(async () => {
  hf = await decodeHeightfield(buffer(`public${WORLD_ASSETS.height}`));
  const cover = await decodeLandCover(buffer(`public${WORLD_ASSETS.landcover}`));
  island = buildIsland(hf, cover, meta, collision);
  const town = meta.pois.find((p) => p.id === "downtown")!;
  stands = survey(town.x, town.z, 420);
  const byDrop = [...stands].sort((a, b) => rappelDrop(a.site) - rappelDrop(b.site));
  tall = byDrop[byDrop.length - 1]!;
  low = byDrop.find((s) => rappelDrop(s.site) > 6 && rappelDrop(s.site) < 9)!;
}, 120_000);

const body = (s: Stand): DropBody => ({
  x: s.x,
  y: s.y,
  z: s.z,
  velocityY: 0,
  crouched: false,
  grounded: true,
  phase: "ground",
  vx: 0,
  vz: 0,
});
const route = {
  a: [0, 0] as [number, number],
  b: [1, 0] as [number, number],
  dir: [1, 0] as [number, number],
  length: 1,
};
/** One tick of the body's own step (the server's and the client's prediction). */
const step = (b: DropBody, forward = 0, strafe = 0) =>
  stepDrop(island.solid, meta, route, b, { forward, strafe, yaw: 0 }, 1e9, TICK_MS);
/** Onto the rope and through stepping over the edge. */
function hang(s: Stand) {
  const b = body(s);
  startRappel(b, s.site);
  b.phase = "rappel";
  for (let i = 0; i < 200 && b.rappel?.stage === "on"; i++) step(b);
  return b;
}

describe("where a rope can be thrown", () => {
  it("finds roof edges all over Downtown, low houses and towers alike", () => {
    expect(stands.length).toBeGreaterThan(150);
    expect(rappelDrop(tall.site)).toBeGreaterThan(40);
    expect(low).toBeTruthy();
    for (const s of stands) {
      const d = rappelDrop(s.site);
      expect(d).toBeGreaterThanOrEqual(RAPPEL.minDrop);
      expect(d).toBeLessThanOrEqual(RAPPEL.maxDrop);
      // The edge is where the player faces, within reach; the roof is what they stand on.
      const [nx, nz] = rappelNormal(s.site.dir);
      const out = (nx ? s.site.wall - s.x : s.site.wall - s.z) * (nx || nz);
      expect(out).toBeGreaterThan(0);
      expect(out).toBeLessThanOrEqual(RAPPEL.reach + 0.05);
      expect(s.site.roof).toBe(s.y);
      expect(s.site.top - s.y).toBeGreaterThanOrEqual(-0.3);
      expect(s.site.top - s.y).toBeLessThanOrEqual(RAPPEL.parapet + 0.01);
      expect(s.site.sideMin).toBeLessThanOrEqual(0);
      expect(s.site.sideMax).toBeGreaterThanOrEqual(0);
    }
  });

  it("offers nothing on the ground, in the middle of a roof, or with the back to the edge", () => {
    const world = island.solid;
    // On the street under the wall.
    const [nx, nz] = rappelNormal(low.site.dir);
    const gx = low.x + nx * 3,
      gz = low.z + nz * 3;
    for (const yaw of [0, 1.57, 3.14, -1.57])
      expect(rappelSite(world, gx, world.supportAt(gx, gz, 0.3, low.y), gz, yaw)).toBeNull();
    // Back to the edge.
    expect(rappelSite(world, low.x, low.y, low.z, low.yaw + Math.PI)).toBeNull();
    // Three metres in from it.
    expect(rappelSite(world, low.x - nx * 3, low.y, low.z - nz * 3, low.yaw)).toBeNull();
    // In the air beside it (not standing on anything).
    expect(rappelSite(world, low.x, low.y + 1, low.z, low.yaw)).toBeNull();
    // Looking a little to the side still finds the same edge.
    expect(rappelSite(world, low.x, low.y, low.z, low.yaw + 0.5)?.dir).toBe(low.site.dir);
  });
});

describe("the descent", () => {
  it("goes over the edge, down the wall in hops and onto the floor, never through anything", () => {
    const world = island.solid;
    // A spread of walls: every tenth, the lowest and the tallest.
    const some = [low, tall, ...stands.filter((_, i) => i % 10 === 0)];
    let hops = 0;
    for (const s of some) {
      const b = body(s);
      startRappel(b, s.site);
      b.phase = "rappel";
      const [nx, nz] = rappelNormal(s.site.dir);
      let last = { x: b.x, y: b.y, z: b.z },
        ticks = 0,
        far = 0,
        lowest = Infinity;
      while (b.phase === "rappel") {
        const stage = b.rappel!.stage;
        // Nothing held: it goes down by itself.
        const change = step(b);
        ticks++;
        expect(ticks, "ends").toBeLessThan(((rappelDrop(s.site) / 2) * 1000 + 8000) / TICK_MS);
        // No tick carries the body further than a fall would.
        expect(Math.hypot(b.x - last.x, b.y - last.y, b.z - last.z)).toBeLessThan(0.36);
        last = { x: b.x, y: b.y, z: b.z };
        if (change) break;
        if (stage !== "hang" || b.rappel!.stage !== "hang") continue;
        // On the rope the body keeps clear of the wall and of everything else, and goes down.
        const out = (nx ? b.x - s.site.wall : b.z - s.site.wall) * (nx || nz);
        expect(out).toBeGreaterThan(RAPPEL.standOff - 0.2);
        far = Math.max(far, out);
        expect(world.blocked(b.x, b.y + 0.2, b.z, 1.6, 0.3), `clear at ${b.y.toFixed(1)}`).toBe(
          false,
        );
        expect(b.y).toBeLessThanOrEqual(lowest + 1e-6);
        lowest = b.y;
        hops = Math.max(hops, b.rappel!.n);
      }
      // Standing on the floor at the bottom, a stride out from the wall.
      expect(b.phase).toBe("ground");
      expect(b.grounded).toBe(true);
      expect(b.rappel).toBeUndefined();
      expect(Math.abs(b.y - s.site.land)).toBeLessThan(0.45);
      expect(world.blocked(b.x, b.y + 0.05, b.z, 1.8, 0.3)).toBe(false);
      // It swung out from the wall on the way (the hops), by about a metre.
      if (rappelDrop(s.site) > 6) {
        expect(far).toBeGreaterThan(RAPPEL.standOff + 0.5);
        expect(far).toBeLessThan(RAPPEL.standOff + RAPPEL.out * (1 + RAPPEL.vary) + 0.05);
      }
    }
    expect(hops).toBeGreaterThan(10);
  });

  it("comes down the tallest wall at a few metres a second", () => {
    const b = hang(tall);
    let ticks = 0;
    while (b.phase === "rappel" && ticks++ < 4000) step(b);
    const seconds = (ticks * TICK_MS) / 1000;
    const speed = (rappelEnd(tall.site) - RAPPEL.sTop) / seconds;
    expect(speed).toBeGreaterThan(2.2);
    expect(speed).toBeLessThan(3.6);
  });

  it("hops by itself, each hop out from the wall and back to it; S only takes hold at the wall", () => {
    const b = hang(tall);
    const [nx, nz] = rappelNormal(tall.site.dir);
    const out = () => (nx ? b.x - tall.site.wall : b.z - tall.site.wall) * (nx || nz);
    const y0 = b.y;
    // Half a hop, nothing held: off the wall.
    for (let i = 0; i < Math.round((RAPPEL.hop.crouch + RAPPEL.hop.air / 2) / TICK_MS); i++)
      step(b);
    expect(b.rappel!.hop).toBeGreaterThan(0);
    expect(out()).toBeGreaterThan(RAPPEL.standOff + 0.4);
    const mid = b.y;
    // S pressed in the air: the hop runs its course (nobody stops in the air), then it climbs.
    let landed = NaN;
    for (let i = 0; i < Math.ceil(HOP_MS / TICK_MS) + 1 && Number.isNaN(landed); i++) {
      step(b, -1);
      if (b.rappel!.hop < 0) landed = b.y;
    }
    expect(b.rappel!.n).toBe(1);
    expect(y0 - landed).toBeGreaterThan(RAPPEL.drop * (1 - RAPPEL.vary) - 0.05);
    expect(y0 - landed).toBeLessThan(RAPPEL.drop * (1 + RAPPEL.vary) + 0.01);
    expect(landed).toBeLessThan(mid);
    expect(out()).toBeCloseTo(RAPPEL.standOff, 5);
    step(b, -1);
    expect(b.y).toBeGreaterThan(landed);
  });

  it("climbs back up with S, slower than it came down, and over the edge onto the roof", () => {
    const b = hang(low);
    while (b.rappel!.n < 1) step(b);
    // (The next hop had begun: S takes hold once it is back on the wall.)
    while (b.rappel!.hop >= 0) step(b, -1);
    const y0 = b.y;
    for (let i = 0; i < 30; i++) step(b, -1);
    // A second of climbing: about 1.1 m up.
    expect(b.y - y0).toBeCloseTo(RAPPEL.ascend, 1);
    expect(RAPPEL.ascend).toBeLessThan(RAPPEL.drop / (HOP_MS / 1000));
    let ticks = 0;
    while (b.phase === "rappel" && ticks++ < 600) step(b, -1);
    // Back on the roof, a stride in from the edge, standing.
    expect(b.phase).toBe("ground");
    expect(b.grounded).toBe(true);
    expect(b.y).toBe(low.site.roof);
    const [nx, nz] = rappelNormal(low.site.dir);
    const inside = (nx ? low.site.wall - b.x : low.site.wall - b.z) * (nx || nz);
    expect(inside).toBeCloseTo(RAPPEL.roofIn, 2);
    expect(island.solid.blocked(b.x, b.y + 0.05, b.z, 1.8, 0.3)).toBe(false);
  });

  it("steps along the wall with A and D, no further than the wall allows", () => {
    const wide = stands.find(
      (s) => s.site.sideMax >= 1.4 && s.site.sideMin <= -1.4 && rappelDrop(s.site) > 8,
    )!;
    const b = hang(wide);
    const along = () => (rappelNormal(wide.site.dir)[0] ? b.z : b.x) - wide.site.line;
    // (S held keeps it up on the wall meanwhile; at the top it would go over the edge.)
    for (let i = 0; i < 75; i++) step(b, 0, 1);
    expect(Math.abs(along())).toBeCloseTo(1.4, 2);
    const one = along();
    for (let i = 0; i < 150; i++) step(b, 0, -1);
    expect(along()).toBeCloseTo(-one, 2);
    // A wall with no room to one side gives none.
    const narrow = stands.find((s) => s.site.sideMax === 0 || s.site.sideMin === 0);
    if (narrow) {
      const n = hang(narrow);
      const at = () => (rappelNormal(narrow.site.dir)[0] ? n.z : n.x) - narrow.site.line;
      // (All the way down it: a short wall is soon descended, and then it is walking.)
      for (let i = 0; i < 80 && n.phase === "rappel"; i++) {
        step(n, 0, i < 40 === (narrow.site.sideMax === 0) ? 1 : -1);
        if (n.phase !== "rappel") break;
        expect(at()).toBeGreaterThanOrEqual(narrow.site.sideMin - 1e-9);
        expect(at()).toBeLessThanOrEqual(narrow.site.sideMax + 1e-9);
      }
    }
  });

  it("lets go with E only where that is safe: at the top, or a short drop from the floor", () => {
    const b = hang(tall);
    // At the top: back over the edge.
    expect(rappelRelease(b)).toBe("up");
    const c = hang(tall);
    while (c.rappel!.n < 3) step(c);
    // In a hop, half way down a tower: no.
    step(c);
    step(c);
    expect(c.rappel!.hop).toBeGreaterThan(0);
    expect(rappelRelease(c)).toBeNull();
    // At the wall there: no.
    while (c.rappel!.hop >= 0) step(c, -1);
    expect(rappelRelease(c)).toBeNull();
    expect(c.rappel!.stage).toBe("hang");
    // Near the floor: down onto it.
    let ticks = 0;
    while (rappelEnd(tall.site) - c.rappel!.s > RAPPEL.release - 0.05 && ticks++ < 4000) step(c);
    while (c.rappel!.hop >= 0) step(c, -1);
    expect(rappelRelease(c)).toBe("land");
    while (c.phase === "rappel") step(c);
    expect(c.grounded).toBe(true);
    expect(Math.abs(c.y - tall.site.land)).toBeLessThan(0.45);
  });
});

// ------------------------------------------------------------------ the server

const input = (seq: number, extra: Partial<BrInput> = {}): BrInput => ({
  seq,
  forward: 0,
  strafe: 0,
  yaw: 0,
  ...extra,
});
/** A live match: seat 0 at a roof's edge, seat 1 watching from the street under the wall. */
function liveMatch(s: Stand) {
  const state = createBrMatch(meta, 11, (x, z) => hf.heightAt(x, z));
  seatHuman(state, "roper", "Roper");
  seatHuman(state, "watcher", "Watcher");
  state.phase = "active";
  state.planeAt = -600_000;
  for (const seat of state.seats) {
    if (seat.seat > 1) seat.dead = true;
    Object.assign(seat.body, { phase: "ground", grounded: true, velocityY: 0, vx: 0, vz: 0 });
  }
  Object.assign(state.seats[0]!.body, { x: s.x, y: s.y, z: s.z });
  state.seats[0]!.yaw = s.yaw;
  const [nx, nz] = rappelNormal(s.site.dir);
  const wx = s.x + nx * 14,
    wz = s.z + nz * 14;
  Object.assign(state.seats[1]!.body, {
    x: wx,
    y: island.solid.supportAt(wx, wz, 0.3, s.y),
    z: wz,
  });
  return state;
}
function tick(state: BrMatchState, s: Stand, now: number, acts: BrAct[] = [], fwd = 0) {
  stepBrMatch(
    state,
    island.solid,
    meta,
    new Map([[0, input(Math.round(now / TICK_MS), { forward: fwd, yaw: s.yaw, fire: true })]]),
    now,
    TICK_MS,
    new Map(acts.length ? [[0, acts]] : []),
  );
}
const acts = (state: BrMatchState) =>
  state.combat.filter((e) => e.type === "act" && e.act === "rappel") as Array<{
    ok: boolean;
    reason?: string;
  }>;

describe("the server", () => {
  it("throws a rope only from a roof's edge, and the descent is its own", () => {
    const state = liveMatch(low);
    const me = state.seats[0]!;
    let now = 1000;
    // From the street: no.
    const spot = { x: me.body.x, y: me.body.y, z: me.body.z };
    Object.assign(me.body, state.seats[1]!.body, { phase: "ground", grounded: true });
    tick(state, low, (now += TICK_MS), [{ act: "rappel" }]);
    expect(acts(state).at(-1)).toMatchObject({ ok: false, reason: "No clear wall" });
    expect(me.body.phase).toBe("ground");
    // From the roof's edge: over it.
    Object.assign(me.body, spot);
    tick(state, low, (now += TICK_MS), [{ act: "rappel" }]);
    expect(acts(state).at(-1)).toMatchObject({ ok: true });
    expect(me.body.phase).toBe("rappel");
    expect(me.body.rappel).toMatchObject({ stage: "on", dir: low.site.dir, top: low.site.top });
    // The gun is down; the trigger does nothing on the rope.
    const shots = me.hands.shotsFired ?? 0;
    let ticks = 0;
    // Nothing held: the server takes the body down and onto the floor.
    while (me.body.phase === "rappel" && ticks++ < 2000) tick(state, low, (now += TICK_MS));
    expect(me.body.phase).toBe("ground");
    expect(me.body.grounded).toBe(true);
    expect(Math.abs(me.body.y - low.site.land)).toBeLessThan(0.45);
    expect(me.hands.shotsFired ?? 0).toBe(shots);
    expect(me.kit.hp).toBe(100);
    // Straight back on from the ground: nothing there to throw one from.
    tick(state, low, (now += TICK_MS), [{ act: "rappel" }]);
    expect(me.body.phase).toBe("ground");
  });

  it("sends others the wall and the stage with the row, and you your own state", () => {
    const state = liveMatch(tall);
    const sight = new BrSight();
    let now = 1000;
    tick(state, tall, (now += TICK_MS), [{ act: "rappel" }]);
    const seen: string[] = [];
    let hopSeen = 0;
    for (let i = 0; i < 260; i++) {
      tick(state, tall, (now += TICK_MS));
      const view = brViewFor(state, island.solid, sight, 1, now, new BrSeatSync());
      const row = view.players.find((r) => r[0] === 0);
      if (!row || row[4] !== 9) continue;
      const r = readRappelRow(row, 13)!;
      expect(r).toMatchObject({
        dir: tall.site.dir,
        wall: Math.round(tall.site.wall * 100) / 100,
        top: Math.round(tall.site.top * 100) / 100,
        land: Math.round(tall.site.land * 100) / 100,
      });
      if (seen.at(-1) !== r.stage) seen.push(r.stage);
      if (r.stage === "hang" && r.of > 0) hopSeen++;
    }
    expect(seen).toEqual(["on", "hang"]);
    expect(hopSeen).toBeGreaterThan(50);
    const mine = brViewFor(state, island.solid, sight, 0, now, new BrSeatSync());
    expect(mine.you.phase).toBe("rappel");
    expect(mine.you.rappel).toMatchObject({ stage: "hang", dir: tall.site.dir });
    // A player on foot has no such fields (the row ends with the guns worn on the back).
    const other = brViewFor(state, island.solid, sight, 0, now, new BrSeatSync()).players.find(
      (r) => r[0] === 1,
    )!;
    expect(other.length).toBe(13);
  });

  it("refuses E half way down a tower, and lays an eliminated player on the floor below", () => {
    const state = liveMatch(tall);
    const me = state.seats[0]!;
    let now = 1000;
    tick(state, tall, (now += TICK_MS), [{ act: "rappel" }]);
    for (let i = 0; i < 200; i++) tick(state, tall, (now += TICK_MS));
    expect(me.body.phase).toBe("rappel");
    const y = me.body.y;
    tick(state, tall, (now += TICK_MS), [{ act: "rappel" }]);
    expect(acts(state).at(-1)).toMatchObject({ ok: false, reason: "Not safe" });
    expect(me.body.phase).toBe("rappel");
    expect(Math.abs(me.body.y - y)).toBeLessThan(0.4);
    // Eliminated on the rope (the gas, everywhere past the final close).
    me.kit.hp = 0.01;
    state.planeAt = now - 100_000_000;
    for (let i = 0; i < 90 && !me.dead; i++) tick(state, tall, (now += TICK_MS));
    expect(me.dead).toBe(true);
    expect(me.body.phase).toBe("ground");
    expect(me.body.rappel).toBeUndefined();
    expect(Math.abs(me.body.y - tall.site.land)).toBeLessThan(0.45);
  });
});

describe("your own descent as it is drawn each frame (owner, 2026-11-16: it lagged a lot)", () => {
  /**
   * A client's loop: the body predicted in fixed 30 Hz steps, the view sampled every frame
   * (frame-view.ts: the body plus the part of the next step that has elapsed).
   */
  const run = (hz: number, seconds: number, sampled: boolean) => {
    // (The tallest wall: on the rope for the whole of the run.)
    const b = body(tall);
    startRappel(b, tall.site);
    b.phase = "rappel";
    const view = new BrFrameView();
    const input = { forward: 0, strafe: 0, yaw: 0 };
    const frameMs = 1000 / hz;
    const ys: number[] = [];
    let accumulator = 0,
      worst = 0;
    for (let t = 0; t < seconds * 1000 && b.phase === "rappel"; t += frameMs) {
      accumulator += frameMs;
      while (accumulator >= TICK_MS) {
        step(b);
        accumulator -= TICK_MS;
      }
      if (!sampled || b.phase !== "rappel") continue;
      // What the frame should show: this body, the elapsed part of the next step on.
      const want = structuredClone(b);
      stepDrop(island.solid, meta, route, want, input, 1e9, accumulator);
      const got = view.sample(island.solid, meta, route, b, input, 1e9, accumulator, frameMs, {
        x: 0,
        y: 0,
        z: 0,
      });
      worst = Math.max(worst, Math.hypot(got.x - want.x, got.y - want.y, got.z - want.z));
      // The stage and the hop the animation is read from run on with it, frame by frame.
      expect(got.body.rappel).toEqual(want.rappel);
      ys.push(got.y);
    }
    return { b, worst, ys };
  };

  it("drawing a frame does not move the descent on", () => {
    for (const hz of [60, 144, 240]) {
      const drawn = run(hz, 4, true),
        plain = run(hz, 4, false);
      // The same descent whether or not it was drawn (it ran ahead by every frame's part of a
      // step, two to four times as fast, and each snapshot pulled it back).
      expect(plain.b.rappel, `${hz} Hz`).toBeDefined();
      expect(drawn.b.rappel, `${hz} Hz`).toEqual(plain.b.rappel);
      expect(drawn.b.y, `${hz} Hz`).toBe(plain.b.y);
      expect(drawn.worst, `${hz} Hz`).toBeLessThan(1e-9);
    }
  });

  it("moves every frame at the descent's own speed, never back up the wall in a hop", () => {
    const { ys } = run(144, 6, true);
    expect(ys.length).toBeGreaterThan(600);
    let still = 0;
    for (let i = 1; i < ys.length; i++) {
      const dy = ys[i]! - ys[i - 1]!;
      // 144 Hz: at most 7 ms of the fastest of a hop (about 7 m/s), and no jump back.
      expect(Math.abs(dy)).toBeLessThan(0.08);
      if (dy === 0) still++;
    }
    // (Not standing still for the frames between two steps, then jumping.)
    expect(still / ys.length).toBeLessThan(0.2);
  });
});

describe("the rappel as it is drawn", () => {
  const clips = JSON.parse(readFileSync("public/fps/locomotion/rappel-v1.json", "utf8")) as {
    fps: number;
    unit: number;
    ankle: number;
    bones: string[];
    restDir: number[][];
    clips: Record<
      string,
      { loop: boolean; rot: number[][]; hips: number[][]; plant: number[][]; grip: number[][] }
    >;
  };

  it("the animation is timed to the mechanics", () => {
    primeRappelClip(clips);
    expect(Object.keys(clips.clips).sort()).toEqual(
      ["climb", "hop", "hop2", "idle", "land", "on"].sort(),
    );
    // Over the edge in the stage's time, a hop in a hop's.
    expect(rappelClipMs("on")).toBeCloseTo(RAPPEL.onMs, 0);
    expect(rappelClipMs("hop")).toBeCloseTo(HOP_MS, 0);
    expect(rappelClipMs("hop2")).toBeCloseTo(HOP_MS, 0);
    expect(Math.abs(rappelClipMs("land") - RAPPEL.landMs)).toBeLessThan(40);
    expect(clips.clips.idle!.loop && clips.clips.climb!.loop).toBe(true);
    for (const [name, c] of Object.entries(clips.clips)) {
      expect(c.hips.length, name).toBe(c.rot.length);
      expect(c.plant.length, name).toBe(c.rot.length);
      for (const row of c.rot) {
        expect(row.length, name).toBe(clips.bones.length * 4);
        for (let i = 0; i < row.length; i += 4)
          expect(Math.hypot(row[i]!, row[i + 1]!, row[i + 2]!, row[i + 3]!)).toBeCloseTo(1, 2);
      }
    }
  });

  it("the boots are on the wall where the body is, and off it in the air", () => {
    for (const name of ["hop", "hop2"]) {
      const c = clips.clips[name]!;
      const at = (ms: number) => c.plant[Math.round((ms / 1000) * clips.fps)]!;
      // Braced before the hop and after it; in the air between (the server's own times).
      expect(at(0)).toEqual([1, 1]);
      expect(at(HOP_MS)).toEqual([1, 1]);
      const air = RAPPEL.hop.crouch + RAPPEL.hop.air / 2;
      expect(at(air)).toEqual([0, 0]);
    }
    // Standing on the roof with empty hands; braced with the rope in both at the end.
    const on = clips.clips.on!;
    expect(on.plant[0]).toEqual([0, 0]);
    expect(on.grip[0]).toEqual([0, 0]);
    expect(on.plant.at(-1)).toEqual([1, 1]);
    expect(on.grip.at(-1)).toEqual([1, 1]);
    // The landing ends standing, the rope let go.
    expect(clips.clips.land!.grip.at(-1)).toEqual([0, 0]);
    // Upright on the roof: the hips over the body's point at their own height.
    const [hx, hy, hz] = on.hips[0]!;
    expect(Math.hypot(hx!, hz!)).toBeLessThan(0.05);
    expect(hy).toBeCloseTo(1, 1);
  });

  it("a stage plays its clip, the root on the wall facing it", () => {
    primeRappelClip(clips);
    const f = rappelFigure();
    const root = new THREE.Object3D();
    const seen = {
      dir: 0 as const,
      wall: 10,
      line: 5,
      top: 30,
      land: 14,
      stage: "on" as const,
      of: 0,
    };
    const pose = (s: Partial<typeof seen> & { stage: string }, x: number, y: number, now: number) =>
      poseRappelFigure(f, { ...seen, ...s } as never, x, y, 5, 1.2, now, 33, root, null);
    // Over the edge: the clip at the stage's own pace, turning from the way it faced.
    let m = pose({ stage: "on", of: 0 }, 9.4, 30, 1000);
    expect(m.clip).toBe("on");
    expect(m.ms).toBe(0);
    expect(root.rotation.y).toBeCloseTo(1.2, 5);
    m = pose({ stage: "on", of: 0.5 }, 10.4, 29.5, 1850);
    expect(m.ms).toBeCloseTo(RAPPEL.onMs / 2, 0);
    // Facing the wall (its normal is +x: the root's −z is −x), the wall that far in front.
    const facing = new THREE.Vector3(0, 0, -1).applyQuaternion(root.quaternion);
    expect(facing.x).toBeCloseTo(-1, 3);
    expect(m.wall).toBeCloseTo(0.4, 5);
    // The rope's edge, in the character's own space: ahead of it and above.
    expect(m.lip[2]).toBeCloseTo(-0.4, 3);
    expect(m.lip[1]).toBeCloseTo(0.5, 3);
    // Braced; then hops, the two in turn; then braced again.
    m = pose({ stage: "hang", of: 0 }, 10.8, 28, 2700);
    expect(m.clip).toBe("idle");
    m = pose({ stage: "hang", of: 0.5 }, 11.5, 27, 2733);
    const first = m.clip;
    expect(["hop", "hop2"]).toContain(first);
    expect(m.ms).toBeCloseTo(HOP_MS / 2, 0);
    expect(f.hop).toBe(0.5);
    m = pose({ stage: "hang", of: 0.05 }, 10.8, 25.3, 3200);
    expect(m.clip).toBe(first === "hop" ? "hop2" : "hop");
    m = pose({ stage: "hang", of: 0 }, 10.8, 22.6, 4100);
    expect(m.clip).toBe("idle");
    expect(f.hop).toBe(-1);
    // Walking on the wall: the climb, its phase the height.
    for (let i = 1; i <= 20; i++)
      m = pose({ stage: "hang", of: 0 }, 10.8, 22.6 + i * 0.04, 4100 + i * 33);
    expect(m.clip2).toBe("climb");
    expect(m.mix).toBeGreaterThan(0.9);
    // The landing; and off the rope the figure is free for the next one.
    m = pose({ stage: "land", of: 1 }, 10.6, 14, 6000);
    expect(m.clip).toBe("land");
    expect(m.ms).toBeCloseTo(rappelClipMs("land"), 0);
  });

  it("one's own rope reads as the row others are sent", () => {
    const b = hang(stands[0]!);
    for (let i = 0; i < 40; i++) {
      step(b);
      if (!b.rappel) break;
      const row = readRappelRow(rappelRow(b.rappel), 0)!;
      const own = rappelSeen(b.rappel, {} as never);
      expect(own.stage).toBe(row.stage);
      expect(own.of).toBeCloseTo(row.of, 2);
      expect(own.wall).toBeCloseTo(row.wall, 1);
      expect(own.top).toBeCloseTo(row.top, 1);
    }
  });
});
