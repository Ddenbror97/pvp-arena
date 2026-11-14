import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { BrCanaries, canaryEvidence } from "@/lib/fps/br/canary";
import { waterSurface } from "@/lib/fps/br/drop";
import { decodeHeightfield, type Heightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { rollLoot } from "@/lib/fps/br/loot";
import {
  brFrameRow,
  brViewFor,
  brViewFrame,
  BrSight,
  createBrMatch,
  stepBrMatch,
} from "@/lib/fps/br/match";
import type { CollisionData, StaticWorld } from "@/lib/fps/br/static-world";
import { BR_SUN_SHADOW } from "@/lib/fps/br/sun-shadow";
import { spawnVehicles } from "@/lib/fps/br/vehicles";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";
import { TICK_MS } from "@/lib/fps/simulation";

const buffer = (path: string) => {
  const f = readFileSync(path);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const meta = JSON.parse(readFileSync("public/fps/br/world.v1.json", "utf8")) as WorldMeta;
const collision = JSON.parse(
  readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"),
) as CollisionData;
let hf: Heightfield, island: ReturnType<typeof buildIsland>, world: StaticWorld;
beforeAll(async () => {
  hf = await decodeHeightfield(buffer("public/fps/br/height.v1.hf"));
  const cover = await decodeLandCover(buffer("public/fps/br/landcover.v1.lc"));
  island = buildIsland(hf, cover, meta, collision);
  world = island.solid;
});

/** A small seeded generator (mulberry32). */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("wallhack canaries", () => {
  it("the e-value stays small for honest play however often it is looked at, and grows for a cheat", () => {
    // Ville's inequality, checked: 4000 honest players, 300 decisive trials each (fair coins),
    // looked at after every trial. The share that ever reaches e ≥ 100 is at most 1 %.
    const rand = seeded(7);
    let crossed = 0;
    for (let p = 0; p < 4000; p++) {
      let won = 0;
      for (let n = 1; n <= 300; n++) {
        if (rand() < 0.5) won++;
        if (canaryEvidence({ decisive: n, won }) >= Math.log(100)) {
          crossed++;
          break;
        }
      }
    }
    expect(crossed / 4000).toBeLessThanOrEqual(0.01);
    // A cheat who looks at the canary in 80 % of decisive trials is past e = 10⁶ within 90.
    expect(canaryEvidence({ decisive: 90, won: 72 })).toBeGreaterThan(Math.log(1e6));
    // One lucky match proves nothing: 8 of 10.
    expect(canaryEvidence({ decisive: 10, won: 8 })).toBeLessThan(Math.log(20));
  });

  it("in a real match: never in sight, honest views give a coin's odds, a wallhack's view does not", () => {
    const seed = 21;
    const loot = rollLoot(seed, island.layout, collision, island.solid, meta);
    const state = createBrMatch(meta, seed, (x, z) => hf.heightAt(x, z), loot, {
      vehicles: spawnVehicles(meta, island.solid, seed, island.layout),
      open: (x, z) => !island.solid.blocked(x, hf.heightAt(x, z) + 0.1, z, 1.8, 0.6),
    });
    state.phase = "starting";
    state.phaseAt = 1000;
    const canaries = new BrCanaries(seeded(99), (x, z, g) => waterSurface(meta, g, x, z) !== null);
    // Seats 0–39 are watched as people. 0–7 play with a wallhack: when a canary is on their
    // screen they look at it, in some trials (they do not always notice, or care).
    const watched = (seat: number) => seat < 40;
    const cheat = (seat: number) => seat < 8;
    const notices = new Map<number, number>();
    const rand = seeded(5);
    let unsafe = 0,
      trialTicks = 0,
      injected = 0;
    const sight = new BrSight();
    for (let now = 1000; now < 9.5 * 60_000; now += TICK_MS) {
      stepBrMatch(state, island.solid, meta, new Map(), now, TICK_MS);
      // The wallhack: the view turned onto the canary it was sent (for 0.4–1.5 s of a trial).
      for (let seat = 0; seat < 8; seat++) {
        const t = canaries.trialOf(seat);
        if (!t) continue;
        let from = notices.get(seat);
        if (from === undefined || from > now + 5000) {
          from = rand() < 0.75 ? now + rand() * 1500 : Infinity;
          notices.set(seat, from);
        }
        if (now < from || now > from + 400 + rand() * 1100) continue;
        const s = state.seats[seat]!,
          g = t.spots[t.ghost];
        const dx = g.x - s.body.x,
          dy = g.y + 0.75 - (s.body.y + 1.6),
          dz = g.z - s.body.z;
        s.yaw = Math.atan2(-dx, -dz) + (rand() - 0.5) * 0.04;
        s.pitch = Math.atan2(dy, Math.hypot(dx, dz));
      }
      for (let seat = 0; seat < 8; seat++) if (!canaries.trialOf(seat)) notices.delete(seat);
      // Seats 8–19 are honest players who look about a lot: the view sweeping side to side and
      // up and down, at their own pace, with no idea where any canary is.
      for (let seat = 8; seat < 20; seat++) {
        const s = state.seats[seat]!;
        if (s.dead) continue;
        s.yaw += Math.sin(now / (700 + seat * 37) + seat) * 0.09;
        s.pitch = Math.sin(now / (1900 + seat * 53)) * 0.25 - 0.05;
      }
      canaries.step(state, world, now, watched);
      // Safety, against the truth: no point of a running canary's crouched body or of its
      // shadow is in a clear line from its viewer's eye.
      for (let seat = 0; seat < 40; seat++) {
        const t = canaries.trialOf(seat);
        if (!t) continue;
        trialTicks++;
        const e = state.seats[seat]!.body,
          g = t.spots[t.ghost];
        const points: Array<[number, number, number]> = [];
        for (const h of [0.05, 0.3, 0.6, 0.9, 1.15, 1.3]) points.push([g.x, g.y + h, g.z]);
        const d = Math.hypot(g.x - e.x, g.z - e.z) || 1;
        const sx = -(g.z - e.z) / d,
          sz = (g.x - e.x) / d;
        for (const side of [-0.35, 0.35])
          points.push([g.x + sx * side, g.y + 0.8, g.z + sz * side]);
        for (const side of [-0.25, 0.25])
          points.push([g.x + sx * side, g.y + 1.2, g.z + sz * side]);
        for (const k of [0.3, 0.6, 1]) {
          const x = g.x + BR_SUN_SHADOW.x * k * BR_SUN_SHADOW.perMetre * 1.3,
            z = g.z + BR_SUN_SHADOW.z * k * BR_SUN_SHADOW.perMetre * 1.3;
          points.push([x, hf.heightAt(x, z) + 0.02, z]);
        }
        for (const [px, py, pz] of points) {
          const dx = px - e.x,
            dy = py - (e.y + 1.6),
            dz = pz - e.z;
          const len = Math.hypot(dx, dy, dz);
          const ray = world.raycast(e.x, e.y + 1.6, e.z, dx, dy, dz, len);
          if (!ray || ray.distance >= len - 0.05) unsafe++;
        }
      }
      // The canary rides in the viewer's own view only.
      if (state.tick % 2 === 0 && state.phase === "active") {
        const frame = brViewFrame(state);
        for (let seat = 0; seat < 40; seat++) {
          const view = brViewFor(state, world, sight, seat, now, undefined, frame);
          const before = view.players.length;
          canaries.inject(state, seat, view.players, (s) => brFrameRow(state, frame, s));
          if (view.players.length > before) {
            injected++;
            const t = canaries.trialOf(seat)!;
            const row = view.players[view.players.length - 1]!;
            expect(row[0]).toBe(t.donor);
            expect(row[7]).toBe(1);
          }
        }
      }
      state.combat = [];
      state.events = [];
      if (state.phase === "ended" || state.phase === "completed") break;
    }
    expect(trialTicks).toBeGreaterThan(500);
    expect(injected).toBeGreaterThan(100);
    expect(unsafe).toBe(0);
    let honest = { decisive: 0, won: 0 },
      cheats = { decisive: 0, won: 0 };
    for (let seat = 0; seat < 40; seat++) {
      const t = canaries.tally(state.seats[seat]!.id);
      if (!t) continue;
      const into = cheat(seat) ? cheats : honest;
      into.decisive += t.decisive;
      into.won += t.won;
      // Nobody honest gets anywhere near evidence in one match.
      if (!cheat(seat)) expect(canaryEvidence(t)).toBeLessThan(Math.log(20));
    }
    let trials = 0;
    for (let seat = 0; seat < 40; seat++)
      trials += canaries.tally(state.seats[seat]!.id)?.trials ?? 0;
    expect(trials).toBeGreaterThan(80);
    // Honest views (the bots' own looking about, fights included) win about half.
    // (Few: honest views rarely rest on a hidden spot. Whatever the count, a coin's: the
    // two-sided binomial chance of a result this far from half is not small.)
    expect(honest.decisive).toBeGreaterThan(5);
    const tail = (n: number, k: number) => {
      let p = 0;
      for (let i = 0; i <= k; i++) {
        let c = 1;
        for (let j = 0; j < i; j++) c = (c * (n - j)) / (j + 1);
        p += c / 2 ** n;
      }
      return p;
    };
    const k = Math.min(honest.won, honest.decisive - honest.won);
    expect(Math.min(1, 2 * tail(honest.decisive, k))).toBeGreaterThan(0.001);
    // The wallhack wins most of its decisive trials.
    expect(cheats.decisive).toBeGreaterThan(10);
    expect(cheats.won / cheats.decisive).toBeGreaterThan(0.7);
  }, 300_000);
});
