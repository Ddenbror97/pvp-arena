import { readFileSync } from "node:fs";
import * as THREE from "three";
import { beforeAll, describe, expect, it } from "vitest";
import { createFarBuildings, proxyShape } from "@/lib/fps/br/far-buildings";
import { bakeTreeCover, FAR_FOREST } from "@/lib/fps/br/far-forest";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import type { Placement } from "@/lib/fps/br/layout";
import { ROAD_LIFT } from "@/lib/fps/br/structures-renderer";
import { CELLS, cellTrees, TREE_STRIDE, vegetationWorld } from "@/lib/fps/br/vegetation";
import { VEGETATION_VIEW } from "@/lib/fps/br/vegetation-renderer";
import { WORLD_HALF, WORLD_SIZE, type WorldMeta } from "@/lib/fps/br/world";

const buffer = (path: string) => {
  const f = readFileSync(path);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};

/** A gabled house, 10 m along x, 8 m along z, eaves at 3 m, ridge at 5 m along x. */
function house() {
  const g = new THREE.BufferGeometry();
  const v = [
    // walls (two triangles a side) and the two roof planes
    [-5, 0, -4],
    [5, 0, -4],
    [5, 3, -4],
    [-5, 0, -4],
    [5, 3, -4],
    [-5, 3, -4],
    [-5, 0, 4],
    [5, 3, 4],
    [5, 0, 4],
    [-5, 0, 4],
    [-5, 3, 4],
    [5, 3, 4],
    [-5, 3, -4],
    [5, 3, -4],
    [5, 5, 0],
    [-5, 3, -4],
    [5, 5, 0],
    [-5, 5, 0],
    [-5, 3, 4],
    [5, 5, 0],
    [5, 3, 4],
    [-5, 3, 4],
    [-5, 5, 0],
    [5, 5, 0],
  ].flat();
  g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
  const scene = new THREE.Group();
  scene.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x808080 })));
  scene.updateMatrixWorld(true);
  return scene;
}

describe("BR far buildings (render audit 2026-11-15)", () => {
  it("cuts a proxy from the far LOD that keeps the roof's shape", () => {
    const s = proxyShape(house())!;
    expect(s).not.toBeNull();
    expect([s.nx, s.nz]).toEqual([2, 2]);
    const h = (i: number, j: number) => s.heights[j * (s.nx + 1) + i]!;
    // The ridge runs along x through the middle row; the eaves are lower.
    expect(h(1, 1)).toBeGreaterThan(4.5);
    expect(h(0, 1)).toBeGreaterThan(4.5);
    expect(h(1, 0)).toBeLessThan(3.8);
    expect(h(1, 2)).toBeLessThan(3.8);
  });

  it("gives a mast or a pylon no proxy", () => {
    const scene = new THREE.Group();
    scene.add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 30, 0.6)));
    scene.updateMatrixWorld(true);
    expect(proxyShape(scene)).toBeNull();
  });

  it("stands each proxy on its placement, turned as the model is, with its own far ring", () => {
    const shape = proxyShape(house())!;
    const placements = [
      { model: "house", x: 100, y: 7, z: -50, turn: 0, poi: "t" },
      { model: "house", x: 300, y: 2, z: 80, turn: 1, poi: "t" },
      { model: "pole", x: 0, y: 0, z: 0, turn: 0, poi: "t" },
    ] as Placement[];
    const far = createFarBuildings(
      placements,
      (m) => (m === "house" ? shape : null),
      () => 4000,
      1500,
    );
    expect(far.buildings).toBe(2);
    const pos = far.mesh.geometry.getAttribute("position");
    const site = far.mesh.geometry.getAttribute("aSite");
    const box = [new THREE.Box3(), new THREE.Box3()];
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      expect(site.getW(i)).toBe(4000);
      box[site.getX(i) === 100 ? 0 : 1]!.expandByPoint(v.fromBufferAttribute(pos, i));
    }
    // Unturned: 10 m along x, 8 m along z. A quarter turn swaps them. The ridge is 5 m up.
    expect(box[0]!.max.x - box[0]!.min.x).toBeCloseTo(10, 3);
    expect(box[0]!.max.z - box[0]!.min.z).toBeCloseTo(8, 3);
    expect(box[1]!.max.x - box[1]!.min.x).toBeCloseTo(8, 3);
    expect(box[1]!.max.z - box[1]!.min.z).toBeCloseTo(10, 3);
    expect(box[0]!.max.y).toBeCloseTo(12, 3);
    expect(box[1]!.max.y).toBeCloseTo(7, 3);
    far.dispose();
  });

  it("is drawn only beyond the model's ring: the shader folds nearer proxies away", () => {
    const shape = proxyShape(house())!;
    const far = createFarBuildings(
      [{ model: "house", x: 0, y: 0, z: 0, turn: 0, poi: "t" } as Placement],
      () => shape,
      () => 4000,
      1500,
    );
    const shader = {
      uniforms: {},
      vertexShader: "#include <common>\n#include <begin_vertex>",
      fragmentShader: "#include <common>\n#include <color_fragment>",
    };
    (far.mesh.material as THREE.Material).onBeforeCompile(shader as never, null as never);
    expect(shader.vertexShader).toContain(
      "distance(aSite.xyz, cameraPosition) <= max(1500.0, aSite.w * min(uRingK, 1.25))",
    );
    far.dispose();
  });
});

