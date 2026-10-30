import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { assertStaging } from "./staging-lib.mjs";
assertStaging();
const root = ".wrangler/fps-staging-cli/supabase";
mkdirSync(root + "/migrations", { recursive: true });
writeFileSync(root + "/config.toml", 'project_id = "rymzkgqoekjluzmzstap"\n');
// Keep original DDL/function bodies intact. Only normalize Windows line endings and
// pause jobs inside each migration transaction before they could call the production site.
const guard = `do $fps_staging_guard$ begin if to_regclass('cron.job') is not null then perform cron.alter_job(jobid,active:=false) from cron.job where username=current_user and active;if exists(select 1 from cron.job where active) then raise exception 'Staging job isolation failed';end if;end if;end $fps_staging_guard$;`;
const manifest = [];
for (const file of readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql"))) {
  const raw = readFileSync(join("supabase/migrations", file), "utf8"),
    source = raw.replace(/\r\n/g, "\n");
  // The only unindented COMMIT in current source is the FPS migration wrapper;
  // procedural COMMIT statements are indented and must never be rewritten.
  const staged = source.replace(/^commit;$/gim, guard + "\ncommit;") + "\n" + guard + "\n";
  writeFileSync(join(root, "migrations", file), staged);
  manifest.push({
    file,
    sourceSha256: createHash("sha256").update(raw).digest("hex"),
    stagingSha256: createHash("sha256").update(staged).digest("hex"),
  });
}
writeFileSync("test-results/staging-migration-manifest.json", JSON.stringify(manifest, null, 2));
console.log(
  `Prepared ${manifest.length} source migrations for the explicitly isolated staging project.`,
);
