-- Poker seat presence.
--
-- A player who closed the browser stayed "seated" indefinitely. The next hand dealt them in,
-- nobody answered their fairness reveal, and the hand voided: the opponent's hand was
-- cancelled, the absent player took a void strike, and three strikes in 24 hours locked them
-- out of poker entirely (VOID_COOLDOWN).
--
-- Seated browsers now send a heartbeat. Before a hand opens, ACTIVE seats not seen for
-- 20 seconds are sat out as 'away' instead of being dealt in: no void, no strike, and the
-- other players' hand goes ahead. The 300-second sit-out cash-out is unchanged.
-- sat_out_reason = 'manual' marks a player's own Sit out, so a returning browser deals itself
-- back in only when the sit-out was not the player's choice.

alter table public.poker_seats
  add column if not exists last_seen_at timestamptz not null default clock_timestamp(),
  add column if not exists sat_out_reason text
    check (sat_out_reason in ('manual', 'away'));

create or replace function public.poker_heartbeat(p_table bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  -- One write per seat every few seconds at most, however often the browser polls.
  update poker_seats set last_seen_at = clock_timestamp()
  where table_id = p_table and user_id = auth.uid() and status = 'SEATED'
    and last_seen_at < clock_timestamp() - interval '3 seconds';
end $$;

-- Same as 20261014352000; ACTIVE seats not seen for 20 s sit out before seats are chosen.
create or replace function public._poker_open_hand(p_table bigint) returns bigint
language plpgsql security definer set search_path = public, extensions as $$
declare t poker_tables; c poker_config; seats_arr int[]; n int; btn int; sbs int; bbs int; hid bigint; seed bytea;
  x record;
begin
  select * into t from poker_tables where id = p_table;
  if t.status <> 'OPEN' or t.hand_id is not null then return null; end if;
  select * into c from poker_config;
  if not c.enabled or not public._play_domain_open()
     or t.account_type <> (select account_type from money_domain_config) then
    return null;
  end if;
  for x in select s.id, s.user_id from poker_seats s
           where s.table_id = t.id and s.status = 'SEATED' and public._poker_self_excluded(s.user_id)
           order by s.id loop
    perform public._poker_cashout(x.id);
    perform _audit(x.user_id, 'poker_self_excluded_cashout', t.id, jsonb_build_object('seat_id', x.id));
  end loop;
  for x in update poker_seats set state = 'SITTING_OUT', sat_out_at = clock_timestamp(), sat_out_reason = 'away'
           where table_id = t.id and status = 'SEATED' and state = 'ACTIVE' and not leaving
             and last_seen_at < clock_timestamp() - interval '20 seconds'
           returning id, user_id, last_seen_at loop
    perform _audit(x.user_id, 'poker_seat_away', t.id, jsonb_build_object('seat_id', x.id, 'last_seen_at', x.last_seen_at));
  end loop;
  -- Top-ups bought during the last hand join the stack before it is frozen.
  update poker_seats set stack = stack + pending, pending = 0
    where table_id = t.id and status = 'SEATED' and pending > 0;
  select array_agg(seat_no::int order by seat_no) into seats_arr from poker_seats
    where table_id = t.id and status = 'SEATED' and state = 'ACTIVE' and not leaving
      and stack > 0 and chain_link is not null;
  n := coalesce(array_length(seats_arr, 1), 0);
  if n < 2 then return null; end if;
  btn := case when t.button_seat is null then seats_arr[1] else public._poker_next(seats_arr, t.button_seat, t.max_seats) end;
  if n = 2 then
    sbs := btn;
    bbs := public._poker_next(seats_arr, btn, t.max_seats);
  else
    sbs := public._poker_next(seats_arr, btn, t.max_seats);
    bbs := public._poker_next(seats_arr, sbs, t.max_seats);
  end if;
  seed := extensions.gen_random_bytes(32);
  insert into poker_hands (table_id, hand_no, asset, account_type, max_seats, button_seat, sb_seat, bb_seat,
    small_blind, big_blind, fee_bps, reveal_deadline, server_seed_hash)
  values (t.id, t.hand_count + 1, t.asset, t.account_type, t.max_seats, btn, sbs, bbs,
    t.small_blind, t.big_blind, t.fee_bps, clock_timestamp() + make_interval(secs => c.reveal_seconds),
    encode(extensions.digest(seed, 'sha256'), 'hex'))
  returning id into hid;
  insert into poker_hand_secrets (hand_id, server_seed) values (hid, seed);
  insert into poker_hand_players (hand_id, seat_no, seat_id, user_id, deal_index, link, posts_bb, start_stack, stack)
  select hid, s.seat_no, s.id, s.user_id,
    (row_number() over (order by public._poker_dist(btn, s.seat_no, t.max_seats)) - 1)::smallint,
    s.chain_link, s.owes_bb and s.seat_no <> bbs, s.stack, s.stack
  from poker_seats s
  where s.table_id = t.id and s.seat_no = any (seats_arr) and s.status = 'SEATED';
  update poker_tables set hand_id = hid, hand_count = hand_count + 1 where id = t.id;
  perform _audit(null, 'poker_hand_opened', hid, jsonb_build_object(
    'table', t.id, 'server_seed_hash', encode(extensions.digest(seed, 'sha256'), 'hex'), 'seats', to_jsonb(seats_arr)));
  return hid;
end $$;

-- Same as 20261014352000; records a manual sit-out, and sitting in clears the reason and
-- counts as being seen.
create or replace function public.poker_sit_out(p_table bigint, p_out boolean, p_chain_head text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := public._poker_uid(); s poker_seats; head text := nullif(lower(coalesce(p_chain_head, '')), '');
  t poker_tables;
begin
  select * into t from poker_tables where id = p_table for update;
  select * into s from poker_seats where table_id = p_table and user_id = uid and status = 'SEATED' for update;
  if not found then raise exception 'NOT_SEATED'; end if;
  if p_out then
    if s.state = 'SITTING_OUT' then
      update poker_seats set sat_out_reason = 'manual' where id = s.id and sat_out_reason is distinct from 'manual';
      return jsonb_build_object('ok', true, 'unchanged', true);
    end if;
    update poker_seats set state = 'SITTING_OUT', sat_out_at = clock_timestamp(), sat_out_reason = 'manual'
      where id = s.id;
  else
    if public._poker_self_excluded(uid) then raise exception 'SELF_EXCLUDED'; end if;
    if s.state = 'ACTIVE' and (head is null or head = s.chain_link) then
      return jsonb_build_object('ok', true, 'unchanged', true);
    end if;
    if head is not null and head is distinct from s.chain_link then
      perform public._poker_assert_fresh_chain(head, s.id);
    end if;
    if s.stack + s.pending = 0 then raise exception 'TOP_UP_REQUIRED'; end if;
    if coalesce(head, s.chain_link) is null then raise exception 'INVALID_CHAIN'; end if;
    if public._poker_void_strikes(uid) >= (select void_strikes_per_day from poker_config) then
      raise exception 'VOID_COOLDOWN';
    end if;
    update poker_seats set state = 'ACTIVE', sat_out_at = null, sat_out_reason = null, timeouts = 0,
      last_seen_at = clock_timestamp(),
      owes_bb = owes_bb or s.state = 'SITTING_OUT', chain_link = coalesce(head, chain_link)
    where id = s.id;
  end if;
  if t.hand_id is null then perform public._poker_tick_table(p_table); else perform public._poker_touch(p_table); end if;
  return jsonb_build_object('ok', true);
end $$;

-- Same as 20261014330000; `me` carries sat_out_reason.
create or replace function public.poker_table_state(p_table bigint) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid(); t poker_tables; cur bigint; last_done bigint; me jsonb := null; ms poker_seats;
  hp poker_hand_players; h poker_hands; cards smallint[];
begin
  select * into t from poker_tables where id = p_table;
  if not found then return null; end if;
  cur := t.hand_id;
  select id into last_done from poker_hands where table_id = t.id and status in ('COMPLETED', 'VOIDED')
    order by id desc limit 1;
  if uid is not null then
    select * into ms from poker_seats where table_id = t.id and user_id = uid and status = 'SEATED';
    if found then
      me := jsonb_build_object('seat_id', ms.id, 'seat_no', ms.seat_no, 'stack', ms.stack, 'pending', ms.pending,
        'state', ms.state, 'leaving', ms.leaving, 'chain_link', ms.chain_link, 'owes_bb', ms.owes_bb,
        'buy_in_total', ms.buy_in_total, 'timeouts', ms.timeouts, 'missed_reveals', ms.missed_reveals,
        'sat_out_reason', ms.sat_out_reason);
    end if;
    if cur is not null then
      select * into hp from poker_hand_players where hand_id = cur and user_id = uid;
      if found then
        select hc.cards into cards from poker_hole_cards hc where hc.hand_id = cur and hc.user_id = uid;
        select * into h from poker_hands where id = cur;
        me := coalesce(me, '{}'::jsonb) || jsonb_build_object(
          'hand_id', cur, 'hand_seat', hp.seat_no, 'hole_cards', to_jsonb(cards), 'link', hp.link,
          'revealed', hp.reveal is not null,
          'legal', case when h.status = 'BETTING' and h.to_act = hp.seat_no then public._poker_legal(cur, hp.seat_no) end);
      end if;
    end if;
  end if;
  return jsonb_build_object(
    'server_time', clock_timestamp(),
    'config', (select jsonb_build_object('enabled', enabled, 'fee_bps', fee_bps, 'action_seconds', action_seconds,
                 'reveal_seconds', reveal_seconds) from poker_config),
    'table', jsonb_build_object('id', t.id, 'type_id', t.type_id, 'name', t.name, 'status', t.status,
      'small_blind', t.small_blind, 'big_blind', t.big_blind, 'min_buy_in', t.min_buy_in, 'max_buy_in', t.max_buy_in,
      'max_seats', t.max_seats, 'fee_bps', t.fee_bps, 'button_seat', t.button_seat, 'hand_count', t.hand_count,
      'seated', t.seated, 'version', t.version, 'account_type', t.account_type),
    'seats', (select coalesce(jsonb_agg(jsonb_build_object(
        'seat_id', s.id, 'seat_no', s.seat_no, 'user_id', s.user_id, 'username', p.username, 'avatar_url', p.avatar_url,
        'stack', s.stack, 'pending', s.pending, 'state', s.state, 'leaving', s.leaving, 'owes_bb', s.owes_bb
      ) order by s.seat_no), '[]'::jsonb)
      from poker_seats s join profiles p on p.id = s.user_id where s.table_id = t.id and s.status = 'SEATED'),
    'hand', case when cur is not null then public._poker_hand_json(cur) end,
    'last_hand', case when last_done is not null then public._poker_hand_json(last_done) end,
    'recent', (select coalesce(jsonb_agg(x.j order by x.id desc), '[]'::jsonb) from (
        select h2.id, jsonb_build_object('id', h2.id, 'hand_no', h2.hand_no, 'board', to_jsonb(h2.board),
          'fee_total', h2.fee_total, 'completed_at', h2.completed_at,
          'pot', (select coalesce(sum(total_bet), 0) from poker_hand_players where hand_id = h2.id),
          'winners', (select coalesce(jsonb_agg(jsonb_build_object('seat_no', hp2.seat_no, 'username', pr.username,
                        'won', hp2.won, 'hand_name', hp2.hand_name) order by hp2.won desc), '[]'::jsonb)
                      from poker_hand_players hp2 join profiles pr on pr.id = hp2.user_id
                      where hp2.hand_id = h2.id and hp2.won > 0)) j
        from poker_hands h2 where h2.table_id = t.id and h2.status = 'COMPLETED' order by h2.id desc limit 12) x),
    'me', me
  );
end $$;

-- Same as 20261014330000; `mine` lists the viewer's open seats so the lobby can lead back to them.
create or replace function public.poker_lobby() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'enabled', (select enabled from poker_config),
    'fee_bps', (select fee_bps from poker_config),
    'action_seconds', (select action_seconds from poker_config),
    'types', coalesce((select jsonb_agg(jsonb_build_object(
        'id', ty.id, 'label', ty.label, 'category', ty.category, 'small_blind', ty.small_blind,
        'big_blind', ty.big_blind, 'min_buy_in', ty.min_buy_in, 'max_buy_in', ty.max_buy_in,
        'max_seats', ty.max_seats,
        'tables', (select count(*) from poker_tables t where t.type_id = ty.id and t.status = 'OPEN'),
        'players', (select coalesce(sum(t.seated), 0) from poker_tables t where t.type_id = ty.id and t.status = 'OPEN')
      ) order by ty.sort) from poker_table_types ty where ty.enabled), '[]'::jsonb),
    'tables', coalesce((select jsonb_agg(jsonb_build_object(
        'id', t.id, 'type_id', t.type_id, 'name', t.name, 'seated', t.seated, 'max_seats', t.max_seats,
        'hand_count', t.hand_count, 'live', t.hand_id is not null,
        'players', (select coalesce(jsonb_agg(jsonb_build_object('username', p.username, 'avatar_url', p.avatar_url)
                      order by s.seat_no), '[]'::jsonb)
                    from poker_seats s join profiles p on p.id = s.user_id
                    where s.table_id = t.id and s.status = 'SEATED')
      ) order by t.type_id, t.seated desc, t.id) from poker_tables t where t.status = 'OPEN'), '[]'::jsonb),
    'mine', coalesce((select jsonb_agg(jsonb_build_object(
        'table_id', t.id, 'name', t.name, 'stack', s.stack, 'state', s.state) order by s.id)
      from poker_seats s join poker_tables t on t.id = s.table_id
      where s.user_id = auth.uid() and s.status = 'SEATED'), '[]'::jsonb)
  )
$$;

revoke all on function public.poker_heartbeat(bigint) from public, anon;
grant execute on function public.poker_heartbeat(bigint) to authenticated;
