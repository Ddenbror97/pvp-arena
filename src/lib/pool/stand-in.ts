/**
 * Shots for a seat that never came to the table.
 * The stored shot is exact and replayable. The miss is in the aim that was
 * chosen, not in the physics. The same seed and rack always pick the same shot.
 */
import {
  BALL_R,
  PHYSICS_V6,
  PHYSICS_V7,
  POCKETS,
  TABLE_H,
  TABLE_W,
  cushionLimit,
  simulate,
  type Ball,
  type ShotInput,
} from "./physics";
import {
  defaultCueSpot,
  groupClear,
  groupOf,
  legalPlacement,
  seatGroup,
  type TableState,
} from "./rules";

/** A short pause so a returning player can take the seat before the table shoots. */
export const STAND_IN_THINK_MS = 2_000;
export const STAND_IN_OVERDUE_MS = 45_000;
/** Ease length for a cue pull. The match does not hold a finished pull before the stroke. */
export const STAND_IN_CUE_MS = 1_600;
/** The ghost cue draws and hits in one motion, and the balls leave during that hit. */
export const STAND_IN_STROKE_MS = 720;
/** Forward hit after the live pull. The draw itself already happened on the clock. */
export const STAND_IN_RELEASE_MS = 480;
/** Full ghost stroke time when the tip meets the cue ball. The draw is the first 0.34. */
export const STAND_IN_HIT_T = 0.62;
/** Release time when the tip meets the cue ball. The draw was already shown. */
export const STAND_IN_RELEASE_HIT_T = (STAND_IN_HIT_T - 0.34) / 0.66;

/** 0 when the cue is still at rest, 1 when the draw-back has finished. */
export function standInCuePull(elapsedMs: number, durationMs = STAND_IN_CUE_MS): number {
  if (durationMs <= 0) return 1;
  const t = Math.max(0, Math.min(1, elapsedMs / durationMs));
  return 1 - (1 - t) * (1 - t);
}

/** Power shown on the ghost cue. A short pull still leaves the stick readable. */
export function standInShownPower(power: number, pull: number): number {
  const shown = Math.max(0.16, Math.min(1, pull));
  return Math.max(1, Math.round(power * shown));
}

/**
 * Ghost stroke, from address through the draw and into the hit.
 * `t` is 0 at the start and 1 when the cue has followed through.
 * The ink stays faint for the whole motion.
 */
export function standInStroke(power: number, t: number): { gap: number; alpha: number } {
  const clamped = Number.isFinite(t) ? Math.max(0, Math.min(1, t)) : 0;
  const pulled = 1.28 + (Math.min(10_000, Math.max(1, power)) / 10_000) * 4.4;
  const address = 1.28;
  const full = pulled + 1.15;
  let gap = 1.05;
  let alpha = 1;
  if (clamped < 0.34) gap = address + (full - address) * (clamped / 0.34);
  else if (clamped < 0.62) gap = full + (1.05 - full) * ((clamped - 0.34) / 0.28);
  else alpha = 1 - (clamped - 0.62) / 0.38;
  return { gap, alpha: Math.max(0, alpha) * 0.42 };
}

/**
 * The hit after a pull the player already watched.
 * `t` is 0 at full draw and 1 when the cue has followed through.
 */
export function standInRelease(power: number, t: number): { gap: number; alpha: number } {
  const clamped = Number.isFinite(t) ? Math.max(0, Math.min(1, t)) : 0;
  return standInStroke(power, 0.34 + clamped * 0.66);
}

/** When the balls leave during a ghost stroke. A release is already past the draw. */
export function standInBallLeave(holdMs: number, released: boolean): number {
  return Math.round(holdMs * (released ? STAND_IN_RELEASE_HIT_T : STAND_IN_HIT_T));
}

/** True once the seat has had a moment to sit down, and before the clock gives up. */
export function standInDue(turnDeadlineIso: string, nowMs: number, shotSeconds = 30): boolean {
  const deadline = Date.parse(turnDeadlineIso);
  if (!Number.isFinite(deadline)) return false;
  const thinkAt = deadline - Math.max(0, shotSeconds * 1000 - STAND_IN_THINK_MS);
  return nowMs >= thinkAt && nowMs < deadline + STAND_IN_OVERDUE_MS;
}

