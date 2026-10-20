-- House-funded bot opponents.
--
-- Bots are labeled automated accounts. They are not players, they are not counted
-- as online humans, and their chips are not a withdrawable balance.
--
-- bot_bankroll starts at zero and the feature flags stay off. Nothing in this
-- migration moves money into it. bot_allocate_from_revenue is service-role only
-- and spends collected house_revenue; do not call it, and do not turn the flags
-- on, until that use of fee reserves is explicitly approved. Promo house_bankroll
-- is not a source.

alter table public.profiles
  add column if not exists is_bot boolean not null default false,
  add column if not exists bot_style text;

alter table public.profiles drop constraint if exists profiles_bot_style_chk;
alter table public.profiles add constraint profiles_bot_style_chk check (
  (is_bot and bot_style in ('casual', 'standard', 'competitive'))
  or (not is_bot and bot_style is null)
);

grant select (is_bot) on public.profiles to anon, authenticated;

create or replace function public._profiles_bot_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.is_bot and current_setting('pvp.bot_admin', true) is distinct from 'on' then
      raise exception 'BOT_IDENTITY_LOCKED';
    end if;
  elsif new.is_bot is distinct from old.is_bot
     or (old.is_bot and (new.bot_style is distinct from old.bot_style or new.username is distinct from old.username)) then
    if current_setting('pvp.bot_admin', true) is distinct from 'on' then
      raise exception 'BOT_IDENTITY_LOCKED';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists profiles_bot_guard on public.profiles;
create trigger profiles_bot_guard
  before insert or update on public.profiles
  for each row execute function public._profiles_bot_guard();

create table if not exists public.bot_config (
  id boolean primary key default true check (id),
  enabled boolean not null default false,
  coinflip_enabled boolean not null default false,
  poker_enabled boolean not null default false,
  max_exposure_cents bigint not null default 0 check (max_exposure_cents >= 0),
  max_bots_per_table int not null default 3 check (max_bots_per_table between 0 and 5),
  call_rate_limit int not null default 6 check (call_rate_limit > 0),
  call_rate_window_seconds int not null default 60 check (call_rate_window_seconds > 0)
);
insert into public.bot_config (id) values (true) on conflict (id) do nothing;
alter table public.bot_config enable row level security;
revoke all on public.bot_config from public, anon, authenticated;
grant all on public.bot_config to service_role;

create table if not exists public.bot_calls (
  user_id uuid not null references public.profiles (id),
  idempotency_key text not null,
  game text not null check (game in ('coinflip', 'poker')),
  result jsonb not null,
  created_at timestamptz not null default clock_timestamp(),
  primary key (user_id, idempotency_key)
);
alter table public.bot_calls enable row level security;
revoke all on public.bot_calls from public, anon, authenticated;
grant all on public.bot_calls to service_role;

create table if not exists public.bot_chains (
  user_id uuid primary key references public.profiles (id),
  links text[] not null,
  cursor int not null default 1 check (cursor >= 1)
);
alter table public.bot_chains enable row level security;
revoke all on public.bot_chains from public, anon, authenticated;
grant all on public.bot_chains to service_role;

create or replace function public.bot_seed_identities()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('pvp.bot_admin', 'on', true);
  insert into public.profiles (id, username, avatar_url, age_confirmed_at, is_bot, bot_style)
  values
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', 'RiverBot', 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=RiverBot', clock_timestamp(), true, 'standard'),
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02', 'AceBot', 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=AceBot', clock_timestamp(), true, 'standard'),
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa03', 'BluffBot', 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=BluffBot', clock_timestamp(), true, 'standard'),
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa04', 'ChipBot', 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=ChipBot', clock_timestamp(), true, 'standard')
  on conflict (id) do nothing;
end $$;
revoke all on function public.bot_seed_identities() from public, anon, authenticated;

select public.bot_seed_identities();

-- The account exists at zero. Creating it does not mint spendable chips.
select public._system_account('bot_bankroll', 'USD', 'real');
select public._system_account('bot_bankroll', 'TEST_USD', 'test_credit');

