import { describe, expect, it } from "vitest";
import {
  ARENA,
  BOXES,
  EYE_HEIGHT,
  PLAYER_RADIUS,
  SPAWNS,
  STEP_HEIGHT,
  STRUCTURES,
} from "../src/lib/fps/map";
import {
  createMatch,
  predictMovement,
  TICK_MS,
  MOVE_SPEED,
  isMovementBlocked,
} from "../src/lib/fps/simulation";
import { traceWorld } from "../src/lib/fps/collision";
import { canSeeOpponent } from "../src/lib/fps/visibility";
import type { Input, MatchState, Player } from "../src/lib/fps/protocol";

/**
 * Competitive validation of the PVPSPINARENA aim arena with the real movement, collision and
 * visibility code: spawn safety, first-contact timing per route pairing, symmetry, stairs and
 * platforms, clearances and elevated-position coverage. Metrics are printed for the report.
 */
type P = { x: number; z: number };
const metrics: Record<string, unknown> = {};
const eye = (p: P, y = 0) => ({ x: p.x, y: y + EYE_HEIGHT, z: p.z });
const sees = (a: P & { y?: number }, b: P & { y?: number }) => {
  // Same sampling as canSeeOpponent: head top, eye and chest, centre and both sides.
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
      if (!traceWorld(o, { x: x / d, y: y / d, z: z / d }, d - 0.025)) return true;
    }
  return false;
};

/** Follow waypoints with the real movement code; returns the per-tick track. */
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
    predictMovement(p, input, TICK_MS);
    track.push({ x: p.x, y: p.y, z: p.z });
  }
  return track;
}

const mirror = (route: P[]) => route.map((p) => ({ x: -p.x, z: p.z }));
// Routes from spawn A (west); spawn B uses the mirror image.
const ROUTES: Record<string, P[]> = {
  main: [
    { x: -14.9, z: 2.5 },
    { x: -12.6, z: 2.5 },
    { x: -11.8, z: 0.6 },
    { x: -7, z: -0.6 },
    { x: -2.8, z: -2.3 },
  ],
  upper: [
    { x: -16.9, z: -4 },
    { x: -16.9, z: -12.4 },
    { x: -8.3, z: -12.4 },
    { x: -8.3, z: -8.6 },
    { x: -2, z: -8.6 },
  ],
  lower: [
    { x: -16.9, z: 4 },
    { x: -16.9, z: 12.4 },
    { x: -8.3, z: 12.4 },
    { x: -8.3, z: 8.4 },
    { x: -2, z: 8.4 },
  ],
  platform: [
    { x: -14.9, z: 2.0 },
    { x: -14.6, z: -2.6 },
    { x: -14.6, z: -8.2 },
    { x: -12.9, z: -8.2 },
  ],
};
const pathLength = (start: P, route: P[]) =>
  route.reduce(
    (s, p, i) =>
      s + Math.hypot(p.x - (i ? route[i - 1]! : start).x, p.z - (i ? route[i - 1]! : start).z),
    0,
  );

