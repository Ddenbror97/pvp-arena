-- Withdrawal hold on profit taken from active partners in PvP games.
-- When a real-money Coinflip, Jackpot or Slott game completes and a normal player beats an active
-- partner, the winner's net gain from the partner's stake is recorded at settlement as partner-sourced
-- profit (the winner's own stake, the house fee and Slott WILD bonuses are excluded). Each record is
-- split once, under a per-partner lock, into an auto-cleared part and a held part:
--   auto-cleared = min(profit, opponent allowance left for this partner/opponent pair (lifetime),
--                  partner allowance left for this partner today (UTC))
-- Held profit stays in the balance but cannot be withdrawn until an admin releases it. Like the
-- removed-partner hold, it shrinks when the balance falls below it, so a player who loses the money
-- never has later deposits held. Gameplay, fees, settlement and other withdrawals are unchanged.
-- Enforcement starts with this migration: production had no partners or partner games before it.

alter table public.partner_settings
  add column opponent_profit_allowance_cents bigint not null default 5000,
  add column daily_profit_allowance_cents bigint not null default 10000,
  add constraint partner_settings_profit_allowance check (opponent_profit_allowance_cents >= 0 and daily_profit_allowance_cents >= 0);

create table public.partner_profit_events (
  id uuid primary key default gen_random_uuid(),
  game text not null check (game in ('coinflip', 'jackpot', 'slott')),
  game_id bigint not null,
  partner_user_id uuid not null references public.partners (user_id),
  user_id uuid not null references public.profiles (id),
  partner_stake_cents bigint not null check (partner_stake_cents > 0),
  winner_stake_cents bigint not null check (winner_stake_cents > 0),
  fee_cents bigint not null check (fee_cents >= 0),
  profit_cents bigint not null check (profit_cents > 0 and profit_cents <= partner_stake_cents),
  auto_cleared_cents bigint not null check (auto_cleared_cents >= 0),
  held_cents bigint not null check (held_cents >= 0),
  ledger_tx_id uuid not null references public.ledger_transactions (id),
  day date not null,
  created_at timestamptz not null default clock_timestamp(),
  constraint partner_profit_split check (auto_cleared_cents + held_cents = profit_cents),
  constraint partner_profit_not_self check (user_id <> partner_user_id),
  unique (game, game_id, partner_user_id)
);
create index partner_profit_events_pair_idx on public.partner_profit_events (partner_user_id, user_id);
create index partner_profit_events_day_idx on public.partner_profit_events (partner_user_id, day);
create index partner_profit_events_user_idx on public.partner_profit_events (user_id);
create index partner_profit_events_tx_idx on public.partner_profit_events (ledger_tx_id);
alter table public.partner_profit_events enable row level security;
revoke all on public.partner_profit_events from public, anon, authenticated;
grant all on public.partner_profit_events to service_role;
create trigger no_mutation before update or delete on public.partner_profit_events for each row execute function public._immutable();
create trigger no_truncate before truncate on public.partner_profit_events for each statement execute function public._no_truncate();

create table public.partner_profit_releases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id),
  partner_user_id uuid not null references public.partners (user_id),
  amount_cents bigint not null check (amount_cents > 0),
  reason text not null check (char_length(reason) between 3 and 500),
  admin_id uuid not null references public.profiles (id),
  request_id uuid not null unique,
  created_at timestamptz not null default clock_timestamp()
);
create index partner_profit_releases_pair_idx on public.partner_profit_releases (partner_user_id, user_id);
create index partner_profit_releases_user_idx on public.partner_profit_releases (user_id);
alter table public.partner_profit_releases enable row level security;
revoke all on public.partner_profit_releases from public, anon, authenticated;
grant all on public.partner_profit_releases to service_role;
create trigger no_mutation before update or delete on public.partner_profit_releases for each row execute function public._immutable();
create trigger no_truncate before truncate on public.partner_profit_releases for each statement execute function public._no_truncate();

-- Records one partner's contribution to a settled game. Called only from the settlement triggers.
create or replace function public._partner_profit_record(p_game text, p_game_id bigint, p_partner uuid, p_winner uuid,
  p_partner_stake bigint, p_winner_stake bigint, p_fee bigint, p_profit bigint, p_tx uuid)