/** v6 and v7 share the 11 mph pull. Older racks stay on the softer launch. */
function firmLaunch(physics: string): boolean {
  return physics === PHYSICS_V6 || physics === PHYSICS_V7;
}

function rngOf(seed: Uint8Array, shot: number): () => number {
  let s = 0n;
  const mask = (1n << 64n) - 1n;
  for (let i = 0; i < seed.length; i++) s = ((s << 8n) ^ BigInt(seed[i] ?? 0)) & mask;
  s ^= BigInt(shot + 1) * 0x9e3779b97f4a7c15n;
  s &= mask;
  if (s === 0n) s = 0x6a09e667f3bcc909n;
  return () => {
    s ^= (s << 13n) & mask;
    s ^= s >> 7n;
    s ^= (s << 17n) & mask;
    s &= mask;
    return Number(s % 10_000n) / 10_000;
  };
}

function wrap(milli: number): number {
  return ((Math.round(milli) % 360_000) + 360_000) % 360_000;
}

function milliOf(dx: number, dy: number): number {
  return wrap((Math.atan2(dy, dx) * 180_000) / Math.PI);
}

function hypot(dx: number, dy: number): number {
  return Math.hypot(dx, dy);
}

function distPointSeg(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const abx = bx - ax;
  const aby = by - ay;
  const ab2 = abx * abx + aby * aby;
  const t = ab2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / ab2));
  return hypot(px - (ax + abx * t), py - (ay + aby * t));
}

function blocked(
  balls: readonly Ball[],
  ax: number,
  ay: number,
  bx: number,
  by: number,
  ignore: number,
  gap: number,
): boolean {
  for (const ball of balls) {
    if (ball.pocketed || ball.id === 0 || ball.id === ignore) continue;
    if (distPointSeg(ball.x, ball.y, ax, ay, bx, by) < gap) return true;
  }
  return false;
}

type Rng = () => number;

type Line = {
  ballId: number;
  pocketId: number;
  angle: number;
  cut: number;
  dist: number;
  gx: number;
  gy: number;
  ox: number;
  oy: number;
};

function shotOf(
  angle: number,
  power: number,
  place: { x: number; y: number } | null,
  called: number | null,
): ShotInput {
  return {
    angleMilli: wrap(angle),
    power: Math.max(1, Math.min(10_000, Math.round(power))),
    spinX: 0,
    spinY: 0,
    placeX: place?.x ?? null,
    placeY: place?.y ?? null,
    calledPocket: called,
  };
}

function targetIds(state: TableState, shootingEight: boolean): number[] {
  if (shootingEight) return [8];
  const group = seatGroup(state, state.turn);
  return state.balls
    .filter(
      (ball) => !ball.pocketed && (group ? groupOf(ball.id) === group : groupOf(ball.id) != null),
    )
    .map((ball) => ball.id);
}

function pick<T>(rows: readonly T[], rng: Rng): T | null {
  if (rows.length === 0) return null;
  const keep = rows.slice(0, Math.min(3, rows.length));
  const roll = rng();
  if (keep.length === 1 || roll < 0.62) return keep[0] ?? null;
  if (keep.length === 2 || roll < 0.88) return keep[1] ?? null;
  return keep[2] ?? null;
}

