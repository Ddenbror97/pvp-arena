/**
 * Perf lab, game bench: the real BR client (br-arena.ts with its React HUD, through
 * scripts/br/client-sim/ui.tsx) against the shared match run in the page, driven through a
 * fixed scenario list while patches.ts records every displayed frame.
 *
 * Set before importing (see lab.md): `__labTier` (low | balanced | standard; else the game
 * detects it), `__labSize` ([w, h] CSS px of the game's area), `__labPlan` (scenario names;
 * default: all). Open the page with `?loot=1&vehicles=1&immortal=1`. Results: `window.__lab`.
 */
import "./patches";
import "../client-sim/ui";
import { ITEMS } from "@/lib/fps/br/items";
import { pickUp } from "@/lib/fps/br/inventory";
import { CELL_SIZE, CELLS, cellTrees, TREE_STRIDE } from "@/lib/fps/br/vegetation";
import { WORLD_HALF } from "@/lib/fps/br/world";

type Rec = { start(): void; stop(): Record<string, unknown>; total: number; last: number };
type G = typeof globalThis & {
  __labRec: Rec;
  __labT0: number;
  __labPlan?: string[];
  __lab: Record<string, unknown>;
  labGame: unknown;
};
const L = globalThis as G;
const out: Record<string, unknown> = { status: "loading", log: [] as string[] };
L.__lab = out;
const log = (s: string) => {
  (out.log as string[]).push(`${((performance.now() - L.__labT0) / 1000).toFixed(1)}s ${s}`);
};
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const key = (code: string, down: boolean) =>
  dispatchEvent(new KeyboardEvent(down ? "keydown" : "keyup", { code, bubbles: true }));
const hold = async (code: string, ms: number) => {
  key(code, true);
  await wait(ms);
  key(code, false);
};
const mouse = (button: number, down: boolean) =>
  dispatchEvent(new MouseEvent(down ? "mousedown" : "mouseup", { button, bubbles: true }));

const sim = () => window.sim;
const arena = () => window.sim.arena;
const hud = () => window.ui.hud();
const phase = () => hud()?.myPhase ?? "?";

/** Arena and renderer state worth keeping next to each measurement. */
function snapshot() {
  const d = arena().debug() as Record<string, unknown> & {
    renderer: { domElement: HTMLCanvasElement; info: { memory: Record<string, number> } };
  };
  const c = d.renderer.domElement;
  return {
    buffer: [c.width, c.height],
    tier: d.tier,
    sceneCalls: d.calls,
    sceneMtris: +((d.triangles as number) / 1e6).toFixed(2),
    textures: d.textures,
    geometries: d.geometries,
    programs: d.programs,
    visibleRemotes: d.visibleRemotes,
    fullActors: d.fullActors,
    standIns: d.standIns,
    phase: phase(),
  };
}

/** Records `ms` of play while `during(progress)` steers (look, keys). */
async function measure(name: string, ms: number, during?: (p: number) => void) {
  log(`measure ${name} (${phase()})`);
  const rec = L.__labRec;
  const before = rec.total;
  rec.start();
  const t0 = performance.now();
  while (performance.now() - t0 < ms) {
    during?.((performance.now() - t0) / ms);
    await wait(16);
  }
  const r = rec.stop();
  const result = { ...r, ...snapshot(), framesSeen: rec.total - before };
  (out.results as Record<string, unknown>)[name] = result;
  return result;
}
const pan =
  (pitch = -0.04, turns = 1, from = 0) =>
  (p: number) =>
    arena().look(from + p * turns * Math.PI * 2, pitch);
const sweep =
  (yaw: number, width = 1.2, pitch = -0.04) =>
  (p: number) =>
    arena().look(yaw + Math.sin(p * Math.PI * 2) * (width / 2), pitch);

