import fs from "node:fs";
import assert from "node:assert/strict";
import { assertStaging } from "./staging-lib.mjs";
assertStaging();
const names = ["SUPABASE_SERVICE_ROLE_KEY", "FPS_RUNTIME_SECRET", "FPS_STAGING_DATABASE_URL"];
for (const n of names) assert(process.env[n], "Missing staging " + n);
let count = 0;
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = dir + "/" + e.name;
    if (e.isDirectory()) walk(p);
    else {
      const b = fs.readFileSync(p);
      count++;
      for (const name of names)
        assert(
          !b.includes(Buffer.from(process.env[name])),
          "Server-only secret exposed in public build: " + name,
        );
    }
  }
}
walk(".output/public");
fs.writeFileSync(
  "test-results/fps-public-secret-scan.json",
  JSON.stringify(
    { project: process.env.SUPABASE_PROJECT_ID, files: count, serverSecretsAbsent: true },
    null,
    2,
  ),
);
console.log(JSON.stringify({ files: count, serverSecretsAbsent: true }));
