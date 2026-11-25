import { describe, expect, it } from "vitest";
import {
  aircraftRow,
  attitude,
  newAircraft,
  stepAircraft,
  type Aircraft,
} from "@/lib/fps/br/aircraft";
import { AircraftClient, boardable, flightHud, flightOf } from "@/lib/fps/br/aircraft-client";
import { fly, takeoffPilot, testWorld, TICK } from "@/lib/fps/br/flight-harness";

/**
 * The aircraft on the client (aircraft-client.ts): the pilot's prediction resumes exactly where
 * the server's row leaves it, everyone else's view interpolates between rows, the controls
 * ramp and spring back, the HUD tells what E would do, the E prompt finds the door.
 */
const env = testWorld({ ground: 10 });
const wire = (o: Partial<{ elev: number; ail: number; rud: number; thr: number }> = {}) => ({
  elev: 0,
  ail: 0,
  rud: 0,
  thr: 1,
  flaps: 0 as const,
  ...o,
});

function rolling(): Aircraft {
  const a = newAircraft(0, 0, 10, 0, 0);
  a.engine = "running";
  a.rpm = 0.9;
  a.throttle = 1;
  a.pilot = 0;
  for (let i = 0; i < 90; i++)
    stepAircraft(env.world, env.meta, a, flightOf(wire(), a), 10_000 + i * TICK, TICK);
  return a;
}

