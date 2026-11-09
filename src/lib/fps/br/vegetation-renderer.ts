import * as THREE from "three";
import { dropDuplicateFaces } from "./duplicate-faces";
import { prepareFoliageMaterial } from "./foliage-material";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";
import {
  CELL_SIZE,
  CELLS,
  cellOf,
  cellTrees,
  SPECIES,
  TREE_STRIDE,
  type VegetationWorld,
} from "./vegetation";
import { WORLD_HALF } from "./world";

/**
 * Instanced trees for Project Island. Placement comes from vegetation.ts (shared with the
 * server's trunk collision), so the client only decides how each tree is DRAWN, never whether
 * it exists: every tree within VEGETATION_VIEW.viewDistance is drawn on every machine (fairness
 * invariant, docs/battle-royale/PLAN.md §10).
 *
 *  - Near (within nearDistance): the real CC BY tree model (LOD0, alpha-tested foliage), one
 *    draw per species and material. Rebuilt every few metres of movement (a few hundred trees).
 *  - Far (out to viewDistance): crossed-quad impostors (4 triangles) textured with a rendered
 *    side view of the same model, one draw per species. Rebuilt only when the set of visible
 *    250 m cells changes; trees inside the near radius are culled in the vertex shader, so a
 *    tree is never drawn twice.
 *  - Per-instance data is 2 attributes (position + scale, yaw + tint): 6 floats, not a matrix.
 *
 * Without tree assets (tools, tests) both rings fall back to procedural low-poly shapes.
 */
export const VEGETATION_VIEW = {
  /** Trees are drawn out to here (m), identical for everyone; must cover the 1 km fight range. */
  viewDistance: 1500,
  /** Real models within this distance of the camera (m). */
  nearDistance: 60,
  /** Rebuild the near set after moving this far (m). */
  nearRebuild: 3,
} as const;

/** Model ids per species (index = vegetation species id). */
export const TREE_MODELS = ["tree-pine", "tree-oak", "tree-birch"] as const;

export type TreeAssets = {
  /** LOD0 glTF per species (TREE_MODELS order). */
  models: GLTF[];
  /** Impostor texture and its size (m) per species. */
  impostors: Array<{ texture: THREE.Texture; width: number; height: number }>;
};

type Batch = {
  mesh: THREE.Mesh;
  geometry: THREE.InstancedBufferGeometry;
  a: THREE.InstancedBufferAttribute;
  b: THREE.InstancedBufferAttribute;
  count: number;
  triangles: number;
};

export type VegetationControls = {
  root: THREE.Object3D;
  update: (camera: THREE.PerspectiveCamera) => void;
  /** Trees drawn out to here (m; never under VEGETATION_VIEW.viewDistance, the cover range). */
  setViewDistance: (m: number) => void;
  stats: () => {
    trees: number;
    near: number;
    triangles: number;
    draws: number;
    rebuilds: number;
    farBySpecies: number[];
  };
  dispose: () => void;
};

/** Shader: per-instance yaw/scale/translate, tint, optional near-radius cull (far ring). */
function instanceShader(
  material: THREE.Material,
  key: string,
  nearCull: { value: number } | null,
  camera: { value: THREE.Vector3 },
  /** Keep alpha-tested foliage solid in distant mips (B. Golus' mip-level alpha scaling). */
  alphaMipScale = 0,
) {
  // The far ring's cull, readable by tests (the shader does the same test).
  if (nearCull) material.userData["treeCull"] = { centre: camera, radius: nearCull };
  material.onBeforeCompile = (shader) => {
    shader.uniforms["uTreeCamera"] = camera;
    shader.uniforms["uTreeNear"] = nearCull ?? { value: 0 };
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        attribute vec4 aTreeA; // x, ground y, z, scale
        attribute vec2 aTreeB; // yaw (0..1), tint
        uniform vec3 uTreeCamera;
        uniform float uTreeNear;
        varying float vTreeTint;
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
        `vec3 transformed = treeTurn(position) * aTreeA.w + aTreeA.xyz;
        vTreeTint = aTreeB.y;
        // Far ring: trees inside the near ring (the same centre and radius as the set of real
        // models last built) are drawn by the real models instead: neither a gap nor overlap.
        if (uTreeNear > 0.0 && distance(aTreeA.xz, uTreeCamera.xz) < uTreeNear) transformed = vec3(0.0);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying float vTreeTint;`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        diffuseColor.rgb *= vTreeTint;`,
      );
    if (material.userData["brFoliage"])
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
        // Thin leaf cards receive broad skylight rather than turning black on their backs.
        vec3 canopyUp = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
        normal = normalize(mix(normal, canopyUp, 0.65));`,
      );
    if (alphaMipScale > 0)
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <alphatest_fragment>",
        `{
          vec2 texel = vMapUv * 256.0;
          vec2 dx = dFdx(texel), dy = dFdy(texel);
          float mip = max(0.0, 0.5 * log2(max(dot(dx, dx), dot(dy, dy))));
          diffuseColor.a *= 1.0 + mip * ${alphaMipScale.toFixed(2)};
        }
        #include <alphatest_fragment>`,
      );
  };
  material.customProgramCacheKey = () => `br-trees-${key}`;
}

