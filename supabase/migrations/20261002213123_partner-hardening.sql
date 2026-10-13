-- Partner hardening: after removal, held partner funds can no longer be turned into withdrawable
-- money by winning games with them, and admins can see who partners play against.

-- Real-money deposits credited since removal minus withdrawals requested since removal that still
-- hold or have paid out (a failed or cancelled withdrawal returned its money and does not count).
create or replace function public._partner_post_removal_net(p_user uuid, p_removed_at timestamptz)
returns bigint language sql stable security definer set search_path = public as $$
  select
    coalesce((
      select sum(lp.amount)
      from public.ledger_postings lp
      join public.wallet_accounts a on a.id = lp.account_id
      join public.ledger_transactions lt on lt.id = lp.tx_id
      where a.owner_id = p_user and a.kind = 'user_available' and a.asset = 'USD' and a.account_type = 'real'
        and lt.kind = 'deposit' and lp.created_at >= p_removed_at
    ), 0)
    - coalesce((
      select sum(w.usd_cents + w.fee_usd_cents)
      from public.crypto_withdrawals w
      join public.ledger_transactions lt on lt.id = w.hold_ledger_tx_id and lt.account_type = 'real'
      where w.user_id = p_user and w.status not in ('REJECTED', 'RELEASED')
        and exists (select 1 from public.ledger_postings lp where lp.tx_id = w.hold_ledger_tx_id and lp.created_at >= p_removed_at)
    ), 0)
    - coalesce((
      select sum(b.usd_cents + b.fee_usd_cents)
      from public.btcpay_payouts b
      where b.user_id = p_user and b.status not in ('CANCELLED', 'FAILED')
        and exists (select 1 from public.ledger_postings lp where lp.tx_id = b.hold_ledger_tx_id and lp.created_at >= p_removed_at)
    ), 0);
$$;
revoke all on function public._partner_post_removal_net(uuid, timestamptz) from public, anon, authenticated;

-- Part of p_balance a removed partner may not withdraw. While any partner-era balance can still be
-- on the account (the release hold is above zero), withdrawals since removal are capped at deposits
-- since removal, so game winnings made with held funds stay held too. Once the balance has dropped
-- to zero after removal, the hold is gone and normal rules apply.
create or replace function public._partner_release_block(p_user uuid, p_balance bigint)
returns bigint language plpgsql stable security definer set search_path = public as $$
declare p public.partners; hold bigint;
begin
  select * into p from public.partners where user_id = p_user and not active;
  if p.user_id is null then return 0; end if;
  hold := public._partner_release_hold(p_user);
  if hold = 0 then return 0; end if;
  return greatest(hold, p_balance - greatest(0, public._partner_post_removal_net(p_user, p.removed_at)));
end $$;
revoke all on function public._partner_release_block(uuid, bigint) from public, anon, authenticated;

create or replace function public._assert_reward_holds(p_user uuid, p_balance bigint, p_total bigint)
returns void language plpgsql stable security definer set search_path = public as $$
declare
  referral_hold bigint;
  promo_hold bigint;
  partner_hold bigint;
  bal bigint;
begin
  if public._is_active_partner(p_user) then raise exception 'PARTNER_WITHDRAWAL_BLOCKED'; end if;
  referral_hold := public.referral_unplayed_reward_cents(p_user);
  promo_hold := public.promo_restricted_cents(p_user);
  partner_hold := public._partner_release_block(p_user, p_balance);
  if p_balance - referral_hold - promo_hold - partner_hold >= p_total then return; end if;
  if partner_hold > 0 and p_balance - referral_hold - promo_hold >= p_total then
    raise exception 'PARTNER_FUNDS_HELD';
  end if;
  bal := p_balance - partner_hold;
  if promo_hold > 0 and bal - referral_hold >= p_total then
    raise exception 'PROMO_PLAYTHROUGH';
  end if;
  if referral_hold > 0 and bal - promo_hold >= p_total then
    raise exception 'REFERRAL_PLAYTHROUGH';
  end if;
  if promo_hold > 0 then raise exception 'PROMO_PLAYTHROUGH'; end if;
  if referral_hold > 0 then raise exception 'REFERRAL_PLAYTHROUGH'; end if;
  raise exception 'PARTNER_FUNDS_HELD';
end $$;
revoke all on function public._assert_reward_holds(uuid, bigint, bigint) from public, anon, authenticated;