function linesFrom(state: TableState, cue: Ball, ids: readonly number[]): Line[] {
  const out: Line[] = [];
  for (const id of ids) {
    const ball = state.balls.find((item) => item.id === id && !item.pocketed);
    if (!ball) continue;
    for (const pocket of POCKETS) {
      const pdx = pocket.x - ball.x;
      const pdy = pocket.y - ball.y;
      const plen = hypot(pdx, pdy);
      if (plen < pocket.r) continue;
      const ux = pdx / plen;
      const uy = pdy / plen;
      const gx = ball.x - ux * BALL_R * 2;
      const gy = ball.y - uy * BALL_R * 2;
      const wall = cushionLimit(state.physics);
      if (gx < wall.minX || gy < wall.minY || gx > wall.maxX || gy > wall.maxY) continue;
      const cdx = gx - cue.x;
      const cdy = gy - cue.y;
      const clen = hypot(cdx, cdy);
      if (clen < BALL_R) continue;
      const toBall = hypot(ball.x - cue.x, ball.y - cue.y) || 1;
      const dot = ((ball.x - cue.x) / toBall) * ux + ((ball.y - cue.y) / toBall) * uy;
      const cut = (Math.acos(Math.max(-1, Math.min(1, dot))) * 180) / Math.PI;
      if (cut > 70) continue;
      if (blocked(state.balls, cue.x, cue.y, gx, gy, id, BALL_R * 2 - 500)) continue;
      if (blocked(state.balls, ball.x, ball.y, pocket.x, pocket.y, id, BALL_R * 1.7)) continue;
      out.push({
        ballId: id,
        pocketId: pocket.id,
        angle: milliOf(cdx, cdy),
        cut,
        dist: toBall,
        gx,
        gy,
        ox: ball.x,
        oy: ball.y,
      });
    }
  }
  out.sort((a, b) => a.cut + a.dist / 500_000 - (b.cut + b.dist / 500_000));
  return out;
}

function aimError(cut: number, rng: Rng): number {
  // Triangular, so most shots are close and the tails miss. A hard cut wanders more.
  const span = 3_200 + cut * 55;
  return (rng() + rng() - 1) * span;
}

function powerFor(dist: number, rng: Rng): number {
  return 2_800 + Math.min(5_400, dist / 250) + (rng() - 0.5) * 800;
}

function withCue(balls: readonly Ball[], shot: ShotInput): Ball[] {
  const next = balls.map((ball) => ({ ...ball }));
  if (shot.placeX == null || shot.placeY == null) return next;
  const cue = next.find((ball) => ball.id === 0);
  if (!cue) return next;
  cue.x = shot.placeX;
  cue.y = shot.placeY;
  cue.pocketed = false;
  cue.vx = 0;
  cue.vy = 0;
  return next;
}

/** One softer try when the chosen line scratches. It does not hunt for a pocket. */
function easeScratch(state: TableState, shot: ShotInput): ShotInput {
  const sim = simulate(withCue(state.balls, shot), shot, false, state.physics);
  if (!sim.cueScratch) return shot;
  const floor = state.breakShot ? (firmLaunch(state.physics) ? 7_600 : 5_200) : 2_500;
  return { ...shot, power: Math.max(floor, Math.round(shot.power * 0.62)) };
}

function breakShot(state: TableState, cue: Ball, rng: Rng): ShotInput {
  const wall = cushionLimit(state.physics);
  let x = Math.floor(TABLE_W / 4) - BALL_R - Math.round(rng() * 70_000);
  // v7 cloth is quicker, so a cue started low in the kitchen only clips the rack.
  const ySpan = state.physics === PHYSICS_V7 ? 48_000 : 150_000;
  let y = Math.floor(TABLE_H / 2) + Math.round((rng() - 0.5) * ySpan);
  x = Math.max(wall.minX + 2_000, Math.min(Math.floor(TABLE_W / 4), x));
  y = Math.max(wall.minY + 2_000, Math.min(wall.maxY - 2_000, y));
  if (!legalPlacement(state, x, y)) {
    x = cue.x;
    y = cue.y;
  }
  const ax = Math.floor((TABLE_W * 3) / 4) + Math.round((rng() - 0.5) * 18_000);
  const ay = Math.floor(TABLE_H / 2) + Math.round((rng() - 0.5) * 32_000);
  const wander = firmLaunch(state.physics) ? 900 : 2_400;
  const angle = milliOf(ax - x, ay - y) + (rng() + rng() - 1) * wander;
  // v6 and v7 launch at the same cue speed, so the break stays a firm pull.
  const power = firmLaunch(state.physics)
    ? 8_400 + Math.round(rng() * 1_600)
    : 6_200 + Math.round(rng() * 2_600);
  return shotOf(angle, power, { x, y }, null);
}

