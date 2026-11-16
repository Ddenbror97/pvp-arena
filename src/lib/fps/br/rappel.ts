import type { StaticWorld } from "./static-world";

/**
 * Rappelling down a building (owner, 2026-11-15: "Players should be able to descend from
 * rooftops using a rope … leaning backward from the building, with their boots touching the
 * wall, holding the rope, and performing controlled jumps down the building"; then: "there does
 * not need to be a rope on every building. keep it simple, close to the wall the interact window
 * pops up … and the descend start").
 *
 * No rope is placed anywhere: standing at a roof's edge with a clear wall under it, E throws one
 * from where you stand. Shared by the server room (authority) and the client (prediction, the
 * prompt, drawing and animation), as ladders.ts: the wall is found from the island's collision
 * boxes by the same function on both, the descent is the body's phase "rappel", and everything
 * drawn (the pose, the rope) follows from the state below.
 *
 * The wall: collision boxes are axis-aligned, so a wall faces one of four ways. `wall` is the
 * face's coordinate on its normal's axis, `line` where the rope hangs along it, `top` the height
 * of the edge it runs over (the roof, or its parapet), `land` the floor it ends on.
 *
 * The descent runs by itself (owner, the same evening: "change the function to not be needing
 * to hold W to descend, when user clicks on E it happens automatically"): over the edge, then
 * hop after hop down the wall (the knees bend, out and down on the rope, back to the wall on
 * bent knees) to the floor, with nothing held. A hop always finishes at the wall. S held walks
 * back up instead, slower, and over the edge again at the top; A/D step along the wall a
 * little. E lets go only where that is safe: near the bottom (onto the floor) or at the top
 * (back over the edge). Nothing else moves a body on the rope.
 *
 * Frames: world metres (x east, y up, z south). Facing: yaw with forward = (−sin, −cos).
 */
export const RAPPEL = {
  /** E reach: the roof's edge is within this of the feet, the way the player faces (m). */
  reach: 1.4,
  /** The wall under the edge is at least this high, and at most this (m of rope). */
  minDrop: 2.6,
  maxDrop: 150,
  /** A wall round the roof up to this high over the feet is climbed over (m). */
  parapet: 1.3,
  /** The body's point out from the wall, braced on it (m): the hips, the feet on the wall. */
  standOff: 0.8,
  /** The hips over the body's point (m): `s` is how far the hips hang below the edge. */
  hip: 0.95,
  /** Hanging just under the edge: where a descent starts and a climb back up ends (m). */
  sTop: 0.95,
  /** The hips this far over the floor at the end of the rope: the landing takes over (m). */
  landHang: 1.25,
  /** Standing after the landing: this far out from the wall (m). */
  landOff: 0.6,
  /** Standing on the roof after climbing back over the edge: this far in from it (m). */
  roofIn: 0.75,
  /** Walking up the wall on the rope (m/s), and down it when there is no room left to hop. */
  ascend: 1.1,
  creep: 1.4,
  /** Along the wall (m/s), and how far either side of the rope's line (m). */
  sideSpeed: 0.7,
  sideMax: 1.4,
  /** A hop (ms): the knees bend, off the wall and down, back on it with the knees taking it. */
  hop: { crouch: 130, air: 600, absorb: 170 },
  /** A hop's drop (m) and how far out from the braced stance it swings (m); each hop varies. */
  drop: 2.7,
  out: 0.95,
  vary: 0.12,
  /** Less rope than this left over the landing: walked down, not hopped (m). */
  minHop: 0.9,
  /** E lets go onto the floor from at most this far over the landing's hang (m of rope). */
  release: 1.6,
  /** E (or S held) at the top: back over the edge from within this of the start (m). */
  topReach: 0.5,
  /** Over the edge onto the rope, back over it, and the landing (ms). */
  onMs: 1700,
  upMs: 1500,
  landMs: 650,
  /** After stepping off, E takes a rope again only after this (ms). */
  againMs: 700,
} as const;

/** A wall's four ways out: +x, +z, −x, −z. */
const NORMALS = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
] as const;
export type RappelDir = 0 | 1 | 2 | 3;
export const rappelNormal = (dir: number) => NORMALS[dir & 3]!;