returns void language plpgsql security definer set search_path = public as $$
declare s public.partner_settings; d date := (clock_timestamp() at time zone 'UTC')::date;
  pair_used bigint; day_used bigint; auto bigint;
begin
  if p_profit is null or p_profit <= 0 then return; end if;
  if p_tx is null then raise exception 'PARTNER_PROFIT_NO_LEDGER'; end if;
  perform pg_advisory_xact_lock(hashtext('partner_profit:' || p_partner::text));
  select * into s from public.partner_settings;
  select coalesce(sum(auto_cleared_cents), 0) into pair_used from public.partner_profit_events
    where partner_user_id = p_partner and user_id = p_winner;
  select coalesce(sum(auto_cleared_cents), 0) into day_used from public.partner_profit_events
    where partner_user_id = p_partner and day = d;
  auto := least(p_profit, greatest(0, s.opponent_profit_allowance_cents - pair_used), greatest(0, s.daily_profit_allowance_cents - day_used));
  insert into public.partner_profit_events (game, game_id, partner_user_id, user_id, partner_stake_cents, winner_stake_cents,
    fee_cents, profit_cents, auto_cleared_cents, held_cents, ledger_tx_id, day)
  values (p_game, p_game_id, p_partner, p_winner, p_partner_stake, p_winner_stake, p_fee, p_profit, auto, p_profit - auto, p_tx, d)
  on conflict (game, game_id, partner_user_id) do nothing;
  if found and p_profit > auto then
    perform public._audit(p_winner, 'partner_profit_held', p_game_id, jsonb_build_object('game', p_game, 'partner', p_partner,
      'profit', p_profit, 'auto_cleared', auto, 'held', p_profit - auto, 'tx', p_tx));
  end if;
end $$;
revoke all on function public._partner_profit_record(text, bigint, uuid, uuid, bigint, bigint, bigint, bigint, uuid) from public, anon, authenticated;

create or replace function public._partner_profit_on_coinflip()
returns trigger language plpgsql security definer set search_path = public as $$
declare loser uuid;
begin
  if new.account_type <> 'real' or new.winner_id is null or public._is_active_partner(new.winner_id) then return null; end if;
  loser := case when new.winner_id = new.creator_id then new.opponent_id else new.creator_id end;
  if loser is null or not public._is_active_partner(loser) then return null; end if;
  perform public._partner_profit_record('coinflip', new.id, loser, new.winner_id, new.amount, new.amount, new.fee_amount,
    new.payout_amount - new.amount, (select ledger_tx_id from public.coinflip_payouts where game_id = new.id));
  return null;
end $$;
revoke all on function public._partner_profit_on_coinflip() from public, anon, authenticated;
create trigger partner_profit after update of status on public.coinflip_games
  for each row when (new.status = 'COMPLETED' and old.status is distinct from 'COMPLETED')
  execute function public._partner_profit_on_coinflip();

-- Jackpot: the winner's net gain is split across the other players in proportion to their stakes.
create or replace function public._partner_profit_on_jackpot()
returns trigger language plpgsql security definer set search_path = public as $$
declare gain bigint; others bigint; tx uuid; p record;
begin
  if new.account_type <> 'real' or new.winner_id is null or public._is_active_partner(new.winner_id) then return null; end if;
  gain := new.payout_amount - new.winner_total;
  others := new.pot_amount - new.winner_total;
  if gain <= 0 or others <= 0 then return null; end if;
  tx := (select ledger_tx_id from public.jackpot_payouts where game_id = new.id);
  for p in select user_id, total_amount from public.jackpot_players
           where game_id = new.id and user_id <> new.winner_id order by user_id loop
    if public._is_active_partner(p.user_id) then
      perform public._partner_profit_record('jackpot', new.id, p.user_id, new.winner_id, p.total_amount, new.winner_total,
        new.rake_amount, (gain * p.total_amount) / others, tx);
    end if;
  end loop;
  return null;
end $$;
revoke all on function public._partner_profit_on_jackpot() from public, anon, authenticated;
create trigger partner_profit after update of status on public.jackpot_games
  for each row when (new.status = 'COMPLETED' and old.status is distinct from 'COMPLETED')
  execute function public._partner_profit_on_jackpot();

