import * as THREE from "three";
import type { Placement } from "./layout";

/**
 * Buildings beyond their draw distance (render audit 2026-11-15). A building's far LOD ends at
 * 2.5–4 km (props-renderer.ts RINGS); from the plane more than half of the island's 7,000
 * buildings were past it and whole towns appeared out of nothing. Drawing their far LODs to the
 * horizon is two million triangles. Instead every building gets a proxy, all of them in ONE
 * static mesh and one draw call:
 *
 *  - The proxy is cut from the model's own far LOD: its footprint as a small grid whose corners
 *    take the height of the roof above them, with walls down to the ground round the edge. A
 *    gabled house keeps its ridge, a tower its height, a hall its long flat roof; roof and
 *    walls take the far LOD's own mean colours.
 *  - It stands exactly where the placement does (the same position and quarter turn), and is
 *    drawn only while the camera is beyond that model's far ring: the vertex shader folds
 *    every nearer building's proxy into a point, so a building is never drawn twice.
 *
 * Far scenery only: no proxy is ever shown within a ring (1.5 km at the least), so nothing in
 * the fight range changes, and nothing here has collision.
 */
export const FAR_BUILDINGS = {
  /** Ring classes that get a proxy. */
  classes: ["building", "dwelling", "shop", "outbuilding", "hero", "structure"],
  /** Metres of footprint per grid cell, and the most cells a side. */
  cell: 5,
  maxCells: 6,
  /** Models smaller than this (m: shortest side, height) or mostly air get none: masts, pylons. */
  minSide: 4,
  minHeight: 2.5,
  minCover: 0.45,
  /** A roofless model whose walls cover this share of its box's four sides is a box (a storey). */
  tubeWalls: 0.8,
  /** Walls reach this far below the model's base (m), into sloping ground. */
  skirt: 1.5,
} as const;

/** A model's proxy in model space. */
export type ProxyShape = {
  nx: number;
  nz: number;
  /** Footprint: min x, base y, min z, size x, size z. */
  box: [number, number, number, number, number];
  /** Roof height (model y) at each of the (nx + 1) × (nz + 1) grid corners, row by row in z. */
  heights: Float32Array;
  roof: [number, number, number];
  wall: [number, number, number];
};

const FINE = 4;

