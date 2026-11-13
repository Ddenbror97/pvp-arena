import { describe, expect, it, vi } from "vitest";
import { ladders, registerLadders } from "../src/lib/fps/br/ladders";
import { ropePaths } from "../src/lib/fps/br/rope";

describe("traversal caches across independent rooms", () => {
  it("does not resample rope terrain when alternating between rooms", () => {
    const a = { heightAt: vi.fn(() => 0) };
    const b = { heightAt: vi.fn(() => 10) };
    const paths = ropePaths(a);
    ropePaths(b);
    a.heightAt.mockClear();
    expect(ropePaths(a)).toEqual(paths);
    expect(a.heightAt).not.toHaveBeenCalled();
  });

  it("invalidating one room's placed ladders does not rebuild another room", () => {
    const a = { heightAt: vi.fn(() => 0) };
    const b = { heightAt: vi.fn(() => 10) };
    ladders(a);
    const before = ladders(b);
    b.heightAt.mockClear();
    registerLadders(a, []);
    expect(ladders(b)).toEqual(before);
    expect(b.heightAt).not.toHaveBeenCalled();
  });
});
