-- The open table asks for the stand-in shot after STAND_IN_THINK_MS (2s).
-- The one-second worker is the backup when nobody has the match open, and
-- it used to wait until six seconds of the shot clock had passed.

create or replace function public._pool_stand_in_if_due(p_match bigint) returns void
language plpgsql security definer set search_path = public as $$
declare g public.pool_matches; cfg public.pool_config;
begin
  select * into g from pool_matches where id = p_match;
  if not found or g.status <> 'PLAYING' or g.state is null or g.stand_in is null or g.turn_deadline is null then
    return;
  end if;
  if g.state->>'turn' is distinct from g.stand_in or g.state->>'winner' is not null then return; end if;
  select * into cfg from pool_config;
  if g.turn_deadline > clock_timestamp() - interval '45 seconds'
     and g.turn_deadline <= clock_timestamp() + make_interval(secs => greatest(cfg.shot_seconds - 2, 0)) then
    perform public._pool_request_stand_in(g.id);
  end if;
end $$;

revoke all on function public._pool_stand_in_if_due(bigint) from public, anon, authenticated;
