/**
 * Perf lab, game bench: imported before anything of the game. Builds the page the client
 * harness needs (scripts/br/client-sim/ui.tsx) and records, per displayed frame, what the
 * browser and the game spend on it. Nothing here changes how the game draws.
 *
 *  - frame interval: from requestAnimationFrame timestamps (what the player sees);
 *  - script: time inside the frame's requestAnimationFrame callbacks (the client's own work);
 *  - GPU: the arena's own timer query results (br-arena.ts GpuTimer), read as it reads them;
 *  - draw calls: every WebGL draw call of the frame (scene, viewmodel, present passes);
 *  - server: time in the in-page match's 30 Hz step (the stand-in for the Cloudflare room;
 *    in a real match it runs on the server, so it is reported apart);
 *  - long tasks (PerformanceObserver) and the JS heap.
 */
import duelCss from "@/components/fps/duel.css";
import brCss from "@/components/fps/br.css";

type Frame = { t: number; cb: number; calls: number; tick: number; width: number };
type G = typeof globalThis & {
  __labSize?: [number, number];
  __brAssumeLock?: boolean;
  __labRec: Recorder;
  __labT0: number;
};
const L = globalThis as G;
L.__labT0 = performance.now();
L.__brAssumeLock = true;
// Every file of the load in the resource timeline (the browser keeps 250 by default).
performance.setResourceTimingBufferSize(20000);

// The page: the HUD's styles and a fixed-size host (CSS px) for the arena and the HUD.
const [cw, ch] = L.__labSize ?? [1536, 864];
const style = document.createElement("style");
style.textContent = `html,body{margin:0;overflow:hidden;background:#000}canvas{display:block}${duelCss}\n${brCss}`;
document.head.append(style);
document.body.innerHTML = `<div class="duel-game br-game" style="position:fixed;left:0;top:0;right:auto;bottom:auto;width:${cw}px;height:${ch}px"><div class="duel-render-host" id="arena" style="position:absolute;inset:0"></div><div id="hud"></div></div>`;

// The arena asks before the page is left mid-match; a measurement must never be held by it.
const add = EventTarget.prototype.addEventListener;
EventTarget.prototype.addEventListener = function (
  this: EventTarget,
  type: string,
  ...rest: unknown[]
) {
  if (this === window && type === "beforeunload") return;
  return (add as (...a: unknown[]) => void).call(this, type, ...rest);
} as typeof add;

let canvas: HTMLCanvasElement | null = null;
class Recorder {
  on = false;
  frames: Frame[] = [];
  gpu: number[] = [];
  long: number[] = [];
  heap: number[] = [];
  private cur: Frame | null = null;
  private tickAcc = 0;
  private calls = 0;
  /** Every frame ever drawn (frame count and the last stamp), for liveness checks. */
  total = 0;
  last = 0;
  start() {
    this.frames = [];
    this.gpu = [];
    this.long = [];
    this.heap = [];
    this.on = true;
  }
  frameStart(t: number) {
    if (this.cur && this.cur.t === t) return this.cur;
    if (this.cur && this.on) this.frames.push(this.cur);
    canvas ??= document.querySelector("#arena canvas");
    this.cur = { t, cb: 0, calls: 0, tick: this.tickAcc, width: canvas?.width ?? 0 };
    this.tickAcc = 0;
    this.calls = 0;
    this.total++;
    this.last = t;
    return this.cur;
  }
  draw() {
    this.calls++;
    if (this.cur) this.cur.calls = this.calls;
  }
  tick(ms: number) {
    this.tickAcc += ms;
  }
  gpuResult(ms: number) {
    if (this.on) this.gpu.push(ms);
  }
  longTask(ms: number) {
    if (this.on) this.long.push(ms);
  }
  sampleHeap() {
    const m = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
    if (this.on && m) this.heap.push(m.usedJSHeapSize / 1048576);
  }
  stop() {
    this.on = false;
    const f = this.frames.slice(1);
    const iv: number[] = [];
    for (let i = 1; i < f.length; i++) iv.push(f[i]!.t - f[i - 1]!.t);
    const sorted = (a: number[]) => [...a].sort((x, y) => x - y);
    const pct = (a: number[], p: number) => {
      if (!a.length) return null;
      const s = sorted(a);
      return +s[Math.min(s.length - 1, Math.floor(p * s.length))]!.toFixed(2);
    };
    /** "1 % low": the frame rate of the worst 1 % of frames (their mean interval). */
    const low = (p: number) => {
      if (!iv.length) return null;
      const s = sorted(iv).reverse();
      const n = Math.max(1, Math.round(s.length * p));
      const mean = s.slice(0, n).reduce((a, b) => a + b, 0) / n;
      return +(1000 / mean).toFixed(1);
    };
    const span = f.length > 1 ? f[f.length - 1]!.t - f[0]!.t : 0;
    const cb = f.map((x) => x.cb),
      calls = f.map((x) => x.calls),
      tick = f.reduce((a, x) => a + x.tick, 0);
    return {
      frames: f.length,
      seconds: +(span / 1000).toFixed(1),
      fps: span ? +(((f.length - 1) * 1000) / span).toFixed(1) : null,
      medianMs: pct(iv, 0.5),
      p95Ms: pct(iv, 0.95),
      p99Ms: pct(iv, 0.99),
      maxMs: pct(iv, 1),
      low1: low(0.01),
      low01: low(0.001),
      over33: iv.filter((x) => x > 33.4).length,
      over50: iv.filter((x) => x > 50).length,
      scriptMs: pct(cb, 0.5),
      scriptP95: pct(cb, 0.95),
      scriptP99: pct(cb, 0.99),
      gpuMs: pct(this.gpu, 0.5),
      gpuP95: pct(this.gpu, 0.95),
      gpuMax: pct(this.gpu, 1),
      drawCalls: pct(calls, 0.5),
      drawCallsMax: pct(calls, 1),
      serverMsPerSec: span ? +((tick * 1000) / span).toFixed(1) : null,
      // The frame rate with the in-page match's step taken out of the page's time (in a real
      // match it runs on the server): meaningful with the "fence" clock, where frames run back
      // to back; with the display clock the screen's pacing caps it anyway.
      fpsWithoutServer: span > tick ? +(((f.length - 1) * 1000) / (span - tick)).toFixed(1) : null,
      longTasks: this.long.length,
      longTaskMs: +this.long.reduce((a, b) => a + b, 0).toFixed(0),
      longTaskMax: this.long.length ? +Math.max(...this.long).toFixed(0) : 0,
      // The drawing buffer's width over the frames (the adaptive resolution at work).
      widths: Object.fromEntries(
        [
          ...f.reduce(
            (m, x) => m.set(x.width, (m.get(x.width) ?? 0) + 1),
            new Map<number, number>(),
          ),
        ]
          .sort((a, b) => b[0] - a[0])
          .map(([w, n]) => [w, +(n / Math.max(1, f.length)).toFixed(2)]),
      ),
      heapMinMB: this.heap.length ? +Math.min(...this.heap).toFixed(0) : null,
      heapMaxMB: this.heap.length ? +Math.max(...this.heap).toFixed(0) : null,
    };
  }
}
const rec = new Recorder();
L.__labRec = rec;

