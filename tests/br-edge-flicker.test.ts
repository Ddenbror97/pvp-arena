import { readFileSync } from "node:fs";
import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { DEPTH_PULL, pullDepth } from "@/lib/fps/br/depth-bias";
import { createDoorRenderer, LINING_INSET, type DoorLook } from "@/lib/fps/br/door-renderer";
import type { DoorSet } from "@/lib/fps/br/doors";
import { createPaneRenderer } from "@/lib/fps/br/pane-renderer";
import type { PaneSet } from "@/lib/fps/br/panes";

/**
 * Edges that flickered while you moved and stood still when you did (owner, 2026-11-24: "next
 * flimmer/flicker. the edges of the windows and the foundation of the apartmentbuildings. issue
 * only happends while running/moving not standing still", and "also audit inside the apartment
 * with panorama glass, it can be some flicker from the doors edges inside/interiors").
 */
const vertexOf = (material: THREE.Material) => {
  const shader = {
    uniforms: {} as Record<string, unknown>,
    vertexShader: "#include <common>\n#include <project_vertex>\n#include <logdepthbuf_vertex>",
    fragmentShader: "",
  };
  material.onBeforeCompile(shader as never, null as never);
  return shader.vertexShader;
};

describe("pulled along the sight line, not by a polygon offset", () => {
  it("moves the surface toward the eye by a share of its distance, the same place on screen", () => {
    const m = pullDepth(new THREE.MeshStandardMaterial({ polygonOffset: true }), 5e-4);
    expect(m.polygonOffset).toBe(false);
    const v = vertexOf(m);
    expect(v).toContain(
      "if (!isOrthographic) gl_Position = projectionMatrix * vec4(mvPosition.xyz * 0.9995000, 1.0);",
    );
    // After three's own projection, before the logarithmic depth reads gl_Position.w.
    expect(v.indexOf("mvPosition.xyz * 0.9995")).toBeGreaterThan(
      v.indexOf("#include <project_vertex>"),
    );
    expect(v.indexOf("mvPosition.xyz * 0.9995")).toBeLessThan(
      v.indexOf("#include <logdepthbuf_vertex>"),
    );
    // The same screen position: scaling a view-space point about the eye keeps x/w and y/w.
    const cam = new THREE.PerspectiveCamera(70, 16 / 9, 0.1, 14000);
    cam.updateProjectionMatrix();
    const p = new THREE.Vector4(3, -1.6, -20, 1).applyMatrix4(cam.projectionMatrix);
    const q = new THREE.Vector4(3 * 0.9995, -1.6 * 0.9995, -20 * 0.9995, 1).applyMatrix4(
      cam.projectionMatrix,
    );
    expect(q.x / q.w).toBeCloseTo(p.x / p.w, 9);
    expect(q.y / q.w).toBeCloseTo(p.y / p.w, 9);
    expect(q.w).toBeLessThan(p.w);
  });

  it("keeps the material's own patch and gives it its own program", () => {
    const m = new THREE.MeshStandardMaterial();
    m.onBeforeCompile = (s) => {
      s.uniforms["uMine"] = { value: 1 };
    };
    m.customProgramCacheKey = () => "mine-v1";
    pullDepth(m, DEPTH_PULL.paved);
    const s = {
      uniforms: {} as Record<string, unknown>,
      vertexShader: "#include <project_vertex>",
      fragmentShader: "",
    };
    m.onBeforeCompile(s as never, null as never);
    expect(s.uniforms["uMine"]).toBeDefined();
    expect(m.customProgramCacheKey()).toBe(`mine-v1|pull-${DEPTH_PULL.paved}`);
  });

  it("draws over the foot of what stands on a lot by a hundredth of a pixel, not two pixels", () => {
    // From eye height (1.65 m), 1080 rows over a 70° view: a wall's pixels within `pull` × d
    // along the ray of the lot behind it are drawn over, h < pull × d × 1.65 / d.
    const pixel = (2 * Math.tan((35 * Math.PI) / 180)) / 1080;
    for (const d of [5, 10, 20, 40, 60, 100, 300]) {
      const over = (DEPTH_PULL.paved * d * 1.65) / d;
      expect(over / (d * pixel), `at ${d} m`).toBeLessThan(0.25);
    }
  });

  it("is what the road, lot and runway strips, the floor patches and the glass use", () => {
    for (const [file, key] of [
      ["structures-renderer.ts", "pullDepth(material, DEPTH_PULL.paved)"],
      ["floor-patches.ts", "pullDepth(material, DEPTH_PULL.paved)"],
      ["pane-renderer.ts", "pullDepth(material, DEPTH_PULL.pane)"],
    ] as const) {
      const src = readFileSync(`src/lib/fps/br/${file}`, "utf8");
      expect(src, file).toContain(key);
      expect(src, file).not.toMatch(/polygonOffset(Factor)?:/);
    }
  });
});

