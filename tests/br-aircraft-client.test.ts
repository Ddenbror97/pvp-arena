import { describe, expect, it } from "vitest";
import { aircraftRow, newAircraft, stepAircraft, type Aircraft } from "@/lib/fps/br/aircraft";
import { AircraftClient, boardable, flightHud, flightOf } from "@/lib/fps/br/aircraft-client";
import { testWorld, TICK } from "@/lib/fps/br/flight-harness";

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
});
