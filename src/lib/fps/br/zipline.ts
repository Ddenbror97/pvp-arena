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
  /** The Iron Peaks watchtower nearest Pine Ridge (layout.ts ironPeaks; the raised peaks of
   * 2026-11-11): centre and ground. */
  tower: { x: -578.1, y: 507.78, z: -4082 },
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
   * The cable's last point: on the landing gantry at Pine Ridge (world), 184 m from its centre.
   * Chosen 7.5° east of the line from the tower to the hamlet's centre, 1025 m out: the bearing
   * and length where the hanging rider clears every tree, rock and building all the way (a
   * survey of ±30° and 850–1150 m; zipline route test).
   */
  end: { x: -710.8, y: 83.55, z: -3063 },
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

/**
 * The broadcast tower → Iron Peaks zip-line (owner, 2026-11-12: "add ONE additional zip-line
 * connecting the other tower located behind the first Iron Peaks zip-line mountain to the
 * existing Iron Peaks zip-line tower"). The rear tower is the 60 m broadcast tower on the
 * Iron Peaks summit 416 m north of the watchtower (layout.ts ironPeaks: the `radio-mast`, ground
 * 532.6 m, 24.8 m above the watchtower's): its ladder (ladders.ts) climbs to the platform 25.43 m
 * up, where a steel arm over the south rail carries the cable's first point. The cable spans the
 * valley between the two summits (it bottoms out at 301 m) to an A-frame and timber landing
 * platform on the watchtower's summit 11 m north of it: a 48.9 m drop over 406 m (12 %), sagging
 * 2.2 %. From the platform it is a few steps to the watchtower's ladder and stair up to the first
 * zip-line's handle. The two lines' handles are 31 m apart in height and 410 m apart, so their
 * prompts never meet. Everything else (the ride's timing curve, the pose, the camera, the
 * network) is the first line's, through the line's definition.
 */
const MAST = { x: -539.1, y: 532.62, z: -4496.1 } as const;
/** The broadcast tower's platform (its collision's top face, art/br/fitout/strait.py's v17). */
export const MAST_PLATFORM_Y = 25.43;
/** The ladder's top exit on the platform and the arm's station (local to the tower). */
const MAST_STAND = { x: 0.15, z: 3.75 } as const;
const MAST_START = { x: 0.15, y: MAST_PLATFORM_Y + 2.48, z: 5.25 } as const;

/** A zip-line's definition: its stations, its cable and its ride (ms). */
export type ZipLineDef = {
  id: number;
  name: string;
  /** Where the pulley parks (the cable's first point) and where a rider stands to take it. */
  start: { x: number; y: number; z: number };
  stand: { x: number; y: number; z: number };
  /** The cable's last point (at the landing A-frame). */
  end: { x: number; y: number; z: number };
  /** Sag at mid-span (fraction of the horizontal span). */
  sag: number;
  rideMs: number;
  accelMs: number;
  brakeMs: number;
  endSpeed: number;
  /** The pull-up over the start's rail (m the body rises over it). */
  pullLift: number;
};

