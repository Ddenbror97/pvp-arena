import { waterSurface } from "./drop";
import type { StaticWorld } from "./static-world";
import type { WorldMeta } from "./world";
import { WORLD_HALF } from "./world";

/**
 * The Island Airfield's light aircraft (owner, 2026-11-17: "a propeller airplane … high realistic
 * … fuel should hold for about 7.5 minutes"): one Cessna 172SP per match, flown by its pilot,
 * a passenger beside them. Server-authoritative and deterministic: the pilot's client predicts
 * its own flight with this same code (vehicles.ts does the same for cars).
 *
 * A rigid body with six degrees of freedom, stepped in fixed sub-steps:
 *
 * - Frames. World: x east, y up, z south (the island's). Body: x right, y up, z back (the
 *   aircraft's forward is −z, as a player's at yaw 0), the origin at the centre of gravity.
 *   `q` turns body vectors into world ones.
 * - Aerodynamics from the airflow over the body (no CFD): angle of attack and sideslip, the
 *   dynamic pressure ½ρV², a lift curve that is linear up to the stall and falls to a flat
 *   plate's beyond it, induced and parasite drag, flaps (more lift, more drag, a lower stall),
 *   a fuselage side force. Moments from stability derivatives (pitch, roll and yaw stiffness
 *   and damping, adverse yaw, dihedral effect) and the control surfaces, all scaled by the
 *   dynamic pressure: at low speed the controls are soft, at speed they bite.
 * - The stall: past the critical angle the lift falls away, the drag climbs, the nose drops and
 *   the ailerons lose their grip; a wing drops toward the sideslip or the roll already going.
 *   Lowering the nose and adding power recovers it.
 * - The engine (a 180 hp four-cylinder and a fixed-pitch propeller): RPM follows the throttle
 *   with a delay; thrust falls with airspeed and with altitude (a soft ceiling: no wall); fuel
 *   lasts AIRCRAFT.fuelS at full power, longer throttled back; out of fuel or shut down, the
 *   propeller windmills and the aircraft glides (about 10:1).
 * - The ground: three wheels on springs (the tricycle gear), rolling friction, the brakes, a
 *   steerable nose wheel (less lock with speed), grip across the tyres. A hard touchdown hurts
 *   the gear; any other part touching the ground, a building, a tree or the water is a crash,
 *   its harm in proportion to the speed of the impact.
 *
 * Tuned from the C172SP's book (mass 1,000 kg, wing 16.2 m², span 11 m, stall 48 kt clean and
 * 40 kt with flaps, rotate at 55 kt, climb 730 ft/min at 74 kt, cruise ~115 kt at full power),
 * then for the island (10 km across, a 1.4 km runway).
 */

export type EngineState = "off" | "starting" | "running" | "dead";

export const AIRCRAFT = {
  model: "plane-c172",
  mass: 1000,
  /** Moments of inertia about the body axes (kg m²): pitch (x), yaw (y), roll (z). */
  inertia: [1346, 1967, 948] as const,
  wingArea: 16.2,
  span: 11,
  chord: 1.47,
  /** Lift curve: CL = cl0 + clAlpha·α up to the stall angle (rad). */
  cl0: 0.3,
  clAlpha: 4.9,
  stallAlpha: 0.27,
  /** Flaps (0 up, 1 take-off 10°, 2 landing 30°): extra lift and drag, a lower stall. */
  flapCl: [0, 0.22, 0.48],
  flapCd: [0, 0.012, 0.045],
  flapStall: [0, -0.01, -0.035],
  cd0: 0.034,
  inducedK: 0.062,
  /** Engine and propeller: static thrust (N), the speed thrust falls to nothing (m/s). */
  staticThrust: 2800,
  propSpeed: 110,
  idleRpm: 0.24,
  /** RPM's time constants (s) toward the throttle, up and down. */
  spoolUp: 0.9,
  spoolDown: 0.7,
  startS: 4.5,
  /** Full-power endurance (s): 7.5 minutes (owner, 2026-11-17). Idling burns a fifth. */
  fuelS: 450,
  idleBurn: 0.2,
  /** Soft ceiling: power and lift fade with height (m above the sea). */
  ceiling: [900, 1800] as const,
  /** Never-exceed speed (m/s): beyond it the airframe takes harm. */
  vne: 84,
  health: 1200,
  /**
   * The gear (body frame, m, measured from the model: art/br/plane-c172.json): main wheels
   * left/right, the nose wheel; spring and damper.
   */
  wheels: [
    { at: [-1.2, -1.1, 0.3], k: 70000, c: 7000, nose: false },
    { at: [1.2, -1.1, 0.3], k: 70000, c: 7000, nose: false },
    { at: [0, -1.1, -1.44], k: 45000, c: 4500, nose: true },
  ] as const,
  /** Where the rest of it meets the world: nose, tail, wing tips, cabin roof, belly, fin. */
  hull: [
    [0, -0.1, -2.5],
    [0, 0.2, 5.7],
    [-5.45, 0.9, 0.9],
    [5.45, 0.9, 0.9],
    [0, 1.05, -0.4],
    [0, -0.75, 0.2],
    [0, 1.55, 5.6],
    [-1.55, 0.2, 5.1],
    [1.55, 0.2, 5.1],
  ] as const,
  /**
   * Touchdown sink rate (m/s): above `hard` the gear is hurt, above `crash` it gives way. A game
   * landing is flown with keys and a mouse, not a yoke and a feel for the flare: 4 and 8 (the
   * book's gear) made a firm arrival a write-off (owner, 2026-11-18: "way to sensitive to hard
   * landings (impossible to land)"). A sturdy fixed gear: a 6 m/s arrival only shakes it.
   */
  touchdown: { hard: 6, crash: 12 },
  /**
   * Scraping the ground with the tail, a wing tip or the belly: harm from the speed into the
   * ground, and from the speed along it only beyond `free` m/s (a tail strike in the flare or a
   * belly slide at landing speed is not a crash; a nose-first dive into a field is).
   */
  scrape: { free: 32, share: 0.35 },
  /** Control surfaces' travel rates (per s) and the nose wheel's lock (rad). */
  surfaceRate: 3.5,
  throttleRate: 0.6,
  noseSteer: 0.6,
  subSteps: 6,
};

