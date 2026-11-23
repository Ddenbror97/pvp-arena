/**
 * Real-GPU bench of the island renderer's depth paths (render audit 2026-11-15, stage 3).
 *
 *   node scripts/br/gpu-bench/build.mjs <out.js>
 *
 * Builds the explorer (scripts/br/explorer/entry.ts, the game's renderer settings) with one
 * addition, `window.brBench(views, width, height)`: each view is drawn in batches at a fixed
 * render size, and the batch is timed to the end of the GPU's work (`gl.finish` and a read
 * back), so the figure is CPU + GPU per frame with the GPU under load, not held to the
 * display's refresh. The depth path is the page's query, as in the explorer:
 *
 *   ?depth=log    logarithmic depth (the default until 2026-11-16)
 *   ?order=0      reversed-Z with three's own draw order
 *   (none)        reversed-Z with the early-depth draw order, the game's default
 *
 * The bundle is one ES module that loads the island from `/fps/br/…` of whatever site the page
 * is on: open any page of the deployed site, set the query, and import it.
 */
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const out = path.resolve(process.argv[2] ?? "bench.js");
let src = fs.readFileSync(path.join(ROOT, "scripts/br/explorer/entry.ts"), "utf8");
const swap = (a, b) => {
  if (!src.includes(a)) throw new Error(`explorer entry changed: ${a}`);
  src = src.replace(a, b);
};
src = src.replaceAll('"../../../src/', '"@/');
// A fixed render size, whatever the window is.
swap("function resize() {", "let benchSize: [number, number] | null = null;\nfunction resize() {");
swap(
  "const w = innerWidth,\n    h = innerHeight;",
  "const w = benchSize?.[0] ?? innerWidth,\n    h = benchSize?.[1] ?? innerHeight;",
);
src =
  'import { GROUND_TAPS as benchGroundTaps } from "@/lib/fps/br/terrain";\n' +
  src +
  "\n(window as unknown as { brGroundTaps: unknown }).brGroundTaps = (n: number) => void (benchGroundTaps.value = n);\n";
src += `
type BenchView = { pos: number[]; look: number[]; lookAgl?: boolean; aloft?: boolean };
(window as unknown as { brBench: unknown }).brBench = async (
  views: Record<string, BenchView>,
  width = 1632,
  height = 918,
) => {
  await ready;
  const ex = (window as unknown as { explorer: { groundAt: (x: number, z: number) => number; view: (p: number[], l: number[], o: object) => Promise<Record<string, number>> } }).explorer;
  pixelRatioOverride = 1;
  benchSize = [width, height];
  resize();
  const gl = renderer.getContext() as WebGL2RenderingContext;
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  const px = new Uint8Array(4);
  const sync = () => {
    gl.finish();
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  };
  const median = (a: number[]) => [...a].sort((x, y) => x - y)[a.length >> 1]!;
  const out: Record<string, unknown> = {};
  for (const [name, v] of Object.entries(views)) {
    const g = ex.groundAt;
    const pos = [v.pos[0]!, g(v.pos[0]!, v.pos[2]!) + v.pos[1]!, v.pos[2]!];
    const look = v.lookAgl ? [v.look[0]!, g(v.look[0]!, v.look[2]!) + v.look[1]!, v.look[2]!] : v.look;
    const fog = scene.fog as THREE.Fog;
    fog.near = v.aloft ? 3240 : 1800;
    fog.far = v.aloft ? 12350 : 9500;
    const s = await ex.view(pos, look, { near: 0.1, fov: 70 });
    for (let i = 0; i < 20; i++) draw();
    sync();
    const frame: number[] = [],
      cpu: number[] = [];
    for (let b = 0; b < 12; b++) {
      const t0 = performance.now();
      for (let k = 0; k < 10; k++) draw();
      const t1 = performance.now();
      sync();
      const t2 = performance.now();
      frame.push((t2 - t0) / 10);
      cpu.push((t1 - t0) / 10);
    }
    out[name] = {
      ms: +median(frame).toFixed(2),
      best: +Math.min(...frame).toFixed(2),
      submit: +median(cpu).toFixed(2),
      calls: s["calls"],
      tris: +((s["triangles"] ?? 0) / 1e6).toFixed(2),
    };
    await new Promise((r) => setTimeout(r, 0));
  }
  return {
    gpu: info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : "unknown",
    size: [gl.drawingBufferWidth, gl.drawingBufferHeight],
    depth: sceneTarget ? "reversed" : "log",
    order: new URLSearchParams(location.search).get("order") !== "0" && !!sceneTarget,
    msaa: gl.getParameter(gl.SAMPLES),
    views: out,
  };
};
`;
const tmp = path.join(ROOT, "scripts/br/gpu-bench/.entry.generated.ts");
fs.writeFileSync(tmp, src);
try {
  await build({
    entryPoints: [tmp],
    bundle: true,
    outfile: out,
    format: "esm",
    target: "es2022",
    minify: true,
    alias: { "@": path.join(ROOT, "src") },
    logLevel: "error",
  });
} finally {
  fs.rmSync(tmp);
}
console.log(`${out}: ${(fs.statSync(out).size / 1048576).toFixed(2)} MB`);
