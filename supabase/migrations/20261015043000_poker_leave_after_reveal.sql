-- Leaving during the reveal window voided the hand even when the leaver had already
-- revealed, cancelling everyone's hand and striking the leaver for nothing: the deck
-- no longer depends on them. Now only a leaver whose reveal is missing voids the
-- hand; one who has revealed stays in it and is folded when the turn reaches them,
-- like a leave during betting. Chips already in the pot stay there; the rest of the
-- stack is cashed out when the hand ends.

create or replace function public.poker_leave(p_table bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := public._poker_uid(); s poker_seats; t poker_tables; h poker_hands; hp poker_hand_players;
begin
  select * into t from poker_tables where id = p_table for update;
  if not found then raise exception 'TABLE_NOT_FOUND'; end if;
  select * into s from poker_seats where table_id = p_table and user_id = uid and status = 'SEATED' for update;
  if not found then return jsonb_build_object('ok', true, 'already', true); end if;
  if s.leaving and public._poker_in_hand(s.id) then
    return jsonb_build_object('ok', true, 'pending', true, 'unchanged', true);
  end if;
  update poker_seats set leaving = true where id = s.id;
  if t.hand_id is not null then
    select * into h from poker_hands where id = t.hand_id for update;
    select * into hp from poker_hand_players where hand_id = h.id and seat_id = s.id;
    if found then
      if h.status = 'COMMIT' and hp.reveal is null then
        perform public._poker_void(h.id, 'player_left', array[uid]);
      elsif h.status = 'BETTING' and h.to_act = hp.seat_no and not hp.folded then
        perform public._poker_apply(h.id, hp.seat_no, 'FOLD', 0, 'leave', null);
      end if;
    end if;
  end if;
  if not public._poker_in_hand(s.id) then perform public._poker_cashout(s.id); end if;
  perform public._poker_touch(p_table);
  return jsonb_build_object('ok', true, 'pending', public._poker_in_hand(s.id));
end $$;

revoke all on function public.poker_leave(bigint) from public, anon;
grant execute on function public.poker_leave(bigint) to authenticated;
