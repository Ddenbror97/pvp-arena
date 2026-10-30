import { mkdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
export const AUTHORIZED_AUDIT_REF = "rymzkgqoekjluzmzstap";
export function hostedAuditDatabase(raw: string) {
  const u = new URL(raw);
  const direct =
    u.hostname === `db.${AUTHORIZED_AUDIT_REF}.supabase.co` &&
    decodeURIComponent(u.username) === "postgres";
  const pool =
    u.hostname === "aws-0-us-east-1.pooler.supabase.com" &&
    decodeURIComponent(u.username) === `postgres.${AUTHORIZED_AUDIT_REF}`;
  if (!direct && !pool) throw Error("Refusing a hosted audit outside Fresh test pvpspinarena");
  return raw;
}
export function assertHostedAuditEnvironment() {
  if (
    process.env.SUPABASE_PROJECT_ID !== AUTHORIZED_AUDIT_REF ||
    process.env.SUPABASE_URL !== `https://${AUTHORIZED_AUDIT_REF}.supabase.co`
  )
    throw Error("Hosted audit requires the explicitly authorized Fresh test environment");
}
export function auditArtifact(name: string) {
  mkdirSync(resolve("test-results"), { recursive: true });
  return resolve("test-results", name);
}
export function pgExecutable(name: string) {
  if (process.env.PG_BIN)
    return join(process.env.PG_BIN, process.platform === "win32" ? name + ".exe" : name);
  if (process.platform === "win32") {
    for (const version of [18, 17]) {
      const p = `C:/Program Files/PostgreSQL/${version}/bin/${name}.exe`;
      if (existsSync(p)) return p;
    }
  }
  return name;
}