-- Slott: WILD bonuses are paid by the house, so only the P2P pot counts.
create or replace function public._partner_profit_on_slot()
returns trigger language plpgsql security definer set search_path = public as $$
declare loser uuid;
begin
  if new.account_type <> 'real' or new.outcome is distinct from 'WIN' or new.winner_id is null
     or public._is_active_partner(new.winner_id) then return null; end if;
  loser := case when new.winner_id = new.creator_id then new.opponent_id else new.creator_id end;
  if loser is null or not public._is_active_partner(loser) then return null; end if;
  perform public._partner_profit_record('slott', new.id, loser, new.winner_id, new.stake, new.stake, new.fee_amount,
    new.p2p_pot - new.fee_amount - new.stake,
    (select ledger_tx_id from public.slot_payouts where game_id = new.id and kind = 'WINNER'));
  return null;
end $$;
revoke all on function public._partner_profit_on_slot() from public, anon, authenticated;
create trigger partner_profit after update of status on public.slot_games
  for each row when (new.status = 'COMPLETED' and old.status is distinct from 'COMPLETED')
  execute function public._partner_profit_on_slot();

-- Net change per ledger transaction on the user's real USD available + locked accounts, so moving a
-- stake into a game or a withdrawal hold is not a dip.
create or replace function public._partner_profit_txs(p_user uuid)
returns table (tx_id uuid, ord bigint, ts timestamptz, delta bigint)
language sql stable security definer set search_path = public as $$
  select lp.tx_id, min(lp.id), min(lp.created_at), sum(lp.amount)::bigint
  from public.ledger_postings lp
  join public.wallet_accounts a on a.id = lp.account_id
  where a.owner_id = p_user and a.kind in ('user_available', 'user_locked') and a.asset = 'USD' and a.account_type = 'real'
  group by lp.tx_id;
$$;
revoke all on function public._partner_profit_txs(uuid) from public, anon, authenticated;

-- Held partner profit still on the account. Walks the user's ledger from the first held settlement:
-- each settlement adds its held part, each admin release subtracts, and the hold never exceeds the
-- balance after any transaction.
create or replace function public._partner_profit_hold(p_user uuid)
returns bigint language plpgsql stable security definer set search_path = public as $$
declare t0 timestamptz; run bigint; h bigint := 0; r record;
begin
  if not exists (select 1 from public.partner_profit_events where user_id = p_user and held_cents > 0) then return 0; end if;
  select min(t.ts) into t0 from public._partner_profit_txs(p_user) t
    where t.tx_id in (select ledger_tx_id from public.partner_profit_events where user_id = p_user and held_cents > 0);
  if t0 is null then return 0; end if;
  select coalesce(sum(t.delta), 0) into run from public._partner_profit_txs(p_user) t where t.ts < t0;
  for r in
    select t.ts, t.ord, t.delta,
      coalesce((select sum(e.held_cents) from public.partner_profit_events e where e.ledger_tx_id = t.tx_id and e.user_id = p_user), 0)::bigint as added,
      0::bigint as released
    from public._partner_profit_txs(p_user) t where t.ts >= t0
    union all
    select rl.created_at, null::bigint, 0::bigint, 0::bigint, rl.amount_cents
    from public.partner_profit_releases rl where rl.user_id = p_user
    order by 1, 2 nulls last
  loop
    run := run + r.delta;
    h := greatest(0, least(h + r.added - r.released, run));
  end loop;
  return h;
end $$;
revoke all on function public._partner_profit_hold(uuid) from public, anon, authenticated;

-- Partner profit hold added. The rest is unchanged from 20261002213123.
create or replace function public._assert_reward_holds(p_user uuid, p_balance bigint, p_total bigint)
returns void language plpgsql stable security definer set search_path = public as $$
declare
  referral_hold bigint;
  promo_hold bigint;
  partner_hold bigint;
  profit_hold bigint;
  b0 bigint;
  bal bigint;