function inside() {
  return sim().internals!();
}
/** Open ground near (x, z): clear, on the terrain; `roof`: under a roof (a large interior). */
function spot(x: number, z: number, roof = false) {
  const { world, hf } = inside();
  for (let i = 0; i < 4000; i++) {
    const r = i === 0 ? 0 : 3 + i * 0.6,
      a = i * 2.39996;
    const px = x + Math.cos(a) * r,
      pz = z + Math.sin(a) * r;
    const g = hf.heightAt(px, pz);
    if (g < 1) continue;
    if (world.blocked(px, g + 0.1, pz, 1.8, 0.6)) continue;
    const top = world.supportAt(px, pz, 0.35, g + 80);
    if (!roof && Math.abs(top - g) > 0.3) continue;
    if (roof && top - g < 2.5) continue;
    if (Math.abs(world.supportAt(px, pz, 0.35, g + 1.5) - g) > 0.3) continue;
    return { x: px, z: pz, y: g };
  }
  return { x, z, y: hf.heightAt(x, z) };
}
/** The way with the longest clear run from (x, z) (for running without hitting a wall at once). */
function openYaw(x: number, z: number, y: number) {
  const { world } = inside();
  let best = 0,
    far = -1;
  for (let k = 0; k < 24; k++) {
    const yaw = (k / 24) * Math.PI * 2,
      fx = -Math.sin(yaw),
      fz = -Math.cos(yaw);
    let d = 0;
    for (; d < 80; d += 2) if (world.blocked(x + fx * d, y + 0.4, z + fz * d, 1.4, 0.6)) break;
    if (d > far) [far, best] = [d, yaw];
  }
  return best;
}
/** The densest stand of trees on the island (for "forest on foot"). */
function forest() {
  const { island } = inside();
  const v = island.vegetation;
  let best = { n: 0, x: 0, z: 0 };
  for (let cj = 0; cj < CELLS; cj++)
    for (let ci = 0; ci < CELLS; ci++) {
      const t = cellTrees(v, ci, cj);
      const n = t.length / TREE_STRIDE;
      if (n > best.n)
        best = {
          n,
          x: (ci + 0.5) * CELL_SIZE - WORLD_HALF,
          z: (cj + 0.5) * CELL_SIZE - WORLD_HALF,
        };
    }
  return best;
}
/** `n` other players standing armed in rings in front of you (as profile.mjs's crowd, here). */
function crowdHere(n: number, yaw: number) {
  const { state, hf, me, other } = inside();
  const b = state.seats[me]!.body;
  const guns = ["ak47", "m4", "awp", "mp5", "deagle", "spas12"] as const;
  let placed = 0;
  for (const s of state.seats) {
    if (s.seat === me || s.seat === other) continue;
    if (placed >= n) {
      // The rest of the earlier crowd off to a quiet corner of the island.
      if (
        s.bot === false &&
        s.body.phase === "ground" &&
        Math.hypot(s.body.x - b.x, s.body.z - b.z) < 120
      ) {
        s.body.x = -4700 + (s.seat % 10) * 3;
        s.body.z = 4700;
        s.body.y = hf.heightAt(s.body.x, s.body.z);
      }
      continue;
    }
    const ring = 8 + (placed % 5) * 9,
      a = yaw + ((Math.floor(placed / 5) - 3.5) * Math.PI) / 11;
    Object.assign(s.body, {
      phase: "ground",
      grounded: true,
      x: b.x - Math.sin(a) * ring,
      z: b.z - Math.cos(a) * ring,
      vx: 0,
      vz: 0,
      velocityY: 0,
    });
    s.body.y = hf.heightAt(s.body.x, s.body.z);
    s.dead = false;
    s.kit.hp = 100;
    s.bot = false;
    if (!s.kit.guns[0]) {
      const item = guns[placed % guns.length]!;
      pickUp(s.kit, { item, qty: 1, mag: (ITEMS[item] as { magazine: number }).magazine });
      s.kitVersion++;
    }
    placed++;
  }
  return placed;
}
async function goTo(x: number, z: number, roof = false) {
  const s = spot(x, z, roof);
  sim().place!(s.x, s.z, s.y + 0.05, s.y + 1);
  const yaw = openYaw(s.x, s.z, s.y);
  arena().look(yaw, -0.04);
  // (The view's LODs and streaming settle; the island preloads every model behind the loading screen.)
  await wait(2500);
  return { ...s, yaw };
}
async function waitFor(test: () => boolean, ms: number) {
  const t0 = performance.now();
  while (!test() && performance.now() - t0 < ms) await wait(100);
  return test();
}

const PLACES: Record<string, [number, number, boolean?]> = {
  downtown: [1300, 420],
  "old-fortress": [-1080, 1810],
  "forgotten-ruins": [2420, 1790],
  "east-works": [3958, 1644],
  "military-base": [1119, 1602],
  northstar: [-3229, -3568],
  "fishers-cove": [-3703, 3076],
  "iron-peaks": [-491, -4288],
  bayview: [-4152, -1652],
  stadium: [-1827, 2625],
  superstore: [441, 3848, true],
  field: [1700, -2700],
};