export const ZIPLINE_DEFS: readonly ZipLineDef[] = [
  {
    id: 0,
    name: "Iron Peaks → Pine Ridge",
    start: {
      x: ZIPLINE.tower.x + ZIPLINE.start.x,
      y: ZIPLINE.tower.y + ZIPLINE.start.y,
      z: ZIPLINE.tower.z + ZIPLINE.start.z,
    },
    stand: {
      x: ZIPLINE.tower.x + ZIPLINE.stand.x,
      y: ZIPLINE.tower.y + ZIPLINE.deckY,
      z: ZIPLINE.tower.z + ZIPLINE.stand.z,
    },
    end: ZIPLINE.end,
    sag: ZIPLINE.sag,
    rideMs: ZIPLINE.rideMs,
    accelMs: ZIPLINE.accelMs,
    brakeMs: ZIPLINE.brakeMs,
    endSpeed: ZIPLINE.endSpeed,
    pullLift: ZIPLINE.pullLift,
  },
  {
    id: 1,
    name: "Broadcast Tower → Iron Peaks",
    start: { x: MAST.x + MAST_START.x, y: MAST.y + MAST_START.y, z: MAST.z + MAST_START.z },
    stand: { x: MAST.x + MAST_STAND.x, y: MAST.y + MAST_PLATFORM_Y, z: MAST.z + MAST_STAND.z },
    // 11 m north of the watchtower, on the line back to the tower's arm (the summit's ground
    // there 507.35 m; the cable's end 3.41 m above it, as at Pine Ridge).
    end: { x: -577.05, y: 510.76, z: -4092.95 },
    sag: 0.022,
    // The cable is 410 m: 19 s on the line is a 26.5 m/s (95 km/h) cruise, a long steep line's
    // pace (the first line's 1114 m take 28 s at 46 m/s).
    rideMs: 19_000,
    accelMs: 3_200,
    brakeMs: 4_200,
    endSpeed: 2.2,
    // The platform's rail stands 1.1 m: a higher pull-up than over the watchtower's 0.76 m.
    pullLift: 1.15,
  },
];

/** The ride's phases, from its elapsed time. */
export type ZipStage = "reach" | "pull" | "ride" | "drop" | "done";

/** ∫₀^u smoothstep = u³ − u⁴/2. */
const smoothInt = (u: number) => u * u * u - (u * u * u * u) / 2;
const smooth = (u: number) => u * u * (3 - 2 * u);
const ease = (u: number) => smooth(Math.max(0, Math.min(1, u)));
const SURGE = 0.015;
const STEPS = 512;

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

/** A zip-line built from its definition: its cable's shape, length and ride (one shared code
 * path for every line: the server, prediction, the pose, the camera and the renderer). */
export type ZipLine = ReturnType<typeof buildLine>;

