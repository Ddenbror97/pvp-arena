-- Treasury liquidity reservations for withdrawals.
-- Player balances stay one USD ledger: any supported asset can be chosen for a withdrawal, whatever
-- was deposited. Which asset can actually be sent depends on the payout wallet that holds it:
--   total     = latest observed payout-wallet balance (EVM: crypto_chain_inventory, written by the
--               withdrawal worker each minute; Bitcoin: the BTCPay payout store wallet)
--   reserved  = sum of RESERVED reservations for open withdrawals of that asset
--   available = total - reserved - min_reserve
-- A withdrawal is accepted only if its exact asset amount fits in available, decided under a row lock
-- on the asset so two requests can never reserve the same funds. A reading older than 10 minutes
-- counts as no reading. The reservation is released exactly once when the withdrawal is rejected,
-- cancelled or fails, and consumed when it is confirmed. Existing statuses, the LIQUIDITY_PENDING
-- queue and the worker's live balance checks are unchanged.

create table public.treasury_assets (
  network text not null,
  asset_key text not null,
  decimals smallint not null check (decimals between 0 and 36),
  min_reserve_units numeric(40,0) not null default 0 check (min_reserve_units >= 0),
  balance_units numeric(40,0) check (balance_units >= 0),
  price_micro_usd bigint check (price_micro_usd > 0),
  observed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (network, asset_key),
  constraint treasury_assets_network_check check (network = 'bitcoin' or network ~ '^eip155:[0-9]+$')
);
alter table public.treasury_assets enable row level security;
revoke all on public.treasury_assets from public, anon, authenticated;
grant all on public.treasury_assets to service_role;
create trigger no_truncate before truncate on public.treasury_assets for each statement execute function public._no_truncate();

-- Base ETH keeps the 0.00005 ETH gas reserve the request and worker already hold back.
insert into public.treasury_assets (network, asset_key, decimals, min_reserve_units)
select 'eip155:' || chain_id, asset_key, decimals,
  case when chain_id = 8453 and asset_key = 'ETH' then 50000000000000 else 0 end
from public.chain_assets;
insert into public.treasury_assets (network, asset_key, decimals) values ('bitcoin', 'BTC', 8);

create table public.treasury_reservations (
  id uuid primary key default gen_random_uuid(),
  network text not null,
  asset_key text not null,
  user_id uuid not null references public.profiles (id),
  withdrawal_id uuid unique references public.crypto_withdrawals (id),
  btc_payout_id uuid unique references public.btcpay_payouts (id),
  usd_cents bigint not null check (usd_cents > 0),
  units numeric(40,0) not null check (units > 0),
  price_micro_usd bigint not null check (price_micro_usd > 0),
  status text not null default 'RESERVED' check (status in ('RESERVED', 'RELEASED', 'CONSUMED')),
  created_at timestamptz not null default clock_timestamp(),
  closed_at timestamptz,
  foreign key (network, asset_key) references public.treasury_assets (network, asset_key),
  constraint treasury_reservations_one_withdrawal check ((withdrawal_id is null) <> (btc_payout_id is null)),
  constraint treasury_reservations_closed check ((status = 'RESERVED') = (closed_at is null))
);
create index treasury_reservations_open_idx on public.treasury_reservations (network, asset_key) where status = 'RESERVED';
create index treasury_reservations_user_idx on public.treasury_reservations (user_id, created_at desc);
alter table public.treasury_reservations enable row level security;
revoke all on public.treasury_reservations from public, anon, authenticated;
grant all on public.treasury_reservations to service_role;

