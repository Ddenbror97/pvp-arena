import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { BrInputQueue } from "../workers/fps/br-input";
import { decodeHeightfield, type Heightfield } from "@/lib/fps/br/heightfield";
import { pickUp } from "@/lib/fps/br/inventory";
import { buildIsland } from "@/lib/fps/br/island";
import { BR_LAG, BrRemoteTimeline, brRewindMs, brViewLookbackMs } from "@/lib/fps/br/lag";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { createBrMatch, seatHuman, stepBrMatch, type BrInput } from "@/lib/fps/br/match";
import type { CollisionData, StaticWorld } from "@/lib/fps/br/static-world";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";
import { TICK_MS } from "@/lib/fps/simulation";

/**
 * Battle royale hit registration under latency (netcode audit 2026-11-11), end to end on the
 * real pieces: the shared match step and projectiles, the room's input queue and rewind
 * (lag.ts), and the client's playback timeline. A target runs across the shooter's view at
 * 5 m/s; the shooter fires at the target exactly as their client draws it.
 */
const buffer = (path: string) => {
  const f = readFileSync(path);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const meta = JSON.parse(readFileSync("public/fps/br/world.v1.json", "utf8")) as WorldMeta;
const collision = JSON.parse(
  readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"),
) as CollisionData;
let hf: Heightfield, world: StaticWorld;
beforeAll(async () => {
  hf = await decodeHeightfield(buffer("public/fps/br/height.v1.hf"));
  const cover = await decodeLandCover(buffer("public/fps/br/landcover.v1.lc"));
  world = buildIsland(hf, cover, meta, collision).solid;
}, 60_000);

type Aim = "drawn" | "beside" | "current";
/** Deterministic jitter in [0, 1). */
const noise = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

function run(rttMs: number, aim: Aim, opts: { jitterMs?: number; legacy?: boolean } = {}) {
  const down = rttMs / 2,
    up = rttMs / 2,
    jitter = opts.jitterMs ?? 0;
  const state = createBrMatch(meta, 7, (x, z) => hf.heightAt(x, z));
  seatHuman(state, "u1", "One");
  seatHuman(state, "u2", "Two");
  state.phase = "active";
  const [ax, az] = meta.runways[0]!.a,
    [bx, bz] = meta.runways[0]!.b;
  const len = Math.hypot(bx - ax, bz - az);
  const ux = (bx - ax) / len,
    uz = (bz - az) / len;
  const put = (seat: number, along: number, side: number) => {
    const b = state.seats[seat]!.body;
    b.x = ax + ux * along - uz * side;
    b.z = az + uz * along + ux * side;
    b.y = world.supportAt(b.x, b.z, 0.35, 1e4);
    b.phase = "ground";
    b.grounded = true;
    b.velocityY = 0;
  };
  for (const s of state.seats) put(s.seat, 100 + s.seat * 6, 40);
  // The target runs along the runway, across the view of the shooter 12 m to its side.
  put(1, 270, 0);
  put(0, 283, 12);
  const me = state.seats[0]!,
    target = state.seats[1]!;
  target.kit.hp = 1e6;
  pickUp(me.kit, { item: "ak47", qty: 1, mag: 30 });
  // Running along +axis: forward is (−sin yaw, −cos yaw).
  const runYaw = Math.atan2(-ux, -uz);

  const queue = new BrInputQueue();
  const timeline = new BrRemoteTimeline();
  const snapshots: Array<{ at: number; arrives: number; x: number; y: number; z: number }> = [];
  const received: typeof snapshots = [];
  const inFlight: Array<{ arrives: number; input: BrInput; viewMs: number }> = [];
  let tick = 0,
    seq = 0,
    shots = 0,
    hits = 0,
    lastYaw = 0,
    lastPitch = 0,
    lastArrival = 0;
  const FRAME = 1000 / 60;
  const fireEvery = 457;
  let nextShot = 1500;
  // Ten shots, then time for the last to arrive, be applied and land.
  const end = 1500 + fireEvery * 9.5 + rttMs / 2 + 150;
  for (let local = 0; local < end; local += FRAME) {
    // The room: every tick due by now.
    while ((tick + 1) * TICK_MS <= local) {
      tick++;
      const clock = tick * TICK_MS;
      for (let i = 0; i < inFlight.length;)
        if (inFlight[i]!.arrives <= clock) {
          const f = inFlight.splice(i, 1)[0]!;
          queue.push(f.input, f.arrives, f.viewMs);
        } else i++;
      const taken = queue.take(clock, clock);
      const mine: BrInput =
        taken ??
        ({
          seq: seq++,
          forward: 0,
          strafe: 0,
          yaw: lastYaw,
          pitch: lastPitch,
          aim: true,
        } as BrInput);
      if (opts.legacy) delete mine.rewindMs;
      const inputs = new Map<number, BrInput>([
        [0, mine],
        [1, { seq: tick, forward: 1, strafe: 0, yaw: runYaw }],
      ]);
      stepBrMatch(state, world, meta, inputs, clock, TICK_MS, new Map());
      for (const e of state.combat) {
        if (e.type === "shot" && e.seat === 0) shots++;
        if (e.type === "hit" && e.victim === 1) hits++;
      }
      if (tick % 2 === 0) {
        const late = jitter ? noise(tick) * jitter : 0;
        const arrives = Math.max(lastArrival, clock + down + late);
        lastArrival = arrives;
        snapshots.push({
          at: clock,
          arrives,
          x: target.body.x,
          y: target.body.y,
          z: target.body.z,
        });
      }
    }
    // The shooter's client: packets that have arrived, then this frame.
    while (snapshots.length && snapshots[0]!.arrives <= local) {
      const s = snapshots.shift()!;
      if (timeline.observe(s.at, s.arrives)) received.push(s);
    }
    const at = timeline.sample(local, FRAME);
    if (local >= nextShot && received.length >= 2) {
      nextShot += fireEvery;
      let a = received[0]!,
        b = received.at(-1)!;
      for (let i = 0; i + 1 < received.length; i++)
        if (received[i]!.at <= at && received[i + 1]!.at >= at) {
          a = received[i]!;
          b = received[i + 1]!;
          break;
        }
      const k = b.at > a.at ? Math.min(1, Math.max(0, (at - a.at) / (b.at - a.at))) : 1;
      let tx = a.x + (b.x - a.x) * k,
        tz = a.z + (b.z - a.z) * k;
      const ty = a.y + (b.y - a.y) * k;
      if (aim === "current") {
        // Where the room will have the target when this shot reaches it (5 m/s along the runway).
        tx = target.body.x + ux * 5 * (up / 1000);
        tz = target.body.z + uz * 5 * (up / 1000);
      } else if (aim === "beside") {
        // 0.75 m behind the drawn target: 0.4 m clear of its 0.7 m body.
        tx -= ux * 0.75;
        tz -= uz * 0.75;
      }
      const dx = tx - me.body.x,
        dz = tz - me.body.z;
      lastYaw = Math.atan2(-dx, -dz);
      lastPitch = Math.atan2(ty + 1.17 - (me.body.y + 1.6), Math.hypot(dx, dz));
      inFlight.push({
        arrives: local + up,
        input: {
          seq: seq++,
          forward: 0,
          strafe: 0,
          yaw: lastYaw,
          pitch: lastPitch,
          aim: true,
          fire: true,
          playbackMs: timeline.playbackMs,
        },
        viewMs: brViewLookbackMs(rttMs, timeline.playbackMs),
      });
    }
  }
  return { shots, hits, playbackMs: timeline.playbackMs };
}

describe("battle royale hit registration under latency", () => {
  it.each([20, 50, 100, 150, 180])(
    "at %i ms ping, a shot at the enemy as drawn hits; beside it or at its server position misses",
    (rtt) => {
      const drawn = run(rtt, "drawn");
      expect(drawn.shots).toBe(10);
      expect(drawn.hits).toBe(drawn.shots);
      const beside = run(rtt, "beside");
      expect(beside.shots).toBe(10);
      expect(beside.hits).toBe(0);
      // No double compensation: where the enemy is on the server now is over a body away.
      if (rtt >= 150) expect(run(rtt, "current").hits).toBe(0);
    },
  );
  it("still registers on a jittery connection, with a wider playback delay", () => {
    for (const rtt of [60, 140]) {
      const r = run(rtt, "drawn", { jitterMs: 30 });
      expect(r.hits).toBe(r.shots);
      expect(r.playbackMs).toBeGreaterThan(run(rtt, "drawn").playbackMs + 10);
      expect(r.playbackMs).toBeLessThanOrEqual(BR_LAG.playbackMaxMs);
      expect(run(rtt, "beside", { jitterMs: 30 }).hits).toBe(0);
    }
  });
  it("documents the fault this fixes: rewinding by the playback delay alone misses at 150 ms", () => {
    const old = run(150, "drawn", { legacy: true });
    expect(old.shots).toBe(10);
    expect(old.hits).toBe(0);
  });
  it("bounds every part of the rewind and ignores a client's claims", () => {
    expect(brViewLookbackMs(NaN, 110)).toBe(110);
    expect(brViewLookbackMs(60, 5)).toBe(60 + BR_LAG.playbackMinMs);
    expect(brViewLookbackMs(60, 99999)).toBe(60 + BR_LAG.playbackMaxMs);
    expect(brViewLookbackMs(900, 170)).toBe(BR_LAG.maxViewMs);
    expect(brRewindMs(250, 40)).toBe(290);
    expect(brRewindMs(9999, 9999)).toBe(BR_LAG.maxViewMs + BR_LAG.maxServerDelayMs);
    expect(brRewindMs(250, -5)).toBe(250);
    // The queue stamps the rewind; a held (repeated) input carries none and never fires.
    const q = new BrInputQueue();
    q.push({ seq: 1, forward: 1, strafe: 0, yaw: 0, fire: true, playbackMs: 110 }, 1000, 230);
    expect(q.take(1020, 1020)).toMatchObject({ fire: true, rewindMs: 250 });
    const held = q.take(1053, 1053)!;
    expect(held.fire).toBe(false);
    expect(held.rewindMs).toBeUndefined();
  });
});

describe("battle royale remote playback timeline", () => {
  const play = (jitterMs: number) => {
    const t = new BrRemoteTimeline();
    let starved = 0,
      backwards = 0,
      frames = 0,
      newest = -Infinity,
      previous = -Infinity,
      lastArrival = 0;
    const packets: Array<{ at: number; arrives: number }> = [];
    for (let k = 1; k < 400; k++) {
      const at = k * 2 * TICK_MS;
      lastArrival = Math.max(lastArrival, at + 70 + noise(k) * jitterMs);
      packets.push({ at, arrives: lastArrival });
    }
    for (let local = 0; local < 26_000; local += 1000 / 60) {
      while (packets.length && packets[0]!.arrives <= local) {
        const p = packets.shift()!;
        if (t.observe(p.at, p.arrives)) newest = p.at;
      }
      const at = t.sample(local, 1000 / 60);
      if (local < 6000) continue; // adapting
      frames++;
      if (at > newest + 0.5) starved++;
      if (at < previous) backwards++;
      previous = at;
    }
    return { starved: starved / frames, backwards, delay: t.playbackMs };
  };
  it("never runs backwards, and stays inside the received snapshots as jitter grows", () => {
    for (const jitter of [0, 15, 40]) {
      const r = play(jitter);
      expect(r.backwards).toBe(0);
      expect(r.starved, `jitter ${jitter}`).toBeLessThan(0.02);
      expect(r.delay).toBeGreaterThanOrEqual(BR_LAG.playbackMinMs);
      expect(r.delay).toBeLessThanOrEqual(BR_LAG.playbackMaxMs);
    }
    expect(play(0).delay).toBeLessThan(play(40).delay);
  });
  it("ignores duplicates and restarts after the room's clock goes back", () => {
    const t = new BrRemoteTimeline();
    expect(t.observe(1000, 50)).toBe(true);
    expect(t.observe(1000, 60)).toBe(false);
    expect(t.observe(900, 70)).toBe(false);
    // A restarted room: its clock is back at the start.
    expect(t.observe(60_000, 80)).toBe(true);
    expect(t.observe(100, 5000)).toBe(true);
    expect(t.observe(133, 5033)).toBe(true);
  });
});
