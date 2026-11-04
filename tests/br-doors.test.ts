import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { doorsNear, modelDoors, withDoors, type Door } from "@/lib/fps/br/doors";
import { modelSpots } from "@/lib/fps/br/loot-spots";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland, type Island } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import {
  brViewFor,
  BrSeatSync,
  BrSight,
  checkpointBrMatch,
  createBrMatch,
  restoreBrMatch,
  seatHuman,
  stepBrMatch,
  type BrInput,
  type BrMatchState,
} from "@/lib/fps/br/match";
import type { CollisionData } from "@/lib/fps/br/static-world";
import { EYE_HEIGHT, PLAYER_RADIUS, STEP_HEIGHT } from "@/lib/fps/map";
import type { WorldMeta } from "@/lib/fps/br/world";
import { TICK_MS } from "@/lib/fps/simulation";

const buffer = (path: string) => {
  const f = readFileSync(path);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const meta = JSON.parse(readFileSync("public/fps/br/world.v1.json", "utf8")) as WorldMeta;
const collision = JSON.parse(
  readFileSync("public/fps/br/models/collision.json", "utf8"),
) as CollisionData;
let island: Island;
beforeAll(async () => {
  const hf = await decodeHeightfield(buffer("public/fps/br/height.v1.hf"));
  const cover = await decodeLandCover(buffer("public/fps/br/landcover.v1.lc"));
  island = buildIsland(hf, cover, meta, collision);
}, 60_000);

/** The side of a door a standing player fits on (1 m out along its normal). */
function besideDoor(d: Door) {
  for (const side of [1, -1]) {
    const x = d.x + (d.along === "x" ? 0 : side),
      z = d.z + (d.along === "x" ? side : 0);
    if (!island.solid.blocked(x, d.y0 + 0.02, z, 1.8, 0.35)) return { x, z };
  }
  return null;
}

let t = 0;
const step = (state: BrMatchState, acts: unknown[] = []) => {
  t += TICK_MS;
  const inputs = new Map<number, BrInput>([[0, { seq: 0, forward: 0, strafe: 0, yaw: 0 }]]);
  stepBrMatch(state, island.solid, meta, inputs, t, TICK_MS, new Map([[0, acts as never]]));
  return state.combat;
};

function scene() {
  const d = island.doors.doors.find((x) => {
    const p = meta.pois.find((q) => q.id === "northstar-town")!;
    return Math.hypot(x.x - p.x, x.z - p.z) < 400 && besideDoor(x);
  })!;
  const at = besideDoor(d)!;
  const state = createBrMatch(meta, 5, (a, b) => island.solid.hf.heightAt(a, b));
  seatHuman(state, "u1", "Opener");
  seatHuman(state, "u2", "Far");
  state.phase = "active";
  for (const s of state.seats) {
    Object.assign(s.body, { phase: "ground", grounded: true, x: at.x + 40 + s.seat * 3, z: at.z });
    s.body.y = island.solid.supportAt(s.body.x, s.body.z, 0.35, 1e4);
    s.dead = s.seat > 1; // only the two humans
  }
  Object.assign(state.seats[0]!.body, { x: at.x, z: at.z, y: d.y0 });
  step(state);
  state.doorOpen![d.id] = 0;
  return { state, d };
}

describe("doors", () => {
  it("finds doorways in the enterable town buildings, none in pads or tents", () => {
    for (const m of [
      "house",
      "rural-house",
      "townhouse",
      "bungalow",
      "police-station",
      "rural-wood-4",
      "apartment",
      "fire-station",
    ])
      expect(modelDoors(collision, m).length, m).toBeGreaterThan(0);
    for (const m of ["helipad", "tent", "abandoned-building", "fuel-tank"])
      expect(modelDoors(collision, m), m).toEqual([]);
    for (const d of modelDoors(collision, "house")) {
      expect(d.width).toBeGreaterThanOrEqual(0.7);
      expect(d.width).toBeLessThanOrEqual(2.2);
      expect(d.y1 - d.y0).toBeGreaterThanOrEqual(1.85);
    }
  });

  it("puts most town buildings behind a door and every door in an open doorway", () => {
    const set = island.doors;
    expect(set.doors.length).toBeGreaterThan(1500);
    // Every doorway is passable at its middle in the static world (nothing in it).
    const towns = ["northstar-town", "millhaven", "crossroads", "riverwood"];
    const houses = island.layout.filter(
      (l) => towns.includes(l.poi) && ["house", "rural-house", "rural-wood-4"].includes(l.model),
    );
    const withDoor = houses.filter((h) => doorsNear(set, h.x, h.z, 12).length > 0);
    expect(withDoor.length / houses.length).toBeGreaterThan(0.9);
    // The doorway itself is free in the static world; the closed panel blocks it.
    const closed = withDoors(island.solid, set, new Uint8Array(set.doors.length));
    let free = 0,
      blocks = 0;
    const sample = set.doors.filter((_, i) => i % 13 === 0);
    for (const d of sample) {
      if (!island.solid.blocked(d.x, d.y0 + 0.05, d.z, 1.7, 0.05)) free++;
      if (closed.blocked(d.x, d.y0 + 0.05, d.z, 1.7, 0.3)) blocks++;
    }
    expect(free / sample.length).toBeGreaterThan(0.95);
    expect(blocks).toBe(sample.length);
  });

  it("opens and closes within reach only, never on someone in the doorway", () => {
    const { state, d } = scene();
    expect(state.solid!.blocked(d.x, d.y0 + 0.05, d.z, 1.7, 0.05)).toBe(true);
    const act = (e: ReturnType<typeof step>) => e.find((x) => x.type === "act");
    expect(act(step(state, [{ act: "door", id: d.id }]))).toMatchObject({ ok: true });
    expect(state.doorOpen![d.id]).toBe(1);
    expect(state.solid!.blocked(d.x, d.y0 + 0.05, d.z, 1.7, 0.05)).toBe(false);
    // Someone standing in the doorway: it does not close on them.
    Object.assign(state.seats[1]!.body, { x: d.x, z: d.z, y: d.y0 });
    expect(act(step(state, [{ act: "door", id: d.id }]))).toMatchObject({
      ok: false,
      reason: "Blocked",
    });
    state.seats[1]!.body.x += 30;
    expect(act(step(state, [{ act: "door", id: d.id }]))).toMatchObject({ ok: true });
    expect(state.doorOpen![d.id]).toBe(0);
    // Too far away.
    state.seats[0]!.body.x += 8;
    expect(act(step(state, [{ act: "door", id: d.id }]))).toMatchObject({
      ok: false,
      reason: "Too far",
    });
    expect(state.doorLog.slice(-2)).toEqual([d.id * 2 + 1, d.id * 2]);
  });

  it("sends every open door once, then only the changes, and keeps them through a checkpoint", () => {
    const { state, d } = scene();
    const sync = new BrSeatSync(),
      sight = new BrSight();
    const first = brViewFor(state, island.solid, sight, 0, t, sync);
    const open = first.doors!.open!;
    expect(open.length).toBeGreaterThan(100);
    expect(open).not.toContain(d.id);
    expect(brViewFor(state, island.solid, sight, 0, t, sync).doors).toBeUndefined();
    step(state, [{ act: "door", id: d.id }]);
    expect(brViewFor(state, island.solid, sight, 0, t, sync).doors).toEqual({
      changes: [d.id * 2 + 1],
    });
    const back = restoreBrMatch(
      meta,
      (a, b) => island.solid.hf.heightAt(a, b),
      JSON.parse(JSON.stringify(checkpointBrMatch(state))),
    );
    step(back);
    expect(back.doorOpen![d.id]).toBe(1);
    expect([...back.doorOpen!]).toEqual([...state.doorOpen!]);
  });

  it("builds the apartment block with a door in and loot on every floor up its stairs", () => {
    const doors = modelDoors(collision, "apartment");
    // The entrance on the west side (−x), 1.2 m wide.
    expect(doors.some((d) => d.along === "z" && d.x < -9.5 && Math.abs(d.width - 1.2) < 0.25)).toBe(
      true,
    );
    const floors = new Set(
      modelSpots(collision, "apartment", "indoor", 2.5, 60)
        .map((s) => Math.round(s.y / 3.2))
        .filter((f, _, a) => a.length > 0 && f >= 0),
    );
    // Every floor, and the stair house on the roof.
    expect([...floors].sort()).toEqual([0, 1, 2, 3, 4]);
  });

  it("lets players walk from the street up the stairs onto an apartment block's roof", () => {
    const a = island.layout.find((l) => l.model === "apartment")!;
    const world = island.solid;
    const C = 0.25,
      half = 22,
      n = Math.round((2 * half) / C);
    const x0 = a.x - half,
      z0 = a.z - half;
    const seen = new Map<number, number[]>();
    const q: number[] = [];
    const add = (i: number, j: number, y: number) => {
      const ys = seen.get(j * n + i);
      if (ys?.some((v) => Math.abs(v - y) < 0.15)) return;
      (ys ?? seen.set(j * n + i, []).get(j * n + i)!).push(y);
      q.push(i, j, y);
    };
    for (let t = 0; t < n; t += 2)
      add(t, 0, world.supportAt(x0 + t * C, z0, PLAYER_RADIUS, a.y + 0.5));
    let best = -Infinity;
    while (q.length) {
      const y = q.pop()!,
        j = q.pop()!,
        i = q.pop()!;
      best = Math.max(best, y);
      for (const [di, dj] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const ni = i + di,
          nj = j + dj;
        if (ni < 0 || nj < 0 || ni >= n || nj >= n) continue;
        const ny = world.supportAt(x0 + ni * C, z0 + nj * C, PLAYER_RADIUS, y + STEP_HEIGHT);
        if (world.blocked(x0 + ni * C, ny + 1e-3, z0 + nj * C, EYE_HEIGHT + 0.2, PLAYER_RADIUS))
          continue;
        add(ni, nj, ny);
      }
    }
    expect(best - a.y).toBeCloseTo(4 * 3.2, 1);
  }, 60_000);

  it("lets bots through: a bot at a closed door opens it", () => {
    const { state, d } = scene();
    const bot = state.seats.find((s) => s.bot)!;
    bot.dead = false;
    Object.assign(bot.body, { x: d.x + (d.along === "x" ? 0.3 : 0.6), z: d.z, y: d.y0 });
    step(state);
    expect(state.doorOpen![d.id]).toBe(1);
  });
});
