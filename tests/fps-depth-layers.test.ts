import { readFileSync } from "node:fs";
import * as THREE from "three";
import { describe, expect, it } from "vitest";
import table from "@/lib/fps/maps/depth-layers.json";
import {
  applyDepthLayers,
  decalDepthOffset,
  depthLayerOfTriangles,
} from "@/lib/fps/maps/depth-layers";

/**
 * Depth layers of the 5v5 maps (owner, 2026-11-12: "flicker … on the frames on the walls"): the
 * triangles laid on another face carry their layer on their vertices, and the vertex shader
 * draws them that much nearer. The table names triangles of one build of each GLB, so it has to
 * match the shipped files.
 */
type Entry = { triangles: number; layers: Record<string, number[]> };
const TABLE = table as unknown as Record<string, Record<string, Entry>>;

/** The JSON chunk of a GLB. */
function glbJson(file: string) {
  const data = readFileSync(file);
  const length = data.readUInt32LE(12);
  return JSON.parse(data.subarray(20, 20 + length).toString("utf8")) as {
    nodes: Array<{ name?: string; mesh?: number }>;
    meshes: Array<{ primitives: Array<{ indices?: number; material?: number }> }>;
    materials: Array<{ name?: string }>;
    accessors: Array<{ count: number }>;
  };
}

describe("depth layer table", () => {
  it.each(Object.keys(TABLE))("matches the shipped %s.glb", (mapId) => {
    const gltf = glbJson(`public/fps/models/${mapId}.glb`);
    /** Triangle counts per "node|material", as three's loader names the node. */
    const shipped = new Map<string, number[]>();
    for (const node of gltf.nodes) {
      if (node.mesh === undefined) continue;
      const name = (node.name ?? "").replace(/\s/g, "_").replace(/[[\].:/]/g, "");
      for (const primitive of gltf.meshes[node.mesh]!.primitives) {
        const key = `${name}|${gltf.materials[primitive.material!]?.name ?? ""}`;
        const list = shipped.get(key) ?? [];
        list.push(gltf.accessors[primitive.indices!]!.count / 3);
        shipped.set(key, list);
      }
    }
    const entries = Object.entries(TABLE[mapId]!);
    expect(entries.length).toBeGreaterThan(20);
    for (const [key, entry] of entries) {
      // One mesh by that name, with as many triangles as the entry was made from.
      expect(shipped.get(key), key).toEqual([entry.triangles]);
      const seen = new Uint8Array(entry.triangles);
      for (const [layer, runs] of Object.entries(entry.layers)) {
        expect(Number(layer)).toBeGreaterThan(0);
        expect(runs.length % 2).toBe(0);
        for (let i = 0; i < runs.length; i += 2) {
          expect(runs[i]! + runs[i + 1]!).toBeLessThanOrEqual(entry.triangles);
          for (let t = runs[i]!; t < runs[i]! + runs[i + 1]!; t++) {
            expect(seen[t], `${key} triangle ${t} listed twice`).toBe(0);
            seen[t] = 1;
          }
        }
      }
    }
  });

  it("stays shallow: a layer is a few depth-buffer steps, and they add up", () => {
    for (const meshes of Object.values(TABLE))
      for (const entry of Object.values(meshes))
        for (const layer of Object.keys(entry.layers)) expect(Number(layer)).toBeLessThanOrEqual(6);
  });
});

