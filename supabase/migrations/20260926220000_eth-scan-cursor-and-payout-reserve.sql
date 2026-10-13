-- Native ETH has its own cursor. The USDC catch-up cursor may jump ahead;
-- ETH blocks are scanned separately so a jump cannot skip a native deposit.
-- Block 51837807 is the first confirmed Base ETH deposit. The ETH cursor must
-- start at or before the block before it, even if the USDC cursor is already past it.

alter table public.crypto_chain_cursor
  add column if not exists last_eth_scanned_block bigint;

update public.crypto_chain_cursor
  set last_eth_scanned_block = least(last_processed_block, 51837806)
  where chain_id = 8453 and last_eth_scanned_block is null;

update public.crypto_chain_cursor
  set last_eth_scanned_block = last_processed_block
  where last_eth_scanned_block is null;

alter table public.crypto_chain_cursor
  drop constraint if exists crypto_chain_cursor_eth_nonneg;
alter table public.crypto_chain_cursor
  add constraint crypto_chain_cursor_eth_nonneg
  check (last_eth_scanned_block is null or last_eth_scanned_block >= 0);

create or replace function public.crypto_get_eth_cursor(p_chain bigint) returns bigint
language sql stable security definer set search_path = public as $$
  select last_eth_scanned_block from crypto_chain_cursor where chain_id = p_chain $$;

create or replace function public.crypto_set_eth_cursor(p_chain bigint, p_block bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public._require_server_caller();
  if p_block < 0 then raise exception 'BAD_BLOCK'; end if;
  insert into crypto_chain_cursor (chain_id, last_processed_block, last_eth_scanned_block)
    values (p_chain, p_block, p_block)
  on conflict (chain_id) do update
    set last_eth_scanned_block = greatest(coalesce(crypto_chain_cursor.last_eth_scanned_block, 0), excluded.last_eth_scanned_block),
        updated_at = now();
end $$;

-- Auto-approved Base ETH withdrawals stay LIQUIDITY_PENDING unless a fresh
-- inventory row shows the payout wallet can cover every locked ETH send
-- plus a 0.00005 ETH gas reserve. The worker still retries that state and
-- rechecks the live balance before it broadcasts.
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
  select coalesce(sum(usd_cents),0) into used from crypto_withdrawals where user_id = p_user and created_at > now() - interval '24 hours' and status not in ('REJECTED','RELEASED');
  if used + p_usd_cents > s.daily_limit_cents then raise exception 'DAILY_LIMIT'; end if;
  select coalesce(sum(usd_cents),0) into used_global from crypto_withdrawals where created_at > now() - interval '24 hours' and status not in ('REJECTED','RELEASED');
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
  perform _audit(p_user, 'crypto_withdrawal_requested', null, jsonb_build_object('withdrawal', wid, 'cents', p_usd_cents, 'asset', p_asset, 'chain', p_chain, 'review', review, 'status', wd_status));
  return jsonb_build_object('id', wid, 'status', wd_status);
end $$;

revoke execute on function
  public.crypto_get_eth_cursor(bigint),
  public.crypto_set_eth_cursor(bigint, bigint),
  public.crypto_request_withdrawal(uuid, bigint, text, bigint, uuid, boolean)
  from public, anon, authenticated;
grant execute on function
  public.crypto_get_eth_cursor(bigint),
  public.crypto_set_eth_cursor(bigint, bigint),
  public.crypto_request_withdrawal(uuid, bigint, text, bigint, uuid, boolean)
  to service_role;
