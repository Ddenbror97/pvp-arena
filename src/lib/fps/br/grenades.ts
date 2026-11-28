import { eyeHeight } from "../map";
import { GRENADES, type ThrowKind } from "../grenades/rules";
import { S_NORMALS, S_PLANES, S_Y0, S_Y1 } from "./slants";
import type { StaticWorld } from "./static-world";

/**
 * The 1v1/5v5 grenades on Project Island (owner, 2026-11-03: "add our 3 granades to the loot
 * system"). Same rules as the arenas (grenades/rules.ts: CS's throw formula, the 1/128 s fixed
 * step, gravity, restitution, fuses, HE damage and falloff, smoke and fire timings), flown
 * against the island's own collision: the terrain (bouncing off its slope) and the world boxes.
 * Deterministic: the server and every client fly the same throw from the same start, so only
 * the start is sent. Shared module (no three.js).
 */
const P = GRENADES.physics;
const STEP = P.step;
const R = P.radius;

export type BrNadeSim = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  n: number;
  rest: boolean;
};
export type BrNadeImpact = { t: number; x: number; y: number; z: number; floor: boolean };

export const nadeSteps = (seconds: number) => Math.max(0, Math.floor(seconds / STEP + 1e-9));

/** CS's throw (grenades/physics.ts throwStart), its origin traced against the island. */
export function brThrowStart(
  eye: { x: number; y: number; z: number },
  yaw: number,
  pitch: number,
  kind: ThrowKind,
  world: StaticWorld,
  /** Explosive Expert: the throw's range scale (speed by its square root). */
  range = 1,
) {
  const deg = 180 / Math.PI;
  const down = -pitch * deg;
  const biased = down < 90 ? -10 + down * (100 / 90) : down;
  const speed =
    Math.min(P.maxSpeed, ((90 - biased) * 6 * P.maxSpeed) / 750) *
    (GRENADES.strength[kind] * 0.7 + 0.3) *
    Math.sqrt(range);
  const up = -biased / deg;
  const aim = {
    x: -Math.sin(yaw) * Math.cos(pitch),
    y: Math.sin(pitch),
    z: -Math.cos(yaw) * Math.cos(pitch),
  };
  const hit = world.raycast(eye.x, eye.y, eye.z, aim.x, aim.y, aim.z, P.spawnAhead);
  const ahead = hit ? Math.max(0, hit.distance - 0.05) : P.spawnAhead;
  const r3 = (v: number) => Math.round(v * 1000) / 1000;
  return {
    origin: {
      x: r3(eye.x + aim.x * ahead),
      y: r3(eye.y + aim.y * ahead),
      z: r3(eye.z + aim.z * ahead),
    },
    velocity: {
      x: r3(-Math.sin(yaw) * Math.cos(up) * speed),
      y: r3(Math.sin(up) * speed),
      z: r3(-Math.cos(yaw) * Math.cos(up) * speed),
    },
  };
}

export const brNadeStart = (
  o: { x: number; y: number; z: number },
  v: { x: number; y: number; z: number },
): BrNadeSim => ({ x: o.x, y: o.y, z: o.z, vx: v.x, vy: v.y, vz: v.z, n: 0, rest: false });

/** Entry time of the segment into box b grown by R, or −1. Sets the face for the bounce. */
let face = 0;

/**
 * As sweepBox for a slanted wall (slants.ts: the prism grown by R): the step's fraction where the
 * ball meets it, or -1. `face` is 3 and `slantFace` the plane (0–3 a side, 4 under, 5 top).
 */
