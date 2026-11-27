import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { islandPanes, paneOwners } from "../src/lib/fps/br/panes";
import { createPaneRenderer } from "../src/lib/fps/br/pane-renderer";
import { batchable, buildBatches } from "../src/lib/fps/br/props-batch";
import { createProps, FAR_FACADE_FADE, type ModelManifest } from "../src/lib/fps/br/props-renderer";
import type { Placement } from "../src/lib/fps/br/layout";
import { WORLD_ASSETS } from "../src/lib/fps/br/world";
import arenaPlan from "../src/lib/fps/br/arena-plan.json";
import hospitalPlan from "../src/lib/fps/br/hospital-plan.json";
import skylinePlan from "../src/lib/fps/br/skyline-plan.json";
import stationPlan from "../src/lib/fps/br/station-plan.json";

/**
 * Render stability 2026-11-23 (owner: "blinking/flicker buildings on distance/diffrent attitudes
 * in the airplane/parachute", "the buildings looks strange", "the render should be like call of
 * duty no matter of what distance"): what a building is drawn with from far off must be
 * something the GPU filters. Its far LOD takes the near model's five views from an atlas
 * (build_facades.mjs --far), fades to each view's mean colour where the atlas' mips would mix
 * in its neighbours, and the towers' see-through panes are not drawn over it.
 */
const pub = (f: string) => path.join(process.cwd(), "public", f);
type Lod = { file: string; tris: number; textureMB: number; facade?: boolean; farFacade?: boolean };
type Entry = { class: string; ring?: string; air?: string; size: number[]; lods: Lod[] };
const manifest = JSON.parse(fs.readFileSync(pub(WORLD_ASSETS.models), "utf8")) as {
  worldRevision: string;
  farFacades: { atlas: string; width: number; height: number; models: number };
  models: Record<string, Entry>;
};
const layout = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "art/br/far-facades-v2.json"), "utf8"),
) as {
  width: number;
  height: number;
  gutter: number;
  glass?: string;
  models: Record<string, { rects: number[][]; means: number[][]; lod: string; panes?: number[] }>;
};
const far = Object.entries(manifest.models).filter(([, m]) => m.lods.at(-1)!.farFacade);
const glbJson = (file: string) => {
  const b = fs.readFileSync(pub(file));
  return JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString("utf8")) as {
    textures?: unknown[];
    materials: Array<{ name: string }>;
    meshes: Array<{ primitives: Array<{ attributes: Record<string, number> }> }>;
  };
};
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
async function geometry(file: string) {
  const b = fs.readFileSync(pub(file));
  const gltf = await loader.parseAsync(
    b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer,
    "",
  );
  gltf.scene.updateMatrixWorld(true);
  let mesh: THREE.Mesh | null = null;
  gltf.scene.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) mesh = o as THREE.Mesh;
  });
  return mesh! as THREE.Mesh;
}
/** Canvas size of a WebP (VP8X, lossy VP8 or lossless VP8L). */
function webpSize(file: string): [number, number] {
  const b = fs.readFileSync(pub(file));
  const kind = b.toString("ascii", 12, 16);
  if (kind === "VP8X") return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  if (kind === "VP8 ") return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  const bits = b.readUInt32LE(21);
  return [1 + (bits & 0x3fff), 1 + ((bits >> 14) & 0x3fff)];
}

