import postgres from "postgres";
import { createHash } from "node:crypto";
export const STAGING_REF = "rymzkgqoekjluzmzstap";
export function assertStaging() {
  if (
    process.env.SUPABASE_PROJECT_ID !== STAGING_REF ||
    new URL(process.env.SUPABASE_URL || "http://invalid").hostname !== STAGING_REF + ".supabase.co"
  )
    throw Error("Refusing a non-staging Supabase target");
  const db = new URL(process.env.FPS_STAGING_DATABASE_URL || "postgres://invalid");
  const direct =
    db.hostname === "db." + STAGING_REF + ".supabase.co" &&
    decodeURIComponent(db.username) === "postgres";
  const pool =
    db.hostname === "aws-0-us-east-1.pooler.supabase.com" &&
    decodeURIComponent(db.username) === "postgres." + STAGING_REF;
  if (
    !["postgres:", "postgresql:"].includes(db.protocol) ||
    db.pathname !== "/postgres" ||
    (!direct && !pool)
  )
    throw Error("Database is not the explicitly authorized staging project");
}
export function connect(max = 8) {
  assertStaging();
  return postgres(process.env.FPS_STAGING_DATABASE_URL, {
    ssl: "require",
    max,
    prepare: false,
    connect_timeout: 15,
    idle_timeout: 5,
    onnotice: () => {},
  });
}

/** Disposable project only. Synthetic custody, user posting and receipt commit together. */
export async function seedSyntheticUser(sql, userId) {
  assertStaging();
  const key = "staging-seed:" + userId;
  const receipt =
    "0x" +
    createHash("sha256")
      .update("ISOLATED-STAGING:" + userId)
      .digest("hex");
  await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(hashtextextended(${key},1))`;
    let id = (await tx`select id from public.ledger_transactions where idempotency_key=${key}`)[0]
      ?.id;
    if (!id) {
      const external = (
        await tx`select public._system_account('external_custody','USD','real') id`
      )[0].id;
      const available = (
        await tx`select public._user_account(${userId}::uuid,'user_available','USD','real') id`
      )[0].id;
      await tx`select public._user_account(${userId}::uuid,'user_locked','USD','real')`;
      id = (
        await tx`insert into public.ledger_transactions(kind,idempotency_key,account_type,user_id,memo) values('deposit',${key},'real',${userId},'ISOLATED STAGING SYNTHETIC DEPOSIT - NO REAL FUNDS') returning id`
      )[0].id;
      await tx`select public._post(${id}::uuid,${external}::uuid,-100000::bigint)`;
      await tx`select public._post(${id}::uuid,${available}::uuid,100000::bigint)`;
    }
    await tx`insert into public.crypto_deposits(chain_id,asset_key,tx_hash,log_index,block_number,from_address,to_address,units,usd_cents,status,confirmed_at,credited_at,user_id,ledger_tx_id,closed_reason) values(8453,'USDC',${receipt},0,0,${"0x" + "a".repeat(40)},${"0x" + "b".repeat(40)},1000000000,100000,'CREDITED',now(),now(),${userId},${id},'ISOLATED STAGING SYNTHETIC RECEIPT - NO CHAIN TRANSFER') on conflict do nothing`;
  });
}
export async function asUser(sql, user, fn) {
  return sql.begin(async (tx) => {
    await tx`select set_config('request.jwt.claims',${JSON.stringify(user.claims)},true)`;
    await tx.unsafe("set local role authenticated");
    await tx.unsafe("set local statement_timeout='15s';set local lock_timeout='8s'");
    return fn(tx);
  });
}
export async function asService(sql, fn) {
  return sql.begin(async (tx) => {
    await tx`select set_config('request.jwt.claims','{"role":"service_role"}',true)`;
    await tx.unsafe("set local role service_role");
    await tx.unsafe("set local statement_timeout='15s';set local lock_timeout='8s'");
    return fn(tx);
  });
}
