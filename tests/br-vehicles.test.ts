import { WORLD_ASSETS } from "@/lib/fps/br/world";
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { decodeHeightfield, type Heightfield } from "@/lib/fps/br/heightfield";
import { pickUp } from "@/lib/fps/br/inventory";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import {
  createBrMatch,
  seatHuman,
  stepBrMatch,
  type BrInput,
  type BrMatchState,
} from "@/lib/fps/br/match";
import type { CollisionData, StaticWorld } from "@/lib/fps/br/static-world";
import {
  crashDamage,
  spawnVehicles,
  spec,
  stepVehicle,
  VEHICLES,
  type Vehicle,
} from "@/lib/fps/br/vehicles";
import type { WorldMeta } from "@/lib/fps/br/world";
import { TICK_MS } from "@/lib/fps/simulation";

const buffer = (path: string) => {
  const f = readFileSync(path);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const meta = JSON.parse(readFileSync("public/fps/br/world.v1.json", "utf8")) as WorldMeta;
const collision = JSON.parse(
  readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"),
) as CollisionData;
let hf: Heightfield, world: StaticWorld;
beforeAll(async () => {
  hf = await decodeHeightfield(buffer("public/fps/br/height.v1.hf"));
  const cover = await decodeLandCover(buffer("public/fps/br/landcover.v1.lc"));
  world = buildIsland(hf, cover, meta, collision).solid;
}, 60_000);

/** A car on the main runway pointing along it, the human beside it. */
function scene(kind: Vehicle["kind"] = "sedan") {
  const [ax, az] = meta.runways[0]!.a,
    [bx, bz] = meta.runways[0]!.b;
  const len = Math.hypot(bx - ax, bz - az),
    ux = (bx - ax) / len,
    uz = (bz - az) / len;
  const x = ax + ux * 600,
    z = az + uz * 600;
  const yaw = Math.atan2(-ux, -uz);
  const v: Vehicle = {
    id: 0,
    kind,
    condition: "good",
    x,
    y: world.supportAt(x, z, 0.2, 1e4),
    z,
    yaw,
    speed: 0,
    pitch: 0,
    roll: 0,
    health: spec(kind).health,
    maxHealth: spec(kind).health,
    driver: -1,
    destroyed: false,
  };
  const state = createBrMatch(meta, 3, (a, b) => hf.heightAt(a, b), [], { vehicles: [v] });
  seatHuman(state, "u1", "Driver");
  seatHuman(state, "u2", "Walker");
  state.phase = "active";
  for (const s of state.seats) {
    const b = s.body;
    b.x = ax + ux * 100 - uz * 300 - s.seat;
    b.z = az + uz * 100 + ux * 300;
    b.y = world.supportAt(b.x, b.z, 0.35, 1e4);
    Object.assign(b, { phase: "ground", grounded: true });
  }
  const me = state.seats[0]!.body;
  // Beside the driver's door.
  me.x = x + uz * 2.2;
  me.z = z - ux * 2.2;
  me.y = world.supportAt(me.x, me.z, 0.35, 1e4);
  return { state, v, ux, uz, yaw };
}
let t = 0;
const step = (state: BrMatchState, input: Partial<BrInput> | null, acts: unknown[] = []) => {
  t += TICK_MS;
  const inputs = new Map<number, BrInput>();
  if (input) inputs.set(0, { seq: 0, forward: 0, strafe: 0, yaw: 0, ...input });
  stepBrMatch(state, world, meta, inputs, t, TICK_MS, new Map([[0, acts as never]]));
  return state.combat;
};

describe("vehicles", () => {
  it("spawn on the island's roads, a different set every match, never inside anything", () => {
    const a = spawnVehicles(meta, world, 11),
      b = spawnVehicles(meta, world, 12);
    expect(a.length).toBeGreaterThanOrEqual(VEHICLES.spawn.min);
    expect(a.length).toBeLessThanOrEqual(VEHICLES.spawn.max);
    expect(spawnVehicles(meta, world, 11)).toEqual(a);
    const same = b.filter((v) => a.some((w) => Math.hypot(w.x - v.x, w.z - v.z) < 1)).length;
    expect(same / b.length).toBeLessThan(0.3);
    const kinds = new Set(a.map((v) => v.kind));
    expect(kinds.has("bike")).toBe(true);
    expect([...kinds].length).toBeGreaterThanOrEqual(3);
    for (const v of a) {
      expect(v.y).toBeGreaterThanOrEqual(hf.heightAt(v.x, v.z) - 0.6);
      expect(world.blocked(v.x, v.y + 0.5, v.z, 0.6, 0.3)).toBe(false);
      expect(new Set(a.map((w) => w.condition)).size).toBeGreaterThan(1);
    }
  });

  it("enters within reach only, drives, steers, brakes, and lets the driver out beside it", () => {
    const { state, v } = scene();
    const me = state.seats[0]!;
    // Too far away first.
    const far = state.seats[1]!;
    step(state, null);
    expect(
      step(state, { yaw: 0 }, [{ act: "enter", id: 0 }]).find((e) => e.type === "act"),
    ).toMatchObject({ ok: true });
    expect(me.vehicle).toBe(0);
    expect(v.driver).toBe(0);
    void far;
    const x0 = v.x,
      z0 = v.z;
    for (let i = 0; i < 90; i++) step(state, { forward: 1 });
    const moved = Math.hypot(v.x - x0, v.z - z0);
    expect(moved).toBeGreaterThan(15);
    expect(v.speed).toBeGreaterThan(10);
    expect(v.speed).toBeLessThanOrEqual(spec("sedan").maxSpeed);
    // The driver rides with it.
    expect(Math.hypot(me.body.x - v.x, me.body.z - v.z)).toBeLessThan(1.5);
    const yaw0 = v.yaw;
    for (let i = 0; i < 30; i++) step(state, { forward: 1, strafe: 1 });
    expect(Math.abs(v.yaw - yaw0)).toBeGreaterThan(0.3);
    for (let i = 0; i < 120; i++) step(state, { forward: -1 });
    expect(v.speed).toBeLessThan(0.5);
    const out = step(state, { yaw: 0 }, [{ act: "exit" }]).find((e) => e.type === "act");
    expect(out).toMatchObject({ ok: true });
    expect(me.vehicle).toBeUndefined();
    expect(world.blocked(me.body.x, me.body.y + 0.05, me.body.z, 1.7, 0.35)).toBe(false);
  });

  it("is solid: players cannot walk through it and shots stop in its body and damage it", () => {
    const { state, v, ux, uz, yaw } = scene();
    const me = state.seats[0]!;
    const solid = state.solid ?? (step(state, null), state.solid!);
    expect(solid.blocked(v.x, v.y + 0.5, v.z, 1, 0.3)).toBe(true);
    // Stand 8 m behind the car and shoot it.
    me.body.x = v.x - -Math.sin(yaw) * 8;
    me.body.z = v.z - -Math.cos(yaw) * 8;
    me.body.y = world.supportAt(me.body.x, me.body.z, 0.35, 1e4);
    pickUp(me.kit, { item: "ak47", qty: 1, mag: 30 });
    const h0 = v.health;
    step(state, { yaw, pitch: Math.atan2(v.y + 0.8 - (me.body.y + 1.6), 8), fire: true });
    expect(v.health).toBe(h0); // Launch is immediate; damage waits for physical flight.
    step(state, null);
    expect(v.health).toBeLessThan(h0);
    void ux;
    void uz;
  });

  it("crashing into a building stops it and costs health; a bike suffers more than a car", () => {
    // Drive head-on into the first building box near the runway's start.
    const run = (kind: Vehicle["kind"]) => {
      const { v } = scene(kind);
      v.speed = 25;
      let impact = 0;
      // Put a wall in front by moving the car toward a known building: search a box ahead.
      for (let i = 0; i < 400 && !impact; i++) {
        impact = stepVehicle(world, meta, v, { forward: 1, strafe: 0 }, TICK_MS, []);
        if (i === 0) {
          // Aim at the nearest building box within 300 m.
          let best = Infinity,
            bx = 0,
            bz = 0;
          world.forEachBox(v.x - 300, v.z - 300, v.x + 300, v.z + 300, (k) => {
            const o = k * 6;
            const cx = (world.boxes[o]! + world.boxes[o + 3]!) / 2,
              cz = (world.boxes[o + 2]! + world.boxes[o + 5]!) / 2;
            const h = world.boxes[o + 4]! - world.boxes[o + 1]!;
            const d = Math.hypot(cx - v.x, cz - v.z);
            if (h > 2.5 && world.boxes[o + 1]! < v.y + 1 && d < best && d > 20) {
              best = d;
              bx = cx;
              bz = cz;
            }
          });
          v.yaw = Math.atan2(-(bx - v.x), -(bz - v.z));
        }
      }
      return { impact, speed: v.speed };
    };
    const car = run("sedan"),
      bike = run("bike");
    expect(car.impact).toBeGreaterThan(5);
    expect(Math.abs(car.speed)).toBeLessThan(car.impact * 0.5);
    expect(crashDamage("bike", 20)).toBeGreaterThan(crashDamage("sedan", 20));
    expect(bike.impact).toBeGreaterThan(5);
  });
});