-- A reservation only ever moves RESERVED -> RELEASED or RESERVED -> CONSUMED, once.
create or replace function public._treasury_reservation_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then raise exception 'IMMUTABLE' using errcode = '42501'; end if;
  if old.status <> 'RESERVED' or new.status not in ('RELEASED', 'CONSUMED')
     or new.id <> old.id or new.network <> old.network or new.asset_key <> old.asset_key or new.user_id <> old.user_id
     or new.withdrawal_id is distinct from old.withdrawal_id or new.btc_payout_id is distinct from old.btc_payout_id
     or new.usd_cents <> old.usd_cents or new.units <> old.units or new.price_micro_usd <> old.price_micro_usd
     or new.created_at <> old.created_at then
    raise exception 'IMMUTABLE' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function public._treasury_reservation_guard() from public, anon, authenticated;
create trigger guard before update or delete on public.treasury_reservations
  for each row execute function public._treasury_reservation_guard();
create trigger no_truncate before truncate on public.treasury_reservations for each statement execute function public._no_truncate();

-- Open withdrawals at deploy time keep their funds reserved. Production had none.
insert into public.treasury_reservations (network, asset_key, user_id, withdrawal_id, usd_cents, units, price_micro_usd, created_at)
select 'eip155:' || w.chain_id, w.asset_key, w.user_id, w.id, w.usd_cents, w.units,
  coalesce(q.price_micro_usd, case when a.settlement_kind = 'erc20' then (a.usd_per_unit * 1000000)::bigint end,
    greatest(1, floor(w.usd_cents::numeric * 10000 * power(10::numeric, a.decimals) / w.units))::bigint),
  w.created_at
from public.crypto_withdrawals w
join public.chain_assets a on a.chain_id = w.chain_id and a.asset_key = w.asset_key
left join public.crypto_withdrawal_quotes q on q.id = w.quote_id
where w.status in ('PENDING', 'HELD', 'APPROVED', 'LIQUIDITY_PENDING', 'SUBMITTING', 'SUBMITTED');
do $$
begin
  if exists (select 1 from public.btcpay_payouts where status in ('HOLD', 'AWAITING_APPROVAL', 'QUEUED')) then
    raise exception 'OPEN_BTC_PAYOUTS_NEED_RESERVATION';
  end if;
end $$;

-- EVM payout-wallet balances come from the worker's inventory reading.
create or replace function public._treasury_from_inventory()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update treasury_assets
    set balance_units = new.payout_wei, price_micro_usd = new.eth_price_micro_usd, observed_at = new.observed_at, updated_at = now()
    where network = 'eip155:' || new.chain_id and asset_key = 'ETH';
  update treasury_assets
    set balance_units = new.payout_usdc_units, price_micro_usd = 1000000, observed_at = new.observed_at, updated_at = now()
    where network = 'eip155:' || new.chain_id and asset_key = 'USDC';
  return null;
end $$;
revoke all on function public._treasury_from_inventory() from public, anon, authenticated;
create trigger treasury_balance after insert or update on public.crypto_chain_inventory
  for each row execute function public._treasury_from_inventory();
update public.treasury_assets t
  set balance_units = i.payout_wei, price_micro_usd = i.eth_price_micro_usd, observed_at = i.observed_at
  from public.crypto_chain_inventory i
  where t.network = 'eip155:' || i.chain_id and t.asset_key = 'ETH';
update public.treasury_assets t
  set balance_units = i.payout_usdc_units, price_micro_usd = 1000000, observed_at = i.observed_at
  from public.crypto_chain_inventory i
  where t.network = 'eip155:' || i.chain_id and t.asset_key = 'USDC';