/** The proxy of a model from its far LOD (meshes with world matrices updated), or null. */
export function proxyShape(scene: THREE.Object3D): ProxyShape | null {
  const tris: number[] = [];
  const cols: number[] = [];
  const v = new THREE.Vector3(),
    c = new THREE.Color();
  const bounds = new THREE.Box3();
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const pos = mesh.geometry.getAttribute("position");
    const col = mesh.geometry.getAttribute("color");
    const index = mesh.geometry.index;
    const material = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as
      THREE.MeshStandardMaterial | undefined;
    const base = material?.color ?? c.setRGB(1, 1, 1);
    const n = index ? index.count : pos.count;
    for (let i = 0; i < n; i++) {
      const k = index ? index.getX(i) : i;
      v.fromBufferAttribute(pos, k).applyMatrix4(mesh.matrixWorld);
      tris.push(v.x, v.y, v.z);
      bounds.expandByPoint(v);
      if (col) cols.push(col.getX(k) * base.r, col.getY(k) * base.g, col.getZ(k) * base.b);
      else cols.push(base.r, base.g, base.b);
    }
  });
  if (tris.length < 9) return null;
  const sx = bounds.max.x - bounds.min.x,
    sz = bounds.max.z - bounds.min.z,
    sy = bounds.max.y - bounds.min.y;
  if (Math.min(sx, sz) < FAR_BUILDINGS.minSide || sy < FAR_BUILDINGS.minHeight) return null;
  const cells = (s: number) =>
    Math.max(1, Math.min(FAR_BUILDINGS.maxCells, Math.round(s / FAR_BUILDINGS.cell)));
  const nx = cells(sx),
    nz = cells(sz);
  const fx = nx * FINE,
    fz = nz * FINE;
  const top = new Float32Array(fx * fz).fill(-Infinity);
  const roof = [0, 0, 0, 0],
    wall = [0, 0, 0, 0];
  for (let t = 0; t < tris.length; t += 9) {
    const ax = tris[t]!,
      ay = tris[t + 1]!,
      az = tris[t + 2]!,
      bx = tris[t + 3]!,
      by = tris[t + 4]!,
      bz = tris[t + 5]!,
      cx = tris[t + 6]!,
      cy = tris[t + 7]!,
      cz = tris[t + 8]!;
    // Normal (unnormalised): its length is twice the triangle's area.
    const ux = bx - ax,
      uy = by - ay,
      uz = bz - az,
      wx = cx - ax,
      wy = cy - ay,
      wz = cz - az;
    const nxn = uy * wz - uz * wy,
      nyn = uz * wx - ux * wz,
      nzn = ux * wy - uy * wx;
    const area = Math.hypot(nxn, nyn, nzn);
    if (area < 1e-9) continue;
    const up = Math.abs(nyn) / area;
    const into = up > 0.5 ? roof : wall;
    for (let k = 0; k < 3; k++)
      into[k]! += ((cols[t + k]! + cols[t + 3 + k]! + cols[t + 6 + k]!) / 3) * area;
    into[3]! += area;
    if (up < 0.15) continue;
    // The highest surface over each fine cell's centre (and under each corner, for slivers).
    const gx = (x: number) => ((x - bounds.min.x) / sx) * fx,
      gz = (z: number) => ((z - bounds.min.z) / sz) * fz;
    const i0 = Math.max(0, Math.floor(Math.min(gx(ax), gx(bx), gx(cx)))),
      i1 = Math.min(fx - 1, Math.floor(Math.max(gx(ax), gx(bx), gx(cx)))),
      j0 = Math.max(0, Math.floor(Math.min(gz(az), gz(bz), gz(cz)))),
      j1 = Math.min(fz - 1, Math.floor(Math.max(gz(az), gz(bz), gz(cz))));
    const det = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
    for (let j = j0; j <= j1; j++)
      for (let i = i0; i <= i1; i++) {
        const px = bounds.min.x + ((i + 0.5) / fx) * sx,
          pz = bounds.min.z + ((j + 0.5) / fz) * sz;
        let y = -Infinity;
        if (Math.abs(det) > 1e-12) {
          const l1 = ((bz - cz) * (px - cx) + (cx - bx) * (pz - cz)) / det,
            l2 = ((cz - az) * (px - cx) + (ax - cx) * (pz - cz)) / det,
            l3 = 1 - l1 - l2;
          if (l1 >= -0.02 && l2 >= -0.02 && l3 >= -0.02) y = l1 * ay + l2 * by + l3 * cy;
        }
        if (y > top[j * fx + i]!) top[j * fx + i] = y;
      }
    for (const [x, y, z] of [
      [ax, ay, az],
      [bx, by, bz],
      [cx, cy, cz],
    ]) {
      const i = Math.min(fx - 1, Math.max(0, Math.floor(gx(x!)))),
        j = Math.min(fz - 1, Math.max(0, Math.floor(gz(z!))));
      if (y! > top[j * fx + i]!) top[j * fx + i] = y!;
    }
  }
  let covered = 0;
  for (let i = 0; i < top.length; i++) if (top[i]! > -Infinity) covered++;
  // Walls all round and no roof: a storey of a tower, whose lid is the storey placed on it (a
  // lid of its own shows through its walls from far off, build_condo.mjs farSlice). A box to its
  // top, in its walls' colour. (A mast or a pylon has no such walls: 80 % of the box's sides.)
  const tube =
    covered / top.length < FAR_BUILDINGS.minCover &&
    // (`wall[3]` is twice the walls' area: the normals' lengths.)
    wall[3]! / 2 >= FAR_BUILDINGS.tubeWalls * 2 * (sx + sz) * sy;
  if (tube) {
    top.fill(bounds.max.y);
    for (let k = 0; k < 4; k++) roof[k] = wall[k]!;
  } else if (covered / top.length < FAR_BUILDINGS.minCover || roof[3]! <= 0) return null;
  // Each grid corner: the highest roof in the fine cells that touch it.
  const heights = new Float32Array((nx + 1) * (nz + 1));
  for (let j = 0; j <= nz; j++)
    for (let i = 0; i <= nx; i++) {
      let y = -Infinity;
      for (let b = j * FINE - 1; b <= j * FINE; b++)
        for (let a = i * FINE - 1; a <= i * FINE; a++)
          if (a >= 0 && b >= 0 && a < fx && b < fz) y = Math.max(y, top[b * fx + a]!);
      heights[j * (nx + 1) + i] = y > -Infinity ? y : bounds.min.y;
    }
  const mean = (s: number[]): [number, number, number] => [
    s[0]! / s[3]!,
    s[1]! / s[3]!,
    s[2]! / s[3]!,
  ];
  const roofColour = mean(roof);
  return {
    nx,
    nz,
    box: [bounds.min.x, bounds.min.y, bounds.min.z, sx, sz],
    heights,
    roof: roofColour,
    wall: wall[3]! > 0 ? mean(wall) : roofColour,
  };
}

export type FarBuildings = {
  mesh: THREE.Mesh;
  triangles: number;
  buildings: number;
  /** The view distance's scale of the far rings (props-renderer.ts scaleRing). */
  setRingScale: (k: number) => void;
  dispose: () => void;
};

/**
 * One mesh of every placement's proxy. `shape(model)`: its proxy or null; `far(model)`: the
 * model's far ring (m) at view-distance scale 1; `minFar`: scaled rings never end nearer.
 */
