/** Browser-only bounded sampler. GPU queries are optional, asynchronous and reused. */
export function startPerformanceSampler(
  canvas: HTMLCanvasElement,
  read: () => { frameMs: number; cpuMs: number },
) {
  const gl = canvas.getContext("webgl2")!;
  const debug = gl.getExtension("WEBGL_debug_renderer_info");
  const renderer = debug
    ? (gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) as string)
    : "unavailable";
  const ext = gl.getExtension("EXT_disjoint_timer_query_webgl2");
  const queries = ext
    ? Array.from({ length: 4 }, () => ({ query: gl.createQuery()!, pending: false, valid: true }))
    : [];
  const frames = new Uint32Array(2001),
    cpu = new Uint32Array(2001),
    gpu = new Uint32Array(2001);
  let count = 0,
    gpuCount = 0,
    active = -1,
    tick = 0,
    raf = 0,
    losses = 0;
  let armed = false;
  const beginDraw = () => {
    if (!armed || !ext) return;
    armed = false;
    active = queries.findIndex((slot) => !slot.pending);
    if (active < 0) return;
    queries[active]!.valid = true;
    gl.beginQuery(ext.TIME_ELAPSED_EXT, queries[active]!.query);
  };
  // Start at the first actual draw, not at the previous rAF callback: the
  // latter includes idle time between frames and overstates GPU workload.
  const drawMethods = [
    "drawElements",
    "drawArrays",
    "drawElementsInstanced",
    "drawArraysInstanced",
  ] as const;
  const originals = drawMethods.map((name) => gl[name]);
  if (ext)
    drawMethods.forEach((name, i) => {
      const original = originals[i] as (...args: (number | undefined)[]) => void;
      const wrapped = function (a: number, b: number, c: number, d?: number, e?: number) {
        beginDraw();
        original.call(gl, a, b, c, d, e);
      };
      Object.defineProperty(gl, name, { configurable: true, writable: true, value: wrapped });
    });
  const lost = () => losses++;
  canvas.addEventListener("webglcontextlost", lost);
  const record = (hist: Uint32Array, value: number) => {
    hist[Math.max(0, Math.min(hist.length - 1, Math.floor(value * 10)))]!++;
  };
  const sample = () => {
    const data = read();
    record(frames, data.frameMs);
    record(cpu, data.cpuMs);
    count++;
    if (ext) {
      if (active >= 0) {
        gl.endQuery(ext.TIME_ELAPSED_EXT);
        queries[active]!.pending = true;
        active = -1;
      }
      // Poll only once every 12 frames. Never synchronously wait for the GPU.
      if (++tick % 12 === 0) {
        const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT);
        if (disjoint) for (const slot of queries) slot.valid = false;
        for (let i = 0; i < queries.length; i++) {
          const slot = queries[i]!;
          if (slot.pending && gl.getQueryParameter(slot.query, gl.QUERY_RESULT_AVAILABLE)) {
            if (!disjoint && slot.valid) {
              record(gpu, Number(gl.getQueryParameter(slot.query, gl.QUERY_RESULT)) / 1e6);
              gpuCount++;
            }
            slot.pending = false;
          }
        }
        armed = !disjoint;
      }
    }
    raf = requestAnimationFrame(sample);
  };
  const percentile = (hist: Uint32Array, total: number, fraction: number) => {
    if (!total) return null;
    let sum = 0;
    for (let i = 0; i < hist.length; i++) {
      sum += hist[i]!;
      if (sum >= total * fraction) return i / 10;
    }
    return 200;
  };
  raf = requestAnimationFrame(sample);
  return {
    report: () => ({
      renderer,
      frames: count,
      contextLosses: losses,
      frameMedian: percentile(frames, count, 0.5),
      frameP95: percentile(frames, count, 0.95),
      frameP99: percentile(frames, count, 0.99),
      cpuP95: percentile(cpu, count, 0.95),
      gpuSupported: !!ext,
      gpuSamples: gpuCount,
      gpuP95: percentile(gpu, gpuCount, 0.95),
    }),
    stop() {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("webglcontextlost", lost);
      if (active >= 0) gl.endQuery(ext!.TIME_ELAPSED_EXT);
      if (ext)
        drawMethods.forEach((name, i) => {
          Object.defineProperty(gl, name, {
            configurable: true,
            writable: true,
            value: originals[i],
          });
        });
      for (const slot of queries) gl.deleteQuery(slot.query);
    },
  };
}