create or replace function public.bot_public_config()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'coinflip', enabled and coinflip_enabled,
    'poker', enabled and poker_enabled
  )
  from public.bot_config
$$;
revoke all on function public.bot_public_config() from public;
grant execute on function public.bot_public_config() to anon, authenticated, service_role;

create or replace function public._bot_ensure_wallets(p_user uuid, p_asset text, p_type text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.wallet_accounts (owner_id, kind, asset, account_type)
  select p_user, k.kind, p_asset, p_type
  from (values ('user_available'::public.account_kind), ('user_locked'::public.account_kind)) as k(kind)
  where not exists (
    select 1 from public.wallet_accounts w
    where w.owner_id = p_user and w.kind = k.kind and w.asset = p_asset and w.account_type = p_type
  );
end $$;
revoke all on function public._bot_ensure_wallets(uuid, text, text) from public, anon, authenticated;

create or replace function public._bot_exposure(p_asset text, p_type text)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(w.balance), 0)
  from public.wallet_accounts w
  join public.profiles p on p.id = w.owner_id and p.is_bot
  where w.kind in ('user_available', 'user_locked')
    and w.asset = p_asset and w.account_type = p_type
$$;
revoke all on function public._bot_exposure(text, text) from public, anon, authenticated;

-- Move stake from the house bot bankroll onto the bot's available balance.
-- The existing game entry then locks it. No new chips are created.
create or replace function public._bot_fund(p_user uuid, p_amount bigint, p_asset text, p_type text, p_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare bank_bal bigint; exposure bigint; cap bigint; bank uuid; avail uuid; tx uuid;
begin
  if p_amount is null or p_amount <= 0 then raise exception 'INVALID_AMOUNT'; end if;
  if not exists (select 1 from public.profiles where id = p_user and is_bot) then
    raise exception 'NOT_A_BOT';
  end if;
  perform pg_advisory_xact_lock(hashtext('bot-fund:' || p_user::text));
  perform public._bot_ensure_wallets(p_user, p_asset, p_type);
  perform public._coinflip_lock_wallets(array[p_user], p_asset, p_type);
  perform public._lock_system_accounts(array['bot_bankroll']::public.account_kind[], p_asset, p_type);
  bank := public._system_account('bot_bankroll', p_asset, p_type);
  select balance into bank_bal from public.wallet_accounts where id = bank;
  if coalesce(bank_bal, 0) < p_amount then raise exception 'BOT_UNFUNDED'; end if;
  select max_exposure_cents into cap from public.bot_config;
  exposure := public._bot_exposure(p_asset, p_type);
  if exposure + p_amount > coalesce(cap, 0) then raise exception 'BOT_EXPOSURE_LIMIT'; end if;
  avail := public._user_account(p_user, 'user_available', p_asset, p_type);
  insert into public.ledger_transactions (kind, idempotency_key, account_type, user_id, memo)
    values ('bot_fund', p_key, p_type, p_user, 'House bot stake')
    returning id into tx;
  perform public._post(tx, bank, -p_amount);
  perform public._post(tx, avail, p_amount);
end $$;
revoke all on function public._bot_fund(uuid, bigint, text, text, text) from public, anon, authenticated;

-- Pull any available bot balance back to the house bot bankroll.
create or replace function public._bot_sweep(p_user uuid, p_asset text, p_type text, p_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare bal bigint; avail uuid; bank uuid; tx uuid;
begin
  if p_user is null or not exists (select 1 from public.profiles where id = p_user and is_bot) then
    return;
  end if;
  avail := public._user_account(p_user, 'user_available', p_asset, p_type);
  if avail is null then return; end if;
  perform public._coinflip_lock_wallets(array[p_user], p_asset, p_type);
  perform public._lock_system_accounts(array['bot_bankroll']::public.account_kind[], p_asset, p_type);
  select balance into bal from public.wallet_accounts where id = avail;
  if coalesce(bal, 0) <= 0 then return; end if;
  bank := public._system_account('bot_bankroll', p_asset, p_type);
  insert into public.ledger_transactions (kind, idempotency_key, account_type, user_id, memo)
    values ('bot_sweep', p_key, p_type, p_user, 'Return bot balance to house bot bankroll')
    returning id into tx;
  perform public._post(tx, avail, -bal);
  perform public._post(tx, bank, bal);
end $$;
revoke all on function public._bot_sweep(uuid, text, text, text) from public, anon, authenticated;

-- Books an approved transfer of collected fees into the bot bankroll.
-- Starts nothing by itself: flags stay off and this function is not called here.
create or replace function public.bot_allocate_from_revenue(p_amount bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare bal bigint; tx uuid; revenue uuid; bank uuid;
begin
  perform public._require_server_caller();
  if p_amount is null or p_amount <= 0 then raise exception 'INVALID_AMOUNT'; end if;
  perform public._lock_system_accounts(array['bot_bankroll', 'house_revenue']::public.account_kind[], 'USD', 'real');
  revenue := public._system_account('house_revenue', 'USD', 'real');
  bank := public._system_account('bot_bankroll', 'USD', 'real');
  select balance into bal from public.wallet_accounts where id = revenue;
  if coalesce(bal, 0) < p_amount then raise exception 'BOT_UNFUNDED'; end if;
  insert into public.ledger_transactions (kind, idempotency_key, account_type, memo)
    values ('bot_fund', 'bot:allocate:' || gen_random_uuid()::text, 'real', 'Allocate house fees to bot bankroll')
    returning id into tx;
  perform public._post(tx, revenue, -p_amount);
  perform public._post(tx, bank, p_amount);
  perform public._audit(null, 'bot_bankroll_allocated', null, jsonb_build_object('amount', p_amount, 'ledger_tx', tx));
  return jsonb_build_object('ok', true, 'amount', p_amount, 'ledger_tx', tx);
end $$;
revoke all on function public.bot_allocate_from_revenue(bigint) from public, anon, authenticated;
grant execute on function public.bot_allocate_from_revenue(bigint) to service_role;

-- Latest _assert_reward_holds, plus a hard block for bot accounts.
create or replace function public._assert_reward_holds(p_user uuid, p_balance bigint, p_total bigint)
returns void language plpgsql volatile security definer set search_path = public as $$
declare
  referral_hold bigint;
  promo_hold bigint;
  prize_hold bigint;
  partner_hold bigint;
  profit_hold bigint;
  b0 bigint;
  bal bigint;
  basis jsonb;
  cash bigint;
  room bigint;
begin
  if exists (select 1 from public.profiles where id = p_user and is_bot) then
    raise exception 'BOT_NOT_WITHDRAWABLE';
  end if;
  if public._is_active_partner(p_user) then raise exception 'PARTNER_WITHDRAWAL_BLOCKED'; end if;
  referral_hold := public.referral_unplayed_reward_cents(p_user);
  promo_hold := public.promo_restricted_cents(p_user);
  prize_hold := public.leaderboard_prize_restricted_cents(p_user);
  partner_hold := public._partner_release_block(p_user, p_balance);
  profit_hold := public._partner_profit_hold(p_user);
  if p_balance - referral_hold - promo_hold - prize_hold - partner_hold - profit_hold >= p_total then
    null;
  elsif profit_hold > 0 and p_balance - referral_hold - promo_hold - prize_hold - partner_hold >= p_total then
    raise exception 'PARTNER_PROFIT_REVIEW';
  else
    b0 := p_balance - profit_hold;
    if partner_hold > 0 and b0 - referral_hold - promo_hold - prize_hold >= p_total then
      raise exception 'PARTNER_FUNDS_HELD';
    end if;
    bal := b0 - partner_hold;
    if promo_hold > 0 and bal - referral_hold - prize_hold >= p_total then
      raise exception 'PROMO_PLAYTHROUGH';
    end if;
    if prize_hold > 0 and bal - referral_hold - promo_hold >= p_total then
      raise exception 'LEADERBOARD_PLAYTHROUGH';
    end if;
    if referral_hold > 0 and bal - promo_hold - prize_hold >= p_total then
      raise exception 'REFERRAL_PLAYTHROUGH';
    end if;
    if promo_hold > 0 then raise exception 'PROMO_PLAYTHROUGH'; end if;
    if prize_hold > 0 then raise exception 'LEADERBOARD_PLAYTHROUGH'; end if;
    if referral_hold > 0 then raise exception 'REFERRAL_PLAYTHROUGH'; end if;
    if partner_hold > 0 then raise exception 'PARTNER_FUNDS_HELD'; end if;
    raise exception 'PARTNER_PROFIT_REVIEW';
  end if;
  basis := public._withdraw_basis(p_user);
  cash := coalesce((basis->>'cash')::bigint, 0);
  room := coalesce((basis->>'room')::bigint, 0);
  if p_total > cash then
    raise exception 'BONUS_NOT_WITHDRAWABLE';
  end if;
  if p_total > room then
    raise exception 'DEPOSIT_WAGER_REQUIRED';
  end if;
end $$;
revoke all on function public._assert_reward_holds(uuid, bigint, bigint) from public, anon, authenticated;

create or replace function public.crypto_quote_withdrawal(p_user uuid, p_chain bigint, p_usd_cents bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s crypto_settings; net chain_networks; ps crypto_price_snapshots; wei numeric; q crypto_withdrawal_quotes;
  basis jsonb; cash bigint; room bigint;
begin
  perform public._require_server_caller();
  if exists (select 1 from public.profiles where id = p_user and is_bot) then
    raise exception 'BOT_NOT_WITHDRAWABLE';
  end if;
  select * into s from crypto_settings;
  select * into net from chain_networks where chain_id = p_chain and is_enabled;
  if net is null then raise exception 'CHAIN_DISABLED'; end if;
  if not exists (
    select 1 from chain_assets where chain_id = p_chain and asset_key = 'ETH' and is_enabled and settlement_kind = 'native'
  ) then
    raise exception 'ASSET_NOT_ALLOWLISTED';
  end if;
  if p_usd_cents < net.min_withdrawal_cents then raise exception 'BELOW_MINIMUM'; end if;
  basis := public._withdraw_basis(p_user);
  cash := coalesce((basis->>'cash')::bigint, 0);
  room := coalesce((basis->>'room')::bigint, 0);
  if p_usd_cents > cash then raise exception 'BONUS_NOT_WITHDRAWABLE'; end if;
  if p_usd_cents > room then raise exception 'DEPOSIT_WAGER_REQUIRED'; end if;
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
revoke all on function public.crypto_quote_withdrawal(uuid, bigint, bigint) from public, anon, authenticated;

-- Custody identity now includes the bot bankroll. At a zero balance the check is unchanged.
create or replace function public.money_real_invariants()
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  with acc as (
    select
      coalesce(sum(balance) filter (where kind = 'external_custody'),0) custody,
      coalesce(sum(balance) filter (where kind = 'user_available'),0) avail,
      coalesce(sum(balance) filter (where kind = 'user_locked'),0) locked,
      coalesce(sum(balance) filter (where kind = 'game_escrow'),0) escrow,
      coalesce(sum(balance) filter (where kind = 'house_revenue'),0) house,
      coalesce(sum(balance) filter (where kind = 'house_bankroll'),0) bankroll,
      coalesce(sum(balance) filter (where kind = 'bot_bankroll'),0) bot_bankroll,
      coalesce(sum(balance),0) total
    from wallet_accounts where account_type = 'real'
  ), post as (
    select coalesce(sum(p.amount),0) s from ledger_postings p join wallet_accounts w on w.id = p.account_id where w.account_type = 'real'
  ), cust as (
    select t.id, split_part(t.idempotency_key, ':', 1) src, split_part(t.idempotency_key, ':', 2) ref, p.amount
    from ledger_postings p
    join wallet_accounts w on w.id = p.account_id
    join ledger_transactions t on t.id = p.tx_id
    where w.kind = 'external_custody' and w.account_type = 'real'
  ), orphan as (
    select c.amount from cust c
    where case c.src
      when 'deposit' then not exists (select 1 from crypto_deposits d where d.ledger_tx_id = c.id)
      when 'btcpay' then not exists (select 1 from btcpay_invoices b where b.btcpay_invoice_id = c.ref)
      when 'nowpayments' then not exists (select 1 from nowpayments_invoices n where n.id::text = c.ref)
      when 'withdrawal' then not exists (select 1 from crypto_withdrawals w where w.id::text = c.ref)
      when 'btcpay-payout' then not exists (select 1 from btcpay_payouts b where b.id::text = c.ref)
      else false
    end
  ), flows as (
    select
      coalesce((select sum(usd_cents) from _admin_credited_deposits()),0) deposits,
      coalesce((select sum(usd_cents + fee_usd_cents) from _admin_settled_withdrawals()),0) withdrawals,
      (select count(*) from orphan) orphans,
      coalesce((select -sum(amount) from orphan),0) orphan_net
  )
  select jsonb_build_object(
    'postings_sum', post.s, 'balances_sum', acc.total,
    'custody', acc.custody, 'player_available', acc.avail, 'player_locked', acc.locked,
    'game_escrow', acc.escrow, 'house_revenue', acc.house, 'house_bankroll', acc.bankroll,
    'bot_bankroll', acc.bot_bankroll,
    'credited_deposits', flows.deposits, 'settled_withdrawals', flows.withdrawals,
    'orphaned_flows', flows.orphans, 'orphaned_flow_cents', flows.orphan_net,
    'ok_postings_zero', post.s = 0 and acc.total = 0,
    'ok_custody_equals_liabilities', -acc.custody = acc.avail + acc.locked + acc.escrow + acc.house + acc.bankroll + acc.bot_bankroll,
    'ok_custody_equals_flows', -acc.custody = flows.deposits - flows.withdrawals + flows.orphan_net
  ) from acc, post, flows
$$;
revoke all on function public.money_real_invariants() from public, anon, authenticated;
grant execute on function public.money_real_invariants() to service_role;

-- Creator asks for an automated opponent. The seed committed at create is reused.
create or replace function public.coinflip_call_bot(p_game_id bigint, p_idempotency_key text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  uid uuid := auth.uid();
  cfg public.bot_config;
  c public.coinflip_config;
  g public.coinflip_games;
  e public.coinflip_entries;
  bot uuid;
  seed bytea;
  o record;
  tx uuid;
  avail uuid;
  locked uuid;
  ts timestamptz;
  opp public.coin_side;
  winner uuid;
  t_start timestamptz;
  t_end timestamptz;
  result jsonb;
  n int;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  perform public._assert_live_session();
  if p_idempotency_key is null or length(p_idempotency_key) not between 8 and 100 then
    raise exception 'INVALID_IDEMPOTENCY_KEY';
  end if;
  perform pg_advisory_xact_lock(hashtext('bot-call:' || uid::text));
  select bc.result into result from public.bot_calls bc
    where bc.user_id = uid and bc.idempotency_key = p_idempotency_key;
  if found then
    if result ->> 'game_id' is distinct from p_game_id::text then
      raise exception 'IDEMPOTENCY_KEY_REUSED';
    end if;
    return result || jsonb_build_object('duplicate', true);
  end if;
  select * into cfg from public.bot_config;
  if (select count(*) from public.bot_calls
      where user_id = uid and game = 'coinflip'
        and created_at > clock_timestamp() - make_interval(secs => cfg.call_rate_window_seconds))
     >= cfg.call_rate_limit then
    raise exception 'RATE_LIMITED';
  end if;
  select * into g from public.coinflip_games where id = p_game_id for update;
  if not found then raise exception 'GAME_NOT_FOUND'; end if;
  if g.creator_id <> uid then raise exception 'FORBIDDEN'; end if;
  if exists (select 1 from public.profiles where id = uid and self_excluded_until > now()) then
    raise exception 'SELF_EXCLUDED';
  end if;
  if g.status <> 'WAITING' then
    result := jsonb_build_object('ok', true, 'joined', false, 'duplicate', false,
      'reason', 'GAME_NOT_JOINABLE', 'status', g.status, 'opponent_id', g.opponent_id, 'game_id', g.id);
    insert into public.bot_calls (user_id, idempotency_key, game, result)
      values (uid, p_idempotency_key, 'coinflip', result);
    return result;
  end if;
  if clock_timestamp() >= g.expires_at then
    result := jsonb_build_object('ok', true, 'joined', false, 'duplicate', false,
      'reason', 'GAME_EXPIRED', 'status', g.status, 'game_id', g.id);
    insert into public.bot_calls (user_id, idempotency_key, game, result)
      values (uid, p_idempotency_key, 'coinflip', result);
    return result;
  end if;
  if not cfg.enabled or not cfg.coinflip_enabled then raise exception 'BOTS_DISABLED'; end if;
  select count(*) into n from public.profiles where is_bot;
  if n < 1 then raise exception 'BOTS_DISABLED'; end if;
  select id into bot from public.profiles
    where is_bot
    order by username
    offset (abs(hashtext(p_game_id::text)) % n) limit 1;
  perform public._bot_fund(bot, g.amount, g.asset, g.account_type, 'bot:fund:coinflip:' || g.id::text);
  select * into c from public.coinflip_config;
  avail := public._user_account(bot, 'user_available', g.asset, g.account_type);
  locked := public._user_account(bot, 'user_locked', g.asset, g.account_type);
  perform public._coinflip_lock_wallets(array[bot], g.asset, g.account_type);
  ts := clock_timestamp();
  insert into public.ledger_transactions (kind, idempotency_key, account_type, user_id, game_id, memo)
    values ('coinflip_entry', 'coinflip:' || g.id || ':entry:2', g.account_type, bot, g.id, 'Coinflip bot wager')
    returning id into tx;
  perform public._post(tx, avail, -g.amount);
  perform public._post(tx, locked, g.amount);
  opp := case when g.creator_side = 'HEADS' then 'TAILS'::public.coin_side else 'HEADS'::public.coin_side end;
  insert into public.coinflip_entries (game_id, user_id, slot, side, amount, ledger_tx_id, idempotency_key, created_at)
    values (g.id, bot, 2, opp, g.amount, tx, 'bot-join-' || g.id::text, ts);
  select server_seed into seed from public.coinflip_game_secrets where game_id = g.id;
  if seed is null then raise exception 'SEED_MISSING'; end if;
  select * into o from public.coinflip_outcome(seed, g.id, g.draw_version);
  winner := case when o.side = g.creator_side then g.creator_id else bot end;
  insert into public.coinflip_results (game_id, protocol_version, draw_version, server_seed_hash, message, hmac_hex, first_byte, winning_side, winner_id)
    values (g.id, g.protocol_version, g.draw_version, g.server_seed_hash,
            'PVPCasino:coinflip:v1:' || g.id || ':' || g.draw_version, o.hmac_hex, o.first_byte, o.side, winner);
  t_start := ts + c.pre_delay_ms * interval '1 millisecond';
  t_end := t_start + c.animation_ms * interval '1 millisecond';
  update public.coinflip_games set status = 'READY', opponent_id = bot, joined_at = ts,
    animation_start_at = t_start, animation_end_at = t_end
    where id = g.id;
  perform public._audit_cf(uid, 'PLAYER_JOINED', g.id, jsonb_build_object('amount', g.amount, 'side', opp, 'bot', true, 'opponent', bot));
  perform public._audit_cf(null, 'RESULT_COMMITTED', g.id, jsonb_build_object('server_seed_hash', g.server_seed_hash, 'protocol', 'coinflip:v1', 'draw_version', g.draw_version));
  result := jsonb_build_object('ok', true, 'joined', true, 'duplicate', false, 'game_id', g.id,
    'opponent_id', bot, 'side', opp, 'status', 'READY');
  insert into public.bot_calls (user_id, idempotency_key, game, result)
    values (uid, p_idempotency_key, 'coinflip', result);
  return result;
end $$;
revoke all on function public.coinflip_call_bot(bigint, text) from public, anon;
grant execute on function public.coinflip_call_bot(bigint, text) to authenticated;

-- Latest coinflip_advance, plus a sweep of any bot available balance after settlement.
create or replace function public.coinflip_advance(p_game_id bigint)
 returns text
 language plpgsql
 security definer
 set search_path to 'public', 'extensions'
as $function$
declare g public.coinflip_games; r public.coinflip_results; po public.coinflip_payouts; seed bytea; o record;
  n_entries int; sum_amt bigint; n_sides int; all_eq boolean; winner_side_ok boolean;
  tx uuid; escrow uuid; fee bigint; payout bigint; p record; err text; was_retry boolean;
begin
  select * into g from coinflip_games where id = p_game_id for update;
  if not found then return 'not_found'; end if;
  if g.status in ('COMPLETED','CANCELLED') then return 'noop'; end if;

  if g.status = 'WAITING' then
    if clock_timestamp() < g.expires_at then return 'not_due'; end if;
    perform _coinflip_refund(g.id, 'EXPIRED');
    return 'cancelled';
  end if;

  select * into r from coinflip_results where game_id = g.id;
  if not found then raise exception 'RESULT_MISSING'; end if;

  if g.status = 'READY' then
    if clock_timestamp() < g.animation_start_at then return 'not_due'; end if;
    update coinflip_games set status = 'FLIPPING', winner_id = r.winner_id, winning_side = r.winning_side where id = g.id;
    perform _audit_cf(null, 'FLIP_STARTED', g.id, jsonb_build_object('animation_start_at', g.animation_start_at));
    g.status := 'FLIPPING';
  end if;

  if g.status = 'FLIPPING' then
    if clock_timestamp() < g.animation_end_at then return 'flipping'; end if;
    fee := (g.pot_amount * g.fee_bps) / 10000;
    if _fee_ticket_take(r.winner_id, 'coinflip', g.id, fee) then fee := 0; end if;
    update coinflip_games set status = 'SETTLEMENT', settlement_started_at = clock_timestamp() where id = g.id;
    perform _audit_cf(null, 'FLIP_COMPLETED', g.id, jsonb_build_object('winning_side', r.winning_side));
    insert into coinflip_payouts (game_id, kind, idempotency_key, beneficiary_id, amount)
      values (g.id, 'WINNER', 'coinflip:' || g.id || ':winner', r.winner_id, g.pot_amount - fee)
      on conflict (game_id) do nothing;
    perform _audit_cf(null, 'PAYOUT_CREATED', g.id, jsonb_build_object('beneficiary', r.winner_id, 'amount', g.pot_amount - fee));
    g.status := 'SETTLEMENT';
  end if;

  select * into po from coinflip_payouts where game_id = g.id for update;
  if not found then
    fee := (g.pot_amount * g.fee_bps) / 10000;
    if _fee_ticket_take(r.winner_id, 'coinflip', g.id, fee) then fee := 0; end if;
    insert into coinflip_payouts (game_id, kind, idempotency_key, beneficiary_id, amount)
      values (g.id, 'WINNER', 'coinflip:' || g.id || ':winner', r.winner_id, g.pot_amount - fee) returning * into po;
  end if;
  was_retry := po.attempts > 0;
  if was_retry then perform _audit_cf(null, 'RECOVERY_ATTEMPTED', g.id, jsonb_build_object('attempt', po.attempts + 1)); end if;

  begin
    if current_setting('pvp.fail_settlement', true) = 'on' then raise exception 'INJECTED_FAILURE'; end if;
    select count(*), coalesce(sum(amount),0), count(distinct side), coalesce(bool_and(amount = g.amount), false)
      into n_entries, sum_amt, n_sides, all_eq from coinflip_entries where game_id = g.id;
    if n_entries <> 2 or sum_amt <> g.pot_amount or n_sides <> 2 or not all_eq then raise exception 'INVARIANT_ENTRIES'; end if;
    select (side = r.winning_side) into winner_side_ok from coinflip_entries where game_id = g.id and user_id = r.winner_id;
    if not coalesce(winner_side_ok, false) then raise exception 'INVARIANT_WINNER_SIDE'; end if;
    select server_seed into seed from coinflip_game_secrets where game_id = g.id;
    if seed is null then raise exception 'SEED_MISSING'; end if;
    if encode(extensions.digest(seed, 'sha256'), 'hex') <> g.server_seed_hash then raise exception 'INVARIANT_COMMITMENT'; end if;
    select * into o from coinflip_outcome(seed, g.id, g.draw_version);
    if o.side <> r.winning_side or o.hmac_hex <> r.hmac_hex then raise exception 'INVARIANT_RESULT'; end if;
    fee := case when _fee_ticket_used('coinflip', g.id) then 0 else (g.pot_amount * g.fee_bps) / 10000 end;
    payout := g.pot_amount - fee;
    if po.amount <> payout or po.beneficiary_id <> r.winner_id then raise exception 'INVARIANT_PAYOUT'; end if;

    if po.status <> 'SETTLED' then
      perform _coinflip_lock_wallets(array[g.creator_id, g.opponent_id], g.asset, g.account_type);
      if exists (
        select 1 from coinflip_entries e
        join profiles pr on pr.id = e.user_id and pr.is_bot
        where e.game_id = g.id
      ) then
        perform _lock_system_accounts(array['bot_bankroll', 'game_escrow', 'house_revenue']::account_kind[], g.asset, g.account_type);
      end if;
      insert into ledger_transactions (kind, idempotency_key, account_type, user_id, game_id, memo)
        values ('coinflip_settlement', po.idempotency_key, g.account_type, r.winner_id, g.id, 'Coinflip settlement') returning id into tx;
      escrow := _system_account('game_escrow', g.asset, g.account_type);
      for p in select user_id, amount from coinflip_entries where game_id = g.id order by user_id loop
        perform _post(tx, _user_account(p.user_id, 'user_locked', g.asset, g.account_type), -p.amount);
      end loop;
      perform _post(tx, escrow, g.pot_amount);
      perform _post(tx, escrow, -g.pot_amount);
      perform _post(tx, _user_account(r.winner_id, 'user_available', g.asset, g.account_type), payout);
      if fee > 0 then perform _post(tx, _system_account('house_revenue', g.asset, g.account_type), fee); end if;
      for p in
        select e.user_id from coinflip_entries e
        join profiles pr on pr.id = e.user_id and pr.is_bot
        where e.game_id = g.id
        order by e.user_id
      loop
        perform public._bot_sweep(p.user_id, g.asset, g.account_type, 'bot:sweep:coinflip:' || g.id::text || ':' || p.user_id::text);
      end loop;
      if current_setting('pvp.fail_after_ledger', true) = 'on' then raise exception 'INJECTED_FAILURE_AFTER_LEDGER'; end if;
      update coinflip_payouts set status = 'SETTLED', attempts = attempts + 1, ledger_tx_id = tx, settled_at = clock_timestamp(), last_error = null
        where game_id = g.id;
      perform _audit_cf(null, 'PAYOUT_SETTLED', g.id, jsonb_build_object('beneficiary', r.winner_id, 'amount', payout, 'fee', fee, 'ledger_tx', tx));
    end if;

    if current_setting('pvp.fail_before_complete', true) = 'on' then raise exception 'INJECTED_FAILURE_BEFORE_COMPLETE'; end if;
    update coinflip_games set status = 'COMPLETED', completed_at = clock_timestamp(), payout_amount = payout, fee_amount = fee,
      server_seed = encode(seed, 'hex') where id = g.id;
    perform _audit_cf(null, 'GAME_COMPLETED', g.id, jsonb_build_object('winner', r.winner_id, 'winning_side', r.winning_side, 'payout', payout, 'fee', fee));
    if was_retry then perform _audit_cf(null, 'RECOVERY_COMPLETED', g.id, null); end if;
  exception when others then
    err := sqlerrm;
    update coinflip_payouts set status = 'FAILED', attempts = attempts + 1, last_error = left(err, 500) where game_id = g.id;
    perform _audit_cf(null, 'RECOVERY_FAILED', g.id, jsonb_build_object('error', left(err, 500)));
    return 'failed';
  end;
  return 'settled';
end $function$;
revoke execute on function public.coinflip_advance(bigint) from public, anon, authenticated;
grant execute on function public.coinflip_advance(bigint) to service_role;
