/**
 * Single-flight TTL cache with stale-if-error. Every guide request in an
 * isolate shares one value; at most one load runs at a time, and after a
 * failure loads pause for `retryMs` so an outage never fans out to the DB.
 */

export type SharedStore<T> = {
  get(): Promise<{ value: T; storedAt: number } | null>;
  put(value: T, storedAt: number): Promise<void>;
};

export type SnapshotCacheOptions<T> = {
  load: () => Promise<T>;
  ttlMs: number;
  staleMs: number;
  retryMs: number;
  shared?: SharedStore<T>;
  now?: () => number;
  onError?: (error: unknown) => void;
};

export function createSnapshotCache<T>(opts: SnapshotCacheOptions<T>) {
  const now = opts.now ?? Date.now;
  let entry: { value: T; storedAt: number } | null = null;
  let inflight: Promise<T | null> | null = null;
  let retryAt = 0;

  const usable = (t: number) => (entry && t - entry.storedAt < opts.staleMs ? entry.value : null);

  async function refresh(): Promise<T | null> {
    try {
      const shared = await opts.shared?.get().catch(() => null);
      if (shared && now() - shared.storedAt < opts.ttlMs) {
        entry = shared;
        return shared.value;
      }
      const value = await opts.load();
      const storedAt = now();
      entry = { value, storedAt };
      await opts.shared?.put(value, storedAt).catch(() => {});
      return value;
    } catch (error) {
      retryAt = now() + opts.retryMs;
      opts.onError?.(error);
      return usable(now());
    }
  }

  return {
    async get(): Promise<T | null> {
      const t = now();
      if (entry && t - entry.storedAt < opts.ttlMs) return entry.value;
      if (t < retryAt) return usable(t);
      if (!inflight)
        inflight = refresh().finally(() => {
          inflight = null;
        });
      return inflight;
    },
  };
}
