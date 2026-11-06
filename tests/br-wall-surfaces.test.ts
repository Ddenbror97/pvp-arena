import { expect, test } from "vitest";
import { resolveCoplanarSurfaces } from "../art/blender/br/coplanar-surfaces.mjs";

const vertex = ([x, y, z]: number[]) => ({
  POSITION: [x, y, z],
  NORMAL: [0, 0, 1],
  TEXCOORD_0: [x! / 4, y! / 4],
});
const face = (points: number[][], doubleSided = false) => ({
  vertices: points.map(vertex),
  doubleSided,
});
const backing = () =>
  face([
    [0, 0, 0],
    [4, 0, 0],
    [0, 4, 0],
  ]);
const trim = () =>
  face([
    [0.5, 0.5, 0],
    [1.5, 0.5, 0],
    [0.5, 1.5, 0],
  ]);
const area = (f: ReturnType<typeof face>) => {
  const [a, b, c] = f.vertices.map((v) => v.POSITION);
  return (
    Math.abs((b![0]! - a![0]!) * (c![1]! - a![1]!) - (b![1]! - a![1]!) * (c![0]! - a![0]!)) / 2
  );
};
test("coplanar trim owns its area without moving walls, losing UVs or creating a hole", () => {
  const result = resolveCoplanarSurfaces([backing(), trim()]);
  expect(result.coveredArea).toBeCloseTo(0.5);
  expect(
    result.faces.reduce((sum: number, f: ReturnType<typeof face>) => sum + area(f), 0),
  ).toBeCloseTo(8);
  expect(result.faces.some((f: ReturnType<typeof face>) => Math.abs(area(f) - 0.5) < 1e-8)).toBe(
    true,
  );
  for (const f of result.faces)
    for (const v of f.vertices) {
      expect(v.POSITION[2]).toBe(0);
      expect(v.TEXCOORD_0).toEqual([v.POSITION[0] / 4, v.POSITION[1] / 4]);
    }
  expect(resolveCoplanarSurfaces(result.faces).overlapsResolved).toBe(0);
});
test("shared wall/trim boundary vertices survive clipping", () => {
  const edgeTrim = face([
    [0, 0, 0],
    [2, 0, 0],
    [0, 2, 0],
  ]);
  const result = resolveCoplanarSurfaces([backing(), edgeTrim]);
  expect(
    result.faces.reduce((sum: number, f: ReturnType<typeof face>) => sum + area(f), 0),
  ).toBeCloseTo(8);
  expect(result.coveredArea).toBeCloseTo(2);
  for (const f of result.faces) {
    const [a, b, c] = f.vertices.map((v) => v.POSITION);
    expect((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])).toBeGreaterThan(0);
  }
});

test("touching faces and separate thin walls stay separate", () => {
  const t = trim();
  t.vertices.forEach((v) => (v.POSITION[2] = 0.0002));
  const adjacent = face([
    [4, 0, 0],
    [4, 4, 0],
    [0, 4, 0],
  ]);
  const result = resolveCoplanarSurfaces([backing(), adjacent, t]);
  expect(result.overlapsResolved).toBe(0);
  expect(result.faces).toHaveLength(3);
});
test("back-face interiors survive culling; double-sided duplicates get one surface owner", () => {
  const front = backing(),
    back = backing();
  back.vertices.reverse();
  expect(resolveCoplanarSurfaces([front, back]).faces).toHaveLength(2);
  front.doubleSided = back.doubleSided = true;
  const result = resolveCoplanarSurfaces([front, back]);
  expect(result.faces).toHaveLength(1);
  expect(result.faces.reduce((sum: number, f: ReturnType<typeof face>) => sum + area(f), 0)).toBe(
    8,
  );
  expect(resolveCoplanarSurfaces([backing(), { ...trim(), opaque: false }]).faces).toHaveLength(2);
  expect(resolveCoplanarSurfaces([{ ...backing(), doubleSided: true }, trim()]).coveredArea).toBe(
    0,
  );
});
