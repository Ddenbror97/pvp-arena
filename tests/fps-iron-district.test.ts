import { afterAll, describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { EYE_HEIGHT, PLAYER_RADIUS } from "../src/lib/fps/map";
import {
  isMovementBlocked,
  MOVE_SPEED,
  predictMovement,
  TICK_MS,
  type Input,
  type Player,
} from "../src/lib/fps/simulation";
import { traceWorld } from "../src/lib/fps/collision";
import { BOMB_MAPS, bombsiteIn, spawnY } from "../src/lib/fps/bomb/maps";
import { bombNav, navDistances, navPath, nearestNode } from "../src/lib/fps/bomb/nav";
import { IRON_DISTRICT_BOT_POINTS } from "../src/lib/fps/bomb/bots";

/**
 * IRON DISTRICT layout validation with the shipped movement, collision and visibility code: every
 * staircase, ramp and slab walked with predictMovement; travel times on the multi-level walk graph
 * at the running speed; spawn safety; first contact; the longest sightlines. Metrics are written to
 * art/blender/iron-district/build/validation.json (and the routes to routes.json for the plan).
 */
const BM = BOMB_MAPS["iron-district"];
const MAP = BM.map;
type P = { x: number; z: number; y?: number };
const metrics: Record<string, unknown> = {};
const routes: { team: string; name: string; path: P[] }[] = [];

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

/** Walk legs with the real movement code; returns the final pose. */
function walk(from: P, legs: P[], ticksPerLeg = 400) {
  const p = {
    x: from.x,
    y: from.y ?? 0,
    z: from.z,
    yaw: 0,
    pitch: 0,
    velocityY: 0,
  } as Player;
  for (const leg of legs)
    for (let t = 0; t < ticksPerLeg && Math.hypot(leg.x - p.x, leg.z - p.z) > 0.2; t++)
      predictMovement(
        p,
        {
          v: 1,
          type: "input",
          seq: t + 1,
          forward: 1,
          strafe: 0,
          yaw: Math.atan2(-(leg.x - p.x), -(leg.z - p.z)),
          pitch: 0,
          weapon: "rifle",
          fire: false,
          reload: false,
          jump: false,
          sprint: false,
        } as Input,
        TICK_MS,
        MAP,
      );
  // Settle (land).
  for (let t = 0; t < 30; t++) predictMovement(p, null, TICK_MS, MAP);
  return p;
}

const g = bombNav(MAP);
const T0 = BM.spawns.terrorist[2]!,
  CT0 = BM.spawns.police[2]!;
const at = (s: { x: number; z: number; y?: number }) => ({ x: s.x, y: s.y ?? 0, z: s.z });
const fromT = navDistances(MAP, at(T0)),
  fromCT = navDistances(MAP, at(CT0));
const sec = (m: number) => +(m / MOVE_SPEED).toFixed(1);
const toZone = (dist: Float64Array, s: "A" | "B") => {
  let best = Infinity;
  for (let n = 0; n < g.x.length; n++)
    if (bombsiteIn(BM, g.x[n]!, g.y[n]!, g.z[n]!) === s) best = Math.min(best, dist[n]!);
  return best;
};
const node = (p: P) => nearestNode(g, p);
function trace(prev: Int32Array, to: P): P[] {
  const out: P[] = [];
  for (let c = node(to); c >= 0; c = prev[c]!) out.push({ x: g.x[c]!, z: g.z[c]!, y: g.y[c]! });
  return out.reverse().filter((_, i, a) => i % 6 === 0 || i === a.length - 1);
}

describe("IRON DISTRICT layout", () => {
  afterAll(() => {
    mkdirSync("art/blender/iron-district/build", { recursive: true });
    writeFileSync(
      "art/blender/iron-district/build/validation.json",
      JSON.stringify(metrics, null, 1),
    );
    writeFileSync("art/blender/iron-district/build/routes.json", JSON.stringify(routes));
  });
  it("every staircase, ramp and slab is walked with the real movement code", () => {
    const climbs: Record<string, { from: P; legs: P[]; y: number }> = {
      "tunnel stairs down": {
        from: { x: -14.5, z: 31, y: 5.4 },
        legs: [{ x: -14.5, z: 22 }],
        y: 0,
      },
      "tunnel to the pocket": {
        from: { x: -14.5, z: 22, y: 0 },
        legs: [
          { x: -14.5, z: 19.5 },
          { x: 2, z: 19.5 },
          { x: 2, z: 16.5 },
          { x: 13.5, z: 16.5 },
          { x: 13.5, z: 7 },
        ],
        y: 1.2,
      },
      "pocket back down into the tunnel": {
        from: { x: 13.5, z: 7, y: 1.2 },
        legs: [{ x: 13.5, z: 14 }],
        y: 0,
      },
      "T mid steps down": { from: { x: -6.5, z: 16, y: 5.4 }, legs: [{ x: -6.5, z: 8 }], y: 1.2 },
      "T mid steps up": { from: { x: -6.5, z: 8, y: 1.2 }, legs: [{ x: -6.5, z: 16 }], y: 5.4 },
      "loading ramp down": { from: { x: -33, z: 32, y: 5.4 }, legs: [{ x: -33, z: 15 }], y: 1.2 },
      "loading ramp up": { from: { x: -33, z: 15, y: 1.2 }, legs: [{ x: -33, z: 32 }], y: 5.4 },
      "market lane down": { from: { x: 42, z: 32, y: 5.4 }, legs: [{ x: 42, z: 16.5 }], y: 2.4 },
      "market lane up": { from: { x: 42, z: 16.5, y: 2.4 }, legs: [{ x: 42, z: 32 }], y: 5.4 },
      "apartments: street → upper floor → balcony": {
        from: { x: 24, z: 18, y: 5.4 },
        legs: [
          { x: 24.2, z: 9 },
          { x: 27.8, z: 8 },
          { x: 27.8, z: 4 },
          { x: 27.2, z: -7.5 },
          { x: 24.2, z: -7.5 },
          { x: 24.2, z: -12.2 },
        ],
        y: 5.4,
      },
      "apartments: balcony stairs down to the market": {
        from: { x: 30, z: -12, y: 5.4 },
        legs: [
          { x: 32.9, z: -12.4 },
          { x: 32.9, z: -18 },
        ],
        y: 2.4,
      },
      "apartments: internal stairs up": {
        from: { x: 30, z: -2, y: 2.4 },
        legs: [
          { x: 30, z: -0.5 },
          { x: 30, z: 4.5 },
        ],
        y: 5.4,
      },
      "apartments: ground door onto the market": {
        from: { x: 27, z: -5, y: 2.4 },
        legs: [
          { x: 27, z: -4 },
          { x: 24, z: -8 },
          { x: 24, z: -14 },
        ],
        y: 2.4,
      },
      "control room stairs to the catwalk": {
        from: { x: -20.8, z: -43, y: 1.2 },
        legs: [
          { x: -20.8, z: -39.6 },
          { x: -17.9, z: -39.6 },
          { x: -17.9, z: -35 },
          { x: -30, z: -34.8 },
        ],
        y: 4.2,
      },
      "catwalk stairs down to the dock": {
        from: { x: -30, z: -34.8, y: 4.2 },
        legs: [
          { x: -39.1, z: -34.8 },
          { x: -39.1, z: -30 },
        ],
        y: 2.4,
      },
      "dock south steps": { from: { x: -38, z: -24, y: 2.4 }, legs: [{ x: -38, z: -16 }], y: 1.2 },
      "dock side steps up": {
        from: { x: -33.8, z: -24.5, y: 1.2 },
        legs: [{ x: -38, z: -24.5 }],
        y: 2.4,
      },
      "arcade steps into the market": {
        from: { x: 20, z: -4, y: 1.2 },
        legs: [{ x: 20, z: -14 }],
        y: 2.4,
      },
      "B gate steps": { from: { x: 20, z: -42, y: 1.2 }, legs: [{ x: 20, z: -36 }], y: 2.4 },
      "market hall steps and the door onto B": {
        from: { x: 18, z: -41.6, y: 1.2 },
        legs: [
          { x: 24, z: -41.6 },
          { x: 32, z: -41 },
          { x: 32, z: -36 },
        ],
        y: 2.4,
      },
    };
    const results: Record<string, number> = {};
    const failed: string[] = [];
    for (const [name, c] of Object.entries(climbs)) {
      const p = walk(c.from, c.legs);
      const to = c.legs.at(-1)!;
      results[name] = +p.y.toFixed(2);
      if (Math.hypot(to.x - p.x, to.z - p.z) > 0.4 || Math.abs(p.y - c.y) > 1e-4)
        failed.push(`${name}: ended at ${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}`);
    }
    metrics["climbs"] = results;
    expect(failed).toEqual([]);
  });

  it("spawns stand on their floor; both sites are reachable from both spawns", () => {
    for (const s of [...BM.spawns.police, ...BM.spawns.terrorist]) {
      const y = spawnY(s);
      expect(isMovementBlocked(s.x, y, s.z, false, MAP), `spawn ${s.x},${s.z}`).toBe(false);
      // Supported: standing still does not fall.
      const p = walk({ x: s.x, z: s.z, y }, []);
      expect(p.y).toBeCloseTo(y, 5);
    }
    for (const site of ["A", "B"] as const) {
      expect(Number.isFinite(toZone(fromT.dist, site))).toBe(true);
      expect(Number.isFinite(toZone(fromCT.dist, site))).toBe(true);
    }
  });

  it("bot points are on the walk graph and reachable from both spawns", () => {
    const P = IRON_DISTRICT_BOT_POINTS;
    const all: [string, P][] = [
      ["plant A", P.plant.A],
      ["plant B", P.plant.B],
      ...P.holdA.map((p, i) => [`holdA${i}`, p] as [string, P]),
      ...P.holdB.map((p, i) => [`holdB${i}`, p] as [string, P]),
      ["holdMid", P.holdMid],
      ...P.approachA.map((p, i) => [`approachA${i}`, p] as [string, P]),
      ...P.approachB.map((p, i) => [`approachB${i}`, p] as [string, P]),
      ...P.midA.map((p, i) => [`midA${i}`, p] as [string, P]),
      ...P.midB.map((p, i) => [`midB${i}`, p] as [string, P]),
      ["lurk", P.lurk],
      ["stage A", P.stage.A],
      ["stage B", P.stage.B],
    ];
    const failed: string[] = [];
    for (const [name, p] of all) {
      const n = node(p);
      if (n < 0) {
        failed.push(`${name}: no node`);
        continue;
      }
      if (
        Math.hypot(g.x[n]! - p.x, g.z[n]! - p.z) >= 0.8 ||
        (p.y !== undefined && Math.abs(g.y[n]! - p.y) >= 0.5)
      )
        failed.push(`${name}: nearest node ${g.x[n]}, ${g.y[n]!.toFixed(2)}, ${g.z[n]}`);
      if (!navPath(MAP, at(T0), p).length) failed.push(`${name}: unreachable from T spawn`);
      if (!navPath(MAP, at(CT0), p).length) failed.push(`${name}: unreachable from Police spawn`);
    }
    expect(failed).toEqual([]);
    expect(bombsiteIn(BM, P.plant.A.x, P.plant.A.y!, P.plant.A.z)).toBe("A");
    expect(bombsiteIn(BM, P.plant.B.x, P.plant.B.y!, P.plant.B.z)).toBe("B");
  });

  it("travel times: Police set up first at both sites, Terrorists have real choices", () => {
    const at = (dist: Float64Array, p: P) => sec(dist[node(p)]!);
    const viaPoints = (pts: P[]) => {
      let total = 0;
      for (let i = 1; i < pts.length; i++)
        total += navDistances(MAP, pts[i - 1]!).dist[node(pts[i]!)]!;
      return sec(total);
    };
    const P = IRON_DISTRICT_BOT_POINTS;
    const timings: Record<string, number> = {
      "T → A (fastest)": sec(toZone(fromT.dist, "A")),
      "T → B (fastest)": sec(toZone(fromT.dist, "B")),
      "Police → A": sec(toZone(fromCT.dist, "A")),
      "Police → B": sec(toZone(fromCT.dist, "B")),
      "T → A via A main (hall doors)": viaPoints([at0(T0), ...P.approachA]),
      "T → A via mid and the boiler house": viaPoints([at0(T0), ...P.midA]),
      "T → B via the market lane (arch)": viaPoints([at0(T0), ...P.approachB]),
      "T → B via the apartments (balcony)": viaPoints([
        at0(T0),
        { x: 24, z: 18, y: 5.4 },
        { x: 24.2, z: -12, y: 5.4 },
      ]),
      "T → B via mid and the arcade": viaPoints([at0(T0), ...P.midB]),
      "T → tunnel exit": at(fromT.dist, { x: 13.5, z: 7, y: 1.2 }),
      "T → mid gate": at(fromT.dist, { x: 4, z: -6.5, y: 1.2 }),
      "Police → mid gate": at(fromCT.dist, { x: 4, z: -6.5, y: 1.2 }),
      "Police → catwalk": at(fromCT.dist, { x: -30, z: -34.8, y: 4.2 }),
      "Police → under the balcony": at(fromCT.dist, { x: 26, z: -12, y: 2.4 }),
    };
    const fromA = navDistances(MAP, P.plant.A),
      fromB = navDistances(MAP, P.plant.B);
    timings["rotation A → B"] = sec(toZone(fromA.dist, "B"));
    timings["rotation B → A"] = sec(toZone(fromB.dist, "A"));
    metrics["timings"] = timings;
    for (const [team, start, prev, goals] of [
      ["terrorist", at0(T0), fromT.prev, [P.plant.A, P.plant.B, { x: 13.5, z: 7, y: 1.2 }]],
      ["police", at0(CT0), fromCT.prev, [P.plant.A, P.plant.B, { x: 4, z: -6.5, y: 1.2 }]],
    ] as const) {
      void start;
      for (const goal of goals) routes.push({ team, name: "", path: trace(prev, goal) });
    }
    // Targets (docs/fps-bomb/IRON-DISTRICT.md): Police hold either site well before a rush lands.
    expect(timings["Police → A"]!).toBeLessThan(timings["T → A (fastest)"]! - 5);
    expect(timings["Police → B"]!).toBeLessThan(timings["T → B (fastest)"]! - 5);
    expect(Math.abs(timings["T → A (fastest)"]! - timings["T → B (fastest)"]!)).toBeLessThan(3);
    expect(Math.abs(timings["Police → A"]! - timings["Police → B"]!)).toBeLessThan(3);
  });

  it("no line of sight between the spawn areas", () => {
    const area = (list: readonly { x: number; z: number; y?: number }[]) => {
      const out: P[] = [];
      for (const s of list)
        for (let dx = -2; dx <= 2; dx += 1)
          for (let dz = -2; dz <= 2; dz += 1) out.push({ x: s.x + dx, z: s.z + dz, y: s.y ?? 0 });
      return out;
    };
    let visible = 0;
    for (const a of area(BM.spawns.terrorist))
      for (const b of area(BM.spawns.police)) if (sees(a, b)) visible++;
    metrics["spawnPairsVisible"] = visible;
    expect(visible).toBe(0);
  });

  it("first contact between teams running from spawn (simultaneous start)", () => {
    const sample: number[] = [];
    for (let n = 0; n < g.x.length; n++)
      if (Math.round(g.x[n]! / 0.5) % 2 === 0 && Math.round(g.z[n]! / 0.5) % 2 === 0)
        sample.push(n);
    const order = (d: Float64Array) =>
      sample.filter((n) => Number.isFinite(d[n]!)).sort((a, b) => d[a]! - d[b]!);
    const tOrder = order(fromT.dist),
      ctOrder = order(fromCT.dist);
    const cell = (n: number) => ({ x: g.x[n]!, z: g.z[n]!, y: g.y[n]! });
    let contact: { seconds: number; t: P; ct: P } | null = null;
    let it = 0,
      ic = 0;
    const tSeen: number[] = [],
      ctSeen: number[] = [];
    while (!contact && (it < tOrder.length || ic < ctOrder.length)) {
      const nextT = it < tOrder.length ? fromT.dist[tOrder[it]!]! : Infinity,
        nextC = ic < ctOrder.length ? fromCT.dist[ctOrder[ic]!]! : Infinity;
      if (nextT <= nextC) {
        const a = tOrder[it++]!;
        for (const b of ctSeen)
          if (Math.hypot(g.x[a]! - g.x[b]!, g.z[a]! - g.z[b]!) < 70 && sees(cell(a), cell(b))) {
            contact = { seconds: sec(nextT), t: cell(a), ct: cell(b) };
            break;
          }
        tSeen.push(a);
      } else {
        const b = ctOrder[ic++]!;
        for (const a of tSeen)
          if (Math.hypot(g.x[a]! - g.x[b]!, g.z[a]! - g.z[b]!) < 70 && sees(cell(b), cell(a))) {
            contact = { seconds: sec(nextC), t: cell(a), ct: cell(b) };
            break;
          }
        ctSeen.push(b);
      }
    }
    metrics["firstContact"] = contact;
    expect(contact).not.toBeNull();
    expect(contact!.seconds).toBeGreaterThanOrEqual(5);
  }, 600_000);

  it("reports the longest sightlines between walkable spots", () => {
    const sample: P[] = [];
    for (let n = 0; n < g.x.length; n++)
      if (
        Math.round(g.x[n]! / 0.5) % 4 === 0 &&
        Math.round(g.z[n]! / 0.5) % 4 === 0 &&
        (Number.isFinite(fromT.dist[n]!) || Number.isFinite(fromCT.dist[n]!))
      )
        sample.push({ x: g.x[n]!, z: g.z[n]!, y: g.y[n]! });
    const lanes: { d: number; a: P; b: P }[] = [];
    for (let i = 0; i < sample.length; i++)
      for (let j = i + 1; j < sample.length; j++) {
        const a = sample[i]!,
          b = sample[j]!,
          d = Math.hypot(a.x - b.x, a.z - b.z);
        if (d > 38 && sees(a, b)) lanes.push({ d: +d.toFixed(1), a, b });
      }
    lanes.sort((x, y) => y.d - x.d);
    metrics["longestSightlines"] = lanes.slice(0, 10);
    metrics["walkGraph"] = { nodes: g.x.length, boxes: MAP.boxes.length };
    expect(lanes[0]?.d ?? 0).toBeLessThan(58);
  }, 600_000);
});

function at0(s: { x: number; z: number; y?: number }): P {
  return { x: s.x, z: s.z, y: s.y ?? 0 };
}
