// Response hardening applied at the Worker entry to every SSR page and API response.
// Script sources are not restricted here: SSR hydration relies on inline scripts, so a
// script-src policy needs per-request nonces first.

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
// The Lovable editor renders previews inside an iframe on these zones.
const PREVIEW_ZONES = [
  "lovableproject.com",
  "lovableproject-dev.com",
  "lovable.app",
  "gpt-eng.com",
  "gptengineer.run",
];

const isLocal = (host: string) => LOCAL_HOSTS.has(host);
const isPreview = (host: string) => PREVIEW_ZONES.some((z) => host === z || host.endsWith(`.${z}`));

/** Canonical origin. www is the same site and must not stay a second indexable host. */
export const CANONICAL_HOST = "pvpspinarena.com";

/**
 * GET and HEAD on www.pvpspinarena.com go to the apex host in one hop.
 * Other methods stay put so a posted callback is not turned into a GET.
 */
export function canonicalHostRedirect(request: Request): Response | null {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const url = new URL(request.url);
  if (url.hostname !== `www.${CANONICAL_HOST}`) return null;
  url.protocol = "https:";
  url.hostname = CANONICAL_HOST;
  return new Response(null, {
    status: 308,
    headers: { location: url.toString(), "cache-control": "no-store" },
  });
}

/** A plain-HTTP request to a public host is redirected to HTTPS before any app code runs. */
export function httpsRedirect(request: Request): Response | null {
  const url = new URL(request.url);
  if (url.protocol !== "http:" || isLocal(url.hostname)) return null;
  url.protocol = "https:";
  return new Response(null, {
    status: 308,
    headers: { location: url.toString(), "cache-control": "no-store" },
  });
}

export function securityHeaders(request: Request): Record<string, string> {
  const url = new URL(request.url);
  const host = url.hostname;
  const framed = isPreview(host);
  const headers: Record<string, string> = {
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
    "permissions-policy":
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
    "content-security-policy": [
      "base-uri 'self'",
      "object-src 'none'",
      "form-action 'self'",
      framed
        ? "frame-ancestors 'self' https://lovable.dev https://*.lovable.dev"
        : "frame-ancestors 'none'",
      ...(isLocal(host) ? [] : ["upgrade-insecure-requests"]),
    ].join("; "),
  };
  if (!framed) headers["x-frame-options"] = "DENY";
  if (url.protocol === "https:" && !isLocal(host))
    headers["strict-transport-security"] = "max-age=31536000; includeSubDomains";
  return headers;
}

/** Adds the hardening headers without overriding ones a route set deliberately. */
export function withSecurityHeaders(request: Request, response: Response): Response {
  const out = new Response(response.body, response);
  for (const [k, v] of Object.entries(securityHeaders(request)))
    if (!out.headers.has(k)) out.headers.set(k, v);
  return out;
}
