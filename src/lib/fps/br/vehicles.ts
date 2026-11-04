import { waterSurface } from "./drop";
import type { RayHit, StaticWorld } from "./static-world";
import type { WorldMeta } from "./world";

/**
 * Cars and motorbikes (LOOT-SPEC §19–33), server-authoritative and deterministic (the driver's
 * client predicts its own vehicle with this same code). Driver-only (the spec's first step).
 *
 * Handling is a kinematic bicycle model on the island's ground: throttle and brake change the
 * speed along the heading (with drag, slope and a top speed that depends on the vehicle's
 * condition), steering turns the heading at a rate set by speed and wheelbase (with less lock
 * at speed; a motorbike turns tighter, accelerates faster, but loses steering at high speed and
 * takes more harm from crashes). The body follows the ground under its wheels; collisions with
 * buildings, trees, rocks and other vehicles stop it and cost health in proportion to the impact.
 * Everything tunable lives in VEHICLES below.
 */
export type VehicleKind = "sedan" | "suv" | "pickup" | "bike";
export type Condition = "good" | "used" | "damaged";

export const VEHICLES = {
  kinds: {
    // Car models are the island's abandoned cars (art/br/assets/kit.json); the bike is built in code.
    sedan: {
      name: "Car",
      model: "car-sedan",
      length: 4.7,
      width: 1.74,
      height: 1.39,
      maxSpeed: 31,
      accel: 6.5,
      brake: 12,
      reverse: 7,
      wheelbase: 2.7,
      steer: 0.55,
      health: 900,
      crashScale: 1,
      bike: false,
    },
    suv: {
      name: "SUV",
      model: "car-cruiser",
      length: 5.1,
      width: 1.84,
      height: 1.58,
      maxSpeed: 29,
      accel: 6,
      brake: 11,
      reverse: 7,
      wheelbase: 2.9,
      steer: 0.52,
      health: 1100,
      crashScale: 0.85,
      bike: false,
    },
    pickup: {
      name: "Pickup truck",
      model: "car-pickup",
      length: 4.9,
      width: 2.13,
      height: 1.91,
      maxSpeed: 28,
      accel: 5.5,
      brake: 11,
      reverse: 7,
      wheelbase: 3.1,
      steer: 0.5,
      health: 1200,
      crashScale: 0.8,
      bike: false,
    },
    bike: {
      name: "Motorbike",
      model: "",
      length: 2.1,
      width: 0.8,
      height: 1.15,
      maxSpeed: 36,
      accel: 9.5,
      brake: 13,
      reverse: 3,
      wheelbase: 1.45,
      steer: 0.75,
      health: 400,
      crashScale: 1.6,
      bike: true,
    },
  } satisfies Record<VehicleKind, VehicleSpec>,
  conditions: {
    good: { health: 1, speed: 1, weight: 0.35 },
    used: { health: 0.8, speed: 0.93, weight: 0.45 },
    damaged: { health: 0.55, speed: 0.85, weight: 0.2 },
  } satisfies Record<Condition, { health: number; speed: number; weight: number }>,
  /** Spawns per match: roads sampled every `spacing` m, each spot kept with `chance`. */
  spawn: { spacing: 140, chance: 0.18, min: 30, max: 70, minGap: 40, bikeShare: 0.3 },
  /** Kind weights by area (nearest POI kind). */
  areaKinds: {
    town: { sedan: 4, suv: 2, pickup: 1, bike: 3 },
    industrial: { sedan: 1, suv: 1, pickup: 4, bike: 1 },
    military: { sedan: 0, suv: 3, pickup: 3, bike: 1 },
    rural: { sedan: 2, suv: 2, pickup: 2, bike: 3 },
  } as Record<string, Record<VehicleKind, number>>,
  /** Impacts above this speed (m/s) cost health: (speed − threshold) × perMs × crashScale. */
  crash: { threshold: 5, perMs: 28, playerThreshold: 6, playerPerMs: 7 },
  enterReach: 3.2,
  drag: 0.35,
  rolling: 1.2,
  gravity: 9.8,
  /** Water deeper than this stops a vehicle (it stalls). */
  wadeDepth: 0.8,
} as const;
type VehicleSpec = {
  name: string;
  model: string;
  length: number;
  width: number;
  height: number;
  maxSpeed: number;
  accel: number;
  brake: number;
  reverse: number;
  wheelbase: number;
  steer: number;
  health: number;
  crashScale: number;
  bike: boolean;
};
export const spec = (k: VehicleKind): VehicleSpec => VEHICLES.kinds[k];