/** A wall a rope can be thrown down, found from where the player stands (rappelSite). */
export type RappelSite = {
  dir: RappelDir;
  /** The wall face's coordinate along its normal's axis, the rope's along the wall. */
  wall: number;
  line: number;
  /** The edge the rope runs over, the roof stood on, the floor at the bottom (heights). */
  top: number;
  roof: number;
  land: number;
  /** How far the body may step along the wall either side of the rope (m, ≤ 0 and ≥ 0). */
  sideMin: number;
  sideMax: number;
};

/** The body's state on the rope (phase "rappel"). */
export type RappelState = RappelSite & {
  /** How far the hips hang below the edge (m). */
  s: number;
  /**
   * "on": over the edge onto the rope. "hang": on the wall (or in a hop). "land": down onto the
   * floor. "up": back over the edge onto the roof.
   */
  stage: "on" | "hang" | "land" | "up";
  /** Into the stage (ms; "hang": unused). */
  t: number;
  /** Into the current hop (ms), or −1 on the wall. `from`: `s` where it began, `n`: how many. */
  hop: number;
  from: number;
  n: number;
  /** Along the wall from the rope's line (m). */
  side: number;
  /** Stepping on: where the player stood (feet, world). */
  stood?: [number, number, number];
};

type Body = {
  x: number;
  y: number;
  z: number;
  velocityY: number;
  vx: number;
  vz: number;
  grounded: boolean;
  rappel?: RappelState;
};

const ease = (t: number) => {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
};
/** A number in 0..1 for hop `n` of a wall (the same on the server and every client). */
const hash = (n: number, wall: number, line: number) => {
  const v = Math.sin(n * 127.1 + wall * 311.7 + line * 74.7) * 43758.5453;
  return v - Math.floor(v);
};

/** A point `out` m from the wall on its normal and `side` m along it from the rope's line. */
function wallPoint(st: RappelSite, out: number, side: number, into: { x: number; z: number }) {
  const [nx, nz] = NORMALS[st.dir]!;
  // The normal's axis carries the wall's coordinate, the other the rope's line.
  if (nx !== 0) {
    into.x = st.wall + nx * out;
    into.z = st.line + side;
  } else {
    into.z = st.wall + nz * out;
    into.x = st.line + side;
  }
  return into;
}

/**
 * How far behind the roof's edge a wall is looked for (m): walls are as thin as 0.2 m, flush
 * with the edge or set back a little under it.
 */
const WALL_IN = [0.06, 0.16, 0.3] as const;
/** How much of the way down has to be wall (sampled every 0.45 m from just under the edge). */
const WALL_SHARE = 0.3;
/** Whether a point is inside a collision box (a wall's body). */
const solid = (world: StaticWorld, x: number, y: number, z: number) =>
  world.blocked(x, y, z, 0.04, 0.02);

/** How far the rope reaches below the edge: the hips' hang where the landing takes over (m). */
export const rappelEnd = (st: RappelSite) => st.top - st.land - RAPPEL.landHang;
/** The length of rope from the edge to the floor (m). */
export const rappelDrop = (st: RappelSite) => st.top - st.land;

/** Why a place has no rope down (the map audit's count of them; not shown to players). */
export type RappelWhy = { reason?: string };

/**
 * The wall under one line of a roof's edge: the floor at its bottom when a body can go down it
 * (a wall to put the boots on, nothing sticking out of it, nothing in the way of a hop), else
 * null.
 */