describe("BR aircraft on the client", () => {
  it("predicts the pilot's own flight from the server's row, exactly", () => {
    const server = rolling();
    const c = new AircraftClient();
    c.apply(aircraftRow(server), 0, 1000);
    expect(c.seat).toBe(0);
    // The server has not applied the last three inputs yet: the client replays them.
    const pending = [1, 2, 3].map((k) => ({ input: wire({ rud: 0.2 }), clock: 20_000 + k * TICK }));
    c.reconcile(env.world, env.meta, pending);
    const truth = { ...server };
    for (const p of pending)
      stepAircraft(env.world, env.meta, truth, flightOf(p.input, truth), p.clock, TICK);
    expect(c.predicted!.x).toBeCloseTo(truth.x, 2);
    expect(c.predicted!.z).toBeCloseTo(truth.z, 2);
    expect(c.predicted!.qy).toBeCloseTo(truth.qy, 4);
    // The view carries the prediction between steps (no stutter at 30 Hz).
    const v0 = c.sample(0, 0, 16)!.z;
    const v1 = c.sample(0, 16, 16)!.z;
    expect(v1).toBeLessThan(v0); // rolling forward (−z)
  });

  it("interpolates everyone else's view between rows on the server's clock", () => {
    const a = rolling();
    const c = new AircraftClient();
    c.apply(aircraftRow(a), undefined, 1000);
    const z0 = a.z;
    stepAircraft(env.world, env.meta, a, flightOf(wire(), a), 0, TICK);
    c.apply(aircraftRow(a), undefined, 1000 + TICK);
    const mid = c.sample(1000 + TICK / 2, 0, 16)!;
    expect(mid.z).toBeCloseTo((z0 + a.z) / 2, 2);
    expect(c.predicted).toBeNull();
  });

  it("ramps roll and rudder in and back, moves the throttle lever, springs the stick back", () => {
    const c = new AircraftClient();
    const keys = {
      throttleUp: true,
      throttleDown: false,
      rollLeft: false,
      rollRight: true,
      rudderLeft: false,
      rudderRight: false,
      brake: false,
    };
    let w = c.steer(keys, 0.1);
    expect(w.ail).toBeGreaterThan(0);
    expect(w.ail).toBeLessThan(1);
    expect(w.thr).toBeCloseTo(0.055, 3);
    for (let i = 0; i < 10; i++) w = c.steer(keys, 0.1);
    expect(w.ail).toBe(1);
    c.seat = 0;
    c.mouse(0, -100, 1);
    // The mouse moved up: the nose comes up (as when aiming up); down: the nose goes down.
    expect(c.controls.stick).toBeGreaterThan(0.3);
    for (let i = 0; i < 30; i++) w = c.steer({ ...keys, rollRight: false }, 0.1);
    expect(Math.abs(w.elev)).toBeLessThan(0.01);
    expect(w.ail).toBe(0);
    c.nextFlaps();
    c.nextFlaps();
    expect(c.controls.flaps).toBe(2);
    c.nextFlaps();
    expect(c.controls.flaps).toBe(0);
  });

  it("a small downward mouse correction lowers the nose gently in flight", () => {
    const a = newAircraft(0, 0, env.ground, 0, 0);
    Object.assign(a, { y: 300, vz: -35, grounded: false, engine: "running", rpm: 1, throttle: 1 });
    const c = new AircraftClient();
    c.apply(aircraftRow(a), 0, 0);
    c.holdPitch(true);
    c.mouse(0, 10, 0.5);
    for (let i = 0; i < 30; i++) {
      c.apply(aircraftRow(a), 0, i * TICK);
      const wire = c.steer(
        {
          throttleUp: false,
          throttleDown: false,
          rollLeft: false,
          rollRight: false,
          rudderLeft: false,
          rudderRight: false,
          brake: false,
        },
        TICK / 1000,
      );
      stepAircraft(env.world, env.meta, a, flightOf(wire, a), i * TICK, TICK);
    }
    expect(attitude(a).pitch).toBeLessThan(0);
    expect(attitude(a).pitch).toBeGreaterThan((-3 * Math.PI) / 180);
  });

  it.each([-1, 1])(
    "steers with a mouse drag (%s), then levels the wings on release",
    (direction) => {
      const a = newAircraft(0, 0, env.ground, 0, 0);
      Object.assign(a, {
        y: 300,
        vz: -40,
        grounded: false,
        engine: "running",
        rpm: 1,
        throttle: 1,
      });
      const c = new AircraftClient();
      c.apply(aircraftRow(a), 0, 0);
      c.holdPitch(true);
      c.mouse(direction * 80, 0, 0.5);
      const keys = {
        throttleUp: false,
        throttleDown: false,
        rollLeft: false,
        rollRight: false,
        rudderLeft: false,
        rudderRight: false,
        brake: false,
      };
      for (let i = 0; i < 90; i++) {
        c.apply(aircraftRow(a), 0, i * TICK);
        const wire = c.steer(keys, TICK / 1000);
        stepAircraft(env.world, env.meta, a, flightOf(wire, a), i * TICK, TICK);
      }
      expect(attitude(a).bank * direction).toBeGreaterThan((10 * Math.PI) / 180);
      expect(attitude(a).heading * direction).toBeLessThan(0);
      c.holdPitch(false);
      for (let i = 90; i < 240; i++) {
        c.apply(aircraftRow(a), 0, i * TICK);
        const wire = c.steer(keys, TICK / 1000);
        stepAircraft(env.world, env.meta, a, flightOf(wire, a), i * TICK, TICK);
      }
      expect(Math.abs(attitude(a).bank)).toBeLessThan((3 * Math.PI) / 180);
    },
  );

  it("uses mouse steering on the ground without rolling a wing into the runway", () => {
    const c = new AircraftClient();
    c.apply(aircraftRow(rolling()), 0, 0);
    c.holdPitch(true);
    c.mouse(80, 0, 0.5);
    const wire = c.steer(
      {
        throttleUp: false,
        throttleDown: false,
        rollLeft: false,
        rollRight: false,
        rudderLeft: false,
        rudderRight: false,
        brake: false,
      },
      0.1,
    );
    expect(wire.rud).toBeGreaterThan(0);
    expect(wire.ail).toBe(0);
  });

  it("says what E does from the seat, finds the door on foot", () => {
    const a = newAircraft(0, 0, 10, 0, 0);
    expect(flightHud(env.world, a, 0, 0).exit).toBe("ground");
    a.vz = -10;
    expect(flightHud(env.world, a, 0, 0).exit).toBe("slow");
    a.y += 30;
    expect(flightHud(env.world, a, 0, 0).exit).toBe("unsafe");
    a.y += 60;
    expect(flightHud(env.world, a, 0, 0).exit).toBe("parachute");
    const parked = newAircraft(0, 0, 10, 0, 0);
    // Beside the left door; and far off.
    expect(boardable(parked, -1.5, 10, 0)).toBe("pilot");
    expect(boardable(parked, -8, 10, 0)).toBeNull();
    parked.pilot = 3;
    expect(boardable(parked, 1.5, 10, 0)).toBe("passenger");
    parked.passenger = 4;
    expect(boardable(parked, 1.5, 10, 0)).toBe("full");
  });

  it("holds a mouse-selected climb, eases on release and isolates passenger/free look", () => {
    const c = new AircraftClient();
    const a = rolling();
    a.grounded = false;
    a.vz = -35;
    c.apply(aircraftRow(a), 0, 1000);
    const keys = {
      throttleUp: false,
      throttleDown: false,
      rollLeft: false,
      rollRight: false,
      rudderLeft: false,
      rudderRight: false,
      brake: false,
    };
    c.holdPitch(true);
    c.mouse(0, -100, 0.5);
    const initial = c.steer(keys, 1 / 30).elev;
    expect(initial).toBeGreaterThan(0.4);
    for (let i = 0; i < 90; i++) expect(c.steer(keys, 1 / 30).elev).toBe(initial);
    c.holdPitch(false);
    expect(Math.abs(c.steer(keys, 1 / 30).elev)).toBeLessThan(initial);
    c.holdPitch(true);
    c.mouse(0, -100, 0.5);
    c.look.held = true;
    c.mouse(30, -100, 0.5);
    expect(c.look.pitch).toBeGreaterThan(0);
    expect(c.steer(keys, 1 / 30).elev).toBe(0);
    c.look.held = false;
    c.apply(aircraftRow(a), 1, 2000);
    c.holdPitch(true);
    c.mouse(0, -100, 0.5);
    expect(c.steer(keys, 1 / 30).elev).toBe(0);
    c.apply(aircraftRow(a), 0, 3000);
    expect(c.steer({ ...keys, pitchUp: true }, 1 / 30).elev).toBeGreaterThan(0);
    expect(c.steer({ ...keys, pitchDown: true }, 1 / 30).elev).toBeLessThan(0);
    c.apply(undefined, undefined, 4000);
    expect(c.steer(keys, 1 / 30).elev).toBe(0);
  });

  it("draws a mouse-steered bank without per-tick or per-event steps (owner, 2026-11-25)", () => {
    // Airborne, LMB held, an uneven mouse (0–6 counts, not every frame) at an uneven ~144 Hz:
    // the drawn bank's rate must change smoothly frame to frame (it stepped at every 30 Hz
    // tick and with every mouse event: jerk rms ≈ 1.6, max ≈ 12 deg/s per frame).
    const a = newAircraft(0, 0, 10, 0, 0);
    a.pilot = 0;
    fly(env, a, 45, takeoffPilot());
    const c = new AircraftClient();
    c.apply(aircraftRow(a), 0, 0);
    c.predicted = { ...a };
    c.holdPitch(true);
    const keys = {
      throttleUp: false,
      throttleDown: false,
      rollLeft: false,
      rollRight: false,
      rudderLeft: false,
      rudderRight: false,
      brake: false,
    };
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const FR = [6.94, 6.94, 8.3, 6.94, 5.6, 6.94, 7.5];
    let acc = 0,
      clock = 100_000,
      last = NaN,
      lastRate = NaN;
    const jerk: number[] = [];
    let maxBank = 0;
    for (let f = 0; f < 144 * 6; f++) {
      const frame = FR[f % FR.length]!;
      if (f >= 144 && f < 288 && rnd() < 0.8) c.mouse(Math.round(rnd() * 6), 0, 1);
      if (f >= 432 && f < 640 && rnd() < 0.8) c.mouse(-Math.round(rnd() * 6), 0, 1);
      const w = c.steer(keys, frame / 1000);
      acc += frame;
      while (acc >= TICK) {
        acc -= TICK;
        clock += TICK;
        c.predict(env.world, env.meta, w, clock);
      }
      const bank = (attitude(c.sample(0, acc, frame)!).bank * 180) / Math.PI;
      maxBank = Math.max(maxBank, bank);
      const rate = ((bank - last) * 1000) / frame;
      if (Number.isFinite(lastRate)) jerk.push(rate - lastRate);
      last = bank;
      lastRate = rate;
    }
    const rms = Math.sqrt(jerk.reduce((s, v) => s + v * v, 0) / jerk.length);
    expect(maxBank).toBeGreaterThan(20); // it still banks as asked
    expect(rms).toBeLessThan(0.5);
    expect(Math.max(...jerk.map(Math.abs))).toBeLessThan(3);
  });

  it("glides over an orientation correction instead of snapping to it", () => {
    const server = rolling();
    const c = new AircraftClient();
    c.apply(aircraftRow(server), 0, 1000);
    c.reconcile(env.world, env.meta, []);
    const before = { ...c.sample(0, 0, 16)! };
    // The next row disagrees by 3° of heading.
    const turned = { ...server };
    const h = (3 * Math.PI) / 180 / 2;
    const { qx, qy, qz, qw } = server;
    turned.qw = Math.cos(h) * qw - Math.sin(h) * qy;
    turned.qx = Math.cos(h) * qx - Math.sin(h) * qz;
    turned.qy = Math.cos(h) * qy + Math.sin(h) * qw;
    turned.qz = Math.cos(h) * qz + Math.sin(h) * qx;
    c.apply(aircraftRow(turned), 0, 1033);
    c.reconcile(env.world, env.meta, []);
    const heading = (x: Aircraft) => attitude(x).heading;
    const jump = Math.abs(heading(c.sample(0, 0, 16)!) - heading(before));
    expect(jump).toBeLessThan((0.5 * Math.PI) / 180);
    for (let i = 0; i < 90; i++) c.sample(0, 0, 16);
    expect(Math.abs(heading(c.sample(0, 0, 16)!) - heading(turned))).toBeLessThan(
      (0.05 * Math.PI) / 180,
    );
  });
});
