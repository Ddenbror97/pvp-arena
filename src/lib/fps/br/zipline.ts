import type { StaticWorld } from "./static-world";

/**
 * The Iron Peaks → Pine Ridge zip-line (owner's zip-line spec, 2026-11-11): a steel cable from a
 * steel gantry beside the Iron Peaks watchtower (the summit perch that faces Pine Ridge) down to
 * a landing station at the edge of the Pine Ridge hamlet. One way only.
 *
 * Shared by the server room (authority) and the client (prediction and drawing). Everything is a
 * pure function of the ride's elapsed time: the server keeps `zipMs` per rider and every client
 * draws the same place on the same cable, so there is nothing extra to send or to drift.
 *
 * Frames: world metres (x east, y up, z south), like the rest of the island.
 */
export const ZIPLINE = {
  /** The Iron Peaks watchtower (layout.ts ironPeaks, perch 1): centre and ground. */
  tower: { x: -191.4, y: 449.32, z: -4156.2 },
  /** Its top deck (watchtower collision: the deck's top face, 6.74 m up). */
  deckY: 6.74,
  /**
   * Where the pulley parks, by the tower's south rail (local to the tower centre): the cable's
   * first point. The handle hangs `handleDrop` below it, within reach above the deck.
   */
  start: { x: 0, y: 9.22, z: 2.65 },
  /** Where a rider stands to take the handle: on the deck, at the south rail. */
  stand: { x: 0, z: 1.6 },
  /** Reach to use it: horizontal (m) from `stand`, and how far the feet may be off the deck. */
  reach: 1.6,
  reachUp: 0.9,
  /**
   * The cable's last point: on the landing gantry at Pine Ridge (world). Chosen on the line from
   * the tower toward the hamlet, at its south edge (zipline route test: terrain, buildings and
   * the remaining trees clear the cable and the hanging rider all the way).
   */
  end: { x: -691.9, y: 64.85, z: -3287.8 },
  /** Cable sag at mid-span, as a fraction of the horizontal span (a tensioned steel rope). */
  sag: 0.022,
  /** Handle (where the hands grip) below the cable. */
  handleDrop: 0.36,
  /** Hands above the feet hanging at full stretch (the character's arms straight up). */
  armSpan: 2.04,
  /** Ride timing (ms): reach and take the handle, the pull-up over the rail, the glide. */
  reachMs: 380,
  pullMs: 620,
  rideMs: 28_000,
  /** Speed ramps (ms): the first push, the brake into the landing station. */
  accelMs: 3_200,
  brakeMs: 4_200,
  /** Speed at the end of the cable (m/s), stopped by the station's brake spring. */
  endSpeed: 2.2,
  /** After the cable: the drop from the handle onto the landing platform, and letting go. */
  dropMs: 420,
  /** The landing platform's top above the ground under the cable's end, and how far ahead of
   * the cable's end the rider steps off (along the line). */
  platformY: 0.32,
  landAhead: 1.6,
  /** Seconds of the body lifted over the deck's rail (pull-up), relaxing into the hang. */
  pullLift: 0.85,
  relaxMs: 900,
  /** A new rider may take the handle once the last one has left the deck (ms after theirs). */
  spacingMs: 1_600,
} as const;

/** The ride's phases, from its elapsed time. */
export type ZipStage = "reach" | "pull" | "ride" | "drop" | "done";

const T = ZIPLINE.tower;
/** The cable's first point (world). */
export const ZIP_START = {
  x: T.x + ZIPLINE.start.x,
  y: T.y + ZIPLINE.start.y,
  z: T.z + ZIPLINE.start.z,
} as const;
/** Where the rider stands to take the handle (world; feet). */
export const ZIP_STAND = {
  x: T.x + ZIPLINE.stand.x,
  y: T.y + ZIPLINE.deckY,
  z: T.z + ZIPLINE.stand.z,
} as const;
const E = ZIPLINE.end;
const SPAN_X = E.x - ZIP_START.x,
  SPAN_Z = E.z - ZIP_START.z;
/** Horizontal span (m) and unit direction of the cable. */
export const ZIP_SPAN = Math.hypot(SPAN_X, SPAN_Z);
export const ZIP_DIR = [SPAN_X / ZIP_SPAN, SPAN_Z / ZIP_SPAN] as const;
/** Facing along the cable (yaw, radians: forward = (−sin, −cos)). */
export const ZIP_HEADING = Math.atan2(-ZIP_DIR[0], -ZIP_DIR[1]);
const SAG = ZIPLINE.sag * ZIP_SPAN;
const DROP_Y = E.y - ZIP_START.y;

