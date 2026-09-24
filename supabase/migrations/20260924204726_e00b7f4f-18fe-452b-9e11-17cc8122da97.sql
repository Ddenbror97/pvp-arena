
alter table public.wallet_accounts drop constraint if exists wallet_accounts_balance_check;
do $$ declare c text; begin
  select conname into c from pg_constraint where conrelid='public.wallet_accounts'::regclass and pg_get_constraintdef(oid) like '%test_faucet%balance%';
  if c is not null then execute format('alter table public.wallet_accounts drop constraint %I', c); end if;
end $$;
alter table public.wallet_accounts add constraint wallet_accounts_balance_nonneg check (kind in ('test_faucet','external_custody') or balance >= 0);

create table public.crypto_settings (
  id boolean primary key default true check (id),
  environment text not null default 'testnet' check (environment = 'testnet'),
  mainnet_enabled boolean not null default false check (mainnet_enabled = false),
  chain_id bigint not null default 84532 check (chain_id = 84532),
  crypto_system_enabled boolean not null default true,
  deposits_enabled boolean not null default true,
  withdrawals_enabled boolean not null default true,
  min_deposit_cents bigint not null default 100 check (min_deposit_cents >= 1),
  min_withdrawal_cents bigint not null default 500 check (min_withdrawal_cents >= 1),
  auto_approve_cents bigint not null default 10000 check (auto_approve_cents >= 0),
  daily_limit_cents bigint not null default 100000 check (daily_limit_cents >= 0),
  withdrawal_fee_cents bigint not null default 0 check (withdrawal_fee_cents >= 0),
  price_max_age_seconds integer not null default 300 check (price_max_age_seconds between 30 and 3600),
  quote_ttl_seconds integer not null default 60 check (quote_ttl_seconds between 15 and 600),
  overlap_blocks integer not null default 200 check (overlap_blocks between 10 and 5000),
  updated_at timestamptz not null default now()
);
insert into public.crypto_settings default values;
grant all on public.crypto_settings to service_role;
alter table public.crypto_settings enable row level security;

create table public.crypto_chain_cursor (
  chain_id bigint primary key references public.chain_networks(chain_id),
  last_processed_block bigint not null check (last_processed_block >= 0),
  updated_at timestamptz not null default now()
);
grant all on public.crypto_chain_cursor to service_role;
alter table public.crypto_chain_cursor enable row level security;

create table public.crypto_withdrawal_quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  chain_id bigint not null,
  asset_key text not null,
  usd_cents bigint not null check (usd_cents > 0),
  units numeric not null check (units > 0),
  price_snapshot_id uuid not null references public.crypto_price_snapshots(id),
  price_micro_usd bigint not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (chain_id, asset_key) references public.chain_assets(chain_id, asset_key)
);
grant all on public.crypto_withdrawal_quotes to service_role;
alter table public.crypto_withdrawal_quotes enable row level security;
create trigger no_truncate before truncate on public.crypto_withdrawal_quotes for each statement execute function public._no_truncate();
create trigger no_truncate before truncate on public.crypto_settings for each statement execute function public._no_truncate();

alter table public.crypto_withdrawals add column quote_id uuid unique references public.crypto_withdrawal_quotes(id),
  add column nonce bigint, add column signed_raw_tx text;

do $$ declare c text; begin
  select conname into c from pg_constraint where conrelid='public.crypto_deposits'::regclass and pg_get_constraintdef(oid) like '%DETECTED%';
  execute format('alter table public.crypto_deposits drop constraint %I', c);
end $$;
alter table public.crypto_deposits add constraint crypto_deposits_status_check check (status in ('DETECTED','CONFIRMED','UNMATCHED','CREDITED','REJECTED','ORPHANED'));

