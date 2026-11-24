import { describe, expect, it } from "vitest";
import type { StaticWorld } from "@/lib/fps/br/static-world";
import type { WorldMeta } from "@/lib/fps/br/world";
import {
  crashDamage,
  stepVehicle,
  WADE,
  type Vehicle,
  type VehicleKind,
} from "@/lib/fps/br/vehicles";

/**
 * Owner, 2026-11-23: "fix so drivble cars/bike cannot drive thro water, it should just zink.
 * also make the drivble car/bike able to air lift if they drive in high speed over a bump or
 * ramp … see how warzone/pubg works"; "right now drivble cars/bike is glued to the ground".
 * A stub world: ground from a function, no obstacles; water from a stub meta.
 */
const TICK = 1000 / 30;
function world(ground: (x: number, z: number) => number): StaticWorld {
  return {
    hf: { heightAt: ground },
    supportAt: (x: number, z: number) => ground(x, z),
    blocked: () => false,
  } as unknown as StaticWorld;
}
const dry = { waterBodies: [] } as unknown as WorldMeta;
function car(kind: VehicleKind, z: number, y: number, speed: number): Vehicle {
  return {
    id: 1,
    kind,
    condition: "good",
    x: 0,
    y,
    z,
    yaw: 0, // forward: −z
    speed,
    pitch: 0,
    roll: 0,
    health: 900,
    maxHealth: 900,
    driver: 0,
    destroyed: false,
  };
}
const gas = { forward: 1, strafe: 0 };

/** A ramp along −z: flat at 5 m, up 2.4 m over z 0 … −12, then a sheer drop back to 5 m. */
const ramp = world((_x, z) => (z > 0 ? 5 : z > -12 ? 5 + (-z / 12) * 2.4 : 5));

describe("vehicles fly off ramps and crests", () => {
  for (const kind of ["sedan", "bike"] as const)
    it(`${kind}: at speed over a ramp's lip it leaves the ground, flies and lands`, () => {
      const v = car(kind, 30, 5, 28);
      let tookOff: number | null = null,
        landed: number | null = null,
        top = 0;
      for (let i = 0; i < 150; i++) {
        stepVehicle(ramp, dry, v, gas, TICK);
        if (v.air && tookOff === null) tookOff = v.z;
        if (v.air) top = Math.max(top, v.y);
        if (tookOff !== null && !v.air && landed === null) landed = v.z;
      }
      // Off the lip (z ≈ −12), higher than it, and a long way down the road.
      expect(tookOff).toBeLessThan(-10);
      expect(top).toBeGreaterThan(7.6);
      expect(tookOff! - landed!).toBeGreaterThan(10);
      expect(v.air).toBeFalsy();
      expect(v.y).toBeCloseTo(5, 1);
    });

  it("at a crawl over the same ramp it keeps to the ground (a step down, not a flight)", () => {
    const v = car("sedan", 4, 5, 3);
    let flew = false;
    for (let i = 0; i < 200; i++) {
      stepVehicle(ramp, dry, v, { forward: 0.25, strafe: 0 }, TICK);
      flew ||= !!v.air && v.z > -11.5;
    }
    expect(flew).toBe(false);
  });

  it("flat road at top speed: never airborne", () => {
    const flat = world(() => 5);
    const v = car("sedan", 0, 5, 33);
    for (let i = 0; i < 120; i++) {
      stepVehicle(flat, dry, v, gas, TICK);
      expect(v.air).toBeFalsy();
    }
  });

  it("in the air the steering yaws the body but not its flight", () => {
    const a = car("sedan", 30, 5, 28),
      b = car("sedan", 30, 5, 28);
    let steered = false;
    for (let i = 0; i < 60; i++) {
      stepVehicle(ramp, dry, a, gas, TICK);
      stepVehicle(ramp, dry, b, b.air ? { forward: 0, strafe: 1 } : gas, TICK);
      steered ||= !!b.air;
      if (a.air && b.air) break;
    }
    for (let i = 0; i < 8 && b.air; i++) {
      stepVehicle(ramp, dry, a, gas, TICK);
      stepVehicle(ramp, dry, b, { forward: 0, strafe: 1 }, TICK);
    }
    expect(steered).toBe(true);
    expect(Math.abs(b.yaw - a.yaw)).toBeGreaterThan(0.2);
    expect(Math.abs(b.x - a.x)).toBeLessThan(0.3);
  });

  it("off a high ledge the landing hurts; off the ramp it does not", () => {
    const cliff = world((_x, z) => (z > -5 ? 20 : 5));
    const v = car("sedan", 10, 20, 20);
    let hard = 0;
    for (let i = 0; i < 120; i++) hard = Math.max(hard, stepVehicle(cliff, dry, v, gas, TICK));
    expect(crashDamage("sedan", hard)).toBeGreaterThan(50);
    const r = car("sedan", 30, 5, 28);
    let soft = 0;
    for (let i = 0; i < 150; i++) soft = Math.max(soft, stepVehicle(ramp, dry, r, gas, TICK));
    expect(crashDamage("sedan", soft)).toBe(0);
  });
});

