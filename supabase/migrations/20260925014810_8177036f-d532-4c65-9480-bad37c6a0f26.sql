-- Launch controls on crypto_settings
alter table public.crypto_settings
  add column if not exists watch_only boolean not null default true,
  add column if not exists payout_float_max_cents bigint not null default 50000,
  add column if not exists daily_global_limit_cents bigint not null default 100000,
  add column if not exists test_credits_reset_at timestamp with time zone;

-- Launch defaults (adjustable in admin)
update public.crypto_settings set
  auto_approve_cents = 2500,
  daily_limit_cents = 25000,
  daily_global_limit_cents = 100000,
  min_deposit_cents = 200,
  min_withdrawal_cents = 500,
  payout_float_max_cents = 50000;

-- Ledger kind for the one-time test-credit reset
alter type public.tx_kind add value if not exists 'test_credit_reset';

-- Deposit crediting: watch-only mode + safe price-snapshot handling
create or replace function public.crypto_credit_deposit(p_id uuid, p_price_snapshot uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare s crypto_settings; net chain_networks; d crypto_deposits; a chain_assets; ps crypto_price_snapshots; cents bigint; tx uuid; key text; psid uuid;
begin
  select * into s from crypto_settings;
  if not s.crypto_system_enabled or not s.deposits_enabled then return jsonb_build_object('status','PAUSED'); end if;
  select * into d from crypto_deposits where id = p_id for update;
  if d is null then raise exception 'DEPOSIT_NOT_FOUND'; end if;
  if d.status not in ('DETECTED','CONFIRMED') then return jsonb_build_object('status', d.status); end if;
  select * into net from chain_networks where chain_id = d.chain_id;
  if net is null or not net.is_enabled then return jsonb_build_object('status','CHAIN_DISABLED'); end if;
  select * into a from chain_assets where chain_id = d.chain_id and asset_key = d.asset_key;
  psid := null;
  if a.settlement_kind = 'erc20' then
    cents := floor(d.units * 100 / power(10::numeric, a.decimals));
  else
    select * into ps from crypto_price_snapshots where id = p_price_snapshot and asset_key = d.asset_key and chain_id = d.chain_id;
    if ps is null or ps.observed_at < now() - make_interval(secs => s.price_max_age_seconds) then
      return jsonb_build_object('status','AWAITING_VALUATION');
    end if;
    psid := ps.id;
    cents := floor(d.units * ps.price_micro_usd / power(10::numeric, a.decimals) / 10000);
  end if;
  if d.user_id is null then
    update crypto_deposits set status = 'UNMATCHED', usd_cents = cents, price_snapshot_id = psid, confirmed_at = now(), closed_reason = 'sender is not exactly one verified wallet' where id = d.id;
    return jsonb_build_object('status','UNMATCHED');
  end if;
  if cents < net.min_deposit_cents then
    update crypto_deposits set status = 'REJECTED', usd_cents = cents, price_snapshot_id = psid, confirmed_at = now(), closed_reason = 'below minimum deposit' where id = d.id;
    return jsonb_build_object('status','REJECTED');
  end if;
  -- Watch-only launch mode: confirm the deposit on-chain but never credit.
  if s.watch_only then
    update crypto_deposits set status = 'CONFIRMED', usd_cents = cents, price_snapshot_id = psid, confirmed_at = coalesce(confirmed_at, now()) where id = d.id;
    perform _audit(d.user_id, 'crypto_deposit_watch_only', null, jsonb_build_object('deposit', d.id, 'cents', cents, 'asset', d.asset_key, 'chain', d.chain_id));
    return jsonb_build_object('status','WATCH_ONLY','cents',cents);
  end if;
  key := 'deposit:' || d.chain_id || ':' || d.tx_hash || ':' || d.log_index;
  insert into ledger_transactions (kind, idempotency_key, account_type, user_id, memo)
    values ('deposit', key, a.ledger_account_type, d.user_id, net.name || ' ' || a.asset_key || ' deposit ' || d.tx_hash) returning id into tx;
  perform _post(tx, _system_account('external_custody', a.ledger_asset, a.ledger_account_type), -cents);
  perform _post(tx, _user_account(d.user_id, 'user_available', a.ledger_asset, a.ledger_account_type), cents);
  update crypto_deposits set status = 'CREDITED', usd_cents = cents, price_snapshot_id = psid, ledger_tx_id = tx,
    confirmed_at = coalesce(confirmed_at, now()), credited_at = now() where id = d.id;
  perform _audit(d.user_id, 'crypto_deposit_credited', null, jsonb_build_object('deposit', d.id, 'cents', cents, 'asset', d.asset_key, 'chain', d.chain_id));
  return jsonb_build_object('status','CREDITED','cents',cents);
end $$;

-- Global daily withdrawal limit (all users combined)
create or replace function public.crypto_request_withdrawal(p_user uuid, p_chain bigint, p_asset text, p_usd_cents bigint, p_quote uuid, p_env_ok boolean)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare s crypto_settings; net chain_networks; a chain_assets; w user_wallets; q crypto_withdrawal_quotes; units numeric; total bigint; avail uuid; locked uuid; bal bigint; tx uuid; wid uuid := gen_random_uuid(); review boolean; used bigint; used_global bigint;
begin
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
  insert into crypto_withdrawals (id, user_id, chain_id, asset_key, to_address, units, usd_cents, fee_usd_cents, status, review_required, hold_ledger_tx_id, quote_id)
    values (wid, p_user, p_chain, p_asset, w.normalized_address, units, p_usd_cents, s.withdrawal_fee_cents, case when review then 'PENDING' else 'APPROVED' end, review, tx, q.id);
  perform _audit(p_user, 'crypto_withdrawal_requested', null, jsonb_build_object('withdrawal', wid, 'cents', p_usd_cents, 'asset', p_asset, 'chain', p_chain, 'review', review));
  return jsonb_build_object('id', wid, 'status', case when review then 'PENDING' else 'APPROVED' end);
end $$;

-- One-time, idempotent test-credit reset: moves every user's available test
-- balance back to the faucet system account (balanced), audited, admin-only,
-- and guarded so it can never run twice.
create or replace function public.reset_test_credits(p_admin uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare s crypto_settings; acc record; tx uuid; faucet uuid; moved bigint := 0; users integer := 0;
begin
  if not public.has_role(p_admin, 'admin') then raise exception 'FORBIDDEN'; end if;
  select * into s from crypto_settings for update;
  if s.test_credits_reset_at is not null then
    return jsonb_build_object('status','ALREADY_DONE','reset_at', s.test_credits_reset_at);
  end if;
  for acc in select * from wallet_accounts where kind = 'user_available' and balance > 0 for update loop
    faucet := _system_account('test_faucet', acc.asset, acc.account_type);
    tx := gen_random_uuid();
    insert into ledger_transactions (id, kind, idempotency_key, account_type, user_id, memo)
      values (tx, 'test_credit_reset', 'test_credit_reset:' || acc.id, acc.account_type, acc.owner_id, 'One-time test credit reset before real-money launch');
    perform _post(tx, acc.id, -acc.balance);
    perform _post(tx, faucet, acc.balance);
    perform _audit(acc.owner_id, 'test_credits_reset', null, jsonb_build_object('account', acc.id, 'cents', acc.balance));
    moved := moved + acc.balance;
    users := users + 1;
  end loop;
  update crypto_settings set test_credits_reset_at = now(), updated_at = now();
  perform _audit(p_admin, 'test_credits_reset_run', null, jsonb_build_object('users', users, 'cents', moved));
  return jsonb_build_object('status','DONE','users',users,'cents',moved);
end $$;

-- Disable the free test-credit faucet for the real-money launch
create or replace function public.claim_test_credits(p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  raise exception 'FAUCET_DISABLED';
end $$;