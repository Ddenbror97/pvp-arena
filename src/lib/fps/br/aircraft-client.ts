import {
  aircraftFromRow,
  AIRCRAFT,
  aero,
  attitude,
  heightAboveGround,
  stepAircraft,
  type Aircraft,
  type FlightInput,
} from "./aircraft";
import { EXIT, nearDoor } from "./aircraft-world";
import type { StaticWorld } from "./static-world";
import type { WorldMeta } from "./world";

/**
 * The aircraft on this client (br-arena.ts): the server's rows, everyone else's view of it
 * (interpolated on the server's clock, like the players), the pilot's own prediction (the same
 * simulation, aircraft.ts, replayed over the inputs the server has not applied yet), the
 * pilot's controls, and the chase cameras.
 *
 * Controls: W / S the throttle lever; hold left mouse and drag up/down for pitch, left/right
 * for banking (nose-wheel steering on the ground). Release for wings-level, gentle cruise.
 * A / D and Arrow Up / Down remain alternate roll and pitch controls.
 * Q / R the rudder, Space the brakes, G the flaps (up, 10°, 30°), F the engine, C the
 * camera, Alt held
 * to look around, E in and out.
 */

export type FlightKeys = {
  throttleUp: boolean;
  throttleDown: boolean;
  rollLeft: boolean;
  rollRight: boolean;
  rudderLeft: boolean;
  rudderRight: boolean;
  brake: boolean;
  pitchUp?: boolean;
  pitchDown?: boolean;
};
/** The wire's flight fields (match.ts BrInput). */
export type FlightWire = {
  elev: number;
  ail: number;
  rud: number;
  thr: number;
  flaps: 0 | 1 | 2;
};
type Sample = { at: number; a: Aircraft };

/** Chase cameras (C cycles): distance behind and height over the aircraft (m). */
export const FLIGHT_CAMERAS = [
  { name: "Chase", back: 15, up: 2.9 },
  { name: "Wide", back: 26, up: 5 },
  { name: "Close", back: 11, up: 2.2 },
] as const;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const toward = (v: number, target: number, rate: number) =>
  v < target ? Math.min(target, v + rate) : Math.max(target, v - rate);
const r2 = (n: number) => Math.round(n * 1000) / 1000;

function lerpAircraft(a: Aircraft, b: Aircraft, t: number, into: Aircraft) {
  const l = (x: number, y: number) => x + (y - x) * t;
  Object.assign(into, b);
  into.x = l(a.x, b.x);
  into.y = l(a.y, b.y);
  into.z = l(a.z, b.z);
  into.vx = l(a.vx, b.vx);
  into.vy = l(a.vy, b.vy);
  into.vz = l(a.vz, b.vz);
  into.rpm = l(a.rpm, b.rpm);
  into.elev = l(a.elev, b.elev);
  into.ail = l(a.ail, b.ail);
  into.rud = l(a.rud, b.rud);
  into.flap = l(a.flap, b.flap);
  into.throttle = l(a.throttle, b.throttle);
  // Shortest-path slerp of the orientation.
  let { qx, qy, qz, qw } = b;
  let dot = a.qx * qx + a.qy * qy + a.qz * qz + a.qw * qw;
  if (dot < 0) {
    qx = -qx;
    qy = -qy;
    qz = -qz;
    qw = -qw;
    dot = -dot;
  }
  let s0 = 1 - t,
    s1 = t;
  if (dot < 0.9995) {
    const th = Math.acos(dot),
      sn = Math.sin(th);
    s0 = Math.sin((1 - t) * th) / sn;
    s1 = Math.sin(t * th) / sn;
  }
  into.qx = a.qx * s0 + qx * s1;
  into.qy = a.qy * s0 + qy * s1;
  into.qz = a.qz * s0 + qz * s1;
  into.qw = a.qw * s0 + qw * s1;
  const n = Math.hypot(into.qx, into.qy, into.qz, into.qw) || 1;
  into.qx /= n;
  into.qy /= n;
  into.qz /= n;
  into.qw /= n;
  return into;
}

