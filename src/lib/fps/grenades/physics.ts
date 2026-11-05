import type { Solid } from "../map";
import type { GameMap } from "../maps/types";
import type { Vector } from "../collision";
import { GRENADES, type ThrowKind } from "./rules";

/**
 * Deterministic grenade flight against the map's gameplay collision (never the render meshes).
 *
 * The flight advances in fixed steps of GRENADES.physics.step from the moment the grenade leaves
 * the hand, so a throw's path depends only on its start (origin, velocity) and the map: the
 * server and every client replay the same path at any frame rate. The step uses only + − × ÷ and
 * square roots (exact IEEE operations in every engine); the throw's trigonometry happens once, on
 * the server, and the result is sent as numbers.
 *
 * Collision: the grenade is a small sphere swept against every solid that stops bullets (boxes,
 * walls, structures, the floor) and the movement-only barriers (gorges, undergrowth: grenades
 * stay in the playable space). Each sweep is continuous (the box grown by the radius, ray-tested
 * along the step), so no step can tunnel through a thin wall. A bounce mirrors the velocity off
 * the face and keeps `restitution` of it (CS); on a floor below `restSpeed` it stops.
 */
export type NadeSim = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  /** Fixed steps advanced since the throw (time = n × step). */
  n: number;
  /** Stopped on a floor: nothing moves it again. */
  rest: boolean;
  /** The step it stopped at. */
  restN?: number;
};
export type Impact = {
  /** Seconds since the throw. */
  t: number;
  x: number;
  y: number;
  z: number;
  /** Speed into the surface before the bounce (m/s). */
  speed: number;
  /** Landed on a floor-like face (normal mostly up). */
  floor: boolean;
};

const P = GRENADES.physics;
const STEP = P.step;
const R = P.radius;

type Bounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
};
const solidsCache = new WeakMap<GameMap, Bounds[]>();
/** The map's grenade collision boxes, grown by the grenade's radius. */
function collisionBoxes(map: GameMap): Bounds[] {
  let boxes = solidsCache.get(map);
  if (!boxes) {
    const w = map.arena.width / 2,
      d = map.arena.depth / 2;
    // The arena's edge is a wall of unlimited height for grenades: a lob over a low perimeter
    // wall comes back instead of leaving the world.
    const edge = (x: number, z: number, sx: number, sz: number): Solid => ({
      id: "grenade-edge",
      x,
      y: 99,
      z,
      w: sx,
      h: 202,
      d: sz,
      surface: "concrete",
    });
    const solids: readonly Solid[] = [
      ...map.worldSolids,
      ...map.barriers,
      edge(-w - 0.5, 0, 1, 2 * d + 2),
      edge(w + 0.5, 0, 1, 2 * d + 2),
      edge(0, -d - 0.5, 2 * w + 2, 1),
      edge(0, d + 0.5, 2 * w + 2, 1),
    ];
    boxes = solids.map((b) => ({
      minX: b.x - b.w / 2 - R,
      maxX: b.x + b.w / 2 + R,
      minY: b.y - b.h / 2 - R,
      maxY: b.y + b.h / 2 + R,
      minZ: b.z - b.d / 2 - R,
      maxZ: b.z + b.d / 2 + R,
    }));
    solidsCache.set(map, boxes);
  }
  return boxes;
}

export function simStart(origin: Vector, velocity: Vector): NadeSim {
  return {
    x: origin.x,
    y: origin.y,
    z: origin.z,
    vx: velocity.x,
    vy: velocity.y,
    vz: velocity.z,
    n: 0,
    rest: false,
  };
}

export const stepsAt = (seconds: number) => Math.max(0, Math.floor(seconds / STEP + 1e-9));

// Scratch for the sweep (no allocation per step).
let hitT = 0,
  hitAxis = 0,
  hitSign = 0;
/** Earliest entry of the segment p → p + d into box b in [0, 1]; sets hitT / hitAxis / hitSign.
 * Returns 0 for no hit, 1 for a hit, 2 when p already overlaps b. */
