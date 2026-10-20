-- Bot capital is a liability, same as house revenue. The cashflow identity
-- includes it so a funded bot bankroll still reads as balanced books.
-- The account starts at zero; this does not move money.

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
    coalesce(sum(balance) filter (where kind = 'bot_bankroll'), 0) bot_bankroll,
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

  -- Poker pays pot shares into the seat, not the wallet, and returns uncalled chips in the
  -- same transaction, so its row comes from the settled hand records.
  select wins || jsonb_build_array(jsonb_build_object('game', 'Poker',
      'today', coalesce(sum(hp.won) filter (where h.completed_at >= since), 0),
      'all_time', coalesce(sum(hp.won) filter (where h.completed_at >= epoch), 0)))
  into wins
  from poker_hands h join poker_hand_players hp on hp.hand_id = h.id
  where h.status = 'COMPLETED' and h.account_type = 'real' and h.asset = 'USD' and hp.won > 0;

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
      'bot_bankroll', bal.bot_bankroll,
      'custody_net', -bal.external_custody,
      'books_balance', -bal.external_custody = bal.player_available + bal.player_locked + bal.game_escrow + bal.house_revenue + bal.house_bankroll + bal.bot_bankroll
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

