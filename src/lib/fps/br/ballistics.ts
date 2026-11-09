import type { Vector } from "../collision";

/**
 * Original BR physics: gravity and linear air drag (the velocity decays as e^(−k·t)), in closed
 * form so the server, tests and any client trace agree exactly. Sweeps are at most 16 m / 20 ms;
 * the chord error stays under half a millimetre. Every chord is traced, including the last one.
 *
 * Drag is what makes the drop grow with range the way PUBG's and H1Z1's does (research
 * 2026-11-09: PUBG flies real-world muzzle speeds — AKM 715, M416 780, MP5K 400, Deagle 450,
 * AWM 945 m/s — under gravity with zeroed sights; H1Z1's January 2018 tuning slowed the ARs to
 * 500 m/s and added drop; Warzone likewise gives every gun a bullet velocity and drop). Without a
 * zeroing system here the sights look straight along the bore, so close fights are unaffected
 * while 200 m+ shots need a visible hold-over (items.ts tables the figures per gun).
 */
export const BALLISTICS = { segmentM: 16, segmentSeconds: 0.02, maxSegments: 2048 } as const;
export type Flight = {
  origin: Vector;
  velocity: Vector;
  gravity: number;
  /** Linear drag constant k (1/s); 0 is a vacuum parabola. */
  drag: number;
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
  drag = 0,
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
    range > 1000 ||
    !Number.isFinite(drag) ||
    drag < 0 ||
    drag > 5 ||
    // The bullet must still be able to reach its range (it coasts at most speed / drag).
    (range * drag) / speed >= 0.95
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
    drag,
    age: 0,
    // Time to cover `range` along the line of fire: s(t) = speed·(1 − e^(−k·t)) / k.
    lifetime: drag > 0 ? -Math.log(1 - (range * drag) / speed) / drag : range / speed,
  };
}

export function flightPoint(f: Flight, age: number): Vector {
  const k = f.drag;
  if (!(k > 0))
    return {
      x: f.origin.x + f.velocity.x * age,
      y: f.origin.y + f.velocity.y * age - 0.5 * f.gravity * age * age,
      z: f.origin.z + f.velocity.z * age,
    };
  // With drag: position = v0·(1 − e^(−k·t)) / k, and gravity's terminal-velocity term.
  const coast = (1 - Math.exp(-k * age)) / k;
  return {
    x: f.origin.x + f.velocity.x * coast,
    y: f.origin.y + f.velocity.y * coast - (f.gravity / k) * (age - coast),
    z: f.origin.z + f.velocity.z * coast,
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
