-- A second stand-in caller used to receive the same pending row and then
-- abort it. That deleted the shot the first caller was still committing,
-- so the table sat there with no stroke. A live pending shot is now a
-- duplicate. A caller that died is taken over only after the row is stale.

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
    if pend.created_at > clock_timestamp() - interval '8 seconds' then
      return jsonb_build_object('duplicate', true, 'match_id', g.id);
    end if;
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

revoke all on function public.pool_prepare_stand_in(bigint, jsonb, text) from public, anon, authenticated;
grant execute on function public.pool_prepare_stand_in(bigint, jsonb, text) to service_role;