const SCENARIOS: Record<string, () => Promise<void>> = {
  async warmup() {
    await measure("warmup-airfield", 8000, pan(-0.05, 0.5));
  },
  async plane() {
    sim().takeOff!();
    if (!(await waitFor(() => phase() === "plane", 20000))) return log("no plane");
    await wait(3000);
    await measure("plane", 10000, pan(-0.25, 0.5));
  },
  async drop() {
    if (phase() !== "plane") return;
    // Out of the door (the canopy opens at once: drop.ts). Held, and again until it takes.
    for (let i = 0; i < 30 && phase() === "plane"; i++) {
      await hold("Space", 400);
      await waitFor(() => phase() !== "plane", 1500);
    }
    if (!(await waitFor(() => phase() === "parachute", 5000)))
      return log(
        `no canopy (${phase()}, predicted ${(arena().debug() as { body: { phase: string } }).body.phase})`,
      );
    await wait(2500);
    key("KeyW", true);
    await measure("canopy", 8000, pan(-0.3, 0.25));
    key("KeyW", false);
    key("KeyQ", true);
    await measure("canopy-dive", 6000);
    key("KeyQ", false);
  },
  async places() {
    const f = forest();
    const all: Record<string, [number, number, boolean?]> = { ...PLACES, forest: [f.x, f.z] };
    log(`forest cell ${f.n} trees at ${f.x.toFixed(0)},${f.z.toFixed(0)}`);
    for (const [name, [x, z, roof]] of Object.entries(all)) {
      const at = await goTo(x, z, roof);
      await measure(`${name}-look`, 8000, pan(-0.04, 1, at.yaw));
      arena().look(at.yaw, -0.04);
      key("ShiftLeft", true);
      key("KeyW", true);
      await measure(`${name}-run`, 6000);
      key("KeyW", false);
      key("ShiftLeft", false);
    }
  },
  async crowds() {
    const at = await goTo(...(PLACES.downtown as [number, number]));
    for (const n of [5, 10, 20, 40]) {
      const placed = crowdHere(n, at.yaw);
      await wait(2500);
      const r = await measure(`downtown-crowd-${n}`, 8000, sweep(at.yaw, 1.4));
      (r as Record<string, unknown>).placed = placed;
    }
    crowdHere(0, at.yaw);
  },
  async combat() {
    const at = await goTo(...(PLACES.downtown as [number, number]));
    crowdHere(10, at.yaw);
    sim().giveGun!("ak47", "sight-red", "compensator");
    await wait(1500);
    await hold("Digit1", 300);
    await wait(1200);
    mouse(0, true);
    await measure("fire-ak", 5000, sweep(at.yaw, 0.5));
    mouse(0, false);
    for (const n of ["he", "smoke", "fire"] as const) sim().throwNade!(n);
    await wait(800);
    await measure("grenades", 10000, sweep(at.yaw + Math.PI, 1.0, -0.2));
    sim().giveGun!("awp", "scope-6x", null);
    await wait(1200);
    await hold("Digit2", 300);
    await wait(1500);
    mouse(2, true);
    await wait(600);
    await measure("awp-scope", 6000, sweep(at.yaw, 0.3));
    mouse(2, false);
    await hold("KeyR", 300);
    await measure("reload-switch", 4000, async () => {});
    crowdHere(0, at.yaw);
  },
  async screens() {
    window.ui.open("inventory");
    await wait(1500);
    await measure("inventory", 5000);
    window.ui.open("map");
    await wait(1500);
    await measure("tactical-map", 5000);
    window.ui.open(null);
    await wait(500);
  },
  async water() {
    const yaw = sim().toWater!(5);
    await wait(2500);
    key("KeyW", true);
    await measure("swim", 6000, (p) => arena().look(yaw + p * 0.8, -0.05));
    key("KeyW", false);
  },
  async zip() {
    const yaw = sim().toZip!();
    arena().look(yaw, -0.1);
    await wait(2500);
    inside().act({ act: "zip" });
    await wait(500);
    await measure("zipline", 7000);
  },
  /**
   * Late game: the match played on (open the page with &zone=0.05 to run the zone 20× faster)
   * until 30 or fewer are left or four minutes pass, then you in the middle of the circle with
   * the survivors around: a look round, a run and a firefight.
   */
  async late() {
    const { state } = inside();
    if (state.phase === "starting" || state.phase === "waiting") sim().takeOff!();
    const t0 = performance.now();
    while (performance.now() - t0 < 240_000) {
      const alive = state.seats.filter((x) => !x.dead).length;
      if (state.phase === "active" && alive <= 30) break;
      await wait(2000);
    }
    const z = (state as unknown as { zoneNow?: { now: { x: number; z: number; r: number } } })
      .zoneNow;
    const c = z?.now ?? { x: 0, z: 0, r: 0 };
    const at = await goTo(c.x, c.z);
    const alive = state.seats.filter((x) => !x.dead).length;
    log(
      `late game: ${alive} alive, circle r ${Math.round(c.r)} at ${Math.round(c.x)},${Math.round(c.z)}`,
    );
    await measure("late-look", 8000, pan(-0.04, 1, at.yaw));
    sim().giveGun!("m4", "sight-holo", null);
    await wait(800);
    await hold("Digit1", 300);
    await wait(1000);
    crowdHere(Math.min(16, alive), at.yaw);
    mouse(0, true);
    await measure("late-fight", 6000, sweep(at.yaw, 0.6));
    mouse(0, false);
  },
  async drive() {
    const { state, me } = inside();
    const b = state.seats[me]!.body;
    const cars = state.vehicles.filter((v) => !v.destroyed && v.kind !== "bike");
    if (!cars.length) return log("no vehicles (open the page with ?vehicles=1)");
    const near = cars.sort(
      (a, c) => Math.hypot(a.x - 1300, a.z - 420) - Math.hypot(c.x - 1300, c.z - 420),
    )[0]!;
    sim().place!(near.x + 2.6, near.z, undefined, near.y + 3);
    await wait(2000);
    inside().act({ act: "enter", id: near.id });
    await wait(1500);
    log(`drive: ${b.phase}, vehicle ${near.kind} at ${near.x.toFixed(0)},${near.z.toFixed(0)}`);
    key("KeyW", true);
    await measure("drive", 8000);
    key("KeyW", false);
    inside().act({ act: "exit" });
    await wait(1000);
  },
};

