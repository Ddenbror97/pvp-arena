import * as THREE from "three";
import { DEPTH_PULL, pullDepth } from "./depth-bias";
import type { Heightfield } from "./heightfield";
import { INTERIOR_STYLE } from "./interior-style";
import type { Placement } from "./layout";
import { turnPoint } from "./loot-spots";
import type { CollisionData } from "./static-world";
import { WORLD_HALF } from "./world";

/**
 * Floors the ground rises through (owner, 2026-11-23: "fix rest still not fixed"; 2026-11-22:
 * "buildings with no colors on the walls or floor"). A building stands at the lowest ground
 * under it (layout.ts groundPlacer), so where the ground rises inside it the terrain covers
 * the floor, and the room's floor is grass or dirt: the rail depot over 95 % of its floor, the
 * coastal houses over a quarter to two thirds, the cabins over a sixth. Players already walk
 * on that ground (it is higher than the floor), so it is drawn as floor: a patch laid on the
 * ground in 1 m cells wherever it stands over the building's floor, planks, concrete or stone
 * by the building's kind (interior-style.ts). Render only: what the player stands on is
 * unchanged.
 */
export const FLOOR_PATCH = {
  /** Over the drawn ground (m), and over the floor where a cell straddles its edge. */
  lift: 0.02,
  /** Floor boxes: top within this of the placement's base (m), at least this wide. */
  topMin: -0.3,
  topMax: 1.2,
  minSide: 1.5,
  /** The patches draw within this of the camera (m); tiles of this side (m). */
  range: 450,
  tile: 160,
} as const;

/** A building floor (world rect, its top) and where the ground stands above it. */
export type BuriedFloor = {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  y: number;
  kind: 0 | 1 | 2;
  seed: number;
};

const KIND = (model: string): 0 | 1 | 2 => {
  // (The fort's rooms are stone.)
  if (model.startsWith("fort-")) return 2;
  const k = INTERIOR_STYLE[model];
  return k === "works" ? 1 : k === "hall" ? 2 : 0;
};

/**
 * The ground as the terrain draws it (its cells are two triangles, split either way between
 * its levels of detail): the higher of the two (structures-renderer.ts drawn).
 */
export function drawnGround(hf: Heightfield) {
  return (x: number, z: number) => {
    const gx = (x + WORLD_HALF) / hf.spacing,
      gz = (z + WORLD_HALF) / hf.spacing;
    const i = Math.min(hf.width - 2, Math.max(0, Math.floor(gx))),
      j = Math.min(hf.height - 2, Math.max(0, Math.floor(gz)));
    const fx = gx - i,
      fz = gz - j;
    const o = j * hf.width + i;
    const h00 = hf.data[o]!,
      h10 = hf.data[o + 1]!,
      h01 = hf.data[o + hf.width]!,
      h11 = hf.data[o + hf.width + 1]!;
    return Math.max(
      fx + fz <= 1
        ? h00 + (h10 - h00) * fx + (h01 - h00) * fz
        : h11 + (h01 - h11) * (1 - fx) + (h10 - h11) * (1 - fz),
      fx >= fz
        ? h00 + (h10 - h00) * fx + (h11 - h10) * fz
        : h00 + (h11 - h01) * fx + (h01 - h00) * fz,
    );
  };
}

