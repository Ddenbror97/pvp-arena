import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { routeMs } from "@/lib/fps/br/drop";
import { decodeHeightfield, type Heightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import {
  BR_RULES,
  BrSight,
  brViewFor,
  createBrMatch,
  releaseSeat,
  seatHuman,
  stepBrMatch,
  validateBrInput,
  type BrInput,
  type BrMatchState,
} from "@/lib/fps/br/match";
import type { CollisionData, StaticWorld } from "@/lib/fps/br/static-world";
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
let hf: Heightfield, world: StaticWorld;
beforeAll(async () => {
  hf = await decodeHeightfield(buffer("public/fps/br/height.v1.hf"));
  const cover = await decodeLandCover(buffer("public/fps/br/landcover.v1.lc"));
  world = buildIsland(hf, cover, meta, collision).solid;
});
const heightAt = (x: number, z: number) => hf.heightAt(x, z);
const input = (seq: number, extra: Partial<BrInput> = {}): BrInput => ({
  seq,
  forward: 0,
  strafe: 0,
  yaw: 0,
  ...extra,
});

/** Runs the match until `done` or `maxMs`; returns per-tick ms. */
function run(
  state: BrMatchState,
  done: (s: BrMatchState) => boolean,
  inputsAt: (now: number) => Map<number, BrInput> = () => new Map(),
  maxMs = 400_000,
  start = 0,
) {
  const ticks: number[] = [];
  for (let now = start; now < start + maxMs && !done(state); now += TICK_MS) {
    const a = performance.now();
    stepBrMatch(state, world, meta, inputsAt(now), now, TICK_MS);
    ticks.push(performance.now() - a);
  }
  return ticks;
}

describe("Project Island match (Phase 2 core)", () => {
  it("validates inputs strictly", () => {
    const ok = {
      v: 1,
      type: "br-input",
      seq: 3,
      forward: 1,
      strafe: -0.5,
      yaw: 2.1,
      jumpOut: true,
    };
    expect(validateBrInput(ok)).toMatchObject({ seq: 3, forward: 1, jumpOut: true, deploy: false });
    for (const bad of [
      { ...ok, x: 100 }, // positions are never accepted
      { ...ok, phase: "ground" }, // nor phases
      { ...ok, forward: 2 },
      { ...ok, yaw: NaN },
      { ...ok, seq: 1.5 },
      { ...ok, deploy: "yes" },
      { ...ok, v: 2 },
      [ok],
      null,
    ])
      expect(validateBrInput(bad)).toBeNull();
  });

  it("seats humans in bot seats before take-off only, gives a returning human their seat back", () => {
    const state = createBrMatch(meta, 42, heightAt);
    const a = seatHuman(state, "user-a", "Jesper");
    expect(a).toBeGreaterThanOrEqual(0);
    expect(seatHuman(state, "user-a", "Jesper")).toBe(a);
    expect(state.seats.filter((s) => !s.bot)).toHaveLength(1);
    run(state, (s) => s.phase === "plane");
    expect(seatHuman(state, "user-b", "Late")).toBe(-1); // no seats once the plane is up
    releaseSeat(state, a);
    expect(state.seats[a]!.bot).toBe(true);
    expect(seatHuman(state, "user-a", "Jesper")).toBe(-1);
  });

  it("counts down, flies the plane, drops all 100 (bots and a human), then goes live", () => {
    const state = createBrMatch(meta, 7, heightAt);
    const me = seatHuman(state, "user-a", "Jesper");
    let jumpedAt = -1;
    const ticks = run(
      state,
      (s) => s.phase === "active",
      (now) => {
        // The human tries to leave immediately (refused by the window), then jumps at 30 s.
        const planeMs = now - state.phaseAt;
        const want = state.phase === "plane" && (planeMs < 2000 || planeMs > 30_000);
        if (want && state.seats[me]!.body.phase === "plane" && planeMs > 30_000) jumpedAt = planeMs;
        return new Map([[me, input(now, { jumpOut: want, forward: 1 })]]);
      },
    );
    expect(state.phase).toBe("active");
    expect(state.seats.every((s) => ["ground", "swim"].includes(s.body.phase))).toBe(true);
    expect(jumpedAt).toBeGreaterThan(30_000);
    expect(ticks.length * TICK_MS).toBeGreaterThan(BR_RULES.countdownMs + routeMs(state.route));
    const sorted = [...ticks].sort((x, y) => x - y);
    expect(sorted[Math.floor(sorted.length * 0.99)]!).toBeLessThan(12);
  });

  it("sends nearby and airborne players, never hidden far players", () => {
    const state = createBrMatch(meta, 9, heightAt);
    state.phase = "active";
    const sight = new BrSight();
    const at = (
      seat: number,
      x: number,
      z: number,
      phase: "ground" | "parachute" = "ground",
      up = 0,
    ) => {
      const b = state.seats[seat]!.body;
      Object.assign(b, { x, z, y: hf.heightAt(x, z) + up, phase });
    };
    for (const s of state.seats) at(s.seat, 4000, 4000); // everyone parked far away
    at(0, 0, -1500); // me, open country north of Crossroads
    at(1, 150, -1500); // 150 m: always sent
    at(2, 0, 500); // 2 km: never on the ground
    at(3, 0, 600, "parachute", 200); // 2.1 km but in the air: sent
    const view = brViewFor(state, world, sight, 0, 0);
    const seats = view.players.map((r) => r[0]);
    expect(seats).toContain(1);
    expect(seats).not.toContain(2);
    expect(seats).toContain(3);
    expect(JSON.stringify(view).length).toBeLessThan(4000);
  });
});