-- Bitcoin: the BTCPay payout store's confirmed wallet balance and BTCPay's BTC/USD rate.
create or replace function public.treasury_record_btc(p_sats numeric, p_price_micro bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._require_server_caller();
  if p_sats is null or p_sats < 0 or p_sats <> trunc(p_sats) then raise exception 'BAD_BALANCE'; end if;
  if p_price_micro is null or p_price_micro <= 0 then raise exception 'PRICE_NOT_POSITIVE'; end if;
  update treasury_assets set balance_units = p_sats, price_micro_usd = p_price_micro, observed_at = now(), updated_at = now()
    where network = 'bitcoin' and asset_key = 'BTC';
end $$;
revoke all on function public.treasury_record_btc(numeric, bigint) from public, anon, authenticated;
grant execute on function public.treasury_record_btc(numeric, bigint) to service_role;

-- Price used to size a reservation from USD cents. Native EVM assets use the same fresh Chainlink
-- snapshot rule as crypto_quote_withdrawal; a missing or stale price means no estimate.
create or replace function public._treasury_price(p_network text, p_asset text)
returns bigint language plpgsql stable security definer set search_path = public as $$
declare a chain_assets; ps crypto_price_snapshots; t treasury_assets; s crypto_settings; chain bigint;
begin
  if p_network = 'bitcoin' then
    select * into t from treasury_assets where network = p_network and asset_key = p_asset;
    if t.observed_at is null or t.observed_at < now() - interval '10 minutes' then return null; end if;
    return t.price_micro_usd;
  end if;
  chain := substr(p_network, 8)::bigint;
  select * into a from chain_assets where chain_id = chain and asset_key = p_asset;
  if a is null then return null; end if;
  if a.settlement_kind = 'erc20' then return (a.usd_per_unit * 1000000)::bigint; end if;
  select * into s from crypto_settings;
  select * into ps from crypto_price_snapshots where chain_id = chain and asset_key = p_asset order by observed_at desc limit 1;
  if ps is null or ps.price_micro_usd <= 0
     or ps.observed_at < now() - make_interval(secs => s.price_max_age_seconds)
     or ps.oracle_updated_at < now() - interval '1320 seconds' then
    return null;
  end if;
  return ps.price_micro_usd;
end $$;
revoke all on function public._treasury_price(text, text) from public, anon, authenticated;

-- Liquidity per asset. Null available means no fresh reading.
create or replace function public._treasury_state(p_network text, p_asset text)
returns table (balance_units numeric, reserved_units numeric, min_reserve_units numeric, available_units numeric, observed_at timestamptz)
language sql stable security definer set search_path = public as $$
  select t.balance_units,
    coalesce(r.units, 0),
    t.min_reserve_units,
    case when t.balance_units is null or t.observed_at is null or t.observed_at < now() - interval '10 minutes' then null
      else t.balance_units - coalesce(r.units, 0) - t.min_reserve_units end,
    t.observed_at
  from treasury_assets t
  left join lateral (
    select sum(x.units) as units from treasury_reservations x
    where x.network = t.network and x.asset_key = t.asset_key and x.status = 'RESERVED'
  ) r on true
  where t.network = p_network and t.asset_key = p_asset;
$$;
revoke all on function public._treasury_state(text, text) from public, anon, authenticated;

-- Whether the asset can currently fund a withdrawal of p_cents. Used for UI availability only;
-- the request path decides again under the lock.
create or replace function public.treasury_can_fund_cents(p_network text, p_asset text, p_cents bigint)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare avail numeric; price bigint; dec smallint; need numeric;
begin
  if p_cents is null or p_cents <= 0 then return false; end if;
  select st.available_units into avail from public._treasury_state(p_network, p_asset) st;
  if avail is null then return false; end if;
  price := public._treasury_price(p_network, p_asset);
  if price is null then return false; end if;
  select decimals into dec from treasury_assets where network = p_network and asset_key = p_asset;
  need := ceil(p_cents::numeric * 10000 * power(10::numeric, dec) / price);
  return avail >= need;
end $$;
revoke all on function public.treasury_can_fund_cents(text, text, bigint) from public, anon, authenticated;
grant execute on function public.treasury_can_fund_cents(text, text, bigint) to service_role;

-- Reserves treasury funds for one withdrawal. Null units/price means: size from p_cents at the
-- treasury's own price (Bitcoin). Raises instead of reserving less.
create or replace function public._treasury_reserve(p_network text, p_asset text, p_user uuid,
  p_withdrawal uuid, p_payout uuid, p_cents bigint, p_units numeric, p_price bigint)
returns uuid language plpgsql security definer set search_path = public as $$
declare t treasury_assets; reserved numeric; units numeric := p_units; price bigint := p_price; rid uuid;
begin
  select * into t from treasury_assets where network = p_network and asset_key = p_asset for update;
  if t is null or t.balance_units is null or t.observed_at is null or t.observed_at < now() - interval '10 minutes' then
    raise exception 'TREASURY_UNAVAILABLE';
  end if;
  if units is null then
    price := t.price_micro_usd;
    if price is null then raise exception 'TREASURY_UNAVAILABLE'; end if;
    units := ceil(p_cents::numeric * 10000 * power(10::numeric, t.decimals) / price);
  end if;
  if units is null or units <= 0 or units <> trunc(units) or price is null or price <= 0 then raise exception 'BAD_RESERVATION'; end if;
  select coalesce(sum(x.units), 0) into reserved from treasury_reservations x
    where x.network = p_network and x.asset_key = p_asset and x.status = 'RESERVED';
  if t.balance_units - reserved - t.min_reserve_units < units then raise exception 'TREASURY_LIQUIDITY'; end if;
  insert into treasury_reservations (network, asset_key, user_id, withdrawal_id, btc_payout_id, usd_cents, units, price_micro_usd)
    values (p_network, p_asset, p_user, p_withdrawal, p_payout, p_cents, units, price)
    returning id into rid;
  return rid;
end $$;
revoke all on function public._treasury_reserve(text, text, uuid, uuid, uuid, bigint, numeric, bigint) from public, anon, authenticated;

-- Release on rejection, cancellation or failure; consume on confirmation. The status = 'RESERVED'
-- filter makes both exactly-once.
create or replace function public._treasury_on_withdrawal()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status in ('REJECTED', 'RELEASED', 'FAILED') then
    update treasury_reservations set status = 'RELEASED', closed_at = clock_timestamp() where withdrawal_id = new.id and status = 'RESERVED';
  elsif new.status = 'CONFIRMED' then
    update treasury_reservations set status = 'CONSUMED', closed_at = clock_timestamp() where withdrawal_id = new.id and status = 'RESERVED';
  end if;
  return null;
end $$;
revoke all on function public._treasury_on_withdrawal() from public, anon, authenticated;
create trigger treasury_reservation after update of status on public.crypto_withdrawals
  for each row when (new.status is distinct from old.status) execute function public._treasury_on_withdrawal();

create or replace function public._treasury_on_btc_payout()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status in ('CANCELLED', 'FAILED') then
    update treasury_reservations set status = 'RELEASED', closed_at = clock_timestamp() where btc_payout_id = new.id and status = 'RESERVED';
  elsif new.status = 'COMPLETED' then
    update treasury_reservations set status = 'CONSUMED', closed_at = clock_timestamp() where btc_payout_id = new.id and status = 'RESERVED';
  end if;
  return null;
end $$;
revoke all on function public._treasury_on_btc_payout() from public, anon, authenticated;
create trigger treasury_reservation after update of status on public.btcpay_payouts
  for each row when (new.status is distinct from old.status) execute function public._treasury_on_btc_payout();

-- Every withdrawal row must commit together with a reservation of its exact amount.
create or replace function public._treasury_require_reservation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'crypto_withdrawals' then
    if not exists (select 1 from treasury_reservations r where r.withdrawal_id = new.id
        and r.network = 'eip155:' || new.chain_id and r.asset_key = new.asset_key and r.units = new.units) then
      raise exception 'WITHDRAWAL_UNRESERVED';
    end if;
  elsif not exists (select 1 from treasury_reservations r where r.btc_payout_id = new.id and r.usd_cents = new.usd_cents) then
    raise exception 'WITHDRAWAL_UNRESERVED';
  end if;
  return null;
end $$;
revoke all on function public._treasury_require_reservation() from public, anon, authenticated;
create constraint trigger treasury_reserved after insert on public.crypto_withdrawals
  deferrable initially deferred for each row execute function public._treasury_require_reservation();
create constraint trigger treasury_reserved after insert on public.btcpay_payouts
  deferrable initially deferred for each row execute function public._treasury_require_reservation();

-- Treasury reservation added after the withdrawal row. The rest is unchanged from 20260928210000.
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

-- Treasury reservation added after the payout row. The rest is unchanged from 20260928210000.
create or replace function public.btcpay_request_payout(p_user uuid, p_usd_cents bigint, p_address text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare s crypto_settings;
  avail uuid; locked uuid; bal bigint; tx uuid; pid uuid := gen_random_uuid();
  total bigint; used bigint; used_global bigint;
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
  insert into btcpay_payouts (id, user_id, usd_cents, fee_usd_cents, address, status, hold_ledger_tx_id)
    values (pid, p_user, p_usd_cents, s.withdrawal_fee_cents, p_address, 'HOLD', tx);
  perform public._treasury_reserve('bitcoin', 'BTC', p_user, null, pid, p_usd_cents, null, null);
  perform _audit(p_user, 'btcpay_payout_requested', null, jsonb_build_object('payout', pid, 'cents', p_usd_cents));
  return jsonb_build_object('id', pid, 'status', 'HOLD');
end $$;
revoke all on function public.btcpay_request_payout(uuid, bigint, text) from public, anon, authenticated;
grant execute on function public.btcpay_request_payout(uuid, bigint, text) to service_role;

-- payout_ready now means the treasury can fund at least the network minimum right now, for every
-- asset. The rest is unchanged from 20260928180000.
create or replace function public.crypto_my_activity(p_user uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'deposits', coalesce((select jsonb_agg(x order by x.detected_at desc) from (
      select d.id, d.chain_id, d.asset_key, d.tx_hash, d.units::text as units, d.usd_cents, d.status, d.detected_at, d.credited_at, a.decimals
      from crypto_deposits d
      left join chain_assets a on a.chain_id = d.chain_id and a.asset_key = d.asset_key
      where d.user_id = p_user
      order by d.detected_at desc limit 20
    ) x), '[]'),
    'withdrawals', coalesce((select jsonb_agg(x order by x.created_at desc) from (
      select w.id, w.chain_id, w.asset_key, w.tx_hash, w.units::text as units, w.usd_cents, w.fee_usd_cents, w.status, w.review_required, w.created_at, w.confirmed_at, w.last_error, a.decimals
      from crypto_withdrawals w
      left join chain_assets a on a.chain_id = w.chain_id and a.asset_key = w.asset_key
      where w.user_id = p_user
      order by w.created_at desc limit 20
    ) x), '[]'),
    'bitcoin', coalesce((select jsonb_agg(x order by x.created_at desc) from (
      select b.id, b.usd_cents, b.status, b.created_at, b.btc_due, b.required_confirmations
      from btcpay_invoices b
      where b.user_id = p_user
      order by b.created_at desc limit 20
    ) x), '[]'),
    'bitcoin_payouts', coalesce((select jsonb_agg(x order by x.created_at desc) from (
      select p.id, p.usd_cents, p.status, p.created_at, p.address
      from btcpay_payouts p
      where p.user_id = p_user
      order by p.created_at desc limit 20
    ) x), '[]'),
    'settings', (select jsonb_build_object('deposits_enabled', crypto_system_enabled and deposits_enabled, 'withdrawals_enabled', crypto_system_enabled and withdrawals_enabled, 'min_deposit_cents', min_deposit_cents, 'min_withdrawal_cents', min_withdrawal_cents, 'daily_limit_cents', daily_limit_cents, 'fee_cents', withdrawal_fee_cents, 'auto_approve_cents', auto_approve_cents) from crypto_settings),
    'chains', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'chain_id', n.chain_id,
          'name', n.name,
          'network_mode', n.network_mode,
          'min_deposit_cents', n.min_deposit_cents,
          'min_withdrawal_cents', n.min_withdrawal_cents,
          'credit_confirmations', n.credit_confirmations,
          'assets', coalesce((
            select jsonb_agg(jsonb_build_object(
              'asset_key', a.asset_key,
              'display_name', a.display_name,
              'decimals', a.decimals,
              'settlement_kind', a.settlement_kind,
              'payout_ready', public.treasury_can_fund_cents('eip155:' || n.chain_id, a.asset_key, n.min_withdrawal_cents)
            ) order by a.asset_key)
            from chain_assets a
            where a.chain_id = n.chain_id and a.is_enabled
          ), '[]'::jsonb)
        )
        order by n.chain_id
      )
      from chain_networks n
      where n.is_enabled
    ), '[]'::jsonb),
    'deposit_addresses', coalesce((select jsonb_agg(jsonb_build_object('chain_id', da.chain_id, 'address', da.address)) from crypto_deposit_addresses da where da.user_id = p_user), '[]'),
    'wallet', (select normalized_address from user_wallets where user_id = p_user and is_verified order by is_primary desc limit 1)
  ) $$;

