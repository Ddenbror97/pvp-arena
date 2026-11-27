import { readFileSync } from "node:fs";
import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { applyFloorFinish, floorFinishOf } from "@/lib/fps/br/interior-style";
import { WORLD_ASSETS } from "@/lib/fps/br/world";

/** The JSON chunk of a GLB. */
function glbJson(file: string) {
  const b = readFileSync(`public${file}`);
  const len = b.readUInt32LE(12);
  return JSON.parse(b.subarray(20, 20 + len).toString("utf8")) as {
    materials: { name: string }[];
  };
}

describe("floors with a finish (owner, 2026-11-27: klinker in the apartments)", () => {
  it("names the finishes it draws, and nothing else", () => {
    for (const kind of ["klinker", "tiles", "planks", "marble", "carpet", "deck"])
      expect(floorFinishOf(new THREE.MeshStandardMaterial({ name: `Floor finish: ${kind}` }))).toBe(kind);
    expect(floorFinishOf(new THREE.MeshStandardMaterial({ name: "Floor finish: lava" }))).toBe(null);
    expect(floorFinishOf(new THREE.MeshStandardMaterial({ name: "Access floor and steps" }))).toBe(null);
  });

  it("patches the shader once: the pattern over the floor's own colour", () => {
    const m = new THREE.MeshStandardMaterial({ name: "Floor finish: klinker" });
    applyFloorFinish(m);
    const first = m.onBeforeCompile;
    applyFloorFinish(m);
    expect(m.onBeforeCompile).toBe(first);
    expect(m.vertexColors).toBe(true);
    const shader = {
      vertexShader: "#include <common>\n#include <project_vertex>",
      fragmentShader: "#include <common>\n#include <color_fragment>",
      uniforms: {},
    } as unknown as THREE.WebGLProgramParametersWithUniforms;
    m.onBeforeCompile(shader, {} as THREE.WebGLRenderer);
    expect(shader.vertexShader).toContain("vBrFfWorld = (modelMatrix * w).xyz");
    expect(shader.fragmentShader).toContain("brFfLine");
    expect(shader.fragmentShader).toContain("brKlinker");
    expect(m.customProgramCacheKey()).toContain("br-floor-finish-v1-klinker");
  });

  it("gives the white apartment block klinker in its stairwell, corridor, stairs and balconies, and the towers their finishes", () => {
    const manifest = JSON.parse(readFileSync(`public${WORLD_ASSETS.models}`, "utf8")) as {
      models: Record<string, { lods: { file: string }[] }>;
    };
    const finishes = (id: string) =>
      glbJson(manifest.models[id]!.lods[0]!.file)
        .materials.map((x) => x.name)
        .filter((n) => n.startsWith("Floor finish: "))
        .sort();
    expect(finishes("apartment")).toEqual(["Floor finish: klinker"]);
    for (const style of ["condo", "brick", "office"]) {
      expect(finishes(`${style}-floor`), style).toEqual([
        "Floor finish: carpet",
        "Floor finish: deck",
        "Floor finish: marble",
        "Floor finish: planks",
        "Floor finish: tiles",
      ]);
      expect(finishes(`${style}-lobby`), style).toContain("Floor finish: marble");
    }
  });
});