/** The aircraft (one per match). Quaternion and vectors as plain numbers for the snapshot. */
export type Aircraft = {
  id: number;
  x: number;
  y: number;
  z: number;
  /** Orientation (body → world), unit quaternion. */
  qx: number;
  qy: number;
  qz: number;
  qw: number;
  vx: number;
  vy: number;
  vz: number;
  /** Angular velocity in the body frame (rad/s). */
  wx: number;
  wy: number;
  wz: number;
  engine: EngineState;
  /** When the starter was engaged (match ms), while `starting`. */
  startAt: number;
  /** RPM as a share of full (0 … 1), the throttle lever (0 … 1). */
  rpm: number;
  throttle: number;
  /** Fuel left, seconds of full power. */
  fuel: number;
  /** Flap lever (0, 1, 2) and the flaps' travel (0 … 2). */
  flaps: 0 | 1 | 2;
  flap: number;
  /** Control surfaces' deflection (−1 … 1): elevator (+ nose up), ailerons (+ roll right), rudder (+ yaw right). */
  elev: number;
  ail: number;
  rud: number;
  brake: boolean;
  health: number;
  maxHealth: number;
  /** Gear harm (0 … 1): at 1 the gear is gone and the belly is on the ground. */
  gear: number;
  grounded: boolean;
  destroyed: boolean;
  /** Seats: pilot and passenger (−1: empty). */
  pilot: number;
  passenger: number;
  /** A crash or a hard touchdown this step (for effects and sounds), m/s of impact. */
  impact?: number;
  /** In the water (ditched): the engine is drowned, it floats. */
  wet?: boolean;
};

/** The pilot's controls, validated (match.ts validateBrInput). */
export type FlightInput = {
  /** Stick: pitch (+ back, nose up) and roll (+ right), −1 … 1. */
  elev: number;
  ail: number;
  /** Rudder pedals (+ right). */
  rud: number;
  /** Throttle lever target (0 … 1). */
  thr: number;
  flaps: 0 | 1 | 2;
  /** Engine switch pressed this tick (start when off, shut down when running). */
  engine: boolean;
  brake: boolean;
};

export const NEUTRAL: FlightInput = {
  elev: 0,
  ail: 0,
  rud: 0,
  thr: 0,
  flaps: 0,
  engine: false,
  brake: false,
};

