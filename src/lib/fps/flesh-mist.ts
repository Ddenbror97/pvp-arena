import type { Vector } from "./collision";

/**
 * A hit on a body: the blood mist (owner, 2026-11-27: "a larger red mist/splash particle
 * effect when a shot successfully hits another character … as realistic blood mist/cloud as
 * possible", with a Warzone still as the reference: a ragged orange-red cloud from the head
 * to the waist, deep red where it is dense, torn at its edges).
 *
 * What makes it a cloud and not a red disc:
 *  - the pictures: four sprites computed once (`mistAtlas`), two billows, a splash thrown out
 *    in spokes and a streaked wisp. Each has a density (how much is there) and a shade (deep
 *    in the folds, bright where it is thin and lit), from layered noise bent by more noise,
 *    so no edge is round;
 *  - every particle is one of them, turned to its own angle and turning slowly;
 *  - it wears away instead of fading: over a particle's life the density it needs to show
 *    rises, so the thin parts go first and the cloud tears into strands before it is gone
 *    (the shader in impacts.ts);
 *  - the burst is built from unlike parts (`fleshBurst`): a splash at the wound, two wide thin
 *    veils, six dense billows (three back out of the wound toward the shooter, three carried
 *    on through the body), and drops.
 *
 * This file is the effect's data and arithmetic (no renderer: the tests run it in Node);
 * impacts.ts draws it from the pool its debris uses, the same in 1v1, 5v5 and the royale.
 */

/** A confirmed hit on a body (the server's record: where, and the way the bullet was going). */
export type FleshHit = {
  point: Vector;
  direction: Vector;
  zone?: string;
  /** One of several pellets landing together (the first carries the cloud). */
  light?: boolean;
};

/** Particles one hit on a body takes from the pool (a following pellet: FLESH_LIGHT). */
export const FLESH_PARTICLES = 21,
  FLESH_LIGHT = 4;
/** A burst is gone by now (ms): the longest life in `fleshBurst`. */
export const FLESH_MS = 780;
/** The dense part of the cloud is gone by now (ms): it hides the target no longer. */
export const FLESH_DENSE_MS = 260;

/** The atlas's pictures (2 × 2). */
export const MIST = { billowA: 0, billowB: 1, splash: 2, wisp: 3 } as const;
/** The atlas's side in pixels (each picture a quarter of it). */
export const MIST_ATLAS = 320;

