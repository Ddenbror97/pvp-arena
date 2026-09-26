import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { GUIDES, publishedTopics } from "@/content/guides";
import { workerEnv } from "@/lib/worker-env";

const BASE_URL = "https://pvpspinarena.com";

// Public, indexable static pages. Auth, admin and live game rooms are
// intentionally excluded (they carry noindex).
const STATIC_PATHS = [
  "/",
  "/coinflip",
  "/roulette",
  "/fairness",
  "/about",
  "/how-it-works",
  "/terms",
  "/privacy",
  "/responsible-gambling",
  "/guides",
];

function urlEntry(loc: string, lastmod?: string | null): string {
  const lm = lastmod ? `<lastmod>${lastmod}</lastmod>` : "";
  return `  <url><loc>${BASE_URL}${loc}</loc>${lm}</url>`;
}

function env(name: string): string | undefined {
  return (
    workerEnv(name) ??
    (typeof import.meta.env[name] === "string" && import.meta.env[name]
      ? (import.meta.env[name] as string)
      : undefined)
  );
}

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function sitemapSupabase() {
  const url = env("VITE_SUPABASE_URL") ?? env("SUPABASE_URL");
  const key = env("VITE_SUPABASE_PUBLISHABLE_KEY") ?? env("SUPABASE_PUBLISHABLE_KEY");
  if (!url || !key) throw new Error("Missing Supabase URL or publishable key");
  return createClient(url, key, {
    auth: { persistSession: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(
          typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
        );
        if (init?.headers) new Headers(init.headers).forEach((value, h) => headers.set(h, value));
        if (isNewSupabaseApiKey(key) && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: string[] = STATIC_PATHS.map((p) => urlEntry(p));
        for (const g of GUIDES) entries.push(urlEntry(`/guides/${g.slug}`, g.updated));
        for (const t of publishedTopics()) entries.push(urlEntry(`/guides/topics/${t.slug}`));

        try {
          const jackpot = await sitemapSupabase()
            .from("jackpot_games")
            .select("id, completed_at")
            .eq("status", "COMPLETED")
            .order("id", { ascending: false })
            .limit(1000);
          if (jackpot.error) throw new Error(`jackpot_games: ${jackpot.error.message}`);
          for (const g of jackpot.data ?? []) entries.push(urlEntry(`/games/${g.id}`, g.completed_at));
        } catch (err) {
          // Keep the static + guide sitemap live if completed-game rows fail to load.
          console.error("sitemap dynamic entries failed:", err);
        }

        const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>\n`;
        return new Response(body, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=300" },
        });
      },
    },
  },
});