function buildLine(def: ZipLineDef) {
  const S = def.start,
    E = def.end;
  const spanX = E.x - S.x,
    spanZ = E.z - S.z;
  const span = Math.hypot(spanX, spanZ);
  const dir = [spanX / span, spanZ / span] as const;
  const heading = Math.atan2(-dir[0], -dir[1]);
  const side = [-dir[1], dir[0]] as const;
  const sagM = def.sag * span;
  const dropY = E.y - S.y;
  const cableAt = (u: number, out: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 }) => {
    const k = Math.max(0, Math.min(1, u));
    out.x = S.x + spanX * k;
    out.z = S.z + spanZ * k;
    out.y = S.y + dropY * k - 4 * sagM * k * (1 - k);
    return out;
  };
  const cableSlope = (u: number) => (dropY - 4 * sagM * (1 - 2 * u)) / span;
  const arc = new Float64Array(STEPS + 1);
  {
    const p = cableAt(0),
      q = { x: 0, y: 0, z: 0 };
    for (let i = 1; i <= STEPS; i++) {
      cableAt(i / STEPS, q);
      arc[i] = arc[i - 1]! + Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z);
      p.x = q.x;
      p.y = q.y;
      p.z = q.z;
    }
  }
  const length = arc[STEPS]!;
  const arcAt = (u: number) => {
    const k = Math.max(0, Math.min(1, u)) * STEPS;
    const i = Math.min(STEPS - 1, Math.floor(k));
    return arc[i]! + (arc[i + 1]! - arc[i]!) * (k - i);
  };
  const uAt = (s: number) => {
    if (s <= 0) return 0;
    if (s >= length) return 1;
    let lo = 0,
      hi = STEPS;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (arc[mid]! <= s) lo = mid;
      else hi = mid;
    }
    return (lo + (s - arc[lo]!) / (arc[hi]! - arc[lo]!)) / STEPS;
  };
  // The glide: a smooth push to cruise, a steady run with a slight, even surge (±1.5 %, it never
  // changes the total), and the brake into the station. Cruise speed is solved from the cable's
  // length so the glide takes exactly `rideMs`.
  const RIDE = def.rideMs / 1000,
    TA = def.accelMs / 1000,
    TB = def.brakeMs / 1000,
    VE = def.endSpeed;
  const cruise = (length - (VE * TB) / 2) / (TA / 2 + (RIDE - TA - TB) + TB / 2);
  const surgePeriod = (RIDE - TA - TB) / 3;
  const rideDistance = (ms: number) => {
    const t = Math.max(0, Math.min(RIDE, ms / 1000));
    const v = cruise;
    if (t <= TA) return v * TA * smoothInt(t / TA);
    let s = (v * TA) / 2;
    const cr = RIDE - TA - TB;
    if (t <= TA + cr) {
      const c = t - TA;
      return (
        s +
        v * c +
        ((v * SURGE * surgePeriod) / (2 * Math.PI)) *
          (1 - Math.cos((2 * Math.PI * c) / surgePeriod))
      );
    }
    s += v * cr;
    const b = (t - TA - cr) / TB;
    return s + TB * (v * b - (v - VE) * smoothInt(b));
  };
  const rideSpeed = (ms: number) => {
    const t = Math.max(0, Math.min(RIDE, ms / 1000));
    const v = cruise;
    if (t <= TA) return v * smooth(t / TA);
    const cr = RIDE - TA - TB;
    if (t <= TA + cr) return v * (1 + SURGE * Math.sin((2 * Math.PI * (t - TA)) / surgePeriod));
    return v - (v - VE) * smooth((t - TA - cr) / TB);
  };
  const T = {
    pull: ZIPLINE.reachMs,
    ride: ZIPLINE.reachMs + ZIPLINE.pullMs,
    drop: ZIPLINE.reachMs + ZIPLINE.pullMs + def.rideMs,
    done: ZIPLINE.reachMs + ZIPLINE.pullMs + def.rideMs + ZIPLINE.dropMs,
  } as const;
  const stage = (ms: number): ZipStage =>
    ms < T.pull
      ? "reach"
      : ms < T.ride
        ? "pull"
        : ms < T.drop
          ? "ride"
          : ms < T.done
            ? "drop"
            : "done";
  /** Where the rider steps off (feet, world): on the landing platform just past the cable's end. */
  const landing = (groundAt: (x: number, z: number) => number) => ({
    x: E.x + dir[0] * ZIPLINE.landAhead,
    y: groundAt(E.x, E.z) + ZIPLINE.platformY,
    z: E.z + dir[1] * ZIPLINE.landAhead,
  });
  /** A rider's time into the ride from where they are (others: rows carry positions, not ride
   * clocks): horizontal progress → metres along the cable → the glide's time; null before the
   * cable (on the start's deck). */
  const msAt = (x: number, z: number): number | null => {
    const along = (x - S.x) * dir[0] + (z - S.z) * dir[1];
    if (along <= 0.02) return null;
    if (along >= span) return T.drop;
    const s = arcAt(along / span);
    let lo = 0,
      hi: number = def.rideMs;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (rideDistance(mid) < s) lo = mid;
      else hi = mid;
    }
    return T.ride + (lo + hi) / 2;
  };
  const at = { x: 0, y: 0, z: 0 };
  /** The rider and handle `ms` after taking hold (deterministic); `landY`: the platform's top. */
  const pose = (ms: number, landY: number, out?: ZipPose): ZipPose => {
    const o = out ?? ({} as ZipPose);
    o.heading = heading;
    o.stage = stage(ms);
    const grip = S.y - ZIPLINE.handleDrop;
    if (ms < T.ride) {
      // On the deck: reach up and take the handle, then pull up and swing out over the rail.
      o.hx = S.x;
      o.hy = grip;
      o.hz = S.z;
      o.speed = 0;
      o.reach = ease(ms / ZIPLINE.reachMs);
      const p = ease((ms - T.pull) / ZIPLINE.pullMs);
      // Feet: from the stand to under the handle, lifted over the rail (a pull-up), knees up.
      const hangY = grip - ZIPLINE.armSpan;
      o.x = def.stand.x + (S.x - def.stand.x) * p;
      o.z = def.stand.z + (S.z - def.stand.z) * p;
      o.y = def.stand.y + (hangY + def.pullLift - def.stand.y) * p;
      o.tuck = p;
      return o;
    }
    if (ms < T.drop) {
      const t = ms - T.ride;
      cableAt(uAt(rideDistance(t)), at);
      o.hx = at.x;
      o.hy = at.y - ZIPLINE.handleDrop;
      o.hz = at.z;
      o.speed = rideSpeed(t);
      o.reach = 1;
      // The pull-up relaxes into a full hang; the knees come up again for the landing.
      const lift = def.pullLift * (1 - ease(t / ZIPLINE.relaxMs));
      const land = ease((t - (def.rideMs - 1600)) / 1400);
      o.x = o.hx;
      o.z = o.hz;
      o.y = o.hy - ZIPLINE.armSpan + lift;
      o.tuck = Math.max(1 - ease(t / ZIPLINE.relaxMs), 0.75 * land);
      return o;
    }
    // Off the end of the cable: drop onto the platform a step ahead, let go.
    cableAt(1, at);
    const d = ease((ms - T.drop) / ZIPLINE.dropMs);
    const hang = at.y - ZIPLINE.handleDrop - ZIPLINE.armSpan;
    o.hx = at.x;
    o.hy = at.y - ZIPLINE.handleDrop;
    o.hz = at.z;
    o.speed = def.endSpeed * (1 - d);
    o.reach = 1 - d;
    o.x = at.x + dir[0] * ZIPLINE.landAhead * d;
    o.z = at.z + dir[1] * ZIPLINE.landAhead * d;
    o.y = hang + (landY - hang) * d;
    o.tuck = 0.75 * (1 - d);
    return o;
  };
  /** Can a body at x/y/z take this line's handle (on foot, at its stand)? */
  const reachable = (x: number, y: number, z: number) =>
    Math.hypot(x - def.stand.x, z - def.stand.z) <= ZIPLINE.reach &&
    y >= def.stand.y - 0.3 &&
    y <= def.stand.y + ZIPLINE.reachUp;
  return {
    ...def,
    span,
    dir,
    heading,
    side,
    length,
    cruise,
    T,
    cableAt,
    cableSlope,
    arcAt,
    uAt,
    rideDistance,
    rideSpeed,
    stage,
    landing,
    msAt,
    pose,
    reachable,
  };
}

