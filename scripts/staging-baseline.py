#!/usr/bin/env python3
"""Apply a staging ledger baseline to pvp-spinarena-test only.

Reads STAGING_DB_URL from the environment. Refuses production project refs.
Strips the production deposit cutover and the two production credit blocks.
Does not copy users, balances, secrets, or treasury keys.
Pool migrations run only after the ledger tables, functions, and roles exist.
"""

from __future__ import annotations

import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS = ROOT / "supabase" / "migrations"
FORBIDDEN = (
    "dkyabirifoixnfbmheay",
    "gqeaadpdtuussxdlnmof",
    "fdsovopvmjogjcllmxwj",
)
REQUIRED = "pazfinjxikdbqczbwxsr"
SKIP = {"20260925125620_70751fb6-0f85-4e13-9c9f-4a2eeb379a5f.sql"}
PRODUCTION_IDS = (
    "0c9efda3-4bbe-40cf-beaf-d05edddadcd0",
    "8ea66488-f2ed-4c7a-abda-79d9d079c06f",
    "1690a12b-c7ce-49ce-851f-c402fc0a2c7f",
)
POOL_FROM = "20261022193000"

MIGRATE_DO = re.compile(
    r"DO \$\$\s*DECLARE r1 jsonb; r2 jsonb; inv jsonb;[\s\S]*?END \$\$;",
    re.IGNORECASE,
)
CREDIT_DO = re.compile(
    r"DO \$\$\s*DECLARE r jsonb; s crypto_settings;[\s\S]*?END \$\$;",
    re.IGNORECASE,
)
FN_END = re.compile(r"end \$fn\$(?!\s*;)", re.IGNORECASE)


def sanitize(name: str, sql: str) -> str:
    if name in SKIP:
        return ""
    sql = MIGRATE_DO.sub("", sql)
    sql = CREDIT_DO.sub("", sql)
    sql = FN_END.sub("end $fn$;", sql)
    for ident in PRODUCTION_IDS:
        if ident in sql:
            raise SystemExit(f"refusing {name}: production id survived sanitizing")
    return sql.strip()


def psql(url: str, sql: str, single_tx: bool) -> subprocess.CompletedProcess[str]:
    with tempfile.NamedTemporaryFile("w", suffix=".sql", delete=False) as handle:
        handle.write(sql)
        path = handle.name
    cmd = ["psql", url, "-v", "ON_ERROR_STOP=1", "-q", "-f", path]
    if single_tx:
        cmd.insert(2, "-1")
    try:
        return subprocess.run(cmd, text=True, capture_output=True)
    finally:
        os.unlink(path)


