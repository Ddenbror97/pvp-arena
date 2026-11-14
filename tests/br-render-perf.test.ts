import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { batchable, buildBatches } from "../src/lib/fps/br/props-batch";
import { brResolutionScale } from "../src/lib/fps/br/br-settings";
import { AIR_VIEW, createProps, RINGS, type ModelManifest } from "../src/lib/fps/br/props-renderer";
import type { Placement } from "../src/lib/fps/br/layout";
import type { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

/** A far-LOD-like mesh: quantised int16 positions, uint8 colours, its node transform apart. */
function farLod(material: THREE.Material, size = 1) {
  const g = new THREE.BufferGeometry();
  g.setAttribute(
    "position",
    new THREE.BufferAttribute(new Int16Array([0, 0, 0, 32767, 0, 0, 0, 32767, 0]), 3, true),
  );
  g.setAttribute(
    "color",
    new THREE.BufferAttribute(new Uint8Array([255, 0, 0, 0, 255, 0, 0, 0, 255]), 3, true),
  );
  g.setIndex([0, 1, 2]);
  const mesh = new THREE.InstancedMesh(g, material, 4);
  const local = new THREE.Matrix4().makeScale(size, size, size);
  return { mesh, local };
}
const flat = () =>
  new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.9,
    metalness: 0,
    flatShading: true,
  });

describe("BR render performance (2026-11-09 real-GPU benchmark)", () => {
  it("keeps full resolution at the budget's first step and lowers it one step later", () => {
    expect(brResolutionScale(1)).toBe(1);
    expect(brResolutionScale(0.9)).toBe(1);
    expect(brResolutionScale(0.8)).toBeCloseTo(0.9);
    expect(brResolutionScale(0.6)).toBeCloseTo(0.7);
  });

  it("batches only opaque, untextured standard materials", () => {
    expect(batchable(flat())).toBe(true);
    const textured = flat();
    textured.map = new THREE.Texture();
    expect(batchable(textured)).toBe(false);
    expect(batchable(Object.assign(flat(), { transparent: true }))).toBe(false);
    const glowing = flat();
    glowing.emissive.set(0xffffff);
    expect(batchable(glowing)).toBe(false);
    expect(batchable(new THREE.MeshPhysicalMaterial())).toBe(false);
    expect(batchable([flat(), flat()])).toBe(false);
  });

  it("groups far LODs by material into one batch with the node transform baked in", () => {
    const a = farLod(flat(), 2),
      b = farLod(flat(), 3),
      single = farLod(Object.assign(flat(), { side: THREE.DoubleSide }));
    const members = [
      { ...a, placements: 10, model: "house" },
      { ...b, placements: 10, model: "house" }, // the same model's other far LOD
      { ...single, placements: 5, model: "shed" }, // alone in its group: stays instanced
    ];
    const batches = buildBatches(members);
    expect(batches).toHaveLength(1);
    const [batch] = batches;
    expect(batch!.members).toEqual([0, 1]);
    expect(batch!.geometry[2]).toBe(-1);
    // One model's LODs share their placements: room for 10 instances, not 20.
    expect(batch!.mesh.maxInstanceCount).toBe(10);
    // Positions dequantised (normalized int16) and scaled by each member's node transform.
    const box = new THREE.Box3();
    batch!.mesh.getBoundingBoxAt(batch!.geometry[1]!, box);
    expect(box.max.x).toBeCloseTo(3, 3);
    batch!.mesh.getBoundingBoxAt(batch!.geometry[0]!, box);
    expect(box.max.x).toBeCloseTo(2, 3);
    // Colours carried as floats; the batch does not cull or sort per instance (no per-frame walk).
    const color = batch!.mesh.geometry.getAttribute("color");
    expect(color.normalized).toBe(false);
    expect(color.getX(0)).toBeCloseTo(1);
    expect(batch!.mesh.perObjectFrustumCulled).toBe(false);
    expect(batch!.mesh.sortObjects).toBe(false);
    batch!.mesh.dispose();
  });
});

