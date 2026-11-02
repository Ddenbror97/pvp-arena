/**
 * Real-hardware FPS benchmark page: the game's own renderer (`mountArena`) and simulation, run
 * locally in the page (no server), on every map in turn, for several cycles.
 *
 * - Both players move and shoot: seat A (the camera) strafes, walks and turns on a fixed script
 *   and fires bursts; seat B is the practice bot. Shots, impacts, muzzle flashes, casings,
 *   blood, deaths and round restarts all go through the real code.
 * - Per map: 4 s warm-up, then a fixed sampling window. Frame intervals from
 *   requestAnimationFrame (average FPS, 1% and 0.1% lows, percentiles), the renderer's own CPU
 *   time per frame, GPU time per frame (EXT_disjoint_timer_query_webgl2 when the browser
 *   exposes it), draw calls, triangles, GPU geometries/textures and JS heap.
 * - Cycles repeat the four maps (map switching, consecutive matches, resource growth).
 *
 * Built by build.mjs into a self-contained folder (page + bundle + models) for any browser.
 */
import * as THREE from "three";
import { mountArena } from "../../../src/lib/fps/renderer";
import { createMatch, startMatch, stepMatch, TICK_MS } from "../../../src/lib/fps/simulation";
import { createPracticeBot } from "../../../src/lib/fps/practice-bot";
import { startPerformanceSampler } from "../../../tests/e2e/helpers/fps-performance-sampler";

const MAPS = ["dustfront", "frostline", "crossfire", "lost-trail"];
const params = new URLSearchParams(location.search);
const SAMPLE_MS = Number(params.get("sample") ?? 20000);
const WARMUP_MS = 4000;
const CYCLES = Number(params.get("cycles") ?? 3);

// The game serves models from the site root. Here they sit next to the page, either as .glb or
// (where a host serves only text) as base64 in .glb.txt, tried second. Each is read
// once into a blob: URL before the run, so loading time is not part of the measurement.
const base = new URL(".", location.href).href;
const MODELS = [
  "aim-arena",
  "frostline",
  "crossfire",
  "lost-trail",
  "ak47-authored",
  "m4a1-authored",
  "karambit",
  "police-swat",
  "terrorist-fighter",
];
const blobs = new Map<string, string>();
async function preloadModels() {
  await Promise.all(
    MODELS.map(async (name) => {
      let bytes: ArrayBuffer;
      const res = await fetch(`${base}fps/models/${name}.glb`).catch(() => null);
      if (res?.ok) bytes = await res.arrayBuffer();
      else {
        const txt = await fetch(`${base}fps/models/${name}.glb.txt`);
        if (!txt.ok) throw new Error(`model ${name}: HTTP ${txt.status}`);
        const bin = atob((await txt.text()).trim());
        const u8 = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        bytes = u8.buffer;
      }
      blobs.set(`/fps/models/${name}.glb`, URL.createObjectURL(new Blob([bytes])));
    }),
  );
}
THREE.DefaultLoadingManager.setURLModifier((url) => blobs.get(url) ?? url);

const log = document.getElementById("log")!;
const out = (line: string) => {
  log.textContent += line + "\n";
  log.scrollTop = log.scrollHeight;
};
// Compact results, newest first, readable at a glance (and from a screenshot).
const table = document.getElementById("results");
const show = (row: Row) => {
  if (!table) return;
  const line = document.createElement("div");
  const f = (k: string) => String(row[k] ?? "–");
  line.textContent = [
    `${f("map")} c${f("cycle")}`.padEnd(15),
    `avg ${f("avgFps")}`.padEnd(10),
    `1% ${f("low1Fps")}`.padEnd(9),
    `0.1% ${f("low01Fps")}`.padEnd(11),
    `p50 ${f("frameP50")}ms`.padEnd(12),
    `p99 ${f("frameP99")}ms`.padEnd(13),
    `cpu95 ${f("cpuP95")}`.padEnd(10),
    `gpu95 ${f("gpuP95")}`.padEnd(10),
    `calls ${f("maxCalls")}`.padEnd(10),
    `tris ${Math.round(Number(row["maxTriangles"] ?? 0) / 1000)}k`.padEnd(10),
    `geo ${f("geometries")} tex ${f("textures")} heap ${f("heapMB")}MB load ${f("loadMs")}ms`,
  ].join(" ");
  table.prepend(line);
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Row = Record<string, unknown>;

function lows(intervals: number[]) {
  if (!intervals.length) return { frames: 0 };
  const sorted = [...intervals].sort((a, b) => b - a); // slowest first
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
  const worst = (fraction: number) =>
    1000 / mean(sorted.slice(0, Math.max(1, Math.round(sorted.length * fraction))));
  const pct = (p: number) =>
    sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * (1 - p)))]!;
  return {
    frames: intervals.length,
    avgFps: +(1000 / mean(intervals)).toFixed(1),
    low1Fps: +worst(0.01).toFixed(1),
    low01Fps: +worst(0.001).toFixed(1),
    frameP50: +pct(0.5).toFixed(2),
    frameP99: +pct(0.99).toFixed(2),
    frameMax: +sorted[0]!.toFixed(2),
    // Frame-time stability: share of frames more than 1.5× the median.
    hitchPct: +((100 * sorted.filter((v) => v > pct(0.5) * 1.5).length) / sorted.length).toFixed(2),
  };
}

