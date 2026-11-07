import type { Vector } from "../collision";

/** Original BR physics. Sweeps are at most 16 m / 20 ms; gravity chord error is
 * under 0.491 mm at 9.81 m/s². Every chord is traced, including the last partial one. */
export const BALLISTICS = { segmentM: 16, segmentSeconds: 0.02, maxSegments: 2048 } as const;
export type Flight = {
  origin: Vector;
  velocity: Vector;
  gravity: number;
  age: number;
  lifetime: number;
};
export type SweepHit<T> = { distance: number; value: T };
export type FlightHit<T> = { point: Vector; age: number; value: T };

export function newFlight(
  origin: Vector,
  dir: Vector,
  speed: number,
  gravity: number,
  range: number,
): Flight {
  const length = Math.hypot(dir.x, dir.y, dir.z);
  if (
    ![origin.x, origin.y, origin.z, length, speed, gravity, range].every(Number.isFinite) ||
    length < 1e-9 ||
    speed < 100 ||
    speed > 2000 ||
    gravity < 0 ||
    gravity > 30 ||
    range <= 0 ||
    range > 1000
  )
    throw new RangeError("Invalid BR flight");
  return {
    origin: { ...origin },
    velocity: {
      x: (dir.x * speed) / length,
      y: (dir.y * speed) / length,
      z: (dir.z * speed) / length,
    },
    gravity,
    age: 0,
    lifetime: range / speed,
  };
}

export function flightPoint(f: Flight, age: number): Vector {
  return {
    x: f.origin.x + f.velocity.x * age,
    y: f.origin.y + f.velocity.y * age - 0.5 * f.gravity * age * age,
    z: f.origin.z + f.velocity.z * age,
  };
}

/** Advances physical time, never a delayed snapshot hit. The visitor returns the nearest
 * collision on this finite chord. Collision terminates the flight even at distance zero. */
export function sweepFlight<T>(
  f: Flight,
  seconds: number,
  visit: (
    from: Vector,
    dir: Vector,
    length: number,
    start: number,
    end: number,
  ) => SweepHit<T> | null,
): FlightHit<T> | null {
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  const end = Math.min(f.lifetime, f.age + seconds);
  const speedBound = Math.hypot(f.velocity.x, f.velocity.y, f.velocity.z) + f.gravity * f.lifetime;
  const step = Math.min(BALLISTICS.segmentSeconds, BALLISTICS.segmentM / speedBound);
  let from = flightPoint(f, f.age);
  for (let n = 0; f.age < end && n < BALLISTICS.maxSegments; n++) {
    const start = f.age,
      next = Math.min(end, start + step);
    const to = flightPoint(f, next);
    const length = Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z);
    const dir = {
      x: (to.x - from.x) / length,
      y: (to.y - from.y) / length,
      z: (to.z - from.z) / length,
    };
    const hit = visit(from, dir, length, start, next);
    f.age = next;
    if (hit && Number.isFinite(hit.distance) && hit.distance >= 0 && hit.distance <= length) {
      const age = start + ((next - start) * hit.distance) / length;
      f.age = f.lifetime;
      return {
        point: {
          x: from.x + dir.x * hit.distance,
          y: from.y + dir.y * hit.distance,
          z: from.z + dir.z * hit.distance,
        },
        age,
        value: hit.value,
      };
    }
    from = to;
  }
  return null;
}
