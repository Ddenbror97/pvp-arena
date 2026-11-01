import { describe, expect, it } from "vitest";
import { createMatch, startMatch, stepMatch, TICK_MS } from "../src/lib/fps/simulation";
import {
  canSeeOpponent,
  REVEAL_HOLD_MS,
  RevealGate,
  revealsOpponent,
  type ViewerMotion,
} from "../src/lib/fps/visibility";
import { REMOTE_DELAY_MS } from "../src/lib/fps/network";
import { traceWorld } from "../src/lib/fps/collision";
import { ARENA, BOXES, PLAYER_RADIUS, eyeHeight } from "../src/lib/fps/map";
import type { Input, MatchState, Seat } from "../src/lib/fps/protocol";

/**
 * Opponent continuity under redaction. Two players roam the real arena (walk, run, sprint,
 * crouch, strafe with free look). The client draws the opponent REMOTE_DELAY_MS + one way
 * behind the server step while its own camera is one way + the server command wait ahead.
 * Ground truth is a dense sample of the drawn operator (boots to head, arms, rifle) from that
 * camera. "Wrongly hidden" frames are frames where part of the operator would be on screen
 * but the server redacted the pose (late pop-ins and early or micro vanishes).
 */
type P = { x: number; y: number; z: number; yaw: number; crouched?: boolean; at: number };

function lerp(h: P[], at: number): P {
  const i = h.findIndex((p) => p.at >= at);
  if (i <= 0) return h[Math.max(0, i)]!;
  const a = h[i - 1]!,
    b = h[i]!,
    t = (at - a.at) / (b.at - a.at);
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
    yaw: b.yaw,
    crouched: b.crouched,
    at,
  };
}
const clearRay = (
  o: { x: number; y: number; z: number },
  t: { x: number; y: number; z: number },
) => {
  const x = t.x - o.x,
    y = t.y - o.y,
    z = t.z - o.z,
    d = Math.hypot(x, y, z);
  return d < 0.01 || !traceWorld(o, { x: x / d, y: y / d, z: z / d }, Math.max(0, d - 0.02));
};
/** Ground truth: any part of the rendered operator (legs, torso, head, rifle) has a line of sight. */
function silhouette(eye: { x: number; y: number; z: number }, e: P) {
  const dx = e.x - eye.x,
    dz = e.z - eye.z,
    l = Math.hypot(dx, dz) || 1;
  const sx = dz / l,
    sz = -dx / l;
  const top = e.crouched ? 1.15 : 1.78;
  for (const h of [0.08, 0.35, 0.65, 0.95, 1.25, 1.5, 1.7].map((h) => (h * top) / 1.78))
    for (const s of [-0.3, 0, 0.3])
      if (clearRay(eye, { x: e.x + sx * s, y: e.y + h, z: e.z + sz * s })) return true;
  // rifle muzzle ahead of the chest
  const fx = -Math.sin(e.yaw),
    fz = -Math.cos(e.yaw);
  for (const f of [0.45, 0.75])
    if (clearRay(eye, { x: e.x + fx * f, y: e.y + top * 0.76, z: e.z + fz * f })) return true;
  return false;
}

type Pt = { x: number; z: number };
const okCell = (x: number, z: number) =>
  !BOXES.some(
    (b) =>
      Math.abs(x - b.x) < b.w / 2 + PLAYER_RADIUS + 0.12 &&
      Math.abs(z - b.z) < b.d / 2 + PLAYER_RADIUS + 0.12,
  );
const C = 0.5,
  NX = Math.floor((ARENA.width / 2 - 0.6) / C),
  NZ = Math.floor((ARENA.depth / 2 - 0.6) / C);
const NODES: Pt[] = [];
for (let i = -NX; i <= NX; i++)
  for (let j = -NZ; j <= NZ; j++) if (okCell(i * C, j * C)) NODES.push({ x: i * C, z: j * C });
const K = (x: number, z: number) => `${Math.round(x / C)},${Math.round(z / C)}`;
const IDX = new Map(NODES.map((p, i) => [K(p.x, p.z), i]));
const EDGES = NODES.map((p) =>
  [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ].flatMap(([a, b]) => {
    const i = IDX.get(K(p.x + a! * C, p.z + b! * C));
    return i === undefined ? [] : [i];
  }),
);
const near = (p: Pt) =>
  NODES.reduce(
    (best, n, i) =>
      Math.hypot(n.x - p.x, n.z - p.z) < Math.hypot(NODES[best]!.x - p.x, NODES[best]!.z - p.z)
        ? i
        : best,
    0,
  );
