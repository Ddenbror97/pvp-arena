/**
 * Bot-only battle royale matches on the real match engine (match.ts, bots.ts), as fast as the
 * CPU allows: the tuning loop for the bots (owner, 2026-11-04: "trained to play battle
 * royale"). Driven by run.mjs; prints one JSON line per match and a summary.
 */
import { readFileSync } from "node:fs";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { rollLoot } from "@/lib/fps/br/loot";
import { createBrMatch, stepBrMatch } from "@/lib/fps/br/match";
import type { CollisionData } from "@/lib/fps/br/static-world";
import { spawnVehicles } from "@/lib/fps/br/vehicles";
import type { WorldMeta } from "@/lib/fps/br/world";
import { TICK_MS } from "@/lib/fps/simulation";

const buffer = (path: string) => {
  const f = readFileSync(path);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const tier = (k: number) => (k < 0.42 ? "easy" : k < 0.72 ? "medium" : "strong");

export async function simulate(seeds: number[], maxMin = 40) {
  const meta = JSON.parse(readFileSync("public/fps/br/world.v1.json", "utf8")) as WorldMeta;
  const collision = JSON.parse(
    readFileSync("public/fps/br/models/collision.json", "utf8"),
  ) as CollisionData;
  const hf = await decodeHeightfield(buffer("public/fps/br/height.v1.hf"));
  const cover = await decodeLandCover(buffer("public/fps/br/landcover.v1.lc"));
  const island = buildIsland(hf, cover, meta, collision);
  const results = [];
  for (const seed of seeds) {
    const loot = rollLoot(seed, island.layout, collision, island.solid, meta);
    const state = createBrMatch(meta, seed, (x, z) => hf.heightAt(x, z), loot, {
      vehicles: spawnVehicles(meta, island.solid, seed),
      open: (x, z) => !island.solid.blocked(x, hf.heightAt(x, z) + 0.1, z, 1.8, 0.6),
    });
    // No humans: start the plane straight away.
    state.phase = "starting";
    state.phaseAt = 1000;
    const deaths: Record<string, number> = {};
    const firstFight: number[] = [];
    let shots = 0,
      hits = 0,
      nades = 0;
    const tickMs: number[] = [];
    const still = new Map<number, { x: number; z: number; since: number }>();
    let stuck = 0;
    let lateGame: unknown = null;
    const duels: Record<string, number> = {};
    let nadeCarriers = -1;
    let final5 = -1;
    const throwFails: Record<string, number> = {};
    const gasDeaths: Array<{ out: number; min: number; swim: boolean; skill: number }> = [];
    // Players alive N minutes after take-off (how fast the lobby thins out).
    const aliveAt: Record<string, number> = {};
    let now = 1000;
    for (; now < maxMin * 60_000; now += TICK_MS) {
      const a = performance.now();
      stepBrMatch(state, island.solid, meta, new Map(), now, TICK_MS);
      tickMs.push(performance.now() - a);
      if (state.planeAt && state.tick % 30 === 0) {
        const m = Math.floor((now - state.planeAt) / 60_000);
        if (m >= 1 && !(`${m}m` in aliveAt))
          aliveAt[`${m}m`] = state.seats.filter((x) => !x.dead).length;
      }
      for (const e of state.combat) {
        if (e.type === "elim") {
          deaths[e.gun] = (deaths[e.gun] ?? 0) + 1;
          if (e.by !== e.seat && e.gun !== "gas") {
            const key = `${tier(state.minds[e.by]!.skill)}>${tier(state.minds[e.seat]!.skill)}`;
            duels[key] = (duels[key] ?? 0) + 1;
          }
          if (e.gun === "gas" && state.zoneNow) {
            const s = state.seats[e.seat]!;
            const z = state.zoneNow.now;
            gasDeaths.push({
              out: Math.round(Math.hypot(s.body.x - z.x, s.body.z - z.z) - z.r),
              min: Math.round((now - state.planeAt) / 6000) / 10,
              swim: s.body.phase === "swim",
              skill: state.minds[e.seat]!.skill,
            });
          }
        } else if (e.type === "shot") shots++;
        else if (e.type === "hit") {
          hits++;
          if (!firstFight.length) firstFight.push(now - state.planeAt);
        } else if (e.type === "nade") nades++;
        else if (e.type === "act" && e.act === "throw" && !e.ok)
          throwFails[e.reason ?? "?"] = (throwFails[e.reason ?? "?"] ?? 0) + 1;
      }
      // Stuck: on foot, alive, not fighting, and within 1 m of the same spot for 30 s.
      if (state.tick % 30 === 0)
        for (const s of state.seats) {
          if (s.dead || s.body.phase !== "ground") continue;
          const m = state.minds[s.seat]!;
          const p = still.get(s.seat);
          const z = state.zoneNow?.next;
          const going =
            m.goalItem !== null || (!!z && Math.hypot(s.body.x - z.x, s.body.z - z.z) > z.r * 0.9);
          if (!p || Math.hypot(s.body.x - p.x, s.body.z - p.z) > 1 || m.target >= 0 || !going) {
            still.set(s.seat, { x: s.body.x, z: s.body.z, since: now });
          } else if (now - p.since > 30_000) {
            stuck++;
            still.set(s.seat, { x: s.body.x, z: s.body.z, since: now });
          }
        }
      if (nadeCarriers < 0 && state.planeAt && now - state.planeAt >= 10 * 60_000)
        nadeCarriers = state.seats.filter(
          (x) =>
            !x.dead && x.kit.bag.some((b) => b.item === "grenade-he" || b.item === "grenade-fire"),
        ).length;
      // The late game: what the last bots carry and how far apart they are.
      const left = state.seats.filter((x) => !x.dead);
      if (left.length <= 15 && !lateGame && state.zoneNow) {
        lateGame = left.map((x) => {
          const g = x.kit.guns[x.kit.active] ?? null;
          const ammo = x.kit.bag.reduce((n, b) => n + (b.item.startsWith("ammo") ? b.qty : 0), 0);
          const near = Math.min(
            ...left
              .filter((o) => o !== x)
              .map((o) => Math.hypot(o.body.x - x.body.x, o.body.z - x.body.z)),
          );
          return {
            gun: g?.item ?? null,
            mag: g?.mag ?? 0,
            ammo,
            hp: Math.round(x.kit.hp),
            near: Math.round(near),
            target: state.minds[x.seat]!.target,
            goal: (() => {
              const id = state.minds[x.seat]!.goalItem;
              const it = id !== null ? state.loot.items.get(id) : undefined;
              return it
                ? {
                    item: it.item,
                    d: Math.round(Math.hypot(it.x - x.body.x, it.z - x.body.z) * 10) / 10,
                    dy: Math.round((it.y - x.body.y) * 10) / 10,
                  }
                : null;
            })(),
            guns: x.kit.guns.map((g) => g?.item ?? null),
            gunNear: (() => {
              let best = Infinity;
              state.loot.near(x.body.x, x.body.z, 400, (i) => {
                if (i.item === "ak47" || i.item === "m4" || i.item === "awp")
                  best = Math.min(best, Math.hypot(i.x - x.body.x, i.z - x.body.z));
              });
              return Number.isFinite(best) ? Math.round(best) : null;
            })(),
            min: Math.round((now - state.planeAt) / 6000) / 10,
            phase: x.body.phase,
            zoneR: Math.round(state.zoneNow!.now.r),
          };
        });
      }
      if (left.length <= 5 && final5 < 0)
        final5 = left.filter((x) => !x.kit.guns.some((g) => !!g)).length;
      if (state.phase === "ending" || state.phase === "completed") break;
    }
    const byTier: Record<
      string,
      { n: number; place: number; kills: number; wins: number; top10: number }
    > = {};
    for (const s of state.seats) {
      const t = tier(state.minds[s.seat]!.skill);
      const r = (byTier[t] ??= { n: 0, place: 0, kills: 0, wins: 0, top10: 0 });
      const place = s.place ?? 1;
      r.n++;
      r.place += place;
      r.kills += s.kills;
      if (place === 1) r.wins++;
      if (place <= 10) r.top10++;
    }
    for (const r of Object.values(byTier)) {
      r.place = Math.round((r.place / r.n) * 10) / 10;
      r.kills = Math.round((r.kills / r.n) * 100) / 100;
    }
    const sorted = [...tickMs].sort((x, y) => x - y);
    results.push({
      seed,
      minutes: Math.round(((now - state.planeAt) / 60_000) * 10) / 10,
      phase: state.phase,
      alive: state.seats.filter((s) => !s.dead).length,
      deaths,
      aliveAt,
      // Where the bots planned to land (POI id → bots; "open": open country).
      drops: state.bots.reduce<Record<string, number>>((m, b) => {
        m[b.poi ?? "open"] = (m[b.poi ?? "open"] ?? 0) + 1;
        return m;
      }, {}),
      firstFightS: firstFight[0] ? Math.round(firstFight[0] / 1000) : null,
      accuracy: shots ? Math.round((hits / shots) * 1000) / 10 : 0,
      nades,
      stuck,
      lateGame,
      duels,
      nadeCarriers,
      final5Unarmed: final5,
      throwFails,
      // Gas deaths: how many, swimming, far out (> 200 m past the edge), by skill tier.
      gas: {
        n: gasDeaths.length,
        swim: gasDeaths.filter((g) => g.swim).length,
        far: gasDeaths.filter((g) => g.out > 200).length,
        easy: gasDeaths.filter((g) => tier(g.skill) === "easy").length,
        firstMin: gasDeaths[0]?.min ?? null,
      },
      byTier,
      tickP99: Math.round(sorted[Math.floor(sorted.length * 0.99)]! * 100) / 100,
    });
    console.log(JSON.stringify(results.at(-1)));
  }
  return results;
}
