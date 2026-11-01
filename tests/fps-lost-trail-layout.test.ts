import { describe, expect, it } from "vitest";
import { writeFileSync, mkdirSync } from "node:fs";
import { EYE_HEIGHT, PLAYER_RADIUS, STEP_HEIGHT } from "../src/lib/fps/map";
import { getMap } from "../src/lib/fps/maps/registry";
import {
  createMatch,
  isMovementBlocked,
  predictMovement,
  startMatch,
  stepMatch,
  MOVE_SPEED,
  TICK_MS,
  type Input,
  type Player,
} from "../src/lib/fps/simulation";
import { traceWorld } from "../src/lib/fps/collision";
import { createPracticeBot } from "../src/lib/fps/practice-bot";

/**
 * LOST TRAIL competitive validation with the shipped movement, collision and visibility code.
 * Prints metrics (and writes art/blender/lost-trail/build/validation.json for the report plot).
 */
const MAP = getMap("lost-trail");
type P = { x: number; z: number; y?: number };
const metrics: Record<string, unknown> = {};

/** Same sampling as canSeeOpponent: head top, eye, chest × centre and both sides. */
function sees(a: P, b: P) {
  const o = { x: a.x, y: (a.y ?? 0) + EYE_HEIGHT, z: a.z };
  const dx = b.x - a.x,
    dz = b.z - a.z,
    len = Math.hypot(dx, dz) || 1;
  const sx = (dz / len) * PLAYER_RADIUS * 0.9,
    sz = (-dx / len) * PLAYER_RADIUS * 0.9;
  for (const h of [EYE_HEIGHT + 0.1, EYE_HEIGHT, EYE_HEIGHT * 0.55])
    for (const side of [-1, 0, 1]) {
      const x = b.x + sx * side - o.x,
        y = (b.y ?? 0) + h - o.y,
        z = b.z + sz * side - o.z,
        d = Math.hypot(x, y, z);
      if (!traceWorld(o, { x: x / d, y: y / d, z: z / d }, d - 0.025, MAP)) return true;
    }
  return false;
}

// ---------------------------------------------------------------- height-aware walk graph
const CELL = 0.5;
type Cell = { x: number; z: number; y: number };
const cells: Cell[] = [];
const index = new Map<string, number>();
const key = (i: number, j: number) => `${i},${j}`;
const halfW = MAP.arena.width / 2,
  halfD = MAP.arena.depth / 2;
for (let i = Math.ceil(-halfW / CELL); i <= Math.floor(halfW / CELL); i++)
  for (let j = Math.ceil(-halfD / CELL); j <= Math.floor(halfD / CELL); j++) {
    const x = i * CELL,
      z = j * CELL;
    // Standing height: the highest box top under the feet that is low enough to stand on.
    let y = 0;
    for (const b of MAP.boxes)
      if (
        // Supported like the engine: any box top within the player radius (stairs step-up).
        Math.abs(x - b.x) < b.w / 2 + PLAYER_RADIUS &&
        Math.abs(z - b.z) < b.d / 2 + PLAYER_RADIUS &&
        b.y + b.h / 2 <= 1.6 &&
        b.y + b.h / 2 > y
      )
        y = b.y + b.h / 2;
    if (!isMovementBlocked(x, y, z, false, MAP)) {
      index.set(key(i, j), cells.length);
      cells.push({ x, z, y });
    }
  }
const cellAt = (p: P) => {
  let best = -1,
    d = Infinity;
  for (let n = 0; n < cells.length; n++) {
    const c = cells[n]!,
      e = Math.hypot(c.x - p.x, c.z - p.z) + Math.abs(c.y - (p.y ?? c.y)) * 2;
    if (e < d) {
      d = e;
      best = n;
    }
  }
  return best;
};
/** Dijkstra path length (m) from `start` over 8-connected cells: step up ≤ 0.35 m, drop any. */
function distances(start: P) {
  const dist = new Float64Array(cells.length).fill(Infinity);
  const s = cellAt(start);
  dist[s] = 0;
  const open = new Set([s]);
  while (open.size) {
    let u = -1,
      best = Infinity;
    for (const n of open)
      if (dist[n]! < best) {
        best = dist[n]!;
        u = n;
      }
    open.delete(u);
    const c = cells[u]!,
      i = Math.round(c.x / CELL),
      j = Math.round(c.z / CELL);
    for (const [di, dj] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ] as const) {
      const v = index.get(key(i + di, j + dj));
      if (v === undefined) continue;
      const n = cells[v]!;
      if (n.y - c.y > STEP_HEIGHT + 1e-6) continue;
      // Diagonals must not cut a blocked corner.
      if (di && dj && (!index.has(key(i + di, j)) || !index.has(key(i, j + dj)))) continue;
      const w = CELL * Math.hypot(di, dj);
      if (dist[u]! + w < dist[v]!) {
        dist[v] = dist[u]! + w;
        open.add(v);
      }
    }
  }
  return dist;
}