/** sRGB bytes as the linear values the particles' colours are (the renderer's working space). */
const linear = (r: number, g: number, b: number) =>
  [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
/** Blood, as the reference has it: orange-red where thin and lit, deep red in the folds. */
export const BLOOD = {
  splash: linear(234, 66, 16),
  bright: linear(228, 60, 14),
  mid: linear(194, 34, 10),
  deep: linear(138, 12, 8),
};

// ---- the pictures

/** Smooth noise on a lattice (0–1), the same every time. */
export function lattice(seed: number) {
  const at = (x: number, y: number) => {
    let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + seed) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  return (x: number, y: number) => {
    const xi = Math.floor(x),
      yi = Math.floor(y),
      fx = x - xi,
      fy = y - yi;
    const u = fx * fx * (3 - 2 * fx),
      v = fy * fy * (3 - 2 * fy);
    const a = at(xi, yi),
      b = at(xi + 1, yi),
      c = at(xi, yi + 1),
      d = at(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}
/** Layered noise (0–1): `octaves` of it, each twice as fine and half as strong. */
export function layered(
  noise: (x: number, y: number) => number,
  x: number,
  y: number,
  octaves: number,
) {
  let sum = 0,
    amp = 0.5,
    total = 0;
  for (let i = 0; i < octaves; i++) {
    sum += noise(x, y) * amp;
    total += amp;
    x = x * 2.03 + 17.1;
    y = y * 2.03 + 9.7;
    amp *= 0.5;
  }
  return sum / total;
}
export const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

let atlas: Uint8Array | null = null;
/**
 * The four pictures, RGBA bytes (MIST_ATLAS square, row-major, 2 × 2): R the density, G the
 * shade, B and A unused (255). Computed once and kept (about 20 ms). Every picture is empty
 * at its rim, so a sprite turned to any angle shows no edge of its square.
 */
export function mistAtlas(): Uint8Array {
  if (atlas) return atlas;
  const S = MIST_ATLAS,
    C = S / 2;
  const data = new Uint8Array(S * S * 4);
  for (let cell = 0; cell < 4; cell++) {
    const n1 = lattice(1013 + cell * 7919),
      n2 = lattice(5021 + cell * 104729);
    const ox = (cell % 2) * C,
      oy = Math.floor(cell / 2) * C;
    for (let py = 0; py < C; py++)
      for (let px = 0; px < C; px++) {
        // The picture's own square, −1 … 1.
        let x = ((px + 0.5) / C) * 2 - 1,
          y = ((py + 0.5) / C) * 2 - 1;
        const r0 = Math.hypot(x, y);
        // Bent by noise before anything is measured: no outline follows a circle.
        const wx = layered(n2, x * 1.6 + 3.1, y * 1.6 + 1.7, 3) - 0.5,
          wy = layered(n2, x * 1.6 + 8.3, y * 1.6 + 5.9, 3) - 0.5;
        let density: number, shade: number;
        if (cell === MIST.splash) {
          // Spray thrown out from the middle: many thin rays of unequal length, broken into
          // beads along their length, round a small dense middle.
          const a = Math.atan2(y, x),
            r = r0 + wx * 0.1;
          const ca = Math.cos(a),
            sa = Math.sin(a);
          const long = layered(n1, ca * 1.9 + 4, sa * 1.9 + 4, 2),
            ray = layered(n1, ca * 24 + 30, sa * 24 + 30, 2),
            reach = 0.2 + 0.72 * smooth(0.3, 0.72, long) * smooth(0.4, 0.68, ray);
          // (Beads: the rays are strings of drops, not sticks.)
          const beads = layered(n2, x * 11 + 2, y * 11 + 6, 2);
          density =
            (1 - smooth(reach * 0.2, reach, r)) *
              smooth(0.46, 0.66, ray) *
              smooth(0.36, 0.7, beads) *
              0.9 +
            (1 - smooth(0.02, 0.26, r)) * 0.7;
          shade = 0.5 + 0.5 * (1 - smooth(0, 0.5, r)) - 0.2 * beads;
        } else {
          // (The second billow is wider than tall; the wisp is drawn out along a slant.)
          if (cell === MIST.billowB) x *= 0.78;
          if (cell === MIST.wisp) {
            const sx = x * 0.8 + y * 0.6,
              sy = -x * 0.6 + y * 0.8;
            x = sx * 0.62;
            y = sy * 1.25;
          }
          const bx = x + wx * 0.8,
            by = y + wy * 0.8,
            r = Math.hypot(bx, by);
          // Thick in the middle and thinning all the way out (no flat top: the cloud has
          // depth everywhere), broken by the billows and by a finer grain at the edges.
          const body = 1 - smooth(0.02, 0.9, r),
            billow = layered(n1, bx * 2.6 + 11, by * 2.6 + 7, 5),
            grain = layered(n2, bx * 7.5 + 40, by * 7.5 + 21, 2);
          if (cell === MIST.wisp) {
            // Strands: only the ridges of the noise carry anything.
            const ridge = 1 - Math.abs(layered(n1, bx * 3.2 + 2, by * 1.3 + 9, 4) * 2 - 1);
            density = body ** 0.8 * smooth(0.5, 0.92, ridge) * (0.45 + 0.75 * billow);
          } else
            density =
              body ** 1.15 * (0.2 + 1.15 * smooth(0.28, 0.78, billow)) * (0.72 + 0.5 * grain);
          // Deep in the folds and the thick middle, bright where it is thin.
          const fold = layered(n2, bx * 3.6 + 5, by * 3.6 + 13, 4);
          shade = 0.1 + 1.15 * smooth(0.25, 0.75, fold) - 0.35 * body * body + 0.15 * (1 - body);
        }
        // Nothing at the rim.
        density *= 1 - smooth(0.8, 0.97, r0);
        const o = ((oy + py) * S + ox + px) * 4;
        data[o] = Math.round(Math.min(1, Math.max(0, density)) * 255);
        data[o + 1] = Math.round(Math.min(1, Math.max(0, shade)) * 255);
        data[o + 2] = 255;
        data[o + 3] = 255;
      }
  }
  return (atlas = data);
}

// ---- the burst

export type FleshParticle = {
  /** Offset from the hit (m) and velocity (m/s). */
  o: [number, number, number];
  v: [number, number, number];
  color: readonly number[];
  life: number;
  /** 1 is about 0.73 m across on screen (the points' unit, see impacts.ts). */
  size: number;
  alpha: number;
  drag: number;
  fall: number;
  /**
   * Mist (`cell` > 0): how much larger it ends than it began (it swells fast, then slowly).
   * Drops: growth a second.
   */
  grow: number;
  /** Which picture + 1 (MIST), or 0 for a round drop (the debris' sprite). */
  cell: number;
  /** The picture's angle at the start (radians); it turns a little over its life. */
  turn: number;
  /** Never drawn smaller than this many pixels of a 800-line screen (a far hit still reads). */
  minPx: number;
  /**
   * Metres toward the eye its depth is taken (its place on screen is not moved): the wound is
   * on the body's skin, so a cloud round it would otherwise be half inside the body.
   */
  pull: number;
};

/**
 * The particles of one hit on a body, written into `out` from its start; returns how many
 * (`out` is reused and never shrunk: nothing is allocated per hit once it has grown). Pure, so
 * the games and the tests share it: `random` is the only source of variation.
 *
 *  - the splash: thrown out of the wound in spokes, gone in 0.2 s (the hit registers at once);
 *  - two veils: wide, thin, slow, the last to go (the haze the cloud leaves);
 *  - six billows: dense, each a different picture and angle; three back out of the wound
 *    toward the shooter (what the shooter sees) and three carried on through the body with
 *    the bullet (what is seen from behind and the side). Together a ragged cloud from the
 *    head to the waist, densest for a quarter of a second, then torn apart;
 *  - twelve drops, eight thrown on in a cone and four back, falling.
 * A headshot's is a quarter larger, a leg's a little smaller.
 */
export function fleshBurst(hit: FleshHit, random: () => number, out: FleshParticle[]): number {
  let dx = hit.direction.x,
    dy = hit.direction.y,
    dz = hit.direction.z;
  const len = Math.hypot(dx, dy, dz);
  if (len > 1e-6) {
    dx /= len;
    dy /= len;
    dz /= len;
  } else dx = dy = dz = 0;
  const k = hit.zone === "head" ? 1.25 : hit.zone === "legs" ? 0.85 : 1;
  const rand = (a: number) => (random() - 0.5) * 2 * a;
  let n = 0;
  const put = (
    ox: number,
    oy: number,
    oz: number,
    vx: number,
    vy: number,
    vz: number,
    color: readonly number[],
    life: number,
    size: number,
    alpha: number,
    drag: number,
    fall: number,
    grow: number,
    cell: number,
    minPx: number,
    pull: number,
  ) => {
    const q = (out[n] ??= {
      o: [0, 0, 0],
      v: [0, 0, 0],
      color,
      life: 0,
      size: 0,
      alpha: 0,
      drag: 0,
      fall: 0,
      grow: 0,
      cell: 0,
      turn: 0,
      minPx: 0,
      pull: 0,
    });
    n++;
    q.o[0] = ox;
    q.o[1] = oy;
    q.o[2] = oz;
    q.v[0] = vx;
    q.v[1] = vy;
    q.v[2] = vz;
    q.color = color;
    q.life = life;
    q.size = size;
    q.alpha = alpha;
    q.drag = drag;
    q.fall = fall;
    q.grow = grow;
    q.cell = cell;
    q.turn = random() * Math.PI * 2;
    q.minPx = minPx;
    q.pull = pull;
  };
  /** `count` drops, every third of them back toward the shooter. */
  const drops = (count: number) => {
    for (let i = 0; i < count; i++) {
      const back = i % 3 === 2;
      const s = back ? -(0.8 + random() * 1.6) : 1.4 + random() * 3.2;
      put(
        rand(0.04),
        rand(0.04),
        rand(0.04),
        dx * s + rand(1.6),
        dy * s + 0.4 + random() * 1.6,
        dz * s + rand(1.6),
        i % 3 ? BLOOD.deep : BLOOD.mid,
        400 + random() * 300,
        (0.05 + random() * 0.05) * k,
        0.95,
        0.6,
        9.8,
        0,
        0,
        2,
        0.25,
      );
    }
  };
  /** One billow: `along` the bullet's way (negative: back out of the wound). */
  const billow = (i: number, along: number, start: number) =>
    put(
      dx * start + rand(0.15),
      dy * start + rand(0.2) + 0.08,
      dz * start + rand(0.15),
      dx * along + rand(0.5),
      dy * along + 0.2 + random() * 0.45,
      dz * along + rand(0.5),
      i % 3 === 0 ? BLOOD.bright : i % 3 === 1 ? BLOOD.mid : BLOOD.deep,
      440 + random() * 220,
      (0.56 + random() * 0.3) * k,
      0.8 + random() * 0.18,
      4.5,
      0.5,
      0.75 + random() * 0.35,
      1 + (i % 4 === 3 ? MIST.wisp : i % 2 ? MIST.billowB : MIST.billowA),
      7,
      along < 0 ? 0.5 : 0.2,
    );
  if (hit.light) {
    // A following pellet: its own small billow and a few drops (the first one's cloud stands).
    billow(Math.floor(random() * 6), -0.4, 0);
    out[n - 1]!.size *= 0.7;
    drops(FLESH_LIGHT - 1);
    return n;
  }
  // The splash, out of the wound toward the shooter's side.
  put(
    -dx * 0.05,
    0,
    -dz * 0.05,
    -dx * 0.6,
    0.2,
    -dz * 0.6,
    BLOOD.splash,
    170,
    0.62 * k,
    1,
    3,
    0,
    1.5,
    1 + MIST.splash,
    10,
    0.55,
  );
  // The veils.
  for (let i = 0; i < 2; i++) {
    const s = i ? 0.5 : -0.35;
    put(
      rand(0.1),
      rand(0.1) + 0.05,
      rand(0.1),
      dx * s + rand(0.25),
      dy * s + 0.12 + random() * 0.15,
      dz * s + rand(0.25),
      i ? BLOOD.mid : BLOOD.bright,
      600 + random() * 180,
      (0.95 + random() * 0.25) * k,
      0.5,
      3,
      0.2,
      0.55,
      1 + (i ? MIST.billowA : MIST.billowB),
      8,
      i ? 0.2 : 0.5,
    );
  }
  for (let i = 0; i < 6; i++) {
    const back = i < 3;
    billow(i, back ? -(0.25 + random() * 0.6) : 0.5 + random() * 1.1, back ? 0 : 0.25);
  }
  drops(12);
  return n;
}

/**
 * Where a hit on a body is drawn. The server's record has the wound where the body was for the
 * shot (rewound for the shooter's lag in the battle royale, the latest tick in 1v1 and 5v5);
 * the body on screen is drawn a little behind the server and may have run on. A wound within
 * the body's reach of where it is drawn stays as recorded; one left behind is brought back to
 * the body (its height kept, within the body's), so the mist is never beside a running target.
 * `feet`: the drawn body's position at the ground. Writes and returns `out`.
 */
export function anchorHit(point: Vector, feet: Vector | null | undefined, out: Vector): Vector {
  const { x, y, z } = point;
  out.x = x;
  out.y = y;
  out.z = z;
  if (!feet) return out;
  const dx = x - feet.x,
    dz = z - feet.z,
    d = Math.hypot(dx, dz);
  if (d > 0.55) {
    const k = 0.28 / d;
    out.x = feet.x + dx * k;
    out.z = feet.z + dz * k;
    out.y = Math.min(feet.y + 1.95, Math.max(feet.y + 0.05, y));
  }
  return out;
}
