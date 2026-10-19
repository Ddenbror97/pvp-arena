import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";

const FIXTURE = `
set check_function_bodies = on;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role; end if;
end $$;
create schema if not exists net;
create or replace function net.http_post(url text, headers jsonb, body jsonb, timeout_milliseconds integer)
returns bigint language sql as $$ select 1::bigint $$;
create or replace function public._no_truncate() returns trigger language plpgsql as $$
begin
  raise exception 'truncate blocked';
end $$;
create or replace function public._withdraw_basis_peek(p_user uuid) returns jsonb
language sql as $$ select '{"room":0,"bonus":0,"deposits":0}'::jsonb $$;
create or replace function public.treasury_can_fund_cents(p_account text, p_asset text, p_cents bigint)
returns integer language sql as $$ select 1 $$;
create or replace function public.leaderboard_tick() returns jsonb language sql as $$ select '{"ok":true}'::jsonb $$;
create table public.crypto_job_runs (name text primary key, last_run_at timestamptz not null default 'epoch');
create table public.crypto_job_bearer (id boolean primary key default true, token text);
create table public.crypto_deposits (
  id uuid primary key default gen_random_uuid(), user_id uuid, chain_id bigint, asset_key text,
  tx_hash text, units numeric, usd_cents bigint, status text, detected_at timestamptz, credited_at timestamptz
);
create table public.crypto_withdrawals (
  id uuid primary key default gen_random_uuid(), user_id uuid, chain_id bigint, asset_key text,
  tx_hash text, units numeric, usd_cents bigint, fee_usd_cents bigint, status text,
  review_required boolean, created_at timestamptz, confirmed_at timestamptz, last_error text, nonce integer
);
create table public.btcpay_invoices (
  id uuid primary key default gen_random_uuid(), user_id uuid, status text, credited_cents bigint,
  usd_cents bigint, created_at timestamptz, btc_due numeric, required_confirmations integer
);
create table public.btcpay_payouts (
  id uuid primary key default gen_random_uuid(), user_id uuid, usd_cents bigint, status text,
  created_at timestamptz, address text
);
create table public.nowpayments_invoices (
  id uuid primary key default gen_random_uuid(), user_id uuid, usd_cents bigint, status text, created_at timestamptz
);
create table public.crypto_settings (
  crypto_system_enabled boolean, deposits_enabled boolean, withdrawals_enabled boolean,
  min_deposit_cents bigint, min_withdrawal_cents bigint, daily_limit_cents bigint,
  withdrawal_fee_cents bigint, auto_approve_cents bigint
);
create table public.chain_networks (
  chain_id bigint primary key, name text, network_mode text, min_deposit_cents bigint,
  min_withdrawal_cents bigint, credit_confirmations integer, is_enabled boolean
);
create table public.chain_assets (
  chain_id bigint, asset_key text, display_name text, decimals integer, settlement_kind text,
  is_enabled boolean, contract_address text
);
create table public.user_wallets (
  user_id uuid, is_verified boolean, is_primary boolean, normalized_address text
);
create table public.crypto_deposit_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  chain_id bigint not null,
  derivation_index integer not null,
  address text not null,
  created_at timestamptz not null default now(),
  unique (chain_id, user_id),
  unique (chain_id, derivation_index),
  unique (chain_id, address)
);
create table public.chain_treasury_accounts (
  chain_id bigint, role text, address text, is_active boolean
);
insert into public.chain_treasury_accounts (chain_id, role, address, is_active) values
  (8453, 'deposit', '0x9EAff85db9A2559eC958740A6a3b523751237987', true),
  (8453, 'payout', '0xd29370ca973E85B7EC7E52c0cff267B0FB63dA24', true);
insert into public.chain_assets (chain_id, asset_key, display_name, decimals, settlement_kind, is_enabled, contract_address)
values (8453, 'USDC', 'USDC', 6, 'erc20', true, '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913');
insert into public.crypto_deposit_addresses (user_id, chain_id, derivation_index, address)
select gen_random_uuid(), 8453, g, '0x' || lpad(to_hex(g), 40, '0')
from generate_series(1, 57) g;
`;

const SWEEP = readFileSync("supabase/migrations/20261018233000_base_deposit_sweeps.sql", "utf8");
const VERSION = readFileSync(
  "supabase/migrations/20261019010000_deposit_address_version.sql",
  "utf8",
);
const JOB = readFileSync("supabase/migrations/20261019020000_sweep_job_and_readiness.sql", "utf8");

async function migrated() {
  const db = new PGlite();
  await db.exec(FIXTURE);
  const before = await db.query<{ derivation_index: number; address: string }>(
    "select derivation_index, address from public.crypto_deposit_addresses order by derivation_index",
  );
  await db.exec(SWEEP);
  await db.exec(VERSION);
  await db.exec(JOB);
  return { db, before: before.rows };
}

