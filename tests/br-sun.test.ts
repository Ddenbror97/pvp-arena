import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { createAtmosphere } from "@/lib/fps/br/atmosphere";
import { BR_SUN, SKY_GLSL, skyUniforms, sunLook } from "@/lib/fps/br/sun";
import { createWater } from "@/lib/fps/br/water";
import { WAVES_LOOP_S, WAVES_SWELL_AT_S, WAVES_SWELL_S } from "@/lib/fps/br/water-clock";
import type { WorldMeta } from "@/lib/fps/br/world";

/**
 * One sun for the light, the sky and the water (owner, 2026-11-12: "Upgrade the sun and the
 * water reflection for the battle royale. ensure keep GPU/FPS optimizated").
 */
describe("Project Island's sun", () => {
  it("stands where the island's light always came from, with the light it always had", () => {
    const sun = sunLook();
    const was = new THREE.Vector3(-0.55, 0.62, 0.45).normalize();
    expect(sun.direction.angleTo(was)).toBeLessThan(0.002);
    const old = new THREE.Color(0xfff0d8);
    expect(Math.abs(sun.light.r - old.r)).toBeLessThan(0.03);
    expect(Math.abs(sun.light.g - old.g)).toBeLessThan(0.03);
    expect(Math.abs(sun.light.b - old.b)).toBeLessThan(0.03);
    expect(sun.intensity).toBeCloseTo(2.4, 1);
    expect(BR_SUN.elevation).toBeGreaterThan(30);
  });

  it("is warmer and weaker low in the sky, whiter and stronger high", () => {
    const low = sunLook(BR_SUN.azimuth, 6),
      high = sunLook(BR_SUN.azimuth, 70);
    expect(low.light.b / low.light.r).toBeLessThan((high.light.b / high.light.r) * 0.6);
    expect(low.glow.g / low.glow.r).toBeLessThan(high.glow.g / high.glow.r);
    expect(low.intensity).toBeLessThan(high.intensity * 0.6);
    // The bearing and the height are what was asked for.
    expect(low.direction.y).toBeCloseTo(Math.sin((6 * Math.PI) / 180), 6);
    expect(Math.atan2(low.direction.x, low.direction.z)).toBeCloseTo(
      (BR_SUN.azimuth * Math.PI) / 180,
      6,
    );
  });

  it("gives the sky and the water the same sky: one function, the same uniforms, no texture", () => {
    const sky = createAtmosphere();
    const skyMesh = sky.root.children.find((o) => o.name === "br-sky") as THREE.Mesh;
    const skyMaterial = skyMesh.material as THREE.ShaderMaterial;
    expect(skyMaterial.fragmentShader).toContain(SKY_GLSL);
    for (const part of ["brSky(d)", "brSunGlare(d)", "brSunDisc(d)", "brCloudCover("])
      expect(skyMaterial.fragmentShader).toContain(part);
    expect(skyMaterial.fragmentShader).not.toMatch(/sampler2D|texture\(/);
    const water = createWater(
      { waterBodies: [] } as unknown as WorldMeta,
      new THREE.Texture(),
      null,
    );
    const material = (water.root.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial;
    const shader = {
      uniforms: {} as Record<string, { value: unknown }>,
      vertexShader: THREE.ShaderLib.physical.vertexShader,
      fragmentShader: THREE.ShaderLib.physical.fragmentShader,
    };
    material.onBeforeCompile(shader as never, null as never);
    expect(shader.fragmentShader).toContain(SKY_GLSL);
    for (const name of Object.keys(skyUniforms())) {
      expect(shader.uniforms[name], name).toBeDefined();
      expect(skyMaterial.uniforms[name], name).toBeDefined();
    }
    // The clouds' clock is one object: their image on the water is where they are in the sky.
    expect(shader.uniforms["uSkyTime"]).toBe(skyMaterial.uniforms["uSkyTime"]);
    // The mirror is worked out before tone mapping (the sun's image is brighter than white).
    const f = shader.fragmentShader;
    expect(f.indexOf("brSky(mirror)")).toBeLessThan(f.indexOf("#include <tonemapping_fragment>"));
    expect(f.indexOf("brSky(mirror)")).toBeGreaterThan(0);
    sky.dispose();
    water.dispose();
  });

  it("runs the wash on the shore on the waves' sound: a wave every 8 s, two a loop", () => {
    expect(WAVES_LOOP_S / WAVES_SWELL_S).toBe(2);
    expect(WAVES_SWELL_AT_S).toBeLessThan(WAVES_SWELL_S);
    const water = createWater({ waterBodies: [] } as unknown as WorldMeta, new THREE.Texture());
    const material = (water.root.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial;
    const shader = {
      uniforms: {},
      vertexShader: THREE.ShaderLib.physical.vertexShader,
      fragmentShader: THREE.ShaderLib.physical.fragmentShader,
    };
    material.onBeforeCompile(shader as never, null as never);
    expect(shader.fragmentShader).toContain(
      `cos(6.2832 * (uTime - ${WAVES_SWELL_AT_S.toFixed(1)}) / ${WAVES_SWELL_S.toFixed(1)}`,
    );
  });
});
