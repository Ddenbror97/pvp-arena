import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BR_ASSET_HASH_HEX,
  BR_ASSET_HASHES,
  brAssetFingerprint,
  brAssetHash,
  downloadBrAsset,
  loadBrAssetHashes,
  MAX_PARALLEL_DOWNLOADS,
} from "../src/lib/fps/br/asset-download";
import {
  BR_ASSET_DIR,
  BR_ASSET_HASHES_FILE,
  brAssetHashes,
  emitBrAssetHashes,
} from "../scripts/emit-br-asset-hashes";

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

/**
 * Cleanup 2026-11-23: a match asked the server about every one of the island's ~2,900 files
 * ("unchanged", each time). With the deploy's list of fingerprints a stored copy is used
 * without asking, but only when its content is the deployed file.
 */
describe("stored copies of the island's files, checked by content", () => {
  const bytes = (text: string) => new TextEncoder().encode(text).buffer as ArrayBuffer;
  const text = (data: ArrayBuffer) => new TextDecoder().decode(data);
  const cacheOf = (call: unknown[]) => (call[1] as { cache?: string }).cache;

  it("takes the stored copy without asking when it is the deployed file", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("the model"));
    vi.stubGlobal("fetch", fetcher);
    const expected = await brAssetFingerprint(bytes("the model"));
    expect(expected).toMatch(new RegExp(`^[0-9a-f]{${BR_ASSET_HASH_HEX}}$`));
    const data = await downloadBrAsset("/m.glb", new AbortController().signal, () => {}, expected);
    expect(text(data)).toBe("the model");
    expect(fetcher).toHaveBeenCalledOnce();
    // (force-cache: the stored copy without a request, the network only if there is none.)
    expect(cacheOf(fetcher.mock.calls[0]!)).toBe("force-cache");
  });

  it("asks the server at once when the stored copy is from before a deploy", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response("last week's model"))
      .mockResolvedValue(new Response("the model"));
    vi.stubGlobal("fetch", fetcher);
    const recovering = vi.fn();
    const data = await downloadBrAsset(
      "/m.glb",
      new AbortController().signal,
      recovering,
      await brAssetFingerprint(bytes("the model")),
    );
    expect(text(data)).toBe("the model");
    expect(fetcher.mock.calls.map(cacheOf)).toEqual(["force-cache", "no-cache"]);
    // Nothing failed: no "restoring" on the loading screen, and no wait before asking.
    expect(recovering).not.toHaveBeenCalled();
  });

  it("uses what the server sends when asked, even if the list is behind it", async () => {
    // (A deploy in progress: the list and the file from different versions. As before the
    // list existed, the server's answer is the file.)
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response("stored"))
      .mockResolvedValue(new Response("what the server has"));
    vi.stubGlobal("fetch", fetcher);
    const data = await downloadBrAsset(
      "/m.glb",
      new AbortController().signal,
      () => {},
      await brAssetFingerprint(bytes("something else again")),
    );
    expect(text(data)).toBe("what the server has");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("does not take a failure the browser stored for the server's answer", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response("gone", { status: 404 }))
      .mockResolvedValue(new Response("the model"));
    vi.stubGlobal("fetch", fetcher);
    const data = await downloadBrAsset(
      "/m.glb",
      new AbortController().signal,
      () => {},
      await brAssetFingerprint(bytes("the model")),
    );
    expect(text(data)).toBe("the model");
    expect(fetcher.mock.calls.map(cacheOf)).toEqual(["force-cache", "no-cache"]);
  });

  it("still fails for good on a file the server says is missing", async () => {
    const fetcher = vi.fn().mockImplementation(async () => new Response("gone", { status: 404 }));
    vi.stubGlobal("fetch", fetcher);
    await expect(
      downloadBrAsset("/m.glb", new AbortController().signal, () => {}, "0123456789ab"),
    ).rejects.toThrow("HTTP 404");
    expect(fetcher.mock.calls.map(cacheOf)).toEqual(["force-cache", "no-cache"]);
  });

  it("downloads as it always did without a fingerprint", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("the model"));
    vi.stubGlobal("fetch", fetcher);
    await downloadBrAsset("/m.glb", new AbortController().signal);
    expect(Object.keys(fetcher.mock.calls[0]![1] as object)).toEqual(["signal"]);
  });

  it("finds a file's fingerprint by its path below /fps/br/", () => {
    const hashes = new Map([["models/a10.lod0.glb", "aaaaaaaaaaaa"]]);
    expect(brAssetHash(hashes, "https://example.test/fps/br/models/a10.lod0.glb")).toBe(
      "aaaaaaaaaaaa",
    );
    expect(brAssetHash(hashes, "/fps/br/models/a10.lod0.glb?x=1")).toBe("aaaaaaaaaaaa");
    expect(brAssetHash(hashes, "https://example.test/fps/models/a10.lod0.glb")).toBeNull();
    expect(brAssetHash(hashes, "/fps/br/models/a10.lod1.glb")).toBeNull();
    expect(brAssetHash(null, "/fps/br/models/a10.lod0.glb")).toBeNull();
  });

  it("reads the deploy's list afresh, and does without it when there is none", async () => {
    const signal = new AbortController().signal;
    const list = { v: 1, files: { "models/a.glb": "0123456789ab", "bad.glb": "short" } };
    const fetcher = vi.fn().mockImplementation(async () => new Response(JSON.stringify(list)));
    vi.stubGlobal("fetch", fetcher);
    const hashes = await loadBrAssetHashes(BR_ASSET_HASHES, signal);
    expect([...hashes!]).toEqual([["models/a.glb", "0123456789ab"]]);
    // (Asked afresh: it is what says whether anything changed.)
    expect(cacheOf(fetcher.mock.calls[0]!)).toBe("no-cache");
    for (const answer of [
      () => new Response("not found", { status: 404 }),
      () => new Response("<html>"),
      () => new Response(JSON.stringify({ v: 2, files: list.files })),
      () => new Response(JSON.stringify({ v: 1, files: {} })),
      () => {
        throw new TypeError("offline");
      },
    ]) {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation(async () => answer()),
      );
      expect(await loadBrAssetHashes(BR_ASSET_HASHES, signal)).toBeNull();
    }
  });

  it("does not hold the loading screen for a list that does not arrive", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init: { signal: AbortSignal }) =>
          new Promise<Response>((_resolve, reject) =>
            init.signal.addEventListener("abort", () => reject(new Error("aborted")), {
              once: true,
            }),
          ),
      ),
    );
    const waiting = loadBrAssetHashes(BR_ASSET_HASHES, new AbortController().signal, 6000);
    await vi.advanceTimersByTimeAsync(6000);
    expect(await waiting).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("the build lists every file with the fingerprint the game computes", async () => {
    const dir = mkdtempSync(join(tmpdir(), "br-hashes-"));
    try {
      mkdirSync(join(dir, "models"));
      writeFileSync(join(dir, "models/a.glb"), "model a");
      writeFileSync(join(dir, "models/b.glb"), Buffer.from([0, 1, 2, 255]));
      writeFileSync(join(dir, "height.v6.hf"), "heights");
      writeFileSync(join(dir, "models/ATTRIBUTION.md"), "credits");
      expect(emitBrAssetHashes(true, dir)).toBe(3);
      const listed = brAssetHashes(dir);
      // (Not itself, and not the attribution notes, which no match downloads.)
      expect(Object.keys(listed)).toEqual(["height.v6.hf", "models/a.glb", "models/b.glb"]);
      for (const [file, hash] of Object.entries(listed)) {
        const b = readFileSync(join(dir, file));
        expect(
          await brAssetFingerprint(
            b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer,
          ),
          file,
        ).toBe(hash);
      }
      // The file the build writes is the one the game reads, at the path it asks for.
      expect(BR_ASSET_HASHES).toBe(
        `/${BR_ASSET_DIR.replace(/^public\//, "")}/${BR_ASSET_HASHES_FILE}`,
      );
      const written = readFileSync(join(dir, BR_ASSET_HASHES_FILE), "utf8");
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(written)));
      const hashes = await loadBrAssetHashes(BR_ASSET_HASHES, new AbortController().signal);
      expect(Object.fromEntries(hashes!)).toEqual(listed);
      // A development server removes a leftover list.
      expect(emitBrAssetHashes(false, dir)).toBe(0);
      expect(existsSync(join(dir, BR_ASSET_HASHES_FILE))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
