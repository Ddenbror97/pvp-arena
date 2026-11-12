import { CROUCH_EYE_HEIGHT, EYE_HEIGHT, PLAYER_RADIUS, STEP_HEIGHT } from "../map";
import { GRAVITY, JUMP_SPEED, MOVE_SPEED, TICK_MS, WALK_SPEED_SCALE } from "../simulation";
import type { StaticWorld } from "./static-world";
import { WORLD_HALF } from "./world";

/**
 * On-foot movement on Project Island, shared by the server room and client prediction (same
 * constants as 1v1/5v5: speeds, jump, gravity, step height, hull radius). Ground is the
 * heightfield plus the tops of building/prop boxes; walls, props and trunks block.
 *
 * Deterministic for the same inputs and world: no rendering state is read (fairness boundary).
 */
export type BrBody = {
  x: number;
  y: number;
  z: number;
  velocityY: number;
  crouched: boolean;
  grounded: boolean;
  /** Air-duck hull contraction, replicated so reconciliation cannot apply it twice. */
  airCrouchOffset?: number;
  /** Speed (m/s, ≥ 0) of a landing made by the last step, else 0 (fall damage: match.ts). */
  impact?: number;
};

export type BrMoveInput = {
  forward: number;
  strafe: number;
  yaw: number;
  jump?: boolean;
  crouch?: boolean;
  sprint?: boolean;
  walk?: boolean;
  /**
   * Bots (server only, never predicted): a blocked move is dropped whole, without the slide up
   * to the obstacle or the corner assist (their cost, on a hundred bots a tick, is the room's;
   * their own stuck detection steers them round).
   */
  plain?: boolean;
};

/**
 * Getting onto objects from a jump (owner, 2026-11-10): from the top of a plain jump on (rising
 * slower than AIR_STEP_RISE m/s, or falling) the feet step onto an edge up to AIR_STEP above
 * them, as they do walking up a kerb. The jump itself (impulse, gravity; apex 0.81 m at the
 * 30 Hz tick) is unchanged; pallets, crates, tables, drums and low walls (0.9–1.15 m) become
 * reachable, as cars already are by a crouch-jump (which tucks the legs instead and takes no
 * step). Only onto objects, never the terrain.
 */
export const AIR_STEP = STEP_HEIGHT;
const AIR_STEP_RISE = 0.5;
/**
 * Fall damage (owner, 2026-11-10: jumping off buildings did nothing): a landing faster than
 * `safe` m/s costs `perMs` health per m/s over it, armour aside. With gravity 14 m/s², drops
 * up to ~3.6 m are free, a 6 m roof costs ~21, 12 m ~58, and ~21 m kills. A jump lands at
 * 5 m/s. Parachute and water landings are not falls.
 */
export const FALL_DAMAGE = { safe: 10, perMs: 7 } as const;
export const fallDamage = (impact: number) =>
  impact > FALL_DAMAGE.safe
    ? Math.round((impact - FALL_DAMAGE.safe) * FALL_DAMAGE.perMs * 10) / 10
    : 0;

/** Bots stop short of a drop deeper than this (m): a fall from there starts to hurt. */
export const BOT_LEDGE = 4;
/**
 * Bots on foot do not walk off roofs, balconies or upper floors (with fall damage they hurt
 * themselves: ten falls and one death in a simulated match). A move whose next 0.9 m leads over
 * a drop deeper than BOT_LEDGE is cancelled; the bot's own stuck detection then takes another
 * way (the stairs). Players are not held: jumping off a building is theirs to choose.
 */
