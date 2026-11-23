import { AIRCRAFT, newAircraft, toBody, toWorld, type Aircraft } from "./aircraft";
import type { StaticWorld } from "./static-world";
import type { WorldMeta } from "./world";

/**
 * The aircraft in the match's world (match.ts): its solid parts for players and shots, where it
 * waits at the Island Airfield, and where its occupants get out.
 */

/** The id a shot's hit carries when it strikes the aircraft (vehicle ids are 0 and up). */
export const AIRCRAFT_HIT = -2;

/**
 * Solid parts in the body frame [x0, y0, z0, x1, y1, z1] (plane-c172: span 11 m, length 8.2 m,
 * the CG at the origin). The cabin's windows (above the fuselage's sides, under the wing) stay
 * open, as a car's do: its occupants can be shot through them.
 */
export const AIRCRAFT_BOXES: ReadonlyArray<
  readonly [number, number, number, number, number, number]
> = [
  // Cowling and the fuselage's lower half to the tail.
  [-0.55, -0.75, -2.1, 0.55, 0.15, 1.6],
  [-0.4, -0.45, 1.6, 0.4, 0.45, 4.9],
  // The wing (high, over the cabin) and its struts' line.
  [-5.5, 0.82, -0.05, 5.5, 1.06, 1.45],
  // Tailplane and fin.
  [-1.7, 0.08, 4.4, 1.7, 0.3, 5.38],
  [-0.08, 0.3, 4.0, 0.08, 1.55, 5.38],
  // Cabin roof under the wing.
  [-0.55, 0.62, -0.6, 0.55, 0.82, 1.2],
];
/** Radius of a sphere holding every box (broad phase). */
const REACH = 6.2;

/** Ray (origin, unit direction) against the aircraft's boxes: distance or Infinity. */
export function rayAircraft(
  a: Aircraft,
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  max: number,
): number {
  // Broad phase: the ray's closest approach to the CG.
  const rx = a.x - ox,
    ry = a.y - oy,
    rz = a.z - oz;
  const along = rx * dx + ry * dy + rz * dz;
  if (along < -REACH || along > max + REACH) return Infinity;
  const cx = rx - dx * along,
    cy = ry - dy * along,
    cz = rz - dz * along;
  if (cx * cx + cy * cy + cz * cz > REACH * REACH) return Infinity;
  const o = toBody(a, [ox - a.x, oy - a.y, oz - a.z]);
  const d = toBody(a, [dx, dy, dz]);
  let best = Infinity;
  for (const b of AIRCRAFT_BOXES) {
    let t0 = 0,
      t1 = max;
    let hit = true;
    for (let k = 0; k < 3 && hit; k++) {
      const lo = b[k]!,
        hi = b[k + 3]!;
      if (Math.abs(d[k]!) < 1e-9) {
        if (o[k]! < lo || o[k]! > hi) hit = false;
        continue;
      }
      let ta = (lo - o[k]!) / d[k]!,
        tb = (hi - o[k]!) / d[k]!;
      if (ta > tb) [ta, tb] = [tb, ta];
      t0 = Math.max(t0, ta);
      t1 = Math.min(t1, tb);
      if (t0 > t1) hit = false;
    }
    if (hit && t0 < best) best = t0;
  }
  return best;
}

/** A point (with a margin) inside any of the aircraft's boxes. */
export function insideAircraft(a: Aircraft, x: number, y: number, z: number, margin: number) {
  const dx = x - a.x,
    dy = y - a.y,
    dz = z - a.z;
  if (dx * dx + dy * dy + dz * dz > (REACH + margin) ** 2) return false;
  const p = toBody(a, [dx, dy, dz]);
  for (const b of AIRCRAFT_BOXES)
    if (
      p[0] > b[0] - margin &&
      p[0] < b[3] + margin &&
      p[1] > b[1] - margin &&
      p[1] < b[4] + margin &&
      p[2] > b[2] - margin &&
      p[2] < b[5] + margin
    )
      return true;
  return false;
}

/**
 * The world plus the aircraft: nobody walks through it, and shots and sight lines stop at its
 * body (the windows stay open). `aircraft` returns the current one (null: none, or a wreck
 * that has burnt out is still solid). A per-match view, like withVehicles.
 */
export function withAircraft(world: StaticWorld, aircraft: () => Aircraft | null): StaticWorld {
  const w = Object.create(world) as StaticWorld;
  const proto = { blocked: world.blocked, raycast: world.raycast };
  w.blocked = function (x, y, z, height, radius) {
    if (proto.blocked.call(this, x, y, z, height, radius)) return true;
    const a = aircraft();
    if (!a) return false;
    const dx = x - a.x,
      dz = z - a.z;
    if (dx * dx + dz * dz > (REACH + radius) ** 2) return false;
    // The body's capsule at its feet, waist and head.
    for (const f of [0.15, 0.5, 0.9])
      if (insideAircraft(a, x, y + height * f, z, radius - 0.05)) return true;
    return false;
  };
  w.raycast = function (ox, oy, oz, dx, dy, dz, maxDistance, solidOnly) {
    const base = proto.raycast.call(this, ox, oy, oz, dx, dy, dz, maxDistance, solidOnly);
    const a = aircraft();
    if (!a) return base;
    const len = Math.hypot(dx, dy, dz);
    if (!(len > 0)) return base;
    const limit = base ? base.distance : maxDistance;
    const t = rayAircraft(a, ox, oy, oz, dx / len, dy / len, dz / len, limit / len) * len;
    if (t < limit) return { distance: t, kind: "box", vehicle: AIRCRAFT_HIT } as typeof base;
    return base;
  };
  return w;
}