/** Rotate a quaternion by body angular velocity over `s` seconds (extrapolation). */
function spin(a: Aircraft, s: number) {
  const { wx, wy, wz } = a;
  const { qx, qy, qz, qw } = a;
  // q' = q + ½ q ⊗ (0, ω) s
  const h = s / 2;
  a.qw = qw + h * (-qx * wx - qy * wy - qz * wz);
  a.qx = qx + h * (qw * wx + qy * wz - qz * wy);
  a.qy = qy + h * (qw * wy + qz * wx - qx * wz);
  a.qz = qz + h * (qw * wz + qx * wy - qy * wx);
  const n = Math.hypot(a.qx, a.qy, a.qz, a.qw) || 1;
  a.qx /= n;
  a.qy /= n;
  a.qz /= n;
  a.qw /= n;
}

/**
 * Between two ticks of one motion, `t` (0 … 1) of the way, with the rates continuous: each end
 * carried toward the other by its own velocity and angular velocity, blended by smoothstep. At
 * either tick the drawn motion leaves with that tick's rates, so the roll rate has no corner
 * at every tick (a plain slerp turns at constant rate within a tick and steps at the next).
 */
function blendAircraft(a: Aircraft, b: Aircraft, t: number, into: Aircraft, tmp: Aircraft) {
  const T = TICK / 1000;
  Object.assign(into, a);
  into.x += a.vx * T * t;
  into.y += a.vy * T * t;
  into.z += a.vz * T * t;
  spin(into, T * t);
  Object.assign(tmp, b);
  tmp.x -= b.vx * T * (1 - t);
  tmp.y -= b.vy * T * (1 - t);
  tmp.z -= b.vz * T * (1 - t);
  spin(tmp, -T * (1 - t));
  const from = { ...into };
  lerpAircraft(from, tmp, t * t * (3 - 2 * t), into);
  // The rest (levers, rpm, rates) plainly between the two ticks.
  const l = (x: number, y: number) => x + (y - x) * t;
  into.vx = l(a.vx, b.vx);
  into.vy = l(a.vy, b.vy);
  into.vz = l(a.vz, b.vz);
  into.wx = l(a.wx, b.wx);
  into.wy = l(a.wy, b.wy);
  into.wz = l(a.wz, b.wz);
  into.rpm = l(a.rpm, b.rpm);
  into.elev = l(a.elev, b.elev);
  into.ail = l(a.ail, b.ail);
  into.rud = l(a.rud, b.rud);
  into.flap = l(a.flap, b.flap);
  into.throttle = l(a.throttle, b.throttle);
  return into;
}

export class AircraftClient {
  /** The server's latest aircraft (null: none in this match, or not heard of yet). */
  server: Aircraft | null = null;
  /** This player's seat in it (from the view), null when not aboard. */
  seat: 0 | 1 | null = null;
  /** The pilot's prediction (only while this player flies it). */
  predicted: Aircraft | null = null;
  /** What is drawn this frame (prediction or interpolation). */
  readonly shown: Aircraft = {} as Aircraft;
  hasShown = false;
  private samples: Sample[] = [];
  /** The pilot's levers and stick as the keys and mouse leave them. */
  readonly controls = { thr: 0, elev: 0, ail: 0, rud: 0, flaps: 0 as 0 | 1 | 2, stick: 0 };
  /** The prediction one tick earlier: the view is drawn between it and `predicted`. */
  private prev: Aircraft | null = null;
  private readonly tmp = {} as Aircraft;
  /** The view's offset from the prediction's correction (fades out): position, metres. */
  private fix = { x: 0, y: 0, z: 0 };
  /** The same for the orientation: a rotation (quaternion) applied over the drawn one. */
  private qfix = { x: 0, y: 0, z: 0, w: 1 };
  camera = 0;
  /** Free look (Alt): the camera's yaw and pitch around the aircraft (radians). */
  look = { yaw: 0, pitch: 0, held: false };
  private camHeading = NaN;
  private camPitch = 0;
  /** Whether the pilot asked for the engine since boarding (auto-start on getting in). */
  autoStarted = false;
  /** Left mouse holds a pitch target; the elevator eases off as the nose reaches it. */
  private pitchHeld = false;
  private pitchTarget = 0;
  private bankTarget = 0;
  /** Where the mouse puts the bank; bankTarget follows it smoothly (no per-event steps). */
  private bankAim = 0;
  private levelOnRelease = false;