export function holdAtLedge<T extends BrMoveInput>(world: StaticWorld, p: BrBody, input: T): T {
  // Airborne too: walking down a pitched roof leaves the ground for a tick at a time.
  if (!input.forward && !input.strafe) return input;
  const len = Math.hypot(input.forward, input.strafe) || 1;
  const dx = (-Math.sin(input.yaw) * input.forward + Math.cos(input.yaw) * input.strafe) / len,
    dz = (-Math.cos(input.yaw) * input.forward - Math.sin(input.yaw) * input.strafe) / len;
  // Ahead, and ahead of each side of the body (a slanting move goes over an edge side-first).
  for (const d of [0.45, 0.9])
    for (const side of [-0.3, 0, 0.3]) {
      const x = p.x + dx * d - dz * side,
        z = p.z + dz * d + dx * side;
      if (p.y - world.supportAt(x, z, 0.05, p.y + STEP_HEIGHT) > BOT_LEDGE)
        return { ...input, forward: 0, strafe: 0 };
    }
  return input;
}

/** Steepest walkable terrain (rise over run); steeper ground cannot be climbed. */
export const MAX_SLOPE = 1.0;
/** The feet count as on a surface they are within this of (box tops, landings). */
const FOOT_SKIN = 1e-4;
/**
 * A doorway or a narrow flight met off-centre: when the move along an axis is blocked by an
 * edge that a sideways shift of up to ASSIST (searched in ASSIST_STEP steps) would clear, the
 * body eases sideways toward that shift (at most 70 % of the move, and only what is left of the
 * tick's step: never faster than walking or running) and goes on, as a round body glances off
 * a corner. Smooths 0.8–1.0 m doorways (a 0.7 m hull), porch posts and the turns of stairs;
 * never lets the body through anything narrower than itself (the shift is under the hull's
 * width, so its start and end cover the way between).
 */
const ASSIST = 0.3;
const ASSIST_STEP = 0.03;
/** Hull height above the feet (eye plus head room, as in 1v1). */
const hullHeight = (crouched: boolean) => (crouched ? CROUCH_EYE_HEIGHT : EYE_HEIGHT) + 0.2;
const EDGE = WORLD_HALF - 2;

/**
 * A body that ends up inside solid geometry (a parachute landing on a tree trunk or a box edge)
 * steps to the nearest free spot within 4 m, searched in rings (deterministic: the same world
 * and position give the same spot on the server and in client prediction). Without this every
 * move from inside an overlap is refused and the player is stuck for good.
 */
export function unstick(world: StaticWorld, p: BrBody) {
  const height = hullHeight(p.crouched);
  const r = PLAYER_RADIUS;
  if (!world.blocked(p.x, p.y + FOOT_SKIN, p.z, height, r)) return false;
  for (let ring = 1; ring <= 16; ring++) {
    const d = ring * 0.25;
    const steps = 8 + ring * 2;
    for (let k = 0; k < steps; k++) {
      const a = (k / steps) * Math.PI * 2;
      const x = Math.max(-EDGE, Math.min(EDGE, p.x + Math.cos(a) * d)),
        z = Math.max(-EDGE, Math.min(EDGE, p.z + Math.sin(a) * d));
      const y = world.supportAt(x, z, r, p.y + STEP_HEIGHT);
      if (y < p.y - 3) continue; // not over a drop
      if (world.blocked(x, y + FOOT_SKIN, z, height, r)) continue;
      p.x = x;
      p.z = z;
      p.y = y;
      return true;
    }
  }
  return false;
}