begin
  if public._is_active_partner(p_user) then raise exception 'PARTNER_WITHDRAWAL_BLOCKED'; end if;
  referral_hold := public.referral_unplayed_reward_cents(p_user);
  promo_hold := public.promo_restricted_cents(p_user);
  partner_hold := public._partner_release_block(p_user, p_balance);
  profit_hold := public._partner_profit_hold(p_user);
  if p_balance - referral_hold - promo_hold - partner_hold - profit_hold >= p_total then return; end if;
  if profit_hold > 0 and p_balance - referral_hold - promo_hold - partner_hold >= p_total then
    raise exception 'PARTNER_PROFIT_REVIEW';
  end if;
  b0 := p_balance - profit_hold;
  if partner_hold > 0 and b0 - referral_hold - promo_hold >= p_total then
    raise exception 'PARTNER_FUNDS_HELD';
  end if;
  bal := b0 - partner_hold;
  if promo_hold > 0 and bal - referral_hold >= p_total then
    raise exception 'PROMO_PLAYTHROUGH';
  end if;
  if referral_hold > 0 and bal - promo_hold >= p_total then
    raise exception 'REFERRAL_PLAYTHROUGH';
  end if;
  if promo_hold > 0 then raise exception 'PROMO_PLAYTHROUGH'; end if;
  if referral_hold > 0 then raise exception 'REFERRAL_PLAYTHROUGH'; end if;
  if partner_hold > 0 then raise exception 'PARTNER_FUNDS_HELD'; end if;
  raise exception 'PARTNER_PROFIT_REVIEW';
end $$;
revoke all on function public._assert_reward_holds(uuid, bigint, bigint) from public, anon, authenticated;

create or replace function public.partner_profit_status()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  perform public._assert_live_session();
  return jsonb_build_object('held_cents', public._partner_profit_hold(uid));
end $$;
revoke all on function public.partner_profit_status() from public, anon;
grant execute on function public.partner_profit_status() to authenticated;