// ------------------------------------------------------------------ vector helpers
type V3 = [number, number, number];
/** Rotate body vector v by the aircraft's orientation (into the world). */
export function toWorld(a: Pick<Aircraft, "qx" | "qy" | "qz" | "qw">, v: Readonly<V3>): V3 {
  const { qx, qy, qz, qw } = a;
  const [x, y, z] = v;
  // v + 2 q × (q × v + w v)
  const tx = 2 * (qy * z - qz * y),
    ty = 2 * (qz * x - qx * z),
    tz = 2 * (qx * y - qy * x);
  return [
    x + qw * tx + (qy * tz - qz * ty),
    y + qw * ty + (qz * tx - qx * tz),
    z + qw * tz + (qx * ty - qy * tx),
  ];
}
/** Rotate world vector v into the body frame. */
export function toBody(a: Pick<Aircraft, "qx" | "qy" | "qz" | "qw">, v: Readonly<V3>): V3 {
  return toWorld({ qx: -a.qx, qy: -a.qy, qz: -a.qz, qw: a.qw }, v);
}
const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const toward = (v: number, target: number, rate: number) =>
  v < target ? Math.min(target, v + rate) : Math.max(target, v - rate);

/** Heading (radians, as a player's yaw: forward = (−sin, −cos)), pitch and bank of the aircraft. */
export function attitude(a: Pick<Aircraft, "qx" | "qy" | "qz" | "qw">) {
  const f = toWorld(a, [0, 0, -1]);
  const r = toWorld(a, [1, 0, 0]);
  const up = toWorld(a, [0, 1, 0]);
  const heading = Math.atan2(-f[0], -f[2]);
  const pitch = Math.asin(clamp(f[1], -1, 1));
  // Bank: the right wing's rise, signed so a right bank (right wing down) is positive.
  const bank = Math.atan2(-r[1], up[1]);
  return { heading, pitch, bank };
}

/** Air density ratio (σ) with the soft ceiling folded in. */
function airAt(y: number) {
  return Math.exp(-Math.max(0, y) / 9000);
}
function powerAt(y: number) {
  return airAt(y) * (1 - 0.8 * smooth(AIRCRAFT.ceiling[0], AIRCRAFT.ceiling[1], y));
}

/** Health share at which the aircraft is damaged / critical (engine power falls). */
export const DAMAGE_STAGES = { damaged: 0.6, critical: 0.3 } as const;
export function powerFactor(a: Pick<Aircraft, "health" | "maxHealth">) {
  const h = a.health / a.maxHealth;
  return h <= 0 ? 0 : h < DAMAGE_STAGES.critical ? 0.6 : h < DAMAGE_STAGES.damaged ? 0.85 : 1;
}

/** Airspeed (m/s), angle of attack and the stall's share (0 … 1). */
export function aero(a: Aircraft) {
  const [vx, vy, vz] = toBody(a, [a.vx, a.vy, a.vz]);
  const V = Math.hypot(vx, vy, vz);
  const u = -vz;
  const alpha = V > 1 ? Math.atan2(-vy, Math.max(0.1, u)) : 0;
  const stallAt = AIRCRAFT.stallAlpha + (AIRCRAFT.flapStall[Math.round(a.flap)] ?? 0);
  const stall = smooth(stallAt - 0.02, stallAt + 0.1, Math.abs(alpha));
  return { V, alpha, stall, warn: V > 5 && Math.abs(alpha) > stallAt - 0.06 };
}

/** A new aircraft at rest, engine off, wheels on the ground (y = the ground under its gear). */
export function newAircraft(
  id: number,
  x: number,
  ground: number,
  z: number,
  heading: number,
): Aircraft {
  const half = heading / 2;
  return {
    id,
    x,
    y: ground - AIRCRAFT.wheels[0].at[1] + 0.06,
    z,
    qx: 0,
    qy: Math.sin(half),
    qz: 0,
    qw: Math.cos(half),
    vx: 0,
    vy: 0,
    vz: 0,
    wx: 0,
    wy: 0,
    wz: 0,
    engine: "off",
    startAt: 0,
    rpm: 0,
    throttle: 0,
    fuel: AIRCRAFT.fuelS,
    flaps: 0,
    flap: 0,
    elev: 0,
    ail: 0,
    rud: 0,
    brake: true,
    health: AIRCRAFT.health,
    maxHealth: AIRCRAFT.health,
    gear: 0,
    grounded: true,
    destroyed: false,
    pilot: -1,
    passenger: -1,
  };
}

/**
 * Nobody at the controls (owner, 2026-11-18: "when player drives it in the air and jumps out E
 * the airplane continue drive, it should crash"). A light aircraft trimmed for cruise flies on
 * by itself, and with the stick left neutral and the throttle where it was, ours did, until its
 * fuel ran out minutes later. Abandoned, the throttle comes back to idle and the controls go
 * slack: the nose drops and a wing goes down into a tightening spiral, as a real one does once
 * its trim is off, and it comes down within seconds (to the ground at 40–60 m/s from 300 m up).
 * On the ground (its pilot killed while taxiing) it brakes to a stop.
 */
