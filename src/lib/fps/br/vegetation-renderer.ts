import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  CELL_SIZE,
  CELLS,
  cellTrees,
  SPECIES,
  TREE_STRIDE,
  type VegetationWorld,
} from "./vegetation";
import { WORLD_HALF } from "./world";

/**
 * Instanced trees for Project Island. Placement comes from vegetation.ts (shared with the
 * server's trunk collision), so the client only decides how each tree is DRAWN, never whether
 * it exists: every tree within VIEW_DISTANCE is drawn on every machine (fairness invariant,
 * docs/battle-royale/PLAN.md §10).
 *
 *  - One draw per species and ring: near meshes within NEAR_DISTANCE, very low-poly far meshes
 *    out to VIEW_DISTANCE. 3 species × 2 rings = 6 draw calls for the whole forest.
 *  - Per-instance data is 2 attributes (position + scale, yaw + tint): 6 floats, not a matrix.
 *  - Buffers are refilled only when the set of visible cells or their ring changes (crossing a
 *    cell or turning), never per frame; culling and ring choice work per 250 m cell.
 *
 * The geometry here is a procedural placeholder until the processed CC BY tree models replace
 * it (same instancing, same budgets).
 */
export const VEGETATION_VIEW = {
  /** Trees are drawn out to here (m), identical for everyone; must cover the 1 km fight range. */
  viewDistance: 1500,
  /** Full meshes within this distance (cell-box distance, m). */
  nearDistance: 420,
} as const;

type Ring = 0 | 1;
type Batch = {
  mesh: THREE.Mesh;
  geometry: THREE.InstancedBufferGeometry;
  a: THREE.InstancedBufferAttribute;
  b: THREE.InstancedBufferAttribute;
  count: number;
  trianglesPerInstance: number;
};

export type VegetationControls = {
  root: THREE.Object3D;
  update: (camera: THREE.PerspectiveCamera) => void;
  stats: () => { trees: number; near: number; triangles: number; draws: number; rebuilds: number };
  dispose: () => void;
};

