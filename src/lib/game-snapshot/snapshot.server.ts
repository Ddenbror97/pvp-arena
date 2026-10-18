import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createSnapshotCache, type SharedStore } from "./cache";
import { parseSnapshot, type GameSnapshot } from "./snapshot";

const TTL_MS = 5 * 60_000;
const STALE_MS = 60 * 60_000;
const RETRY_MS = 30_000;
const RPC_TIMEOUT_MS = 2_500;
const CACHE_KEY = "https://game-snapshot.internal/seo/v2";

/** Cloudflare's per-colo cache, so isolates in one data centre share a refresh. */
const edgeCache = () => (globalThis as { caches?: { default?: Cache } }).caches?.default;

function edgeStore(): SharedStore<unknown> {
  return {
    async get() {
      const res = await edgeCache()?.match(CACHE_KEY);
      if (!res) return null;
      const storedAt = Number(res.headers.get("x-stored-at"));
      const value: unknown = await res.json();
      return parseSnapshot(value) && Number.isFinite(storedAt) ? { value, storedAt } : null;
    },
    async put(value, storedAt) {
      await edgeCache()?.put(
        CACHE_KEY,
        new Response(JSON.stringify(value), {
          headers: {
            "content-type": "application/json",
            "cache-control": `max-age=${TTL_MS / 1000}`,
            "x-stored-at": String(storedAt),
          },
        }),
      );
    },
  };
}

async function loadFromDb(): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);
  try {
    const { data, error } = await supabaseAdmin
      .rpc("seo_game_snapshot" as never)
      .abortSignal(controller.signal);
    if (error) throw new Error(error.message);
    if (!parseSnapshot(data)) throw new Error("SNAPSHOT_MALFORMED");
    return data;
  } finally {
    clearTimeout(timer);
  }
}

const cache = createSnapshotCache<unknown>({
  load: loadFromDb,
  ttlMs: TTL_MS,
  staleMs: STALE_MS,
  retryMs: RETRY_MS,
  shared: edgeStore(),
  onError: (e) => console.error("[game-snapshot]", e instanceof Error ? e.message : "load failed"),
});

export async function loadGameSnapshot(): Promise<GameSnapshot | null> {
  return parseSnapshot(await cache.get());
}