describe("the glass is one sheet", () => {
  const set: PaneSet = {
    count: 2,
    // A pane thin along x and one thin along z.
    boxes: new Float32Array([0, 0, 0, 0.08, 2, 1.4, 5, 0, 5, 6.4, 2, 5.08]),
    placement: new Int32Array([-1, -1]),
  } as unknown as PaneSet;

  it("drops the box's edge faces (by their normal against the thinnest scale), keeps the sides", () => {
    const scene = new THREE.Scene();
    const panes = createPaneRenderer(scene, set);
    const glass = scene.children.find(
      (o) => (o as THREE.InstancedMesh).isInstancedMesh,
    ) as THREE.InstancedMesh;
    const v = vertexOf(glass.material as THREE.Material);
    expect(v).toContain(
      "if (abs(dot(normal, paneThin)) < 0.5) gl_Position = vec4(0.0, 0.0, 2.0, 1.0);",
    );
    // In the shader's terms, on the two panes: of the box's six faces the two across the
    // thin axis stay.
    const m = new THREE.Matrix4(),
      pos = new THREE.Vector3(),
      q = new THREE.Quaternion(),
      s = new THREE.Vector3();
    const normals = [
      [1, 0, 0],
      [-1, 0, 0],
      [0, 1, 0],
      [0, -1, 0],
      [0, 0, 1],
      [0, 0, -1],
    ];
    for (let i = 0; i < 2; i++) {
      glass.getMatrixAt(i, m);
      m.decompose(pos, q, s);
      const thin = s.x <= s.y && s.x <= s.z ? [1, 0, 0] : s.z <= s.y ? [0, 0, 1] : [0, 1, 0];
      const kept = normals.filter(
        (n) => Math.abs(n[0]! * thin[0]! + n[1]! * thin[1]! + n[2]! * thin[2]!) >= 0.5,
      );
      expect(kept).toEqual(
        i === 0
          ? [
              [1, 0, 0],
              [-1, 0, 0],
            ]
          : [
              [0, 0, 1],
              [0, 0, -1],
            ],
      );
    }
    panes.dispose();
  });
});

describe("a door's lining stays inside the wall", () => {
  it("ends LINING_INSET inside both faces, never proud of them", () => {
    const door = {
      id: 0,
      x: 10,
      z: 20,
      y0: 0.3,
      y1: 2.8,
      along: "z" as const,
      width: 1.6,
      box: [9.96, 0.3, 19.2, 10.04, 2.8, 20.8] as [number, number, number, number, number, number],
      model: "m",
      index: 0,
      turn: 0 as const,
    };
    const set = {
      doors: [door],
      cells: new Map(),
    } as unknown as DoorSet;
    const look: DoorLook = {
      data: {
        atlas: [64, 64],
        lining: 0.03,
        models: {
          m: [
            {
              rect: [0, 0, 32, 64],
              width: 1.6,
              shift: 0,
              y0: 0.3,
              y1: 2.8,
              out: -1,
              front: 0.15,
              back: 0.151,
              rim: [150, 150, 150],
            },
          ],
        },
      },
      atlas: new THREE.Texture(),
    };
    const doors = createDoorRenderer(new THREE.Scene(), set, look);
    doors.update(0, 0, new THREE.Vector3(10, 1.6, 30));
    const { linings } = doors.stats();
    expect(linings.count).toBe(3);
    const m = new THREE.Matrix4(),
      pos = new THREE.Vector3(),
      q = new THREE.Quaternion(),
      s = new THREE.Vector3();
    for (let k = 0; k < 3; k++) {
      linings.getMatrixAt(k, m);
      m.decompose(pos, q, s);
      // Its depth runs across the wall (world x here), centred on the wall's middle.
      expect(s.z).toBeCloseTo(0.15 + 0.151 - 2 * LINING_INSET, 6);
      expect(Math.abs(pos.x - (10 + ((0.15 - 0.151) / 2) * -1))).toBeLessThan(0.002);
    }
    doors.dispose();
  });
});
