import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import * as THREE from "three";
import { WORLD_ASSETS } from "../src/lib/fps/br/world";
import { batchable, buildBatches } from "../src/lib/fps/br/props-batch";
import { createBuildingDetail, DETAIL, detailPixels } from "../src/lib/fps/br/building-detail";

const pub = (f: string) => path.join(process.cwd(), "public", f);
type Lod = { file: string; tris: number; textureMB: number; facade?: boolean };
const manifest = JSON.parse(fs.readFileSync(pub(WORLD_ASSETS.models), "utf8")) as {
  worldRevision: string;
  facades: { atlas: string; width: number; height: number; models: number };
  models: Record<string, { lods: Lod[] }>;
};
const layout = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "art/br/facades-v1.json"), "utf8"),
) as {
  width: number;
  height: number;
  gutter: number;
  models: Record<string, { rects: number[][] }>;
};
const glbJson = (file: string) => {
  const b = fs.readFileSync(pub(file));
  return JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString("utf8")) as {
    textures?: unknown[];
    materials: Array<{ name: string }>;
    meshes: Array<{ primitives: Array<{ attributes: Record<string, number> }> }>;
  };
};
/** Canvas size of a WebP (VP8X, lossy VP8 or lossless VP8L). */
function webpSize(file: string): [number, number] {
  const b = fs.readFileSync(pub(file));
  expect(b.toString("ascii", 0, 4)).toBe("RIFF");
  const kind = b.toString("ascii", 12, 16);
  if (kind === "VP8X") return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  if (kind === "VP8 ") return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  const bits = b.readUInt32LE(21);
  return [1 + (bits & 0x3fff), 1 + ((bits >> 14) & 0x3fff)];
}

