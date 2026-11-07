/** Retry only the failed download, keeping already prepared island/renderer resources. */
export async function downloadBrAsset(
  url: string,
  signal: AbortSignal,
  recovering: () => void = () => {},
): Promise<ArrayBuffer> {
  let failures = 0;
  while (true) {
    signal.throwIfAborted();
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
