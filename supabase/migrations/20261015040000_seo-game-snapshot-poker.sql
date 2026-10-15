-- Adds real-money poker hands to the SEO snapshot.
-- Same privacy rule as the other games: no user ids, usernames, seeds or
-- cards. A hand's pot is the chips committed after uncalled bets were
-- returned. Voided hands are counted separately; no money moved in them.

create or replace function public.seo_game_snapshot(p_window_days integer default 30, p_recent integer default 5)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_days integer := least(greatest(coalesce(p_window_days, 30), 1), 365);
  v_limit integer := least(greatest(coalesce(p_recent, 5), 1), 10);
  v_since timestamptz := now() - make_interval(days => v_days);
  v_wheel integer;
  v_coinflip jsonb;
  v_jackpot jsonb;
  v_roulette jsonb;
  v_slott jsonb;
  v_poker jsonb;
begin
  select c.wheel_version into v_wheel from public.roulette_config c limit 1;

  select jsonb_build_object(
    'window', (
      select jsonb_build_object(
        'rounds', count(*),
        'wagered', coalesce(sum(g.pot_amount), 0),
        'avg_pot', case when count(*) > 0 then round(sum(g.pot_amount)::numeric / count(*))::bigint end,
        'largest_pot', max(g.pot_amount),
        'heads', count(*) filter (where g.winning_side = 'HEADS'),
        'tails', count(*) filter (where g.winning_side = 'TAILS'))
      from public.coinflip_games g
      where g.status = 'COMPLETED' and g.money_domain = 'REAL_USD' and g.completed_at >= v_since),
    'all_time', (
      select jsonb_build_object(
        'rounds', count(*),
        'wagered', coalesce(sum(g.pot_amount), 0),
        'largest_pot', max(g.pot_amount),
        'since', min(g.completed_at))
      from public.coinflip_games g
      where g.status = 'COMPLETED' and g.money_domain = 'REAL_USD'),
    'recent', coalesce((
      select jsonb_agg(r order by r.completed_at desc)
      from (
        select g.id, g.pot_amount as pot, 2 as players, g.winning_side::text as result,
               g.completed_at, g.server_seed is not null as verifiable
        from public.coinflip_games g
        where g.status = 'COMPLETED' and g.money_domain = 'REAL_USD'
        order by g.completed_at desc
        limit v_limit) r), '[]'::jsonb))
  into v_coinflip;

  select jsonb_build_object(
    'window', (
      select jsonb_build_object(
        'rounds', count(*),
        'wagered', coalesce(sum(g.pot_amount), 0),
        'avg_pot', case when count(*) > 0 then round(sum(g.pot_amount)::numeric / count(*))::bigint end,
        'largest_pot', max(g.pot_amount),
        'avg_players', case when count(*) > 0 then round(avg(g.player_count), 1) end)
      from public.jackpot_games g
      where g.status = 'COMPLETED' and g.money_domain = 'REAL_USD' and g.completed_at >= v_since),
    'all_time', (
      select jsonb_build_object(
        'rounds', count(*),
        'wagered', coalesce(sum(g.pot_amount), 0),
        'largest_pot', max(g.pot_amount),
        'since', min(g.completed_at))
      from public.jackpot_games g
      where g.status = 'COMPLETED' and g.money_domain = 'REAL_USD'),
    'recent', coalesce((
      select jsonb_agg(r order by r.completed_at desc)
      from (
        select g.id, g.pot_amount as pot, g.player_count as players,
               g.completed_at, g.server_seed is not null as verifiable
        from public.jackpot_games g
        where g.status = 'COMPLETED' and g.money_domain = 'REAL_USD'
        order by g.completed_at desc
        limit v_limit) r), '[]'::jsonb))
  into v_jackpot;

  select jsonb_build_object(
    'window', (
      select jsonb_build_object(
        'spins', count(*),
        'rounds_with_bets', count(*) filter (where g.bet_count > 0),
        'bets', coalesce(sum(g.bet_count), 0),
        'wagered', coalesce(sum(g.pot_amount), 0),
        'avg_pot', case when count(*) filter (where g.bet_count > 0) > 0
          then round(sum(g.pot_amount)::numeric / count(*) filter (where g.bet_count > 0))::bigint end,
        'largest_pot', max(g.pot_amount) filter (where g.bet_count > 0))
      from public.roulette_games g
      where g.status = 'COMPLETED' and g.money_domain = 'REAL_USD' and g.completed_at >= v_since),
    'all_time', (
      select jsonb_build_object(
        'spins', count(*),
        'rounds_with_bets', count(*) filter (where g.bet_count > 0),
        'wagered', coalesce(sum(g.pot_amount), 0),
        'largest_pot', max(g.pot_amount) filter (where g.bet_count > 0),
        'since', min(g.completed_at))
      from public.roulette_games g
      where g.status = 'COMPLETED' and g.money_domain = 'REAL_USD'),
    'colors', (
      select jsonb_build_object(
        'wheel_version', w.version,
        'slot_count', w.slot_count,
        'slots', (select jsonb_object_agg(s.color, s.n) from (
          select l.color::text color, count(*) n from unnest(w.layout) as l(color) group by l.color) s),
        'counts', coalesce((select jsonb_object_agg(c.color, c.n) from (
          select g.winning_color::text color, count(*) n
          from public.roulette_games g
          where g.status = 'COMPLETED' and g.money_domain = 'REAL_USD'
            and g.completed_at >= v_since and g.wheel_version = w.version
          group by g.winning_color) c), '{}'::jsonb))
      from public.roulette_wheels w
      where w.version = v_wheel),
    'recent', coalesce((
      select jsonb_agg(r order by r.completed_at desc)
      from (
        select g.id, g.pot_amount as pot, g.bet_count as bets, g.player_count as players,
               g.winning_color::text as result, g.completed_at, g.server_seed is not null as verifiable
        from public.roulette_games g
        where g.status = 'COMPLETED' and g.bet_count > 0 and g.money_domain = 'REAL_USD'
        order by g.completed_at desc
        limit v_limit) r), '[]'::jsonb))
  into v_roulette;

  select jsonb_build_object(
    'window', (
      select jsonb_build_object(
        'rounds', count(*),
        'wagered', coalesce(sum(g.p2p_pot), 0),
        'avg_pot', case when count(*) > 0 then round(sum(g.p2p_pot)::numeric / count(*))::bigint end,
        'largest_pot', max(g.p2p_pot))
      from public.slot_games g
      where g.status = 'COMPLETED' and g.money_domain = 'REAL_USD' and g.completed_at >= v_since),
    'all_time', (
      select jsonb_build_object(
        'rounds', count(*),
        'wagered', coalesce(sum(g.p2p_pot), 0),
        'largest_pot', max(g.p2p_pot),
        'since', min(g.completed_at))
      from public.slot_games g
      where g.status = 'COMPLETED' and g.money_domain = 'REAL_USD'),
    'recent', coalesce((
      select jsonb_agg(r order by r.completed_at desc)
      from (
        select g.id, g.p2p_pot as pot, 2 as players, g.outcome as result,
               g.completed_at, g.server_seed is not null as verifiable
        from public.slot_games g
        where g.status = 'COMPLETED' and g.money_domain = 'REAL_USD'
          and g.outcome in ('WIN', 'DRAW', 'BOMB')
        order by g.completed_at desc
        limit v_limit) r), '[]'::jsonb))
  into v_slott;

  with hands as (
    select h.id, h.status, h.completed_at, h.small_blind, h.big_blind,
           h.server_seed is not null as verifiable,
           p.pot, p.players, p.shown,
           case when p.shown > 0 then 'SHOWDOWN' else h.street end as result
    from public.poker_hands h
    cross join lateral (
      select coalesce(sum(hp.wagered), 0)::bigint as pot,
             count(*)::int as players,
             count(*) filter (where hp.shown_cards is not null)::int as shown
      from public.poker_hand_players hp
      where hp.hand_id = h.id) p
    where h.account_type = 'real' and h.status in ('COMPLETED', 'VOIDED')
  )
  select jsonb_build_object(
    'window', (
      select jsonb_build_object(
        'rounds', count(*) filter (where c.status = 'COMPLETED'),
        'wagered', coalesce(sum(c.pot) filter (where c.status = 'COMPLETED'), 0),
        'avg_pot', case when count(*) filter (where c.status = 'COMPLETED') > 0
          then round(avg(c.pot) filter (where c.status = 'COMPLETED'))::bigint end,
        'largest_pot', max(c.pot) filter (where c.status = 'COMPLETED'),
        'avg_players', round(avg(c.players) filter (where c.status = 'COMPLETED'), 1),
        'voided', count(*) filter (where c.status = 'VOIDED'),
        'showdowns', count(*) filter (where c.status = 'COMPLETED' and c.shown > 0))
      from hands c
      where c.completed_at >= v_since),
    'all_time', (
      select jsonb_build_object(
        'rounds', count(*),
        'wagered', coalesce(sum(c.pot), 0),
        'largest_pot', max(c.pot),
        'since', min(c.completed_at))
      from hands c
      where c.status = 'COMPLETED'),
    'recent', coalesce((
      select jsonb_agg(r order by r.completed_at desc)
      from (
        select c.id, c.pot, c.players, c.result, c.completed_at, c.verifiable,
               c.small_blind, c.big_blind
        from hands c
        where c.status = 'COMPLETED'
        order by c.completed_at desc
        limit v_limit) r), '[]'::jsonb))
  into v_poker;

  return jsonb_build_object(
    'generated_at', now(),
    'window_days', v_days,
    'coinflip', v_coinflip,
    'jackpot', v_jackpot,
    'roulette', v_roulette,
    'slott', v_slott,
    'poker', v_poker);
end $$;

revoke all on function public.seo_game_snapshot(integer, integer) from public, anon, authenticated;
grant execute on function public.seo_game_snapshot(integer, integer) to service_role;
