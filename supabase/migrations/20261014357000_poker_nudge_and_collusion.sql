-- Poker audit follow-ups: a rate-limited, recovery-safe poker_nudge, and collusion
-- signals attributed per pot so multiway hands are not double counted.

alter table public.poker_config
  add column if not exists nudge_rate_limit int not null default 20 check (nudge_rate_limit > 0),
  add column if not exists nudge_rate_window_seconds int not null default 10 check (nudge_rate_window_seconds > 0);
alter table public.poker_rate_limits drop constraint if exists poker_rate_limits_op_check;
alter table public.poker_rate_limits add constraint poker_rate_limits_op_check check (op in ('rpc', 'buy_in', 'nudge'));

-- Browser recovery hint. Counts against the caller's shared poker RPC budget and a
-- tighter nudge budget, so alternating RPCs cannot get around either. It only runs work
-- already due, through the worker's own path: one caller wins (SKIP LOCKED), the rest
-- get 'not_due', and a failing table is audited and backed off instead of retried hot.
create or replace function public.poker_nudge(p_table bigint) returns text
language plpgsql security definer set search_path = public as $$
declare uid uuid := public._poker_uid(); c poker_config; res text;
begin
  select * into c from poker_config;
  perform public._poker_rate(uid, 'nudge', c.nudge_rate_limit, c.nudge_rate_window_seconds);
  res := public._poker_tick_one(p_table);
  return case when res = 'skipped' then 'not_due' else res end;
end $$;

create or replace function public._jsonb_add_counts(a jsonb, b jsonb) returns jsonb
language sql immutable set search_path = public as $$
  select coalesce(jsonb_object_agg(key, total), '{}'::jsonb)
  from (
    select key, sum(value::bigint) as total
    from (select * from jsonb_each_text(coalesce(a, '{}'::jsonb))
          union all select * from jsonb_each_text(coalesce(b, '{}'::jsonb))) x
    group by key
  ) s
$$;

-- Chips that moved between players in one completed hand, per pot: each contributor's
-- chips in a pot go to that pot's winners in proportion to their shares (the fee goes
-- to the house). Contributions are rebuilt from wagered amounts with the same levels
-- _poker_pots used and must reproduce every stored pot amount; otherwise the hand is
-- returned as one row with exact = false and no transfers.
create or replace function public._poker_hand_transfers(p_hand bigint)
returns table (from_user uuid, to_user uuid, amount numeric, from_folded boolean, split_pot boolean, exact boolean)
language plpgsql stable security definer set search_path = public as $$
declare
  a_seat int[]; a_user uuid[]; contrib bigint[]; a_folded boolean[];
  n int; i int; lvl bigint; prev bigint := 0; amt bigint; x bigint; elig int[]; levels bigint[];
  slice jsonb; pc jsonb := '[]'; last_idx int; stored jsonb; k int; pamt bigint; shares jsonb;
  c record; w record; winners int;