export function createVegetation(world: VegetationWorld): VegetationControls {
  const root = new THREE.Group();
  root.name = "br-vegetation";
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.92,
    metalness: 0,
  });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        attribute vec4 aTreeA; // x, ground y, z, scale
        attribute vec2 aTreeB; // yaw (0..1), tint
        vec3 treeTurn(vec3 v) {
          float a = aTreeB.x * 6.2831853;
          float c = cos(a), s = sin(a);
          return vec3(c * v.x + s * v.z, v.y, -s * v.x + c * v.z);
        }`,
      )
      .replace(
        "#include <beginnormal_vertex>",
        `vec3 objectNormal = treeTurn(normal);
        #ifdef USE_TANGENT
          vec3 objectTangent = vec3(1.0, 0.0, 0.0);
        #endif`,
      )
      .replace(
        "#include <begin_vertex>",
        `vec3 transformed = treeTurn(position) * aTreeA.w + aTreeA.xyz;`,
      )
      .replace(
        "#include <color_vertex>",
        `#include <color_vertex>
        vColor.rgb *= aTreeB.y;`,
      );
  };
  material.customProgramCacheKey = () => "br-trees-v1";

  const batches: Batch[][] = SPECIES.map((species) =>
    ([0, 1] as const).map((ring) => {
      const base = placeholderTree(species, ring);
      const geometry = new THREE.InstancedBufferGeometry();
      geometry.index = base.index;
      for (const name of ["position", "normal", "color"] as const)
        geometry.setAttribute(name, base.getAttribute(name));
      const a = new THREE.InstancedBufferAttribute(new Float32Array(4 * 1024), 4);
      const b = new THREE.InstancedBufferAttribute(new Float32Array(2 * 1024), 2);
      a.setUsage(THREE.DynamicDrawUsage);
      b.setUsage(THREE.DynamicDrawUsage);
      geometry.setAttribute("aTreeA", a);
      geometry.setAttribute("aTreeB", b);
      geometry.instanceCount = 0;
      geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 2 * WORLD_HALF);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = `br-trees-${species}-${ring ? "far" : "near"}`;
      mesh.frustumCulled = false;
      root.add(mesh);
      return {
        mesh,
        geometry,
        a,
        b,
        count: 0,
        trianglesPerInstance: (base.index!.count / 3) | 0,
      };
    }),
  );

  // Per-cell vertical bounds for culling (computed once per cell, from the shared placement).
  const cellBounds = new Map<number, [number, number]>();
  const boundsOf = (ci: number, cj: number) => {
    const key = cj * CELLS + ci;
    let b = cellBounds.get(key);
    if (!b) {
      const t = cellTrees(world, ci, cj);
      let lo = Infinity,
        hi = -Infinity;
      for (let k = 1; k < t.length; k += TREE_STRIDE) {
        lo = Math.min(lo, t[k]!);
        hi = Math.max(hi, t[k]!);
      }
      b = t.length ? [lo - 1, hi + 30] : [0, 0];
      cellBounds.set(key, b);
    }
    return b;
  };

  const frustum = new THREE.Frustum(),
    viewProjection = new THREE.Matrix4(),
    box = new THREE.Box3(),
    cam = new THREE.Vector3();
  let signature = "";
  let rebuilds = 0;
  const visible: Array<[number, number, Ring]> = [];

  const ensure = (batch: Batch, n: number) => {
    if (batch.a.count >= n) return;
    let size = batch.a.count;
    while (size < n) size *= 2;
    const a = new THREE.InstancedBufferAttribute(new Float32Array(size * 4), 4);
    const b = new THREE.InstancedBufferAttribute(new Float32Array(size * 2), 2);
    a.setUsage(THREE.DynamicDrawUsage);
    b.setUsage(THREE.DynamicDrawUsage);
    batch.geometry.setAttribute("aTreeA", a);
    batch.geometry.setAttribute("aTreeB", b);
    batch.a = a;
    batch.b = b;
  };

  return {
    root,
    update(camera) {
      camera.updateMatrixWorld();
      viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      frustum.setFromProjectionMatrix(viewProjection);
      cam.setFromMatrixPosition(camera.matrixWorld);
      const view = VEGETATION_VIEW.viewDistance;
      const i0 = Math.max(0, Math.floor((cam.x - view + WORLD_HALF) / CELL_SIZE)),
        i1 = Math.min(CELLS - 1, Math.floor((cam.x + view + WORLD_HALF) / CELL_SIZE)),
        j0 = Math.max(0, Math.floor((cam.z - view + WORLD_HALF) / CELL_SIZE)),
        j1 = Math.min(CELLS - 1, Math.floor((cam.z + view + WORLD_HALF) / CELL_SIZE));
      visible.length = 0;
      let sig = "";
      for (let cj = j0; cj <= j1; cj++)
        for (let ci = i0; ci <= i1; ci++) {
          const [lo, hi] = boundsOf(ci, cj);
          if (hi <= lo) continue;
          box.min.set(ci * CELL_SIZE - WORLD_HALF, lo, cj * CELL_SIZE - WORLD_HALF);
          box.max.set((ci + 1) * CELL_SIZE - WORLD_HALF, hi, (cj + 1) * CELL_SIZE - WORLD_HALF);
          const d = box.distanceToPoint(cam);
          if (d > view || !frustum.intersectsBox(box)) continue;
          const ring: Ring = d <= VEGETATION_VIEW.nearDistance ? 0 : 1;
          visible.push([ci, cj, ring]);
          sig += `${ci},${cj},${ring};`;
        }
      if (sig === signature) return;
      signature = sig;
      rebuilds++;
      // Count, then fill.
      const counts = SPECIES.map(() => [0, 0]);
      for (const [ci, cj, ring] of visible) {
        const t = cellTrees(world, ci, cj);
        for (let k = 5; k < t.length; k += TREE_STRIDE) counts[t[k]!]![ring]!++;
      }
      batches.forEach((rings, s) =>
        rings.forEach((batch, ring) => {
          ensure(batch, counts[s]![ring]!);
          batch.count = 0;
        }),
      );
      for (const [ci, cj, ring] of visible) {
        const t = cellTrees(world, ci, cj);
        for (let k = 0; k < t.length; k += TREE_STRIDE) {
          const batch = batches[t[k + 5]!]![ring]!;
          const n = batch.count++;
          const a = batch.a.array as Float32Array,
            b = batch.b.array as Float32Array;
          a[n * 4] = t[k]!;
          a[n * 4 + 1] = t[k + 1]!;
          a[n * 4 + 2] = t[k + 2]!;
          a[n * 4 + 3] = t[k + 3]!;
          b[n * 2] = t[k + 4]!;
          b[n * 2 + 1] = 0.82 + 0.3 * ((t[k + 4]! * 7.31) % 1);
        }
      }
      for (const rings of batches)
        for (const batch of rings) {
          batch.geometry.instanceCount = batch.count;
          batch.a.clearUpdateRanges();
          batch.b.clearUpdateRanges();
          batch.a.addUpdateRange(0, batch.count * 4);
          batch.b.addUpdateRange(0, batch.count * 2);
          batch.a.needsUpdate = true;
          batch.b.needsUpdate = true;
        }
    },
    stats() {
      let trees = 0,
        near = 0,
        triangles = 0,
        draws = 0;
      batches.forEach((rings) =>
        rings.forEach((batch, ring) => {
          trees += batch.count;
          if (ring === 0) near += batch.count;
          triangles += batch.count * batch.trianglesPerInstance;
          if (batch.count) draws++;
        }),
      );
      return { trees, near, triangles, draws, rebuilds };
    },
    dispose() {
      for (const rings of batches) for (const batch of rings) batch.geometry.dispose();
      material.dispose();
    },
  };
}