describe("PVPSPINARENA aim arena layout", () => {
  const match = createMatch({ A: "a", B: "b" }, 5, 0);

  it("is a 40 × 32 m arena with two opposing spawns", () => {
    expect(ARENA).toEqual({ width: 40, depth: 32 });
    expect(SPAWNS.A.x).toBeCloseTo(-SPAWNS.B.x);
    expect(SPAWNS.A.z).toBe(SPAWNS.B.z);
    for (const s of Object.values(SPAWNS)) expect(isMovementBlocked(s.x, 0, s.z)).toBe(false);
  });

  it("mirrors every gameplay solid across x = 0 (identical cover for both spawns)", () => {
    for (const b of BOXES)
      expect(
        BOXES.some(
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
      return pts.filter((p) => !isMovementBlocked(p.x, 0, p.z));
    };
    const A = pad(SPAWNS.A.x),
      B = pad(SPAWNS.B.x);
    let visible = 0;
    const shown: string[] = [];
    for (const a of A)
      for (const b of B)
        if (sees(a, b)) {
          visible++;
          if (shown.length < 12)
            shown.push(
              `(${a.x.toFixed(1)},${a.z.toFixed(1)})->(${b.x.toFixed(1)},${b.z.toFixed(1)})`,
            );
        }
    if (visible) console.log("SPAWN LOS " + shown.join(" "));
    metrics["spawnPadPairsChecked"] = A.length * B.length;
    metrics["spawnPadPairsVisible"] = visible;
    expect(visible).toBe(0);
  });

  it("routes have equal lengths from both spawns, and the flanks are short detours", () => {
    const lengths: Record<string, number> = {};
    for (const [name, route] of Object.entries(ROUTES)) {
      const a = pathLength(SPAWNS.A, route),
        b = pathLength(SPAWNS.B, mirror(route));
      expect(a).toBeCloseTo(b, 6);
      lengths[name] = +a.toFixed(1);
    }
    metrics["routeLengthM"] = lengths;
    // Flank routes reach the courtyard within ~2x the main lane's distance.
    expect(lengths["upper"]! / lengths["main"]!).toBeLessThan(2.2);
    expect(lengths["lower"]! / lengths["main"]!).toBeLessThan(2.2);
  });

  it("walks every route with the real movement code without getting stuck", () => {
    const times: Record<string, number> = {};
    for (const [name, route] of Object.entries(ROUTES)) {
      const track = walk(match.players.A, route, false, 400);
      const end = route.at(-1)!;
      const arrive = track.findIndex((p) => Math.hypot(p.x - end.x, p.z - end.z) < 0.3);
      expect(arrive, name).toBeGreaterThan(0);
      times[name] = +((arrive * TICK_MS) / 1000).toFixed(2);
    }
    metrics["walkSecondsToRouteEnd"] = times;
  });

  it("climbs the stairs onto the platform by walking (step-up) and drops back down", () => {
    const track = walk(match.players.A, ROUTES["platform"]!, false, 400);
    const top = Math.max(...track.map((p) => p.y));
    expect(top).toBeCloseTo(1.5, 5);
    expect(STEP_HEIGHT).toBeGreaterThanOrEqual(0.3);
    // From the platform, drop into the upper corridor through the parapet gap.
    const onTop = track.at(-1)!;
    const down = walk(
      { ...match.players.A, ...onTop } as Player,
      [{ x: -12.9, z: -12.3 }],
      false,
      120,
    );
    expect(down.at(-1)!.y).toBe(0);
    // Tall cover and the platform face cannot be walked or jumped onto from the ground.
    expect(
      Math.max(
        ...walk(
          match.players.A,
          [
            { x: -16.9, z: -4 },
            { x: -16.9, z: -9 },
            { x: -14, z: -9 },
          ],
          false,
          300,
        ).map((p) => p.y),
      ),
    ).toBe(0);
  });

  it("keeps every opening at least 1.2 m wide for a 0.7 m player", () => {
    // Probe each doorway/gap with a standing player: the centre and ±0.25 m must be free.
    const gaps: [string, P][] = [
      ["spawn-exit-south", { x: -13.9, z: 2.5 }],
      ["spawn-exit-north", { x: -13.9, z: -2.5 }],
      ["arch-west", { x: -8.3, z: -10.25 }],
      ["arch-centre", { x: 0, z: -10.25 }],
      ["gate-west", { x: -8.3, z: 10.25 }],
      ["corridor-container", { x: 0, z: 11.5 }],
      ["alley-north", { x: -17.2, z: -6.2 }],
      ["alley-south", { x: -17.2, z: 6.2 }],
    ];
    for (const [name, p] of gaps)
      for (const o of [-0.25, 0, 0.25]) {
        const alongX = name.startsWith("spawn") || name.startsWith("alley") ? 0 : 1;
        expect(isMovementBlocked(p.x + o * alongX, 0, p.z + o * (1 - alongX)), name).toBe(false);
      }
  });

  it("first contact happens after about 3–5 seconds", () => {
    const pairs: Record<string, number | null> = {};
    for (const sprint of [false, true])
      for (const a of ["main", "upper", "lower"])
        for (const b of ["main", "upper", "lower"]) {
          if (a > b) continue;
          const ta = walk(match.players.A, ROUTES[a]!, sprint, 300),
            tb = walk(match.players.B, mirror(ROUTES[b]!), sprint, 300);
          let contact: number | null = null;
          for (let t = 0; t < 300; t++) {
            const state = {
              phase: "live",
              players: {
                A: { ...match.players.A, ...ta[t]! },
                B: { ...match.players.B, ...tb[t]! },
              },
            } as unknown as MatchState;
            if (canSeeOpponent(state, "A")) {
              contact = +((t * TICK_MS) / 1000).toFixed(2);
              break;
            }
          }
          pairs[`${a}-${b}${sprint ? "-sprint" : "-walk"}`] = contact;
        }
    metrics["firstContactSeconds"] = pairs;
    // Main lane vs main lane: the decisive first fight.
    expect(pairs["main-main-walk"]).not.toBeNull();
    expect(pairs["main-main-walk"]!).toBeGreaterThan(2.5);
    expect(pairs["main-main-walk"]!).toBeLessThan(5.5);
    expect(pairs["main-main-sprint"]!).toBeGreaterThan(1.6);
  });

  it("elevated positions are strong but not dominant, and can be seen back", () => {
    // Coverage of the courtyard floor from a standing player: platform edge vs ground positions.
    const cells: P[] = [];
    for (let x = -11.5; x <= 11.5; x += 1)
      for (let z = -9.5; z <= 9.5; z += 1) if (!isMovementBlocked(x, 0, z)) cells.push({ x, z });
    const coverage = (from: P & { y: number }) =>
      cells.filter((c) => sees(from, c)).length / cells.length;
    const platform = coverage({ x: -12.8, y: 1.5, z: -8.2 });
    const lane = coverage({ x: -11, y: 0, z: -0.6 });
    const centre = coverage({ x: 0, y: 0, z: 5 });
    metrics["courtyardVisibleFraction"] = {
      platformEdge: +platform.toFixed(2),
      laneEntry: +lane.toFixed(2),
      courtyardSouth: +centre.toFixed(2),
    };
    expect(platform).toBeLessThan(0.85);
    // Counter-angles: the platform edge is visible from many courtyard cells (mutual sight).
    expect(platform).toBeGreaterThan(0.3);
    // The two platforms see each other (long diagonal duel), not one-sided.
    expect(sees({ x: -12.8, y: 1.5, z: -8.2 }, { x: 12.8, y: 1.5, z: -8.2 })).toBe(true);
    // Crouched behind the courtyard parapet the player is hidden from the courtyard floor.
    expect(STRUCTURES.every((s) => s.y - s.h / 2 >= 3)).toBe(true);
  });

  it("measures the longest open sightline at standing eye height", () => {
    let best = 0,
      ends = "";
    const pts: P[] = [];
    for (let x = -19.5; x <= 19.5; x += 1.5)
      for (let z = -15.5; z <= 15.5; z += 1.5) if (!isMovementBlocked(x, 0, z)) pts.push({ x, z });
    for (let i = 0; i < pts.length; i++)
      for (let j = i + 1; j < pts.length; j++) {
        const a = pts[i]!,
          b = pts[j]!,
          d = Math.hypot(a.x - b.x, a.z - b.z);
        if (d <= best) continue;
        const o = eye(a),
          dir = { x: (b.x - a.x) / d, y: 0, z: (b.z - a.z) / d };
        if (!traceWorld(o, dir, d)) {
          best = d;
          ends = `(${a.x},${a.z})-(${b.x},${b.z})`;
        }
      }
    metrics["longestSightlineM"] = +best.toFixed(1);
    metrics["longestSightlineEnds"] = ends;
    metrics["moveSpeed"] = { walk: MOVE_SPEED, sprint: MOVE_SPEED * 1.5 };
    console.log("ARENA METRICS " + JSON.stringify(metrics));
    expect(best).toBeLessThan(42);
  });
});
