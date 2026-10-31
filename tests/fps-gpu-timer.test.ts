import { it, expect, vi } from "vitest";
import { startPerformanceSampler } from "./e2e/helpers/fps-performance-sampler";

it("starts GPU timing at a draw rather than spanning the idle rAF gap, then restores GL methods", () => {
  const callbacks: FrameRequestCallback[] = [],
    events: string[] = [];
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
    callbacks.push(callback),
  );
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  const draw = () => events.push("draw"),
    deleted = vi.fn();
  const gl = {
    QUERY_RESULT_AVAILABLE: 3,
    getExtension: (name: string) =>
      name === "EXT_disjoint_timer_query_webgl2"
        ? { TIME_ELAPSED_EXT: 1, GPU_DISJOINT_EXT: 2 }
        : null,
    getParameter: () => false,
    getQueryParameter: (_query: unknown, name: number) => (name === 3 ? true : 1e6),
    createQuery: () => ({}),
    deleteQuery: deleted,
    beginQuery: () => events.push("begin"),
    endQuery: () => events.push("end"),
    drawElements: draw,
    drawArrays: draw,
    drawElementsInstanced: draw,
    drawArraysInstanced: draw,
  };
  const canvas = { getContext: () => gl, addEventListener: vi.fn(), removeEventListener: vi.fn() };
  const sampler = startPerformanceSampler(canvas as unknown as HTMLCanvasElement, () => ({
    frameMs: 16,
    cpuMs: 1,
  }));
  try {
    for (let i = 0; i < 12; i++) callbacks.shift()!(i * 16);
    expect(events).toEqual([]); // Idle frames cannot start an elapsed query.
    gl.drawElements();
    expect(events).toEqual(["begin", "draw"]);
    callbacks.shift()!(208);
    expect(events).toEqual(["begin", "draw", "end"]);
    sampler.stop();
    expect(gl.drawElements).toBe(draw);
    expect(deleted).toHaveBeenCalledTimes(4);
  } finally {
    vi.unstubAllGlobals();
  }
});