begin
  select h.pots into stored from poker_hands h where h.id = p_hand and h.status = 'COMPLETED';
  select array_agg(hp.seat_no::int order by hp.seat_no), array_agg(hp.user_id order by hp.seat_no),
         array_agg(hp.wagered order by hp.seat_no), array_agg(hp.folded order by hp.seat_no)
    into a_seat, a_user, contrib, a_folded
  from poker_hand_players hp where hp.hand_id = p_hand;
  n := coalesce(array_length(a_seat, 1), 0);
  if stored is null or jsonb_typeof(stored) <> 'array' or n < 2 or array_position(contrib, null) is not null then
    return query select null::uuid, null::uuid, null::numeric, null::boolean, null::boolean, false;
    return;
  end if;

  select array_agg(distinct v order by v) into levels from unnest(contrib) v where v > 0;
  foreach lvl in array coalesce(levels, '{}') loop
    amt := 0;
    slice := '{}';
    for i in 1..n loop
      x := least(contrib[i], lvl) - least(contrib[i], prev);
      if x > 0 then
        amt := amt + x;
        slice := slice || jsonb_build_object(a_seat[i]::text, x);
      end if;
    end loop;
    elig := array(select a_seat[q] from generate_subscripts(a_seat, 1) q
                  where not a_folded[q] and contrib[q] >= lvl order by a_seat[q]);
    prev := lvl;
    continue when amt = 0;
    last_idx := jsonb_array_length(pc) - 1;
    if coalesce(array_length(elig, 1), 0) = 0 then
      if last_idx >= 0 then
        pc := jsonb_set(pc, array[last_idx::text], jsonb_build_object(
          'amount', (pc -> last_idx ->> 'amount')::bigint + amt, 'eligible', pc -> last_idx -> 'eligible',
          'contrib', public._jsonb_add_counts(pc -> last_idx -> 'contrib', slice)));
      else
        pc := pc || jsonb_build_array(jsonb_build_object('amount', amt, 'eligible', '[]'::jsonb, 'contrib', slice));
      end if;
      continue;
    end if;
    if last_idx >= 0 and (jsonb_array_length(pc -> last_idx -> 'eligible') = 0
                          or pc -> last_idx -> 'eligible' = to_jsonb(elig)) then
      pc := jsonb_set(pc, array[last_idx::text], jsonb_build_object(
        'amount', (pc -> last_idx ->> 'amount')::bigint + amt, 'eligible', to_jsonb(elig),
        'contrib', public._jsonb_add_counts(pc -> last_idx -> 'contrib', slice)));
      continue;
    end if;
    pc := pc || jsonb_build_array(jsonb_build_object('amount', amt, 'eligible', to_jsonb(elig), 'contrib', slice));
  end loop;

  if jsonb_array_length(pc) <> jsonb_array_length(stored) then
    return query select null::uuid, null::uuid, null::numeric, null::boolean, null::boolean, false;
    return;
  end if;
  for k in 0 .. jsonb_array_length(pc) - 1 loop
    pamt := (stored -> k ->> 'amount')::bigint;
    shares := stored -> k -> 'shares';
    if pamt is distinct from (pc -> k ->> 'amount')::bigint or pamt <= 0
       or jsonb_typeof(shares) <> 'object'
       or (select coalesce(sum(value::bigint), 0) from jsonb_each_text(shares))
          + coalesce((stored -> k ->> 'fee')::bigint, 0) <> pamt then
      return query select null::uuid, null::uuid, null::numeric, null::boolean, null::boolean, false;
      return;
    end if;
  end loop;

  for k in 0 .. jsonb_array_length(pc) - 1 loop
    pamt := (stored -> k ->> 'amount')::bigint;
    shares := stored -> k -> 'shares';
    select count(*) into winners from jsonb_each_text(shares) where value::bigint > 0;
    for c in select key::int as seat, value::bigint as x from jsonb_each_text(pc -> k -> 'contrib') loop
      for w in select key::int as seat, value::bigint as s from jsonb_each_text(shares) where value::bigint > 0 loop
        continue when w.seat = c.seat;
        from_user := a_user[array_position(a_seat, c.seat)];
        to_user := a_user[array_position(a_seat, w.seat)];
        amount := c.x::numeric * w.s / pamt;
        from_folded := a_folded[array_position(a_seat, c.seat)];
        split_pot := winners > 1;
        exact := true;
        return next;
      end loop;
    end loop;
  end loop;
end $$;

-- Read-only pair signals for operator review; nothing is changed and nobody is acted on.
-- Per pair, from completed hands in the window (most recent 20000 hands at most):
--   hands / multiway_hands  shared hands, and those with three or more players
--   a_to_b / b_to_a          chips attributed per pot from one to the other (cents)
--   flow                     a_to_b - b_to_a (positive: user_a lost to user_b)
--   gross, one_way           a_to_b + b_to_a, and |flow| / gross
--   no_showdown              share of hands with a net transfer where the paying side folded
--   split_pots               pots both players won a share of (a chop, not a transfer)
--   ambiguous_hands          shared hands whose pots could not be attributed (excluded)
-- A strong signal is large, one-way flow mostly by folding over few hands. A good player
-- against a weak one looks the same over a short sample: these are leads for review.
create or replace function public.poker_admin_collusion_signals(
  p_days int default 7, p_min_hands int default 5, p_limit int default 50
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); days int := least(greatest(coalesce(p_days, 7), 1), 30);
  lim int := least(greatest(coalesce(p_limit, 50), 1), 200); min_h int := greatest(coalesce(p_min_hands, 5), 2);
  max_hands int := 20000; scanned int; res jsonb;
begin
  if uid is not null then
    if not public.has_role(uid, 'admin') then raise exception 'FORBIDDEN'; end if;
    perform public._assert_live_session();
    perform public._require_admin_stepup();
  end if;
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

revoke all on function public._jsonb_add_counts(jsonb, jsonb) from public, anon, authenticated;
revoke all on function public._poker_hand_transfers(bigint) from public, anon, authenticated;
grant execute on function public._poker_hand_transfers(bigint) to service_role;
