import type * as THREE from "three";

/**
 * Finish every compiled shader program before Ready. On a program's first use three reads its
 * link log and its uniform and attribute tables with synchronous GL calls; `compileAsync` builds
 * the programs but leaves that to the frame a material is first drawn (the first enemy in view,
 * the first explosion). Doing it here moves those stalls into the loading screen.
 */
export function warmPrograms(renderer: THREE.WebGLRenderer): void {
  for (const program of renderer.info.programs ?? []) {
    program.getUniforms();
    program.getAttributes();
  }
}
