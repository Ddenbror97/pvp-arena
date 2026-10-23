-- Many live 8-ball tables share the one-second worker with the other games.
-- Walk the soonest clocks first, skip a row another shot is already holding,
-- and stop before this tick can stall the rest of the worker.

create or replace function public.pool_tick() returns jsonb
language plpgsql security definer set search_path = public as $$
declare r record; n int := 0; started timestamptz := clock_timestamp();
begin
  if not pg_try_advisory_xact_lock(hashtext('pool_tick')) then
    return jsonb_build_object('skipped', 'busy');
  end if;
  perform set_config('lock_timeout', '40ms', true);
  for r in
    select id from pool_matches
    where status in ('WAITING','STARTING','PLAYING')
    order by coalesce(turn_deadline, expires_at, phase_at), id
    limit 80
  loop
    if clock_timestamp() - started > interval '250 milliseconds' then
      exit;
    end if;
    begin
      perform public._pool_tick_one(r.id);
      n := n + 1;
    exception
      when lock_not_available then
        null;
    end;
  end loop;
  return jsonb_build_object('processed', n);
end $$;