function bfs(from: Pt, to: number): Pt[] {
  const st = near(from),
    q = [st],
    prev = new Map([[st, -1]]);
  for (let i = 0; i < q.length && !prev.has(to); i++)
    for (const n of EDGES[q[i]!]!)
      if (!prev.has(n)) {
        prev.set(n, q[i]!);
        q.push(n);
      }
  if (!prev.has(to)) return [];
  const out: Pt[] = [];
  let c = to;
  while (c !== st) {
    out.push(NODES[c]!);
    c = prev.get(c)!;
  }
  return out.reverse();
}
function roamer(rnd: () => number) {
  let route: Pt[] = [],
    seq = 0,
    mode = 0,
    look = 0,
    lookUntil = 0,
    modeUntil = 0;
  return (p: { x: number; z: number }, now: number): Input => {
    if (!route.length) route = bfs(p, Math.floor(rnd() * NODES.length));
    while (route.length && Math.hypot(route[0]!.x - p.x, route[0]!.z - p.z) < 0.35) route.shift();
    if (now > modeUntil) {
      mode = Math.floor(rnd() * 5);
      modeUntil = now + 1500 + rnd() * 3000;
    }
    const t = route[0] ?? p,
      th = Math.atan2(-(t.x - p.x), -(t.z - p.z));
    if (now > lookUntil) {
      look = th + (rnd() - 0.5) * 2.4;
      lookUntil = now + 400 + rnd() * 1200;
    }
    const psi = mode === 4 ? look : th,
      rel = th - psi;
    return {
      v: 1,
      type: "input",
      combatVersion: 2,
      seq: ++seq,
      forward: route.length ? Math.cos(rel) : 0,
      strafe: route.length ? -Math.sin(rel) : 0,
      yaw: psi,
      pitch: 0,
      fire: false,
      reload: false,
      weapon: "rifle",
      jump: false,
      sprint: mode === 1,
      walk: mode === 2,
      crouch: mode === 3,
    } as Input;
  };
}