/** Every zip-line on the island (ids are indices). */
export const ZIPLINES: readonly ZipLine[] = ZIPLINE_DEFS.map(buildLine);
const L0 = ZIPLINES[0]!;
/** A rider's line (their state's id; the first line when absent). */
export const zipLineOf = (z: { id?: number } | undefined) => ZIPLINES[z?.id ?? 0] ?? L0;

/** The line whose handle a body at x/y/z can take, if any. */
export function zipLineAt(x: number, y: number, z: number): ZipLine | null {
  for (const l of ZIPLINES) if (l.reachable(x, y, z)) return l;
  return null;
}

/**
 * Another rider's line and time into their ride from their replicated position (phase 6 rows):
 * the line whose cable (or start, or landing) they are on, nearest across it.
 */
export function zipRiderAt(x: number, z: number): { line: ZipLine; ms: number | null } {
  let best = L0,
    d = Infinity;
  for (const l of ZIPLINES) {
    const along = (x - l.start.x) * l.dir[0] + (z - l.start.z) * l.dir[1];
    const across = Math.abs((x - l.start.x) * l.side[0] + (z - l.start.z) * l.side[1]);
    const out = Math.max(0, -along - 4, along - l.span - 4);
    const e = across + out;
    if (e < d) [best, d] = [l, e];
  }
  return { line: best, ms: best.msAt(x, z) };
}

