import { waterSurface } from "./drop";
import type { RayHit, StaticWorld } from "./static-world";
import type { WorldMeta } from "./world";

/**
 * Cars and motorbikes (LOOT-SPEC §19–33), server-authoritative and deterministic (the driver's
 * client predicts its own vehicle with this same code). Driver-only (the spec's first step).
 *
 * Handling (owner, 2026-11-08: "easy to drive, still some feeling", like Warzone, H1Z1 and
 * PUBG): an arcade bicycle model on the island's ground. Throttle and brake change the speed
 * along the heading (drag, slope, a top speed set by the vehicle's condition); the wheel turns
 * toward the key smoothly rather than snapping (`steer`), less lock at speed. The car's velocity
 * is kept in the world as it turns, so the heading leads it and the difference (`slip`, sideways
 * m/s) is gripped back by the tyres within a fraction of a second: a hard turn at speed slides a
 * little, the handbrake (Space) lets go of the rear for a proper slide and a tighter turn,
 * off-road the tyres grip less. A motorbike grips harder and turns tighter but loses steering at
 * high speed and takes more harm from crashes. The body follows the ground under its wheels;
 * collisions with buildings, trees, rocks and other vehicles stop it and cost health in
 * proportion to the impact. Everything tunable lives in VEHICLES below.
 */
export type VehicleKind = "sedan" | "suv" | "pickup" | "bike";
export type Condition = "good" | "used" | "damaged";