async function runMap(mapId: string, cycle: number): Promise<Row> {
  const host = document.getElementById("host")!;
  const now0 = Date.now();
  const state = createMatch({ A: "bench-a", B: "bench-b" }, 5, now0 - 3000, undefined, mapId);
  startMatch(state, now0 - 3000);
  stepMatch(state, {}, now0, TICK_MS);
  const t0 = performance.now();
  const controls = mountArena(
    host,
    () => {},
    () => {},
    undefined,
    undefined,
    { mapId },
  );
  const bot = createPracticeBot(() => 0.37);
  let seqA = 0;
  state.server.lastStepAt = Date.now();
  state.phaseEndsAt = Date.now() + 3_600_000;
  const push = () =>
    controls.snapshot(
      {
        state: structuredClone(state),
        serverNow: Date.now(),
        poseAt: state.server.lastStepAt,
        settled: false,
        settlementPending: false,
      },
      "A",
    );
  push();
  await controls.ready;
  const loadMs = performance.now() - t0;
  const started = performance.now();
  const step = () => {
    const t = Date.now();
    if (t - state.server.lastStepAt < 34) return;
    const s = (performance.now() - started) / 1000;
    const a = state.players.A;
    // Scripted player: strafe/walk pattern, steady turn with a slow pitch wave, 0.4 s bursts.
    const inputA = {
      v: 1,
      type: "input",
      combatVersion: 2,
      seq: ++seqA,
      round: state.round,
      forward: Math.sin(s * 0.7) > -0.3 ? 1 : -1,
      strafe: Math.sin(s * 1.3),
      yaw: a.yaw + 0.045,
      pitch: Math.sin(s * 0.5) * 0.12,
      weapon: "rifle",
      fire: s % 1.6 < 0.4,
      reload: a.ammo === 0,
      jump: false,
      sprint: false,
      walk: false,
      crouch: false,
    } as never;
    const inputB = bot.input(state, t);
    stepMatch(state, { A: inputA, B: inputB }, state.server.lastStepAt + 34, TICK_MS);
    state.phaseEndsAt = Date.now() + 3_600_000;
    push();
  };
  const timer = setInterval(step, 8);
  await sleep(WARMUP_MS);
  const canvas = host.querySelector("canvas")!;
  const sampler = startPerformanceSampler(canvas, () => controls.diagnostics());
  const intervals: number[] = [];
  let last = 0,
    raf = 0,
    calls = 0,
    triangles = 0,
    diag = 0,
    pixelRatio = 0;
  const tick = (ts: number) => {
    if (last) intervals.push(ts - last);
    last = ts;
    const d = controls.diagnostics();
    calls = Math.max(calls, d.calls);
    triangles = Math.max(triangles, d.triangles);
    pixelRatio = d.pixelRatio;
    diag++;
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  await sleep(SAMPLE_MS);
  cancelAnimationFrame(raf);
  const report = sampler.report();
  sampler.stop();
  const d = controls.diagnostics() as unknown as Record<string, number>;
  const heap = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
  clearInterval(timer);
  const row: Row = {
    map: mapId,
    // A hidden or unfocused page is throttled by the browser (and by the game when unfocused):
    // such a sample is not a measurement.
    visible: document.visibilityState === "visible" && document.hasFocus(),
    cycle,
    loadMs: Math.round(loadMs),
    ...lows(intervals),
    cpuP95: report.cpuP95,
    gpuP95: report.gpuP95,
    gpuSamples: report.gpuSamples,
    maxCalls: calls,
    maxTriangles: triangles,
    pixelRatio: +pixelRatio.toFixed(3),
    geometries: d["geometries"],
    textures: d["textures"],
    heapMB: heap ? +(heap.usedJSHeapSize / 1048576).toFixed(1) : null,
    score: `${state.score.A}-${state.score.B}`,
    round: state.round,
  };
  controls.dispose();
  host.replaceChildren();
  return row;
}

async function main() {
  const probe = document.createElement("canvas").getContext("webgl2");
  const dbg = probe?.getExtension("WEBGL_debug_renderer_info");
  const gpu = dbg ? probe!.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "unknown";
  out(`GPU: ${gpu}`);
  out(`UA: ${navigator.userAgent}`);
  out(`Window: ${innerWidth}×${innerHeight} @ devicePixelRatio ${devicePixelRatio}`);
  out("Loading models…");
  await preloadModels();
  out(`Per map: ${WARMUP_MS / 1000} s warm-up + ${SAMPLE_MS / 1000} s sampled, ${CYCLES} cycles`);
  const rows: Row[] = [];
  for (let c = 1; c <= CYCLES; c++)
    for (const m of MAPS) {
      out(`… ${m} (cycle ${c})`);
      const row = await runMap(m, c);
      rows.push(row);
      out(JSON.stringify(row));
      show(row);
      await sleep(500);
    }
  const result = {
    gpu,
    ua: navigator.userAgent,
    w: innerWidth,
    h: innerHeight,
    dpr: devicePixelRatio,
    rows,
  };
  (window as unknown as { benchResult: unknown }).benchResult = result;
  out("RESULT " + JSON.stringify(result));
  out("DONE");
}

document.getElementById("start")!.addEventListener("click", (e) => {
  (e.target as HTMLButtonElement).disabled = true;
  main().catch((err) => out("ERROR " + (err?.stack ?? err)));
});
if (params.get("auto") === "1") document.getElementById("start")!.click();