// The first line's shape and ride, as before the lines were configured (the renderer, the map
// and the tests name them).
/** The cable's first point (world). */
export const ZIP_START = L0.start;
/** Where the rider stands to take the handle (world; feet). */
export const ZIP_STAND = L0.stand;
/** Horizontal span (m) and unit direction of the cable. */
export const ZIP_SPAN = L0.span;
export const ZIP_DIR = L0.dir;
/** Facing along the cable (yaw, radians: forward = (−sin, −cos)). */
export const ZIP_HEADING = L0.heading;
/** The cable's length (m). */
export const ZIP_LENGTH = L0.length;
export const ZIP_CRUISE = L0.cruise;
export const ZIP_T = L0.T;
export const cableAt = L0.cableAt;
export const cableSlope = L0.cableSlope;
export const arcAt = L0.arcAt;
export const uAt = L0.uAt;
export const rideDistance = L0.rideDistance;
export const rideSpeed = L0.rideSpeed;
export const zipStage = L0.stage;
export const zipLanding = L0.landing;
export const zipMsAt = L0.msAt;
export const zipPose = L0.pose;
/** Can a body at x/y/z take the first line's handle? */
export const zipReachable = L0.reachable;

/** A rider on a zip-line: the body's extra state (DropBody.zip). */
export type ZipState = {
  /** Elapsed since taking hold (ms; server ticks). */
  ms: number;
  /** Which line (ZIPLINES; absent: the first). */
  id?: number;
};

const pose: ZipPose = {} as ZipPose;
/**
 * One fixed step of a ride. Moves the body along its line's cable; returns true when the rider
 * has stepped off onto the landing platform (the caller puts them back on foot).
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
  const line = zipLineOf(z);
  z.ms = Math.min(line.T.done, z.ms + dtMs);
  const land = line.landing((x, zz) => world.hf.heightAt(x, zz));
  line.pose(z.ms, land.y, pose);
  const dt = dtMs / 1000;
  body.vx = dt > 0 ? (pose.x - body.x) / dt : 0;
  body.vz = dt > 0 ? (pose.z - body.z) / dt : 0;
  body.velocityY = dt > 0 ? (pose.y - body.y) / dt : 0;
  body.x = pose.x;
  body.y = pose.y;
  body.z = pose.z;
  return z.ms >= line.T.done;
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
export const ZIP_SIDE = L0.side;

const T = ZIPLINE.tower;
const E = ZIPLINE.end;

/**
 * The stations' steel and concrete, as parts in world space, shared by the collision world
 * (posts, footings, the landing platform: boxes the server and every client collide with) and
 * the renderer (which draws the same parts, plus the bolts, clamps and stays).
 *
 * - **Iron Peaks**: a steel portal gantry standing just outside the watchtower's south rail, its
 *   cross-beam above the deck, the cable hung from it on a turnbuckle; two back-stays down to
 *   concrete deadman blocks beside the tower.
 * - **Pine Ridge**: an A-frame portal over the cable's end with a brake spring on the cable, a
 *   timber landing platform past it, back-stays to deadman blocks ahead.
 * - **The broadcast tower** (the second line): a steel post on its platform's south side with an
 *   arm out over the rail to the cable's first point, braced back to the tower's leg.
 * - **Iron Peaks north** (the second line's end): an A-frame and a timber platform like Pine
 *   Ridge's, the frame held by a raking strut to a footing short of the watchtower (no stays
 *   ahead: the watchtower and the rope's top stand there).
 */
export type ZipPart = {
  kind: "steel" | "concrete" | "timber";
  /** Axis-aligned box: x0, y0, z0, x1, y1, z1 (world). */
  box: [number, number, number, number, number, number];
  /** Collides (walls, footings, the platform); cosmetic parts are drawn only. */
  solid: boolean;
};
export type ZipStay = {
  from: [number, number, number];
  to: [number, number, number];
  /** A steel strut (drawn as a bar), not a galvanised stay. */
  strut?: boolean;
};

