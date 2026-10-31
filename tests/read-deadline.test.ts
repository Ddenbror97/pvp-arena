import { it, expect, vi, afterEach } from "vitest";
import { boundedRead } from "../src/lib/read-deadline";
afterEach(() => vi.useRealTimers());
function query<T>(promise: Promise<T>, capture: (signal: AbortSignal) => void) {
  return {
    then: promise.then.bind(promise),
    abortSignal(signal: AbortSignal) {
      capture(signal);
      return promise;
    },
  };
}
it("aborts a hung read and lets a later independent state request succeed", async () => {
  vi.useFakeTimers();
  let signal: AbortSignal | undefined;
  const stalled = boundedRead(
    query(new Promise(() => {}), (s) => (signal = s)),
    100,
  );
  const rejection = expect(stalled).rejects.toThrow("READ_TIMEOUT");
  await vi.advanceTimersByTimeAsync(100);
  await rejection;
  expect(signal?.aborted).toBe(true);
  expect(
    await boundedRead(
      query(Promise.resolve({ version: 2 }), () => {}),
      100,
    ),
  ).toEqual({ version: 2 });
  expect(vi.getTimerCount()).toBe(0);
});
it("preserves a completed response and clears its deadline without aborting it", async () => {
  vi.useFakeTimers();
  let signal: AbortSignal | undefined;
  const result = { data: { turn: "B" }, error: null };
  expect(
    await boundedRead(
      query(Promise.resolve(result), (s) => (signal = s)),
      100,
    ),
  ).toBe(result);
  expect(signal?.aborted).toBe(false);
  expect(vi.getTimerCount()).toBe(0);
});
