import { readFileSync } from "node:fs";
import * as THREE from "three";
import { beforeAll, describe, expect, it } from "vitest";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { CELL_SIZE, CELLS, cellTrees, TREE_STRIDE, vegetationWorld } from "@/lib/fps/br/vegetation";
import { createVegetation, VEGETATION_VIEW } from "@/lib/fps/br/vegetation-renderer";
import { WORLD_HALF, type WorldMeta } from "@/lib/fps/br/world";

const buffer = (path: string) => {
  const f = readFileSync(path);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};

let world: ReturnType<typeof vegetationWorld>;
beforeAll(async () => {
  const hf = await decodeHeightfield(buffer("public/fps/br/height.v1.hf"));
  const cover = await decodeLandCover(buffer("public/fps/br/landcover.v1.lc"));
  const meta = JSON.parse(readFileSync("public/fps/br/world.v1.json", "utf8")) as WorldMeta;
  world = vegetationWorld(hf, cover, meta);
});

/** Tree positions an instanced batch draws (x, z), with the far ring's cull (as its shader). */
function drawn(mesh: THREE.Mesh) {
  const g = mesh.geometry as THREE.InstancedBufferGeometry;
  const a = g.getAttribute("aTreeA").array as Float32Array;
  const cull = (mesh.material as THREE.Material).userData["treeCull"] as
    { centre: { value: THREE.Vector3 }; radius: { value: number } } | undefined;
  const out: string[] = [];
  for (let i = 0; i < g.instanceCount; i++) {
    const x = a[i * 4]!,
      z = a[i * 4 + 2]!;
    if (cull && Math.hypot(x - cull.centre.value.x, z - cull.centre.value.z) < cull.radius.value)
      continue;
    out.push(`${x.toFixed(2)},${z.toFixed(2)}`);
  }
  return out;
}

describe("tree rings (near models and far impostors)", () => {
  it("draws every tree in view while running, by exactly one ring (no gap or overlap at the seam)", () => {
    // The densest forest cell away from the map edge.
    let best = [0, 0, 0];
    for (let cj = 8; cj < CELLS - 8; cj += 3)
      for (let ci = 8; ci < CELLS - 8; ci += 3) {
        const n = cellTrees(world, ci, cj).length / TREE_STRIDE;
        if (n > best[0]!) best = [n, ci, cj];
      }
    const cx = (best[1]! + 0.5) * CELL_SIZE - WORLD_HALF,
      cz = (best[2]! + 0.5) * CELL_SIZE - WORLD_HALF;
    const veg = createVegetation(world, null);
    const camera = new THREE.PerspectiveCamera(80, 16 / 9, 0.1, 14000);
    const cam = new THREE.Vector3();
    let missing = 0,
      twice = 0,
      checked = 0;
    // Run east at 5 m/s, one frame every 33 ms (0.165 m per frame), for 40 m.
    for (let step = 0; step < 240; step++) {
      const x = cx - 20 + step * 0.165;
      camera.position.set(x, world.hf.heightAt(x, cz) + 1.7, cz);
      camera.lookAt(x + 100, camera.position.y, cz);
      camera.updateMatrixWorld();
      veg.update(camera);
      cam.copy(camera.position);
      // Each tree once per ring (a near model may be several batches, one per material).
      const near = new Set<string>(),
        far = new Set<string>();
      for (const o of veg.root.children) {
        const mesh = o as THREE.Mesh;
        for (const k of drawn(mesh)) (mesh.name.endsWith("-far") ? far : near).add(k);
      }
      for (const k of near) if (far.has(k)) twice++;
      // Every tree ahead within 120 m must be drawn.
      for (let cj = best[2]! - 1; cj <= best[2]! + 1; cj++)
        for (let ci = best[1]! - 1; ci <= best[1]! + 1; ci++) {
          const t = cellTrees(world, ci, cj);
          for (let k = 0; k < t.length; k += TREE_STRIDE) {
            const dx = t[k]! - cam.x,
              dz = t[k + 2]! - cam.z;
            const d = Math.hypot(dx, dz);
            if (d > 120 || dx < d * 0.5) continue;
            checked++;
            const key = `${t[k]!.toFixed(2)},${t[k + 2]!.toFixed(2)}`;
            if (!near.has(key) && !far.has(key)) missing++;
            // Real models stay within reach of the camera.
            if (
              near.has(key) &&
              d > VEGETATION_VIEW.nearDistance + 2 * VEGETATION_VIEW.nearRebuild + 1
            )
              missing++;
          }
        }
    }
    veg.dispose();
    expect(checked).toBeGreaterThan(1000);
    expect(missing).toBe(0);
    expect(twice).toBe(0);
  });

  it("draws every tree it selected after the view grows (three.js caps a geometry at its first size)", () => {
    // Owner, 2026-11-10 and 11-11: "trees vanish in some specific camera angles", same spot.
    // three.js notes how many instances a geometry's attributes hold the first time it is drawn
    // (WebGLBindingStates: _maxInstanceCount) and never draws more from that geometry. This
    // mimics that rule: a batch that grew must be a geometry the renderer has not capped.
    const drawnBy = (mesh: THREE.Mesh) => {
      const g = mesh.geometry as THREE.InstancedBufferGeometry & { _maxInstanceCount?: number };
      g._maxInstanceCount ??= g.getAttribute("aTreeA").count;
      return Math.min(g.instanceCount, g._maxInstanceCount);
    };
    const veg = createVegetation(world, null);
    const camera = new THREE.PerspectiveCamera(88, 2.1, 0.1, 14000);
    // The southern island: out to sea first (few trees), then round the compass.
    const x = -300,
      z = 3300,
      y = world.hf.heightAt(x, z) + 3;
    camera.position.set(x, y, z);
    let grew = 0,
      most = 0;
    for (const [dx, dz] of [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0],
      [-0.7, -0.7],
      [0, 1],
    ]) {
      camera.lookAt(x + dx! * 100, y, z + dz! * 100);
      camera.updateMatrixWorld();
      const before = veg.root.children.map((o) => (o as THREE.Mesh).geometry);
      veg.update(camera);
      veg.root.children.forEach((o, i) => {
        const mesh = o as THREE.Mesh;
        const g = mesh.geometry as THREE.InstancedBufferGeometry;
        if (g !== before[i]) grew++;
        most = Math.max(most, g.instanceCount);
        expect(g.getAttribute("aTreeA").count).toBeGreaterThanOrEqual(g.instanceCount);
        expect(drawnBy(mesh), mesh.name).toBe(g.instanceCount);
      });
    }
    // The case is real here: batches outgrew their first size while turning.
    expect(grew).toBeGreaterThan(0);
    expect(most).toBeGreaterThan(1024);
  });
});