export const ABANDONED = { thr: 0, elev: -0.3, ail: 0.45, rud: 0.25 } as const;

/**
 * One fixed step (`dtMs`, the match's tick) of the aircraft. `input` is its pilot's (null: no
 * input this step, the controls left neutral, the throttle where it was). `abandoned`: no pilot
 * aboard (ABANDONED). Returns the impact speed of a crash or a hard touchdown this step (0:
 * none), for damage to the occupants and effects.
 */
export function stepAircraft(
  world: StaticWorld,
  meta: WorldMeta,
  a: Aircraft,
  input: FlightInput | null,
  now: number,
  dtMs: number,
  abandoned = false,
): number {
  a.impact = 0;
  const dt = dtMs / 1000;
  const c = input ?? { ...NEUTRAL, thr: a.throttle, flaps: a.flaps };
  if (abandoned) {
    c.thr = ABANDONED.thr;
    if (!a.grounded) {
      c.elev = ABANDONED.elev;
      c.ail = ABANDONED.ail;
      c.rud = ABANDONED.rud;
    } else c.brake = true; // (an idling engine alone would creep it along for ever)
  }
  if (a.destroyed) {
    // A wreck: its controls are dead, it falls and slides to a stop.
    c.elev = c.ail = c.rud = c.thr = 0;
    c.engine = false;
    if (a.engine !== "dead") a.engine = "dead";
  }
  // The engine switch.
  if (c.engine && !a.destroyed && !a.wet) {
    if (a.engine === "off" && a.fuel > 0) {
      a.engine = "starting";
      a.startAt = now;
    } else if (a.engine === "running" || a.engine === "starting") a.engine = "off";
  }
  if (a.engine === "starting" && now - a.startAt >= AIRCRAFT.startS * 1000) a.engine = "running";
  if (a.engine === "running" && (a.fuel <= 0 || a.health <= 0 || a.wet)) a.engine = "dead";
  // The levers and surfaces move at their own rates (no instant control).
  a.throttle = toward(a.throttle, clamp(c.thr, 0, 1), AIRCRAFT.throttleRate * dt);
  a.flaps = c.flaps;
  a.flap = toward(a.flap, a.flaps, 0.6 * dt);
  const sr = AIRCRAFT.surfaceRate * dt;
  a.elev = toward(a.elev, clamp(c.elev, -1, 1), sr);
  a.ail = toward(a.ail, clamp(c.ail, -1, 1), sr);
  a.rud = toward(a.rud, clamp(c.rud, -1, 1), sr);
  a.brake = c.brake;
  // RPM: the starter turns it over, the throttle sets it, without power it winds down to the
  // windmilling of the propeller in the airflow.
  const { V } = aero(a);
  const target =
    a.engine === "running"
      ? AIRCRAFT.idleRpm + (1 - AIRCRAFT.idleRpm) * a.throttle
      : a.engine === "starting"
        ? 0.12
        : Math.min(0.35, V / 160);
  const tau = target > a.rpm ? AIRCRAFT.spoolUp : AIRCRAFT.spoolDown;
  a.rpm += (target - a.rpm) * (1 - Math.exp(-dt / tau));
  if (a.engine === "running") {
    a.fuel = Math.max(0, a.fuel - dt * (AIRCRAFT.idleBurn + (1 - AIRCRAFT.idleBurn) * a.throttle));
  }
  const n = AIRCRAFT.subSteps;
  let worst = 0;
  for (let i = 0; i < n; i++) worst = Math.max(worst, subStep(world, meta, a, dt / n));
  a.impact = worst;
  return worst;
}

