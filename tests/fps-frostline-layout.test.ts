import { describe, expect, it } from "vitest";

/**
 * FROSTLINE competitive validation through the shared map registry: the real movement, collision,
 * visibility and practice-bot code run against getMap("frostline"), passed explicitly (or through
 * the match state's `mapId`), exactly as a FROSTLINE match runs them. Checks: spawn safety, route
 * timings, first contact, stairs and the comms walkway, openings, the walkway's coverage, the
 * longest sightline, bot-route reachability, a full bot series and server redaction. Metrics are
 * printed for the report (FROSTLINE METRICS).
 */
import { EYE_HEIGHT, PLAYER_RADIUS, STEP_HEIGHT } from "../src/lib/fps/map";
import { getMap, MAP_IDS } from "../src/lib/fps/maps/registry";
import {
  createMatch,
  predictMovement,
  startMatch,
  stepMatch,
  TICK_MS,
  MOVE_SPEED,
  isMovementBlocked,
} from "../src/lib/fps/simulation";
import { traceWorld } from "../src/lib/fps/collision";
import { canSeeOpponent, revealsOpponent } from "../src/lib/fps/visibility";
import { botItinerary, createPracticeBot } from "../src/lib/fps/practice-bot";
import type { Input, MatchState, Player } from "../src/lib/fps/protocol";

const M = getMap("frostline");
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

const mirror = (route: P[]) => route.map((p) => ({ x: -p.x, z: p.z }));
/** Routes from spawn A (west); spawn B walks the mirror image. */
const ROUTES: Record<string, P[]> = {
  // Route A, the central courtyard, through the north spawn exit (main) or the south exit.
  main: [
    { x: -15.6, z: -4.2 },
    { x: -11.6, z: -4.2 },
    { x: -9.6, z: -1.2 },
    { x: -5.6, z: -1.4 },
    { x: -3.0, z: -2.6 },
  ],
  mainSouth: [
    { x: -15.6, z: 4.2 },
    { x: -11.6, z: 4.2 },
    { x: -9.8, z: 0.6 },
    { x: -5.6, z: 0.6 },
    { x: -3.0, z: 2.6 },
  ],
  // Route B, upper communications: north alley, corridor, west gate.
  upper: [
    { x: -18.6, z: -4 },
    { x: -18.6, z: -10.6 },
    { x: -12.0, z: -10.6 },
    { x: -12.0, z: -12.4 },
    { x: -8.6, z: -12.4 },
    { x: -7.4, z: -10.4 },
    { x: -7.4, z: -8.4 },
    { x: -3.4, z: -8.4 },
  ],
  // Route C, lower industrial: south alley, corridor, south gate.
  lower: [
    { x: -18.6, z: 4 },
    { x: -18.6, z: 11.2 },
    { x: -8.1, z: 11.2 },
    { x: -8.1, z: 8.2 },
    { x: -3.4, z: 8.2 },
  ],
  // Up the west stairs onto the comms walkway (the one elevated position).
  walkway: [
    { x: -18.6, z: -4 },
    { x: -18.6, z: -10.6 },
    { x: -12.0, z: -10.6 },
    { x: -12.0, z: -12.6 },
    { x: -8.0, z: -12.95 },
    { x: -4.0, z: -12.75 },
    { x: -2.0, z: -12.75 },
  ],
};
const pathLength = (start: P, route: P[]) =>
  route.reduce(
    (s, p, i) =>
      s + Math.hypot(p.x - (i ? route[i - 1]! : start).x, p.z - (i ? route[i - 1]! : start).z),
    0,
  );