def main() -> None:
    url = os.environ.get("STAGING_DB_URL", "")
    if not url or any(ref in url for ref in FORBIDDEN) or REQUIRED not in url:
        raise SystemExit("refusing database URL")
    files = sorted(p for p in MIGRATIONS.glob("*.sql"))
    pre = [p for p in files if p.name < POOL_FROM]
    pool = [p for p in files if p.name >= POOL_FROM]
    if len(pool) < 2:
        raise SystemExit("pool migrations missing")

    ready = psql(
        url,
        """
        select count(*) from information_schema.tables
        where table_schema = 'public' and table_type = 'BASE TABLE';
        """,
        True,
    )
    if ready.returncode != 0:
        sys.stderr.write(ready.stderr)
        raise SystemExit("staging probe failed")
    print(ready.stdout.strip())

    applied = psql(
        url,
        """
        create schema if not exists supabase_migrations;
        create table if not exists supabase_migrations.schema_migrations (
          version text primary key,
          name text not null
        );
        select version from supabase_migrations.schema_migrations;
        """,
        True,
    )
    if applied.returncode != 0:
        sys.stderr.write(applied.stderr)
        raise SystemExit("migration ledger failed")
    done = set(re.findall(r"\d{14}", applied.stdout))

    def apply_set(paths: list[Path]) -> None:
        for path in paths:
            version = path.name.split("_", 1)[0]
            if version in done:
                print(f"skip {path.name}")
                continue
            body = sanitize(path.name, path.read_text())
            if not body:
                mark = psql(
                    url,
                    f"insert into supabase_migrations.schema_migrations (version, name) values ('{version}', '{path.name}') on conflict do nothing;",
                    True,
                )
                if mark.returncode != 0:
                    sys.stderr.write(mark.stderr)
                    raise SystemExit(f"could not record skip {path.name}")
                print(f"stripped {path.name}")
                continue
            single = "create index concurrently" not in body.lower()
            wrapped = "set statement_timeout = '180s';\n" + body + "\n"
            result = psql(url, wrapped, single)
            if result.returncode != 0:
                sys.stderr.write(result.stderr)
                raise SystemExit(f"failed {path.name}")
            mark = psql(
                url,
                f"insert into supabase_migrations.schema_migrations (version, name) values ('{version}', '{path.name}') on conflict do nothing;",
                True,
            )
            if mark.returncode != 0:
                sys.stderr.write(mark.stderr)
                raise SystemExit(f"applied but could not record {path.name}")
            print(f"applied {path.name}")

    apply_set(pre)
    check = psql(
        url,
        """
        do $$
        declare
          deposits bigint;
          ledger_rows bigint;
          balances bigint;
          roles int;
        begin
          if to_regtype('public.tx_kind') is null then raise exception 'missing tx_kind'; end if;
          if to_regclass('public.ledger_transactions') is null then raise exception 'missing ledger_transactions'; end if;
          if to_regclass('public.ledger_entries') is null and to_regclass('public.ledger_postings') is null then
            raise exception 'missing ledger postings';
          end if;
          if to_regclass('public.wallet_accounts') is null then raise exception 'missing wallet_accounts'; end if;
          if to_regclass('public.profiles') is null then raise exception 'missing profiles'; end if;
          if to_regprocedure('public._money_state()') is null then raise exception 'missing _money_state'; end if;
          if public._money_state() <> 'PRE_MIGRATION' then
            raise exception 'expected PRE_MIGRATION, got %', public._money_state();
          end if;
          select count(*) into deposits from public.crypto_deposits;
          select count(*) into ledger_rows from public.ledger_transactions;
          select coalesce(sum(balance), 0) into balances from public.wallet_accounts;
          if deposits <> 0 or ledger_rows <> 0 or balances <> 0 then
            raise exception 'staging ledger is not empty deposits=% ledger=% balances=%', deposits, ledger_rows, balances;
          end if;
          if exists (select 1 from public.profiles where id = '0c9efda3-4bbe-40cf-beaf-d05edddadcd0') then
            raise exception 'production profile present';
          end if;
          select count(*) into roles from pg_roles where rolname in ('anon','authenticated','service_role');
          if roles <> 3 then raise exception 'api roles missing'; end if;
          if not exists (
            select 1 from pg_policies where schemaname = 'public' and tablename = 'wallet_accounts'
          ) and not exists (
            select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'public' and c.relname = 'wallet_accounts' and c.relrowsecurity
          ) then
            raise exception 'wallet_accounts is missing row level security';
          end if;
          raise notice 'ledger baseline ok state=% deposits=% balances=%', public._money_state(), deposits, balances;
        end $$;
        """,
        True,
    )
    sys.stdout.write(check.stdout)
    sys.stderr.write(check.stderr)
    if check.returncode != 0:
        raise SystemExit("ledger validation failed; pool was not applied")
    apply_set(pool)
    print("pool migrations applied")
    if "--bootstrap" not in sys.argv:
        return
    boot = psql(url, BOOTSTRAP, True)
    sys.stdout.write(boot.stdout)
    sys.stderr.write(boot.stderr)
    if boot.returncode != 0:
        raise SystemExit("empty ledger bootstrap failed; no production data was copied")
    print("empty real ledger finalized; withdrawals and deposits stay off")