export function createFarBuildings(
  placements: readonly Placement[],
  shape: (model: string) => ProxyShape | null | undefined,
  far: (model: string) => number,
  minFar: number,
): FarBuildings {
  let vertices = 0,
    indices = 0,
    buildings = 0;
  for (const p of placements) {
    const s = shape(p.model);
    if (!s) continue;
    buildings++;
    vertices += (s.nx + 1) * (s.nz + 1) + 8 * (s.nx + s.nz);
    indices += 6 * s.nx * s.nz + 12 * (s.nx + s.nz);
  }
  const position = new Float32Array(vertices * 3),
    site = new Float32Array(vertices * 4),
    colour = new Uint8Array(vertices * 4),
    index = new Uint32Array(indices);
  let vn = 0,
    ix = 0;
  // Linear colour to the 8 bits the attribute holds (a square root keeps the dark end).
  const byte = (x: number) => Math.round(255 * Math.sqrt(Math.min(1, Math.max(0, x))));
  for (const p of placements) {
    const s = shape(p.model);
    if (!s) continue;
    const a = (p.turn * Math.PI) / 2,
      cos = Math.cos(a),
      sin = Math.sin(a);
    const ring = far(p.model);
    const [x0, y0, z0, sx, sz] = s.box;
    const push = (lx: number, ly: number, lz: number, c: [number, number, number]) => {
      // three.js rotation about +y: x' = x cos a + z sin a, z' = −x sin a + z cos a.
      position[vn * 3] = p.x + lx * cos + lz * sin;
      position[vn * 3 + 1] = p.y + ly;
      position[vn * 3 + 2] = p.z - lx * sin + lz * cos;
      site[vn * 4] = p.x;
      site[vn * 4 + 1] = p.y;
      site[vn * 4 + 2] = p.z;
      site[vn * 4 + 3] = ring;
      colour[vn * 4] = byte(c[0]);
      colour[vn * 4 + 1] = byte(c[1]);
      colour[vn * 4 + 2] = byte(c[2]);
      colour[vn * 4 + 3] = 255;
      return vn++;
    };
    const at = (i: number, j: number) => [x0 + (i / s.nx) * sx, z0 + (j / s.nz) * sz] as const;
    const h = (i: number, j: number) => s.heights[j * (s.nx + 1) + i]!;
    // Roof.
    const first = vn;
    for (let j = 0; j <= s.nz; j++)
      for (let i = 0; i <= s.nx; i++) {
        const [x, z] = at(i, j);
        push(x, h(i, j), z, s.roof);
      }
    for (let j = 0; j < s.nz; j++)
      for (let i = 0; i < s.nx; i++) {
        const k = first + j * (s.nx + 1) + i;
        index[ix++] = k;
        index[ix++] = k + s.nx + 1;
        index[ix++] = k + s.nx + 2;
        index[ix++] = k;
        index[ix++] = k + s.nx + 2;
        index[ix++] = k + 1;
      }
    // Walls: each edge of the footprint, wound to face outwards.
    const wall = (i0: number, j0: number, i1: number, j1: number) => {
      const [xa, za] = at(i0, j0),
        [xb, zb] = at(i1, j1);
      const low = y0 - FAR_BUILDINGS.skirt;
      const ta = push(xa, h(i0, j0), za, s.wall),
        tb = push(xb, h(i1, j1), zb, s.wall),
        ba = push(xa, low, za, s.wall),
        bb = push(xb, low, zb, s.wall);
      index[ix++] = ta;
      index[ix++] = tb;
      index[ix++] = bb;
      index[ix++] = ta;
      index[ix++] = bb;
      index[ix++] = ba;
    };
    for (let i = 0; i < s.nx; i++) {
      wall(i, 0, i + 1, 0);
      wall(i + 1, s.nz, i, s.nz);
    }
    for (let j = 0; j < s.nz; j++) {
      wall(0, j + 1, 0, j);
      wall(s.nx, j, s.nx, j + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(position, 3));
  geometry.setAttribute("aSite", new THREE.BufferAttribute(site, 4));
  geometry.setAttribute("aTint", new THREE.BufferAttribute(colour, 4, true));
  geometry.setIndex(new THREE.BufferAttribute(index, 1));
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
  const ringK = { value: 1 };
  // Both faces: a quarter turn of a mirrored footprint must not show the inside of a wall.
  const material = new THREE.MeshStandardMaterial({
    roughness: 0.9,
    metalness: 0,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  material.name = "far-buildings";
  material.onBeforeCompile = (shader) => {
    shader.uniforms["uRingK"] = ringK;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        attribute vec4 aSite; // the placement (x, y, z) and its far ring (m)
        attribute vec4 aTint;
        uniform float uRingK;
        varying vec3 vFarTint;`,
      )
      .replace(
        "#include <begin_vertex>",
        `vec3 transformed = position;
        vFarTint = aTint.rgb * aTint.rgb;
        // Within its ring the model itself is drawn: this proxy folds into a point.
        if (distance(aSite.xyz, cameraPosition) <= max(${minFar.toFixed(1)}, aSite.w * min(uRingK, 1.25)))
          transformed = aSite.xyz;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vFarTint;")
      .replace(
        "#include <color_fragment>",
        "#include <color_fragment>\ndiffuseColor.rgb *= vFarTint;",
      );
  };
  material.customProgramCacheKey = () => `br-far-buildings-${minFar}`;
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "br-far-buildings";
  mesh.frustumCulled = false;
  mesh.matrixAutoUpdate = false;
  return {
    mesh,
    triangles: indices / 3,
    buildings,
    setRingScale(k) {
      ringK.value = k;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