function column(
  world: StaticWorld,
  dir: RappelDir,
  wall: number,
  line: number,
  top: number,
  why?: RappelWhy,
): number | null {
  const no = (reason: string) => {
    if (why) why.reason = reason;
    return null;
  };
  const [nx, nz] = NORMALS[dir]!;
  const at = (out: number): [number, number] =>
    nx !== 0 ? [wall + nx * out, line] : [line, wall + nz * out];
  // The floor under the braced body.
  const [bx, bz] = at(RAPPEL.standOff);
  const land = world.supportAt(bx, bz, 0.35, top - 1);
  const drop = top - land;
  if (drop < RAPPEL.minDrop) return no("low");
  if (drop > RAPPEL.maxDrop) return no("high");
  // Nothing in the way of the body or of a hop out from the wall, from the floor to the edge.
  for (const out of [RAPPEL.standOff, RAPPEL.standOff + RAPPEL.out * (1 + RAPPEL.vary)]) {
    const [cx, cz] = at(out);
    for (let y = land + 0.25; y < top - 0.2; y += 1.7)
      if (world.blocked(cx, y, cz, Math.min(1.8, top - 0.1 - y), 0.38)) return no("blocked");
  }
  // A wall behind it: under the edge for certain (where the boots go over it and brace), and
  // enough of the way down. Windows and doorways are gaps in it, and a glass front is all gap
  // but its floors; a roof on posts with nothing under it is not a wall.
  let have = 0,
    all = 0;
  for (let y = top - 0.35; y > land + 0.3; y -= 0.45) {
    all++;
    let wall = false;
    for (const depth of WALL_IN) {
      const [ix, iz] = at(-depth);
      if (solid(world, ix, y, iz)) {
        wall = true;
        break;
      }
    }
    if (wall) have++;
    else if (all <= 2) return no("overhang");
  }
  return all > 0 && have / all >= WALL_SHARE ? land : no("open");
}

/**
 * The wall a rope can be thrown down from where a player stands: on a roof (a box's top, not
 * the ground), at an edge within reach the way they face, with a clear wall below it. Null
 * when there is none. The server validates E with it; the client shows the prompt from it.
 */
export function rappelSite(
  world: StaticWorld,
  x: number,
  y: number,
  z: number,
  yaw: number,
  why?: RappelWhy,
): RappelSite | null {
  if (why) why.reason = "ground";
  // On a building: the support under the feet is a box's top, clear of the terrain.
  const under = world.supportAt(x, z, 0.3, y + 0.05);
  if (Math.abs(under - y) > 0.2 || under - world.hf.heightAt(x, z) < 1.5) return null;
  const fx = -Math.sin(yaw),
    fz = -Math.cos(yaw);
  // The ways out, best faced first; one the player has their back to is not offered.
  const order = ([0, 1, 2, 3] as const)
    .map((dir) => ({ dir, dot: NORMALS[dir]![0] * fx + NORMALS[dir]![1] * fz }))
    .filter((d) => d.dot > 0.45)
    .sort((a, b) => b.dot - a.dot);
  if (why) why.reason = "edge";
  for (const { dir } of order) {
    const [nx, nz] = NORMALS[dir]!;
    // Out from the feet to where the support falls away (over a low wall round the roof).
    let inside = 0,
      outside = -1;
    for (let e = 0.1; e <= RAPPEL.reach + 0.05; e += 0.1) {
      const px = x + nx * e,
        pz = z + nz * e;
      // A wall taller than a parapet stands in the way.
      if (world.blocked(px, y + RAPPEL.parapet + 0.05, pz, 0.5, 0.03)) {
        if (why) why.reason = "edge:wall";
        break;
      }
      const sup = world.supportAt(px, pz, 0.03, y + RAPPEL.parapet);
      if (sup < y - RAPPEL.minDrop + 0.5) {
        outside = e;
        break;
      }
      if (sup < y - 0.45) {
        // A step down that is no drop: not an edge to rappel from.
        if (why) why.reason = "edge:step";
        break;
      }
      inside = e;
    }
    if (outside < 0) continue;
    // The face itself, to the centimetre.
    for (let i = 0; i < 5; i++) {
      const mid = (inside + outside) / 2;
      const sup = world.supportAt(x + nx * mid, z + nz * mid, 0.005, y + RAPPEL.parapet);
      if (sup < y - RAPPEL.minDrop + 0.5) outside = mid;
      else inside = mid;
    }
    const wall = (nx !== 0 ? x : z) + (nx !== 0 ? nx : nz) * inside;
    const line = nx !== 0 ? z : x;
    const top = world.supportAt(
      x + nx * (inside - 0.04),
      z + nz * (inside - 0.04),
      0.02,
      y + RAPPEL.parapet,
    );
    const land = column(world, dir, wall, line, top, why);
    if (land === null) continue;
    // Either side of the rope: as far as the same wall goes on, clear, down to the same floor.
    const reach = (sign: number) => {
      let far = 0;
      for (let d = 0.35; d <= RAPPEL.sideMax + 1e-6; d += 0.35) {
        const l = column(world, dir, wall, line + sign * d, top);
        if (l === null || Math.abs(l - land) > 0.3) break;
        far = d;
      }
      return sign * far;
    };
    return { dir, wall, line, top, roof: y, land, sideMin: reach(-1), sideMax: reach(1) };
  }
  return null;
}

