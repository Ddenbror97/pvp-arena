import { createFileRoute } from "@tanstack/react-router";
import { isAvatarSeed, isAvatarStyle } from "@/lib/avatar";

const MAX_BYTES = 100_000;

function fail(status: number) {
  return new Response(null, { status, headers: { "cache-control": "no-store" } });
}

/**
 * Same-origin avatar proxy. Only the fixed DiceBear host and built-in styles
 * are fetched; redirects, other content types and oversized responses are
 * refused. Visitors' browsers only ever talk to this site.
 */
export const Route = createFileRoute("/api/public/avatar/$style/$seed")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { style, seed } = params;
        if (!isAvatarStyle(style) || !isAvatarSeed(seed)) return fail(404);
        let res: Response;
        try {
          res = await fetch(`https://api.dicebear.com/9.x/${style}/svg?seed=${seed}`, {
            redirect: "error",
            signal: AbortSignal.timeout(5000),
          });
        } catch {
          return fail(502);
        }
        if (!res.ok || !(res.headers.get("content-type") ?? "").startsWith("image/svg+xml")) return fail(502);
        const body = await res.arrayBuffer();
        if (body.byteLength > MAX_BYTES) return fail(502);
        return new Response(body, {
          headers: {
            "content-type": "image/svg+xml",
            "cache-control": "public, max-age=86400, immutable",
            "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; img-src data:",
            "x-content-type-options": "nosniff",
          },
        });
      },
    },
  },
});