/** A point on the cable at fraction u (0..1) of the horizontal span (a parabola for the sag). */
export function cableAt(
  u: number,
  out: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 },
) {
  const k = Math.max(0, Math.min(1, u));
  out.x = ZIP_START.x + SPAN_X * k;
  out.z = ZIP_START.z + SPAN_Z * k;
  out.y = ZIP_START.y + DROP_Y * k - 4 * SAG * k * (1 - k);
  return out;
}
/** The cable's slope (dy per horizontal metre) at fraction u. */
export const cableSlope = (u: number) => (DROP_Y - 4 * SAG * (1 - 2 * u)) / ZIP_SPAN;

/** Arc length along the cable, tabulated (u at equal steps), for distance → u. */
const STEPS = 512;
const ARC = new Float64Array(STEPS + 1);
{
  const p = cableAt(0),
    q = { x: 0, y: 0, z: 0 };
  for (let i = 1; i <= STEPS; i++) {
    cableAt(i / STEPS, q);
    ARC[i] = ARC[i - 1]! + Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z);
    p.x = q.x;
    p.y = q.y;
    p.z = q.z;
  }
}
/** The cable's length (m). */
export const ZIP_LENGTH = ARC[STEPS]!;

/** Metres along the cable at fraction u of the span. */
export function arcAt(u: number) {
  const k = Math.max(0, Math.min(1, u)) * STEPS;
  const i = Math.min(STEPS - 1, Math.floor(k));
  return ARC[i]! + (ARC[i + 1]! - ARC[i]!) * (k - i);
}

/**
 * A rider's time into the ride from where they are (others' riders: the views carry positions,
 * not ride clocks). Horizontal progress along the line → metres along the cable → the glide's
 * time (rideDistance inverted); null on the deck (not yet on the cable).
 */
export function zipMsAt(x: number, z: number): number | null {
  const along = (x - ZIP_START.x) * ZIP_DIR[0] + (z - ZIP_START.z) * ZIP_DIR[1];
  if (along <= 0.02) return null;
  if (along >= ZIP_SPAN) return ZIP_T.drop;
  const s = arcAt(along / ZIP_SPAN);
  let lo = 0,
    hi: number = ZIPLINE.rideMs;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (rideDistance(mid) < s) lo = mid;
    else hi = mid;
  }
  return ZIP_T.ride + (lo + hi) / 2;
}

/** Fraction u of the span at `s` metres along the cable. */
export function uAt(s: number) {
  if (s <= 0) return 0;
  if (s >= ZIP_LENGTH) return 1;
  let lo = 0,
    hi = STEPS;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (ARC[mid]! <= s) lo = mid;
    else hi = mid;
  }
  return (lo + (s - ARC[lo]!) / (ARC[hi]! - ARC[lo]!)) / STEPS;
}

/**
 * Distance along the cable `t` ms into the glide: a smooth push to cruise, a steady run with a
 * slight, even surge (±1.5 %, it never changes the total), and the brake into the station.
 * Cruise speed is solved from the cable's length so the glide takes exactly `rideMs`.
 */
const RIDE = ZIPLINE.rideMs / 1000,
  TA = ZIPLINE.accelMs / 1000,
  TB = ZIPLINE.brakeMs / 1000,
  VE = ZIPLINE.endSpeed;
/** ∫₀^u smoothstep = u³ − u⁴/2. */
const smoothInt = (u: number) => u * u * u - (u * u * u * u) / 2;
const smooth = (u: number) => u * u * (3 - 2 * u);
/** Cruise speed (m/s): length = v·TA/2 + v·(RIDE−TA−TB) + (v + VE)·TB/2. */
export const ZIP_CRUISE = (ZIP_LENGTH - (VE * TB) / 2) / (TA / 2 + (RIDE - TA - TB) + TB / 2);
const SURGE = 0.015,
  SURGE_PERIOD = (RIDE - TA - TB) / 3;

export function rideDistance(ms: number): number {
  const t = Math.max(0, Math.min(RIDE, ms / 1000));
  const v = ZIP_CRUISE;
  if (t <= TA) return v * TA * smoothInt(t / TA);
  let s = (v * TA) / 2;
  const cruise = RIDE - TA - TB;
  if (t <= TA + cruise) {
    const c = t - TA;
    // Surge: speed v·(1 + SURGE·sin), whole periods over the cruise, so it adds nothing in total.
    return (
      s +
      v * c +
      ((v * SURGE * SURGE_PERIOD) / (2 * Math.PI)) *
        (1 - Math.cos((2 * Math.PI * c) / SURGE_PERIOD))
    );
  }
  s += v * cruise;
  const b = (t - TA - cruise) / TB;
  // Braking: speed eases from v to VE (smoothstep), integrated.
  return s + TB * (v * b - (v - VE) * smoothInt(b));
}