export type Vehicle = {
  id: number;
  kind: VehicleKind;
  condition: Condition;
  x: number;
  y: number;
  z: number;
  /** Heading: forward = (−sin yaw, −cos yaw), as for players. */
  yaw: number;
  speed: number;
  /** Visual tilt from the ground under the wheels (pitch, roll), radians. */
  pitch: number;
  roll: number;
  health: number;
  maxHealth: number;
  driver: number;
  destroyed: boolean;
};
export type DriveInput = { forward: number; strafe: number; jump?: boolean };

const rng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
function pick<T extends string>(w: Record<T, number>, r: number): T {
  const total = Object.values<number>(w).reduce((s, v) => s + v, 0);
  let x = r * total;
  for (const [k, v] of Object.entries(w) as Array<[T, number]>) if ((x -= v) < 0) return k;
  return Object.keys(w)[0] as T;
}

/** Area of a road point: the nearest POI's kind decides what tends to park there. */
function areaOf(meta: WorldMeta, x: number, z: number) {
  let best = "rural",
    d = 700;
  for (const p of meta.pois) {
    const dist = Math.hypot(p.x - x, p.z - z);
    if (dist >= d) continue;
    d = dist;
    const k = String(p.kind);
    best = /military|prison|airfield/.test(k)
      ? "military"
      : /industrial|quarry|dam/.test(k)
        ? "industrial"
        : /town|commercial|superstore|hospital/.test(k)
          ? "town"
          : "rural";
  }
  return best;
}

/** Corners of a vehicle's footprint (world x/z), for collision and placement. */
function footprint(v: Pick<Vehicle, "x" | "z" | "yaw" | "kind">, grow = 0) {
  const s = spec(v.kind);
  const fx = -Math.sin(v.yaw),
    fz = -Math.cos(v.yaw);
  const rx = -fz,
    rz = fx;
  const hl = s.length / 2 + grow,
    hw = s.width / 2 + grow;
  return [
    [v.x + fx * hl + rx * hw, v.z + fz * hl + rz * hw],
    [v.x + fx * hl - rx * hw, v.z + fz * hl - rz * hw],
    [v.x - fx * hl + rx * hw, v.z - fz * hl + rz * hw],
    [v.x - fx * hl - rx * hw, v.z - fz * hl - rz * hw],
  ] as const;
}

/** Sample points along the body's centreline (circles of radius width/2) for collisions. */
function circles(v: Pick<Vehicle, "x" | "z" | "yaw" | "kind">) {
  const s = spec(v.kind);
  const fx = -Math.sin(v.yaw),
    fz = -Math.cos(v.yaw);
  const n = s.bike ? 2 : 3;
  const r = s.width / 2;
  const out: Array<[number, number, number]> = [];
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1) - 0.5) * (s.length - s.width);
    out.push([v.x + fx * t, v.z + fz * t, r]);
  }
  return out;
}

/** Highest ground (terrain or a box top within a step) under the wheels. */
function groundUnder(world: StaticWorld, v: Pick<Vehicle, "x" | "z" | "yaw" | "kind" | "y">) {
  const f = footprint(v);
  const h = f.map(([x, z]) => world.supportAt(x, z, 0.2, v.y + 0.6));
  return h;
}

/**
 * Vehicles for a match: along the island's real roads (never new ones), at the road's edge,
 * facing along it, on gentle ground, clear of buildings, trees, water and each other. The
 * count, kinds and conditions differ every match (seeded) within the configured limits.
 */
