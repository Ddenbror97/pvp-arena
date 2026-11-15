import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as THREE from "three";
import { CONTEXT_STUCK_MS, watchContextLoss } from "../src/lib/fps/br/context-loss";

/** A canvas that only carries the two context events. */
function fakeRenderer() {
  const listeners = new Map<string, Set<(e: Event) => void>>();
  const canvas = {
    addEventListener: (type: string, f: (e: Event) => void) =>
      void (listeners.get(type) ?? listeners.set(type, new Set()).get(type)!).add(f),
    removeEventListener: (type: string, f: (e: Event) => void) =>
      void listeners.get(type)?.delete(f),
  };
  const prevented = { count: 0 };
  const fire = (type: string) =>
    listeners
      .get(type)
      ?.forEach((f) => f({ preventDefault: () => prevented.count++ } as unknown as Event));
  return { renderer: { domElement: canvas } as unknown as THREE.WebGLRenderer, fire, prevented };
}

describe("battle royale graphics context loss", () => {
  beforeEach(() => void vi.useFakeTimers());
  afterEach(() => void vi.useRealTimers());

  it("pauses on a loss, asks for the context back, and resumes when it returns", () => {
    const { renderer, fire, prevented } = fakeRenderer();
    const seen: string[] = [];
    const watch = watchContextLoss(renderer, {
      onLost: () => seen.push("lost"),
      onRestored: () => seen.push("restored"),
      onStuck: () => seen.push("stuck"),
    });
    fire("webglcontextlost");
    expect(watch.lost).toBe(true);
    // Without preventDefault a browser never offers the context back.
    expect(prevented.count).toBe(1);
    fire("webglcontextrestored");
    expect(watch.lost).toBe(false);
    expect(watch.recoveries).toBe(1);
    // A context that came back in time is never reported as stuck afterwards.
    vi.advanceTimersByTime(CONTEXT_STUCK_MS * 2);
    expect(seen).toEqual(["lost", "restored"]);
  });

  it("reports a context the browser never gives back (owner, 2026-11-15: a white screen)", () => {
    const { renderer, fire } = fakeRenderer();
    const seen: string[] = [];
    const watch = watchContextLoss(renderer, {
      onLost: () => seen.push("lost"),
      onStuck: () => seen.push("stuck"),
    });
    fire("webglcontextlost");
    vi.advanceTimersByTime(CONTEXT_STUCK_MS - 1);
    expect(seen).toEqual(["lost"]);
    vi.advanceTimersByTime(1);
    expect(seen).toEqual(["lost", "stuck"]);
    expect(watch.lost).toBe(true);
    // A late return still resumes the picture.
    fire("webglcontextrestored");
    expect(watch.lost).toBe(false);
  });

  it("says nothing after the match is torn down (its own context is released on dispose)", () => {
    const { renderer, fire } = fakeRenderer();
    const seen: string[] = [];
    const watch = watchContextLoss(renderer, {
      onLost: () => seen.push("lost"),
      onStuck: () => seen.push("stuck"),
    });
    fire("webglcontextlost");
    watch.dispose();
    fire("webglcontextlost");
    vi.advanceTimersByTime(CONTEXT_STUCK_MS * 2);
    expect(seen).toEqual(["lost"]);
  });
});
