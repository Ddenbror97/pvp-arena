import { ROPE, ropeAt, ropePaths, ropeS, type RopePath } from "./rope";
import type { StaticWorld } from "./static-world";
import { ZIPLINE } from "./zipline";

/**
 * Ladders (owner, 2026-11-11: "add climbing ladder animation" and "check so the tower at the top
 * of the iron hill has a ladder"). The Iron Peaks watchtower already has a switchback stair to
 * its deck; this steel ladder up its east face is the quick way up to the zip-line.
 *
 * Shared by the server room (authority) and the client (prediction, drawing and animation). A
 * climber's state is how far up they are (`s`, m) and, while stepping on or off, a short
 * transition: everything else, the animation included (ladder-clip.ts, Mixamo "Climbing Ladder"),
 * follows from the position, so other players need nothing extra (phase code 7 and the row's
 * position: the clip's phase is the height climbed).
 *
 * The Iron Peaks climbing rope (rope.ts, owner 2026-11-12) is climbed with the same mechanics: a
 * "ladder" whose climb follows the rope's line up the rock face instead of a vertical, at its own
 * speed, stepped off at its foot onto the slope as well as over the edge at the top, and let go
 * of with E as well as jump (E within a stride of either end steps off there instead).
 *
 * Frames: world metres (x east, y up, z south). Facing: yaw with forward = (−sin, −cos).
 */
/** The terrain (the island's heightfield: the same on the server and every client). */
export type Ground = { heightAt(x: number, z: number): number };

export type Ladder = {
  id: number;
  /** The ladder's plane (the rungs' line) at its centre, and the way the climber faces it. */
  x: number;
  z: number;
  yaw: number;
  /** Ground under the climber's feet at the bottom, and the floor stepped onto at the top. */
  bottom: number;
  top: number;
  /** On foot at the top: where the climber steps off onto the floor (world). */
  exit: { x: number; z: number };
  /** How far the feet climb above the top floor to step in over its rail (m; 0 open). */
  rail: number;
  /** A rope (rope.ts): the climb follows its line; `foot` is where you stand to take hold at
   * its foot and step back off onto (on the ground). */
  rope?: RopePath;
};

export const LADDER = {
  /** Climbing speed (m/s): the clip runs at about twice its own pace (0.62 m/s). */
  speed: 1.25,
  /** Rung spacing (m): the clip's hands and feet step two rungs a cycle (a 0.98 m hip height). */
  rung: 0.238,
  /** The climber's feet (the body's point) out from the ladder's plane (m). */
  standOff: 0.27,
  /** Half the width between the rails (m), and how far the rails stand above the top rung. */
  halfWidth: 0.24,
  handrail: 1.05,
  /** E reach: horizontal (m) from the foot of the ladder or from the exit at the top, and how
   * far the feet may be off that floor. */
  reach: 1.1,
  reachUp: 0.6,
  /** Stepping on at the foot (from where the climber stood), and off at the top over the rail
   * onto the floor (also the step on from the top, backwards) (ms). */
  onMs: 320,
  offMs: 650,
  /** After stepping off, E takes a ladder again only after this (ms). */
  againMs: 600,
  /** Letting go (jump): pushed off the ladder, outward (m/s). */
  pushOff: 1.6,
} as const;

const ease = (t: number) => {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
};

/** Climb per animation cycle (m): two rungs. */
export const LADDER_CYCLE = LADDER.rung * 2;

/**
 * The Iron Peaks watchtower's ladder: up its east face by the deck's south-east corner, over the
 * rail (0.76 m: the watchtower's collision, x 2.17..2.22 up to 7.5 m) and onto the deck, clear of
 * the roof's corner beam (8.04 m over x ≤ 1.38, z ≤ 1.38) and the zip-line's portal and stays.
 */
function ironPeaks(ground: Ground): Ladder {
  const T = ZIPLINE.tower;
  const x = T.x + 2.3,
    z = T.z + 1.8;
  const yaw = Math.PI / 2; // facing west, toward the tower
  const fx = x + LADDER.standOff;
  return {
    id: 0,
    x,
    z,
    yaw,
    bottom: ground.heightAt(fx, z),
    top: T.y + ZIPLINE.deckY,
    exit: { x: T.x + 1.75, z },
    rail: 0.82,
  };
}

