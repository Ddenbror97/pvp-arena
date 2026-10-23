-- A forfeit on a match that is no longer playing must not look like a new settlement.
-- pool_forfeit_seat already returns without paying twice. The RPC used to still
-- answer forfeited:true, which a client could read as a second payout.

create or replace function public.pool_forfeit(p_match bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); g public.pool_matches; seat text;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  perform public._assert_live_session();
  select * into g from pool_matches where id = p_match;
  if not found then raise exception 'MATCH_NOT_FOUND'; end if;
  seat := public._pool_seat(g, uid);
  if seat is null then raise exception 'FORBIDDEN'; end if;
  if g.status <> 'PLAYING' or g.state is null or g.state->>'winner' is not null then
    return jsonb_build_object('forfeited', false, 'match_id', g.id);
  end if;
  perform public.pool_forfeit_seat(g.id, seat);
  return jsonb_build_object('forfeited', true, 'match_id', g.id);
end $$;