BOOTSTRAP = r"""
do $$
declare n int; inv jsonb;
begin
  if public._money_state() <> 'PRE_MIGRATION' then
    raise exception 'bootstrap refused: state %', public._money_state();
  end if;
  if exists (select 1 from public.crypto_deposits) then raise exception 'bootstrap refused: deposits exist'; end if;
  if exists (select 1 from public.ledger_transactions) then raise exception 'bootstrap refused: ledger activity'; end if;
  if exists (select 1 from public.wallet_accounts where balance <> 0) then raise exception 'bootstrap refused: nonzero balance'; end if;
  if exists (select 1 from public.crypto_withdrawals) then raise exception 'bootstrap refused: withdrawals exist'; end if;
  if exists (select 1 from public.profiles where id = '0c9efda3-4bbe-40cf-beaf-d05edddadcd0') then
    raise exception 'bootstrap refused: production profile present';
  end if;
  if exists (select 1 from public.crypto_job_bearer) then raise exception 'bootstrap refused: job token present'; end if;

  -- Staging has no treasury key. Chain broadcast stays off.
  update public.crypto_settings
     set withdrawals_enabled = false,
         deposits_enabled = false,
         real_play_enabled = false,
         watch_only = true;

  insert into public.wallet_accounts (owner_id, kind, asset, account_type)
    select p.id, k.kind, 'USD', 'real'
    from public.profiles p
    cross join (values ('user_available'::public.account_kind), ('user_locked'::public.account_kind)) k(kind)
    on conflict do nothing;
  perform public._system_account('house_revenue','USD','real');
  perform public._system_account('game_escrow','USD','real');
  perform public._system_account('external_custody','USD','real');
  perform public._system_account('house_bankroll','USD','real');

  update public.money_domain_config
     set money_domain = 'REAL_USD', asset = 'USD', account_type = 'real', updated_at = now();
  insert into public.money_migrations (version, state, details)
  values (
    'real_usd_v1',
    'MIGRATED',
    jsonb_build_object(
      'deposit_snapshot', '[]'::jsonb,
      'source', 'empty_staging_bootstrap',
      'production_deposits', false,
      'balances_copied', false
    )
  );

  select count(*) into n from public.profiles p
   where not exists (
     select 1 from public.wallet_accounts w
     where w.owner_id = p.id and w.kind = 'user_available' and w.account_type = 'real')
      or not exists (
     select 1 from public.wallet_accounts w
     where w.owner_id = p.id and w.kind = 'user_locked' and w.account_type = 'real');
  if n <> 0 then raise exception 'bootstrap real accounts missing'; end if;
  if exists (select 1 from public.wallet_accounts where account_type = 'real' and balance <> 0) then
    raise exception 'bootstrap real balance';
  end if;
  inv := public.money_real_invariants();
  if coalesce((inv->>'postings_sum')::bigint, 0) <> 0 or coalesce((inv->>'custody')::bigint, 0) <> 0 then
    raise exception 'bootstrap invariants %', inv;
  end if;

  update public.crypto_settings
     set money_domain_frozen = true,
         real_play_enabled = true,
         crypto_system_enabled = true
   where watch_only and not withdrawals_enabled and not deposits_enabled;
  if not found then raise exception 'bootstrap switches'; end if;
  update public.money_migrations
     set state = 'FINALIZED', finalized_at = now(), updated_at = now()
   where version = 'real_usd_v1' and state = 'MIGRATED';
  if public._money_state() <> 'FINALIZED' then raise exception 'bootstrap did not finalize'; end if;
  if not public._play_domain_open() then raise exception 'play domain closed'; end if;
  raise notice 'staging real ledger finalized balances=% play=%',
    (select coalesce(sum(balance), 0) from public.wallet_accounts),
    public._play_domain_open();
end $$;
"""


if __name__ == "__main__":
    main()
