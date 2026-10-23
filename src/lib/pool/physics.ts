/**
 * Integer micrometre pool physics. A new rack stores pool-phys-v3.
 * pool-phys-v1 and pool-phys-v2 stay so a match already stamped with them
 * replays under the drag it started with.
 *
 * Table: 2.54 m by 1.27 m. Ball diameter 57.15 mm. One tick is 1/240 s.
 * v1 and v2 stay under half a radius per tick. A v3 full smash is 28_000,
 * still under one radius, so two balls closing cannot step through each other.
 */

/** v1 dies before the rack. v2 reaches it. v3 keeps that path under 60% power and lets a full smash run. */
export const PHYSICS_V1 = "pool-phys-v1";
export const PHYSICS_V2 = "pool-phys-v2";
export const PHYSICS_V3 = "pool-phys-v3";
export const PHYSICS_VERSION = PHYSICS_V3;

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

/** Ball centre sits in a pocket mouth, where the cushion does not bounce. */
export function cushionOpen(x: number, y: number): boolean {
  for (const p of POCKETS) {
    const dx = x - p.x;
    const dy = y - p.y;
    const mouth = p.r + 22_000;
    if (dx * dx + dy * dy <= mouth * mouth) return true;
  }
  return false;
}

function nearPocket(b: Ball): boolean {
  return cushionOpen(b.x, b.y);
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

/**
 * Per-tick speed lost to cloth.
 * v1 stops a full-power cue before the rack.
 * v3 trims the constant drag so a ball that leaves the rack still reaches a cushion.
 */
export function rollDrop(speed: number, physics = PHYSICS_VERSION): number {
  if (physics === PHYSICS_V1) return 32 + Math.trunc(speed / 160);
  if (physics === PHYSICS_V3) return 2 + Math.trunc(speed / 1_500);
  return 4 + Math.trunc(speed / 900);
}

/**
 * Micrometres per tick. v1 and v2 stay linear up to 14_000.
 * v3 matches them through 60% power, then adds break speed. Full power is 28_000,
 * under one ball radius per tick so one ball cannot step through another.
 */
export function launchSpeed(power: number, physics = PHYSICS_VERSION): number {
  const clamped = Math.max(1, Math.min(10_000, power | 0));
  const base = Math.trunc((clamped * MAX_SPEED) / 10_000);
  if (physics !== PHYSICS_V3 || clamped <= 6_000) return base;
  return base + Math.trunc(((clamped - 6_000) * 14_000) / 4_000);
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

/** Same launch `simulate` applies. Returns follow so the contact impulse can use it. */
function launchCue(cue: Ball, shot: ShotInput, physics: string): number {
  const power = Math.max(1, Math.min(10_000, shot.power | 0));
  const speed = launchSpeed(power, physics);
  const cos = cosMicro(shot.angleMilli | 0);
  const sin = sinMicro(shot.angleMilli | 0);
  cue.vx = Math.trunc((speed * cos) / 1_000_000);
  cue.vy = Math.trunc((speed * sin) / 1_000_000);
  const side = Math.max(-1000, Math.min(1000, shot.spinX | 0));
  const follow = Math.max(-1000, Math.min(1000, shot.spinY | 0));
  cue.spin = side;
  cue.vx += Math.trunc((-sin * side * speed) / 1_000_000 / 8);
  cue.vy += Math.trunc((cos * side * speed) / 1_000_000 / 8);
  return follow;
}

function advance(
  balls: Ball[],
  first: { id: number | null },
  follow: number,
  pocketed: number[],
  pocketOf: Record<number, number>,
  rails: Set<number>,
  railAfter: { on: boolean },
  physics: string,
): { moving: boolean; scratched: boolean } {
  let any = false;
  for (const b of balls) {
    if (b.pocketed || (b.vx === 0 && b.vy === 0)) continue;
    any = true;
    b.x += b.vx;
    b.y += b.vy;
  }
  if (!any) return { moving: false, scratched: false };
  for (let n = 0; n < balls.length; n++) {
    for (let m = n + 1; m < balls.length; m++) {
      const a = balls[n];
      const b = balls[m];
      if (!a || !b) continue;
      resolvePair(a, b, first, follow);
    }
  }
  const hitObject = first.id != null;
  let scratched = false;
  for (const b of balls) {
    if (b.pocketed) continue;
    const hole = pocketId(b);
    if (hole != null) {
      b.pocketed = true;
      b.vx = 0;
      b.vy = 0;
      pocketed.push(b.id);
      pocketOf[b.id] = hole;
      if (b.id === 0) scratched = true;
      continue;
    }
    bounce(b, rails, hitObject, railAfter);
    damp(b, physics);
  }
  return { moving: true, scratched };
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
  const follow = launchCue(cue, shot, physics);
  const pocketed: number[] = [];
  const pocketOf: Record<number, number> = {};
  const first = { id: null as number | null };
  const railAfter = { on: false };
  const rails = new Set<number>();
  const frames: Ball[][] = [];
  let cueScratch = false;

  for (let tick = 0; tick < MAX_TICKS; tick++) {
    const step = advance(balls, first, follow, pocketed, pocketOf, rails, railAfter, physics);
    if (!step.moving) break;
    if (step.scratched) cueScratch = true;
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

export type AimPoint = { x: number; y: number };

/** Read-only aim guide. It steps the same `advance` as `simulate` and changes no stored shot. */
export type AimTrace = {
  from: AimPoint;
  launch: { vx: number; vy: number };
  dir: AimPoint;
  contact: {
    id: number;
    cue: AimPoint;
    object: AimPoint;
    ovx: number;
    ovy: number;
  } | null;
  cueStop: AimPoint;
  cueBank: { at: AimPoint; dir: AimPoint } | null;
  cuePocketed: boolean;
  objectStop: AimPoint | null;
  objectBank: { at: AimPoint; dir: AimPoint } | null;
};

function unitVelocity(vx: number, vy: number): AimPoint {
  const mag = Math.hypot(vx, vy);
  if (mag < 1e-9) return { x: 1, y: 0 };
  return { x: vx / mag, y: vy / mag };
}

function railBounce(
  before: { vx: number; vy: number },
  after: { vx: number; vy: number; x: number; y: number; pocketed: boolean },
): boolean {
  if (after.pocketed) return false;
  const flipX = before.vx !== 0 && after.vx !== 0 && Math.sign(before.vx) !== Math.sign(after.vx);
  const flipY = before.vy !== 0 && after.vy !== 0 && Math.sign(before.vy) !== Math.sign(after.vy);
  if (!flipX && !flipY) return false;
  const onX = after.x <= BALL_R + 4 || after.x >= TABLE_W - BALL_R - 4;
  const onY = after.y <= BALL_R + 4 || after.y >= TABLE_H - BALL_R - 4;
  return (flipX && onX) || (flipY && onY);
}

const TRACE_TICKS = 1_200;

/**
 * First ball or first cushion along the shot the server will run.
 * Side english is in the launch. Follow is applied at contact by `resolvePair`.
 * Stops at one cushion. A pocket mouth is not drawn as a bank.
 */
export function traceAim(
  start: readonly Ball[],
  shot: ShotInput,
  physics = PHYSICS_VERSION,
): AimTrace | null {
  const balls = cloneBalls(start);
  const cue = balls.find((b) => b.id === 0);
  if (!cue || cue.pocketed) return null;
  const from = { x: cue.x, y: cue.y };
  const follow = launchCue(cue, shot, physics);
  const launch = { vx: cue.vx, vy: cue.vy };
  const pocketed: number[] = [];
  const pocketOf: Record<number, number> = {};
  const first = { id: null as number | null };
  const railAfter = { on: false };
  const rails = new Set<number>();
  const prev = {
    x: new Array<number>(16).fill(0),
    y: new Array<number>(16).fill(0),
    vx: new Array<number>(16).fill(0),
    vy: new Array<number>(16).fill(0),
  };

  let contact: AimTrace["contact"] = null;
  let cueStop: AimPoint = from;
  let cueBank: AimTrace["cueBank"] = null;
  let cuePocketed = false;
  let objectStop: AimPoint | null = null;
  let objectBank: AimTrace["objectBank"] = null;
  let objectFromX = 0;
  let objectFromY = 0;

  for (let tick = 0; tick < TRACE_TICKS; tick++) {
    for (const b of balls) {
      prev.x[b.id] = b.x;
      prev.y[b.id] = b.y;
      prev.vx[b.id] = b.vx;
      prev.vy[b.id] = b.vy;
    }
    const beforeId = first.id;
    const step = advance(balls, first, follow, pocketed, pocketOf, rails, railAfter, physics);
    if (!step.moving) {
      cueStop = { x: cue.x, y: cue.y };
      break;
    }
    if (contact == null && first.id != null && beforeId == null) {
      const obj = balls.find((b) => b.id === first.id);
      if (obj) {
        contact = {
          id: obj.id,
          cue: { x: cue.x, y: cue.y },
          object: { x: obj.x, y: obj.y },
          ovx: obj.vx,
          ovy: obj.vy,
        };
        objectFromX = obj.x;
        objectFromY = obj.y;
        cueStop = { x: cue.x, y: cue.y };
      }
    }
    const hit = contact;
    if (hit == null) {
      if (cue.pocketed) {
        cuePocketed = true;
        cueStop = { x: cue.x, y: cue.y };
        break;
      }
      if (railBounce({ vx: prev.vx[0] ?? 0, vy: prev.vy[0] ?? 0 }, cue)) {
        cueStop = { x: cue.x, y: cue.y };
        cueBank = cushionOpen(cue.x, cue.y)
          ? null
          : { at: cueStop, dir: unitVelocity(cue.vx, cue.vy) };
        break;
      }
      cueStop = { x: cue.x, y: cue.y };
      continue;
    }
    const obj = balls.find((b) => b.id === hit.id);
    if (!obj) break;
    if (obj.pocketed || (obj.vx === 0 && obj.vy === 0)) {
      objectStop = { x: obj.x, y: obj.y };
      break;
    }
    const before = { vx: prev.vx[obj.id] ?? 0, vy: prev.vy[obj.id] ?? 0 };
    if (railBounce(before, obj)) {
      objectStop = { x: obj.x, y: obj.y };
      objectBank = cushionOpen(obj.x, obj.y)
        ? null
        : { at: objectStop, dir: unitVelocity(obj.vx, obj.vy) };
      break;
    }
    let woke = false;
    for (const b of balls) {
      if (b.id === 0 || b.id === obj.id) continue;
      const wasStill = (prev.vx[b.id] ?? 0) === 0 && (prev.vy[b.id] ?? 0) === 0;
      if (wasStill && (b.vx !== 0 || b.vy !== 0)) woke = true;
    }
    objectStop = { x: obj.x, y: obj.y };
    if (woke) break;
    if (Math.hypot(obj.x - objectFromX, obj.y - objectFromY) > TABLE_W * 0.5) break;
  }

  return {
    from,
    launch,
    dir: unitVelocity(launch.vx, launch.vy),
    contact,
    cueStop,
    cueBank,
    cuePocketed,
    objectStop,
    objectBank,
  };
}
