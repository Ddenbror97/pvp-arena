-- ETH valuation stays on the USD-cent ledger. This split is the quiet-market fix:
--   oracle_updated_at = Chainlink updatedAt (the round we priced)
--   observed_at       = when our server re-read that round
-- A healthy Base ETH/USD round is at most heartbeat 1200s + 120s skew = 1320s old.
-- price_max_age_seconds stays the server-observation window. Do not widen 1320s.

alter table public.crypto_price_snapshots
  add column if not exists oracle_updated_at timestamptz;

update public.crypto_price_snapshots
  set oracle_updated_at = observed_at
  where oracle_updated_at is null;

alter table public.crypto_price_snapshots
  alter column oracle_updated_at set not null;

alter table public.crypto_deposits
  add column if not exists block_hash text;

alter table public.crypto_deposits
  drop constraint if exists crypto_deposits_block_hash_check;
alter table public.crypto_deposits
  add constraint crypto_deposits_block_hash_check
  check (block_hash is null or block_hash ~* '^0x[0-9a-f]{64}$');

-- One row per Chainlink round. Conflicting prices for the same round abort the migration.
do $$
begin
  if exists (
    select 1 from public.crypto_price_snapshots
    group by chain_id, asset_key, feed_round_id
    having count(distinct price_micro_usd) > 1
  ) then
    raise exception 'ROUND_PRICE_CONFLICT';
  end if;
end $$;

delete from public.crypto_price_snapshots a
where exists (
  select 1 from public.crypto_price_snapshots b
  where b.chain_id = a.chain_id and b.asset_key = a.asset_key and b.feed_round_id = a.feed_round_id
    and (b.created_at, b.id) > (a.created_at, a.id)
)
and not exists (select 1 from public.crypto_deposits d where d.price_snapshot_id = a.id)
and not exists (select 1 from public.crypto_withdrawal_quotes q where q.price_snapshot_id = a.id);

create unique index if not exists crypto_price_snapshots_round_idx
  on public.crypto_price_snapshots (chain_id, asset_key, feed_round_id);

create table if not exists public.crypto_chain_inventory (
  chain_id bigint primary key references public.chain_networks (chain_id),
  deposit_wei numeric(40,0) not null check (deposit_wei >= 0),
  payout_wei numeric(40,0) not null check (payout_wei >= 0),
  deposit_usdc_units numeric(40,0) not null check (deposit_usdc_units >= 0),
  payout_usdc_units numeric(40,0) not null check (payout_usdc_units >= 0),
  eth_price_micro_usd bigint,
  pending_eth_wei numeric(40,0) not null check (pending_eth_wei >= 0),
  pending_eth_cents bigint not null check (pending_eth_cents >= 0),
  pending_usdc_units numeric(40,0) not null check (pending_usdc_units >= 0),
  pending_usdc_cents bigint not null check (pending_usdc_cents >= 0),
  eth_deposit_liability_cents bigint not null check (eth_deposit_liability_cents >= 0),
  eth_withdrawn_cents bigint not null check (eth_withdrawn_cents >= 0),
  hot_key_matches boolean,
  price_ok boolean not null,
  observed_at timestamptz not null default now()
);
grant all on public.crypto_chain_inventory to service_role;
revoke all on public.crypto_chain_inventory from anon, authenticated;
alter table public.crypto_chain_inventory enable row level security;

