-- Multi-chain registry: allow mainnet networks and per-chain policy
alter table public.chain_networks drop constraint if exists chain_networks_mode_check;
alter table public.chain_networks add constraint chain_networks_mode_check check (network_mode in ('testnet','mainnet'));

-- Defaults match the existing Base Sepolia policy so the current row needs no UPDATE (registry is update-guarded)
alter table public.chain_networks
  add column if not exists credit_confirmations integer not null default 3,
  add column if not exists min_deposit_cents bigint not null default 100,
  add column if not exists min_withdrawal_cents bigint not null default 500;
alter table public.chain_networks drop constraint if exists chain_networks_credit_conf_check;
alter table public.chain_networks add constraint chain_networks_credit_conf_check check (credit_confirmations between 1 and 1000);

-- Personal deposit addresses (xpub-derived; the database only ever stores addresses, never keys)
create table public.crypto_deposit_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  chain_id bigint not null references public.chain_networks(chain_id),
  derivation_index integer not null check (derivation_index >= 0),
  address text not null,
  created_at timestamptz not null default now(),
  unique (chain_id, address),
  unique (chain_id, user_id),
  unique (chain_id, derivation_index),
  constraint deposit_address_format check (address ~* '^0x[0-9a-f]{40}$')
);
grant select on public.crypto_deposit_addresses to authenticated;
grant all on public.crypto_deposit_addresses to service_role;
alter table public.crypto_deposit_addresses enable row level security;
create policy "Users read own deposit address" on public.crypto_deposit_addresses
  for select to authenticated using (auth.uid() = user_id);
create trigger no_truncate before truncate on public.crypto_deposit_addresses for each statement execute function public._no_truncate();

-- Relax single-chain settings checks; per-chain policy now lives in chain_networks
do $$ declare c text; begin
  for c in select conname from pg_constraint where conrelid = 'public.crypto_settings'::regclass and contype = 'c'
    and pg_get_constraintdef(oid) like any (array['%environment%','%mainnet_enabled%','%chain_id%'])
  loop
    execute format('alter table public.crypto_settings drop constraint %I', c);
  end loop;
end $$;

-- Mainnet chains, registered but DISABLED (observe-only rollout)
insert into public.chain_networks (chain_id, name, network_mode, safe_confirmations, finalized_confirmations, is_enabled, credit_confirmations, min_deposit_cents, min_withdrawal_cents) values
  (8453, 'Base', 'mainnet', 15, 64, false, 15, 200, 500),
  (1, 'Ethereum', 'mainnet', 12, 64, false, 12, 2500, 2500)
on conflict (chain_id) do nothing;

insert into public.chain_assets (chain_id, asset_key, display_name, settlement_kind, contract_address, decimals, price_feed_address, usd_per_unit, min_deposit_units, ledger_asset, ledger_account_type, is_enabled) values
  (8453, 'USDC', 'USD Coin', 'erc20', '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', 6, null, 1, 2000000, 'USD', 'real', false),
  (8453, 'ETH', 'Ether', 'native', null, 18, '0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70', null, 1000000000000000, 'USD', 'real', false),
  (1, 'USDC', 'USD Coin', 'erc20', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 6, null, 1, 25000000, 'USD', 'real', false),
  (1, 'ETH', 'Ether', 'native', null, 18, '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419', null, 10000000000000000, 'USD', 'real', false)
on conflict (chain_id, asset_key) do nothing;

-- Chain-aware price recording
create or replace function public.crypto_record_price(p_chain bigint, p_asset text, p_feed text, p_round numeric, p_price_micro bigint, p_observed timestamptz)
returns uuid language plpgsql security definer set search_path = public as $$
declare a chain_assets; s crypto_settings; v uuid;
begin
  select * into s from crypto_settings;
  select * into a from chain_assets where chain_id = p_chain and asset_key = p_asset;
  if a is null or a.price_feed_address is null or lower(a.price_feed_address) <> lower(p_feed) then raise exception 'FEED_NOT_ALLOWLISTED'; end if;
  if p_observed > now() + interval '60 seconds' then raise exception 'PRICE_FROM_FUTURE'; end if;
  insert into crypto_price_snapshots (chain_id, asset_key, feed_address, feed_round_id, price_micro_usd, max_age_seconds, observed_at)
    values (p_chain, p_asset, a.price_feed_address, p_round, p_price_micro, s.price_max_age_seconds, p_observed) returning id into v;
  return v;
end $$;

