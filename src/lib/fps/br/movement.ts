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
  if (!world.blocked(p.x, p.y + 1e-4, p.z, height, r)) return false;
  for (let ring = 1; ring <= 16; ring++) {
    const d = ring * 0.25;
    const steps = 8 + ring * 2;
    for (let k = 0; k < steps; k++) {
      const a = (k / steps) * Math.PI * 2;
      const x = Math.max(-EDGE, Math.min(EDGE, p.x + Math.cos(a) * d)),
        z = Math.max(-EDGE, Math.min(EDGE, p.z + Math.sin(a) * d));
      const y = world.supportAt(x, z, r, p.y + STEP_HEIGHT);
      if (y < p.y - 3) continue; // not over a drop
      if (world.blocked(x, y + 1e-4, z, height, r)) continue;
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
      if (!world.blocked(p.x, stanceY + 1e-4, p.z, hullHeight(wantsCrouch), r)) {
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
    for (const axis of ["x", "z"] as const) {
      const delta = axis === "x" ? dx : dz;
      if (delta === 0) continue;
      const nx = axis === "x" ? Math.max(-EDGE, Math.min(EDGE, p.x + delta)) : p.x;
      const nz = axis === "z" ? Math.max(-EDGE, Math.min(EDGE, p.z + delta)) : p.z;
      // Stairs, kerbs and slopes: rise onto anything up to one step under the new position.
      // In the air, from a plain jump's top on: onto an object's edge within AIR_STEP.
      const airStep =
        !p.grounded && !p.crouched && !(p.airCrouchOffset ?? 0) && p.velocityY <= AIR_STEP_RISE;
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
        terrainRise > Math.abs(delta) * MAX_SLOPE + 1e-6 &&
        terrainRise > 0.02
      )
        continue;
      const climbs = rise > 0 && (p.grounded || (airStep && onObject));
      const footY = climbs ? support : p.y;
      if (world.blocked(nx, footY + 1e-4, nz, height, r)) continue;
      p.x = nx;
      p.z = nz;
      if (climbs) {
        p.y = support;
        // Onto the edge from the air: the jump ends there (no extra height from the step).
        if (!p.grounded) p.velocityY = Math.min(p.velocityY, 0);
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
