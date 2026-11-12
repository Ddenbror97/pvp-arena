import * as THREE from "three";
import layers from "./depth-layers.json";

/**
 * Depth layers for the authored map scenes (owner, 2026-11-12: "flicker … on the frames on the
 * walls", both 5v5 maps). The kits lay trim, frames, plinths and decals in the plane of the wall
 * behind them, or a few millimetres proud of it, and neighbouring buildings' walls overlap in
 * one plane. Two faces in one plane fight for the depth test: which of them a pixel shows
 * depends on rounding and on the order they were drawn in, so it changes as the camera moves.
 *
 * `depth-layers.json` lists, per mesh, the triangles that are laid on something and how many
 * faces deep (art/blender/map06/find_coplanar.mjs writes it from the shipped GLB). Their
 * vertices carry that number (`depthLayer`), and the vertex shader moves them a few
 * depth-buffer steps towards the camera per layer: what a polygon offset does, but per vertex,
 * so a mesh stays one draw call. Nothing moves on screen (only depth changes), and the same
 * face wins in every pixel.
 *
 * The table goes with one build of the GLB (the map build scripts rewrite it, and
 * tests/fps-depth-layers.test.ts checks it against the shipped files); a mesh whose triangle
 * count no longer matches its entry is left as it is.
 */
type MeshLayers = {
  /** Triangles in the mesh the entry was made from. */
  triangles: number;
  /** Per layer (1 and up): runs of triangles as [first, count, first, count, …]. */
  layers: Record<string, number[]>;
};
const TABLE = layers as unknown as Record<string, Record<string, MeshLayers>>;
/**
 * Depth-buffer steps and slope factor per layer, as in a polygon offset. Two faces in one plane
 * do not get the same depth: a rasteriser snaps vertices to a sub-pixel grid, so each face is
 * off by a fraction of the plane's own depth slope, and the slope term does most of the work.
 * It is also the one to keep small: it is worth `FACTOR` pixels of the surface's own depth, and
 * a face on a layer is drawn over anything that stands less than that in front of it. Measured
 * with scripts/fps/map-capture/flicker.mjs on both maps (a software renderer that snaps to 1/16
 * of a pixel; graphics cards snap to 1/256): 0.035 still leaves patches fighting, 0.05 settles
 * them, 0.5 takes trim that stands clear of the wall. 0.1 is twice what was needed.
 */
const UNITS = 4;
const FACTOR = 0.1;
/** What the run-time decals have to clear: all but a handful of triangles are on layer 3 or less. */
const DECAL_OVER = 3;

/**
 * Polygon offset for what the game lays on the map while it runs (bullet marks, blood, contact
 * shadows). These sit a few millimetres off the surface, and a face on a layer is drawn nearer
 * than it stands, so each of them goes in front of the layers. `rank` orders them among
 * themselves (1 nearest the surface).
 */
export function decalDepthOffset(rank: number) {
  return {
    polygonOffset: true,
    polygonOffsetFactor: -(FACTOR * DECAL_OVER + rank),
    polygonOffsetUnits: -(UNITS * DECAL_OVER + 2 * rank),
  };
}

/**
 * Shared by every layered material. `viewport` is the size in pixels of what is being drawn
 * into (the slope term is per pixel); `scale` 0 switches the layers off (the capture tools'
 * "before").
 */
export const depthLayerUniforms = {
  viewport: { value: new THREE.Vector2(1, 1) },
  scale: { value: 1 },
};

/**
 * Make `material` honour the `depthLayer` vertex attribute. The face's plane gives its depth
 * slope per pixel (1/z is linear on screen for a plane), which is what a polygon offset's
 * factor multiplies; the units are steps of a 24-bit depth buffer.
 */