/**
 * Ladders drawn on placed models (owner, 2026-11-11: "ensure new buildings/houses/stairs is
 * optimized like the rest, enterable/door/etc"), model-local: the ladder's plane at its centre,
 * the climber's facing (yaw, the convention above), the floor stepped onto at the top and where
 * (art/br/fitout/strait.py measured them). The strait's island watchtowers: the ladder up the
 * west side (rungs in the plane x -1.97, stiles at z -2.02 and -1.07) to the deck at 7.71 m
 * through the gap at the south end of the west wall (z -2.0..-1.14).
 */
export const MODEL_LADDERS: Record<
  string,
  {
    x: number;
    z: number;
    yaw: number;
    top: number;
    exit: [number, number];
    rail: number;
    /** The floor the ladder starts from (m above the model's base; 0 the ground). */
    base?: number;
  }
> = {
  "bridge-watchtower": {
    x: -1.97,
    z: -1.55,
    yaw: -Math.PI / 2,
    top: 7.71,
    exit: [-1.4, -1.55],
    rail: 0.05,
  },
  // The Iron Peaks broadcast tower (the second zip-line's start, zipline.ts; owner 2026-11-12):
  // the ladder up its middle (rungs in the plane z -1.0, stiles at x -0.5 and 0.8) from its
  // concrete base (1.44 m) to the platform at 25.43 m, through the hatch and out over its east
  // guard rail (art/br/fitout/zipline2.py).
  "radio-mast": {
    x: 0.15,
    z: -1.0,
    yaw: 0,
    top: 25.43,
    exit: [2.15, -0.73],
    rail: 1.05,
    base: 1.44,
  },
};

/** A placement (layout.ts) of a model that carries a ladder. */
type Placed = { model: string; x: number; y: number; z: number; turn: number };
const turned = (x: number, z: number, turn: number): [number, number] => {
  switch (turn & 3) {
    case 1:
      return [z, -x];
    case 2:
      return [-x, -z];
    case 3:
      return [-z, x];
    default:
      return [x, z];
  }
};
const placedLadders = new WeakMap<Ground, Ladder[]>();
/**
 * The island's placed models' ladders (buildIsland registers them on its terrain, on the server
 * and every client alike: the same layout, the same order, so the same ids).
 */
export function registerLadders(ground: Ground, layout: readonly Placed[]) {
  const out: Ladder[] = [];
  for (const p of layout) {
    const m = MODEL_LADDERS[p.model];
    if (!m) continue;
    const [lx, lz] = turned(m.x, m.z, p.turn);
    const [ex, ez] = turned(m.exit[0], m.exit[1], p.turn);
    const yaw = m.yaw + (p.turn & 3) * (Math.PI / 2);
    const x = p.x + lx,
      z = p.z + lz;
    const fx = x + Math.sin(yaw) * LADDER.standOff,
      fz = z + Math.cos(yaw) * LADDER.standOff;
    out.push({
      id: 1 + out.length,
      x,
      z,
      yaw,
      // The model stands on its placement height; where the ground under the foot is higher,
      // the climb starts there.
      bottom: Math.max(p.y + (m.base ?? 0), ground.heightAt(fx, fz)),
      top: p.y + m.top,
      exit: { x: p.x + ex, z: p.z + ez },
      rail: m.rail,
    });
  }
  placedLadders.set(ground, out);
  cache.delete(ground);
}

/** The Iron Peaks climbing ropes as climbs (rope.ts). */
function ironRopes(ground: Ground): Ladder[] {
  return ropePaths(ground).map((rope) => ({
    id: 0,
    x: rope.pts[0]!,
    z: rope.pts[2]!,
    yaw: rope.yaw,
    bottom: rope.foot[1],
    top: rope.exit[1],
    exit: { x: rope.exit[0], z: rope.exit[2] },
    rail: 0,
    rope,
  }));
}

/**
 * Per terrain, held weakly. As one slot keyed by the last terrain asked about it kept a whole
 * finished match alive: the zip-line renderer asks with a terrain that closes over the arena
 * (525 MB stayed after leaving a battle royale, cleanup 2026-11-12). And rooms sharing an isolate
 * each have their own terrain: one slot was rebuilt every time they took turns.
 */
const cache = new WeakMap<Ground, Ladder[]>();
/** Every ladder on the island (ids are indices): the Iron Peaks ladder and ropes (rope.ts ROPES'
 * order), then the placed models' ladders. */
