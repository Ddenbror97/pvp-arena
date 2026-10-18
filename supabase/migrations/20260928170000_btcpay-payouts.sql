-- Native Bitcoin cashouts via a second BTCPay store. The Worker never stores a seed.
-- Auto-send is decided in the Worker from BTC_WITHDRAWAL_AUTO_CENTS (default 0 = wait in BTCPay).

create table public.btcpay_payouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete restrict,
  btcpay_payout_id text unique,
  usd_cents bigint not null,
  fee_usd_cents bigint not null default 0,
  address text not null,
  status text not null default 'HOLD',
  hold_ledger_tx_id uuid unique references public.ledger_transactions (id) on delete restrict,
  settle_ledger_tx_id uuid unique references public.ledger_transactions (id) on delete restrict,
  release_ledger_tx_id uuid unique references public.ledger_transactions (id) on delete restrict,
  closed_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  constraint btcpay_payouts_cents_check check (usd_cents > 0),
  constraint btcpay_payouts_fee_check check (fee_usd_cents >= 0),
  constraint btcpay_payouts_status_check check (status in (
    'HOLD', 'AWAITING_APPROVAL', 'QUEUED', 'COMPLETED', 'CANCELLED', 'FAILED'
  )),
  constraint btcpay_payouts_address_check check (
    char_length(address) between 14 and 120
    and address ~ '^[A-Za-z0-9]+$'
    and address ~* '^bc1'
  )
);

create index btcpay_payouts_user_idx on public.btcpay_payouts (user_id, created_at desc);
create index btcpay_payouts_open_idx on public.btcpay_payouts (created_at)
  where status in ('HOLD', 'AWAITING_APPROVAL', 'QUEUED');

alter table public.btcpay_payouts enable row level security;
revoke all on public.btcpay_payouts from public, anon, authenticated;
grant select, insert, update on public.btcpay_payouts to service_role;

