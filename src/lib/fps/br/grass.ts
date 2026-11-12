import * as THREE from "three";
import {
  createGrassScatter,
  FAMILIES,
  GRASS,
  INSTANCE_FLOATS,
  type ClumpInfo,
  type GrassFamily,
  type GrassWorld,
} from "./grass-scatter";
import type { BrTier } from "./quality-tier";
import { sunLook } from "./sun";
import { WORLD_HALF, WORLD_SIZE } from "./world";

/**
 * Project Island's ground grass drawn (grass-scatter.ts says where it grows): clumps from four
 * CC BY 4.0 packs (public/fps/br/grass, art/br/grass/build_grass.py) in one atlas.
 *
 * What makes the clumps sit in the world rather than on it:
 * - **Rooted in the ground's own colour.** Each clump reads the island's aerial ground colour
 *   (the terrain's bake, the same texture it is drawn with) under itself: the roots take that
 *   colour and the whole clump leans a little towards it, so grass on dark soil is darker and on
 *   pale ground paler, and the sward and the ground under it read as one surface.
 * - **Light through the sward.** Darker low down (the blades shade each other), lit like the
 *   ground (normals bent up, so both faces of a card are lit alike and nothing flickers dark),
 *   and glowing when the sun is behind it.
 * - **Wind.** Gusts roll across the meadows as waves (each blade bends by its height squared),
 *   with a flutter of its own, and the gust brightens the tips a touch, so the wind shows as
 *   moving light over a field from a distance.
 * - **No pop.** Each clump has a random number; with distance fewer are kept, the rest shrink
 *   into the ground as the camera moves away (and grow back as it comes near), and the last
 *   metres of the range fade to nothing.
 *
 * Cost: one draw call per kind of clump in range (16 kinds, an open meadow uses 8–11), 16–54
 * triangles a clump, one shared material and atlas, no per-frame CPU work beyond a few
 * uniforms; the scatter runs a few 8 m cells a frame as the camera reaches new ground, and the
 * instance buffers are rebuilt only when the set of cells changes. Purely cosmetic (no
 * collision) and the same for every player.
 */
export type GrassKit = {
  clumps: Array<
    ClumpInfo & {
      name: string;
      vertex: number;
      vertices: number;
      index: number;
      indices: number;
      radius: number;
    }
  >;
  vertices: Float32Array;
  indices: Uint16Array;
  atlas: THREE.Texture;
};

export type GrassControls = {
  root: THREE.Object3D;
  /** Per frame, with the terrain's ground colour texture once it has loaded (null before). */
  update(camera: THREE.Camera, ground: THREE.Texture | null, full?: boolean): void;
  /** Drawing range (m): 0 turns the grass off. */
  setRange(m: number): void;
  stats(): { instances: number; draws: number; triangles: number; cells: number };
  dispose(): void;
};

/** The kit's files (art/br/grass/build_grass.py). */
export const GRASS_ASSETS = {
  manifest: "/fps/br/grass/grass-v1.json",
  bin: "/fps/br/grass/grass-v1.bin",
  atlas: "/fps/br/grass/grass-v1.webp",
} as const;

/** Range (m) by graphics tier. */
export const GRASS_RANGE: Record<BrTier, number> = { standard: 52, balanced: 40, low: 26 };
/** Share of clumps kept at the far edge of the range (the rest shrink away with distance). */
const THIN = 0.14;
/**
 * Cells kept round the view's heading (rad from it, either side): the widest view (a 16:9
 * screen at the game's 75° field of view is 53° either side; the zoomed out third-person views
 * a little more) plus a margin, and how far the view may turn before the set is rebuilt (the
 * rebuild runs before that frame is drawn, so a flick never shows bare ground). Cells within two
 * cells of the camera are always kept (looking down at your feet).
 */
const VIEW_CONE = (115 * Math.PI) / 180;
const VIEW_TURN = (40 * Math.PI) / 180;
/** Cells scattered per frame at most (each ~0.3 ms), nearest first. */
const CELLS_PER_FRAME = 4;

/** Kept at distance `d` (0 … 1), the same in the shader. */
const keep = (d: number, range: number) => {
  const t = Math.max(0, Math.min(1, (d - range * 0.2) / (range * 0.8)));
  return 1 - (1 - THIN) * t * t * (3 - 2 * t);
};