export function patchDepthLayers<M extends THREE.Material>(material: M): M {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, {
      depthLayerViewport: depthLayerUniforms.viewport,
      depthLayerScale: depthLayerUniforms.scale,
    });
    shader.vertexShader = shader.vertexShader
      .replace(
        "void main() {",
        /* glsl */ `attribute float depthLayer;
        uniform vec2 depthLayerViewport;
        uniform float depthLayerScale;
        void main() {`,
      )
      .replace(
        "#include <project_vertex>",
        /* glsl */ `#include <project_vertex>
        if (depthLayer > 0.0) {
          vec3 layerNormal = normalMatrix * normal;
          float layerPlane = dot(layerNormal, mvPosition.xyz);
          // Depth per pixel across the face's plane, the larger of the two directions (none
          // for a face seen exactly edge-on, which covers no pixel).
          vec2 layerSlope = layerPlane == 0.0 ? vec2(0.0) : abs(
            projectionMatrix[3][2] * layerNormal.xy /
            (vec2(projectionMatrix[0][0], projectionMatrix[1][1]) * layerPlane * depthLayerViewport)
          );
          float layerStep = ${FACTOR.toFixed(4)} * min(max(layerSlope.x, layerSlope.y), 0.05)
            + ${UNITS.toFixed(1)} / 16777216.0;
          // Clip-space z spans twice the depth range.
          gl_Position.z -= 2.0 * depthLayer * depthLayerScale * layerStep * gl_Position.w;
        }`,
      );
  };
  material.customProgramCacheKey = () => "depth-layers";
  return material;
}

/** A mesh's entry: by node and material (the node is the mesh itself or, with several primitives, its parent). */
export function depthLayerEntry(mapId: string, mesh: THREE.Mesh): MeshLayers | undefined {
  const table = TABLE[mapId];
  if (!table || Array.isArray(mesh.material)) return undefined;
  const material = mesh.material.name;
  return table[`${mesh.name}|${material}`] ?? table[`${mesh.parent?.name}|${material}`];
}

/** The layer of each triangle of an entry, in the mesh's order. */
export function depthLayerOfTriangles(entry: MeshLayers): Uint8Array {
  const layerOf = new Uint8Array(entry.triangles);
  for (const [layer, runs] of Object.entries(entry.layers))
    for (let i = 0; i < runs.length; i += 2)
      layerOf.fill(Number(layer), runs[i]!, runs[i]! + runs[i + 1]!);
  return layerOf;
}

type Attribute = THREE.BufferAttribute | THREE.InterleavedBufferAttribute;
/** A copy of `attribute` with the vertices in `extra` repeated after its own. */
function withRepeats(attribute: Attribute, extra: number[]) {
  const interleaved = (attribute as THREE.InterleavedBufferAttribute).isInterleavedBufferAttribute
    ? (attribute as THREE.InterleavedBufferAttribute)
    : null;
  const from = (interleaved ? interleaved.data.array : attribute.array) as THREE.TypedArray;
  const stride = interleaved ? interleaved.data.stride : attribute.itemSize;
  const offset = interleaved ? interleaved.offset : 0;
  const size = attribute.itemSize;
  const Typed = from.constructor as new (n: number) => THREE.TypedArray;
  const to = new Typed((attribute.count + extra.length) * size);
  for (let v = 0; v < attribute.count + extra.length; v++) {
    const source = v < attribute.count ? v : extra[v - attribute.count]!;
    for (let k = 0; k < size; k++) to[v * size + k] = from[source * stride + offset + k]!;
  }
  const copy = new THREE.BufferAttribute(to, size, attribute.normalized);
  const gpuType = (attribute as THREE.BufferAttribute).gpuType;
  if (!interleaved && gpuType !== undefined) copy.gpuType = gpuType;
  return copy;
}

/**
 * Give the layered meshes of `root` (a loaded map scene) their `depthLayer` attribute and a
 * material that reads it. The scene's geometry and materials stay shared with the cached asset
 * (a mesh gets a geometry of its own that reuses the asset's vertex buffers, or copies of them
 * where a vertex is shared by triangles on different layers): returns what was made here, for
 * the caller to dispose.
 */
