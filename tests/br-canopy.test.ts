import { readFileSync } from "node:fs";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { beforeAll, describe, expect, it } from "vitest";
import {
  COLLAPSE_S,
  createCanopy,
  createFarCanopies,
  DEPLOY_S,
  type CanopyPose,
  type CanopyTemplate,
} from "@/lib/fps/br/canopy";

// canopy.ts's loader, minus the network: the same split of the asset.
let template: CanopyTemplate;
beforeAll(async () => {
  const f = readFileSync("public/fps/br/models/canopy.glb");
  const gltf = await new GLTFLoader().parseAsync(
    f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength),
    "",
  );
  const near = new THREE.Group();
  let far: CanopyTemplate["far"] | null = null;
  for (const child of [...gltf.scene.children]) {
    if (child.name === "CanopyFar" && child instanceof THREE.Mesh)
      far = { geometry: child.geometry, material: child.material as THREE.Material };
    else near.add(child);
  }
  template = { near, far: far! };
});

const pose = (p: Partial<CanopyPose> = {}): CanopyPose => ({
  deploy: 10,
  landed: -1,
  brakeL: 0,
  brakeR: 0,
  dive: 0,
  time: 0,
  ...p,
});

describe("the players' ram-air canopy (owner's parachute spec)", () => {
  it("is a cheap, game-ready asset: a cell wing with steering morphs, lines, a far stand-in", () => {
    let wing: THREE.Mesh | undefined, lines: THREE.LineSegments | undefined;
    template.near.traverse((o) => {
      if (o instanceof THREE.LineSegments) lines = o;
      else if (o instanceof THREE.Mesh) wing = o;
    });
    expect(wing).toBeDefined();
    expect(lines).toBeDefined();
    const tris = wing!.geometry.index!.count / 3;
    expect(tris).toBeLessThan(5000);
    expect(Object.keys(wing!.morphTargetDictionary ?? {})).toEqual(["brakeL", "brakeR", "flare"]);
    expect(lines!.geometry.morphAttributes["position"]).toHaveLength(3);
    expect(lines!.geometry.attributes["position"]!.count / 2).toBeGreaterThan(40);
    expect(template.far.geometry.index!.count / 3).toBeLessThanOrEqual(200);
    // Span about 8.4 m, the canopy about 5–6 m above the harness, the lines down to it.
    const box = new THREE.Box3().setFromObject(wing!);
    expect(box.max.x - box.min.x).toBeGreaterThan(8);
    expect(box.max.y).toBeGreaterThan(5);
    const lb = new THREE.Box3().setFromObject(lines!);
    expect(lb.min.y).toBeLessThan(0.1);
  });

  it("opens over the deploy time, steers by morph and bank, and collapses after landing", () => {
    const c = createCanopy(template);
    let wing!: THREE.Mesh;
    c.root.traverse((o) => {
      if (o instanceof THREE.Mesh) wing = o;
    });
    const body = c.root.children[0]!;
    // Packed above the head, then spread and filled.
    c.pose(pose({ deploy: 0.05 }));
    expect(body.scale.x).toBeLessThan(0.3);
    expect(body.scale.y).toBeLessThan(0.4);
    c.pose(pose({ deploy: DEPLOY_S + 0.5 }));
    expect(body.scale.x).toBeCloseTo(1, 2);
    expect(body.scale.z).toBeCloseTo(1, 2);
    // Right toggle: the right trailing edge down and a bank to the right (negative roll).
    c.pose(pose({ brakeR: 1 }));
    expect(wing.morphTargetInfluences![1]).toBeCloseTo(1, 5);
    expect(wing.morphTargetInfluences![0]).toBe(0);
    expect(body.rotation.z).toBeLessThan(-0.1);
    // Both toggles: the flare.
    c.pose(pose({ brakeL: 1, brakeR: 1 }));
    expect(wing.morphTargetInfluences![2]).toBeCloseTo(1, 5);
    // Diving: the canopy noses down.
    c.pose(pose({ dive: 1 }));
    expect(body.rotation.x).toBeLessThan(-0.2);
    // Landing: it settles behind and goes once collapsed.
    expect(c.pose(pose({ landed: COLLAPSE_S * 0.5 }))).toBe(true);
    expect(body.rotation.x).toBeGreaterThan(0.3);
    expect(c.pose(pose({ landed: COLLAPSE_S + 0.1 }))).toBe(false);
    expect(c.root.visible).toBe(false);
  });

  it("draws distant canopies in one instanced mesh", () => {
    const far = createFarCanopies(template, 100);
    far.begin();
    for (let i = 0; i < 120; i++) far.add(new THREE.Vector3(i, 300, 0), 0, 0);
    far.end();
    expect(far.mesh.count).toBe(100);
  });
});
