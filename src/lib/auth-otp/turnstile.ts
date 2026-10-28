/** Public site key for the production signup widget. The secret is a Worker binding. */
export const TURNSTILE_SITE_KEY = "0x4AAAAAAFpt1aSyr7qjGFA4";

/** Cloudflare's always-pass key. Local dev and unit tests use it, never production. */
export const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";

export const TURNSTILE_RETRY = "Confirm you are human, then try again.";

export function turnstileSiteKey(): string {
  const dev = import.meta.env.DEV === true || import.meta.env.MODE === "test";
  return dev ? TURNSTILE_TEST_SITE_KEY : TURNSTILE_SITE_KEY;
}
