-- Cross-user lock for the rolling 24-hour global cashout cap.
-- The window stays created_at > now() - interval '24 hours'. It is not a UTC calendar day.
-- A Bitcoin cashout is one btcpay_payouts row. An EVM cashout is one crypto_withdrawals row.
-- The two tables are added together. The request functions insert into exactly one of them.
-- HOLD, QUEUED, PENDING, APPROVED, SUBMITTED, and COMPLETED rows inside the window count.
-- CANCELLED and FAILED free a Bitcoin row only because btcpay_fail_payout releases in that same change.
-- REJECTED and RELEASED free an EVM row only because _crypto_release posts the refund in that same change.
-- Inserts and any update that increases the counted amount take the same transaction lock.
-- The $250 per-user cap and the per-user balance lock are unchanged.
-- Not applied to production by this change.
--
-- Rollback, after confirming no new request is mid-flight:
--   drop trigger if exists crypto_withdrawals_global_daily on public.crypto_withdrawals;
--   drop trigger if exists crypto_withdrawals_global_daily_upd on public.crypto_withdrawals;
--   drop trigger if exists btcpay_payouts_global_daily on public.btcpay_payouts;
--   drop trigger if exists btcpay_payouts_global_daily_upd on public.btcpay_payouts;
--   drop function if exists public.crypto_guard_global_daily();
--   drop function if exists public.crypto_cap_row_cents(text, text, timestamptz, bigint);
--   drop function if exists public.crypto_claim_global_daily(bigint);
--   drop index if exists public.crypto_withdrawals_daily_cap_idx;
--   drop index if exists public.btcpay_payouts_daily_cap_idx;
-- Rows reserved while the lock was installed stay reserved. Dropping these objects
-- does not release a balance and does not restore the old 3-argument payout function.

create or replace function public.crypto_claim_global_daily(p_usd_cents bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cap bigint;
  used_global bigint;
begin
  if p_usd_cents is null or p_usd_cents <= 0 then
    raise exception 'BELOW_MINIMUM';
  end if;
  -- One lock for every user and both rails. Held until this transaction ends.
  perform pg_advisory_xact_lock(hashtext('crypto_global_daily_cap'));
  select daily_global_limit_cents into cap from crypto_settings;
  select coalesce(sum(usd_cents), 0) into used_global from (
    select usd_cents from crypto_withdrawals
      where created_at > now() - interval '24 hours'
        and status not in ('REJECTED', 'RELEASED')
    union all
    select usd_cents from btcpay_payouts
      where created_at > now() - interval '24 hours'
        and status not in ('CANCELLED', 'FAILED')
  ) open_cashouts;
  if used_global + p_usd_cents > cap then
    raise exception 'GLOBAL_DAILY_LIMIT';
  end if;
end $$;

revoke all on function public.crypto_claim_global_daily(bigint) from public, anon, authenticated;
grant execute on function public.crypto_claim_global_daily(bigint) to service_role;

-- Cents this row contributes to the cap. Zero when it is outside the window or released.
create or replace function public.crypto_cap_row_cents(
  p_table text,
  p_status text,
  p_created timestamptz,
  p_cents bigint
) returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_cents is null or p_cents <= 0 then 0
    when p_created is null or p_created <= now() - interval '24 hours' then 0
    when p_table = 'crypto_withdrawals' and p_status in ('REJECTED', 'RELEASED') then 0
    when p_table = 'btcpay_payouts' and p_status in ('CANCELLED', 'FAILED') then 0
    when p_table in ('crypto_withdrawals', 'btcpay_payouts') then p_cents
    else 0
  end;
$$;

revoke all on function public.crypto_cap_row_cents(text, text, timestamptz, bigint) from public, anon, authenticated;

create or replace function public.crypto_guard_global_daily()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_cents bigint := 0;
  new_cents bigint := 0;
  created_at timestamptz;
begin
  created_at := coalesce(new.created_at, now());
  new_cents := public.crypto_cap_row_cents(tg_table_name, new.status, created_at, new.usd_cents);
  if tg_op = 'UPDATE' then
    old_cents := public.crypto_cap_row_cents(tg_table_name, old.status, old.created_at, old.usd_cents);
  end if;
  -- On insert the new row is not in the sum yet, so the whole amount is new.
  -- On update the sum still sees the old row, so only the increase is claimed.
  if new_cents > old_cents then
    perform public.crypto_claim_global_daily(new_cents - old_cents);
  end if;
  return new;
end $$;

revoke all on function public.crypto_guard_global_daily() from public, anon, authenticated;

drop trigger if exists crypto_withdrawals_global_daily on public.crypto_withdrawals;
create trigger crypto_withdrawals_global_daily
  before insert on public.crypto_withdrawals
  for each row execute function public.crypto_guard_global_daily();

drop trigger if exists crypto_withdrawals_global_daily_upd on public.crypto_withdrawals;
create trigger crypto_withdrawals_global_daily_upd
  before update of status, usd_cents, created_at on public.crypto_withdrawals
  for each row execute function public.crypto_guard_global_daily();

drop trigger if exists btcpay_payouts_global_daily on public.btcpay_payouts;
create trigger btcpay_payouts_global_daily
  before insert on public.btcpay_payouts
  for each row execute function public.crypto_guard_global_daily();

drop trigger if exists btcpay_payouts_global_daily_upd on public.btcpay_payouts;
create trigger btcpay_payouts_global_daily_upd
  before update of status, usd_cents, created_at on public.btcpay_payouts
  for each row execute function public.crypto_guard_global_daily();

create index if not exists crypto_withdrawals_daily_cap_idx
  on public.crypto_withdrawals (created_at)
  where status not in ('REJECTED', 'RELEASED');

create index if not exists btcpay_payouts_daily_cap_idx
  on public.btcpay_payouts (created_at)
  where status not in ('CANCELLED', 'FAILED');