describe("BR props are culled against the view (performance audit 2026-11-14)", () => {
  /** A loader whose every file is one box of `size` metres, offset from the model's origin. */
  const boxLoader = (size: number, offset: number) =>
    ({
      loadAsync: async () => {
        const scene = new THREE.Group();
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(size, size, size),
          new THREE.MeshStandardMaterial(),
        );
        mesh.position.set(offset, 0, 0);
        scene.add(mesh);
        return { scene };
      },
    }) as unknown as GLTFLoader;
  const manifest = (ids: string[]): ModelManifest => ({
    models: Object.fromEntries(
      ids.map((id) => [
        id,
        {
          class: "prop",
          size: [2, 2, 2],
          lods: [0, 1, 2].map((l) => ({ file: `/${id}.lod${l}.glb`, tris: 12 })),
        },
      ]),
    ),
  });
  const place = (model: string, x: number, y: number, z: number): Placement => ({
    model,
    x,
    y,
    z,
    turn: 1,
    poi: "test",
  });
  const camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.1, 5000);
  const frustum = new THREE.Frustum();
  const look = (x: number, y: number, z: number) => {
    camera.position.set(0, 1.7, 0);
    camera.lookAt(x, y, z);
    camera.updateMatrixWorld(true);
    frustum.setFromProjectionMatrix(
      new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse),
    );
  };
  const drawn = (props: ReturnType<typeof createProps>) =>
    (props.root.children as THREE.InstancedMesh[]).filter((m) => m.visible && m.count > 0);

  it("draws a model whose instances are all behind the view not at all", async () => {
    // "yard": a cluster 60 m east; "lamp": a ring round the camera.
    const placements = [
      ...Array.from({ length: 12 }, (_, i) => place("yard", 60 + (i % 4) * 3, 0, (i >> 2) * 3)),
      ...Array.from({ length: 12 }, (_, i) =>
        place("lamp", Math.cos(i / 2) * 40, 0, Math.sin(i / 2) * 40),
      ),
    ];
    const props = createProps(placements, manifest(["yard", "lamp"]), boxLoader(2, 0), {
      preload: true,
    });
    await props.ready;
    look(-100, 1.7, 0); // west: the yard is behind
    props.update(camera, true);
    const seen = (id: string) =>
      drawn(props)
        .filter((m) => m.name.startsWith(id))
        .some((m) => m.frustumCulled && frustum.intersectsObject(m));
    expect(drawn(props).some((m) => m.name.startsWith("yard"))).toBe(true); // selected by distance
    expect(seen("yard")).toBe(false); // and culled by the view
    expect(seen("lamp")).toBe(true);
    look(100, 1.7, 0); // east: the yard is ahead
    expect(seen("yard")).toBe(true);
    props.dispose();
  });

  it("keeps every drawn instance inside its mesh's cull sphere, geometry and turn included", async () => {
    let seed = 7;
    const random = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff), seed / 0x7fffffff);
    const placements = Array.from({ length: 300 }, (_, i) =>
      place(i % 3 ? "a" : "b", (random() - 0.5) * 1800, random() * 80, (random() - 0.5) * 1800),
    ).map((p, i) => ({ ...p, turn: i % 4 }));
    // The geometry stands 9 m off the model's origin: the sphere must cover it at every turn.
    const props = createProps(placements, manifest(["a", "b"]), boxLoader(4, 9), { preload: true });
    await props.ready;
    look(0, 0, -100);
    props.update(camera, true);
    const corner = new THREE.Vector3(),
      matrix = new THREE.Matrix4();
    let checked = 0;
    for (const mesh of drawn(props)) {
      const sphere = mesh.boundingSphere!;
      expect(sphere.radius).toBeGreaterThan(0);
      const box = mesh.geometry.boundingBox!;
      for (let i = 0; i < mesh.count; i++) {
        mesh.getMatrixAt(i, matrix);
        for (const [x, y, z] of [
          [box.min.x, box.min.y, box.min.z],
          [box.max.x, box.max.y, box.max.z],
          [box.min.x, box.max.y, box.max.z],
          [box.max.x, box.min.y, box.min.z],
        ] as const) {
          corner.set(x, y, z).applyMatrix4(matrix);
          expect(corner.distanceTo(sphere.center)).toBeLessThanOrEqual(sphere.radius + 1e-6);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(200);
    props.dispose();
  });
});

