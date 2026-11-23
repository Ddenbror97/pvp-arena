import { afterEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { createSceneTarget, STEADY, steadyWanted } from "@/lib/fps/br/scene-target";

/**
 * The steadying pass (2026-11-23; owner: "blinking/flicker … in the airplane/parachute", "the
 * render should be like call of duty no matter of what distance or attitude"): each frame
 * blended with the last one, moved to where it now belongs, where the two disagree. No GPU
 * here: a renderer that records what it is asked to draw, and the pass's arithmetic redone in
 * doubles.
 */
type Drawn = { target: THREE.WebGLRenderTarget | null; material: THREE.ShaderMaterial };
function fakeRenderer(width = 320, height = 180) {
  const drawn: Drawn[] = [];
  let bound: THREE.WebGLRenderTarget | null = null;
  const size = { width, height };
  const renderer = {
    getDrawingBufferSize: (v: THREE.Vector2) => v.set(size.width, size.height),
    getRenderTarget: () => bound,
    setRenderTarget: (t: THREE.WebGLRenderTarget | null) => {
      bound = t;
    },
    render: (scene: THREE.Scene) =>
      drawn.push({
        target: bound,
        material: (scene.children[0] as THREE.Mesh).material as THREE.ShaderMaterial,
      }),
  };
  return { renderer: renderer as unknown as THREE.WebGLRenderer, drawn, size, bound: () => bound };
}
const eye = (x: number, y: number, z: number, lookX = 0, lookY = 0, lookZ = -1000) => {
  const camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.1, 14000);
  // As the renderer leaves it under a reversed depth buffer.
  (camera as unknown as { _reversedDepth: boolean })._reversedDepth = true;
  camera.updateProjectionMatrix();
  camera.position.set(x, y, z);
  camera.lookAt(lookX, lookY, lookZ);
  camera.updateMatrixWorld(true);
  return camera;
};