describe("buildings' far LODs on an atlas of their own (2026-11-23)", () => {
  it("keeps the world: the same placements and collision, only how far LODs look", () => {
    expect(manifest.worldRevision).toBe(WORLD_ASSETS.revision);
    expect(far.length).toBe(manifest.farFacades.models);
    expect(far.length).toBeGreaterThanOrEqual(180);
  });

  it("textures the far LOD of every building, and of nothing that is mostly air", () => {
    for (const id of [
      "condo-floor",
      "office-floor",
      "brick-lobby",
      "condo-roof-a",
      "apartment",
      "bauhaus-block",
      "townhouse",
      "house",
      "brick-shop",
      "hospital",
      "superstore",
      "police-station",
      "mb-ops-tower",
      "mb-command-bunker",
      "mb-barracks-3s",
      "mb-armory",
      "mb-pillbox",
    ])
      expect(manifest.models[id]!.lods.at(-1)!.farFacade, id).toBe(true);
    // Every enterable kind of building whose far LOD was a flat-coloured silhouette.
    for (const [id, m] of Object.entries(manifest.models)) {
      if (!["building", "dwelling", "shop", "outbuilding"].includes(m.ring ?? m.class)) continue;
      const last = m.lods.at(-1)!;
      if (last.textureMB > 0 || m.lods.length < 2 || last.file === m.lods[0]!.file) continue;
      if (m.size[1]! < 1) continue; // paint on the ground (the pitch's lines)
      expect(!!last.farFacade || !!last.facade, id).toBe(true);
    }
    for (const id of [
      "pylon",
      "radio-tower",
      "tower-crane",
      "sts-crane",
      "crag",
      "windmill",
      "mb-wall",
    ])
      expect(manifest.models[id]?.lods.at(-1)!.farFacade, id).toBeUndefined();
  });

  it("gives each one material for the renderer, its colours, and no more triangles", () => {
    // (The far LODs replaced: the vehicles-v1 world's, and garrison-v2's for the military base's
    // buildings, 2026-11-23. Those two manifests are no longer published: the entries this
    // compares against are kept in tests/fixtures/br-superseded-manifests.json.)
    const kept = JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), "tests/fixtures/br-superseded-manifests.json"),
        "utf8",
      ),
    ) as Record<string, { models: Record<string, Entry> }>;
    const before = {
      models: { ...kept["garrison-v2"]!.models, ...kept["vehicles-v1"]!.models },
    };
    for (const [id, m] of far) {
      const lod = m.lods.at(-1)!;
      const json = glbJson(lod.file);
      expect(json.textures ?? [], id).toHaveLength(0);
      expect(
        json.materials.map((x) => x.name),
        id,
      ).toEqual(["facade-far"]);
      const attributes = Object.keys(json.meshes[0]!.primitives[0]!.attributes);
      for (const a of ["POSITION", "TEXCOORD_0", "COLOR_0"]) expect(attributes, id).toContain(a);
      expect(lod.textureMB, id).toBe(0);
      expect(lod.tris, id).toBeLessThanOrEqual(before.models[id]!.lods.at(-1)!.tris);
      // The LODs before it are the ones the game drew before, or those with their last
      // overlapping faces lifted apart (zfix-v21) or the military base's buildings with their
      // plinths proud of the walls (plinth-v2), or with their window reveals lit as the wall
      // (reveal-v1), 2026-11-24: the same triangles. And (2026-11-25) the Blackwater fixes:
      // the chapel's ground faces lifted (groundlift-v1, the same triangles) and the cell
      // houses' walls carried into the ground (footing-v1, more triangles). And (2026-11-27)
      // faces added where buildings were left open (gaps-v1).
      for (const [i, l] of m.lods.slice(0, -1).entries()) {
        const was = before.models[id]!.lods[i]!;
        if (/\.(zfix-v21|plinth-v2|reveal-v1|groundlift-v1)\.lod\d\.glb$/.test(l.file))
          expect(l.tris, id).toBe(was.tris);
        else if (/\.(footing-v1|well-v1)\.lod\d\.glb$/.test(l.file))
          expect(l.tris, id).toBeGreaterThan(was.tris);
        // (gaps-v1: faces added where a building was left open, or its floors moved to their
        // finishes: as many triangles or more.)
        else if (/\.gaps-v1\.lod\d\.glb$/.test(l.file))
          expect(l.tris, id).toBeGreaterThanOrEqual(was.tris);
        // The lift shaft cut out of the lobbies' floors and the pool decks (shaft-v1): the
        // floors split round it, a few more triangles.
        else if (/\.shaft-v1\.lod\d\.glb$/.test(l.file))
          expect(Math.abs(l.tris - was.tris), id).toBeLessThan(80);
        else expect(l, id).toEqual(was);
      }
    }
  });

  it("lays the views out with room for three mips, on an atlas of that size", () => {
    expect(layout.gutter).toBe(12);
    expect([layout.width, layout.height]).toEqual([
      manifest.farFacades.width,
      manifest.farFacades.height,
    ]);
    expect(webpSize(manifest.farFacades.atlas)).toEqual([layout.width, layout.height]);
    // Under 40 MB of GPU memory with mipmaps (RGBA8).
    expect((layout.width * layout.height * 4 * 4) / 3 / 2 ** 20).toBeLessThan(40);
    expect(Object.keys(layout.models).sort()).toEqual(far.map(([id]) => id).sort());
    const taken = new Uint8Array((layout.width * layout.height) / 16); // 4 px cells
    for (const m of Object.values(layout.models))
      for (const [x, y, w, h] of m.rects as Array<[number, number, number, number]>) {
        expect(x >= 0 && y >= 0 && x + w <= layout.width && y + h <= layout.height).toBe(true);
        expect(Math.min(w, h)).toBeGreaterThan(2 * layout.gutter);
        for (let cy = Math.ceil(y / 4); cy < Math.floor((y + h) / 4); cy++)
          for (let cx = Math.ceil(x / 4); cx < Math.floor((x + w) / 4); cx++) {
            const i = cy * (layout.width / 4) + cx;
            expect(taken[i]).toBe(0);
            taken[i] = 1;
          }
      }
    // The fade to the mean colour ends at the last mip the gutter keeps mostly clean.
    expect(2 ** FAR_FACADE_FADE.from).toBeLessThanOrEqual(layout.gutter);
    expect(FAR_FACADE_FADE.to).toBe(FAR_FACADE_FADE.from + 1);
  });

  it("writes each view's mean colour into the vertices that view textures", async () => {
    for (const id of ["house", "bauhaus-block", "condo-floor", "hospital", "brick-shop"]) {
      const m = layout.models[id]!;
      expect(m.means, id).toHaveLength(5);
      const mesh = await geometry(m.lod);
      const uv = mesh.geometry.getAttribute("uv"),
        col = mesh.geometry.getAttribute("color");
      expect(col.count, id).toBe(uv.count);
      for (let i = 0; i < uv.count; i++) {
        const px = uv.getX(i) * layout.width,
          py = uv.getY(i) * layout.height;
        const vi = m.rects.findIndex(
          ([x, y, w, h]) =>
            px >= x! - 0.5 && px <= x! + w! + 0.5 && py >= y! - 0.5 && py <= y! + h! + 0.5,
        );
        expect(vi, id).toBeGreaterThanOrEqual(0);
        // Inside the view's gutter: no sample of the first mips reaches the next view.
        const [x, y, w, h] = m.rects[vi] as [number, number, number, number];
        expect(px, id).toBeGreaterThanOrEqual(x + layout.gutter - 0.5);
        expect(px, id).toBeLessThanOrEqual(x + w - layout.gutter + 0.5);
        expect(py, id).toBeGreaterThanOrEqual(y + layout.gutter - 0.5);
        expect(py, id).toBeLessThanOrEqual(y + h - layout.gutter + 0.5);
        for (let c = 0; c < 3; c++)
          expect(Math.abs(col.getComponent(i, c) - m.means[vi]![c]!), id).toBeLessThan(0.006);
      }
    }
    // A wall with windows averages darker than its paint, lighter than its glass.
    const block = layout.models["bauhaus-block"]!.means[2]!;
    expect(block[0]).toBeGreaterThan(0.45);
    expect(block[0]).toBeLessThan(0.85);
  });

  it("bakes the glass in: the panes the game draws itself, dark, in their openings", () => {
    expect(layout.glass).toBe("opaque");
    // Every model with panes of the game's own has them in its bake.
    for (const id of ["condo-floor", "office-lobby", "bauhaus-block", "apartment", "house"])
      expect(layout.models[id]!.panes!.length % 6, id).toBe(0);
    expect(layout.models["condo-floor"]!.panes!.length).toBeGreaterThan(6 * 10);
  });

  it("leaves a tower's storey its walls only: no deck or soffit a fraction of a pixel deep", async () => {
    for (const [id, m] of far) {
      if (m.air !== "far" || !/-(floor|lobby)$/.test(id)) continue;
      const mesh = await geometry(m.lods.at(-1)!.file);
      const g = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry;
      const pos = g.getAttribute("position");
      const a = new THREE.Vector3(),
        b = new THREE.Vector3(),
        c = new THREE.Vector3();
      let walls = 0;
      for (let i = 0; i < pos.count; i += 3) {
        a.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
        b.fromBufferAttribute(pos, i + 1).applyMatrix4(mesh.matrixWorld);
        c.fromBufferAttribute(pos, i + 2).applyMatrix4(mesh.matrixWorld);
        const n = b.sub(a).cross(c.sub(a));
        if (n.length() < 1e-9) continue;
        expect(Math.abs(n.normalize().y), id).toBeLessThan(0.5);
        walls++;
      }
      expect(walls, id).toBeGreaterThanOrEqual(8);
    }
  });
});