export function ladders(ground: Ground): Ladder[] {
  let list = cache.get(ground);
  if (!list) {
    list = [ironPeaks(ground), ...ironRopes(ground), ...(placedLadders.get(ground) ?? [])].map(
      (l, id) => ({ ...l, id }),
    );
    cache.set(ground, list);
  }
  return list;
}

/** Where a climber `s` m up the ladder stands (feet, world). On a rope: the point on its line
 * the body hangs from (the character's root; its feet reach the rock). */
export function climbPoint(l: Ladder, s: number) {
  if (l.rope) return ropeAt(l.rope, s, { x: 0, y: 0, z: 0 });
  return {
    x: l.x + Math.sin(l.yaw) * LADDER.standOff,
    y: l.bottom + s,
    z: l.z + Math.cos(l.yaw) * LADDER.standOff,
  };
}
/** How far a climber goes up the rungs: to the top floor, plus over its rail (a rope: its
 * climb's length). */
export const ladderHeight = (l: Ladder) => (l.rope ? l.rope.length : l.top + l.rail - l.bottom);
/** Climbing speed (m/s). */
export const climbSpeed = (l: Ladder) => (l.rope ? ROPE.speed : LADDER.speed);

/** Stepping off at the top, `k` 0..1 of the way: in over the rail, then down onto the floor. */
function offPath(l: Ladder, k: number, out: { x: number; y: number; z: number }) {
  if (l.rope) {
    // Over the summit's edge: up and in onto the plateau, a little lift over the lip.
    const p = ropeAt(l.rope, l.rope.length, at2);
    const h = ease(k),
      up = ease(k / 0.7);
    out.x = p.x + (l.exit.x - p.x) * h;
    out.z = p.z + (l.exit.z - p.z) * h;
    out.y = p.y + (l.top - p.y) * up + Math.sin(Math.min(1, k) * Math.PI) * 0.12;
    return out;
  }
  const p = climbPoint(l, ladderHeight(l));
  const h = ease(k / 0.65),
    down = ease((k - 0.42) / 0.58);
  out.x = p.x + (l.exit.x - p.x) * h;
  out.z = p.z + (l.exit.z - p.z) * h;
  out.y = l.top + l.rail * (1 - down) + Math.sin(Math.min(1, k / 0.42) * Math.PI) * 0.08;
  return out;
}
const at = { x: 0, y: 0, z: 0 },
  at2 = { x: 0, y: 0, z: 0 };
/** A rope's foot: from the start of the climb down onto the slope where you stood, `k` 0..1. */
function footPath(l: Ladder, k: number, out: { x: number; y: number; z: number }) {
  const p = ropeAt(l.rope!, 0, at2);
  const [fx, fy, fz] = l.rope!.foot;
  const e = ease(k);
  out.x = p.x + (fx - p.x) * e;
  out.z = p.z + (fz - p.z) * e;
  out.y = p.y + (fy - p.y) * ease(k / 0.8);
  return out;
}

/** The climber's state (phase "ladder"). `t` counts the step on or off (ms) in `stage`. */
export type LadderState = {
  id: number;
  s: number;
  stage: "on" | "climb" | "off";
  t: number;
  /** Stepping on: from here (feet, world). */
  from?: [number, number, number];
  /** Stepping on at the top (over the rail from the floor) rather than at the foot. */
  top?: boolean;
  /** Stepping off a rope at its foot (onto the slope) rather than over the top. */
  low?: boolean;
};

/** A ladder whose foot (on the ground) or top exit (on the floor) is within reach, and which. */
export function ladderReachable(
  ground: Ground,
  x: number,
  y: number,
  z: number,
): { ladder: Ladder; end: "bottom" | "top" } | null {
  for (const l of ladders(ground)) {
    if (l.rope) {
      const [fx, fy, fz] = l.rope.foot;
      if (Math.hypot(x - fx, z - fz) <= ROPE_REACH && Math.abs(y - fy) <= 0.9)
        return { ladder: l, end: "bottom" };
      if (
        Math.hypot(x - l.exit.x, z - l.exit.z) <= ROPE_REACH &&
        Math.abs(y - l.top) <= LADDER.reachUp
      )
        return { ladder: l, end: "top" };
      continue;
    }
    const foot = climbPoint(l, 0);
    if (
      Math.hypot(x - foot.x, z - foot.z) <= LADDER.reach &&
      Math.abs(y - l.bottom) <= LADDER.reachUp
    )
      return { ladder: l, end: "bottom" };
    if (
      Math.hypot(x - l.exit.x, z - l.exit.z) <= LADDER.reach &&
      Math.abs(y - l.top) <= LADDER.reachUp
    )
      return { ladder: l, end: "top" };
  }
  return null;
}

