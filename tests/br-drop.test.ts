import { WORLD_ASSETS } from "@/lib/fps/br/world";
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import {
  DROP,
  newDropBody,
  planeAt,
  planeRoute,
  routeMs,
  stepDrop,
  type DropBody,
  type DropInput,
  type Route,
} from "@/lib/fps/br/drop";
import { dropBotInput, glideReach, planDropBots, poiCap } from "@/lib/fps/br/drop-bots";
import { decodeHeightfield, type Heightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import type { StaticWorld, CollisionData } from "@/lib/fps/br/static-world";
import { WORLD_HALF, type WorldMeta } from "@/lib/fps/br/world";
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
});

const idle: DropInput = { forward: 0, strafe: 0, yaw: 0 };
/** A body already in freefall at x/z and height y (as if it had just left the plane there). */
const falling = (x: number, z: number, y: number): DropBody => ({
  ...newDropBody(),
  phase: "freefall",
  x,
  y,
  z,
});
/** Steps until the phase changes away from `from` or `maxS` seconds pass. */
function until(
  route: Route,
  b: DropBody,
  done: (b: DropBody) => boolean,
  input: DropInput = idle,
  maxS = 300,
  startMs = 60_000,
) {
  let ms = startMs;
  const changes: string[] = [];
  for (let t = 0; t < (maxS * 1000) / TICK_MS && !done(b); t++) {
    const c = stepDrop(world, meta, route, b, input, ms, TICK_MS);
    if (c) changes.push(c);
    ms += TICK_MS;
  }
  return changes;
}

