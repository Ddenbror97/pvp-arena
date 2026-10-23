-- A seated pair who are both at the table should not sit through the AFK minute.
-- The page sends a presence touch every 4 seconds. Both seats fresh within 15
-- seconds means neither player is away, so the rack opens on this tick.
-- One quiet seat keeps the full starting_seconds wait. An opener who never
-- arrives is still played by the table when that wait ends.

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

create or replace function public.pool_state(p_match bigint) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare g public.pool_matches; seed text; cfg public.pool_config;
begin
  select * into g from pool_matches where id = p_match;
  if not found then raise exception 'MATCH_NOT_FOUND'; end if;
  select * into cfg from pool_config;
  if g.status in ('PLAYING', 'COMPLETED') then
    select encode(server_seed, 'hex') into seed from pool_secrets where match_id = g.id;
  end if;
  return jsonb_build_object(
    'id', g.id, 'status', g.status, 'stake', g.stake, 'pot', g.pot, 'fee_bps', g.fee_bps,
    'fee_amount', g.fee_amount, 'payout_amount', g.payout_amount,
    'creator_id', g.creator_id, 'opponent_id', g.opponent_id,
    'server_seed_hash', g.server_seed_hash, 'server_seed', seed,
    'state', g.state, 'state_hash', g.state_hash, 'turn_deadline', g.turn_deadline,
    'winner_id', g.winner_id, 'win_reason', g.win_reason, 'version', g.version,
    'server_now', clock_timestamp(), 'cancel_reason', g.cancel_reason,
    'phase_at', g.phase_at, 'stand_in', g.stand_in, 'shot_seconds', cfg.shot_seconds,
    'opens_at', case
      when g.status <> 'STARTING' then null
      when g.seen_a > clock_timestamp() - interval '15 seconds'
       and g.seen_b > clock_timestamp() - interval '15 seconds'
      then clock_timestamp()
      else g.phase_at + make_interval(secs => cfg.starting_seconds)
    end,
    'creator', (select jsonb_build_object('username', username, 'avatar_url', avatar_url) from profiles where id = g.creator_id),
    'opponent', (select jsonb_build_object('username', username, 'avatar_url', avatar_url) from profiles where id = g.opponent_id),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'seq', e.seq, 'kind', e.kind, 'seat', e.seat, 'input', e.input, 'state_hash', e.state_hash, 'event', e.event
      ) order by e.seq)
      from pool_events e where e.match_id = g.id
    ), '[]'::jsonb)
  );
end $$;
