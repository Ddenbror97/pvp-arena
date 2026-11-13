import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { DROP } from "@/lib/fps/br/drop";
import { createWater, SHORE_FOAM_FULL_M, SHORE_FOAM_GONE_M } from "@/lib/fps/br/water";
import type { WorldMeta } from "@/lib/fps/br/world";

/**
 * The water's look (owner, 2026-11-12: sun glitter, shore foam, clear turquoise shallows with
 * caustics, the same on sea, rivers and lakes) within its budget: one opaque draw call, no
 * extra texture or pass, the ground's height read once per pixel.
 */
const meta = {
  waterBodies: [{ id: "lake-1", level: 12, bounds: [0, 0, 100, 100] }],
} as unknown as WorldMeta;
const ground = { texture: new THREE.Texture(), spacing: 3.90625, grid: 2560, offset: 100 };

function compiled() {
  const water = createWater(meta, new THREE.Texture(), ground);
  const meshes: THREE.Mesh[] = [];
  water.root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh);
  });
  const material = meshes[0]!.material as THREE.MeshStandardMaterial;
  const shader = {
    uniforms: {} as Record<string, { value: unknown }>,
    vertexShader: THREE.ShaderLib.physical.vertexShader,
    fragmentShader: THREE.ShaderLib.physical.fragmentShader,
  };
  material.onBeforeCompile(shader as never, null as never);
  return { meshes, material, shader };
}

describe("battle royale water", () => {
  it("stays one opaque draw call for the sea and every lake", () => {
    const { meshes, material } = compiled();
    expect(meshes).toHaveLength(1);
    expect(material.transparent).toBe(false);
    expect(meshes[0]!.castShadow).toBe(false);
    // The sea's quad and the lake's, in one geometry.
    expect(meshes[0]!.geometry.getIndex()!.count).toBe(12);
  });

  it("adds glitter, foam and caustics without a texture or a second height read", () => {
    const { shader, material } = compiled();
    const f = shader.fragmentShader;
    // Every hook took (a three.js upgrade that renames a chunk would drop one silently).
    for (const mark of ["path of glitter", "laps in and out", "caustics", "wDepth = vWaterY"])
      expect(f, mark).toContain(mark);
    expect(shader.uniforms["uSunDir"]).toBeDefined();
    // Only the two maps it always had (the lakes' mask and the ground's height): the sky it
    // mirrors is sun.ts's function of a direction, colours and a clock.
    expect(Object.keys(shader.uniforms).sort()).toEqual(
      [
        "uCoverB",
        "uGround",
        "uHaze",
        "uSkyTime",
        "uSunDir",
        "uSunGlow",
        "uTime",
        "uUpper",
        "uWarmHaze",
        "uZenith",
      ].sort(),
    );
    expect(f.match(/sampler2D|usampler2D/g)!.length).toBeLessThanOrEqual(
      THREE.ShaderLib.physical.fragmentShader.match(/sampler2D/g)!.length + 3,
    );
    // It mirrors the sky in each wave's own direction, the sun by the waves' slopes, and the
    // waves are travelling trains worked out from sines.
    for (const mark of ["brSky(mirror)", "halfV", "wTrain(wp"]) expect(f, mark).toContain(mark);
    // The ground's height (four texel fetches) is read once per pixel.
    expect(f.match(/groundAt\(vMapUv\)/g)).toHaveLength(1);
    // The costly parts sit behind branches only the pixels that show them take.
    expect(f).toMatch(/if \(lobe > 0\.004\)/);
    expect(f).toMatch(/if \(see > 0\.0\)/);
    expect(f).toMatch(/if \(waterDepth < 1\.1 && shoreNear > 0\.0\)/);
    expect(material.customProgramCacheKey()).toBe("br-water-v7-depth");
  });

  // Owner, 2026-11-13: "in the parachute ... the edges of the water rivers is too white, looks
  // like white lines". The bank's foam and pale wash are a pixel or two wide from the air, so
  // they are drawn near the camera only: full on foot, gone long before the drop's height.
  it("draws the bank's foam and wash near the camera only", () => {
    const f = compiled().shader.fragmentShader;
    expect(f).toContain(
      `float shoreNear = 1.0 - smoothstep(${SHORE_FOAM_FULL_M.toFixed(1)}, ${SHORE_FOAM_GONE_M.toFixed(1)}, wDist);`,
    );
    expect(f).toMatch(/foam \* shoreNear/);
    expect(SHORE_FOAM_FULL_M).toBeGreaterThanOrEqual(30);
    expect(SHORE_FOAM_GONE_M).toBeLessThanOrEqual(200);
    // The drop starts at the plane's 800 m, under the canopy all the way down.
    expect(SHORE_FOAM_GONE_M).toBeLessThan(DROP.planeAltitude / 4);
  });
});