describe("Project Island drop: plane, freefall, parachute, landing", () => {
  it("flies a seeded straight route that starts and ends off the map and crosses near the centre", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const r = planeRoute(seed);
      expect(planeRoute(seed)).toEqual(r);
      for (const p of [r.a, r.b])
        expect(Math.max(Math.abs(p[0]), Math.abs(p[1]))).toBeGreaterThan(WORLD_HALF);
      // Closest approach to the centre.
      const d = Math.abs(r.a[0] * r.dir[1] - r.a[1] * r.dir[0]);
      expect(d).toBeLessThanOrEqual(DROP.routeCentreBand + 1);
      expect(routeMs(r)).toBe(30_000);
      const middle = planeAt(r, 15_000);
      expect(Math.hypot(middle[0] - r.a[0], middle[2] - r.a[1])).toBeCloseTo(r.length / 2, 4);
      const end = planeAt(r, 30_000);
      expect(Math.hypot(end[0] - r.b[0], end[2] - r.b[1])).toBeLessThan(0.15);
      expect(planeAt(r, 60_000)).toEqual(end);
    }
    expect(planeRoute(1)).not.toEqual(planeRoute(2));
  });

  it("refuses a jump before the window opens, honours one after, ejects everyone at the end", () => {
    const route = planeRoute(7);
    const b = newDropBody();
    expect(stepDrop(world, meta, route, b, { ...idle, jumpOut: true }, 500, TICK_MS)).toBeNull();
    expect(b.phase).toBe("plane");
    const [px, , pz] = planeAt(route, 500);
    expect(Math.hypot(b.x - px, b.z - pz)).toBeLessThan(0.01);
    // The canopy opens on leaving the plane (owner, 2026-11-05: no freefall).
    expect(stepDrop(world, meta, route, b, { ...idle, jumpOut: true }, 12_000, TICK_MS)).toBe(
      "parachute",
    );
    const stay = newDropBody();
    expect(stepDrop(world, meta, route, stay, idle, routeMs(route) + 1, TICK_MS)).toBe("parachute");
  });

  it("falls at the researched speeds and opens the parachute at 300 m above the ground", () => {
    const route = planeRoute(3);
    const x = 0,
      z = -1500; // north of Crossroads
    const b = falling(x, z, 800);
    stepDrop(world, meta, route, b, idle, 60_000, TICK_MS);
    expect(-b.velocityY).toBeCloseTo(DROP.freefall.neutral, 5);
    const dive = falling(x, z, 800);
    stepDrop(world, meta, route, dive, { ...idle, forward: 1, dive: true }, 60_000, TICK_MS);
    expect(-dive.velocityY).toBeCloseTo(DROP.freefall.diveDown, 5);
    const changes = until(route, b, (q) => q.phase !== "freefall");
    expect(changes).toEqual(["parachute"]);
    // Height above whatever is below (terrain or a roof: Crossroads' grid now reaches here).
    const agl = b.y - world.supportAt(b.x, b.z, 0.35, b.y);
    expect(agl).toBeLessThanOrEqual(DROP.autoDeployAgl + 1);
    expect(agl).toBeGreaterThan(DROP.autoDeployAgl - DROP.freefall.neutral * (TICK_MS / 1000) - 1);
  });

  it("opens by hand when high enough and rejects opening near or under the ground", () => {
    const route = planeRoute(3);
    const high = falling(0, -1500, 700);
    expect(stepDrop(world, meta, route, high, { ...idle, deploy: true }, 60_000, TICK_MS)).toBe(
      "parachute",
    );
    // A freefaller 20 m above the ground cannot exist past auto-deploy; a deploy there is ignored
    // as a manual opening (auto-deploy has already happened), and nobody opens underground.
    const ground = hf.heightAt(0, -1500);
    const low = falling(0, -1500, ground + 20);
    low.phase = "freefall";
    const c = stepDrop(world, meta, route, low, { ...idle, deploy: true }, 60_000, TICK_MS);
    expect(c).toBe("parachute"); // auto-deploy (≤ 300 m) – not the manual request
    const under = falling(0, -1500, ground - 5);
    under.phase = "ground";
    expect(
      stepDrop(world, meta, route, under, { ...idle, deploy: true }, 60_000, TICK_MS),
    ).not.toBe("parachute");
    expect(under.phase).not.toBe("parachute");
  });

  it("cannot be pushed past the speed limits by inflated inputs (no teleports)", () => {
    const route = planeRoute(3);
    const b = falling(0, -1500, 780);
    const x0 = b.x,
      z0 = b.z;
    for (let t = 0; t < 30; t++)
      stepDrop(world, meta, route, b, { forward: 1e6, strafe: 1e6, yaw: 0.7 }, 60_000, TICK_MS);
    const metres = Math.hypot(b.x - x0, b.z - z0);
    expect(metres).toBeLessThanOrEqual(DROP.freefall.glideForward * 30 * (TICK_MS / 1000) + 0.01);
  });

  it("treats NaN and infinite inputs as zero in every phase (positions stay finite)", () => {
    const route = planeRoute(3);
    const bad: DropInput = {
      forward: NaN,
      strafe: Infinity,
      yaw: NaN,
      jumpOut: true,
      deploy: true,
    };
    const b = falling(0, -1500, 800);
    const changes = until(route, b, (q) => q.phase === "ground", bad);
    expect(changes).toEqual(["parachute", "ground"]);
    until(route, b, () => false, bad, 2);
    for (const v of [b.x, b.y, b.z, b.vx, b.vz]) expect(Number.isFinite(v)).toBe(true);
  });

  it("lands on the ground and walks off; lands on the superstore roof", () => {
    const route = planeRoute(3);
    const b = falling(0, -1500, 800);
    const changes = until(route, b, (q) => q.phase === "ground");
    expect(changes).toEqual(["parachute", "ground"]);
    expect(Math.abs(b.y - world.supportAt(b.x, b.z, 0.35, b.y + 0.01))).toBeLessThan(0.01);
    const x = b.x,
      z = b.z;
    until(route, b, () => false, { forward: 1, strafe: 0, yaw: 0 }, 2);
    expect(Math.hypot(b.x - x, b.z - z)).toBeGreaterThan(5);
    // Superstore: the roof is well above its pad.
    const store = meta.pois.find((p) => p.id === "island-superstore")!;
    const roofBody = falling(store.x, store.z, 600);
    // Braking and turning on the spot under the canopy (S + A): a tight spiral down.
    until(route, roofBody, (q) => q.phase === "parachute");
    until(route, roofBody, (q) => q.phase === "ground", { forward: -1, strafe: -1, yaw: 0 });
    expect(
      roofBody.y,
      `landed at ${(roofBody.x - store.x).toFixed(1)}, ${(roofBody.z - store.z).toFixed(1)}`,
    ).toBeGreaterThan(store.padHeight! + 5);
  });

  it("lands in the sea, swims to shore and walks out", () => {
    const route = planeRoute(3);
    // Over the strait between the mainland and the island, steering toward the island.
    const bridge = meta.bridges.find((b) => b.id === "west-bridge")!;
    const mx = (bridge.a[0] + bridge.b[0]) / 2 - 120,
      mz = (bridge.a[1] + bridge.b[1]) / 2;
    const b = falling(mx, mz, 400);
    const changes = until(route, b, (q) => q.phase === "parachute");
    changes.push(
      ...until(route, b, (q) => q.phase === "swim", {
        forward: -1,
        strafe: -1,
        yaw: 0,
      }),
    );
    expect(changes).toEqual(["parachute", "swim"]);
    expect(b.y).toBe(0);
    // Swim south (+z: yaw π) to the island shore.
    const out = until(
      route,
      b,
      (q) => q.phase === "ground",
      { forward: 1, strafe: 0, yaw: Math.PI },
      900,
    );
    expect(out).toEqual(["ground"]);
    expect(hf.heightAt(b.x, b.z)).toBeGreaterThan(-DROP.wadeDepth - 0.01);
  });

  it("glides long and predictably under the canopy (owner's parachute spec)", () => {
    const route = planeRoute(3);
    // A canopy opened at 300 m over open country, gliding (W) straight on.
    const open = (y: number) => {
      const b = falling(-1500, -800, hf.heightAt(-1500, -800) + y);
      b.phase = "parachute";
      b.vx = 0;
      b.vz = -13;
      return b;
    };
    const glide = open(300);
    const x0 = glide.x,
      z0 = glide.z;
    let ms = 0;
    const W: DropInput = { forward: 1, strafe: 0, yaw: 0 };
    while (glide.phase === "parachute" && ms < 200_000) {
      stepDrop(world, meta, route, glide, W, 60_000 + ms, TICK_MS);
      ms += TICK_MS;
    }
    const dist = Math.hypot(glide.x - x0, glide.z - z0);
    // Measured: ≈ 1.05 km in ≈ 80 s (glide ratio ≈ 3.6 : 1); PUBG's canopy did ≈ 220 m in 17 s.
    expect(dist).toBeGreaterThan(900);
    expect(dist / 300).toBeGreaterThan(3);
    expect(ms / 1000).toBeGreaterThan(60);
    expect(["ground", "swim"]).toContain(glide.phase);
    // Steady state: 13 m/s forward, 3.6 m/s down; braking: 3 forward, 6.5 down.
    const b = open(250);
    for (let t = 0; t < 120; t++) stepDrop(world, meta, route, b, W, 60_000, TICK_MS);
    expect(Math.hypot(b.vx, b.vz)).toBeCloseTo(DROP.parachute.glideForward, 1);
    expect(-b.velocityY).toBeCloseTo(DROP.parachute.glideDown, 5);
    const S: DropInput = { forward: -1, strafe: 0, yaw: 0 };
    for (let t = 0; t < 300; t++) stepDrop(world, meta, route, b, S, 60_000, TICK_MS);
    expect(Math.hypot(b.vx, b.vz)).toBeCloseTo(DROP.parachute.brakeForward, 1);
    expect(-b.velocityY).toBeCloseTo(DROP.parachute.brakeDown, 5);
  });

  it("dives under the canopy to land fast, and pulls out near the ground", () => {
    const route = planeRoute(3);
    const start = (dive: boolean) => {
      const b = newDropBody();
      stepDrop(world, meta, route, b, { ...idle, jumpOut: true }, 20_000, TICK_MS);
      expect(b.phase).toBe("parachute");
      let ms = 0,
        touch = 0;
      while (b.phase === "parachute" && ms < 400_000) {
        touch = -b.velocityY;
        stepDrop(world, meta, route, b, { forward: 1, strafe: 0, yaw: 0, dive }, 20_000, TICK_MS);
        ms += TICK_MS;
      }
      return { s: ms / 1000, touch, phase: b.phase };
    };
    const dived = start(true),
      glided = start(false);
    // Faster canopy dive, including the unchanged safe landing flare.
    expect(dived.s).toBeLessThan(45);
    expect(glided.s).toBeGreaterThan(dived.s * 2.5);
    expect(["ground", "swim"]).toContain(dived.phase);
    // The flare: never into the ground at the dive's sink rate.
    expect(dived.touch).toBeLessThanOrEqual(DROP.parachute.brakeDown + 0.01);
    // Steady dive: 34 m/s down once eased in.
    const b = falling(-1500, -800, hf.heightAt(-1500, -800) + 600);
    b.phase = "parachute";
    b.vz = -8;
    for (let t = 0; t < 150; t++)
      stepDrop(world, meta, route, b, { ...idle, dive: true }, 60_000, TICK_MS);
    expect(-b.velocityY).toBeCloseTo(DROP.parachute.diveDown, 1);
  });

  it("turns progressively with A/D, independent of where the player looks", () => {
    const route = planeRoute(3);
    const b = falling(-1500, -800, hf.heightAt(-1500, -800) + 280);
    b.phase = "parachute";
    b.vx = 0;
    b.vz = -13; // heading north (−z)
    // Looking around (yaw changes every step) without keys: the heading does not change.
    for (let t = 0; t < 60; t++)
      stepDrop(world, meta, route, b, { forward: 1, strafe: 0, yaw: t * 0.3 }, 60_000, TICK_MS);
    expect(Math.atan2(-b.vx, -b.vz)).toBeCloseTo(0, 6);
    // D for one second: a right turn of about 55° (never a snap).
    const before = Math.atan2(-b.vx, -b.vz);
    let maxStep = 0,
      prev = before;
    for (let t = 0; t < 1000 / TICK_MS; t++) {
      stepDrop(world, meta, route, b, { forward: 1, strafe: 1, yaw: 2 }, 60_000, TICK_MS);
      const h = Math.atan2(-b.vx, -b.vz);
      maxStep = Math.max(maxStep, Math.abs(h - prev));
      prev = h;
    }
    const turned = before - Math.atan2(-b.vx, -b.vz);
    expect((turned * 180) / Math.PI).toBeGreaterThan(45);
    expect((turned * 180) / Math.PI).toBeLessThan(60);
    expect(maxStep).toBeLessThan(0.05);
    // Turning radius at full glide: v / ω ≈ 13.5 m.
    expect(DROP.parachute.glideForward / DROP.parachute.turnRate).toBeLessThan(20);
  });

  it("rate-limits mouse steering, wraps the shortest way, and keeps keyboard overrides", () => {
    const route = planeRoute(3);
    const fly = (heading: number, canopyYaw?: number, strafe = 0) => {
      const b = falling(-1500, -800, 1000);
      b.phase = "parachute";
      b.vx = -13 * Math.sin(heading);
      b.vz = -13 * Math.cos(heading);
      stepDrop(
        world,
        meta,
        route,
        b,
        { ...idle, forward: 1, yaw: -2, strafe, canopyYaw },
        60000,
        TICK_MS,
      );
      return Math.atan2(-b.vx, -b.vz);
    };
    const step = (DROP.parachute.turnRate * TICK_MS) / 1000;
    expect(fly(0, 2)).toBeCloseTo(step, 6);
    expect(fly(0, -2)).toBeCloseTo(-step, 6);
    expect(fly(0, 0.002)).toBeCloseTo(0.002, 6);
    expect(fly(0, 2, 1)).toBeCloseTo(-step, 6);
    expect(fly(0)).toBeCloseTo(0, 6);
    const h = Math.PI - 0.005,
      next = fly(h, -Math.PI + 0.005);
    expect(Math.atan2(Math.sin(next - h), Math.cos(next - h))).toBeCloseTo(0.01, 6);
  });

  it("responds to forward input promptly and symmetrically steers left/right without changing glide limits", () => {
    const route = planeRoute(3);
    const fly = (strafe: number) => {
      const b = falling(-1500, -800, 1000);
      b.phase = "parachute";
      b.vz = -DROP.parachute.neutralForward;
      for (let t = 0; t < 500; t += TICK_MS)
        stepDrop(world, meta, route, b, { forward: 1, strafe, yaw: 2 }, 60_000, TICK_MS);
      return b;
    };
    const ahead = fly(0),
      left = fly(-1),
      right = fly(1);
    expect(Math.hypot(ahead.vx, ahead.vz)).toBeGreaterThan(11);
    expect(Math.hypot(ahead.vx, ahead.vz)).toBeLessThan(DROP.parachute.glideForward);
    expect(left.vx).toBeLessThan(0);
    expect(right.vx).toBeGreaterThan(0);
    expect(left.vx).toBeCloseTo(-right.vx, 8);
    expect(left.vz).toBeCloseTo(right.vz, 8);
  });

  it("recovers a held dive progressively across the flare height, with no abrupt sink-rate step", () => {
    const route = planeRoute(3);
    const flat = {
      ...world,
      supportAt: () => 10,
      blocked: () => false,
      hf: { ...hf, heightAt: () => 10 },
    } as StaticWorld;
    const b = falling(-1500, -800, 190);
    b.phase = "parachute";
    b.vz = -DROP.parachute.diveForward;
    b.velocityY = -DROP.parachute.diveDown;
    let last = -b.velocityY,
      maxChange = 0;
    const crossing: number[] = [];
    for (let t = 0; t < 30_000 && b.phase === "parachute"; t += TICK_MS) {
      stepDrop(flat, meta, route, b, { ...idle, dive: true }, 60_000, TICK_MS);
      if (b.phase !== "parachute") break;
      const down = -b.velocityY;
      maxChange = Math.max(maxChange, Math.abs(down - last));
      if (Math.abs(b.y - 10 - DROP.parachute.flareAgl) < 1) crossing.push(down);
      last = down;
    }
    expect(b.phase).toBe("ground");
    expect(maxChange).toBeLessThan(1.5);
    expect(crossing.length).toBeGreaterThan(1);
    expect(Math.max(...crossing)).toBeLessThan(9);
    expect(last).toBeLessThanOrEqual(DROP.parachute.brakeDown);
  });

  it("never comes off before landing: no input leaves the canopy in the air", () => {
    const route = planeRoute(3);
    const b = falling(-1500, -800, hf.heightAt(-1500, -800) + 200);
    b.phase = "parachute";
    const nasty: DropInput[] = [
      { forward: 0, strafe: 0, yaw: 0, jumpOut: true },
      { forward: 0, strafe: 0, yaw: 0, deploy: true },
      { forward: 1, strafe: 0, yaw: 0, dive: true },
      { forward: -1, strafe: 1, yaw: 0, jump: true, crouch: true, sprint: true },
    ];
    let changes: Array<string | null> = [];
    for (let t = 0; t < 2000 && b.phase === "parachute"; t++)
      changes.push(stepDrop(world, meta, route, b, nasty[t % nasty.length]!, 60_000, TICK_MS));
    changes = changes.filter(Boolean);
    expect(changes.length).toBe(1);
    expect(["ground", "swim"]).toContain(changes[0]);
  });

  it("covers the same ground at any step size (frame-rate independent integration)", () => {
    const route = planeRoute(3);
    const fly = (stepMs: number) => {
      const b = falling(-1500, -800, hf.heightAt(-1500, -800) + 250);
      b.phase = "parachute";
      b.vz = -13;
      for (let t = 0; t < 20_000 / stepMs; t++)
        stepDrop(world, meta, route, b, { forward: 1, strafe: 0.4, yaw: 0 }, 60_000, stepMs);
      return b;
    };
    const a = fly(TICK_MS),
      half = fly(TICK_MS / 2);
    expect(Math.hypot(a.x - half.x, a.z - half.z)).toBeLessThan(6);
    expect(Math.abs(a.y - half.y)).toBeLessThan(0.5);
  });

  it("reaches most of the island from the plane (share of land within a full glide)", () => {
    // From the plane's height, deploying at once and gliding: the horizontal reach either side
    // of the route, then the share of land points within that band over 20 routes.
    const reach = (DROP.planeAltitude / DROP.parachute.glideDown) * DROP.parachute.glideForward;
    expect(reach).toBeGreaterThan(2500);
    let land = 0,
      reached = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const r = planeRoute(seed);
      for (let x = -4800; x <= 4800; x += 200)
        for (let z = -4800; z <= 4800; z += 200) {
          if (hf.heightAt(x, z) < 1) continue;
          land++;
          const side = Math.abs((x - r.a[0]) * r.dir[1] - (z - r.a[1]) * r.dir[0]);
          if (side < reach) reached++;
        }
    }
    // Measured ≈ 60 % per route (was ≈ 15 % with PUBG's canopy and the 300 m opening).
    expect(reached / land).toBeGreaterThan(0.45);
  });

  it("is deterministic and keeps 100 participants well inside the tick budget", () => {
    const route = planeRoute(11);
    const run = () => {
      const bodies = Array.from({ length: 100 }, () => newDropBody());
      const ticks: number[] = [];
      let ms = 0;
      // The canopy from the plane's height: up to ~3 min without diving.
      for (let t = 0; ms < routeMs(route) + 240_000; t++, ms += TICK_MS) {
        const a = performance.now();
        bodies.forEach((b, i) => {
          // Each participant jumps at its own time and steers its own way.
          const input: DropInput = {
            forward: i % 3 === 0 ? 0 : 1,
            strafe: 0,
            yaw: (i * 0.37) % (Math.PI * 2),
            jumpOut: ms > DROP.jumpOpensMs + i * 900,
            dive: i % 4 === 0,
          };
          stepDrop(world, meta, route, b, input, ms, TICK_MS);
        });
        ticks.push(performance.now() - a);
      }
      return { bodies, ticks };
    };
    const one = run(),
      two = run();
    expect(two.bodies).toEqual(one.bodies);
    expect(one.bodies.every((b) => b.phase === "ground" || b.phase === "swim")).toBe(true);
    const sorted = [...one.ticks].sort((a, b) => a - b);
    const p99 = sorted[Math.floor(sorted.length * 0.99)]!;
    expect(p99).toBeLessThan(12);
  });

  it("bots pick reachable spots weighted to the hot drops and land on them", () => {
    let near = 0,
      total = 0;
    const byPoi: Record<string, number> = {};
    for (const seed of [1, 2, 3, 4, 5]) {
      const route = planeRoute(seed);
      const heightAt = (x: number, z: number) => hf.heightAt(x, z);
      const bots = planDropBots(meta, route, seed, 99, heightAt);
      expect(planDropBots(meta, route, seed, 99, heightAt)).toEqual(bots);
      const bodies = bots.map(() => newDropBody());
      for (let ms = 0; ms < routeMs(route) + 240_000; ms += TICK_MS)
        bodies.forEach((b, i) =>
          stepDrop(
            world,
            meta,
            route,
            b,
            dropBotInput(bots[i]!, b, route, ms, heightAt),
            ms,
            TICK_MS,
          ),
        );
      bodies.forEach((b, i) => {
        expect(["ground", "swim"]).toContain(b.phase);
        const [tx, tz] = bots[i]!.target;
        total++;
        if (Math.hypot(b.x - tx, b.z - tz) < 150) near++;
        const poi = meta.pois.find((p) => Math.hypot(p.x - tx, p.z - tz) < (p.padRadius ?? 200));
        if (poi) byPoi[poi.id] = (byPoi[poi.id] ?? 0) + 1;
      });
    }
    // Most bots land where they aimed; spread over many places; hot drops busier than quiet ones.
    expect(near / total).toBeGreaterThan(0.8);
    expect(Object.keys(byPoi).length).toBeGreaterThanOrEqual(6);
    expect(glideReach(0)).toBeGreaterThan(500);
  }, 90_000);

  it("no POI takes more bots than its size allows, even inside the first circle", () => {
    for (const seed of [1, 2, 3, 4, 5, 11, 22, 33]) {
      const route = planeRoute(seed);
      const heightAt = (x: number, z: number) => hf.heightAt(x, z);
      const zones = [undefined, ...meta.pois.slice(0, 4).map((p) => ({ x: p.x, z: p.z, r: 1200 }))];
      for (const zone of zones) {
        const bots = planDropBots(meta, route, seed, 99, heightAt, zone);
        expect(bots).toHaveLength(99);
        for (const p of meta.pois)
          expect(bots.filter((b) => b.poi === p.id).length).toBeLessThanOrEqual(
            poiCap(p.padRadius),
          );
      }
    }
    expect(poiCap(680)).toBe(14);
    expect(poiCap(60)).toBe(4);
  });
});