describe("the steadying pass", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("can be switched off by the player, and is on otherwise", () => {
    vi.stubGlobal("localStorage", { getItem: () => null });
    expect(steadyWanted()).toBe(true);
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => (k === "br-steady" ? "off" : null),
    });
    expect(steadyWanted()).toBe(false);
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
    });
    expect(steadyWanted()).toBe(true);
  });

  it("costs nothing until it is asked for: one pass a frame, no depth resolve, no buffers", () => {
    const { renderer, drawn, bound } = fakeRenderer();
    const target = createSceneTarget(renderer, 4);
    const scene = bound()!;
    expect(scene.samples).toBe(4);
    expect(scene.resolveDepthBuffer).toBe(false);
    for (let f = 0; f < 3; f++) target.present(0.4);
    expect(drawn.map((d) => d.material.name)).toEqual(["br-present", "br-present", "br-present"]);
    expect(drawn.every((d) => d.target === null)).toBe(true);
    expect(drawn[0]!.material.uniforms["tScene"]!.value).toBe(scene.texture);
    expect(scene.resolveDepthBuffer).toBe(false);
    expect(target.steadied()).toBe(false);
    // The scene target is bound again for the next frame.
    expect(bound()).toBe(scene);
    target.dispose();
  });

  it("starts over three frames: the depth resolve, a frame to remember, then the blend", () => {
    const { renderer, drawn, bound } = fakeRenderer();
    const target = createSceneTarget(renderer, 4);
    const scene = bound()!;
    const camera = eye(0, 400, 0);
    const steady = { camera, strength: STEADY.strength };
    // 1: its depth was not resolved (nobody had asked): shown as drawn, the resolve turned on.
    target.present(0.4, steady);
    expect(drawn.map((d) => d.material.name)).toEqual(["br-present"]);
    expect(scene.resolveDepthBuffer).toBe(true);
    expect(target.steadied()).toBe(false);
    // 2: nothing remembered yet: this frame goes into a history buffer unblended.
    drawn.length = 0;
    target.present(0.4, steady);
    expect(drawn.map((d) => d.material.name)).toEqual(["br-steady", "br-present"]);
    expect(drawn[0]!.material.uniforms["uStrength"]!.value).toBe(0);
    expect(target.steadied()).toBe(false);
    const first = drawn[0]!.target!;
    expect(first).not.toBe(scene);
    expect(first.texture.type).toBe(THREE.HalfFloatType);
    expect([first.width, first.height]).toEqual([320, 180]);
    // What is shown is what the pass wrote.
    expect(drawn[1]!.material.uniforms["tScene"]!.value).toBe(first.texture);
    // 3: blended with frame 2, written to the other buffer.
    drawn.length = 0;
    target.present(0.4, steady);
    const pass = drawn[0]!;
    expect(pass.material.uniforms["uStrength"]!.value).toBe(STEADY.strength);
    expect(pass.material.uniforms["tHistory"]!.value).toBe(first.texture);
    expect(pass.target).not.toBe(first);
    expect(drawn[1]!.material.uniforms["tScene"]!.value).toBe(pass.target!.texture);
    expect(target.steadied()).toBe(true);
    // 4: and back to the first.
    drawn.length = 0;
    target.present(0.4, steady);
    expect(drawn[0]!.target).toBe(first);
    expect(drawn[0]!.material.uniforms["tHistory"]!.value).toBe(pass.target!.texture);
    target.dispose();
  });

  it("stops at once when no longer asked for, forgets, and frees its buffers after a while", () => {
    const { renderer, drawn, bound } = fakeRenderer();
    const target = createSceneTarget(renderer, 4);
    const scene = bound()!;
    const steady = { camera: eye(0, 400, 0), strength: STEADY.strength };
    for (let f = 0; f < 4; f++) target.present(0, steady);
    const buffers = new Set(
      drawn.filter((d) => d.material.name === "br-steady").map((d) => d.target!),
    );
    expect(buffers.size).toBe(2);
    let freed = 0;
    for (const b of buffers) b.addEventListener("dispose", () => freed++);
    // Landed: this frame as drawn, the resolve off for the next.
    drawn.length = 0;
    target.present(0, null);
    expect(drawn.map((d) => d.material.name)).toEqual(["br-present"]);
    expect(drawn[0]!.material.uniforms["tScene"]!.value).toBe(scene.texture);
    expect(scene.resolveDepthBuffer).toBe(false);
    expect(target.steadied()).toBe(false);
    // Asked again soon: the buffers are still there, but what they hold is not the last frame.
    target.present(0, steady); // (the resolve again)
    drawn.length = 0;
    target.present(0, steady);
    expect(drawn[0]!.material.uniforms["uStrength"]!.value).toBe(0);
    expect(freed).toBe(0);
    // Not asked for ten seconds: freed.
    for (let f = 0; f <= STEADY.idleFrames; f++) target.present(0, null);
    expect(freed).toBe(2);
    // A strength of nothing is not asking.
    drawn.length = 0;
    target.present(0, { camera: steady.camera, strength: 0 });
    expect(drawn.map((d) => d.material.name)).toEqual(["br-present"]);
    expect(scene.resolveDepthBuffer).toBe(false);
    target.dispose();
  });

  it("carries nothing across a change of size", () => {
    const { renderer, drawn, size } = fakeRenderer();
    const target = createSceneTarget(renderer, 4);
    const steady = { camera: eye(0, 400, 0), strength: STEADY.strength };
    for (let f = 0; f < 3; f++) target.present(0, steady);
    expect(target.steadied()).toBe(true);
    size.width = 640;
    size.height = 360;
    target.resize();
    drawn.length = 0;
    target.present(0, steady);
    expect(drawn[0]!.material.uniforms["uStrength"]!.value).toBe(0);
    expect([drawn[0]!.target!.width, drawn[0]!.target!.height]).toEqual([640, 360]);
    expect(drawn[0]!.material.uniforms["uTexel"]!.value.x).toBeCloseTo(1 / 640);
    target.dispose();
  });

  it("needs no resolve on a target without samples: its depth is drawn into the texture", () => {
    const { renderer, drawn } = fakeRenderer();
    const target = createSceneTarget(renderer, 0);
    const steady = { camera: eye(0, 400, 0), strength: STEADY.strength };
    target.present(0, steady);
    expect(drawn.map((d) => d.material.name)).toEqual(["br-steady", "br-present"]);
    target.present(0, steady);
    expect(target.steadied()).toBe(true);
    target.dispose();
  });

  it("finds where a point of the island was on the screen a frame ago", () => {
    const { renderer, drawn } = fakeRenderer();
    const target = createSceneTarget(renderer, 4);
    // The plane: 3.7 m a frame, 800 m up, kilometres from the origin, turning a little.
    const before = eye(5200.3, 800, -3100.7, 5000, 0, -4000);
    const now = eye(5200.3, 800, -3104.4, 5003, 0, -4000);
    target.present(0, { camera: before, strength: 1 });
    target.present(0, { camera: before, strength: 1 });
    drawn.length = 0;
    target.present(0, { camera: now, strength: 1 });
    const u = drawn[0]!.material.uniforms;
    const lens = u["uLens"]!.value as THREE.Vector4;
    const reproject = (u["uReproject"]!.value as THREE.Matrix4).clone();
    // (As the GPU has it: single precision.)
    reproject.fromArray(Array.from(new Float32Array(reproject.elements)));
    for (const world of [
      new THREE.Vector3(5000, 12, -4000), // a roof in the town ahead
      new THREE.Vector3(5150, 30, -3600), // a hill nearer by
      new THREE.Vector3(4000, 0, -9000), // the far shore
    ]) {
      // What the pass has for this pixel: where it is on the screen, and its depth.
      const clip = new THREE.Vector4(world.x, world.y, world.z, 1)
        .applyMatrix4(now.matrixWorldInverse)
        .applyMatrix4(now.projectionMatrix);
      const ndc = new THREE.Vector2(clip.x / clip.w, clip.y / clip.w);
      const depth = Math.fround(clip.z / clip.w); // reversed: near 1, far 0
      expect(depth).toBeGreaterThan(0);
      expect(depth).toBeLessThan(0.01);
      // The shader's arithmetic.
      const dist = (lens.z * lens.w) / (depth * (lens.w - lens.z) + lens.z);
      expect(dist / clip.w).toBeCloseTo(1, 4);
      const was = new THREE.Vector4(
        ndc.x * lens.x * dist,
        ndc.y * lens.y * dist,
        -dist,
        1,
      ).applyMatrix4(reproject);
      // Against the truth: the point through the previous camera.
      const truth = new THREE.Vector4(world.x, world.y, world.z, 1)
        .applyMatrix4(before.matrixWorldInverse)
        .applyMatrix4(before.projectionMatrix);
      // Within a twentieth of a pixel at 1080p, and its distance from that camera for the
      // surface test.
      expect(Math.abs(was.x / was.w - truth.x / truth.w) * 960).toBeLessThan(0.05);
      expect(Math.abs(was.y / was.w - truth.y / truth.w) * 540).toBeLessThan(0.05);
      expect(was.w / truth.w).toBeCloseTo(1, 3);
      // And it did move on the screen: the camera did.
      expect(
        Math.hypot((ndc.x - was.x / was.w) * 960, (ndc.y - was.y / was.w) * 540),
      ).toBeGreaterThan(0.3);
    }
    target.dispose();
  });

  it("blends only what jumped, only far off, and only the same surface", () => {
    const { renderer, drawn } = fakeRenderer();
    const target = createSceneTarget(renderer, 4);
    const steady = { camera: eye(0, 400, 0), strength: STEADY.strength };
    target.present(0, steady);
    target.present(0, steady);
    const fragment = drawn.find((d) => d.material.name === "br-steady")!.material.fragmentShader;
    // A pixel that kept its colour is shown as drawn: the picture stays sharp.
    expect(STEADY.from).toBeLessThan(STEADY.to);
    expect(STEADY.to).toBeLessThanOrEqual(0.1);
    expect(fragment).toContain(`#define STEADY_FROM ${STEADY.from.toFixed(3)}`);
    expect(fragment).toContain("smoothstep(STEADY_FROM, STEADY_TO,");
    // Nothing near the camera: the aircraft you sit in, your canopy, yourself.
    expect(STEADY.near).toBeGreaterThanOrEqual(60);
    expect(STEADY.far).toBeGreaterThan(STEADY.near);
    expect(fragment).toContain("smoothstep(STEADY_NEAR, STEADY_FAR, dist)");
    // The last frame counts only where it showed a surface about as far away.
    expect(fragment).toContain("STEADY_DEPTH * was.w");
    // Clamped to the colours round the pixel now, and each frame keeps its distances.
    expect(fragment).toContain("clamp(squash(before(uv)), lo, hi)");
    expect(fragment).toContain("gl_FragColor = vec4(swell(c), dist);");
    // Most of the old frame where it applies, never all of it.
    expect(STEADY.strength).toBeGreaterThan(0.7);
    expect(STEADY.strength).toBeLessThan(0.95);
    target.dispose();
  });
});
