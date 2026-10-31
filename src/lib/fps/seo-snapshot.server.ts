import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createSnapshotCache, type SharedStore } from "@/lib/game-snapshot/cache";
import { parseFpsSeoSnapshot, fpsSeoCacheKey, type FpsSeoSnapshot } from "./seo-snapshot";
import { workerEnv } from "@/lib/worker-env";
const cacheKey = () => fpsSeoCacheKey(workerEnv("SUPABASE_URL") ?? "");
const edge = () => (globalThis as { caches?: { default?: Cache } }).caches?.default;
const shared: SharedStore<FpsSeoSnapshot> = {
  async get() {
    const r = await edge()?.match(cacheKey());
    if (!r) return null;
    const value = parseFpsSeoSnapshot(await r.json()),
      storedAt = Number(r.headers.get("x-stored-at"));
    return value && Number.isFinite(storedAt) ? { value, storedAt } : null;
  },
  async put(value, storedAt) {
    await edge()?.put(
      cacheKey(),
      new Response(JSON.stringify(value), {
        headers: {
          "content-type": "application/json",
          "cache-control": "max-age=300",
          "x-stored-at": String(storedAt),
        },
      }),
    );
  },
};
const cache = createSnapshotCache<FpsSeoSnapshot>({
  ttlMs: 300000,
  staleMs: 3600000,
  retryMs: 30000,
  shared,
  async load() {
    const controller = new AbortController(),
      timer = setTimeout(() => controller.abort(), 2500);
    try {
      const { data, error } = await supabaseAdmin
        .rpc("seo_fps_snapshot" as never)
        .abortSignal(controller.signal);
      if (error) throw Error("FPS_ACTIVITY_UNAVAILABLE");
      const value = parseFpsSeoSnapshot(data);
      if (!value) throw Error("FPS_ACTIVITY_MALFORMED");
      return value;
    } finally {
      clearTimeout(timer);
    }
  },
});
export const loadFpsSeoSnapshot = () => cache.get();