  holdPitch(held: boolean) {
    const next = held && this.seat === 0 && !this.look.held;
    if (next && !this.pitchHeld) {
      this.levelOnRelease = false;
      const a = this.predicted ?? this.server;
      this.pitchTarget = a ? attitude(a).pitch : 0;
      this.bankTarget = this.bankAim = a ? clamp(attitude(a).bank, -Math.PI / 6, Math.PI / 6) : 0;
    }
    if (!next && this.pitchHeld) {
      this.controls.stick = this.controls.elev = 0;
      const a = this.predicted ?? this.server;
      this.pitchTarget = a ? clamp(attitude(a).pitch, Math.PI / 60, Math.PI / 36) : 0;
      this.levelOnRelease = true;
    }
    if (!next) this.bankAim = 0;
    this.pitchHeld = next;
  }

  /** A view arrived: the aircraft's row (if it changed) and this player's seat. */
  apply(row: readonly number[] | undefined, flying: 0 | 1 | undefined, at: number) {
    if (row) {
      const a = aircraftFromRow(row);
      this.server = a;
      this.samples.push({ at, a });
      while (this.samples.length > 12) this.samples.shift();
    }
    const was = this.seat;
    this.seat = flying ?? null;
    if (this.seat === null) {
      this.holdPitch(false);
      this.levelOnRelease = false;
      this.predicted = this.prev = null;
      this.autoStarted = false;
    } else if (was !== this.seat && this.server) {
      this.holdPitch(false);
      this.levelOnRelease = false;
      // Just in: the levers where they are in the cockpit.
      this.controls.thr = this.server.throttle;
      this.controls.flaps = this.server.flaps;
      this.controls.elev = this.controls.ail = this.controls.rud = this.controls.stick = 0;
      this.look.yaw = this.look.pitch = 0;
      this.camHeading = NaN;
    }
  }

  /** The pilot's prediction: the server's state replayed over the newer inputs. */
  reconcile(
    world: StaticWorld,
    meta: WorldMeta,
    pending: ReadonlyArray<{ input: Partial<FlightWire> & { jump?: boolean }; clock: number }>,
  ) {
    if (this.seat !== 0 || !this.server) {
      this.predicted = this.prev = null;
      return;
    }
    const before = this.predicted;
    const a: Aircraft = { ...this.server };
    const prev: Aircraft = { ...a };
    for (const p of pending) {
      Object.assign(prev, a);
      stepAircraft(world, meta, a, flightOf(p.input, a), p.clock, TICK);
    }
    if (before) {
      // The view glides over the difference instead of jumping with it: the position and
      // the orientation (view = qfix ⊗ q, kept equal across the swap).
      this.fix.x += before.x - a.x;
      this.fix.y += before.y - a.y;
      this.fix.z += before.z - a.z;
      if (Math.hypot(this.fix.x, this.fix.y, this.fix.z) > 25)
        this.fix.x = this.fix.y = this.fix.z = 0;
      // d = before ⊗ conj(a); qfix ← qfix ⊗ d.
      const bx = before.qx,
        by = before.qy,
        bz = before.qz,
        bw = before.qw;
      const cx = -a.qx,
        cy = -a.qy,
        cz = -a.qz,
        cw = a.qw;
      const dw = bw * cw - bx * cx - by * cy - bz * cz;
      const dx = bw * cx + bx * cw + by * cz - bz * cy;
      const dy = bw * cy - bx * cz + by * cw + bz * cx;
      const dz = bw * cz + bx * cy - by * cx + bz * cw;
      const f = this.qfix;
      const nw = f.w * dw - f.x * dx - f.y * dy - f.z * dz;
      const nx = f.w * dx + f.x * dw + f.y * dz - f.z * dy;
      const ny = f.w * dy - f.x * dz + f.y * dw + f.z * dx;
      const nz = f.w * dz + f.x * dy - f.y * dx + f.z * dw;
      const n = (nw < 0 ? -1 : 1) * (Math.hypot(nx, ny, nz, nw) || 1);
      // More than ~30° off is a real jump (respawn, crash): take it.
      if (Math.abs(nw / n) < 0.966) this.qfix = { x: 0, y: 0, z: 0, w: 1 };
      else this.qfix = { x: nx / n, y: ny / n, z: nz / n, w: nw / n };
    }
    this.prev = pending.length ? prev : { ...a };
    this.predicted = a;
  }