/** Take the rope (the server has validated the site): over the edge from where the body stands. */
export function startRappel(body: Body, site: RappelSite) {
  body.rappel = {
    ...site,
    s: RAPPEL.sTop,
    stage: "on",
    t: 0,
    hop: -1,
    from: RAPPEL.sTop,
    n: 0,
    side: 0,
    stood: [body.x, body.y, body.z],
  };
}

/** One hop of a wall: how long it is in the air, how far it drops and swings out. */
export function hopOf(st: RappelSite, n: number, room: number) {
  const a = hash(n, st.wall, st.line),
    b = hash(n + 0.5, st.line, st.wall);
  const drop = Math.min(room, RAPPEL.drop * (1 + RAPPEL.vary * (a * 2 - 1)));
  // A short last hop swings out less.
  const out = RAPPEL.out * (1 + RAPPEL.vary * (b * 2 - 1)) * Math.min(1, 0.45 + drop / 3.2);
  return { drop, out };
}
export const HOP_MS = RAPPEL.hop.crouch + RAPPEL.hop.air + RAPPEL.hop.absorb;

/**
 * Where a hop has the body `ms` into it: how far down from where it began (m), and how far out
 * from the braced stance (m; a little in while the knees are bent).
 */
export function hopAt(ms: number, drop: number, out: number, into: { down: number; out: number }) {
  const { crouch, air, absorb } = RAPPEL.hop;
  if (ms < crouch) {
    // The knees bend: the hips come in to the wall and sink a hand's breadth.
    const k = ms / crouch;
    into.down = 0.06 * ease(k);
    into.out = -0.14 * ease(k);
    return into;
  }
  if (ms < crouch + air) {
    // Off the wall: out on the rope fast, back in as it swings; down slowly at first (the
    // push is outward), fastest in the middle, the rope braking it before the wall.
    const k = (ms - crouch) / air;
    into.down = 0.06 + (drop - 0.12) * ease(k ** 1.2);
    // (Out sooner than back: the swing's top is before the middle of the hop.)
    const swing = Math.sin(Math.PI * k * (1.25 - 0.25 * k));
    into.out = -0.14 * (1 - ease(k * 5)) + out * swing - 0.16 * ease((k - 0.8) / 0.2);
    return into;
  }
  // Back on the wall: the knees take it, then push the hips back out to the braced stance.
  const k = Math.min(1, (ms - crouch - air) / absorb);
  into.down = drop - 0.06 * (1 - ease(k));
  into.out = -0.16 * (1 - ease(k));
  return into;
}
const hopInto = { down: 0, out: 0 };
const pt = { x: 0, z: 0 };

/** Put the body where its state has it (stage "hang"). */
function place(body: Body, st: RappelState) {
  let out = 0;
  let s = st.s;
  if (st.hop >= 0) {
    const h = hopOf(st, st.n, rappelEnd(st) - st.from);
    hopAt(st.hop, h.drop, h.out, hopInto);
    out = hopInto.out;
    s = st.from + hopInto.down;
  }
  wallPoint(st, RAPPEL.standOff + out, st.side, pt);
  body.x = pt.x;
  body.z = pt.z;
  body.y = st.top - RAPPEL.hip - s;
}

/**
 * Over the edge, `k` 0..1 of the way from standing on the roof to hanging under it: to the
 * edge and up onto it (a parapet's top), then backwards over it and down the first of the wall.
 */
