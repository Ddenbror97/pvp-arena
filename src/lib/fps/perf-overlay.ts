import type * as THREE from "three";
import { DevOverlay, GpuTimer } from "./br/dev-overlay";

/**
 * F3 performance window for the 1v1 and 5v5 maps (owner, 2026-11-10), the battle royale's
 * overlay (br/dev-overlay.ts): fps, frame ms (mean and p95), GPU ms, draw calls, triangles,
 * render scale and the graphics card. Hidden until F3; works with or without pointer lock.
 * Renderer-side only.
 */
export function createPerfOverlay(renderer: THREE.WebGLRenderer, host: HTMLElement) {
  const gl = renderer.getContext() as WebGL2RenderingContext;
  const gpu = new GpuTimer(gl);
  const overlay = new DevOverlay(host.parentElement ?? host, false);
  let gpuName = "";
  try {
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    const raw = String(gl.getParameter(dbg ? dbg.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? "");
    gpuName =
      /^ANGLE \((?:[^,]*, )?([^,]+)/
        .exec(raw)?.[1]
        ?.replace(/\s*\(0x[0-9a-f]+\)/gi, "")
        .trim() ?? raw;
  } catch {
    // No name: the line is left out.
  }
  const key = (e: KeyboardEvent) => {
    if (e.code !== "F3" || e.repeat) return;
    e.preventDefault();
    overlay.toggle();
  };
  document.addEventListener("keydown", key);
  return {
    /** Before the frame's first render (GPU timing only while the window is open). */
    begin() {
      if (overlay.visible) gpu.begin();
    },
    /** After the frame's last render (renderer.info not reset in between). */
    end(frameMs: number, cpuMs: number) {
      if (overlay.visible) gpu.end();
      overlay.frame({
        frameMs,
        gpuMs: gpu.last,
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        pixelRatio: renderer.getPixelRatio(),
        note: `cpu ${cpuMs.toFixed(2)} ms${gpuName ? `\n${gpuName}` : ""}`,
      });
    },
    dispose() {
      document.removeEventListener("keydown", key);
      gpu.dispose();
      overlay.dispose();
    },
  };
}