create or replace function public.partner_admin_detail(p_user uuid, p_from timestamptz, p_to timestamptz)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare uid uuid := public._assert_admin(); p public.partners; now_ts timestamptz := clock_timestamp(); avail bigint;
begin
  if p_from is not null and p_to is not null and p_from >= p_to then raise exception 'BAD_RANGE'; end if;
  select * into p from public.partners where user_id = p_user;
  if p.user_id is null then raise exception 'NOT_PARTNER'; end if;
  avail := (select coalesce(sum(balance), 0) from public.wallet_accounts where owner_id = p.user_id and kind = 'user_available' and asset = 'USD' and account_type = 'real');
  return jsonb_build_object(
    'user_id', p.user_id,
    'username', (select username from public.profiles where id = p.user_id),
    'email', (select email from auth.users where id = p.user_id),
    'active', p.active,
    'commission_bps', p.commission_bps,
    'note', p.note,
    'created_at', p.created_at,
    'removed_at', p.removed_at,
    'withdrawal', case when p.active then 'blocked' when public._partner_release_hold(p.user_id) > 0 then 'held' else 'normal' end,
    'held_cents', case when p.active then null else least(avail, public._partner_release_block(p.user_id, avail)) end,
    'available_cents', avail,
    'locked_cents', (select coalesce(sum(balance), 0) from public.wallet_accounts where owner_id = p.user_id and kind = 'user_locked' and asset = 'USD' and account_type = 'real'),
    'credits_cents', (select coalesce(sum(amount_cents), 0) from public.partner_topups where user_id = p.user_id),
    'codes', coalesce((select jsonb_agg(x order by x.created_at desc) from (
      select c.id, c.code, c.reward_cents, c.max_claims, c.claim_count, c.expires_at, c.active, c.created_at,
        (select count(*) from public.partner_referrals r where r.promo_code_id = c.id) as attributed_users
      from public.promo_codes c where c.partner_user_id = p.user_id
    ) x), '[]'::jsonb),
    'topups', coalesce((select jsonb_agg(x order by x.created_at desc) from (
      select t.id, t.amount_cents, t.note, t.created_at, ap.username as admin
      from public.partner_topups t left join public.profiles ap on ap.id = t.admin_id
      where t.user_id = p.user_id order by t.created_at desc limit 100
    ) x), '[]'::jsonb),
    'windows', jsonb_build_object(
      'd7', public._partner_window(p.user_id, p.commission_bps, now_ts - interval '7 days', null),
      'd30', public._partner_window(p.user_id, p.commission_bps, now_ts - interval '30 days', null),
      'd90', public._partner_window(p.user_id, p.commission_bps, now_ts - interval '90 days', null),
      'all', public._partner_window(p.user_id, p.commission_bps, null, null),
      'range', public._partner_window(p.user_id, p.commission_bps, p_from, p_to)
    ),
    'attributed_users', (select count(*) from public.partner_referrals where partner_user_id = p.user_id),
    'users', coalesce((select jsonb_agg(x order by x.range_cents desc, x.attributed_at desc) from (
      select r.user_id, pr.username, c.code, r.created_at as attributed_at,
        coalesce(rng.cents, 0) as range_cents, coalesce(rng.deposits, 0) as range_deposits, coalesce(al.cents, 0) as all_cents
      from public.partner_referrals r
      join public.profiles pr on pr.id = r.user_id
      join public.promo_codes c on c.id = r.promo_code_id
      left join public._partner_deposits(p.user_id, p_from, p_to) rng on rng.user_id = r.user_id
      left join public._partner_deposits(p.user_id, null, null) al on al.user_id = r.user_id
      where r.partner_user_id = p.user_id
      order by coalesce(rng.cents, 0) desc, r.created_at desc
      limit 200
    ) x), '[]'::jsonb)
  );
end $$;
revoke all on function public.partner_admin_detail(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.partner_admin_detail(uuid, timestamptz, timestamptz) to authenticated;

-- Real-money PvP games the partner finished in [from, to), grouped by opponent. "lost_cents" is
-- the partner's stake in games that opponent won; "won_cents" is the opponent's stake in games the
-- partner won. In jackpot every other player counts as an opponent, but only the winner takes stakes.
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
      exists (select 1 from public.partners op where op.user_id = g.opp) as partner
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
