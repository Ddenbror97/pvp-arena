import { describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { EYE_HEIGHT, PLAYER_RADIUS, STEP_HEIGHT } from "../src/lib/fps/map";
import {
  isMovementBlocked,
  MOVE_SPEED,
  predictMovement,
  TICK_MS,
  type Input,
  type Player,
} from "../src/lib/fps/simulation";
import { traceWorld } from "../src/lib/fps/collision";
import { SANDGATE as MAP, SANDGATE_SITES, SANDGATE_SPAWNS } from "../src/lib/fps/bomb/sandgate";

/**
 * MAP 06 (SANDGATE) layout validation with the shipped collision and visibility code: travel
 * times, first contact, spawn safety and long sightlines. Metrics are written to
 * art/blender/map06/build/validation.json for the design report.
 */
type P = { x: number; z: number; y?: number };
const metrics: Record<string, unknown> = {};

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

// ------------------------------------------------------------ height-aware walk graph (0.5 m)
const CELL = 0.5;
type Cell = { x: number; z: number; y: number };
const cells: Cell[] = [];
const index = new Map<number, number>();
const key = (i: number, j: number) => i * 4096 + j;
const halfW = MAP.arena.width / 2,
  halfD = MAP.arena.depth / 2;
for (let i = Math.ceil(-halfW / CELL); i <= Math.floor(halfW / CELL); i++)
  for (let j = Math.ceil(-halfD / CELL); j <= Math.floor(halfD / CELL); j++) {
    const x = i * CELL,
      z = j * CELL;
    let y = 0;
    for (const b of MAP.boxes)
      if (
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
      e = Math.hypot(c.x - p.x, c.z - p.z);
    if (e < d) {
      d = e;
      best = n;
    }
  }
  return best;
};
/** Dijkstra (binary heap) over 8-connected cells: step up ≤ STEP_HEIGHT, drop any. */
function distances(start: P) {
  const dist = new Float64Array(cells.length).fill(Infinity);
  const s = cellAt(start);
  dist[s] = 0;
  const heap: [number, number][] = [[0, s]];
  const push = (e: [number, number]) => {
    heap.push(e);
    let k = heap.length - 1;
    while (k > 0) {
      const p = (k - 1) >> 1;
      if (heap[p]![0] <= heap[k]![0]) break;
      [heap[p], heap[k]] = [heap[k]!, heap[p]!];
      k = p;
    }
  };
  const pop = () => {
    const top = heap[0]!,
      last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let k = 0;
      for (;;) {
        const l = 2 * k + 1,
          r = l + 1;
        let m = k;
        if (l < heap.length && heap[l]![0] < heap[m]![0]) m = l;
        if (r < heap.length && heap[r]![0] < heap[m]![0]) m = r;
        if (m === k) break;
        [heap[m], heap[k]] = [heap[k]!, heap[m]!];
        k = m;
      }
    }
    return top;
  };
  while (heap.length) {
    const [du, u] = pop();
    if (du > dist[u]!) continue;
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
      if (cells[v]!.y - c.y > STEP_HEIGHT + 1e-6) continue;
      if (di && dj && (!index.has(key(i + di, j)) || !index.has(key(i, j + dj)))) continue;
      const w = du + CELL * Math.hypot(di, dj);
      if (w < dist[v]!) {
        dist[v] = w;
        push([w, v]);
      }
    }
  }
  return dist;
}

const T0 = SANDGATE_SPAWNS.terrorist[2]!,
  CT0 = SANDGATE_SPAWNS.police[2]!;
const fromT = distances(T0),
  fromCT = distances(CT0);
const inSite = (c: Cell, s: keyof typeof SANDGATE_SITES) => {
  const r = SANDGATE_SITES[s];
  return c.x >= r.x0 && c.x <= r.x1 && c.z >= r.z0 && c.z <= r.z1;
};
const toZone = (dist: Float64Array, s: keyof typeof SANDGATE_SITES) =>
  Math.min(...cells.map((c, n) => (inSite(c, s) ? dist[n]! : Infinity)));
const sec = (m: number) => +(m / MOVE_SPEED).toFixed(1);