create or replace function public.crypto_record_price(
  p_chain bigint, p_asset text, p_feed text, p_round numeric, p_price_micro bigint,
  p_observed timestamptz, p_oracle_updated timestamptz
) returns uuid
language plpgsql security definer set search_path = public as $$
declare a chain_assets; v uuid; oracle_at timestamptz;
begin
  perform public._require_server_caller();
  if p_price_micro is null or p_price_micro <= 0 then raise exception 'PRICE_NOT_POSITIVE'; end if;
  select * into a from chain_assets where chain_id = p_chain and asset_key = p_asset;
  if a is null or a.price_feed_address is null or lower(a.price_feed_address) <> lower(p_feed) then
    raise exception 'FEED_NOT_ALLOWLISTED';
  end if;
  oracle_at := coalesce(p_oracle_updated, p_observed);
  if p_observed > now() + interval '60 seconds' or oracle_at > now() + interval '60 seconds' then
    raise exception 'PRICE_FROM_FUTURE';
  end if;
  -- Base ETH/USD heartbeat 1200s + 120s skew. A quiet round inside this window is accepted.
  if oracle_at < now() - interval '1320 seconds' then raise exception 'PRICE_STALE'; end if;
  if exists (
    select 1 from crypto_price_snapshots
    where chain_id = p_chain and asset_key = p_asset and feed_round_id > p_round
  ) then
    raise exception 'STALE_ROUND';
  end if;
  insert into crypto_price_snapshots (
    chain_id, asset_key, feed_address, feed_round_id, price_micro_usd, max_age_seconds, observed_at, oracle_updated_at
  )
  select p_chain, p_asset, a.price_feed_address, p_round, p_price_micro, s.price_max_age_seconds, p_observed, oracle_at
  from crypto_settings s
  on conflict (chain_id, asset_key, feed_round_id) do update
    set observed_at = greatest(crypto_price_snapshots.observed_at, excluded.observed_at),
        oracle_updated_at = greatest(crypto_price_snapshots.oracle_updated_at, excluded.oracle_updated_at)
    where crypto_price_snapshots.price_micro_usd = excluded.price_micro_usd
  returning id into v;
  if v is null then raise exception 'ROUND_PRICE_CHANGED'; end if;
  return v;
end $$;

create or replace function public.crypto_record_price(
  p_chain bigint, p_asset text, p_feed text, p_round numeric, p_price_micro bigint, p_observed timestamptz
) returns uuid
language sql security definer set search_path = public as $$
  select public.crypto_record_price(p_chain, p_asset, p_feed, p_round, p_price_micro, p_observed, null::timestamptz);
$$;