/** E reach at a rope's foot and its top (m): it hangs off the rock, a stride from the slope. */
const ROPE_REACH = 1.6;

/** Take hold (the server has validated the reach): onto the ladder at that end. */
export function startClimb(
  body: { x: number; y: number; z: number; ladder?: LadderState },
  l: Ladder,
  end: "bottom" | "top",
) {
  body.ladder = {
    id: l.id,
    s: end === "bottom" ? 0 : ladderHeight(l),
    stage: "on",
    t: 0,
    from: [body.x, body.y, body.z],
    ...(end === "top" ? { top: true } : {}),
  };
}

type Climber = {
  x: number;
  y: number;
  z: number;
  velocityY: number;
  vx: number;
  vz: number;
  grounded: boolean;
  ladder?: LadderState;
};

/**
 * One fixed step on the ladder. Forward climbs, back climbs down, jump lets go. Returns
 * "ground" when the climber is off it (at the top on the floor, at the bottom on the ground, or
 * let go and falling), else null. Server-authoritative: the client predicts the same step.
 */
export function stepLadder(
  ground: Ground,
  body: Climber,
  forward: number,
  jump: boolean,
  dtMs: number,
): "ground" | null {
  const st = body.ladder;
  const l = st && ladders(ground)[st.id];
  if (!st || !l) {
    delete body.ladder;
    return "ground";
  }
  const h = ladderHeight(l);
  body.velocityY = body.vx = body.vz = 0;
  body.grounded = false;
  if (st.stage === "on") {
    st.t += dtMs;
    // (A rope's start hangs off the slope above where you stood: a longer step up onto it.)
    const ms = st.top ? offMs(l) : l.rope ? ROPE_ON_MS : LADDER.onMs;
    const k = Math.min(1, st.t / ms);
    if (st.top) {
      // Over the rail from the floor (the step off, backwards); where you stood eases into it.
      offPath(l, 1 - k, at);
      const [fx, fy, fz] = st.from ?? [l.exit.x, l.top, l.exit.z];
      const w = 1 - ease(k / 0.5);
      body.x = at.x + (fx - l.exit.x) * w;
      body.y = at.y + (fy - l.top) * w;
      body.z = at.z + (fz - l.exit.z) * w;
    } else {
      const e = ease(k);
      const p = climbPoint(l, st.s);
      const [fx, fy, fz] = st.from ?? [p.x, p.y, p.z];
      body.x = fx + (p.x - fx) * e;
      body.y = fy + (p.y - fy) * e;
      body.z = fz + (p.z - fz) * e;
    }
    if (st.t >= ms) {
      st.stage = "climb";
      st.t = 0;
      delete st.from;
      delete st.top;
    }
    return null;
  }
  if (st.stage === "off") {
    st.t += dtMs;
    if (st.low) {
      // Off a rope's foot: back down onto the slope where you stood to take hold.
      footPath(l, Math.min(1, st.t / ROPE_FOOT_MS), at);
      body.x = at.x;
      body.y = at.y;
      body.z = at.z;
      if (st.t < ROPE_FOOT_MS) return null;
      body.grounded = true;
      delete body.ladder;
      return "ground";
    }
    offPath(l, Math.min(1, st.t / offMs(l)), at);
    body.x = at.x;
    body.y = at.y;
    body.z = at.z;
    if (st.t < offMs(l)) return null;
    body.y = l.top;
    body.grounded = true;
    delete body.ladder;
    return "ground";
  }
  if (jump) return letGo(l, body, st);
  const f = Number.isFinite(forward) ? Math.max(-1, Math.min(1, forward)) : 0;
  st.s = Math.max(0, Math.min(h, st.s + f * climbSpeed(l) * (dtMs / 1000)));
  const p = climbPoint(l, st.s);
  body.x = p.x;
  body.y = p.y;
  body.z = p.z;
  if (st.s >= h && f > 0) {
    st.stage = "off";
    st.t = 0;
  } else if (st.s <= 0 && f < 0) {
    if (l.rope) {
      // A rope's foot hangs off the slope: step back down onto it.
      st.stage = "off";
      st.t = 0;
      st.low = true;
      return null;
    }
    body.grounded = true;
    delete body.ladder;
    return "ground";
  }
  return null;
}

