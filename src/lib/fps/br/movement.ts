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

/** Steepest walkable terrain (rise over run); steeper ground cannot be climbed. */
export const MAX_SLOPE = 1.0;
/** Hull height above the feet (eye plus head room, as in 1v1). */
const hullHeight = (crouched: boolean) => (crouched ? CROUCH_EYE_HEIGHT : EYE_HEIGHT) + 0.2;
const EDGE = WORLD_HALF - 2;

export function stepBody(world: StaticWorld, p: BrBody, input: BrMoveInput | null, dt: number) {
  if (!Number.isFinite(dt) || dt <= 0) return;
  const seconds = Math.min(dt, TICK_MS) / 1000;
  const r = PLAYER_RADIUS;
  if (input) {
    if (input.jump && p.grounded) {
      p.velocityY = JUMP_SPEED;
      p.grounded = false;
    }
    // Stand up only where the standing hull fits.
    const wantsCrouch = !!input.crouch;
    if (!wantsCrouch && p.crouched && world.blocked(p.x, p.y, p.z, hullHeight(false), r))
      p.crouched = true;
    else p.crouched = wantsCrouch;
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
      const support = world.supportAt(nx, nz, r, p.y + (p.grounded ? STEP_HEIGHT : 0));
      const rise = support - p.y;
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
      const footY = p.grounded && rise > 0 ? support : p.y;
      if (world.blocked(nx, footY + 1e-4, nz, height, r)) continue;
      p.x = nx;
      p.z = nz;
      if (p.grounded && rise > 0) p.y = support;
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
    p.velocityY = 0;
    p.grounded = true;
  } else p.grounded = false;
  // Head bumps: rising into a box stops the jump.
  if (nextY > previousY && world.blocked(p.x, nextY, p.z, hullHeight(p.crouched), r)) {
    nextY = previousY;
    p.velocityY = 0;
  }
  p.y = nextY;
}
