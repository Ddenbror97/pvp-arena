-- Separate Base sweep HTTP call, readiness check, and aggregate ops snapshot.
-- Apply after 20261018233000_base_deposit_sweeps.sql and
-- 20261019010000_deposit_address_version.sql.
-- This does not add a cron job. pvp_minute_dispatch already runs every minute
-- and now queues crypto-sweeps after crypto-deposits. Each call has its own
-- 25 second pg_net budget. The sweep worker stops new work after 18 seconds.

insert into public.crypto_job_runs (name)
values ('sweeps')
on conflict (name) do nothing;

create or replace function public.crypto_invoke_cron(p_path text)
returns bigint
language plpgsql
security definer
set search_path = public, net
as $$
declare
  tok text;
  req_id bigint;
begin
  if p_path not in ('crypto-deposits', 'crypto-withdrawals', 'crypto-reconcile', 'crypto-sweeps') then
    raise exception 'invalid crypto cron path';
  end if;
  select token into tok from public.crypto_job_bearer where id;
  if tok is null then
    raise exception 'crypto job token missing';
  end if;
  select net.http_post(
    url := 'https://pvpspinarena.com/api/public/cron/' || p_path,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || tok
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 25000
  ) into req_id;
  return req_id;
end;
$$;

revoke all on function public.crypto_invoke_cron(text) from public, anon, authenticated;
grant execute on function public.crypto_invoke_cron(text) to service_role;

create or replace function public.pvp_minute_dispatch()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare results jsonb := '{}'::jsonb; step text; one jsonb;
begin
  foreach step in array array['crypto-withdrawals', 'crypto-deposits', 'crypto-sweeps', 'leaderboard']
  loop
    begin
      if step = 'crypto-withdrawals' then
        perform public.crypto_invoke_cron('crypto-withdrawals');
        one := '{"ok":true}'::jsonb;
      elsif step = 'crypto-deposits' then
        perform public.crypto_invoke_cron('crypto-deposits');
        one := '{"ok":true}'::jsonb;
      elsif step = 'crypto-sweeps' then
        perform public.crypto_invoke_cron('crypto-sweeps');
        one := '{"ok":true}'::jsonb;
      else
        one := public.leaderboard_tick();
      end if;
      results := results || jsonb_build_object(step, coalesce(one, '{"ok":true}'::jsonb));
    exception when others then
      results := results || jsonb_build_object(step, jsonb_build_object('error', left(sqlerrm, 200)));
    end;
  end loop;
  return results;
end
$fn$;

revoke all on function public.pvp_minute_dispatch() from public, anon, authenticated;
grant execute on function public.pvp_minute_dispatch() to service_role;

create or replace function public.crypto_sweep_readiness()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  missing text;
  deposit_count integer;
  payout_count integer;
  deposit_addr text;
  payout_addr text;
  usdc text;
begin
  missing := case
    when to_regprocedure('public.crypto_sweep_begin(bigint,text,integer,text,numeric,integer,text,text,numeric,numeric)') is null then 'crypto_sweep_begin'
    when to_regprocedure('public.crypto_sweep_confirm(uuid,text,text,text,numeric,bigint)') is null then 'crypto_sweep_confirm'
    when to_regprocedure('public.crypto_sweep_for_address(bigint,text)') is null then 'crypto_sweep_for_address'
    when to_regprocedure('public.crypto_sweep_inflight(bigint)') is null then 'crypto_sweep_inflight'
    when to_regprocedure('public.crypto_sweep_store_signed(uuid,text,text)') is null then 'crypto_sweep_store_signed'
    when to_regprocedure('public.crypto_reserve_nonce(bigint,text,text,text,integer)') is null then 'crypto_reserve_nonce'
    when to_regprocedure('public.crypto_nonce_mark_signed(bigint,text,integer,text)') is null then 'crypto_nonce_mark_signed'
    when to_regprocedure('public.crypto_nonce_release(bigint,text,integer,text,integer)') is null then 'crypto_nonce_release'
    else null
  end;
  if missing is not null then
    return jsonb_build_object('functions_ready', false, 'missing', missing);
  end if;

  select count(*)::integer, min(lower(address))
    into deposit_count, deposit_addr
  from public.chain_treasury_accounts
  where chain_id = 8453 and role = 'deposit' and is_active;

  select count(*)::integer, min(lower(address))
    into payout_count, payout_addr
  from public.chain_treasury_accounts
  where chain_id = 8453 and role = 'payout' and is_active;

  select lower(contract_address) into usdc
  from public.chain_assets
  where chain_id = 8453 and asset_key = 'USDC' and is_enabled
  order by contract_address
  limit 1;

  return jsonb_build_object(
    'functions_ready', true,
    'deposit_count', coalesce(deposit_count, 0),
    'deposit_address', deposit_addr,
    'payout_count', coalesce(payout_count, 0),
    'payout_address', payout_addr,
    'usdc', usdc
  );
end;
$$;

revoke all on function public.crypto_sweep_readiness() from public, anon, authenticated;
grant execute on function public.crypto_sweep_readiness() to service_role;

create or replace function public.crypto_sweep_ops_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  addresses jsonb;
  sweeps jsonb;
  oldest numeric;
  gas_funded integer;
  gas_attempts integer;
  gas_wei numeric;
  leases jsonb;
begin
  select coalesce(jsonb_object_agg(derivation_version::text, n), '{}'::jsonb)
    into addresses
  from (
    select derivation_version, count(*)::integer as n
    from public.crypto_deposit_addresses
    where chain_id = 8453
    group by derivation_version
  ) s;

  select coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
    into sweeps
  from (
    select status, count(*)::integer as n
    from public.crypto_deposit_sweeps
    where chain_id = 8453
    group by status
  ) s;

  select extract(epoch from (clock_timestamp() - min(created_at)))
    into oldest
  from public.crypto_deposit_sweeps
  where chain_id = 8453 and status in ('PENDING', 'SIGNED', 'BROADCAST');

  select count(*)::integer, coalesce(sum(amount), 0)
    into gas_funded, gas_wei
  from public.crypto_deposit_sweeps
  where chain_id = 8453 and asset_key = 'GAS' and status <> 'FAILED';

  select count(*)::integer into gas_attempts
  from public.crypto_deposit_sweeps
  where chain_id = 8453 and asset_key = 'GAS';

  select coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
    into leases
  from (
    select status, count(*)::integer as n
    from public.crypto_nonce_leases
    where chain_id = 8453
    group by status
  ) s;

  return jsonb_build_object(
    'addresses', addresses,
    'sweeps', sweeps,
    'oldest_inflight_seconds', oldest,
    'gas_funded_rows', gas_funded,
    'gas_funded_wei', gas_wei,
    'gas_attempts', gas_attempts,
    'nonce_leases', leases
  );
end;
$$;

revoke all on function public.crypto_sweep_ops_snapshot() from public, anon, authenticated;
grant execute on function public.crypto_sweep_ops_snapshot() to service_role;
