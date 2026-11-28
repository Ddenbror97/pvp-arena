/**
 * The suspension sweep's simulation (bundled and run by suspension-sweep.mjs, in Node, on the
 * real island): vehicles driven by the shared `stepVehicle` at fixed speeds along the island's
 * roads, straight across the open country and up the mountains, and measured each tick.
 */
import { readFileSync } from "node:fs";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import type { CollisionData } from "@/lib/fps/br/static-world";
import { spec, stepVehicle, VEHICLES, type Vehicle, type VehicleKind } from "@/lib/fps/br/vehicles";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";
import { TICK_MS } from "@/lib/fps/simulation";

const ROOT = process.env.ROOT!;
const buffer = (path: string) => {
  const f = readFileSync(`${ROOT}/${path}`);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const meta = JSON.parse(readFileSync(`${ROOT}/public/fps/br/world.v5.json`, "utf8")) as WorldMeta;
const collision = JSON.parse(
  readFileSync(`${ROOT}/public${WORLD_ASSETS.collision}`, "utf8"),
) as CollisionData;
const hf = await decodeHeightfield(buffer("public/fps/br/height.v6.hf"));
const cover = await decodeLandCover(buffer("public/fps/br/landcover.v5.lc"));
const { solid: world } = buildIsland(hf, cover, meta, collision);

type Route = number[][];
const roads = (meta as unknown as { roads: Array<{ points: number[][] }> }).roads
  .filter((r) => r.points.length >= 3)
  .slice(0, 60)
  .map((r) => r.points);
// Straight lines across open country (hills, fields, woods): a seeded set inside the island.
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const land = (x: number, z: number) => hf.heightAt(x, z) > 2;
const lines = (n: number, near?: [number, number, number]): Route[] => {
  const out: Route[] = [];
  for (let tries = 0; out.length < n && tries < 5000; tries++) {
    const x = near ? near[0] + (rand() - 0.5) * near[2] : (rand() - 0.5) * 7000,
      z = near ? near[1] + (rand() - 0.5) * near[2] : (rand() - 0.5) * 7000,
      a = rand() * Math.PI * 2;
    const pts: number[][] = [];
    let ok = true;
    for (let s = 0; s <= 10; s++) {
      const px = x + Math.cos(a) * s * 60,
        pz = z + Math.sin(a) * s * 60;
      if (!land(px, pz)) ok = false;
      pts.push([px, pz]);
    }
    if (ok) out.push(pts);
  }
  return out;
};
const country = lines(40);
const peak = meta.pois.find((p) => p.id === "iron-peaks");
const mountains = peak ? lines(25, [peak.x, peak.z, 1400]) : [];

type Sample = {
  air: number;
  ticks: number;
  jumps: number;
  micro: number;
  clear: number[];
  hard: number;
  pitchJerk: number;
  heaveJerk: number;
  jerkN: number;
  speed: number;
  spills: number;
  ride: number;
  rideN: number;
  bottom: number;
};
function drive(kind: VehicleKind, target: number, routes: Route[]): Sample {
  const out: Sample = {
    air: 0,
    ticks: 0,
    jumps: 0,
    micro: 0,
    clear: [],
    hard: 0,
    pitchJerk: 0,
    heaveJerk: 0,
    jerkN: 0,
    speed: 0,
    spills: 0,
    ride: 0,
    rideN: 0,
    bottom: 0,
  };
  const s = spec(kind);
  // The wheels' clearance, not the body's: with springs the body is `droop` above the tyres'
  // contact when they hang free (the sweep runs on code with and without them).
  const droop =
    (VEHICLES as unknown as { suspension?: Record<string, { droop: number }> }).suspension?.[kind]
      ?.droop ?? 0;
  for (const r of routes) {
    const [x, z] = r[0]!;
    const v: Vehicle = {
      id: 0,
      kind,
      condition: "good",
      x: x!,
      y: world.supportAt(x!, z!, 0.3, 1e4),
      z: z!,
      yaw: 0,
      speed: Math.min(target, s.maxSpeed),
      pitch: 0,
      roll: 0,
      health: s.health,
      maxHealth: s.health,
      driver: 0,
      destroyed: false,
    };
    let k = 1,
      was = false,
      top = 0,
      stuck = 0,
      landed = -99;
    const ys: number[] = [],
      ps: number[] = [];
    for (let i = 0; i < 1200 && k < r.length; i++) {
      const [tx, tz] = r[k]!;
      if (Math.hypot(tx! - v.x, tz! - v.z) < 8) {
        k++;
        continue;
      }
      const want = Math.atan2(-(tx! - v.x), -(tz! - v.z));
      if (i === 0) v.yaw = want;
      const d = Math.atan2(Math.sin(want - v.yaw), Math.cos(want - v.yaw));
      const forward = v.speed < target ? 1 : 0;
      const impact = stepVehicle(
        world,
        meta,
        v,
        { forward, strafe: Math.max(-1, Math.min(1, -d * 3)) },
        TICK_MS,
      );
      if (v.drowned) break;
      // Stopped against a wall, a tree or a cliff: the route ends (only driving is measured).
      stuck = Math.abs(v.speed) < 2 ? stuck + 1 : 0;
      if (stuck > 15) break;
      if (Math.abs(v.speed) < 2) continue;
      out.ticks++;
      out.speed += Math.abs(v.speed);
      if (v.air) out.air++;
      if (v.air && !was) top = 0;
      if (v.air) top = Math.max(top, v.y - droop - world.supportAt(v.x, v.z, 0.3, v.y + 0.5));
      if (was && !v.air) {
        landed = i;
        if (top > 0.3) {
          out.jumps++;
          out.clear.push(top);
        } else out.micro++;
        if (impact > 0) out.hard++;
      }
      was = !!v.air;
      ys.push(v.y);
      ps.push(v.pitch);
      const n = ys.length;
      if (n >= 3) {
        const dt = TICK_MS / 1000;
        const ay = (ys[n - 1]! - 2 * ys[n - 2]! + ys[n - 3]!) / (dt * dt),
          ap = (ps[n - 1]! - 2 * ps[n - 2]! + ps[n - 3]!) / (dt * dt);
        // Jolts on the ground only (in the air the body falls at g, on purpose).
        if (!v.air && !was) {
          out.heaveJerk += ay * ay;
          out.pitchJerk += ap * ap;
          out.jerkN++;
          // The ride: on the ground and not within 0.5 s of a landing (the springs taking it).
          if (i - landed > 15) {
            out.ride += ay * ay;
            out.rideN++;
          }
        }
      }
      const bottomed = (v as { sus?: number }).sus;
      if (bottomed !== undefined && bottomed <= -0.16) out.bottom++;
      if (Math.abs(v.roll) > 1.2 || Math.abs(v.pitch) > 1.2) out.spills++;
    }
  }
  return out;
}

const report: Record<string, unknown>[] = [];
const kinds = (process.env.KINDS ?? "sedan,suv,pickup,bike").split(",") as VehicleKind[];
for (const [terrain, routes] of [
  ["roads", roads],
  ["country", country],
  ["mountains", mountains],
] as const)
  for (const kind of kinds)
    for (const target of [10, 20, 30]) {
      const r = drive(kind, target, routes);
      const minutes = (r.ticks * TICK_MS) / 60_000;
      const sorted = [...r.clear].sort((a, b) => a - b);
      report.push({
        terrain,
        kind,
        target,
        minutes: +minutes.toFixed(2),
        avgSpeed: +(r.speed / Math.max(1, r.ticks)).toFixed(1),
        jumpsPerMin: +(r.jumps / minutes).toFixed(2),
        microPerMin: +(r.micro / minutes).toFixed(2),
        airPct: +((100 * r.air) / Math.max(1, r.ticks)).toFixed(2),
        medianClear: +(sorted[Math.floor(sorted.length / 2)] ?? 0).toFixed(2),
        maxClear: +(sorted.at(-1) ?? 0).toFixed(2),
        hardLandings: r.hard,
        // RMS on the ground: how hard the body is jolted (lower: smoother).
        heaveRms: +Math.sqrt(r.heaveJerk / Math.max(1, r.jerkN)).toFixed(2),
        pitchRms: +Math.sqrt(r.pitchJerk / Math.max(1, r.jerkN)).toFixed(2),
        rideRms: +Math.sqrt(r.ride / Math.max(1, r.rideN)).toFixed(2),
        bottomPct: +((100 * r.bottom) / Math.max(1, r.ticks)).toFixed(2),
        spills: r.spills,
      });
    }
const t0 = performance.now();
let steps = 0;
{
  // Cost: steps per millisecond for one sedan on the roads at 30 m/s.
  const r = drive("sedan", 30, roads.slice(0, 20));
  steps = r.ticks;
}
const ms = performance.now() - t0;
// The audio's occlusion ray (spatial-audio.ts, br-arena.ts): one per placed sound as it starts,
// camera to source, 5–90 m, around the island's towns.
let rays = 0,
  blocked = 0;
const r0 = performance.now();
for (const town of meta.pois.slice(0, 30))
  for (let i = 0; i < 40; i++) {
    const a = rand() * Math.PI * 2,
      d = 5 + rand() * 85;
    const ax = town.x + (rand() - 0.5) * 60,
      az = town.z + (rand() - 0.5) * 60;
    const ay = hf.heightAt(ax, az) + 1.6;
    const bx = ax + Math.cos(a) * d,
      bz = az + Math.sin(a) * d,
      by = hf.heightAt(bx, bz) + 0.7;
    const len = Math.hypot(bx - ax, by - ay, bz - az);
    if (world.raycast(ax, ay, az, bx - ax, by - ay, bz - az, len - 0.6, true)) blocked++;
    rays++;
  }
const rayUs = ((performance.now() - r0) * 1000) / rays;
console.log(
  JSON.stringify({
    report,
    cost: { steps, ms: +ms.toFixed(1), usPerStep: +((ms * 1000) / steps).toFixed(2) },
    occlusion: {
      rays,
      blockedPct: +((100 * blocked) / rays).toFixed(1),
      usPerRay: +rayUs.toFixed(2),
    },
  }),
);