async function suite() {
  const t0 = L.__labT0;
  await window.sim.ready;
  out.simReadyMs = Math.round(performance.now() - t0);
  log("sim ready");
  // The first frame with the island drawn and the HUD up (the player's "in control").
  await waitFor(() => !!hud(), 120000);
  out.hudMs = Math.round(performance.now() - t0);
  const res = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
  out.load = {
    requests: res.length,
    transferMB: +(res.reduce((a, r) => a + (r.transferSize || 0), 0) / 1048576).toFixed(1),
    decodedMB: +(res.reduce((a, r) => a + (r.decodedBodySize || 0), 0) / 1048576).toFixed(1),
    cached: res.filter((r) => r.transferSize === 0 && r.decodedBodySize > 0).length,
  };
  const c = (
    arena().debug() as { renderer: { getContext(): WebGL2RenderingContext } }
  ).renderer.getContext();
  const dbg = c.getExtension("WEBGL_debug_renderer_info");
  out.env = {
    gpu: dbg ? c.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "?",
    ua: navigator.userAgent,
    cores: navigator.hardwareConcurrency,
    memoryGB: (navigator as unknown as { deviceMemory?: number }).deviceMemory,
    dpr: devicePixelRatio,
    host: (globalThis as { __labSize?: number[] }).__labSize ?? [1536, 864],
    clock: (globalThis as { __labClock?: string }).__labClock ?? "display",
    ...snapshot(),
  };
  out.results = {};
  out.status = "running";
  await wait(3000);
  // (The late game plays the match on for minutes: asked for by name.)
  const plan = L.__labPlan ?? Object.keys(SCENARIOS).filter((n) => n !== "late");
  for (const name of plan) {
    try {
      await SCENARIOS[name]!();
    } catch (e) {
      log(`${name} failed: ${String(e)}`);
    }
  }
  out.end = snapshot();
  out.status = "done";
  log("done");
}
L.labGame = { suite, measure, goTo, crowdHere, SCENARIOS, PLACES };
void suite().catch((e) => {
  out.status = `error: ${String(e)}`;
});