/** Speed along the cable (m/s) `ms` into the glide (for the sound and the camera). */
export function rideSpeed(ms: number): number {
  const t = Math.max(0, Math.min(RIDE, ms / 1000));
  const v = ZIP_CRUISE;
  if (t <= TA) return v * smooth(t / TA);
  const cruise = RIDE - TA - TB;
  if (t <= TA + cruise) return v * (1 + SURGE * Math.sin((2 * Math.PI * (t - TA)) / SURGE_PERIOD));
  return v - (v - VE) * smooth((t - TA - cruise) / TB);
}

/** When the stages begin (ms since the rider took hold). */
export const ZIP_T = {
  pull: ZIPLINE.reachMs,
  ride: ZIPLINE.reachMs + ZIPLINE.pullMs,
  drop: ZIPLINE.reachMs + ZIPLINE.pullMs + ZIPLINE.rideMs,
  done: ZIPLINE.reachMs + ZIPLINE.pullMs + ZIPLINE.rideMs + ZIPLINE.dropMs,
} as const;

export const zipStage = (ms: number): ZipStage =>
  ms < ZIP_T.pull
    ? "reach"
    : ms < ZIP_T.ride
      ? "pull"
      : ms < ZIP_T.drop
        ? "ride"
        : ms < ZIP_T.done
          ? "drop"
          : "done";

/** Where the rider steps off (feet, world): on the landing platform just past the cable's end. */
export function zipLanding(groundAt: (x: number, z: number) => number) {
  const x = E.x + ZIP_DIR[0] * ZIPLINE.landAhead,
    z = E.z + ZIP_DIR[1] * ZIPLINE.landAhead;
  return { x, y: groundAt(E.x, E.z) + ZIPLINE.platformY, z };
}

export type ZipPose = {
  /** Feet (world). */
  x: number;
  y: number;
  z: number;
  /** The handle (world): where both hands hold, under the pulley. */
  hx: number;
  hy: number;
  hz: number;
  /** Facing (yaw). */
  heading: number;
  /** Speed along the cable (m/s). */
  speed: number;
  /** 0..1: arms reaching up to the handle (1 = holding). */
  reach: number;
  /** 0..1: knees drawn up (the pull-up over the rail, and ready for the landing). */
  tuck: number;
  stage: ZipStage;
};

const ease = (u: number) => smooth(Math.max(0, Math.min(1, u)));
const at = { x: 0, y: 0, z: 0 };

/**
 * The rider and handle `ms` after taking hold (deterministic). `landY` is the landing platform's
 * top (zipLanding), the only thing that depends on the world.
 */
export function zipPose(ms: number, landY: number, out?: ZipPose): ZipPose {
  const o = out ?? ({} as ZipPose);
  o.heading = ZIP_HEADING;
  o.stage = zipStage(ms);
  const grip = ZIP_START.y - ZIPLINE.handleDrop;
  if (ms < ZIP_T.ride) {
    // On the deck: reach up and take the handle, then pull up and swing out over the rail.
    o.hx = ZIP_START.x;
    o.hy = grip;
    o.hz = ZIP_START.z;
    o.speed = 0;
    o.reach = ease(ms / ZIPLINE.reachMs);
    const p = ease((ms - ZIP_T.pull) / ZIPLINE.pullMs);
    // Feet: from the stand to under the handle, lifted over the rail (a pull-up), the knees up.
    const hangY = grip - ZIPLINE.armSpan;
    o.x = ZIP_STAND.x + (ZIP_START.x - ZIP_STAND.x) * p;
    o.z = ZIP_STAND.z + (ZIP_START.z - ZIP_STAND.z) * p;
    o.y = ZIP_STAND.y + (hangY + ZIPLINE.pullLift - ZIP_STAND.y) * p;
    o.tuck = p;
    return o;
  }
  if (ms < ZIP_T.drop) {
    const t = ms - ZIP_T.ride;
    cableAt(uAt(rideDistance(t)), at);
    o.hx = at.x;
    o.hy = at.y - ZIPLINE.handleDrop;
    o.hz = at.z;
    o.speed = rideSpeed(t);
    o.reach = 1;
    // The pull-up relaxes into a full hang; the knees come up again for the landing.
    const lift = ZIPLINE.pullLift * (1 - ease(t / ZIPLINE.relaxMs));
    const landing = ease((t - (ZIPLINE.rideMs - 1600)) / 1400);
    o.x = o.hx;
    o.z = o.hz;
    o.y = o.hy - ZIPLINE.armSpan + lift;
    o.tuck = Math.max(1 - ease(t / ZIPLINE.relaxMs), 0.75 * landing);
    return o;
  }
  // Off the end of the cable: drop onto the platform a step ahead, let go.
  cableAt(1, at);
  const d = ease((ms - ZIP_T.drop) / ZIPLINE.dropMs);
  const hang = at.y - ZIPLINE.handleDrop - ZIPLINE.armSpan;
  o.hx = at.x;
  o.hy = at.y - ZIPLINE.handleDrop;
  o.hz = at.z;
  o.speed = ZIPLINE.endSpeed * (1 - d);
  o.reach = 1 - d;
  o.x = at.x + ZIP_DIR[0] * ZIPLINE.landAhead * d;
  o.z = at.z + ZIP_DIR[1] * ZIPLINE.landAhead * d;
  o.y = hang + (landY - hang) * d;
  o.tuck = 0.75 * (1 - d);
  return o;
}