describe("BR far forest (render audit 2026-11-15)", () => {
  let world: ReturnType<typeof vegetationWorld>;
  beforeAll(async () => {
    const hf = await decodeHeightfield(buffer("public/fps/br/height.v3.hf"));
    const cover = await decodeLandCover(buffer("public/fps/br/landcover.v2.lc"));
    const meta = JSON.parse(readFileSync("public/fps/br/world.v2.json", "utf8")) as WorldMeta;
    world = vegetationWorld(hf, cover, meta);
  });

  it("paints cover where the trees stand and none where there are none", async () => {
    const size = 512;
    const { data } = await bakeTreeCover(world, size);
    const texel = WORLD_SIZE / size;
    // The densest and an empty cell of the island.
    let dense = [0, 0, 0],
      empty: number[] | null = null;
    for (let cj = 0; cj < CELLS; cj++)
      for (let ci = 0; ci < CELLS; ci++) {
        const n = cellTrees(world, ci, cj).length / TREE_STRIDE;
        if (n > dense[2]!) dense = [ci, cj, n];
        if (!n && !empty && ci > 2 && cj > 2) empty = [ci, cj];
      }
    const mean = (ci: number, cj: number) => {
      let sum = 0,
        n = 0;
      // The cell's inner part (a crown reaches a texel into its neighbours).
      for (let z = cj * 250 + 30; z < cj * 250 + 220; z += texel)
        for (let x = ci * 250 + 30; x < ci * 250 + 220; x += texel) {
          sum += data[(Math.floor(z / texel) * size + Math.floor(x / texel)) * 2]!;
          n++;
        }
      return sum / n / 255;
    };
    expect(dense[2]).toBeGreaterThan(300);
    expect(mean(dense[0]!, dense[1]!)).toBeGreaterThan(0.3);
    expect(empty).not.toBeNull();
    expect(mean(empty![0]!, empty![1]!)).toBe(0);
    void WORLD_HALF;
  });

  it("only takes over beyond the fight range, and is whole before the trees thin out", () => {
    expect(VEGETATION_VIEW.viewDistance * FAR_FOREST.from).toBeGreaterThanOrEqual(1000);
    expect(FAR_FOREST.from).toBeLessThan(FAR_FOREST.full);
    expect(FAR_FOREST.full).toBeLessThan(1);
  });
});

describe("BR roads over far ground (render audit 2026-11-15)", () => {
  it("do not rise near the camera", () => {
    expect(ROAD_LIFT.from).toBeGreaterThanOrEqual(390);
    // About a pixel at most: a 1632 × 918 view of 70° resolves 1.3 mm a metre.
    expect(ROAD_LIFT.perMetre).toBeLessThan(0.002);
  });
});