-- Deposit observation: match by PERSONAL DEPOSIT ADDRESS (destination) first;
-- fall back to treasury + verified-sender matching for the legacy shared-treasury testnet flow.
create or replace function public.crypto_observe_deposit(p_chain bigint, p_asset text, p_tx text, p_log integer, p_block bigint, p_from text, p_to text, p_units numeric)
returns jsonb language plpgsql security definer set search_path = public as $$
declare d crypto_deposits; tr text; uid uuid; n int;
begin
  if not exists (select 1 from chain_assets where chain_id = p_chain and asset_key = p_asset and is_enabled) then raise exception 'ASSET_NOT_ALLOWLISTED'; end if;
  select user_id into uid from crypto_deposit_addresses where chain_id = p_chain and lower(address) = lower(p_to);
  if uid is null then
    select address into tr from chain_treasury_accounts where chain_id = p_chain and role = 'deposit' and is_active;
    if tr is null or lower(tr) <> lower(p_to) then raise exception 'NOT_TREASURY'; end if;
    select count(*), min(user_id::text)::uuid into n, uid from user_wallets where normalized_address = lower(p_from) and is_verified;
    if n <> 1 then uid := null; end if;
  end if;
  insert into crypto_deposits (chain_id, asset_key, tx_hash, log_index, block_number, from_address, to_address, units, usd_cents, user_id, status)
    values (p_chain, p_asset, lower(p_tx), p_log, p_block, lower(p_from), lower(p_to), p_units, 0, uid, 'DETECTED')
  on conflict (chain_id, tx_hash, log_index) do update set block_number = excluded.block_number
    where crypto_deposits.status in ('DETECTED','CONFIRMED')
  returning * into d;
  if d is null then select * into d from crypto_deposits where chain_id = p_chain and tx_hash = lower(p_tx) and log_index = p_log; end if;
  return jsonb_build_object('id', d.id, 'status', d.status);
end $$;

