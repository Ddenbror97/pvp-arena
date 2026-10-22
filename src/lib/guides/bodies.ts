import type { Guide } from "@/content/guides/types";
import { workerAssets } from "@/lib/worker-env";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const cache = new Map<string, Guide>();
const MAX_CACHED = 24;

/** One article. Public JSON on the asset host in production, the public directory in dev. */
export async function loadGuideBody(slug: string): Promise<Guide | null> {
  if (!SLUG.test(slug)) return null;
  const hit = cache.get(slug);
  if (hit) {
    cache.delete(slug);
    cache.set(slug, hit);
    return hit;
  }
  const text = await readGuideJson(slug);
  if (!text) return null;
  let parsed: Guide;
  try {
    parsed = JSON.parse(text) as Guide;
  } catch {
    return null;
  }
  if (parsed.slug !== slug || !Array.isArray(parsed.sections)) return null;
  cache.set(slug, parsed);
  while (cache.size > MAX_CACHED) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
  return parsed;
}

async function readGuideJson(slug: string): Promise<string | null> {
  const assets = workerAssets();
  if (assets) {
    const response = await assets.fetch(
      new Request(`https://pvpspinarena.com/guide-bodies/${slug}.json`),
    );
    if (!response.ok) return null;
    return await response.text();
  }
  try {
    const { existsSync, readFileSync } = await import("node:fs");
    const path = `public/guide-bodies/${slug}.json`;
    if (!existsSync(path)) return null;
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}
