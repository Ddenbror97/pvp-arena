-- Join one waiting table by id. Matchmaking still takes the oldest open table
-- at a stake. This lets the lobby sit a player with the opponent they picked.

create or replace function public.pool_join(p_match bigint, p_key text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid; g public.pool_matches; existing record; ts timestamptz := clock_timestamp();
begin
  if p_key is null or length(p_key) not between 8 and 100 then raise exception 'INVALID_IDEMPOTENCY_KEY'; end if;
  uid := auth.uid();
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  -- A retry of the same click must return the table even after the seat is taken,
  -- so the guard's live-match check runs only for a new key.
  select * into existing from pool_entries where user_id = uid and idempotency_key = p_key;
  if found then
    return jsonb_build_object('duplicate', true, 'match_id', existing.match_id,
      'role', case when existing.slot = 1 then 'created' else 'joined' end);
  end if;
  uid := public._pool_guard();
  select * into g from pool_matches where id = p_match for update;
  if not found or g.status <> 'WAITING' or g.expires_at <= ts then
    raise exception 'MATCH_NOT_OPEN';
  end if;
  if g.creator_id = uid then raise exception 'OWN_TABLE'; end if;
  perform public._pool_debit(uid, g.id, 2, g.stake, p_key, g.asset, g.account_type);
  update pool_matches set status = 'STARTING', opponent_id = uid, phase_at = ts, version = version + 1
    where id = g.id;
  perform public._pool_audit(uid, 'POOL_JOINED', g.id, jsonb_build_object('stake', g.stake, 'picked', true));
  return jsonb_build_object('duplicate', false, 'match_id', g.id, 'role', 'joined');
end $$;

revoke all on function public.pool_join(bigint, text) from public, anon;
grant execute on function public.pool_join(bigint, text) to authenticated;

create or replace function public.pool_lobby() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'enabled', (select enabled from pool_config),
    'fee_bps', (select fee_bps from pool_config),
    'stakes', (select to_jsonb(stakes) from pool_config),
    'shot_seconds', (select shot_seconds from pool_config),
    'open', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id, 'creator_id', m.creator_id, 'stake', m.stake, 'pot', m.pot, 'fee_bps', m.fee_bps,
        'expires_at', m.expires_at, 'username', p.username, 'avatar_url', p.avatar_url,
        'rating', coalesce(r.rating, 1000)
      ) order by m.id)
      from pool_matches m
      join profiles p on p.id = m.creator_id
      left join pool_ratings r on r.user_id = m.creator_id
      where m.status = 'WAITING' and m.expires_at > clock_timestamp()
    ), '[]'::jsonb),
    'recent', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id, 'stake', m.stake, 'pot', m.pot, 'fee_amount', m.fee_amount,
        'payout_amount', m.payout_amount, 'win_reason', m.win_reason, 'completed_at', m.completed_at,
        'winner', w.username, 'creator', c.username, 'opponent', o.username
      ) order by m.completed_at desc)
      from (
        select * from pool_matches where status = 'COMPLETED' order by completed_at desc limit 12
      ) m
      left join profiles w on w.id = m.winner_id
      left join profiles c on c.id = m.creator_id
      left join profiles o on o.id = m.opponent_id
    ), '[]'::jsonb)
  )
$$;