-- Crediting uses the chain's own policy and minimums
create or replace function public.crypto_credit_deposit(p_id uuid, p_price_snapshot uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s crypto_settings; net chain_networks; d crypto_deposits; a chain_assets; ps crypto_price_snapshots; cents bigint; tx uuid; key text;
begin
  select * into s from crypto_settings;
  if not s.crypto_system_enabled or not s.deposits_enabled then return jsonb_build_object('status','PAUSED'); end if;
  select * into d from crypto_deposits where id = p_id for update;
  if d is null then raise exception 'DEPOSIT_NOT_FOUND'; end if;
  if d.status not in ('DETECTED','CONFIRMED') then return jsonb_build_object('status', d.status); end if;
  select * into net from chain_networks where chain_id = d.chain_id;
  if net is null or not net.is_enabled then return jsonb_build_object('status','CHAIN_DISABLED'); end if;
  select * into a from chain_assets where chain_id = d.chain_id and asset_key = d.asset_key;
  if a.settlement_kind = 'erc20' then
    cents := floor(d.units * 100 / power(10::numeric, a.decimals));
  else
    select * into ps from crypto_price_snapshots where id = p_price_snapshot and asset_key = d.asset_key and chain_id = d.chain_id;
    if ps is null or ps.observed_at < now() - make_interval(secs => s.price_max_age_seconds) then
      return jsonb_build_object('status','AWAITING_VALUATION');
    end if;
    cents := floor(d.units * ps.price_micro_usd / power(10::numeric, a.decimals) / 10000);
  end if;
  if d.user_id is null then
    update crypto_deposits set status = 'UNMATCHED', usd_cents = cents, price_snapshot_id = ps.id, confirmed_at = now(), closed_reason = 'sender is not exactly one verified wallet' where id = d.id;
    return jsonb_build_object('status','UNMATCHED');
  end if;
  if cents < net.min_deposit_cents then
    update crypto_deposits set status = 'REJECTED', usd_cents = cents, price_snapshot_id = ps.id, confirmed_at = now(), closed_reason = 'below minimum deposit' where id = d.id;
    return jsonb_build_object('status','REJECTED');
  end if;
  key := 'deposit:' || d.chain_id || ':' || d.tx_hash || ':' || d.log_index;
  insert into ledger_transactions (kind, idempotency_key, account_type, user_id, memo)
    values ('deposit', key, a.ledger_account_type, d.user_id, net.name || ' ' || a.asset_key || ' deposit ' || d.tx_hash) returning id into tx;
  perform _post(tx, _system_account('external_custody', a.ledger_asset, a.ledger_account_type), -cents);
  perform _post(tx, _user_account(d.user_id, 'user_available', a.ledger_asset, a.ledger_account_type), cents);
  update crypto_deposits set status = 'CREDITED', usd_cents = cents, price_snapshot_id = ps.id, ledger_tx_id = tx,
    confirmed_at = coalesce(confirmed_at, now()), credited_at = now() where id = d.id;
  perform _audit(d.user_id, 'crypto_deposit_credited', null, jsonb_build_object('deposit', d.id, 'cents', cents, 'asset', d.asset_key, 'chain', d.chain_id));
  return jsonb_build_object('status','CREDITED','cents',cents);
end $$;

-- Per-chain ETH withdrawal quote
create or replace function public.crypto_quote_withdrawal(p_user uuid, p_chain bigint, p_usd_cents bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s crypto_settings; net chain_networks; ps crypto_price_snapshots; wei numeric; q crypto_withdrawal_quotes;
begin
  select * into s from crypto_settings;
  select * into net from chain_networks where chain_id = p_chain and is_enabled;
  if net is null then raise exception 'CHAIN_DISABLED'; end if;
  if p_usd_cents < net.min_withdrawal_cents then raise exception 'BELOW_MINIMUM'; end if;
  select * into ps from crypto_price_snapshots where chain_id = p_chain and asset_key = 'ETH' order by observed_at desc limit 1;
  if ps is null or ps.observed_at < now() - make_interval(secs => s.price_max_age_seconds) then raise exception 'PRICE_STALE'; end if;
  wei := floor(p_usd_cents::numeric * 10000 * power(10::numeric, 18) / ps.price_micro_usd);
  insert into crypto_withdrawal_quotes (user_id, chain_id, asset_key, usd_cents, units, price_snapshot_id, price_micro_usd, expires_at)
    values (p_user, p_chain, 'ETH', p_usd_cents, wei, ps.id, ps.price_micro_usd, now() + make_interval(secs => s.quote_ttl_seconds)) returning * into q;
  return jsonb_build_object('quote_id', q.id, 'usd_cents', q.usd_cents, 'wei', q.units::text, 'price_micro_usd', q.price_micro_usd, 'expires_at', q.expires_at);
end $$;

-- Per-chain withdrawal request
create or replace function public.crypto_request_withdrawal(p_user uuid, p_chain bigint, p_asset text, p_usd_cents bigint, p_quote uuid, p_env_ok boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s crypto_settings; net chain_networks; a chain_assets; w user_wallets; q crypto_withdrawal_quotes; units numeric; total bigint; avail uuid; locked uuid; bal bigint; tx uuid; wid uuid := gen_random_uuid(); review boolean; used bigint;
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

-- Per-chain worker queue (includes liquidity-pending retries)
create or replace function public.crypto_next_withdrawals(p_chain bigint)
returns setof crypto_withdrawals language sql stable security definer set search_path = public as $$
  select * from crypto_withdrawals where chain_id = p_chain and status in ('APPROVED','SUBMITTING','SUBMITTED','LIQUIDITY_PENDING') order by created_at limit 10 $$;

-- Explicit liquidity-shortage state (queued, admin alerted, never a silent failure)
create or replace function public.crypto_withdrawal_liquidity_pending(p_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update crypto_withdrawals set status = 'LIQUIDITY_PENDING', last_error = left(p_reason, 500) where id = p_id and status = 'APPROVED';
  if found then
    perform _crypto_incident('crypto_liquidity', 'crypto_liquidity:' || p_id, jsonb_build_object('withdrawal', p_id, 'reason', left(p_reason, 300)));
  end if;
end $$;

-- Activity reports the chain for every movement, enabled chains, and the player's deposit addresses
create or replace function public.crypto_my_activity(p_user uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'deposits', coalesce((select jsonb_agg(x order by x.detected_at desc) from (select id, chain_id, asset_key, tx_hash, units::text units, usd_cents, status, detected_at, credited_at from crypto_deposits where user_id = p_user order by detected_at desc limit 20) x), '[]'),
    'withdrawals', coalesce((select jsonb_agg(x order by x.created_at desc) from (select id, chain_id, asset_key, tx_hash, units::text units, usd_cents, fee_usd_cents, status, review_required, created_at, confirmed_at, last_error from crypto_withdrawals where user_id = p_user order by created_at desc limit 20) x), '[]'),
    'settings', (select jsonb_build_object('deposits_enabled', crypto_system_enabled and deposits_enabled, 'withdrawals_enabled', crypto_system_enabled and withdrawals_enabled, 'min_deposit_cents', min_deposit_cents, 'min_withdrawal_cents', min_withdrawal_cents, 'daily_limit_cents', daily_limit_cents, 'fee_cents', withdrawal_fee_cents, 'auto_approve_cents', auto_approve_cents) from crypto_settings),
    'chains', coalesce((select jsonb_agg(jsonb_build_object('chain_id', n.chain_id, 'name', n.name, 'network_mode', n.network_mode, 'min_deposit_cents', n.min_deposit_cents, 'min_withdrawal_cents', n.min_withdrawal_cents, 'credit_confirmations', n.credit_confirmations, 'assets', (select jsonb_agg(a.asset_key) from chain_assets a where a.chain_id = n.chain_id and a.is_enabled)) order by n.chain_id) from chain_networks n where n.is_enabled), '[]'),
    'deposit_addresses', coalesce((select jsonb_agg(jsonb_build_object('chain_id', da.chain_id, 'address', da.address)) from crypto_deposit_addresses da where da.user_id = p_user), '[]'),
    'treasury', (select address from chain_treasury_accounts where role = 'deposit' and is_active limit 1),
    'wallet', (select normalized_address from user_wallets where user_id = p_user and is_verified order by is_primary desc limit 1)
  ) $$;

do $$ declare f text; begin
  for f in select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('crypto_record_price','crypto_observe_deposit','crypto_quote_withdrawal','crypto_request_withdrawal','crypto_next_withdrawals','crypto_withdrawal_liquidity_pending')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;