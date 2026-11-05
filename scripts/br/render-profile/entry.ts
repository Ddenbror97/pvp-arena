import * as THREE from "three";
import { createBrArena, type BrView } from "../../../src/lib/fps/br/br-arena";
import { decodeHeightfield, type Heightfield } from "../../../src/lib/fps/br/heightfield";
import type { WorldMeta } from "../../../src/lib/fps/br/world";
import type { ViewDistance } from "../../../src/lib/fps/br/br-settings";
import { decodeLandCover } from "../../../src/lib/fps/br/landcover";
import { buildIsland } from "../../../src/lib/fps/br/island";
import {
  BrSeatSync,
  BrSight,
  brViewFor,
  createBrMatch,
  seatHuman,
  stepBrMatch,
} from "../../../src/lib/fps/br/match";
const base = location.origin + "/";
declare global {
  var __benchRendered: (renderer: THREE.WebGLRenderer, ms: number) => void;
  var __qaSelect: number | undefined;
}
const host = document.createElement("div");
host.style.cssText = "position:fixed;inset:0";
document.body.append(host);
let renderMs = 0,
  draws = 0,
  tris = 0,
  renders = 0,
  renderer: THREE.WebGLRenderer;
globalThis.__benchRendered = (r: THREE.WebGLRenderer, ms: number) => {
  renders++;
  renderer = r;
  renderMs += ms;
  draws += r.info.render.calls;
  tris += r.info.render.triangles;
};
const arena = createBrArena(host, base, () => {});
let view: BrView, hf: Heightfield, meta: WorldMeta;
let world: ReturnType<typeof buildIsland>["solid"];
let origin: { x: number; y: number; z: number };
let acknowledged = 0;
arena.setSender((raw) => {
  const input = JSON.parse(raw);
  if (input.type === "br-input") acknowledged = input.seq;
});
let scene = "airfield",
  viewDistance = "medium";
const ready = (async () => {
  const [h, l, m, c] = await Promise.all([
    fetch("/fps/br/height.v1.hf").then((r) => r.arrayBuffer()),
    fetch("/fps/br/landcover.v1.lc").then((r) => r.arrayBuffer()),
    fetch("/fps/br/world.v1.json").then((r) => r.json()),
    fetch("/fps/br/models/collision.json").then((r) => r.json()),
  ]);
  hf = await decodeHeightfield(h);
  const cover = await decodeLandCover(l);
  meta = m;
  world = buildIsland(hf, cover, m, c).solid;
  const state = createBrMatch(meta, 20261103, (x, z) => hf.heightAt(x, z), []);
  const me = seatHuman(state, "qa-local", "Me");
  stepBrMatch(state, world, meta, new Map(), 100, 34);
  view = {
    ...brViewFor(state, world, new BrSight(), me, 100, new BrSeatSync()),
    route: state.route,
  } as unknown as BrView;
  origin = { x: view.you.x, y: view.you.y, z: view.you.z };
  await arena.ready;
  const feed = () => {
    const t = performance.now();
    const x = scene === "town" ? -3161 : origin.x,
      z = scene === "town" ? -3525.4 : origin.z;
    const y = hf.heightAt(x, z);
    const copy: BrView = {
      ...view,
      tick: Math.floor(t / 34),
      now: t,
      phase: "starting",
      phaseAt: t + 1000000,
      you: { ...view.you, seq: Math.max(0, acknowledged - 3), x, y, z },
      players: view.players.map((p) => {
        const a = [...p];
        a[1] = x + (p[1]! - origin.x);
        a[3] = z + (p[3]! - origin.z);
        a[2] = hf.heightAt(a[1]!, a[3]!);
        return a;
      }),
    };
    arena.snapshot(copy);
  };
  feed();
  setInterval(feed, 34);
  arena.look(0, 0);
  arena.tacticalMap();
  await new Promise((r) => setTimeout(r, 12000));
})();
const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
function percentile(v: number[], p: number) {
  const a = [...v].sort((a, b) => a - b);
  return a[Math.min(a.length - 1, Math.floor(a.length * p))];
}
const bench = {
  ready,
  arena,
  async recover() {
    const canvas = renderer!.domElement;
    const gl = renderer!.getContext();
    const extension = gl.getExtension("WEBGL_lose_context");
    if (!extension) return { supported: false, recovered: false };
    const lost = new Promise<void>((resolve) =>
      canvas.addEventListener("webglcontextlost", () => resolve(), { once: true }),
    );
    const restored = new Promise<void>((resolve) =>
      canvas.addEventListener("webglcontextrestored", () => resolve(), { once: true }),
    );
    extension.loseContext();
    await lost;
    const before = renders;
    await new Promise((r) => setTimeout(r, 100));
    extension.restoreContext();
    await restored;
    const until = performance.now() + 30000;
    while (renders < before + 10 && performance.now() < until)
      await new Promise((r) => setTimeout(r, 100));
    return { supported: true, recovered: !gl.isContextLost() && renders >= before + 10 };
  },
  async run(nextScene: string, quality: ViewDistance, frames = 360) {
    scene = nextScene;
    viewDistance = quality;
    arena.setViewDistance(quality);
    arena.look(0, 0);
    await new Promise((r) => setTimeout(r, 3000));
    const values: {
      frame: number[];
      render: number[];
      draw: number[];
      tri: number[];
      select: number[];
    } = { frame: [], render: [], draw: [], tri: [], select: [] };
    let last = performance.now();
    let count = 0;
    await new Promise<void>((resolve) => {
      const f = (now: number) => {
        if (count > 2) {
          values.frame.push(now - last);
          values.render.push(renderMs);
          values.draw.push(draws);
          values.tri.push(tris);
          values.select.push(globalThis.__qaSelect ?? 0);
        }
        count++;
        last = now;
        renderMs = draws = tris = 0;
        if (count < frames + 3) requestAnimationFrame(f);
        else resolve();
      };
      requestAnimationFrame(f);
    });
    const gl = renderer!.getContext();
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    return {
      scene,
      viewDistance,
      frames,
      frameMs: { mean: mean(values.frame), p95: percentile(values.frame, 0.95) },
      renderCpuMs: { mean: mean(values.render), p95: percentile(values.render, 0.95) },
      selectMs: { mean: mean(values.select), p95: percentile(values.select, 0.95) },
      draws: mean(values.draw),
      triangles: mean(values.tri),
      buffer: [renderer!.domElement.width, renderer!.domElement.height],
      gpu: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : null,
      memory: renderer!.info.memory,
      arena: arena.debug(),
    };
  },
};
Object.assign(window, { bench });
