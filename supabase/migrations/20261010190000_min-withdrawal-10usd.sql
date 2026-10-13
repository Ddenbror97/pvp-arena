-- Cashouts are at least $10 in the token being withdrawn. Deposits stay as they are.

update public.crypto_settings
set min_withdrawal_cents = 1000
where min_withdrawal_cents < 1000;

drop trigger chain_networks_readonly on public.chain_networks;
update public.chain_networks
set min_withdrawal_cents = 1000
where min_withdrawal_cents < 1000;
create trigger chain_networks_readonly
  before update or delete on public.chain_networks
  for each row execute function public.crypto_allowlist_guard();

create or replace function public.btcpay_request_payout(
  p_user uuid,
  p_usd_cents bigint,
  p_address text,
  p_quote_sats bigint,
  p_rate_micro bigint,
  p_quote_expires_at timestamptz
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s crypto_settings;
  avail uuid; locked uuid; bal bigint; tx uuid; pid uuid := gen_random_uuid();
  total bigint; used bigint; used_global bigint; expected bigint;
begin
  perform public._require_server_caller();
  if public._money_state() <> 'FINALIZED' then raise exception 'LEDGER_NOT_READY'; end if;
  select * into s from crypto_settings;
  if not s.crypto_system_enabled or not s.withdrawals_enabled then raise exception 'WITHDRAWALS_PAUSED'; end if;
  if p_usd_cents < s.min_withdrawal_cents then raise exception 'BELOW_MINIMUM'; end if;
  if p_address !~* '^bc1' then raise exception 'ADDRESS'; end if;
  if p_rate_micro is null or p_rate_micro < 1000000000 or p_rate_micro > 10000000000000 then
    raise exception 'BAD_QUOTE';
  end if;
  expected := floor(p_usd_cents::numeric * 1000000000000 / p_rate_micro)::bigint;
  if p_quote_sats is distinct from expected or p_quote_sats < 546 or p_quote_sats > 1000000000 then
    raise exception 'BAD_QUOTE';
  end if;
  if p_quote_expires_at is null
     or p_quote_expires_at <= now()
     or p_quote_expires_at > now() + interval '10 minutes' then
    raise exception 'BAD_QUOTE';
  end if;
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
  perform public._assert_reward_holds(p_user, bal, total);
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
  insert into btcpay_payouts (
    id, user_id, usd_cents, fee_usd_cents, address, status, hold_ledger_tx_id,
    quote_sats, rate_micro, quoted_at, quote_expires_at
  ) values (
    pid, p_user, p_usd_cents, s.withdrawal_fee_cents, p_address, 'HOLD', tx,
    p_quote_sats, p_rate_micro, now(), p_quote_expires_at
  );
  perform public._treasury_reserve('bitcoin', 'BTC', p_user, null, pid, p_usd_cents, null, null);
  perform _audit(p_user, 'btcpay_payout_requested', null, jsonb_build_object(
    'payout', pid, 'cents', p_usd_cents, 'quote_sats', p_quote_sats, 'rate_micro', p_rate_micro
  ));
  return jsonb_build_object('id', pid, 'status', 'HOLD', 'quote_sats', p_quote_sats);
end $$;

revoke all on function public.btcpay_request_payout(uuid, bigint, text, bigint, bigint, timestamptz) from public, anon, authenticated;
grant execute on function public.btcpay_request_payout(uuid, bigint, text, bigint, bigint, timestamptz) to service_role;
