import { createFileRoute } from "@tanstack/react-router";

const PATHS = ["/", "/coinflip", "/roulette", "/fairness", "/about", "/how-it-works", "/terms", "/privacy", "/responsible-gambling"];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: () => {
        const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${PATHS.map(
          (p) => `  <url><loc>https://pvpspinarena.com${p}</loc></url>`,
        ).join("\n")}\n</urlset>\n`;
        return new Response(body, { headers: { "Content-Type": "application/xml" } });
      },
    },
  },
});
