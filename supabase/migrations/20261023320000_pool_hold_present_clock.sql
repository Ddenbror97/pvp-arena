-- A seat that is still at the table does not forfeit on the shot clock.
-- Presence is the 4-second touch. Fresh within 15 seconds means the player
-- is aiming, so the clock starts another window instead of a timeout.
-- A seat that has gone quiet still gets one reconnect window, then timeouts,
-- and the third timeout away still forfeits.

create or replace function public._pool_tick_one(p_match bigint) returns text
language plpgsql security definer set search_path = public as $$
declare g public.pool_matches; cfg public.pool_config; seat text; seen timestamptz; shots int;
begin
  select * into g from pool_matches where id = p_match for update;
  if not found then return 'missing'; end if;
  select * into cfg from pool_config;
  if g.status = 'WAITING' and g.expires_at <= clock_timestamp() then
    perform public._pool_refund(g.id, 'WAITING_EXPIRED');
    return 'refunded';
  end if;
  if g.status = 'STARTING' and (
    (g.seen_a > clock_timestamp() - interval '15 seconds'
     and g.seen_b > clock_timestamp() - interval '15 seconds')
    or g.phase_at <= clock_timestamp() - make_interval(secs => cfg.starting_seconds)
  ) then
    begin
      perform public.pool_begin(g.id, public.pool_fresh_state(
        (select server_seed from pool_secrets where match_id = g.id)
      ));
      return 'opened';
    exception when others then
      perform public._pool_refund(g.id, 'START_FAILED');
      return 'refunded';
    end;
  end if;
  if g.status <> 'PLAYING' or g.state is null or g.state->>'winner' is not null then return 'idle'; end if;
  shots := coalesce((g.state->>'shot')::int, 0);
  if g.seen_a <= clock_timestamp() - make_interval(secs => cfg.both_gone_seconds)
     and g.seen_b <= clock_timestamp() - make_interval(secs => cfg.both_gone_seconds) then
    if shots = 0 then
      update pool_matches set status = 'STARTING' where id = g.id;
      perform public._pool_refund(g.id, 'BOTH_LEFT_BEFORE_BREAK');
      return 'refunded';
    end if;
    perform public.pool_forfeit_seat(g.id, g.state->>'turn');
    return 'forfeit_absent';
  end if;
  if g.stand_in is not null and g.state->>'turn' = g.stand_in and g.turn_deadline is not null then
    if g.turn_deadline > clock_timestamp() - interval '45 seconds' then
      if g.turn_deadline <= clock_timestamp() + make_interval(secs => greatest(cfg.shot_seconds - 6, 0)) then
        perform public._pool_request_stand_in(g.id);
      end if;
      if g.turn_deadline > clock_timestamp() then return 'waiting'; end if;
      return 'stand_in';
    end if;
    perform public._pool_log_timeout(g.id);
    return 'timeout';
  end if;
  if g.turn_deadline is null or g.turn_deadline > clock_timestamp() then return 'waiting'; end if;
  seat := g.state->>'turn';
  seen := case seat when 'A' then g.seen_a else g.seen_b end;
  if seen > clock_timestamp() - interval '15 seconds' then
    update pool_matches set
      turn_deadline = clock_timestamp() + make_interval(secs => cfg.shot_seconds)
    where id = g.id;
    return 'held';
  end if;
  if seen < clock_timestamp() - interval '15 seconds' and g.grace_until is null
     and g.grace_shot is distinct from shots then
    update pool_matches set grace_until = clock_timestamp() + make_interval(secs => cfg.reconnect_seconds),
      grace_seat = seat, grace_shot = shots,
      turn_deadline = clock_timestamp() + make_interval(secs => cfg.reconnect_seconds)
      where id = g.id;
    return 'grace';
  end if;
  if g.grace_until is not null and g.grace_until > clock_timestamp() then return 'grace'; end if;
  perform public._pool_log_timeout(g.id);
  return 'timeout';
end $$;