function makeBatch(
  root: THREE.Object3D,
  base: THREE.BufferGeometry,
  material: THREE.Material,
  name: string,
): Batch {
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.index = base.index;
  for (const [attrName, attr] of Object.entries(base.attributes))
    geometry.setAttribute(attrName, attr);
  const a = new THREE.InstancedBufferAttribute(new Float32Array(4 * 1024), 4);
  const b = new THREE.InstancedBufferAttribute(new Float32Array(2 * 1024), 2);
  a.setUsage(THREE.DynamicDrawUsage);
  b.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("aTreeA", a);
  geometry.setAttribute("aTreeB", b);
  geometry.instanceCount = 0;
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 2 * WORLD_HALF);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.frustumCulled = false;
  root.add(mesh);
  const tris = (base.index ? base.index.count : base.getAttribute("position").count) / 3;
  return { mesh, geometry, a, b, count: 0, triangles: tris };
}

function ensure(batch: Batch, n: number) {
  if (batch.a.count >= n) return;
  let size = batch.a.count;
  while (size < n) size *= 2;
  batch.a = new THREE.InstancedBufferAttribute(new Float32Array(size * 4), 4);
  batch.b = new THREE.InstancedBufferAttribute(new Float32Array(size * 2), 2);
  batch.a.setUsage(THREE.DynamicDrawUsage);
  batch.b.setUsage(THREE.DynamicDrawUsage);
  batch.geometry.setAttribute("aTreeA", batch.a);
  batch.geometry.setAttribute("aTreeB", batch.b);
}

function write(batch: Batch, t: Float32Array, k: number) {
  const n = batch.count++;
  const a = batch.a.array as Float32Array,
    b = batch.b.array as Float32Array;
  a[n * 4] = t[k]!;
  a[n * 4 + 1] = t[k + 1]!;
  a[n * 4 + 2] = t[k + 2]!;
  a[n * 4 + 3] = t[k + 3]!;
  b[n * 2] = t[k + 4]!;
  b[n * 2 + 1] = 0.86 + 0.24 * ((t[k + 4]! * 7.31) % 1);
}

function commit(batch: Batch) {
  batch.geometry.instanceCount = batch.count;
  for (const attr of [batch.a, batch.b]) {
    attr.clearUpdateRanges();
    attr.addUpdateRange(0, batch.count * attr.itemSize);
    attr.needsUpdate = true;
  }
}

/** A glTF mesh as plain float geometry in model space (dequantised, node matrix applied). */
function modelGeometry(mesh: THREE.Mesh): THREE.BufferGeometry {
  const src = mesh.geometry;
  const g = new THREE.BufferGeometry();
  for (const name of ["position", "normal", "uv"]) {
    const attr = src.getAttribute(name) as THREE.BufferAttribute | undefined;
    if (!attr) continue;
    const out = new Float32Array(attr.count * attr.itemSize);
    for (let i = 0; i < attr.count; i++)
      for (let c = 0; c < attr.itemSize; c++) out[i * attr.itemSize + c] = attr.getComponent(i, c);
    g.setAttribute(name, new THREE.BufferAttribute(out, attr.itemSize));
  }
  if (src.index) g.setIndex(Array.from(src.index.array as ArrayLike<number>));
  g.applyMatrix4(mesh.matrixWorld);
  if (!g.getAttribute("normal")) g.computeVertexNormals();
  return g;
}