-- Re-observing an open deposit may correct units after a reorg. A credited row never changes.
create or replace function public.crypto_observe_deposit(
  p_chain bigint, p_asset text, p_tx text, p_log integer, p_block bigint, p_from text, p_to text, p_units numeric
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare d crypto_deposits; tr text; uid uuid; n int;
begin
  perform public._require_server_caller();
  if not exists (select 1 from chain_assets where chain_id = p_chain and asset_key = p_asset and is_enabled) then
    raise exception 'ASSET_NOT_ALLOWLISTED';
  end if;
  select user_id into uid from crypto_deposit_addresses where chain_id = p_chain and lower(address) = lower(p_to);
  if uid is null then
    select address into tr from chain_treasury_accounts where chain_id = p_chain and role = 'deposit' and is_active;
    if tr is null or lower(tr) <> lower(p_to) then raise exception 'NOT_TREASURY'; end if;
    select count(*), min(user_id::text)::uuid into n, uid from user_wallets where normalized_address = lower(p_from) and is_verified;
    if n <> 1 then uid := null; end if;
  end if;
  insert into crypto_deposits (chain_id, asset_key, tx_hash, log_index, block_number, from_address, to_address, units, usd_cents, user_id, status)
    values (p_chain, p_asset, lower(p_tx), p_log, p_block, lower(p_from), lower(p_to), p_units, 0, uid, 'DETECTED')
  on conflict (chain_id, tx_hash, log_index) do update set
    block_number = excluded.block_number,
    from_address = excluded.from_address,
    to_address = excluded.to_address,
    units = excluded.units,
    user_id = excluded.user_id
    where crypto_deposits.status in ('DETECTED','CONFIRMED')
  returning * into d;
  if d is null then
    select * into d from crypto_deposits where chain_id = p_chain and tx_hash = lower(p_tx) and log_index = p_log;
  end if;
  return jsonb_build_object('id', d.id, 'status', d.status);
end $$;

create or replace function public.crypto_credit_deposit(p_id uuid, p_price_snapshot uuid, p_block_hash text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare s crypto_settings; net chain_networks; d crypto_deposits; a chain_assets; ps crypto_price_snapshots;
  cents bigint; tx uuid; key text; psid uuid; admin_ok boolean; bhash text;
begin
  perform public._require_server_caller();
  if p_block_hash is not null and p_block_hash !~* '^0x[0-9a-f]{64}$' then raise exception 'BAD_BLOCK_HASH'; end if;
  bhash := case when p_block_hash is null then null else lower(p_block_hash) end;
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
    if ps is null or ps.price_micro_usd <= 0
       or ps.observed_at < now() - make_interval(secs => s.price_max_age_seconds)
       or ps.oracle_updated_at < now() - interval '1320 seconds' then
      return jsonb_build_object('status','AWAITING_VALUATION');
    end if;
    psid := ps.id;
    cents := floor(d.units * ps.price_micro_usd / power(10::numeric, a.decimals) / 10000);
  end if;
  if d.user_id is null then
    update crypto_deposits set status = 'UNMATCHED', usd_cents = cents, price_snapshot_id = psid, block_hash = coalesce(bhash, block_hash),
      confirmed_at = now(), closed_reason = 'sender is not exactly one verified wallet' where id = d.id;
    return jsonb_build_object('status','UNMATCHED');
  end if;
  admin_ok := coalesce(current_setting('crypto.admin_credit_deposit', true), '') = d.id::text;
  if public._is_house_address(d.from_address) and not admin_ok then
    update crypto_deposits set status = 'UNMATCHED', usd_cents = cents, price_snapshot_id = psid, block_hash = coalesce(bhash, block_hash),
      confirmed_at = coalesce(confirmed_at, now()), closed_reason = 'sender is a house wallet' where id = d.id;
    perform _audit(d.user_id, 'crypto_deposit_house_sender', null, jsonb_build_object('deposit', d.id, 'cents', cents, 'from', d.from_address));
    return jsonb_build_object('status','UNMATCHED');
  end if;
  if cents < net.min_deposit_cents then
    update crypto_deposits set status = 'REJECTED', usd_cents = cents, price_snapshot_id = psid, block_hash = coalesce(bhash, block_hash),
      confirmed_at = now(), closed_reason = 'below minimum deposit' where id = d.id;
    return jsonb_build_object('status','REJECTED');
  end if;
  if s.watch_only then
    update crypto_deposits set status = 'CONFIRMED', usd_cents = cents, price_snapshot_id = psid, block_hash = coalesce(bhash, block_hash),
      confirmed_at = coalesce(confirmed_at, now()) where id = d.id;
    perform _audit(d.user_id, 'crypto_deposit_watch_only', null, jsonb_build_object('deposit', d.id, 'cents', cents, 'asset', d.asset_key, 'chain', d.chain_id));
    return jsonb_build_object('status','WATCH_ONLY','cents',cents);
  end if;
  if public._money_state() <> 'FINALIZED' then
    update crypto_deposits set status = 'CONFIRMED', usd_cents = cents, price_snapshot_id = psid, block_hash = coalesce(bhash, block_hash),
      confirmed_at = coalesce(confirmed_at, now()) where id = d.id;
    return jsonb_build_object('status','LEDGER_NOT_READY','cents',cents);
  end if;
  key := 'deposit:' || d.chain_id || ':' || d.tx_hash || ':' || d.log_index;
  insert into ledger_transactions (kind, idempotency_key, account_type, user_id, memo)
    values ('deposit', key, a.ledger_account_type, d.user_id, net.name || ' ' || a.asset_key || ' deposit ' || d.tx_hash) returning id into tx;
  perform _post(tx, _system_account('external_custody', a.ledger_asset, a.ledger_account_type), -cents);
  perform _post(tx, _user_account(d.user_id, 'user_available', a.ledger_asset, a.ledger_account_type), cents);
  update crypto_deposits set status = 'CREDITED', usd_cents = cents, price_snapshot_id = psid, ledger_tx_id = tx,
    block_hash = coalesce(bhash, block_hash), confirmed_at = coalesce(confirmed_at, now()), credited_at = now() where id = d.id;
  perform _audit(d.user_id, case when admin_ok then 'crypto_deposit_admin_credited' else 'crypto_deposit_credited' end, null,
    jsonb_build_object('deposit', d.id, 'cents', cents, 'asset', d.asset_key, 'chain', d.chain_id,
      'snapshot', psid, 'price_micro', ps.price_micro_usd, 'oracle_updated_at', ps.oracle_updated_at,
      'round', ps.feed_round_id, 'block_hash', bhash));
  return jsonb_build_object('status','CREDITED','cents',cents,'snapshot',psid);
end $$;

create or replace function public.crypto_credit_deposit(p_id uuid, p_price_snapshot uuid)
returns jsonb language sql security definer set search_path = public as $$
  select public.crypto_credit_deposit(p_id, p_price_snapshot, null::text);
$$;

create or replace function public.crypto_quote_withdrawal(p_user uuid, p_chain bigint, p_usd_cents bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s crypto_settings; net chain_networks; ps crypto_price_snapshots; wei numeric; q crypto_withdrawal_quotes;
begin
  perform public._require_server_caller();
  select * into s from crypto_settings;
  select * into net from chain_networks where chain_id = p_chain and is_enabled;
  if net is null then raise exception 'CHAIN_DISABLED'; end if;
  if p_usd_cents < net.min_withdrawal_cents then raise exception 'BELOW_MINIMUM'; end if;
  select * into ps from crypto_price_snapshots
    where chain_id = p_chain and asset_key = 'ETH'
    order by observed_at desc limit 1;
  if ps is null or ps.price_micro_usd <= 0
     or ps.observed_at < now() - make_interval(secs => s.price_max_age_seconds)
     or ps.oracle_updated_at < now() - interval '1320 seconds' then
    raise exception 'PRICE_STALE';
  end if;
  wei := floor(p_usd_cents::numeric * 10000 * power(10::numeric, 18) / ps.price_micro_usd);
  insert into crypto_withdrawal_quotes (user_id, chain_id, asset_key, usd_cents, units, price_snapshot_id, price_micro_usd, expires_at)
    values (p_user, p_chain, 'ETH', p_usd_cents, wei, ps.id, ps.price_micro_usd, now() + make_interval(secs => s.quote_ttl_seconds))
    returning * into q;
  return jsonb_build_object('quote_id', q.id, 'usd_cents', q.usd_cents, 'wei', q.units::text,
    'price_micro_usd', q.price_micro_usd, 'expires_at', q.expires_at, 'snapshot', ps.id);
end $$;

-- On-chain balances come from the worker. Obligations are computed here so a client cannot invent them.
create or replace function public.crypto_record_inventory(
  p_chain bigint, p_deposit_wei numeric, p_payout_wei numeric, p_deposit_usdc numeric, p_payout_usdc numeric,
  p_price_micro bigint, p_hot_key_matches boolean, p_price_ok boolean
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare pend_eth numeric; pend_eth_cents bigint; pend_usdc numeric; pend_usdc_cents bigint; liab bigint; withdrawn bigint;
begin
  perform public._require_server_caller();
  if p_deposit_wei < 0 or p_payout_wei < 0 or p_deposit_usdc < 0 or p_payout_usdc < 0 then
    raise exception 'NEGATIVE_INVENTORY';
  end if;
  select coalesce(sum(units), 0), coalesce(sum(usd_cents), 0) into pend_eth, pend_eth_cents
    from crypto_withdrawals
    where chain_id = p_chain and asset_key = 'ETH'
      and status in ('APPROVED','LIQUIDITY_PENDING','SUBMITTING','SUBMITTED');
  select coalesce(sum(units), 0), coalesce(sum(usd_cents), 0) into pend_usdc, pend_usdc_cents
    from crypto_withdrawals
    where chain_id = p_chain and asset_key = 'USDC'
      and status in ('APPROVED','LIQUIDITY_PENDING','SUBMITTING','SUBMITTED');
  select coalesce(sum(usd_cents), 0) into liab from crypto_deposits
    where chain_id = p_chain and asset_key = 'ETH' and status = 'CREDITED';
  select coalesce(sum(usd_cents), 0) into withdrawn from crypto_withdrawals
    where chain_id = p_chain and asset_key = 'ETH' and status = 'CONFIRMED';
  insert into crypto_chain_inventory (
    chain_id, deposit_wei, payout_wei, deposit_usdc_units, payout_usdc_units, eth_price_micro_usd,
    pending_eth_wei, pending_eth_cents, pending_usdc_units, pending_usdc_cents,
    eth_deposit_liability_cents, eth_withdrawn_cents, hot_key_matches, price_ok, observed_at
  ) values (
    p_chain, p_deposit_wei, p_payout_wei, p_deposit_usdc, p_payout_usdc, p_price_micro,
    pend_eth, pend_eth_cents, pend_usdc, pend_usdc_cents, liab, withdrawn, p_hot_key_matches, p_price_ok, now()
  )
  on conflict (chain_id) do update set
    deposit_wei = excluded.deposit_wei, payout_wei = excluded.payout_wei,
    deposit_usdc_units = excluded.deposit_usdc_units, payout_usdc_units = excluded.payout_usdc_units,
    eth_price_micro_usd = excluded.eth_price_micro_usd,
    pending_eth_wei = excluded.pending_eth_wei, pending_eth_cents = excluded.pending_eth_cents,
    pending_usdc_units = excluded.pending_usdc_units, pending_usdc_cents = excluded.pending_usdc_cents,
    eth_deposit_liability_cents = excluded.eth_deposit_liability_cents,
    eth_withdrawn_cents = excluded.eth_withdrawn_cents,
    hot_key_matches = excluded.hot_key_matches, price_ok = excluded.price_ok, observed_at = now();
  if pend_eth > p_payout_wei then
    perform _crypto_incident('crypto_payout_liquidity',
      'crypto_inventory_eth:' || p_chain || ':' || to_char(now(), 'YYYYMMDDHH24'),
      jsonb_build_object('chain_id', p_chain, 'asset', 'ETH', 'need', pend_eth, 'have', p_payout_wei));
  end if;
  if pend_usdc > p_payout_usdc then
    perform _crypto_incident('crypto_payout_liquidity',
      'crypto_inventory_usdc:' || p_chain || ':' || to_char(now(), 'YYYYMMDDHH24'),
      jsonb_build_object('chain_id', p_chain, 'asset', 'USDC', 'need', pend_usdc, 'have', p_payout_usdc));
  end if;
  if p_hot_key_matches is false then
    perform _crypto_incident('crypto_hot_key',
      'crypto_hot_key:' || p_chain || ':' || to_char(now(), 'YYYYMMDDHH24'),
      jsonb_build_object('chain_id', p_chain, 'matches', false));
  end if;
  return jsonb_build_object(
    'pending_eth_wei', pend_eth, 'pending_eth_cents', pend_eth_cents,
    'pending_usdc_cents', pend_usdc_cents, 'eth_deposit_liability_cents', liab, 'eth_withdrawn_cents', withdrawn
  );
end $$;

create or replace function public.crypto_admin_overview(p_admin uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not has_role(p_admin, 'admin') then raise exception 'FORBIDDEN'; end if;
  return jsonb_build_object(
    'settings', (select to_jsonb(s) - 'job_token_hash' from crypto_settings s),
    'pending', coalesce((select jsonb_agg(x) from (
      select w.id, w.chain_id, w.asset_key, w.usd_cents, w.units::text as units, w.to_address, w.status, w.created_at, w.last_error, p.username
      from crypto_withdrawals w join profiles p on p.id = w.user_id
      where w.status in ('PENDING','HELD','APPROVED','SUBMITTING','SUBMITTED','LIQUIDITY_PENDING')
      order by w.created_at
    ) x), '[]'),
    'unmatched', coalesce((select jsonb_agg(x) from (
      select id, asset_key, tx_hash, from_address, units::text units, usd_cents, detected_at
      from crypto_deposits where status = 'UNMATCHED' order by detected_at desc limit 50
    ) x), '[]'),
    'custody_cents', (select coalesce(-sum(balance),0) from wallet_accounts where kind = 'external_custody'),
    'inventory', coalesce((select jsonb_agg(to_jsonb(i)) from crypto_chain_inventory i), '[]'),
    'eth_books', jsonb_build_object(
      'deposit_liability_cents', (select coalesce(sum(usd_cents),0) from crypto_deposits where asset_key = 'ETH' and status = 'CREDITED'),
      'awaiting_valuation', (select count(*) from crypto_deposits where asset_key = 'ETH' and status in ('DETECTED','CONFIRMED')),
      'withdrawn_cents', (select coalesce(sum(usd_cents),0) from crypto_withdrawals where asset_key = 'ETH' and status = 'CONFIRMED'),
      'pending_eth_wei', (select coalesce(sum(units),0) from crypto_withdrawals where asset_key = 'ETH' and status in ('APPROVED','LIQUIDITY_PENDING','SUBMITTING','SUBMITTED')),
      'pending_eth_cents', (select coalesce(sum(usd_cents),0) from crypto_withdrawals where asset_key = 'ETH' and status in ('APPROVED','LIQUIDITY_PENDING','SUBMITTING','SUBMITTED')),
      'pending_usdc_cents', (select coalesce(sum(usd_cents),0) from crypto_withdrawals where asset_key = 'USDC' and status in ('APPROVED','LIQUIDITY_PENDING','SUBMITTING','SUBMITTED'))
    ),
    'incidents', coalesce((select jsonb_agg(x) from (
      select check_name, details, last_seen_at, occurrences from integrity_incidents
      where check_name like 'crypto%' order by last_seen_at desc limit 20
    ) x), '[]')
  );
end $$;

revoke execute on function
  public.crypto_record_price(bigint, text, text, numeric, bigint, timestamptz, timestamptz),
  public.crypto_record_price(bigint, text, text, numeric, bigint, timestamptz),
  public.crypto_observe_deposit(bigint, text, text, integer, bigint, text, text, numeric),
  public.crypto_credit_deposit(uuid, uuid, text),
  public.crypto_credit_deposit(uuid, uuid),
  public.crypto_quote_withdrawal(uuid, bigint, bigint),
  public.crypto_record_inventory(bigint, numeric, numeric, numeric, numeric, bigint, boolean, boolean),
  public.crypto_admin_overview(uuid)
  from public, anon, authenticated;
grant execute on function
  public.crypto_record_price(bigint, text, text, numeric, bigint, timestamptz, timestamptz),
  public.crypto_record_price(bigint, text, text, numeric, bigint, timestamptz),
  public.crypto_observe_deposit(bigint, text, text, integer, bigint, text, text, numeric),
  public.crypto_credit_deposit(uuid, uuid, text),
  public.crypto_credit_deposit(uuid, uuid),
  public.crypto_quote_withdrawal(uuid, bigint, bigint),
  public.crypto_record_inventory(bigint, numeric, numeric, numeric, numeric, bigint, boolean, boolean),
  public.crypto_admin_overview(uuid)
  to service_role;