-- Admin view of treasury liquidity per asset, in units and USD cents.
create or replace function public.crypto_admin_treasury(p_admin uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform public._require_server_caller();
  if not has_role(p_admin, 'admin') then raise exception 'FORBIDDEN'; end if;
  return coalesce((select jsonb_agg(x order by x.network, x.asset_key) from (
    select t.network, t.asset_key, t.decimals,
      st.balance_units::text as total_units, st.reserved_units::text as reserved_units,
      st.min_reserve_units::text as min_reserve_units, st.available_units::text as available_units,
      p.price as price_micro_usd,
      case when p.price is null or st.balance_units is null then null else floor(st.balance_units * p.price / power(10::numeric, t.decimals) / 10000)::bigint end as total_cents,
      case when p.price is null then null else floor(st.reserved_units * p.price / power(10::numeric, t.decimals) / 10000)::bigint end as reserved_cents,
      case when p.price is null or st.available_units is null then null else floor(st.available_units * p.price / power(10::numeric, t.decimals) / 10000)::bigint end as available_cents,
      st.observed_at,
      st.available_units is not null as fresh
    from treasury_assets t
    cross join lateral public._treasury_state(t.network, t.asset_key) st
    cross join lateral (select public._treasury_price(t.network, t.asset_key) as price) p
    where t.network = 'bitcoin'
      or exists (select 1 from chain_assets a join chain_networks n on n.chain_id = a.chain_id
                 where 'eip155:' || a.chain_id = t.network and a.asset_key = t.asset_key and a.is_enabled and n.is_enabled)
  ) x), '[]'::jsonb);
end $$;
revoke all on function public.crypto_admin_treasury(uuid) from public, anon, authenticated;
grant execute on function public.crypto_admin_treasury(uuid) to service_role;

create or replace function public.crypto_admin_set_min_reserve(p_admin uuid, p_network text, p_asset text, p_units numeric)
returns jsonb language plpgsql security definer set search_path = public as $$
declare prev numeric;
begin
  perform public._require_server_caller();
  if not has_role(p_admin, 'admin') then raise exception 'FORBIDDEN'; end if;
  if p_units is null or p_units < 0 or p_units <> trunc(p_units) then raise exception 'BAD_AMOUNT'; end if;
  select min_reserve_units into prev from treasury_assets where network = p_network and asset_key = p_asset for update;
  if not found then raise exception 'ASSET_NOT_ALLOWLISTED'; end if;
  update treasury_assets set min_reserve_units = p_units, updated_at = now() where network = p_network and asset_key = p_asset;
  perform _audit(p_admin, 'treasury_min_reserve', null, jsonb_build_object('network', p_network, 'asset', p_asset, 'from', prev::text, 'to', p_units::text));
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.crypto_admin_set_min_reserve(uuid, text, text, numeric) from public, anon, authenticated;
grant execute on function public.crypto_admin_set_min_reserve(uuid, text, text, numeric) to service_role;