describe("SANDGATE (map 06) layout", () => {
  it("every staircase can be walked up onto its platform with the real movement code", () => {
    const climbs: Record<string, P[]> = {
      "A catwalk from mid": [
        { x: -8, z: -12.5 },
        { x: -16, z: -13.5 },
      ],
      "A catwalk from the site": [
        { x: -25, z: -15 },
        { x: -17, z: -14.5 },
      ],
      "A platform, east stairs": [
        { x: -28, z: -35 },
        { x: -35, z: -35 },
      ],
      "A platform, south stairs": [
        { x: -36, z: -27.5 },
        { x: -36, z: -34 },
      ],
      "B dock, west stairs": [
        { x: 27.5, z: -33 },
        { x: 34, z: -33 },
      ],
      "B dock, south stairs": [
        { x: 33, z: -25.8 },
        { x: 33, z: -33 },
      ],
      // Stepped onto from the side, out of the Police access corridor along the north edge.
      "B dock, Police stairs": [
        { x: 30.8, z: -39.5 },
        { x: 33.5, z: -39.5 },
        { x: 33.5, z: -33 },
      ],
    };
    for (const [name, [from, ...legs]] of Object.entries(climbs)) {
      const p = { x: from!.x, y: 0, z: from!.z, yaw: 0, pitch: 0, velocityY: 0 } as Player;
      const to = legs.at(-1)!;
      for (const leg of legs)
        for (let t = 0; t < 300 && Math.hypot(leg.x - p.x, leg.z - p.z) > 0.2; t++)
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
      expect(Math.hypot(to.x - p.x, to.z - p.z), name).toBeLessThan(0.3);
      expect(p.y, name).toBeCloseTo(1.2, 5);
    }
  });

  it("every spawn is on open floor and both bombsites are reachable from both spawns", () => {
    for (const s of [...SANDGATE_SPAWNS.police, ...SANDGATE_SPAWNS.terrorist])
      expect(isMovementBlocked(s.x, 0, s.z, false, MAP)).toBe(false);
    for (const site of ["A", "B"] as const) {
      expect(Number.isFinite(toZone(fromT, site))).toBe(true);
      expect(Number.isFinite(toZone(fromCT, site))).toBe(true);
    }
  });

  it("travel times: Police reach both sites first, Terrorists have a real choice of site", () => {
    const timings = {
      "T → A": sec(toZone(fromT, "A")),
      "T → B": sec(toZone(fromT, "B")),
      "Police → A": sec(toZone(fromCT, "A")),
      "Police → B": sec(toZone(fromCT, "B")),
      "T → mid doors": sec(fromT[cellAt({ x: -3, z: 1.3 })]!),
      "Police → mid doors": sec(fromCT[cellAt({ x: -3, z: 1.3 })]!),
    };
    const fromA = distances({ x: -28, z: -26 });
    timings["rotation A → B"] = sec(toZone(fromA, "B"));
    metrics["timings"] = timings;
    // Targets (docs/fps-bomb/DESIGN.md): Police set up first at both sites; neither site is far
    // quicker for the Terrorists than the other.
    expect(timings["Police → A"]).toBeLessThan(timings["T → A"] - 3);
    expect(timings["Police → B"]).toBeLessThan(timings["T → B"] - 3);
    expect(Math.abs(timings["T → A"] - timings["T → B"])).toBeLessThan(3);
    expect(Math.abs(timings["Police → A"] - timings["Police → B"])).toBeLessThan(3);
  });

  it("no line of sight between the two spawn areas", () => {
    const area = (list: readonly { x: number; z: number }[]) =>
      cells.filter((c) => list.some((s) => Math.hypot(c.x - s.x, c.z - s.z) < 3));
    const t = area(SANDGATE_SPAWNS.terrorist),
      ct = area(SANDGATE_SPAWNS.police);
    let visible = 0;
    for (const a of t.filter((_, i) => i % 2 === 0))
      for (const b of ct.filter((_, i) => i % 2 === 0)) if (sees(a, b)) visible++;
    metrics["spawnPairsVisible"] = visible;
    expect(visible).toBe(0);
  });

  it("first contact between teams running from spawn (simultaneous start)", () => {
    // Coarse 1 m sample of reachable cells, ordered by each team's arrival time; contact is the
    // first moment a T cell and a Police cell, both reached by then, see each other.
    const sample = cells
      .map((c, n) => ({ c, n }))
      .filter(({ c }) => Math.round(c.x / CELL) % 2 === 0 && Math.round(c.z / CELL) % 2 === 0);
    const tOrder = sample
      .filter(({ n }) => Number.isFinite(fromT[n]!))
      .sort((a, b) => fromT[a.n]! - fromT[b.n]!);
    const ctOrder = sample
      .filter(({ n }) => Number.isFinite(fromCT[n]!))
      .sort((a, b) => fromCT[a.n]! - fromCT[b.n]!);
    let contact: { seconds: number; t: Cell; ct: Cell } | null = null;
    let it = 0,
      ic = 0;
    const tSeen: Cell[] = [],
      ctSeen: Cell[] = [];
    while (!contact && (it < tOrder.length || ic < ctOrder.length)) {
      const nextT = it < tOrder.length ? fromT[tOrder[it]!.n]! : Infinity,
        nextC = ic < ctOrder.length ? fromCT[ctOrder[ic]!.n]! : Infinity;
      if (nextT <= nextC) {
        const a = tOrder[it++]!.c;
        for (const b of ctSeen)
          if (Math.hypot(a.x - b.x, a.z - b.z) < 70 && sees(a, b)) {
            contact = { seconds: sec(nextT), t: a, ct: b };
            break;
          }
        tSeen.push(a);
      } else {
        const b = ctOrder[ic++]!.c;
        for (const a of tSeen)
          if (Math.hypot(a.x - b.x, a.z - b.z) < 70 && sees(b, a)) {
            contact = { seconds: sec(nextC), t: a, ct: b };
            break;
          }
        ctSeen.push(b);
      }
    }
    expect(contact).not.toBeNull();
    metrics["firstContact"] = contact;
    // Neither team can be shot leaving spawn: first contact no earlier than 5 s of running.
    expect(contact!.seconds).toBeGreaterThanOrEqual(5);
  }, 600_000);

  it("reports the longest sightlines between walkable spots", () => {
    const sample = cells.filter(
      (c) => Math.round(c.x / CELL) % 4 === 0 && Math.round(c.z / CELL) % 4 === 0,
    );
    const lanes: { d: number; a: Cell; b: Cell }[] = [];
    for (let i = 0; i < sample.length; i++)
      for (let j = i + 1; j < sample.length; j++) {
        const a = sample[i]!,
          b = sample[j]!,
          d = Math.hypot(a.x - b.x, a.z - b.z);
        if (d > 35 && sees(a, b)) lanes.push({ d: +d.toFixed(1), a, b });
      }
    lanes.sort((x, y) => y.d - x.d);
    metrics["longestSightlines"] = lanes.slice(0, 8);
    mkdirSync("art/blender/map06/build", { recursive: true });
    writeFileSync("art/blender/map06/build/validation.json", JSON.stringify(metrics, null, 1));
    // No sightline longer than 55 m (the map is 80 m across).
    expect(lanes[0]?.d ?? 0).toBeLessThan(55);
  }, 600_000);
});
