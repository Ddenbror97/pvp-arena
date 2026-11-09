import * as THREE from "three";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { createAtmosphere, HAZE } from "@/lib/fps/br/atmosphere";

describe("Project Island sky and distant ranges (owner's H1Z1 reference)", () => {
  it("is two cheap draws at infinite distance, drawn after the world, in the fog's haze", () => {
    const a = createAtmosphere(new THREE.Vector3(-550, 620, 450));
    const meshes: THREE.Mesh[] = [];
    a.root.traverse((o) => {
      if (o instanceof THREE.Mesh) meshes.push(o);
    });
    expect(meshes).toHaveLength(2);
    let triangles = 0;
    for (const m of meshes) {
      triangles += m.geometry.index!.count / 3;
      const mat = m.material as THREE.ShaderMaterial;
      // Never culled or clipped, drawn after the opaque world so covered pixels are skipped.
      expect(m.frustumCulled).toBe(false);
      expect(mat.depthTest).toBe(true);
      expect(m.renderOrder).toBeGreaterThan(0);
    }
    const [sky, ranges] = meshes as [THREE.Mesh, THREE.Mesh];
    // The sky at the far plane after the ranges (which write depth just in front of it).
    expect(sky.renderOrder).toBeGreaterThan(ranges.renderOrder);
    expect((sky.material as THREE.ShaderMaterial).vertexShader).toContain("p.xyww");
    expect((ranges.material as THREE.ShaderMaterial).depthWrite).toBe(true);
    expect(triangles).toBeLessThan(6000);
    expect(a.haze.getHex()).toBe(HAZE);
    a.dispose();
  });
});

describe("tree impostors", () => {
  it("bleed leaf colour into their transparent pixels (black edges darken distant mips)", async () => {
    for (const id of ["pine", "oak", "birch"]) {
      const { data, info } = await sharp(`public/fps/br/models/tree-${id}.impostor.png`)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      let clear = 0,
        black = 0;
      for (let i = 0; i < info.width * info.height; i++) {
        if (data[i * 4 + 3] !== 0) continue;
        clear++;
        if (data[i * 4]! + data[i * 4 + 1]! + data[i * 4 + 2]! < 6) black++;
      }
      expect(clear).toBeGreaterThan(1000);
      expect(black / clear, id).toBeLessThan(0.01);
    }
  });
});
