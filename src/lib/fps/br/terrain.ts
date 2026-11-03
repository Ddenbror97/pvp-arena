import * as THREE from "three";
import { Heightfield } from "./heightfield";
import { buildMinMax, lodRanges, selectPatches, type LodConfig } from "./terrain-lod";
import { LAND_COVER, WORLD_HALF, WORLD_SIZE } from "./world";

/**
 * Project Island terrain renderer: CDLOD over the whole 10 km heightfield in ONE draw call.
 *
 *  - One small grid patch (16 × 16 quads) is instanced for every visible quadtree node; the
 *    vertex shader reads heights from an integer texture (exact centimetres, the same data the
 *    server uses), so there is no per-chunk geometry to build, upload or stream.
 *  - Levels 0–5: 62.5 m patches with 3.9 m quads within 430 m of the camera, doubling per level
 *    out to 2 km patches with 125 m quads. Vertices morph between levels (CDLOD), so detail
 *    fades in without popping. Crack-free by construction, with no skirts (terrain-lod.ts).
 *  - Quadtree selection (terrain-lod.ts) runs on the CPU against per-node min/max heights with
 *    frustum culling, in about 0.1 ms per frame.
 *  - Shading: land-cover weights (2 RGBA textures, 7.8 m) + slope rock + a tiling detail noise,
 *    on MeshStandardMaterial so lights, fog, environment and tone mapping match the other maps.
 *
 * Rendering quality follows the game's single configuration and its adaptive RenderBudget
 * (presentation.ts), like the 1v1 and Bomb Defusal maps: no separate quality presets.
 */
export const TERRAIN: LodConfig = {
  /** Quads per patch side. */
  patch: 16,
  /** Six levels: roots are 16·2^5 = 512 grid intervals = 2 km. */
  levels: 6,
  /**
   * Distance (m) within which level 0 is used; each level doubles it. The smallest value that
   * passes checkLodConfig on this heightfield (neighbours differ by at most one level and meet
   * on identical vertices).
   */
  baseRange: 430,
  /** Morph between 85 % and 95 % of each level's range. */
  morphStart: 0.85,
  morphEnd: 0.95,
};

export type TerrainControls = {
  root: THREE.Object3D;
  /** Re-select patches for this camera (call once per frame before rendering). */
  update: (camera: THREE.PerspectiveCamera) => void;
  stats: () => { patches: number; triangles: number };
  /** Shared with the water (lake mask) and later the map UI; owned by the terrain. */
  textures: { height: THREE.DataTexture; coverA: THREE.DataTexture; coverB: THREE.DataTexture };
  dispose: () => void;
};