describe("FROSTLINE winter aim arena layout", () => {
  const match = createMatch({ A: "a", B: "b" }, 5, 0, undefined, "frostline");

  it("is a registered 40 × 32 m map with two opposing spawns, separate from Dustfront", () => {
    const dust = getMap("dustfront");
    expect(MAP_IDS).toContain("frostline");
    expect(M.id).toBe("frostline");
    expect(M.presentation.modelUrl).toBe("/fps/models/frostline.glb");
    expect(M.arena).toEqual({ width: 40, depth: 32 });
    expect(M.floor.w).toBe(40);
    expect(M.spawns.A.x).toBeCloseTo(-M.spawns.B.x);
    expect(M.spawns.A.z).toBe(M.spawns.B.z);
    // The match carries the map id and spawns players on FROSTLINE's spawns.
    expect(match.mapId).toBe("frostline");
    expect([match.players.A.x, match.players.A.z]).toEqual([M.spawns.A.x, M.spawns.A.z]);
    for (const s of Object.values(M.spawns)) expect(blockedAt(s.x, 0, s.z)).toBe(false);
    // Separate data: FROSTLINE never aliases Dustfront's solids.
    expect(M.boxes).not.toBe(dust.boxes);
    expect(dust.boxes.some((b) => b.id === "tarp-stack")).toBe(true);
    expect(M.boxes.some((b) => b.id === "tarp-stack")).toBe(false);
    // Impact surfaces stay within the engine's set.
    for (const b of M.worldSolids) expect(["concrete", "metal", "wood"]).toContain(b.surface);
  });

  it("mirrors every gameplay solid across x = 0 (identical cover for both spawns)", () => {
    for (const b of [...M.boxes, ...M.structures])
      expect(
        [...M.boxes, ...M.structures].some(
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
  });

  it("has no line of sight between any points of the two spawn pads", () => {
    const pad = (sx: number) => {
      const pts: P[] = [];
      for (let x = -1.6; x <= 1.6; x += 0.4)
        for (let z = -2.8; z <= 2.8; z += 0.4) pts.push({ x: sx + x, z });
      return pts.filter((p) => !blockedAt(p.x, 0, p.z));
    };
    const A = pad(M.spawns.A.x),
      B = pad(M.spawns.B.x);
    let visible = 0;
    for (const a of A) for (const b of B) if (sees(a, b)) visible++;
    metrics["spawnPadPairsChecked"] = A.length * B.length;
    metrics["spawnPadPairsVisible"] = visible;
    expect(A.length).toBeGreaterThan(50);
    expect(visible).toBe(0);
  });

  it("routes have equal lengths from both spawns, and the flanks are short detours", () => {
    const lengths: Record<string, number> = {};
    for (const [name, route] of Object.entries(ROUTES)) {
      const a = pathLength(M.spawns.A, route),
        b = pathLength(M.spawns.B, mirror(route));
      expect(a).toBeCloseTo(b, 6);
      lengths[name] = +a.toFixed(1);
    }
    metrics["routeLengthM"] = lengths;
    expect(lengths["upper"]! / lengths["main"]!).toBeLessThan(2.2);
    expect(lengths["lower"]! / lengths["main"]!).toBeLessThan(2.2);
  });

  it("walks every route with the real movement code without getting stuck", () => {
    const times: Record<string, number> = {};
    for (const [name, route] of Object.entries(ROUTES)) {
      const track = walk(match.players.A, route, false, 500);
      const end = route.at(-1)!;
      const arrive = track.findIndex((p) => Math.hypot(p.x - end.x, p.z - end.z) < 0.3);
      expect(arrive, name).toBeGreaterThan(0);
      times[name] = +((arrive * TICK_MS) / 1000).toFixed(2);
    }
    metrics["walkSecondsToRouteEnd"] = times;
  });

  it("climbs the stairs onto the comms walkway by walking, crosses it and drops back down", () => {
    const track = walk(match.players.A, ROUTES["walkway"]!, false, 500);
    expect(Math.max(...track.map((p) => p.y))).toBeCloseTo(1.5, 5);
    expect(track.at(-1)!.y).toBeCloseTo(1.5, 5);
    expect(STEP_HEIGHT).toBeGreaterThanOrEqual(0.3);
    // Along the walkway to the east stairs and down into the enemy half of the corridor.
    const onTop = track.at(-1)!;
    const across = walk(
      { ...match.players.A, ...onTop } as Player,
      [
        { x: 4.0, z: -12.75 },
        { x: 8.0, z: -12.6 },
      ],
      false,
      200,
    );
    expect(across.at(-1)!.y).toBe(0);
    // The railing and walkway face cannot be walked or jumped onto from the corridor.
    expect(
      Math.max(
        ...walk(
          match.players.A,
          [
            { x: -7.4, z: -8.4 },
            { x: -7.4, z: -10.6 },
            { x: -2, z: -10.6 },
            { x: -2, z: -13 },
          ],
          false,
          400,
        ).map((p) => p.y),
      ),
    ).toBe(0);
  });

  it("keeps every opening at least 1.2 m wide for a 0.7 m player", () => {
    const gaps: [string, P, "x" | "z"][] = [
      ["spawn-exit-north", { x: -14, z: -4.2 }, "x"],
      ["spawn-exit-south", { x: -14, z: 4.2 }, "x"],
      ["alley-north", { x: -18.6, z: -7.2 }, "z"],
      ["alley-south", { x: -18.6, z: 7.2 }, "z"],
      ["gate-north-west", { x: -7.4, z: -9.6 }, "z"],
      ["gate-north-centre", { x: 0, z: -9.6 }, "z"],
      ["gate-south-west", { x: -8.1, z: 9.6 }, "z"],
      ["gate-south-centre", { x: 0, z: 9.6 }, "z"],
      ["walkway-corridor", { x: 0, z: -10.75 }, "x"],
      ["loading-bay", { x: -2.4, z: 14.4 }, "x"],
      ["lower-container", { x: -5, z: 12.7 }, "x"],
    ];
    for (const [name, p, along] of gaps)
      for (const o of [-0.25, 0, 0.25]) {
        // Probe across the opening (perpendicular to travel).
        const ax = along === "z" ? 1 : 0;
        expect(blockedAt(p.x + o * ax, 0, p.z + o * (1 - ax)), name).toBe(false);
      }
  });

  it("first contact happens after about 3–5 seconds", () => {
    const pairs: Record<string, number | null> = {};
    const names = ["main", "mainSouth", "upper", "lower"];
    for (const sprint of [false, true])
      for (const a of names)
        for (const b of names) {
          if (a > b) continue;
          const ta = walk(match.players.A, ROUTES[a]!, sprint, 300),
            tb = walk(match.players.B, mirror(ROUTES[b]!), sprint, 300);
          let contact: number | null = null;
          for (let t = 0; t < 300; t++) {
            const state = {
              phase: "live",
              mapId: "frostline",
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
    expect(pairs["main-main-walk"]).not.toBeNull();
    expect(pairs["main-main-walk"]!).toBeGreaterThan(2.5);
    expect(pairs["main-main-walk"]!).toBeLessThan(5.5);
    expect(pairs["main-main-sprint"]!).toBeGreaterThan(1.6);
  });

  it("the comms walkway is strong but not dominant, and can be seen back", () => {
    const cells: P[] = [];
    for (let x = -11.5; x <= 11.5; x += 1)
      for (let z = -9.0; z <= 9.0; z += 1) if (!blockedAt(x, 0, z)) cells.push({ x, z });
    const coverage = (from: P & { y: number }) =>
      cells.filter((c) => sees(from, c)).length / cells.length;
    const walkway = coverage({ x: -2.0, y: 1.5, z: -12.6 });
    const walkwayEdge = coverage({ x: -4.2, y: 1.5, z: -12.6 });
    const lane = coverage({ x: -11, y: 0, z: -4.2 });
    const south = coverage({ x: 0, y: 0, z: 5 });
    const backSight = cells.filter((c) => sees(c, { x: -2.0, y: 1.5, z: -12.6 })).length;
    metrics["courtyardVisibleFraction"] = {
      walkwayCentre: +walkway.toFixed(2),
      walkwayWestEnd: +walkwayEdge.toFixed(2),
      laneEntry: +lane.toFixed(2),
      courtyardSouth: +south.toFixed(2),
      cellsSeeingWalkway: +(backSight / cells.length).toFixed(2),
    };
    expect(walkway).toBeLessThan(0.85);
    expect(walkway).toBeGreaterThan(0.2);
    // Counter-angles: a large part of the courtyard can shoot back at the walkway.
    expect(backSight / cells.length).toBeGreaterThan(0.2);
    // Crouched behind the railing the player's head (1.05 m + 1.5 m deck) is under the rail top.
    const railing = M.boxes.find((b) => b.id === "walkway-railing")!;
    expect(railing.y + railing.h / 2).toBeGreaterThan(1.5 + 1.05);
    expect(M.structures.every((s) => s.y - s.h / 2 >= 3)).toBe(true);
  });

  it("measures the longest open sightline at standing eye height", () => {
    let best = 0,
      ends = "";
    const pts: P[] = [];
    for (let x = -19.5; x <= 19.5; x += 1.5)
      for (let z = -15.5; z <= 15.5; z += 1.5) if (!blockedAt(x, 0, z)) pts.push({ x, z });
    for (let i = 0; i < pts.length; i++)
      for (let j = i + 1; j < pts.length; j++) {
        const a = pts[i]!,
          b = pts[j]!,
          d = Math.hypot(a.x - b.x, a.z - b.z);
        if (d <= best) continue;
        const o = eye(a),
          dir = { x: (b.x - a.x) / d, y: 0, z: (b.z - a.z) / d };
        if (!traceWorld(o, dir, d, M)) {
          best = d;
          ends = `(${a.x},${a.z})-(${b.x},${b.z})`;
        }
      }
    metrics["longestSightlineM"] = +best.toFixed(1);
    metrics["longestSightlineEnds"] = ends;
    expect(best).toBeLessThan(42);
  });

  it("the practice bot's routes are all reachable on FROSTLINE's ground grid", () => {
    // Same graph rule as practice-bot.ts (0.5 m cells, movement solids inflated by radius + 0.18 m).
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
    const start = key(M.spawns.B.x, M.spawns.B.z);
    const reachable = new Set([start]),
      queue = [start];
    while (queue.length) {
      const [i, j] = queue.shift()!.split(",").map(Number) as [number, number];
      for (const [di, dj] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const k = `${i + di},${j + dj}`;
        if (nodes.has(k) && !reachable.has(k)) {
          reachable.add(k);
          queue.push(k);
        }
      }
    }
    const points = (["center", "north", "south"] as const).flatMap((o) => botItinerary(M, o));
    expect(points.length).toBeGreaterThan(10);
    for (const side of [1, -1])
      for (const p of points) {
        const target = { x: p.x * side, z: p.z };
        expect(reachable.has(key(target.x, target.z)), JSON.stringify(target)).toBe(true);
      }
    metrics["navNodes"] = { frostline: nodes.size, reachableFromSpawnB: reachable.size };
  });

  it.each([123, 17])(
    "the practice bot finishes a first-to-seven series on FROSTLINE (seed %i)",
    (seed) => {
      let n = seed;
      const rng = () => (n = (1664525 * n + 1013904223) >>> 0) / 2 ** 32;
      const state = createMatch({ A: "human", B: "bot" }, 13, 0, undefined, "frostline"),
        bot = createPracticeBot(rng);
      startMatch(state, 0);
      for (
        let now = 0;
        now < 15 * 60000 && !["completed", "cancelled"].includes(state.phase);
        now += 34
      )
        stepMatch(state, { B: bot.input(state, now) }, now, TICK_MS);
      expect(state.mapId).toBe("frostline");
      expect(state.phase).toBe("completed");
      expect(state.score.B).toBe(7);
    },
    120_000,
  );

  it("server reveal (redaction) uses FROSTLINE's walls", () => {
    // Two players either side of the generator stack: hidden on FROSTLINE.
    const state = {
      phase: "live",
      mapId: "frostline",
      players: {
        A: { ...match.players.A, x: -3, z: 0, y: 0 },
        B: { ...match.players.B, x: 3, z: 0, y: 0 },
      },
    } as unknown as MatchState;
    expect(revealsOpponent(state, "A")).toBe(false);
    metrics["moveSpeed"] = { walk: MOVE_SPEED, sprint: MOVE_SPEED * 1.5 };
    console.log("FROSTLINE METRICS " + JSON.stringify(metrics));
  });
});