const EAST = -Math.PI / 2;
function walk(start: P, waypoints: P[], ticks = 600) {
  const p = { ...createMatch({ A: "a", B: "b" }, 5, 0, 2, MAP.id).players.A } as Player;
  Object.assign(p, { x: start.x, z: start.z, y: 0, velocityY: 0 });
  let i = 0;
  for (let t = 0; t < ticks; t++) {
    const target = waypoints[i]!;
    if (Math.hypot(target.x - p.x, target.z - p.z) < 0.3) {
      if (++i === waypoints.length) return { seconds: (t * TICK_MS) / 1000, end: { ...p } };
      continue;
    }
    const input: Input = {
      v: 1,
      type: "input",
      combatVersion: 2,
      seq: t + 1,
      forward: 1,
      strafe: 0,
      yaw: Math.atan2(-(target.x - p.x), -(target.z - p.z)),
      pitch: 0,
      weapon: "rifle",
      fire: false,
      reload: false,
      jump: false,
      sprint: false,
      crouch: false,
    };
    predictMovement(p, input, TICK_MS, MAP);
  }
  return { seconds: Infinity, end: { ...p } };
}

// Routes from spawn A (west). B walks the mirror image.
const SPAWN_A = { x: MAP.spawns.A.x, z: MAP.spawns.A.z };
const ROUTES: Record<string, P[]> = {
  "A bridge": [
    { x: -17, z: 4.3 },
    { x: -13.5, z: 4.4 },
    { x: -8, z: 3.2 },
    { x: -5.6, z: 2.6 },
    { x: -3.4, z: 1.15 },
    { x: 0, z: 1.15 },
  ],
  "B ridge post": [
    { x: -17, z: -4.3 },
    { x: -16.6, z: -5.2 },
    { x: -16.6, z: -11.5 },
    { x: -9.6, z: -11.5 },
  ],
  "B north crossing": [
    { x: -17, z: -4.3 },
    { x: -16.6, z: -5.2 },
    { x: -16.6, z: -14.3 },
    { x: -9, z: -14.3 },
    { x: -4, z: -14.3 },
    { x: 0, z: -14 },
  ],
  "C ford": [
    { x: -17, z: 4.3 },
    { x: -16.6, z: 7.5 },
    { x: -16.6, z: 12.4 },
    { x: -8.2, z: 12.6 },
    { x: -5, z: 12.6 },
    { x: -2, z: 10.3 },
    { x: 0, z: 10.3 },
  ],
};