describe("the far atlas in the renderer", () => {
  const shaderOf = (material: THREE.Material) => {
    const shader = {
      uniforms: {},
      vertexShader: "#include <common>",
      fragmentShader:
        "#include <map_fragment>\n#include <color_fragment>\n#include <alphamap_fragment>",
    };
    material.onBeforeCompile(shader as never, null as never);
    return shader.fragmentShader;
  };
  const farLod = () => {
    const g = new THREE.BoxGeometry(10, 5, 8).toNonIndexed();
    g.setAttribute(
      "color",
      new THREE.BufferAttribute(
        new Float32Array(g.getAttribute("position").count * 3).fill(0.4),
        3,
      ),
    );
    const scene = new THREE.Group();
    scene.add(
      new THREE.Mesh(g, new THREE.MeshStandardMaterial({ name: "facade-far", vertexColors: true })),
    );
    return scene;
  };
  const world = (farFacades: THREE.Texture | null) => {
    const models: ModelManifest = {
      farFacades: { atlas: "/atlas.webp", width: 4096, height: 1632 },
      models: {
        house: {
          class: "dwelling",
          size: [10, 5, 8],
          lods: [0, 1, 2].map((l) => ({ file: `house.lod${l}`, tris: 12 })),
        },
      },
    } as unknown as ModelManifest;
    const stub = { loadAsync: async () => ({ scene: farLod() }) } as unknown as GLTFLoader;
    return createProps(
      [{ model: "house", x: 0, y: 0, z: 0, turn: 0, poi: "t" } as Placement],
      models,
      stub,
      { preload: true, farFacades },
    );
  };

  it("lends a far LOD the atlas and fades it to its vertex colours by mip level", async () => {
    const atlas = new THREE.Texture();
    const props = world(atlas);
    await props.ready;
    const meshes = props.root.children.filter(
      (o) => (o as THREE.InstancedMesh).isInstancedMesh,
    ) as THREE.InstancedMesh[];
    expect(meshes.length).toBeGreaterThan(0);
    for (const mesh of meshes) {
      const material = mesh.material as THREE.MeshStandardMaterial;
      expect(material.map).toBe(atlas);
      expect(material.color.getHex()).toBe(0xffffff);
      const fragment = shaderOf(material);
      // The texture, then the mean colour past the atlas' clean mips; never both as a tint.
      expect(fragment).toContain("texture2D( map, vMapUv )");
      expect(fragment).toContain("vec2( 4096.0, 1632.0 )");
      expect(fragment).toContain(
        `smoothstep( ${FAR_FACADE_FADE.from.toFixed(2)}, ${FAR_FACADE_FADE.to.toFixed(2)}, farLod )`,
      );
      expect(fragment).not.toContain("#include <color_fragment>");
      expect(fragment).toContain("#include <alphamap_fragment>");
      expect(material.customProgramCacheKey()).toContain("br-far-facade");
    }
    props.dispose();
    // Lent, not owned: the scene disposes it once.
    let disposed = 0;
    atlas.addEventListener("dispose", () => disposed++);
    expect(disposed).toBe(0);
  });

  it("without the atlas draws the far LOD in its vertex colours, as before", async () => {
    const props = world(null);
    await props.ready;
    const mesh = props.root.children.find(
      (o) => (o as THREE.InstancedMesh).isInstancedMesh,
    ) as THREE.InstancedMesh;
    const material = mesh.material as THREE.MeshStandardMaterial;
    expect(material.map).toBeNull();
    expect(material.vertexColors).toBe(true);
    expect(shaderOf(material)).toContain("#include <color_fragment>");
    props.dispose();
  });

  it("batches each atlas' LODs apart, and a batch keeps its material's shader", () => {
    const mid = new THREE.Texture(),
      farAtlas = new THREE.Texture();
    const patch = (shader: { fragmentShader: string }) => {
      shader.fragmentShader += "// far";
    };
    const lod = (map: THREE.Texture | null, patched = false) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(9), 3));
      g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(6), 2));
      const material = new THREE.MeshStandardMaterial({ map, flatShading: true });
      if (patched) {
        material.onBeforeCompile = patch as never;
        material.customProgramCacheKey = () => "far";
      }
      return { mesh: new THREE.InstancedMesh(g, material, 1), local: new THREE.Matrix4() };
    };
    expect(batchable(lod(farAtlas).mesh.material, mid)).toBe(false);
    expect(batchable(lod(farAtlas).mesh.material, [mid, farAtlas])).toBe(true);
    expect(batchable(lod(new THREE.Texture()).mesh.material, [mid, farAtlas])).toBe(false);
    const batches = buildBatches(
      [
        { ...lod(mid), placements: 2, model: "a" },
        { ...lod(farAtlas, true), placements: 2, model: "b" },
        { ...lod(mid), placements: 2, model: "c" },
        { ...lod(farAtlas, true), placements: 2, model: "d" },
      ],
      [mid, farAtlas],
    );
    expect(batches.map((b) => b.members)).toEqual([
      [0, 2],
      [1, 3],
    ]);
    const material = batches[1]!.mesh.material as THREE.MeshStandardMaterial;
    expect(material.map).toBe(farAtlas);
    expect(material.onBeforeCompile).toBe(patch);
    expect(material.customProgramCacheKey()).toBe("far");
    expect(Object.hasOwn(batches[0]!.mesh.material, "onBeforeCompile")).toBe(false);
    for (const b of batches) b.mesh.dispose();
  });
});