export const VEHICLES = {
  kinds: {
    // The drivable models (public/fps/br/models/vehicles.glb, CC BY: art/blender/br/
    // build_vehicles.mjs); sizes measured from them. Roles from the research (2026-11-08):
    // the sedan is the fast road car (PUBG's Dacia, H1Z1's police car), the 4x4 the sturdy
    // off-roader (UAZ, H1Z1's jeep, Warzone's SUV), the lifted pickup heavy and tough, the dirt
    // bike the quickest and the most exposed.
    sedan: {
      name: "Police car",
      model: "car-sedan",
      length: 4.75,
      width: 1.8,
      height: 1.33,
      maxSpeed: 33,
      accel: 7,
      brake: 12,
      reverse: 7,
      wheelbase: 2.67,
      steer: 0.55,
      health: 900,
      crashScale: 1,
      climb: 0.5,
      offroad: 0.6,
      bike: false,
    },
    suv: {
      name: "4x4",
      model: "car-cruiser",
      length: 4.45,
      width: 1.95,
      height: 1.9,
      maxSpeed: 28,
      accel: 6.2,
      brake: 11,
      reverse: 7,
      wheelbase: 2.53,
      steer: 0.56,
      health: 1200,
      crashScale: 0.8,
      climb: 0.95,
      offroad: 0.95,
      bike: false,
    },
    pickup: {
      name: "Pickup",
      model: "car-pickup",
      length: 5.15,
      width: 2.0,
      height: 2.23,
      maxSpeed: 30,
      accel: 5.8,
      brake: 11,
      reverse: 7,
      wheelbase: 2.94,
      steer: 0.5,
      health: 1300,
      crashScale: 0.75,
      climb: 0.9,
      offroad: 0.85,
      bike: false,
    },
    bike: {
      name: "Dirt bike",
      model: "",
      length: 2.15,
      width: 0.8,
      height: 1.26,
      maxSpeed: 36,
      accel: 9.5,
      brake: 13,
      reverse: 3,
      wheelbase: 1.46,
      steer: 0.75,
      health: 400,
      crashScale: 1.2,
      climb: 0.85,
      offroad: 0.85,
      bike: true,
    },
  } satisfies Record<VehicleKind, VehicleSpec>,
  conditions: {
    good: { health: 1, speed: 1, weight: 0.35 },
    used: { health: 0.8, speed: 0.93, weight: 0.45 },
    damaged: { health: 0.55, speed: 0.85, weight: 0.2 },
  } satisfies Record<Condition, { health: number; speed: number; weight: number }>,
  /**
   * Spawns per match (owner, 2026-11-08: "across the map, more in neighbourhoods and towns",
   * as PUBG's garages and Warzone's town streets): parked at the kerb of the island's roads and
   * in front of houses, about three of four in towns and neighbourhoods, the rest along the
   * country roads, and at least one in every `cell` of the island that has a road.
   */
  spawn: {
    // Raised 2026-11-11 (owner: "increase motorbike/cars to drive around the map"): about
    // half as many again, closer together in town and along the country roads.
    spacing: 70,
    min: 130,
    max: 165,
    /** Chance a sampled spot is used: town streets, country roads, beside a dwelling. */
    townChance: 0.65,
    ruralChance: 0.16,
    drivewayChance: 0.4,
    /** Closest two parked vehicles (m), in towns and in the country. */
    townGap: 20,
    ruralGap: 45,
    /** Coverage grid (m): every cell with a road gets at least one vehicle. */
    cell: 1800,
  },
  /** Kind weights by area (nearest POI kind). */
  areaKinds: {
    town: { sedan: 4, suv: 2, pickup: 1, bike: 4 },
    industrial: { sedan: 1, suv: 1, pickup: 4, bike: 1 },
    military: { sedan: 0, suv: 3, pickup: 3, bike: 1 },
    rural: { sedan: 2, suv: 3, pickup: 2, bike: 4 },
  } as Record<string, Record<VehicleKind, number>>,
  /** Impacts above this speed (m/s) cost health: (speed − threshold) × perMs × crashScale. */
  crash: { threshold: 6, perMs: 28, playerThreshold: 6, playerPerMs: 7, maxShare: 0.45 },
  enterReach: 3.2,
  /**
   * Grip (1/s: how fast sideways slide is caught), the steering wheel's speed (1/s toward the
   * key, faster back to centre), the handbrake's grip and extra turn, and off-road grip.
   */
  handling: {
    grip: 9,
    bikeGrip: 13,
    handbrakeGrip: 1.6,
    handbrakeTurn: 1.45,
    handbrakeDecel: 6,
    steerIn: 3.6,
    steerOut: 6,
    /** Above this slope (rise/run under the wheels) the tyres grip like off-road. */
    roughSlope: 0.12,
  },
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
  /** The tallest step or obstacle (rock, kerb, log) the wheels ride over (m). */
  climb: number;
  /** How well the tyres grip off the road (rough or steep ground), 0..1. */
  offroad: number;
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
  /** Steering wheel, −1 (left) … 1 (right), eased toward the key. */
  steer?: number;
  /** Sideways slide (m/s, + to the right of the heading), caught by the tyres' grip. */
  slip?: number;
  /**
   * Tyres shot out (owner, 2026-11-11: "break the tyres"), bits: 1 front-left, 2 front-right,
   * 4 rear-left, 8 rear-right (a bike: 1 front, 4 rear).
   */
  flat?: number;
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
  const h = f.map(([x, z]) => world.supportAt(x, z, 0.2, v.y + spec(v.kind).climb + 0.05));
  return h;
}

/** Houses and other homes a car is parked in front of (the layout's dwellings). */
export const DWELLINGS = new Set([
  "house",
  "bungalow",
  "townhouse",
  "rural-house",
  "rural-wood-1",
  "rural-wood-4",
  "cabin",
  "barn",
  "apartment",
  "bauhaus-block",
  "police-station",
  "fire-station",
  "brick-shop",
  "strip-mall",
]);
/** POI kinds that count as a town or neighbourhood for spawning. */
const TOWNISH = /town|commercial|superstore|hospital|cabins|compounds/;

/** Inside a town's or neighbourhood's area (its POI radius)? */
export function inTown(meta: WorldMeta, x: number, z: number) {
  return meta.pois.some(
    (p) => TOWNISH.test(String(p.kind)) && Math.hypot(p.x - x, p.z - z) < (p.radius ?? 400),
  );
}