function sweep(
  px: number,
  py: number,
  pz: number,
  dx: number,
  dy: number,
  dz: number,
  b: Bounds,
): 0 | 1 | 2 {
  let enter = -Infinity,
    exit = Infinity,
    axis = -1,
    sign = 0;
  // x
  if (dx > -1e-12 && dx < 1e-12) {
    if (px <= b.minX || px >= b.maxX) return 0;
  } else {
    const a = (b.minX - px) / dx,
      c = (b.maxX - px) / dx;
    const near = a < c ? a : c,
      far = a < c ? c : a;
    if (near > enter) {
      enter = near;
      axis = 0;
      sign = dx > 0 ? -1 : 1;
    }
    if (far < exit) exit = far;
  }
  // y
  if (dy > -1e-12 && dy < 1e-12) {
    if (py <= b.minY || py >= b.maxY) return 0;
  } else {
    const a = (b.minY - py) / dy,
      c = (b.maxY - py) / dy;
    const near = a < c ? a : c,
      far = a < c ? c : a;
    if (near > enter) {
      enter = near;
      axis = 1;
      sign = dy > 0 ? -1 : 1;
    }
    if (far < exit) exit = far;
  }
  // z
  if (dz > -1e-12 && dz < 1e-12) {
    if (pz <= b.minZ || pz >= b.maxZ) return 0;
  } else {
    const a = (b.minZ - pz) / dz,
      c = (b.maxZ - pz) / dz;
    const near = a < c ? a : c,
      far = a < c ? c : a;
    if (near > enter) {
      enter = near;
      axis = 2;
      sign = dz > 0 ? -1 : 1;
    }
    if (far < exit) exit = far;
  }
  if (enter > exit || exit <= 0 || enter > 1) return 0;
  if (enter < 0 || axis < 0) return 2;
  hitT = enter;
  hitAxis = axis;
  hitSign = sign;
  return 1;
}

/** Push p out of an overlapped box along its shallowest face (rare: spawn grazing a corner). */
function pushOut(s: NadeSim, b: Bounds) {
  const options = [
    [s.x - b.minX, 0, -1],
    [b.maxX - s.x, 0, 1],
    [s.y - b.minY, 1, -1],
    [b.maxY - s.y, 1, 1],
    [s.z - b.minZ, 2, -1],
    [b.maxZ - s.z, 2, 1],
  ] as const;
  let best: readonly [number, number, number] = options[0];
  for (const o of options) if (o[0] < best[0]) best = o;
  const [depth, axis, sign] = best;
  const move = (depth + 1e-4) * sign;
  if (axis === 0) {
    s.x += move;
    if (s.vx * sign < 0) s.vx = -s.vx * P.restitution;
  } else if (axis === 1) {
    s.y += move;
    if (s.vy * sign < 0) s.vy = -s.vy * P.restitution;
  } else {
    s.z += move;
    if (s.vz * sign < 0) s.vz = -s.vz * P.restitution;
  }
}

const candidates: Bounds[] = [];
/**
 * Advance `steps` fixed steps. `onImpact` hears every bounce (sounds, the incendiary's floor
 * contact). Returns the simulation (mutated).
 */
export function simAdvance(
  s: NadeSim,
  map: GameMap,
  steps: number,
  onImpact?: (impact: Impact) => void,
): NadeSim {
  if (steps <= 0) return s;
  if (s.rest) {
    s.n += steps;
    return s;
  }
  // Broad phase once for the whole advance: boxes the grenade can reach in this time.
  const duration = steps * STEP;
  const speed = Math.sqrt(s.vx * s.vx + s.vy * s.vy + s.vz * s.vz);
  const reach = speed * duration + 0.5 * P.gravity * duration * duration + 0.05;
  const all = collisionBoxes(map);
  candidates.length = 0;
  for (const b of all)
    if (
      b.maxX > s.x - reach &&
      b.minX < s.x + reach &&
      b.maxY > s.y - reach &&
      b.minY < s.y + reach &&
      b.maxZ > s.z - reach &&
      b.minZ < s.z + reach
    )
      candidates.push(b);
  for (let i = 0; i < steps; i++) {
    if (s.rest) {
      // Steps after resting still count as elapsed time.
      s.n += steps - i;
      break;
    }
    step(s, onImpact);
  }
  return s;
}

