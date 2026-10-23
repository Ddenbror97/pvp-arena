-- After both players are seated the rack waits 60 seconds, then opens.
-- If the creator never came to the table, stand_in stays on seat A and the
-- worker plays that seat's shots. A visible return clears the stand-in.
-- A missing job token or pg_net does not fail the one-second tick.

update public.pool_config set starting_seconds = 60 where id = 1;
alter table public.pool_config alter column starting_seconds set default 60;

alter table public.pool_matches
  add column if not exists stand_in text,
  add column if not exists stand_in_at timestamptz,
  add column if not exists stand_in_claim int;

alter table public.pool_matches drop constraint if exists pool_matches_stand_in_check;
alter table public.pool_matches
  add constraint pool_matches_stand_in_check check (stand_in is null or stand_in in ('A', 'B'));

create or replace function public.pool_begin(p_match bigint, p_state jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare g public.pool_matches; cfg public.pool_config; h text; seed bytea; expected jsonb; away text;
begin
  select * into g from pool_matches where id = p_match for update;
  if not found then raise exception 'MATCH_NOT_FOUND'; end if;
  if g.status = 'PLAYING' and g.state is not null then
    return jsonb_build_object('duplicate', true, 'match_id', g.id);
  end if;
  if g.status <> 'STARTING' or g.opponent_id is null then raise exception 'MATCH_NOT_STARTING'; end if;
  select server_seed into seed from pool_secrets where match_id = g.id;
  if seed is null then raise exception 'SEED_MISSING'; end if;
  expected := public.pool_fresh_state(seed);
  if p_state is null or public.pool_state_canon(p_state) is distinct from public.pool_state_canon(expected) then
    raise exception 'BAD_RACK';
  end if;
  h := public.pool_state_hash(expected);
  select * into cfg from pool_config;
  -- seen_a is set only when the creator's tab was open during the wait.
  away := case when g.seen_a is null then 'A' else null end;
  update pool_matches set status = 'PLAYING', state = expected, state_hash = h, phase_at = clock_timestamp(),
    stand_in = away,
    stand_in_at = case when away is null then null else clock_timestamp() end,
    stand_in_claim = null,
    seen_a = clock_timestamp(), seen_b = clock_timestamp(),
    turn_deadline = clock_timestamp() + make_interval(secs => cfg.shot_seconds),
    version = version + 1
    where id = g.id;
  perform public._pool_audit(null, 'POOL_STARTED', g.id, jsonb_build_object('state_hash', h, 'stand_in', away));
  return jsonb_build_object('duplicate', false, 'match_id', g.id, 'state_hash', h, 'stand_in', away);
end $$;

create or replace function public.pool_touch(p_match bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); g public.pool_matches; seat text;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  perform public._assert_live_session();
  select * into g from pool_matches where id = p_match for update;
  if not found then raise exception 'MATCH_NOT_FOUND'; end if;
  seat := public._pool_seat(g, uid);
  if seat is null then raise exception 'FORBIDDEN'; end if;
  if g.stand_in = seat then
    delete from pool_pending where match_id = g.id;
  end if;
  update pool_matches set
    seen_a = case when seat = 'A' then clock_timestamp() else seen_a end,
    seen_b = case when seat = 'B' then clock_timestamp() else seen_b end,
    stand_in = case when stand_in = seat then null else stand_in end,
    stand_in_claim = case when stand_in = seat then null else stand_in_claim end,
    grace_until = case when grace_seat = seat then null else grace_until end,
    grace_seat = case when grace_seat = seat then null else grace_seat end
    where id = g.id;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.pool_prepare_shot(p_match bigint, p_input jsonb, p_key text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); g public.pool_matches; seat text; pend public.pool_pending; seq int;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  perform public._assert_live_session();
  if p_key is null or length(p_key) not between 8 and 100 then raise exception 'INVALID_IDEMPOTENCY_KEY'; end if;
  select * into g from pool_matches where id = p_match for update;
  if not found then raise exception 'MATCH_NOT_FOUND'; end if;
  seat := public._pool_seat(g, uid);
  if seat is null then raise exception 'FORBIDDEN'; end if;
  if exists (select 1 from pool_events where match_id = g.id and event->>'key' = p_key) then
    return jsonb_build_object('duplicate', true, 'match_id', g.id);
  end if;
  if g.status <> 'PLAYING' or g.state is null then raise exception 'MATCH_NOT_LIVE'; end if;
  if g.state->>'winner' is not null then raise exception 'MATCH_FINISHED'; end if;
  if g.state->>'turn' <> seat then raise exception 'NOT_YOUR_TURN'; end if;
  if g.turn_deadline < clock_timestamp() then raise exception 'TURN_EXPIRED'; end if;
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
  if g.stand_in = seat then
    delete from pool_pending where match_id = g.id;
    update pool_matches set stand_in = null, stand_in_claim = null where id = g.id;
  end if;
  select * into pend from pool_pending where match_id = g.id;
  if found and pend.created_at > clock_timestamp() - interval '8 seconds' then
    raise exception 'SHOT_IN_PROGRESS';
  end if;
  delete from pool_pending where match_id = g.id;
  seq := coalesce((g.state->>'shot')::int, 0) + 1;
  insert into pool_pending (match_id, seq, user_id, idempotency_key, input)
    values (g.id, seq, uid, p_key, p_input || jsonb_build_object('key', p_key));
  return jsonb_build_object('duplicate', false, 'match_id', g.id, 'seq', seq, 'seat', seat, 'state', g.state);
end $$;

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
    return jsonb_build_object('duplicate', false, 'match_id', g.id, 'seq', pend.seq, 'seat', seat, 'state', g.state);
  end if;
  if found and pend.created_at > clock_timestamp() - interval '8 seconds' then
    raise exception 'SHOT_IN_PROGRESS';
  end if;
  delete from pool_pending where match_id = g.id;
  seq := coalesce((g.state->>'shot')::int, 0) + 1;
  insert into pool_pending (match_id, seq, user_id, idempotency_key, input)
    values (g.id, seq, uid, p_key, p_input || jsonb_build_object('key', p_key));
  return jsonb_build_object('duplicate', false, 'match_id', g.id, 'seq', seq, 'seat', seat, 'state', g.state);
end $$;

create or replace function public.pool_commit_shot(p_match bigint, p_seq int, p_state jsonb, p_hash text, p_event jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.pool_matches; pend public.pool_pending; cfg public.pool_config; winner uuid; reason text; played jsonb; prior jsonb;
begin
  select * into g from pool_matches where id = p_match for update;
  if not found then raise exception 'MATCH_NOT_FOUND'; end if;
  if g.status = 'COMPLETED' then return jsonb_build_object('duplicate', true, 'match_id', g.id); end if;
  select * into pend from pool_pending where match_id = g.id and seq = p_seq;
  if not found then raise exception 'NO_PENDING_SHOT'; end if;
  if coalesce(p_event->>'standIn', '') in ('true', 't') then
    if g.stand_in is null
       or g.stand_in is distinct from g.state->>'turn'
       or public._pool_seat(g, pend.user_id) is distinct from g.stand_in then
      raise exception 'STAND_IN_CLEARED';
    end if;
  end if;
  prior := public.pool_recorded_prior(g.id);
  if public.pool_state_canon(prior) is distinct from public.pool_state_canon(g.state) then
    raise exception 'STATE_DIVERGED';
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

-- Posts once per shot. A missing token or net schema returns without raising,
-- so the one-second tick still reaches the shot clock.
create or replace function public._pool_request_stand_in(p_match bigint) returns void
language plpgsql security definer set search_path = public as $$
declare g public.pool_matches; shot int; tok text;
begin
  select * into g from pool_matches where id = p_match for update;
  if not found or g.status <> 'PLAYING' or g.stand_in is null or g.state is null then return; end if;
  if g.state->>'turn' is distinct from g.stand_in or g.state->>'winner' is not null then return; end if;
  shot := coalesce((g.state->>'shot')::int, 0);
  if g.stand_in_claim is not distinct from shot
     and g.stand_in_at is not null
     and g.stand_in_at > clock_timestamp() - interval '8 seconds' then
    return;
  end if;
  update pool_matches set stand_in_claim = shot, stand_in_at = clock_timestamp() where id = g.id;
  begin
    if to_regnamespace('net') is null then return; end if;
    if to_regclass('public.crypto_job_bearer') is null then return; end if;
    select token into tok from public.crypto_job_bearer where id;
    if tok is null then return; end if;
    perform net.http_post(
      url := 'https://pvpspinarena.com/api/public/cron/pool-stand-in',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || tok
      ),
      body := jsonb_build_object('match_id', g.id),
      timeout_milliseconds := 8000
    );
  exception when others then
    return;
  end;
end $$;

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
  if g.status = 'STARTING' and g.phase_at <= clock_timestamp() - make_interval(secs => cfg.starting_seconds) then
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
    'opens_at', case when g.status = 'STARTING'
      then g.phase_at + make_interval(secs => cfg.starting_seconds) else null end,
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

revoke all on function public.pool_prepare_stand_in(bigint, jsonb, text) from public, anon, authenticated;
grant execute on function public.pool_prepare_stand_in(bigint, jsonb, text) to service_role;
revoke all on function public._pool_request_stand_in(bigint) from public, anon, authenticated, service_role;