export function createTerrain(
  hf: Heightfield,
  landcover: { width: number; height: number; data: Uint8Array },
): TerrainControls {
  const n = hf.width - 1; // 2560 intervals
  const root = new THREE.Group();
  root.name = "br-terrain";

  // ---------------------------------------------------------------- textures
  const quantised = new Uint16Array(hf.data.length);
  for (let i = 0; i < hf.data.length; i++)
    quantised[i] = Math.max(0, Math.min(65535, Math.round((hf.data[i]! + HEIGHT_OFFSET) * 100)));
  const heightTex = new THREE.DataTexture(
    quantised,
    hf.width,
    hf.height,
    THREE.RedIntegerFormat,
    THREE.UnsignedShortType,
  );
  heightTex.internalFormat = "R16UI";
  heightTex.minFilter = heightTex.magFilter = THREE.NearestFilter;
  heightTex.generateMipmaps = false;
  heightTex.needsUpdate = true;
  const [coverA, coverB] = landCoverWeights(landcover);
  const detail = detailNoise();

  // ---------------------------------------------------------------- patch geometry
  const geometry = patchGeometry(TERRAIN.patch);
  const patchAttr = new THREE.InstancedBufferAttribute(new Float32Array(4 * 4096), 4);
  patchAttr.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("aPatch", patchAttr);
  geometry.instanceCount = 0;

  const ranges = lodRanges(TERRAIN);

  const material = new THREE.MeshStandardMaterial({ roughness: 0.94, metalness: 0 });
  const uniforms = {
    uHeight: { value: heightTex },
    uCoverA: { value: coverA },
    uCoverB: { value: coverB },
    uDetail: { value: detail },
    uSpacing: { value: hf.spacing },
    uGrid: { value: n },
    uOffset: { value: HEIGHT_OFFSET },
    uMorph: {
      value: ranges.map((r) => new THREE.Vector2(r * TERRAIN.morphStart, r * TERRAIN.morphEnd)),
    },
    uCamera: { value: new THREE.Vector3() },
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        precision highp usampler2D;
        uniform usampler2D uHeight;
        uniform float uSpacing, uGrid, uOffset;
        uniform vec2 uMorph[${TERRAIN.levels}];
        uniform vec3 uCamera;
        attribute vec4 aPatch; // origin x, origin z (grid intervals), step (intervals), level
        varying vec3 vWorld;
        float texH(ivec2 g) {
          g = clamp(g, ivec2(0), ivec2(int(uGrid)));
          return float(texelFetch(uHeight, g, 0).r) * 0.01 - uOffset;
        }
        float heightAtGrid(vec2 g) {
          vec2 f = fract(g);
          ivec2 i = ivec2(floor(g));
          float a = texH(i), b = texH(i + ivec2(1, 0)), c = texH(i + ivec2(0, 1)), d = texH(i + ivec2(1, 1));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }`,
      )
      .replace(
        "#include <beginnormal_vertex>",
        `// Grid position of this vertex, morphed toward the next level's grid (CDLOD).
        vec2 cell = position.xz;
        vec2 g = aPatch.xy + cell * aPatch.z;
        int lvl = int(aPatch.w + 0.5);
        vec3 worldGuess = vec3(g.x * uSpacing - ${WORLD_HALF.toFixed(1)}, 0.0, g.y * uSpacing - ${WORLD_HALF.toFixed(1)});
        worldGuess.y = heightAtGrid(g);
        float dist = distance(worldGuess, uCamera);
        vec2 range = uMorph[lvl];
        float morph = clamp((dist - range.x) / max(1.0, range.y - range.x), 0.0, 1.0);
        vec2 odd = mod(cell, 2.0);
        vec2 gm = aPatch.xy + (cell - odd * morph) * aPatch.z;
        float h = heightAtGrid(gm);
        // Normal step follows the morph, so a fully morphed border matches the coarser patch.
        float e = aPatch.z * (1.0 + morph);
        float hx = heightAtGrid(gm + vec2(e, 0.0)) - heightAtGrid(gm - vec2(e, 0.0));
        float hz = heightAtGrid(gm + vec2(0.0, e)) - heightAtGrid(gm - vec2(0.0, e));
        vec3 objectNormal = normalize(vec3(-hx, 2.0 * e * uSpacing, -hz));
        #ifdef USE_TANGENT
          vec3 objectTangent = vec3(1.0, 0.0, 0.0);
        #endif`,
      )
      .replace(
        "#include <begin_vertex>",
        `vec3 transformed = vec3(gm.x * uSpacing - ${WORLD_HALF.toFixed(1)}, h, gm.y * uSpacing - ${WORLD_HALF.toFixed(1)});
        vWorld = transformed;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform sampler2D uCoverA, uCoverB, uDetail;
        varying vec3 vWorld;`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        {
          vec2 uv = (vWorld.xz + ${WORLD_HALF.toFixed(1)}) / ${WORLD_SIZE.toFixed(1)};
          vec4 a = texture2D(uCoverA, uv); // sand, grass, field, forest floor
          vec4 b = texture2D(uCoverB, uv); // rock, urban, road, (shore)
          float n1 = texture2D(uDetail, vWorld.xz / 23.0).r;
          float n2 = texture2D(uDetail, vWorld.xz / 180.0).g;
          float n3 = texture2D(uDetail, vWorld.xz / 3.1).b;
          vec3 sand = vec3(0.70, 0.63, 0.47), grass = vec3(0.30, 0.42, 0.17), field = vec3(0.55, 0.50, 0.30);
          vec3 forest = vec3(0.20, 0.25, 0.12), rock = vec3(0.47, 0.45, 0.42), urban = vec3(0.50, 0.49, 0.47);
          vec3 road = vec3(0.30, 0.29, 0.28), shore = vec3(0.38, 0.35, 0.27);
          grass = mix(grass, vec3(0.42, 0.47, 0.21), n2 * 0.7);
          field = mix(field, vec3(0.45, 0.47, 0.25), n2 * 0.6);
          vec3 col = sand * a.r + grass * a.g + field * a.b + forest * a.a + rock * b.r + urban * b.g + road * b.b + shore * b.a;
          float total = a.r + a.g + a.b + a.a + b.r + b.g + b.b + b.a;
          col /= max(total, 1e-3);
          // Steep ground is bare rock, whatever the land cover says.
          float steep = smoothstep(0.62, 0.8, 1.0 - vNormalWorld.y);
          col = mix(col, rock * (0.85 + 0.3 * n1), steep);
          // High peaks: lighter rock and snow on the flats (Iron Peaks).
          float snow = smoothstep(240.0, 300.0, vWorld.y + n2 * 25.0) * (1.0 - steep);
          col = mix(col, vec3(0.86, 0.87, 0.88), snow);
          col *= 0.86 + 0.18 * n1 + 0.08 * n3;
          diffuseColor.rgb = col;
        }`,
      )
      .replace("#include <normal_fragment_begin>", `#include <normal_fragment_begin>`);
    // World normal for the slope test (view-space normal is what three computes).
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
      varying vec3 vNormalWorld;`,
      )
      .replace(
        "#include <defaultnormal_vertex>",
        `#include <defaultnormal_vertex>
      vNormalWorld = objectNormal;`,
      );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <common>",
      `#include <common>
      varying vec3 vNormalWorld;`,
    );
  };
  material.customProgramCacheKey = () => "br-terrain-v1";

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "br-terrain-patches";
  mesh.frustumCulled = false;
  mesh.receiveShadow = false;
  mesh.castShadow = false;
  root.add(mesh);

  // ---------------------------------------------------------------- quadtree selection
  const minMax = buildMinMax(hf, TERRAIN.patch, TERRAIN.levels);
  const frustum = new THREE.Frustum(),
    viewProjection = new THREE.Matrix4(),
    box = new THREE.Box3();
  const cam = new THREE.Vector3();
  const visible = (b: Float64Array) => {
    box.min.set(b[0]!, b[1]!, b[2]!);
    box.max.set(b[3]!, b[4]!, b[5]!);
    return frustum.intersectsBox(box);
  };
  let count = 0;

  return {
    root,
    textures: { height: heightTex, coverA, coverB },
    update(camera) {
      camera.updateMatrixWorld();
      viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      frustum.setFromProjectionMatrix(viewProjection);
      cam.setFromMatrixPosition(camera.matrixWorld);
      uniforms.uCamera.value.copy(cam);
      count = selectPatches(
        TERRAIN,
        minMax,
        n,
        hf.spacing,
        cam,
        patchAttr.array as Float32Array,
        visible,
      );
      geometry.instanceCount = count;
      patchAttr.addUpdateRange(0, count * 4);
      patchAttr.needsUpdate = true;
    },
    stats: () => ({
      patches: count,
      triangles: count * TERRAIN.patch * TERRAIN.patch * 2,
    }),
    dispose() {
      geometry.dispose();
      material.dispose();
      heightTex.dispose();
      coverA.dispose();
      coverB.dispose();
      detail.dispose();
    },
  };
}

const HEIGHT_OFFSET = 50;

/**
 * Patch: (q+1)² grid vertices in cell units (0..q on x/z, y = 0). Every quad is split along the
 * same diagonal, so when the odd vertices collapse onto the even ones (full morph) the patch
 * becomes exactly the next level's triangulation: no shading pop at the switch.
 */
function patchGeometry(q: number) {
  const positions: number[] = [];
  const index: number[] = [];
  for (let z = 0; z <= q; z++) for (let x = 0; x <= q; x++) positions.push(x, 0, z);
  const id = (x: number, z: number) => z * (q + 1) + x;
  for (let z = 0; z < q; z++)
    for (let x = 0; x < q; x++) {
      const a = id(x, z),
        b = id(x + 1, z),
        c = id(x, z + 1),
        d = id(x + 1, z + 1);
      index.push(a, c, d, a, d, b);
    }
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(index);
  // The shader places every vertex; bounds are irrelevant (the mesh is never frustum-culled).
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), WORLD_SIZE);
  return g;
}

/**
 * Land cover (class per texel) → two RGBA weight textures, softened over ~3 texels so class
 * borders blend instead of stepping. A: sand, grass, field, forest. B: rock, urban, road, shore
 * (water texels become a muddy shore colour for the beds of lakes and rivers).
 */
function landCoverWeights(cover: { width: number; height: number; data: Uint8Array }) {
  const { width: w, height: h, data } = cover;
  const id = (name: string) => LAND_COVER.indexOf(name as (typeof LAND_COVER)[number]);
  const slots = [
    ["sand", "grass", "field", "forest"],
    ["rock", "urban", "road", "water"],
  ].map((names) => names.map(id));
  const textures: THREE.DataTexture[] = [];
  for (const slot of slots) {
    const plane = new Float32Array(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      const c = data[i]!;
      for (let k = 0; k < 4; k++) if (slot[k] === c) plane[i * 4 + k] = 1;
    }
    blur(plane, w, h, 2);
    const bytes = new Uint8Array(w * h * 4);
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.round(plane[i]! * 255);
    const t = new THREE.DataTexture(bytes, w, h, THREE.RGBAFormat);
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.generateMipmaps = true;
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    t.needsUpdate = true;
    textures.push(t);
  }
  return textures as [THREE.DataTexture, THREE.DataTexture];
}

/** Separable box blur (radius r) over an RGBA float plane, in place. */
function blur(p: Float32Array, w: number, h: number, r: number) {
  const tmp = new Float32Array(p.length);
  const pass = (src: Float32Array, dst: Float32Array, horizontal: boolean) => {
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        for (let c = 0; c < 4; c++) {
          let s = 0,
            k = 0;
          for (let d = -r; d <= r; d++) {
            const xx = horizontal ? x + d : x,
              yy = horizontal ? y : y + d;
            if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
            s += src[(yy * w + xx) * 4 + c]!;
            k++;
          }
          dst[(y * w + x) * 4 + c] = s / k;
        }
  };
  pass(p, tmp, true);
  pass(tmp, p, false);
}

/** 256² tiling value noise in three channels (detail at three scales). */
function detailNoise() {
  const s = 256,
    bytes = new Uint8Array(s * s * 4);
  let seed = 1337;
  const rand = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  for (let c = 0; c < 3; c++) {
    const cells = [8, 16, 32][c]!;
    const lattice = Array.from({ length: cells * cells }, rand);
    for (let y = 0; y < s; y++)
      for (let x = 0; x < s; x++) {
        const fx = (x / s) * cells,
          fy = (y / s) * cells;
        const ix = Math.floor(fx),
          iy = Math.floor(fy);
        const tx = fx - ix,
          ty = fy - iy;
        const sx = tx * tx * (3 - 2 * tx),
          sy = ty * ty * (3 - 2 * ty);
        const v = (a: number, b: number) =>
          lattice[((b + cells) % cells) * cells + ((a + cells) % cells)]!;
        const value =
          (v(ix, iy) * (1 - sx) + v(ix + 1, iy) * sx) * (1 - sy) +
          (v(ix, iy + 1) * (1 - sx) + v(ix + 1, iy + 1) * sx) * sy;
        bytes[(y * s + x) * 4 + c] = Math.round(value * 255);
      }
  }
  for (let i = 3; i < bytes.length; i += 4) bytes[i] = 255;
  const t = new THREE.DataTexture(bytes, s, s, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}
