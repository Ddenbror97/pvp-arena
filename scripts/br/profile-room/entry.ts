/**
 * The real match engine with 100 seats, every seat sent its own view as a human would be
 * (the room's worst case), timed per part. Driven by run.mjs (`--cpu-prof` for a profile).
 */
import { readFileSync } from "node:fs";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { rollLoot } from "@/lib/fps/br/loot";
import {
  BrSeatSync,
  BrSight,
  brViewFor,
  brViewFrame,
  createBrMatch,
  stepBrMatch,
} from "@/lib/fps/br/match";
import type { CollisionData } from "@/lib/fps/br/static-world";
import { spawnVehicles } from "@/lib/fps/br/vehicles";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";
import { TICK_MS } from "@/lib/fps/simulation";

const buffer = (path: string) => {
  const f = readFileSync(path);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const pct = (a: number[], p: number) => a[Math.min(a.length - 1, Math.floor(a.length * p))]!;

export async function profile(minutes: number, seed = 11, viewers = 100) {
  const meta = JSON.parse(readFileSync("public/fps/br/world.v1.json", "utf8")) as WorldMeta;
  const collision = JSON.parse(
    readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"),
  ) as CollisionData;
  const hf = await decodeHeightfield(buffer("public/fps/br/height.v1.hf"));
  const cover = await decodeLandCover(buffer("public/fps/br/landcover.v1.lc"));
  const island = buildIsland(hf, cover, meta, collision);
  const loot = rollLoot(seed, island.layout, collision, island.solid, meta);
  const state = createBrMatch(meta, seed, (x, z) => hf.heightAt(x, z), loot, {
    vehicles: spawnVehicles(meta, island.solid, seed, island.layout),
    open: (x, z) => !island.solid.blocked(x, hf.heightAt(x, z) + 0.1, z, 1.8, 0.6),
  });
  state.phase = "starting";
  state.phaseAt = 1000;
  const sight = new BrSight();
  /**
   * FOG_CHECK: pairs sampled, truly in sight, in sight but left out of the view that was sent
   * (late pop-in), of those the ones a fresh answer would also have missed (the rays' geometry,
   * not staleness), and hidden pairs left out (the fog's reach).
   */
  const check = { pairs: 0, seen: 0, missed: 0, geometric: 0, hidden: 0 };
  /** FOG_CHECK: the geometric misses by which body point was in sight, and by distance band. */
  const why: Record<string, number> = {};
  const fresh = new BrSight();
  const sentTo: Array<Set<number>> = Array.from({ length: viewers }, () => new Set());
  const syncs = Array.from({ length: viewers }, () => new BrSeatSync());
  const step: number[] = [],
    view: number[] = [],
    total: number[] = [];
  let bytes = 0,
    views = 0;
  const windows: Array<Record<string, number | string>> = [];
  let wStep: number[] = [],
    wView: number[] = [];
  for (let now = 1000; now < minutes * 60_000; now += TICK_MS) {
    const a = performance.now();
    stepBrMatch(state, island.solid, meta, new Map(), now, TICK_MS);
    const b = performance.now();
    let v = 0;
    // 15 Hz snapshots: every second tick.
    if (state.tick % 2 === 0) {
      const frame = brViewFrame(state);
      const checking = !!process.env.FOG_CHECK && state.phase === "active" && state.tick % 20 === 0;
      for (let seat = 0; seat < viewers; seat++) {
        const out = brViewFor(state, island.solid, sight, seat, now, syncs[seat], frame);
        if (checking) {
          const got = sentTo[seat]!;
          got.clear();
          for (const r of out.players as number[][]) got.add(r[0]!);
        }
        const text = JSON.stringify(out);
        bytes += text.length;
        views++;
      }
      state.loot.flush();
      v = performance.now() - b;
      view.push(v);
      wView.push(v);
      // FOG_CHECK=1: the fog of war against the truth, on a sample of snapshots (outside the
      // timing). For every pair on foot in the near ring: is any of ten points of the target's
      // body in a clear line from the viewer's eye, and was the target in the view just sent?
      if (checking) {
        const foot = state.seats.filter(
          (q) => !q.dead && q.vehicle === undefined && q.body.phase === "ground",
        );
        for (const va of foot)
          for (const vb of foot) {
            if (va === vb || va.seat >= viewers) continue;
            const A = va.body,
              B = vb.body;
            const d = Math.sqrt((B.x - A.x) ** 2 + (B.z - A.z) ** 2);
            if (d <= 45 || d > 300) continue;
            const px = (-(B.z - A.z) / d) * 0.3,
              pz = ((B.x - A.x) / d) * 0.3;
            let seen = false,
              point = -1;
            for (const [ox, oy, oz] of [
              [0, 1.7, 0],
              [0, 1.2, 0],
              [0, 0.9, 0],
              [0, 0.5, 0],
              [0, 0.15, 0],
              [px, 1.4, pz],
              [-px, 1.4, -pz],
              [px, 0.8, pz],
              [-px, 0.8, -pz],
              [0, 1.95, 0],
            ] as const) {
              const dx = B.x + ox - A.x,
                dy = B.y + oy - (A.y + 1.6),
                dz = B.z + oz - A.z;
              const dist = Math.hypot(dx, dy, dz);
              const ray = island.solid.raycast(A.x, A.y + 1.6, A.z, dx, dy, dz, dist);
              point++;
              if (!ray || ray.distance >= dist - 0.05) {
                seen = true;
                break;
              }
            }
            const sent = sentTo[va.seat]!.has(vb.seat);
            check.pairs++;
            if (seen) check.seen++;
            if (seen && !sent) {
              check.missed++;
              fresh.forget();
              if (!fresh.near(island.solid, A, B, va.seat, vb.seat, now)) {
                check.geometric++;
                const k = `p${point}/${Math.floor(d / 50) * 50}m`;
                why[k] = (why[k] ?? 0) + 1;
              }
            }
            if (!seen && !sent) check.hidden++;
          }
      }
      state.combat = [];
      state.events = [];
    }
    step.push(b - a);
    wStep.push(b - a);
    total.push(b - a + v);
    if (state.tick % 900 === 0) {
      wStep.sort((x, y) => x - y);
      wView.sort((x, y) => x - y);
      windows.push({
        min: +(now / 60_000).toFixed(1),
        phase: state.phase,
        alive: state.seats.filter((s) => !s.dead).length,
        stepP50: +pct(wStep, 0.5).toFixed(2),
        stepP99: +pct(wStep, 0.99).toFixed(2),
        viewP50: +pct(wView, 0.5).toFixed(2),
        viewP99: +pct(wView, 0.99).toFixed(2),
      });
      wStep = [];
      wView = [];
    }
    if (state.phase === "ended") break;
  }
  for (const a of [step, view, total]) a.sort((x, y) => x - y);
  const row = (a: number[]) => ({
    mean: +(a.reduce((s, x) => s + x, 0) / a.length).toFixed(2),
    p50: +pct(a, 0.5).toFixed(2),
    p99: +pct(a, 0.99).toFixed(2),
    max: +a[a.length - 1]!.toFixed(2),
  });
  return {
    ...(process.env.FOG_CHECK ? { check, why } : {}),
    // Fog of war in the near ring: answers given, the share hidden, rays per answer.
    fog: {
      asked: sight.nearAsked,
      hiddenShare: +(sight.nearHidden / Math.max(1, sight.nearAsked)).toFixed(3),
      raysPerAnswer: +(sight.nearRays / Math.max(1, sight.nearAsked)).toFixed(2),
    },
    ticks: step.length,
    step: row(step),
    views: row(view),
    tick: row(total),
    bytesPerView: Math.round(bytes / views),
    windows,
  };
}
