/**
 * Pool physics v1. Integer micrometres and integer ticks, so a shot replays
 * without depending on frame rate or Math.sin. The Worker is the authority.
 * Clients animate the same function and snap to the server hash if they differ.
 *
 * Table: 2.54 m by 1.27 m. Ball diameter 57.15 mm. One tick is 1/240 s.
 * Speed is capped below half a radius per tick so balls cannot tunnel.
 */

/** Matches already stored under v1 keep that drag. New racks use v2, which can cross the table. */
export const PHYSICS_V1 = "pool-phys-v1";
export const PHYSICS_VERSION = "pool-phys-v2";

export const TABLE_W = 2_540_000;
export const TABLE_H = 1_270_000;
export const BALL_R = 28_575;
export const TICKS_PER_SEC = 240;
export const MAX_TICKS = TICKS_PER_SEC * 8;
export const MAX_SPEED = 14_000;

export type Ball = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Side english, -1000..1000. Decays. Cue only uses it. */
  spin: number;
  pocketed: boolean;
};

export type ShotInput = {
  /** Millidegrees, 0 = +x, 90 = +y. */
  angleMilli: number;
  /** 1..10000. */
  power: number;
  spinX: number;
  spinY: number;
  placeX: number | null;
  placeY: number | null;
  calledPocket: number | null;
};

export type Pocket = { id: number; x: number; y: number; r: number };

export const POCKETS: readonly Pocket[] = [
  { id: 0, x: 48_000, y: 48_000, r: 54_000 },
  { id: 1, x: TABLE_W / 2, y: 18_000, r: 48_000 },
  { id: 2, x: TABLE_W - 48_000, y: 48_000, r: 54_000 },
  { id: 3, x: 48_000, y: TABLE_H - 48_000, r: 54_000 },
  { id: 4, x: TABLE_W / 2, y: TABLE_H - 18_000, r: 48_000 },
  { id: 5, x: TABLE_W - 48_000, y: TABLE_H - 48_000, r: 54_000 },
];

export type SimResult = {
  balls: Ball[];
  pocketed: number[];
  pocketOf: Record<number, number>;
  firstContact: number | null;
  railAfterContact: boolean;
  breakRails: number;
  cueScratch: boolean;
  frames: Ball[][];
};

const MIN_DIST = BALL_R * 2;
const MIN_DIST2 = MIN_DIST * MIN_DIST;

/** Bhaskara sine, returned in millionths. BigInt division is exact and engine-stable. */
export function sinMicro(milliDeg: number): number {
  let m = ((milliDeg % 360_000) + 360_000) % 360_000;
  let sign = 1;
  if (m >= 180_000) {
    sign = -1;
    m -= 180_000;
  }
  const span = 180_000 - m;
  const prod = BigInt(m) * BigInt(span);
  const den = 40_500n * 1_000_000n - prod;
  if (den <= 0n) return sign * 1_000_000;
  const micro = (4n * prod * 1_000_000n) / den;
  const n = Number(micro);
  if (n === 0) return 0;
  return sign * (n > 1_000_000 ? 1_000_000 : n);
}

export function cosMicro(milliDeg: number): number {
  return sinMicro(milliDeg + 90_000);
}

export function isqrt(n: number): number {
  if (n <= 0) return 0;
  let x = n;
  let y = Math.floor((x + 1) / 2);
  while (y < x) {
    x = y;
    y = Math.floor((x + Math.floor(n / x)) / 2);
  }
  return x;
}

export function cloneBalls(balls: readonly Ball[]): Ball[] {
  return balls.map((b) => ({ ...b }));
}

function pocketId(b: Ball): number | null {
  for (const p of POCKETS) {
    const dx = b.x - p.x;
    const dy = b.y - p.y;
    if (dx * dx + dy * dy <= p.r * p.r) return p.id;
  }
  return null;
}

function nearPocket(b: Ball): boolean {
  for (const p of POCKETS) {
    const dx = b.x - p.x;
    const dy = b.y - p.y;
    const mouth = p.r + 22_000;
    if (dx * dx + dy * dy <= mouth * mouth) return true;
  }
  return false;
}

function resolvePair(a: Ball, b: Ball, first: { id: number | null }, follow: number): boolean {
  if (a.pocketed || b.pocketed) return false;
  const nx = b.x - a.x;
  const ny = b.y - a.y;
  const dist2 = nx * nx + ny * ny;
  if (dist2 === 0 || dist2 >= MIN_DIST2) return false;
  const dist = isqrt(dist2) || 1;
  const overlap = MIN_DIST - dist;
  const sx = Math.trunc((nx * overlap) / dist / 2);
  const sy = Math.trunc((ny * overlap) / dist / 2);
  a.x -= sx || Math.sign(nx || 1);
  a.y -= sy;
  b.x += sx || Math.sign(nx || 1);
  b.y += sy;
  const rvx = a.vx - b.vx;
  const rvy = a.vy - b.vy;
  const approach = Math.trunc((rvx * nx + rvy * ny) / dist);
  if (approach <= 0) return true;
  if (first.id == null && (a.id === 0 || b.id === 0)) {
    first.id = a.id === 0 ? b.id : a.id;
    if (a.id === 0 && follow !== 0) {
      a.vx += Math.trunc((follow * nx) / dist / 6);
      a.vy += Math.trunc((follow * ny) / dist / 6);
    }
    if (b.id === 0 && follow !== 0) {
      b.vx -= Math.trunc((follow * nx) / dist / 6);
      b.vy -= Math.trunc((follow * ny) / dist / 6);
    }
  }
  const j = Math.trunc((approach * 1920) / 1000 / 2);
  const ix = Math.trunc((j * nx) / dist);
  const iy = Math.trunc((j * ny) / dist);
  a.vx -= ix;
  a.vy -= iy;
  b.vx += ix;
  b.vy += iy;
  return true;
}