export function stepBody(world: StaticWorld, p: BrBody, input: BrMoveInput | null, dt: number) {
  if (!Number.isFinite(dt) || dt <= 0) return;
  const seconds = Math.min(dt, TICK_MS) / 1000;
  const r = PLAYER_RADIUS;
  if (p.grounded) unstick(world, p);
  p.impact = 0;
  if (input) {
    const grounded = p.grounded;
    if (input.jump && grounded) {
      p.velocityY = JUMP_SPEED;
      p.grounded = false;
    }
    // Match arena crouch-jumps: tuck the feet toward the head without adding jump impulse.
    const wantsCrouch = !!input.crouch;
    const tuck = wantsCrouch && (!grounded || input.jump) ? EYE_HEIGHT - CROUCH_EYE_HEIGHT : 0;
    const stanceY = p.y + tuck - (p.airCrouchOffset ?? 0);
    if (wantsCrouch !== p.crouched || tuck !== (p.airCrouchOffset ?? 0)) {
      if (!world.blocked(p.x, stanceY + FOOT_SKIN, p.z, hullHeight(wantsCrouch), r)) {
        p.y = stanceY;
        p.crouched = wantsCrouch;
        p.airCrouchOffset = tuck;
      } else p.crouched = true;
    }
    const length = Math.max(1, Math.hypot(input.forward, input.strafe));
    const scale = input.walk ? WALK_SPEED_SCALE : p.crouched ? 0.48 : input.sprint ? 1.5 : 1;
    const speed = (MOVE_SPEED * scale * seconds) / length;
    const dx = (-Math.sin(input.yaw) * input.forward + Math.cos(input.yaw) * input.strafe) * speed;
    const dz = (-Math.cos(input.yaw) * input.forward - Math.sin(input.yaw) * input.strafe) * speed;
    const height = hullHeight(p.crouched);
    // Stairs, kerbs and slopes: rise onto anything up to one step under the new position.
    // In the air, from a plain jump's top on: onto an object's edge within AIR_STEP.
    const airStep =
      !p.grounded && !p.crouched && !(p.airCrouchOffset ?? 0) && p.velocityY <= AIR_STEP_RISE;
    const clampEdge = (v: number) => Math.max(-EDGE, Math.min(EDGE, v));
    /** Where the body stands at (nx, nz) after a move of `length` m, or null if it may not. */
    const attempt = (nx: number, nz: number, length: number) => {
      const support = world.supportAt(
        nx,
        nz,
        r,
        p.y + (p.grounded ? STEP_HEIGHT : airStep ? AIR_STEP : 0),
      );
      const rise = support - p.y;
      const onObject = rise > 0 && support > world.hf.heightAt(nx, nz) + 0.05;
      // Too steep: terrain climbing faster than MAX_SLOPE along the move is a wall (only while
      // standing on the terrain itself, not on a deck, roof or box above it).
      const here = world.hf.heightAt(p.x, p.z);
      const terrainRise = world.hf.heightAt(nx, nz) - here;
      if (
        Math.abs(p.y - here) < 0.05 &&
        terrainRise > length * MAX_SLOPE + 1e-6 &&
        terrainRise > 0.02
      )
        return null;
      const climbs = rise > 0 && (p.grounded || (airStep && onObject));
      const footY = climbs ? support : p.y;
      if (world.blocked(nx, footY + FOOT_SKIN, nz, height, r)) return null;
      return { climbs, support };
    };
    const apply = (nx: number, nz: number, to: { climbs: boolean; support: number }) => {
      p.x = nx;
      p.z = nz;
      if (to.climbs) {
        p.y = to.support;
        // Onto the edge from the air: the jump ends there (no extra height from the step).
        if (!p.grounded) p.velocityY = Math.min(p.velocityY, 0);
      }
    };
    const x0 = p.x,
      z0 = p.z;
    /** Axes whose move an obstacle cut short (for the corner assist below). */
    const blockedAxes: Array<{ axis: "x" | "z"; delta: number }> = [];
    for (const axis of ["x", "z"] as const) {
      const delta = axis === "x" ? dx : dz;
      if (delta === 0) continue;
      const along = (f: number) =>
        axis === "x"
          ? ([clampEdge(p.x + delta * f), p.z] as const)
          : ([p.x, clampEdge(p.z + delta * f)] as const);
      const [fx, fz] = along(1);
      const full = attempt(fx, fz, Math.abs(delta));
      if (full) {
        apply(fx, fz, full);
        continue;
      }
      if (input.plain) continue;
      blockedAxes.push({ axis, delta });
      // Up to the obstacle (not stopped short of it by up to a whole step).
      let lo = 0,
        hi = 1,
        best: { x: number; z: number; to: { climbs: boolean; support: number } } | null = null;
      for (let k = 0; k < 5; k++) {
        const mid = (lo + hi) / 2;
        const [mx, mz] = along(mid);
        const to = attempt(mx, mz, Math.abs(delta) * mid);
        if (to) {
          lo = mid;
          best = { x: mx, z: mz, to };
        } else hi = mid;
      }
      if (best) apply(best.x, best.z, best.to);
    }
    // An edge in the way (a door jamb, a newel post, the turn of a stair): the least sideways
    // shift that would free the blocked move (the side the input leans to first) is eased
    // toward, as a round body glances off a corner, within what is left of this tick's step
    // (never faster than the input's speed).
    const stepLength = Math.hypot(dx, dz);
    for (const { axis, delta } of blockedAxes) {
      const left = stepLength - Math.hypot(p.x - x0, p.z - z0);
      if (left < ASSIST_STEP / 2) break;
      const lean = axis === "x" ? dz : dx;
      const sides = lean < 0 ? [-1, 1] : [1, -1];
      const shifted = (o: number) =>
        axis === "x" ? ([p.x, clampEdge(p.z + o)] as const) : ([clampEdge(p.x + o), p.z] as const);
      const ahead = (x: number, z: number) =>
        axis === "x" ? ([clampEdge(x + delta), z] as const) : ([x, clampEdge(z + delta)] as const);
      // A side whose sideways shift is blocked stays blocked further out (that is a wall).
      const open = [true, true];
      let done = false;
      for (
        let s = ASSIST_STEP;
        s <= ASSIST + 1e-9 && !done && (open[0] || open[1]);
        s += ASSIST_STEP
      )
        for (let k = 0; k < 2; k++) {
          if (!open[k]) continue;
          const side = sides[k]!;
          const [sx, sz] = shifted(s * side);
          // The sideways shift itself must be free (no slipping through a thin wall).
          if (world.blocked(sx, p.y + FOOT_SKIN, sz, height, r)) {
            open[k] = false;
            continue;
          }
          const [ax, az] = ahead(sx, sz);
          // Only onto the same floor or a step (never round a post and off a stair's side).
          if (!attempt(ax, az, Math.abs(delta))) continue;
          if (world.supportAt(ax, az, r, p.y + STEP_HEIGHT) < p.y - STEP_HEIGHT) {
            open[k] = false;
            continue;
          }
          const a = Math.min(s, Math.max(ASSIST_STEP, Math.abs(delta) * 0.7), left);
          const [ex, ez] = shifted(a * side);
          const to = attempt(ex, ez, a);
          if (to) apply(ex, ez, to);
          done = true;
          break;
        }
    }
  }
  // Vertical: gravity, landing on the highest support not above the feet.
  const previousY = p.y;
  p.velocityY -= GRAVITY * seconds;
  let nextY = p.y + p.velocityY * seconds;
  const support = world.supportAt(
    p.x,
    p.z,
    r,
    Math.max(previousY, nextY) + (p.grounded ? STEP_HEIGHT : 0),
  );
  // Walking downhill keeps the feet on the ground (snap down up to one step per tick).
  if (p.grounded && p.velocityY <= 0 && support < p.y && p.y - support <= STEP_HEIGHT + 0.25)
    nextY = support;
  if (nextY <= support) {
    nextY = support;
    if (!p.grounded) p.impact = Math.max(0, -p.velocityY);
    p.velocityY = 0;
    p.grounded = true;
    p.airCrouchOffset = 0;
  } else p.grounded = false;
  // Head bumps: rising into a box stops the jump.
  if (nextY > previousY && world.blocked(p.x, nextY, p.z, hullHeight(p.crouched), r)) {
    nextY = previousY;
    p.velocityY = 0;
  }
  p.y = nextY;
}
