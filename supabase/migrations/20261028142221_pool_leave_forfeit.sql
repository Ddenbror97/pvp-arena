-- A live 8-ball table has no partial cash-out. Calling pool_leave used to
-- return 90% of the leaver's stake and refund the opponent, so a player who
-- was about to lose could save the stake. The same call now forfeits that
-- seat. The opponent is paid the normal win, and the 5% pot fee still applies.
-- A waiting table still cannot be cancelled.

create or replace function public.pool_leave(p_match bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  g public.pool_matches;
  seat text;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  perform public._assert_live_session();
  select * into g from pool_matches where id = p_match for update;
  if not found then raise exception 'MATCH_NOT_FOUND'; end if;
  seat := public._pool_seat(g, uid);
  if seat is null then raise exception 'FORBIDDEN'; end if;
  if g.status <> 'PLAYING'
     or g.opponent_id is null
     or g.state is null
     or g.state->>'winner' is not null
     or exists (select 1 from pool_payouts where match_id = g.id) then
    return jsonb_build_object('left', false, 'match_id', g.id);
  end if;
  delete from pool_pending where match_id = g.id;
  perform public.pool_forfeit_seat(g.id, seat);
  update pool_matches set left_by = uid where id = g.id and status = 'COMPLETED';
  if not exists (select 1 from pool_matches where id = g.id and status = 'COMPLETED') then
    return jsonb_build_object('left', false, 'match_id', g.id);
  end if;
  perform public._pool_audit(uid, 'POOL_FORFEIT', g.id, jsonb_build_object('seat', seat, 'leaver', uid));
  return jsonb_build_object('left', true, 'forfeited', true, 'match_id', g.id);
end $$;

revoke all on function public.pool_leave(bigint) from public, anon;
grant execute on function public.pool_leave(bigint) to authenticated;