/** Procedural placeholder trees (metres, base at y = 0), vertex-coloured, one geometry each. */
function placeholderTree(species: (typeof SPECIES)[number], ring: number): THREE.BufferGeometry {
  const bark = new THREE.Color(0x4a3a2a),
    birchBark = new THREE.Color(0xd8d4c8);
  const needles = new THREE.Color(0x2c4a26),
    leaves = new THREE.Color(0x4b6a2a),
    birchLeaves = new THREE.Color(0x7a9a3c);
  const paint = (g: THREE.BufferGeometry, c: THREE.Color) => {
    const g2 = g.index ? g.toNonIndexed() : g;
    g2.deleteAttribute("uv");
    const n = g2.getAttribute("position").count;
    const colors = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) colors.set([c.r, c.g, c.b], i * 3);
    g2.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g2;
  };
  const at = (g: THREE.BufferGeometry, y: number, sy = 1) => g.scale(1, sy, 1).translate(0, y, 0);
  const parts: THREE.BufferGeometry[] = [];
  if (species === "pine") {
    if (ring === 0) {
      parts.push(paint(at(new THREE.CylinderGeometry(0.22, 0.34, 6, 6, 1, true), 3), bark));
      parts.push(paint(at(new THREE.ConeGeometry(3.4, 7, 8, 1, true), 6.5), needles));
      parts.push(paint(at(new THREE.ConeGeometry(2.7, 6, 8, 1, true), 10.5), needles));
      parts.push(paint(at(new THREE.ConeGeometry(1.8, 5, 7, 1, true), 14.5), needles));
    } else parts.push(paint(at(new THREE.ConeGeometry(3.2, 15, 5, 1, true), 9.5), needles));
  } else if (species === "broadleaf") {
    if (ring === 0) {
      parts.push(paint(at(new THREE.CylinderGeometry(0.3, 0.48, 6, 6, 1, true), 3), bark));
      parts.push(paint(at(new THREE.IcosahedronGeometry(4.2, 1), 9.5, 0.8), leaves));
    } else parts.push(paint(at(new THREE.IcosahedronGeometry(4.2, 0), 9, 0.85), leaves));
  } else {
    if (ring === 0) {
      parts.push(paint(at(new THREE.CylinderGeometry(0.16, 0.24, 9, 5, 1, true), 4.5), birchBark));
      parts.push(paint(at(new THREE.IcosahedronGeometry(2.6, 1), 11, 1.35), birchLeaves));
    } else parts.push(paint(at(new THREE.IcosahedronGeometry(2.6, 0), 10.5, 1.4), birchLeaves));
  }
  const merged = mergeGeometries(parts)!;
  for (const p of parts) p.dispose();
  // Index it so instanced draws share vertices (and the triangle count is exact).
  const indexed = new THREE.BufferGeometry();
  indexed.setAttribute("position", merged.getAttribute("position"));
  indexed.setAttribute("normal", merged.getAttribute("normal"));
  indexed.setAttribute("color", merged.getAttribute("color"));
  indexed.setIndex([...Array(merged.getAttribute("position").count).keys()]);
  merged.dispose();
  return indexed;
}