export function applyDepthLayers(mapId: string, root: THREE.Object3D) {
  const geometries: THREE.BufferGeometry[] = [];
  const materials = new Map<THREE.Material, THREE.Material>();
  const found: Array<[THREE.Mesh, MeshLayers]> = [];
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || (mesh as THREE.InstancedMesh).isInstancedMesh) return;
    const entry = depthLayerEntry(mapId, mesh);
    if (entry) found.push([mesh, entry]);
  });
  const layered = (material: THREE.Material) => {
    let clone = materials.get(material);
    if (!clone) materials.set(material, (clone = patchDepthLayers(material.clone())));
    return clone;
  };
  // What is being drawn into, for the slope term (a render target, or the canvas).
  const size = depthLayerUniforms.viewport.value;
  const measure: THREE.Mesh["onBeforeRender"] = (renderer) => {
    const target = renderer.getRenderTarget();
    if (target) size.set(target.width, target.height);
    else renderer.getDrawingBufferSize(size);
  };
  for (const [mesh, entry] of found) {
    const source = mesh.geometry;
    const position = source.getAttribute("position");
    const index = source.index;
    if ((index ? index.count : position.count) !== entry.triangles * 3) continue;
    if (Object.keys(source.morphAttributes).length) continue;
    const layerOf = depthLayerOfTriangles(entry);
    const geometry = new THREE.BufferGeometry();
    if (!index) {
      // Every triangle has its own vertices.
      const perVertex = new Uint8Array(position.count);
      for (let v = 0; v < position.count; v++) perVertex[v] = layerOf[Math.floor(v / 3)]!;
      for (const [name, attribute] of Object.entries(source.attributes))
        geometry.setAttribute(name, attribute);
      geometry.setAttribute("depthLayer", new THREE.BufferAttribute(perVertex, 1));
    } else {
      // A vertex takes the layer of its triangles. Where triangles on different layers share
      // one, the later ones get a repeat of it.
      const taken = new Int16Array(position.count).fill(-1);
      const repeats: number[] = [];
      const repeatLayers: number[] = [];
      const repeatOf = new Map<number, number>();
      let corners: Uint32Array | null = null;
      for (let i = 0; i < index.count; i++) {
        const v = index.getX(i);
        const layer = layerOf[Math.floor(i / 3)]!;
        if (taken[v] === -1) taken[v] = layer;
        else if (taken[v] !== layer) {
          corners ??= Uint32Array.from(index.array);
          const key = v * 256 + layer;
          let at = repeatOf.get(key);
          if (at === undefined) {
            at = position.count + repeats.length;
            repeatOf.set(key, at);
            repeats.push(v);
            repeatLayers.push(layer);
          }
          corners[i] = at;
        }
      }
      const perVertex = new Uint8Array(position.count + repeats.length);
      for (let v = 0; v < position.count; v++) perVertex[v] = Math.max(0, taken[v]!);
      perVertex.set(repeatLayers, position.count);
      for (const [name, attribute] of Object.entries(source.attributes))
        geometry.setAttribute(name, corners ? withRepeats(attribute, repeats) : attribute);
      geometry.setAttribute("depthLayer", new THREE.BufferAttribute(perVertex, 1));
      geometry.setIndex(
        corners
          ? new THREE.BufferAttribute(
              perVertex.length > 65535 ? corners : Uint16Array.from(corners),
              1,
            )
          : index,
      );
    }
    for (const group of source.groups)
      geometry.addGroup(group.start, group.count, group.materialIndex);
    geometry.boundingBox = source.boundingBox?.clone() ?? null;
    geometry.boundingSphere = source.boundingSphere?.clone() ?? null;
    geometries.push(geometry);
    mesh.geometry = geometry;
    mesh.material = layered(mesh.material as THREE.Material);
    mesh.onBeforeRender = measure;
  }
  return { geometries, materials: [...materials.values()] };
}