function subStep(world: StaticWorld, meta: WorldMeta, a: Aircraft, h: number): number {
  const P = AIRCRAFT;
  const m = P.mass;
  // ---- forces and moments in the body frame
  const vb = toBody(a, [a.vx, a.vy, a.vz]);
  const V = Math.hypot(vb[0], vb[1], vb[2]);
  const rho = 1.225 * airAt(a.y);
  const qbar = 0.5 * rho * V * V;
  const S = P.wingArea;
  const F: V3 = [0, 0, 0];
  const M: V3 = [0, 0, 0];
  const flapI = clamp(a.flap, 0, 2);
  const lerpFlap = (arr: readonly number[]) => {
    const i0 = Math.floor(flapI),
      i1 = Math.min(2, i0 + 1),
      t = flapI - i0;
    return arr[i0]! * (1 - t) + arr[i1]! * t;
  };
  if (V > 0.5) {
    // Aero frame: u forward, v right, w down (from the body's x right, y up, z back).
    const u = -vb[2],
      v = vb[0],
      w = -vb[1];
    const alpha = Math.atan2(w, Math.max(0.1, u));
    const beta = Math.asin(clamp(v / V, -1, 1));
    const stallAt = P.stallAlpha + lerpFlap(P.flapStall);
    const s = smooth(stallAt - 0.02, stallAt + 0.1, Math.abs(alpha));
    const lift = 1 - 0.75 * smooth(P.ceiling[0], P.ceiling[1], a.y) * 0.4;
    const clLin = P.cl0 + P.clAlpha * alpha + lerpFlap(P.flapCl);
    const clPlate = 1.15 * Math.sin(2 * alpha);
    const CL = ((1 - s) * clLin + s * clPlate) * lift;
    const CD =
      P.cd0 +
      lerpFlap(P.flapCd) +
      P.inducedK * clLin * clLin * (1 - s) +
      s * 0.35 +
      0.9 * Math.sin(alpha) ** 2 * s;
    const CY = -0.9 * beta;
    // Lift ⟂ the airflow in the plane of symmetry (tilted forward at a positive α), drag
    // against it, the side force across.
    const L = qbar * S * CL,
      D = qbar * S * CD,
      Y = qbar * S * CY;
    const vyz = Math.hypot(vb[1], vb[2]) || 1;
    // Unit airflow direction (where the body moves through the air), and lift's direction.
    F[0] += (-D * vb[0]) / V + Y;
    F[1] += (-D * vb[1]) / V + L * (-vb[2] / vyz);
    F[2] += (-D * vb[2]) / V + L * (vb[1] / vyz);
    // Rates in the aero frame: p roll (about forward), q pitch (about right), r yaw (about down).
    const p = -a.wz,
      q = a.wx,
      r = -a.wy;
    const b = P.span,
      cbar = P.chord;
    const Vd = Math.max(V, 8);
    const authority = 1 - 0.55 * s;
    const Cm =
      0.025 -
      0.85 * alpha -
      0.35 * s * Math.sign(alpha) -
      12 * ((q * cbar) / (2 * Vd)) +
      0.62 * a.elev -
      0.06 * flapI;
    const Cl =
      -0.09 * beta -
      0.48 * ((p * b) / (2 * Vd)) +
      0.1 * ((r * b) / (2 * Vd)) +
      0.06 * a.ail * authority +
      // The stall's wing drop: toward the side already slipping or rolling.
      s * 0.05 * clamp(beta * 6 + ((p * b) / (2 * Vd)) * 4, -1, 1);
    const Cn =
      0.09 * beta -
      0.11 * ((r * b) / (2 * Vd)) -
      0.03 * ((p * b) / (2 * Vd)) +
      0.016 * a.rud -
      0.004 * a.ail;
    // Back to the body frame: torque about x (right) = pitch M, y (up) = −N, z (back) = −L.
    M[0] += qbar * S * cbar * Cm;
    M[1] += -qbar * S * b * Cn;
    M[2] += -qbar * S * b * Cl;
    // Propeller slipstream over the tail: the elevator and rudder work at a standstill when
    // the engine runs (taxiing, the take-off roll).
    const wash = 0.5 * rho * (P.staticThrust * a.rpm * a.rpm * 0.012) * 12;
    M[0] += wash * 0.42 * a.elev * 0.3;
    M[1] += -wash * 0.026 * a.rud * b * 0.25;
  } else {
    const wash = 0.5 * 1.225 * (P.staticThrust * a.rpm * a.rpm * 0.012) * 12;
    M[0] += wash * 0.42 * a.elev * 0.3;
    M[1] += -wash * 0.026 * a.rud * P.span * 0.25;
  }
  // Thrust along −z (the propeller's axis), falling with airspeed and height.
  const power = a.engine === "running" ? Math.max(0, (a.rpm - 0.1) / 0.9) ** 1.3 : 0;
  const thrust =
    P.staticThrust *
    power *
    powerAt(a.y) *
    powerFactor(a) *
    Math.max(0, 1 - Math.max(0, -vb[2]) / P.propSpeed);
  F[2] -= thrust;
  // P-factor and torque: a little left yaw and roll at full power, slow (the rudder holds it).
  M[1] += thrust * 0.012;
  M[2] += thrust * 0.004;
  // ---- the gear on the ground
  let worst = 0;
  const wasGrounded = a.grounded;
  a.grounded = false;
  for (const wheel of P.wheels) {
    const broken = a.gear >= 1 || (wheel.nose ? a.gear > 0.7 : false);
    if (broken) continue;
    const rel = toWorld(a, wheel.at);
    const px = a.x + rel[0],
      py = a.y + rel[1],
      pz = a.z + rel[2];
    const ground = world.supportAt(px, pz, 0.15, py + 0.6);
    const depth = ground - py;
    if (depth <= 0) continue;
    a.grounded = true;
    // The contact point's velocity (world): v + ω × r, with ω in the world frame.
    const wW = toWorld(a, [a.wx, a.wy, a.wz]);
    const cvx = a.vx + (wW[1] * rel[2] - wW[2] * rel[1]),
      cvy = a.vy + (wW[2] * rel[0] - wW[0] * rel[2]),
      cvz = a.vz + (wW[0] * rel[1] - wW[1] * rel[0]);
    // A touchdown faster than the gear takes.
    if (-cvy > P.touchdown.hard) {
      const sink = -cvy;
      worst = Math.max(worst, sink);
      // One landing impact, not fresh gear damage on every spring-compression substep.
      if (!wasGrounded)
        a.gear = Math.min(
          1,
          a.gear +
            ((sink - P.touchdown.hard) / (P.touchdown.crash - P.touchdown.hard)) *
              (wheel.nose ? 0.6 : 0.4),
        );
    }
    const normal = Math.max(0, wheel.k * Math.min(depth, 0.5) - wheel.c * cvy);
    // Rolling direction: the body's forward on the ground, the nose wheel turned by the pedals
    // (less lock as the speed rises).
    const speed = Math.hypot(a.vx, a.vz);
    const steer = wheel.nose ? a.rud * P.noseSteer * (1 - smooth(5, 30, speed) * 0.8) : 0;
    const fwd = toWorld(a, [Math.sin(steer), 0, -Math.cos(steer)]);
    const fl = Math.hypot(fwd[0], fwd[2]) || 1;
    const fx = fwd[0] / fl,
      fz = fwd[2] / fl;
    const along = cvx * fx + cvz * fz;
    const sideX = cvx - along * fx,
      sideZ = cvz - along * fz;
    // Rolling resistance and brakes along; the tyre's grip across (capped by friction).
    const brake = a.brake && !wheel.nose ? 0.65 : 0.025;
    const fAlong = -Math.sign(along) * Math.min(Math.abs(along) * 3000, brake * normal);
    const sideMag = Math.hypot(sideX, sideZ);
    const fSide = Math.min(sideMag * 9000, 0.85 * normal);
    const Fw: V3 = [
      fAlong * fx - (sideMag > 1e-6 ? (sideX / sideMag) * fSide : 0),
      normal,
      fAlong * fz - (sideMag > 1e-6 ? (sideZ / sideMag) * fSide : 0),
    ];
    // Into the body frame for the moment (r × F).
    const Fb = toBody(a, Fw);
    const r0 = wheel.at;
    M[0] += r0[1] * Fb[2] - r0[2] * Fb[1];
    M[1] += r0[2] * Fb[0] - r0[0] * Fb[2];
    M[2] += r0[0] * Fb[1] - r0[1] * Fb[0];
    F[0] += Fb[0];
    F[1] += Fb[1];
    F[2] += Fb[2];
  }
  // ---- integrate (semi-implicit Euler)
  const Fw = toWorld(a, F);
  a.vx += (Fw[0] / m) * h;
  a.vy += (Fw[1] / m - 9.81) * h;
  a.vz += (Fw[2] / m) * h;
  const [Ix, Iy, Iz] = P.inertia;
  // Euler's equations: I ω̇ = M − ω × Iω.
  const hx = Ix * a.wx,
    hy = Iy * a.wy,
    hz = Iz * a.wz;
  a.wx += ((M[0] - (a.wy * hz - a.wz * hy)) / Ix) * h;
  a.wy += ((M[1] - (a.wz * hx - a.wx * hz)) / Iy) * h;
  a.wz += ((M[2] - (a.wx * hy - a.wy * hx)) / Iz) * h;
  // On the ground the gear holds the attitude: damp the spin the springs would ring with.
  if (a.grounded) {
    const g = Math.exp(-h * 4);
    a.wx *= g;
    a.wz *= g;
  }
  const ox = a.x,
    oy = a.y,
    oz = a.z;
  a.x += a.vx * h;
  a.y += a.vy * h;
  a.z += a.vz * h;
  // q ← q + ½ q ⊗ (0, ω) h, renormalised.
  const { qx, qy, qz, qw } = a;
  const { wx, wy, wz } = a;
  a.qw = qw + 0.5 * h * (-qx * wx - qy * wy - qz * wz);
  a.qx = qx + 0.5 * h * (qw * wx + qy * wz - qz * wy);
  a.qy = qy + 0.5 * h * (qw * wy + qz * wx - qx * wz);
  a.qz = qz + 0.5 * h * (qw * wz + qx * wy - qy * wx);
  const ql = Math.hypot(a.qx, a.qy, a.qz, a.qw) || 1;
  a.qx /= ql;
  a.qy /= ql;
  a.qz /= ql;
  a.qw /= ql;
  // ---- the rest of the airframe against the world: swept from where each point was
  const crash = collide(world, a, ox, oy, oz);
  worst = Math.max(worst, crash);
  // ---- the sea and the lakes: ditched
  const water = waterSurface(meta, world.hf.heightAt(a.x, a.z), a.x, a.z);
  if (water !== null && a.y - 0.6 < water) {
    const sp = Math.hypot(a.vx, a.vy, a.vz);
    if (!a.wet) worst = Math.max(worst, sp * 0.8);
    a.wet = true;
    // Floats, the water dragging it to a stop.
    const g = Math.exp(-h * 2.5);
    a.vx *= g;
    a.vz *= g;
    a.vy = Math.max(a.vy, 0) * g;
    a.y = Math.max(a.y, water + 0.2);
    a.wx *= g;
    a.wy *= g;
    a.wz *= g;
  }
  // ---- the world's edge: no flying off the map (the engine cuts out over the open sea)
  const edge = WORLD_HALF + 400;
  if (Math.abs(a.x) > edge || Math.abs(a.z) > edge) a.fuel = 0;
  // ---- overspeed: the airframe strains
  const sp = Math.hypot(a.vx, a.vy, a.vz);
  if (sp > P.vne) a.health = Math.max(0, a.health - (sp - P.vne) * 2 * h * 60);
  if (sp > P.vne + 25) {
    const k = (P.vne + 25) / sp;
    a.vx *= k;
    a.vy *= k;
    a.vz *= k;
  }
  return worst;
}

