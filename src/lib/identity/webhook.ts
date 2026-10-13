const MAX_SKEW_SECONDS = 300;

function shorten(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(shorten);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = shorten((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  if (typeof value === "number" && Number.isFinite(value) && Math.floor(value) === value)
    return Math.trunc(value);
  return value;
}

/** Didit X-Signature-V2 canonical JSON: sorted keys, whole floats shortened, Unicode kept. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(shorten(value));
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function sameHex(a: string, b: string): boolean {
  const left = a.trim().toLowerCase();
  const right = b.trim().toLowerCase();
  if (left.length !== right.length || left.length === 0) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return diff === 0;
}

export type WebhookHeaders = {
  signatureV2: string | null;
  signatureSimple: string | null;
  timestamp: string | null;
};

/**
 * Accepts a webhook only when the timestamp is fresh and either the full body (V2)
 * or the status envelope (simple) matches. Returns the session id to re-fetch.
 */
export async function trustedSessionId(
  raw: string,
  headers: WebhookHeaders,
  secret: string,
  nowMs = Date.now(),
): Promise<string | null> {
  const ts = Number(headers.timestamp);
  if (!Number.isFinite(ts) || Math.abs(Math.floor(nowMs / 1000) - ts) > MAX_SKEW_SECONDS)
    return null;
  let body: Record<string, unknown>;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    body = parsed as Record<string, unknown>;
  } catch {
    return null;
  }
  const sessionId = typeof body["session_id"] === "string" ? body["session_id"] : "";
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return null;
  if (body["webhook_type"] !== "status.updated") return null;

  if (headers.signatureV2) {
    const expected = await hmacHex(secret, canonicalJson(body));
    if (sameHex(expected, headers.signatureV2)) return sessionId;
  }
  if (headers.signatureSimple) {
    const status = typeof body["status"] === "string" ? body["status"] : "";
    const expected = await hmacHex(
      secret,
      `${headers.timestamp}:${sessionId}:${status}:status.updated`,
    );
    if (status && sameHex(expected, headers.signatureSimple)) return sessionId;
  }
  return null;
}