export function spawnVehicles(meta: WorldMeta, world: StaticWorld, seed: number): Vehicle[] {
  const random = rng(seed ^ 0x7e1c0de5);
  const S = VEHICLES.spawn;
  const out: Vehicle[] = [];
  const target = S.min + Math.floor(random() * (S.max - S.min + 1));
  const candidates: Array<{ x: number; z: number; yaw: number; w: number }> = [];
  let carry = 0;
  for (const road of meta.roads) {
    for (let i = 1; i < road.points.length; i++) {
      const [ax, az] = road.points[i - 1]!,
        [bx, bz] = road.points[i]!;
      const len = Math.hypot(bx - ax, bz - az);
      for (let t = carry; t < len; t += S.spacing) {
        const k = t / len;
        candidates.push({
          x: ax + (bx - ax) * k,
          z: az + (bz - az) * k,
          yaw: Math.atan2(-(bx - ax), -(bz - az)),
          w: road.width,
        });
      }
      carry = (carry - len) % S.spacing;
      if (carry < 0) carry += S.spacing;
    }
  }
  // Shuffle (seeded) and take what validates.
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j]!, candidates[i]!];
  }
  for (const c of candidates) {
    if (out.length >= target) break;
    if (random() > S.chance * 3) continue;
    const kinds = VEHICLES.areaKinds[areaOf(meta, c.x, c.z)] ?? VEHICLES.areaKinds["rural"]!;
    const kind = pick(kinds, random());
    const side = random() < 0.5 ? -1 : 1;
    const off = Math.max(0, c.w / 2 - spec(kind).width / 2 - 0.4) * side;
    const yaw = c.yaw + (random() < 0.5 ? Math.PI : 0);
    const fx = -Math.sin(c.yaw),
      fz = -Math.cos(c.yaw);
    const x = c.x - fz * off,
      z = c.z + fx * off;
    if (out.some((v) => Math.hypot(v.x - x, v.z - z) < S.minGap)) continue;
    const condition = pick(
      {
        good: VEHICLES.conditions.good.weight,
        used: VEHICLES.conditions.used.weight,
        damaged: VEHICLES.conditions.damaged.weight,
      },
      random(),
    );
    const v: Vehicle = {
      id: out.length,
      kind,
      condition,
      x: Math.round(x * 100) / 100,
      y: 0,
      z: Math.round(z * 100) / 100,
      yaw: Math.round(yaw * 1000) / 1000,
      speed: 0,
      pitch: 0,
      roll: 0,
      health: 0,
      maxHealth: Math.round(spec(kind).health * VEHICLES.conditions[condition].health),
      driver: -1,
      destroyed: false,
    };
    v.health = v.maxHealth;
    v.y = world.hf.heightAt(v.x, v.z) + 50;
    const h = groundUnder(world, { ...v, y: world.hf.heightAt(v.x, v.z) + 1 });
    const top = Math.max(...h),
      low = Math.min(...h);
    if (top - low > 0.9) continue; // too steep or half on a kerb/wall
    v.y = top;
    const water = waterSurface(meta, world.hf.heightAt(v.x, v.z), v.x, v.z);
    if (water !== null && water - v.y > 0.2) continue;
    if (
      circles(v).some(([cx, cz, r]) =>
        world.blocked(cx, v.y + 0.35, cz, spec(kind).height - 0.4, r),
      )
    )
      continue;
    settleTilt(world, v);
    out.push(v);
  }
  return out;
}

function settleTilt(world: StaticWorld, v: Vehicle) {
  const s = spec(v.kind);
  const f = footprint(v);
  const h = f.map(([x, z]) => world.supportAt(x, z, 0.2, v.y + 0.7));
  // front-left, front-right, back-left, back-right
  const front = (h[0]! + h[1]!) / 2,
    back = (h[2]! + h[3]!) / 2,
    left = (h[0]! + h[2]!) / 2,
    right = (h[1]! + h[3]!) / 2;
  v.y = Math.max(...h.map((y) => y - 0.0));
  v.y = (front + back) / 2 + Math.abs(front - back) * 0.25;
  v.pitch = Math.atan2(front - back, s.length);
  v.roll = s.bike ? 0 : Math.atan2(left - right, s.width);
}

/**
 * One fixed step of a vehicle. `blocked` tests the world with other vehicles (not this one).
 * Returns the impact speed of a crash this step (0 if none), for damage.
 */