describe("base sweep migrations on a production-like schema", () => {
  it("rejects the versioning file until the sweep tables exist", async () => {
    const db = new PGlite();
    await db.exec(FIXTURE);
    await expect(db.exec(`begin; ${VERSION}; commit;`)).rejects.toThrow(/crypto_deposit_sweeps/);
    await db.exec("rollback");
    const count = await db.query<{ n: number }>(
      "select count(*)::int as n from public.crypto_deposit_addresses",
    );
    const versionColumn = await db.query<{ column_name: string }>(
      `select column_name from information_schema.columns
       where table_schema = 'public' and table_name = 'crypto_deposit_addresses'
         and column_name = 'derivation_version'`,
    );
    expect(count.rows[0]?.n).toBe(57);
    expect(versionColumn.rows).toEqual([]);
  });

  it("keeps 57 version 1 rows, isolates version 2 indexes, and gates sweeps", async () => {
    const { db, before } = await migrated();
    expect(before).toHaveLength(57);
    const after = await db.query<{
      derivation_index: number;
      address: string;
      derivation_version: number;
    }>(
      "select derivation_index, address, derivation_version from public.crypto_deposit_addresses order by derivation_index",
    );
    expect(after.rows.map((row) => [row.derivation_index, row.address])).toEqual(
      before.map((row) => [row.derivation_index, row.address]),
    );
    expect(new Set(after.rows.map((row) => row.derivation_version))).toEqual(new Set([1]));

    const user = await db.query<{ user_id: string }>(
      "select user_id from public.crypto_deposit_addresses where derivation_index = 1",
    );
    await db.exec(`
      insert into public.crypto_deposit_addresses
        (user_id, chain_id, derivation_index, address, derivation_version)
      values ('${user.rows[0]!.user_id}', 8453, 1, '0x${"22".repeat(20)}', 2)
    `);
    await expect(
      db.exec(`
        insert into public.crypto_deposit_addresses
          (user_id, chain_id, derivation_index, address, derivation_version)
        values (gen_random_uuid(), 8453, 1, '0x${"33".repeat(20)}', 2)
      `),
    ).rejects.toThrow();

    const v1 = before[0]!;
    await expect(
      db.query(
        `select public.crypto_sweep_begin(8453, $1, $2, 'ETH', 1000, 0, $1, '0x9eaff85db9a2559ec958740a6a3b523751237987', 21000, 1)`,
        [v1.address, v1.derivation_index],
      ),
    ).rejects.toThrow(/SWEEP_NOT_VERSION_2/);

    const begun = await db.query<{ created: boolean; id: string }>(
      `select (public.crypto_sweep_begin(
        8453, '0x${"22".repeat(20)}', 1, 'ETH', 1000, 0,
        '0x${"22".repeat(20)}', '0x9eaff85db9a2559ec958740a6a3b523751237987', 21000, 1
      )->>'created')::boolean as created,
      public.crypto_sweep_begin(
        8453, '0x${"22".repeat(20)}', 1, 'ETH', 1000, 1,
        '0x${"22".repeat(20)}', '0x9eaff85db9a2559ec958740a6a3b523751237987', 21000, 1
      )->>'id' as id`,
    );
    expect(begun.rows[0]?.created).toBe(true);
    const second = await db.query<{ created: boolean }>(
      `select (public.crypto_sweep_begin(
        8453, '0x${"22".repeat(20)}', 1, 'ETH', 1000, 2,
        '0x${"22".repeat(20)}', '0x9eaff85db9a2559ec958740a6a3b523751237987', 21000, 1
      )->>'created')::boolean as created`,
    );
    expect(second.rows[0]?.created).toBe(false);

    const payer = "0xd29370ca973e85b7ec7e52c0cff267b0fb63da24";
    const firstNonce = await db.query<{ nonce: number; reused: boolean }>(
      `select (public.crypto_reserve_nonce(8453, $1, 'withdrawal', 'withdrawal-a', 4)->>'nonce')::int as nonce,
              (public.crypto_reserve_nonce(8453, $1, 'withdrawal', 'withdrawal-a', 4)->>'reused')::boolean as reused`,
      [payer],
    );
    expect(firstNonce.rows[0]?.reused).toBe(true);
    const gas = await db.query<{ nonce: number }>(
      `select (public.crypto_reserve_nonce(8453, $1, 'gas_stipend', 'gas:deposit', 4)->>'nonce')::int as nonce`,
      [payer],
    );
    expect(gas.rows[0]?.nonce).toBeGreaterThan(firstNonce.rows[0]!.nonce);

    const activity = await db.query<{ def: string }>(
      "select pg_get_functiondef('public.crypto_my_activity(uuid)'::regprocedure) as def",
    );
    expect(activity.rows[0]?.def).toContain("bitcoin_payouts");
    expect(activity.rows[0]?.def).toContain("_withdraw_basis_peek");
    expect(activity.rows[0]?.def).toContain("derivation_version");

    const ready = await db.query<{
      body: { functions_ready: boolean; deposit_count: number; usdc: string };
    }>("select public.crypto_sweep_readiness() as body");
    expect(ready.rows[0]?.body.functions_ready).toBe(true);
    expect(ready.rows[0]?.body.deposit_count).toBe(1);
    expect(ready.rows[0]?.body.usdc).toBe("0x833589fcd6edb6e08f4c7c32d4f71b54bda02913");

    const dispatch = await db.query<{ def: string }>(
      "select pg_get_functiondef('public.pvp_minute_dispatch()'::regprocedure) as def",
    );
    const def = dispatch.rows[0]?.def ?? "";
    expect(def.indexOf("crypto-deposits")).toBeGreaterThan(-1);
    expect(def.indexOf("crypto-sweeps")).toBeGreaterThan(def.indexOf("crypto-deposits"));
    expect(def).not.toContain("cron.schedule");

    const snap = await db.query<{ body: { addresses: Record<string, number> } }>(
      "select public.crypto_sweep_ops_snapshot() as body",
    );
    expect(snap.rows[0]?.body.addresses["1"]).toBe(57);
    expect(snap.rows[0]?.body.addresses["2"]).toBe(1);
  });
});