/**
 * The frame clock. "display" (default): the browser's requestAnimationFrame, paced by the
 * screen (vsync). "fence": frames as fast as the machine runs them, with at most two frames'
 * GPU work in flight (a WebGL fence per frame), as an uncapped, vsync-off game loop would be.
 * Used where the browser has no display to pace frames by (screen off: Chrome then runs
 * requestAnimationFrame at 1 Hz) and to measure uncapped frame rates. The frame's own work is
 * identical; only when the next one starts differs. Presenting to the screen is not included.
 */
type Clock = "display" | "fence";
const clock: Clock = (globalThis as { __labClock?: Clock }).__labClock ?? "display";
const browserRaf = window.requestAnimationFrame.bind(window);
let queued = new Map<number, FrameRequestCallback>();
let nextId = 1;
const fences: WebGLSync[] = [];
let gl2: WebGL2RenderingContext | null = null;
const channel = new MessageChannel();
let scheduled = false;
const kick = () => {
  if (scheduled) return;
  scheduled = true;
  channel.port2.postMessage(0);
};
channel.port1.onmessage = () => {
  scheduled = false;
  if (!queued.size) return;
  gl2 ??=
    (document.querySelector("#arena canvas") as HTMLCanvasElement | null)?.getContext("webgl2") ??
    null;
  // Two frames in flight at most: wait (without blocking the page) for the older one's GPU work.
  if (gl2 && fences.length >= 2) {
    const f = fences[0]!;
    const st = gl2.clientWaitSync(f, 0, 0);
    if (st !== gl2.ALREADY_SIGNALED && st !== gl2.CONDITION_SATISFIED && !gl2.isContextLost()) {
      setTimeout(kick, 0);
      return;
    }
    gl2.deleteSync(f);
    fences.shift();
  }
  const run = queued;
  queued = new Map();
  const t = performance.now();
  for (const cb of run.values()) cb(t);
  if (gl2 && !gl2.isContextLost()) {
    const f = gl2.fenceSync(gl2.SYNC_GPU_COMMANDS_COMPLETE, 0);
    if (f) fences.push(f);
    gl2.flush();
  }
};
const raf =
  clock === "fence"
    ? (cb: FrameRequestCallback) => {
        const id = nextId++;
        queued.set(id, cb);
        kick();
        return id;
      }
    : browserRaf;
if (clock === "fence") window.cancelAnimationFrame = (id: number) => void queued.delete(id);
window.requestAnimationFrame = (cb: FrameRequestCallback) =>
  raf((t) => {
    const frame = rec.frameStart(t);
    const s = performance.now();
    try {
      cb(t);
    } finally {
      frame.cb += performance.now() - s;
    }
  });
// The in-page match steps on a 33 ms interval (client-sim entry.ts): time it apart.
const si = window.setInterval.bind(window);
window.setInterval = ((fn: TimerHandler, ms?: number, ...args: unknown[]) =>
  si(
    typeof fn === "function"
      ? () => {
          const s = performance.now();
          try {
            (fn as (...a: unknown[]) => void)(...args);
          } finally {
            if (ms !== undefined && ms > 30 && ms < 40) rec.tick(performance.now() - s);
          }
        }
      : fn,
    ms,
  )) as typeof window.setInterval;

const proto = WebGL2RenderingContext.prototype;
for (const name of [
  "drawElements",
  "drawArrays",
  "drawElementsInstanced",
  "drawArraysInstanced",
  "drawRangeElements",
] as const) {
  const orig = proto[name] as (...a: unknown[]) => void;
  (proto as unknown as Record<string, unknown>)[name] = function (this: unknown, ...a: unknown[]) {
    rec.draw();
    return orig.apply(this, a);
  };
}
const gqp = proto.getQueryParameter;
proto.getQueryParameter = function (this: WebGL2RenderingContext, q: WebGLQuery, pname: GLenum) {
  const v = gqp.call(this, q, pname);
  if (pname === this.QUERY_RESULT && typeof v === "number") rec.gpuResult(v / 1e6);
  return v;
};
try {
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) rec.longTask(e.duration);
  }).observe({ type: "longtask", buffered: false });
} catch {
  // (No long-task timing in this browser.)
}
si(() => rec.sampleHeap(), 500);
export {};
