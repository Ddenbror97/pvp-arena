-- Poker audit F7: read-only signals for collusion and chip dumping between pairs of
-- players, for operator review. Aggregates over completed hands only: no hole cards,
-- no contact details, nothing is changed and nobody is penalised automatically.
--
-- A pair is reported when it shared at least p_min_hands completed hands in the
-- window. Per pair:
--   flow        chips that moved from one player to the other in shared hands, net
--               (positive: user_a lost to user_b)
--   one_way     share of that pair's gross transfers going in the net direction
--   no_showdown share of transferring hands the loser gave up without a showdown
--   tables      distinct tables the pair shared
-- Large one-way flow, mostly without showdown, across few hands is the chip-dumping
-- pattern; it is also what an ordinary good player looks like over a short sample.

create or replace function public.poker_admin_collusion_signals(
  p_days int default 7, p_min_hands int default 5, p_limit int default 50
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); days int := least(greatest(coalesce(p_days, 7), 1), 30);
  lim int := least(greatest(coalesce(p_limit, 50), 1), 200); min_h int := greatest(coalesce(p_min_hands, 5), 2);
  res jsonb;
begin
  if uid is not null then
    if not public.has_role(uid, 'admin') then raise exception 'FORBIDDEN'; end if;
    perform public._assert_live_session();
    perform public._require_admin_stepup();
  end if;
  with hands as (
    select h.id, h.table_id from poker_hands h
    where h.status = 'COMPLETED' and h.completed_at > clock_timestamp() - make_interval(days => days)
  ), part as (
    select hp.hand_id, hands.table_id, hp.user_id, hp.end_stack - hp.start_stack as net, hp.folded
    from poker_hand_players hp join hands on hands.id = hp.hand_id
  ), pairs as (
    -- Transfer from the loser to the winner in a shared hand, capped by both sides.
    select least(a.user_id, b.user_id) as ua, greatest(a.user_id, b.user_id) as ub, a.hand_id, a.table_id,
      case when a.user_id < b.user_id then 1 else -1 end * least(-a.net, b.net) as flow_ab,
      least(-a.net, b.net) as gross, a.folded as loser_folded
    from part a join part b on b.hand_id = a.hand_id and b.user_id <> a.user_id
    where a.net < 0 and b.net > 0
  ), shared as (
    select least(a.user_id, b.user_id) as ua, greatest(a.user_id, b.user_id) as ub,
      count(distinct a.hand_id) as hands, count(distinct a.table_id) as tables
    from part a join part b on b.hand_id = a.hand_id and a.user_id < b.user_id
    group by 1, 2 having count(distinct a.hand_id) >= min_h
  ), agg as (
    select s.ua, s.ub, s.hands, s.tables,
      coalesce(sum(p.flow_ab), 0) as flow, coalesce(sum(p.gross), 0) as gross,
      count(p.hand_id) as transfers, count(p.hand_id) filter (where p.loser_folded) as folded_transfers
    from shared s left join pairs p on p.ua = s.ua and p.ub = s.ub
    group by s.ua, s.ub, s.hands, s.tables
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'user_a', a.ua, 'user_b', a.ub,
      'username_a', (select username from profiles where id = a.ua),
      'username_b', (select username from profiles where id = a.ub),
      'hands', a.hands, 'tables', a.tables, 'transfers', a.transfers, 'flow', a.flow, 'gross', a.gross,
      'one_way', case when a.gross > 0 then round(abs(a.flow)::numeric / a.gross, 3) end,
      'no_showdown', case when a.transfers > 0 then round(a.folded_transfers::numeric / a.transfers, 3) end
    ) order by abs(a.flow) desc, a.ua, a.ub), '[]'::jsonb)
  into res
  from (select * from agg where gross > 0 order by abs(flow) desc, ua, ub limit lim) a;
  perform _audit(uid, 'poker_collusion_signals_viewed', null,
    jsonb_build_object('days', days, 'min_hands', min_h, 'limit', lim));
  return jsonb_build_object('days', days, 'min_hands', min_h, 'pairs', res);
end $$;

revoke all on function public.poker_admin_collusion_signals(int, int, int) from public, anon;
grant execute on function public.poker_admin_collusion_signals(int, int, int) to authenticated, service_role;
