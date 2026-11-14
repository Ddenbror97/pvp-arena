import * as THREE from "three";
import type { Solid } from "../map";
import { patchDepthLayers } from "./depth-layers";

/**
 * Faces the map's Blender build left undressed, dressed at load (owner, 2026-11-14: "walls that
 * are invisible, you see through them" on Iron District). A gameplay solid with nothing drawn on
 * it is an invisible wall: it stops movement, bullets and sight while you see past it. Found by
 * scripts/fps/map-capture/see-through.mjs (from every standable spot) and checked face by face
 * against the shipped GLB. Until the GLB is rebuilt with these, the game draws them here: the
 * solid's box, a centimetre inside it (so whatever the build did draw on a face stays in front),
 * in one of the scene's own materials, its texture repeating every `tile` metres.
 */
export type ScenePatches = {
  /** Solids to clad in a scene material, from height `from` (m) to their top. */
  readonly clad?: ReadonlyArray<{
    readonly solid: string;
    readonly material: string;
    readonly from?: number;
    readonly tile?: number;
  }>;
  /** Solids to ring with a low wall `rim` metres thick (a basin whose model failed to draw). */
  readonly rim?: ReadonlyArray<{
    readonly solid: string;
    readonly material: string;
    readonly rim: number;
  }>;
  /** Nodes of the scene not to draw (a model that came out broken). */
  readonly hide?: readonly string[];
};

const INSET = 0.01;

/** A box (min and max corners) with UVs in world metres / `tile` on every face. */
function boxGeometry(lo: THREE.Vector3, hi: THREE.Vector3, tile: number) {
  const positions: number[] = [],
    normals: number[] = [],
    uvs: number[] = [],
    index: number[] = [];
  const corner = (ax: number, side: number, u: number, v: number) => {
    const p = [0, 0, 0];
    const [a, b] = [0, 1, 2].filter((k) => k !== ax) as [number, number];
    p[ax] = side ? hi.getComponent(ax) : lo.getComponent(ax);
    p[a] = u ? hi.getComponent(a) : lo.getComponent(a);
    p[b] = v ? hi.getComponent(b) : lo.getComponent(b);
    return p as [number, number, number];
  };
  for (let ax = 0; ax < 3; ax++)
    for (const side of [0, 1]) {
      const [a, b] = [0, 1, 2].filter((k) => k !== ax) as [number, number];
      const base = positions.length / 3;
      for (const [u, v] of [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ] as const) {
        const p = corner(ax, side, u, v);
        positions.push(...p);
        const n = [0, 0, 0];
        n[ax] = side ? 1 : -1;
        normals.push(...n);
        // Walls: along the face horizontally, and up; floors and tops: x and z.
        const across = ax === 1 ? p[0] : ax === 0 ? p[2] : p[0];
        const up = ax === 1 ? p[2] : p[1];
        uvs.push(across / tile, up / tile);
      }
      // Wound to face outward.
      const outward = (side === 1) === ((a + 1) % 3 === b);
      if (outward) index.push(base, base + 1, base + 2, base, base + 2, base + 3);
      else index.push(base, base + 2, base + 1, base, base + 3, base + 2);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(index);
  return g;
}

/**
 * Apply `patches` to a loaded map scene. Returns what was made, for the caller to dispose.
 */
export function applyScenePatches(
  root: THREE.Object3D,
  patches: ScenePatches,
  solids: readonly Solid[],
) {
  const made = { geometries: [] as THREE.BufferGeometry[], materials: [] as THREE.Material[] };
  const byName = new Map<string, THREE.Material>();
  root.traverse((o) => {
    const m = (o as THREE.Mesh).material;
    for (const mat of Array.isArray(m) ? m : m ? [m] : [])
      if (!byName.has(mat.name)) byName.set(mat.name, mat);
  });
  for (const name of patches.hide ?? []) {
    const node = root.getObjectByName(name);
    if (node) node.visible = false;
  }
  const solid = (id: string) => solids.find((s) => s.id === id);
  const plain = new Map<string, THREE.Material>();
  /** The scene's material, without the per-vertex shading its own meshes carry. */
  const material = (name: string) => {
    let m = plain.get(name);
    if (!m) {
      const source = byName.get(name);
      if (!source) return null;
      m = source.clone();
      (m as THREE.MeshStandardMaterial).vertexColors = false;
      // (onBeforeCompile is not cloned: an open-backed map's backs recede here too.)
      if (m.userData["recedeBacks"]) patchDepthLayers(m);
      plain.set(name, m);
      made.materials.push(m);
    }
    return m;
  };
  const group = new THREE.Group();
  group.name = "scene-patches";
  const add = (lo: THREE.Vector3, hi: THREE.Vector3, mat: THREE.Material, tile: number) => {
    const g = boxGeometry(lo, hi, tile);
    made.geometries.push(g);
    const mesh = new THREE.Mesh(g, mat);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
  };
  for (const c of patches.clad ?? []) {
    const s = solid(c.solid),
      mat = material(c.material);
    if (!s || !mat) continue;
    const y0 = Math.max(s.y - s.h / 2, c.from ?? -Infinity);
    add(
      new THREE.Vector3(s.x - s.w / 2 + INSET, y0 + INSET, s.z - s.d / 2 + INSET),
      new THREE.Vector3(s.x + s.w / 2 - INSET, s.y + s.h / 2 - INSET, s.z + s.d / 2 - INSET),
      mat,
      c.tile ?? 2.5,
    );
  }
  for (const r of patches.rim ?? []) {
    const s = solid(r.solid),
      mat = material(r.material);
    if (!s || !mat) continue;
    const [x0, x1, y0, y1, z0, z1] = [
      s.x - s.w / 2 + INSET,
      s.x + s.w / 2 - INSET,
      s.y - s.h / 2,
      s.y + s.h / 2 - INSET,
      s.z - s.d / 2 + INSET,
      s.z + s.d / 2 - INSET,
    ];
    const t = r.rim;
    for (const [a, b] of [
      [new THREE.Vector3(x0, y0, z0), new THREE.Vector3(x1, y1, z0 + t)],
      [new THREE.Vector3(x0, y0, z1 - t), new THREE.Vector3(x1, y1, z1)],
      [new THREE.Vector3(x0, y0, z0 + t), new THREE.Vector3(x0 + t, y1, z1 - t)],
      [new THREE.Vector3(x1 - t, y0, z0 + t), new THREE.Vector3(x1, y1, z1 - t)],
    ] as const)
      add(a, b, mat, 1.5);
  }
  if (group.children.length) {
    group.updateMatrixWorld(true);
    group.traverse((o) => (o.matrixAutoUpdate = false));
    root.add(group);
  }
  return made;
}
