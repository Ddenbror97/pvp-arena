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
  stats(): {
    instances: number;
    draws: number;
    triangles: number;
    cells: number;
    /** Times the instance buffers were rebuilt (and uploaded) so far. */
    rebuilds: number;
  };
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
const SCATTER_MS = 2;
/**
 * Cells are scattered ahead of the range: LOOKAHEAD m always, and the distance covered in
 * LOOKAHEAD_S s at the speed the camera moves (a car at 30 m/s: 34 m), so the ground the player
 * reaches is ready before it is in view. Cells are made only as fine as their distance needs
 * (`upTo`) and refined as the camera nears.
 */
const LOOKAHEAD = 24;
const LOOKAHEAD_S = 1.5;
/**
 * The camera moves at most this far (m) between rebuilds of the instance buffers: REBUILD_M on
 * foot, and further the faster it goes (REBUILD_S s of travel more, up to REBUILD_MAX), so a
 * car rebuilds three times a second, not eight. What a rebuild keeps reaches that much further.
 */
const REBUILD_M = 4;
const REBUILD_S = 0.2;
const REBUILD_MAX = 10;
/** Far cells scattered late join the buffers at most this often (ms). */
const LATE_MS = 250;
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

  /**
   * A scattered cell: per clump kind that grows in it, its instances (INSTANCE_FLOATS each) in
   * the order of their thinning numbers, so what any distance keeps is the head of the list.
   */
  type Cell = {
    cx: number;
    cz: number;
    upTo: number;
    parts: Array<{ kind: number; data: Float32Array }>;
  };
  const RANK = 7;
  /** Add what a scatter made (clumps numbered `from` and up) to a cell. */
  const addToCell = (cell: Cell, lists: Float32Array[]) => {
    lists.forEach((l, kind) => {
      const n = l.length / INSTANCE_FLOATS;
      if (!n) return;
      const order = Array.from({ length: n }, (_, i) => i).sort(
        (a, b) => l[a * INSTANCE_FLOATS + RANK]! - l[b * INSTANCE_FLOATS + RANK]!,
      );
      const have = cell.parts.find((p) => p.kind === kind);
      const base = have ? have.data.length : 0;
      const data = new Float32Array(base + l.length);
      // (What it had is numbered below everything a refinement adds.)
      if (have) data.set(have.data);
      order.forEach((from, to) =>
        data.set(
          l.subarray(from * INSTANCE_FLOATS, (from + 1) * INSTANCE_FLOATS),
          base + to * INSTANCE_FLOATS,
        ),
      );
      if (have) have.data = data;
      else cell.parts.push({ kind, data });
    });
  };
  const cells = new Map<number, Cell>();
  const key = (cx: number, cz: number) => (cz + 2048) * 4096 + (cx + 2048);
  let wanted: Array<{ cx: number; cz: number; d: number; upTo: number; cell: Cell | null }> = [];
  /** The camera's speed (m/s, smoothed) and where it was last frame. */
  let speed = 0,
    lastX = NaN,
    lastZ = NaN,
    lastAt = 0;
  let lastCx = NaN,
    lastCz = NaN,
    lastRange = -1,
    dirty = false,
    /** Cells in range were scattered since the last rebuild (not ones the near ground needs). */
    late = false,
    rebuiltAt = -Infinity,
    instances = 0,
    rebuilds = 0;
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
    builtZ = NaN,
    /** How far the camera may move before the next rebuild (m): what this one allowed for. */
    slack: number = REBUILD_M;
  /** The share of a cell's clumps the buffers hold for it from here (0: none of it). */
  const keepOf = (w: { cx: number; cz: number; d: number }, r: number) => {
    const reach = GRASS.cell * 0.71;
    if (w.d > GRASS.cell * 2) {
      // Cells well behind the view are left out (VIEW_CONE; a cell's own width, seen from
      // here, widens the cone a little).
      const ax = (w.cx + 0.5) * GRASS.cell - camX,
        az = (w.cz + 0.5) * GRASS.cell - camZ;
      const ahead = (ax * Math.sin(lookYaw) + az * Math.cos(lookYaw)) / w.d;
      if (ahead < Math.cos(Math.min(Math.PI, VIEW_CONE + reach / w.d))) return 0;
    }
    // (A cell's nearest point, less what the camera may move before the next rebuild: what
    // the shader keeps there must already be in the buffers.)
    if (w.d - reach > r) return 0;
    return Math.min(1, grassKeep(Math.max(0, w.d - reach - slack), uniforms.uNear.value) + 0.004);
  };
  /** Per kind: the lists this rebuild draws from and how many of each one's head. */
  const heads: Array<{ data: Float32Array[]; n: number[]; total: number }> = kinds.map(() => ({
    data: [],
    n: [],
    total: 0,
  }));
  const rebuild = () => {
    rebuilds++;
    builtYaw = lookYaw;
    builtX = camX;
    builtZ = camZ;
    slack = Math.min(REBUILD_MAX, REBUILD_M + speed * REBUILD_S);
    const r = uniforms.uRange.value;
    for (const h of heads) {
      h.data.length = 0;
      h.n.length = 0;
      h.total = 0;
    }
    // What the distance keeps of each cell: the head of each of its lists.
    for (const w of wanted) {
      if (!w.cell || !w.cell.parts.length) continue;
      const keep = keepOf(w, r);
      if (!keep) continue;
      for (const part of w.cell.parts) {
        const l = part.data;
        let n = l.length / INSTANCE_FLOATS;
        if (l[l.length - INSTANCE_FLOATS + RANK]! >= keep) {
          // The first clump the distance drops (the lists are short: a few clumps a cell).
          let lo = 0;
          while (lo < n) {
            const mid = (lo + n) >> 1;
            if (l[mid * INSTANCE_FLOATS + RANK]! < keep) lo = mid + 1;
            else n = mid;
          }
        }
        if (!n) continue;
        const h = heads[part.kind]!;
        h.data.push(l);
        h.n.push(n);
        h.total += n;
      }
    }
    instances = 0;
    kinds.forEach((kind, k) => {
      const h = heads[k]!;
      if (h.total > kind.capacity) {
        kind.capacity = Math.ceil(h.total * 1.4);
        // A new geometry, never larger attributes on the old one: three.js notes how many
        // instances a geometry's attributes held when it was first drawn and never draws more
        // from it (WebGLBindingStates `_maxInstanceCount`, as vegetation-renderer.ts found for
        // the trees). The buffers start small, so the clumps written last (the farthest) of a
        // kind that had outgrown its first size were not drawn at all.
        const old = kind.mesh.geometry;
        const g = new THREE.InstancedBufferGeometry();
        g.index = old.index;
        for (const [name, attr] of Object.entries(old.attributes))
          if (!name.startsWith("i")) g.setAttribute(name, attr);
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
        g.boundingSphere = old.boundingSphere;
        g.boundingBox = old.boundingBox;
        kind.mesh.geometry = g;
        old.dispose();
      }
      let m = 0;
      const pose = kind.pose.array as Float32Array,
        shape = kind.shape.array as Float32Array,
        tint = kind.tint.array as Float32Array;
      for (let s = 0; s < h.data.length; s++) {
        const l = h.data[s]!,
          end = h.n[s]! * INSTANCE_FLOATS;
        for (let o = 0; o < end; o += INSTANCE_FLOATS) {
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
      }
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
      if (Math.hypot(cam.x - builtX, cam.z - builtZ) > slack) dirty = true;
      if (cx !== lastCx || cz !== lastCz || r !== lastRange) {
        // (A new range is drawn at once; a new cell underfoot changes nothing that is drawn:
        // the buffers hold everything within the camera's reach until its next rebuild.)
        if (r !== lastRange || Number.isNaN(lastCx)) dirty = true;
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
              grassKeep(Math.max(0, near - ahead - REBUILD_MAX), nearAll) + 0.004,
            );
            wanted.push({
              cx: cx + i,
              cz: cz + j,
              d,
              upTo: LEVELS.find((l) => l >= need) ?? 1,
              cell: cells.get(key(cx + i, cz + j)) ?? null,
            });
          }
        wanted.sort((a, b) => a.d - b.d);
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
      if (late && at - rebuiltAt >= LATE_MS) dirty = true;
      // A frame that rebuilds the buffers scatters only what the near ground needs: the two
      // are this module's whole cost, and never both in one frame.
      const rebuilding = dirty;
      const until = at + SCATTER_MS;
      let made = 0;
      // (Distances from where the camera is now, not where it was when the set was made.)
      for (const w of wanted)
        w.d = Math.hypot((w.cx + 0.5) * GRASS.cell - cam.x, (w.cz + 0.5) * GRASS.cell - cam.z);
      for (const w of wanted) {
        const near = w.d - GRASS.cell * 0.71;
        const must = near <= nearAll + REBUILD_MAX;
        if (!full && !must && (rebuilding || (made > 0 && performance.now() > until))) break;
        const had = w.cell?.upTo ?? 0;
        if (had >= w.upTo) continue;
        // Only what the cell lacks: a refinement adds the clumps numbered above what it has.
        const cell = (w.cell ??= { cx: w.cx, cz: w.cz, upTo: 0, parts: [] });
        if (!had) cells.set(key(w.cx, w.cz), cell);
        addToCell(cell, scatter.cell(w.cx, w.cz, w.upTo, had));
        cell.upTo = w.upTo;
        made++;
        // The buffers are rebuilt for it only if they lack what it is drawn with from here.
        // Cells are scattered and refined ahead of need (LOOKAHEAD): the rebuild the camera's
        // own movement brings picks those up, well before they are wanted. (Each cell made
        // used to rebuild everything: several times a second in a car, eight milliseconds each.)
        if (near <= r && had < Math.min(1, grassKeep(Math.max(0, near - slack), nearAll) + 0.004)) {
          // Far cells still catching up (after a respawn, cells are scattered outward for some
          // seconds) are taken into the buffers a few times a second, not every frame.
          if (must) dirty = true;
          else late = true;
        }
      }
      if (dirty) {
        dirty = late = false;
        rebuiltAt = at;
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
      return { instances, draws, triangles, cells: cells.size, rebuilds };
    },
    dispose() {
      for (const k of kinds) k.mesh.geometry.dispose();
      material.dispose();
      kit.atlas.dispose();
      root.removeFromParent();
    },
  };
}
