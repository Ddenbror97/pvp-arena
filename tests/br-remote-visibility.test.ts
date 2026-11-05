import { expect, test } from "vitest";
import { brVisibleRows, brActorPriority } from "../src/lib/fps/br/remote-visibility";

test("BR bots follow the playback visibility boundary, without early hides or stale reveals", () => {
  const a = { at: 100, rows: new Map([[1, [1, 10, 0, 0]]]) };
  const b = { at: 200, rows: new Map([[2, [2, 20, 0, 0]]]) };
  const out = new Map<number, number[]>();
  brVisibleRows(a, b, 150, out);
  expect([...out.keys()]).toEqual([1]);
  brVisibleRows(a, b, 200, out);
  expect([...out.keys()]).toEqual([2]);
  brVisibleRows(b, b, 300, out);
  expect([...out.keys()]).toEqual([2]);
});

test("full operator rigs favor visible living bots and retain assignments near the cutoff", () => {
  expect(brActorPriority(110, 1, true, true)).toBeLessThan(brActorPriority(100, 1, false, true));
  expect(brActorPriority(200, 1, false, true)).toBeLessThan(brActorPriority(100, -1, false, true));
  expect(brActorPriority(100, 1, false, true)).toBeLessThan(brActorPriority(100, 1, true, false));
});