create or replace function public.btcpay_request_payout(p_user uuid, p_usd_cents bigint, p_address text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare s crypto_settings;
  avail uuid; locked uuid; bal bigint; tx uuid; pid uuid := gen_random_uuid();
  total bigint; used bigint; used_global bigint; unplayed bigint;
begin
  perform public._require_server_caller();
  if public._money_state() <> 'FINALIZED' then raise exception 'LEDGER_NOT_READY'; end if;
  select * into s from crypto_settings;
  if not s.crypto_system_enabled or not s.withdrawals_enabled then raise exception 'WITHDRAWALS_PAUSED'; end if;
  if p_usd_cents <= 0 then raise exception 'BELOW_MINIMUM'; end if;
  if p_address !~* '^bc1' then raise exception 'ADDRESS'; end if;
  if exists (select 1 from profiles where id = p_user and self_excluded_until > now()) then raise exception 'SELF_EXCLUDED'; end if;
  perform pg_advisory_xact_lock(hashtext('crypto_withdraw:' || p_user));
  if exists (
    select 1 from crypto_withdrawals
    where user_id = p_user and status in ('PENDING','HELD','APPROVED','SUBMITTING','SUBMITTED','LIQUIDITY_PENDING')
  ) then raise exception 'WITHDRAWAL_PENDING'; end if;
  if exists (
    select 1 from btcpay_payouts
    where user_id = p_user and status in ('HOLD','AWAITING_APPROVAL','QUEUED')
  ) then raise exception 'WITHDRAWAL_PENDING'; end if;
  select coalesce(sum(usd_cents),0) into used from (
    select usd_cents from crypto_withdrawals
      where user_id = p_user and created_at > now() - interval '24 hours' and status not in ('REJECTED','RELEASED')
    union all
    select usd_cents from btcpay_payouts
      where user_id = p_user and created_at > now() - interval '24 hours' and status not in ('CANCELLED','FAILED')
  ) x;
  if used + p_usd_cents > s.daily_limit_cents then raise exception 'DAILY_LIMIT'; end if;
  select coalesce(sum(usd_cents),0) into used_global from (
    select usd_cents from crypto_withdrawals
      where created_at > now() - interval '24 hours' and status not in ('REJECTED','RELEASED')
    union all
    select usd_cents from btcpay_payouts
      where created_at > now() - interval '24 hours' and status not in ('CANCELLED','FAILED')
  ) y;
  if used_global + p_usd_cents > s.daily_global_limit_cents then raise exception 'GLOBAL_DAILY_LIMIT'; end if;
  total := p_usd_cents + s.withdrawal_fee_cents;
  avail := _user_account(p_user, 'user_available', 'USD', 'real');
  select balance into bal from wallet_accounts where id = avail for update;
  if bal is null or bal < total then raise exception 'INSUFFICIENT_BALANCE'; end if;
  unplayed := public.referral_unplayed_reward_cents(p_user);
  if bal - unplayed < total then raise exception 'REFERRAL_PLAYTHROUGH'; end if;
  locked := _user_account(p_user, 'user_locked', 'USD', 'real');
  if locked is null then
    insert into wallet_accounts (owner_id, kind, asset, account_type)
      values (p_user, 'user_locked', 'USD', 'real') returning id into locked;
  end if;
  insert into ledger_transactions (kind, idempotency_key, account_type, user_id, memo)
    values ('withdrawal', 'btcpay-payout:' || pid || ':hold', 'real', p_user, 'Bitcoin cashout hold')
    returning id into tx;
  perform _post(tx, avail, -total);
  perform _post(tx, locked, total);
  insert into btcpay_payouts (id, user_id, usd_cents, fee_usd_cents, address, status, hold_ledger_tx_id)
    values (pid, p_user, p_usd_cents, s.withdrawal_fee_cents, p_address, 'HOLD', tx);
  perform _audit(p_user, 'btcpay_payout_requested', null, jsonb_build_object('payout', pid, 'cents', p_usd_cents));
  return jsonb_build_object('id', pid, 'status', 'HOLD');
end $$;

create or replace function public.btcpay_attach_payout(p_id uuid, p_btcpay_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._require_server_caller();
  update btcpay_payouts
    set btcpay_payout_id = p_btcpay_id, status = 'AWAITING_APPROVAL', updated_at = now()
    where id = p_id and status = 'HOLD';
  if not found then raise exception 'NOT_HOLD'; end if;
end $$;

create or replace function public.btcpay_mark_queued(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._require_server_caller();
  update btcpay_payouts set status = 'QUEUED', updated_at = now()
    where id = p_id and status in ('AWAITING_APPROVAL', 'QUEUED');
end $$;

create or replace function public.btcpay_settle_payout(p_id uuid, p_state text)
returns void language plpgsql security definer set search_path = public as $$
declare p btcpay_payouts; tx uuid; total bigint;
begin
  perform public._require_server_caller();
  if p_state is distinct from 'Completed' then return; end if;
  select * into p from btcpay_payouts where id = p_id for update;
  if p is null then raise exception 'PAYOUT_NOT_FOUND'; end if;
  if p.status = 'COMPLETED' then return; end if;
  if p.status not in ('AWAITING_APPROVAL', 'QUEUED') then return; end if;
  total := p.usd_cents + p.fee_usd_cents;
  insert into ledger_transactions (kind, idempotency_key, account_type, user_id, memo)
    values ('withdrawal', 'btcpay-payout:' || p.id || ':settle', 'real', p.user_id, 'Bitcoin cashout sent')
    on conflict (idempotency_key) do nothing
    returning id into tx;
  if tx is null then
    select id into tx from ledger_transactions where idempotency_key = 'btcpay-payout:' || p.id || ':settle';
    update btcpay_payouts
      set status = 'COMPLETED', settle_ledger_tx_id = coalesce(settle_ledger_tx_id, tx), closed_at = coalesce(closed_at, now()), updated_at = now()
      where id = p.id;
    return;
  end if;
  perform _post(tx, _user_account(p.user_id, 'user_locked', 'USD', 'real'), -total);
  perform _post(tx, _system_account('external_custody', 'USD', 'real'), p.usd_cents);
  if p.fee_usd_cents > 0 then
    perform _post(tx, _system_account('house_revenue', 'USD', 'real'), p.fee_usd_cents);
  end if;
  update btcpay_payouts
    set status = 'COMPLETED', settle_ledger_tx_id = tx, closed_at = now(), updated_at = now()
    where id = p.id;
  perform _audit(p.user_id, 'btcpay_payout_completed', null, jsonb_build_object('payout', p.id, 'cents', p.usd_cents));
end $$;

create or replace function public.btcpay_fail_payout(p_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare p btcpay_payouts; tx uuid; total bigint; next_status text;
begin
  perform public._require_server_caller();
  select * into p from btcpay_payouts where id = p_id for update;
  if p is null then raise exception 'PAYOUT_NOT_FOUND'; end if;
  if p.status in ('COMPLETED', 'CANCELLED', 'FAILED') then return; end if;
  if p.status = 'QUEUED' and p_reason is distinct from 'CANCELLED' and p_reason is distinct from 'NOT_ONCHAIN' then
    return;
  end if;
  total := p.usd_cents + p.fee_usd_cents;
  next_status := case when p_reason = 'cancelled by user' then 'CANCELLED' else 'FAILED' end;
  insert into ledger_transactions (kind, idempotency_key, account_type, user_id, memo)
    values ('refund', 'btcpay-payout:' || p.id || ':release', 'real', p.user_id, 'Bitcoin cashout released')
    on conflict (idempotency_key) do nothing
    returning id into tx;
  if tx is null then
    select id into tx from ledger_transactions where idempotency_key = 'btcpay-payout:' || p.id || ':release';
  else
    perform _post(tx, _user_account(p.user_id, 'user_locked', 'USD', 'real'), -total);
    perform _post(tx, _user_account(p.user_id, 'user_available', 'USD', 'real'), total);
  end if;
  update btcpay_payouts
    set status = next_status, release_ledger_tx_id = coalesce(release_ledger_tx_id, tx),
        closed_reason = left(p_reason, 200), closed_at = now(), updated_at = now()
    where id = p.id;
  perform _audit(p.user_id, 'btcpay_payout_released', null, jsonb_build_object('payout', p.id, 'status', next_status, 'reason', p_reason));
end $$;

revoke all on function public.btcpay_request_payout(uuid, bigint, text) from public, anon, authenticated;
revoke all on function public.btcpay_attach_payout(uuid, text) from public, anon, authenticated;
revoke all on function public.btcpay_mark_queued(uuid) from public, anon, authenticated;
revoke all on function public.btcpay_settle_payout(uuid, text) from public, anon, authenticated;
revoke all on function public.btcpay_fail_payout(uuid, text) from public, anon, authenticated;
grant execute on function public.btcpay_request_payout(uuid, bigint, text) to service_role;
grant execute on function public.btcpay_attach_payout(uuid, text) to service_role;
grant execute on function public.btcpay_mark_queued(uuid) to service_role;
grant execute on function public.btcpay_settle_payout(uuid, text) to service_role;
grant execute on function public.btcpay_fail_payout(uuid, text) to service_role;