  /** One predicted step with this tick's input (as the server will apply it). */
  predict(
    world: StaticWorld,
    meta: WorldMeta,
    input: Partial<FlightWire> & { jump?: boolean },
    clock: number,
  ) {
    if (this.seat !== 0 || !this.predicted) return;
    if (this.prev) Object.assign(this.prev, this.predicted);
    else this.prev = { ...this.predicted };
    stepAircraft(world, meta, this.predicted, flightOf(input, this.predicted), clock, TICK);
  }

  /**
   * This frame's controls from the keys (dt seconds): the throttle lever moves while W / S is
   * held, roll and rudder ramp in and back. Holding LMB retains a mouse pitch target; the
   * arrow keys give the same elevator input without needing repeated mouse movement.
   */
  steer(k: FlightKeys, dt: number): FlightWire {
    const c = this.controls;
    const a = this.predicted ?? this.server;
    if (this.look.held) this.holdPitch(false);
    if (k.throttleUp) c.thr = Math.min(1, c.thr + 0.55 * dt);
    if (k.throttleDown) c.thr = Math.max(0, c.thr - 0.55 * dt);
    const roll = Number(k.rollRight) - Number(k.rollLeft);
    // The mouse's bank arrives in steps (one per mouse event): ease the target over them.
    this.bankTarget += (this.bankAim - this.bankTarget) * (1 - Math.exp(-dt / 0.16));
    // Mouse steering selects a modest bank. On release the wings ease back to level;
    // A/D remain a manual override. Taxiing uses the nose wheel instead of banking.
    const bankControl =
      this.seat === 0 && a
        ? a.grounded
          ? 0
          : clamp((this.bankTarget - attitude(a).bank) * 2 + a.wz * 0.5, -0.65, 0.65)
        : 0;
    const ail = a?.grounded ? 0 : roll || bankControl;
    // Keys ramp the aileron at a fixed rate; the mouse's command is eased (first order, then
    // the same rate limit) so the wings roll in and out without corners.
    if (roll) c.ail = toward(c.ail, ail, 3.2 * dt);
    else c.ail = toward(c.ail, c.ail + (ail - c.ail) * (1 - Math.exp(-dt / 0.09)), 2.2 * dt);
    if (roll && a && !a.grounded)
      this.bankTarget = this.bankAim = clamp(attitude(a).bank, -Math.PI / 6, Math.PI / 6);
    const yaw = Number(k.rudderRight) - Number(k.rudderLeft);
    const rud =
      yaw || (a?.grounded ? roll || clamp(this.bankTarget / (Math.PI / 6), -0.65, 0.65) : 0);
    c.rud = toward(c.rud, rud, (rud ? 2.6 : 4) * dt);
    const pitchKey = Number(!!k.pitchUp) - Number(!!k.pitchDown);
    if (!this.pitchHeld) c.stick *= Math.exp(-dt / 0.55);
    if (
      this.seat === 0 &&
      !this.look.held &&
      a &&
      (this.pitchHeld || pitchKey || this.levelOnRelease)
    ) {
      // Hold an attitude, not raw elevator: a held pull must not keep rotating into a stall.
      // Wait for rotation speed so a long drag during the ground roll cannot scrape the tail.
      // At full power a small, deliberate upward drag asks to rotate, not for a barely
      // perceptible trim change. Keep that shallow climb target after the wheels leave.
      if (
        this.pitchHeld &&
        !pitchKey &&
        a.grounded &&
        c.thr >= 0.8 &&
        aero(a).V >= 27 &&
        this.pitchTarget > Math.PI / 90
      )
        this.pitchTarget = Math.PI / 15;
      const target = pitchKey ? (pitchKey * Math.PI) / 15 : this.pitchTarget;
      c.elev =
        a.grounded && aero(a).V < 27
          ? 0
          : clamp((target - attitude(a).pitch) * 3 - a.wx * 0.6, -1, 1);
    } else c.elev = this.look.held ? 0 : clamp(c.stick, -1, 1);
    return {
      elev: r2(c.elev),
      ail: r2(c.ail),
      rud: r2(c.rud),
      thr: r2(c.thr),
      flaps: c.flaps,
    };
  }

