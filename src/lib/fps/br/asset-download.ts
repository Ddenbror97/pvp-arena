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

/**
 * What is deployed under /fps/br, by content (cleanup 2026-11-23).
 *
 * The island's files are served to be checked with the server before every use (the host's
 * default for anything without a hashed name), and a match loads about 2,900 of them: every
 * match after a player's first asked the server about each one and was told "unchanged",
 * 84 ms a question on the owner's connection, about six seconds of every loading screen at
 * 48 questions at a time. Their names cannot simply be declared unchanging: files have been
 * replaced under the same name before (889 times in this repository's history).
 *
 * So the build writes each file's fingerprint (scripts/emit-br-asset-hashes.ts) and a match
 * reads that list first, the only question it asks. For a file on the list the browser's
 * stored copy is taken without asking, and its bytes are checked against the fingerprint: the
 * deployed file is used as it is; anything else (a copy from before a deploy replaced the
 * file, a stored failure) is thrown away and the server is asked, exactly as before. A stored
 * copy is never trusted for what its name says, only for what it contains, so nothing here
 * can pin an out-of-date file.
 *
 * Without the list (a tool's file server, a development server, an older deploy), without
 * SubtleCrypto (a page not served over https) or for a file not on it, a download is what it
 * always was.
 */
export const BR_ASSET_HASHES = "/fps/br/asset-hashes.json";
/**
 * Set by the build that writes the list (vite.config.ts, production builds only). Anything
 * else that bundles this code (the development server, the check harnesses under scripts/, the
 * tests) has no list to ask for and does not ask: a request that could only fail would show
 * as an error in every tool that watches the console.
 */
declare const __BR_ASSET_HASHES__: boolean | undefined;
export const brAssetHashesBuilt = () =>
  typeof __BR_ASSET_HASHES__ !== "undefined" && __BR_ASSET_HASHES__ === true;
/** Hex digits of a file's SHA-1 kept as its fingerprint (the same in the build's script). */
export const BR_ASSET_HASH_HEX = 12;
/** A deployed file's path below /fps/br/ → its fingerprint. */
export type BrAssetHashes = ReadonlyMap<string, string>;

const HEX = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"));
/** The fingerprint of `data`, or null where the page cannot compute one. */
export async function brAssetFingerprint(data: ArrayBuffer): Promise<string | null> {
  const subtle = typeof crypto === "undefined" ? undefined : crypto.subtle;
  if (!subtle) return null;
  const digest = new Uint8Array(await subtle.digest("SHA-1", data));
  let hex = "";
  for (let i = 0; i < BR_ASSET_HASH_HEX / 2; i++) hex += HEX[digest[i]!];
  return hex;
}

/**
 * The deploy's list of fingerprints, asked for afresh (it is what says whether anything
 * changed). Null when there is none or it does not arrive within `waitMs`: the downloads then
 * check with the server as they always did. Never throws, and never outlives `signal`.
 */
export async function loadBrAssetHashes(
  url: string,
  signal: AbortSignal,
  waitMs = 6000,
): Promise<BrAssetHashes | null> {
  if (typeof crypto === "undefined" || !crypto.subtle) return null;
  const attempt = new AbortController();
  const abort = () => attempt.abort();
  signal.addEventListener("abort", abort, { once: true });
  const deadline = setTimeout(abort, waitMs);
  try {
    if (signal.aborted) return null;
    const response = await fetch(url, { signal: attempt.signal, cache: "no-cache" });
    if (!response.ok) {
      void response.body?.cancel().catch(() => {});
      return null;
    }
    const list = (await response.json()) as { v?: unknown; files?: unknown };
    if (list?.v !== 1 || !list.files || typeof list.files !== "object") return null;
    const hashes = new Map<string, string>();
    for (const [file, hash] of Object.entries(list.files as Record<string, unknown>))
      if (typeof hash === "string" && hash.length === BR_ASSET_HASH_HEX) hashes.set(file, hash);
    return hashes.size ? hashes : null;
  } catch {
    return null;
  } finally {
    clearTimeout(deadline);
    signal.removeEventListener("abort", abort);
  }
}

/** The fingerprint the deploy lists for the file at `url` (anything under /fps/br/), or null. */
export function brAssetHash(hashes: BrAssetHashes | null, url: string): string | null {
  if (!hashes) return null;
  const at = url.indexOf("/fps/br/");
  if (at < 0) return null;
  const end = url.search(/[?#]/);
  return hashes.get(url.slice(at + "/fps/br/".length, end < 0 ? undefined : end)) ?? null;
}

/**
 * Retry only the failed download, keeping already prepared island/renderer resources.
 * `expected`: the file's fingerprint in this deploy (brAssetHash). With it the browser's
 * stored copy is used without asking the server, if its content is that file's.
 */
export async function downloadBrAsset(
  url: string,
  signal: AbortSignal,
  recovering: () => void = () => {},
  expected: string | null = null,
): Promise<ArrayBuffer> {
  let failures = 0;
  // "force-cache": the stored copy, however old, without a request; the network if there is
  // none. "no-cache" once that copy turned out not to be the deployed file: ask the server.
  let cache: "force-cache" | "no-cache" | undefined = expected ? "force-cache" : undefined;
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
    /** The stored copy was not the deployed file (or was a stored failure): nothing failed. */
    let outdated = false;
    try {
      const response = await fetch(url, { signal: attempt.signal, ...(cache ? { cache } : {}) });
      if (!response.ok) {
        void response.body?.cancel().catch(() => {});
        // (A failure the browser stored is not the server's answer now.)
        if (cache === "force-cache") outdated = true;
        else
          permanent =
            response.status >= 400 &&
            response.status < 500 &&
            ![408, 429].includes(response.status);
        throw new Error(`Island asset HTTP ${response.status}`);
      }
      let data: ArrayBuffer;
      // An inactivity deadline, not a total-duration limit: slow healthy transfers
      // must finish instead of repeatedly losing their progress on large models.
      if (!response.body) data = await response.arrayBuffer();
      else {
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
        const bytes = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) {
          bytes.set(chunk, offset);
          offset += chunk.byteLength;
        }
        data = bytes.buffer;
      }
      // Taken without asking: only if it is the file this deploy lists. (What the server
      // sends when asked is used as it is, as it always was.)
      if (cache === "force-cache" && (await brAssetFingerprint(data)) !== expected) {
        outdated = true;
        throw new Error("Island asset stored copy is not the deployed file");
      }
      return data;
    } catch (error) {
      signal.throwIfAborted();
      if (permanent) throw error;
      if (!outdated) recovering();
    } finally {
      clearTimeout(deadline);
      signal.removeEventListener("abort", abort);
      // (Released before the retry's wait: a failed download does not hold up the others.)
      releaseSlot();
    }
    if (outdated) {
      // At once, and not counted as a failure: the server has the file.
      cache = "no-cache";
      continue;
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
