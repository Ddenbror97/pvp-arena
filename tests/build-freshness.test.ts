import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** The page's build id is baked in at build time (vite.config.ts build-id). */
async function load(build: string | undefined) {
  vi.resetModules();
  vi.stubGlobal("__APP_BUILD__", build);
  return import("@/lib/build-freshness");
}

describe("reloadIfStale", () => {
  const store = new Map<string, string>();
  const reload = vi.fn();
  beforeEach(() => {
    store.clear();
    reload.mockReset();
    vi.stubGlobal("window", {});
    vi.stubGlobal("location", { reload });
    vi.stubGlobal("sessionStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    });
  });
  afterEach(() => vi.unstubAllGlobals());
  const deployed = (id: string | null, ok = true) =>
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok, json: async () => (id === null ? {} : { id }) })),
    );

  it("does nothing on the deployed build", async () => {
    deployed("b1");
    const { reloadIfStale } = await load("b1");
    expect(await reloadIfStale()).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
  it("reloads a page from an older build, once per deployed build", async () => {
    deployed("b2");
    const { reloadIfStale } = await load("b1");
    expect(await reloadIfStale()).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
    // Still different after that reload (a stale copy somewhere): carry on, no loop.
    expect(await reloadIfStale()).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });
  it("does nothing when the deployed build cannot be told", async () => {
    deployed(null, false);
    const { reloadIfStale } = await load("b1");
    expect(await reloadIfStale()).toBe(false);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(new Error("offline"))),
    );
    expect(await reloadIfStale()).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
  it("does nothing in development (no build id)", async () => {
    deployed("b2");
    const { reloadIfStale } = await load(undefined);
    expect(await reloadIfStale()).toBe(false);
  });
});
