-- Each commit used to resimulate every earlier shot in SQL, then the
-- server did it again in JavaScript. After a few strokes that replay
-- outlived the pending-shot window. A second caller took the row, the
-- first caller aborted it, and the seat timed out into ball in hand.
--
-- The rack on the match is the last accepted step. This checks that link
-- and plays only the new shot. A tampered rack still diverges. The full
-- fold remains available to the fairness replay.

create or replace function public.pool_commit_shot(p_match bigint, p_seq int, p_state jsonb, p_hash text, p_event jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  g public.pool_matches;
  pend public.pool_pending;
  cfg public.pool_config;
  winner uuid;
  reason text;
  played jsonb;
  prior jsonb;
  seed bytea;
  phys text;
  last_hash text;
begin
  select * into g from pool_matches where id = p_match for update;
  if not found then raise exception 'MATCH_NOT_FOUND'; end if;
  if g.status <> 'PLAYING' then
    delete from pool_pending where match_id = g.id;
    return jsonb_build_object('duplicate', true, 'match_id', g.id);
  end if;
  select * into pend from pool_pending where match_id = g.id and seq = p_seq;
  if not found then raise exception 'NO_PENDING_SHOT'; end if;
  if coalesce(p_event->>'standIn', '') in ('true', 't') then
    if g.stand_in is null
       or g.stand_in is distinct from g.state->>'turn'
       or public._pool_seat(g, pend.user_id) is distinct from g.stand_in then
      raise exception 'STAND_IN_CLEARED';
    end if;
  end if;
  if not exists (select 1 from pool_events where match_id = g.id) then
    select server_seed into seed from pool_secrets where match_id = g.id;
    if seed is null then raise exception 'SEED_MISSING'; end if;
    prior := public.pool_fresh_state(seed);
    phys := g.state->>'physics';
    if phys in ('pool-phys-v1', 'pool-phys-v2', 'pool-phys-v3', 'pool-phys-v4', 'pool-phys-v5', 'pool-phys-v6', 'pool-phys-v7') then
      prior := jsonb_set(prior, '{physics}', to_jsonb(phys));
    end if;
    if public.pool_state_canon(prior) is distinct from public.pool_state_canon(g.state) then
      raise exception 'STATE_DIVERGED';
    end if;
  else
    select e.state_hash into last_hash
      from pool_events e
      where e.match_id = g.id
      order by e.seq desc
      limit 1;
    if last_hash is distinct from g.state_hash
       or public.pool_state_hash(g.state) is distinct from g.state_hash then
      prior := public.pool_recorded_prior(g.id);
      if public.pool_state_canon(prior) is distinct from public.pool_state_canon(g.state) then
        raise exception 'STATE_DIVERGED';
      end if;
    else
      prior := g.state;
    end if;
  end if;
  played := public.pool_play(prior, pend.input);
  if p_state is null
     or public.pool_state_canon(played) is distinct from public.pool_state_canon(p_state)
     or public.pool_state_hash(played) is distinct from p_hash
     or (played->>'shot')::int is distinct from p_seq then
    raise exception 'RESULT_MISMATCH';
  end if;
  reason := played->>'reason';
  insert into pool_events (match_id, seq, kind, seat, input, state_hash, event)
    values (g.id, p_seq, 'shot', public._pool_seat(g, pend.user_id), pend.input, p_hash,
      coalesce(p_event, '{}'::jsonb) || jsonb_build_object('key', pend.idempotency_key));
  delete from pool_pending where id = pend.id;
  select * into cfg from pool_config;
  if played->>'winner' is null then
    update pool_matches set state = played, state_hash = p_hash, version = version + 1,
      grace_until = null, grace_seat = null,
      turn_deadline = clock_timestamp() + make_interval(secs => cfg.shot_seconds),
      seen_a = case when public._pool_seat(g, pend.user_id) = 'A' then clock_timestamp() else seen_a end,
      seen_b = case when public._pool_seat(g, pend.user_id) = 'B' then clock_timestamp() else seen_b end
      where id = g.id;
    return jsonb_build_object('duplicate', false, 'match_id', g.id, 'winner', null);
  end if;
  winner := public._pool_user_for_seat(g, played->>'winner');
  update pool_matches set state = played, state_hash = p_hash where id = g.id;
  perform public._pool_settle(g.id, winner, coalesce(reason, 'SHOT'));
  return jsonb_build_object('duplicate', false, 'match_id', g.id, 'winner', played->>'winner', 'reason', reason);
end $$;

-- A slow stand-in used to be stolen after 8 seconds. The thief then aborted
-- the row the first caller was still committing, so nobody shot.
create or replace function public.pool_prepare_stand_in(p_match bigint, p_input jsonb, p_key text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare g public.pool_matches; seat text; pend public.pool_pending; seq int; uid uuid;
begin
  if p_key is null or length(p_key) not between 8 and 100 then raise exception 'INVALID_IDEMPOTENCY_KEY'; end if;
  select * into g from pool_matches where id = p_match for update;
  if not found then raise exception 'MATCH_NOT_FOUND'; end if;
  if g.status <> 'PLAYING' or g.state is null then raise exception 'MATCH_NOT_LIVE'; end if;
  if g.state->>'winner' is not null then raise exception 'MATCH_FINISHED'; end if;
  seat := g.stand_in;
  if seat is null or seat is distinct from g.state->>'turn' then raise exception 'STAND_IN_CLEARED'; end if;
  uid := public._pool_user_for_seat(g, seat);
  if uid is null then raise exception 'BAD_SEAT'; end if;
  if exists (select 1 from pool_events where match_id = g.id and event->>'key' = p_key) then
    return jsonb_build_object('duplicate', true, 'match_id', g.id);
  end if;
  if (p_input->>'angleMilli')::int is null or (p_input->>'angleMilli')::int < 0 or (p_input->>'angleMilli')::int > 359999 then
    raise exception 'BAD_SHOT';
  end if;
  if (p_input->>'power')::int is null or (p_input->>'power')::int < 1 or (p_input->>'power')::int > 10000 then
    raise exception 'BAD_SHOT';
  end if;
  if (p_input->>'spinX') is null or (p_input->>'spinY') is null
     or (p_input->>'spinX')::int < -1000 or (p_input->>'spinX')::int > 1000
     or (p_input->>'spinY')::int < -1000 or (p_input->>'spinY')::int > 1000 then
    raise exception 'BAD_SHOT';
  end if;
  if p_input->>'calledPocket' is not null
     and ((p_input->>'calledPocket')::int < 0 or (p_input->>'calledPocket')::int > 5) then
    raise exception 'BAD_SHOT';
  end if;
  select * into pend from pool_pending where match_id = g.id;
  if found and pend.idempotency_key = p_key then
    if pend.created_at > clock_timestamp() - interval '20 seconds' then
      return jsonb_build_object('duplicate', true, 'match_id', g.id);
    end if;
    return jsonb_build_object('duplicate', false, 'match_id', g.id, 'seq', pend.seq, 'seat', seat, 'state', g.state);
  end if;
  if found and pend.created_at > clock_timestamp() - interval '20 seconds' then
    raise exception 'SHOT_IN_PROGRESS';
  end if;
  delete from pool_pending where match_id = g.id;
  seq := coalesce((g.state->>'shot')::int, 0) + 1;
  insert into pool_pending (match_id, seq, user_id, idempotency_key, input)
    values (g.id, seq, uid, p_key, p_input || jsonb_build_object('key', p_key));
  return jsonb_build_object('duplicate', false, 'match_id', g.id, 'seq', seq, 'seat', seat, 'state', g.state);
end $$;

create or replace function public.pool_abort_owned(p_match bigint, p_key text) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from pool_pending where match_id = p_match and idempotency_key = p_key;
end $$;

revoke all on function public.pool_prepare_stand_in(bigint, jsonb, text) from public, anon, authenticated;
grant execute on function public.pool_prepare_stand_in(bigint, jsonb, text) to service_role;
revoke all on function public.pool_abort_owned(bigint, text) from public, anon, authenticated;
grant execute on function public.pool_abort_owned(bigint, text) to service_role;