/** The building floors with ground standing over them somewhere (sampled every metre). */
export function buriedFloors(
  layout: Placement[],
  collision: CollisionData,
  ground: (x: number, z: number) => number,
  isBuilding: (model: string) => boolean,
): BuriedFloor[] {
  const out: BuriedFloor[] = [];
  layout.forEach((p, n) => {
    // (Not the ruins: their rooms are open to the ground, grass and all; owner, 2026-11-23:
    // "the ruins should not have floor".)
    if (!isBuilding(p.model) || p.model.startsWith("ruin-")) return;
    for (const b of collision.models[p.model] ?? []) {
      const top = b[4]!;
      if (top < FLOOR_PATCH.topMin || top > FLOOR_PATCH.topMax) continue;
      if (b[3]! - b[0]! < FLOOR_PATCH.minSide || b[5]! - b[2]! < FLOOR_PATCH.minSide) continue;
      const [ax, az] = turnPoint(b[0]!, b[2]!, p.turn),
        [bx, bz] = turnPoint(b[3]!, b[5]!, p.turn);
      const f: BuriedFloor = {
        x0: p.x + Math.min(ax, bx),
        z0: p.z + Math.min(az, bz),
        x1: p.x + Math.max(ax, bx),
        z1: p.z + Math.max(az, bz),
        y: p.y + top,
        kind: KIND(p.model),
        seed: ((n * 2654435761) >>> 0) / 4294967296,
      };
      let over = false;
      for (let x = f.x0 + 0.25; x < f.x1 && !over; x += 1)
        for (let z = f.z0 + 0.25; z < f.z1 && !over; z += 1)
          if (ground(x, z) > f.y + 0.01) over = true;
      if (over) out.push(f);
    }
  });
  return out;
}

/** Cells of 1 m (each floor's side divided evenly), their corners on the ground or the floor. */
export function patchGeometry(floors: BuriedFloor[], ground: (x: number, z: number) => number) {
  const pos: number[] = [],
    info: number[] = [],
    index: number[] = [];
  const done: BuriedFloor[] = [];
  // Lowest floors first: a cell another floor already covers is not drawn twice.
  for (const f of [...floors].sort((a, b) => a.y - b.y)) {
    const nx = Math.max(1, Math.ceil(f.x1 - f.x0)),
      nz = Math.max(1, Math.ceil(f.z1 - f.z0));
    const sx = (f.x1 - f.x0) / nx,
      sz = (f.z1 - f.z0) / nz;
    const lift = FLOOR_PATCH.lift + 0.003 * (done.length % 3);
    const h = (x: number, z: number) => Math.max(ground(x, z), f.y) + lift;
    for (let i = 0; i < nx; i++)
      for (let k = 0; k < nz; k++) {
        const x0 = f.x0 + i * sx,
          z0 = f.z0 + k * sz;
        const c = [
          [x0, z0],
          [x0 + sx, z0],
          [x0 + sx, z0 + sz],
          [x0, z0 + sz],
        ] as const;
        // A cell wholly on a lower floor's patch is not drawn twice.
        const within = (d: BuriedFloor) =>
          c.every(
            ([x, z]) =>
              x >= d.x0 - 1e-6 && x <= d.x1 + 1e-6 && z >= d.z0 - 1e-6 && z <= d.z1 + 1e-6,
          );
        if (done.some(within)) continue;
        // Only where the ground stands over the floor somewhere in the cell (its corners, its
        // edges' middles and its middle: a crest between two terrain samples).
        let over = false;
        for (const u of [0, 0.5, 1])
          for (const v of [0, 0.5, 1])
            if (ground(x0 + sx * u, z0 + sz * v) > f.y + 0.005) over = true;
        if (!over) continue;
        const base = pos.length / 3;
        for (const [x, z] of c) {
          pos.push(x, h(x, z), z);
          info.push(f.kind, f.seed);
        }
        index.push(base, base + 2, base + 1, base, base + 3, base + 2);
      }
    done.push(f);
  }
  return { pos, info, index };
}