export function stepVehicle(
  world: StaticWorld,
  meta: WorldMeta,
  v: Vehicle,
  input: DriveInput | null,
  dtMs: number,
  others: readonly Vehicle[] = [],
): number {
  if (v.destroyed) return 0;
  const s = spec(v.kind);
  const dt = dtMs / 1000;
  const cond = VEHICLES.conditions[v.condition];
  const top = s.maxSpeed * cond.speed * (0.6 + 0.4 * Math.max(0.25, v.health / v.maxHealth));
  const throttle = input ? Math.max(-1, Math.min(1, input.forward || 0)) : 0;
  const steerIn = input ? Math.max(-1, Math.min(1, input.strafe || 0)) : 0;
  const brakeHard = !!input?.jump || !input;
  // Longitudinal: throttle forward, brake then reverse, drag, rolling resistance, slope.
  if (throttle > 0)
    v.speed += (v.speed < 0 ? s.brake : s.accel * (1 - Math.max(0, v.speed) / top)) * throttle * dt;
  else if (throttle < 0) v.speed -= (v.speed > 0.3 ? s.brake : s.accel * 0.6) * -throttle * dt;
  if (brakeHard)
    v.speed -= Math.sign(v.speed) * Math.min(Math.abs(v.speed), s.brake * dt * (input ? 1 : 0.6));
  v.speed -=
    Math.sign(v.speed) *
    Math.min(Math.abs(v.speed), (VEHICLES.rolling + VEHICLES.drag * Math.abs(v.speed) * 0.05) * dt);
  v.speed -= VEHICLES.gravity * Math.sin(v.pitch) * dt * 0.8;
  v.speed = Math.max(-s.reverse, Math.min(top, v.speed));
  // Steering: less lock at speed (a bike much less), turn rate from the bicycle model.
  const lock = s.steer / (1 + Math.abs(v.speed) / (s.bike ? 9 : 14));
  const yawRate = (v.speed / s.wheelbase) * Math.tan(lock * steerIn);
  const nyaw = v.yaw - yawRate * dt;
  const nx = v.x - Math.sin(nyaw) * v.speed * dt,
    nz = v.z - Math.cos(nyaw) * v.speed * dt;
  const next = { ...v, x: nx, z: nz, yaw: nyaw };
  // Collisions: the world (buildings, rocks, trees) above wheel height, and other vehicles.
  const clearance = 0.45;
  let hit = circles(next).some(([cx, cz, r]) =>
    world.blocked(
      cx,
      Math.max(v.y, world.hf.heightAt(cx, cz)) + clearance,
      cz,
      s.height - clearance - 0.1,
      r,
    ),
  );
  if (!hit)
    for (const o of others) {
      if (o === v || o.id === v.id || Math.hypot(o.x - nx, o.z - nz) > 8) continue;
      for (const [ax, az, ar] of circles(next))
        for (const [bx, bz, br] of circles(o))
          if (Math.hypot(ax - bx, az - bz) < ar + br) hit = true;
    }
  // Ground under the new footprint: too high a step (a wall, a kerb above the wheels) blocks.
  if (!hit) {
    const h = groundUnder(world, next);
    if (Math.max(...h) - v.y > 0.7) hit = true;
  }
  let impact = 0;
  if (hit) {
    impact = Math.abs(v.speed);
    v.speed = -v.speed * 0.15;
    v.yaw = nyaw;
  } else {
    v.x = nx;
    v.z = nz;
    v.yaw = nyaw;
  }
  // Follow the ground (no floating, no sinking); water too deep stalls it.
  const before = v.y;
  settleTilt(world, v);
  if (v.y < before - 0.5) v.y = before - Math.min(before - v.y, 9.8 * dt * 2); // drive off a ledge: drop, not snap
  const water = waterSurface(meta, world.hf.heightAt(v.x, v.z), v.x, v.z);
  if (water !== null && water - v.y > VEHICLES.wadeDepth) v.speed *= 0.6;
  v.x = Math.round(v.x * 1000) / 1000;
  v.z = Math.round(v.z * 1000) / 1000;
  v.y = Math.round(v.y * 1000) / 1000;
  v.yaw = Math.atan2(Math.sin(v.yaw), Math.cos(v.yaw));
  return impact;
}

/** Crash damage to the vehicle for an impact at `speed` m/s. */
export function crashDamage(kind: VehicleKind, speed: number) {
  const c = VEHICLES.crash;
  return speed > c.threshold ? (speed - c.threshold) * c.perMs * spec(kind).crashScale : 0;
}

/** Where the driver gets out: beside the driver's door, else the other side, behind, ahead. */
export function exitSpot(world: StaticWorld, v: Vehicle) {
  const s = spec(v.kind);
  const fx = -Math.sin(v.yaw),
    fz = -Math.cos(v.yaw);
  const rx = -fz,
    rz = fx;
  const side = s.width / 2 + 0.7,
    end = s.length / 2 + 0.8;
  for (const [ox, oz] of [
    [-rx * side, -rz * side],
    [rx * side, rz * side],
    [-fx * end, -fz * end],
    [fx * end, fz * end],
    [-rx * (side + 1), -rz * (side + 1)],
    [rx * (side + 1), rz * (side + 1)],
  ] as const) {
    const x = v.x + ox,
      z = v.z + oz;
    const y = world.supportAt(x, z, 0.35, v.y + 1.2);
    if (Math.abs(y - v.y) > 1.6) continue;
    if (world.blocked(x, y + 0.05, z, 1.75, 0.35)) continue;
    return { x, y, z };
  }
  return null;
}