/**
 * The airframe's hull points swept from the last sub-step's pose to this one: a hit is a crash.
 * The aircraft is put back to where the point was clear, its speed into the obstacle taken
 * away (it slides along), its spin damped; returns the impact speed.
 */
function collide(world: StaticWorld, a: Aircraft, ox: number, oy: number, oz: number): number {
  let worst = 0;
  for (const p of AIRCRAFT.hull) {
    const r = toWorld(a, p);
    const nx = a.x + r[0],
      ny = a.y + r[1],
      nz = a.z + r[2];
    // (The previous pose's point, near enough: the orientation changes little in a sub-step.)
    const px = ox + r[0],
      py = oy + r[1],
      pz = oz + r[2];
    const dx = nx - px,
      dy = ny - py,
      dz = nz - pz;
    const len = Math.hypot(dx, dy, dz);
    // Below the ground already (a wing tip on a slope at rest): lift it out.
    const ground = world.hf.heightAt(nx, nz);
    if (ny < ground) {
      const sp = Math.hypot(a.vx, a.vy, a.vz);
      const { free, share } = AIRCRAFT.scrape;
      worst = Math.max(worst, Math.max(0, -a.vy) + Math.max(0, sp - free) * share);
      a.y += ground - ny;
      if (a.vy < 0) a.vy = 0;
      // Scraping: friction on the ground.
      const g = Math.exp(-0.06);
      a.vx *= g;
      a.vz *= g;
      a.wx *= 0.9;
      a.wy *= 0.9;
      a.wz *= 0.9;
      continue;
    }
    if (len < 1e-4) continue;
    const hit = world.raycast(px, py, pz, dx, dy, dz, len);
    if (!hit || hit.kind === "ground") continue;
    const sp = Math.hypot(a.vx, a.vy, a.vz);
    worst = Math.max(worst, sp);
    // Back to just short of the hit, the motion into it gone.
    const back = (len - hit.distance + 0.05) / len;
    a.x -= dx * back;
    a.y -= dy * back;
    a.z -= dz * back;
    const ux = dx / len,
      uy = dy / len,
      uz = dz / len;
    const into = a.vx * ux + a.vy * uy + a.vz * uz;
    if (into > 0) {
      a.vx -= into * ux * 1.2;
      a.vy -= into * uy * 1.2;
      a.vz -= into * uz * 1.2;
    }
    a.wx *= 0.5;
    a.wy *= 0.5;
    a.wz *= 0.5;
  }
  return worst;
}

