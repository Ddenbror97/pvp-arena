// ---------------------------------------------------------------- perf lab: world bench
// Appended to the explorer's entry by scripts/br/perf-lab/build.mjs (it reads the entry's
// locals). `labWorld.run(plan)` draws each scene item at a fixed render size and records, per
// frame: the script's time to select and submit it (CPU), the GPU's time for it (timer query),
// and per batch of 10 frames the wall time to the end of the GPU's work (throughput, the frame
// time an uncapped loop would get). Results go to `window.__lab` (poll it: a run takes minutes).
type LabItem =
  | {
      name: string;
      kind: "pan";
      at: [number, number];
      eye?: number;
      pitch?: number;
      frames?: number;
    }
  | {
      name: string;
      kind: "fly";
      from: [number, number];
      to: [number, number];
      agl: number;
      pitch?: number;
      frames?: number;
      aloft?: boolean;
    };
type LabPlan = { size: [number, number]; items: LabItem[]; label?: string };
const labOut: Record<string, unknown> = {};
(window as unknown as { __lab: unknown }).__lab = labOut;
// The explorer's own timer would nest queries inside ours (one per target at a time).
gpu.begin = () => {};
gpu.end = () => {};
const labPct = (a: number[], p: number) => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  return +s[Math.min(s.length - 1, Math.floor(p * s.length))]!.toFixed(2);
};
/** Open ground near (x, z): not inside anything, nothing overhead, on the terrain. */
function labSpot(x: number, z: number) {
  for (let i = 0; i < 3000; i++) {
    const r = i === 0 ? 0 : 4 + i * 0.8,
      a = i * 2.39996;
    const px = x + Math.cos(a) * r,
      pz = z + Math.sin(a) * r;
    const g = groundAt(px, pz);
    if (g < 1) continue;
    if (solid.blocked(px, g + 0.1, pz, 1.8, 0.6)) continue;
    if (Math.abs(solid.supportAt(px, pz, 0.35, g + 80) - g) > 0.3) continue;
    return [px, g, pz] as const;
  }
  return [x, groundAt(x, z), z] as const;
}
async function labRun(plan: LabPlan) {
  await ready;
  const gl = renderer.getContext() as WebGL2RenderingContext;
  const ext = gl.getExtension("EXT_disjoint_timer_query_webgl2") as {
    TIME_ELAPSED_EXT: number;
    GPU_DISJOINT_EXT: number;
  } | null;
  pixelRatioOverride = 1;
  benchSize = plan.size;
  resize();
  const px = new Uint8Array(4);
  const sync = () => {
    gl.finish();
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  };
  const results: Record<string, unknown> = {};
  labOut[plan.label ?? `${plan.size[0]}x${plan.size[1]}`] = results;
  const fog = scene.fog as THREE.Fog;
  for (const item of plan.items) {
    const frames = item.frames ?? 240;
    const pose: Array<() => void> = [];
    if (item.kind === "pan") {
      const [x, g, z] = labSpot(item.at[0], item.at[1]);
      for (let f = 0; f < frames; f++) {
        const yaw = (f / frames) * Math.PI * 2;
        const pitch = item.pitch ?? -0.05;
        pose.push(() => {
          camera.position.set(x, g + (item.eye ?? 1.62), z);
          camera.rotation.set(pitch, yaw, 0, "YXZ");
        });
      }
    } else {
      for (let f = 0; f < frames; f++) {
        const t = f / (frames - 1);
        const x = item.from[0] + (item.to[0] - item.from[0]) * t,
          z = item.from[1] + (item.to[1] - item.from[1]) * t;
        const yaw = Math.atan2(-(item.to[0] - item.from[0]), -(item.to[1] - item.from[1]));
        pose.push(() => {
          camera.position.set(x, Math.max(groundAt(x, z), 0) + item.agl, z);
          camera.rotation.set(item.pitch ?? -0.35, yaw, 0, "YXZ");
        });
      }
    }
    // The game's fog aloft (br-arena: farther haze in the plane and under the canopy).
    const aloft = item.kind === "fly" && (item.aloft ?? item.agl > 100);
    fog.near = aloft ? 3240 : 1800;
    fog.far = aloft ? 12350 : 9500;
    camera.fov = 70;
    camera.near = 0.1;
    camera.updateProjectionMatrix();
    // Warm-up: the first pose's LODs, then the route once untimed (shaders and uploads).
    pose[0]!();
    camera.updateMatrixWorld();
    islandScene.update(camera, true);
    for (let i = 0; i < frames; i += 4) {
      pose[i]!();
      camera.updateMatrixWorld();
      draw();
      if (i % 40 === 0) await new Promise((r) => setTimeout(r, 0));
    }
    sync();
    const cpu: number[] = [],
      gpuMs: number[] = [],
      batch: number[] = [],
      calls: number[] = [],
      select: number[] = [],
      tris: number[] = [];
    const queries: WebGLQuery[] = [];
    let disjoints = 0,
      unavailable = 0;
    let t0 = performance.now();
    for (let f = 0; f < frames; f++) {
      pose[f]!();
      camera.updateMatrixWorld();
      const q = ext ? gl.createQuery() : null;
      if (q && ext) gl.beginQuery(ext.TIME_ELAPSED_EXT, q);
      const c0 = performance.now();
      const s = draw();
      cpu.push(performance.now() - c0);
      if (q && ext) {
        gl.endQuery(ext.TIME_ELAPSED_EXT);
        queries.push(q);
      }
      calls.push(s.calls as number);
      select.push(s.selectMs as number);
      tris.push(s.triangles as number);
      if (f % 10 === 9) {
        sync();
        const t = performance.now();
        batch.push((t - t0) / 10);
        // Collect finished queries (all are, after the finish).
        // (A disjoint flag — the GPU's clock changed, e.g. a power state — is counted, not
        // used to drop the batch: some drivers raise it often.)
        if (ext && (gl.getParameter(ext.GPU_DISJOINT_EXT) as boolean)) disjoints++;
        // (Results can lag the finish on some drivers: collected in order as they come.)
        while (queries.length && gl.getQueryParameter(queries[0]!, gl.QUERY_RESULT_AVAILABLE)) {
          const qq = queries.shift()!;
          gpuMs.push((gl.getQueryParameter(qq, gl.QUERY_RESULT) as number) / 1e6);
          gl.deleteQuery(qq);
        }
        // Yield to the page now and then (the tab stays responsive), outside the timing.
        if (f % 60 === 59) await new Promise((r) => setTimeout(r, 0));
        t0 = performance.now();
      }
    }
    // The last results: a few more tasks for them to arrive, then the rest are counted lost.
    for (let k = 0; k < 40 && queries.length; k++) {
      await new Promise((r) => setTimeout(r, 25));
      while (queries.length && gl.getQueryParameter(queries[0]!, gl.QUERY_RESULT_AVAILABLE)) {
        const qq = queries.shift()!;
        gpuMs.push((gl.getQueryParameter(qq, gl.QUERY_RESULT) as number) / 1e6);
        gl.deleteQuery(qq);
      }
    }
    unavailable = queries.length;
    for (const qq of queries.splice(0)) gl.deleteQuery(qq);
    results[item.name] = {
      frameMs: labPct(batch, 0.5),
      frameP95: labPct(batch, 0.95),
      fps: batch.length ? +(1000 / labPct(batch, 0.5)!).toFixed(1) : null,
      gpuMs: labPct(gpuMs, 0.5),
      gpuP95: labPct(gpuMs, 0.95),
      gpuMax: labPct(gpuMs, 1),
      cpuMs: labPct(cpu, 0.5),
      cpuP95: labPct(cpu, 0.95),
      selectMs: labPct(select, 0.5),
      selectP95: labPct(select, 0.95),
      calls: labPct(calls, 0.5),
      callsMax: labPct(calls, 1),
      mtris: +((labPct(tris, 0.5) ?? 0) / 1e6).toFixed(2),
      mtrisMax: +((labPct(tris, 1) ?? 0) / 1e6).toFixed(2),
      gpuSamples: gpuMs.length,
      disjoints,
      unavailable,
      timerQuery: !!ext,
    };
  }
  results["_"] = {
    size: [gl.drawingBufferWidth, gl.drawingBufferHeight],
    tier,
    msaa: sceneTarget ? (tier === "low" ? 0 : 4) : gl.getParameter(gl.SAMPLES),
    depth: sceneTarget ? "reversed" : "log",
    programs: renderer.info.programs?.length ?? 0,
    textures: renderer.info.memory.textures,
    geometries: renderer.info.memory.geometries,
    heapMB: (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory
      ? +(
          (performance as unknown as { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize /
          1048576
        ).toFixed(0)
      : null,
  };
  return results;
}
(window as unknown as { labWorld: unknown }).labWorld = {
  ready,
  run: labRun,
  spot: (x: number, z: number) => (labSpot(x, z) as readonly number[]).slice(),
  pois: () => meta.pois.map((p) => ({ id: p.id, x: p.x, z: p.z, r: p.radius })),
  info: () => {
    const gl = renderer.getContext() as WebGL2RenderingContext;
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    return {
      gpu: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "?",
      tier,
      loadMs: (window as unknown as { loadMs?: number }).loadMs,
      depth: sceneTarget ? "reversed" : "log",
    };
  },
};