  /** The mouse: up / down moves the stick (nose up / down, as when aiming), or turns the free look. */
  mouse(dx: number, dy: number, sensitivity: number) {
    if (this.look.held) {
      this.look.yaw -= dx * sensitivity * 0.0022;
      this.look.pitch = clamp(this.look.pitch - dy * sensitivity * 0.0022, -1.2, 0.9);
      return;
    }
    if (this.seat !== 0) return;
    // Aircraft pitch has its own gain: a low on-foot aiming sensitivity must not prevent
    // takeoff. Ten raw mouse counts are enough for a deliberate upward command.
    if (this.pitchHeld) {
      // Keep runway rotation responsive, but give small airborne corrections more travel.
      // In particular, lowering the mouse a little should not abruptly request a dive.
      const a = this.predicted ?? this.server;
      const gain = dy > 0 ? 0.004 : a?.grounded ? 0.012 : 0.006;
      this.bankAim = clamp(this.bankAim + dx * 0.004, -Math.PI / 6, Math.PI / 6);
      this.pitchTarget = clamp(this.pitchTarget - dy * gain, -Math.PI / 12, Math.PI / 15);
    } else {
      if (dy) this.levelOnRelease = false;
      this.controls.stick = clamp(this.controls.stick - dy * sensitivity * 0.0045, -1, 1);
    }
  }

  /** G: the flap lever's next notch (up → 10° → 30° → up). */
  nextFlaps() {
    this.controls.flaps = ((this.controls.flaps + 1) % 3) as 0 | 1 | 2;
  }

