import { describe, expect, it } from "vitest";
import { isolateOnce } from "../workers/fps/isolate-once";

/**
 * The island is built once per isolate (owner, 2026-11-23: "after a update is deployed,
 * player getting stuck like this instead of getting into the 2 minute warm up game"): rooms
 * and socket retries that ask while it is being built wait for that build instead of each
 * starting their own (two or three islands at once were past the isolate's memory).
 */
describe("isolateOnce", () => {
  const tick = (ms: number) => new Promise((r) => setTimeout(r, ms));

  it("many callers at once: one build, all get its value", async () => {
    const once = isolateOnce<{ n: number }>({ pollMs: 5 });
    let builds = 0;
    const make = async (beat: () => void) => {
      builds++;
      for (let i = 0; i < 10; i++) {
        await tick(5);
        beat();
      }
      return { n: builds };
    };
    const got = await Promise.all(Array.from({ length: 8 }, () => once.get(make)));
    expect(builds).toBe(1);
    expect(new Set(got).size).toBe(1);
    expect(once.value).toBe(got[0]);
    // Later callers get it at once.
    expect(await once.get(make)).toBe(got[0]);
    expect(builds).toBe(1);
  });

  it("a failed build lets the waiters build", async () => {
    const once = isolateOnce<string>({ pollMs: 5 });
    let builds = 0;
    const first = once.get(async () => {
      builds++;
      await tick(20);
      throw new Error("asset 503");
    });
    const second = once.get(async () => {
      builds++;
      return "built";
    });
    await expect(first).rejects.toThrow("asset 503");
    expect(await second).toBe("built");
    expect(builds).toBe(2);
  });

  it("a build that stops beating (its request cut off) is taken over", async () => {
    const once = isolateOnce<string>({ pollMs: 5, staleMs: 40 });
    void once.get(() => new Promise<string>(() => {})); // never ends, never beats
    const t0 = Date.now();
    expect(await once.get(async () => "taken over")).toBe("taken over");
    expect(Date.now() - t0).toBeGreaterThanOrEqual(35);
  });

  it("stops a displaced builder if its stalled asset read eventually returns", async () => {
    let now = 1;
    const once = isolateOnce<string>({ staleMs: 10, now: () => now });
    let resume!: () => void;
    const slow = once.get(async (beat) => {
      await new Promise<void>((resolve) => {
        resume = resolve;
      });
      beat();
      return "obsolete";
    });
    now += 11;
    expect(await once.get(async () => "current")).toBe("current");
    resume();
    expect(await slow).toBe("current");
    expect(once.value).toBe("current");
  });

  it("a slow build that keeps beating is waited for, not duplicated", async () => {
    const once = isolateOnce<string>({ pollMs: 5, staleMs: 30 });
    let builds = 0;
    const slow = once.get(async (beat) => {
      builds++;
      for (let i = 0; i < 20; i++) {
        await tick(10);
        beat();
      }
      return "slow";
    });
    await tick(5);
    const waiter = once.get(async () => {
      builds++;
      return "duplicate";
    });
    expect(await waiter).toBe("slow");
    expect(await slow).toBe("slow");
    expect(builds).toBe(1);
  });
});