-- incident helper (detect-only)
create or replace function public._crypto_incident(p_check text, p_fp text, p_details jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into integrity_incidents (check_name, fingerprint, details) values (p_check, p_fp, p_details)
  on conflict (fingerprint) do update set last_seen_at = now(), occurrences = integrity_incidents.occurrences + 1, details = excluded.details;
end $$;

create or replace function public.crypto_record_price(p_asset text, p_feed text, p_round numeric, p_price_micro bigint, p_observed timestamptz)
returns uuid language plpgsql security definer set search_path = public as $$
declare a chain_assets; s crypto_settings; v uuid;
begin
  select * into s from crypto_settings;
  select * into a from chain_assets where chain_id = s.chain_id and asset_key = p_asset;
  if a is null or a.price_feed_address is null or lower(a.price_feed_address) <> lower(p_feed) then raise exception 'FEED_NOT_ALLOWLISTED'; end if;
  if p_observed > now() + interval '60 seconds' then raise exception 'PRICE_FROM_FUTURE'; end if;
  insert into crypto_price_snapshots (chain_id, asset_key, feed_address, feed_round_id, price_micro_usd, max_age_seconds, observed_at)
    values (s.chain_id, p_asset, a.price_feed_address, p_round, p_price_micro, s.price_max_age_seconds, p_observed) returning id into v;
  return v;
end $$;

create or replace function public.crypto_get_cursor(p_chain bigint) returns bigint
language sql stable security definer set search_path = public as $$
  select last_processed_block from crypto_chain_cursor where chain_id = p_chain $$;

create or replace function public.crypto_set_cursor(p_chain bigint, p_block bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into crypto_chain_cursor (chain_id, last_processed_block) values (p_chain, p_block)
  on conflict (chain_id) do update set last_processed_block = greatest(crypto_chain_cursor.last_processed_block, excluded.last_processed_block), updated_at = now();
end $$;

-- record/refresh a seen transfer; re-seen transfers (e.g. after reorg) update their block
create or replace function public.crypto_observe_deposit(p_asset text, p_tx text, p_log integer, p_block bigint, p_from text, p_to text, p_units numeric)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s crypto_settings; d crypto_deposits; tr text; uid uuid; n int;
begin
  select * into s from crypto_settings;
  select address into tr from chain_treasury_accounts where chain_id = s.chain_id and role = 'deposit' and is_active;
  if tr is null or lower(tr) <> lower(p_to) then raise exception 'NOT_TREASURY'; end if;
  if not exists (select 1 from chain_assets where chain_id = s.chain_id and asset_key = p_asset and is_enabled) then raise exception 'ASSET_NOT_ALLOWLISTED'; end if;
  select count(*), min(user_id::text)::uuid into n, uid from user_wallets where normalized_address = lower(p_from) and is_verified;
  if n <> 1 then uid := null; end if;
  insert into crypto_deposits (chain_id, asset_key, tx_hash, log_index, block_number, from_address, to_address, units, usd_cents, user_id, status)
    values (s.chain_id, p_asset, lower(p_tx), p_log, p_block, lower(p_from), lower(p_to), p_units, 0, uid, 'DETECTED')
  on conflict (chain_id, tx_hash, log_index) do update set block_number = excluded.block_number
    where crypto_deposits.status in ('DETECTED','CONFIRMED')
  returning * into d;
  if d is null then select * into d from crypto_deposits where chain_id = s.chain_id and tx_hash = lower(p_tx) and log_index = p_log; end if;
  return jsonb_build_object('id', d.id, 'status', d.status);
end $$;

-- credit a deposit that the watcher has re-verified at the safe block
create or replace function public.crypto_credit_deposit(p_id uuid, p_price_snapshot uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s crypto_settings; d crypto_deposits; a chain_assets; ps crypto_price_snapshots; cents bigint; tx uuid; key text;
begin
  select * into s from crypto_settings;
  if not s.crypto_system_enabled or not s.deposits_enabled then return jsonb_build_object('status','PAUSED'); end if;
  select * into d from crypto_deposits where id = p_id for update;
  if d is null then raise exception 'DEPOSIT_NOT_FOUND'; end if;
  if d.status not in ('DETECTED','CONFIRMED') then return jsonb_build_object('status', d.status); end if;
  select * into a from chain_assets where chain_id = d.chain_id and asset_key = d.asset_key;
  if a.settlement_kind = 'erc20' then
    cents := floor(d.units * 100 / power(10::numeric, a.decimals));
  else
    select * into ps from crypto_price_snapshots where id = p_price_snapshot and asset_key = d.asset_key;
    if ps is null or ps.observed_at < now() - make_interval(secs => s.price_max_age_seconds) then
      return jsonb_build_object('status','AWAITING_VALUATION');
    end if;
    cents := floor(d.units * ps.price_micro_usd / power(10::numeric, a.decimals) / 10000);
  end if;
  if d.user_id is null then
    update crypto_deposits set status = 'UNMATCHED', usd_cents = cents, price_snapshot_id = ps.id, confirmed_at = now(), closed_reason = 'sender is not exactly one verified wallet' where id = d.id;
    return jsonb_build_object('status','UNMATCHED');
  end if;
  if cents < s.min_deposit_cents then
    update crypto_deposits set status = 'REJECTED', usd_cents = cents, price_snapshot_id = ps.id, confirmed_at = now(), closed_reason = 'below minimum deposit' where id = d.id;
    return jsonb_build_object('status','REJECTED');
  end if;
  key := 'deposit:' || d.chain_id || ':' || d.tx_hash || ':' || d.log_index;
  insert into ledger_transactions (kind, idempotency_key, account_type, user_id, memo)
    values ('deposit', key, a.ledger_account_type, d.user_id, 'Testnet ' || a.asset_key || ' deposit ' || d.tx_hash) returning id into tx;
  perform _post(tx, _system_account('external_custody', a.ledger_asset, a.ledger_account_type), -cents);
  perform _post(tx, _user_account(d.user_id, 'user_available', a.ledger_asset, a.ledger_account_type), cents);
  update crypto_deposits set status = 'CREDITED', usd_cents = cents, price_snapshot_id = ps.id, ledger_tx_id = tx,
    confirmed_at = coalesce(confirmed_at, now()), credited_at = now() where id = d.id;
  perform _audit(d.user_id, 'crypto_deposit_credited', null, jsonb_build_object('deposit', d.id, 'cents', cents, 'asset', d.asset_key));
  return jsonb_build_object('status','CREDITED','cents',cents);
end $$;

create or replace function public.crypto_pending_deposits(p_chain bigint, p_max_block bigint)
returns setof crypto_deposits language sql stable security definer set search_path = public as $$
  select * from crypto_deposits where chain_id = p_chain and status in ('DETECTED','CONFIRMED') and block_number <= p_max_block order by block_number limit 200 $$;

-- ETH quote
create or replace function public.crypto_quote_withdrawal(p_user uuid, p_usd_cents bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s crypto_settings; ps crypto_price_snapshots; wei numeric; q crypto_withdrawal_quotes;
begin
  select * into s from crypto_settings;
  if p_usd_cents < s.min_withdrawal_cents then raise exception 'BELOW_MINIMUM'; end if;
  select * into ps from crypto_price_snapshots where chain_id = s.chain_id and asset_key = 'ETH' order by observed_at desc limit 1;
  if ps is null or ps.observed_at < now() - make_interval(secs => s.price_max_age_seconds) then raise exception 'PRICE_STALE'; end if;
  wei := floor(p_usd_cents::numeric * 10000 * power(10::numeric, 18) / ps.price_micro_usd);
  insert into crypto_withdrawal_quotes (user_id, chain_id, asset_key, usd_cents, units, price_snapshot_id, price_micro_usd, expires_at)
    values (p_user, s.chain_id, 'ETH', p_usd_cents, wei, ps.id, ps.price_micro_usd, now() + make_interval(secs => s.quote_ttl_seconds)) returning * into q;
  return jsonb_build_object('quote_id', q.id, 'usd_cents', q.usd_cents, 'wei', q.units::text, 'price_micro_usd', q.price_micro_usd, 'expires_at', q.expires_at);
end $$;

create or replace function public.crypto_request_withdrawal(p_user uuid, p_asset text, p_usd_cents bigint, p_quote uuid, p_env_ok boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s crypto_settings; a chain_assets; w user_wallets; q crypto_withdrawal_quotes; units numeric; total bigint; avail uuid; locked uuid; bal bigint; tx uuid; wid uuid := gen_random_uuid(); review boolean; used bigint;
begin
  select * into s from crypto_settings;
  if not s.crypto_system_enabled or not s.withdrawals_enabled then raise exception 'WITHDRAWALS_PAUSED'; end if;
  select * into a from chain_assets where chain_id = s.chain_id and asset_key = p_asset and is_enabled;
  if a is null then raise exception 'ASSET_NOT_ALLOWLISTED'; end if;
  if p_usd_cents < s.min_withdrawal_cents then raise exception 'BELOW_MINIMUM'; end if;
  if exists (select 1 from profiles where id = p_user and self_excluded_until > now()) then raise exception 'SELF_EXCLUDED'; end if;
  select * into w from user_wallets where user_id = p_user and is_verified order by is_primary desc, verified_at desc limit 1;
  if w is null then raise exception 'NO_VERIFIED_WALLET'; end if;
  perform pg_advisory_xact_lock(hashtext('crypto_withdraw:' || p_user));
  if exists (select 1 from crypto_withdrawals where user_id = p_user and status in ('PENDING','HELD','APPROVED','SUBMITTING','SUBMITTED')) then raise exception 'WITHDRAWAL_PENDING'; end if;
  select coalesce(sum(usd_cents),0) into used from crypto_withdrawals where user_id = p_user and created_at > now() - interval '24 hours' and status not in ('REJECTED','RELEASED');
  if used + p_usd_cents > s.daily_limit_cents then raise exception 'DAILY_LIMIT'; end if;
  if a.settlement_kind = 'native' then
    select * into q from crypto_withdrawal_quotes where id = p_quote for update;
    if q is null or q.user_id <> p_user or q.asset_key <> p_asset then raise exception 'QUOTE_INVALID'; end if;
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
    values (wid, p_user, s.chain_id, p_asset, w.normalized_address, units, p_usd_cents, s.withdrawal_fee_cents, case when review then 'PENDING' else 'APPROVED' end, review, tx, q.id);
  perform _audit(p_user, 'crypto_withdrawal_requested', null, jsonb_build_object('withdrawal', wid, 'cents', p_usd_cents, 'asset', p_asset, 'review', review));
  return jsonb_build_object('id', wid, 'status', case when review then 'PENDING' else 'APPROVED' end);
end $$;

create or replace function public._crypto_release(p_id uuid, p_status text, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare w crypto_withdrawals; a chain_assets; tx uuid; total bigint;
begin
  select * into w from crypto_withdrawals where id = p_id for update;
  select * into a from chain_assets where chain_id = w.chain_id and asset_key = w.asset_key;
  total := w.usd_cents + w.fee_usd_cents;
  insert into ledger_transactions (kind, idempotency_key, account_type, user_id, memo)
    values ('refund', 'withdrawal:' || w.id || ':release', a.ledger_account_type, w.user_id, 'Withdrawal hold released') returning id into tx;
  perform _post(tx, _user_account(w.user_id, 'user_locked', a.ledger_asset, a.ledger_account_type), -total);
  perform _post(tx, _user_account(w.user_id, 'user_available', a.ledger_asset, a.ledger_account_type), total);
  update crypto_withdrawals set status = p_status, release_ledger_tx_id = tx, last_error = p_reason, closed_at = now() where id = w.id;
  perform _audit(w.user_id, 'crypto_withdrawal_released', null, jsonb_build_object('withdrawal', w.id, 'status', p_status, 'reason', p_reason));
end $$;

create or replace function public.crypto_cancel_withdrawal(p_user uuid, p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare w crypto_withdrawals;
begin
  select * into w from crypto_withdrawals where id = p_id and user_id = p_user for update;
  if w is null then raise exception 'NOT_FOUND'; end if;
  if w.status not in ('PENDING','APPROVED') then raise exception 'CANNOT_CANCEL'; end if;
  perform _crypto_release(w.id, 'RELEASED', 'cancelled by user');
  return jsonb_build_object('status','RELEASED');
end $$;

create or replace function public.crypto_admin_review(p_admin uuid, p_id uuid, p_approve boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare w crypto_withdrawals;
begin
  if not has_role(p_admin, 'admin') then raise exception 'FORBIDDEN'; end if;
  select * into w from crypto_withdrawals where id = p_id for update;
  if w is null or w.status <> 'PENDING' then raise exception 'NOT_PENDING'; end if;
  if p_approve then
    update crypto_withdrawals set status = 'APPROVED', reviewed_by = p_admin, reviewed_at = now() where id = w.id;
  else
    update crypto_withdrawals set reviewed_by = p_admin, reviewed_at = now() where id = w.id;
    perform _crypto_release(w.id, 'REJECTED', 'rejected by admin');
  end if;
  perform _audit(p_admin, 'crypto_withdrawal_reviewed', null, jsonb_build_object('withdrawal', w.id, 'approve', p_approve));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.crypto_admin_set_switches(p_admin uuid, p_system boolean, p_deposits boolean, p_withdrawals boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not has_role(p_admin, 'admin') then raise exception 'FORBIDDEN'; end if;
  update crypto_settings set crypto_system_enabled = p_system, deposits_enabled = p_deposits, withdrawals_enabled = p_withdrawals, updated_at = now();
  perform _audit(p_admin, 'crypto_switches', null, jsonb_build_object('system', p_system, 'deposits', p_deposits, 'withdrawals', p_withdrawals));
  return jsonb_build_object('ok', true);
end $$;

-- worker steps
create or replace function public.crypto_next_withdrawals()
returns setof crypto_withdrawals language sql stable security definer set search_path = public as $$
  select * from crypto_withdrawals where status in ('APPROVED','SUBMITTING','SUBMITTED') order by created_at limit 10 $$;

create or replace function public.crypto_withdrawal_signed(p_id uuid, p_hash text, p_nonce bigint, p_raw text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update crypto_withdrawals set status = 'SUBMITTING', tx_hash = lower(p_hash), nonce = p_nonce, signed_raw_tx = p_raw, attempts = attempts + 1
    where id = p_id and status = 'APPROVED';
  if not found then raise exception 'NOT_APPROVED'; end if;
end $$;

create or replace function public.crypto_withdrawal_broadcast(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update crypto_withdrawals set status = 'SUBMITTED', submitted_at = coalesce(submitted_at, now()) where id = p_id and status = 'SUBMITTING';
end $$;

create or replace function public.crypto_withdrawal_confirmed(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare w crypto_withdrawals; a chain_assets; tx uuid;
begin
  select * into w from crypto_withdrawals where id = p_id for update;
  if w.status not in ('SUBMITTING','SUBMITTED') then return; end if;
  select * into a from chain_assets where chain_id = w.chain_id and asset_key = w.asset_key;
  insert into ledger_transactions (kind, idempotency_key, account_type, user_id, memo)
    values ('withdrawal', 'withdrawal:' || w.id || ':settle', a.ledger_account_type, w.user_id, 'Withdrawal sent ' || w.tx_hash) returning id into tx;
  perform _post(tx, _user_account(w.user_id, 'user_locked', a.ledger_asset, a.ledger_account_type), -(w.usd_cents + w.fee_usd_cents));
  perform _post(tx, _system_account('external_custody', a.ledger_asset, a.ledger_account_type), w.usd_cents);
  if w.fee_usd_cents > 0 then perform _post(tx, _system_account('house_revenue', a.ledger_asset, a.ledger_account_type), w.fee_usd_cents); end if;
  update crypto_withdrawals set status = 'CONFIRMED', settle_ledger_tx_id = tx, confirmed_at = now(), closed_at = now() where id = w.id;
  perform _audit(w.user_id, 'crypto_withdrawal_confirmed', null, jsonb_build_object('withdrawal', w.id, 'tx', w.tx_hash));
end $$;

-- only when the chain proves the tx failed (reverted) or its nonce was consumed by nothing of ours
create or replace function public.crypto_withdrawal_failed(p_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare w crypto_withdrawals;
begin
  select * into w from crypto_withdrawals where id = p_id for update;
  if w.status not in ('APPROVED','SUBMITTING','SUBMITTED') then return; end if;
  perform _crypto_release(w.id, 'RELEASED', left(p_reason, 500));
end $$;

create or replace function public.crypto_withdrawal_error(p_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
begin update crypto_withdrawals set last_error = left(p_reason, 500) where id = p_id; end $$;

create or replace function public.crypto_raise_incident(p_check text, p_fp text, p_details jsonb)
returns void language sql security definer set search_path = public as $$ select _crypto_incident(p_check, p_fp, p_details) $$;

-- reconciliation: on-chain treasury holdings (cents, valued by worker) vs ledger custody liability. Detect only.
create or replace function public.crypto_reconcile(p_onchain_cents bigint, p_details jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare liab bigint; pend bigint;
begin
  select coalesce(-sum(balance),0) into liab from wallet_accounts where kind = 'external_custody';
  select coalesce(sum(usd_cents),0) into pend from crypto_withdrawals where status in ('SUBMITTING','SUBMITTED');
  if p_onchain_cents + pend < liab then
    perform _crypto_incident('crypto_reconcile', 'crypto_reconcile:shortfall:' || to_char(now(),'YYYYMMDD'),
      p_details || jsonb_build_object('ledger_cents', liab, 'onchain_cents', p_onchain_cents, 'in_flight_cents', pend));
    return jsonb_build_object('ok', false, 'ledger_cents', liab, 'onchain_cents', p_onchain_cents);
  end if;
  return jsonb_build_object('ok', true, 'ledger_cents', liab, 'onchain_cents', p_onchain_cents);
end $$;

create or replace function public.crypto_my_activity(p_user uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'deposits', coalesce((select jsonb_agg(x order by x.detected_at desc) from (select id, asset_key, tx_hash, units::text units, usd_cents, status, detected_at, credited_at from crypto_deposits where user_id = p_user order by detected_at desc limit 20) x), '[]'),
    'withdrawals', coalesce((select jsonb_agg(x order by x.created_at desc) from (select id, asset_key, tx_hash, units::text units, usd_cents, fee_usd_cents, status, review_required, created_at, confirmed_at, last_error from crypto_withdrawals where user_id = p_user order by created_at desc limit 20) x), '[]'),
    'settings', (select jsonb_build_object('deposits_enabled', crypto_system_enabled and deposits_enabled, 'withdrawals_enabled', crypto_system_enabled and withdrawals_enabled, 'min_deposit_cents', min_deposit_cents, 'min_withdrawal_cents', min_withdrawal_cents, 'daily_limit_cents', daily_limit_cents, 'fee_cents', withdrawal_fee_cents, 'auto_approve_cents', auto_approve_cents) from crypto_settings),
    'treasury', (select address from chain_treasury_accounts where role = 'deposit' and is_active limit 1),
    'wallet', (select normalized_address from user_wallets where user_id = p_user and is_verified order by is_primary desc limit 1)
  ) $$;

create or replace function public.crypto_admin_overview(p_admin uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not has_role(p_admin, 'admin') then raise exception 'FORBIDDEN'; end if;
  return jsonb_build_object(
    'settings', (select to_jsonb(s) from crypto_settings s),
    'pending', coalesce((select jsonb_agg(x) from (select w.id, w.asset_key, w.usd_cents, w.to_address, w.status, w.created_at, p.username from crypto_withdrawals w join profiles p on p.id = w.user_id where w.status in ('PENDING','APPROVED','SUBMITTING','SUBMITTED') order by w.created_at) x), '[]'),
    'unmatched', coalesce((select jsonb_agg(x) from (select id, asset_key, tx_hash, from_address, units::text units, usd_cents, detected_at from crypto_deposits where status = 'UNMATCHED' order by detected_at desc limit 50) x), '[]'),
    'custody_cents', (select coalesce(-sum(balance),0) from wallet_accounts where kind = 'external_custody'),
    'incidents', coalesce((select jsonb_agg(x) from (select check_name, details, last_seen_at, occurrences from integrity_incidents where check_name like 'crypto%' order by last_seen_at desc limit 20) x), '[]')
  );
end $$;

do $$ declare f text; begin
  for f in select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and (p.proname like 'crypto\_%' or p.proname in ('_crypto_incident','_crypto_release'))
      and p.proname not in ('crypto_allowlist_guard','crypto_deposit_guard','crypto_withdrawal_guard')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;
