-- Adds settled real-money P2P Slott duels to the SEO snapshot.
-- Same privacy rule as the other games: no user ids, usernames, seeds,
-- scores or grids. A duel is verifiable once its server seed is revealed.

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

  return jsonb_build_object(
    'generated_at', now(),
    'window_days', v_days,
    'coinflip', v_coinflip,
    'jackpot', v_jackpot,
    'roulette', v_roulette,
    'slott', v_slott);
end $$;

revoke all on function public.seo_game_snapshot(integer, integer) from public, anon, authenticated;
grant execute on function public.seo_game_snapshot(integer, integer) to service_role;
