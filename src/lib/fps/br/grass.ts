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
 * - **Part of the map, never growing in.** Every clump stands out to 55 % of the range (82 m
 *   at the standard tier); past that the field thins (the kept clumps widened, so it still
 *   reads as grass) and the range's last 18 % fades out, where a clump is a few pixels tall.
 *   The cells there are scattered ahead of the player (24 m plus 1.5 s of the camera's speed:
 *   a car's road is ready long before it gets there), and any missing on the full-density
 *   ground are scattered before the frame is drawn, whatever it costs.
 *
 * Cost: one draw call per kind of clump in range (16 kinds), one shared material and atlas;
 * at the standard range about 0.6–1.6 million triangles on open grass (owner: "even if it makes
 * the GPU/fps its fine"). The instance buffers are rebuilt every 4 m of movement, from cells
 * already scattered.
 * Purely cosmetic (no collision) and the same for every player.
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

/**
 * Range (m) by graphics tier (owner, 2026-11-12: "Fix so the gras is begin displayed on far
 * distance, it looks broken running around and see the gras ticking up spawning infront of the
 * character, also looks bad driving a car"). The grass used to end at 26–52 m, and the clumps
 * between 10 m and there grew in as you came: right in front of you. It now reaches 150 m, and
 * the thinning is spread over all of it (below), so nothing grows up near the player. Not
 * shortened when the frame budget steps down (2026-11-13: the grass is part of the map).
 */
export const GRASS_RANGE: Record<BrTier, number> = { standard: 150, balanced: 130, low: 100 };
/**
 * The distance thinning (owner, 2026-11-13: "the gras that sticks up from the ground still loads
 * in late. should be a part of the map, should never render/load in late … even if it makes the
 * GPU/fps its fine"): every clump stands out to NEAR_SHARE of the range (82 m at the standard
 * tier, where a clump is a few pixels tall); past it the share kept falls as (near / d)², and
 * each clump kept is drawn wider by 1 / √share (up to WIDEN), so the field thins out with
 * distance instead of clumps appearing. A clump comes or goes as the share passes its own random
 * number, over a 15 % band, out there only. The distance is the eye's (3D): coming down from
 * the air the grass fills in from far away, never all at once.
 */
const NEAR_SHARE = 0.55;
const FLOOR = 0.035;
const WIDEN = 3;
/** The range's last share, where the grass fades to nothing. */
const EDGE = 0.18;
/**
 * Cells kept round the view's heading (rad from it, either side): the widest view (a 16:9
 * screen at the game's 75° field of view is 53° either side; the zoomed out third-person views
 * a little more) plus a margin, and how far the view may turn before the set is rebuilt (the
 * rebuild runs before that frame is drawn, so a flick never shows bare ground). Cells within two
 * cells of the camera are always kept (looking down at your feet).
 */
const VIEW_CONE = (115 * Math.PI) / 180;
const VIEW_TURN = (40 * Math.PI) / 180;
/** Time (ms) a frame may spend scattering new cells beyond the full-density ground (nearest
 * first; at least one a frame). Cells within it that are missing (a respawn, a teleport) are
 * all scattered before the frame is drawn, whatever it costs: grass never grows in near. */
const SCATTER_MS = 4;
/**
 * Cells are scattered ahead of the range: LOOKAHEAD m always, and the distance covered in
 * LOOKAHEAD_S s at the speed the camera moves (a car at 30 m/s: 34 m), so the ground the player
 * reaches is ready before it is in view. Cells are made only as fine as their distance needs
 * (`upTo`) and refined as the camera nears.
 */
const LOOKAHEAD = 24;
const LOOKAHEAD_S = 1.5;
/** The camera moves at most this far (m) between rebuilds of the instance buffers. */
const REBUILD_M = 4;
/** The refinement steps (share of clumps a cell holds). */
const LEVELS = [FLOOR + 0.015, 0.1, 0.25, 0.55, 1] as const;

/** Where every clump still stands (m), for a range. */
export const grassNear = (range: number) => range * NEAR_SHARE;
/** Share kept at distance `d` with every clump standing within `near`, the same in the shader. */
export const grassKeep = (d: number, near: number) =>
  d <= near ? 1 : Math.max(FLOOR, (near / d) * (near / d));

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
    uNear: { value: grassNear(range) },
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
        uniform float uNear;
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
        // into the ground as it goes; the kept ones wider so the cover holds; the range's last
        // metres fading out.
        float dist = distance(iPose.xyz, uCamera);
        float keepShare = dist <= uNear ? 1.0 : max(${FLOOR.toFixed(3)}, uNear * uNear / (dist * dist));
        float show = smoothstep(iShape.w - 0.15 * keepShare, iShape.w, keepShare) * (1.0 - smoothstep(uRange * ${(1 - EDGE).toFixed(2)}, uRange, dist));
        p.xz *= min(${WIDEN.toFixed(1)}, inversesqrt(keepShare));
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

  const cells = new Map<number, { cx: number; cz: number; upTo: number; lists: Float32Array[] }>();
  const key = (cx: number, cz: number) => (cz + 2048) * 4096 + (cx + 2048);
  let wanted: Array<{ cx: number; cz: number; d: number; upTo: number }> = [];
  /** The camera's speed (m/s, smoothed) and where it was last frame. */
  let speed = 0,
    lastX = NaN,
    lastZ = NaN,
    lastAt = 0;
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
  let builtX = NaN,
    builtZ = NaN;
  const rebuild = () => {
    builtYaw = lookYaw;
    builtX = camX;
    builtZ = camZ;
    const r = uniforms.uRange.value;
    const totals = kinds.map(() => 0);
    // Count first (only what the distance keeps), then grow and fill.
    // Cells well behind the view are left out (VIEW_CONE): their keep share 0.
    // (Distances from where the camera is now, not where it was when the set was made.)
    for (const w of wanted)
      w.d = Math.hypot((w.cx + 0.5) * GRASS.cell - camX, (w.cz + 0.5) * GRASS.cell - camZ);
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
      // (A cell's nearest point, less a cell of slack: the camera may move that far before
      // the next rebuild, and what the shader keeps there must already be in the buffers.)
      if (w.d - GRASS.cell * 0.71 > r) return 0;
      return Math.min(
        1,
        grassKeep(Math.max(0, w.d - GRASS.cell * 0.71 - REBUILD_M), uniforms.uNear.value) + 0.004,
      );
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
        if (!keepAt[i]) return;
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
      // Off, or from the air (nothing within reach).
      if (r <= 0 || cam.y - world.hf.heightAt(cam.x, cam.z) > r) {
        if (instances) off();
        lastCx = NaN;
        return;
      }
      // The camera's speed, for how far ahead to scatter.
      const at = performance.now();
      if (!Number.isNaN(lastX) && at > lastAt) {
        const v = Math.hypot(cam.x - lastX, cam.z - lastZ) / ((at - lastAt) / 1000);
        // (A teleport or a respawn is not a speed.)
        if (v < 80) speed += (v - speed) * Math.min(1, (at - lastAt) / 400);
      }
      lastX = cam.x;
      lastZ = cam.z;
      lastAt = at;
      const ahead = LOOKAHEAD + speed * LOOKAHEAD_S;
      const nearAll = uniforms.uNear.value;
      const cx = Math.floor(cam.x / GRASS.cell),
        cz = Math.floor(cam.z / GRASS.cell);
      if (Math.hypot(cam.x - builtX, cam.z - builtZ) > REBUILD_M) dirty = true;
      if (cx !== lastCx || cz !== lastCz || r !== lastRange) {
        lastCx = cx;
        lastCz = cz;
        lastRange = r;
        const n = Math.ceil((r + ahead) / GRASS.cell) + 1;
        wanted = [];
        for (let j = -n; j <= n; j++)
          for (let i = -n; i <= n; i++) {
            const x = (cx + i + 0.5) * GRASS.cell,
              z = (cz + j + 0.5) * GRASS.cell;
            const d = Math.hypot(x - cam.x, z - cam.z);
            const near = Math.max(0, d - GRASS.cell * 0.71);
            if (near >= r + ahead) continue;
            // As fine as it will need to be by the time the camera is `ahead` m nearer.
            const need = Math.min(
              1,
              grassKeep(Math.max(0, near - ahead - REBUILD_M), nearAll) + 0.004,
            );
            wanted.push({ cx: cx + i, cz: cz + j, d, upTo: LEVELS.find((l) => l >= need) ?? 1 });
          }
        wanted.sort((a, b) => a.d - b.d);
        dirty = true;
        // Forget cells well out of range.
        if (cells.size > wanted.length * 1.5)
          for (const [k, c] of cells)
            if (
              Math.hypot((c.cx + 0.5) * GRASS.cell - cam.x, (c.cz + 0.5) * GRASS.cell - cam.z) >
              r + ahead + 48
            )
              cells.delete(k);
      }
      // Scatter (or refine) the nearest cells that need it: all of them on the full-density
      // ground (before this frame is drawn), beyond it within this frame's time.
      const until = at + SCATTER_MS;
      let made = 0;
      for (const w of wanted) {
        const must = w.d - GRASS.cell * 0.71 <= nearAll + REBUILD_M;
        if (!full && !must && made > 0 && performance.now() > until) break;
        const k = key(w.cx, w.cz);
        const have = cells.get(k);
        if (have && have.upTo >= w.upTo) continue;
        cells.set(k, { cx: w.cx, cz: w.cz, upTo: w.upTo, lists: scatter.cell(w.cx, w.cz, w.upTo) });
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
      uniforms.uNear.value = grassNear(uniforms.uRange.value);
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
