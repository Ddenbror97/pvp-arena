import { describe, expect, it } from "vitest";

/**
 * CROSSFIRE competitive validation with the real movement, collision, visibility and
 * practice-bot code, run against getMap("crossfire") exactly as a CROSSFIRE match runs them.
 * The layout is point-symmetric (every solid has a twin rotated 180° about the origin, except
 * the wreck's model-fitted nose and rear), so spawn B walks the 180° twin of every spawn-A route. Checks: point symmetry, spawn safety,
 * routes and timings, first contact, terrace stairs and the terrace's reach, the enterable
 * helicopter cabin, openings, the longest sightline, bot routes and server redaction. Metrics
 * are printed for the report (CROSSFIRE METRICS).
 */
import { EYE_HEIGHT, PLAYER_RADIUS, STEP_HEIGHT } from "../src/lib/fps/map";
import { getMap } from "../src/lib/fps/maps/registry";
import {
  createMatch,
  predictMovement,
  TICK_MS,
  MOVE_SPEED,
  isMovementBlocked,
} from "../src/lib/fps/simulation";
import { traceWorld } from "../src/lib/fps/collision";
import { canSeeOpponent, revealsOpponent } from "../src/lib/fps/visibility";
import { botItinerary } from "../src/lib/fps/practice-bot";
import type { Input, MatchState, Player } from "../src/lib/fps/protocol";

const M = getMap("crossfire");
type P = { x: number; z: number };
const metrics: Record<string, unknown> = {};
const blockedAt = (x: number, y: number, z: number) => isMovementBlocked(x, y, z, false, M);
const eye = (p: P, y = 0) => ({ x: p.x, y: y + EYE_HEIGHT, z: p.z });
const sees = (a: P & { y?: number }, b: P & { y?: number }) => {
  const o = eye(a, a.y ?? 0);
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
      if (!traceWorld(o, { x: x / d, y: y / d, z: z / d }, d - 0.025, M)) return true;
    }
  return false;
};

function walk(start: Player, waypoints: P[], sprint: boolean, ticks: number) {
  const p = { ...start, y: 0, velocityY: 0 } as Player;
  const track: { x: number; y: number; z: number }[] = [];
  let i = 0,
    seq = 0;
  for (let t = 0; t < ticks; t++) {
    const target = waypoints[Math.min(i, waypoints.length - 1)]!;
    if (Math.hypot(target.x - p.x, target.z - p.z) < 0.25 && i < waypoints.length - 1) i++;
    const done = i === waypoints.length - 1 && Math.hypot(target.x - p.x, target.z - p.z) < 0.25;
    const yaw = Math.atan2(-(target.x - p.x), -(target.z - p.z));
    const input: Input = {
      v: 1,
      type: "input",
      combatVersion: 2,
      seq: ++seq,
      forward: done ? 0 : 1,
      strafe: 0,
      yaw,
      pitch: 0,
      weapon: "rifle",
      fire: false,
      reload: false,
      jump: false,
      sprint,
      crouch: false,
    };
    predictMovement(p, input, TICK_MS, M);
    track.push({ x: p.x, y: p.y, z: p.z });
  }
  return track;
}