describe("vehicles cannot drive through deep water: they flood and sink", () => {
  // A lake (surface 5 m) whose bank goes down along −z: 6 m at z 0, its bed at 2 m by z −40.
  const bank = world((_x, z) => (z > 0 ? 6 : Math.max(2, 6 + z * 0.1)));
  const lake = {
    waterBodies: [{ id: "lake", bounds: [-100, -200, 100, 0], level: 5 }],
  } as unknown as WorldMeta;
  for (const kind of ["sedan", "suv", "bike"] as const)
    it(`${kind}: drives in, floods at its sill, stops and sinks to the bottom`, () => {
      const v = car(kind, 10, 6, 15);
      let floodedAt = 0;
      for (let i = 0; i < 400; i++) {
        stepVehicle(bank, lake, v, gas, TICK);
        if (v.drowned && !floodedAt) floodedAt = 5 - (6 + v.z * 0.1);
      }
      expect(v.drowned).toBe(true);
      expect(floodedAt).toBeGreaterThan(WADE[kind] - 0.25);
      expect(floodedAt).toBeLessThan(WADE[kind] + 0.25);
      expect(v.speed).toBe(0);
      // At the bottom, under the surface, and no throttle moves it again.
      const z = v.z;
      for (let i = 0; i < 60; i++) stepVehicle(bank, lake, v, gas, TICK);
      expect(v.z).toBe(z);
      expect(v.y).toBeLessThan(5 - WADE[kind] + 0.05);
    });

  it("a shallow ford slows it but it gets through", () => {
    // Banks down to 4.8 m over 6 m each side (a 1.2 m step would be a wall).
    const ford = world((_x, z) =>
      z > 0 ? 6 : z > -6 ? 6 + z * 0.2 : z > -20 ? 4.8 : z > -26 ? 4.8 + (-20 - z) * 0.2 : 6,
    );
    const meta = {
      waterBodies: [{ id: "ford", bounds: [-100, -26, 100, 0], level: 5.1 }],
    } as unknown as WorldMeta;
    const v = car("suv", 10, 6, 20);
    let slowest = 99;
    for (let i = 0; i < 150; i++) {
      stepVehicle(ford, meta, v, gas, TICK);
      if (v.z < 0 && v.z > -20) slowest = Math.min(slowest, v.speed);
    }
    expect(v.drowned).toBeFalsy();
    expect(v.z).toBeLessThan(-30);
    expect(slowest).toBeLessThan(20);
  });

  it("flown into deep water: a splash takes most of its speed, then it sinks", () => {
    const jump = world((_x, z) => (z > 0 ? 5 : z > -12 ? 5 + (-z / 12) * 2.4 : 1));
    const meta = {
      waterBodies: [{ id: "lake", bounds: [-100, -300, 100, -12], level: 4.5 }],
    } as unknown as WorldMeta;
    const v = car("sedan", 30, 5, 28);
    let splash = 0;
    for (let i = 0; i < 300; i++) {
      const was = v.speed;
      stepVehicle(jump, meta, v, gas, TICK);
      if (v.drowned && !splash) splash = v.speed / was;
    }
    expect(v.drowned).toBe(true);
    expect(splash).toBeLessThan(0.4);
    expect(v.y).toBeCloseTo(1, 1);
  });
});