  /**
   * What to draw now: the pilot's prediction carried `aheadMs` past its last step (and its
   * correction fading), or everyone else's interpolation at the server time `t`.
   */
  sample(t: number, aheadMs: number, dtMs: number): Aircraft | null {
    const out = this.shown;
    if (this.predicted) {
      // Between the last two predicted ticks (one tick behind, but every frame on the same
      // smooth path: extrapolating by the angular velocity met each new tick with a small
      // step, a 30 Hz shimmer in the bank while steering).
      if (this.prev)
        blendAircraft(this.prev, this.predicted, clamp(aheadMs / TICK, 0, 1), out, this.tmp);
      else Object.assign(out, this.predicted);
      const k = Math.exp(-dtMs / 140);
      this.fix.x *= k;
      this.fix.y *= k;
      this.fix.z *= k;
      out.x += this.fix.x;
      out.y += this.fix.y;
      out.z += this.fix.z;
      // The orientation correction fades the same way (nlerp toward identity).
      const f = this.qfix;
      if (f.w < 0.999999) {
        f.x *= k;
        f.y *= k;
        f.z *= k;
        f.w = 1 - (1 - f.w) * k;
        const n = Math.hypot(f.x, f.y, f.z, f.w) || 1;
        f.x /= n;
        f.y /= n;
        f.z /= n;
        f.w /= n;
        const { qx, qy, qz, qw } = out;
        out.qw = f.w * qw - f.x * qx - f.y * qy - f.z * qz;
        out.qx = f.w * qx + f.x * qw + f.y * qz - f.z * qy;
        out.qy = f.w * qy - f.x * qz + f.y * qw + f.z * qx;
        out.qz = f.w * qz + f.x * qy - f.y * qx + f.z * qw;
      }
      this.hasShown = true;
      return out;
    }
    const S = this.samples;
    if (!S.length) {
      this.hasShown = false;
      return null;
    }
    let a = S[0]!,
      b = S[S.length - 1]!;
    for (let i = 0; i + 1 < S.length; i++)
      if (S[i]!.at <= t && S[i + 1]!.at >= t) {
        a = S[i]!;
        b = S[i + 1]!;
        break;
      }
    if (t >= b.at) {
      // Past the newest row (a parked aircraft is not sent again): hold it there, carried a
      // little along its motion when it moves.
      Object.assign(out, b.a);
      const s = Math.min(0.25, (t - b.at) / 1000);
      if (!b.a.grounded || Math.hypot(b.a.vx, b.a.vz) > 0.2) {
        out.x += out.vx * s;
        out.y += out.vy * s;
        out.z += out.vz * s;
        spin(out, s);
      }
    } else if (t <= a.at || a === b) Object.assign(out, a.a);
    else lerpAircraft(a.a, b.a, (t - a.at) / (b.at - a.at), out);
    this.hasShown = true;
    return out;
  }

  /** The chase camera starts behind the aircraft again (a spectator's view of another). */
  resetChase() {
    this.camHeading = NaN;
    this.look.yaw = this.look.pitch = 0;
  }

  /**
   * The chase camera for the aircraft `a` (this frame's): its place and the point it looks at.
   * It trails the heading and part of the nose's pitch (damped), never the bank (the horizon
   * stays level); Alt turns it around the aircraft; it stays out of the ground and buildings.
   */
  chase(world: StaticWorld, a: Aircraft, dtMs: number) {
    const mode = FLIGHT_CAMERAS[this.camera]!;
    const att = attitude(a);
    const k = 1 - Math.exp(-dtMs / 160);
    if (!Number.isFinite(this.camHeading)) {
      this.camHeading = att.heading;
      this.camPitch = att.pitch * 0.6;
    }
    this.camHeading +=
      Math.atan2(Math.sin(att.heading - this.camHeading), Math.cos(att.heading - this.camHeading)) *
      k;
    this.camPitch += (att.pitch * 0.6 - this.camPitch) * k;
    if (!this.look.held) {
      const back = 1 - Math.exp(-dtMs / 260);
      this.look.yaw -= Math.atan2(Math.sin(this.look.yaw), Math.cos(this.look.yaw)) * back;
      this.look.pitch -= this.look.pitch * back;
    }
    const yaw = this.camHeading + this.look.yaw;
    const pitch = clamp(this.camPitch + this.look.pitch, -1.3, 1.2);
    // The direction the camera looks (forward = (−sin, −cos) at pitch 0).
    const fx = -Math.sin(yaw) * Math.cos(pitch),
      fy = Math.sin(pitch),
      fz = -Math.cos(yaw) * Math.cos(pitch);
    const px = a.x,
      py = a.y + 1.1,
      pz = a.z;
    let dist = mode.back;
    const wantX = px - fx * dist,
      wantY = py - fy * dist + mode.up,
      wantZ = pz - fz * dist;
    // Out of walls and the ground: pull in along the line from the pivot.
    const dx = wantX - px,
      dy = wantY - py,
      dz = wantZ - pz;
    const len = Math.hypot(dx, dy, dz);
    const hit = world.raycast(px, py, pz, dx / len, dy / len, dz / len, len);
    const reach = hit ? Math.max(3.5, hit.distance - 0.5) : len;
    dist = reach / len;
    const cx = px + dx * dist,
      cz = pz + dz * dist;
    const cy = Math.max(py + dy * dist, world.hf.heightAt(cx, cz) + 0.6);
    return {
      x: cx,
      y: cy,
      z: cz,
      lookX: px + fx * 30,
      lookY: py + fy * 30 + mode.up * 0.75,
      lookZ: pz + fz * 30,
      yaw,
    };
  }
}