/**
 * Vehicles for a match: at the kerb of the island's real roads (never new ones), facing along
 * them, and parked in front of houses (`layout`: the island's placements), on gentle ground,
 * clear of buildings, trees, water and each other. Mostly in towns and neighbourhoods, some
 * along every country road; the count, kinds and conditions differ every match (seeded).
 */
export function spawnVehicles(
  meta: WorldMeta,
  world: StaticWorld,
  seed: number,
  layout: readonly { model: string; x: number; z: number; turn: number }[] = [],
): Vehicle[] {
  const random = rng(seed ^ 0x7e1c0de5);
  const S = VEHICLES.spawn;
  const out: Vehicle[] = [];
  const target = S.min + Math.floor(random() * (S.max - S.min + 1));
  type Candidate = {
    x: number;
    z: number;
    yaw: number;
    w: number;
    town: boolean;
    driveway: boolean;
  };
  const candidates: Candidate[] = [];
  let carry = 0;
  for (const road of meta.roads) {
    for (let i = 1; i < road.points.length; i++) {
      const [ax, az] = road.points[i - 1]!,
        [bx, bz] = road.points[i]!;
      const len = Math.hypot(bx - ax, bz - az);
      for (let t = carry; t < len; t += S.spacing) {
        const k = t / len;
        const x = ax + (bx - ax) * k,
          z = az + (bz - az) * k;
        candidates.push({
          x,
          z,
          yaw: Math.atan2(-(bx - ax), -(bz - az)),
          w: road.width,
          town: inTown(meta, x, z),
          driveway: false,
        });
      }
      carry = (carry - len) % S.spacing;
      if (carry < 0) carry += S.spacing;
    }
  }
  // In front of houses: the driveway side is unknown, so each side is a candidate (the
  // collision checks below drop the ones that land in a wall, a fence or a garden shed).
  for (const p of layout) {
    if (!DWELLINGS.has(p.model)) continue;
    const a = (p.turn * Math.PI) / 2;
    for (const [dx, dz] of [
      [0, 9],
      [8, 0],
      [-8, 0],
      [0, -9],
    ] as const) {
      const x = p.x + dx * Math.cos(a) + dz * Math.sin(a),
        z = p.z - dx * Math.sin(a) + dz * Math.cos(a);
      // Nose toward the house or along the front, as people park.
      const yaw = Math.atan2(-(p.x - x), -(p.z - z)) + (random() < 0.5 ? 0 : Math.PI / 2);
      candidates.push({ x, z, yaw, w: 0, town: inTown(meta, x, z), driveway: true });
    }
  }
  // Shuffle (seeded), then: one per coverage cell first (the whole island), then the rest.
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j]!, candidates[i]!];
  }
  const covered = new Set<string>();
  const cellOf = (c: Candidate) => `${Math.floor(c.x / S.cell)}:${Math.floor(c.z / S.cell)}`;
  const firstPass = candidates.filter((c) => !c.driveway);
  const tryPlace = (c: Candidate) => {
    const kinds = VEHICLES.areaKinds[areaOf(meta, c.x, c.z)] ?? VEHICLES.areaKinds["rural"]!;
    const kind = pick(kinds, random());
    let x = c.x,
      z = c.z,
      yaw = c.yaw;
    if (!c.driveway) {
      const side = random() < 0.5 ? -1 : 1;
      const off = Math.max(0, c.w / 2 - spec(kind).width / 2 - 0.4) * side;
      yaw = c.yaw + (random() < 0.5 ? Math.PI : 0);
      const fx = -Math.sin(c.yaw),
        fz = -Math.cos(c.yaw);
      x = c.x - fz * off;
      z = c.z + fx * off;
    }
    const gap = c.town ? S.townGap : S.ruralGap;
    if (out.some((v) => Math.hypot(v.x - x, v.z - z) < gap)) return false;
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
    if (top - low > 0.9) return false; // too steep or half on a kerb/wall
    v.y = top;
    const water = waterSurface(meta, world.hf.heightAt(v.x, v.z), v.x, v.z);
    if (water !== null && water - v.y > 0.2) return false;
    if (
      circles(v).some(([cx, cz, r]) =>
        world.blocked(cx, v.y + 0.35, cz, spec(kind).height - 0.4, r + 0.3),
      )
    )
      return false;
    settleTilt(world, v);
    out.push(v);
    return true;
  };
  for (const c of firstPass) {
    if (out.length >= target) break;
    const cell = cellOf(c);
    if (covered.has(cell)) continue;
    if (tryPlace(c)) covered.add(cell);
  }
  for (const c of candidates) {
    if (out.length >= target) break;
    const chance = c.driveway ? S.drivewayChance : c.town ? S.townChance : S.ruralChance;
    if (random() > chance) continue;
    tryPlace(c);
  }
  return out;
}

