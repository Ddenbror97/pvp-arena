import fs from "node:fs";
import { assertStaging, connect } from "./staging-lib.mjs";
assertStaging();
const sql = connect(1);
try {
  const applied =
    await sql`select version from supabase_migrations.schema_migrations order by version`;
  const local = fs
    .readdirSync("supabase/migrations")
    .filter((x) => x.endsWith(".sql"))
    .map((x) => x.split("_")[0]);
  const versions = new Set(applied.map((x) => x.version));
  const tables =
    await sql`select n.nspname schema,c.relname name,c.relrowsecurity rls from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r' and (n.nspname='fps_private' or (n.nspname='public' and c.relname like 'fps_%')) order by 1,2`;
  const functions =
    await sql`select n.nspname schema,p.proname name,pg_get_function_identity_arguments(p.oid) args,p.prosecdef security_definer,md5(pg_get_functiondef(p.oid)) definition_hash,p.proacl::text acl from pg_proc p join pg_namespace n on n.oid=p.pronamespace where (n.nspname='fps_private' or (n.nspname='public' and p.proname like 'fps_%')) and p.prokind='f' order by 1,2,3`;
  const indexes =
    await sql`select schemaname,tablename,indexname,indexdef from pg_indexes where schemaname='fps_private' or (schemaname='public' and tablename like 'fps_%') order by 1,2,3`;
  const policies =
    await sql`select schemaname,tablename,policyname,roles,cmd,qual,with_check from pg_policies where schemaname='fps_private' or (schemaname='public' and tablename like 'fps_%') order by 1,2,3`;
  const triggers =
    await sql`select event_object_schema,event_object_table,trigger_name,action_timing,event_manipulation from information_schema.triggers where event_object_schema='fps_private' or (event_object_schema='public' and event_object_table like 'fps_%') order by 1,2,3`;
  const buckets = await sql`select id,public from storage.buckets order by id`;
  const report = {
    at: new Date().toISOString(),
    project: process.env.SUPABASE_PROJECT_ID,
    missing: local.filter((x) => !versions.has(x)),
    remoteOnly: [...versions].filter((x) => !local.includes(x)),
    activeCron: Number((await sql`select count(*) n from cron.job where active`)[0].n),
    tables,
    functions,
    indexes,
    policies,
    triggers,
    buckets,
  };
  fs.writeFileSync("test-results/fps-test-database-catalog.json", JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify({
      project: report.project,
      missing: report.missing,
      remoteOnly: report.remoteOnly,
      activeCron: report.activeCron,
      tables: tables.length,
      functions: functions.length,
      indexes: indexes.length,
      policies: policies.length,
      triggers: triggers.length,
      buckets: buckets.length,
    }),
  );
} finally {
  await sql.end();
}