const TICK = 1000 / 30;

/** The wire's fields as the simulation's input (the server's own reading, match.ts). */
export function flightOf(
  input: Partial<FlightWire> & { jump?: boolean },
  a: Pick<Aircraft, "throttle" | "flaps">,
): FlightInput {
  return {
    elev: input.elev ?? 0,
    ail: input.ail ?? 0,
    rud: input.rud ?? 0,
    thr: input.thr ?? a.throttle,
    flaps: input.flaps ?? a.flaps,
    engine: false,
    brake: !!input.jump,
  };
}

/** The flight HUD's numbers (BrHud.flight). */
export type FlightHud = {
  seat: 0 | 1;
  /** Knots, feet, feet per minute: the aircraft's own instruments. */
  kt: number;
  ft: number;
  agl: number;
  vsFpm: number;
  throttle: number;
  rpm: number;
  /** Fuel left (0 … 1) and the time it lasts at this power (s). */
  fuel: number;
  fuelS: number;
  engine: Aircraft["engine"];
  health: number;
  flaps: 0 | 1 | 2;
  stall: boolean;
  /** Attitude (radians): pitch up, bank right positive; heading (compass, clockwise). */
  pitch: number;
  bank: number;
  heading: number;
  brake: boolean;
  grounded: boolean;
  /** Getting out now: allowed on the ground, with the parachute, or refused. */
  exit: "ground" | "parachute" | "unsafe" | "slow";
  camera: string;
  /** The passenger may move over (the pilot's seat is empty). */
  canTakeControls: boolean;
};

export function flightHud(world: StaticWorld, a: Aircraft, seat: 0 | 1, camera: number): FlightHud {
  const ae = aero(a);
  const att = attitude(a);
  const agl = heightAboveGround(world, a);
  const burn = AIRCRAFT.idleBurn + (1 - AIRCRAFT.idleBurn) * a.throttle;
  const speed = Math.hypot(a.vx, a.vy, a.vz);
  return {
    seat,
    kt: ae.V * 1.94384,
    ft: Math.max(0, a.y) * 3.28084,
    agl,
    vsFpm: a.vy * 196.85,
    throttle: a.throttle,
    rpm: Math.round(a.rpm * 2700),
    fuel: a.fuel / AIRCRAFT.fuelS,
    fuelS: a.engine === "running" ? a.fuel / burn : a.fuel / AIRCRAFT.idleBurn,
    engine: a.engine,
    health: a.health / a.maxHealth,
    flaps: a.flaps,
    stall: ae.warn && !a.grounded,
    pitch: att.pitch,
    bank: att.bank,
    heading: ((((-att.heading * 180) / Math.PI) % 360) + 360) % 360,
    brake: a.brake,
    grounded: a.grounded,
    exit: a.wet
      ? "ground"
      : agl < 0.7 && speed < EXIT.groundSpeed
        ? "ground"
        : agl < 0.7
          ? "slow"
          : agl >= EXIT.bailAgl
            ? "parachute"
            : "unsafe",
    camera: FLIGHT_CAMERAS[camera]!.name,
    canTakeControls: seat === 1 && a.pilot < 0,
  };
}

/** Within reach of the aircraft's door on foot (the E prompt): the seat it would give. */
export function boardable(a: Aircraft | null, x: number, y: number, z: number) {
  if (!a || a.destroyed) return null;
  if (!nearDoor(a, x, y + 0.9, z)) return null;
  if (Math.hypot(a.vx, a.vy, a.vz) > EXIT.groundSpeed) return null;
  return a.pilot < 0
    ? ("pilot" as const)
    : a.passenger < 0
      ? ("passenger" as const)
      : ("full" as const);
}
