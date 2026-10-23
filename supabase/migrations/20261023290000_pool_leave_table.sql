-- Leave table on a live 8-ball match.
-- The leaver pays 10% of their own stake to the house and receives the other 90%.
-- The opponent is refunded their full stake. Nobody is the winner, and ratings do not move.
-- A timeout or an absent-seat forfeit still settles as a win. A waiting table still cannot be cancelled.

alter table public.pool_matches
  add column if not exists left_by uuid references public.profiles(id);

create or replace function public.pool_leave(p_match bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  g public.pool_matches;
  seat text;
  fee bigint;
  back bigint;
  tx uuid;
  e record;
  ids uuid[];
  other uuid;
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
     or exists (select 1 from pool_payouts where match_id = g.id) then
    return jsonb_build_object('left', false, 'match_id', g.id);
  end if;
  if (select count(*) from pool_entries where match_id = g.id and amount = g.stake) <> 2
     or (select coalesce(sum(amount), 0) from pool_entries where match_id = g.id) <> g.stake * 2 then
    raise exception 'POT_MISMATCH';
  end if;
  fee := g.stake / 10;
  back := g.stake - fee;
  if back < 0 or fee < 0 or back + fee <> g.stake then raise exception 'FEE_MISMATCH'; end if;
  other := case when uid = g.creator_id then g.opponent_id else g.creator_id end;
  select coalesce(array_agg(user_id order by user_id), '{}') into ids
    from pool_entries where match_id = g.id;
  perform public._coinflip_lock_wallets(ids, g.asset, g.account_type);
  perform public._lock_system_accounts(array['house_revenue']::public.account_kind[], g.asset, g.account_type);
  insert into ledger_transactions (kind, idempotency_key, account_type, user_id, game_id, memo)
    values ('pool_refund', 'pool:' || g.id || ':leave', g.account_type, uid, g.id, 'Pool leave')
    returning id into tx;
  for e in select * from pool_entries where match_id = g.id order by user_id loop
    perform public._post(tx, public._user_account(e.user_id, 'user_locked', g.asset, g.account_type), -e.amount);
  end loop;
  perform public._post(tx, public._user_account(uid, 'user_available', g.asset, g.account_type), back);
  perform public._post(tx, public._user_account(other, 'user_available', g.asset, g.account_type), g.stake);
  if fee > 0 then
    perform public._post(tx, public._system_account('house_revenue', g.asset, g.account_type), fee);
  end if;
  insert into pool_payouts (match_id, kind, idempotency_key, beneficiary_id, amount, fee, ledger_tx_id)
    values
      (g.id, 'REFUND', 'pool:' || g.id || ':leave:' || uid, uid, back, fee, tx),
      (g.id, 'REFUND', 'pool:' || g.id || ':leave:' || other, other, g.stake, 0, tx);
  delete from pool_pending where match_id = g.id;
  update pool_matches set
    status = 'CANCELLED',
    cancel_reason = 'PLAYER_LEFT',
    left_by = uid,
    winner_id = null,
    win_reason = null,
    fee_amount = fee,
    payout_amount = null,
    turn_deadline = null,
    completed_at = clock_timestamp(),
    phase_at = clock_timestamp(),
    version = version + 1
    where id = g.id;
  perform public._pool_audit(uid, 'POOL_LEFT', g.id, jsonb_build_object(
    'leaver', uid, 'other', other, 'stake', g.stake, 'fee', fee, 'back', back, 'ledger_tx', tx));
  return jsonb_build_object('left', true, 'match_id', g.id, 'fee', fee, 'back', back);
end $$;

-- A shot that was already in flight must not settle a table that just closed.
create or replace function public.pool_commit_shot(p_match bigint, p_seq int, p_state jsonb, p_hash text, p_event jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.pool_matches; pend public.pool_pending; cfg public.pool_config; winner uuid; reason text; played jsonb; prior jsonb;
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
    'server_now', clock_timestamp(), 'cancel_reason', g.cancel_reason, 'left_by', g.left_by,
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

revoke all on function public.pool_leave(bigint) from public, anon;
grant execute on function public.pool_leave(bigint) to authenticated;