describe("LOST TRAIL layout", () => {
  it("is mirrored across x = 0 (identical cover and barriers for both spawns)", () => {
    for (const b of [...MAP.boxes, ...MAP.barriers])
      expect(
        [...MAP.boxes, ...MAP.barriers].some(
          (m) =>
            Math.abs(m.x + b.x) < 1e-6 &&
            m.z === b.z &&
            m.w === b.w &&
            m.d === b.d &&
            m.h === b.h &&
            m.y === b.y,
        ),
        b.id,
      ).toBe(true);
    expect(MAP.spawns.A.x).toBe(-MAP.spawns.B.x);
    metrics["gameplayBoxes"] = MAP.boxes.length;
    metrics["barriers"] = MAP.barriers.length;
  });

  it("has no line of sight between the spawn pads", () => {
    const pad = (sx: number) => {
      const pts: P[] = [];
      for (let x = -1.6; x <= 1.6; x += 0.4)
        for (let z = -2.8; z <= 2.8; z += 0.4)
          if (!isMovementBlocked(sx + x, 0, z, false, MAP)) pts.push({ x: sx + x, z });
      return pts;
    };
    const A = pad(MAP.spawns.A.x),
      B = pad(MAP.spawns.B.x);
    let visible = 0;
    for (const a of A) for (const b of B) if (sees(a, b)) visible++;
    metrics["spawnPairsChecked"] = A.length * B.length;
    metrics["spawnPairsVisible"] = visible;
    expect(A.length).toBeGreaterThan(50);
    expect(visible).toBe(0);
  });

  const fromA = distances(SPAWN_A);
  const mirrorIndex = cells.map((c) =>
    index.get(key(Math.round(-c.x / CELL), Math.round(c.z / CELL))),
  );

  it("reaches every route, crossing, the ridge and the post on foot", () => {
    const reach: Record<string, number> = {};
    for (const [name, p] of Object.entries({
      bridge: { x: 0, z: 1.15, y: 0 },
      "north crossing": { x: 0, z: -14, y: 0 },
      ford: { x: 0, z: 10.3, y: 0 },
      ridge: { x: -13, z: -11.5, y: 1.5 },
      post: { x: -9.6, z: -10.8, y: 1.5 },
      "enemy spawn": { x: 20, z: 0, y: 0 },
    })) {
      const c = cellAt(p);
      expect(Math.abs(cells[c]!.y - p.y)).toBeLessThan(0.01);
      reach[name] = +fromA[c]!.toFixed(1);
      expect(Number.isFinite(fromA[c]!), name).toBe(true);
    }
    metrics["shortestPathM"] = reach;
  });

  it("walks the routes with the real movement code", () => {
    const times: Record<string, number> = {};
    for (const [name, route] of Object.entries(ROUTES)) {
      const { seconds, end } = walk(SPAWN_A, route);
      expect(seconds, name).toBeLessThan(Infinity);
      times[name] = +seconds.toFixed(2);
      if (name === "B ridge post") expect(end.y).toBeCloseTo(1.5, 6);
    }
    metrics["walkSeconds"] = times;
  });

  it("first contact between the two spawns takes 3–5 s of running", () => {
    // Both players run (5 m/s) along shortest paths from their spawns; contact is the first
    // moment some reachable pair of positions has a line of sight.
    let contact: { seconds: number; a: Cell; b: Cell } | null = null;
    const order = cells
      .map((c, n) => ({ n, d: fromA[n]! }))
      .filter((c) => Number.isFinite(c.d))
      .sort((a, b) => a.d - b.d);
    for (let k = 0; k < order.length && !contact; k++) {
      // Cell k joins A's frontier; pair it with every B cell no farther than it.
      const a = cells[order[k]!.n]!,
        limit = order[k]!.d;
      for (let m = 0; m <= k; m++) {
        const mirror = mirrorIndex[order[m]!.n];
        if (mirror === undefined) continue;
        const b = cells[mirror]!;
        if (sees({ ...a }, { ...b }) || sees({ ...b }, { ...a })) {
          contact = { seconds: limit / MOVE_SPEED, a, b };
          break;
        }
      }
    }
    expect(contact).not.toBeNull();
    metrics["firstContact"] = {
      seconds: +contact!.seconds.toFixed(2),
      a: contact!.a,
      b: contact!.b,
      distanceM: +Math.hypot(contact!.a.x - contact!.b.x, contact!.a.z - contact!.b.z).toFixed(1),
    };
    expect(contact!.seconds).toBeGreaterThanOrEqual(2.8);
    expect(contact!.seconds).toBeLessThanOrEqual(5.2);
  }, 300_000);

  it("measures the observation post's view and the longest lane sightlines", () => {
    const post = { x: -9.6, z: -10.8, y: 1.5 };
    const zones: Record<string, [number, number, number, number]> = {
      bridge: [-2.6, 2.6, -1.7, 1.7],
      "west plaza": [-15.6, -2.6, -5.2, 5.2],
      "east plaza": [2.6, 15.6, -5.2, 5.2],
      ford: [-2.6, 2.6, 9.4, 15.2],
    };
    const view: Record<string, string> = {};
    for (const [name, [x0, x1, z0, z1]] of Object.entries(zones)) {
      const inside = cells.filter((c) => c.x > x0 && c.x < x1 && c.z > z0 && c.z < z1 && !c.y);
      const seen = inside.filter((c) => sees(post, c)).length;
      view[name] = `${Math.round((100 * seen) / Math.max(1, inside.length))}%`;
    }
    metrics["postViewOfArea"] = view;
    // The two posts can't duel each other across the river (the river tree blocks it).
    expect(sees(post, { x: 9.6, z: -10.8, y: 1.5 })).toBe(false);
  });

  it("the practice bot patrols LOST TRAIL without leaving open ground", () => {
    let r = 11;
    const random = () => (r = (r * 16807) % 2147483647) / 2147483647;
    const bot = createPracticeBot(random);
    const routes = new Set<string>();
    let state = createMatch({ A: "a", B: "b" }, 13, 0, 2, MAP.id),
      now = 0,
      travelled = 0;
    startMatch(state, 0);
    for (let i = 0; i < 1800; i++) {
      const before = { ...state.players.B };
      // A stays home; the bot never sees it from its patrol until it sweeps the spawn.
      stepMatch(state, { B: bot.input(state, (now += TICK_MS)) }, now, TICK_MS);
      const b = state.players.B;
      travelled += Math.hypot(b.x - before.x, b.z - before.z);
      expect(isMovementBlocked(b.x, b.y, b.z, !!b.crouched, MAP)).toBe(false);
      routes.add(bot.plan().opening);
      if (state.phase === "round-end") {
        state = createMatch({ A: "a", B: "b" }, 13, 0, 2, MAP.id);
        startMatch(state, (now = 0));
      }
    }
    metrics["botTravelledM"] = Math.round(travelled);
    expect(travelled).toBeGreaterThan(60);
    mkdirSync("art/blender/lost-trail/build", { recursive: true });
    writeFileSync("art/blender/lost-trail/build/validation.json", JSON.stringify(metrics, null, 1));
    console.log("LOST TRAIL METRICS " + JSON.stringify(metrics));
  });
});
