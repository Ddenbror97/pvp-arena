-- EVM cashouts follow the same one-open and 24h cap as Bitcoin cashouts.
-- No ledger row is rewritten. Requests that are already open stay open.
-- A queued Bitcoin payout is released only when BTCPay reports Cancelled.
-- Jackpot profile stats are returned only to that same signed-in user.

create or replace function public.crypto_request_withdrawal(p_user uuid, p_chain bigint, p_asset text, p_usd_cents bigint, p_quote uuid, p_env_ok boolean)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare s crypto_settings; net chain_networks; a chain_assets; w user_wallets; q crypto_withdrawal_quotes;
  units numeric; total bigint; avail uuid; locked uuid; bal bigint; tx uuid; wid uuid := gen_random_uuid();
  review boolean; used bigint; used_global bigint; payout_wei numeric; locked_wei numeric; wd_status text;
begin
  perform public._require_server_caller();
  if public._money_state() <> 'FINALIZED' then raise exception 'LEDGER_NOT_READY'; end if;
  select * into s from crypto_settings;
  if not s.crypto_system_enabled or not s.withdrawals_enabled then raise exception 'WITHDRAWALS_PAUSED'; end if;
  select * into net from chain_networks where chain_id = p_chain and is_enabled;
  if net is null then raise exception 'CHAIN_DISABLED'; end if;
  select * into a from chain_assets where chain_id = p_chain and asset_key = p_asset and is_enabled;
  if a is null then raise exception 'ASSET_NOT_ALLOWLISTED'; end if;
  if p_usd_cents < net.min_withdrawal_cents then raise exception 'BELOW_MINIMUM'; end if;
  if exists (select 1 from profiles where id = p_user and self_excluded_until > now()) then raise exception 'SELF_EXCLUDED'; end if;
  select * into w from user_wallets where user_id = p_user and is_verified order by is_primary desc, verified_at desc limit 1;
  if w is null then raise exception 'NO_VERIFIED_WALLET'; end if;
  if exists (
    select 1 from user_wallets o
    where o.user_id = p_user and o.is_verified and o.normalized_address <> w.normalized_address
  ) and w.became_primary_at > clock_timestamp() - interval '24 hours' then
    raise exception 'WALLET_CHANGE_COOLDOWN';
  end if;
  perform pg_advisory_xact_lock(hashtext('crypto_withdraw:' || p_user));
  if exists (select 1 from crypto_withdrawals where user_id = p_user and status in ('PENDING','HELD','APPROVED','SUBMITTING','SUBMITTED','LIQUIDITY_PENDING')) then raise exception 'WITHDRAWAL_PENDING'; end if;
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
  ) rails;
  if used + p_usd_cents > s.daily_limit_cents then raise exception 'DAILY_LIMIT'; end if;
  select coalesce(sum(usd_cents),0) into used_global from (
    select usd_cents from crypto_withdrawals
      where created_at > now() - interval '24 hours' and status not in ('REJECTED','RELEASED')
    union all
    select usd_cents from btcpay_payouts
      where created_at > now() - interval '24 hours' and status not in ('CANCELLED','FAILED')
  ) rails_global;
  if used_global + p_usd_cents > s.daily_global_limit_cents then raise exception 'GLOBAL_DAILY_LIMIT'; end if;
  if a.settlement_kind = 'native' then
    select * into q from crypto_withdrawal_quotes where id = p_quote for update;
    if q is null or q.user_id <> p_user or q.asset_key <> p_asset or q.chain_id <> p_chain then raise exception 'QUOTE_INVALID'; end if;
    if q.used_at is not null then raise exception 'QUOTE_USED'; end if;
    if q.expires_at < now() then raise exception 'QUOTE_EXPIRED'; end if;
    if q.usd_cents <> p_usd_cents then raise exception 'QUOTE_MISMATCH'; end if;
    update crypto_withdrawal_quotes set used_at = now() where id = q.id;
    units := q.units;
  else
    units := p_usd_cents::numeric * power(10::numeric, a.decimals) / 100;
  end if;
  total := p_usd_cents + s.withdrawal_fee_cents;
  avail := _user_account(p_user, 'user_available', a.ledger_asset, a.ledger_account_type);
  select balance into bal from wallet_accounts where id = avail for update;
  if bal is null or bal < total then raise exception 'INSUFFICIENT_BALANCE'; end if;
  perform public._assert_reward_holds(p_user, bal, total);
  locked := _user_account(p_user, 'user_locked', a.ledger_asset, a.ledger_account_type);
  if locked is null then
    insert into wallet_accounts (owner_id, kind, asset, account_type) values (p_user, 'user_locked', a.ledger_asset, a.ledger_account_type) returning id into locked;
  end if;
  insert into ledger_transactions (kind, idempotency_key, account_type, user_id, memo)
    values ('withdrawal', 'withdrawal:' || wid || ':hold', a.ledger_account_type, p_user, 'Withdrawal hold') returning id into tx;
  perform _post(tx, avail, -total);
  perform _post(tx, locked, total);
  review := not coalesce(p_env_ok, false) or p_usd_cents > s.auto_approve_cents;
  wd_status := case when review then 'PENDING' else 'APPROVED' end;
  if wd_status = 'APPROVED' and a.settlement_kind = 'native' and p_chain = 8453 then
    select i.payout_wei into payout_wei
      from crypto_chain_inventory i
      where i.chain_id = p_chain and i.observed_at > now() - interval '10 minutes';
    select coalesce(sum(w2.units), 0) into locked_wei
      from crypto_withdrawals w2
      where w2.chain_id = p_chain and w2.asset_key = 'ETH'
        and w2.status in ('APPROVED','LIQUIDITY_PENDING','SUBMITTING','SUBMITTED');
    if payout_wei is null or payout_wei < locked_wei + units + 50000000000000 then
      wd_status := 'LIQUIDITY_PENDING';
    end if;
  end if;
  insert into crypto_withdrawals (id, user_id, chain_id, asset_key, to_address, units, usd_cents, fee_usd_cents, status, review_required, hold_ledger_tx_id, quote_id)
    values (wid, p_user, p_chain, p_asset, w.normalized_address, units, p_usd_cents, s.withdrawal_fee_cents, wd_status, review, tx, q.id);
  perform public._treasury_reserve('eip155:' || p_chain, p_asset, p_user, wid, null, p_usd_cents, units,
    case when a.settlement_kind = 'native' then q.price_micro_usd else (a.usd_per_unit * 1000000)::bigint end);
  perform _audit(p_user, 'crypto_withdrawal_requested', null, jsonb_build_object('withdrawal', wid, 'cents', p_usd_cents, 'asset', p_asset, 'chain', p_chain, 'review', review, 'status', wd_status));
  return jsonb_build_object('id', wid, 'status', wd_status);
