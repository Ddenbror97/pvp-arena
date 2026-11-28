import { describe, expect, it } from "vitest";
import type { StaticWorld } from "@/lib/fps/br/static-world";
import type { WorldMeta } from "@/lib/fps/br/world";
import { stepVehicle, VEHICLES, type Vehicle, type VehicleKind } from "@/lib/fps/br/vehicles";

/**
 * Owner, 2026-11-27: "cars and motorcycles currently feel stuck to the ground when driving over
 * bumps, hills and jumps … improve suspension compression, rebound, damping and wheel-ground
 * contact … landing after a jump should feel smooth … remove unnatural snapping, ground sticking
 * and jittery movement". Before, the body was set on the ground under the tyres every tick. Now
 * it rides on springs (VEHICLES.suspension). Stub worlds: ground from a function, no obstacles.
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
const flat = world(() => 5);

describe("vehicle suspension", () => {
  it("at rest on flat ground it settles exactly (a parked vehicle is not stepped again)", () => {
    const v = car("sedan", 0, 5.05, 0);
    for (let i = 0; i < 90; i++) stepVehicle(flat, dry, v, null, TICK);
    expect(v.y).toBe(5);
    expect(v.vy).toBe(0);
    expect(v.sus).toBe(0);
    expect(v.air).toBe(false);
  });

  for (const kind of ["sedan", "suv", "pickup", "bike"] as const)
    it(`${kind}: dropped 0.6 m onto flat ground it lands on its springs, rebounds once and settles`, () => {
      const S = VEHICLES.suspension[kind];
      const v = car(kind, 0, 5.6 + S.droop, 0);
      v.air = true;
      let lowest = 0,
        landedAt = -1;
      const after: number[] = [];
      for (let i = 0; i < 120; i++) {
        const impact = stepVehicle(flat, dry, v, null, TICK);
        expect(impact).toBe(0);
        if (landedAt < 0 && !v.air) landedAt = i;
        if (landedAt >= 0) {
          lowest = Math.min(lowest, v.sus!);
          after.push(v.sus!);
        }
      }
      // The springs took it (compressed, within their travel) and it came back to rest.
      expect(lowest).toBeLessThan(-0.03);
      expect(lowest).toBeGreaterThanOrEqual(-S.compress);
      expect(Math.abs(v.sus!)).toBeLessThan(0.002);
      expect(v.y).toBeCloseTo(5, 2);
      // Damped: the first rebound is smaller than the compression, and it does not ring.
      const rebound = Math.max(...after.slice(after.indexOf(lowest)));
      expect(rebound).toBeLessThan(-lowest);
      let crossings = 0;
      for (let i = 1; i < after.length; i++)
        if (Math.sign(after[i]!) !== Math.sign(after[i - 1]!) && Math.abs(after[i]!) > 0.005)
          crossings++;
      expect(crossings).toBeLessThanOrEqual(3);
    });

  it("a 6 m fall is a hard landing (damage), the springs bottom out, no bounce into the sky", () => {
    const v = car("sedan", 0, 11, 0);
    v.air = true;
    let impact = 0,
      top = 0,
      landed = false;
    for (let i = 0; i < 90; i++) {
      impact = Math.max(impact, stepVehicle(flat, dry, v, null, TICK));
      if (!v.air) landed = true;
      if (landed) top = Math.max(top, v.y);
    }
    expect(impact).toBeGreaterThan(VEHICLES.crash.threshold);
    expect(top).toBeLessThan(5 + VEHICLES.suspension.sedan.droop + 0.05);
  });

  it("over a field of small bumps the body moves far less than the ground under it", () => {
    // 6 cm bumps every 1.5 m: the old body followed each one (its height jolted every tick).
    const bumpy = world((_x, z) => 5 + 0.06 * Math.abs(Math.sin((z * Math.PI) / 1.5)));
    const v = car("sedan", 0, 5.06, 20);
    const ys: number[] = [],
      gs: number[] = [];
    for (let i = 0; i < 150; i++) {
      stepVehicle(bumpy, dry, v, gas, TICK);
      if (i > 30) {
        ys.push(v.y);
        gs.push(5 + 0.06 * Math.abs(Math.sin((v.z * Math.PI) / 1.5)));
      }
    }
    const jolt = (a: number[]) => {
      let sum = 0;
      for (let i = 2; i < a.length; i++) sum += (a[i]! - 2 * a[i - 1]! + a[i - 2]!) ** 2;
      return Math.sqrt(sum / (a.length - 2));
    };
    expect(jolt(ys)).toBeLessThan(jolt(gs) * 0.5);
    // And the wheels never leave such ground (droop takes it): no hopping.
    expect(v.air).toBe(false);
  });

  it("the body leans to a new slope over a few ticks, not at once", () => {
    // Flat, then a 20 % climb from z = −5.
    const climb = world((_x, z) => (z > -5 ? 5 : 5 + (-5 - z) * 0.2));
    const v = car("sedan", 0, 5, 8);
    const pitches: number[] = [];
    for (let i = 0; i < 60; i++) {
      stepVehicle(climb, dry, v, gas, TICK);
      pitches.push(v.pitch);
    }
    const steps = pitches.slice(1).map((p, i) => Math.abs(p - pitches[i]!));
    // No tick turns it by more than a third of the slope's pitch (atan 0.2 ≈ 0.197).
    expect(Math.max(...steps)).toBeLessThan(0.197 / 3);
    expect(pitches.at(-1)!).toBeCloseTo(Math.atan(0.2), 1);
  });

  it("fast over a crest the tyres go light (extended springs) before they leave the ground", () => {
    // A crest of 0.8 m over 40 m: at 22 m/s its top falls away at about 0.4 g.
    const crest = world((_x, z) =>
      z < 0 && z > -40 ? 5 + 0.4 * (1 - Math.cos((2 * Math.PI * -z) / 40)) : 5,
    );
    const v = car("sedan", 10, 5, 22);
    let most = 0,
      flew = false;
    for (let i = 0; i < 90; i++) {
      stepVehicle(crest, dry, v, gas, TICK);
      most = Math.max(most, v.sus ?? 0);
      flew ||= !!v.air;
    }
    expect(most).toBeGreaterThan(VEHICLES.suspension.sedan.droop * 0.3);
    expect(flew).toBe(false);
  });

  it("the bike travels further on softer springs than the sedan; the off-roaders more than both", () => {
    const S = VEHICLES.suspension;
    expect(S.bike.droop + S.bike.compress).toBeGreaterThan(S.sedan.droop + S.sedan.compress);
    expect(S.suv.droop).toBeGreaterThan(S.sedan.droop);
    expect(S.pickup.droop).toBeGreaterThan(S.sedan.droop);
  });

  it("the driver's prediction resumes a bounce exactly from the row's fields", () => {
    // Server and client step the same state (the row carries y to the mm and the travel).
    const bumpy = world((_x, z) => 5 + 0.08 * Math.abs(Math.sin((z * Math.PI) / 2.2)));
    const server = car("suv", 0, 5.05, 18);
    for (let i = 0; i < 40; i++) stepVehicle(bumpy, dry, server, gas, TICK);
    const row = (v: Vehicle) =>
      ({
        ...v,
        y: Math.round(v.y * 1000) / 1000,
        sus: Math.round((v.sus ?? 0) * 1000) / 1000,
        vy: Math.round((v.vy ?? 0) * 1000) / 1000,
      }) as Vehicle;
    const client = row(server);
    for (let i = 0; i < 30; i++) {
      stepVehicle(bumpy, dry, server, gas, TICK);
      stepVehicle(bumpy, dry, client, gas, TICK);
    }
    expect(client.y).toBeCloseTo(server.y, 3);
    expect(client.sus).toBeCloseTo(server.sus!, 3);
  });
});
