import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

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
];

function urlEntry(loc: string, lastmod?: string | null): string {
  const lm = lastmod ? `<lastmod>${lastmod}</lastmod>` : "";
  return `  <url><loc>${BASE_URL}${loc}</loc>${lm}</url>`;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: string[] = STATIC_PATHS.map((p) => urlEntry(p));

        // Dynamic entries: public fairness/audit pages for completed games.
        try {
          const supabase = createClient(
            import.meta.env["VITE_SUPABASE_URL"] as string,
            import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string,
            { auth: { persistSession: false } },
          );
          // Coinflip rooms are live, client-only pages (noindex) — only the
          // jackpot audit records are indexable dynamic content.
          const jackpot = await supabase
            .from("jackpot_games")
            .select("id, completed_at")
            .eq("status", "COMPLETED")
            .order("id", { ascending: false })
            .limit(1000);
          if (jackpot.error) throw new Error(`jackpot_games: ${jackpot.error.message}`);
          for (const g of jackpot.data ?? []) entries.push(urlEntry(`/games/${g.id}`, g.completed_at));
        } catch (err) {
          // Surface the failure rather than serving a silently partial sitemap.
          console.error("sitemap dynamic entries failed:", err);
          return new Response("Sitemap generation failed", { status: 500 });
        }

        const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>\n`;
        return new Response(body, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=300" },
        });
      },
    },
  },
});