const twin = (route: P[]) => route.map((p) => ({ x: -p.x, z: -p.z }));
/** Routes from spawn A; spawn B walks the 180° twin. */
const ROUTES: Record<string, P[]> = {
  // Through the yard gate into the crash square (south of the wreck).
  gate: [
    { x: -18.4, z: 3.2 },
    { x: -15.2, z: 3.4 },
    { x: -14.15, z: 5.1 },
    { x: -11.0, z: 5.1 },
    { x: -9.6, z: 2.8 },
    { x: -5.0, z: 2.6 },
  ],
  // South into the market alley, east along it, then north through a connector.
  alley: [
    { x: -22.5, z: 9.6 },
    { x: -22.5, z: 13.6 },
    { x: -11.6, z: 13.6 },
    { x: -7.0, z: 12.8 },
    { x: -7.0, z: 8.0 },
  ],
  // Through the residential block (south door, east door) into the west street.
  interior: [
    { x: -19.2, z: 3.0 },
    { x: -19.2, z: -0.6 },
    { x: -16.0, z: -0.8 },
    { x: -13.4, z: -0.8 },
    { x: -13.4, z: 1.9 },
    { x: -9.0, z: 1.9 },
  ],
  // Interior, west street, the stairs and onto the roof terrace.
  terrace: [
    { x: -19.2, z: 3.0 },
    { x: -19.2, z: -0.6 },
    { x: -16.0, z: -0.8 },
    { x: -13.3, z: -1.2 },
    { x: -13.3, z: -3.0 },
    { x: -13.3, z: -9.6 },
    { x: -15.0, z: -11.5 },
  ],
};
/** Into the enemy half: past the wreck's tail end, through the enemy gate into their yard. */
const PUSH: P[] = [
  { x: 6.9, z: 3.0 },
  { x: 7.4, z: 2.0 },
  { x: 7.4, z: -1.6 },
  { x: 10.8, z: -3.0 },
  { x: 13.0, z: -5.1 },
  { x: 14.15, z: -5.1 },
  { x: 17.0, z: -3.4 },
];
/** Full traversals for first contact: each route, then a push into the enemy half. */
const CONTACT: Record<string, P[]> = {
  gate: [...ROUTES["gate"]!, { x: -5.0, z: 3.0 }, ...PUSH],
  alley: [...ROUTES["alley"]!, { x: -4.5, z: 7.2 }, { x: -4.0, z: 3.0 }, ...PUSH],
  interior: [...ROUTES["interior"]!, { x: -7.2, z: 3.0 }, ...PUSH],
  north: [
    ...ROUTES["interior"]!.slice(0, 4),
    { x: -13.4, z: -2.8 },
    { x: -12.0, z: -4.3 },
    { x: -6.8, z: -4.3 },
    { x: 5.0, z: -3.6 },
    { x: 10.8, z: -3.0 },
    ...PUSH.slice(4),
  ],
};
const pathLength = (start: P, route: P[]) =>
  route.reduce(
    (s, p, i) =>
      s + Math.hypot(p.x - (i ? route[i - 1]! : start).x, p.z - (i ? route[i - 1]! : start).z),
    0,
  );