/** A rider on the zip-line: the body's extra state (DropBody.zip). */
export type ZipState = {
  /** Elapsed since taking hold (ms; server ticks). */
  ms: number;
};

/** Can a body at x/y/z take the handle (on foot, at the stand on the deck)? */
export function zipReachable(x: number, y: number, z: number) {
  return (
    Math.hypot(x - ZIP_STAND.x, z - ZIP_STAND.z) <= ZIPLINE.reach &&
    y >= ZIP_STAND.y - 0.3 &&
    y <= ZIP_STAND.y + ZIPLINE.reachUp
  );
}

const pose: ZipPose = {} as ZipPose;
/**
 * One fixed step of a ride. Moves the body along the cable; returns true when the rider has
 * stepped off onto the landing platform (the caller puts them back on foot).
 */
export function stepZip(
  world: StaticWorld,
  body: {
    x: number;
    y: number;
    z: number;
    velocityY: number;
    vx: number;
    vz: number;
    zip?: ZipState;
  },
  dtMs: number,
): boolean {
  const z = body.zip;
  if (!z) return true;
  z.ms = Math.min(ZIP_T.done, z.ms + dtMs);
  const land = zipLanding((x, zz) => world.hf.heightAt(x, zz));
  zipPose(z.ms, land.y, pose);
  const dt = dtMs / 1000;
  body.vx = dt > 0 ? (pose.x - body.x) / dt : 0;
  body.vz = dt > 0 ? (pose.z - body.z) / dt : 0;
  body.velocityY = dt > 0 ? (pose.y - body.y) / dt : 0;
  body.x = pose.x;
  body.y = pose.y;
  body.z = pose.z;
  return z.ms >= ZIP_T.done;
}

/**
 * Off the cable mid-ride (eliminated): the body falls straight down to what is below, so the
 * eliminated player and their dropped gear lie on the ground, not in the air.
 */
export function dropFromZip(
  world: StaticWorld,
  body: {
    x: number;
    y: number;
    z: number;
    velocityY: number;
    vx: number;
    vz: number;
    zip?: ZipState;
  },
) {
  body.y = world.supportAt(body.x, body.z, 0.35, body.y);
  body.velocityY = body.vx = body.vz = 0;
  delete body.zip;
}

/** Across the cable (unit, horizontal): to the rider's right going down. */
export const ZIP_SIDE = [-ZIP_DIR[1], ZIP_DIR[0]] as const;

/**
 * The two stations' steel and concrete, as parts in world space, shared by the collision world
 * (posts, footings, the landing platform: boxes the server and every client collide with) and
 * the renderer (which draws the same parts, plus the bolts, clamps and stays).
 *
 * - **Iron Peaks**: a steel portal gantry standing just outside the watchtower's south rail, its
 *   cross-beam above the deck, the cable hung from it on a turnbuckle; two back-stays down to
 *   concrete deadman blocks beside the tower.
 * - **Pine Ridge**: an A-frame portal over the cable's end with a brake spring on the cable, a
 *   timber landing platform past it, back-stays to deadman blocks ahead.
 */