let slantFace = 0;
function sweepSlant(
  px: number,
  py: number,
  pz: number,
  dx: number,
  dy: number,
  dz: number,
  s: Float64Array,
  o: number,
) {
  let enter = -Infinity,
    exit = Infinity,
    by = -1;
  if (Math.abs(dy) < 1e-12) {
    if (py <= s[o + S_Y0]! - R || py >= s[o + S_Y1]! + R) return -1;
  } else {
    const a = (s[o + S_Y0]! - R - py) / dy,
      c = (s[o + S_Y1]! + R - py) / dy;
    enter = Math.min(a, c);
    by = dy > 0 ? 4 : 5;
    exit = Math.max(a, c);
  }
  for (let k = 0; k < 4; k++) {
    const nx = s[o + S_NORMALS + k * 2]!,
      nz = s[o + S_NORMALS + k * 2 + 1]!;
    const den = nx * dx + nz * dz,
      num = s[o + S_PLANES + k]! + R - (nx * px + nz * pz);
    if (Math.abs(den) < 1e-12) {
      if (num <= 0) return -1;
      continue;
    }
    const t = num / den;
    if (den < 0) {
      if (t > enter) {
        enter = t;
        by = k;
      }
    } else if (t < exit) exit = t;
  }
  if (enter > exit || exit <= 0 || enter > 1 || enter < 0 || by < 0) return -1;
  face = 3;
  slantFace = by;
  return enter;
}
function sweepBox(
  px: number,
  py: number,
  pz: number,
  dx: number,
  dy: number,
  dz: number,
  b: StaticWorld["boxes"],
  o: number,
) {
  let enter = -Infinity,
    exit = Infinity,
    axis = -1;
  const lo = [b.get(o) - R, b.get(o + 1) - R, b.get(o + 2) - R],
    hi = [b.get(o + 3) + R, b.get(o + 4) + R, b.get(o + 5) + R];
  const p = [px, py, pz],
    d = [dx, dy, dz];
  for (let k = 0; k < 3; k++) {
    if (Math.abs(d[k]!) < 1e-12) {
      if (p[k]! <= lo[k]! || p[k]! >= hi[k]!) return -1;
      continue;
    }
    const a = (lo[k]! - p[k]!) / d[k]!,
      c = (hi[k]! - p[k]!) / d[k]!;
    const near = Math.min(a, c),
      far = Math.max(a, c);
    if (near > enter) {
      enter = near;
      axis = k;
    }
    if (far < exit) exit = far;
  }
  if (enter > exit || exit <= 0 || enter > 1 || enter < 0 || axis < 0) return -1;
  face = axis;
  return enter;
}

/**
 * Advance whole fixed steps; `onImpact` hears bounces (sounds, the incendiary's floor), `onMove`
 * every step's path (from, unit direction, length: the glass it crosses breaks, match.ts).
 */
