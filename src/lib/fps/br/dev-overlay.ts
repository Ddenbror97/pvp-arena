/**
 * Developer performance overlay for the battle royale (PLAN §10 "PerformanceManager and dev
 * overlay"): fps, frame ms (mean and p95 over the last 2 s), simulation ms, GPU ms (via
 * EXT_disjoint_timer_query_webgl2 when the browser exposes it), draw calls, triangles, visible
 * instances, entities, and network round trip and loss when a match supplies them.
 *
 * Renderer-side only: nothing here is read by the simulation (fairness boundary). The overlay is
 * a plain DOM element updated four times a second, so it costs nothing measurable per frame.
 */

/** GPU time per frame from timer queries; null where the extension is missing (most mobiles). */
export class GpuTimer {
  private readonly gl: WebGL2RenderingContext;
  private ext: { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number } | null;
  private readonly pending: WebGLQuery[] = [];
  private active: WebGLQuery | null = null;
  /** Latest finished measurement (ms). */
  last: number | null = null;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.ext = gl.getExtension("EXT_disjoint_timer_query_webgl2") as GpuTimer["ext"];
  }

  /**
   * After a context loss: queries and the extension belong to the old context. Drop them and
   * fetch the extension again from the restored one.
   */
  reset() {
    this.pending.length = 0;
    this.active = null;
    this.last = null;
    this.ext = this.gl.getExtension("EXT_disjoint_timer_query_webgl2") as GpuTimer["ext"];
  }

  get supported() {
    return this.ext !== null;
  }

  begin() {
    if (!this.ext || this.active || this.gl.isContextLost()) return;
    // Collect finished queries here too: end() polls only after a query it started, so with
    // more than four pending begin() refused every new one and the reading froze for good.
    if (this.pending.length) this.poll();
    if (this.pending.length > 4) return;
    const q = this.gl.createQuery();
    if (!q) return;
    this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, q);
    this.active = q;
  }

  end() {
    if (!this.ext || !this.active) return;
    this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
    this.pending.push(this.active);
    this.active = null;
    this.poll();
  }

  private poll() {
    const gl = this.gl;
    const disjoint = gl.getParameter(this.ext!.GPU_DISJOINT_EXT) as boolean;
    while (this.pending.length) {
      const q = this.pending[0]!;
      if (!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) break;
      const ns = gl.getQueryParameter(q, gl.QUERY_RESULT) as number;
      if (!disjoint) this.last = ns / 1e6;
      gl.deleteQuery(q);
      this.pending.shift();
    }
  }

  dispose() {
    for (const q of this.pending) this.gl.deleteQuery(q);
    this.pending.length = 0;
  }
}

export type DevSample = {
  frameMs: number;
  simMs?: number;
  gpuMs?: number | null;
  calls: number;
  triangles: number;
  instances?: number;
  entities?: number;
  rttMs?: number;
  loss?: number;
  /** Render scale from the adaptive budget (cosmetic: never changes what is drawn). */
  pixelRatio?: number;
  note?: string;
};

const WINDOW = 120;

export class DevOverlay {
  readonly element: HTMLPreElement;
  private readonly frames = new Float32Array(WINDOW);
  private count = 0;
  private lastText = 0;
  private latest: DevSample | null = null;

  constructor(parent: HTMLElement, visible = true) {
    const el = document.createElement("pre");
    el.style.cssText =
      "position:fixed;right:8px;top:8px;margin:0;padding:6px 8px;background:#000a;color:#d8f0dc;" +
      "font:12px/1.35 ui-monospace,monospace;pointer-events:none;z-index:50;white-space:pre";
    el.style.display = visible ? "block" : "none";
    parent.appendChild(el);
    this.element = el;
  }

  get visible() {
    return this.element.style.display !== "none";
  }

  toggle(show = !this.visible) {
    this.element.style.display = show ? "block" : "none";
  }

  /** Record one frame; the text refreshes at most four times a second. */
  frame(sample: DevSample, now = performance.now()) {
    this.frames[this.count % WINDOW] = sample.frameMs;
    this.count++;
    this.latest = sample;
    if (!this.visible || now - this.lastText < 250) return;
    this.lastText = now;
    this.element.textContent = this.text();
  }

  /** Mean and 95th percentile frame time over the window (ms). */
  frameStats() {
    const n = Math.min(this.count, WINDOW);
    if (!n) return { mean: 0, p95: 0, fps: 0 };
    const v = Array.from(this.frames.subarray(0, n)).sort((a, b) => a - b);
    const mean = v.reduce((s, x) => s + x, 0) / n;
    return { mean, p95: v[Math.min(n - 1, Math.floor(n * 0.95))]!, fps: 1000 / mean };
  }

  text() {
    const s = this.latest;
    if (!s) return "";
    const f = this.frameStats();
    const lines = [
      `${f.fps.toFixed(0)} fps   frame ${f.mean.toFixed(1)} ms  p95 ${f.p95.toFixed(1)} ms`,
      `gpu ${s.gpuMs == null ? "n/a" : `${s.gpuMs.toFixed(2)} ms`}   sim ${s.simMs == null ? "-" : `${s.simMs.toFixed(2)} ms`}`,
      `draws ${s.calls}   tris ${(s.triangles / 1e6).toFixed(2)} M`,
      `instances ${s.instances ?? "-"}   entities ${s.entities ?? "-"}`,
    ];
    if (s.rttMs !== undefined || s.loss !== undefined)
      lines.push(
        `rtt ${s.rttMs?.toFixed(0) ?? "-"} ms   loss ${((s.loss ?? 0) * 100).toFixed(1)} %`,
      );
    if (s.pixelRatio !== undefined)
      lines.push(`render scale ${s.pixelRatio.toFixed(2)} (cosmetic)`);
    if (s.note) lines.push(s.note);
    return lines.join("\n");
  }

  dispose() {
    this.element.remove();
  }
}