function bounce(b: Ball, rails: Set<number>, hitObject: boolean, railAfter: { on: boolean }) {
  if (b.pocketed) return;
  const left = BALL_R;
  const right = TABLE_W - BALL_R;
  const top = BALL_R;
  const bottom = TABLE_H - BALL_R;
  const open = nearPocket(b);
  const speed = isqrt(b.vx * b.vx + b.vy * b.vy);
  const english = Math.trunc((b.spin * speed) / 5000);
  let hit = false;
  if (b.x < left) {
    b.x = left;
    if (!open) {
      b.vx = -Math.trunc((b.vx * 750) / 1000);
      b.vy += english;
      hit = true;
    }
  } else if (b.x > right) {
    b.x = right;
    if (!open) {
      b.vx = -Math.trunc((b.vx * 750) / 1000);
      b.vy -= english;
      hit = true;
    }
  }
  if (b.y < top) {
    b.y = top;
    if (!open) {
      b.vy = -Math.trunc((b.vy * 750) / 1000);
      b.vx += english;
      hit = true;
    }
  } else if (b.y > bottom) {
    b.y = bottom;
    if (!open) {
      b.vy = -Math.trunc((b.vy * 750) / 1000);
      b.vx -= english;
      hit = true;
    }
  }
  if (hit) {
    if (b.id !== 0) rails.add(b.id);
    if (hitObject) railAfter.on = true;
  }
}

/** Per-tick speed lost to cloth. v1 stops a full-power cue before the rack. */
export function rollDrop(speed: number, physics = PHYSICS_VERSION): number {
  if (physics === PHYSICS_V1) return 32 + Math.trunc(speed / 160);
  return 4 + Math.trunc(speed / 900);
}

function damp(b: Ball, physics: string) {
  if (b.pocketed) return;
  const speed = isqrt(b.vx * b.vx + b.vy * b.vy);
  if (speed < 70) {
    b.vx = 0;
    b.vy = 0;
  } else {
    const drop = rollDrop(speed, physics);
    const next = speed - drop;
    if (next <= 0) {
      b.vx = 0;
      b.vy = 0;
    } else {
      b.vx = Math.trunc((b.vx * next) / speed);
      b.vy = Math.trunc((b.vy * next) / speed);
    }
  }
  b.spin = Math.trunc((b.spin * 985) / 1000);
}

export function moving(balls: readonly Ball[]): boolean {
  return balls.some((b) => !b.pocketed && (b.vx !== 0 || b.vy !== 0));
}

/**
 * Run one shot from a placed cue. `record` keeps every fourth tick for animation.
 * The returned balls are at rest.
 */
export function simulate(
  start: readonly Ball[],
  shot: ShotInput,
  record = false,
  physics = PHYSICS_VERSION,
): SimResult {
  const balls = cloneBalls(start);
  const cue = balls.find((b) => b.id === 0);
  if (!cue || cue.pocketed) {
    return {
      balls,
      pocketed: [],
      pocketOf: {},
      firstContact: null,
      railAfterContact: false,
      breakRails: 0,
      cueScratch: false,
      frames: [],
    };
  }
  const power = Math.max(1, Math.min(10_000, shot.power | 0));
  const speed = Math.trunc((power * MAX_SPEED) / 10_000);
  const cos = cosMicro(shot.angleMilli | 0);
  const sin = sinMicro(shot.angleMilli | 0);
  cue.vx = Math.trunc((speed * cos) / 1_000_000);
  cue.vy = Math.trunc((speed * sin) / 1_000_000);
  const side = Math.max(-1000, Math.min(1000, shot.spinX | 0));
  const follow = Math.max(-1000, Math.min(1000, shot.spinY | 0));
  cue.spin = side;
  cue.vx += Math.trunc((-sin * side * speed) / 1_000_000 / 8);
  cue.vy += Math.trunc((cos * side * speed) / 1_000_000 / 8);

  const pocketed: number[] = [];
  const pocketOf: Record<number, number> = {};
  const first = { id: null as number | null };
  const railAfter = { on: false };
  const rails = new Set<number>();
  const frames: Ball[][] = [];
  let cueScratch = false;

  for (let tick = 0; tick < MAX_TICKS; tick++) {
    let any = false;
    for (const b of balls) {
      if (b.pocketed || (b.vx === 0 && b.vy === 0)) continue;
      any = true;
      b.x += b.vx;
      b.y += b.vy;
    }
    if (!any) break;
    for (let n = 0; n < balls.length; n++) {
      for (let m = n + 1; m < balls.length; m++) {
        const a = balls[n];
        const b = balls[m];
        if (!a || !b) continue;
        resolvePair(a, b, first, follow);
      }
    }
    const hitObject = first.id != null;
    for (const b of balls) {
      if (b.pocketed) continue;
      const hole = pocketId(b);
      if (hole != null) {
        b.pocketed = true;
        b.vx = 0;
        b.vy = 0;
        pocketed.push(b.id);
        pocketOf[b.id] = hole;
        if (b.id === 0) cueScratch = true;
        continue;
      }
      bounce(b, rails, hitObject, railAfter);
      damp(b, physics);
    }
    if (record && tick % 4 === 0) frames.push(cloneBalls(balls));
  }
  for (const b of balls) {
    b.vx = 0;
    b.vy = 0;
  }
  return {
    balls,
    pocketed,
    pocketOf,
    firstContact: first.id,
    railAfterContact: railAfter.on,
    breakRails: rails.size,
    cueScratch,
    frames,
  };
}
