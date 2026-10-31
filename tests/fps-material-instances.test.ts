import { it, expect, vi } from "vitest";
import { Group, Mesh, BoxGeometry, MeshStandardMaterial } from "three";
import { cloneAuthoredModel } from "../src/lib/fps/authored-assets";

it("preserves intra-model material sharing without leaking tint or disposal between players", () => {
  const source = new Group(),
    material = new MeshStandardMaterial(),
    geometry = new BoxGeometry();
  source.add(new Mesh(geometry, material), new Mesh(geometry, material));
  const a = cloneAuthoredModel(source),
    b = cloneAuthoredModel(source);
  const first = (a.root.children[0] as Mesh).material as MeshStandardMaterial;
  expect((a.root.children[1] as Mesh).material).toBe(first);
  expect((b.root.children[0] as Mesh).material).not.toBe(first);
  expect(first).not.toBe(material);
  first.color.setHex(0xff0000);
  expect(material.color.getHex()).toBe(0xffffff);
  const disposed = vi.fn();
  first.addEventListener("dispose", disposed);
  a.dispose();
  expect(disposed).toHaveBeenCalledTimes(1);
  expect((b.root.children[0] as Mesh).material).not.toBe(material);
  b.dispose();
  geometry.dispose();
  material.dispose();
});
