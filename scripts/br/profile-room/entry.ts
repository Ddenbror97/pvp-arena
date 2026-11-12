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
      for (let seat = 0; seat < viewers; seat++) {
        const text = JSON.stringify(
          brViewFor(state, island.solid, sight, seat, now, syncs[seat], frame),
        );
        bytes += text.length;
        views++;
      }
      state.loot.flush();
      v = performance.now() - b;
      view.push(v);
      wView.push(v);
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
    ticks: step.length,
    step: row(step),
    views: row(view),
    tick: row(total),
    bytesPerView: Math.round(bytes / views),
    windows,
  };
}