/**
 * Harm from an impact (m/s) to the aircraft: none below 6 m/s (a firm landing), a twentieth at
 * 8, a third at 15, everything at about 24 (a slam, a dive into the ground, a wall).
 */
export function impactDamage(speed: number) {
  if (speed < 6) return 0;
  return Math.min(AIRCRAFT.health * 1.5, ((speed - 6) / 19) ** 1.6 * AIRCRAFT.health * 1.2);
}

/** Height above the ground under the aircraft (m), for exits and the HUD. */
export function heightAboveGround(world: StaticWorld, a: Aircraft) {
  return a.y + AIRCRAFT.wheels[0].at[1] - world.hf.heightAt(a.x, a.z);
}

/** The seats in the body frame: pilot (left front), passenger (right front); eyes ~0.75 m up. */
export const SEATS = [
  [-0.32, -0.25, -0.35],
  [0.32, -0.25, -0.35],
] as const;
export function seatAt(a: Aircraft, seat: 0 | 1) {
  const r = toWorld(a, SEATS[seat]);
  return { x: a.x + r[0], y: a.y + r[1], z: a.z + r[2] };
}

// ------------------------------------------------------------------ the wire

const ENGINE_CODES = ["off", "starting", "running", "dead"] as const;
/**
 * The aircraft's row (aircraft.ts Aircraft, read by aircraftFromRow): [x, y, z, qx, qy, qz, qw,
 * vx, vy, vz, wx, wy, wz, engine (ENGINE_CODES), the starter's server ms, rpm, throttle, fuel
 * (s), flap lever, flap travel, elevator, ailerons, rudder, health, gear harm, flags (1 on the
 * ground, 2 destroyed, 4 in the water, 8 brakes), pilot seat, passenger seat (−1 empty)]. Full
 * precision where the pilot's prediction resumes from it.
 */
