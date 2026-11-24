import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { biasLogDepth, DEPTH_PULL, LOG_BIAS, pullDepth } from "@/lib/fps/br/depth-bias";

const shader = () => ({
  uniforms: {} as Record<string, unknown>,
  vertexShader: "#include <common>\n#include <logdepthbuf_vertex>",
  fragmentShader: "",
});

describe("BR depth bias under logarithmic depth (render audit 2026-11-15)", () => {
  it("scales the logarithmic depth and leaves ordinary depth alone", () => {
    const m = biasLogDepth(new THREE.MeshStandardMaterial(), LOG_BIAS.tracker);
    const s = shader();
    m.onBeforeCompile(s as never, null as never);
    expect(s.vertexShader).toContain("#ifdef USE_LOGARITHMIC_DEPTH_BUFFER");
    expect(s.vertexShader).toContain(`vFragDepth *= ${(1 - LOG_BIAS.tracker).toFixed(7)};`);
    // After three's own chunk, which sets vFragDepth.
    expect(s.vertexShader.indexOf("vFragDepth *=")).toBeGreaterThan(
      s.vertexShader.indexOf("#include <logdepthbuf_vertex>"),
    );
  });

  it("keeps the material's own shader patch and program key", () => {
    const m = new THREE.MeshStandardMaterial();
    m.onBeforeCompile = (s) => {
      s.uniforms["uMine"] = { value: 1 };
    };
    m.customProgramCacheKey = () => "mine-v1";
    biasLogDepth(m, LOG_BIAS.water);
    const s = shader();
    m.onBeforeCompile(s as never, null as never);
    expect(s.uniforms["uMine"]).toBeDefined();
    expect(m.customProgramCacheKey()).toBe(`mine-v1|log-bias-${LOG_BIAS.water}`);
    // A biased and an unbiased copy of one material must not share a program.
    expect(new THREE.MeshStandardMaterial().customProgramCacheKey()).not.toBe(
      m.customProgramCacheKey(),
    );
  });

  it("pulls by centimetres at a kilometre, not more", () => {
    for (const b of Object.values(LOG_BIAS)) {
      expect(b * 1000).toBeLessThan(0.061);
      expect(b).toBeGreaterThan(0);
    }
  });
});