export type ZipPart = {
  kind: "steel" | "concrete" | "timber";
  /** Axis-aligned box: x0, y0, z0, x1, y1, z1 (world). */
  box: [number, number, number, number, number, number];
  /** Collides (walls, footings, the platform); cosmetic parts are drawn only. */
  solid: boolean;
};
export type ZipStay = { from: [number, number, number]; to: [number, number, number] };

export function zipStations(groundAt: (x: number, z: number) => number): {
  parts: ZipPart[];
  stays: ZipStay[];
  /** The landing platform's top (= zipLanding().y). */
  platformTop: number;
} {
  const parts: ZipPart[] = [];
  const stays: ZipStay[] = [];
  const box = (
    kind: ZipPart["kind"],
    cx: number,
    cz: number,
    y0: number,
    y1: number,
    hx: number,
    hz: number,
    solid = true,
  ) => parts.push({ kind, box: [cx - hx, y0, cz - hz, cx + hx, y1, cz + hz], solid });
  // --- Iron Peaks: the portal beside the tower's south rail (posts clear of the rail).
  const g = T.y;
  const portalZ = T.z + 3.05,
    top = T.y + 10.3;
  for (const side of [-1, 1]) {
    const px = T.x + side * 1.35;
    box("concrete", px, portalZ, groundAt(px, portalZ) - 0.4, g + 0.35, 0.36, 0.36);
    box("steel", px, portalZ, g + 0.35, top, 0.13, 0.13);
    // Back-stays to deadman blocks beside the tower (clear of its deck, its roof and the
    // climber on the east face's ladder, ladders.ts).
    const ax = T.x + side * 8,
      az = T.z + 0.5;
    const ay = groundAt(ax, az);
    box("concrete", ax, az, ay - 0.5, ay + 0.55, 0.55, 0.55);
    stays.push({ from: [px, top - 0.1, portalZ], to: [ax, ay + 0.5, az] });
  }
  box("steel", T.x, portalZ, top - 0.32, top, 1.5, 0.14, false);
  // --- Pine Ridge: the A-frame over the cable's end and the landing platform past it.
  const [dx, dz] = ZIP_DIR,
    [sx, sz] = ZIP_SIDE;
  const eg = groundAt(E.x, E.z);
  const frameX = E.x + dx * 0.4,
    frameZ = E.z + dz * 0.4;
  const frameTop = E.y + 0.55;
  for (const side of [-1, 1]) {
    const px = frameX + sx * 1.55 * side,
      pz = frameZ + sz * 1.55 * side;
    const pg = groundAt(px, pz);
    box("concrete", px, pz, pg - 0.4, pg + 0.3, 0.34, 0.34);
    box("steel", px, pz, pg + 0.3, frameTop, 0.12, 0.12);
    const ax = E.x + dx * 8 + sx * 2.6 * side,
      az = E.z + dz * 8 + sz * 2.6 * side;
    const ay = groundAt(ax, az);
    box("concrete", ax, az, ay - 0.5, ay + 0.5, 0.5, 0.5);
    stays.push({ from: [px, frameTop - 0.1, pz], to: [ax, ay + 0.45, az] });
  }
  // The landing platform: timber decking a step above the ground, square to the world axes so it
  // is one collision box (3.4 m; the lowest corner of the slope under it is boxed in too).
  const land = zipLanding(groundAt);
  const lx = land.x + dx * 0.4,
    lz = land.z + dz * 0.4;
  let low = Infinity;
  for (const ox of [-1.7, 1.7])
    for (const oz of [-1.7, 1.7]) low = Math.min(low, groundAt(lx + ox, lz + oz));
  box("timber", lx, lz, Math.min(low, eg) - 0.3, land.y, 1.7, 1.7);
  return { parts, stays, platformTop: land.y };
}

/** The collision boxes of both stations (static-world extra boxes). */
export function zipStationBoxes(groundAt: (x: number, z: number) => number): number[][] {
  return zipStations(groundAt)
    .parts.filter((p) => p.solid)
    .map((p) => p.box.map((v) => +v.toFixed(3)));
}

/** Tree-free circles (x, z, r) round the stations (vegetation clearings). */
export function zipClearings(): Array<[number, number, number]> {
  return [
    [T.x, T.z + 3, 12],
    [E.x, E.z, 12],
    [E.x + ZIP_DIR[0] * 6, E.z + ZIP_DIR[1] * 6, 9],
  ];
}

/** Is the zip-line free to take (the last rider has left the deck)? `lastAt`: their start. */
export const zipFree = (now: number, lastAt: number | undefined) =>
  lastAt === undefined || now - lastAt >= ZIPLINE.spacingMs;