/** Two crossed vertical quads, base at y = 0, normals up (lit like a canopy from the sky). */
function crossedQuads(width: number, height: number) {
  const parts = [0, Math.PI / 2].map((angle) => {
    const g = new THREE.PlaneGeometry(width, height);
    g.translate(0, height / 2, 0);
    g.rotateY(angle);
    const n = g.getAttribute("normal");
    for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0);
    return g;
  });
  const merged = mergeGeometries(parts)!;
  for (const p of parts) p.dispose();
  return merged;
}

export function createVegetation(
  world: VegetationWorld,
  assets: TreeAssets | null = null,
): VegetationControls {
  const root = new THREE.Group();
  root.name = "br-vegetation";
  // Centre and radius of the near ring as last built (uTreeCamera, uTreeNear in the shader).
  const cameraUniform = { value: new THREE.Vector3(Infinity, 0, Infinity) };
  const nearCull = { value: VEGETATION_VIEW.nearDistance as number };
  const owned: THREE.Material[] = [];
  const ownedGeometry: THREE.BufferGeometry[] = [];

  // Near batches: per species, one per material of the model (or the procedural shape).
  const near: Batch[][] = SPECIES.map((species, s) => {
    if (!assets) {
      const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 });
      instanceShader(material, "near-procedural", null, cameraUniform);
      owned.push(material);
      const base = placeholderTree(species, 0);
      ownedGeometry.push(base);
      return [makeBatch(root, base, material, `br-trees-${species}-near`)];
    }
    const batches: Batch[] = [];
    assets.models[s]!.scene.updateMatrixWorld(true);
    assets.models[s]!.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const material = (mesh.material as THREE.MeshStandardMaterial).clone();
      prepareFoliageMaterial(material);
      instanceShader(material, `near-${species}-${batches.length}`, null, cameraUniform);
      owned.push(material);
      const base = modelGeometry(mesh);
      // The pine's needle cards and the birch's bark are stored twice (z-fight flicker).
      dropDuplicateFaces(base, material);
      ownedGeometry.push(base);
      batches.push(makeBatch(root, base, material, `br-trees-${species}-near-${batches.length}`));
    });
    return batches;
  });

  // Far batches: one per species.
  const far: Batch[] = SPECIES.map((species, s) => {
    let base: THREE.BufferGeometry;
    let material: THREE.MeshStandardMaterial;
    if (assets) {
      const imp = assets.impostors[s]!;
      base = crossedQuads(imp.width, imp.height);
      material = new THREE.MeshStandardMaterial({
        map: imp.texture,
        alphaTest: 0.45,
        side: THREE.DoubleSide,
        roughness: 0.95,
      });
      // The side view is lit softly in the bake and again here with an up-facing normal:
      // lift it to match the real models' brightness.
      material.color.setScalar(1.3);
    } else {
      base = placeholderTree(species, 1);
      material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 });
    }
    instanceShader(
      material,
      `far-${species}-${assets ? "impostor" : "procedural"}`,
      nearCull,
      cameraUniform,
      assets ? 0.35 : 0,
    );
    owned.push(material);
    ownedGeometry.push(base);
    return makeBatch(root, base, material, `br-trees-${species}-far`);
  });

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
  let nearX = Infinity,
    nearZ = Infinity;
  const visible: Array<[number, number]> = [];

  const rebuildNear = () => {
    nearX = cam.x;
    nearZ = cam.z;
    // This set is rebuilt only every nearRebuild metres: reach far enough that every tree within
    // nearDistance of the camera stays in it until the next rebuild. The far ring culls exactly
    // this ring (same centre and radius), so each tree is drawn by one ring only. (The far
    // ring used to cull round the moving camera at nearDistance: a tree at the seam was drawn
    // by neither ring and blinked out while running, or by both, impostor through model.)
    const r = VEGETATION_VIEW.nearDistance + VEGETATION_VIEW.nearRebuild + 1;
    cameraUniform.value.set(nearX, 0, nearZ);
    nearCull.value = r;
    const counts = SPECIES.map(() => 0);
    const cells: Array<[number, number]> = [];
    for (let cj = cellOf(cam.z - r); cj <= cellOf(cam.z + r); cj++)
      for (let ci = cellOf(cam.x - r); ci <= cellOf(cam.x + r); ci++) cells.push([ci, cj]);
    for (const [ci, cj] of cells) {
      const t = cellTrees(world, ci, cj);
      for (let k = 0; k < t.length; k += TREE_STRIDE)
        if (Math.hypot(t[k]! - cam.x, t[k + 2]! - cam.z) < r) counts[t[k + 5]!]!++;
    }
    near.forEach((batches, s) =>
      batches.forEach((batch) => {
        ensure(batch, counts[s]!);
        batch.count = 0;
      }),
    );
    for (const [ci, cj] of cells) {
      const t = cellTrees(world, ci, cj);
      for (let k = 0; k < t.length; k += TREE_STRIDE)
        if (Math.hypot(t[k]! - cam.x, t[k + 2]! - cam.z) < r)
          for (const batch of near[t[k + 5]!]!) write(batch, t, k);
    }
    for (const batches of near) for (const batch of batches) commit(batch);
  };

  let treeView: number = VEGETATION_VIEW.viewDistance;
  return {
    root,
    setViewDistance(m) {
      treeView = Math.max(VEGETATION_VIEW.viewDistance, Math.min(4000, m));
      signature = "";
    },
    update(camera) {
      camera.updateMatrixWorld();
      viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      frustum.setFromProjectionMatrix(viewProjection);
      cam.setFromMatrixPosition(camera.matrixWorld);
      if (Math.hypot(cam.x - nearX, cam.z - nearZ) >= VEGETATION_VIEW.nearRebuild) rebuildNear();
      const view = treeView;
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
          if (box.distanceToPoint(cam) > view || !frustum.intersectsBox(box)) continue;
          visible.push([ci, cj]);
          sig += `${ci},${cj};`;
        }
      if (sig === signature) return;
      signature = sig;
      rebuilds++;
      const counts = SPECIES.map(() => 0);
      for (const [ci, cj] of visible) {
        const t = cellTrees(world, ci, cj);
        for (let k = 5; k < t.length; k += TREE_STRIDE) counts[t[k]!]!++;
      }
      far.forEach((batch, s) => {
        ensure(batch, counts[s]!);
        batch.count = 0;
      });
      for (const [ci, cj] of visible) {
        const t = cellTrees(world, ci, cj);
        for (let k = 0; k < t.length; k += TREE_STRIDE) write(far[t[k + 5]!]!, t, k);
      }
      for (const batch of far) commit(batch);
    },
    stats() {
      let trees = 0,
        nearTrees = 0,
        triangles = 0,
        draws = 0;
      for (const batch of far) {
        trees += batch.count;
        triangles += batch.count * batch.triangles;
        if (batch.count) draws++;
      }
      near.forEach((batches) => {
        nearTrees += batches[0]?.count ?? 0;
        for (const batch of batches) {
          triangles += batch.count * batch.triangles;
          if (batch.count) draws++;
        }
      });
      return {
        trees,
        near: nearTrees,
        triangles,
        draws,
        rebuilds,
        farBySpecies: far.map((b) => b.count),
      };
    },
    dispose() {
      for (const batches of near) for (const batch of batches) batch.geometry.dispose();
      for (const batch of far) batch.geometry.dispose();
      for (const g of ownedGeometry) g.dispose();
      for (const m of owned) m.dispose();
      if (assets) for (const imp of assets.impostors) imp.texture.dispose();
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
  const indexed = new THREE.BufferGeometry();
  indexed.setAttribute("position", merged.getAttribute("position"));
  indexed.setAttribute("normal", merged.getAttribute("normal"));
  indexed.setAttribute("color", merged.getAttribute("color"));
  indexed.setIndex([...Array(merged.getAttribute("position").count).keys()]);
  merged.dispose();
  return indexed;
}
