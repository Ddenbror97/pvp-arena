-- Launch tracker. Flow stats (deposits, cashouts, winnings, fees, credits)
-- count from started_at. Player balances and on-chain wallet readings stay live.
-- Active partner chips stay playable and are reported apart from money the
-- payout wallets have to cover.

create table if not exists public.ops_stat_epoch (
  id boolean primary key default true check (id),
  started_at timestamptz not null
);

alter table public.ops_stat_epoch enable row level security;
revoke all on table public.ops_stat_epoch from public, anon, authenticated;

insert into public.ops_stat_epoch (id, started_at)
values (true, clock_timestamp())
on conflict (id) do nothing;

create or replace function public.admin_ledger_cashflow()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  day_start timestamptz := date_trunc('day', now() at time zone 'utc') at time zone 'utc';
  epoch timestamptz := coalesce((select started_at from public.ops_stat_epoch), '-infinity'::timestamptz);
  since timestamptz := greatest(day_start, epoch);
  bal record;
  players record;
  dep_today bigint;
  dep_all bigint;
  wd_today bigint;
  wd_all bigint;
  fee_today bigint;
  fee_all bigint;
  open_cents bigint;
  open_count bigint;
  house_fee_today bigint;
  house_fee_all bigint;
  wins jsonb;
  credits jsonb;
  wallets jsonb;
  fresh_cents bigint;
  stale boolean;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'FORBIDDEN';
  end if;
  perform public._assert_live_session();
  perform public._require_admin_stepup();

  select
    coalesce(sum(balance) filter (where kind = 'user_available'), 0) player_available,
    coalesce(sum(balance) filter (where kind = 'user_locked'), 0) player_locked,
    coalesce(sum(balance) filter (where kind = 'game_escrow'), 0) game_escrow,
    coalesce(sum(balance) filter (where kind = 'house_revenue'), 0) house_revenue,
    coalesce(sum(balance) filter (where kind = 'house_bankroll'), 0) house_bankroll,
    coalesce(sum(balance) filter (where kind = 'external_custody'), 0) external_custody
  into bal
  from wallet_accounts
  where account_type = 'real' and asset = 'USD';

  select
    coalesce(sum(w.balance) filter (
      where w.kind = 'user_available' and not coalesce(p.active, false)
    ), 0) available_cents,
    coalesce(sum(w.balance) filter (
      where w.kind = 'user_locked' and not coalesce(p.active, false)
    ), 0) locked_cents,
    coalesce(sum(w.balance) filter (
      where w.kind in ('user_available', 'user_locked') and p.active
    ), 0) partner_cents
  into players
  from wallet_accounts w
  left join public.partners p on p.user_id = w.owner_id
  where w.account_type = 'real'
    and w.asset = 'USD'
    and w.kind in ('user_available', 'user_locked');

  select
    coalesce(sum(usd_cents) filter (where credited_at >= since), 0),
    coalesce(sum(usd_cents) filter (where credited_at >= epoch), 0)
  into dep_today, dep_all
  from public._admin_credited_deposits() d;

  select
    coalesce(sum(usd_cents) filter (where paid_at >= since), 0),
    coalesce(sum(usd_cents) filter (where paid_at >= epoch), 0),
    coalesce(sum(fee_usd_cents) filter (where paid_at >= since), 0),
    coalesce(sum(fee_usd_cents) filter (where paid_at >= epoch), 0)
  into wd_today, wd_all, fee_today, fee_all
  from public._admin_settled_withdrawals() w;

  select coalesce(sum(usd_cents), 0), count(*)::bigint
  into open_cents, open_count
  from public._admin_open_withdrawals() o;

  select coalesce(jsonb_agg(jsonb_build_object(
    'game', x.game, 'today', x.today, 'all_time', x.all_time
  ) order by x.ord), '[]'::jsonb)
  into wins
  from (
    select k.ord, k.game,
      coalesce(sum(p.amount) filter (where a.id is not null and p.amount > 0 and t.created_at >= since), 0) today,
      coalesce(sum(p.amount) filter (where a.id is not null and p.amount > 0 and t.created_at >= epoch), 0) all_time
    from (values
      (1, 'Jackpot', 'jackpot_settlement'::public.tx_kind),
      (2, 'Coinflip', 'coinflip_settlement'),
      (3, 'Roulette', 'roulette_settlement'),
      (4, 'Slott', 'slot_settlement'),
      (5, 'Slott bonus', 'slot_bonus')
    ) as k(ord, game, kind)
    left join ledger_transactions t on t.kind = k.kind and t.account_type = 'real'
    left join ledger_postings p on p.tx_id = t.id
    left join wallet_accounts a on a.id = p.account_id
      and a.kind = 'user_available' and a.account_type = 'real' and a.asset = 'USD'
    group by k.ord, k.game
  ) x;

  select coalesce(jsonb_agg(jsonb_build_object(
    'kind', x.kind, 'today', x.today, 'all_time', x.all_time
  ) order by x.ord), '[]'::jsonb)
  into credits
  from (
    select k.ord, k.kind,
      coalesce(sum(p.amount) filter (where a.id is not null and p.amount > 0 and t.created_at >= since), 0) today,
      coalesce(sum(p.amount) filter (where a.id is not null and p.amount > 0 and t.created_at >= epoch), 0) all_time
    from (values
      (1, 'Promo', 'promo_reward'::public.tx_kind),
      (2, 'Referral', 'referral_reward'),
      (3, 'Prestige', 'prestige_reward'),
      (4, 'Partner', 'partner_credit')
    ) as k(ord, kind, txkind)
    left join ledger_transactions t on t.kind = k.txkind and t.account_type = 'real'
    left join ledger_postings p on p.tx_id = t.id
    left join wallet_accounts a on a.id = p.account_id
      and a.kind = 'user_available' and a.account_type = 'real' and a.asset = 'USD'
    group by k.ord, k.kind
  ) x;

  select
    coalesce(sum(p.amount) filter (where p.amount > 0 and t.created_at >= since), 0),
    coalesce(sum(p.amount) filter (where p.amount > 0 and t.created_at >= epoch), 0)
  into house_fee_today, house_fee_all
  from ledger_postings p
  join ledger_transactions t on t.id = p.tx_id
  join wallet_accounts a on a.id = p.account_id
  where a.kind = 'house_revenue' and a.account_type = 'real' and a.asset = 'USD';

  select coalesce(jsonb_agg(jsonb_build_object(
    'network', y.network,
    'asset', y.asset_key,
    'total_cents', y.total_cents,
    'reserved_cents', y.reserved_cents,
    'available_cents', y.available_cents,
    'fresh', y.fresh,
    'observed_at', y.observed_at
  ) order by y.network, y.asset_key), '[]'::jsonb),
    coalesce(sum(y.total_cents) filter (where y.fresh and y.total_cents is not null), 0),
    coalesce(bool_or(not y.fresh), false)
  into wallets, fresh_cents, stale
  from (
    select t.network, t.asset_key,
      case when p.price is null or st.balance_units is null then null
        else floor(st.balance_units * p.price / power(10::numeric, t.decimals) / 10000)::bigint end as total_cents,
      case when p.price is null then null
        else floor(st.reserved_units * p.price / power(10::numeric, t.decimals) / 10000)::bigint end as reserved_cents,
      case when p.price is null or st.available_units is null then null
        else floor(st.available_units * p.price / power(10::numeric, t.decimals) / 10000)::bigint end as available_cents,
      st.available_units is not null as fresh,
      st.observed_at
    from treasury_assets t
    cross join lateral public._treasury_state(t.network, t.asset_key) st
    cross join lateral (select public._treasury_price(t.network, t.asset_key) as price) p
    where t.network = 'bitcoin'
      or exists (
        select 1 from chain_assets a
        join chain_networks n on n.chain_id = a.chain_id
        where 'eip155:' || a.chain_id = t.network and a.asset_key = t.asset_key and a.is_enabled and n.is_enabled
      )
  ) y;

  return jsonb_build_object(
    'server_time', clock_timestamp(),
    'stat_epoch', epoch,
    'balances', jsonb_build_object(
      'player_available', players.available_cents,
      'player_locked', players.locked_cents,
      'game_escrow', bal.game_escrow,
      'player_owed', players.available_cents + players.locked_cents + bal.game_escrow,
      'partner_play', players.partner_cents,
      'house_revenue', bal.house_revenue,
      'house_bankroll', bal.house_bankroll,
      'custody_net', -bal.external_custody,
      'books_balance', -bal.external_custody = bal.player_available + bal.player_locked + bal.game_escrow + bal.house_revenue + bal.house_bankroll
    ),
    'deposits', jsonb_build_object('today', dep_today, 'all_time', dep_all),
    'withdrawals', jsonb_build_object(
      'paid_today', wd_today,
      'paid_all_time', wd_all,
      'fees_today', fee_today,
      'fees_all_time', fee_all,
      'open_cents', open_cents,
      'open_count', open_count
    ),
    'winnings', wins,
    'fees', jsonb_build_object('today', house_fee_today, 'all_time', house_fee_all),
    'credits', credits,
    'wallets', wallets,
    'wallets_fresh_cents', fresh_cents,
    'wallets_stale', stale
  );
end $$;

create or replace function public.crypto_admin_overview(p_admin uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  epoch timestamptz := coalesce((select started_at from public.ops_stat_epoch), '-infinity'::timestamptz);
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
      'deposit_liability_cents', (select coalesce(sum(usd_cents),0) from crypto_deposits where asset_key = 'ETH' and status = 'CREDITED' and credited_at >= epoch),
      'awaiting_valuation', (select count(*) from crypto_deposits where asset_key = 'ETH' and status in ('DETECTED','CONFIRMED')),
      'withdrawn_cents', (select coalesce(sum(usd_cents),0) from crypto_withdrawals where asset_key = 'ETH' and status = 'CONFIRMED' and confirmed_at >= epoch),
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