/**
 * Where the match's aircraft waits: on the Island Airfield's runway (the longest), near its
 * western threshold, pointing down it, engine off. The first spot along the centre line with
 * nothing in the way (null: no runway on this map).
 */
export function aircraftSpawn(meta: WorldMeta, world: StaticWorld, id = 0): Aircraft | null {
  // The airfield's runway: the one nearest the Island Airfield (else the longest).
  const field = meta.pois?.find((p) => p.kind === "airfield");
  const mid = (r: { a: number[]; b: number[] }) => [
    (r.a[0]! + r.b[0]!) / 2,
    (r.a[1]! + r.b[1]!) / 2,
  ];
  const runway = [...(meta.runways ?? [])].sort((p, q) =>
    field
      ? Math.hypot(mid(p)[0]! - field.x, mid(p)[1]! - field.z) -
        Math.hypot(mid(q)[0]! - field.x, mid(q)[1]! - field.z)
      : Math.hypot(q.b[0] - q.a[0], q.b[1] - q.a[1]) - Math.hypot(p.b[0] - p.a[0], p.b[1] - p.a[1]),
  )[0];
  if (!runway) return null;
  // From the western end.
  const [a, b] = runway.a[0] <= runway.b[0] ? [runway.a, runway.b] : [runway.b, runway.a];
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ux = (b[0] - a[0]) / len,
    uz = (b[1] - a[1]) / len;
  const heading = Math.atan2(-ux, -uz);
  for (let along = 70; along < len * 0.4; along += 15) {
    const x = a[0] + ux * along,
      z = a[1] + uz * along;
    const ground = world.hf.heightAt(x, z);
    const plane = newAircraft(id, x, ground, z, heading);
    if (clearOf(world, plane)) return plane;
  }
  const x = a[0] + ux * 70,
    z = a[1] + uz * 70;
  return newAircraft(id, x, world.hf.heightAt(x, z), z, heading);
}

/** Nothing solid within the aircraft's boxes (spawn check). */
function clearOf(world: StaticWorld, a: Aircraft) {
  for (const b of AIRCRAFT_BOXES) {
    const r = Math.max(b[3] - b[0], b[5] - b[2]) / 2;
    const c = toWorld(a, [(b[0] + b[3]) / 2, b[1], (b[2] + b[5]) / 2]);
    if (world.blocked(a.x + c[0], a.y + c[1], a.z + c[2], b[4] - b[1], Math.min(r, 1.5)))
      return false;
  }
  // Wingtips and tail over the ground's slope.
  for (const p of [
    [-5.4, 0.9, 0.6],
    [5.4, 0.9, 0.6],
    [0, 0.2, 5.3],
  ] as const) {
    const c = toWorld(a, p);
    if (world.hf.heightAt(a.x + c[0], a.z + c[2]) > a.y + c[1] - 0.3) return false;
  }
  return true;
}

/** Speed (m/s) under which occupants may climb out on the ground. */
export const EXIT = { groundSpeed: 4, bailAgl: 60 } as const;

/** On its wheels (or its belly): the gear's springs may lift it a moment off the ground. */
export function onGround(world: StaticWorld, a: Aircraft) {
  return a.grounded || a.y + AIRCRAFT.wheels[0]!.at[1] - world.supportAt(a.x, a.z, 0.5, a.y) < 0.6;
}

/**
 * Where an occupant steps out on the ground, by seat (body frame, at the gear's level): beside
 * their own door first, then the other side, then behind the wing. World points, the first
 * the caller finds free comes first.
 */
export function exitSpots(a: Aircraft, seat: 0 | 1) {
  const side = seat === 0 ? -1 : 1;
  const y = AIRCRAFT.wheels[0]!.at[1] - 0.05;
  const spots = [
    [side * 1.35, y, -0.4],
    [side * 1.35, y, 0.6],
    [-side * 1.35, y, -0.4],
    [side * 1.1, y, 2.4],
    [-side * 1.1, y, 2.4],
  ] as const;
  return spots.map((p) => {
    const c = toWorld(a, p);
    return { x: a.x + c[0], y: a.y + c[1], z: a.z + c[2] };
  });
}

/** Where a bailing occupant leaves the cabin (beside their door, below the wing). */
export function bailSpot(a: Aircraft, seat: 0 | 1) {
  const c = toWorld(a, [seat === 0 ? -1.6 : 1.6, -0.6, 0.2]);
  return { x: a.x + c[0], y: a.y + c[1], z: a.z + c[2] };
}

/** Within reach of a door (E to board): the occupant's side of the cabin, ±2.6 m. */
export function nearDoor(a: Aircraft, x: number, y: number, z: number) {
  const p = toBody(a, [x - a.x, y - a.y, z - a.z]);
  return Math.abs(p[2] + 0.1) < 2 && Math.abs(p[0]) < 3.2 && p[1] > -2.6 && p[1] < 1.5;
}