function simulate(rtt: number, serverDelay: number, seconds: number, seed: number, strict = false) {
  let r = seed;
  const rnd = () => (r = (r * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  const s = createMatch({ A: "a", B: "b" }, 13, 0);
  startMatch(s, 0);
  const moveA = roamer(rnd),
    moveB = roamer(rnd),
    gate = new RevealGate();
  const hA: P[] = [],
    hB: P[] = [],
    flags: Array<{ at: number; v: boolean }> = [];
  const end = 3500 + seconds * 1000,
    aheadMs = Math.min(280, rtt + REMOTE_DELAY_MS) + serverDelay;
  for (let now = 0; now < end; now += TICK_MS) {
    if (s.phase === "live") s.phaseEndsAt = now + 60000;
    stepMatch(s, { A: moveA(s.players.A, now), B: moveB(s.players.B, now) }, now, TICK_MS);
    s.players.A.hp = s.players.B.hp = 100;
    const pa = s.players.A,
      pb = s.players.B;
    hA.push({ x: pa.x, y: pa.y, z: pa.z, yaw: pa.yaw, crouched: !!pa.crouched, at: now });
    hB.push({ x: pb.x, y: pb.y, z: pb.z, yaw: pb.yaw, crouched: !!pb.crouched, at: now });
    if (s.phase !== "live") continue;
    // Same motion estimate as the runtime: displacement over the last three steps.
    const before = hA[Math.max(0, hA.length - 4)]!,
      dt = now - before.at;
    const motion: ViewerMotion = {
      vx: dt > 0 ? (pa.x - before.x) / dt : 0,
      vz: dt > 0 ? (pa.z - before.z) / dt : 0,
      aheadMs,
    };
    flags.push({
      at: now,
      v: strict ? canSeeOpponent(s, "A") : gate.update(s, now, { A: motion }).A,
    });
  }
  const lag = rtt / 2 + REMOTE_DELAY_MS,
    lead = rtt / 2 + serverDelay;
  let frames = 0,
    onScreen = 0,
    wronglyHidden = 0,
    leaked = 0,
    run = 0,
    shortRuns = 0;
  let f = 0;
  for (let T = 4500; T < end - 400; T += 1000 / 60) {
    const eAt = T - lag;
    while (f + 1 < flags.length && flags[f + 1]!.at <= eAt) f++;
    if (!flags[f] || flags[f]!.at > eAt) continue;
    frames++;
    const cam = lerp(hA, T + lead),
      truth = silhouette({ x: cam.x, y: cam.y + eyeHeight(cam), z: cam.z }, lerp(hB, eAt)),
      drawn = flags[f]!.v;
    if (truth) onScreen++;
    if (truth && !drawn) {
      wronglyHidden++;
      run++;
    } else {
      if (run && run * (1000 / 60) < 250) shortRuns++;
      run = 0;
    }
    if (drawn && !truth) leaked++;
  }
  const minutes = (end - 4900) / 60000;
  return {
    wronglyHiddenOfOnScreen: wronglyHidden / onScreen,
    shortVanishesPerMinute: shortRuns / minutes,
    leakedOfFrames: leaked / frames,
  };
}

describe("opponent stays drawn while any part of it is on screen", () => {
  it("roaming at 135 ms RTT: wrongly hidden frames drop from ~18% to under 2%", () => {
    const seeds = [1, 2],
      avg = (rows: ReturnType<typeof simulate>[], k: keyof ReturnType<typeof simulate>) =>
        rows.reduce((n, row) => n + row[k], 0) / rows.length;
    const strict = seeds.map((seed) => simulate(135, 100, 60, seed, true)),
      gated = seeds.map((seed) => simulate(135, 100, 60, seed));
    // The previous rule (strict sight test from the current server position) for reference.
    expect(avg(strict, "wronglyHiddenOfOnScreen")).toBeGreaterThan(0.1);
    expect(avg(gated, "wronglyHiddenOfOnScreen")).toBeLessThan(0.02);
    expect(avg(gated, "shortVanishesPerMinute")).toBeLessThan(
      avg(strict, "shortVanishesPerMinute") / 2,
    );
    // Early reveal is bounded: a pose behind cover (invisible on an honest client) is sent in
    // well under a fifth of frames.
    expect(avg(gated, "leakedOfFrames")).toBeLessThan(0.2);
  }, 120_000);
});

describe("reveal rule", () => {
  const live = () => {
    const s = createMatch({ A: "a", B: "b" }, 5, 0);
    s.phase = "live";
    return s;
  };
  it("is never stricter than the sight test, and agrees on clear lanes and deep cover", () => {
    const s = live();
    let r = 11;
    const rnd = () => (r = (r * 1664525 + 1013904223) >>> 0) / 2 ** 32;
    for (let i = 0; i < 1500; i++) {
      Object.assign(s.players.A, { x: rnd() * 36 - 18, z: rnd() * 28 - 14, crouched: rnd() < 0.2 });
      Object.assign(s.players.B, {
        x: rnd() * 36 - 18,
        z: rnd() * 28 - 14,
        crouched: rnd() < 0.2,
        yaw: rnd() * 6.28,
      });
      if (canSeeOpponent(s, "A")) expect(revealsOpponent(s, "A")).toBe(true);
      // The drawn operator (dense ground truth) from the same viewpoint is never hidden.
      const a = s.players.A;
      if (silhouette({ x: a.x, y: a.y + eyeHeight(a), z: a.z }, { ...s.players.B, at: 0 }))
        expect(revealsOpponent(s, "A")).toBe(true);
    }
    // Either side of the central tarp stack, standing still: still redacted.
    Object.assign(s.players.A, { x: 0, z: 4, crouched: false });
    Object.assign(s.players.B, { x: 0, z: -4, crouched: false });
    expect(revealsOpponent(s, "A")).toBe(false);
    expect(revealsOpponent(s, "B")).toBe(false);
    // A crouched target behind the courtyard low wall stays hidden.
    Object.assign(s.players.A, { x: -8.3, z: -4.5 });
    Object.assign(s.players.B, { x: -8.3, z: -8.3, crouched: true });
    expect(revealsOpponent(s, "A")).toBe(false);
  });
  it("reveals ahead of a moving viewer's peek, within the latency window only", () => {
    const s = live();
    Object.assign(s.players.A, { x: 1.5, z: 4 });
    Object.assign(s.players.B, { x: 1.5, z: -4 });
    expect(canSeeOpponent(s, "A")).toBe(false);
    expect(revealsOpponent(s, "A")).toBe(false);
    // Running east toward the stack's edge; the client camera is 350 ms ahead.
    expect(revealsOpponent(s, "A", { vx: 0.005, vz: 0, aheadMs: 350 })).toBe(true);
    // Same velocity, no latency: nothing to anticipate.
    expect(revealsOpponent(s, "A", { vx: 0.005, vz: 0, aheadMs: 0 })).toBe(false);
    // A teleport-sized velocity is clamped to sprint speed, the window to 450 ms.
    expect(revealsOpponent(s, "A", { vx: 1, vz: 0, aheadMs: 20 })).toBe(false);
  });
  it("holds a reveal briefly after the sight line closes, and resets per round", () => {
    const s = live(),
      gate = new RevealGate();
    Object.assign(s.players.A, { x: 0, z: -2.4 });
    Object.assign(s.players.B, { x: 0, z: -8.4 });
    expect(gate.update(s, 1000, {}).A).toBe(true);
    Object.assign(s.players.A, { x: 0, z: 4 });
    Object.assign(s.players.B, { x: 0, z: -4 });
    expect(gate.update(s, 1000 + REVEAL_HOLD_MS, {}).A).toBe(true);
    expect(gate.update(s, 1000 + REVEAL_HOLD_MS + 34, {}).A).toBe(false);
    Object.assign(s.players.A, { x: 0, z: -2.4 });
    Object.assign(s.players.B, { x: 0, z: -8.4 });
    gate.update(s, 2000, {});
    Object.assign(s.players.A, { x: 0, z: 4 });
    Object.assign(s.players.B, { x: 0, z: -4 });
    s.round++;
    expect(gate.update(s, 2034, {}).A).toBe(false);
  });
});