describe("the towers' panes over a far LOD", () => {
  const planned: Record<string, number[][]> = {
    ...Object.fromEntries(
      Object.entries(
        (skylinePlan as unknown as { models: Record<string, { panes: number[][] }> }).models,
      ).map(([id, m]) => [id, m.panes]),
    ),
    ...(hospitalPlan as unknown as { panes?: Record<string, number[][]> }).panes,
    ...(arenaPlan as unknown as { panes?: Record<string, number[][]> }).panes,
    ...(stationPlan as unknown as { panes?: Record<string, number[][]> }).panes,
  };

  it("has the glass of every building with planned panes in its far LOD's texture", () => {
    const ids = Object.keys(planned).filter((id) => planned[id]!.length);
    expect(ids.length).toBeGreaterThanOrEqual(8);
    for (const id of ids) {
      if (!manifest.models[id]) continue;
      expect(manifest.models[id]!.lods.at(-1)!.farFacade, id).toBe(true);
      expect(layout.models[id]!.panes!.length, id).toBeGreaterThanOrEqual(planned[id]!.length * 6);
    }
  });

  it("draws them where their building is at its near or middle LOD, and nowhere else", () => {
    const places = [
      { model: "condo-floor", x: 0, y: 0, z: 0, turn: 0, poi: "t" },
      { model: "pole", x: 40, y: 0, z: 0, turn: 0, poi: "t" },
      { model: "condo-floor", x: 500, y: 3.6, z: 0, turn: 1, poi: "t" },
    ] as Placement[];
    const set = islandPanes(places);
    const each = planned["condo-floor"]!.length;
    expect(each).toBeGreaterThan(10);
    const owner = paneOwners(places);
    expect(owner.length).toBe(set.count);
    expect([...owner.slice(0, each)].every((o) => o === 0)).toBe(true);
    // (A window of its own, after its planned panes, is its building's too.)
    expect(owner[set.count - 1]).toBe(2);
    const scene = new THREE.Scene();
    const level = [0, -1, 2];
    const panes = createPaneRenderer(scene, set, () => false, {
      owner,
      drawn: (i) => level[i] === 0 || level[i] === 1,
    });
    const glass = scene.children.find(
      (o) =>
        (o as THREE.InstancedMesh).isInstancedMesh && (o as THREE.InstancedMesh).count === 2 * each,
    ) as THREE.InstancedMesh;
    expect(glass).toBeDefined();
    const m = new THREE.Matrix4();
    const shown = (from: number) => {
      let n = 0;
      for (let k = from; k < from + each; k++) {
        glass.getMatrixAt(k, m);
        if (m.determinant() !== 0) n++;
      }
      return n;
    };
    panes.update(16);
    expect([shown(0), shown(each)]).toEqual([each, 0]);
    // The far tower comes within its middle ring; the near one is flown away from.
    level[2] = 1;
    level[0] = 2;
    for (let f = 0; f < 4; f++) panes.update(16);
    expect([shown(0), shown(each)]).toEqual([0, each]);
    // A pane broken while its tower was far off stays out when the tower comes back.
    panes.apply([0], false);
    level[0] = 0;
    for (let f = 0; f < 4; f++) panes.update(16);
    expect([shown(0), shown(each)]).toEqual([each - 1, each]);
    panes.dispose();
  });
});
