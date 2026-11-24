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