/** The patches' look: planks (homes, shops, offices), concrete (works), stone flags (halls). */
const PATCH_GLSL = `
  float fpHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  vec3 fpFloor(vec2 uv, float kind, float seed) {
    if (kind < 0.5) {
      // Planks 0.16 m wide along x, butt joints staggered per board.
      float board = floor(uv.y / 0.16);
      float len = 1.8 + 0.9 * fpHash(vec2(board, seed));
      float u = uv.x + fpHash(vec2(seed, board)) * len;
      float plank = floor(u / len);
      float gv = fract(uv.y / 0.16), gu = fract(u / len);
      float joint = step(0.04, gv) * step(0.006, gu);
      vec3 wood = mix(vec3(0.36, 0.22, 0.12), vec3(0.55, 0.38, 0.22), seed);
      return wood * (0.82 + 0.3 * fpHash(vec2(board, plank))) * mix(0.55, 1.0, joint);
    }
    if (kind < 1.5) {
      // Concrete slabs 3 m square with saw cuts, mottled.
      vec2 f = fract(uv / 3.0);
      float cut = step(0.006, f.x) * step(0.006, f.y);
      vec3 c = mix(vec3(0.42, 0.42, 0.4), vec3(0.6, 0.58, 0.54), seed);
      return c * (0.93 + 0.07 * fpHash(floor(uv * 1.7))) * mix(0.62, 1.0, cut);
    }
    // Stone flags 0.6 m by 0.9 m in courses.
    float row = floor(uv.y / 0.6);
    float u = uv.x + 0.45 * mod(row, 2.0);
    vec2 cell = vec2(floor(u / 0.9), row);
    float joint = step(0.02, fract(u / 0.9)) * step(0.03, fract(uv.y / 0.6));
    vec3 st = mix(vec3(0.62, 0.6, 0.56), vec3(0.74, 0.68, 0.56), seed);
    return st * (0.84 + 0.22 * fpHash(cell)) * mix(0.55, 1.0, joint);
  }
`;

export type FloorPatches = {
  root: THREE.Group;
  floors: number;
  update(camera: THREE.Camera): void;
};

/** The patches in tiles, each drawn only near the camera. */
export function createFloorPatches(
  layout: Placement[],
  collision: CollisionData,
  hf: Heightfield,
  isBuilding: (model: string) => boolean,
): FloorPatches {
  const ground = drawnGround(hf);
  const floors = buriedFloors(layout, collision, ground, isBuilding);
  const root = new THREE.Group();
  root.name = "br-floor-patches";
  const material = new THREE.MeshStandardMaterial({
    roughness: 0.85,
  });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nattribute vec2 fpInfo;\nvarying vec2 vFpInfo;\nvarying vec2 vFpWorld;",
      )
      .replace(
        "#include <worldpos_vertex>",
        "#include <worldpos_vertex>\nvFpInfo = fpInfo;\nvFpWorld = (modelMatrix * vec4(transformed, 1.0)).xz;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>\nvarying vec2 vFpInfo;\nvarying vec2 vFpWorld;\n${PATCH_GLSL}`,
      )
      .replace(
        "#include <color_fragment>",
        "#include <color_fragment>\ndiffuseColor.rgb = pow(fpFloor(vFpWorld, vFpInfo.x, vFpInfo.y), vec3(2.2));",
      );
  };
  material.customProgramCacheKey = () => "br-floor-patches-v1";
  // Over the ground without drawing over the walls, doors and furniture standing on the
  // floor (depth-bias.ts).
  pullDepth(material, DEPTH_PULL.paved);
  // Tiles by the floors' centres.
  const tiles = new Map<string, BuriedFloor[]>();
  for (const f of floors) {
    const key = `${Math.floor((f.x0 + f.x1) / 2 / FLOOR_PATCH.tile)},${Math.floor((f.z0 + f.z1) / 2 / FLOOR_PATCH.tile)}`;
    const list = tiles.get(key) ?? [];
    list.push(f);
    tiles.set(key, list);
  }
  const meshes: Array<{ mesh: THREE.Mesh; cx: number; cz: number }> = [];
  for (const list of tiles.values()) {
    const { pos, info, index } = patchGeometry(list, ground);
    if (!index.length) continue;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("fpInfo", new THREE.Float32BufferAttribute(info, 2));
    g.setIndex(index);
    g.computeVertexNormals();
    g.computeBoundingSphere();
    const mesh = new THREE.Mesh(g, material);
    mesh.name = "br-floor-patch";
    mesh.visible = false;
    root.add(mesh);
    const c = g.boundingSphere!.center;
    meshes.push({ mesh, cx: c.x, cz: c.z });
  }
  const reach = FLOOR_PATCH.range + FLOOR_PATCH.tile;
  return {
    root,
    floors: floors.length,
    update(camera) {
      const p = camera.position;
      for (const m of meshes) m.mesh.visible = Math.hypot(m.cx - p.x, m.cz - p.z) < reach;
    },
  };
}