-- Releases held profit one player received from one partner. The amount is capped at what is still
-- held for that pair; a reused request id returns the first release.
create or replace function public.partner_admin_release_profit(p_user uuid, p_partner uuid, p_amount_cents bigint, p_reason text, p_request_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := public._assert_admin(); v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  prior public.partner_profit_releases; outstanding bigint; rid uuid;
begin
  if p_user is null or p_partner is null or p_request_id is null then raise exception 'BAD_REQUEST'; end if;
  if p_user = uid then raise exception 'FORBIDDEN'; end if;
  if p_amount_cents is null or p_amount_cents <= 0 then raise exception 'BAD_AMOUNT'; end if;
  if v_reason is null or char_length(v_reason) < 3 or char_length(v_reason) > 500 then raise exception 'BAD_REASON'; end if;
  perform pg_advisory_xact_lock(hashtext('partner_profit_release:' || p_user::text || ':' || p_partner::text));
  select * into prior from public.partner_profit_releases where request_id = p_request_id;
  if prior.id is not null then
    if prior.user_id <> p_user or prior.partner_user_id <> p_partner or prior.amount_cents <> p_amount_cents then
      raise exception 'REQUEST_REUSED';
    end if;
    return jsonb_build_object('ok', true, 'id', prior.id, 'duplicate', true);
  end if;
  outstanding := coalesce((select sum(held_cents) from public.partner_profit_events where partner_user_id = p_partner and user_id = p_user), 0)
    - coalesce((select sum(amount_cents) from public.partner_profit_releases where partner_user_id = p_partner and user_id = p_user), 0);
  if outstanding <= 0 then raise exception 'NOTHING_HELD'; end if;
  if p_amount_cents > outstanding then raise exception 'BAD_AMOUNT'; end if;
  insert into public.partner_profit_releases (user_id, partner_user_id, amount_cents, reason, admin_id, request_id)
  values (p_user, p_partner, p_amount_cents, v_reason, uid, p_request_id)
  returning id into rid;
  perform public._audit(uid, 'partner_profit_released', null, jsonb_build_object('user', p_user, 'partner', p_partner,
    'cents', p_amount_cents, 'reason', v_reason, 'release', rid));
  return jsonb_build_object('ok', true, 'id', rid, 'duplicate', false);
exception
  when unique_violation then raise exception 'REQUEST_REUSED';
end $$;
revoke all on function public.partner_admin_release_profit(uuid, uuid, bigint, text, uuid) from public, anon;
grant execute on function public.partner_admin_release_profit(uuid, uuid, bigint, text, uuid) to authenticated;

-- Partner-profit totals added per opponent (all time). The rest is unchanged from 20261002213123.
create or replace function public.partner_admin_opponents(p_user uuid, p_from timestamptz, p_to timestamptz)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare uid uuid := public._assert_admin();
begin
  if p_from is not null and p_to is not null and p_from >= p_to then raise exception 'BAD_RANGE'; end if;
  if not exists (select 1 from public.partners where user_id = p_user) then raise exception 'NOT_PARTNER'; end if;
  return coalesce((select jsonb_agg(x order by x.lost_cents desc, x.games desc) from (
    select g.opp as user_id, pr.username,
      count(*) as games,
      count(*) filter (where g.winner = p_user) as partner_wins,
      count(*) filter (where g.winner = g.opp) as opponent_wins,
      coalesce(sum(g.partner_stake) filter (where g.winner = g.opp), 0) as lost_cents,
      coalesce(sum(g.opp_stake) filter (where g.winner = p_user), 0) as won_cents,
      to_jsonb(array_agg(distinct g.game)) as games_played,
      max(g.completed_at) as last_played_at,
      exists (select 1 from public.partner_referrals r where r.user_id = g.opp and r.partner_user_id = p_user) as attributed,
      exists (select 1 from public.partners op where op.user_id = g.opp) as partner,
      coalesce((select sum(e.profit_cents) from public.partner_profit_events e where e.partner_user_id = p_user and e.user_id = g.opp), 0) as profit_cents,
      coalesce((select sum(e.auto_cleared_cents) from public.partner_profit_events e where e.partner_user_id = p_user and e.user_id = g.opp), 0) as auto_cleared_cents,
      coalesce((select sum(e.held_cents) from public.partner_profit_events e where e.partner_user_id = p_user and e.user_id = g.opp), 0) as held_cents,
      coalesce((select sum(rl.amount_cents) from public.partner_profit_releases rl where rl.partner_user_id = p_user and rl.user_id = g.opp), 0) as released_cents
    from (
      select 'coinflip' as game, case when c.creator_id = p_user then c.opponent_id else c.creator_id end as opp,
        c.amount as partner_stake, c.amount as opp_stake, c.winner_id as winner, c.completed_at
      from public.coinflip_games c
      where (c.creator_id = p_user or c.opponent_id = p_user) and c.account_type = 'real' and c.completed_at is not null
        and c.completed_at >= coalesce(p_from, '-infinity'::timestamptz) and c.completed_at < coalesce(p_to, 'infinity'::timestamptz)
      union all
      select 'slott', case when s.creator_id = p_user then s.opponent_id else s.creator_id end,
        s.stake, s.stake, s.winner_id, s.completed_at
      from public.slot_games s
      where (s.creator_id = p_user or s.opponent_id = p_user) and s.account_type = 'real' and s.completed_at is not null
        and s.completed_at >= coalesce(p_from, '-infinity'::timestamptz) and s.completed_at < coalesce(p_to, 'infinity'::timestamptz)
      union all
      select 'jackpot', o.user_id, me.total_amount, o.total_amount, j.winner_id, j.completed_at
      from public.jackpot_players me
      join public.jackpot_games j on j.id = me.game_id
      join public.jackpot_players o on o.game_id = me.game_id and o.user_id <> me.user_id
      where me.user_id = p_user and j.account_type = 'real' and j.completed_at is not null
        and j.completed_at >= coalesce(p_from, '-infinity'::timestamptz) and j.completed_at < coalesce(p_to, 'infinity'::timestamptz)
    ) g
    join public.profiles pr on pr.id = g.opp
    group by g.opp, pr.username
    order by lost_cents desc, games desc
    limit 200
  ) x), '[]'::jsonb);
end $$;
revoke all on function public.partner_admin_opponents(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.partner_admin_opponents(uuid, timestamptz, timestamptz) to authenticated;
