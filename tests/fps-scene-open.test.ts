import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { IRON_DISTRICT_DEFINITION } from "@/lib/fps/bomb/iron-district";
import { applyScenePatches, withoutFaces } from "@/lib/fps/maps/scene-patches";

/** Two quads across a corridor (z = 10 and z = 14), x 12..15, y 0..3. */
function walls(indexed: boolean) {
  const quad = (z: number) => [
    [12, 0, z],
    [15, 0, z],
    [15, 3, z],
    [12, 3, z],
  ];
  const corners = [...quad(10), ...quad(14)];
  const order = [0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7];
  const g = new THREE.BufferGeometry();
  const points = indexed ? corners : order.map((i) => corners[i]!);
  g.setAttribute("position", new THREE.Float32BufferAttribute(points.flat(), 3));
  if (indexed) g.setIndex(order);
  return g;
}
const BOX = [11.9, 15.1, -0.1, 3.3, 9.95, 10.25] as const;

describe("faces a map's build drew across a way through", () => {
  it.each([true, false])("leaves out the triangles inside the box (indexed: %s)", (indexed) => {
    const source = walls(indexed);
    const open = withoutFaces(source, new THREE.Matrix4(), BOX)!;
    expect(open.index!.count).toBe(6);
    const position = open.getAttribute("position");
    for (let i = 0; i < 6; i++) expect(position.getZ(open.index!.getX(i))).toBe(14);
    // The vertex data is the source's own; the source still draws both walls.
    expect(position).toBe(source.getAttribute("position"));
    expect(indexed ? source.index!.count : source.getAttribute("position").count).toBe(12);
  });

  it("places the geometry before testing it, and keeps a triangle that only partly lies inside", () => {
    const moved = new THREE.Matrix4().makeTranslation(0, 0, -4);
    const open = withoutFaces(walls(true), moved, BOX)!;
    // Moved 4 m, the far wall is the one in the box.
    expect(open.getAttribute("position").getZ(open.index!.getX(0))).toBe(10);
    expect(
      withoutFaces(walls(true), new THREE.Matrix4(), [12.5, 15.1, -0.1, 3.3, 9.95, 10.25]),
    ).toBeNull();
    expect(withoutFaces(walls(true), new THREE.Matrix4().makeTranslation(0, 9, 0), BOX)).toBeNull();
  });

  it("opens only the named node's meshes in the named materials", () => {
    const material = (name: string) => Object.assign(new THREE.MeshStandardMaterial(), { name });
    const root = new THREE.Group();
    const tunnel = new THREE.Group();
    tunnel.name = "Tunnel";
    const brick = new THREE.Mesh(walls(true), material("brick-tun"));
    const steps = new THREE.Mesh(walls(true), material("concrete"));
    tunnel.add(brick, steps);
    const elsewhere = new THREE.Mesh(walls(true), material("brick-tun"));
    elsewhere.name = "Yard";
    root.add(tunnel, elsewhere);
    const made = applyScenePatches(
      root,
      { open: [{ node: "Tunnel", materials: ["brick-tun"], box: BOX }] },
      [],
    );
    expect(brick.geometry.index!.count).toBe(6);
    expect(steps.geometry.index!.count).toBe(12);
    expect(elsewhere.geometry.index!.count).toBe(12);
    expect(made.geometries).toEqual([brick.geometry]);
  });

  it("Iron District opens the tunnel's end wall where its risers climb into the pocket", () => {
    const open = IRON_DISTRICT_DEFINITION.presentation.patches!.open!;
    expect(open).toHaveLength(1);
    const [x0, x1, y0, y1, z0, z1] = open[0]!.box;
    const exit = [...IRON_DISTRICT_DEFINITION.boxes, ...IRON_DISTRICT_DEFINITION.structures].filter(
      (s) => s.id.startsWith("tun-exit"),
    );
    expect(exit.length).toBeGreaterThan(0);
    // The wall's plane (z = 10) lies within the risers' run, across their whole width.
    const lo = Math.min(...exit.map((s) => s.z - s.d / 2)),
      hi = Math.max(...exit.map((s) => s.z + s.d / 2));
    expect(lo).toBeLessThan(z0);
    expect(hi).toBeGreaterThan(z1);
    expect(Math.min(...exit.map((s) => s.x - s.w / 2))).toBeGreaterThanOrEqual(x0);
    expect(Math.max(...exit.map((s) => s.x + s.w / 2))).toBeLessThanOrEqual(x1);
    expect(y0).toBeLessThan(0);
    expect(y1).toBeGreaterThan(3.2);
    // The risers themselves are drawn in "concrete", which stays.
    expect(open[0]!.materials).not.toContain("concrete");
  });
});