function overEdge(
  st: RappelState,
  k: number,
  side: number,
  out: { x: number; y: number; z: number },
) {
  const [sx, sy, sz] = st.stood ?? [0, st.roof, 0];
  const walk = ease(k / 0.34),
    over = ease((k - 0.34) / 0.66);
  // On the roof just inside the edge, where the body goes over it.
  wallPoint(st, -0.3, side, pt);
  const ex = pt.x,
    ez = pt.z;
  wallPoint(st, RAPPEL.standOff, side, pt);
  const x = sx + (ex - sx) * walk,
    z = sz + (ez - sz) * walk;
  out.x = x + (pt.x - x) * over;
  out.z = z + (pt.z - z) * over;
  // Up onto the edge while coming to it, down the wall once the hips are past it.
  const lip = st.top - sy;
  const up = lip > 0.05 ? ease((k - 0.2) / 0.3) : 0;
  const down = ease((k - 0.52) / 0.48);
  out.y = sy + lip * up + (st.top - RAPPEL.hip - RAPPEL.sTop - (sy + lip * up)) * down;
  return out;
}
const at = { x: 0, y: 0, z: 0 };

/**
 * One fixed step on the rope. Down in hops by itself; `forward` below −0.3 (S) climbs instead;
 * `strafe`: along the wall.
 * Returns "ground" when the body is off it (landed, or back on the roof), else null.
 * Server-authoritative: the client predicts the same step.
 */
export function stepRappel(
  world: StaticWorld,
  body: Body,
  forward: number,
  strafe: number,
  dtMs: number,
): "ground" | null {
  const st = body.rappel;
  if (!st) return "ground";
  body.velocityY = body.vx = body.vz = 0;
  body.grounded = false;
  const end = rappelEnd(st);
  if (st.stage === "on") {
    st.t += dtMs;
    overEdge(st, Math.min(1, st.t / RAPPEL.onMs), 0, at);
    body.x = at.x;
    body.y = at.y;
    body.z = at.z;
    if (st.t >= RAPPEL.onMs) {
      st.stage = "hang";
      st.t = 0;
      delete st.stood;
      place(body, st);
    }
    return null;
  }
  if (st.stage === "up") {
    st.t += dtMs;
    // The way on, backwards, to a stand a stride in from the edge (where the body hangs).
    wallPoint(st, -RAPPEL.roofIn, st.side, pt);
    st.stood = [pt.x, st.roof, pt.z];
    overEdge(st, 1 - Math.min(1, st.t / RAPPEL.upMs), st.side, at);
    body.x = at.x;
    body.y = at.y;
    body.z = at.z;
    if (st.t < RAPPEL.upMs) return null;
    body.x = st.stood[0];
    body.y = st.roof;
    body.z = st.stood[2];
    body.grounded = true;
    delete body.rappel;
    return "ground";
  }
  if (st.stage === "land") {
    st.t += dtMs;
    const k = Math.min(1, st.t / RAPPEL.landMs);
    // Off the wall: the feet swing down under the hips and take the floor a stride out.
    wallPoint(st, RAPPEL.standOff + (RAPPEL.landOff - RAPPEL.standOff) * ease(k), st.side, pt);
    const y0 = st.top - RAPPEL.hip - st.s;
    body.x = pt.x;
    body.z = pt.z;
    body.y = y0 + (st.land - y0) * (k * k * 0.6 + ease(k) * 0.4);
    if (st.t < RAPPEL.landMs) return null;
    body.y = world.supportAt(body.x, body.z, 0.35, st.land + 0.4);
    body.grounded = true;
    delete body.rappel;
    return "ground";
  }
  const f = Number.isFinite(forward) ? Math.max(-1, Math.min(1, forward)) : 0;
  const side = Number.isFinite(strafe) ? Math.max(-1, Math.min(1, strafe)) : 0;
  const dt = dtMs / 1000;
  if (st.hop >= 0) {
    // A hop runs its course whatever is held: nobody stops in the air.
    st.hop += dtMs;
    if (st.hop >= HOP_MS) {
      st.s = st.from + hopOf(st, st.n, end - st.from).drop;
      st.hop = -1;
      st.n++;
    }
  }
  if (st.hop < 0) {
    if (f < -0.3) {
      // S: back up the wall on the rope, and over the edge at the top.
      st.s -= RAPPEL.ascend * -f * dt;
      if (st.s <= RAPPEL.sTop) {
        st.s = RAPPEL.sTop;
        st.stage = "up";
        st.t = 0;
      }
    } else {
      // Down, by itself: the next hop, or the last of the rope walked down to the landing.
      const room = end - st.s;
      if (room <= 0.02) {
        st.stage = "land";
        st.t = 0;
      } else if (room >= RAPPEL.minHop) {
        st.hop = 0;
        st.from = st.s;
      } else st.s = Math.min(end, st.s + RAPPEL.creep * dt);
    }
  }
  // Along the wall, on it or in a hop: the right hand's way (the body faces the wall) is the
  // normal turned; `side` runs along the wall's own axis (+z for an x wall, +x for a z wall).
  if (side !== 0 && st.stage === "hang") {
    const [nx, nz] = NORMALS[st.dir]!;
    const right = nx !== 0 ? -nx : nz;
    st.side = Math.max(
      st.sideMin,
      Math.min(st.sideMax, st.side + side * right * RAPPEL.sideSpeed * dt),
    );
  }
  if (st.stage === "hang") place(body, st);
  return null;
}