function placeBehind(
  state: TableState,
  ghost: { x: number; y: number },
  object: { x: number; y: number },
  rng: Rng,
): { x: number; y: number } | null {
  const dx = ghost.x - object.x;
  const dy = ghost.y - object.y;
  const len = hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  for (const dist of [BALL_R * 8, BALL_R * 14, BALL_R * 22]) {
    const x = Math.round(ghost.x + ux * dist + (rng() - 0.5) * 6_000);
    const y = Math.round(ghost.y + uy * dist + (rng() - 0.5) * 6_000);
    if (legalPlacement(state, x, y)) return { x, y };
  }
  return null;
}

function nearestPocket(ball: Ball): number {
  let best = POCKETS[0]?.id ?? 0;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const pocket of POCKETS) {
    const dist = hypot(pocket.x - ball.x, pocket.y - ball.y);
    if (dist < bestDist) {
      bestDist = dist;
      best = pocket.id;
    }
  }
  return best;
}

function looseShot(
  state: TableState,
  cue: Ball,
  ids: readonly number[],
  place: { x: number; y: number } | null,
  rng: Rng,
  shootingEight: boolean,
): ShotInput {
  const ball =
    state.balls.find((item) => ids.includes(item.id) && !item.pocketed) ??
    state.balls.find((item) => item.id !== 0 && !item.pocketed);
  const from = place ?? cue;
  const angle = ball
    ? milliOf(ball.x - from.x, ball.y - from.y) + (rng() + rng() - 1) * 6_000
    : rng() * 360_000;
  const called = shootingEight && ball ? nearestPocket(ball) : null;
  return shotOf(angle, 3_600 + rng() * 1_800, place, called);
}

function standInAim(state: TableState, seed: Uint8Array): ShotInput {
  const rng = rngOf(seed, state.shot);
  const cue = state.balls.find((ball) => ball.id === 0);
  if (!cue) return shotOf(rng() * 360_000, 4_000, null, null);
  // A scratch leaves the cue in the pocket. The incoming seat still has to place it.
  const recovered = cue.pocketed ? (state.ballInHand ? defaultCueSpot(state) : null) : null;
  if (cue.pocketed && !recovered) return shotOf(rng() * 360_000, 4_000, null, null);
  const held = recovered ? { ...cue, x: recovered.x, y: recovered.y, pocketed: false } : cue;
  if (state.breakShot) return breakShot(state, held, rng);

  const group = seatGroup(state, state.turn);
  const shootingEight = group != null && groupClear(state.balls, group);
  const ids = targetIds(state, shootingEight);
  let place: { x: number; y: number } | null = recovered;
  let from = held;

  if (state.ballInHand && ids.length > 0) {
    const parked = linesFrom(state, from, ids);
    const choice = pick(parked, rng);
    if (choice) {
      const spot = placeBehind(
        state,
        { x: choice.gx, y: choice.gy },
        { x: choice.ox, y: choice.oy },
        rng,
      );
      if (spot) {
        place = spot;
        from = { ...cue, x: spot.x, y: spot.y, pocketed: false };
      }
    }
  }

  if (state.ballInHand && !place) {
    const spot = defaultCueSpot(state);
    if (spot) {
      place = spot;
      from = { ...from, x: spot.x, y: spot.y, pocketed: false };
    }
  }

  const found = linesFrom(state, from, ids);
  const line = pick(found, rng);
  if (!line) return looseShot(state, from, ids, place, rng, shootingEight);
  return shotOf(
    line.angle + aimError(line.cut, rng),
    powerFor(hypot(from.x - line.ox, from.y - line.oy), rng),
    place,
    shootingEight ? line.pocketId : null,
  );
}

/**
 * The aim the cue can show before any ball is rolled.
 * Same angle and spot as the stored shot. Scratch softening may only lower the power.
 */
export function planStandInShot(state: TableState, seed: Uint8Array): ShotInput {
  return standInAim(state, seed);
}

export function chooseStandInShot(state: TableState, seed: Uint8Array): ShotInput {
  const shot = standInAim(state, seed);
  const cue = state.balls.find((ball) => ball.id === 0);
  if (!cue || (cue.pocketed && shot.placeX == null)) return shot;
  return easeScratch(state, shot);
}
