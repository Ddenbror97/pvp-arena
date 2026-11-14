import { afterEach, expect, it, vi } from "vitest";
import { downloadBrAsset, MAX_PARALLEL_DOWNLOADS } from "../src/lib/fps/br/asset-download";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it("recovers a transient asset failure without repeating other successful downloads", async () => {
  vi.useFakeTimers();
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(new Response("busy", { status: 503 }))
    .mockResolvedValue(new Response("model"));
  vi.stubGlobal("fetch", fetcher);
  const progress = vi.fn();
  const result = downloadBrAsset("/model.glb", new AbortController().signal, progress);
  await vi.advanceTimersByTimeAsync(500);
  expect(new TextDecoder().decode(await result)).toBe("model");
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(progress).toHaveBeenCalledOnce();
});

it("times out a stalled body even when response headers already arrived", async () => {
  vi.useFakeTimers();
  let aborted = false;
  const fetcher = vi
    .fn()
    .mockImplementationOnce((_url, { signal }) =>
      Promise.resolve(
        new Response(
          new ReadableStream({
            start(controller) {
              signal.addEventListener(
                "abort",
                () => {
                  aborted = true;
                  controller.error(signal.reason);
                },
                { once: true },
              );
            },
          }),
        ),
      ),
    )
    .mockResolvedValue(new Response("complete"));
  vi.stubGlobal("fetch", fetcher);
  const result = downloadBrAsset("/terrain", new AbortController().signal);
  await vi.advanceTimersByTimeAsync(20_500);
  expect(new TextDecoder().decode(await result)).toBe("complete");
  expect(aborted).toBe(true);
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it("finishes a slow healthy stream lasting more than the inactivity timeout", async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn().mockResolvedValue(
    new Response(
      new ReadableStream({
        start(controller) {
          for (let i = 1; i <= 3; i++)
            setTimeout(() => {
              controller.enqueue(new TextEncoder().encode(String(i)));
              if (i === 3) controller.close();
            }, i * 19_000);
        },
      }),
    ),
  );
  vi.stubGlobal("fetch", fetcher);
  const result = downloadBrAsset("/large-model", new AbortController().signal);
  await vi.advanceTimersByTimeAsync(58_000);
  expect(new TextDecoder().decode(await result)).toBe("123");
  expect(fetcher).toHaveBeenCalledOnce();
  expect(vi.getTimerCount()).toBe(0);
});

it("cancels retry backoff on disposal and never starts another request", async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn().mockRejectedValue(new TypeError("offline"));
  vi.stubGlobal("fetch", fetcher);
  const abort = new AbortController();
  const result = downloadBrAsset("/model", abort.signal);
  const rejected = expect(result).rejects.toMatchObject({ name: "AbortError" });
  await vi.advanceTimersByTimeAsync(100);
  abort.abort();
  await rejected;
  await vi.advanceTimersByTimeAsync(60_000);
  expect(fetcher).toHaveBeenCalledOnce();
  expect(vi.getTimerCount()).toBe(0);
});

it("does not hide a permanently missing deployment asset behind endless retries", async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response("missing", { status: 404 }));
  vi.stubGlobal("fetch", fetcher);
  await expect(downloadBrAsset("/missing", new AbortController().signal)).rejects.toThrow(
    "HTTP 404",
  );
  expect(fetcher).toHaveBeenCalledOnce();
});

it("keeps at most MAX_PARALLEL_DOWNLOADS requests in flight, and queues the rest", async () => {
  let open = 0,
    peak = 0;
  const finish: Array<() => void> = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          peak = Math.max(peak, ++open);
          finish.push(() => {
            open--;
            resolve(new Response("ok"));
          });
        }),
    ),
  );
  const signal = new AbortController().signal;
  const total = MAX_PARALLEL_DOWNLOADS * 3 + 5;
  const all = Promise.all(
    Array.from({ length: total }, (_, i) => downloadBrAsset(`/model-${i}.glb`, signal)),
  );
  let done = 0;
  while (done < total) {
    await new Promise((r) => setTimeout(r, 0));
    expect(open).toBeLessThanOrEqual(MAX_PARALLEL_DOWNLOADS);
    for (const f of finish.splice(0)) {
      f();
      done++;
    }
  }
  expect((await all).length).toBe(total);
  expect(peak).toBe(MAX_PARALLEL_DOWNLOADS);
});

it("a download cancelled while queued never starts, and frees no slot it did not hold", async () => {
  const finish: Array<() => void> = [];
  const fetcher = vi.fn(
    () => new Promise<Response>((resolve) => finish.push(() => resolve(new Response("ok")))),
  );
  vi.stubGlobal("fetch", fetcher);
  const live = new AbortController().signal;
  const first = Array.from({ length: MAX_PARALLEL_DOWNLOADS }, (_, i) =>
    downloadBrAsset(`/a-${i}.glb`, live),
  );
  await new Promise((r) => setTimeout(r, 0));
  const gone = new AbortController();
  const cancelled = downloadBrAsset("/queued.glb", gone.signal);
  const later = downloadBrAsset("/later.glb", live);
  await new Promise((r) => setTimeout(r, 0));
  expect(fetcher).toHaveBeenCalledTimes(MAX_PARALLEL_DOWNLOADS);
  gone.abort(new DOMException("left", "AbortError"));
  await expect(cancelled).rejects.toThrow("left");
  // One slot frees: the next in line is the live download, not the cancelled one.
  finish.shift()!();
  await new Promise((r) => setTimeout(r, 0));
  expect(fetcher).toHaveBeenCalledTimes(MAX_PARALLEL_DOWNLOADS + 1);
  expect(fetcher.mock.calls.some((c) => (c as unknown[])[0] === "/queued.glb")).toBe(false);
  for (const f of finish.splice(0)) f();
  await new Promise((r) => setTimeout(r, 0));
  for (const f of finish.splice(0)) f();
  await Promise.all([...first, later]);
});
