// Server-only Turnstile check. Never import this from client code.
import { workerEnv } from "@/lib/worker-env";

const TEST_SECRET = "1x0000000000000000000000000000000AA";
const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const ALLOWED_HOSTS = new Set([
  "pvpspinarena.com",
  "www.pvpspinarena.com",
  "localhost",
  "127.0.0.1",
]);

function turnstileSecret(): string | undefined {
  const configured = workerEnv("TURNSTILE_SECRET_KEY");
  if (configured) return configured;
  const nodeEnv = process.env["NODE_ENV"];
  if (nodeEnv === "development" || nodeEnv === "test") return TEST_SECRET;
  return undefined;
}

/** True only when Cloudflare accepts this single-use token for our widget. */
export async function verifyTurnstile(token: string, ip: string | null): Promise<boolean> {
  const trimmed = token.trim();
  if (!trimmed || trimmed.length > 2048) return false;
  const secret = turnstileSecret();
  if (!secret) return false;
  const body = new URLSearchParams({ secret, response: trimmed });
  if (ip) body.set("remoteip", ip);
  let response: Response;
  try {
    response = await fetch(SITEVERIFY, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
  } catch {
    return false;
  }
  if (!response.ok) return false;
  const json = (await response.json()) as { success?: boolean; hostname?: string };
  if (json.success !== true) return false;
  if (secret !== TEST_SECRET && json.hostname && !ALLOWED_HOSTS.has(json.hostname)) return false;
  return true;
}
