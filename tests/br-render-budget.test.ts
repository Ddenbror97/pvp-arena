import { describe, expect, it } from "vitest";
import { BrRenderBudget, BUDGET_MIN } from "@/lib/fps/br/render-budget";
import { brResolutionScale } from "@/lib/fps/br/br-settings";

/**
 * The BR's adaptive resolution (production performance audit 2026-11-24): lower only when the
 * GPU is the bottleneck, back up as soon as it has room, never see-saw, and safe where the
 * browser cannot time the GPU (Safari).
 *
 * A frame here is a pipelined CPU and GPU: its interval is the slower of the two, and the GPU's
 * time grows with the pixels drawn (the resolution squared) over a part that does not.
 */
type Load = { cpu: number; gpuFull: number; fixed?: number };
const gpuAt = (load: Load, scale: number) => {
  const r = brResolutionScale(scale);
  const fixed = load.fixed ?? 0.25;
  // The ground's lite shading below scale 1 saves a further 10 % of the pixel work.
  return load.gpuFull * (fixed + (1 - fixed) * r * r * (scale < 1 ? 0.9 : 1));
};
function run(
  b: BrRenderBudget,
  load: Load | ((t: number) => Load),
  seconds: number,
  timers = true,
  t0 = 0,
) {
  const scales: number[] = [];
  let changes = 0;
  for (let t = 0; t < seconds * 1000;) {
    const l = typeof load === "function" ? load(t0 + t) : load;
    const gpu = gpuAt(l, b.scale);
    const ms = Math.max(l.cpu, gpu, 1000 / 144);
    if (b.update(ms, timers ? gpu : null)) changes++;
    scales.push(b.scale);
    t += ms;
  }
  return { scales, changes, final: b.scale };
}
const budget = () => new BrRenderBudget({ resolution: brResolutionScale });

describe("BR adaptive resolution", () => {
  it("keeps full resolution when the CPU is the bottleneck (Intel UHD at low: 22 ms of script)", () => {
    const b = budget();
    const r = run(b, { cpu: 22, gpuFull: 14 }, 120);
    expect(r.final).toBe(1);
    expect(r.changes).toBe(0);
  });

  it("lowers it when the GPU is the bottleneck, to where it holds", () => {
    const b = budget();
    const r = run(b, { cpu: 9, gpuFull: 30 }, 60);
    expect(r.final).toBeLessThan(1);
    // Settled: no step in the last 30 s.
    const last = r.scales.slice(-Math.floor(r.scales.length / 2));
    expect(new Set(last).size).toBe(1);
    expect(gpuAt({ cpu: 9, gpuFull: 30 }, r.final)).toBeLessThanOrEqual(18.5 / 0.8 + 1);
  });

  it("a CPU spike in a GPU-light scene never lowers it (RTX: 25-34 ms of script for 30 s)", () => {
    const b = budget();
    const r = run(b, (t) => ({ cpu: t > 10_000 && t < 40_000 ? 30 : 7, gpuFull: 6 }), 90);
    expect(r.changes).toBe(0);
    expect(r.final).toBe(1);
  });

  it("comes back up within seconds once the GPU has room (forest → field)", () => {
    const b = budget();
    run(b, { cpu: 9, gpuFull: 34 }, 60);
    const low = b.scale;
    expect(low).toBeLessThan(0.9);
    // The lighter scene: back to full within ~20 s.
    const r = run(b, { cpu: 9, gpuFull: 7 }, 20);
    expect(r.final).toBe(1);
    expect(low).toBeLessThan(r.final);
  });

  it("does not see-saw at the boundary between two steps (10 minutes)", () => {
    for (const gpuFull of [19, 21, 23, 25, 27, 29, 31]) {
      const b = budget();
      run(b, { cpu: 9, gpuFull }, 30);
      const r = run(b, { cpu: 9, gpuFull }, 600);
      // At most one settling step after the first 30 s, never a cycle.
      expect(r.changes, `gpuFull ${gpuFull}`).toBeLessThanOrEqual(1);
    }
  });

  it("ignores isolated stalls (loading, shader compiles)", () => {
    const b = budget();
    let n = 0;
    for (let t = 0; t < 60_000; n++) {
      const ms = n % 40 === 0 ? 90 : 7;
      b.update(ms, ms > 40 ? 30 : 4);
      t += ms;
    }
    expect(b.scale).toBe(1);
  });

  describe("without GPU timer queries (Safari)", () => {
    it("undoes a step that did not help, and holds before trying again", () => {
      const b = budget();
      const r = run(b, { cpu: 25, gpuFull: 10 }, 300, false);
      // Most of the time at full resolution: each trial is 3 s, then a hold of 1, 2, 4 … min.
      const full = r.scales.filter((s) => s === 1).length / r.scales.length;
      expect(full).toBeGreaterThan(0.95);
      expect(r.final).toBe(1);
      expect(Math.min(...r.scales)).toBeGreaterThanOrEqual(0.9);
    });

    it("still lowers it when the GPU is the bottleneck, and keeps it there", () => {
      const b = budget();
      const r = run(b, { cpu: 8, gpuFull: 30, fixed: 0.1 }, 120, false);
      expect(r.final).toBeLessThan(1);
      expect(r.final).toBeGreaterThanOrEqual(BUDGET_MIN);
      const last = r.scales.slice(-Math.floor(r.scales.length / 3));
      expect(Math.max(...last) - Math.min(...last)).toBeLessThanOrEqual(0.1 + 1e-9);
    });

    it("comes back up after fast frames, as before", () => {
      const b = budget();
      run(b, { cpu: 8, gpuFull: 30, fixed: 0.1 }, 60, false);
      expect(b.scale).toBeLessThan(1);
      const r = run(b, { cpu: 6, gpuFull: 5 }, 120, false);
      expect(r.final).toBe(1);
    });
  });
});

