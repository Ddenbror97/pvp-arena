import type * as THREE from "three";

/**
 * WebGL context-loss recovery for the battle royale (PLAN §10): when the browser drops the GPU
 * context (driver reset, tab in the background on mobile, GPU process crash), rendering pauses
 * while the simulation keeps running; when the context comes back, three.js rebuilds its GPU
 * state and every texture, buffer and program is uploaded again from the CPU copies the scene
 * still holds (heights, land cover, instance lists, decoded model data), then the shaders are
 * compiled before rendering resumes, so the first frames do not hitch.
 *
 * Renderer-side only (fairness boundary): a context loss never touches the simulation.
 */
export type ContextWatch = {
  /** True while the context is lost: skip rendering, keep simulating. */
  readonly lost: boolean;
  /** Number of losses recovered since start (for the dev overlay and telemetry). */
  readonly recoveries: number;
  dispose(): void;
};

export function watchContextLoss(
  renderer: THREE.WebGLRenderer,
  hooks: {
    scene?: THREE.Scene;
    camera?: THREE.Camera;
    onLost?: () => void;
    onRestored?: () => void;
  } = {},
): ContextWatch {
  const canvas = renderer.domElement;
  const state = { lost: false, recoveries: 0 };
  const lost = (e: Event) => {
    // Without preventDefault the browser never offers the context back.
    e.preventDefault();
    state.lost = true;
    hooks.onLost?.();
  };
  const restored = () => {
    // three.js re-initialises its GL state on this event (its own listener); our objects keep
    // their CPU data, so marking them is enough for the next render to re-upload them.
    hooks.scene?.traverse((o) => {
      const mesh = o as THREE.Mesh;
      const materials = mesh.material
        ? Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material]
        : [];
      for (const m of materials) m.needsUpdate = true;
    });
    const resume = () => {
      state.lost = false;
      state.recoveries++;
      hooks.onRestored?.();
    };
    if (hooks.scene && hooks.camera)
      renderer.compileAsync(hooks.scene, hooks.camera).then(resume, resume);
    else resume();
  };
  canvas.addEventListener("webglcontextlost", lost);
  canvas.addEventListener("webglcontextrestored", restored);
  return {
    get lost() {
      return state.lost;
    },
    get recoveries() {
      return state.recoveries;
    },
    dispose() {
      canvas.removeEventListener("webglcontextlost", lost);
      canvas.removeEventListener("webglcontextrestored", restored);
    },
  };
}