describe("building texture quality (2026-11-09)", () => {
  const facades = Object.entries(manifest.models).filter(([, m]) => m.lods[1]?.facade);

  it("keeps the world revision: the facade manifest changes how LODs look, not the world", () => {
    expect(manifest.worldRevision).toBe(WORLD_ASSETS.revision);
  });

  it("maps the flat mid-distance LODs of the common buildings onto one atlas", () => {
    expect(facades.length).toBe(manifest.facades.models);
    expect(facades.length).toBeGreaterThanOrEqual(50);
    for (const id of ["house", "rural-house", "cabin", "barn", "garage", "shed", "superstore"])
      expect(manifest.models[id]!.lods[1]!.facade, id).toBe(true);
    for (const [id, m] of facades) {
      const json = glbJson(m.lods[1]!.file);
      // One untextured material named for the renderer, which lends it the shared atlas.
      expect(json.textures ?? [], id).toHaveLength(0);
      expect(
        json.materials.map((x) => x.name),
        id,
      ).toEqual(["facade"]);
      expect(Object.keys(json.meshes[0]!.primitives[0]!.attributes).sort(), id).toEqual([
        "POSITION",
        "TEXCOORD_0",
      ]);
      // No texture memory of its own, and no more triangles than the near model.
      expect(m.lods[1]!.textureMB, id).toBe(0);
      expect(m.lods[1]!.tris, id).toBeLessThanOrEqual(m.lods[0]!.tris);
    }
  });

  it("lays every view out inside the atlas without overlap, and the atlas is that size", () => {
    expect([layout.width, layout.height]).toEqual([
      manifest.facades.width,
      manifest.facades.height,
    ]);
    expect(webpSize(manifest.facades.atlas)).toEqual([layout.width, layout.height]);
    // Under 32 MB of GPU memory with mipmaps (RGBA8), a fifth of that on the low tier.
    expect((layout.width * layout.height * 4 * 4) / 3 / 2 ** 20).toBeLessThan(32);
    const rects = Object.values(layout.models).flatMap((m) => m.rects);
    expect(rects).toHaveLength(facades.length * 5);
    const taken = new Uint8Array((layout.width * layout.height) / 16); // 4 px cells
    for (const [x, y, w, h] of rects as Array<[number, number, number, number]>) {
      expect(x >= 0 && y >= 0 && x + w <= layout.width && y + h <= layout.height).toBe(true);
      expect(w).toBeGreaterThan(2 * layout.gutter);
      for (let cy = Math.ceil(y / 4); cy < Math.floor((y + h) / 4); cy++)
        for (let cx = Math.ceil(x / 4); cx < Math.floor((x + w) / 4); cx++) {
          const i = cy * (layout.width / 4) + cx;
          expect(taken[i]).toBe(0);
          taken[i] = 1;
        }
    }
  });

  it("batches atlas-textured LODs together, apart from the untextured ones", () => {
    const atlas = new THREE.Texture();
    const lod = (map: THREE.Texture | null) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(9), 3));
      g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array([0, 0, 0.5, 0, 0, 0.25]), 2));
      const material = new THREE.MeshStandardMaterial({ map, flatShading: true });
      return { mesh: new THREE.InstancedMesh(g, material, 1), local: new THREE.Matrix4() };
    };
    expect(batchable(lod(atlas).mesh.material)).toBe(false);
    expect(batchable(lod(atlas).mesh.material, atlas)).toBe(true);
    expect(batchable(lod(new THREE.Texture()).mesh.material, atlas)).toBe(false);
    const members = [
      { ...lod(atlas), placements: 3, model: "house" },
      { ...lod(atlas), placements: 2, model: "cabin" },
      { ...lod(null), placements: 2, model: "silo" },
      { ...lod(null), placements: 2, model: "tank" },
    ];
    const batches = buildBatches(members, atlas);
    expect(batches.map((b) => b.members)).toEqual([
      [0, 1],
      [2, 3],
    ]);
    const textured = batches[0]!.mesh;
    expect((textured.material as THREE.MeshStandardMaterial).map).toBe(atlas);
    expect(textured.geometry.getAttribute("uv").getX(1)).toBeCloseTo(0.5);
    expect(batches[1]!.mesh.geometry.hasAttribute("uv")).toBe(false);
    for (const b of batches) b.mesh.dispose();
  });

  it("adds close-up grain that keeps a wall's colour and skips glass, lights and metal", () => {
    const px = detailPixels();
    expect(px).toEqual(detailPixels()); // deterministic: the same for everyone
    for (const channel of [0, 1]) {
      let sum = 0,
        min = 255,
        max = 0;
      for (let i = channel; i < px.length; i += 4) {
        sum += px[i]!;
        min = Math.min(min, px[i]!);
        max = Math.max(max, px[i]!);
      }
      // Centred on 0.5 (the wall's mean colour is unchanged) with real contrast.
      expect(Math.abs(sum / (px.length / 4) - 127.5)).toBeLessThan(6);
      expect(max - min).toBeGreaterThan(110);
    }
    expect(DETAIL.fineStrength + DETAIL.coarseStrength).toBeLessThan(0.2);
    const detail = createBuildingDetail();
    const wall = new THREE.MeshStandardMaterial({ roughness: 0.9 });
    expect(detail.suits(wall)).toBe(true);
    expect(detail.suits(new THREE.MeshStandardMaterial({ transparent: true }))).toBe(false);
    expect(detail.suits(new THREE.MeshStandardMaterial({ emissive: 0xffffff }))).toBe(false);
    expect(detail.suits(new THREE.MeshStandardMaterial({ metalness: 1 }))).toBe(false);
    expect(detail.suits(new THREE.MeshBasicMaterial())).toBe(false);
    const before = wall.customProgramCacheKey();
    detail.apply(wall);
    expect(wall.customProgramCacheKey()).not.toBe(before);
    const once = wall.onBeforeCompile;
    detail.apply(wall); // idempotent
    expect(wall.onBeforeCompile).toBe(once);
    detail.dispose();
  });
});