end $$;
revoke execute on function public.crypto_request_withdrawal(uuid, bigint, text, bigint, uuid, boolean) from public, anon, authenticated;
grant execute on function public.crypto_request_withdrawal(uuid, bigint, text, bigint, uuid, boolean) to service_role;

-- The seven-argument form must not keep a default, or a six-argument call is ambiguous.
drop function if exists public.crypto_request_withdrawal(uuid, bigint, text, bigint, uuid, boolean, text);
create or replace function public.crypto_request_withdrawal(
  p_user uuid, p_chain bigint, p_asset text, p_usd_cents bigint, p_quote uuid, p_env_ok boolean,
  p_to_address text
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare s crypto_settings; net chain_networks; a chain_assets; w user_wallets; q crypto_withdrawal_quotes;
  units numeric; total bigint; avail uuid; locked uuid; bal bigint; tx uuid; wid uuid := gen_random_uuid();
  review boolean; used bigint; used_global bigint; payout_wei numeric; locked_wei numeric; wd_status text;
  dest text;
begin
  perform public._require_server_caller();
  if public._money_state() <> 'FINALIZED' then raise exception 'LEDGER_NOT_READY'; end if;
  select * into s from crypto_settings;
  if not s.crypto_system_enabled or not s.withdrawals_enabled then raise exception 'WITHDRAWALS_PAUSED'; end if;
  select * into net from chain_networks where chain_id = p_chain and is_enabled;
  if net is null then raise exception 'CHAIN_DISABLED'; end if;
  select * into a from chain_assets where chain_id = p_chain and asset_key = p_asset and is_enabled;
  if a is null then raise exception 'ASSET_NOT_ALLOWLISTED'; end if;
  if p_usd_cents < net.min_withdrawal_cents then raise exception 'BELOW_MINIMUM'; end if;
  if exists (select 1 from profiles where id = p_user and self_excluded_until > now()) then raise exception 'SELF_EXCLUDED'; end if;
  if p_to_address is not null and length(trim(p_to_address)) > 0 then
    dest := lower(trim(p_to_address));
    if dest !~ '^0x[0-9a-f]{40}$' or dest = '0x0000000000000000000000000000000000000000' then
      raise exception 'BAD_ADDRESS';
    end if;
    if public._is_house_address(dest) then raise exception 'BAD_ADDRESS'; end if;
  else
    select * into w from user_wallets where user_id = p_user and is_verified order by is_primary desc, verified_at desc limit 1;
    if w is null then raise exception 'NO_VERIFIED_WALLET'; end if;
    dest := w.normalized_address;
    if exists (
      select 1 from user_wallets o
      where o.user_id = p_user and o.is_verified and o.normalized_address <> w.normalized_address
    ) and w.became_primary_at > clock_timestamp() - interval '24 hours' then
      raise exception 'WALLET_CHANGE_COOLDOWN';
    end if;
  end if;
  perform pg_advisory_xact_lock(hashtext('crypto_withdraw:' || p_user));
  if exists (select 1 from crypto_withdrawals where user_id = p_user and status in ('PENDING','HELD','APPROVED','SUBMITTING','SUBMITTED','LIQUIDITY_PENDING')) then raise exception 'WITHDRAWAL_PENDING'; end if;
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
  ) rails;
  if used + p_usd_cents > s.daily_limit_cents then raise exception 'DAILY_LIMIT'; end if;
  select coalesce(sum(usd_cents),0) into used_global from (
    select usd_cents from crypto_withdrawals
      where created_at > now() - interval '24 hours' and status not in ('REJECTED','RELEASED')
    union all
    select usd_cents from btcpay_payouts
      where created_at > now() - interval '24 hours' and status not in ('CANCELLED','FAILED')
  ) rails_global;
  if used_global + p_usd_cents > s.daily_global_limit_cents then raise exception 'GLOBAL_DAILY_LIMIT'; end if;
  if a.settlement_kind = 'native' then
    select * into q from crypto_withdrawal_quotes where id = p_quote for update;
    if q is null or q.user_id <> p_user or q.asset_key <> p_asset or q.chain_id <> p_chain then raise exception 'QUOTE_INVALID'; end if;
    if q.used_at is not null then raise exception 'QUOTE_USED'; end if;
    if q.expires_at < now() then raise exception 'QUOTE_EXPIRED'; end if;
    if q.usd_cents <> p_usd_cents then raise exception 'QUOTE_MISMATCH'; end if;
    update crypto_withdrawal_quotes set used_at = now() where id = q.id;
    units := q.units;
  else
    units := p_usd_cents::numeric * power(10::numeric, a.decimals) / 100;
  end if;
  total := p_usd_cents + s.withdrawal_fee_cents;
  avail := _user_account(p_user, 'user_available', a.ledger_asset, a.ledger_account_type);
  select balance into bal from wallet_accounts where id = avail for update;
  if bal is null or bal < total then raise exception 'INSUFFICIENT_BALANCE'; end if;
  perform public._assert_reward_holds(p_user, bal, total);
  locked := _user_account(p_user, 'user_locked', a.ledger_asset, a.ledger_account_type);
  if locked is null then
    insert into wallet_accounts (owner_id, kind, asset, account_type) values (p_user, 'user_locked', a.ledger_asset, a.ledger_account_type) returning id into locked;
  end if;
  insert into ledger_transactions (kind, idempotency_key, account_type, user_id, memo)
    values ('withdrawal', 'withdrawal:' || wid || ':hold', a.ledger_account_type, p_user, 'Withdrawal hold') returning id into tx;
  perform _post(tx, avail, -total);
  perform _post(tx, locked, total);
  review := not coalesce(p_env_ok, false) or p_usd_cents > s.auto_approve_cents;
  wd_status := case when review then 'PENDING' else 'APPROVED' end;
  if wd_status = 'APPROVED' and a.settlement_kind = 'native' and p_chain = 8453 then
    select i.payout_wei into payout_wei
      from crypto_chain_inventory i
      where i.chain_id = p_chain and i.observed_at > now() - interval '10 minutes';
    select coalesce(sum(w2.units), 0) into locked_wei
      from crypto_withdrawals w2
      where w2.chain_id = p_chain and w2.asset_key = 'ETH'
        and w2.status in ('APPROVED','LIQUIDITY_PENDING','SUBMITTING','SUBMITTED');
    if payout_wei is null or payout_wei < locked_wei + units + 50000000000000 then
      wd_status := 'LIQUIDITY_PENDING';
    end if;
  end if;
  insert into crypto_withdrawals (id, user_id, chain_id, asset_key, to_address, units, usd_cents, fee_usd_cents, status, review_required, hold_ledger_tx_id, quote_id)
    values (wid, p_user, p_chain, p_asset, dest, units, p_usd_cents, s.withdrawal_fee_cents, wd_status, review, tx, q.id);
  perform public._treasury_reserve('eip155:' || p_chain, p_asset, p_user, wid, null, p_usd_cents, units,
    case when a.settlement_kind = 'native' then q.price_micro_usd else (a.usd_per_unit * 1000000)::bigint end);
  perform _audit(p_user, 'crypto_withdrawal_requested', null, jsonb_build_object('withdrawal', wid, 'cents', p_usd_cents, 'asset', p_asset, 'chain', p_chain, 'review', review, 'status', wd_status, 'to', dest));
  return jsonb_build_object('id', wid, 'status', wd_status);