/** Parse the kit's manifest and binary (public/fps/br/grass/grass-v1.{json,bin}). */
export function parseGrassKit(
  manifest: {
    clumps: Array<{
      name: string;
      family: string;
      vertex: number;
      vertices: number;
      index: number;
      indices: number;
      height: number;
      radius: number;
    }>;
    vertexBytes: number;
    indexBytes: number;
  },
  bin: ArrayBuffer,
  atlas: THREE.Texture,
): GrassKit {
  return {
    clumps: manifest.clumps.map((c) => {
      if (!FAMILIES.includes(c.family as GrassFamily)) throw new Error(`grass family ${c.family}`);
      return { ...c, family: c.family as GrassFamily };
    }),
    vertices: new Float32Array(bin, 0, manifest.vertexBytes / 4),
    indices: new Uint16Array(bin, manifest.vertexBytes, manifest.indexBytes / 2),
    atlas,
  };
}

export function createGrass(world: GrassWorld, kit: GrassKit, range: number): GrassControls {
  const root = new THREE.Group();
  root.name = "br-grass";
  const scatter = createGrassScatter(world, kit.clumps);
  const sun = sunLook();
  const uniforms = {
    uCamera: { value: new THREE.Vector3() },
    uTime: { value: 0 },
    uRange: { value: range },
    uGround: { value: null as THREE.Texture | null },
    uGroundOn: { value: 0 },
    uSunView: { value: new THREE.Vector3() },
    uSunGlow: { value: sun.light.clone().multiplyScalar(sun.intensity * 0.35) },
  };
  kit.atlas.flipY = false;
  kit.atlas.colorSpace = THREE.SRGBColorSpace;
  kit.atlas.anisotropy = 4;
  const material = new THREE.MeshStandardMaterial({
    map: kit.atlas,
    roughness: 0.88,
    metalness: 0,
    side: THREE.DoubleSide,
    alphaTest: 0.5,
    // Soft blade edges under MSAA (the alpha test alone with none).
    alphaToCoverage: true,
  });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        attribute float aH;
        attribute vec4 iPose;
        attribute vec4 iShape;
        attribute vec3 iTint;
        uniform vec3 uCamera;
        uniform float uTime;
        uniform float uRange;
        varying vec3 vTint;
        varying float vH;
        varying vec2 vGroundUv;
        varying float vGust;`,
      )
      .replace(
        "#include <beginnormal_vertex>",
        `float yc = cos(iPose.w), ys = sin(iPose.w);
        vec3 bent = vec3(yc * normal.x + ys * normal.z, normal.y, -ys * normal.x + yc * normal.z);
        // Lit like the ground it grows from: both faces of a card alike, no dark flicker.
        vec3 objectNormal = normalize(vec3(0.0, 1.0, 0.0) + 0.4 * bent);
        #ifdef USE_TANGENT
        vec3 objectTangent = vec3(tangent.xyz);
        #endif`,
      )
      .replace(
        "#include <begin_vertex>",
        `vec3 p = position * iShape.x;
        p.xz += iShape.yz * p.y;
        p.xz = vec2(yc * p.x + ys * p.z, -ys * p.x + yc * p.z);
        // Kept with distance (grass-scatter's random number against a falling share), shrinking
        // into the ground as it goes, and the range's last metres fading out.
        float dist = distance(iPose.xz, uCamera.xz);
        float t = clamp((dist - uRange * 0.2) / (uRange * 0.8), 0.0, 1.0);
        float keepShare = 1.0 - ${(1 - THIN).toFixed(2)} * t * t * (3.0 - 2.0 * t);
        float show = smoothstep(iShape.w - 0.12, iShape.w, keepShare) * (1.0 - smoothstep(uRange * 0.86, uRange, dist));
        // Wind: gusts rolling across as waves, a flutter of its own; blades bend by height².
        vec3 world = iPose.xyz + p;
        vec2 wind = vec2(0.8, 0.6);
        float roll = dot(world.xz, wind) * 0.19 - uTime * 1.6 + 1.7 * sin(dot(world.xz, vec2(-0.6, 0.8)) * 0.07 + uTime * 0.31);
        float gust = 0.5 + 0.5 * sin(roll);
        gust *= gust;
        float bend = aH * aH;
        float sway = bend * p.y * (0.18 + 0.42 * gust);
        world.xz += wind * sway + vec2(-wind.y, wind.x) * bend * p.y * 0.07 * sin(uTime * 3.3 + iShape.w * 40.0);
        world.y -= sway * sway * 0.5 / max(p.y, 0.05);
        vec3 transformed = iPose.xyz + (world - iPose.xyz) * show;
        vTint = iTint;
        vH = aH;
        vGust = gust * bend;
        vGroundUv = (iPose.xz + ${WORLD_HALF.toFixed(1)}) / ${WORLD_SIZE.toFixed(1)};`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform sampler2D uGround;
        uniform float uGroundOn;
        uniform vec3 uSunView;
        uniform vec3 uSunGlow;
        varying vec3 vTint;
        varying float vH;
        varying vec2 vGroundUv;
        varying float vGust;`,
      )
      .replace(
        "#include <map_fragment>",
        `vec4 blade = texture2D(map, vMapUv);
        // Thin blades vanish in the smaller mip levels under an alpha test: their coverage is
        // put back by the level (a blade stays a blade at range instead of thinning to nothing).
        vec2 tex = vMapUv * vec2(textureSize(map, 0));
        vec2 ddx = dFdx(tex), ddy = dFdy(tex);
        blade.a *= 1.0 + 0.28 * max(0.0, 0.5 * log2(max(dot(ddx, ddx), dot(ddy, ddy))));
        vec3 col = blade.rgb * vTint;
        // The ground's own colour under the clump (the terrain's bake, stored as its square root).
        vec3 ground = col;
        if (uGroundOn > 0.5) {
          ground = texture2D(uGround, vGroundUv).rgb;
          ground *= ground;
          // Sit in the ground's palette, the roots most of all, darker in the sward.
          col = mix(col, ground * 1.25, 0.18);
          col = mix(col, ground, (1.0 - smoothstep(0.0, 0.5, vH)) * 0.5);
        }
        col *= mix(0.5, 1.0, smoothstep(0.0, 0.75, vH));
        col *= 1.0 + 0.09 * vGust;
        diffuseColor *= vec4(col, blade.a);`,
      )
      // Both faces lit alike (DoubleSide would turn the bent-up normal down on the back face).
      .replace(
        "#include <normal_fragment_begin>",
        `#include <normal_fragment_begin>
        normal = normalize(vNormal);`,
      )
      // Sunlight through the blades when the sun is behind them.
      .replace(
        "#include <opaque_fragment>",
        `outgoingLight += diffuseColor.rgb * uSunGlow * pow(max(dot(normalize(-vViewPosition), uSunView), 0.0), 4.0) * smoothstep(0.15, 1.0, vH);
        #include <opaque_fragment>`,
      );
  };
  material.customProgramCacheKey = () => "br-grass-v1";

  // One geometry per clump: its vertices, the height share (for the bend and the shading), and
  // the instance attributes (grown as needed).
  type Kind = {
    mesh: THREE.Mesh<THREE.InstancedBufferGeometry, THREE.MeshStandardMaterial>;
    pose: THREE.InstancedBufferAttribute;
    shape: THREE.InstancedBufferAttribute;
    tint: THREE.InstancedBufferAttribute;
    capacity: number;
    triangles: number;
  };
  const kinds: Kind[] = kit.clumps.map((c, k) => {
    const g = new THREE.InstancedBufferGeometry();
    const v = kit.vertices.subarray(c.vertex * 8, (c.vertex + c.vertices) * 8);
    const pos = new Float32Array(c.vertices * 3),
      nor = new Float32Array(c.vertices * 3),
      uv = new Float32Array(c.vertices * 2),
      h = new Float32Array(c.vertices);
    for (let i = 0; i < c.vertices; i++) {
      pos.set(v.subarray(i * 8, i * 8 + 3), i * 3);
      nor.set(v.subarray(i * 8 + 3, i * 8 + 6), i * 3);
      uv.set(v.subarray(i * 8 + 6, i * 8 + 8), i * 2);
      h[i] = Math.max(0, Math.min(1, pos[i * 3 + 1]! / c.height));
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
    g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    g.setAttribute("aH", new THREE.BufferAttribute(h, 1));
    g.setIndex(new THREE.BufferAttribute(kit.indices.slice(c.index, c.index + c.indices), 1));
    const make = (n: number, size: number) => {
      const a = new THREE.InstancedBufferAttribute(new Float32Array(n * size), size);
      a.setUsage(THREE.DynamicDrawUsage);
      return a;
    };
    const capacity = 256;
    const pose = make(capacity, 4),
      shape = make(capacity, 4),
      tint = make(capacity, 3);
    g.setAttribute("iPose", pose);
    g.setAttribute("iShape", shape);
    g.setAttribute("iTint", tint);
    g.instanceCount = 0;
    const mesh = new THREE.Mesh(g, material);
    mesh.name = `grass-${k}-${c.family}`;
    mesh.frustumCulled = false;
    mesh.matrixAutoUpdate = false;
    mesh.visible = false;
    root.add(mesh);
    return { mesh, pose, shape, tint, capacity, triangles: c.indices / 3 };
  });

  const cells = new Map<number, { cx: number; cz: number; lists: Float32Array[] }>();
  const key = (cx: number, cz: number) => (cz + 2048) * 4096 + (cx + 2048);
  let wanted: Array<{ cx: number; cz: number; d: number }> = [];
  let lastCx = NaN,
    lastCz = NaN,
    lastRange = -1,
    dirty = false,
    instances = 0;
  const off = () => {
    for (const k of kinds) {
      k.mesh.geometry.instanceCount = 0;
      k.mesh.visible = false;
    }
    instances = 0;
  };

  let camX = 0,
    camZ = 0,
    lookYaw = 0,
    builtYaw = NaN;
  const rebuild = () => {
    builtYaw = lookYaw;
    const r = uniforms.uRange.value;
    const totals = kinds.map(() => 0);
    // Count first (only what the distance keeps), then grow and fill.
    // Cells well behind the view are left out (VIEW_CONE): their keep share 0.
    const keepAt = wanted.map((w) => {
      if (w.d > GRASS.cell * 2) {
        const ax = (w.cx + 0.5) * GRASS.cell - camX,
          az = (w.cz + 0.5) * GRASS.cell - camZ;
        const off = Math.abs(
          Math.atan2(
            Math.sin(Math.atan2(ax, az) - lookYaw),
            Math.cos(Math.atan2(ax, az) - lookYaw),
          ),
        );
        // (The cell's own width, seen from here, widens the cone a little.)
        if (off - Math.atan2(GRASS.cell * 0.71, w.d) > VIEW_CONE) return 0;
      }
      return keep(Math.max(0, w.d - GRASS.cell * 0.71), r);
    });
    wanted.forEach((w, i) => {
      const lists = cells.get(key(w.cx, w.cz))?.lists;
      if (!lists) return;
      lists.forEach((l, k) => {
        for (let o = 0; o < l.length; o += INSTANCE_FLOATS)
          if (l[o + 7]! < keepAt[i]!) totals[k]!++;
      });
    });
    instances = 0;
    kinds.forEach((kind, k) => {
      const n = totals[k]!;
      if (n > kind.capacity) {
        kind.capacity = Math.ceil(n * 1.4);
        const g = kind.mesh.geometry;
        for (const [name, size] of [
          ["iPose", 4],
          ["iShape", 4],
          ["iTint", 3],
        ] as const) {
          const a = new THREE.InstancedBufferAttribute(
            new Float32Array(kind.capacity * size),
            size,
          );
          a.setUsage(THREE.DynamicDrawUsage);
          g.setAttribute(name, a);
          if (name === "iPose") kind.pose = a;
          else if (name === "iShape") kind.shape = a;
          else kind.tint = a;
        }
      }
      let m = 0;
      const pose = kind.pose.array as Float32Array,
        shape = kind.shape.array as Float32Array,
        tint = kind.tint.array as Float32Array;
      wanted.forEach((w, i) => {
        const l = cells.get(key(w.cx, w.cz))?.lists[k];
        if (!l) return;
        for (let o = 0; o < l.length; o += INSTANCE_FLOATS) {
          if (l[o + 7]! >= keepAt[i]!) continue;
          pose[m * 4] = l[o]!;
          pose[m * 4 + 1] = l[o + 1]!;
          pose[m * 4 + 2] = l[o + 2]!;
          pose[m * 4 + 3] = l[o + 3]!;
          shape[m * 4] = l[o + 4]!;
          shape[m * 4 + 1] = l[o + 5]!;
          shape[m * 4 + 2] = l[o + 6]!;
          shape[m * 4 + 3] = l[o + 7]!;
          tint[m * 3] = l[o + 8]!;
          tint[m * 3 + 1] = l[o + 9]!;
          tint[m * 3 + 2] = l[o + 10]!;
          m++;
        }
      });
      for (const a of [kind.pose, kind.shape, kind.tint]) {
        a.clearUpdateRanges();
        a.addUpdateRange(0, m * a.itemSize);
        a.needsUpdate = true;
      }
      kind.mesh.geometry.instanceCount = m;
      kind.mesh.visible = m > 0;
      instances += m;
    });
  };

  const viewDir = new THREE.Vector3(),
    look = new THREE.Vector3();
  return {
    root,
    update(camera, ground, full = false) {
      const r = uniforms.uRange.value;
      const cam = camera.position;
      uniforms.uCamera.value.copy(cam);
      uniforms.uTime.value = (performance.now() / 1000) % 3600;
      uniforms.uGround.value = ground;
      uniforms.uGroundOn.value = ground ? 1 : 0;
      viewDir.copy(sun.direction).transformDirection(camera.matrixWorldInverse);
      uniforms.uSunView.value.copy(viewDir);
      // Off, or from the air (nothing within reach is near enough to see).
      if (r <= 0 || cam.y - world.hf.heightAt(cam.x, cam.z) > r * 0.8) {
        if (instances) off();
        lastCx = NaN;
        return;
      }
      const cx = Math.floor(cam.x / GRASS.cell),
        cz = Math.floor(cam.z / GRASS.cell);
      if (cx !== lastCx || cz !== lastCz || r !== lastRange) {
        lastCx = cx;
        lastCz = cz;
        lastRange = r;
        const n = Math.ceil(r / GRASS.cell) + 1;
        wanted = [];
        for (let j = -n; j <= n; j++)
          for (let i = -n; i <= n; i++) {
            const x = (cx + i + 0.5) * GRASS.cell,
              z = (cz + j + 0.5) * GRASS.cell;
            const d = Math.hypot(x - cam.x, z - cam.z);
            if (d - GRASS.cell * 0.71 < r) wanted.push({ cx: cx + i, cz: cz + j, d });
          }
        wanted.sort((a, b) => a.d - b.d);
        dirty = true;
        // Forget cells well out of range.
        if (cells.size > wanted.length * 2)
          for (const [k, c] of cells)
            if (
              Math.hypot((c.cx + 0.5) * GRASS.cell - cam.x, (c.cz + 0.5) * GRASS.cell - cam.z) >
              r * 1.6
            )
              cells.delete(k);
      }
      let made = 0;
      for (const w of wanted) {
        if (made >= CELLS_PER_FRAME && !full) break;
        const k = key(w.cx, w.cz);
        if (cells.has(k)) continue;
        cells.set(k, { cx: w.cx, cz: w.cz, lists: scatter.cell(w.cx, w.cz) });
        made++;
        dirty = true;
      }
      // The view's heading (the cone the cells are kept in): rebuilt before this frame is drawn
      // once it has turned far enough that the cone's margin could run out.
      camera.getWorldDirection(look);
      camX = cam.x;
      camZ = cam.z;
      lookYaw = Math.atan2(look.x, look.z);
      if (
        Number.isNaN(builtYaw) ||
        Math.abs(Math.atan2(Math.sin(lookYaw - builtYaw), Math.cos(lookYaw - builtYaw))) > VIEW_TURN
      )
        dirty = true;
      if (dirty) {
        dirty = false;
        rebuild();
      }
    },
    setRange(m) {
      uniforms.uRange.value = Math.max(0, m);
    },
    stats() {
      let draws = 0,
        triangles = 0;
      for (const k of kinds)
        if (k.mesh.visible) {
          draws++;
          triangles += k.triangles * k.mesh.geometry.instanceCount;
        }
      return { instances, draws, triangles, cells: cells.size };
    },
    dispose() {
      for (const k of kinds) k.mesh.geometry.dispose();
      material.dispose();
      kit.atlas.dispose();
      root.removeFromParent();
    },
  };
}
