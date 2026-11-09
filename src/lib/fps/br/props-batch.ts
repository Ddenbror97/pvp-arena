import * as THREE from "three";

/**
 * Far-LOD batching for the props (2026-11-09, real-GPU benchmark): about 200 instanced draws a
 * frame cost 55–60 % of the world's CPU submission time on the owner's laptop. The far LODs
 * (1 and 2) of most models share one untextured, vertex-coloured material, so all of them can
 * be one BatchedMesh, drawn with WebGL multi-draw in a single call per material.
 *
 * Only LODs that are a single mesh with an opaque, untextured MeshStandardMaterial are batched;
 * everything else (the textured near LODs, coloured or emissive far LODs) stays instanced.
 * Geometry is normalised so every member shares one vertex layout: float positions with the
 * node transform (the KHR_mesh_quantization dequantisation) baked in, float normals and colours
 * where the group has them, 32-bit indices.
 */
export type BatchMember = {
  /** The LOD's single instanced mesh (its geometry and node transform are copied). */
  mesh: THREE.InstancedMesh;
  /** The mesh's node transform in the GLTF (dequantisation and placement within the model). */
  local: THREE.Matrix4;
  /** Placements that may use this LOD (the batch's instance capacity). */
  placements: number;
  /** The model this LOD belongs to (several LODs of one model share their instances' room). */
  model: string;
};

export type Batch = {
  mesh: THREE.BatchedMesh;
  /** Per member, in input order: its geometry id in `mesh`, or -1 when it was not batched. */
  geometry: number[];
};

/** Whether a material can be shared by a batch: opaque, untextured, standard. */
export function batchable(material: THREE.Material | THREE.Material[]): boolean {
  if (Array.isArray(material)) return false;
  const m = material as THREE.MeshStandardMaterial;
  if (!m.isMeshStandardMaterial || (m as THREE.MeshPhysicalMaterial).isMeshPhysicalMaterial)
    return false;
  if (m.transparent || m.alphaTest > 0 || m.opacity < 1 || m.alphaToCoverage) return false;
  if (m.emissive.getHex() !== 0) return false;
  for (const v of Object.values(m)) if (v instanceof THREE.Texture) return false;
  return true;
}

function materialKey(m: THREE.MeshStandardMaterial, g: THREE.BufferGeometry) {
  return [
    m.side,
    m.flatShading,
    m.vertexColors,
    m.color.getHexString(),
    m.roughness.toFixed(3),
    m.metalness.toFixed(3),
    m.wireframe,
    !!g.attributes["normal"],
    !!g.attributes["color"] && m.vertexColors,
  ].join("|");
}

/** A copy in the shared layout: float position (node transform applied), normal, colour. */
function normalise(
  g: THREE.BufferGeometry,
  local: THREE.Matrix4,
  withNormal: boolean,
  withColor: boolean,
) {
  const src = g.attributes["position"] as THREE.BufferAttribute;
  const n = src.count;
  const out = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = src.getX(i);
    pos[i * 3 + 1] = src.getY(i);
    pos[i * 3 + 2] = src.getZ(i);
  }
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  if (withNormal) {
    const s = g.attributes["normal"] as THREE.BufferAttribute;
    const nrm = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      nrm[i * 3] = s.getX(i);
      nrm[i * 3 + 1] = s.getY(i);
      nrm[i * 3 + 2] = s.getZ(i);
    }
    out.setAttribute("normal", new THREE.BufferAttribute(nrm, 3));
  }
  if (withColor) {
    const s = g.attributes["color"] as THREE.BufferAttribute;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      col[i * 3] = s.getX(i);
      col[i * 3 + 1] = s.getY(i);
      col[i * 3 + 2] = s.getZ(i);
    }
    out.setAttribute("color", new THREE.BufferAttribute(col, 3));
  }
  const index = g.index;
  const idx = new Uint32Array(index ? index.count : n);
  for (let i = 0; i < idx.length; i++) idx[i] = index ? index.getX(i) : i;
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  out.applyMatrix4(local); // positions and, through the normal matrix, normals
  return out;
}

/**
 * Group the members by material and layout and build one BatchedMesh per group of two or more.
 * Members left out (a group of one, or not batchable) get geometry id -1 in every batch.
 */
export function buildBatches(members: BatchMember[]): Array<Batch & { members: number[] }> {
  const groups = new Map<string, number[]>();
  members.forEach((m, i) => {
    if (!batchable(m.mesh.material)) return;
    const key = materialKey(m.mesh.material as THREE.MeshStandardMaterial, m.mesh.geometry);
    let list = groups.get(key);
    if (!list) groups.set(key, (list = []));
    list.push(i);
  });
  const batches: Array<Batch & { members: number[] }> = [];
  for (const [key, list] of groups) {
    if (list.length < 2) continue;
    const [, , , , , , , normal, color] = key.split("|");
    const withNormal = normal === "true",
      withColor = color === "true";
    const geometries = list.map((i) =>
      normalise(members[i]!.mesh.geometry, members[i]!.local, withNormal, withColor),
    );
    let vertices = 0,
      indices = 0;
    for (const g of geometries) {
      vertices += g.attributes["position"]!.count;
      indices += g.index!.count;
    }
    // Each placement draws at most one LOD of its model: room for every placement once.
    const capacity = new Map<string, number>();
    for (const i of list) capacity.set(members[i]!.model, members[i]!.placements);
    let instances = 0;
    for (const c of capacity.values()) instances += c;
    const material = (members[list[0]!]!.mesh.material as THREE.MeshStandardMaterial).clone();
    material.name = "props-batch";
    const mesh = new THREE.BatchedMesh(instances, vertices, indices, material);
    mesh.name = `br-props-batch-${batches.length}`;
    // Placements are static and the whole set was drawn before (no culling): the draw list is
    // rebuilt only when visibility changes, at the props' reselect.
    mesh.perObjectFrustumCulled = false;
    mesh.sortObjects = false;
    mesh.frustumCulled = false;
    const geometry = members.map(() => -1);
    list.forEach((i, k) => {
      geometry[i] = mesh.addGeometry(geometries[k]!);
      geometries[k]!.dispose();
    });
    batches.push({ mesh, geometry, members: list });
  }
  return batches;
}