describe("applyDepthLayers", () => {
  const mapId = "sandgate";
  const [key, entry] = Object.entries(TABLE[mapId]!).find(
    ([, e]) => Object.keys(e.layers).length > 1,
  )!;
  /**
   * A mesh by the entry's name with its triangle count. `shared`: every triangle uses vertex 0
   * as well as two of its own, so triangles on different layers share a vertex.
   */
  const scene = (triangles: number, shared: boolean) => {
    const [nodeName, materialName] = key.split("|") as [string, string];
    const vertices = 1 + triangles * 2;
    const position = new Float32Array(vertices * 3);
    for (let v = 0; v < vertices; v++) position.set([v, v * 2, v * 3], v * 3);
    const uv = new Uint16Array(vertices * 2);
    for (let v = 0; v < vertices; v++) uv.set([v, 65535 - v], v * 2);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(position, 3));
    geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2, true));
    const index = new Uint32Array(triangles * 3);
    for (let t = 0; t < triangles; t++)
      index.set([shared ? 0 : 1 + t * 2, 1 + t * 2, 2 + t * 2], t * 3);
    geometry.setIndex(new THREE.BufferAttribute(index, 1));
    const material = new THREE.MeshStandardMaterial({ name: materialName });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = "primitive_3";
    const node = new THREE.Group();
    node.name = nodeName;
    node.add(mesh);
    const root = new THREE.Group();
    root.add(node);
    return { root, node, mesh, geometry, material };
  };
  /** Each triangle's corners carry the triangle's layer, and are the vertices they were. */
  const check = (mesh: THREE.Mesh, source: THREE.BufferGeometry) => {
    const layerOf = depthLayerOfTriangles(entry);
    const layer = mesh.geometry.getAttribute("depthLayer");
    const index = mesh.geometry.index!;
    expect(index.count).toBe(entry.triangles * 3);
    for (const name of ["position", "uv"]) {
      const made = mesh.geometry.getAttribute(name),
        from = source.getAttribute(name);
      expect(made.normalized).toBe(from.normalized);
      for (let i = 0; i < index.count; i++) {
        const v = index.getX(i),
          was = source.index!.getX(i);
        for (let k = 0; k < from.itemSize; k++)
          expect(made.getComponent(v, k)).toBe(from.getComponent(was, k));
      }
    }
    for (let i = 0; i < index.count; i++)
      expect(layer.getX(index.getX(i))).toBe(layerOf[Math.floor(i / 3)]);
  };

  it("puts each triangle's layer on its vertices and leaves the asset's buffers shared", () => {
    const { root, node, mesh, geometry, material } = scene(entry.triangles, false);
    const made = applyDepthLayers(mapId, root);
    // Still one mesh: a layer costs no draw call.
    expect(node.children).toEqual([mesh]);
    expect(made.geometries).toEqual([mesh.geometry]);
    expect(mesh.geometry).not.toBe(geometry);
    expect(mesh.geometry.getAttribute("position")).toBe(geometry.getAttribute("position"));
    expect(mesh.geometry.index).toBe(geometry.index);
    check(mesh, geometry);
    // The cached asset's geometry and material are untouched.
    expect(geometry.getAttribute("depthLayer")).toBeUndefined();
    expect(made.materials).toEqual([mesh.material]);
    expect(mesh.material).not.toBe(material);
    expect(material.customProgramCacheKey()).not.toBe(
      (mesh.material as THREE.Material).customProgramCacheKey(),
    );
  });

  it("repeats a vertex that triangles on different layers share", () => {
    const { root, mesh, geometry } = scene(entry.triangles, true);
    applyDepthLayers(mapId, root);
    const layers = new Set(depthLayerOfTriangles(entry));
    // Vertex 0 once per layer, every other vertex once.
    expect(mesh.geometry.getAttribute("position").count).toBe(
      geometry.getAttribute("position").count + layers.size - 1,
    );
    expect(mesh.geometry.getAttribute("position")).not.toBe(geometry.getAttribute("position"));
    check(mesh, geometry);
    expect(geometry.index!.getX(3)).toBe(0);
  });

  it("writes the offset into the vertex shader, and the decals clear it", () => {
    const { root, mesh } = scene(entry.triangles, false);
    applyDepthLayers(mapId, root);
    const shader = {
      uniforms: {} as Record<string, { value: unknown }>,
      vertexShader: THREE.ShaderLib.standard.vertexShader,
      fragmentShader: "",
    };
    (mesh.material as THREE.Material).onBeforeCompile(
      shader as never,
      undefined as unknown as THREE.WebGLRenderer,
    );
    expect(shader.vertexShader).toContain("attribute float depthLayer;");
    expect(shader.vertexShader).toMatch(/gl_Position\.z -= [^;]*depthLayer/);
    expect(Object.keys(shader.uniforms).sort()).toEqual(["depthLayerScale", "depthLayerViewport"]);
    // Bullet marks and shadows are offset by more than three layers, blood by more again.
    const [, factor, units] = /(\d+\.\d+) \* min\(.*\n\s*\+ (\d+\.\d+) \//
      .exec(shader.vertexShader)!
      .map(Number) as [number, number, number];
    expect(-decalDepthOffset(1).polygonOffsetFactor).toBeGreaterThan(3 * factor);
    expect(-decalDepthOffset(1).polygonOffsetUnits).toBeGreaterThan(3 * units);
    expect(decalDepthOffset(2).polygonOffsetUnits).toBeLessThan(
      decalDepthOffset(1).polygonOffsetUnits,
    );
  });

  it("leaves a mesh from another build of the map alone", () => {
    const { root, node, mesh, geometry, material } = scene(entry.triangles + 1, false);
    const made = applyDepthLayers(mapId, root);
    expect(made.geometries.length).toBe(0);
    expect(node.children).toEqual([mesh]);
    expect(mesh.geometry).toBe(geometry);
    expect(mesh.material).toBe(material);
  });

  it("does nothing on a map without a table", () => {
    const { root, mesh, geometry } = scene(entry.triangles, false);
    expect(applyDepthLayers("dustfront", root).geometries.length).toBe(0);
    expect(mesh.geometry).toBe(geometry);
  });
});
