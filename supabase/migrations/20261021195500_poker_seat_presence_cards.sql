-- Players at a bot table were sat out before the deal and never received cards.
-- last_seen_at stayed on the sit timestamp for the whole hand (Jimmy at the 100
-- and 250 tables, ddenbror97 at the 250 table, 2026-10-21 19:09-19:12 UTC). The next
-- hand then marked them away and dealt only the bots.
--
-- The seated browser already polls poker_table_state every couple of seconds, and
-- that call is authenticated. Count it as presence. A bet or a reveal counts too.
-- poker_heartbeat now returns jsonb so the presence write is a normal RPC result.

CREATE OR REPLACE FUNCTION public.poker_table_state(p_table bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $fn$
declare uid uuid := auth.uid(); t poker_tables; cur bigint; last_done bigint; me jsonb := null; ms poker_seats;
  hp poker_hand_players; h poker_hands; cards smallint[];
begin
  -- The open table view is what a seated browser already polls. Count it as presence
  -- so a missed heartbeat cannot sit them out and deal the next hand without them.
  if uid is not null then
    update poker_seats set last_seen_at = clock_timestamp()
    where table_id = p_table and user_id = uid and status = 'SEATED'
      and last_seen_at < clock_timestamp() - interval '3 seconds';
  end if;
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
        'is_bot', p.is_bot,
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
end $fn$


drop function if exists public.poker_heartbeat(bigint);

create function public.poker_heartbeat(p_table bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then return jsonb_build_object('ok', false); end if;
  update poker_seats set last_seen_at = clock_timestamp()
  where table_id = p_table and user_id = uid and status = 'SEATED'
    and last_seen_at < clock_timestamp() - interval '3 seconds';
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.poker_heartbeat(bigint) from public, anon;
grant execute on function public.poker_heartbeat(bigint) to authenticated;

create or replace function public.poker_reveal(p_hand bigint, p_value text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := public._poker_uid(); h poker_hands; hp poker_hand_players; v text := lower(coalesce(p_value, ''));
begin
  select * into h from poker_hands where id = p_hand;
  if not found then raise exception 'HAND_NOT_FOUND'; end if;
  perform 1 from poker_tables where id = h.table_id for update;
  select * into h from poker_hands where id = p_hand for update;
  select * into hp from poker_hand_players where hand_id = p_hand and user_id = uid;
  if not found then raise exception 'NOT_IN_HAND'; end if;
  if hp.reveal is not null then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  if h.status <> 'COMMIT' then return jsonb_build_object('ok', false, 'reason', 'not_open'); end if;
  if v !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_REVEAL'; end if;
  if encode(extensions.digest(decode(v, 'hex'), 'sha256'), 'hex') <> hp.link then raise exception 'REVEAL_MISMATCH'; end if;
  update poker_hand_players set reveal = v where hand_id = p_hand and seat_no = hp.seat_no;
  update poker_seats set chain_link = v, last_seen_at = clock_timestamp() where id = hp.seat_id;
  perform public._poker_deal(p_hand);
  perform public._poker_touch(h.table_id);
  return jsonb_build_object('ok', true, 'duplicate', false);
end $$;

create or replace function public.poker_act(
  p_hand bigint, p_version int, p_action text, p_amount bigint, p_key text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := public._poker_uid(); h poker_hands; hp poker_hand_players;
begin
  if p_key is null or length(p_key) not between 8 and 100 then raise exception 'INVALID_IDEMPOTENCY_KEY'; end if;
  select * into h from poker_hands where id = p_hand;
  if not found then raise exception 'HAND_NOT_FOUND'; end if;
  perform 1 from poker_tables where id = h.table_id for update;
  if exists (select 1 from poker_actions where hand_id = p_hand and user_id = uid and idempotency_key = p_key) then
    return jsonb_build_object('ok', true, 'duplicate', true);
  end if;
  select * into h from poker_hands where id = p_hand for update;
  if h.status <> 'BETTING' then raise exception 'HAND_NOT_ACTIVE'; end if;
  select * into hp from poker_hand_players where hand_id = p_hand and user_id = uid;
  if not found then raise exception 'NOT_IN_HAND'; end if;
  if h.to_act is distinct from hp.seat_no then raise exception 'NOT_YOUR_TURN'; end if;
  if p_version is distinct from h.version then raise exception 'STALE_STATE'; end if;
  if clock_timestamp() > h.action_deadline + interval '1 second' then raise exception 'ACTION_EXPIRED'; end if;
  update poker_seats set timeouts = 0, last_seen_at = clock_timestamp() where id = hp.seat_id;
  perform public._poker_apply(p_hand, hp.seat_no, p_action, p_amount, 'player', p_key);
  perform public._poker_touch(h.table_id);
  return jsonb_build_object('ok', true, 'duplicate', false);
end $$;
