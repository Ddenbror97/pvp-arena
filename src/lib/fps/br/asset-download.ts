/**
 * Downloads in flight at once (performance audit 2026-11-14). The island is about 1,800 files
 * (500 models × three LODs and the rest), all asked for in the same moment behind the loading
 * screen. Chrome refuses requests past what one page may have outstanding
 * (net::ERR_INSUFFICIENT_RESOURCES): about 150 of them failed on every load and came back only
 * after the retry's wait, and every file that did arrive was parsed in the same burst. A queue
 * costs nothing on one HTTP/2 connection (the browser runs about 100 streams at a time anyway),
 * no request is refused, and the parsing and its memory are spread over the load.
 */
export const MAX_PARALLEL_DOWNLOADS = 48;
let inFlight = 0;
const queued: Array<() => void> = [];
/** Wait for a free slot (rejects if `signal` aborts first); the slot is the caller's to release. */
function takeSlot(signal: AbortSignal): Promise<void> {
  if (inFlight < MAX_PARALLEL_DOWNLOADS) {
    inFlight++;
    return Promise.resolve();
  }
  return new Promise<void>((resolve, reject) => {
    const granted = () => {
      signal.removeEventListener("abort", abort);
      resolve();
    };
    const abort = () => {
      const i = queued.indexOf(granted);
      if (i >= 0) queued.splice(i, 1);
      reject(signal.reason);
    };
    queued.push(granted);
    signal.addEventListener("abort", abort, { once: true });
  });
}
/** Hand the slot to the next download waiting, or free it. */
function releaseSlot() {
  const next = queued.shift();
  if (next) next();
  else inFlight--;
}

/** Retry only the failed download, keeping already prepared island/renderer resources. */
export async function downloadBrAsset(
  url: string,
  signal: AbortSignal,
  recovering: () => void = () => {},
): Promise<ArrayBuffer> {
  let failures = 0;
  while (true) {
    signal.throwIfAborted();
    await takeSlot(signal);
    if (signal.aborted) {
      releaseSlot();
      signal.throwIfAborted();
    }
    const attempt = new AbortController();
    const abort = () => attempt.abort(signal.reason);
    signal.addEventListener("abort", abort, { once: true });
    let deadline: ReturnType<typeof setTimeout> | undefined;
    const downloading = () => {
      clearTimeout(deadline);
      deadline = setTimeout(
        () => attempt.abort(new DOMException("Download stalled", "TimeoutError")),
        20_000,
      );
    };
    downloading();
    let permanent = false;
    try {
      const response = await fetch(url, { signal: attempt.signal });
      if (!response.ok) {
        void response.body?.cancel().catch(() => {});
        permanent =
          response.status >= 400 && response.status < 500 && ![408, 429].includes(response.status);
        throw new Error(`Island asset HTTP ${response.status}`);
      }
      // An inactivity deadline, not a total-duration limit: slow healthy transfers
      // must finish instead of repeatedly losing their progress on large models.
      if (!response.body) return await response.arrayBuffer();
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        while (true) {
          downloading();
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          size += value.byteLength;
        }
      } finally {
        reader.releaseLock();
      }
      const data = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        data.set(chunk, offset);
        offset += chunk.byteLength;
      }
      return data.buffer;
    } catch (error) {
      signal.throwIfAborted();
      if (permanent) throw error;
      recovering();
    } finally {
      clearTimeout(deadline);
      signal.removeEventListener("abort", abort);
      // (Released before the retry's wait: a failed download does not hold up the others.)
      releaseSlot();
    }
    await new Promise<void>((resolve, reject) => {
      const abort = () => {
        clearTimeout(timer);
        reject(signal.reason);
      };
      const timer = setTimeout(
        () => {
          signal.removeEventListener("abort", abort);
          resolve();
        },
        Math.min(8000, 500 * 2 ** Math.min(failures++, 4)),
      );
      signal.addEventListener("abort", abort, { once: true });
      if (signal.aborted) abort();
    });
  }
}
