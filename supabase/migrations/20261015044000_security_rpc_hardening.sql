-- Supabase security review follow-ups.
--
-- 1. leaderboard_tick() advances campaigns, freezes rankings and pays prizes. pvp-minute-dispatch
--    (pg_cron, postgres) is the only caller it needs; the browser refresh hint is gone.
-- 2. poker_admin_recover_settlement and poker_admin_collusion_signals skipped every check when
--    auth.uid() was null. A request with no user is now only accepted from a server caller
--    (service_role / database), never from an anon or authenticated JWT.
-- 3. roulette_games gets the same seed guardrail the other game tables have: the revealed
--    server_seed column can only be filled on a finished round.
--
-- slot_tick_worker() keeps no SET search_path: it is a procedure that commits per table, and
-- a procedure with a SET clause cannot commit. Every object it touches is schema-qualified,
-- it is not SECURITY DEFINER, and only service_role can call it.

revoke all on function public.leaderboard_tick() from public, anon, authenticated;
grant execute on function public.leaderboard_tick() to service_role;

create or replace function public._poker_require_admin() returns uuid
language plpgsql set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then
    perform public._require_server_caller();
    return null;
  end if;
  if not public.has_role(uid, 'admin') then raise exception 'FORBIDDEN'; end if;
  perform public._assert_live_session();
  perform public._require_admin_stepup();
  return uid;
end $$;

revoke all on function public._poker_require_admin() from public, anon, authenticated;
grant execute on function public._poker_require_admin() to service_role;

create or replace function public.poker_admin_recover_settlement(p_hand bigint, p_mode text, p_reason text)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := public._poker_require_admin(); h poker_hands; seed bytea; n int; err text; actor jsonb;
begin
  if p_mode not in ('retry', 'refund') then raise exception 'INVALID_MODE'; end if;
  if p_reason is null or length(btrim(p_reason)) not between 5 and 500 then raise exception 'REASON_REQUIRED'; end if;
  select * into h from poker_hands where id = p_hand;
  if not found then raise exception 'HAND_NOT_FOUND'; end if;
  perform 1 from poker_tables where id = h.table_id for update;
  select * into h from poker_hands where id = p_hand for update;
  actor := jsonb_build_object('by', uid, 'mode', p_mode, 'reason', p_reason);
  if h.status in ('COMPLETED', 'VOIDED') then
    return jsonb_build_object('ok', true, 'already', h.status, 'ledger_tx', h.ledger_tx_id);
  end if;
  if h.status <> 'SETTLEMENT' then raise exception 'NOT_IN_SETTLEMENT'; end if;

  if p_mode = 'retry' then
    begin
      perform public._poker_settle(p_hand);
    exception when others then
      err := sqlerrm;
    end;
    if err is not null then
      n := public._poker_note_settle_failure(p_hand, err, 'admin_retry');
      perform _audit(uid, 'poker_settle_recovery_failed', p_hand, actor || jsonb_build_object('error', left(err, 500)));
      return jsonb_build_object('ok', false, 'error', left(err, 200), 'attempts', n);
    end if;
    perform public._poker_post_hand(h.table_id);
    perform public._poker_touch(h.table_id);
    perform _audit(uid, 'poker_settle_recovered', p_hand, actor);
    return jsonb_build_object('ok', true, 'result', 'settled');
  end if;

  -- refund: prove that no payout was applied before returning anything.
  if h.ledger_tx_id is not null
     or exists (select 1 from ledger_transactions where idempotency_key = 'poker:hand:' || p_hand || ':settle') then
    raise exception 'ALREADY_PAID';
  end if;
  if exists (select 1 from poker_hand_players where hand_id = p_hand and stack + total_bet <> start_stack) then
    raise exception 'INVARIANT_CHIPS';
  end if;
  if exists (select 1 from poker_hand_players hp join poker_seats s on s.id = hp.seat_id
             where hp.hand_id = p_hand and (s.status <> 'SEATED' or s.stack <> hp.start_stack)) then
    raise exception 'INVARIANT_SEAT_STACK';
  end if;
  select server_seed into seed from poker_hand_secrets where hand_id = p_hand;
  perform set_config('pvp.poker_recovery', 'refund:' || p_hand::text, true);
  update poker_hand_players set refund = total_bet, won = 0, wagered = 0, end_stack = start_stack
    where hand_id = p_hand;
  update poker_hands set status = 'VOIDED', server_seed = encode(seed, 'hex'), void_reason = 'settlement_refund',
    to_act = null, action_deadline = null, completed_at = clock_timestamp(),
    next_hand_at = clock_timestamp() + interval '1 second', version = version + 1
  where id = p_hand;
  perform set_config('pvp.poker_recovery', '', true);
  perform public._poker_log(p_hand, null, null, h.street, 'VOID', 0, null, false, null, null);
  update poker_tables set hand_id = null where hand_id = p_hand;
  perform _audit(uid, 'poker_settle_refunded', p_hand, actor || jsonb_build_object(
    'refunds', (select jsonb_object_agg(seat_no, total_bet) from poker_hand_players where hand_id = p_hand)));
  perform public._poker_post_hand(h.table_id);
  perform public._poker_touch(h.table_id);
  return jsonb_build_object('ok', true, 'result', 'refunded');
end $$;