/** The driver's seat (where the driver's body rides), and their eye for the camera and shots. */
export function seatOf(v: Vehicle) {
  const s = spec(v.kind);
  const fx = -Math.sin(v.yaw),
    fz = -Math.cos(v.yaw);
  const rx = -fz,
    rz = fx;
  const across = s.bike ? 0 : -s.width * 0.22;
  const along = s.bike ? -0.15 : 0.1;
  return {
    x: v.x + rx * across + fx * along,
    y: v.y + (s.bike ? 0.35 : 0.15),
    z: v.z + rz * across + fz * along,
  };
}

// ------------------------------------------------------------------ the world with vehicles

/** Ray against a vehicle's body (an oriented box from wheel height to its roof). */
function rayVehicle(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  v: Vehicle,
): number {
  const s = spec(v.kind);
  const c = Math.cos(v.yaw),
    sn = Math.sin(v.yaw);
  // Into the vehicle's frame: local x across, local z along (forward = −z).
  const px = ox - v.x,
    pz = oz - v.z;
  const lx = px * c - pz * sn,
    lz = px * sn + pz * c;
  const ldx = dx * c - dz * sn,
    ldz = dx * sn + dz * c;
  const lo = [-s.width / 2, v.y + 0.35, -s.length / 2],
    hi = [s.width / 2, v.y + s.height * (s.bike ? 0.75 : 0.72), s.length / 2];
  const p = [lx, oy, lz],
    d = [ldx, dy, ldz];
  let t0 = 0,
    t1 = Infinity;
  for (let k = 0; k < 3; k++) {
    if (Math.abs(d[k]!) < 1e-9) {
      if (p[k]! < lo[k]! || p[k]! > hi[k]!) return Infinity;
      continue;
    }
    let a = (lo[k]! - p[k]!) / d[k]!,
      b = (hi[k]! - p[k]!) / d[k]!;
    if (a > b) [a, b] = [b, a];
    t0 = Math.max(t0, a);
    t1 = Math.min(t1, b);
    if (t0 > t1) return Infinity;
  }
  return t0;
}

export type VehicleRayHit = RayHit & { vehicle?: number };

/**
 * The island plus this match's vehicles: players cannot walk through a vehicle, can stand on
 * one, and shots and sight lines stop at its body (the cabin's upper part stays open: a driver's
 * head and chest can be hit through the windows). A per-match view of the shared world.
 */
export function withVehicles(world: StaticWorld, vehicles: () => readonly Vehicle[]): StaticWorld {
  const w = Object.create(world) as StaticWorld;
  // Private scratch for the inherited queries (the world itself may serve other matches).
  Object.assign(w, { seen: new Uint32Array(world.boxes.length / 6), stamp: 0 });
  // The base's own methods (it may itself be a view, e.g. withDoors), on this view's scratch.
  const proto = { blocked: world.blocked, supportAt: world.supportAt, raycast: world.raycast };
  w.blocked = function (x, y, z, height, radius) {
    if (proto.blocked.call(this, x, y, z, height, radius)) return true;
    for (const v of vehicles()) {
      if (Math.hypot(v.x - x, v.z - z) > 6) continue;
      const s = spec(v.kind);
      if (y > v.y + s.height * 0.72 || y + height < v.y + 0.3) continue;
      for (const [cx, cz, r] of circles(v))
        if (Math.hypot(cx - x, cz - z) < r + radius - 0.05) return true;
    }
    return false;
  };
  w.supportAt = function (x, z, radius, maxY) {
    let top = proto.supportAt.call(this, x, z, radius, maxY);
    for (const v of vehicles()) {
      if (Math.hypot(v.x - x, v.z - z) > 6) continue;
      const roof = v.y + spec(v.kind).height * 0.72;
      if (roof <= top || roof > maxY + 1e-6) continue;
      for (const [cx, cz, r] of circles(v))
        if (Math.hypot(cx - x, cz - z) < r + radius * 0.5) top = roof;
    }
    return top;
  };
  w.raycast = function (ox, oy, oz, dx, dy, dz, maxDistance): VehicleRayHit | null {
    const base = proto.raycast.call(
      this,
      ox,
      oy,
      oz,
      dx,
      dy,
      dz,
      maxDistance,
    ) as VehicleRayHit | null;
    const len = Math.hypot(dx, dy, dz);
    if (!(len > 0)) return base;
    let best = base;
    for (const v of vehicles()) {
      // Quick reject: the vehicle's distance from the ray's segment.
      const t = rayVehicle(ox, oy, oz, dx / len, dy / len, dz / len, v);
      if (t < (best ? best.distance : maxDistance))
        best = { distance: t, kind: "box", vehicle: v.id };
    }
    return best;
  };
  return w;
}