describe("BrRenderBudget on the low tier (slowMs 30)", () => {
  it("keeps full resolution at 40–55 fps even when the GPU is most of the frame", () => {
    const b = new BrRenderBudget({ resolution: (s) => Math.min(1, s + 0.1), slowMs: 30 });
    for (let i = 0; i < 60 * 60; i++) {
      const ms = 20 + (i % 7); // 38–50 fps
      b.update(ms, ms * 0.9);
    }
    expect(b.scale).toBe(1);
  });
  it("still steps down when frames fall under 30 fps on the GPU", () => {
    const b = new BrRenderBudget({ resolution: (s) => Math.min(1, s + 0.1), slowMs: 30 });
    for (let i = 0; i < 30 * 10; i++) b.update(36, 34);
    expect(b.scale).toBeLessThan(1);
  });
});

/**
 * Intel UHD on the low tier as measured on the owner's laptop (release audit 2026-11-24): a
 * 144 Hz panel shows frames in whole refreshes (6.9 ms), and the GPU's time hardly follows the
 * pixels (a Downtown fight: 0.8 of the pixels, 17.7 → 16.5 ms). Before, the budget stepped
 * 1280 → 1152 → 1024 and back every few seconds for 1–3 fps.
 */
describe("BrRenderBudget on the low tier, on a 144 Hz panel (Intel UHD)", () => {
  const REFRESH = 1000 / 144;
  // As br-arena.ts makes the low tier's.
  const lowBudget = () =>
    new BrRenderBudget({ resolution: brResolutionScale, slowMs: 30, probe: true });
  /**
   * `seconds` of frames: GPU time `gpuFull` at full resolution, `pixels` of it the pixels', and
   * `cpu` ms of the frame that the GPU's work does not overlap (as measured: 37 fps, 27.8 ms
   * frames, with 17.7 ms of GPU and 9–10 ms of script); every 9th frame 9 ms longer.
   */
  function play(
    b: BrRenderBudget,
    gpuFull: number,
    pixels: number,
    seconds: number,
    cpu = 5,
    pipelined = false,
  ) {
    let changes = 0,
      n = 0;
    const scales: number[] = [];
    for (let t = 0; t < seconds * 1000; n++) {
      const r = brResolutionScale(b.scale);
      const gpu = gpuFull * (1 - pixels + pixels * r * r) + (n % 9 === 0 ? 9 : 0);
      // (Pipelined: the script and the GPU overlap, the frame is the slower of the two.)
      const ms = Math.ceil((pipelined ? Math.max(cpu, gpu) : cpu + gpu) / REFRESH) * REFRESH;
      if (b.update(ms, gpu)) changes++;
      scales.push(b.scale);
      t += ms;
    }
    return { changes, scales, final: b.scale };
  }
  it("keeps 720p when a lower resolution buys next to nothing (a Downtown fight)", () => {
    const b = lowBudget();
    const r = play(b, 17.7, 0.2, 600);
    const full = r.scales.filter((s) => brResolutionScale(s) === 1).length / r.scales.length;
    expect(full).toBeGreaterThan(0.95);
    expect(r.changes).toBeLessThanOrEqual(12);
  });
  it("does not see-saw where a step helps a little (the forest, the ruins)", () => {
    for (const pipelined of [false, true])
      for (const gpuFull of [19, 20.5, 22]) {
        const b = lowBudget();
        play(b, gpuFull, 0.5, 60, pipelined ? 9 : 5, pipelined);
        const r = play(b, gpuFull, 0.5, 600, pipelined ? 9 : 5, pipelined);
        expect(r.changes, `gpuFull ${gpuFull}, pipelined ${pipelined}`).toBeLessThanOrEqual(12);
      }
  });
  it("lowered in the forest, it comes back to 720p in a Downtown fight after it", () => {
    const b = lowBudget();
    // The forest: half of the GPU's time is the pixels', frames under 30 fps at 720p.
    play(b, 30, 0.5, 90, 9, true);
    expect(brResolutionScale(b.scale)).toBeLessThan(1);
    // A fight: 17.7 ms of GPU at 720p, a fifth of it the pixels'.
    const r = play(b, 17.7, 0.2, 300, 9, true);
    const last = r.scales.slice(-Math.floor(r.scales.length / 3));
    expect(last.filter((s) => brResolutionScale(s) === 1).length / last.length).toBeGreaterThan(
      0.9,
    );
  });
  it("still lowers it, and keeps it lower, when the pixels are the cost and frames are under 30 fps", () => {
    const b = lowBudget();
    play(b, 40, 0.9, 60);
    expect(brResolutionScale(b.scale)).toBeLessThan(1);
    // Ten minutes on: lower all but the probes' few seconds, which come further and further apart.
    const settled = b.scale;
    const r = play(b, 40, 0.9, 600);
    expect(r.scales.filter((s) => s <= settled + 1e-6).length / r.scales.length).toBeGreaterThan(
      0.95,
    );
    expect(r.changes).toBeLessThanOrEqual(10);
  });
});