describe("BR props follow the camera up and down (owner, 2026-11-14: houses from the parachute)", () => {
  const loader = {
    loadAsync: async () => {
      const scene = new THREE.Group();
      scene.add(new THREE.Mesh(new THREE.BoxGeometry(8, 6, 8), new THREE.MeshStandardMaterial()));
      return { scene };
    },
  } as unknown as GLTFLoader;
  const manifest = (cls: string): ModelManifest => ({
    models: {
      house: {
        class: cls,
        size: [8, 6, 8],
        lods: [0, 1, 2].map((l) => ({ file: `/house.lod${l}.glb`, tris: 12 })),
      },
    },
  });
  // (More than BATCH_MAX_PLACEMENTS, so the far LOD is an instanced mesh here, not a batch.)
  const N = 36;
  const town = (): Placement[] =>
    Array.from({ length: N }, (_, i) => ({
      model: "house",
      x: ((i % 6) - 2.5) * 8,
      y: 0,
      z: (Math.floor(i / 6) - 2.5) * 8,
      turn: 0,
      poi: "test",
    }));
  const camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.1, 9000);
  const at = (x: number, y: number, z: number) => {
    camera.position.set(x, y, z);
    camera.updateMatrixWorld(true);
  };
  /** Instances drawn per LOD (0, 1, 2). */
  const drawn = (props: ReturnType<typeof createProps>) =>
    [0, 1, 2].map((l) =>
      (props.root.children as THREE.InstancedMesh[])
        .filter((m) => m.name === `house.lod${l}` && m.visible)
        .reduce((n, m) => n + m.count, 0),
    );
  /** Frames of the spread reselect, as the game calls it. */
  const frames = (props: ReturnType<typeof createProps>, n = 30) => {
    for (let i = 0; i < n; i++) props.update(camera);
  };

  it("reselects on a fall straight down, not only on sideways movement", async () => {
    // `prop`: near to 70 m, middle to 250 m, far to 1000 m, the same at every view distance.
    const props = createProps(town(), manifest("prop"), loader, { preload: true });
    await props.ready;
    at(0, 1200, 0);
    props.update(camera, true);
    expect(drawn(props)).toEqual([0, 0, 0]); // out of range from 1.2 km up
    // Down in steps shorter than a jump, never moving sideways.
    for (let y = 1100; y >= 600; y -= 100) {
      at(0, y, 0);
      frames(props);
    }
    expect(drawn(props)).toEqual([0, 0, N]);
    for (let y = 500; y >= 200; y -= 100) {
      at(0, y, 0);
      frames(props);
    }
    expect(drawn(props)).toEqual([0, N, 0]);
    at(0, 100, 0);
    frames(props);
    at(0, 30, 0);
    frames(props);
    expect(drawn(props)).toEqual([N, 0, 0]);
    // And back up (a lift, a rope): the same in the other direction.
    at(0, 120, 0);
    frames(props);
    expect(drawn(props)).toEqual([0, N, 0]);
    props.dispose();
  });

  it("finishes a pass at once after a long drop, as after a teleport", async () => {
    const props = createProps(town(), manifest("prop"), loader, { preload: true });
    await props.ready;
    at(0, 900, 0);
    props.update(camera, true);
    at(0, 10, 0);
    props.update(camera); // one frame
    expect(drawn(props)).toEqual([N, 0, 0]);
    props.dispose();
  });

  it("keeps houses on their textured LOD twice as far from the air, and only from the air", async () => {
    // `dwelling`: near to 100 m, middle to 600 m, far to 4 km.
    const ring = RINGS["dwelling"]!;
    const far = ring[1] * 1.5; // past the middle ring on foot, inside it from the air
    const props = createProps(town(), manifest("dwelling"), loader, {
      preload: true,
      ground: () => 0,
    });
    await props.ready;
    at(far, 1.7, 0); // on foot
    props.update(camera, true);
    expect(drawn(props)).toEqual([0, 0, N]);
    at(far * 0.8, far * 0.6, 0); // the same distance, 540 m up
    props.update(camera, true);
    expect(drawn(props)).toEqual([0, N, 0]);
    // On the roof of the tallest tower (under AIR_VIEW.from) nothing changes.
    at(far, AIR_VIEW.from - 10, 0);
    props.update(camera, true);
    expect(drawn(props)).toEqual([0, 0, N]);
    // Never past the far ring, and props that are cover keep their rings in the air.
    const cover = createProps(town(), manifest("prop"), loader, { preload: true, ground: () => 0 });
    await cover.ready;
    at(300, 400, 0); // 500 m: past `prop`'s middle ring of 250 m
    cover.update(camera, true);
    expect(
      (cover.root.children as THREE.InstancedMesh[])
        .filter((m) => m.name === "house.lod1" && m.visible)
        .reduce((n, m) => n + m.count, 0),
    ).toBe(0);
    props.dispose();
    cover.dispose();
  });
});
