import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { AIRCRAFT, attitude, toWorld, type Aircraft } from "@/lib/fps/br/aircraft";
import { aircraftSpawn, insideAircraft, withAircraft } from "@/lib/fps/br/aircraft-world";
import { validateBrAct } from "@/lib/fps/br/actions";
import { DROP } from "@/lib/fps/br/drop";
import { takeoffPilot } from "@/lib/fps/br/flight-harness";
import { decodeHeightfield, type Heightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import {
  aircraftFromRow,
  aircraftRow,
  BrSeatSync,
  BrSight,
  brViewFor,
  checkpointBrMatch,
  createBrMatch,
  occupantHarm,
  restoreBrMatch,
  seatHuman,
  stepBrMatch,
  validateBrInput,
  type BrCheckpoint,
  type BrInput,
  type BrMatchState,
} from "@/lib/fps/br/match";
import type { CollisionData, StaticWorld } from "@/lib/fps/br/static-world";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";
import { TICK_MS } from "@/lib/fps/simulation";

/**
 * The aircraft in a match (match.ts stepFlight, aircraft-world.ts): where it waits, who may sit
 * in it, the pilot's controls on the wire, the engine, getting out safely (or the parachute),
 * crashes, the snapshot and the checkpoint. The flight model itself: br-aircraft.test.ts.
 */

const buffer = (path: string) => {
  const f = readFileSync(path);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const meta = JSON.parse(readFileSync("public/fps/br/world.v5.json", "utf8")) as WorldMeta;
const collision = JSON.parse(
  readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"),
) as CollisionData;
let hf: Heightfield, world: StaticWorld;
beforeAll(async () => {
  hf = await decodeHeightfield(buffer("public/fps/br/height.v6.hf"));
  const cover = await decodeLandCover(buffer("public/fps/br/landcover.v5.lc"));
  world = buildIsland(hf, cover, meta, collision).solid;
}, 60_000);

let t = 0;
function scene() {
  t = 100_000;
  const state = createBrMatch(meta, 5, (x, z) => hf.heightAt(x, z), []);
  seatHuman(state, "u1", "Pilot");
  seatHuman(state, "u2", "Rider");
  seatHuman(state, "u3", "Walker");
  state.phase = "active";
  state.planeAt = t - 600_000;
  for (const s of state.seats) {
    const b = s.body;
    b.x = -4000 + s.seat * 3;
    b.z = -4000;
    b.y = world.supportAt(b.x, b.z, 0.35, 1e4);
    Object.assign(b, { phase: "ground", grounded: true });
  }
  step(state, new Map());
  const a = state.aircraft!;
  return { state, a };
}
/** Beside the aircraft's door on its side (0 pilot / left, 1 right), on the ground. */
function toDoor(state: BrMatchState, seat: number, a: Aircraft, side = -1) {
  const b = state.seats[seat]!.body;
  const r = attitude(a).heading;
  // The aircraft's right in the world: (cos h, −sin h).
  b.x = a.x + Math.cos(r) * 1.4 * side;
  b.z = a.z - Math.sin(r) * 1.4 * side;
  b.y = world.supportAt(b.x, b.z, 0.35, a.y + 2);
  Object.assign(b, { phase: "ground", grounded: true, vx: 0, vz: 0 });
}
function step(
  state: BrMatchState,
  inputs: Map<number, Partial<BrInput>>,
  acts: Map<number, unknown[]> = new Map(),
) {
  t += TICK_MS;
  const full = new Map<number, BrInput>();
  for (const [seat, i] of inputs)
    full.set(seat, { seq: 0, forward: 0, strafe: 0, yaw: 0, ...i } as BrInput);
  stepBrMatch(state, world, meta, full, t, TICK_MS, acts as never);
  return state.combat;
}
const actResult = (events: ReturnType<typeof step>, seat: number) =>
  events.find((e) => e.type === "act" && e.seat === seat) as
    { ok: boolean; reason?: string } | undefined;

describe("BR aircraft in the match", () => {
  it("waits on the Island Airfield's runway, engine off, clear of everything, every match", () => {
    const { a } = scene();
    const runway = meta.runways[1]!;
    // The Island Airfield's (POI island-airfield).
    expect(Math.hypot(a.x - 3237, a.z - 3805)).toBeLessThan(900);
    // On the runway's centre line, near its western threshold, pointing down it.
    const [w, e] = runway.a[0] <= runway.b[0] ? [runway.a, runway.b] : [runway.b, runway.a];
    const len = Math.hypot(e[0] - w[0], e[1] - w[1]);
    const ux = (e[0] - w[0]) / len,
      uz = (e[1] - w[1]) / len;
    const along = (a.x - w[0]) * ux + (a.z - w[1]) * uz;
    const off = Math.abs((a.x - w[0]) * uz - (a.z - w[1]) * ux);
    expect(along).toBeGreaterThan(40);
    expect(along).toBeLessThan(len * 0.4);
    expect(off).toBeLessThan(1);
    const f = attitude(a);
    expect(Math.cos(f.heading - Math.atan2(-ux, -uz))).toBeGreaterThan(0.999);
    expect(a.engine).toBe("off");
    expect(a.fuel).toBe(AIRCRAFT.fuelS);
    expect(a.grounded).toBe(true);
    expect(a.y + AIRCRAFT.wheels[0].at[1]).toBeCloseTo(hf.heightAt(a.x, a.z), 0);
    // The same spot every match (one aircraft, deterministic).
    expect(aircraftSpawn(meta, world)).toMatchObject({ x: a.x, z: a.z });
  });

  it("is solid to players and stops shots (the windows aside)", () => {
    const { a } = scene();
    const solid = withAircraft(world, () => a);
    // Walking into the rear fuselage.
    const tail = toWorld(a, [0, 0, 3]);
    const foot = hf.heightAt(a.x + tail[0], a.z + tail[2]);
    expect(solid.blocked(a.x + tail[0], foot, a.z + tail[2], 1.8, 0.35)).toBe(true);
    expect(world.blocked(a.x + tail[0], foot, a.z + tail[2], 1.8, 0.35)).toBe(false);
    // A shot across the tail (from the right, in the aircraft's frame) hits it.
    const o = toWorld(a, [20, 0.2, 4.8]),
      d = toWorld(a, [-1, 0, 0]);
    const hit = solid.raycast(a.x + o[0], a.y + o[1], a.z + o[2], d[0], d[1], d[2], 40);
    expect(hit?.distance).toBeGreaterThan(18);
    expect(hit?.distance).toBeLessThan(20);
    expect((hit as { vehicle?: number }).vehicle).toBe(-2);
    // The cabin's window band is open (occupants can be shot through it).
    expect(insideAircraft(a, a.x, a.y + 0.45, a.z, 0)).toBe(false);
  });

  it("boards the pilot first, then the passenger; a third is refused; only near a door", () => {
    const { state, a } = scene();
    // Far away: refused.
    let ev = step(state, new Map(), new Map([[0, [{ act: "board" }]]]));
    expect(actResult(ev, 0)).toMatchObject({ ok: false, reason: "Too far" });
    toDoor(state, 0, a, -1);
    toDoor(state, 1, a, 1);
    ev = step(
      state,
      new Map(),
      new Map([
        [0, [{ act: "board" }]],
        [1, [{ act: "board" }]],
      ]),
    );
    expect(actResult(ev, 0)?.ok).toBe(true);
    expect(actResult(ev, 1)?.ok).toBe(true);
    expect(a.pilot).toBe(0);
    expect(a.passenger).toBe(1);
    expect(state.seats[0]!.cockpit).toBe(0);
    expect(state.seats[1]!.cockpit).toBe(1);
    toDoor(state, 2, a, -1);
    ev = step(state, new Map(), new Map([[2, [{ act: "board" }]]]));
    expect(actResult(ev, 2)).toMatchObject({ ok: false, reason: "Full" });
    // Only the pilot works the engine.
    ev = step(state, new Map(), new Map([[1, [{ act: "engine" }]]]));
    expect(actResult(ev, 1)).toMatchObject({ ok: false, reason: "Not the pilot" });
    // Seated: no weapons, no doors; the passenger moves over once the pilot has gone.
    ev = step(state, new Map(), new Map([[0, [{ act: "exit" }]]]));
    expect(actResult(ev, 0)?.ok).toBe(true);
    expect(state.seats[0]!.cockpit).toBeUndefined();
    expect(state.seats[0]!.body.phase).toBe("ground");
    expect(
      world.blocked(
        state.seats[0]!.body.x,
        state.seats[0]!.body.y,
        state.seats[0]!.body.z,
        1.8,
        0.3,
      ),
    ).toBe(false);
    ev = step(state, new Map(), new Map([[1, [{ act: "seat" }]]]));
    expect(actResult(ev, 1)?.ok).toBe(true);
    expect(a.pilot).toBe(1);
    expect(a.passenger).toBe(-1);
  });

  it("takes the pilot's controls on the wire, strictly", () => {
    const base = { v: 1, type: "br-input", seq: 1, forward: 0, strafe: 0, yaw: 0 };
    expect(
      validateBrInput({ ...base, elev: 0.5, ail: -1, rud: 0.2, thr: 1, flaps: 2 }),
    ).toMatchObject({
      elev: 0.5,
      ail: -1,
      rud: 0.2,
      thr: 1,
      flaps: 2,
    });
    for (const bad of [{ elev: 1.5 }, { thr: -0.1 }, { flaps: 3 }, { rud: "x" }, { gear: 1 }])
      expect(validateBrInput({ ...base, ...bad })).toBeNull();
    for (const act of ["board", "seat", "engine"])
      expect(validateBrAct({ v: 1, type: "br-act", act })).toEqual({ act });
    expect(validateBrAct({ v: 1, type: "br-act", act: "engine", on: true })).toBeNull();
  });

  it("starts on the switch, takes off from the runway, bails out with the parachute", () => {
    const { state, a } = scene();
    toDoor(state, 0, a, -1);
    toDoor(state, 1, a, 1);
    step(
      state,
      new Map(),
      new Map([
        [0, [{ act: "board" }]],
        [1, [{ act: "board" }]],
      ]),
    );
    step(state, new Map([[0, {}]]), new Map([[0, [{ act: "engine" }]]]));
    // The switch (an act) turns the starter on the next flight step.
    step(state, new Map([[0, {}]]));
    expect(a.engine).toBe("starting");
    for (let i = 0; i < 160; i++) step(state, new Map([[0, { thr: 0 }]]));
    expect(a.engine).toBe("running");
    // Moving on the ground: no getting in or out.
    const pilot = takeoffPilot(27, 0.14, attitude(a).heading);
    let refused: string | undefined;
    for (let i = 0; i < 30 * 70; i++) {
      const c = pilot(a, i / 30);
      const acts = new Map<number, unknown[]>();
      // The passenger tries to get out at 20 m over the ground.
      const agl = a.y - 1.1 - hf.heightAt(a.x, a.z);
      if (!refused && agl > 15 && agl < 40) acts.set(1, [{ act: "exit" }]);
      const ev = step(
        state,
        new Map([
          [0, { elev: c.elev, ail: c.ail, rud: c.rud, thr: c.thr, flaps: c.flaps, jump: c.brake }],
        ]),
        acts,
      );
      refused ??= actResult(ev, 1)?.reason;
      if (agl > 120) break;
    }
    expect(refused).toBe("Exit unsafe");
    expect(a.grounded).toBe(false);
    expect(a.y - hf.heightAt(a.x, a.z)).toBeGreaterThan(100);
    // The occupants ride their seats (others see them in the cockpit).
    const rider = state.seats[1]!.body;
    expect(Math.hypot(rider.x - a.x, rider.y - a.y, rider.z - a.z)).toBeLessThan(1);
    // Over 60 m: out with the parachute, the aircraft's way. However high (here well over
    // the height a freefall used to open at: owner, 2026-11-27, "the parachute sometimes fails
    // to deploy immediately, causing the character to appear to run in mid-air"), the canopy
    // is open in that same step and stays open: no step of the fall is a freefall.
    a.y += DROP.autoDeployAgl + 250;
    const speed = Math.hypot(a.vx, a.vz);
    const ev = step(state, new Map([[0, { thr: 1 }]]), new Map([[1, [{ act: "exit" }]]]));
    expect(actResult(ev, 1)?.ok).toBe(true);
    expect(rider.phase).toBe("parachute");
    expect(rider.y - hf.heightAt(rider.x, rider.z)).toBeGreaterThan(DROP.autoDeployAgl + 200);
    expect(state.seats[1]!.cockpit).toBeUndefined();
    expect(a.passenger).toBe(-1);
    // Off with the aircraft's own speed, falling as out of the drop plane's door; the opening
    // canopy brakes both to its glide within a few seconds.
    expect(Math.hypot(rider.vx, rider.vz)).toBeGreaterThan(speed * 0.8);
    expect(-rider.velocityY).toBeGreaterThanOrEqual(DROP.parachute.exitDown - 1);
    for (let i = 0; i < 30 * 4; i++) {
      step(state, new Map([[0, { thr: 1 }]]));
      expect(rider.phase).toBe("parachute");
    }
    expect(Math.hypot(rider.vx, rider.vz)).toBeLessThan(DROP.parachute.glideForward + 1);
    expect(-rider.velocityY).toBeLessThan(DROP.parachute.brakeDown + 1);
    // The view: the aircraft goes out with every change, the pilot learns their seat.
    const sync = new BrSeatSync();
    const view = brViewFor(state, world, new BrSight(), 0, t, sync);
    expect(view.flying).toBe(0);
    expect(view.aircraft).toHaveLength(28);
    expect(aircraftFromRow(view.aircraft!)).toMatchObject({ pilot: 0, engine: "running" });
    expect(brViewFor(state, world, new BrSight(), 0, t, sync).aircraft).toBeUndefined();
  });

  it("refuses a getaway while it rolls fast, lets them out stopped", () => {
    const { state, a } = scene();
    toDoor(state, 0, a, -1);
    step(state, new Map(), new Map([[0, [{ act: "board" }]]]));
    a.vx = 12;
    let ev = step(state, new Map([[0, {}]]), new Map([[0, [{ act: "exit" }]]]));
    expect(actResult(ev, 0)).toMatchObject({ ok: false, reason: "Slow down to get out" });
    for (let i = 0; i < 300; i++) step(state, new Map([[0, { jump: true }]]));
    ev = step(state, new Map([[0, {}]]), new Map([[0, [{ act: "exit" }]]]));
    expect(actResult(ev, 0)?.ok).toBe(true);
  });

  it("a crash wrecks it and kills those aboard; a hard landing only shakes them", () => {
    expect(occupantHarm(3)).toBe(0);
    expect(occupantHarm(6)).toBe(0);
    expect(occupantHarm(8)).toBe(0);
    expect(occupantHarm(14)).toBeGreaterThan(20);
    expect(occupantHarm(21)).toBeGreaterThanOrEqual(100);
    const { state, a } = scene();
    toDoor(state, 0, a, -1);
    step(state, new Map(), new Map([[0, [{ act: "board" }]]]));
    // 40 m up, diving at the ground.
    a.y += 40;
    a.vy = -35;
    a.grounded = false;
    let boom = false;
    for (let i = 0; i < 90 && !boom; i++)
      boom = step(state, new Map([[0, {}]])).some((e) => e.type === "boom");
    expect(boom).toBe(true);
    expect(a.destroyed).toBe(true);
    expect(state.seats[0]!.dead).toBe(true);
    expect(state.seats[0]!.cockpit).toBeUndefined();
    expect(a.pilot).toBe(-1);
    // A wreck cannot be boarded.
    toDoor(state, 2, a, -1);
    const ev = step(state, new Map(), new Map([[2, [{ act: "board" }]]]));
    expect(actResult(ev, 2)).toMatchObject({ ok: false, reason: "Destroyed" });
  });

  it("survives a room restart with its occupants (checkpoint)", () => {
    const { state, a } = scene();
    toDoor(state, 0, a, -1);
    step(state, new Map(), new Map([[0, [{ act: "board" }]]]));
    step(state, new Map([[0, {}]]), new Map([[0, [{ act: "engine" }]]]));
    step(state, new Map([[0, {}]]));
    const c = JSON.parse(JSON.stringify(checkpointBrMatch(state))) as BrCheckpoint;
    const back = restoreBrMatch(meta, (x, z) => hf.heightAt(x, z), c);
    expect(back.aircraft).toMatchObject({ x: a.x, z: a.z, engine: "starting", pilot: 0 });
    expect(back.seats[0]!.cockpit).toBe(0);
    expect(aircraftRow(back.aircraft!)).toEqual(aircraftRow(a));
  });
});