describe("BrRenderBudget learns how much of the GPU's time the pixels are", () => {
  it("measures it on a resolution step, and comes back up by it where the GPU hardly follows the pixels", () => {
    const b = new BrRenderBudget({ resolution: brResolutionScale, slowMs: 30 });
    const frames = (seconds: number, ms: number, gpu: number) => {
      for (let t = 0; t < seconds * 1000; t += ms) b.update(ms, gpu);
    };
    // Under 30 fps on the GPU: one step (no resolution), then a resolution step, judged.
    frames(1.6, 36, 34);
    frames(1.6, 36, 34);
    expect(brResolutionScale(b.scale)).toBeCloseTo(0.9);
    // At 0.9 of the size the GPU takes 32.4 ms: a quarter of its time is the pixels'.
    frames(3.2, 30, 34 * (0.75 + 0.25 * 0.81));
    expect(b.pixelShare).toBeGreaterThan(0.2);
    expect(b.pixelShare).toBeLessThan(0.3);
    expect(brResolutionScale(b.scale)).toBeCloseTo(0.9);
    // A lighter place: 16 ms of GPU at 0.9. Every pixel's cost would predict 22.7 ms at full
    // size (over the low tier's 21); a quarter, 19.5. Back to full within 30 s.
    frames(30, 20, 16);
    expect(brResolutionScale(b.scale)).toBe(1);
  });
});
