-- The lobby no longer shows settled matches or a rating, so stop joining those rows.

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
        'expires_at', m.expires_at, 'username', p.username, 'avatar_url', p.avatar_url
      ) order by m.id)
      from pool_matches m
      join profiles p on p.id = m.creator_id
      where m.status = 'WAITING' and m.expires_at > clock_timestamp()
    ), '[]'::jsonb)
  )
$$;