export function aircraftRow(a: Aircraft) {
  const r = (n: number, k: number) => Math.round(n * k) / k;
  return [
    r(a.x, 1000),
    r(a.y, 1000),
    r(a.z, 1000),
    r(a.qx, 1e6),
    r(a.qy, 1e6),
    r(a.qz, 1e6),
    r(a.qw, 1e6),
    r(a.vx, 1000),
    r(a.vy, 1000),
    r(a.vz, 1000),
    r(a.wx, 1e4),
    r(a.wy, 1e4),
    r(a.wz, 1e4),
    ENGINE_CODES.indexOf(a.engine),
    a.startAt,
    r(a.rpm, 1e4),
    r(a.throttle, 1e4),
    r(a.fuel, 100),
    a.flaps,
    r(a.flap, 1e4),
    r(a.elev, 1e4),
    r(a.ail, 1e4),
    r(a.rud, 1e4),
    r(a.health, 10),
    r(a.gear, 1e4),
    (a.grounded ? 1 : 0) + (a.destroyed ? 2 : 0) + (a.wet ? 4 : 0) + (a.brake ? 8 : 0),
    a.pilot,
    a.passenger,
  ];
}
/** The client's copy of the aircraft from its row (the inverse of aircraftRow). */
export function aircraftFromRow(row: readonly number[], into?: Aircraft): Aircraft {
  const a = into ?? ({ id: 0, maxHealth: AIRCRAFT.health } as Aircraft);
  const f = row[25] ?? 0;
  Object.assign(a, {
    x: row[0],
    y: row[1],
    z: row[2],
    qx: row[3],
    qy: row[4],
    qz: row[5],
    qw: row[6],
    vx: row[7],
    vy: row[8],
    vz: row[9],
    wx: row[10],
    wy: row[11],
    wz: row[12],
    engine: ENGINE_CODES[row[13] ?? 0] ?? "off",
    startAt: row[14],
    rpm: row[15],
    throttle: row[16],
    fuel: row[17],
    flaps: (row[18] ?? 0) as 0 | 1 | 2,
    flap: row[19],
    elev: row[20],
    ail: row[21],
    rud: row[22],
    health: row[23],
    gear: row[24],
    grounded: (f & 1) !== 0,
    destroyed: (f & 2) !== 0,
    wet: (f & 4) !== 0,
    brake: (f & 8) !== 0,
    pilot: row[26],
    passenger: row[27],
  });
  a.maxHealth = AIRCRAFT.health;
  return a;
}
