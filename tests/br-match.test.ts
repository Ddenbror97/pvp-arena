import { WORLD_ASSETS } from "@/lib/fps/br/world";
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { routeMs } from "@/lib/fps/br/drop";
import { decodeHeightfield, type Heightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import {
  BR_RULES,
  BrSight,
  BrSeatSync,
  brViewFor,
  checkpointBrMatch,
  createBrMatch,
  releaseSeat,
  restoreBrMatch,
  seatHuman,
  stepBrMatch,
  validateBrInput,
  type BrInput,
  type BrMatchState,
  type BrCheckpoint,
} from "@/lib/fps/br/match";
import { zoneAt } from "@/lib/fps/br/zone";
import type { CollisionData, StaticWorld } from "@/lib/fps/br/static-world";
import type { WorldMeta } from "@/lib/fps/br/world";
import { TICK_MS } from "@/lib/fps/simulation";

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
});
const heightAt = (x: number, z: number) => hf.heightAt(x, z);
const input = (seq: number, extra: Partial<BrInput> = {}): BrInput => ({
  seq,
  forward: 0,
  strafe: 0,
  yaw: 0,
  ...extra,
});

/** Runs the match until `done` or `maxMs`; returns per-tick ms. */
function run(
  state: BrMatchState,
  done: (s: BrMatchState) => boolean,
  inputsAt: (now: number) => Map<number, BrInput> = () => new Map(),
  maxMs = 400_000,
  start = 0,
) {
  const ticks: number[] = [];
  for (let now = start; now < start + maxMs && !done(state); now += TICK_MS) {
    const a = performance.now();
    stepBrMatch(state, world, meta, inputsAt(now), now, TICK_MS);
    ticks.push(performance.now() - a);
  }
  return ticks;
}

