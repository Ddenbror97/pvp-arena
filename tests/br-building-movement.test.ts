/**
 * Movement at buildings, map wide (collision audit 2026-11-27: "movement becomes laggy, jittery,
 * stiff … close to building geometry"). Every building model with a doorway is walked from its
 * first door at sixteen headings, as the game steps a body and as the client draws it; the full
 * sweep (every door, both paces, both frame rates) is scripts/br/map-audit's wall-slide and
 * view-smooth, the costs are collision-bench and frame-cost.
 */
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { withDoors, type DoorSet } from "@/lib/fps/br/doors";
import { newDropBody, stepDrop, type DropInput, type Route } from "@/lib/fps/br/drop";
import { BrFrameView } from "@/lib/fps/br/frame-view";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { stepBody, type BrBody } from "@/lib/fps/br/movement";
import { withPanes } from "@/lib/fps/br/panes";
import type { CollisionData, StaticWorld } from "@/lib/fps/br/static-world";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";
import { EYE_HEIGHT, PLAYER_RADIUS } from "@/lib/fps/map";
import { MOVE_SPEED, TICK_MS } from "@/lib/fps/simulation";

const buffer = (path: string) => {
  const f = readFileSync(path);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const meta = JSON.parse(readFileSync(`public${WORLD_ASSETS.meta}`, "utf8")) as WorldMeta;
const collision = JSON.parse(
  readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"),
) as CollisionData;
const route: Route = { a: [0, 0], b: [1, 0], dir: [1, 0], length: 1 };
const HULL = EYE_HEIGHT + 0.2;

let solid: StaticWorld, world: StaticWorld;
/** The first doorway of every building model that has one. */
let doors: DoorSet["doors"];
beforeAll(async () => {
  const hf = await decodeHeightfield(buffer(`public${WORLD_ASSETS.height}`));
  const cover = await decodeLandCover(buffer(`public${WORLD_ASSETS.landcover}`));
  const isl = buildIsland(hf, cover, meta, collision);
  solid = isl.solid;
  world = withPanes(
    withDoors(solid, isl.doors, new Uint8Array(isl.doors.doors.length).fill(1)),
    isl.panes,
    new Uint8Array(isl.panes.count),
  );
  const seen = new Set<string>();
  doors = isl.doors.doors.filter((d) => !seen.has(d.model) && seen.add(d.model));
}, 120_000);

const heading = (h: number) => (h / 16) * Math.PI * 2 + 0.05;
const stand = (d: { x: number; z: number; y0: number }): BrBody => ({
  x: d.x,
  y: world.supportAt(d.x, d.z, PLAYER_RADIUS, d.y0 + 0.3),
  z: d.z,
  velocityY: 0,
  grounded: true,
  crouched: false,
});

describe("a hull's queries in buildings", () => {
  it("answer as the stored boxes do, in every cell a body crosses", () => {
    // The boxes alone (no trunks, decks or road surface), asked the plain way: every box of
    // the hull's cells through the coordinate store, as the queries read them before.
    const bare = Object.create(solid, {
      vegetation: { value: null },
      decks: { value: [] },
      roadTop: { value: null },
    }) as StaticWorld;
    const b = solid.boxes;
    const blocked = (x: number, y: number, z: number, height: number, radius: number) => {
      let hit = false;
      solid.forEachBox(x - radius, z - radius, x + radius, z + radius, (i) => {
        const o = i * 6;
        if (
          x + radius > b.get(o) + 1e-7 &&
          x - radius < b.get(o + 3) - 1e-7 &&
          z + radius > b.get(o + 2) + 1e-7 &&
          z - radius < b.get(o + 5) - 1e-7 &&
          y + height > b.get(o + 1) + 1e-7 &&
          y < b.get(o + 4) - 1e-7
        )
          hit = true;
      });
      return hit;
    };
    const support = (x: number, z: number, radius: number, maxY: number) => {
      let top = solid.hf.heightAt(x, z);
      solid.forEachBox(x - radius, z - radius, x + radius, z + radius, (i) => {
        const o = i * 6;
        const t = b.get(o + 4);
        if (
          t > top &&
          t <= maxY + 1e-6 &&
          x + radius > b.get(o) &&
          x - radius < b.get(o + 3) &&
          z + radius > b.get(o + 2) &&
          z - radius < b.get(o + 5)
        )
          top = t;
      });
      return top;
    };
    // A seeded scatter about every doorway, on every storey: in walls, on stairs, under slabs.
    let seed = 20261127;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    let asked = 0,
      wrong = 0,
      hits = 0;
    for (const d of doors)
      for (let n = 0; n < 240; n++) {
        const x = d.x + (random() - 0.5) * 24,
          z = d.z + (random() - 0.5) * 24,
          y = d.y0 + random() * 12 - 1,
          radius = n % 5 ? PLAYER_RADIUS : 0.05,
          height = n % 3 ? HULL : 1.2;
        const want = blocked(x, y, z, height, radius);
        if (bare.blocked(x, y, z, height, radius) !== want) wrong++;
        if (bare.supportAt(x, z, radius, y + 0.35) !== support(x, z, radius, y + 0.35)) wrong++;
        if (bare.supportAt(x, z, radius, 1e4) !== support(x, z, radius, 1e4)) wrong++;
        if (want) hits++;
        asked++;
      }
    expect(asked).toBeGreaterThan(20_000);
    // (The scatter does land in walls and floors: it is not a comparison of empty air.)
    expect(hits).toBeGreaterThan(asked / 10);
    expect(wrong).toBe(0);
  });

  it("are kept for every body at once, and an old generation of cells is let go", () => {
    // A hundred bodies spread over the island's buildings, asked in turn again and again (a
    // server's tick): none decodes another's cell out. Then far more cells than a generation
    // holds: the memory stays bounded and the answers stay right (the test above ran first).
    const hot = (
      solid as unknown as {
        hot: { young: Map<number, Float32Array>; old: Map<number, Float32Array>; bytes: number };
      }
    ).hot;
    const spots = doors.slice(0, 100);
    const walked = () =>
      spots.slice(0, 30).map((d, k) => {
        const b = stand(d);
        for (let i = 0; i < 60; i++)
          stepBody(world, b, { forward: 1, strafe: 0, yaw: heading(k), sprint: true }, TICK_MS);
        return [b.x, b.y, b.z];
      });
    const first = walked();
    for (const d of spots) solid.blocked(d.x, d.y0, d.z, HULL, PLAYER_RADIUS);
    const held = () => new Set([...hot.young.values(), ...hot.old.values()]);
    const before = held();
    for (let round = 0; round < 5; round++)
      for (const d of spots) solid.blocked(d.x, d.y0, d.z, HULL, PLAYER_RADIUS);
    // (Nothing decoded anew: the same arrays, none added.)
    const after = held();
    expect(after.size).toBe(before.size);
    for (const a of after) expect(before.has(a)).toBe(true);
    const bytes = (m: Map<number, Float32Array>) => {
      let n = 0;
      for (const a of m.values()) n += a.byteLength;
      return n;
    };
    let most = 0;
    for (let x = -1500; x <= 1500; x += 4)
      for (let z = -1500; z <= 1500; z += 4) {
        solid.blocked(x, 0, z, HULL, PLAYER_RADIUS);
        most = Math.max(most, hot.bytes);
      }
    expect(hot.old.size).toBeGreaterThan(0);
    expect(most).toBeLessThanOrEqual(4 << 20);
    // The same walks after all of that end where they did before, to the bit.
    expect(walked()).toEqual(first);
    expect(bytes(hot.young) + bytes(hot.old)).toBeLessThan(10 << 20);
  });
});

describe("a body along the walls of every building model", () => {
  it("slides: no step back, no stick and slip, no way into a wall, never more than its pace", () => {
    const ticks = Math.round(3000 / TICK_MS);
    const total = { back: 0, bounce: 0, stutter: 0, inside: 0, fast: 0, ticks: 0 };
    for (const d of doors)
      for (let h = 0; h < 16; h++) {
        const yaw = heading(h);
        const hx = -Math.sin(yaw),
          hz = -Math.cos(yaw);
        const b = stand(d);
        const flips: Array<[number, number]> = [];
        let still = 0,
          moving = false;
        for (let i = 0; i < ticks; i++) {
          const x0 = b.x,
            z0 = b.z;
          stepBody(world, b, { forward: 1, strafe: 0, yaw, jump: false, sprint: true }, TICK_MS);
          const mx = b.x - x0,
            mz = b.z - z0,
            len = Math.hypot(mx, mz);
          const along = mx * hx + mz * hz,
            across = mx * hz - mz * hx;
          // (Not the first ticks: a start in a doorway's frame is put right by `unstick`.)
          if (i > 2) {
            if (along < -0.005) total.back++;
            if (world.blocked(b.x, b.y + 0.36, b.z, HULL - 0.36, PLAYER_RADIUS - 0.01))
              total.inside++;
            // (A sprint's step: the corner assist spends the step's length, never more.)
            if (len > (MOVE_SPEED * 1.5 * TICK_MS) / 1000 + 1e-6) total.fast++;
          }
          if (Math.abs(across) > 0.01) {
            const sign = Math.sign(across);
            if (!flips.length || flips[flips.length - 1]![1] !== sign) flips.push([i, sign]);
            else flips[flips.length - 1]![0] = i;
            if (flips.length >= 3 && i - flips[flips.length - 3]![0] <= 6) {
              total.bounce++;
              flips.length = 0;
            }
          }
          if (len < 1e-4) still++;
          else {
            if (moving && still > 0 && still <= 3) total.stutter++;
            still = 0;
            moving = true;
          }
          total.ticks++;
        }
      }
    expect(doors.length).toBeGreaterThan(100);
    expect(total.inside).toBe(0);
    expect(total.fast).toBe(0);
    expect(total.stutter).toBe(0);
    // (Measured: 9 ticks of 180,000 give a centimetre back as the corner assist takes a body
    // round a jamb, and two runs weave once between a pair of posts.)
    expect(total.back).toBeLessThan(total.ticks / 10_000);
    expect(total.bounce).toBeLessThan(6);
  }, 120_000);
});

describe("the first-person view along the walls of every building model", () => {
  it("does not shake or lurch, and stays within a step of the body", () => {
    const FPS = 144;
    const frameMs = 1000 / FPS;
    const zero = { x: 0, y: 0, z: 0 };
    const total = { back: 0, shake: 0, far: 0, frames: 0 };
    for (const d of doors)
      for (let h = 0; h < 16; h += 2) {
        const yaw = heading(h);
        const hx = -Math.sin(yaw),
          hz = -Math.cos(yaw);
        const input = { forward: 1, strafe: 0, yaw, jump: false, sprint: true } as DropInput;
        const body = Object.assign(newDropBody(), stand(d), { phase: "ground" as const });
        const view = new BrFrameView();
        let acc = 0,
          lx = NaN,
          lz = NaN;
        const across: number[] = [];
        for (let f = 0; f < 3 * FPS; f++) {
          acc += frameMs;
          while (acc >= TICK_MS) {
            stepDrop(world, meta, route, body, input, 0, TICK_MS);
            acc -= TICK_MS;
          }
          const v = view.sample(world, meta, route, body, input, 0, acc, frameMs, zero);
          if (f > 8 && Number.isFinite(lx)) {
            const mx = v.x - lx,
              mz = v.z - lz;
            if (mx * hx + mz * hz < -0.001) total.back++;
            across.push(mx * hz - mz * hx);
            const n = across.length;
            if (
              n >= 3 &&
              Math.abs(across[n - 1]!) > 0.0004 &&
              Math.abs(across[n - 2]!) > 0.0004 &&
              Math.abs(across[n - 3]!) > 0.0004 &&
              Math.sign(across[n - 1]!) !== Math.sign(across[n - 2]!) &&
              Math.sign(across[n - 2]!) !== Math.sign(across[n - 3]!)
            )
              total.shake++;
            // The view is where the body is or is about to be: smoothing hides nothing.
            // (A sprint's step is 0.25 m; the most measured is 0.24.)
            if (Math.hypot(v.x - body.x, v.z - body.z) > 0.3) total.far++;
            total.frames++;
          }
          lx = v.x;
          lz = v.z;
        }
      }
    expect(total.frames).toBeGreaterThan(400_000);
    expect(total.shake).toBe(0);
    expect(total.far).toBe(0);
    // (Measured: 39 frames of 423,000, where the body's own step is turned by a corner.)
    expect(total.back).toBeLessThan(total.frames / 5000);
  }, 180_000);
});

describe("a prediction along the walls of every building model, reconciled", () => {
  it("is not corrected at 50, 150 or 400 ms with jitter and lost snapshots", () => {
    // The client's loop (br-arena.ts): an input a tick, stepped at once and kept until the room
    // acknowledges it; a snapshot carries the room's body after some input, the client takes
    // it and replays what is still unacknowledged. What the view would have to glide over is
    // the distance between where the prediction stood and where the replay leaves it. The
    // steering turns and changes pace as it scrapes along the walls.
    const wire = <T>(v: T) => JSON.parse(JSON.stringify(v)) as T;
    let seed = 7;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const ticks = Math.round(3000 / TICK_MS);
    for (const latency of [50, 150, 400]) {
      let worst = 0,
        replays = 0,
        longest = 0;
      for (const d of doors)
        for (let h = 0; h < 16; h += 4) {
          const start = Object.assign(newDropBody(), stand(d), { phase: "ground" as const });
          const room = wire(start),
            mine = wire(start);
          const sent: Array<{ seq: number; input: DropInput }> = [];
          const rooms: Array<typeof room> = [];
          let yaw = heading(h),
            sprint = true,
            acknowledged = -1;
          for (let i = 0; i < ticks; i++) {
            if (i % 12 === 11) {
              yaw += (random() - 0.5) * 1.6;
              sprint = random() < 0.7;
            }
            const input = { forward: 1, strafe: 0, yaw, jump: false, sprint } as DropInput;
            sent.push({ seq: i, input });
            stepDrop(world, meta, route, mine, input, 0, TICK_MS);
            // (The room steps the same inputs in order; when it does is the latency below.)
            stepDrop(world, meta, route, room, input, 0, TICK_MS);
            rooms.push(wire(room));
            // A snapshot a round trip old, give or take a third; one in twenty is lost.
            const age = Math.round((latency * (1 + (random() - 0.5) * 0.66)) / TICK_MS);
            const seq = i - Math.max(1, age);
            if (seq <= acknowledged || random() < 0.05) continue;
            acknowledged = seq;
            const before = { x: mine.x, y: mine.y, z: mine.z };
            Object.assign(mine, wire(rooms[seq]!));
            while (sent.length && sent[0]!.seq <= seq) sent.shift();
            for (const p of sent) stepDrop(world, meta, route, mine, p.input, 0, TICK_MS);
            worst = Math.max(
              worst,
              Math.hypot(mine.x - before.x, mine.y - before.y, mine.z - before.z),
            );
            longest = Math.max(longest, sent.length);
            replays++;
          }
        }
      expect(replays).toBeGreaterThan(10_000);
      expect(longest).toBeGreaterThanOrEqual(Math.floor(latency / TICK_MS));
      expect(worst, `${latency} ms`).toBe(0);
    }
  }, 180_000);
});

describe("a wall drawn at an angle (a staircase of boxes)", () => {
  it("is run along without a tick's standing: Blackwater's quay parapet", () => {
    // The parapet runs 15° off the axes: a box every 0.75 m of it, each 0.2 m further out.
    // A sprint along it caught on every one (two ticks sideways without going, of every five).
    const poi = meta.pois.find((p) => p.id === "blackwater-prison")!;
    const x = poi.x + 24.2,
      z = poi.z + 9.2;
    const b: BrBody = {
      x,
      y: world.supportAt(x, z, PLAYER_RADIUS, poi.padHeight! + 0.4),
      z,
      velocityY: 0,
      grounded: true,
      crouched: false,
    };
    const input = { forward: 1, strafe: 0, yaw: 0.05, jump: false, sprint: true };
    const step = (MOVE_SPEED * 1.5 * TICK_MS) / 1000;
    let caught = 0,
      least = Infinity;
    for (let i = 0; i < 60; i++) {
      const x0 = b.x,
        z0 = b.z;
      stepBody(world, b, input, TICK_MS);
      const along = -(b.x - x0) * Math.sin(0.05) - (b.z - z0) * Math.cos(0.05);
      least = Math.min(least, along);
      // (The wall is met from the seventh tick on.)
      if (i > 6 && Math.hypot(b.x - x0, b.z - z0) < step * 0.6) caught++;
    }
    expect(Math.hypot(b.x - x, b.z - z)).toBeGreaterThan(11);
    expect(caught).toBe(0);
    expect(least).toBeGreaterThan(0.05);
  });
});
