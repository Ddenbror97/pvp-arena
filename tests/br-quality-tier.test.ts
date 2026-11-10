import { afterEach, describe, expect, it, vi } from "vitest";
import type * as THREE from "three";
import {
  chooseBrTier,
  LOW_CAP,
  PROBE_LOW_MS,
  recordBrSession,
  tierFromGpuName,
  STANDARD_CAP,
  tierPixelRatio,
} from "../src/lib/fps/br/quality-tier";
import {
  setTextureQuality,
  worldAnisotropy,
  worldTextureScale,
  worldTextureSize,
} from "../src/lib/fps/br/texture-quality";

const renderer = (max: number) =>
  ({ capabilities: { getMaxAnisotropy: () => max } }) as unknown as THREE.WebGLRenderer;
const now = Date.UTC(2026, 10, 9);
const base = { override: null, learnt: null, gpu: "", probeMs: null, now };

describe("BR hardware tier (2026-11-09: a 2015 laptop should play)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    setTextureQuality(renderer(16));
  });

  it("names integrated and old mobile GPUs low, modern ones standard", () => {
    for (const gpu of [
      "ANGLE (Intel, Intel(R) HD Graphics 520 Direct3D11 vs_5_0 ps_5_0, D3D11)",
      "ANGLE (Intel, Intel(R) UHD Graphics (0x000046A3) Direct3D11 vs_5_0 ps_5_0, D3D11)",
      "ANGLE (Intel, Intel(R) Iris(R) Plus Graphics 640 Direct3D11 vs_5_0 ps_5_0, D3D11)",
      "ANGLE (AMD, AMD Radeon(TM) R5 Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)",
      "ANGLE (AMD, AMD Radeon(TM) Vega 8 Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)",
      "ANGLE (NVIDIA, NVIDIA GeForce 940MX Direct3D11 vs_5_0 ps_5_0, D3D11)",
      "ANGLE (NVIDIA, NVIDIA GeForce GT 730 Direct3D11 vs_5_0 ps_5_0, D3D11)",
      "ANGLE (NVIDIA, NVIDIA GeForce MX150 Direct3D11 vs_5_0 ps_5_0, D3D11)",
      "Mali-G72",
      "Adreno (TM) 630",
      "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)",
    ])
      expect(tierFromGpuName(gpu), gpu).toBe("low");
    for (const gpu of [
      "ANGLE (NVIDIA, NVIDIA GeForce RTX 2050 (0x000025AD) Direct3D11 vs_5_0 ps_5_0, D3D11)",
      "ANGLE (NVIDIA, NVIDIA GeForce GTX 1060 6GB Direct3D11 vs_5_0 ps_5_0, D3D11)",
      "ANGLE (NVIDIA, NVIDIA GeForce GTX 970 Direct3D11 vs_5_0 ps_5_0, D3D11)",
      "ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)",
      "ANGLE (Intel, Intel(R) Arc(TM) A750 Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)",
      "ANGLE (Apple, Apple M1 Pro, OpenGL 4.1)",
    ])
      expect(tierFromGpuName(gpu), gpu).toBe("standard");
    // Names that say nothing are left to the probe.
    expect(tierFromGpuName("ANGLE (AMD, AMD Radeon(TM) Graphics Direct3D11)")).toBeNull();
    expect(tierFromGpuName("")).toBeNull();
  });

  it("decides by override, then a recent slow session, then the name, then the probe", () => {
    const hd = "Intel(R) HD Graphics 520",
      rtx = "NVIDIA GeForce RTX 2050";
    expect(chooseBrTier({ ...base, gpu: hd, override: "standard" })).toEqual({
      tier: "standard",
      reason: "override",
    });
    expect(chooseBrTier({ ...base, gpu: rtx, override: "low" }).tier).toBe("low");
    expect(chooseBrTier({ ...base, gpu: rtx, override: "ultra" }).reason).toBe("gpu name");
    // A slow standard session demotes a GPU the name does not vouch for, for two weeks; a GPU
    // known to be fast is never demoted (a slow session there was not the GPU).
    const learnt = { tier: "low" as const, at: now - 3 * 86_400_000 };
    const plain = "AMD Radeon(TM) Graphics";
    expect(chooseBrTier({ ...base, gpu: plain, learnt })).toEqual({
      tier: "low",
      reason: "slow last session",
    });
    expect(chooseBrTier({ ...base, gpu: rtx, learnt })).toEqual({
      tier: "standard",
      reason: "gpu name",
    });
    expect(
      chooseBrTier({ ...base, gpu: plain, learnt: { tier: "low", at: now - 15 * 86_400_000 } })
        .tier,
    ).toBe("standard");
    expect(chooseBrTier({ ...base, gpu: hd }).tier).toBe("low");
    // Unknown name: the fill-rate probe decides; nothing known at all: standard.
    const unknown = "AMD Radeon(TM) Graphics";
    expect(chooseBrTier({ ...base, gpu: unknown, probeMs: PROBE_LOW_MS + 1 }).tier).toBe("low");
    expect(chooseBrTier({ ...base, gpu: unknown, probeMs: PROBE_LOW_MS - 1 }).tier).toBe(
      "standard",
    );
    expect(chooseBrTier(base)).toEqual({ tier: "standard", reason: "default" });
  });

  it("draws 1080p in full on the standard tier and caps the low tier at 720p", () => {
    // A 1080p screen at 100 % and at 125 % Windows scaling: every device pixel.
    expect(tierPixelRatio("standard", 1920, 1080, 1, 1)).toBe(1);
    const scaled = tierPixelRatio("standard", 1536, 864, 1.25, 1);
    expect(scaled).toBe(1.25);
    // 1440p: about 1080p's worth of pixels; the budget's scale applies on top.
    const qhd = tierPixelRatio("standard", 2560, 1440, 1, 1);
    expect(2560 * 1440 * qhd * qhd).toBeCloseTo(STANDARD_CAP.pixels, -2);
    expect(tierPixelRatio("standard", 1920, 1080, 1, 0.8)).toBeCloseTo(0.8);
    const low = tierPixelRatio("low", 1920, 1080, 1.25, 1);
    expect(1920 * 1080 * low * low).toBeLessThanOrEqual(LOW_CAP.pixels + 1);
    // A small window is not scaled up, and the budget's scale still applies.
    expect(tierPixelRatio("low", 800, 450, 2, 1)).toBe(1);
    expect(tierPixelRatio("low", 800, 450, 2, 0.7)).toBeCloseTo(0.7);
  });

  it("halves world textures and limits anisotropy on the low tier only", () => {
    setTextureQuality(renderer(16));
    expect(worldTextureScale()).toBe(1);
    expect(worldAnisotropy()).toBe(16);
    expect(worldTextureSize(1024, 1024)).toEqual([1024, 1024]);
    setTextureQuality(renderer(16), "low");
    expect(worldAnisotropy()).toBe(4);
    expect(worldTextureSize(1024, 1024)).toEqual([512, 512]);
    expect(worldTextureSize(4096, 1264)).toEqual([2048, 632]);
    // Small textures stay: halving them saves little and blurs a lot.
    expect(worldTextureSize(256, 128)).toEqual([256, 128]);
  });

  it("remembers a standard session that sat at the budget's floor, and nothing else", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    });
    recordBrSession("standard", 5, 600); // a few slow seconds
    recordBrSession("standard", 40, 50); // too short a session to judge
    recordBrSession("low", 300, 600); // already low
    expect(store.size).toBe(0);
    recordBrSession("standard", 200, 600);
    expect(JSON.parse(store.get("br-tier-learnt-v2")!).tier).toBe("low");
  });
});