describe("Project Island match (Phase 2 core)", () => {
  it("replicates and restores crouch-jump contraction so prediction cannot apply it twice", () => {
    const state = createBrMatch(meta, 7, heightAt);
    seatHuman(state, "jumper", "Jumper");
    Object.assign(state.seats[0]!.body, {
      phase: "ground",
      grounded: false,
      crouched: true,
      airCrouchOffset: 0.65,
    });
    const snapshot = brViewFor(state, world, new BrSight(), 0, 1000, new BrSeatSync());
    expect(snapshot.you.airCrouchOffset).toBe(0.65);
    const restored = restoreBrMatch(
      meta,
      heightAt,
      JSON.parse(JSON.stringify(checkpointBrMatch(state))),
    );
    expect(restored.seats[0]!.body.airCrouchOffset).toBe(0.65);
  });
  it("reveals the circle globally only at flight end, even for early landings and spectators", () => {
    const state = createBrMatch(meta, 7, heightAt);
    state.phase = "plane";
    state.planeAt = 60_000;
    state.zoneNow = zoneAt(state.zone, 0);
    state.seats[0]!.body.phase = "ground";
    state.seats[1]!.body.phase = "parachute";
    state.seats[2]!.dead = true;
    state.seats[2]!.spectate = 0;
    const sight = new BrSight();
    for (const durationMs of [50_000, 30_000]) {
      state.route.durationMs = durationMs;
      for (const seat of [0, 1, 2, 3]) {
        const sync = new BrSeatSync();
        for (const elapsed of [0, durationMs - 1])
          expect(
            brViewFor(state, world, sight, seat, state.planeAt + elapsed, sync).zone,
          ).toBeUndefined();
        const view = brViewFor(state, world, sight, seat, state.planeAt + durationMs, sync);
        expect(view.route).toBeUndefined();
        expect(view.zone).toMatchObject({ nx: state.zone.circles[1]!.x, until: 420_000 });
      }
    }
  });

  it("persists exact route and zone timing through JSON and changed restore options", () => {
    const state = createBrMatch(meta, 7, heightAt, [], { zoneTimeScale: 0.3 });
    state.phase = "plane";
    state.planeAt = 60_000;
    // Saved geometry and duration must win over regeneration as well as current defaults.
    state.route.a[0] += 10;
    state.route.durationMs = 42_000;
    state.zone.circles[1]!.x += 10;
    const saved = JSON.parse(JSON.stringify(checkpointBrMatch(state)));
    const restored = restoreBrMatch(meta, heightAt, saved, { zoneTimeScale: 2, open: () => false });
    expect(restored.route).toEqual(state.route);
    expect(restored.zone).toEqual(state.zone);
    expect(restored.planeAt).toBe(state.planeAt);
    expect(restored.bots).toEqual(state.bots);
    for (const t of [0, 41_999, 42_000, 360_000, 495_000])
      expect(zoneAt(restored.zone, t)).toEqual(zoneAt(state.zone, t));
  });

  it("restores checkpoints without plans using the legacy 30 s flight and 1,330 s schedule", () => {
    const state = createBrMatch(meta, 7, heightAt);
    const saved: BrCheckpoint = JSON.parse(JSON.stringify(checkpointBrMatch(state)));
    delete saved.zone;
    delete saved.route;
    const restored = restoreBrMatch(meta, heightAt, saved);
    expect(routeMs(restored.route)).toBe(30_000);
    expect(restored.zone.times).toEqual([
      [300_000, 450_000],
      [540_000, 665_000],
      [745_000, 840_000],
      [900_000, 975_000],
      [1_025_000, 1_085_000],
      [1_125_000, 1_175_000],
      [1_205_000, 1_250_000],
      [1_270_000, 1_330_000],
    ]);
    expect(restored.zone.circles).toEqual(state.zone.circles);
    const again = restoreBrMatch(
      meta,
      heightAt,
      JSON.parse(JSON.stringify(checkpointBrMatch(restored))),
    );
    expect(again.route).toEqual(restored.route);
    expect(again.zone).toEqual(restored.zone);
    saved.route = { ...restored.route };
    delete saved.route.durationMs;
    expect(routeMs(restoreBrMatch(meta, heightAt, saved).route)).toBe(30_000);
    const scaled = restoreBrMatch(meta, heightAt, saved, { zoneTimeScale: 0.3 });
    expect(scaled.zone.times.at(-1)![1]).toBe(399_000);
  });

  it("warms up on the airfield before take-off: hits show, nobody is hurt, all reset at take-off", () => {
    const state = createBrMatch(meta, 5, heightAt);
    const me = seatHuman(state, "user-w", "Warm");
    stepBrMatch(state, world, meta, new Map(), 0, TICK_MS);
    expect(state.phase).toBe("starting");
    expect(BR_RULES.countdownMs).toBe(60_000);
    const s = state.seats[me]!;
    expect(s.body.phase).toBe("ground");
    expect(
      Math.hypot(s.body.x - BR_RULES.warmupCentre[0], s.body.z - BR_RULES.warmupCentre[1]),
    ).toBeLessThan(260);
    expect(s.kit.guns[0]).not.toBeNull();
    const warm = state.seats.filter((x) => x.body.phase === "ground");
    expect(warm.length).toBe(1 + BR_RULES.warmupBots);
    // The human fires at a bot 12 m in front (which answers) for 20 s: hits land, nobody
    // loses health or dies.
    const bot = state.seats.find((x) => x.bot && x.body.phase === "ground")!;
    let hits = 0;
    let now = TICK_MS;
    for (; now < 20_000; now += TICK_MS) {
      bot.body.x = s.body.x - Math.sin(s.yaw) * 12;
      bot.body.z = s.body.z - Math.cos(s.yaw) * 12;
      bot.body.y = world.supportAt(bot.body.x, bot.body.z, 0.35, 1e4);
      const pitch = Math.atan2(bot.body.y - s.body.y, 12);
      stepBrMatch(
        state,
        world,
        meta,
        new Map([[me, input(now, { fire: true, yaw: s.yaw, pitch })]]),
        now,
        TICK_MS,
      );
      hits += state.combat.filter((e) => e.type === "hit").length;
      expect(state.combat.some((e) => e.type === "elim")).toBe(false);
    }
    expect(hits).toBeGreaterThan(0);
    expect(state.seats.every((x) => !x.dead && x.kit.hp === 100)).toBe(true);
    // Take-off: everyone on the plane with an empty loadout.
    for (; state.phase === "starting"; now += TICK_MS)
      stepBrMatch(state, world, meta, new Map([[me, input(now)]]), now, TICK_MS);
    expect(state.phase).toBe("plane");
    for (const x of state.seats) {
      expect(x.body.phase).toBe("plane");
      expect(x.kit.guns.every((g) => !g)).toBe(true);
      expect(x.kills).toBe(0);
    }
  }, 60_000);
  it("keeps the warm-up quiet: bots never start shooting, they only answer a human", () => {
    const state = createBrMatch(meta, 6, heightAt);
    const me = seatHuman(state, "user-q", "Quiet");
    let now = 0;
    const botShots = () =>
      state.combat.filter((e) => e.type === "shot" && state.seats[e.seat]?.bot).length;
    let shots = 0;
    for (; now < 20_000; now += TICK_MS) {
      stepBrMatch(state, world, meta, new Map([[me, input(now)]]), now, TICK_MS);
      shots += botShots();
    }
    expect(state.phase).toBe("starting");
    expect(shots).toBe(0);
    // A human shoots a bot standing 15 m in front: that bot answers.
    const s = state.seats[me]!;
    const bot = state.seats.find((x) => x.bot && x.body.phase === "ground")!;
    const fx = -Math.sin(s.yaw),
      fz = -Math.cos(s.yaw);
    bot.body.x = s.body.x + fx * 15;
    bot.body.z = s.body.z + fz * 15;
    bot.body.y = world.supportAt(bot.body.x, bot.body.z, 0.35, 1e4);
    const pitch = Math.atan2(bot.body.y - s.body.y, 15);
    let answered = 0;
    for (const end = now + 3000; now < end; now += TICK_MS) {
      stepBrMatch(
        state,
        world,
        meta,
        new Map([[me, input(now, { fire: true, yaw: s.yaw, pitch })]]),
        now,
        TICK_MS,
      );
      answered += state.combat.filter((e) => e.type === "shot" && e.seat === bot.seat).length;
    }
    expect(answered).toBeGreaterThan(0);
  }, 60_000);

  it("validates inputs strictly", () => {
    const ok = {
      v: 1,
      type: "br-input",
      seq: 3,
      forward: 1,
      strafe: -0.5,
      yaw: 2.1,
      jumpOut: true,
    };
    expect(validateBrInput(ok)).toMatchObject({ seq: 3, forward: 1, jumpOut: true, deploy: false });
    expect(validateBrInput({ ...ok, canopyYaw: -Math.PI })).toMatchObject({ canopyYaw: -Math.PI });
    for (const bad of [
      { ...ok, x: 100 }, // positions are never accepted
      { ...ok, phase: "ground" }, // nor phases
      { ...ok, forward: 2 },
      { ...ok, yaw: NaN },
      { ...ok, canopyYaw: NaN },
      { ...ok, canopyYaw: Infinity },
      { ...ok, canopyYaw: "1" },
      { ...ok, canopyYaw: Math.PI + 0.01 },
      { ...ok, seq: 1.5 },
      { ...ok, deploy: "yes" },
      { ...ok, v: 2 },
      [ok],
      null,
    ])
      expect(validateBrInput(bad)).toBeNull();
  });

  it("seats humans in bot seats before take-off only, gives a returning human their seat back", () => {
    const state = createBrMatch(meta, 42, heightAt);
    const a = seatHuman(state, "user-a", "Jesper");
    expect(a).toBeGreaterThanOrEqual(0);
    expect(seatHuman(state, "user-a", "Jesper")).toBe(a);
    expect(state.seats.filter((s) => !s.bot)).toHaveLength(1);
    run(state, (s) => s.phase === "plane");
    expect(seatHuman(state, "user-b", "Late")).toBe(-1); // no seats once the plane is up
    releaseSeat(state, a);
    expect(state.seats[a]!.bot).toBe(true);
    expect(seatHuman(state, "user-a", "Jesper")).toBe(-1);
  });

  it("counts down, flies the plane, drops all 100 (bots and a human), then goes live", () => {
    const state = createBrMatch(meta, 7, heightAt);
    const me = seatHuman(state, "user-a", "Jesper");
    let jumpedAt = -1;
    const ticks = run(
      state,
      (s) => s.phase === "active",
      (now) => {
        // The human tries to leave immediately (refused by the window), then jumps at 30 s.
        const planeMs = now - state.phaseAt;
        const want = state.phase === "plane" && (planeMs < 2000 || planeMs > 30_000);
        if (want && state.seats[me]!.body.phase === "plane" && planeMs > 30_000) jumpedAt = planeMs;
        return new Map([[me, input(now, { jumpOut: want, forward: 1 })]]);
      },
    );
    expect(state.phase).toBe("active");
    expect(state.seats.every((s) => ["ground", "swim"].includes(s.body.phase))).toBe(true);
    expect(jumpedAt).toBeGreaterThan(30_000);
    expect(ticks.length * TICK_MS).toBeGreaterThan(BR_RULES.countdownMs + routeMs(state.route));
    const sorted = [...ticks].sort((x, y) => x - y);
    expect(sorted[Math.floor(sorted.length * 0.99)]!).toBeLessThan(12);
  });

  it("sends nearby and airborne players, never hidden far players", () => {
    const state = createBrMatch(meta, 9, heightAt);
    state.phase = "active";
    const sight = new BrSight();
    const at = (
      seat: number,
      x: number,
      z: number,
      phase: "ground" | "parachute" = "ground",
      up = 0,
    ) => {
      const b = state.seats[seat]!.body;
      Object.assign(b, { x, z, y: hf.heightAt(x, z) + up, phase });
    };
    for (const s of state.seats) at(s.seat, 4000, 4000); // everyone parked far away
    at(0, 0, -1500); // me, open country north of Crossroads
    at(1, 150, -1500); // 150 m: always sent
    at(2, 0, 500); // 2 km: never on the ground
    at(3, 0, 600, "parachute", 200); // 2.1 km but in the air: sent
    const view = brViewFor(state, world, sight, 0, 0);
    const seats = view.players.map((r) => r[0]);
    expect(seats).toContain(1);
    expect(seats).not.toContain(2);
    expect(seats).toContain(3);
    expect(JSON.stringify(view).length).toBeLessThan(4000);
  });

  it("fog of war: inside the near ring a player on foot is sent only who could be in view", () => {
    const state = createBrMatch(meta, 9, heightAt);
    state.phase = "active";
    const put = (seat: number, x: number, z: number, phase: "ground" | "parachute" = "ground") => {
      const b = state.seats[seat]!.body;
      Object.assign(b, { x, z, y: world.supportAt(x, z, 0.35, hf.heightAt(x, z) + 0.5), phase });
    };
    for (const s of state.seats) put(s.seat, -4000, 4000);
    // The viewer south of the Central Hospital's main block (98 × 20 m, three storeys), the
    // others on a grid all round it, 50–260 m away.
    const hospital = meta.pois.find((p) => p.id === "central-hospital")!;
    const [vx, vz] = [hospital.x, hospital.z + 70];
    put(0, vx, vz);
    const spots: Array<[number, number]> = [];
    for (let gx = -240; gx <= 240; gx += 40)
      for (let gz = -260; gz <= 60; gz += 40) {
        const d = Math.hypot(gx, gz);
        if (d > BR_RULES.fogAlwaysM + 5 && d < BR_RULES.alwaysSendM - 5)
          spots.push([vx + gx, vz + gz]);
      }
    spots.slice(0, 98).forEach(([x, z], i) => put(i + 1, x, z));
    const n = Math.min(98, spots.length);
    const sent = new Set(brViewFor(state, world, new BrSight(), 0, 0).players.map((r) => r[0]));
    // The truth: any of eight points of the body in a clear line from the viewer's eye.
    const me = state.seats[0]!.body;
    const inSight = (seat: number) => {
      const b = state.seats[seat]!.body;
      const d = Math.hypot(b.x - me.x, b.z - me.z);
      const px = (-(b.z - me.z) / d) * 0.3,
        pz = ((b.x - me.x) / d) * 0.3;
      return [
        [0, 1.9, 0],
        [0, 1.6, 0],
        [0, 1.2, 0],
        [0, 0.8, 0],
        [0, 0.3, 0],
        [px, 1.4, pz],
        [-px, 1.4, -pz],
        [0, 0.05, 0],
      ].some(([ox, oy, oz]) => {
        const dx = b.x + ox! - me.x,
          dy = b.y + oy! - (me.y + 1.6),
          dz = b.z + oz! - me.z;
        const dist = Math.hypot(dx, dy, dz);
        const ray = world.raycast(me.x, me.y + 1.6, me.z, dx, dy, dz, dist);
        return !ray || ray.distance >= dist - 0.05;
      });
    };
    let hidden = 0;
    for (let seat = 1; seat <= n; seat++) {
      // Nobody in sight is ever left out.
      if (inSight(seat)) expect(sent.has(seat), `seat ${seat} in sight`).toBe(true);
      if (!sent.has(seat)) hidden++;
    }
    // And the hospital, the wings and the buildings round them hide a good share.
    expect(n).toBeGreaterThan(40);
    expect(hidden / n).toBeGreaterThan(0.3);
    // Within earshot of footsteps everyone is sent, whatever stands between.
    put(1, vx + 10, vz - 30);
    expect(
      brViewFor(state, world, new BrSight(), 0, 0)
        .players.map((r) => r[0])
        .includes(1),
    ).toBe(true);
    // From the air the whole ring is in view: nothing is held back.
    state.seats[0]!.body.phase = "parachute";
    state.seats[0]!.body.y += 150;
    const air = brViewFor(state, world, new BrSight(), 0, 0).players.map((r) => r[0]);
    for (let seat = 1; seat <= n; seat++) expect(air).toContain(seat);
    // In a vehicle too (a chase camera), and a driver is sent to everyone in the ring.
    state.seats[0]!.body.phase = "ground";
    state.seats[0]!.body.y -= 150;
    state.seats[0]!.vehicle = 0;
    expect(brViewFor(state, world, new BrSight(), 0, 0).players.length).toBeGreaterThanOrEqual(n);
  });
});