end $$;
revoke execute on function public.crypto_request_withdrawal(uuid, bigint, text, bigint, uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.crypto_request_withdrawal(uuid, bigint, text, bigint, uuid, boolean, text) to service_role;

-- A BTCPay payout hold may only be released when the release reason matches a state in which
-- no BTCPay payout can be paying out: a user cancel only after BTCPay has the payout (and the
-- server has confirmed BTCPay cancelled it), a create failure only before any payout id exists.
create or replace function public.btcpay_fail_payout(p_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare p btcpay_payouts; tx uuid; total bigint; next_status text;
begin
  perform public._require_server_caller();
  select * into p from btcpay_payouts where id = p_id for update;
  if p is null then raise exception 'PAYOUT_NOT_FOUND'; end if;
  if p.status in ('COMPLETED', 'CANCELLED', 'FAILED') then return; end if;
  -- Once BTCPay may be paying (QUEUED), only BTCPay's own Cancelled state releases the hold.
  -- NOT_ONCHAIN used to refund a payout BTCPay had already completed.
  if p.status = 'QUEUED' and p_reason is distinct from 'CANCELLED' then
    return;
  end if;
  if p_reason = 'cancelled by user' and (p.status <> 'AWAITING_APPROVAL' or p.btcpay_payout_id is null) then
    raise exception 'NOT_CANCELLABLE';
  end if;
  if p_reason = 'BTCPAY_CREATE' and (p.status <> 'HOLD' or p.btcpay_payout_id is not null) then
    raise exception 'PAYOUT_EXISTS';
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

revoke all on function public.btcpay_fail_payout(uuid, text) from public, anon, authenticated;
grant execute on function public.btcpay_fail_payout(uuid, text) to service_role;

create or replace function public.get_profile_stats(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is distinct from p_user then
    return null;
  end if;
  return jsonb_build_object(
    'games_played', (select count(*) from jackpot_players jp join jackpot_games g on g.id = jp.game_id where jp.user_id = p_user and g.status = 'COMPLETED'),
    'games_won', (select count(*) from jackpot_games where winner_id = p_user and status = 'COMPLETED'),
    'total_wagered', (select coalesce(sum(jp.total_amount),0) from jackpot_players jp join jackpot_games g on g.id = jp.game_id where jp.user_id = p_user and g.status = 'COMPLETED'),
    'total_won', (select coalesce(sum(payout_amount),0) from jackpot_games where winner_id = p_user and status = 'COMPLETED'));
end $$;