function settleTilt(world: StaticWorld, v: Vehicle) {
  const s = spec(v.kind);
  const f = footprint(v);
  // A flat tyre lowers its corner (footprint order: front-right, front-left, back-right,
  // back-left = the TYRES bits 2, 1, 8, 4).
  const flat = v.flat ?? 0;
  const h = f.map(
    ([x, z], i) =>
      world.supportAt(x, z, 0.2, v.y + Math.max(0.7, s.climb + 0.05)) -
      (flat & [2, 1, 8, 4][i]! ? 0.1 : 0),
  );
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
  // Rough or steep ground under the wheels (last step's tilt): less grip, and a road car slows.
  const rough =
    Math.abs(Math.tan(v.pitch)) > VEHICLES.handling.roughSlope ||
    Math.abs(Math.tan(v.roll)) > VEHICLES.handling.roughSlope;
  const flat = v.flat ?? 0;
  const flats = (flat & 1) + ((flat >> 1) & 1) + ((flat >> 2) & 1) + ((flat >> 3) & 1);
  const top =
    (1 - flats * (s.bike ? TYRES.bikeSpeedLoss : TYRES.speedLoss)) *
    s.maxSpeed *
    cond.speed *
    (0.6 + 0.4 * Math.max(0.25, v.health / v.maxHealth)) *
    (rough ? 1 - (1 - s.offroad) * 0.35 : 1);
  const H = VEHICLES.handling;
  const throttle = input ? Math.max(-1, Math.min(1, input.forward || 0)) : 0;
  const steerKey = input ? Math.max(-1, Math.min(1, input.strafe || 0)) : 0;
  // The wheel follows the key (quicker back to centre than out): no instant full lock.
  const steerNow = v.steer ?? 0;
  const steerRate = (steerKey === 0 || steerKey * steerNow < 0 ? H.steerOut : H.steerIn) * dt;
  v.steer = steerNow + Math.max(-steerRate, Math.min(steerRate, steerKey - steerNow));
  // Flat tyres on one side drag the car toward it (the right steers right, +).
  const pull = s.bike
    ? 0
    : (((flat >> 1) & 1) + ((flat >> 3) & 1) - (flat & 1) - ((flat >> 2) & 1)) * TYRES.pull;
  const steerIn = Math.max(-1, Math.min(1, v.steer + (Math.abs(v.speed) > 1 ? pull : 0)));
  const handbrake = !!input?.jump && !s.bike;
  const brakeHard = (!!input?.jump && s.bike) || !input;
  // Longitudinal: throttle forward, brake then reverse, drag, rolling resistance, slope.
  if (throttle > 0)
    v.speed += (v.speed < 0 ? s.brake : s.accel * (1 - Math.max(0, v.speed) / top)) * throttle * dt;
  else if (throttle < 0) v.speed -= (v.speed > 0.3 ? s.brake : s.accel * 0.6) * -throttle * dt;
  if (brakeHard)
    v.speed -= Math.sign(v.speed) * Math.min(Math.abs(v.speed), s.brake * dt * (input ? 1 : 0.6));
  // Handbrake: the rear wheels lock (it slows, less than the brakes) and let go sideways.
  if (handbrake) v.speed -= Math.sign(v.speed) * Math.min(Math.abs(v.speed), H.handbrakeDecel * dt);
  v.speed -=
    Math.sign(v.speed) *
    Math.min(Math.abs(v.speed), (VEHICLES.rolling + VEHICLES.drag * Math.abs(v.speed) * 0.05) * dt);
  v.speed -= VEHICLES.gravity * Math.sin(v.pitch) * dt * 0.8;
  v.speed = Math.max(-s.reverse, Math.min(top, v.speed));
  // Steering: less lock at speed (a bike much less), turn rate from the bicycle model.
  const lock = s.steer / (1 + Math.abs(v.speed) / (s.bike ? 9 : 14));
  const yawRate =
    (v.speed / s.wheelbase) * Math.tan(lock * steerIn) * (handbrake ? H.handbrakeTurn : 1);
  const nyaw = v.yaw - yawRate * dt;
  // The velocity keeps its direction in the world while the body turns: re-read it along the
  // new heading (speed) and across it (slip), then the tyres catch the slide.
  const slip0 = v.slip ?? 0;
  const vx = -Math.sin(v.yaw) * v.speed + Math.cos(v.yaw) * slip0,
    vz = -Math.cos(v.yaw) * v.speed - Math.sin(v.yaw) * slip0;
  const fx = -Math.sin(nyaw),
    fz = -Math.cos(nyaw);
  // Right of the heading: (cos yaw, −sin yaw).
  const rx = Math.cos(nyaw),
    rz = -Math.sin(nyaw);
  v.speed = vx * fx + vz * fz;
  let slip = vx * rx + vz * rz;
  const grip =
    (handbrake ? H.handbrakeGrip : s.bike ? H.bikeGrip : H.grip) *
    (rough ? s.offroad : 1) *
    (1 - flats * TYRES.gripLoss);
  slip *= Math.exp(-grip * dt);
  if (Math.abs(slip) < 0.01) slip = 0;
  // Grip turns part of a caught slide's energy into scrub (it never adds speed).
  v.speed = Math.max(-s.reverse, Math.min(top, v.speed));
  const nx = v.x + (fx * v.speed + rx * slip) * dt,
    nz = v.z + (fz * v.speed + rz * slip) * dt;
  const next = { ...v, x: nx, z: nz, yaw: nyaw };
  // Collisions: the world (buildings, rocks, trees) above what the wheels ride over, and other
  // vehicles. Off road (owner, 2026-11-11: "a motorbike explodes driving on a rock"): a rock,
  // a log or a kerb up to `climb` is ridden over (the ground under the wheels takes it).
  const clearance = Math.max(0.45, s.climb);
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
  let bump = false;
  if (!hit) {
    const h = groundUnder(world, next);
    if (Math.max(...h) - v.y > s.climb) {
      hit = true;
      bump = true;
    }
  }
  // A low obstacle (a boulder, a stump: its top under 1.6 m) is a bump, not a wall: the
  // suspension and the tyres take half of it.
  if (hit && !bump)
    bump = circles(next).every(([cx, cz, r]) => world.supportAt(cx, cz, r, v.y + 4) - v.y < 1.6);
  let impact = 0;
  if (hit) {
    impact = Math.hypot(v.speed, slip) * (bump ? 0.55 : 1);
    v.speed = -v.speed * 0.15;
    slip = 0;
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
  v.slip = Math.round(slip * 1000) / 1000;
  v.steer = Math.round(v.steer * 1000) / 1000;
  v.x = Math.round(v.x * 1000) / 1000;
  v.z = Math.round(v.z * 1000) / 1000;
  v.y = Math.round(v.y * 1000) / 1000;
  v.yaw = Math.atan2(Math.sin(v.yaw), Math.cos(v.yaw));
  return impact;
}

/**
 * Tyres (owner, 2026-11-11): a shot that hits a wheel bursts that tyre. Each flat costs top speed
 * and grip, and flats on one side pull the car toward it; a bike with a flat crawls. The
 * vehicle's health takes only part of that shot.
 */
export const TYRES = {
  /** Hit within this of a wheel's centre (m, the tyre's radius and a little). */
  reach: 0.5,
  speedLoss: 0.16,
  bikeSpeedLoss: 0.35,
  gripLoss: 0.12,
  pull: 0.16,
  /** Share of the shot's damage the body takes when it bursts a tyre. */
  bodyShare: 0.35,
};

/**
 * The tyre a hit at `p` (world) bursts, as its bit (0 if it hit no wheel): the wheels sit at the
 * body's corners (half the width, half the wheelbase), a tyre's radius above the ground.
 */
export function tyreAt(v: Vehicle, p: { x: number; y: number; z: number }) {
  const s = spec(v.kind);
  const fx = -Math.sin(v.yaw),
    fz = -Math.cos(v.yaw),
    rx = Math.cos(v.yaw),
    rz = -Math.sin(v.yaw);
  const dx = p.x - v.x,
    dz = p.z - v.z;
  const along = dx * fx + dz * fz,
    across = dx * rx + dz * rz,
    up = p.y - v.y;
  const r = s.bike ? 0.34 : 0.36;
  if (up > r * 2 + 0.15) return 0;
  const wheels = s.bike
    ? ([
        [s.wheelbase / 2, 0, 1],
        [-s.wheelbase / 2, 0, 4],
      ] as const)
    : ([
        [s.wheelbase / 2, -s.width / 2 + 0.12, 1],
        [s.wheelbase / 2, s.width / 2 - 0.12, 2],
        [-s.wheelbase / 2, -s.width / 2 + 0.12, 4],
        [-s.wheelbase / 2, s.width / 2 - 0.12, 8],
      ] as const);
  for (const [a, c, bit] of wheels)
    if (Math.hypot(along - a, (across - c) * 0.7, up - r) < TYRES.reach) return bit;
  return 0;
}

/** Crash damage to the vehicle for an impact at `speed` m/s. */
export function crashDamage(kind: VehicleKind, speed: number) {
  const c = VEHICLES.crash;
  // One crash never takes more than `maxShare` of the vehicle's health: a hard hit is costly,
  // but it is the third wall (or the gunfire) that blows it up, not one boulder.
  return speed > c.threshold
    ? Math.min(
        (speed - c.threshold) * c.perMs * spec(kind).crashScale,
        spec(kind).health * c.maxShare,
      )
    : 0;
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
  // (Box rejects before any square root: with 130–165 vehicles a match, these run for every
  // movement and shot query.)
  const far = (v: Vehicle, x: number, z: number) =>
    v.x - x > 6 || x - v.x > 6 || v.z - z > 6 || z - v.z > 6;
  w.blocked = function (x, y, z, height, radius) {
    if (proto.blocked.call(this, x, y, z, height, radius)) return true;
    for (const v of vehicles()) {
      if (far(v, x, z)) continue;
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
      if (far(v, x, z)) continue;
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
    // The ray's box (to its end or the nearest hit so far), grown by a vehicle's reach.
    const reach = (best ? best.distance : maxDistance) / len;
    const ex = ox + dx * reach,
      ez = oz + dz * reach;
    const x0 = Math.min(ox, ex) - 4,
      x1 = Math.max(ox, ex) + 4,
      z0 = Math.min(oz, ez) - 4,
      z1 = Math.max(oz, ez) + 4;
    for (const v of vehicles()) {
      if (v.x < x0 || v.x > x1 || v.z < z0 || v.z > z1) continue;
      // Quick reject: the vehicle's distance from the ray's segment.
      const t = rayVehicle(ox, oy, oz, dx / len, dy / len, dz / len, v);
      if (t < (best ? best.distance : maxDistance))
        best = { distance: t, kind: "box", vehicle: v.id };
    }
    return best;
  };
  return w;
}
