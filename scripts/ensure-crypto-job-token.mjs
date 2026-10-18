import { createHash, randomBytes } from "node:crypto";
import { appendFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(".env");
const envText = readFileSync(envPath, "utf8");
let token = /(?:^|\n)CRYPTO_JOB_TOKEN="?([0-9a-fA-F]{64})"?/.exec(envText)?.[1]?.toLowerCase();
if (!token) {
  token = randomBytes(32).toString("hex");
  appendFileSync(envPath, `\nCRYPTO_JOB_TOKEN="${token}"\n`);
}
const sha = createHash("sha256").update(token, "utf8").digest("hex");
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const res = await fetch(`${url}/rest/v1/crypto_job_tokens?id=eq.true`, {
  method: "PATCH",
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Prefer: "return=minimal",
  },
  body: JSON.stringify({ token_sha256: sha }),
});
if (!res.ok) {
  console.error("token upsert failed", res.status, await res.text());
  process.exit(1);
}
console.log("crypto_job_token hash stored");
