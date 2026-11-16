import { afterEach, describe, expect, it, vi } from "vitest";
import { reversedDepthOptIn, wantReversedDepth } from "@/lib/fps/br/scene-target";

describe("BR depth path (2026-11-16: reversed-Z is the default where supported)", () => {
  afterEach(() => vi.unstubAllGlobals());
  const stored = (value: string | null) =>
    vi.stubGlobal("localStorage", { getItem: (k: string) => (k === "br-depth" ? value : null) });

  it("chooses reversed-Z unless this browser asked for logarithmic depth", () => {
    stored(null);
    expect(reversedDepthOptIn()).toBe(true);
    stored("log");
    expect(reversedDepthOptIn()).toBe(false);
    stored("reversed");
    expect(reversedDepthOptIn()).toBe(true);
  });

  it("still chooses it where storage is blocked", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
    });
    expect(reversedDepthOptIn()).toBe(true);
  });

  it("keeps logarithmic depth where the browser lacks what reversed-Z needs", () => {
    // No WebGL here: the support check fails, and the arena stays on the canvas path.
    expect(wantReversedDepth(true)).toBe(false);
  });
});