function step(s: NadeSim, onImpact?: (impact: Impact) => void) {
  s.n++;
  s.vy -= P.gravity * STEP;
  let remaining = 1;
  for (let iteration = 0; iteration < 4 && remaining > 0; iteration++) {
    const dx = s.vx * STEP * remaining,
      dy = s.vy * STEP * remaining,
      dz = s.vz * STEP * remaining;
    let best = 2,
      axis = -1,
      sign = 0,
      overlap: Bounds | null = null;
    for (const b of candidates) {
      const r = sweep(s.x, s.y, s.z, dx, dy, dz, b);
      if (r === 2) {
        overlap = b;
        break;
      }
      if (r === 1 && hitT < best) {
        best = hitT;
        axis = hitAxis;
        sign = hitSign;
      }
    }
    if (overlap) {
      pushOut(s, overlap);
      continue;
    }
    if (axis < 0) {
      s.x += dx;
      s.y += dy;
      s.z += dz;
      return;
    }
    // Move to just before the contact, then bounce off the face.
    const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const t = length > 0 ? Math.max(0, best - 1e-4 / length) : 0;
    s.x += dx * t;
    s.y += dy * t;
    s.z += dz * t;
    remaining *= 1 - t;
    let into: number;
    if (axis === 0) {
      into = -s.vx * sign;
      s.vx = -s.vx;
    } else if (axis === 1) {
      into = -s.vy * sign;
      s.vy = -s.vy;
    } else {
      into = -s.vz * sign;
      s.vz = -s.vz;
    }
    s.vx *= P.restitution;
    s.vy *= P.restitution;
    s.vz *= P.restitution;
    const floor = axis === 1 && sign > 0;
    onImpact?.({ t: s.n * STEP, x: s.x, y: s.y, z: s.z, speed: into, floor });
    if (floor && s.vx * s.vx + s.vy * s.vy + s.vz * s.vz < P.restSpeed * P.restSpeed) {
      s.vx = s.vy = s.vz = 0;
      s.rest = true;
      s.restN = s.n;
      return;
    }
  }
}

/** Advance to `seconds` after the throw (whole steps). */
export function simTo(
  s: NadeSim,
  map: GameMap,
  seconds: number,
  onImpact?: (impact: Impact) => void,
): NadeSim {
  return simAdvance(s, map, stepsAt(seconds) - s.n, onImpact);
}

/**
 * The throw: where the grenade leaves and how fast (CS's formula, in metres). The aim is biased
 * 10° upward at the horizon (none straight up or down), aiming down throws softer, the kind sets
 * the strength (0.3 / 0.65 / 1 of the full speed) and the thrower's own velocity (running,
 * jumping) is added. The origin is traced from the eye so it never starts inside a wall.
 */
export function throwStart(
  eye: Vector,
  yaw: number,
  pitch: number,
  playerVelocity: Vector,
  kind: ThrowKind,
  map: GameMap,
): { origin: Vector; velocity: Vector } {
  const deg = 180 / Math.PI;
  // CS's pitch is positive down; this game's is positive up.
  const down = -pitch * deg;
  const biased = down < 90 ? -10 + down * (100 / 90) : down;
  const speed =
    Math.min(P.maxSpeed, ((90 - biased) * 6 * P.maxSpeed) / 750) *
    (GRENADES.strength[kind] * 0.7 + 0.3);
  const up = -biased / deg;
  const dir = {
    x: -Math.sin(yaw) * Math.cos(up),
    y: Math.sin(up),
    z: -Math.cos(yaw) * Math.cos(up),
  };
  const aim = {
    x: -Math.sin(yaw) * Math.cos(pitch),
    y: Math.sin(pitch),
    z: -Math.cos(yaw) * Math.cos(pitch),
  };
  // Leave spawnAhead in front of the eye, or just short of a wall that is closer.
  let ahead: number = P.spawnAhead;
  for (const b of collisionBoxes(map)) {
    const r = sweep(eye.x, eye.y, eye.z, aim.x * ahead, aim.y * ahead, aim.z * ahead, b);
    if (r === 1) ahead = Math.max(0, ahead * hitT - 0.02);
  }
  return {
    origin: {
      x: eye.x + aim.x * ahead,
      y: eye.y + aim.y * ahead,
      z: eye.z + aim.z * ahead,
    },
    velocity: {
      x: dir.x * speed + playerVelocity.x * P.inherit,
      y: dir.y * speed + playerVelocity.y * P.inherit,
      z: dir.z * speed + playerVelocity.z * P.inherit,
    },
  };
}