/** Stepping onto a rope's foot from the slope, and back off onto it (ms); over its top edge onto
 * the plateau (3.6 m in and 0.5 m up: longer than a ladder's step over a rail). */
const ROPE_ON_MS = 700;
const ROPE_FOOT_MS = 520;
const offMs = (l: Ladder) => (l.rope ? 1100 : LADDER.offMs);

/** Let go: pushed off backward, falling from here (the ground step's gravity takes over). */
function letGo(l: Ladder, body: Climber, st: LadderState): "ground" {
  body.vx = Math.sin(l.yaw) * LADDER.pushOff;
  body.vz = Math.cos(l.yaw) * LADDER.pushOff;
  const p = climbPoint(l, st.s);
  body.x = p.x + Math.sin(l.yaw) * 0.12;
  body.y = p.y;
  body.z = p.z + Math.cos(l.yaw) * 0.12;
  body.grounded = false;
  delete body.ladder;
  return "ground";
}

/**
 * E while on a rope (owner's spec: "E while climbing: detach where safe"): within a stride of
 * either end it steps off there (onto the slope at the foot, over the edge at the top); anywhere
 * else it lets go, as jump does (a fall, with the usual fall damage). Not while already stepping
 * on or off. Returns "ground" if the climber is off at once (let go), "off" when stepping off has
 * begun, null if nothing changed. Server-authoritative (match.ts).
 */
export function ropeRelease(ground: Ground, body: Climber): "ground" | "off" | null {
  const st = body.ladder;
  const l = st && ladders(ground)[st.id];
  if (!st || !l?.rope || st.stage !== "climb") return null;
  if (st.s <= ROPE_STRIDE) {
    st.stage = "off";
    st.t = 0;
    st.low = true;
    return "off";
  }
  if (st.s >= l.rope.length - ROPE_STRIDE) {
    st.s = l.rope.length;
    st.stage = "off";
    st.t = 0;
    return "off";
  }
  return letGo(l, body, st);
}
/** "Within a stride of an end" (m along the rope). */
const ROPE_STRIDE = 1.2;

/** Eliminated or knocked off: down to whatever is below (body and gear lie there). */
export function dropFromLadder(world: StaticWorld, body: Climber) {
  body.y = world.supportAt(body.x, body.z, 0.35, body.y);
  body.velocityY = body.vx = body.vz = 0;
  body.grounded = true;
  delete body.ladder;
}

/**
 * Another player's climb, from their replicated position alone: the height climbed (the
 * animation's phase) when they are on the rungs, null while stepping on or off.
 */
export function climbAt(
  ground: Ground,
  x: number,
  y: number,
  z: number,
): { ladder: Ladder; s: number } | null {
  for (const l of ladders(ground)) {
    if (l.rope) {
      const s = ropeS(l.rope, x, y, z);
      if (s !== null) return { ladder: l, s };
      continue;
    }
    const p = climbPoint(l, 0);
    if (Math.hypot(x - p.x, z - p.z) < 0.06 && y >= l.bottom - 0.05 && y <= l.top + l.rail + 0.05)
      return { ladder: l, s: y - l.bottom };
  }
  return null;
}

/** Rails and rungs to draw (world): the rails' bottoms and tops, and each rung's height. */
export function ladderParts(l: Ladder) {
  const sx = Math.cos(l.yaw),
    sz = -Math.sin(l.yaw); // across the ladder (the climber's right)
  const y0 = l.bottom - 0.15,
    y1 = l.top + l.rail + LADDER.handrail;
  const rails = [-1, 1].map((side) => ({
    x: l.x + sx * LADDER.halfWidth * side,
    z: l.z + sz * LADDER.halfWidth * side,
    y0,
    y1,
  }));
  const rungs: number[] = [];
  for (let y = l.bottom + LADDER.rung; y < l.top + l.rail - 0.05; y += LADDER.rung) rungs.push(y);
  return { rails, rungs, across: [sx, sz] as const };
}