export function brNadeAdvance(
  s: BrNadeSim,
  world: StaticWorld,
  steps: number,
  onImpact?: (i: BrNadeImpact) => void,
  onMove?: (x: number, y: number, z: number, dx: number, dy: number, dz: number, l: number) => void,
) {
  for (let i = 0; i < steps; i++) {
    s.n++;
    if (s.rest) continue;
    const x0 = s.x,
      y0 = s.y,
      z0 = s.z;
    const moved = () => {
      if (!onMove) return;
      const ex = s.x - x0,
        ey = s.y - y0,
        ez = s.z - z0;
      const l = Math.hypot(ex, ey, ez);
      if (l > 1e-6) onMove(x0, y0, z0, ex / l, ey / l, ez / l, l);
    };
    s.vy -= P.gravity * STEP;
    const dx = s.vx * STEP,
      dy = s.vy * STEP,
      dz = s.vz * STEP;
    // Boxes: the earliest face this step crosses.
    let best = 2,
      axis = -1,
      side = 0;
    const b = world.boxes;
    const x0b = Math.min(s.x, s.x + dx) - R,
      z0b = Math.min(s.z, s.z + dz) - R,
      x1b = Math.max(s.x, s.x + dx) + R,
      z1b = Math.max(s.z, s.z + dz) + R;
    world.forEachBox(x0b, z0b, x1b, z1b, (bi) => {
      // (A slanted wall's staircase: the wall itself is swept below.)
      if (world.isSlantBox(bi)) return;
      const t = sweepBox(s.x, s.y, s.z, dx, dy, dz, b, bi * 6);
      if (t >= 0 && t < best) {
        best = t;
        axis = face;
      }
    });
    let wall = 0;
    world.forEachSlant(x0b, z0b, x1b, z1b, (o) => {
      const t = sweepSlant(s.x, s.y, s.z, dx, dy, dz, world.slants, o);
      if (t >= 0 && t < best) {
        best = t;
        axis = slantFace >= 4 ? 1 : 3;
        side = slantFace;
        wall = o;
      }
    });
    if (axis >= 0) {
      const t = Math.max(0, best - 1e-4);
      s.x += dx * t;
      s.y += dy * t;
      s.z += dz * t;
      const into = axis === 0 ? s.vx : axis === 1 ? s.vy : s.vz;
      if (axis === 3) {
        // Off a slanted wall's face: mirrored in its normal.
        const nx = world.slants[wall + S_NORMALS + side * 2]!,
          nz = world.slants[wall + S_NORMALS + side * 2 + 1]!;
        const vn = s.vx * nx + s.vz * nz;
        s.vx -= 2 * vn * nx;
        s.vz -= 2 * vn * nz;
      } else if (axis === 0) s.vx = -s.vx;
      else if (axis === 1) s.vy = -s.vy;
      else s.vz = -s.vz;
      s.vx *= P.restitution;
      s.vy *= P.restitution;
      s.vz *= P.restitution;
      const floor = axis === 1 && into < 0;
      moved();
      onImpact?.({ t: s.n * STEP, x: s.x, y: s.y, z: s.z, floor });
      if (floor && Math.hypot(s.vx, s.vy, s.vz) < P.restSpeed) {
        s.vx = s.vy = s.vz = 0;
        s.rest = true;
      }
      continue;
    }
    s.x += dx;
    s.y += dy;
    s.z += dz;
    moved();
    // Terrain: bounce off the slope's normal (central differences of the heightfield).
    const h = world.hf.heightAt(s.x, s.z);
    if (s.y - R < h) {
      const e = 0.5;
      const nx = world.hf.heightAt(s.x - e, s.z) - world.hf.heightAt(s.x + e, s.z),
        nz = world.hf.heightAt(s.x, s.z - e) - world.hf.heightAt(s.x, s.z + e),
        ny = 2 * e;
      const len = Math.hypot(nx, ny, nz);
      const ux = nx / len,
        uy = ny / len,
        uz = nz / len;
      s.y = h + R;
      const vn = s.vx * ux + s.vy * uy + s.vz * uz;
      if (vn < 0) {
        s.vx = (s.vx - 2 * vn * ux) * P.restitution;
        s.vy = (s.vy - 2 * vn * uy) * P.restitution;
        s.vz = (s.vz - 2 * vn * uz) * P.restitution;
      }
      const floor = uy > 0.7;
      onImpact?.({ t: s.n * STEP, x: s.x, y: s.y, z: s.z, floor });
      if (floor && Math.hypot(s.vx, s.vy, s.vz) < P.restSpeed) {
        s.vx = s.vy = s.vz = 0;
        s.rest = true;
      }
    }
  }
  return s;
}

/**
 * HE damage to a player (feet at `target`) before armour: the arenas' falloff, scaled by how
 * much of the body the blast can see (three sample heights traced against the island).
 */
export function brHeDamage(
  center: { x: number; y: number; z: number },
  target: { x: number; y: number; z: number; crouched?: boolean },
  world: StaticWorld,
) {
  const HE = GRENADES.he;
  const eye = eyeHeight(target);
  const chest = { x: target.x, y: target.y + eye - 0.55, z: target.z };
  const d = Math.hypot(chest.x - center.x, chest.y - center.y, chest.z - center.z);
  if (d >= HE.radius) return 0;
  let exposed = 0;
  for (const [height, share] of [
    [0.2, 0.25],
    [eye - 0.55, 0.5],
    [eye, 0.25],
  ] as const) {
    const px = target.x - center.x,
      py = target.y + height - center.y,
      pz = target.z - center.z;
    const dist = Math.hypot(px, py, pz);
    const hit = world.raycast(center.x, center.y, center.z, px, py, pz, dist);
    if (!hit || hit.distance >= dist - 0.05) exposed += share;
  }
  return HE.damage * Math.pow(1 - d / HE.radius, HE.falloff) * exposed;
}
