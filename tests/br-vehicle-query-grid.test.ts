import { expect, test } from "vitest";
import type { StaticWorld } from "../src/lib/fps/br/static-world";
import {
  invalidateVehicleQueries,
  spec,
  withVehicles,
  type Vehicle,
} from "../src/lib/fps/br/vehicles";

const base = () =>
  ({
    boxes: new Float32Array(),
    blocked: () => false,
    supportAt: () => 0,
    raycast: () => null,
  }) as unknown as StaticWorld;
const car = (id: number, x: number, z: number): Vehicle => {
  const kind = (["sedan", "suv", "pickup", "bike"] as const)[id % 4]!;
  return {
    id,
    kind,
    condition: "good",
    x,
    y: id % 3,
    z,
    yaw: id * 0.71,
    speed: 0,
    pitch: 0,
    roll: 0,
    health: spec(kind).health,
    maxHealth: spec(kind).health,
    driver: -1,
    destroyed: false,
  };
};

test("indexed vehicle hull/support queries equal the original full scan, including cell boundaries", () => {
  let vehicles = Array.from({ length: 165 }, (_, i) =>
    car(i, (i % 15) * 17 - 120, Math.floor(i / 15) * 19 - 100),
  );
  let generation = 0;
  const linear = withVehicles(base(), () => vehicles);
  const indexed = withVehicles(
    base(),
    () => vehicles,
    () => generation,
  );
  let seed = 45678;
  const rnd = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
  const mismatches: unknown[] = [];
  for (let i = 0; i < 2400; i++) {
    if (i === 800) {
      for (const v of vehicles) {
        v.x += 31;
        v.z -= 27;
        v.yaw += 1;
        v.y += 0.5;
      }
      generation++;
    }
    if (i === 1600) {
      vehicles = [...vehicles.slice(20), car(200, -12, -6)];
      generation++;
    }
    const v = vehicles[i % vehicles.length]!;
    const x = v.x + (rnd() - 0.5) * 12;
    const z = v.z + (rnd() - 0.5) * 12;
    const y = v.y + rnd() * 2;
    const radius = 0.15 + rnd() * 0.65;
    const actual = [indexed.blocked(x, y, z, 1.7, radius), indexed.supportAt(x, z, radius, y + 1)];
    const expected = [linear.blocked(x, y, z, 1.7, radius), linear.supportAt(x, z, radius, y + 1)];
    if (actual[0] !== expected[0] || actual[1] !== expected[1])
      mismatches.push({ i, actual, expected });
  }
  expect(mismatches).toEqual([]);
});

test("moving a car refreshes queries before the next tick; rays retain current vehicle positions", () => {
  const vehicles = [car(0, -12, -6)];
  const indexed = withVehicles(
    base(),
    () => vehicles,
    () => 0,
  );
  const linear = withVehicles(base(), () => vehicles);
  expect(indexed.blocked(-12, 0.5, -6, 1.7, 0.35)).toBe(true);
  vehicles[0]!.x = 48;
  vehicles[0]!.z = 24;
  invalidateVehicleQueries(indexed);
  expect(indexed.blocked(-12, 0.5, -6, 1.7, 0.35)).toBe(false);
  expect(indexed.blocked(48, 0.5, 24, 1.7, 0.35)).toBe(true);
  expect(indexed.supportAt(48, 24, 0.35, 5)).toBe(linear.supportAt(48, 24, 0.35, 5));
  expect(indexed.raycast(48, 0.5, 10, 0, 0, 1, 30)).toEqual(
    linear.raycast(48, 0.5, 10, 0, 0, 1, 30),
  );
});

test("repeated queries away from parked cars do not scan their positions again", () => {
  let reads = 0;
  const vehicles = Array.from({ length: 165 }, (_, i) => {
    const v = car(i, i * 20, 0),
      x = v.x;
    Object.defineProperty(v, "x", {
      get: () => {
        reads++;
        return x;
      },
    });
    return v;
  });
  const indexed = withVehicles(
    base(),
    () => vehicles,
    () => 0,
  );
  indexed.supportAt(-100, -100, 0.35, 3);
  reads = 0;
  for (let i = 0; i < 1000; i++) {
    expect(indexed.blocked(-100, 0, -100, 1.7, 0.35)).toBe(false);
    expect(indexed.supportAt(-100, -100, 0.35, 3)).toBe(0);
  }
  expect(reads).toBe(0);
});