describe("CROSSFIRE urban aim arena layout", () => {
  const match = createMatch({ A: "a", B: "b" }, 5, 0, undefined, "crossfire");

  it("is a registered 48 × 40 m map with two spawns 180° apart", () => {
    expect(M.arena).toEqual({ width: 48, depth: 40 });
    expect(M.spawns.A.x).toBeCloseTo(-M.spawns.B.x);
    expect(M.spawns.A.z).toBeCloseTo(-M.spawns.B.z);
    expect([match.players.A.x, match.players.A.z]).toEqual([M.spawns.A.x, M.spawns.A.z]);
    for (const s of Object.values(M.spawns)) expect(blockedAt(s.x, 0, s.z)).toBe(false);
    for (const b of M.worldSolids) expect(["concrete", "metal", "wood"]).toContain(b.surface);
  });

  it("is point-symmetric: every solid has an identical twin rotated 180°", () => {
    const all = [...M.boxes, ...M.structures];
    // The wreck's nose and closed rear are fitted to the Mi-8 model (fit_heli.py), which is not
    // symmetric end to end: those boxes are exempt, but the two ends must stay comparable.
    const fitted = /^heli-(nose|rear)-/;
    const end = (prefix: string) => all.filter((b) => b.id.startsWith(prefix));
    const volume = (bs: typeof all) => bs.reduce((v, b) => v + b.w * b.d * b.h, 0);
    const reach = (bs: typeof all) => Math.max(...bs.map((b) => Math.abs(b.x) + b.w / 2));
    const nose = end("heli-nose-"),
      rear = end("heli-rear-");
    expect(nose.length).toBeGreaterThan(4);
    expect(rear.length).toBeGreaterThan(4);
    expect(Math.abs(volume(nose) - volume(rear)) / volume(nose)).toBeLessThan(0.3);
    expect(Math.abs(reach(nose) - reach(rear))).toBeLessThan(0.5);
    for (const b of all.filter((b) => !fitted.test(b.id)))
      expect(
        all.some(
          (m) =>
            Math.abs(m.x + b.x) < 1e-6 &&
            Math.abs(m.z + b.z) < 1e-6 &&
            m.w === b.w &&
            m.d === b.d &&
            m.h === b.h &&
            m.y === b.y,
        ),
        b.id,
      ).toBe(true);
  });

  it("has no line of sight between any points of the two spawn pads", () => {
    const pad = (s: P) => {
      const pts: P[] = [];
      for (let x = -1.6; x <= 1.6; x += 0.4)
        for (let z = -2.4; z <= 2.4; z += 0.4) pts.push({ x: s.x + x, z: s.z + z });
      return pts.filter((p) => !blockedAt(p.x, 0, p.z));
    };
    const A = pad(M.spawns.A),
      B = pad(M.spawns.B);
    let visible = 0;
    for (const a of A) for (const b of B) if (sees(a, b)) visible++;
    metrics["spawnPadPairsChecked"] = A.length * B.length;
    metrics["spawnPadPairsVisible"] = visible;
    expect(A.length).toBeGreaterThan(40);
    expect(visible).toBe(0);
  });

  it("walks every route with the real movement code", () => {
    const lengths: Record<string, number> = {},
      times: Record<string, number> = {};
    for (const [name, route] of Object.entries(ROUTES)) {
      const a = pathLength(M.spawns.A, route),
        b = pathLength(M.spawns.B, twin(route));
      expect(a).toBeCloseTo(b, 6);
      lengths[name] = +a.toFixed(1);
      const track = walk(match.players.A, route, false, 600);
      const end = route.at(-1)!;
      const arrive = track.findIndex((p) => Math.hypot(p.x - end.x, p.z - end.z) < 0.3);
      expect(arrive, name).toBeGreaterThan(0);
      times[name] = +((arrive * TICK_MS) / 1000).toFixed(2);
    }
    metrics["routeLengthM"] = lengths;
    metrics["walkSecondsToRouteEnd"] = times;
  });

  it("climbs the stairs onto the roof terrace (3 m) by walking", () => {
    const track = walk(match.players.A, ROUTES["terrace"]!, false, 600);
    expect(track.at(-1)!.y).toBeCloseTo(3.0, 5);
    expect(STEP_HEIGHT).toBeGreaterThanOrEqual(0.3);
  });

  it("the helicopter cabin is enterable: in through one door, out through the other", () => {
    const track = walk(
      { ...match.players.A, x: 2.2, z: -4 } as Player,
      [
        { x: 2.2, z: -2.2 },
        { x: 2.2, z: -0.6 },
        { x: -2.2, z: -0.6 },
        { x: -2.2, z: 2.4 },
        { x: -2.2, z: 4 },
      ],
      false,
      300,
    );
    expect(Math.hypot(track.at(-1)!.x + 2.2, track.at(-1)!.z - 4)).toBeLessThan(0.3);
    expect(Math.max(...track.map((p) => p.y))).toBe(0);
  });

  it("first contact happens after about 3–6 seconds", () => {
    const pairs: Record<string, number | null> = {};
    const names = Object.keys(CONTACT);
    for (const sprint of [false, true])
      for (const a of names)
        for (const b of names) {
          const ta = walk(match.players.A, CONTACT[a]!, sprint, 300),
            tb = walk(match.players.B, twin(CONTACT[b]!), sprint, 300);
          let contact: number | null = null;
          for (let t = 0; t < 300; t++) {
            const state = {
              phase: "live",
              mapId: "crossfire",
              players: {
                A: { ...match.players.A, ...ta[t]! },
                B: { ...match.players.B, ...tb[t]! },
              },
            } as unknown as MatchState;
            if (canSeeOpponent(state, "A")) {
              contact = +((t * TICK_MS) / 1000).toFixed(2);
              if (process.env["DEBUG_CONTACT"])
                console.log(
                  "CONTACT",
                  a,
                  b,
                  sprint,
                  contact,
                  JSON.stringify(ta[t]),
                  JSON.stringify(tb[t]),
                );
              break;
            }
          }
          pairs[`${a}-${b}${sprint ? "-sprint" : "-walk"}`] = contact;
        }
    metrics["firstContactSeconds"] = pairs;
    const walking = Object.entries(pairs).filter(([k, v]) => k.endsWith("-walk") && v !== null);
    expect(walking.length).toBeGreaterThan(0);
    for (const [k, v] of walking) expect(v!, k).toBeGreaterThan(2.5);
  });

  it("the roof terrace sees part of the square, not either spawn, and can be seen back", () => {
    const cells: P[] = [];
    for (let x = -11.5; x <= 11.5; x += 1)
      for (let z = -8.5; z <= 8.5; z += 1) if (!blockedAt(x, 0, z)) cells.push({ x, z });
    const deck = { x: -13.0, y: 3.0, z: -9.6 };
    const coverage = cells.filter((c) => sees(deck, c)).length / cells.length;
    const back = cells.filter((c) => sees(c, deck)).length / cells.length;
    const spawnSeen = [M.spawns.A, M.spawns.B].map((s) =>
      [deck, { x: -15.5, y: 3.0, z: -9.6 }, { x: -12.6, y: 3.0, z: -12 }].some((d) => sees(d, s)),
    );
    metrics["terrace"] = {
      squareVisibleFraction: +coverage.toFixed(2),
      squareCellsSeeingIt: +back.toFixed(2),
      seesSpawnA: spawnSeen[0],
      seesSpawnB: spawnSeen[1],
    };
    expect(spawnSeen).toEqual([false, false]);
    expect(coverage).toBeLessThan(0.85);
    expect(back).toBeGreaterThan(0.15);
  });

  it("measures the longest open sightline at standing eye height", () => {
    let best = 0,
      ends = "";
    const pts: P[] = [];
    for (let x = -23.5; x <= 23.5; x += 1.5)
      for (let z = -19.5; z <= 19.5; z += 1.5) if (!blockedAt(x, 0, z)) pts.push({ x, z });
    for (let i = 0; i < pts.length; i++)
      for (let j = i + 1; j < pts.length; j++) {
        const a = pts[i]!,
          b = pts[j]!,
          d = Math.hypot(a.x - b.x, a.z - b.z);
        if (d <= best) continue;
        const dir = { x: (b.x - a.x) / d, y: 0, z: (b.z - a.z) / d };
        if (!traceWorld(eye(a), dir, d, M)) {
          best = d;
          ends = `(${a.x},${a.z})-(${b.x},${b.z})`;
        }
      }
    metrics["longestSightlineM"] = +best.toFixed(1);
    metrics["longestSightlineEnds"] = ends;
    expect(best).toBeLessThan(46);
  });

  it("the practice bot's routes are reachable on CROSSFIRE's ground grid", () => {
    const CELL = 0.5,
      clear = (x: number, z: number) =>
        !M.movementSolids.some(
          (b) =>
            Math.abs(x - b.x) < b.w / 2 + PLAYER_RADIUS + 0.18 &&
            Math.abs(z - b.z) < b.d / 2 + PLAYER_RADIUS + 0.18,
        );
    const key = (x: number, z: number) => `${Math.round(x / CELL)},${Math.round(z / CELL)}`;
    const nodes = new Set<string>();
    const spanX = Math.floor((M.arena.width / 2 - 1) / CELL),
      spanZ = Math.floor((M.arena.depth / 2 - 1) / CELL);
    for (let i = -spanX; i <= spanX; i++)
      for (let j = -spanZ; j <= spanZ; j++)
        if (clear(i * CELL, j * CELL)) nodes.add(key(i * CELL, j * CELL));
    const reach = (start: P) => {
      const seen = new Set([key(start.x, start.z)]),
        queue = [key(start.x, start.z)];
      while (queue.length) {
        const [i, j] = queue.shift()!.split(",").map(Number) as [number, number];
        for (const [di, dj] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const) {
          const k = `${i + di},${j + dj}`;
          if (nodes.has(k) && !seen.has(k)) {
            seen.add(k);
            queue.push(k);
          }
        }
      }
      return seen;
    };
    const fromB = reach(M.spawns.B),
      fromA = reach(M.spawns.A);
    const points = (["center", "north", "south"] as const).flatMap((o) => botItinerary(M, o));
    for (const p of points) {
      expect(fromB.has(key(p.x, p.z)), "east " + JSON.stringify(p)).toBe(true);
      expect(fromA.has(key(-p.x, p.z)), "west " + JSON.stringify(p)).toBe(true);
    }
    metrics["navNodes"] = { crossfire: nodes.size, reachableFromSpawnB: fromB.size };
  });

  it("server reveal (redaction) uses CROSSFIRE's walls", () => {
    const state = {
      phase: "live",
      mapId: "crossfire",
      players: {
        A: { ...match.players.A, x: M.spawns.A.x, z: M.spawns.A.z, y: 0 },
        B: { ...match.players.B, x: M.spawns.B.x, z: M.spawns.B.z, y: 0 },
      },
    } as unknown as MatchState;
    expect(revealsOpponent(state, "A")).toBe(false);
    metrics["moveSpeed"] = { walk: MOVE_SPEED, sprint: MOVE_SPEED * 1.5 };
    console.log("CROSSFIRE METRICS " + JSON.stringify(metrics));
  });
});