create or replace function public.poker_admin_collusion_signals(
  p_days int default 7, p_min_hands int default 5, p_limit int default 50
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := public._poker_require_admin(); days int := least(greatest(coalesce(p_days, 7), 1), 30);
  lim int := least(greatest(coalesce(p_limit, 50), 1), 200); min_h int := greatest(coalesce(p_min_hands, 5), 2);
  max_hands int := 20000; scanned int; res jsonb;
begin
  create temp table if not exists pg_temp.poker_sig_hands (id bigint primary key, table_id bigint, players int) on commit drop;
  create temp table if not exists pg_temp.poker_sig_tx (hand_id bigint, from_user uuid, to_user uuid, amount numeric,
    from_folded boolean, split_pot boolean, exact boolean) on commit drop;
  truncate pg_temp.poker_sig_hands, pg_temp.poker_sig_tx;
  insert into pg_temp.poker_sig_hands
  select h.id, h.table_id, (select count(*) from poker_hand_players hp where hp.hand_id = h.id)
  from poker_hands h
  where h.status = 'COMPLETED' and h.completed_at > clock_timestamp() - make_interval(days => days)
  order by h.completed_at desc
  limit max_hands;
  get diagnostics scanned = row_count;
  insert into pg_temp.poker_sig_tx
  select sh.id, t.* from pg_temp.poker_sig_hands sh cross join lateral public._poker_hand_transfers(sh.id) t;

  with part as (
    select hp.hand_id, sh.table_id, sh.players, hp.user_id
    from poker_hand_players hp join pg_temp.poker_sig_hands sh on sh.id = hp.hand_id
  ), ambiguous as (
    select distinct hand_id from pg_temp.poker_sig_tx where not exact
  ), shared as (
    select least(a.user_id, b.user_id) as ua, greatest(a.user_id, b.user_id) as ub,
      count(distinct a.hand_id) as hands,
      count(distinct a.hand_id) filter (where a.players >= 3) as multiway_hands,
      count(distinct a.hand_id) filter (where a.hand_id in (select hand_id from ambiguous)) as ambiguous_hands,
      count(distinct a.table_id) as tables
    from part a join part b on b.hand_id = a.hand_id and a.user_id < b.user_id
    group by 1, 2 having count(distinct a.hand_id) >= min_h
  ), pair_hand as (
    -- Per hand and pair: chips each way, whether the payer folded, and chopped pots.
    select least(t.from_user, t.to_user) as ua, greatest(t.from_user, t.to_user) as ub, t.hand_id,
      sum(t.amount) filter (where t.from_user < t.to_user) as a_to_b,
      sum(t.amount) filter (where t.from_user > t.to_user) as b_to_a,
      bool_or(t.from_folded) filter (where t.from_user < t.to_user) as a_folded,
      bool_or(t.from_folded) filter (where t.from_user > t.to_user) as b_folded,
      bool_or(t.split_pot) as chopped
    from pg_temp.poker_sig_tx t where t.exact
    group by 1, 2, 3
  ), agg as (
    select s.ua, s.ub, s.hands, s.multiway_hands, s.ambiguous_hands, s.tables,
      coalesce(sum(ph.a_to_b), 0) as a_to_b, coalesce(sum(ph.b_to_a), 0) as b_to_a,
      count(ph.hand_id) filter (where coalesce(ph.a_to_b, 0) <> coalesce(ph.b_to_a, 0)) as transfers,
      count(ph.hand_id) filter (where (coalesce(ph.a_to_b, 0) > coalesce(ph.b_to_a, 0) and coalesce(ph.a_folded, false))
                                   or (coalesce(ph.b_to_a, 0) > coalesce(ph.a_to_b, 0) and coalesce(ph.b_folded, false)))
        as folded_transfers,
      count(ph.hand_id) filter (where ph.chopped) as split_pots
    from shared s left join pair_hand ph on ph.ua = s.ua and ph.ub = s.ub
    group by s.ua, s.ub, s.hands, s.multiway_hands, s.ambiguous_hands, s.tables
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'user_a', a.ua, 'user_b', a.ub,
      'username_a', (select username from profiles where id = a.ua),
      'username_b', (select username from profiles where id = a.ub),
      'hands', a.hands, 'multiway_hands', a.multiway_hands, 'ambiguous_hands', a.ambiguous_hands,
      'tables', a.tables, 'transfers', a.transfers, 'split_pots', a.split_pots,
      'a_to_b', round(a.a_to_b, 2), 'b_to_a', round(a.b_to_a, 2),
      'flow', round(a.a_to_b - a.b_to_a, 2), 'gross', round(a.a_to_b + a.b_to_a, 2),
      'one_way', case when a.a_to_b + a.b_to_a > 0 then round(abs(a.a_to_b - a.b_to_a) / (a.a_to_b + a.b_to_a), 3) end,
      'no_showdown', case when a.transfers > 0 then round(a.folded_transfers::numeric / a.transfers, 3) end
    ) order by abs(a.a_to_b - a.b_to_a) desc, a.ua, a.ub), '[]'::jsonb)
  into res
  from (select * from agg where a_to_b + b_to_a > 0
        order by abs(a_to_b - b_to_a) desc, ua, ub limit lim) a;
  perform _audit(uid, 'poker_collusion_signals_viewed', null,
    jsonb_build_object('days', days, 'min_hands', min_h, 'limit', lim, 'hands_scanned', scanned));
  return jsonb_build_object('days', days, 'min_hands', min_h, 'pairs', res,
    'hands_scanned', scanned, 'truncated', scanned >= max_hands,
    'ambiguous_hands', (select count(distinct hand_id) from pg_temp.poker_sig_tx where not exact),
    'method', 'Per pot: each contributor''s chips are split among that pot''s winners by their payout shares; fees go to the house.',
    'note', 'Review signals only. They are not evidence of collusion and trigger no action.');
end $$;

alter table public.roulette_games
  add constraint roulette_games_seed_after_finish
  check (server_seed is null or status in ('COMPLETED', 'CANCELLED')) not valid;
alter table public.roulette_games validate constraint roulette_games_seed_after_finish;
