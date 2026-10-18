-- Poker: cap the number of tables in play.
--
-- Every real-money ledger insert in every game queues on the shared
-- withdraw-basis lock. Isolated stress runs kept other games' ledger writes
-- under 100 ms p95 at 10 busy bot tables and exceeded it from 25. Until that
-- lock is redesigned, the number of tables with seated players is capped.
--
-- A table is active while it is OPEN and has a SEATED player. Joining an
-- active table is never refused by the cap. Taking the first seat at an empty
-- table (or creating one) is refused with TABLE_CAP_REACHED once the cap is
-- reached. Those first-seat sits serialize on one advisory lock, taken after
-- the table row and before any wallet, so concurrent sits cannot overshoot.
-- Lowering the cap never removes anyone: it only stops new tables starting.

alter table public.poker_config
  add column max_active_tables int not null default 10 check (max_active_tables between 1 and 500);

create or replace function public.poker_sit(
  p_table bigint, p_type smallint, p_seat smallint, p_buy_in bigint, p_chain_head text, p_key text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := public._poker_uid(); prof profiles; c poker_config; ty poker_table_types; t poker_tables;
  jc money_domain_config; s poker_seats; v_seat smallint; head text := lower(coalesce(p_chain_head, '')); running boolean;
begin
  if p_key is null or length(p_key) not between 8 and 100 then raise exception 'INVALID_IDEMPOTENCY_KEY'; end if;
  perform pg_advisory_xact_lock(hashtext('poker:' || uid::text || ':' || p_key));
  select * into s from poker_seats where user_id = uid and idempotency_key = p_key;
  if found then
    return jsonb_build_object('duplicate', true, 'table_id', s.table_id, 'seat_no', s.seat_no);
  end if;
  select * into prof from profiles where id = uid;
  if not found then raise exception 'PROFILE_REQUIRED'; end if;
  if prof.self_excluded_until is not null and prof.self_excluded_until > now() then raise exception 'SELF_EXCLUDED'; end if;
  select * into c from poker_config;
  if not c.enabled then raise exception 'POKER_DISABLED'; end if;
  if not public._play_domain_open() then raise exception 'REAL_MONEY_DISABLED'; end if;
  if public._poker_void_strikes(uid) >= c.void_strikes_per_day then raise exception 'VOID_COOLDOWN'; end if;
  perform public._poker_assert_fresh_chain(head);
  select * into jc from money_domain_config;

  if p_table is null then
    select * into ty from poker_table_types where id = p_type and enabled;
    if not found then raise exception 'INVALID_TABLE_TYPE'; end if;
    select * into t from poker_tables pt
      where pt.type_id = ty.id and pt.status = 'OPEN' and pt.account_type = jc.account_type
        and pt.seated < pt.max_seats
        and not exists (select 1 from poker_seats x where x.table_id = pt.id and x.user_id = uid and x.status = 'SEATED')
      order by pt.seated desc, pt.id
      limit 1
      for update;
    if not found then
      insert into poker_tables (type_id, name, money_domain, asset, account_type, small_blind, big_blind,
        min_buy_in, max_buy_in, max_seats, fee_bps)
      values (ty.id, ty.label || ' Hold''em', jc.money_domain, jc.asset, jc.account_type, ty.small_blind,
        ty.big_blind, ty.min_buy_in, ty.max_buy_in, ty.max_seats, c.fee_bps)
      returning * into t;
      update poker_tables set name = ty.label || ' Hold''em #' || t.id where id = t.id;
    end if;
  else
    select * into t from poker_tables where id = p_table for update;
    if not found then raise exception 'TABLE_NOT_FOUND'; end if;
  end if;
  if t.status <> 'OPEN' then raise exception 'TABLE_CLOSED'; end if;
  if t.account_type <> jc.account_type then raise exception 'REAL_MONEY_DISABLED'; end if;
  if exists (select 1 from poker_seats where table_id = t.id and user_id = uid and status = 'SEATED') then
    raise exception 'ALREADY_SEATED';
  end if;
  if (select count(*) from poker_seats where user_id = uid and status = 'SEATED') >= c.max_tables_per_user then
    raise exception 'TOO_MANY_TABLES';
  end if;
  if not exists (select 1 from poker_seats where table_id = t.id and status = 'SEATED') then
    perform pg_advisory_xact_lock(hashtext('poker-active-table-cap'));
    if (select count(distinct x.table_id) from poker_seats x join poker_tables pt on pt.id = x.table_id
        where x.status = 'SEATED' and pt.status = 'OPEN') >= c.max_active_tables then
      raise exception 'TABLE_CAP_REACHED';
    end if;
  end if;
  if p_buy_in is null or p_buy_in < t.min_buy_in or p_buy_in > t.max_buy_in then raise exception 'INVALID_BUY_IN'; end if;
  if p_seat is not null then
    if p_seat < 0 or p_seat >= t.max_seats then raise exception 'INVALID_SEAT'; end if;
    if exists (select 1 from poker_seats x where x.table_id = t.id and x.seat_no = p_seat and x.status = 'SEATED') then
      raise exception 'SEAT_TAKEN';
    end if;
    v_seat := p_seat;
  else
    select g::smallint into v_seat from generate_series(0, t.max_seats - 1) g
      where not exists (select 1 from poker_seats x where x.table_id = t.id and x.seat_no = g and x.status = 'SEATED')
      order by g limit 1;
    if v_seat is null then raise exception 'TABLE_FULL'; end if;
  end if;
  running := t.hand_id is not null or (select count(*) from poker_seats x where x.table_id = t.id and x.status = 'SEATED'
                                       and x.state = 'ACTIVE' and x.stack > 0) >= 2;
  insert into poker_seats (table_id, seat_no, user_id, chain_link, owes_bb, idempotency_key)
    values (t.id, v_seat, uid, head, running, p_key)
    returning * into s;
  perform public._poker_take_cash(s.id, p_buy_in, false);
  perform _audit(uid, 'poker_sit', t.id, jsonb_build_object('seat_id', s.id, 'seat_no', v_seat, 'buy_in', p_buy_in));
  if t.hand_id is null then perform public._poker_tick_table(t.id); else perform public._poker_touch(t.id); end if;
  return jsonb_build_object('duplicate', false, 'table_id', t.id, 'seat_no', v_seat);
end $$;