export function zipStations(groundAt: (x: number, z: number) => number): {
  parts: ZipPart[];
  stays: ZipStay[];
  /** The landing platform's top (= zipLanding().y). */
  platformTop: number;
} {
  const parts: ZipPart[] = [];
  const stays: ZipStay[] = [];
  let platformTop = 0;
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
  // --- The A-frames over the cables' ends and the landing platforms past them.
  for (const line of ZIPLINES) {
    const [dx, dz] = line.dir,
      [sx, sz] = line.side;
    const e = line.end;
    const eg = groundAt(e.x, e.z);
    const frameX = e.x + dx * 0.4,
      frameZ = e.z + dz * 0.4;
    const frameTop = e.y + 0.55;
    for (const side of [-1, 1]) {
      const px = frameX + sx * 1.55 * side,
        pz = frameZ + sz * 1.55 * side;
      const pg = groundAt(px, pz);
      box("concrete", px, pz, pg - 0.4, pg + 0.3, 0.34, 0.34);
      box("steel", px, pz, pg + 0.3, frameTop, 0.12, 0.12);
      if (line.id === 0) {
        const ax = e.x + dx * 8 + sx * 2.6 * side,
          az = e.z + dz * 8 + sz * 2.6 * side;
        const ay = groundAt(ax, az);
        box("concrete", ax, az, ay - 0.5, ay + 0.5, 0.5, 0.5);
        stays.push({ from: [px, frameTop - 0.1, pz], to: [ax, ay + 0.45, az] });
      } else {
        // A raking strut to a footing 3.4 m ahead, beside the landing platform.
        const ax = e.x + dx * 3.4 + sx * 2.35 * side,
          az = e.z + dz * 3.4 + sz * 2.35 * side;
        const ay = groundAt(ax, az);
        box("concrete", ax, az, ay - 0.4, ay + 0.25, 0.3, 0.3);
        stays.push({ from: [px, frameTop - 0.4, pz], to: [ax, ay + 0.2, az], strut: true });
      }
    }
    // The landing platform: timber decking a step above the ground, square to the world axes so
    // it is one collision box (3.4 m; the lowest corner of the slope under it boxed in too).
    const land = line.landing(groundAt);
    const lx = land.x + dx * 0.4,
      lz = land.z + dz * 0.4;
    let low = Infinity;
    for (const ox of [-1.7, 1.7])
      for (const oz of [-1.7, 1.7]) low = Math.min(low, groundAt(lx + ox, lz + oz));
    box("timber", lx, lz, Math.min(low, eg) - 0.3, land.y, 1.7, 1.7);
    if (line.id === 0) platformTop = land.y;
  }
  // --- The broadcast tower: a post on the platform's south side, an arm over the rail to the
  // cable's first point, a brace back to the leg.
  {
    const l = ZIPLINES[1]!;
    const s0 = l.start;
    const py = l.stand.y;
    const postZ = s0.z - 0.95;
    box("steel", s0.x, postZ, py, s0.y + 0.45, 0.11, 0.11);
    box(
      "steel",
      s0.x,
      (postZ + s0.z + 0.25) / 2,
      s0.y + 0.32,
      s0.y + 0.52,
      0.08,
      (s0.z + 0.25 - postZ) / 2,
      false,
    );
    stays.push({
      from: [s0.x, s0.y + 0.4, postZ],
      to: [s0.x + 2.9, py + 0.1, postZ - 0.6],
      strut: true,
    });
    stays.push({
      from: [s0.x, s0.y + 0.4, postZ],
      to: [s0.x - 2.9, py + 0.1, postZ - 0.6],
      strut: true,
    });
  }
  return { parts, stays, platformTop };
}

/** The collision boxes of both stations (static-world extra boxes). */
export function zipStationBoxes(groundAt: (x: number, z: number) => number): number[][] {
  return zipStations(groundAt)
    .parts.filter((p) => p.solid)
    .map((p) => p.box.map((v) => +v.toFixed(3)));
}

/** Tree-free circles (x, z, r) round the stations (vegetation clearings). */
export function zipClearings(): Array<[number, number, number]> {
  const l = ZIPLINES[1]!;
  return [
    [T.x, T.z + 3, 12],
    [E.x, E.z, 12],
    [E.x + ZIP_DIR[0] * 6, E.z + ZIP_DIR[1] * 6, 9],
    [l.end.x, l.end.z, 8],
    [l.start.x, l.start.z - 4, 9],
  ];
}

/** Is a zip-line free to take (its last rider has left the deck)? `lastAt`: their start. */
export const zipFree = (now: number, lastAt: number | undefined) =>
  lastAt === undefined || now - lastAt >= ZIPLINE.spacingMs;
