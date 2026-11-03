import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** Validate the actual deployable browser output, independently of Worker runtime bindings. */
export function assertBrowserSupabaseBuild(directory, url, publicKey, forbiddenKeys = []) {
  assert(
    url && publicKey,
    "Expected Supabase URL and public key are required for release validation",
  );
  assert(!publicKey.startsWith("sb_secret_"), "A secret Supabase key cannot configure the browser");
  if (publicKey.startsWith("eyJ")) {
    const payload = JSON.parse(Buffer.from(publicKey.split(".")[1], "base64url").toString());
    assert.equal(payload.role, "anon", "Only an anon legacy key may configure the browser");
  }
  const sources = readdirSync(join(directory, "assets"))
    .filter((name) => name.endsWith(".js"))
    .map((name) => readFileSync(join(directory, "assets", name), "utf8"));
  assert(
    sources.some((source) => source.includes(url) && source.includes(publicKey)),
    "Browser bundle lacks the intended Supabase URL/key. Rebuild with VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY before deploying.",
  );
  for (const secret of forbiddenKeys.filter(Boolean))
    assert(
      !sources.some((source) => source.includes(secret)),
      "Privileged credential found in browser output",
    );
}