/**
 * E on the rope ("E while attached: detach only when safe"): near the bottom the body drops
 * onto the floor, at the top it goes back over the edge; anywhere else nothing (null). Not in a
 * hop, nor while already stepping on or off.
 */
export function rappelRelease(body: Body): "land" | "up" | null {
  const st = body.rappel;
  if (!st || st.stage !== "hang" || st.hop >= 0) return null;
  if (rappelEnd(st) - st.s <= RAPPEL.release) {
    st.stage = "land";
    st.t = 0;
    return "land";
  }
  if (st.s <= RAPPEL.sTop + RAPPEL.topReach) {
    st.stage = "up";
    st.t = 0;
    return "up";
  }
  return null;
}

/** Eliminated on the rope: down to the floor under it (body and gear lie there). */
export function dropFromRappel(world: StaticWorld, body: Body) {
  body.y = world.supportAt(body.x, body.z, 0.35, body.y + 0.5);
  body.velocityY = body.vx = body.vz = 0;
  body.grounded = true;
  delete body.rappel;
}

// ------------------------------------------------------------------ what others are sent

/**
 * A body on the rope as others are sent it, after the row's own fields (match.ts playerRow):
 * [dir, wall, line, top, land (cm each), stage and progress]. The last: the stage (0 on,
 * 1 hang, 2 land, 3 up) × 1000 + how far into it (0..999 of the stage; hanging: of the hop, 0
 * on the wall). The pose and the rope are drawn from these and the row's position.
 */
export function rappelRow(st: RappelState): number[] {
  const cm = (v: number) => Math.round(v * 100) / 100;
  const stage = st.stage === "on" ? 0 : st.stage === "hang" ? 1 : st.stage === "land" ? 2 : 3;
  const of =
    st.stage === "on"
      ? st.t / RAPPEL.onMs
      : st.stage === "land"
        ? st.t / RAPPEL.landMs
        : st.stage === "up"
          ? st.t / RAPPEL.upMs
          : st.hop >= 0
            ? Math.max(0.001, st.hop / HOP_MS)
            : 0;
  return [
    st.dir,
    cm(st.wall),
    cm(st.line),
    cm(st.top),
    cm(st.land),
    stage * 1000 + Math.round(Math.max(0, Math.min(1, of)) * 999),
  ];
}

/** What a row's rope fields say (rappelRow), or null when they are not a rope's. */
export function readRappelRow(row: readonly number[], at: number) {
  const dir = row[at],
    code = row[at + 5];
  if (dir === undefined || code === undefined || !(dir >= 0 && dir <= 3)) return null;
  const stage = (["on", "hang", "land", "up"] as const)[Math.floor(code / 1000)];
  if (!stage) return null;
  return {
    dir: dir as RappelDir,
    wall: row[at + 1]!,
    line: row[at + 2]!,
    top: row[at + 3]!,
    land: row[at + 4]!,
    stage,
    of: (code % 1000) / 999,
  };
}
